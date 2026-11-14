import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { isAuthPage, safeNext } from "@/lib/auth/redirect";

/**
 * Refreshes the session cookie on page requests. The tool itself is open to everyone (no login
 * wall): nothing is guarded. A signed-in visitor who opens a sign-in page is sent back to the app.
 * Without auth configuration it does nothing.
 */
export async function proxy(request: NextRequest) {
  const cfg = AUTH_CONFIG;
  if (!cfg) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(cfg.url, cfg.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Nothing between createServerClient and getClaims(): getClaims validates the JWT and refreshes it.
  let signedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    signedIn = !!data?.claims;
  } catch {
    signedIn = false;
  }

  if (signedIn && isAuthPage(request.nextUrl.pathname)) {
    const r = NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.nextUrl.origin));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  }
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|json)$).*)"],
};
