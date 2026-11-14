"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icons";

export type Tier = "inside" | "few" | "cell" | "computed" | "engine";

/** Provenance tier: a square icon (filled / half / outlined) plus words, never colour alone. */
export function TierBadge({ tier, note }: { tier: Tier; note?: string }) {
  const { t } = useI18n();
  const icon =
    tier === "inside" ? (
      <rect x="1" y="1" width="10" height="10" fill="currentColor" />
    ) : tier === "few" ? (
      <>
        <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 11 11 1V11Z" fill="currentColor" />
      </>
    ) : tier === "cell" ? (
      <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.4" />
    ) : (
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.6" />
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-2" title={note}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        {icon}
      </svg>
      {t(`tier.${tier}`)}
    </span>
  );
}

export function ResChip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}

export type CardState = "loading" | "error" | "ok" | "empty";

/**
 * One field card. Fixed-ish minimum height per card so the panel does not jump while sources
 * resolve; each card owns its own loading, error and retry.
 */
export function Card({
  id,
  title,
  finding,
  state,
  tier,
  tierNote,
  res,
  source,
  onRetry,
  errorText,
  emptyText,
  minH = 160,
  children,
  slow,
}: {
  id: string;
  title: string;
  finding?: ReactNode;
  state: CardState;
  tier?: Tier;
  tierNote?: string;
  res?: ReactNode;
  source?: ReactNode;
  onRetry?: () => void;
  errorText?: string;
  emptyText?: string;
  minH?: number;
  children?: ReactNode;
  slow?: string | null;
}) {
  const { t } = useI18n();
  return (
    <article id={id} aria-labelledby={`${id}-h`} aria-busy={state === "loading"} className="border-b border-line px-4 py-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={`${id}-h`} className="text-[15px] font-semibold">
          {title}
        </h3>
        <span className="flex flex-wrap items-center gap-2">
          {res && <ResChip>{res}</ResChip>}
          {tier && <TierBadge tier={tier} note={tierNote} />}
        </span>
      </header>
      <div style={{ minHeight: state === "ok" ? undefined : minH - 40 }}>
        {state === "loading" && (
          <div className="mt-3 space-y-2" aria-label={t("card.loading")}>
            <div className="skel h-8 w-2/5" />
            <div className="skel h-16 w-full" />
            {slow && <p className="text-[13px] text-ink-2">{slow}</p>}
          </div>
        )}
        {state === "error" && (
          <div className="mt-3 flex items-start gap-2.5 rounded-md border border-line-strong p-3" role="alert">
            <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-bad" />
            <div className="min-w-0 text-[14px]">
              <p>{errorText ?? t("card.error")}</p>
              {onRetry && (
                <button type="button" className="btn btn-sm mt-2" onClick={onRetry}>
                  {t("card.retry")}
                </button>
              )}
            </div>
          </div>
        )}
        {state === "empty" && <p className="mt-3 text-[14px] text-ink-2">{emptyText ?? t("card.empty")}</p>}
        {state === "ok" && (
          <>
            {finding && <p className="mt-1.5 text-[14px] text-ink-2">{finding}</p>}
            <div className="mt-3">{children}</div>
          </>
        )}
      </div>
      {state === "ok" && source && <p className="readout mt-3">{source}</p>}
    </article>
  );
}

/** Big numeral with a 40 % unit. */
export function Big({ value, unit, size = 40, className = "" }: { value: string; unit?: string; size?: number; className?: string }) {
  return (
    <span className={`numeral ${className}`} style={{ fontSize: size }}>
      {value}
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}

/** Small table toggle that every chart carries (plain numbers one click away). */
export function TableToggle({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mt-2">
      <summary className="tap text-[13px] font-medium text-ink-2">
        <span className="chev mr-1">›</span>
        {label}
      </summary>
      <div className="mt-1 overflow-x-auto">{children}</div>
    </details>
  );
}

export function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-[13px] tabular-nums">
      <thead>
        <tr className="text-left text-ink-2">
          {head.map((h) => (
            <th key={h} className="py-1 pr-3 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-line">
            {r.map((c, j) => (
              <td key={j} className={`py-1 pr-3 ${j > 0 ? "text-right" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
