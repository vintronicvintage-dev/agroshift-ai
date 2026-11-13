import type { AnalysisResult, ClimateSummary, LocalizedText, PlanResult, SoilProfile } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dict";
import type { CalibrationInfo } from "./calibration";
import type { SiteData } from "./siteData";
import type { SectionId } from "./steps";

/**
 * "Things to watch" on the overview. Every item comes from a real flag in the data or the engine
 * result; with no flags the list is empty (and the card says so). Nothing is invented.
 */
export interface Alert {
  id: string;
  tone: "warn" | "info";
  title: DictKey;
  params?: Record<string, string | number>;
  sub?: DictKey;
  subParams?: Record<string, string | number>;
  /** Engine-provided text instead of a dictionary sub line. */
  subText?: LocalizedText;
  section: SectionId;
  action: "al.act.fix" | "al.act.view";
}

export interface AlertInput {
  data: SiteData | null;
  climate: ClimateSummary | null;
  result: AnalysisResult | null;
  calibration: CalibrationInfo | null;
  imerg: "validated" | "not_validated" | null;
  soil: SoilProfile | null;
  /** The plan the overview recommends (composeVerdict best). */
  best: PlanResult | null;
  /** Format a number in the active locale. */
  n: (v: number, digits?: number) => string;
  /** Localised unit of a trend's Sen slope ("mm", "gün" …), without the "/yr". */
  unit: (variable: "precip" | "et0" | "hot_days" | "frost_days" | "gwet_root") => string;
  /** Localised trend direction. */
  dir: (d: "increasing" | "decreasing") => string;
}

const TREND_ORDER = ["frost_days", "hot_days", "precip", "et0", "gwet_root"] as const;

export function buildAlerts(x: AlertInput): Alert[] {
  const out: Alert[] = [];
  const d = x.data;
  if (!d) return out;

  if (d.climate.status === "error") out.push({ id: "climate", tone: "warn", title: "al.climateError", sub: "al.climateError.sub", section: "tarlam", action: "al.act.fix" });
  if (d.soil.status === "error") out.push({ id: "soil-error", tone: "warn", title: "al.soilError", sub: "al.soilError.sub", section: "tarlam", action: "al.act.fix" });
  else if (x.soil?.origin === "default") out.push({ id: "soil-default", tone: "warn", title: "al.soilDefault", sub: "al.soilDefault.sub", section: "tarlam", action: "al.act.fix" });

  if (d.climate.status === "ok" && !x.calibration) out.push({ id: "uncal", tone: "warn", title: "al.uncal", sub: "al.uncal.sub", section: "tarlam", action: "al.act.fix" });

  // the current plan breaks a hard constraint (engine violation text)
  const v = x.result?.current.violations[0];
  if (v) out.push({ id: "violation", tone: "warn", title: "al.violation", subText: v.text, section: "oneriler", action: "al.act.view" });

  // irrigation budget running short in the recommended plan, per rotation year
  const best = x.best;
  if (best && x.result && x.result.scenario.budgetNetMm > 0) {
    best.water.budgetExceededShareByYear.forEach((share, i) => {
      if (share !== null && share > 0) {
        out.push({
          id: `budget-${i + 1}`,
          tone: share >= 0.25 ? "warn" : "info",
          title: "al.budget",
          params: { y: i + 1, p: x.n(share * 100) },
          sub: "al.budget.sub",
          subParams: { n: x.result!.windows.count },
          section: "oneriler",
          action: "al.act.view",
        });
      }
    });
  }

  // significant climate trends (Mann–Kendall, α = 0.05)
  if (x.climate) {
    for (const variable of TREND_ORDER) {
      const tr = x.climate.trends.find((t) => t.variable === variable);
      if (!tr || !tr.significant || tr.direction === "none") continue;
      out.push({
        id: `trend-${variable}`,
        tone: "info",
        title: `al.trend.${variable}` as DictKey,
        params: { dir: x.dir(tr.direction) },
        sub: "al.trend.sub",
        subParams: { v: (tr.senSlope > 0 ? "+" : "") + x.n(tr.senSlope, variable === "gwet_root" ? 4 : 2), unit: x.unit(variable), p: x.n(tr.p, 3) },
        section: "kanit",
        action: "al.act.view",
      });
    }
    const missing = Object.values(x.climate.quality.missingDays).reduce((a, b) => a + b, 0);
    if (missing > 0) out.push({ id: "missing", tone: "info", title: "al.missing", params: { n: x.n(missing) }, sub: "al.missing.sub", section: "kanit", action: "al.act.view" });
  }

  if (d.climate.status === "ok" && x.imerg !== "validated") out.push({ id: "imerg", tone: "info", title: "al.imerg", sub: "al.imerg.sub", section: "kanit", action: "al.act.view" });
  if (d.ndvi.status === "error") out.push({ id: "ndvi", tone: "info", title: "al.ndvi", sub: "al.ndvi.sub", section: "kanit", action: "al.act.view" });

  // warnings first, keep the original order inside each tone
  return [...out.filter((a) => a.tone === "warn"), ...out.filter((a) => a.tone === "info")];
}
