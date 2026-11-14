import type { SupabaseClient } from "@supabase/supabase-js";
import { AUTH_CONFIG } from "./config";

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * The browser Supabase client, loaded on demand so guest mode never ships the library.
 * Returns null when auth is not configured. `@supabase/ssr` keeps the session in cookies,
 * which the proxy and the /auth/confirm route read.
 */
export function getBrowserSupabase(): Promise<SupabaseClient> | null {
  const cfg = AUTH_CONFIG;
  if (!cfg || typeof window === "undefined") return null;
  clientPromise ??= import("@supabase/ssr").then(({ createBrowserClient }) => createBrowserClient(cfg.url, cfg.publishableKey));
  return clientPromise;
}

/** Absolute URL of the confirm route that sends the user on to `next` afterwards. */
export function confirmUrl(next: string): string {
  return `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}
