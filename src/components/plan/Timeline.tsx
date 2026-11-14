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
    const push = (x: number, y: number) =>
      out.push({ crop: c.cropId, a: x, b: y, year: c.year, sow: c.sow!, harvest: c.harvest!, delay: c.delayDays });
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
 * Clean, high-contrast 36-month rotation timeline (October start):
 * Displays Year 1, Year 2, Year 3 headers, rounded crop growth bars, frost month highlights,
 * and monthly irrigation demand bars on a shared scale.
 */
export function Timeline({ rows, frostMonths }: { rows: TimelineRow[]; frostMonths: boolean[] }) {
  const { t, n, lang } = useI18n();
  const theme = useTheme();
  const months = monthNames(lang);
  const waterMax = useMemo(
    () => Math.max(5, ...rows.flatMap((r) => (r.monthly ?? []).map((m) => m.irrigationMm + m.deficitMm))),
    [rows],
  );
  const segs = useMemo(() => rows.map((r) => segments(r.calendar)), [rows]);
  const aria = rows
    .map(
      (r, i) =>
        `${r.title}: ` +
        segs[i]
          .filter((s) => s.a < 36)
          .map((s) =>
            t("tl.segAria", {
              crop: cropName(s.crop, lang),
              sow: fmtDate(s.sow, lang),
              harvest: fmtDate(s.harvest, lang),
              y: s.year,
            }),
          )
          .join("; "),
    )
    .join(". ");

  const render = (perRow: 12 | 36) => {
    const W = perRow === 36 ? 940 : 360;
    const L = perRow === 36 ? 128 : 0;
    const band = 34;
    const ribbon = 28;
    const lead = perRow === 36 ? 6 : 22;
    const rowH = lead + band + 8 + ribbon + 18;
    const groups = perRow === 36 ? [0] : [0, 12, 24];
    const topAxisH = perRow === 36 ? 44 : 28;
    const H = topAxisH + rows.length * groups.length * rowH;
    const x = (m: number, g: number) => L + ((m - g) / perRow) * (W - L);

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={aria}>
        {/* Year 1 / Year 2 / Year 3 Top Group Headers on Desktop */}
        {perRow === 36 &&
          [0, 1, 2].map((yrIdx) => {
            const xStart = x(yrIdx * 12, 0);
            const xEnd = x((yrIdx + 1) * 12, 0);
            return (
              <g key={yrIdx}>
                <rect
                  x={xStart + 2}
                  y={2}
                  width={xEnd - xStart - 4}
                  height={18}
                  rx="5"
                  fill={yrIdx % 2 === 0 ? "rgba(30, 107, 52, 0.10)" : "rgba(2, 119, 189, 0.10)"}
                />
                <text
                  x={(xStart + xEnd) / 2}
                  y={14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--ink)"
                >
                  {lang === "tr" ? `${yrIdx + 1}. ÜRETİM YILI (EKİM – EYLÜL)` : `YEAR ${yrIdx + 1} (OCT – SEP)`}
                </text>
              </g>
            );
          })}

        {/* Month axis with frost month badges */}
        {Array.from({ length: perRow }, (_, i) => {
          const mo = (i + 9) % 12; // 0 = October
          const fr = frostMonths[mo];
          return (
            <g key={i}>
              {fr && (
                <rect
                  x={x(i, 0) + 1}
                  y={perRow === 36 ? 23 : 2}
                  width={(W - L) / perRow - 2}
                  height={perRow === 36 ? 18 : 8}
                  rx="3"
                  fill="var(--tmin)"
                  opacity="0.22"
                />
              )}
              <text
                x={x(i + 0.5, 0)}
                y={perRow === 36 ? 36 : 22}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="600"
                fill="var(--ink-2)"
              >
                {perRow === 36 ? months[mo].slice(0, 3) : months[mo].slice(0, 3)}
              </text>
            </g>
          );
        })}

        {rows.map((r, ri) =>
          groups.map((g, gi) => {
            const top = topAxisH + (ri * groups.length + gi) * rowH;
            const bandY = top + lead;
            const ribY = bandY + band + 8;
            const label = perRow === 36 ? r.title : `${r.title} · ${t("irr.year", { y: gi + 1 })}`;
            return (
              <g key={`${r.id}-${g}`}>
                <text
                  x={0}
                  y={perRow === 36 ? bandY + 21 : top + 14}
                  fontSize="12.5"
                  fontWeight="700"
                  fill="var(--ink)"
                >
                  {label.length > 20 && perRow === 36 ? `${label.slice(0, 19)}…` : label}
                </text>
                {/* Year separators */}
                {perRow === 36 &&
                  [12, 24].map((m) => (
                    <line
                      key={m}
                      x1={x(m, g)}
                      x2={x(m, g)}
                      y1={bandY - 4}
                      y2={ribY + ribbon}
                      stroke="var(--line-strong)"
                      strokeDasharray="3 3"
                    />
                  ))}
                {/* Bare ground background */}
                <rect
                  x={x(g, g)}
                  y={bandY}
                  width={W - L}
                  height={band}
                  rx="6"
                  fill={textureFill("fallow", theme)}
                  stroke="var(--line)"
                />
                {segs[ri]
                  .filter((s) => s.b > g && s.a < g + perRow)
                  .map((s, i) => {
                    const a = Math.max(s.a, g);
                    const b = Math.min(s.b, g + perRow);
                    const fam = cropFamily(s.crop);
                    const w = x(b, g) - x(a, g);
                    return (
                      <g key={i}>
                        <rect
                          x={x(a, g)}
                          y={bandY}
                          width={w}
                          height={band}
                          fill={textureFill(fam, theme)}
                          stroke={textureEdge(fam, theme)}
                          strokeWidth="1.5"
                          rx="6"
                        />
                        {w > 48 && (
                          <g>
                            <rect
                              x={x(a, g) + 6}
                              y={bandY + 7}
                              width={Math.min(w - 12, cropName(s.crop, lang).length * 7.5 + 14)}
                              height={20}
                              rx="5"
                              fill="var(--surface)"
                              opacity="0.95"
                            />
                            <text
                              x={x(a, g) + 12}
                              y={bandY + 21}
                              fontSize="12"
                              fontWeight="700"
                              fill="var(--ink)"
                            >
                              {cropName(s.crop, lang)}
                            </text>
                          </g>
                        )}
                        {s.a >= g && s.a < g + perRow && (
                          <path d={`M${x(s.a, g)} ${bandY - 4}v${band + 4}`} stroke="var(--ink)" strokeWidth="1.8" />
                        )}
                        {s.b > g && s.b <= g + perRow && (
                          <path
                            d={`M${x(s.b, g)} ${bandY}v${band + 4}`}
                            stroke="var(--ink)"
                            strokeWidth="1.8"
                            strokeDasharray="3 2"
                          />
                        )}
                      </g>
                    );
                  })}
                {/* Monthly irrigation & deficit bars */}
                {r.monthly &&
                  r.monthly
                    .filter((m) => m.index >= g && m.index < g + perRow)
                    .map((m) => {
                      const cw = (W - L) / perRow;
                      const hI = (m.irrigationMm / waterMax) * ribbon;
                      const hD = (m.deficitMm / waterMax) * ribbon;
                      const bx = x(m.index, g) + 1.5;
                      return (
                        <g key={m.index}>
                          <rect
                            x={bx}
                            y={ribY + ribbon - hI}
                            width={cw - 3}
                            height={hI}
                            rx="2"
                            fill="var(--water)"
                          />
                          {hD > 0.4 && (
                            <rect
                              x={bx}
                              y={ribY + ribbon - hI - hD}
                              width={cw - 3}
                              height={hD}
                              rx="2"
                              fill="none"
                              stroke="var(--risk)"
                              strokeWidth="1.2"
                            />
                          )}
                        </g>
                      );
                    })}
                <line x1={x(g, g)} x2={W} y1={ribY + ribbon} y2={ribY + ribbon} stroke="var(--axis)" strokeWidth="0.9" />
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
    <figure className="rounded-2xl border border-line bg-bg/50 p-4">
      <div className="hidden sm:block">{render(36)}</div>
      <div className="sm:hidden">{render(12)}</div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-2.5 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <svg width="14" height="12" aria-hidden="true">
            <path d="M2 0v12" stroke="var(--ink)" strokeWidth="1.8" />
            <path d="M10 0v12" stroke="var(--ink)" strokeWidth="1.8" strokeDasharray="3 2" />
          </svg>
          {t("tl.legend.sowHarvest")}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <svg width="16" height="10" aria-hidden="true">
            <rect width="16" height="10" rx="2" fill={textureFill("fallow", theme)} stroke="var(--line)" />
          </svg>
          {t("tl.legend.bare")}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="inline-block h-2.5 w-4 rounded-xs bg-[var(--tmin)] opacity-45" />
          {t("tl.legend.frost")}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="inline-block size-2.5 rounded-xs bg-[var(--water)]" />
          {t("tl.legend.irr")}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="inline-block size-2.5 rounded-xs border border-[var(--risk)]" />
          {t("tl.legend.unmet", { max: n(waterMax) })}
        </span>
      </figcaption>
    </figure>
  );
}

/** Bare-soil days after each harvest, as sentences (the timeline's text alternative). */
export function bareLines(cal: PlanSlotCalendar[], lang: "tr" | "en") {
  return cal
    .filter((c) => c.bareDaysAfter > 0)
    .map((c) => ({ year: c.year, crop: c.cropId, days: c.bareDaysAfter, name: cropName(c.cropId, lang) }));
}
