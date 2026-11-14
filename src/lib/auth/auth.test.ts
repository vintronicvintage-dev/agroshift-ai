import { describe, expect, it } from "vitest";
import { readAuthConfig } from "./config";
import { authErrorKind, isObfuscatedExistingUser } from "./errors";
import { isValidEmail, passwordStrength } from "./password";
import { isAuthPage, isProtectedPath, safeNext } from "./redirect";

describe("readAuthConfig", () => {
  it("is null when either value is missing or blank", () => {
    expect(readAuthConfig({})).toBeNull();
    expect(readAuthConfig({ url: "https://abc.supabase.co" })).toBeNull();
    expect(readAuthConfig({ key: "sb_publishable_x" })).toBeNull();
    expect(readAuthConfig({ url: "  ", key: "  " })).toBeNull();
  });
  it("rejects malformed or insecure URLs and placeholders", () => {
    expect(readAuthConfig({ url: "not a url", key: "k" })).toBeNull();
    expect(readAuthConfig({ url: "http://abc.supabase.co", key: "k" })).toBeNull();
    expect(readAuthConfig({ url: "ftp://abc.supabase.co", key: "k" })).toBeNull();
    expect(readAuthConfig({ url: "https://abc.supabase.co", key: "<publishable-key>" })).toBeNull();
    expect(readAuthConfig({ url: "https://abc.supabase.co", key: "your-publishable-key" })).toBeNull();
  });
  it("accepts https and local http, trimming and normalising to the origin", () => {
    expect(readAuthConfig({ url: " https://abc.supabase.co/ ", key: " sb_publishable_x " })).toEqual({ url: "https://abc.supabase.co", publishableKey: "sb_publishable_x" });
    expect(readAuthConfig({ url: "http://127.0.0.1:54321", key: "k" })?.url).toBe("http://127.0.0.1:54321");
    expect(readAuthConfig({ url: "http://localhost:54321", key: "k" })?.url).toBe("http://localhost:54321");
  });
});

describe("authErrorKind", () => {
  it("maps Supabase error codes", () => {
    expect(authErrorKind({ code: "invalid_credentials", status: 400 })).toBe("invalidCredentials");
    expect(authErrorKind({ code: "email_not_confirmed" })).toBe("emailNotConfirmed");
    expect(authErrorKind({ code: "user_already_exists" })).toBe("alreadyRegistered");
    expect(authErrorKind({ code: "email_exists" })).toBe("alreadyRegistered");
    expect(authErrorKind({ code: "over_email_send_rate_limit", status: 429 })).toBe("rateLimited");
    expect(authErrorKind({ code: "weak_password" })).toBe("weakPassword");
    expect(authErrorKind({ code: "email_address_invalid" })).toBe("invalidEmail");
    expect(authErrorKind({ code: "same_password" })).toBe("samePassword");
    expect(authErrorKind({ code: "otp_expired" })).toBe("linkExpired");
    expect(authErrorKind({ code: "signup_disabled" })).toBe("signupDisabled");
  });
  it("detects network failures and rate limits without a code", () => {
    expect(authErrorKind({ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" })).toBe("network");
    expect(authErrorKind(new TypeError("Failed to fetch"))).toBe("network");
    expect(authErrorKind({ status: 429, message: "Too many" })).toBe("rateLimited");
  });
  it("falls back to message matching, then unknown", () => {
    expect(authErrorKind({ message: "Invalid login credentials" })).toBe("invalidCredentials");
    expect(authErrorKind({ message: "Email not confirmed" })).toBe("emailNotConfirmed");
    expect(authErrorKind({ code: "something_new", message: "?" })).toBe("unknown");
    expect(authErrorKind(null)).toBe("unknown");
    expect(authErrorKind("boom")).toBe("unknown");
  });
  it("recognises the obfuscated existing-user sign-up answer", () => {
    expect(isObfuscatedExistingUser({ identities: [] })).toBe(true);
    expect(isObfuscatedExistingUser({ identities: [{}] })).toBe(false);
    expect(isObfuscatedExistingUser({})).toBe(false);
    expect(isObfuscatedExistingUser(null)).toBe(false);
  });
});

describe("safeNext", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeNext("/")).toBe("/");
    expect(safeNext("/yontem")).toBe("/yontem");
    expect(safeNext("/?a=1#oneriler")).toBe("/?a=1#oneriler");
    expect(safeNext("/sifre-yenile")).toBe("/sifre-yenile");
  });
  it("rejects anything that could leave the origin", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "\\\\evil", "javascript:alert(1)", "evil.example/x", "/\u0000x", "/%0a", " //x"]) {
      const out = safeNext(bad);
      expect(out.startsWith("/") && !out.startsWith("//")).toBe(true);
      expect(out === "/" || out === "/%0a").toBe(true);
    }
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example/x")).toBe("/");
  });
  it("rejects auth routes to avoid loops and uses the fallback", () => {
    expect(safeNext("/giris")).toBe("/");
    expect(safeNext("/auth/confirm?x=1", "/yontem")).toBe("/yontem");
    expect(safeNext(null, "/x")).toBe("/x");
    expect(safeNext(undefined)).toBe("/");
  });
  it("classifies paths", () => {
    expect(isAuthPage("/kayit")).toBe(true);
    expect(isAuthPage("/")).toBe(false);
    expect(isProtectedPath("/")).toBe(true);
    expect(isProtectedPath("/yontem")).toBe(false);
    expect(isProtectedPath("/api/climate")).toBe(false);
  });
});

describe("password and e-mail", () => {
  it("scores strength", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abc12")).toBe(0);
    expect(passwordStrength("aaaaaaaa")).toBe(1);
    expect(passwordStrength("abcdefgh")).toBe(1);
    expect(passwordStrength("abcdef12")).toBe(2);
    expect(passwordStrength("Tarla2026!")).toBe(3);
    expect(passwordStrength("Uzun-bir-Tarla-2026")).toBe(4);
  });
  it("checks e-mail shape", () => {
    expect(isValidEmail("ciftci@ornek.com")).toBe(true);
    expect(isValidEmail(" a@b.co ")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.de")).toBe(false);
  });
});
