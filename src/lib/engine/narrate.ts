/**
 * Plain-language farmer narrative (engine v2, rule-based, no generative model).
 * Verdict + "ne kazanırım / ne kaybederim / nelere dikkat" with real numbers in farmer units
 * (dekar, kg/da, m³/da, TL/da), uncertainty as "N dönemin M'inde". Turkish uses "sen" address.
 */
import type { CropId, ExplanationItem, LocalizedText, PlanNarrative, PlanResult, TradeSummary } from "../types";
import { CROPS } from "../crops/database";
import { formatNumber as fn, outOf, trLocative } from "./units";

const nm = (c: CropId) => CROPS[c].name;
const item = (key: string, params: Record<string, number | string>, tr: string, en: string, sources?: string[]): ExplanationItem =>
  ({ key, params, text: { tr, en }, ...(sources ? { sources } : {}) });

/** Windows where "it worked": budget enough (irrigated) or no crop year below half yield (rainfed). */
export function okWindows(p: PlanResult, rainfed: boolean): number {
  const ws = p.windows ?? [];
  return ws.filter((w) => (rainfed ? w.yieldRatioByYear.every((r) => r === null || r >= 0.5) : !w.budgetExceeded)).length;
}

export function tradeSummary(plan: PlanResult, current: PlanResult, rainfed: boolean, areaDa: number): TradeSummary | null {
  const n = plan.windows?.length ?? 0;
  if (!n || !current.windows?.length) return null;
  const okP = okWindows(plan, rainfed), okC = okWindows(current, rainfed);
  const pm = plan.economics.grossMarginTLPerDaPerYr?.p50, cm = current.economics.grossMarginTLPerDaPerYr?.p50;
  const pw = rainfed ? plan.water.requirementMmPerYr?.p50 : plan.water.irrigationNetMmPerYr?.p50;
  const cw = rainfed ? current.water.requirementMmPerYr?.p50 : current.water.irrigationNetMmPerYr?.p50;
  const md = pm !== undefined && cm !== undefined ? pm - cm : null;
  const wd = pw !== undefined && cw !== undefined ? pw - cw : null;
  const lines: LocalizedText[] = [];
  const okTr = rainfed ? "hiçbir yılda verim yarının altına düşmedi" : "su yetti";
  const okEn = rainfed ? "no year fell below half yield" : "the water was enough";
  lines.push({ tr: `${outOf(okP, n, "tr")} ${okTr} (mevcut rotasyonda ${trLocative(okC)}).`, en: `${capital(outOf(okP, n, "en"))} ${okEn} (current rotation: ${okC} of ${n}).` });
  if (md !== null && plan.kind !== "current") lines.push(md >= 0
    ? { tr: `Dekar başına yılda yaklaşık ${fn(Math.round(md), "tr")} TL daha fazla brüt marj (tarlanın tamamında ${fn(Math.round(md * areaDa), "tr")} TL/yıl; senaryo).`, en: `About ${fn(Math.round(md), "en")} TL/da/yr more gross margin (${fn(Math.round(md * areaDa), "en")} TL/yr for the whole field; scenario).` }
    : { tr: `Dekar başına yılda yaklaşık ${fn(Math.round(-md), "tr")} TL daha az brüt marj (tarlanın tamamında ${fn(Math.round(-md * areaDa), "tr")} TL/yıl; senaryo).`, en: `About ${fn(Math.round(-md), "en")} TL/da/yr less gross margin (${fn(Math.round(-md * areaDa), "en")} TL/yr for the whole field; scenario).` });
  if (wd !== null && plan.kind !== "current" && Math.abs(wd) >= 5) {
    const what = rainfed ? { tr: "yağışın karşılamadığı su ihtiyacı", en: "water need not met by rain" } : { tr: "sulama suyu", en: "irrigation water" };
    lines.push(wd < 0
      ? { tr: `Yılda dekar başına ${fn(Math.round(-wd), "tr")} m³ (ton) daha az ${what.tr}.`, en: `${fn(Math.round(-wd), "en")} m³ (t) per da per year less ${what.en}.` }
      : { tr: `Yılda dekar başına ${fn(Math.round(wd), "tr")} m³ (ton) daha fazla ${what.tr}.`, en: `${fn(Math.round(wd), "en")} m³ (t) per da per year more ${what.en}.` });
  }
  return { windows: n, okWindowsPlan: okP, okWindowsCurrent: okC, marginDiffTLPerDaPerYr: md, waterDiffM3PerDaPerYr: wd, fieldMarginDiffTLPerYr: md === null ? null : md * areaDa, lines };
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function narratePlan(plan: PlanResult, current: PlanResult, rainfed: boolean, areaDa: number): PlanNarrative {
  const n = plan.windows?.length ?? 0;
  const gains: ExplanationItem[] = [], losses: ExplanationItem[] = [], watch: ExplanationItem[] = [];
  const t = plan.trade ?? tradeSummary(plan, current, rainfed, areaDa);
  const isCur = plan.kind === "current";
  const m = plan.economics.grossMarginTLPerDaPerYr;
  let verdict: LocalizedText;
  if (!n || !m) {
    verdict = { tr: "Bu plan için yeterli iklim verisi yok; sonuç hesaplanamadı (veri yok).", en: "Not enough climate data for this plan; no result (no data)." };
  } else {
    const ok = okWindows(plan, rainfed);
    const okTr = rainfed ? "verim hiç yarının altına düşmedi" : "su yetti";
    const okEn = rainfed ? "yield never fell below half" : "the water was enough";
    if (isCur || !t || t.marginDiffTLPerDaPerYr === null) {
      verdict = { tr: `Mevcut rotasyonun dekar başına yılda ortalama ${fn(Math.round(m.p50), "tr")} TL brüt marj bırakıyor (senaryo); geçmiş ${outOf(ok, n, "tr")} ${okTr}.`,
        en: `Your current rotation leaves about ${fn(Math.round(m.p50), "en")} TL/da/yr gross margin (scenario); ${okEn} ${outOf(ok, n, "en")} in the past.` };
      if (!isCur) verdict = { tr: verdict.tr.replace("Mevcut rotasyonun", "Bu plan"), en: verdict.en.replace("Your current rotation", "This plan") };
    } else {
      const md = t.marginDiffTLPerDaPerYr, wd = t.waterDiffM3PerDaPerYr ?? 0;
      const moneyTr = md >= 0 ? `${fn(Math.round(md), "tr")} TL daha fazla kazandırır` : `${fn(Math.round(-md), "tr")} TL daha az kazandırır`;
      const moneyEn = md >= 0 ? `earns ${fn(Math.round(md), "en")} TL more` : `earns ${fn(Math.round(-md), "en")} TL less`;
      const waterTr = Math.abs(wd) < 5 ? "suyu aşağı yukarı aynı" : wd < 0 ? `${fn(Math.round(-wd), "tr")} m³ daha az su ister` : `${fn(Math.round(wd), "tr")} m³ daha fazla su ister`;
      const waterEn = Math.abs(wd) < 5 ? "needs about the same water" : wd < 0 ? `needs ${fn(Math.round(-wd), "en")} m³ less water` : `needs ${fn(Math.round(wd), "en")} m³ more water`;
      verdict = {
        tr: `Bu plan mevcut rotasyonuna göre dekar başına yılda ${moneyTr} ve ${waterTr}; geçmiş ${outOf(ok, n, "tr")} ${okTr}.`,
        en: `Compared with your current rotation this plan ${moneyEn} per da per year and ${waterEn}; ${okEn} ${outOf(ok, n, "en")} in the past.`,
      };
    }
  }
  // Yields in farmer units (gains list for every plan: what you harvest)
  for (const y of plan.years) {
    if (!y.yieldTHa) continue;
    const big = y.yieldTHa.p50 >= 20;
    const unit = (v: number, l: "tr" | "en") => big ? `${fn(v / 10, l, 1)} t/da` : `${fn(Math.round(v * 100), l)} kg/da`;
    gains.push(item("gain.yield", { year: y.year, crop: y.cropId, p50: y.yieldTHa.p50, p10: y.yieldTHa.p10 },
      `${y.year}. yıl ${nm(y.cropId).tr}: tipik yılda ${unit(y.yieldTHa.p50, "tr")}, kötü yılda (10 yılın 1'i) ${unit(y.yieldTHa.p10, "tr")}.`,
      `Year ${y.year} ${nm(y.cropId).en}: ${unit(y.yieldTHa.p50, "en")} in a typical year, ${unit(y.yieldTHa.p10, "en")} in a poor year (1 in 10).`, ["Window replay (FAO-33/66)"]));
  }
  if (!isCur && t) {
    if (t.marginDiffTLPerDaPerYr !== null && Math.abs(t.marginDiffTLPerDaPerYr) >= 50) {
      const it = item("trade.margin", { diff: t.marginDiffTLPerDaPerYr }, t.lines[1]?.tr ?? "", t.lines[1]?.en ?? "", ["Scenario assumptions (editable)"]);
      (t.marginDiffTLPerDaPerYr > 0 ? gains : losses).push(it);
    }
    if (t.waterDiffM3PerDaPerYr !== null && Math.abs(t.waterDiffM3PerDaPerYr) >= 5) {
      const line = t.lines.find((l) => l.tr.includes("m³")) ?? t.lines[0];
      (t.waterDiffM3PerDaPerYr < 0 ? gains : losses).push(item("trade.water", { diff: t.waterDiffM3PerDaPerYr }, line.tr, line.en, ["FAO-56 water balance"]));
    }
    if (t.okWindowsPlan !== t.okWindowsCurrent) {
      (t.okWindowsPlan > t.okWindowsCurrent ? gains : losses).push(item("trade.windows", { plan: t.okWindowsPlan, current: t.okWindowsCurrent, n: t.windows }, t.lines[0].tr, t.lines[0].en));
    }
    const ds = plan.soilHealth.score - current.soilHealth.score;
    if (Math.abs(ds) >= 5) (ds > 0 ? gains : losses).push(item("trade.soil", { plan: plan.soilHealth.score, current: current.soilHealth.score },
      `Toprak sağlığı göstergesi ${fn(current.soilHealth.score, "tr", 0)} → ${fn(plan.soilHealth.score, "tr", 0)} /100.`,
      `Soil-health indicator ${fn(current.soilHealth.score, "en", 0)} → ${fn(plan.soilHealth.score, "en", 0)} /100.`));
    const pe = plan.erosion?.aTHaYr, ce = current.erosion?.aTHaYr;
    if (pe != null && ce != null && Math.abs(pe - ce) >= 0.5) (pe < ce ? gains : losses).push(item("trade.erosion", { plan: pe, current: ce },
      `Erozyon göstergesi yaklaşık ${fn(ce, "tr", 1)} → ${fn(pe, "tr", 1)} t/ha/yıl.`, `Erosion indicator about ${fn(ce, "en", 1)} → ${fn(pe, "en", 1)} t/ha/yr.`));
  }
  for (const pc of plan.preCrop ?? []) {
    if (pc.nCostSavingTLPerDa >= 10) gains.push(item("gain.nCredit", { year: pc.year, low: pc.nCreditKgHa.low / 10, high: pc.nCreditKgHa.high / 10, tl: pc.nCostSavingTLPerDa },
      `${pc.year}. yıl ${nm(pc.cropId).tr}: önceki ${nm(pc.prev).tr} dekara ${fn(pc.nCreditKgHa.low / 10, "tr", 1)}–${fn(pc.nCreditKgHa.high / 10, "tr", 1)} kg azot bırakır; gübreden dekarda yaklaşık ${fn(Math.round(pc.nCostSavingTLPerDa), "tr")} TL tasarruf.`,
      `Year ${pc.year} ${nm(pc.cropId).en}: the previous ${nm(pc.prev).en} leaves ${fn(pc.nCreditKgHa.low / 10, "en", 1)}–${fn(pc.nCreditKgHa.high / 10, "en", 1)} kg N per da; about ${fn(Math.round(pc.nCostSavingTLPerDa), "en")} TL/da saved on fertiliser.`, [pc.source]));
  }
  // Watch
  const ws = plan.windows ?? [];
  if (!rainfed) {
    [0, 1, 2].forEach((k) => {
      const bad = ws.filter((w) => w.budgetExceededByYear[k]).length;
      if (bad > 0) watch.push(item("watch.budgetYear", { year: k + 1, bad, n },
        `${k + 1}. yıl (${nm(plan.crops[k]).tr}) ${outOf(bad, n, "tr")} sulama suyu yetmedi.`,
        `Year ${k + 1} (${nm(plan.crops[k]).en}): the irrigation water ran out ${outOf(bad, n, "en")}.`));
    });
  }
  [0, 1, 2].forEach((k) => {
    const bad = ws.filter((w) => (w.yieldRatioByYear[k] ?? 1) < 0.5).length;
    if (bad > 0) watch.push(item("watch.poorYear", { year: k + 1, bad, n },
      `${k + 1}. yıl (${nm(plan.crops[k]).tr}) ${outOf(bad, n, "tr")} kuraklık verimi yarının altına düşürdü.`,
      `Year ${k + 1} (${nm(plan.crops[k]).en}): drought cut the yield below half ${outOf(bad, n, "en")}.`));
  });
  for (const w of plan.warnings ?? []) if (w.severity === "warn") watch.push(item(`watch.${w.code}`, { year: w.year }, w.text.tr, w.text.en));
  const st = plan.stability;
  if (st && st.flips.length) {
    const f = st.flips[0];
    watch.push(item("watch.stability", { runs: st.runs, kept: st.runs - st.flips.length },
      `${f.label.tr} ${f.change} değişirse bu plan ilk 3'ten çıkabiliyor (${st.runs} denemenin ${trLocative(st.runs - st.flips.length)} yerinde kaldı).`,
      `If ${f.label.en} change ${f.change} this plan can drop out of the top 3 (kept its place in ${st.runs - st.flips.length} of ${st.runs} runs).`));
  }
  const c = plan.confidence;
  if (c && (c.grade === "C" || c.grade === "D")) watch.push(item("watch.confidence", { grade: c.grade, score: c.score },
    `Güven notu ${c.grade} (${c.score}/100): ${c.reasons[0]?.tr ?? ""}`, `Confidence grade ${c.grade} (${c.score}/100): ${c.reasons[0]?.en ?? ""}`));
  return { verdict, gains, losses, watch };
}
