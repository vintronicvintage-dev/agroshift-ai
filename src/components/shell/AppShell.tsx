"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/ui/Icons";
import { useI18n, type DictKey } from "@/lib/i18n";
import { setTheme, useTheme } from "@/lib/ui/theme";
import { useStore } from "@/lib/ui/fieldStore";
import { useAuthUser } from "@/lib/auth/useAuthUser";
import { useFieldData } from "@/components/data/FieldData";

const PLACES: { href: string; key: DictKey; icon: IconName }[] = [
  { href: "/", key: "nav.field", icon: "field" },
  { href: "/plan", key: "nav.plan", icon: "plan" },
  { href: "/dayanak", key: "nav.evidence", icon: "evidence" },
];

/** Top bar (48–56 px) on every page; a three-place bottom bar on phones. */
export function AppShell({ children, full = false }: { children: ReactNode; full?: boolean }) {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <div className={full ? "flex h-dvh flex-col overflow-hidden" : "min-h-dvh"}>
      <a href="#icerik" className="skip">
        {t("nav.skip")}
      </a>
      <TopBar path={path} />
      <main id="icerik" tabIndex={-1} className={full ? "relative min-h-0 flex-1 outline-none" : "pb-24 outline-none md:pb-10"}>
        {children}
      </main>
      <BottomNav path={path} />
    </div>
  );
}

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function TopBar({ path }: { path: string }) {
  const { t, lang, setLang } = useI18n();
  const theme = useTheme();
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  return (
    <header className="no-print sticky top-0 z-[1100] flex h-14 shrink-0 items-center gap-2 border-b border-line bg-bg px-3 sm:px-4">
      <Link href="/" className="tap shrink-0 rounded-md pr-2" aria-label={t("nav.home")}>
        <Logo variant="horizontal" size={24} title="" />
      </Link>
      <nav aria-label={t("nav.places")} className="ml-2 hidden items-stretch self-stretch md:flex">
        {PLACES.map((p) => (
          <NavLink key={p.href} href={p.href} active={isActive(path, p.href)} label={t(p.key)} />
        ))}
        <NavLink href="/yontem" active={path.startsWith("/yontem")} label={t("nav.methods")} />
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-1">
        <FieldChip />
        <Link href="/yontem" className={`btn btn-quiet btn-icon md:hidden ${path.startsWith("/yontem") ? "text-ink" : "text-ink-2"}`} aria-label={t("nav.methods")}>
          <Icon name="methods" />
        </Link>
        <button type="button" className="btn btn-quiet btn-icon" lang={lang === "tr" ? "en" : "tr"} aria-label={t("lang.switchLabel")} onClick={() => setLang(lang === "tr" ? "en" : "tr")}>
          <span className="font-mono text-[12px] font-semibold" aria-hidden="true">
            {lang === "tr" ? "EN" : "TR"}
          </span>
        </button>
        <button type="button" className="btn btn-quiet btn-icon" aria-label={themeLabel} title={themeLabel} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        <Account />
      </div>
    </header>
  );
}

function NavLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center px-3 text-[14px] font-medium ${active ? "text-ink" : "text-ink-2 hover:text-ink"}`}
    >
      {label}
      {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-ink" aria-hidden="true" />}
    </Link>
  );
}

function FieldChip() {
  const { t, n } = useI18n();
  const s = useStore();
  const { analysis } = useFieldData();
  if (!s.field) return null;
  const da = s.inputs.areaOverrideDa ?? s.field.areaDa;
  return (
    <Link href="/" className="hidden min-w-0 max-w-[16rem] items-center gap-2 rounded-md border border-line px-2.5 py-1 text-[13px] hover:border-line-strong sm:flex" title={t("chip.open")}>
      <Icon name="field" size={16} className="shrink-0 text-ink-2" />
      <span className="truncate font-medium">{s.field.name}</span>
      <span className="readout shrink-0">
        {n(da, da < 100 ? 1 : 0)} {t("u.da")}
      </span>
      {analysis.running && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent-ink" aria-label={t("chip.busy")} />}
    </Link>
  );
}

function Account() {
  const { t } = useI18n();
  const u = useAuthUser();
  if (u.status === "signed-in") {
    return (
      <span className="hidden items-center gap-1.5 pl-1 text-[13px] text-ink-2 lg:flex" title={u.email}>
        <Icon name="user" size={18} />
        <span className="max-w-[10rem] truncate text-ink">{u.name ?? u.email}</span>
      </span>
    );
  }
  if (u.status === "signed-out") {
    return (
      <Link href="/giris" className="btn btn-quiet hidden px-2.5 text-[13px] lg:inline-flex">
        <Icon name="signin" size={18} />
        {t("nav.signIn")}
      </Link>
    );
  }
  return null;
}

function BottomNav({ path }: { path: string }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("nav.places")} className="no-print fixed inset-x-0 bottom-0 z-[1100] grid h-16 grid-cols-3 border-t border-line bg-bg md:hidden">
      {PLACES.map((p) => {
        const a = isActive(path, p.href);
        return (
          <Link key={p.href} href={p.href} aria-current={a ? "page" : undefined} className={`relative flex flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${a ? "text-ink" : "text-ink-2"}`}>
            {a && <span className="absolute inset-x-6 top-0 h-0.5 bg-ink" aria-hidden="true" />}
            <Icon name={p.icon} size={22} />
            {t(p.key)}
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
    <aside className={`flex gap-3 rounded-[10px] border border-line-strong bg-surface p-3.5 ${className}`} aria-label={t("judgment.title")}>
      <Icon name="info" size={20} className="mt-0.5 shrink-0 text-ink-2" />
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
        <h1 className="display text-[32px] sm:text-[40px]">{title}</h1>
        {lead && <p className="lead mt-2 text-[15px]">{lead}</p>}
      </div>
      {children}
    </div>
  );
}
