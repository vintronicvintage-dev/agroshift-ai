import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { safeNext } from "@/lib/auth/redirect";
import { createServerSupabase } from "@/lib/auth/server";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Landing point of every e-mail link (sign-up confirmation, magic link, password reset).
 * Accepts both shapes Supabase can send:
 *  - `?token_hash=…&type=…` (custom template, works in any browser) → verifyOtp
 *  - `?code=…` (default template, PKCE; same browser that asked) → exchangeCodeForSession
 * Then redirects to the sanitised `next` path without the secret in the URL.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/sifre-yenile" : "/";
  const next = safeNext(params.get("next"), fallback);
  // `path` is always an in-app path (safeNext or a literal), so the origin cannot change
  const to = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));

  const cfg = AUTH_CONFIG;
  if (!cfg) return to("/giris?hata=yapilandirma");

  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const supabase = await createServerSupabase(cfg);

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return to(next);
    return to(`/giris?hata=${encodeURIComponent(error.code ?? "baglanti")}`);
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return to(next);
    return to(`/giris?hata=${encodeURIComponent(error.code ?? "baglanti")}`);
  }
  // Supabase reports link problems as ?error_code=… on the redirect
  const linkError = params.get("error_code");
  return to(`/giris?hata=${encodeURIComponent(linkError ?? "baglanti")}`);
}
