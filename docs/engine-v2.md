# AgroShift engine v2 — method, parameters, API

The engine is still fully deterministic and rule-based (no generative model): every number traces to
a formula, a data source or a parameter marked `literature` / `assumption`. Everything below is pure
TypeScript in `src/lib/engine/**` and `src/lib/crops/**`; all v1 fields are unchanged and v2 output
fields are optional additions in `src/lib/types.ts`.

## 1. Yield: management level + water + rotation

v1 used the irrigated reference yield as Ym for every crop-year, so rainfed wheat at Konya came out
at 3.7 t/ha (provincial dryland ≈ 2–2.5 t/ha). v2:

```
Ya = Ym · (1 − Ky (1 − ETa/ETc)) · preCropFactor                      (FAO-33/66)
Ym = Yrf_ceiling + (Y_irrigated − Yrf_ceiling) · s
s  = min(1, Σ irrigation / (0.5 · Σ rainfed deficit))   per rotation slot over all windows
small-grain cereals:  Ya ≤ 20 kg/ha/mm · (seasonal ETa − 110 mm)       (French & Schultz 1984)
variable cost = cost · (0.6 + 0.4 · s) − N credit saving
```

* `rainfedCeilingTHa` (new crop field, assumption): water-unlimited yield under typical rainfed
  management (≈ a good rainfed year). Wheat 4.0, barley 3.5, chickpea 1.6, lentil 1.5, beet 35,
  maize 6, sunflower 2.4, bean 1.6, alfalfa 6, vetch 4.5, cotton 2.5 t/ha.
* `s` (irrigation intensity): 0 = rainfed management, 1 = irrigated management. Covering half of
  the rainfed deficit already counts as irrigated management (`irrigatedManagementShare` 0.5,
  assumption), so deficit irrigation is not penalised twice.
* Rainfed fields spend less (`rainfedCostShare` 0.6, assumption). Without this every rainfed
  margin was negative because irrigated-level costs were charged.
* Irrigated wheat reference: 6.0 t/ha (was 5.5), in line with Harran tillage trials (≈ 5.6–6.2 t/ha).
* French–Schultz bound: applied to the simulated seasonal ETa (an assumption about how it is
  applied). It rarely binds and is reported as `YearResult.wpCapShare`.

## 2. Previous-crop effects and the repeating cycle

`src/lib/crops/preCrop.ts` — `preCropEffect(prev, next)` returns `{ yieldFactor, nCreditKgHa, codes,
note, source, confidence:"assumption" }`. Water legacy is not in the table (the water balance carries it).

| previous → next | yield factor | N credit |
|---|---|---|
| grain/forage legume → wheat/barley | ×1.10 | legume `nContributionKgHa` |
| legume → maize | ×1.05 | legume credit |
| sunflower / beet / cotton → small grain | ×1.05 | – |
| fallow → small grain | ×1.05 (non-water break) | 10–30 kg N/ha mineralised |
| same small grain / maize / cotton / other crop again | ×0.90 / 0.92 / 0.95 / 0.85 | – |
| other small grain → small grain | ×0.95 | – |
| maize → small grain (Fusarium) | ×0.95 | – |
| small grain → maize | ×0.97 | – |
| legume → different legume | ×0.90 | none |
| Sclerotinia hosts (sunflower, bean, chickpea, lentil) | ×0.95 | – |

Direction and order of magnitude follow Angus et al. 2015 (Crop & Pasture Sci. 66:523–552),
Kirkegaard et al. 2008 (Field Crops Res. 107:185–195) and Ryan et al. 2008 (Adv. Agron. 97:273–319).
**The percentages are assumptions.** The N credit is valued at `nPriceTLPerKgN` = 40 TL/kg N
(assumption) and capped by the next crop's N need (`N_NEED_KG_HA`).

**Repeating cycle.** The plan is evaluated as a steady-state cycle:

* The calendar is cyclic: the year-3 harvest is the "previous harvest" of year 1, so a late beet or
  cotton harvest delays year-1 winter wheat, or makes the plan infeasible.
