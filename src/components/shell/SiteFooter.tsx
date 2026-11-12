"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { DISCLAIMER } from "@/lib/engine";

export function SiteFooter() {
  const { t, L } = useI18n();
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto max-w-[1320px] space-y-2 px-4 py-8 text-sm text-ink-2 sm:px-6">
        <p className="max-w-[70ch]">{L(DISCLAIMER)}</p>
        <p>
          {t("footer.challenge")} {t("footer.noGen")}{" "}
          <Link href="/yontem" className="text-sky underline">
            {t("nav.methods")}
          </Link>
        </p>
      </div>
    </footer>
  );
}
