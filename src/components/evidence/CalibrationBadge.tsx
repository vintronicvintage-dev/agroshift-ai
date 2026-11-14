"use client";

import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import { Traced } from "@/components/trace/TraceProvider";
import { Icon } from "@/components/ui/Icons";

/** Shown next to every rainfall figure: the applied station factor, or an "uncalibrated" flag. */
export function CalibrationBadge({ calibration, small = false }: { calibration: CalibrationInfo | null; small?: boolean }) {
  const { t, n } = useI18n();
  const size = small ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  if (!calibration) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-warn font-sans font-medium text-warn-ink ${size}`}>
        <Icon name="alert" size={12} /> {t("cal.none")}
      </span>
    );
  }

  const f = n(calibration.factor, 2);
  const isUser = calibration.mode === "user";
  const modeTitle = isUser ? t("cal.mode.user") : t("cal.mode.basin");
  const badgeLabel = small
    ? (isUser ? t("cal.badge.userShort", { f }) : t("cal.badge.basinShort", { f }))
    : `${modeTitle}: ×${f}`;

  return (
    <span className={`inline-flex items-center rounded-full bg-sky-soft font-sans font-medium text-sky ${size}`}>
      <Traced
        trace={() => {
          const inputs: [string, string][] = [
            isUser
              ? [t("cal.label"), `${n(calibration.stationMeanMm)} mm`]
              : [t("cal.mode.basin"), `${calibration.basinNameTr ?? calibration.stationName ?? "MGM"} (${n(calibration.stationMeanMm)} mm)`],
            ["NASA POWER", `${n(calibration.modelMeanMm, 1)} mm (${calibration.years.length} ${t("in.years").toLowerCase()})`],
          ];
          if (calibration.distanceKm !== undefined) {
            inputs.push([t("cal.distance"), `${n(calibration.distanceKm, 0)} km`]);
          }
          return {
            title: modeTitle,
            value: `×${n(calibration.factor, 3)}`,
            formula: t("m.f.cal"),
            inputs,
            sources: [{ name: isUser ? t("cal.title") : (calibration.stationName ?? modeTitle), url: "/yontem#kalibrasyon" }],
          };
        }}
      >
        {badgeLabel}
      </Traced>
    </span>
  );
}
