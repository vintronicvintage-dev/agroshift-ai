"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/ui/Icons";
import { useI18n, type DictKey } from "@/lib/i18n";
import { setTheme, useTheme } from "@/lib/ui/theme";
import { pilotField, setField, setStore, useStore } from "@/lib/ui/fieldStore";
import { PILOTS } from "@/lib/data/pilots";
import { useAuthUser } from "@/lib/auth/useAuthUser";
import { useFieldData } from "@/components/data/FieldData";

const PLACES: { href: string; key: DictKey; icon: IconName }[] = [
  { href: "/", key: "nav.field", icon: "dashboard" },
  { href: "/plan", key: "nav.plan", icon: "plan" },
  { href: "/dayanak", key: "nav.evidence", icon: "evidence" },
  { href: "/yontem", key: "nav.methods", icon: "methods" },
];

type SidebarItem = {
  id: string;
  href: string;
  icon: IconName;
  labelTr: string;
  labelEn: string;
  matchPath?: string;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "dashboard", href: "/", icon: "dashboard", labelTr: "Kontrol Paneli", labelEn: "Control Panel", matchPath: "/" },
  { id: "fields", href: "/#harita-bolumu", icon: "field", labelTr: "Arazilerim ve Harita", labelEn: "My Fields & Map" },
  { id: "crops", href: "/#urun-onerileri", icon: "sprout", labelTr: "Ürün Önerileri", labelEn: "Crop Recommendations" },
  { id: "rotation", href: "/plan", icon: "plan", labelTr: "Rotasyon Planı", labelEn: "Rotation Plan", matchPath: "/plan" },
  { id: "analytics", href: "/#analiz-grafikler", icon: "chart", labelTr: "Analiz ve Grafikler", labelEn: "Analytics & Charts" },
  { id: "risk", href: "/#risk-simulasyonlari", icon: "shield", labelTr: "Risk Simülasyonları", labelEn: "Risk Simulations" },
  { id: "evidence", href: "/dayanak", icon: "evidence", labelTr: "Bilimsel Dayanak", labelEn: "Scientific Evidence", matchPath: "/dayanak" },
  { id: "methods", href: "/yontem", icon: "methods", labelTr: "Yöntem ve Kaynaklar", labelEn: "Methods & Sources", matchPath: "/yontem" },
];

/** Persistent left forest-green sidebar + top command bar on desktop; responsive header + bottom bar on phones. */
export function AppShell({ children, full = false }: { children: ReactNode; full?: boolean }) {
  const { t } = useI18n();
  const path = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      <a href="#icerik" className="skip">
        {t("nav.skip")}
      </a>

      {/* Desktop persistent left sidebar */}
      <Sidebar path={path} />

      {/* Mobile slide-over drawer */}
      {mobileNavOpen && (
        <div className="no-print fixed inset-0 z-[1400] flex lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.places")}>
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <div className="sidebar-rail relative z-10 flex w-[268px] max-w-[82vw] flex-col justify-between p-4 shadow-2xl">
            <SidebarContent path={path} onSelect={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar path={path} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main
          id="icerik"
          tabIndex={-1}
          className={full ? "relative min-h-0 flex-1 pb-20 outline-none lg:pb-6" : " pb-24 outline-none lg:pb-10"}
        >
          {children}
        </main>
        <BottomNav path={path} />
      </div>
    </div>
  );
}

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function Sidebar({ path }: { path: string }) {
  return (
    <aside className="sidebar-rail no-print sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col justify-between border-r border-white/10 p-4 lg:flex">
      <SidebarContent path={path} />
    </aside>
  );
}