* Windows are chained in three phases (y, y+3, y+6 …). A window starts from its predecessor's final
  soil state and day index, so carry-over into year 1 comes from real weather.
* The first window of each chain, or a window after a data gap, starts from the periodic steady
  state: iterate the window from the GWETROOT seed until storage changes by < 0.5 mm (max 6 iterations).
* Screening uses the same chaining with the cached piece model.
* Previous-crop effects use `previousCrops(seq) = [seq[2], seq[0], seq[1]]`.

## 3. Soil and terrain

* **Layers** (`field.soilLayers`). For each layer, θFC/θWP come from measured 33/1500 kPa water
  contents when plausible. "Plausible" means AWC ≥ 0.05 m³/m³ and ≥ 0.5 × the Saxton–Rawls estimate
  for that layer; SoilGrids gives θ1500 ≥ θ33 in the Harran clay subsoil. Otherwise the engine uses
  Saxton–Rawls (2006) with the density factor (Eq. 6–10). Both are multiplied by (1 − coarse-fragment
  volume); treating measured values as fine-earth values is an assumption. TAW(z) is piecewise
  linear. Root-zone growth moves water at uniform relative wetness. Uniform layers reduce exactly to
  the single-layer path (tested).
* SOC above 30 g/kg (≈ 5.2 % OM) is capped and flagged (`SoilHydraulics.socCapped`). Example: the
  Edirne 0–5 cm value of 51.9 g/kg.
* **pH flags** per crop (`phRange`, assumption) → `PlanWarning` `ph_low` / `ph_high`. Salinity is not
  assessed (gap item).
* **Slope** (`terrain.slopePct`, else `field.slopePct`): CN2 is slope-adjusted (Williams 1995 / SWAT
  2:1.1.4; TR-55 values valid at 5 %).
* **Erosion indicator**: A = R·K·LS·C·P.
  * R: Renard & Freimund 1994, from the modified Fournier index of complete years.
  * K: Williams 1995 EPIC.
  * LS: McCool et al. 1987, λ = 50 m (assumption).
  * C: daily crop stage / residue / tilled bare (assumption), erosivity-weighted.
  * Labelled "indicator"; `aTHaYr` is null without a slope.
* **Elevation**: with terrain, the SRTM mean is the site elevation. It is used for the FAO-56
  pressure and γ, for the zone rule (≥ 700 m), and for a 6.5 °C/km lapse shift of the POWER
  temperatures when |Δz| ≥ 50 m (capped ±3 °C; assumption). The POWER cell sits 80–180 m above SRTM
  at every pilot (Konya: +1.19 °C).

## 4. Rainfall: explicit adjustment and uncertainty

`AnalysisInput.precipAdjustment = { mode: "none" | "annual" | "monthly", factorAnnual?, factorsMonthly?, provenance }`
is applied multiplicatively with the scenario rain multiplier and reported in `assumptions`,
evidence (`evidence.precipAdjustment`) and `result.precipitation`. The engine never applies a
correction by itself. A series already carrying the UI's station calibration source counts as
calibrated.

`precipCheck` (ERA5 / ERA5-Land) is reported only. Caution: at Konya, POWER gives 551 mm and ERA5
gives 259 mm, while station climatology is about 300–350 mm. **An ERA5-based factor can over-correct
in dry inland areas.** Neither source is the truth; the station mean is the best factor.

`result.precipUncertainty` reports:

* annual P of POWER, of the reference and of the chosen input, with their range;
* the implied annual factor;
* the top 3 of the shortlist re-ranked under the other rainfall source;
* `sensitive`: whether the top 3 changes.

The other source is reference-scaled POWER when nothing was applied, or uncorrected POWER when an
adjustment was applied. Per plan, `rainSource.inTop3` feeds the confidence grade.

## 5. Decision logic

* Full enumeration and screening unchanged (n³, hard constraints, cyclic calendar).
* **Pareto knee**: minimum normalised distance to the ideal point (compromise programming,
  Zeleny 1973) → `kneeId`, `CandidatePoint.knee`.
