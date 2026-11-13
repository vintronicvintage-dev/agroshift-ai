"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { AUTH_ENABLED } from "@/lib/auth/config";
import { setTheme, useTheme } from "@/lib/ui/theme";
import { Wordmark } from "@/components/shell/Wordmark";
import { Icon } from "@/components/ui/Icons";

/** Two columns: the form on the left, a code-drawn brand panel on the right. One column on phones. */
export function AuthShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const theme = useTheme();
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-w-0 flex-col px-5 py-5 sm:px-10">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="tap rounded-lg" aria-label={t("app.name")}>
            <Wordmark />
          </Link>
          <span className="flex items-center gap-1">
            <button type="button" className="btn btn-quiet gap-1.5 px-2.5 text-[0.8rem] font-semibold" lang={lang === "tr" ? "en" : "tr"} aria-label={t("lang.switchLabel")} onClick={() => setLang(lang === "tr" ? "en" : "tr")}>
              <Icon name="lang" size={17} />
              <span aria-hidden="true">{lang === "tr" ? "EN" : "TR"}</span>
            </button>
            <button type="button" className="btn btn-quiet px-2.5" aria-label={themeLabel} title={themeLabel} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>
          </span>
        </header>
        <main id="icerik" className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em]">{title}</h1>
          <p className="mt-2 text-[0.95rem] text-ink-2">{lead}</p>
          {!AUTH_ENABLED && <GuestNotice />}
          <div className="mt-7">{children}</div>
        </main>
        <p className="text-[0.75rem] text-ink-2">{t("footer.challenge")}</p>
      </div>
      <BrandPanel />
    </div>
  );
}

function GuestNotice() {
  const { t } = useI18n();
  return (
    <div role="note" className="mt-6 rounded-xl border border-[color-mix(in_srgb,var(--warn-ink)_25%,transparent)] bg-warn px-4 py-3 text-warn-ink">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="info" size={17} />
        {t("auth.guest.title")}
      </p>
      <p className="mt-1 text-sm">{t("auth.guest.body")}</p>
      <Link href="/" className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2">
        {t("auth.toGuest")}
        <Icon name="arrow" size={15} />
      </Link>
    </div>
  );
}

/**
 * Drawn in code: a satellite's ground track sweeping over a field cut into three strips (the
 * three rotation years), with the three value sentences.
 */
function BrandPanel() {
  const { t } = useI18n();
  return (
    <aside className="relative hidden overflow-hidden border-l border-rule bg-rail lg:flex lg:flex-col lg:justify-between" aria-label={t("auth.brand.label")}>
      <svg viewBox="0 0 640 520" className="absolute inset-x-0 top-0 h-[70%] w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="strip-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--rail)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--rail)" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* field strips in perspective: three years, then repeat */}
        <g transform="translate(320 300) skewX(-24) translate(-320 -300)">
          {Array.from({ length: 9 }, (_, i) => {
            const k = i % 3;
            const fill = k === 0 ? "var(--accent)" : k === 1 ? "var(--c-precip)" : "none";
            return (
              <rect
                key={i}
                x={120 + i * 46}
                y={180}
                width={36}
                height={320}
                rx={6}
                fill={fill}
                fillOpacity={k === 0 ? 0.72 : 0.38}
                stroke={k === 2 ? "var(--loam)" : "none"}
                strokeWidth={1.5}
                strokeDasharray={k === 2 ? "5 5" : undefined}
              />
            );
          })}
        </g>
        <rect x="0" y="300" width="640" height="220" fill="url(#strip-fade)" />
        {/* orbit and ground track */}
        <ellipse className="auth-orbit" cx="320" cy="150" rx="300" ry="86" fill="none" stroke="var(--rule-strong)" strokeWidth="1.2" />
        <path className="auth-pass" d="M -20 250 C 140 120, 360 60, 660 110" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
        <g transform="translate(468 74) rotate(18)">
          <rect x="-7" y="-7" width="14" height="14" rx="2.5" fill="var(--panel)" stroke="var(--ink)" strokeWidth="1.4" />
          <rect x="-34" y="-5" width="22" height="10" rx="1.5" fill="none" stroke="var(--ink-2)" strokeWidth="1.3" />
          <rect x="12" y="-5" width="22" height="10" rx="1.5" fill="none" stroke="var(--ink-2)" strokeWidth="1.3" />
        </g>
        <path d="M468 86 L 430 300" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 5" />
        <path d="M468 86 L 520 300" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 5" />
      </svg>
      <div className="relative mt-auto px-12 pb-12 pt-[52%]">
        <ul className="max-w-[30rem] space-y-4">
          {(["auth.brand.1", "auth.brand.2", "auth.brand.3"] as const).map((k, i) => (
            <li key={k} className="flex items-start gap-3.5">
              <span className={`mt-1.5 h-2.5 w-6 shrink-0 rounded-full ${i === 0 ? "bg-accent" : i === 1 ? "bg-[var(--c-precip)]" : "border border-dashed border-loam"}`} aria-hidden="true" />
              <span className="font-display text-[1.3rem] font-medium leading-snug tracking-[-0.015em]">{t(k)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-[0.8rem] text-ink-2">{t("auth.brand.caption")}</p>
      </div>
    </aside>
  );
}
