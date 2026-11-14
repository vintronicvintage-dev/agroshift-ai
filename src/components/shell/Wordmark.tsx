import { Logo } from "@/components/brand/Logo";

/**
 * The product mark in the shell, auth and intro: the brand logo (see components/brand).
 * `compact` shows the mark alone (icon rail, phone top bar). The wrapping link carries the name.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return compact ? <Logo variant="mark" size={28} /> : <Logo variant="horizontal" size={26} />;
}
