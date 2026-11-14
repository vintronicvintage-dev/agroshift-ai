"use client";

import { useMemo } from "react";
import type { MonthlyDemand, PlanSlotCalendar } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/ui/theme";
import { cropFamily, textureEdge, textureFill } from "@/components/brand/cropTexture";
import { monthNames } from "@/lib/ui/derive";
import { cropName } from "./planKit";

export interface TimelineRow {
  id: string;
  title: string;
  calendar: PlanSlotCalendar[];
  monthly: MonthlyDemand[] | null;
}

/** Month offset from 1 October of rotation year 1 (0 … 36). Aug–Sep sowing belongs to the previous autumn. */
function offset(mmdd: string, year: number) {
  const m = Number(mmdd.slice(0, 2));
  const d = Number(mmdd.slice(3, 5));
  const rel = m >= 10 ? m - 10 : m >= 8 ? m - 10 : m + 2;
  return (year - 1) * 12 + rel + (d - 1) / 30.5;
}

interface Seg {
  crop: PlanSlotCalendar["cropId"];
  a: number;
  b: number;
  year: number;
  sow: string;
  harvest: string;
  delay: number;
}

function segments(cal: PlanSlotCalendar[]): Seg[] {
  const out: Seg[] = [];
  for (const c of cal) {
    if (!c.sow || !c.harvest || c.cropId === "fallow") continue;
    const a = offset(c.sow, c.year);
    let b = offset(c.harvest, c.year);
    if (b <= a) b += 12;
    const push = (x: number, y: number) => out.push({ crop: c.cropId, a: x, b: y, year: c.year, sow: c.sow!, harvest: c.harvest!, delay: c.delayDays });
    // the plan is a repeating cycle: wrap pieces that fall outside 0…36
    const A = ((a % 36) + 36) % 36;
    const B = A + (b - a);
    if (B <= 36) push(A, B);
    else {
      push(A, 36);
      push(0, B - 36);
    }
  }
  return out;
}

const fmtDate = (mmdd: string, lang: "tr" | "en") => {
  const d = new Date(Date.UTC(2023, Number(mmdd.slice(0, 2)) - 1, Number(mmdd.slice(3, 5))));
  return d.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
};

/**
 * 36-month rotation timeline (October start): crop-texture bands with sowing and harvest ticks,
 * bare-soil gaps as fallow hatch with day counts, frost months on the axis, and the monthly
 * water ribbon (irrigation + unmet need) under each plan on a shared scale. Phones get three
 * stacked year rows instead of one wide strip.
 */
