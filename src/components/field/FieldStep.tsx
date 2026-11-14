"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import type { FieldResponse } from "@/lib/data/fieldTypes";
import type { Ring } from "@/lib/data/geometry";
import type { SnapshotIndexEntry } from "@/lib/data/snapshots";
import { useI18n } from "@/lib/i18n";
import { parseNum } from "@/lib/ui/fieldState";
import type { ParcelSummary } from "@/lib/ui/parcelScan";
import { IRRIGATION_LEVELS, PRIORITY_KEYS, PRIORITY_PRESETS, budgetForLevel, irrigationLevelFor, priorityPresetFor, prioritySharesOf, weightsForPreset } from "@/lib/ui/presets";
import type { PartName, SiteData } from "@/lib/ui/siteData";
import { isoDay } from "@/lib/ui/sources";
import { Chevron, WaterGlyph } from "@/components/ui/Glyphs";
import { AdvancedSettings, CoordsForm, type AdvancedProps } from "./AdvancedSettings";
import { CropChip } from "./CropChip";
import { ParcelScanCard } from "./ParcelScanCard";
import type { Site } from "./site";

const FieldMap = dynamic(() => import("./FieldMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-panel-2" />,
});

interface Props extends Omit<AdvancedProps, "showNdvi" | "onShowNdvi" | "placeChips"> {
  pilots: SnapshotIndexEntry[] | null;
  site: Site | null;
  data: SiteData | null;
  elevation: number | null;
  zoneLabel: string | null;
  onPilot: (id: string) => void;
  onRetry: (p: PartName) => void;
  /** null when the options can be shown, else the reason they cannot. */
  blocker: string | null;
  onShow: () => void;
  scanSummary?: ParcelSummary | null;
  scanData?: FieldResponse | null;
  scanning?: boolean;
  onParcelComplete?: (ring: Ring) => void;
  onParcelClear?: () => void;
}

const PRIO_COLOR = { water: "var(--c-precip)", income: "var(--loam)", soil: "var(--c-green)", risk: "var(--ink-2)" } as const;

