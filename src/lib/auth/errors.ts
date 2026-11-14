/** Maps Supabase Auth errors to a small set of human messages (pure). */

export type AuthErrorKind =
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "alreadyRegistered"
  | "rateLimited"
  | "weakPassword"
  | "invalidEmail"
  | "samePassword"
  | "linkExpired"
  | "signupDisabled"
  | "noAccount"
  | "network"
  | "unknown";

interface ErrorLike {
  code?: string | null;
  status?: number | null;
  name?: string | null;
  message?: string | null;
}

const BY_CODE: Record<string, AuthErrorKind> = {
  invalid_credentials: "invalidCredentials",
  user_not_found: "invalidCredentials",
  email_not_confirmed: "emailNotConfirmed",
  user_already_exists: "alreadyRegistered",
  email_exists: "alreadyRegistered",
  identity_already_exists: "alreadyRegistered",
  over_request_rate_limit: "rateLimited",
  over_email_send_rate_limit: "rateLimited",
  weak_password: "weakPassword",
  email_address_invalid: "invalidEmail",
  email_address_not_authorized: "invalidEmail",
  same_password: "samePassword",
  otp_expired: "linkExpired",
  flow_state_expired: "linkExpired",
  flow_state_not_found: "linkExpired",
  bad_code_verifier: "linkExpired",
  signup_disabled: "signupDisabled",
  email_provider_disabled: "signupDisabled",
  request_timeout: "network",
  otp_disabled: "noAccount",
};

export function authErrorKind(err: unknown): AuthErrorKind {
  if (!err || typeof err !== "object") return "unknown";
  const e = err as ErrorLike;
  const code = typeof e.code === "string" ? e.code : null;
  if (code && BY_CODE[code]) return BY_CODE[code];
  if (e.name === "AuthRetryableFetchError" || e.name === "TypeError" || e.status === 0) return "network";
  if (e.status === 429) return "rateLimited";
  const msg = (e.message ?? "").toLowerCase();
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed")) return "network";
  if (msg.includes("invalid login credentials")) return "invalidCredentials";
  if (msg.includes("email not confirmed")) return "emailNotConfirmed";
  if (msg.includes("already registered")) return "alreadyRegistered";
  if (msg.includes("rate limit")) return "rateLimited";
  return "unknown";
}

/**
 * With e-mail confirmation on, Supabase answers a sign-up for an existing address with a user
 * that has no identities instead of an error (to avoid leaking which addresses exist).
 */
export function isObfuscatedExistingUser(user: { identities?: unknown[] | null } | null | undefined): boolean {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}
