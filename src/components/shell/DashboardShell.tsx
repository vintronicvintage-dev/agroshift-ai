"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { AUTH_ENABLED } from "@/lib/auth/config";
import { signOut, useAuthUser, type AuthUserState } from "@/lib/auth/useAuthUser";
import { openIntro } from "@/lib/ui/intro";
import { reopenGs } from "@/lib/ui/gettingStarted";
import { setTheme, useTheme } from "@/lib/ui/theme";
import type { SectionId } from "@/lib/ui/steps";
import { HashLink } from "@/components/ui/HashLink";
import { Icon, type IconName } from "@/components/ui/Icons";
import { SiteFooter } from "./SiteFooter";
import { Wordmark } from "./Wordmark";

export type ShellPlace = SectionId | "yontem";

interface NavDef {
  id: ShellPlace;
  label: DictKey;
  icon: IconName;
  href: string;
  /** Needs a selected field. */
  needsField?: boolean;
}

const WORK: NavDef[] = [
  { id: "genel", label: "nav.overview", icon: "overview", href: "/#genel" },
  { id: "tarlam", label: "step.field", icon: "field", href: "/#tarlam" },
  { id: "oneriler", label: "step.compare", icon: "options", href: "/#oneriler", needsField: true },
  { id: "kanit", label: "step.evidence", icon: "evidence", href: "/#kanit", needsField: true },
];
const LEARN: NavDef[] = [{ id: "yontem", label: "nav.methodsShort", icon: "methods", href: "/yontem" }];

interface Props {
  place: ShellPlace;
  /** No field yet: Options and Evidence say why they are locked. */
  locked?: boolean;
  /** Short status under each nav label (field name, fit score …). */
  sub?: Partial<Record<ShellPlace, string>>;
  /** Field and scenario controls in the top bar (dashboard only). */
  topbar?: ReactNode;
  children: ReactNode;
}

/**
 * The dashboard frame: a grouped left rail (icon rail on tablets, bottom tab bar on phones), a top
 * bar with field, scenario, language, theme and account, and the content area.
 */
export function DashboardShell({ place, locked = false, sub = {}, topbar, children }: Props) {
  const { t } = useI18n();
  const user = useAuthUser();
  const router = useRouter();
  /** Client-side navigation keeps the document (and html[data-*] state) alive. */
  const toDashboard = (hash: string) => {
    if (window.location.pathname !== "/") router.push(`/#${hash}`);
    else window.location.hash = hash;
  };
  const openCards = () => {
    reopenGs();
    toDashboard("genel");
  };
  const afterSignOut = () => {
    router.replace("/giris");
    router.refresh();
  };
  const watchIntro = () => {
    openIntro();
    if (window.location.pathname !== "/") router.push("/");
  };

  return (
    <div className="shell" data-shell>
      <a href="#icerik" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-lg focus:bg-panel focus:px-3 focus:py-2">
        {t("nav.skip")}
      </a>

      <aside className="rail" aria-label={t("nav.main")}>
        <HashLink to="genel" className="tap mx-3 mb-2 mt-4 flex min-h-11 items-center rounded-lg px-2 max-lg:justify-center" aria-label={t("app.name")}>
          <span className="max-lg:hidden">
            <Wordmark />
          </span>
          <span className="lg:hidden">
            <Wordmark compact />
          </span>
        </HashLink>
        <nav aria-label={t("nav.main")} className="flex flex-1 flex-col gap-6 px-3 pb-4 pt-3">
          <NavGroup title={t("nav.group.work")} items={WORK} place={place} locked={locked} sub={sub} />
          <NavGroup title={t("nav.group.learn")} items={LEARN} place={place} locked={locked} sub={sub} />
          <div className="mt-auto space-y-1 border-t border-rule pt-3">
            <button type="button" className="nav-item" onClick={openCards} title={t("nav.cards")}>
              <Icon name="cards" />
              <span className="nav-label">{t("nav.cards")}</span>
            </button>
            <button
              type="button"
              className="nav-item"
              aria-haspopup="dialog"
              title={t("nav.intro")}
              onClick={watchIntro}
            >
              <Icon name="play" />
              <span className="nav-label">{t("nav.intro")}</span>
            </button>
            <AccountRow user={user} onSignOut={afterSignOut} />
          </div>
        </nav>
      </aside>

      <div className="min-w-0">
        {!AUTH_ENABLED && (
          <div className="guest-strip">
            <p className="mx-auto flex max-w-[1500px] items-center gap-2 px-4 py-1.5 text-[0.8rem] sm:px-6">
              <Icon name="info" size={15} />
              <span className="min-w-0 flex-1">{t("guest.strip")}</span>
              <Link href="/giris" className="shrink-0 font-semibold underline underline-offset-2">
                {t("guest.why")}
              </Link>
            </p>
          </div>
        )}
        <header className="topbar">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
            <HashLink to="genel" className="tap md:hidden" aria-label={t("app.name")}>
              <Wordmark compact />
            </HashLink>
            <div className="order-last flex min-w-0 basis-full items-center gap-2 md:order-none md:basis-auto md:flex-1">{topbar}</div>
            <div className="ml-auto flex items-center gap-1.5">
              <LangButton />
              <ThemeButton />
              <UserMenu user={user} onCards={openCards} onIntro={watchIntro} onSignOut={afterSignOut} />
            </div>
          </div>
        </header>
        <main id="icerik" tabIndex={-1} className="mx-auto max-w-[1500px] px-4 pb-10 pt-5 outline-none sm:px-6 sm:pt-6">
          {children}
        </main>
        <SiteFooter />
      </div>

      <BottomNav place={place} locked={locked} />
    </div>
  );
}

