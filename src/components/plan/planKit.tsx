"use client";

import { CROPS } from "@/lib/engine";
import type { AnalysisResult, CropId, LocalizedText, PlanResult } from "@/lib/types";
import { CropGlyph } from "@/components/brand/CropGlyph";
import { cropTextureStyle } from "@/components/brand/cropTexture";
import { useTheme } from "@/lib/ui/theme";
import { useI18n } from "@/lib/i18n";

/**
 * The engine writes Turkish with a few analyst words ("rotasyon", "brüt marj"). The board's
 * vocabulary table asks for "ekim nöbeti / sıra" and "kazanç" on the main path; these whole-phrase
 * replacements keep the engine's numbers and grammar intact (engine files are not edited).
 */
const TR_FIX: [RegExp, string][] = [
  [/mevcut rotasyonuna göre/g, "bugünkü sırana göre"],
  [/mevcut rotasyonda/g, "bugünkü sıranda"],
  [/mevcut rotasyon/g, "bugünkü sıran"],
  [/Mevcut rotasyon/g, "Bugünkü sıran"],
  [/rotasyon/g, "ekim nöbeti"],
  [/brüt marj/g, "kazanç (brüt)"],
];

export function useL() {
  const { lang } = useI18n();
  return (x: LocalizedText) => {
    if (lang === "en") return x.en;
    let s = x.tr;
    for (const [re, to] of TR_FIX) s = s.replace(re, to);
    return s;
  };
}

export const cropName = (id: CropId, lang: "tr" | "en") => CROPS[id].name[lang].replace(/\s*\(.*\)\s*$/, "");
export const cropFull = (id: CropId, lang: "tr" | "en") => CROPS[id].name[lang];

export function planLabel(p: Pick<PlanResult, "crops">, lang: "tr" | "en") {
  return p.crops.map((c) => cropName(c, lang)).join(lang === "tr" ? ", " : ", ");
}

/** All exactly evaluated plans of a result, current first, no duplicates. */
export function allPlans(r: AnalysisResult): PlanResult[] {
  const out: PlanResult[] = [r.current];
  for (const p of [...r.alternatives, ...(r.robustBest ? [r.robustBest] : []), ...r.userPlans]) if (!out.some((x) => x.id === p.id)) out.push(p);
  return out;
}

export function planTitle(p: PlanResult, r: AnalysisResult, t: (k: "plan.mine" | "plan.rec" | "plan.robust" | "plan.user", params?: Record<string, string | number>) => string): string {
  if (p.kind === "current") return t("plan.mine");
  if (p.kind === "user") return t("plan.user");
  if (p.rank) return t("plan.rec", { n: p.rank });
  if (r.robustBestId === p.id) return t("plan.robust");
  return t("plan.rec", { n: "–" });
}

/** Crop chip: texture swatch + glyph + full name (never colour alone). */
export function CropChip({ id, size = "md" }: { id: CropId; size?: "sm" | "md" }) {
  const { lang } = useI18n();
  const theme = useTheme();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-surface ${size === "sm" ? "px-1.5 py-0.5 text-[13px]" : "px-2 py-1 text-[14px]"}`}>
      <span className="inline-block size-3.5 shrink-0 rounded-[3px] border border-line" style={cropTextureStyle(id, theme)} aria-hidden="true" />
      <CropGlyph crop={id} size={size === "sm" ? 16 : 18} />
      <span className="font-medium">{cropName(id, lang)}</span>
    </span>
  );
}

export function Sequence({ crops, size = "md" }: { crops: readonly CropId[]; size?: "sm" | "md" }) {
  const { t } = useI18n();
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label={t("plan.seqAria")}>
      {crops.map((c, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <span className="readout" aria-hidden="true">
            {i + 1}
          </span>
          <span className="sr-only">{t("plan.yearN", { y: i + 1 })}</span>
          <CropChip id={c} size={size} />
        </li>
      ))}
    </ol>
  );
}

export const signed = (v: number, n: (v: number, d?: number) => string, d = 0) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${n(Math.abs(v), d)}`;

/** Confidence grade box (A–D) with a word; colour is never the only cue. */
export function GradeBadge({ grade }: { grade: "A" | "B" | "C" | "D" }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-2">
      <span className="numeral flex size-8 items-center justify-center rounded-md border border-line-strong text-[20px]">{grade}</span>
      <span className="text-[13px] text-ink-2">{t(`grade.${grade}`)}</span>
    </span>
  );
}
