"use client";

import { useI18n } from "@/lib/i18n";
import { DISCLAIMER } from "@/lib/engine";

/** The "supports, does not replace farmer judgment" message, shown on the main screen. */
export function JudgmentNote({ compact = false }: { compact?: boolean }) {
  const { t, L } = useI18n();
  if (compact) {
    return (
      <p className="flex items-start gap-2 text-sm text-ink-2">
        <HandGlyph />
        <span>
          <strong className="font-semibold text-ink">{t("judgment.title")}</strong> {t("judgment.body")}
        </span>
      </p>
    );
  }
  return (
    <aside role="note" className="flex gap-4 border-l-4 border-loam bg-panel px-4 py-4 sm:px-6">
      <HandGlyph large />
      <div className="max-w-[72ch]">
        <p className="font-serif text-xl font-semibold leading-snug sm:text-2xl">{t("judgment.title")} {t("judgment.body")}</p>
        <p className="mt-1 text-[0.95rem] text-ink-2">{L(DISCLAIMER)}</p>
      </div>
    </aside>
  );
}

function HandGlyph({ large = false }: { large?: boolean }) {
  const s = large ? 34 : 18;
  // a sprouting seedling: the tool supports growth, the farmer decides
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0 text-loam">
      <path d="M12 21v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M12 13c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5Z" fill="currentColor" opacity="0.85" />
      <path d="M12 15.5c0-3-2.3-5-5.5-5 0 3 2.3 5 5.5 5Z" fill="currentColor" opacity="0.6" />
      <path d="M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