export function Timeline({ rows, frostMonths }: { rows: TimelineRow[]; frostMonths: boolean[] }) {
  const { t, n, lang } = useI18n();
  const theme = useTheme();
  const months = monthNames(lang);
  const waterMax = useMemo(() => Math.max(5, ...rows.flatMap((r) => (r.monthly ?? []).map((m) => m.irrigationMm + m.deficitMm))), [rows]);
  const segs = useMemo(() => rows.map((r) => segments(r.calendar)), [rows]);
  const aria = rows
    .map((r, i) =>
      `${r.title}: ` +
      segs[i].filter((s) => s.a < 36).map((s) => t("tl.segAria", { crop: cropName(s.crop, lang), sow: fmtDate(s.sow, lang), harvest: fmtDate(s.harvest, lang), y: s.year })).join("; "),
    )
    .join(". ");

  const render = (perRow: 12 | 36) => {
    const W = perRow === 36 ? 900 : 360;
    const L = perRow === 36 ? 104 : 0;
    const band = 30;
    const ribbon = 26;
    const lead = perRow === 36 ? 4 : 20;
    const rowH = lead + band + 6 + ribbon + 14;
    const groups = perRow === 36 ? [0] : [0, 12, 24];
    const H = 26 + rows.length * groups.length * rowH;
    const x = (m: number, g: number) => L + ((m - g) / perRow) * (W - L);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={aria}>
        {/* month axis with frost months */}
        {Array.from({ length: perRow }, (_, i) => {
          const mo = (i + 9) % 12; // 0 = October
          const fr = frostMonths[mo];
          return (
            <g key={i}>
              {fr && <rect x={x(i, 0)} y={2} width={(W - L) / perRow} height={8} fill="var(--tmin)" opacity="0.55" />}
              <text x={x(i + 0.5, 0)} y={22} textAnchor="middle" fontSize="11" fill="var(--ink-2)">
                {perRow === 36 ? months[mo].slice(0, 1) : months[mo].slice(0, 3)}
              </text>
            </g>
          );
        })}
        {rows.map((r, ri) =>
          groups.map((g, gi) => {
            const top = 26 + (ri * groups.length + gi) * rowH;
            const bandY = top + lead;
            const ribY = bandY + band + 6;
            const label = perRow === 36 ? r.title : `${r.title} · ${t("irr.year", { y: gi + 1 })}`;
            return (
              <g key={`${r.id}-${g}`}>
                <text x={perRow === 36 ? 0 : 0} y={perRow === 36 ? bandY + 19 : top + 12} fontSize="12" fontWeight="600" fill="var(--ink)">
                  {label.length > 18 && perRow === 36 ? `${label.slice(0, 17)}…` : label}
                </text>
                {/* year separators */}
                {perRow === 36 &&
                  [12, 24].map((m) => <line key={m} x1={x(m, g)} x2={x(m, g)} y1={bandY - 4} y2={ribY + ribbon} stroke="var(--line-strong)" strokeDasharray="2 3" />)}
                {/* bare ground under everything */}
                <rect x={x(g, g)} y={bandY} width={W - L} height={band} fill={textureFill("fallow", theme)} stroke="var(--line)" />
                {segs[ri]
                  .filter((s) => s.b > g && s.a < g + perRow)
                  .map((s, i) => {
                    const a = Math.max(s.a, g);
                    const b = Math.min(s.b, g + perRow);
                    const fam = cropFamily(s.crop);
                    const w = x(b, g) - x(a, g);
                    return (
                      <g key={i}>
                        <rect x={x(a, g)} y={bandY} width={w} height={band} fill={textureFill(fam, theme)} stroke={textureEdge(fam, theme)} strokeWidth="1.2" rx="2" />
                        {w > 54 && (
                          <g>
                            <rect x={x(a, g) + 4} y={bandY + 7} width={Math.min(w - 8, cropName(s.crop, lang).length * 7 + 10)} height={16} rx="3" fill="var(--bg)" opacity="0.92" />
                            <text x={x(a, g) + 9} y={bandY + 19} fontSize="12" fontWeight="600" fill="var(--ink)">
                              {cropName(s.crop, lang)}
                            </text>
                          </g>
                        )}
                        {s.a >= g && s.a < g + perRow && <path d={`M${x(s.a, g)} ${bandY - 5}v${band + 5}`} stroke="var(--ink)" strokeWidth="1.6" />}
                        {s.b > g && s.b <= g + perRow && <path d={`M${x(s.b, g)} ${bandY}v${band + 5}`} stroke="var(--ink)" strokeWidth="1.6" strokeDasharray="3 2" />}
                      </g>
                    );
                  })}
                {/* water ribbon */}
                {r.monthly &&
                  r.monthly
                    .filter((m) => m.index >= g && m.index < g + perRow)
                    .map((m) => {
                      const cw = (W - L) / perRow;
                      const hI = (m.irrigationMm / waterMax) * ribbon;
                      const hD = (m.deficitMm / waterMax) * ribbon;
                      const bx = x(m.index, g) + 1;
                      return (
                        <g key={m.index}>
                          <rect x={bx} y={ribY + ribbon - hI} width={cw - 2} height={hI} fill="var(--water)" />
                          {hD > 0.4 && <rect x={bx} y={ribY + ribbon - hI - hD} width={cw - 2} height={hD} fill="none" stroke="var(--risk)" strokeWidth="1" />}
                        </g>
                      );
                    })}
                <line x1={x(g, g)} x2={W} y1={ribY + ribbon} y2={ribY + ribbon} stroke="var(--axis)" strokeWidth="0.8" />
                {!r.monthly && (
                  <text x={x(g, g)} y={ribY + 16} fontSize="11" fill="var(--ink-2)">
                    {t("tl.noWater")}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </svg>
    );
  };

  return (
    <figure>
      <div className="hidden sm:block">{render(36)}</div>
      <div className="sm:hidden">{render(12)}</div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="12" aria-hidden="true">
            <path d="M2 0v12" stroke="var(--ink)" strokeWidth="1.6" />
            <path d="M10 0v12" stroke="var(--ink)" strokeWidth="1.6" strokeDasharray="3 2" />
          </svg>
          {t("tl.legend.sowHarvest")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="10" aria-hidden="true">
            <rect width="16" height="10" fill={textureFill("fallow", theme)} stroke="var(--line)" />
          </svg>
          {t("tl.legend.bare")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 bg-[var(--tmin)] opacity-60" />
          {t("tl.legend.frost")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 bg-[var(--water)]" />
          {t("tl.legend.irr")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 border border-[var(--risk)]" />
          {t("tl.legend.unmet", { max: n(waterMax) })}
        </span>
      </figcaption>
    </figure>
  );
}

/** Bare-soil days after each harvest, as sentences (the timeline's text alternative). */
export function bareLines(cal: PlanSlotCalendar[], lang: "tr" | "en") {
  return cal.filter((c) => c.bareDaysAfter > 0).map((c) => ({ year: c.year, crop: c.cropId, days: c.bareDaysAfter, name: cropName(c.cropId, lang) }));
}