/** Step 1: where, water, current crops, priority. Everything else sits under Advanced settings. */
export function FieldStep(p: Props) {
  const { t, n, lang } = useI18n();
  const [showNdvi, setShowNdvi] = useState(false);
  const d = p.draft;
  const set = (patch: Partial<typeof d>) => p.onDraft({ ...d, ...patch });
  const pname = (x: { nameTr: string | null; nameEn: string | null }) => (lang === "tr" ? x.nameTr : x.nameEn) ?? "";
  const budget = parseNum(d.budget);
  const level = irrigationLevelFor(budget);
  const preset = priorityPresetFor(d.priorities);
  const origin = p.soilCheck.profile?.origin ?? p.soilBase?.origin ?? null;
  const pick = p.onPilot;
  const point = p.onPoint;

  /** Pilot chips: up front until a place is chosen, then under Advanced settings > Location. */
  const chips =
    p.pilots === null ? (
      <p className="mt-3 text-sm text-ink-2">{t("site.pilotsLoading")}</p>
    ) : p.pilots.length === 0 ? (
      <p className="mt-3 text-sm text-ink-2">{t("site.noPilots")}</p>
    ) : (
      <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("site.pilots")}>
        {p.pilots.map((x) => (
          <li key={x.id}>
            <button type="button" className="btn" aria-pressed={p.site?.kind === "pilot" && p.site.id === x.id} onClick={() => pick(x.id)}>
              {pname(x)}
            </button>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
      {/* map */}
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--stepbar-h)+1rem)] lg:self-start">
        <div className="relative isolate h-[16rem] overflow-hidden rounded-2xl border border-rule sm:h-[22rem] lg:h-[calc(100dvh-var(--stepbar-h)-9rem)] lg:max-h-[40rem] lg:min-h-[22rem]">
          <FieldMap
            pilots={(p.pilots ?? []).map((x) => ({ id: x.id, name: pname(x), lat: x.lat, lon: x.lon }))}
            selected={p.site ? { lat: p.site.lat, lon: p.site.lon } : null}
            showNdvi={showNdvi}
            onPick={point}
            onPilot={pick}
            label={t("site.mapLabel")}
            scanSummary={p.scanSummary}
            scanning={p.scanning}
            onParcelComplete={p.onParcelComplete}
            onParcelClear={p.onParcelClear}
          />
        </div>
        <p className="mt-2 text-sm text-ink-2">{t("site.mapHint")}</p>
      </div>

      {/* the four questions */}
      <div className="min-w-0">
        <Question n={1} title={t("q.where")}>
          {p.site && (
            <div aria-live="polite">
              <p className="font-display text-[length:var(--text-step-2)] font-[560] leading-tight">{p.site.kind === "pilot" ? pname(p.site) : `${n(p.site.lat, 3)}°, ${n(p.site.lon, 3)}°`}</p>
              <p className="mt-0.5 text-sm text-ink-2 tabular-nums">
                {n(p.site.lat, 2)}° N, {n(p.site.lon, 2)}° E{p.elevation !== null && <>, {t("site.elevation", { m: n(p.elevation) })}</>}
                {p.zoneLabel && <>. {t("site.zone")}: {p.zoneLabel}</>}
              </p>
              <p className="text-sm text-ink-2">{p.site.kind === "pilot" && p.site.retrievedAt ? t("site.snapshot", { date: isoDay(p.site.retrievedAt) }) : t("site.live")}</p>
              {p.data && <SiteStatus data={p.data} onRetry={p.onRetry} pointSite={p.site.kind === "point"} />}
              {p.scanSummary && (
                <ParcelScanCard summary={p.scanSummary} scanData={p.scanData ?? null} scanning={p.scanning ?? false} />
              )}
              <p className="mt-2 text-xs text-ink-2">{t("q.where.change")}</p>
            </div>
          )}
          {!p.site && (
            <div>
              <p className="text-ink-2">{t("q.where.help")}</p>
              {chips}
              <div className="mt-4">
                <CoordsForm onPoint={p.onPoint} />
              </div>
            </div>
          )}
        </Question>

        {p.site && (
          <div className="enter">
            <Question n={2} title={t("q.water")}>
              {/* One radio group: "rainfed" or one of the three irrigation levels. Visually two big options. */}
              <div role="radiogroup" aria-label={t("q.water")} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2.5">
                <label className="choice flex flex-col gap-2 p-3.5">
                  <input type="radio" name="water" checked={d.rainfed} onChange={() => set({ rainfed: true })} aria-describedby="w-rf-sub" />
                  <WaterGlyph kind="rain" />
                  <span className="block font-semibold leading-tight">{t("q.water.rainfed")}</span>
                  <span id="w-rf-sub" className="block text-xs leading-snug text-ink-2">
                    {t("q.water.rainfedSub")}
                  </span>
                </label>
                <div className={`rounded-xl border p-3 ${d.rainfed ? "border-rule bg-panel" : "border-ink bg-panel shadow-[inset_0_0_0_1px_var(--ink)]"}`}>
                  <div className="flex items-center gap-2.5 px-0.5">
                    <WaterGlyph kind="irrigated" />
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight">{t("q.water.irrigated")}</span>
                      <span className="block text-xs leading-snug text-ink-2">
                        {!d.rainfed && level === null && budget !== null ? (
                          <span className="tabular-nums">
                            {t("q.water.fine")}: {n(budget)} m³/da/{t("unit.yr")}
                          </span>
                        ) : (
                          t("q.water.irrigatedSub")
                        )}
                      </span>
                    </span>
                  </div>
                  <div className="seg mt-2.5 w-full">
                    {IRRIGATION_LEVELS.map((l) => (
                      <label key={l.id} className="!px-1.5">
                        <input
                          type="radio"
                          name="water"
                          checked={!d.rainfed && level === l.id}
                          onChange={() => set({ rainfed: false, budget: String(budgetForLevel(l.id)) })}
                          aria-label={`${t("q.water.irrigated")}, ${t(`q.water.level.${l.id}`)}, ${n(l.budgetM3PerDa)} m³/da/${t("unit.yr")}`}
                        />
                        <span className="text-sm font-semibold">{t(`q.water.level.${l.id}`)}</span>
                        <span className="text-xs tabular-nums opacity-80">{n(l.budgetM3PerDa)} m³/da</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-ink-2">{t("q.water.presetNote")}</p>
            </Question>

            <Question n={3} title={t("q.crops")} sub={t("q.crops.help")}>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((k) => (
                  <CropChip
                    key={k}
                    id={`f-rot-${k}`}
                    label={t("field.year", { n: k + 1 })}
                    value={d.rotation[k]}
                    onChange={(c) => {
                      const r = [...d.rotation] as typeof d.rotation;
                      r[k] = c;
                      set({ rotation: r });
                    }}
                  />
                ))}
              </div>
            </Question>

            <Question n={4} title={t("q.prio")}>
              <div role="radiogroup" aria-label={t("q.prio")} className="grid grid-cols-2 gap-2.5">
                {PRIORITY_PRESETS.map((pp) => {
                  const s = prioritySharesOf(pp.weights);
                  const main = pp.id === "balanced" ? null : pp.id;
                  const other = main ? PRIORITY_KEYS.find((k) => k !== main)! : "water";
                  return (
                    <label key={pp.id} className="choice p-3.5">
                      <input type="radio" name="prio" checked={preset === pp.id} onChange={() => set({ priorities: weightsForPreset(pp.id) })} />
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold leading-tight">{t(`prioPreset.${pp.id}`)}</span>
                        <span className="tick" aria-hidden="true" />
                      </span>
                      <span className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-paper" aria-hidden="true">
                        {PRIORITY_KEYS.map((k) => (
                          <span key={k} style={{ width: `${s[k] * 100}%`, background: PRIO_COLOR[k], opacity: main && k !== main ? 0.35 : 0.85 }} />
                        ))}
                      </span>
                      <span className="mt-1.5 block text-xs text-ink-2 tabular-nums">
                        {main ? t("prioPreset.lead", { a: n(s[main] * 100), b: n(s[other] * 100) }) : t("prioPreset.even", { v: n(s.water * 100) })}
                      </span>
                    </label>
                  );
                })}
              </div>
              {preset === null && <p className="mt-2 text-sm text-ink-2">{t("q.prio.custom")}</p>}
            </Question>

            <CalibrationCard {...p} />

            <details className="group mt-6 border-t border-rule pt-4">
              <summary className="tap flex items-center gap-2 rounded-sm">
                <span className="text-ink-2 transition-transform duration-200 group-open:rotate-90">
                  <Chevron />
                </span>
                <span className="font-semibold">{t("adv.title")}</span>
                <span className="ml-auto truncate text-sm text-ink-2 tabular-nums">
                  {t("adv.sum", { area: d.areaDa || "—", soil: t(`adv.soil.${origin ?? "none"}`) })}
                </span>
              </summary>
              <AdvancedSettings {...p} showNdvi={showNdvi} onShowNdvi={setShowNdvi} onPoint={point} placeChips={chips} />
            </details>
          </div>
        )}

        <div className="sticky bottom-0 z-10 -mx-1 mt-6 bg-gradient-to-t from-paper from-70% to-transparent px-1 pb-4 pt-6 max-md:bottom-[calc(var(--stepbar-h)+env(safe-area-inset-bottom))]">
          <button type="button" className="btn btn-primary btn-lg w-full justify-center rounded-2xl" disabled={p.blocker !== null} aria-describedby={p.blocker ? "cta-why" : undefined} onClick={p.onShow}>
            {t("cta.show")}
            <Chevron />
          </button>
          {p.blocker && (
            <p id="cta-why" className="mt-2 text-center text-sm text-ink-2">
              {p.blocker}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Question({ n, title, sub, children }: { n: number; title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="border-t border-rule pb-6 pt-5 first:border-t-0 first:pt-0" aria-labelledby={`q-${n}`}>
      <h3 id={`q-${n}`} className="flex items-baseline gap-3">
        <span className="readout text-[length:var(--text-step-1)] text-loam" aria-hidden="true">
          {n}
        </span>
        <span className="font-display text-[length:var(--text-step-2)] font-[560] leading-tight tracking-[-0.01em]">{title}</span>
        {sub && <span className="lbl">{sub}</span>}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SiteStatus({ data, onRetry, pointSite }: { data: SiteData; onRetry: (p: PartName) => void; pointSite: boolean }) {
  const { t } = useI18n();
  const parts = ["climate", "soil", "ndvi"] as const;
  const allOk = parts.every((k) => data[k].status === "ok");
  return (
    <>
      <ul className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${allOk ? "text-ink-2" : ""}`}>
        {parts.map((k) => {
          const part = data[k];
          return (
            <li key={k} className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${part.status === "ok" ? "bg-[var(--c-green)]" : part.status === "error" ? "bg-bad" : "recalc bg-sky"}`} aria-hidden="true" />
              <span>
                {t(`load.${k}`)}: {part.status === "ok" ? t("load.ok") : part.status === "loading" ? t("load.loading") : `${t("load.error")} (${part.code === "timeout" ? t("load.timeout") : part.code === "network" ? t("load.network") : part.message})`}
              </span>
              {part.status === "error" && (
                <button type="button" className="btn ml-1 py-0.5 text-xs" onClick={() => onRetry(k)}>
                  {t("load.retry")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {data.climate.status === "loading" && pointSite && <p className="mt-2 text-sm text-ink-2">{t("load.loadingLong")}</p>}
      {data.climate.status === "error" && <p className="mt-2 text-sm text-bad">{t("load.noClimate")}</p>}
    </>
  );
}

/** Not hidden, not blocking: the one-line station rainfall card. Loud only while rainfall is uncalibrated. */
function CalibrationCard(p: Props) {
  const { t, n } = useI18n();
  const cal = p.calibration;
  return (
    <div className={`mt-1 rounded-2xl px-4 py-3.5 ${cal ? "bg-sky-soft" : "bg-warn text-warn-ink"}`}>
      <label htmlFor="f-station" className="block font-semibold leading-snug">
        {t("calCard.q")}
      </label>
      {!cal && <p className="mt-0.5 text-sm">{t("calCard.why")}</p>}
      <div className="mt-2 flex items-center gap-2">
        <input
          id="f-station"
          className="field-input max-w-[9rem] bg-panel"
          inputMode="decimal"
          autoComplete="off"
          placeholder={t("calCard.placeholder")}
          value={p.draft.stationMm}
          aria-invalid={p.stationInvalid || undefined}
          aria-describedby="f-station-st"
          onChange={(e) => p.onDraft({ ...p.draft, stationMm: e.target.value })}
        />
        <span className="text-sm">{t("cal.unit")}</span>
      </div>
      <p id="f-station-st" className="mt-1.5 text-sm" aria-live="polite">
        {p.stationInvalid
          ? t("cal.invalid")
          : p.calibrationImpossible
            ? t("cal.noComplete")
            : cal
              ? (cal.mode === "basin"
                  ? t("cal.autoNotice", { basin: cal.basinNameTr ?? "MGM", station: n(cal.stationMeanMm), f: n(cal.factor, 2) })
                  : t("cal.applied", { f: n(cal.factor, 2) }))
              : ""}
      </p>
    </div>
  );
}
