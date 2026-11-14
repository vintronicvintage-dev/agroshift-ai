"use client";

import { CROPS, scheduleSequence } from "@/lib/engine";
import type { ClimateZone, RotationSequence } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { cropColor, shortName } from "@/lib/ui/crops";
import { CropArt } from "@/components/brand/CropArt";

const YEAR = 365;
const SPAN = 3 * YEAR + 1;

/**
 * Three-year strip calendar starting 1 October before rotation year 1. Coloured bands are crops
 * (sow → harvest), hatched bands are fallow years, empty paper is bare soil between crops.
 */
export function StripCalendar({ crops, zone }: { crops: RotationSequence; zone: ClimateZone }) {
  const { t, L, locale } = useI18n();
  const sched = scheduleSequence(crops, zone);
  const pct = (d: number) => `${(Math.min(SPAN, Math.max(0, d)) / SPAN) * 100}%`;
  const fmt = (offset: number) => {
    const d = new Date(Date.UTC(2001, 9, 1) + offset * 86_400_000);
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  };
  return (
    <div>
      <div className="relative h-14 overflow-hidden rounded-md border border-rule bg-paper" role="img" aria-label={`${t("plan.calendarLabel")}: ${crops.map((c) => L(CROPS[c].name)).join(", ")}`}>
        {/* quarter ticks: Jan, Apr, Jul of each year */}
        {[0, 1, 2].map((k) =>
          [92, 182, 273].map((q) => <span key={`${k}-${q}`} className="absolute top-0 h-1.5 w-px bg-rule" style={{ left: pct(k * YEAR + q) }} aria-hidden="true" />),
        )}
        {[1, 2].map((k) => (
          <span key={k} className="absolute inset-y-0 w-px bg-ink-2/50" style={{ left: pct(k * YEAR) }} aria-hidden="true" />
        ))}
        {crops.map((c, k) => {
          const slot = sched.slots[k];
          const name = shortName(L(CROPS[c].name));
          if (!slot) {
            return (
              <div key={k} className="absolute inset-y-1.5 flex items-center overflow-hidden rounded-sm border border-dashed border-loam/70" style={{ left: `calc(${pct(k * YEAR)} + 2px)`, width: `calc(${pct(YEAR)} - 4px)` }} title={name}>
                <span className="hatch absolute inset-0" aria-hidden="true" />
                <span className="relative flex min-w-0 items-center gap-1 px-1">
                  <CropArt crop={c} size={28} className="max-sm:hidden" />
                  <span className="truncate text-xs font-semibold text-loam">{name}</span>
                </span>
              </div>
            );
          }
          const s = Math.max(0, slot.sowOffset);
          const e = Math.min(SPAN, slot.harvestOffset);
          return (
            <div
              key={k}
              className="absolute inset-y-1.5 flex items-center overflow-hidden rounded-sm"
              style={{ left: pct(s), width: pct(e - s), background: cropColor(c), boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.18)" }}
              title={`${name}: ${t("plan.sow", { d: fmt(slot.sowOffset) })}, ${t("plan.harvest", { d: fmt(slot.harvestOffset) })}`}
            >
              <span className="flex min-w-0 items-center gap-1 px-1">
                <span className="hidden shrink-0 rounded-[4px] bg-white/55 sm:inline-flex">
                  <CropArt crop={c} size={28} />
                </span>
                <span className="truncate text-xs font-semibold" style={{ color: "var(--band-ink)" }}>
                  {name}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-x-3 text-[0.75rem] leading-snug text-ink-2">
        {crops.map((c, k) => {
          const slot = sched.slots[k];
          return (
            <span key={k} className="min-w-0 tabular-nums">
              <span className="font-semibold text-ink">{t("plan.yearsShort", { n: k + 1 })}</span>
              {k === 0 && <span className="hidden sm:inline"> ({fmt(0)})</span>}
              <span className="block">{slot ? `${t("plan.sow", { d: fmt(slot.sowOffset) })}, ${t("plan.harvest", { d: fmt(slot.harvestOffset) }).toLocaleLowerCase(locale)}` : shortName(L(CROPS[c].name))}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
