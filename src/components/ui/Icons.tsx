/**
 * AgroShift's icon family: one 24-unit grid, 1.5 px stroke, round caps. Decorative by default
 * (aria-hidden); the control that holds an icon carries the label.
 */
import type { ReactNode } from "react";

export type IconName =
  | "overview"
  | "field"
  | "options"
  | "evidence"
  | "methods"
  | "cards"
  | "signout"
  | "signin"
  | "user"
  | "sun"
  | "moon"
  | "lang"
  | "play"
  | "check"
  | "close"
  | "arrow"
  | "rain"
  | "thermo"
  | "wind"
  | "drop"
  | "alert"
  | "info"
  | "satellite"
  | "scenario"
  | "pin"
  | "chevronDown"
  | "eye"
  | "eyeOff"
  | "mail";

const PATHS: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="9" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="2" />
    </>
  ),
  field: (
    <>
      <path d="M3.5 8.5 12 4l8.5 4.5L12 13z" />
      <path d="M3.5 12.5 12 17l8.5-4.5" />
      <path d="M3.5 16.5 12 21l8.5-4.5" />
    </>
  ),
  options: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20.5h18" />
      <circle cx="19.5" cy="7.5" r="1.8" />
    </>
  ),
  evidence: (
    <>
      <path d="M8.5 8.5 4 4" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" transform="rotate(45 12 12)" />
      <path d="m15.5 15.5 4.5 4.5" />
      <path d="M3.5 13a8.5 8.5 0 0 0 7.5 7.5" />
      <path d="M20.5 11A8.5 8.5 0 0 0 13 3.5" />
    </>
  ),
  methods: (
    <>
      <path d="M4.5 5.5c2.6-1 5.1-.8 7.5.8v13.2c-2.4-1.6-4.9-1.8-7.5-.8z" />
      <path d="M19.5 5.5c-2.6-1-5.1-.8-7.5.8v13.2c2.4-1.6 4.9-1.8 7.5-.8z" />
    </>
  ),
  cards: (
    <>
      <rect x="3.5" y="6.5" width="12" height="13" rx="2" />
      <path d="M8.5 3.5h10a2 2 0 0 1 2 2v11" />
      <path d="m6.8 13.2 1.8 1.8 3.6-3.8" />
    </>
  ),
  signout: (
    <>
      <path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" />
      <path d="M10.5 12h10" />
      <path d="m17.5 8.5 3.5 3.5-3.5 3.5" />
    </>
  ),
  signin: (
    <>
      <path d="M10 4.5h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-7" />
      <path d="M3.5 12h10" />
      <path d="m10.5 8.5 3.5 3.5-3.5 3.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" />
    </>
  ),
  moon: <path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1Z" />,
  lang: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5Z" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m10 8.8 5 3.2-5 3.2z" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: (
    <>
      <path d="M4.5 12h15" />
      <path d="m14 6.5 5.5 5.5-5.5 5.5" />
    </>
  ),
  rain: (
    <>
      <path d="M6.5 14.5a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.6 1.3 3.4 3.4 0 0 1 .7 6.7" />
      <path d="m9 17.5-1 2.5M13 17.5l-1 2.5M17 17.5l-1 2.5" />
    </>
  ),
  thermo: (
    <>
      <path d="M10 14.2V5.5a2 2 0 0 1 4 0v8.7a4 4 0 1 1-4 0Z" />
      <path d="M12 10v6" />
    </>
  ),
  wind: (
    <>
      <path d="M3.5 9h11a2.8 2.8 0 1 0-2.8-2.8" />
      <path d="M3.5 13h15a2.8 2.8 0 1 1-2.8 2.8" />
      <path d="M3.5 17h6" />
    </>
  ),
  drop: <path d="M12 3.8c3 3.6 5.5 6.6 5.5 9.9a5.5 5.5 0 0 1-11 0c0-3.3 2.5-6.3 5.5-9.9Z" />,
  alert: (
    <>
      <path d="M10.4 4.6 3.3 17.4A1.8 1.8 0 0 0 4.9 20h14.2a1.8 1.8 0 0 0 1.6-2.6L13.6 4.6a1.8 1.8 0 0 0-3.2 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 16.6v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 7.9v.1" />
    </>
  ),
  satellite: (
    <>
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" transform="rotate(45 12 12)" />
      <path d="m5 5 3.2 3.2M15.8 15.8 19 19" />
      <path d="M3.5 7.5 7.5 3.5M16.5 20.5l4-4" />
      <path d="M17 5.5a3 3 0 0 1 1.5 1.5" />
    </>
  ),
  scenario: (
    <>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 17h3" />
      <path d="M11 17h9" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 20.5s-6-5.4-6-10.2a6 6 0 0 1 12 0c0 4.8-6 10.2-6 10.2Z" />
      <circle cx="12" cy="10.3" r="2.2" />
    </>
  ),
  chevronDown: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  eye: (
    <>
      <path d="M2.8 12c2-4 5.1-6 9.2-6s7.2 2 9.2 6c-2 4-5.1 6-9.2 6s-7.2-2-9.2-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M9.9 6.3A9.6 9.6 0 0 1 12 6c4.1 0 7.2 2 9.2 6a13.5 13.5 0 0 1-2.6 3.5M6.4 7.8A13 13 0 0 0 2.8 12c2 4 5.1 6 9.2 6 1.5 0 2.9-.3 4.1-.8" />
      <path d="M4 4l16 16" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
};

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className ?? ""}`}
    >
      {PATHS[name]}
    </svg>
  );
}
