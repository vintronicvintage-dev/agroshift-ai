import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { isAuthPage, isProtectedPath, safeNext } from "@/lib/auth/redirect";

/**
 * Refreshes the Supabase session cookie on every page request and guards the dashboard.
 * Without auth configuration (guest mode) it does nothing. /api/*, /yontem and static files
 * are outside the matcher or not protected; /auth/* route handlers manage cookies themselves.
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

  const { pathname, search } = request.nextUrl;
  const redirect = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.nextUrl.origin));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!signedIn && isProtectedPath(pathname)) {
    const next = safeNext(`${pathname}${search}`);
    return redirect(next === "/" ? "/giris" : `/giris?next=${encodeURIComponent(next)}`);
  }
  if (signedIn && isAuthPage(pathname)) {
    return redirect(safeNext(request.nextUrl.searchParams.get("next")));
  }
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|json)$).*)"],
};