* **Robust ranking**: pool = top 20 + Pareto + knee + current, replayed exactly under typical, dry
  (rain −25 %) and hot-dry (+2 °C, −25 %), plus the active scenario when it differs from these.
  * regret = best composite in a scenario − the plan's composite;
  * `robustBestId` = minimax regret (ties: mean composite, then id);
  * CVaR20 = mean of the worst 20 % of window margins pooled over scenarios.
* **Sensitivity**: on a pool of 12 + tracked plans, one assumption at a time is moved ±20 %:
  prices, costs and reference yields (re-priced from cached raw windows), rainfall and budget
  (re-simulated). That is 10 runs (8 when rainfed). Each run re-ranks the pool with the same
  diverse top-3 rule. `StabilityInfo.top3Share` and `flips[]` (which assumption, which plan
  replaced it) are reported.
* **Confidence A–D** = weighted mean of:
  * data completeness (25): excluded years, default soil, assumed SOC, Hargreaves days, window count, no layers;
  * rainfall (30): calibrated 1.0 / annual 0.9 / ERA5 agrees within 10 % 0.85 / unchecked 0.5 /
    bias not corrected 0.3; for ranked plans raised to ≥ 0.75 if the plan stays in the top 3 under
    the other source, else capped at 0.3;
  * literature share of parameters (20);
  * rank stability (25, recommended plans only).
  * Grades: A ≥ 80, B ≥ 65, C ≥ 50, D below. Reasons are listed in TR/EN.

## 6. New outputs (all optional on `PlanResult`)

| field | meaning |
|---|---|
| `windows[]` | `PlanWindow` per historical window: startYear, deficit, unmet, budgetExceeded(+byYear), yieldRatio(+byYear), margin |
| `monthlyDemand[]` | 36 rows (Oct of year 1 first): ETc, ETa, effective rain (P − RO − DP), irrigation, deficit, bare evaporation (mm, window mean) |
| `preCrop[]` | `PreCropEffectInfo` per crop year (factor, N credit, TL/da saved, note, source) |
| `nitrogen` | fixation − removal (kg N/ha/yr, low/high), labelled indicator |
| `cover` | covered / establishing / bare days per calendar month (cycle mean) |
| `erosion` | `ErosionIndicator` (R, K, LS, C, A, class) |
| `warnings[]` | `PlanWarning` (pH, break length, pre-crop disease codes, rainfed "irrigated-only" crop, erosion) |
| `trade` | vs current rotation: ok windows ("22 dönemin 18'inde su yetti"), ΔTL/da, Δm³/da, field ΔTL |
| `robust`, `stability`, `confidence`, `knee`, `rainSource` | see §4–5 |
| `narrative` | `{ verdict, gains, losses, watch }`, TR with "sen" address, farmer units |
| `YearResult.ymTHa / irrigationIntensity / preCropFactor / wpCapShare` | yield-model trace |

On `AnalysisResult`: `typicalBestId`, `robustBestId`, `robustBest` (only when it is not already in
`alternatives`), `kneeId`, `robustness`, `sensitivity`, `precipitation`, `precipUncertainty`,
`terrain`. On `SoilHydraulics`: `layers`, `tawColumnMm`, `curveNumbersBase`, `slopePct`,
`phTopsoil`, `socCapped`.

## 7. API for the UI

```ts
analyze(input: AnalysisInput): AnalysisResult
evaluateCustomPlan(input: AnalysisInput, crops: RotationSequence): CustomPlanResult
//   CustomPlanResult = { plan: PlanResult; feasible: boolean; messages: BuilderMessage[];
//                        violations: ConstraintViolation[]; warnings: PlanWarning[] }
//   BuilderMessage = { code: ConstraintCode | WarningCode; kind: "constraint" | "warning"; cropId; year; text: {tr,en} }
preCropEffect(prev: CropId, next: CropId): PreCropEffect
// units: tHaToKgDa, kgDaToTHa, mmToM3PerDa, m3PerDaToMm, m3ToTonWater, mmToTonPerDa, daToHa, haToDa,
//        perHaToPerDa, perDaToPerHa, kgHaToKgDa, formatNumber(x, lang, digits?), formatYieldKgDa,
//        formatYieldTDa, formatWaterM3Da, formatWaterTonDa, formatTLPerDa, formatTL, formatPct,
//        trLocative(n) ("8'inde"), outOf(m, n, lang) ("22 dönemin 18'inde" / "in 18 of 22 periods")
```

