"use client";

import { useI18n } from "@/lib/i18n";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { AuthShell } from "./AuthShell";
import { ResetRequestForm, SignInForm, SignUpForm, UpdatePasswordForm } from "./AuthForms";

export type AuthPageKind = "signIn" | "signUp" | "reset" | "update";

export function AuthPage({ kind }: { kind: AuthPageKind }) {
  const { t } = useI18n();
  if (kind === "signIn")
    return (
      <AuthShell title={t("auth.signIn.title")} lead={t("auth.signIn.lead")}>
        <SignInForm />
      </AuthShell>
    );
  if (kind === "signUp")
    return (
      <AuthShell title={t("auth.signUp.title")} lead={t("auth.signUp.lead")}>
        <SignUpForm />
      </AuthShell>
    );
  if (kind === "reset")
    return (
      <AuthShell title={t("auth.reset.title")} lead={t("auth.reset.lead")}>
        <ResetRequestForm />
      </AuthShell>
    );
  return (
    <AuthShell title={t("auth.update.title")} lead={t("auth.update.lead", { n: PASSWORD_MIN })}>
      <UpdatePasswordForm />
    </AuthShell>
  );
}