function SidebarContent({ path, onSelect }: { path: string; onSelect?: () => void }) {
  const { lang } = useI18n();
  return (
    <>
      <div>
        <div className="flex items-center justify-between px-2 pb-5 pt-1">
          <Link href="/" onClick={onSelect} className="tap flex items-center gap-2.5 rounded-lg">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#2e7d32] text-[#a7f3d0] shadow-inner">
              <Icon name="leaf" size={20} />
            </span>
            <Logo variant="wordmark" size={22} tone="light" title="AgroShift" />
          </Link>
        </div>

        <nav aria-label={lang === "tr" ? "Ana menü" : "Main navigation"} className="space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const active = item.matchPath ? isActive(path, item.matchPath) : false;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onSelect}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[42px] items-center gap-3 rounded-xl px-3.5 py-2 text-[14px] font-medium transition-colors ${
                  active
                    ? "bg-[#2e7d32] text-white shadow-sm font-semibold"
                    : "text-[#d5e6d7] hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={item.icon} size={19} className={active ? "text-[#bbf7d0]" : "text-[#9bc2a1]"} />
                <span className="truncate">{lang === "tr" ? item.labelTr : item.labelEn}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sustainability & Telemetry Card matching reference mockup */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/15 bg-[#0f2916]/90 p-4 text-[#e2f1e4]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[14px] font-semibold leading-snug text-white">
              {lang === "tr" ? "Sürdürülebilir" : "Sustainable"}
            </p>
            <p className="text-[13px] font-medium text-[#86efac]">
              {lang === "tr" ? "Tarım, Güçlü Gelecek" : "Farming, Strong Future"}
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#2e7d32]/60 text-[#86efac]">
            <Icon name="sprout" size={20} />
          </span>
        </div>
        <p className="mt-2.5 border-t border-white/10 pt-2 font-mono text-[11px] leading-relaxed text-[#a8c5ad]">
          NASA POWER · MODIS 250m · SMAP L4 · SoilGrids · FAO-56
        </p>
      </div>
    </>
  );
}

function TopBar({ path, onOpenMobileNav }: { path: string; onOpenMobileNav: () => void }) {
  const { t, lang, setLang } = useI18n();
  const theme = useTheme();
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");

  const pageMeta =
    path.startsWith("/plan")
      ? {
          title: lang === "tr" ? "Üç Yıllık Ekim Nöbeti ve Karşılaştırma" : "Three-Year Crop Rotation & Comparison",
          sub: lang === "tr" ? "FAO-56 günlük su dengesi, TOPSIS çok kriterli sıralama ve 24 yıllık iklim serisi simülasyonu." : "FAO-56 daily water balance, TOPSIS multi-criteria ranking and 24-year climate replay.",
        }
      : path.startsWith("/dayanak")
        ? {
            title: lang === "tr" ? "Bilimsel Dayanak ve Kanıtlar" : "Scientific Evidence & Provenance",
            sub: lang === "tr" ? "Önerilen rotasyonun iklim, toprak, azot dengesi ve duyarlılık analizleriyle doğrulanması." : "Verification of the recommended rotation against climate, soil, nitrogen balance and sensitivity sweeps.",
          }
        : path.startsWith("/yontem")
          ? {
              title: lang === "tr" ? "Yöntem, Formüller ve Veri Kaynakları" : "Methods, Equations & Data Sources",
              sub: lang === "tr" ? "Penman-Monteith ET₀, Saxton-Rawls pedotransfer, SCS-CN yüzey akışı ve birincil literatür." : "Penman-Monteith ET0, Saxton-Rawls pedotransfer, SCS-CN runoff and primary literature.",
            }
          : {
              title: lang === "tr" ? "Kontrol Paneli" : "Control Panel",
              sub:
                lang === "tr"
                  ? "Arazinizin mevcut durumu, NASA uydu verileri ve bilimsel su-verim modellerine göre önerileriniz aşağıda yer almaktadır."
                  : "Your parcel status, NASA satellite telemetry, and scientific water-yield recommendations are summarized below.",
            };

  return (
    <header className="no-print sticky top-0 z-[1100] flex min-h-[68px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="btn btn-quiet btn-icon lg:hidden"
          aria-label={lang === "tr" ? "Menüyü aç" : "Open menu"}
          onClick={onOpenMobileNav}
        >
          <Icon name="list" size={20} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="display truncate text-[22px] text-ink sm:text-[26px]">{pageMeta.title}</h1>
          </div>
          <p className="hidden truncate text-[13px] text-ink-2 md:block">{pageMeta.sub}</p>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <PilotLocationSelector />
        <ScenarioQuickSelector />
        <button
          type="button"
          className="btn btn-sm px-2.5"
          lang={lang === "tr" ? "en" : "tr"}
          aria-label={t("lang.switchLabel")}
          onClick={() => setLang(lang === "tr" ? "en" : "tr")}
        >
          <Icon name="globe" size={16} className="text-ink-2" />
          <span className="font-mono text-[12px] font-semibold" aria-hidden="true">
            {lang === "tr" ? "TR" : "EN"}
          </span>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-icon"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
        </button>
        <Account />
      </div>
    </header>
  );
}

function PilotLocationSelector() {
  const { n, lang } = useI18n();
  const s = useStore();
  const { analysis } = useFieldData();
  const da = s.field ? (s.inputs.areaOverrideDa ?? s.field.areaDa) : null;

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-bg px-2.5 py-1.5 text-[13px]">
      <Icon name="pin" size={16} className="shrink-0 text-accent-ink" />
      <label htmlFor="header-pilot-select" className="sr-only">
        {lang === "tr" ? "Arazi veya Pilot Havza Seçin" : "Select Field or Pilot Basin"}
      </label>
      <select
        id="header-pilot-select"
        className="bg-transparent font-semibold text-ink outline-none cursor-pointer pr-1"
        value={s.field?.pilotId ?? "custom"}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "custom") return;
          const pf = pilotField(val, lang);
          if (pf) setField(pf);
        }}
      >
        {!s.field?.pilotId && s.field && (
          <option value="custom">{s.field.name}</option>
        )}
        {PILOTS.map((p) => (
          <option key={p.id} value={p.id}>
            {lang === "tr" ? p.nameTr : p.nameEn}
          </option>
        ))}
      </select>
      {da !== null && (
        <span className="readout hidden border-l border-line pl-2 sm:inline">
          {n(da, da < 100 ? 1 : 0)} da
        </span>
      )}
      {analysis.running && (
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-accent" title={lang === "tr" ? "Hesaplanıyor" : "Computing"} />
      )}
    </div>
  );
}