`evaluateCustomPlan` reuses a cached context (same climate object and settings; LRU of 3). After an
`analyze` of the same input, its composite is normalised against that analysis's exact set. It takes
about 4–5 ms per plan on the real snapshots.

## 8. Verification

* `npm test`: 189 tests in 18 files, all passing (v2.1 added `landUse.test.ts`).
  * New engine files: `engineV2.test.ts` (pre-crop sanity and symmetry, steady-state convergence and
    seed independence, cyclic calendar, layered = uniform, layered mass balance, rainfall adjustment
    monotone and reported, slope CN/erosion, lapse, yield model and the French–Schultz cap,
    robust/regret, sensitivity determinism, outputs, narrative "sen" address, custom plan,
    implausible-input guards, units);
  * `benchmark.test.ts` (real snapshots, see below; performance).
* Independent Python, layered TAW: `scripts/crosscheck_cycle.py` (with `scripts/dump-cycle.ts`)
  gives max |ΔTAW| = 0.00 mm.
* Independent Python, repeating cycle: W-F-W rainfed over the Konya phase chain 2002…2023 gives
  max |ΔS0| = 0.00 mm and max |ΔETa| = 0.00 mm (8 cycles, including the steady-state spin-up).
* `crosscheck_et0.py` still matches: ET₀ max |Δ| = 0.0000 mm/d.

### Benchmark (real snapshots with layers, terrain, ERA5 check; approximate references, wide tolerances)

| case | model | approx. reference | test range |
|---|---|---|---|
| Konya rainfed wheat W-F-W, rain × 320/551 | 1.65 t/ha (165 kg/da) | dryland ≈ 2–2.5; all wheat 2.6–3.2 (TÜİK via Konya İl Tarım 2025) | 1.5–3.0 |
| same, POWER rain as is | 2.02 | | 1.5–3.2 |
| same, ERA5 monthly factors | 1.48 (over-correction) | | – |
| Konya rainfed barley, calibrated | 1.57 | ≈ 1.5–2.5 | 1.3–3.0 |
| Konya rainfed chickpea, calibrated | 0.68 (v2: 0.54) | ≈ 1.0–1.3 (**model low**) | 0.6–1.8 |
| Konya rainfed chickpea, POWER as is | 0.86 | | 0.75–1.8 |
| Konya rainfed lentil, calibrated | 0.42 | ≈ 1.0–1.3 (**model low**) | 0.35–1.6 |
| Konya irrigated wheat 300 mm | 4.74 | 4.5–7 | 4.5–7.5 |
| Konya sugar beet 600 mm | 46 | ≈ 55–70 | 45–90 |
| Harran rainfed wheat | 2.10 | 2.0–2.5 (dryland, Harran Univ. statement) | 1.5–3.2 |
| Harran irrigated wheat 700 mm | 5.70 | 5.6–6.2 (Harran trials) | 4.5–7.5 |
| Harran seed cotton 1000 mm | 4.26 | ≈ 4.5–5 | 3.0–6.0 |

### Runtime (Node 24, real snapshots, robust + sensitivity included)

Konya `analyze` 362–408 ms (235 ms without robust/sweep); Harran 381–441 ms (302 ms without).
`evaluateCustomPlan` 3.7–5.3 ms. A browser-class runtime is typically 1.5–2.5× slower, i.e. about
0.6–1.1 s, under the 1.5 s target.

## 8b. v2.1 follow-up: land use, water objective, legume yields

**Fallow-heavy recommendations (cause).** The water component of the composite was the rain-only
deficit (mm/yr). A fallow year lowers it trivially, so plans such as vetch → fallow → fallow ranked
high under equal priorities. Fixes:

