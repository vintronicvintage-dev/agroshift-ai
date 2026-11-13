import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { AuthConfig } from "./config";

/** Server Supabase client for Route Handlers (cookies are writable there). */
export async function createServerSupabase(cfg: AuthConfig) {
  const cookieStore = await cookies();
  return createServerClient(cfg.url, cfg.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component: the proxy refreshes the session instead
        }
      },
    },
  });
}
