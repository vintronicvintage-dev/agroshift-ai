/**
 * AgroShift v3 icon family: 24-unit grid, 1.5 px stroke, round caps and joins, top-down parcel
 * language (the mark's furrows and orbit). Decorative by default (aria-hidden); the control that
 * holds an icon carries the label. No icon library: every path is drawn here.
 */
import type { ReactNode } from "react";

export type IconName =
  | "field"
  | "plan"
  | "evidence"
  | "methods"
  | "satellite"
  | "layers"
  | "polygon"
  | "rectangle"
  | "circle"
  | "pin"
  | "edit"
  | "undo"
  | "redo"
  | "trash"
  | "search"
  | "locate"
  | "crosshair"
  | "upload"
  | "download"
  | "print"
  | "share"
  | "offline"
  | "save"
  | "list"
  | "keyboard"
  | "cells"
  | "calendar"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "plus"
  | "minus"
  | "close"
  | "check"
  | "alert"
  | "info"
  | "arrow"
  | "sun"
  | "moon"
  | "lang"
  | "user"
  | "signin"
  | "signout"
  | "rain"
  | "drop"
  | "thermo"
  | "frost"
  | "sprout"
  | "mail"
  | "email"
  | "name"
  | "copy"
  | "grip"
  | "eye"
  | "eyeOff";

