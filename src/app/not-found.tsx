"use client";

import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { SpotArt } from "@/components/brand/SpotArt";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div className="mx-auto flex max-w-[640px] flex-col items-start px-4 py-16">
        <SpotArt name="no-field" width={220} className="text-ink-3" />
        <p className="numeral mt-4 text-[64px]">404</p>
        <h1 className="display mt-2 text-[32px]">{t("nf.title")}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{t("nf.lead")}</p>
        <Link href="/" className="btn btn-primary mt-5">
          {t("nf.home")}
        </Link>
      </div>
    </AppShell>
  );
}
