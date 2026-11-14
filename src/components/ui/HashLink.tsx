"use client";

import type { ReactNode } from "react";
import { goToSection, type SectionId } from "@/lib/ui/steps";

/**
 * A link to a dashboard section on "/" (`/#tarlam` …). On the dashboard it sets location.hash so the
 * hashchange listener moves the section (Next's Link would pushState, which fires no hashchange);
 * from other pages it is a normal link to the dashboard.
 */
export function HashLink({ to, className, children, title, "aria-label": ariaLabel, "aria-current": ariaCurrent }: { to: SectionId; className?: string; children: ReactNode; title?: string; "aria-label"?: string; "aria-current"?: "page" }) {
  const href = `/#${to}`;
  return (
    <a
      href={href}
      className={className}
      title={title}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      onClick={(e) => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (window.location.pathname !== "/") return;
        e.preventDefault();
        goToSection(to);
      }}
    >
      {children}
    </a>
  );
}
