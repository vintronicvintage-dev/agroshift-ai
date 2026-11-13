"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { DISCLAIMER } from "@/lib/engine";

export function SiteFooter() {
  const { t, L } = useI18n();
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-[1500px] space-y-1.5 px-4 py-6 text-[0.82rem] text-ink-2 sm:px-6">
        <p className="max-w-[80ch]">{L(DISCLAIMER)}</p>
        <p className="max-w-[80ch]">
          {t("footer.challenge")} {t("footer.noGen")}{" "}
          <Link href="/yontem" className="font-medium text-accent-ink underline underline-offset-2">
            {t("nav.methods")}
          </Link>
        </p>
      </div>
    </footer>
  );
}
