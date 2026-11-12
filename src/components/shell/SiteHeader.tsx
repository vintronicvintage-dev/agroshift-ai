"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { setTheme, useTheme } from "@/lib/ui/theme";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const theme = useTheme();
  const path = usePathname();
  return (
    <header className="border-b border-rule bg-paper">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[2000] focus:rounded focus:bg-panel focus:px-3 focus:py-2">
        {t("nav.skip")}
      </a>
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label={t("app.name")}>
          <Wordmark />
          <span className="hidden text-sm text-ink-2 md:inline">{t("app.tagline")}</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2 text-sm" aria-label="primary">
          <Link href="/" className="btn" aria-current={path === "/" ? "page" : undefined}>
            {t("nav.tool")}
          </Link>
          <Link href="/yontem" className="btn" aria-current={path === "/yontem" ? "page" : undefined}>
            {t("nav.methods")}
          </Link>
          <button type="button" className="btn" lang={lang === "tr" ? "en" : "tr"} aria-label={t("lang.switchLabel")} onClick={() => setLang(lang === "tr" ? "en" : "tr")}>
            {t("lang.switch")}
          </button>
          <button
            type="button"
            className="btn"
            aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
            title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <ThemeGlyph dark={theme === "dark"} />
          </button>
        </nav>
      </div>
    </header>
  );
}

function ThemeGlyph({ dark }: { dark: boolean }) {
  return dark ? (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="8" y1="1.2" x2="8" y2="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${a} 8 8)`} />
      ))}
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.8 1.6a6.5 6.5 0 1 0 3.6 9.6A5.3 5.3 0 0 1 10.8 1.6Z" fill="currentColor" />
    </svg>
  );
}
