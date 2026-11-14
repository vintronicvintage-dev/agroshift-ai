/** Password rules and a rough strength meter for the sign-up form (pure). */

/** Supabase's default minimum is 6; we ask for 8. */
export const PASSWORD_MIN = 8;

export type Strength = 0 | 1 | 2 | 3 | 4;

/**
 * 0 = empty or shorter than the minimum, 1 weak … 4 strong. Length counts most; mixing
 * lower case, upper case, digits and symbols adds a step each up to the cap.
 */
export function passwordStrength(pw: string): Strength {
  if (pw.length < PASSWORD_MIN) return 0;
  const classes = [/[a-zçğıöşü]/, /[A-ZÇĞİÖŞÜ]/, /\d/, /[^\p{L}\d]/u].filter((r) => r.test(pw)).length;
  let s = 1;
  if (pw.length >= 12) s++;
  if (classes >= 2) s++;
  if (classes >= 3 || pw.length >= 16) s++;
  if (/^(.)\1+$/.test(pw)) s = 1;
  return Math.min(4, s) as Strength;
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
