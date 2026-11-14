"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { AUTH_ENABLED } from "@/lib/auth/config";
import { confirmUrl, getBrowserSupabase } from "@/lib/auth/browser";
import { authErrorKind, isObfuscatedExistingUser, type AuthErrorKind } from "@/lib/auth/errors";
import { isValidEmail, PASSWORD_MIN, passwordStrength } from "@/lib/auth/password";
import { safeNext } from "@/lib/auth/redirect";
import { SpotArt } from "@/components/brand/SpotArt";
import { Icon } from "@/components/ui/Icons";

type Status = { kind: "idle" } | { kind: "busy"; what: "password" | "magic" | "submit" } | { kind: "error"; err: AuthErrorKind } | { kind: "sent"; key: DictKey; email: string };

const errKey = (k: AuthErrorKind) => `auth.err.${k}` as DictKey;

// ── shared bits ───────────────────────────────────────────────────────────

/**
 * One query parameter, read on the client only (server render and hydration see null). Avoids
 * useSearchParams, which would need a Suspense boundary and keep the form out of the static shell.
 */
function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("popstate", cb);
      return () => window.removeEventListener("popstate", cb);
    },
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

function Field({ id, label, error, children, hint }: { id: string; label: string; error?: string | null; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.85rem] font-medium">
        {label}
      </label>
      {children}
      {hint}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-[0.8rem] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, invalid, describedBy }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean; describedBy?: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={show ? "text" : "password"}
        spellCheck={false}
        className="field-input pr-12"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        required
      />
      <button type="button" className="tap absolute right-1 top-1/2 grid h-9 w-10 -translate-y-1/2 place-items-center rounded-lg text-ink-2 hover:text-ink" aria-label={show ? t("auth.hidePw") : t("auth.showPw")} aria-pressed={show} onClick={() => setShow((s) => !s)}>
        <Icon name={show ? "eyeOff" : "eye"} size={18} />
      </button>
    </div>
  );
}

function Strength({ pw, id }: { pw: string; id: string }) {
  const { t } = useI18n();
  const s = passwordStrength(pw);
  const color = s <= 1 ? "var(--bad)" : s === 2 ? "var(--caution)" : "var(--accent-edge)";
  return (
    <div id={id} className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((k) => (
          <span key={k} className="h-1 flex-1 rounded-full transition-colors duration-200" style={{ background: pw && s >= k ? color : "var(--rule-strong)" }} />
        ))}
      </div>
      <p className="mt-1 text-[0.76rem] text-ink-2">{pw ? t("auth.pw.strength", { s: t(`auth.pw.s${s}` as DictKey) }) : t("auth.pw.min", { n: PASSWORD_MIN })}</p>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  const { t } = useI18n();
  if (status.kind === "error")
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[0.86rem] text-bad">
        <Icon name="alert" size={17} className="mt-px" />
        <span>{t(errKey(status.err))}</span>
      </p>
    );
  return null;
}

function Sent({ status, onReset }: { status: Extract<Status, { kind: "sent" }>; onReset: () => void }) {
  const { t } = useI18n();
  return (
    <div role="status" className="border-t border-rule pt-5">
      <SpotArt name="email-sent" width={200} className="text-ink-2" />
      <p className="mt-3 font-display text-[length:var(--text-step-2)] font-[560] tracking-[-0.01em]">{t("auth.sentTitle")}</p>
      <p className="mt-1 text-[0.9rem] text-ink-2">{t(status.key, { email: status.email })}</p>
      <button type="button" className="btn mt-4" onClick={onReset}>
        {t("auth.resend")}
      </button>
    </div>
  );
}

function Submit({ busy, children, primary = true, onClick, type = "submit" }: { busy: boolean; children: ReactNode; primary?: boolean; onClick?: () => void; type?: "submit" | "button" }) {
  const { t } = useI18n();
  return (
    <button type={type} onClick={onClick} className={`btn btn-lg w-full justify-center ${primary ? "btn-primary" : ""}`} disabled={!AUTH_ENABLED || busy} aria-busy={busy || undefined}>
      {busy ? t("auth.busy") : children}
    </button>
  );
}

