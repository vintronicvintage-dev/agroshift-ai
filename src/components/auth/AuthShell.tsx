"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { AUTH_ENABLED } from "@/lib/auth/config";
import { setTheme, useTheme } from "@/lib/ui/theme";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/ui/Icons";
import { ImageCredit } from "@/components/ui/ImageCredit";
import { IMAGES } from "@/lib/ui/images";

/**
 * Split-card authentication layout matching the user's reference board:
 * Left: Clean white form column with leaf brand lockup and clear inputs.
 * Right: Sunlit agricultural landscape with 3 stacked capability badges.
 */
export function AuthShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const theme = useTheme();
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-3 sm:p-6 lg:p-10">
      <div className="bento-card grid w-full max-w-[1100px] overflow-hidden lg:min-h-[660px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <div className="flex min-w-0 flex-col justify-between bg-surface px-5 py-5 sm:px-10 sm:py-8">
          <header className="flex h-12 items-center justify-between gap-3">
            <Link href="/" className="tap flex items-center gap-2 rounded-lg" aria-label={t("nav.home")}>
              <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-on-accent">
                <Icon name="leaf" size={20} />
              </span>
              <Logo variant="wordmark" size={22} title="" />
            </Link>
            <span className="flex items-center gap-1">
              <button
                type="button"
                className="btn btn-quiet btn-icon"
                lang={lang === "tr" ? "en" : "tr"}
                aria-label={t("lang.switchLabel")}
                onClick={() => setLang(lang === "tr" ? "en" : "tr")}
              >
                <span className="font-mono text-[12px] font-semibold" aria-hidden="true">
                  {lang === "tr" ? "EN" : "TR"}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-quiet btn-icon"
                aria-label={themeLabel}
                title={themeLabel}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} />
              </button>
            </span>
          </header>

          <ScenePanel compact />

          <main id="icerik" className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-6">
            <h1 className="display text-[30px] text-ink sm:text-[34px]">{title}</h1>
            <p className="mt-1.5 text-[15px] text-ink-2">{lead}</p>
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[13.5px] text-ink-2">
              <Icon name="info" size={18} className="mt-0.5 shrink-0 text-accent-ink" />
              <span>
                {t("auth.optional")}{" "}
                <Link href="/" className="font-semibold text-accent-ink underline underline-offset-2">
                  {t("auth.toTool")}
                </Link>
              </span>
            </p>
            {!AUTH_ENABLED && <p className="mt-3 text-[13.5px] text-ink-2">{t("auth.unavailable")}</p>}
            <div className="mt-6">{children}</div>
          </main>

          <p className="readout pt-2">{t("footer.challenge")}</p>
        </div>
        <ScenePanel />
      </div>
    </div>
  );
}

const AUTH_FEATURES: { icon: IconName; tr: string; en: string; subTr: string; subEn: string }[] = [
  {
    icon: "satellite",
    tr: "NASA Verileri ile Daha Doğru Tahminler",
    en: "More Accurate Forecasts with NASA Telemetry",
    subTr: "POWER 24 yıllık iklim, MODIS 250m NDVI ve SMAP L4 kök nemi",
    subEn: "POWER 24-year climate, MODIS 250m NDVI and SMAP L4 root moisture",
  },
  {
    icon: "plan",
    tr: "Kişiselleştirilmiş Üretim Planı",
    en: "Personalized 3-Year Crop Rotation Plan",
    subTr: "Arazinizin toprak dokusu ve su bütçesine özel FAO-56 simülasyonu",
    subEn: "FAO-56 water balance tailored to your parcel texture and water budget",
  },
  {
    icon: "leaf",
    tr: "Sürdürülebilir ve Kârlı Tarım",
    en: "Sustainable & Profitable Agriculture",
    subTr: "Toprak azot dengesi, su tasarrufu ve çoklu iklim senaryo analizi",
    subEn: "Soil nitrogen balance, water savings and multi-scenario risk analysis",
  },
];

function ScenePanel({ compact = false }: { compact?: boolean }) {
  const { t, L, lang } = useI18n();
  const img = IMAGES.harranPlain;
  return (
    <aside
      className={
        compact
          ? "relative -mx-5 mt-2 h-36 overflow-hidden sm:-mx-10 lg:hidden"
          : "relative hidden overflow-hidden border-l border-line lg:flex lg:flex-col lg:justify-between"
      }
      aria-label={compact ? undefined : t("auth.brand.label")}
      aria-hidden={compact ? true : undefined}
    >
      {compact ? (
        <div className="absolute inset-0 bg-cover bg-[50%_45%]" style={{ backgroundImage: `url(${img.src})` }} />
      ) : (
        <Image
          src={img.src}
          alt={L(img.alt)}
          fill
          sizes="50vw"
          placeholder="blur"
          blurDataURL={img.blurDataURL}
          className="object-cover object-[50%_60%]"
          priority
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, rgba(16, 48, 24, 0.55) 0%, rgba(14, 38, 20, 0.72) 55%, rgba(10, 26, 14, 0.88) 100%)",
        }}
      />
      <ImageCredit text={img.creditShort} className="relative z-10 m-3 self-end" />

      {!compact && (
        <div className="relative z-10 my-auto flex flex-col gap-3.5 px-8 py-6 xl:px-10">
          {AUTH_FEATURES.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 rounded-2xl border border-white/20 bg-[#12331b]/85 px-5 py-4 text-white shadow-lg backdrop-blur-md"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#2e7d32] text-[#bbf7d0] shadow-inner">
                <Icon name={f.icon} size={22} />
              </span>
              <div>
                <p className="text-[15.5px] font-semibold leading-snug text-white">{lang === "tr" ? f.tr : f.en}</p>
                <p className="mt-0.5 text-[12.5px] text-[#c7e3cb]">{lang === "tr" ? f.subTr : f.subEn}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!compact && (
        <div className="relative z-10 border-t border-white/15 bg-[#0c2212]/80 px-8 py-3.5 text-[12px] text-[#cfe4d2]">
          <p className="font-mono">{t("img.harran.caption")}</p>
        </div>
      )}
    </aside>
  );
}
