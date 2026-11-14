"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bot,
  CloudSun,
  Coins,
  Droplets,
  FileBarChart,
  FlaskConical,
  LayoutDashboard,
  Map,
  RefreshCw,
  Settings,
  ShieldAlert,
  Sprout,
  Layers,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/ui/Icons";
import { useI18n } from "@/lib/i18n";
import { setTheme, useTheme } from "@/lib/ui/theme";
import { setStore, useStore } from "@/lib/ui/fieldStore";
import { useAuthUser } from "@/lib/auth/useAuthUser";
import { useFieldData } from "@/components/data/FieldData";
import { GlossaryTriggerButton } from "@/components/ui/TermTooltip";

const PLACES: { href: string; labelTr: string; labelEn: string; icon: IconName }[] = [
  { href: "/tarla", labelTr: "Genel Bakış", labelEn: "Overview", icon: "dashboard" },
  { href: "/tarlalarim", labelTr: "Tarlalarım", labelEn: "Fields", icon: "field" },
  { href: "/plan", labelTr: "Rotasyon", labelEn: "Rotation", icon: "plan" },
  { href: "/dayanak", labelTr: "Dayanak", labelEn: "Evidence", icon: "evidence" },
];

type NavGroup = {
  titleTr: string;
  titleEn: string;
  items: {
    id: string;
    href: string;
    labelTr: string;
    labelEn: string;
    icon: typeof LayoutDashboard;
  }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    titleTr: "Arazi ve Veri",
    titleEn: "Field & Data",
    items: [
      { id: "overview", href: "/tarla", labelTr: "Genel Bakış", labelEn: "Overview", icon: LayoutDashboard },
      { id: "fields", href: "/tarlalarim", labelTr: "Tarlalarım", labelEn: "My Fields", icon: Map },
      { id: "soil", href: "/toprak", labelTr: "Toprak Analizi", labelEn: "Soil Analysis", icon: Layers },
      { id: "climate", href: "/iklim", labelTr: "İklim Analizi", labelEn: "Climate Analysis", icon: CloudSun },
    ],
  },
  {
    titleTr: "Üretim ve Karar",
    titleEn: "Production & Decisions",
    items: [
      { id: "crops", href: "/urunler", labelTr: "Ürün Önerileri", labelEn: "Crop Advice", icon: Sprout },
      { id: "rotation", href: "/plan", labelTr: "3 Yıllık Rotasyon", labelEn: "3-Year Rotation", icon: RefreshCw },
      { id: "irrigation", href: "/sulama", labelTr: "Sulama Yönetimi", labelEn: "Irrigation", icon: Droplets },
      { id: "economy", href: "/ekonomi", labelTr: "Verim ve Ekonomi", labelEn: "Yield & Economy", icon: Coins },
      { id: "risk", href: "/risk", labelTr: "Risk Simülasyonları", labelEn: "Risk Scenarios", icon: ShieldAlert },
    ],
  },
  {
    titleTr: "Bilim ve Araçlar",
    titleEn: "Science & Tools",
    items: [
      { id: "evidence", href: "/dayanak", labelTr: "Bilimsel Dayanak", labelEn: "Scientific Evidence", icon: FlaskConical },
      { id: "assistant", href: "/asistan", labelTr: "AI Asistanı", labelEn: "AI Assistant", icon: Bot },
      { id: "reports", href: "/raporlar", labelTr: "Raporlar", labelEn: "Reports", icon: FileBarChart },
      { id: "settings", href: "/ayarlar", labelTr: "Ayarlar", labelEn: "Settings", icon: Settings },
    ],
  },
];