/** After a submit with invalid fields, move focus to the first one (once React has marked it). */
function focusFirstInvalid(form: EventTarget | null) {
  requestAnimationFrame(() => (form as HTMLFormElement | null)?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}

async function client() {
  const p = getBrowserSupabase();
  if (!p) throw Object.assign(new Error("not configured"), { code: "not_configured" });
  return p;
}

/** Error kind from a ?hata=… code set by /auth/confirm. */
function linkErrorKind(code: string | null): AuthErrorKind | null {
  if (!code || code === "yapilandirma") return null;
  if (code === "baglanti") return "linkExpired";
  const k = authErrorKind({ code });
  return k === "unknown" ? "linkExpired" : k;
}

// ── sign in ───────────────────────────────────────────────────────────────

/** After a session is set: navigate in-app and re-run the proxy and server components with the new cookies. */
function useGoAfterAuth() {
  const router = useRouter();
  return (path: string) => {
    router.replace(path);
    router.refresh();
  };
}

export function SignInForm() {
  const { t } = useI18n();
  const go = useGoAfterAuth();
  const next = safeNext(useQueryParam("next"));
  const linkErr = linkErrorKind(useQueryParam("hata"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [own, setStatus] = useState<Status>({ kind: "idle" });
  // a failed e-mail link (?hata=…) shows until the user does something
  const status: Status = own.kind === "idle" && linkErr ? { kind: "error", err: linkErr } : own;
  const ids = useId();
  const emailBad = touched && !isValidEmail(email);
  const busy = status.kind === "busy";

  const withPassword = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValidEmail(email) || !password) return focusFirstInvalid(e.currentTarget);
    setStatus({ kind: "busy", what: "password" });
    try {
      const sb = await client();
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return setStatus({ kind: "error", err: authErrorKind(error) });
      go(next);
    } catch (err) {
      setStatus({ kind: "error", err: authErrorKind(err) });
    }
  };

  const magic = async () => {
    setTouched(true);
    if (!isValidEmail(email)) return;
    setStatus({ kind: "busy", what: "magic" });
    try {
      const sb = await client();
      const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: confirmUrl(next), shouldCreateUser: false } });
      if (error) return setStatus({ kind: "error", err: authErrorKind(error) });
      setStatus({ kind: "sent", key: "auth.magic.sent", email: email.trim() });
    } catch (err) {
      setStatus({ kind: "error", err: authErrorKind(err) });
    }
  };

  if (status.kind === "sent") return <Sent status={status} onReset={() => setStatus({ kind: "idle" })} />;

  return (
    <form noValidate onSubmit={withPassword} className="space-y-4">
      <fieldset disabled={!AUTH_ENABLED} className="space-y-4">
        <Field id={`${ids}-e`} label={t("auth.email")} error={emailBad ? t("auth.v.email") : null}>
          <input id={`${ids}-e`} type="email" name="email" inputMode="email" autoComplete="email" spellCheck={false} autoCapitalize="none" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => email && setTouched(true)} aria-invalid={emailBad || undefined} aria-describedby={emailBad ? `${ids}-e-err` : undefined} required />
        </Field>
        <Field id={`${ids}-p`} label={t("auth.password")}>
          <PasswordInput id={`${ids}-p`} value={password} onChange={setPassword} autoComplete="current-password" invalid={touched && !password} />
        </Field>
        <div className="flex justify-end">
          <Link href="/sifre-sifirla" className="text-[0.84rem] font-medium text-accent-ink underline-offset-2 hover:underline">
            {t("auth.forgot")}
          </Link>
        </div>
      </fieldset>
      <StatusLine status={status} />
      <Submit busy={busy && status.what === "password"}>{t("auth.submit.signIn")}</Submit>
      <div className="flex items-center gap-3 text-[0.8rem] text-ink-2" aria-hidden="true">
        <span className="h-px flex-1 bg-rule" />
        {t("auth.or")}
        <span className="h-px flex-1 bg-rule" />
      </div>
      <Submit type="button" primary={false} busy={busy && status.what === "magic"} onClick={() => void magic()}>
        <Icon name="mail" size={18} />
        {t("auth.magic")}
      </Submit>
      <p className="text-center text-[0.8rem] text-ink-2">{t("auth.magicHelp")}</p>
      <p className="pt-2 text-center text-[0.9rem] text-ink-2">
        {t("auth.noAccount")}{" "}
        <Link href={next === "/" ? "/kayit" : `/kayit?next=${encodeURIComponent(next)}`} className="font-semibold text-accent-ink underline-offset-2 hover:underline">
          {t("auth.toSignUp")}
        </Link>
      </p>
    </form>
  );
}

