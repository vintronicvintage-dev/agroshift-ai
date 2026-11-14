"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, BarChart3, Droplets, Moon, RefreshCw, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AUTH_ENABLED } from "@/lib/auth/config";
import { setTheme, useTheme } from "@/lib/ui/theme";
import { Logo } from "@/components/brand/Logo";

const VALUE_PROPS = [
  {
    icon: BarChart3,
    tr: "Ürün ve Verim Analizi",
    en: "Crop & Yield Analysis",
  },
  {
    icon: Droplets,
    tr: "Su ve Sulama Planlaması",
    en: "Water & Irrigation Planning",
  },
  {
    icon: RefreshCw,
    tr: "Ürün Rotasyonu Optimizasyonu",
    en: "Crop Rotation Optimization",
  },
] as const;

export function AuthShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const theme = useTheme();
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  const tr = lang === "tr";
  const isRegister = pathname.startsWith("/kayit");

  return (
    <div className="grid min-h-dvh bg-[#F8F8F3] text-[#17251B] lg:grid-cols-12">
      {/* ── Left Column: Combine Harvester Photo + AgroShift AI Brand Identity ── */}
      <aside
        aria-label={t("auth.brand.label")}
        className="relative hidden overflow-hidden bg-[#0B281C] text-white lg:col-span-6 lg:flex lg:flex-col lg:justify-between lg:p-10"
      >
        <Image
          src="/images/agro/combine-harvester.png"
          alt={tr ? "Hasat yapan biçerdöver ve buğday tarlası" : "Combine harvester in golden wheat field"}
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0B281C]/95 via-[#0B281C]/65 to-[#0B281C]/45"
        />

        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none">
            <Logo tone="light" size={34} />
          </Link>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11.5px] font-medium text-[#D7E6DC]">
            {tr ? "Temsilî tarla fotoğrafı" : "Illustrative farm photo"}
          </span>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="space-y-3">
            <h2 className="font-display text-[30px] font-bold leading-tight tracking-tight text-white xl:text-[34px]">
              {tr
                ? "Daha verimli, daha dirençli ve daha kârlı tarım için bilimsel destek."
                : "Scientific support for more resilient, water-efficient, and profitable farming."}
            </h2>
            <p className="text-[14.5px] leading-relaxed text-[#D7E6DC]">
              {tr
                ? "NASA POWER iklim verileri, SoilGrids toprak profili ve FAO-56 su dengesi ile 3 yıllık ekim nöbetinizi güvenle planlayın."
                : "Plan 3-year crop rotations using NASA POWER climate records, SoilGrids soil profiles, and FAO-56 daily water balance."}
            </p>
          </div>

          <ul className="grid grid-cols-3 gap-4 border-t border-white/20 pt-5">
            {VALUE_PROPS.map((item) => {
              const IconComp = item.icon;
              return (
                <li key={item.tr} className="space-y-2">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/15 text-[#A3C75B]">
                    <IconComp className="size-4.5" />
                  </span>
                  <div className="text-[12.5px] font-semibold leading-snug text-white">
                    {tr ? item.tr : item.en}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* ── Right Column: Tabbed Login / Register Form ── */}
      <div className="flex flex-col justify-between bg-[#FFFFFF] px-5 py-6 sm:px-10 lg:col-span-6 lg:px-14">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center lg:hidden">
            <Logo tone="dark" size={28} />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 min-w-[44px] items-center justify-center rounded-xl border border-[#E5E9E0] bg-[#F8F8F3] px-3 text-[12.5px] font-semibold text-[#17251B] hover:border-[#397A42]"
              lang={tr ? "en" : "tr"}
              aria-label={t("lang.switchLabel")}
              onClick={() => setLang(tr ? "en" : "tr")}
            >
              {tr ? "EN" : "TR"}
            </button>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-[#E5E9E0] bg-[#F8F8F3] text-[#17251B] hover:border-[#397A42]"
              aria-label={themeLabel}
              title={themeLabel}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </header>

        <main id="icerik" className="mx-auto my-auto w-full max-w-[430px] py-8">
          {/* Login / Register Switcher Tabs */}
          <div
            role="tablist"
            aria-label={tr ? "Kimlik doğrulama sekmeleri" : "Authentication tabs"}
            className="mb-7 grid grid-cols-2 rounded-xl border border-[#E5E9E0] bg-[#F8F8F3] p-1"
          >
            <Link
              href="/giris"
              role="tab"
              aria-selected={!isRegister}
              className={`rounded-lg py-2.5 text-center text-[13.5px] font-semibold transition-colors ${
                !isRegister
                  ? "bg-[#123D2A] text-white shadow-xs"
                  : "text-[#66746B] hover:text-[#17251B]"
              }`}
            >
              {tr ? "Giriş Yap" : "Sign In"}
            </Link>
            <Link
              href="/kayit"
              role="tab"
              aria-selected={isRegister}
              className={`rounded-lg py-2.5 text-center text-[13.5px] font-semibold transition-colors ${
                isRegister
                  ? "bg-[#123D2A] text-white shadow-xs"
                  : "text-[#66746B] hover:text-[#17251B]"
              }`}
            >
              {tr ? "Kayıt Ol" : "Create Account"}
            </Link>
          </div>

          <div className="mb-6 space-y-1.5">
            <h1 className="font-display text-[26px] font-bold tracking-tight text-[#17251B]">
              {title}
            </h1>
            <p className="text-[14px] text-[#66746B]">{lead}</p>
          </div>

          {!AUTH_ENABLED && (
            <div className="mb-5 rounded-xl border border-[#b76e00]/30 bg-[#fdf6e7] px-3.5 py-2.5 text-[13px] text-[#784400]">
              {t("auth.unavailable")}
            </div>
          )}

          <div className="space-y-4">{children}</div>

          <div className="mt-7 border-t border-[#E5E9E0] pt-5">
            <Link
              href="/tarla"
              className="inline-flex w-full items-center justify-between rounded-xl border border-[#E5E9E0] bg-[#F8F8F3] px-4 py-3 text-[13.5px] font-semibold text-[#123D2A] transition-colors hover:border-[#397A42]"
            >
              <span>{tr ? "Giriş yapmadan tarlayı aç" : "Open workspace without signing in"}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </main>

        <footer className="text-center text-[12px] text-[#66746B]">
          AgroShift AI · {tr ? "Bilimsel Tarımsal Karar Destek Platformu" : "Scientific Agricultural Decision Platform"}
        </footer>
      </div>
    </div>
  );
}
