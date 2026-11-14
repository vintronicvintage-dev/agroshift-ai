"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { AUTH_ENABLED } from "@/lib/auth/config";
import { setTheme, useTheme } from "@/lib/ui/theme";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icons";
import { ImageCredit } from "@/components/ui/ImageCredit";
import { IMAGES } from "@/lib/ui/images";

/**
 * Sign-in pages: the form column on the left, the Harran Plain Landsat scene full-bleed on the
 * right with Ortho Console chrome (corner ticks, sensor caption, solid plate). One column on phones,
 * where the scene becomes a short strip above the form. Signing in is optional: the tool is open.
 */
export function AuthShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const theme = useTheme();
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex min-w-0 flex-col px-4 py-3 sm:px-10">
        <header className="flex h-12 items-center justify-between gap-3">
          <Link href="/" className="tap rounded-md" aria-label={t("nav.home")}>
            <Logo variant="horizontal" size={24} title="" />
          </Link>
          <span className="flex items-center gap-1">
            <button type="button" className="btn btn-quiet btn-icon" lang={lang === "tr" ? "en" : "tr"} aria-label={t("lang.switchLabel")} onClick={() => setLang(lang === "tr" ? "en" : "tr")}>
              <span className="font-mono text-[12px] font-semibold" aria-hidden="true">
                {lang === "tr" ? "EN" : "TR"}
              </span>
            </button>
            <button type="button" className="btn btn-quiet btn-icon" aria-label={themeLabel} title={themeLabel} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
          </span>
        </header>
        <ScenePanel compact />
        <main id="icerik" className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-8">
          <h1 className="display text-[34px]">{title}</h1>
          <p className="mt-2 text-[15px] text-ink-2">{lead}</p>
          <p className="mt-4 flex items-start gap-2 rounded-md border border-line px-3 py-2.5 text-[14px] text-ink-2">
            <Icon name="info" size={18} className="mt-0.5 shrink-0" />
            <span>
              {t("auth.optional")}{" "}
              <Link href="/" className="font-semibold text-accent-ink underline underline-offset-2">
                {t("auth.toTool")}
              </Link>
            </span>
          </p>
          {!AUTH_ENABLED && <p className="mt-3 text-[14px] text-ink-2">{t("auth.unavailable")}</p>}
          <div className="mt-7">{children}</div>
        </main>
        <p className="readout pb-3">{t("footer.challenge")}</p>
      </div>
      <ScenePanel />
    </div>
  );
}

function ScenePanel({ compact = false }: { compact?: boolean }) {
  const { t, L } = useI18n();
  const img = IMAGES.harranPlain;
  return (
    <aside
      className={compact ? "relative -mx-4 mt-1 h-40 overflow-hidden sm:-mx-10 lg:hidden" : "relative hidden overflow-hidden border-l border-line lg:block"}
      aria-label={compact ? undefined : t("auth.brand.label")}
      aria-hidden={compact ? true : undefined}
    >
      {compact ? (
        <div className="absolute inset-0 bg-cover bg-[50%_45%]" style={{ backgroundImage: `url(${img.src})` }} />
      ) : (
        <Image src={img.src} alt={L(img.alt)} fill sizes="55vw" placeholder="blur" blurDataURL={img.blurDataURL} className="object-cover object-[50%_60%]" priority />
      )}
      <Ticks />
      <ImageCredit text={img.creditShort} className="absolute right-3 top-3" />
      {!compact && (
        <div className="absolute inset-x-0 bottom-0 p-6 xl:p-8">
          <div className="plate max-w-[26rem] p-5" style={{ background: "rgb(11 14 12 / 0.86)", color: "#eef2ec", borderColor: "#26302a" }}>
            <Logo variant="horizontal" size={22} tone="light" title="" />
            <p className="mt-3 text-[17px] font-medium leading-snug">{t("auth.brand.v3")}</p>
            <p className="mt-3 border-t border-white/10 pt-2.5 font-mono text-[12px] text-[#c4ccc4]">{t("img.harran.caption")}</p>
          </div>
        </div>
      )}
    </aside>
  );
}

/** Ortho Console corner ticks over imagery. */
function Ticks() {
  const c = "absolute size-4 border-[#d4ff3a]";
  return (
    <span aria-hidden="true">
      <span className={`${c} left-3 top-3 border-l-[1.5px] border-t-[1.5px]`} />
      <span className={`${c} bottom-3 left-3 border-b-[1.5px] border-l-[1.5px]`} />
      <span className={`${c} bottom-3 right-3 border-b-[1.5px] border-r-[1.5px]`} />
    </span>
  );
}