function NavGroup({ title, items, place, locked, sub }: { title: string; items: NavDef[]; place: ShellPlace; locked: boolean; sub: Partial<Record<ShellPlace, string>> }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="mb-1.5 px-3 text-[0.75rem] font-medium text-ink-2 max-lg:sr-only">{title}</p>
      <ul className="space-y-1">
        {items.map((it) => {
          const isLocked = locked && !!it.needsField;
          const here = it.id === place;
          const text = isLocked ? t("step.locked") : sub[it.id];
          const body = (
            <>
              <Icon name={it.icon} />
              <span className="nav-label min-w-0 flex-1">
                <span className="block truncate leading-tight">{t(it.label)}</span>
                {text && <span className={`block truncate text-[0.72rem] font-normal leading-tight ${here ? "opacity-80" : "text-ink-2"}`}>{text}</span>}
              </span>
            </>
          );
          return (
            <li key={it.id}>
              {isLocked ? (
                <span className="nav-item" aria-disabled="true" title={`${t(it.label)}: ${t("step.locked")}`}>
                  {body}
                </span>
              ) : it.id === "yontem" ? (
                <Link href={it.href} className="nav-item" aria-current={here ? "page" : undefined} title={t(it.label)}>
                  {body}
                </Link>
              ) : (
                <HashLink to={it.id as SectionId} className="nav-item" aria-current={here ? "page" : undefined} title={t(it.label)}>
                  {body}
                </HashLink>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BottomNav({ place, locked }: { place: ShellPlace; locked: boolean }) {
  const { t } = useI18n();
  return (
    <nav className="bottomnav" aria-label={t("nav.main")}>
      <ul className="mx-auto grid max-w-xl grid-cols-5 px-1">
        {[...WORK, ...LEARN].map((it) => {
          const isLocked = locked && !!it.needsField;
          const body = (
            <>
              <span className="bn-icon">
                <Icon name={it.icon} size={20} />
              </span>
              <span className="max-w-full truncate px-0.5">{t(it.label)}</span>
            </>
          );
          return (
            <li key={it.id} className="min-w-0">
              {isLocked ? (
                <span aria-disabled="true" className="opacity-55" title={t("step.locked")}>
                  {body}
                  <span className="sr-only">: {t("step.locked")}</span>
                </span>
              ) : it.id === "yontem" ? (
                <Link href={it.href} aria-current={it.id === place ? "page" : undefined}>
                  {body}
                </Link>
              ) : (
                <HashLink to={it.id as SectionId} aria-current={it.id === place ? "page" : undefined}>
                  {body}
                </HashLink>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AccountRow({ user, onSignOut }: { user: AuthUserState; onSignOut: () => void }) {
  const { t } = useI18n();
  if (user.status === "signed-in") {
    return (
      <button type="button" className="nav-item" onClick={() => void signOut(onSignOut)} title={t("nav.signOut")}>
        <Icon name="signout" />
        <span className="nav-label min-w-0 flex-1">
          <span className="block truncate leading-tight">{t("nav.signOut")}</span>
          <span className="block truncate text-[0.72rem] font-normal leading-tight text-ink-2">{user.email}</span>
        </span>
      </button>
    );
  }
  if (user.status === "loading") {
    return (
      <span className="nav-item" aria-busy="true">
        <Icon name="user" />
        <span className="nav-label text-ink-2">{t("user.loading")}</span>
      </span>
    );
  }
  return (
    <Link href="/giris" className="nav-item" title={t("nav.signIn")}>
      <Icon name="signin" />
      <span className="nav-label min-w-0 flex-1">
        <span className="block truncate leading-tight">{t("nav.signIn")}</span>
        {user.status === "guest" && <span className="block truncate text-[0.72rem] font-normal leading-tight text-ink-2">{t("user.guestSub")}</span>}
      </span>
    </Link>
  );
}

const ICON_BTN = "tap inline-flex h-10 min-w-10 items-center justify-center rounded-[10px] border border-transparent text-ink-2 transition-colors hover:border-rule hover:bg-panel-2 hover:text-ink";

function LangButton() {
  const { t, lang, setLang } = useI18n();
  return (
    <button type="button" className={`${ICON_BTN} gap-1.5 px-2.5 text-[0.8rem] font-semibold`} lang={lang === "tr" ? "en" : "tr"} aria-label={t("lang.switchLabel")} title={t("lang.switchLabel")} onClick={() => setLang(lang === "tr" ? "en" : "tr")}>
      <Icon name="lang" size={18} />
      <span aria-hidden="true">{lang === "tr" ? "EN" : "TR"}</span>
    </button>
  );
}

function ThemeButton() {
  const { t } = useI18n();
  const theme = useTheme();
  const label = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  return (
    <button type="button" className={ICON_BTN} aria-label={label} title={label} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
    </button>
  );
}

/** Account popover: who is signed in (or guest mode), the intro, the cards, sign in or out. */
function UserMenu({ user, onCards, onIntro, onSignOut }: { user: AuthUserState; onCards: () => void; onIntro: () => void; onSignOut: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials =
    user.status === "signed-in"
      ? (user.name ?? user.email)
          .split(/[\s@.]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0]!.toLocaleUpperCase("tr"))
          .join("")
      : null;

  return (
    <div ref={root} className="relative">
      <button
        ref={btn}
        type="button"
        className={`${ICON_BTN} ${initials ? "border-rule bg-panel-2 text-[0.78rem] font-bold text-ink" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="hesap-menu"
        aria-label={t("top.menu")}
        title={t("top.menu")}
        onClick={() => setOpen((o) => !o)}
      >
        {initials ? <span aria-hidden="true">{initials}</span> : <Icon name="user" size={19} />}
      </button>
      {open && (
        <div id="hesap-menu" className="menu" role="group" aria-label={t("top.menu")}>
          <div className="px-3 pb-2.5 pt-2">
            {user.status === "signed-in" ? (
              <>
                <p className="text-xs text-ink-2">{t("user.signedInAs")}</p>
                {user.name && <p className="truncate font-semibold">{user.name}</p>}
                <p className="truncate text-sm text-ink-2">{user.email}</p>
              </>
            ) : user.status === "guest" ? (
              <>
                <p className="font-semibold">{t("user.guest")}</p>
                <p className="text-sm text-ink-2">{t("user.guestSub")}</p>
              </>
            ) : user.status === "loading" ? (
              <p className="text-sm text-ink-2">{t("user.loading")}</p>
            ) : null}
          </div>
          <div className="border-t border-rule pt-1.5">
            <button
              type="button"
              className="nav-item"
              onClick={() => {
                setOpen(false);
                onCards();
              }}
            >
              <Icon name="cards" />
              <span>{t("nav.cards")}</span>
            </button>
            <button
              type="button"
              className="nav-item"
              aria-haspopup="dialog"
              onClick={() => {
                setOpen(false);
                onIntro();
              }}
            >
              <Icon name="play" />
              <span>{t("nav.intro")}</span>
            </button>
            {user.status === "signed-in" ? (
              <button type="button" className="nav-item" onClick={() => void signOut(onSignOut)}>
                <Icon name="signout" />
                <span>{t("nav.signOut")}</span>
              </button>
            ) : user.status !== "loading" ? (
              <Link href="/giris" className="nav-item" onClick={() => setOpen(false)}>
                <Icon name="signin" />
                <span>{t("nav.signIn")}</span>
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