// ── sign up ───────────────────────────────────────────────────────────────

export function SignUpForm() {
  const { t } = useI18n();
  const go = useGoAfterAuth();
  const next = safeNext(useQueryParam("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const ids = useId();
  const nameBad = touched && !name.trim();
  const emailBad = touched && !isValidEmail(email);
  const pwBad = touched && password.length < PASSWORD_MIN;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !isValidEmail(email) || password.length < PASSWORD_MIN) return focusFirstInvalid(e.currentTarget);
    setStatus({ kind: "busy", what: "submit" });
    try {
      const sb = await client();
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: confirmUrl(next), data: { full_name: name.trim() } } });
      if (error) return setStatus({ kind: "error", err: authErrorKind(error) });
      if (isObfuscatedExistingUser(data.user)) return setStatus({ kind: "error", err: "alreadyRegistered" });
      if (data.session) return go(next); // confirmation turned off in the project
      setStatus({ kind: "sent", key: "auth.signUp.sent", email: email.trim() });
    } catch (err) {
      setStatus({ kind: "error", err: authErrorKind(err) });
    }
  };

  if (status.kind === "sent") return <Sent status={status} onReset={() => setStatus({ kind: "idle" })} />;

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <fieldset disabled={!AUTH_ENABLED} className="space-y-4">
        <Field id={`${ids}-n`} label={t("auth.name")} error={nameBad ? t("auth.v.name") : null}>
          <input id={`${ids}-n`} name="name" autoComplete="name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={nameBad || undefined} aria-describedby={nameBad ? `${ids}-n-err` : undefined} required />
        </Field>
        <Field id={`${ids}-e`} label={t("auth.email")} error={emailBad ? t("auth.v.email") : null}>
          <input id={`${ids}-e`} type="email" name="email" inputMode="email" autoComplete="email" spellCheck={false} autoCapitalize="none" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={emailBad || undefined} aria-describedby={emailBad ? `${ids}-e-err` : undefined} required />
        </Field>
        <Field id={`${ids}-p`} label={t("auth.password")} error={pwBad ? t("auth.v.password", { n: PASSWORD_MIN }) : null} hint={<Strength pw={password} id={`${ids}-ps`} />}>
          <PasswordInput id={`${ids}-p`} value={password} onChange={setPassword} autoComplete="new-password" invalid={pwBad} describedBy={`${ids}-ps`} />
        </Field>
      </fieldset>
      <StatusLine status={status} />
      <Submit busy={status.kind === "busy"}>{t("auth.submit.signUp")}</Submit>
      <p className="pt-2 text-center text-[0.9rem] text-ink-2">
        {t("auth.haveAccount")}{" "}
        <Link href={next === "/" ? "/giris" : `/giris?next=${encodeURIComponent(next)}`} className="font-semibold text-accent-ink underline-offset-2 hover:underline">
          {t("auth.toSignIn")}
        </Link>
      </p>
    </form>
  );
}

// ── reset request ─────────────────────────────────────────────────────────