* **Water objective, production-normalised.** water = ⅓ deficit (mm/yr, lower better) + ⅓ water
  productivity (gross revenue per m³ of water received = rain + gross irrigation, higher better) +
  ⅓ deficit per 1000 TL of output (lower better, capped at 2000). Idle land earns nothing, so it
  is no longer "water saving". This is reported per plan as `PlanResult.waterProductivity`.
* **Land-use rule (hard, recommendations only).** A recommended / robust / knee / sweep plan may
  have at most `maxFallowYears` fallow years. The default comes from the engine's own water balance:
  * 1 if rainfed fallow (wheat → fallow → wheat vs wheat → barley → wheat, same windows) stores
    ≥ 25 mm more water at the next wheat sowing and the net budget is < 100 mm/yr (classic dryland
    cereal–fallow);
  * otherwise 0;
  * `options.maxFallowYears` overrides it.

  Current and custom plans are still evaluated and get a `fallow_heavy` warning. The result reports
  `AnalysisResult.landUse` (limit, source, storage gain, excluded plans, reason).
* **Income** already used the whole-cycle margin per year, with fallow years at zero revenue minus
  the fallow cost (verified by a test).

**Plateau chickpea too low (cause, from `scripts/dump-trace.ts`, Konya W-C-B rainfed, calibrated rain).**

| hypothesis | evidence | verdict |
|---|---|---|
| Snow lost to runoff / evaporation | P on tmean ≤ 0 °C days ≈ 23 mm per winter, runoff on those days ≈ 1 mm | not the cause (no snow store added) |
| Poor winter recharge | AW at sowing 85 of 119 mm (layered column); 98 of 230 mm with the uniform soil; ratio 0.34 → 0.36 | storage is near the soil's capacity; bare evaporation is normal |
| Root depth 0.8 m | 1.0 m → ratio +0.02 | minor |
| Sowing date 25 Mar | 10 Mar → ratio 0.34 → 0.40, heat days 6.8 → 2.6 | real but an assumption either way; calendar unchanged |
| Water supply | ETc ≈ 390 mm vs ETa ≈ 110 mm; in-season rain 64 mm (calibrated) vs 110 (POWER) | dominant, and it depends on the rain source |
| **Double-counted management gap** | ceiling 1.6 vs irrigated 2.0 applied on top of the water ratio, although legume management barely differs (no N fertiliser) | **modelling error → fixed**: chickpea / lentil ceiling = irrigated reference (2.0 / 1.8 t/ha) |

Before → after (Konya rainfed, calibrated ×320/551): chickpea 0.54 → 0.68 t/ha (0.86 with POWER as
is), lentil ≈ 0.35 → 0.42, wheat unchanged 1.65 (1.52 / 1.77). The legumes remain low against
≈ 1.0–1.3 t/ha. The remaining gap is water-limited spring growth, which is sensitive to the rain
source and the sowing date. It stays an open weakness, and the benchmark rows are tightened
(chickpea ≥ 0.6 calibrated, ≥ 0.75 uncalibrated; lentil ≥ 0.35) so regressions are visible.

Turkish wording in engine texts: "ekim nöbeti" instead of "rotasyon", "kazanç (brüt)" instead of
"brüt marj".

## 9. Known weaknesses

* Fixed in v2.1 (§8b): fallow-heavy recommendations. The fallow limit depends on the 25 mm /
  100 mm thresholds (assumption).
* **Rainfed plateau legumes** are still low (chickpea 0.68, lentil 0.42 vs ≈ 1.0–1.3 t/ha). The
  cause is water-limited spring growth (§8b), not snow. Earlier sowing and the rain source move it
  most.
* Every rotation percentage, the rainfed ceilings, cost share, pH ranges, N fixation/removal, C
  factors and the lapse rate are assumptions. Benchmarks are approximate, not a TÜİK table lookup.
* Rainfall bias dominates rainfed results. The engine exposes it (`precipUncertainty`, confidence)
  but cannot resolve it without a station value.
* SoilGrids water retention is used as "fine earth" (an assumption). The plausibility guard is a heuristic.
