/** Where auth flows may send the user afterwards: same-origin paths only (pure). */

export const AUTH_PAGES = ["/giris", "/kayit", "/sifre-sifirla"] as const;
/** Pages that need a signed-in user when auth is configured. Hash sections (#tarlam …) live on "/". */
export const PROTECTED_PATHS = ["/"] as const;

const BASE = "http://agroshift.invalid";

/**
 * Returns a safe in-app path (pathname + search + hash) for a user-supplied `next` value,
 * or `fallback`. Rejects absolute and protocol-relative URLs, backslash tricks, control
 * characters, and auth routes (which would loop).
 */
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(s)) return fallback;
  let u: URL;
  try {
    u = new URL(s, BASE);
  } catch {
    return fallback;
  }
  if (u.origin !== BASE) return fallback;
  if (u.pathname.startsWith("/auth/") || (AUTH_PAGES as readonly string[]).includes(u.pathname)) return fallback;
  return `${u.pathname}${u.search}${u.hash}`;
}

export function isAuthPage(pathname: string): boolean {
  return (AUTH_PAGES as readonly string[]).includes(pathname);
}

export function isProtectedPath(pathname: string): boolean {
  return (PROTECTED_PATHS as readonly string[]).includes(pathname);
}