function ScenarioQuickSelector() {
  const { lang } = useI18n();
  const s = useStore();
  const sc = s.scenario;
  const currentPreset =
    sc.rainMultiplier === 0.8 && sc.tempDeltaC === 0
      ? "dry"
      : sc.rainMultiplier === 0.85 && sc.tempDeltaC === 2
        ? "hot_dry"
        : sc.priceMultiplier === 0.8
          ? "price_drop"
          : "typical";

  return (
    <div className="hidden items-center gap-1.5 rounded-xl border border-line-strong bg-bg px-2.5 py-1.5 text-[13px] sm:flex">
      <Icon name="calendar" size={16} className="shrink-0 text-ink-2" />
      <label htmlFor="header-scenario-select" className="sr-only">
        {lang === "tr" ? "İklim ve Piyasa Senaryosu" : "Climate & Market Scenario"}
      </label>
      <select
        id="header-scenario-select"
        className="bg-transparent font-medium text-ink outline-none cursor-pointer"
        value={currentPreset}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "dry") setStore({ scenario: { preset: "dry", rainMultiplier: 0.8, tempDeltaC: 0, priceMultiplier: 1 } });
          else if (v === "hot_dry") setStore({ scenario: { preset: "hot_dry", rainMultiplier: 0.85, tempDeltaC: 2, priceMultiplier: 1 } });
          else if (v === "price_drop") setStore({ scenario: { preset: "custom", rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 0.8 } });
          else setStore({ scenario: { preset: "typical", rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 1 } });
        }}
      >
        <option value="typical">{lang === "tr" ? "Normal İklim (2001–2024)" : "Baseline Climate (2001–2024)"}</option>
        <option value="dry">{lang === "tr" ? "Kuraklık Senaryosu (-%20 Yağış)" : "Drought Scenario (-20% Rain)"}</option>
        <option value="hot_dry">{lang === "tr" ? "Sıcaklık Artışı (+2 °C & Kurak)" : "Warming (+2 °C & Dry)"}</option>
        <option value="price_drop">{lang === "tr" ? "Piyasa Fiyat Düşüşü (-%20)" : "Market Price Drop (-20%)"}</option>
      </select>
    </div>
  );
}

function Account() {
  const { t, lang } = useI18n();
  const u = useAuthUser();
  if (u.status === "signed-in") {
    return (
      <div className="hidden items-center gap-2 rounded-xl border border-line bg-bg px-3 py-1.5 text-[13px] xl:flex" title={u.email}>
        <span className="flex size-7 items-center justify-center rounded-full bg-accent text-on-accent font-semibold">
          {(u.name ?? u.email ?? "U").slice(0, 1).toUpperCase()}
        </span>
        <div className="leading-tight">
          <p className="max-w-[9rem] truncate font-semibold text-ink">{u.name ?? u.email}</p>
          <p className="text-[11px] text-ink-2">{lang === "tr" ? "Üretici Hesabı" : "Grower Account"}</p>
        </div>
      </div>
    );
  }
  return (
    <Link href="/giris" className="btn btn-sm hidden px-3 text-[13px] md:inline-flex">
      <Icon name="user" size={16} className="text-accent-ink" />
      <span>{t("nav.signIn")}</span>
    </Link>
  );
}

function BottomNav({ path }: { path: string }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("nav.places")} className="no-print fixed inset-x-0 bottom-0 z-[1100] grid h-16 grid-cols-4 border-t border-line bg-surface lg:hidden">
      {PLACES.map((p) => {
        const a = isActive(path, p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={a ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${a ? "text-accent-ink font-semibold" : "text-ink-2"}`}
          >
            {a && <span className="absolute inset-x-5 top-0 h-0.5 bg-accent" aria-hidden="true" />}
            <Icon name={p.icon} size={20} />
            <span className="truncate max-w-[90%]">{t(p.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** The decision note that sits next to every recommendation. */
export function JudgmentNote({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <aside className={`bento-card flex gap-3 p-4 ${className}`} aria-label={t("judgment.title")}>
      <Icon name="info" size={20} className="mt-0.5 shrink-0 text-accent-ink" />
      <p className="text-[14px]">
        <strong className="font-semibold">{t("judgment.title")}</strong> {t("v3.judgment.body")}
      </p>
    </aside>
  );
}

/** Page title block for document pages. */
export function PageHead({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="display text-[28px] sm:text-[34px]">{title}</h2>
        {lead && <p className="lead mt-1.5 text-[15px]">{lead}</p>}
      </div>
      {children}
    </div>
  );
}