const P: Record<IconName, ReactNode> = {
  // a parcel seen from above with furrows
  field: (
    <>
      <path d="M4 7.5 18.5 5 20 17.5 5.5 19.5Z" />
      <path d="M8.5 7 9.6 18.9M13.2 6.2l1.4 12" />
    </>
  ),
  // three stacked year bands, the middle one shifted
  plan: (
    <>
      <path d="M3.5 6.5h10M16.5 6.5h4" />
      <path d="M3.5 12h4M10.5 12h10" />
      <path d="M3.5 17.5h13M19.5 17.5h1" />
    </>
  ),
  // a claim with its chart: bars and a pointer
  evidence: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6M11 20V9M15 20v-4M19 20V6" />
      <path d="M6 9.5 10 6l3.5 3L18 4" />
    </>
  ),
  methods: (
    <>
      <path d="M6 3.5h9l3.5 3.5v13.5H6Z" />
      <path d="M15 3.5V7h3.5M9 11.5h6.5M9 14.5h6.5M9 17.5h4" />
    </>
  ),
  satellite: (
    <>
      <path d="M9.5 9.5l5 5" />
      <path d="m8 11 3-3 5 5-3 3Z" />
      <path d="M5.5 8.5 3 6l3-3 2.5 2.5M15.5 18.5 18 21l3-3-2.5-2.5" />
      <path d="M17 10.5a4 4 0 0 0-3.5-3.5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 4 8.5 4.5L12 13 3.5 8.5Z" />
      <path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
    </>
  ),
  polygon: (
    <>
      <path d="M5 8 11 4l8 5-2 10H7Z" />
      <circle cx="5" cy="8" r="1.6" />
      <circle cx="11" cy="4" r="1.6" />
      <circle cx="19" cy="9" r="1.6" />
      <circle cx="17" cy="19" r="1.6" />
      <circle cx="7" cy="19" r="1.6" />
    </>
  ),
  rectangle: (
    <>
      <path d="M5 6h14v12H5Z" />
      <circle cx="5" cy="6" r="1.6" />
      <circle cx="19" cy="18" r="1.6" />
    </>
  ),
  circle: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 12h8" />
      <circle cx="12" cy="12" r="1.3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16Z" />
      <path d="m13 7 4 4" />
    </>
  ),
  undo: (
    <>
      <path d="M8.5 5 4 9.5 8.5 14" />
      <path d="M4 9.5h10a5.5 5.5 0 0 1 0 11H10" />
    </>
  ),
  redo: (
    <>
      <path d="M15.5 5 20 9.5 15.5 14" />
      <path d="M20 9.5H10a5.5 5.5 0 0 0 0 11h4" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14" />
      <path d="M10.5 10.5v6.5M13.5 10.5v6.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    </>
  ),
  crosshair: (
    <>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4.5 15v5h15v-5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 15v5h15v-5" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V3.5h10V9" />
      <path d="M7 17H4.5V9h15v8H17" />
      <path d="M7 14h10v6.5H7Z" />
    </>
  ),
  share: (
    <>
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="17.5" cy="6" r="2.5" />
      <circle cx="17.5" cy="18" r="2.5" />
      <path d="m8.7 10.8 6.6-3.6M8.7 13.2l6.6 3.6" />
    </>
  ),
  offline: (
    <>
      <path d="M3.5 9a12 12 0 0 1 17 0" strokeDasharray="2.2 2.2" />
      <path d="M6.5 12.3a7.5 7.5 0 0 1 11 0" />
      <circle cx="12" cy="17.5" r="1.2" />
      <path d="m4 4 16 16" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h11l3 3v13H5Z" />
      <path d="M8.5 4v4.5h6V4M8 20v-6h8v6" />
    </>
  ),
  list: (
    <>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <path d="M4 6.5h1.5M4 12h1.5M4 17.5h1.5" />
    </>
  ),
  keyboard: (
    <>
      <path d="M3 6.5h18v11H3Z" />
      <path d="M6.5 10h1M10 10h1M13.5 10h1M17 10h1M7.5 14h9" />
    </>
  ),
  // nested data cells: coarse, medium, fine
  cells: (
    <>
      <path d="M3.5 3.5h17v17h-17Z" />
      <path d="M8 8h8v8H8Z" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  calendar: (
    <>
      <path d="M4 6h16v14H4Z" />
      <path d="M4 10h16M8.5 3.5V7.5M15.5 3.5V7.5" />
    </>
  ),
  "chevron-left": <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  "chevron-right": <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  "chevron-down": <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  alert: (
    <>
      <path d="M12 4 21 19.5H3Z" />
      <path d="M12 10v4.5M12 17v.3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.3" />
    </>
  ),
  arrow: <path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5" />,
  // sun: a disc over a horizon line (daylight over the field), no starburst clip-art
  sun: (
    <>
      <circle cx="12" cy="11" r="4" />
      <path d="M12 3v1.8M4.5 11H3M21 11h-1.5M6.4 5.4l1.2 1.2M17.6 5.4l-1.2 1.2" />
      <path d="M3 19.5h18" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />,
  lang: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  signin: (
    <>
      <path d="M13 4.5h6v15h-6" />
      <path d="M4 12h10M10.5 8.5 14 12l-3.5 3.5" />
    </>
  ),
  signout: (
    <>
      <path d="M11 4.5H5v15h6" />
      <path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" />
    </>
  ),
  // rain: three falling streaks over a ground line (gauge reading, not a cartoon cloud)
  rain: (
    <>
      <path d="M7 4.5 5 10.5M12.5 4.5l-2 6M18 4.5l-2 6M9.5 12.5l-2 6M15 12.5l-2 6" />
      <path d="M3 20.5h18" />
    </>
  ),
  drop: <path d="M12 3.5s-6 6.5-6 10.5a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" />,
  thermo: (
    <>
      <path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z" />
      <path d="M12 9v8" />
    </>
  ),
  frost: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />,
  sprout: (
    <>
      <path d="M12 20.5v-9" />
      <path d="M12 12.5C12 8 9 6 4.5 6c0 4.5 3 6.5 7.5 6.5ZM12 11c0-3.5 2.5-6 7.5-6 0 4-2.5 6.5-7.5 6Z" />
      <path d="M5 20.5h14" />
    </>
  ),
  mail: (
    <>
      <path d="M3.5 6h17v12h-17Z" />
      <path d="m3.5 6.5 8.5 7 8.5-7" />
    </>
  ),
  email: (
    <>
      <path d="M3.5 6h17v12h-17Z" />
      <path d="m3.5 6.5 8.5 7 8.5-7" />
    </>
  ),
  name: (
    <>
      <path d="M3.5 6.5h17v11h-17Z" />
      <circle cx="8.5" cy="11" r="1.8" />
      <path d="M5.8 15.5a2.8 2.8 0 0 1 5.4 0M13.5 10h4.5M13.5 13.5h3" />
    </>
  ),
  copy: (
    <>
      <path d="M8.5 8.5h11v11h-11Z" />
      <path d="M15.5 8.5v-4h-11v11h4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="m4 4 16 16" />
    </>
  ),
  grip: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={2.6} />,
};

export function Icon({ name, size = 20, className, title }: { name: IconName; size?: number; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      focusable="false"
    >
      {P[name]}
    </svg>
  );
}
