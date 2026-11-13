"use client";

import { useI18n } from "@/lib/i18n";

/** The small persistent credit that sits in the corner of every large photograph. */
export function ImageCredit({ text, className = "" }: { text: string; className?: string }) {
  const { t } = useI18n();
  return (
    <p className={`img-credit pointer-events-none max-w-[calc(100%-2rem)] truncate rounded-md px-2 py-1 text-[0.68rem] leading-none ${className}`}>
      {t("img.credit", { who: text })}
    </p>
  );
}
