/**
 * Supabase Auth configuration (pure, server- and browser-safe).
 *
 * The two public variables are inlined by Next.js at build time. When either is missing or
 * malformed the app runs in guest mode: the dashboard is open, the auth forms explain why they
 * are disabled, and no session or user is ever invented.
 */

export interface AuthConfig {
  url: string;
  publishableKey: string;
}

/** Validates the raw values. Returns null when auth is not configured. */
export function readAuthConfig(env: { url?: string | null; key?: string | null }): AuthConfig | null {
  const url = (env.url ?? "").trim();
  const key = (env.key ?? "").trim();
  if (!url || !key) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) return null;
  // a placeholder copied from .env.example is not a key
  if (/^<.*>$/.test(key) || /^your[-_]/i.test(key)) return null;
  return { url: parsed.origin, publishableKey: key };
}

/** The app's configuration. Literal `process.env.NEXT_PUBLIC_*` reads so Next.js can inline them. */
export const AUTH_CONFIG: AuthConfig | null = readAuthConfig({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export const AUTH_ENABLED = AUTH_CONFIG !== null;