/** Persistent left deep-green sidebar + responsive command top bar; zero horizontal overflow on 390px mobile. */
export function AppShell({ children, full = false }: { children: ReactNode; full?: boolean }) {
  const { t } = useI18n();
  const path = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="fieldshift-workspace flex min-h-dvh w-full max-w-full overflow-x-clip bg-bg text-ink">
      <a href="#icerik" className="skip">
        {t("nav.skip")}
      </a>

      {/* Desktop persistent left sidebar */}
      <Sidebar path={path} />

      {/* Mobile slide-over drawer */}
      {mobileNavOpen && (
        <div className="no-print fixed inset-0 z-[1400] flex lg:hidden" role="dialog" aria-modal="true" aria-label={t("nav.places")}>
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <div className="sidebar-rail relative z-10 flex w-[272px] max-w-[84vw] flex-col justify-between overflow-y-auto p-4 shadow-2xl">
            <SidebarContent path={path} onSelect={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main
          id="icerik"
          tabIndex={-1}
          className={
            full
              ? "relative min-h-0 min-w-0 flex-1 pb-20 outline-none lg:pb-6"
              : "min-w-0 flex-1 pb-24 outline-none lg:pb-10"
          }
        >
          {children}
        </main>
        <BottomNav path={path} />
      </div>
    </div>
  );
}

function isActive(path: string, href: string) {
  if (href === "/tarla") return path === "/tarla";
  return path.startsWith(href);
}

function Sidebar({ path }: { path: string }) {
  return (
    <aside className="sidebar-rail no-print sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col justify-between overflow-y-auto border-r border-white/10 p-4 lg:flex">
      <SidebarContent path={path} />
    </aside>
  );
}

function SidebarContent({ path, onSelect }: { path: string; onSelect?: () => void }) {
  const { lang } = useI18n();
  const tr = lang === "tr";

  return (
    <>
      <div>
        <div className="flex items-center justify-between px-2 pb-4 pt-1">
          <Link href="/" onClick={onSelect} className="tap flex items-center gap-2.5 rounded-lg">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#397A42] text-[#F8F8F3]">
              <Icon name="leaf" size={18} />
            </span>
            <Logo variant="wordmark" size={20} tone="light" title="AgroShift AI" />
          </Link>
        </div>

        <nav aria-label={tr ? "Ana menü" : "Main navigation"} className="space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.titleTr} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold tracking-wider text-[#8FB29B] uppercase">
                {tr ? group.titleTr : group.titleEn}
              </div>
              {group.items.map((item) => {
                const active = isActive(path, item.href);
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onSelect}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[38px] items-center gap-2.5 rounded-xl px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
                      active
                        ? "bg-[#397A42] font-semibold text-white"
                        : "text-[#D4E3D9] hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <ItemIcon className={`size-4 shrink-0 ${active ? "text-[#A3C75B]" : "text-[#9BBCA6]"}`} />
                    <span className="truncate">{tr ? item.labelTr : item.labelEn}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <Link href="/yontem" onClick={onSelect} className="workspace-rail-footer mt-5">
        {tr ? "Yöntem & Kaynaklar" : "Methods & Sources"}
        <Icon name="chevron-right" size={15} />
      </Link>
    </>
  );
}

function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { t, lang, setLang } = useI18n();
  const theme = useTheme();
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");

  return (
    <header className="no-print sticky top-0 z-[1100] flex min-h-[64px] w-full max-w-full shrink-0 items-center justify-between gap-2 border-b border-line bg-surface/95 px-3 py-2 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="btn btn-quiet btn-icon lg:hidden"
          aria-label={lang === "tr" ? "Menüyü aç" : "Open menu"}
          onClick={onOpenMobileNav}
        >
          <Icon name="list" size={20} />
        </button>
        <Link href="/" className="workspace-brand-short lg:hidden">
          <Logo size={22} />
        </Link>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <div className="hidden sm:block">
          <GlossaryTriggerButton />
        </div>
        <ActiveFieldLink />
        <ScenarioQuickSelector />
        <button
          type="button"
          className="btn btn-sm px-2.5"
          lang={lang === "tr" ? "en" : "tr"}
          aria-label={t("lang.switchLabel")}
          onClick={() => setLang(lang === "tr" ? "en" : "tr")}
        >
          <Icon name="globe" size={15} className="text-ink-2" />
          <span className="font-mono text-[11.5px] font-semibold" aria-hidden="true">
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
          <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
        </button>
        <Account />
      </div>
    </header>
  );
}

function ActiveFieldLink() {
  const { n, lang } = useI18n();
  const s = useStore();
  const { analysis } = useFieldData();
  const da = s.field ? (s.inputs.areaOverrideDa ?? s.field.areaDa) : null;

  return (
    <div className="flex max-w-[165px] items-center gap-1.5 rounded-xl border border-line-strong bg-bg px-2.5 py-1.5 text-[12.5px] sm:max-w-none">
      <Icon name="pin" size={15} className="shrink-0 text-accent-ink" />
      <Link href="/tarlalarim" className="truncate font-semibold text-ink underline-offset-4 hover:underline">
        {s.field?.name ?? (lang === "tr" ? "Tarla seç" : "Select field")}
      </Link>
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
  if (!s.field) return null;
  const currentPreset =
    sc.preset === "custom" && sc.priceMultiplier === 0.8 && sc.rainMultiplier === 1 && sc.tempDeltaC === 0
      ? "price_drop"
      : sc.preset;

  return (
    <div className="hidden items-center gap-1.5 rounded-xl border border-line-strong bg-bg px-2.5 py-1.5 text-[12.5px] md:flex">
      <Icon name="calendar" size={15} className="shrink-0 text-ink-2" />
      <label htmlFor="header-scenario-select" className="sr-only">
        {lang === "tr" ? "İklim ve Piyasa Senaryosu" : "Climate & Market Scenario"}
      </label>
      <select
        id="header-scenario-select"
        className="max-w-[190px] cursor-pointer truncate bg-transparent font-medium text-ink outline-none"
        value={currentPreset}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "dry") setStore({ scenario: { preset: "dry", rainMultiplier: 0.75, tempDeltaC: 0, priceMultiplier: 1 } });
          else if (v === "hot_dry") setStore({ scenario: { preset: "hot_dry", rainMultiplier: 0.75, tempDeltaC: 2, priceMultiplier: 1 } });
          else if (v === "price_drop") setStore({ scenario: { preset: "custom", rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 0.8 } });
          else setStore({ scenario: { preset: "typical", rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 1 } });
        }}
      >
        {currentPreset === "custom" && (
          <option value="custom" disabled>
            {lang === "tr" ? "Özel senaryo" : "Custom scenario"}
          </option>
        )}
        <option value="typical">{lang === "tr" ? "Tipik iklim" : "Typical climate"}</option>
        <option value="dry">{lang === "tr" ? "Kurak (%25 az yağış)" : "Dry (25% less rain)"}</option>
        <option value="hot_dry">{lang === "tr" ? "Sıcak & Kurak (+2 °C)" : "Warming (+2 °C & Dry)"}</option>
        <option value="price_drop">{lang === "tr" ? "Fiyat Düşüşü (-%20)" : "Price Drop (-20%)"}</option>
      </select>
    </div>
  );
}

function Account() {
  const { t } = useI18n();
  const u = useAuthUser();
  if (u.status === "signed-in") {
    return (
      <Link
        href="/ayarlar"
        className="hidden items-center gap-2 rounded-xl border border-line bg-bg px-3 py-1.5 text-[12.5px] xl:flex"
        title={u.email}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-accent text-on-accent font-semibold">
          {(u.name ?? u.email ?? "U").slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-[8rem] truncate font-semibold text-ink">{u.name ?? u.email}</span>
      </Link>
    );
  }
  return (
    <Link href="/giris" className="btn btn-sm hidden px-3 text-[12.5px] md:inline-flex">
      <Icon name="user" size={15} className="text-accent-ink" />
      <span>{t("nav.signIn")}</span>
    </Link>
  );
}

function BottomNav({ path }: { path: string }) {
  const { t, lang } = useI18n();
  return (
    <nav aria-label={t("nav.places")} className="no-print fixed inset-x-0 bottom-0 z-[1100] grid h-16 grid-cols-4 border-t border-line bg-surface lg:hidden">
      {PLACES.map((p) => {
        const a = isActive(path, p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={a ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${a ? "font-semibold text-accent-ink" : "text-ink-2"}`}
          >
            {a && <span className="absolute inset-x-5 top-0 h-0.5 bg-accent" aria-hidden="true" />}
            <Icon name={p.icon} size={19} />
            <span className="max-w-[90%] truncate">{lang === "tr" ? p.labelTr : p.labelEn}</span>
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
