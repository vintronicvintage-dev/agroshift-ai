"use client";

import { useEffect, useState } from "react";
import { AUTH_ENABLED } from "./config";
import { getBrowserSupabase } from "./browser";

export type AuthUserState =
  | { status: "guest" } // auth not configured
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; email: string; name: string | null };

/** The signed-in user as Supabase reports it. Never invents one: guest mode stays "guest". */
export function useAuthUser(): AuthUserState {
  const [state, setState] = useState<AuthUserState>(AUTH_ENABLED ? { status: "loading" } : { status: "guest" });
  useEffect(() => {
    const p = getBrowserSupabase();
    if (!p) return;
    let alive = true;
    let unsub: (() => void) | null = null;
    void p.then(async (sb) => {
      const apply = (u: { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined) => {
        if (!alive) return;
        if (!u) setState({ status: "signed-out" });
        else {
          const raw = u.user_metadata?.full_name;
          setState({ status: "signed-in", email: u.email ?? "", name: typeof raw === "string" && raw.trim() ? raw.trim() : null });
        }
      };
      const { data } = await sb.auth.getUser().catch(() => ({ data: { user: null } }));
      apply(data.user);
      const sub = sb.auth.onAuthStateChange((_e, session) => apply(session?.user ?? null));
      unsub = () => sub.data.subscription.unsubscribe();
      if (!alive) unsub();
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, []);
  return state;
}

/** Signs out (clears the session cookies), then lets the caller navigate to the sign-in page. */
export async function signOut(then: () => void): Promise<void> {
  const p = getBrowserSupabase();
  if (!p) return;
  const sb = await p;
  await sb.auth.signOut().catch(() => undefined);
  then();
}