export function ResetRequestForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const ids = useId();
  const emailBad = touched && !isValidEmail(email);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValidEmail(email)) return focusFirstInvalid(e.currentTarget);
    setStatus({ kind: "busy", what: "submit" });
    try {
      const sb = await client();
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: confirmUrl("/sifre-yenile") });
      if (error) return setStatus({ kind: "error", err: authErrorKind(error) });
      setStatus({ kind: "sent", key: "auth.reset.sent", email: email.trim() });
    } catch (err) {
      setStatus({ kind: "error", err: authErrorKind(err) });
    }
  };

  if (status.kind === "sent") return <Sent status={status} onReset={() => setStatus({ kind: "idle" })} />;

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <fieldset disabled={!AUTH_ENABLED}>
        <Field id={`${ids}-e`} label={t("auth.email")} error={emailBad ? t("auth.v.email") : null}>
          <input id={`${ids}-e`} type="email" name="email" inputMode="email" autoComplete="email" spellCheck={false} autoCapitalize="none" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={emailBad || undefined} aria-describedby={emailBad ? `${ids}-e-err` : undefined} required />
        </Field>
      </fieldset>
      <StatusLine status={status} />
      <Submit busy={status.kind === "busy"}>{t("auth.submit.reset")}</Submit>
      <p className="pt-2 text-center text-[0.9rem]">
        <Link href="/giris" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
          {t("auth.toSignIn")}
        </Link>
      </p>
    </form>
  );
}

// ── set a new password (opened from the reset e-mail via /auth/confirm) ────

export function UpdatePasswordForm() {
  const { t } = useI18n();
  const go = useGoAfterAuth();
  const [session, setSession] = useState<"checking" | "yes" | "no">(AUTH_ENABLED ? "checking" : "no");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status | { kind: "done" }>({ kind: "idle" });
  const ids = useId();

  useEffect(() => {
    const p = getBrowserSupabase();
    if (!p) return;
    let alive = true;
    void p
      .then((sb) => sb.auth.getUser())
      .then(({ data }) => alive && setSession(data.user ? "yes" : "no"))
      .catch(() => alive && setSession("no"));
    return () => {
      alive = false;
    };
  }, []);

  const pwBad = touched && password.length < PASSWORD_MIN;
  const mismatch = touched && !pwBad && again !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (password.length < PASSWORD_MIN || again !== password) return focusFirstInvalid(e.currentTarget);
    setStatus({ kind: "busy", what: "submit" });
    try {
      const sb = await client();
      const { error } = await sb.auth.updateUser({ password });
      if (error) return setStatus({ kind: "error", err: authErrorKind(error) });
      setStatus({ kind: "done" });
      window.setTimeout(() => go("/"), 1200);
    } catch (err) {
      setStatus({ kind: "error", err: authErrorKind(err) });
    }
  };

  if (session === "checking") return <p className="recalc text-sm text-ink-2">{t("user.loading")}</p>;
  if (session === "no")
    return (
      <div className="space-y-4">
        {AUTH_ENABLED && <p className="rounded-xl border border-rule bg-panel px-4 py-3 text-[0.9rem] text-ink-2">{t("auth.update.noSession")}</p>}
        <Link href="/sifre-sifirla" className="btn btn-lg w-full justify-center">
          {t("auth.update.newLink")}
        </Link>
      </div>
    );
  if (status.kind === "done")
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl border border-rule bg-panel px-4 py-3 text-[0.9rem]">
        <Icon name="check" size={18} className="text-accent-ink" />
        {t("auth.update.done")}
      </p>
    );

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <Field id={`${ids}-p`} label={t("auth.newPassword")} error={pwBad ? t("auth.v.password", { n: PASSWORD_MIN }) : null} hint={<Strength pw={password} id={`${ids}-ps`} />}>
        <PasswordInput id={`${ids}-p`} value={password} onChange={setPassword} autoComplete="new-password" invalid={pwBad} describedBy={`${ids}-ps`} />
      </Field>
      <Field id={`${ids}-a`} label={t("auth.confirmPassword")} error={mismatch ? t("auth.update.mismatch") : null}>
        <PasswordInput id={`${ids}-a`} value={again} onChange={setAgain} autoComplete="new-password" invalid={mismatch} />
      </Field>
      <StatusLine status={status as Status} />
      <Submit busy={status.kind === "busy"}>{t("auth.submit.update")}</Submit>
    </form>
  );
}
