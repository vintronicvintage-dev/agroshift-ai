"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { AUTH_ENABLED } from "@/lib/auth/config";
import { setTheme, useTheme } from "@/lib/ui/theme";
import { Wordmark } from "@/components/shell/Wordmark";
import { Icon } from "@/components/ui/Icons";
import { ImageCredit } from "@/components/ui/ImageCredit";
import { IMAGES } from "@/lib/ui/images";

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
 * A real Landsat scene is the hero: the Harran Plain in August 2002, the Atatürk Reservoir in deep
 * blue at the top and the irrigated fields green at the lower right. Only a faint uniform tone sits
 * over the whole picture. The value sentences live in a compact dark glass card anchored over the
 * low-detail dry land at the lower left, sized for AA contrast against the brightest pixel of the
 * scene. The panel is dark in both themes, like the scene itself.
 */
function BrandPanel() {
  const { t, L } = useI18n();
  const img = IMAGES.harranPlain;
  return (
    <aside className="auth-brand relative hidden overflow-hidden border-l border-rule lg:flex lg:flex-col lg:justify-end" aria-label={t("auth.brand.label")}>
      <Image
        src={img.src}
        alt={L(img.alt)}
        fill
        sizes="(min-width: 1024px) 52vw, 16px"
        loading="eager"
        fetchPriority="high"
        placeholder="blur"
        blurDataURL={img.blurDataURL}
        className="object-cover object-[50%_60%]"
      />
      <div className="auth-tone absolute inset-0" aria-hidden="true" />
      <ImageCredit text={img.creditShort} className="absolute right-4 top-4" />
      <div className="relative p-6 xl:p-8">
        <div className="auth-glass max-w-[20.5rem] rounded-2xl px-5 py-4.5 xl:max-w-[24rem]">
          <ul className="space-y-2.5">
            {(["auth.brand.1", "auth.brand.2", "auth.brand.3"] as const).map((k, i) => (
              <li key={k} className="flex items-start gap-3">
                <span className={`mt-[0.5rem] h-2 w-5 shrink-0 rounded-full ${i === 0 ? "bg-[#c8f25a]" : i === 1 ? "bg-[#56b4e9]" : "border border-dashed border-[#e2ae73]"}`} aria-hidden="true" />
                <span className="font-display text-[1.06rem] font-medium leading-snug tracking-[-0.01em]">{t(k)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3.5 border-t border-white/10 pt-3 text-[0.76rem] leading-snug text-[#c9d4cb]">{t("auth.brand.caption")}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.72rem] leading-snug text-[#c9d4cb]">
            <Icon name="pin" size={12} />
            {t("img.harran.caption")}
          </p>
        </div>
      </div>
    </aside>
  );
}
