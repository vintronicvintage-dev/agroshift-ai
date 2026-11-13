"use client";

import { useI18n, type DictKey } from "@/lib/i18n";
import { collapseGs, dismissGs, GS_STEPS, reopenGs, useGettingStarted, type GsStep } from "@/lib/ui/gettingStarted";
import { goToSection, type SectionId } from "@/lib/ui/steps";
import { Icon } from "@/components/ui/Icons";

const TARGET: Record<GsStep, SectionId> = { field: "tarlam", water: "tarlam", compare: "oneriler", scenario: "oneriler", evidence: "kanit" };

/**
 * "Getting started": five small cards, each teaching one part and taking you there. Ticks come
 * from real actions (see AgroShiftApp). Visibility of the full strip, the one-line summary and the
 * dismissed state is decided by html[data-gs] before first paint, so nothing flashes or jumps.
 */
export function GettingStarted({ locked }: { locked: boolean }) {
  const { t } = useI18n();
  const gs = useGettingStarted();
  const k = gs.done.length;
  const total = GS_STEPS.length;
  const allDone = k >= total;
  return (
    <section aria-labelledby="gs-h" className="mb-5">
      <div className="gs-full">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id="gs-h" className="card-title text-[1.05rem]">
            {t("gs.title")}
          </h2>
          <span className="flex items-center gap-2 text-[0.8rem] text-ink-2 tabular-nums">
            <span className="flex gap-1" aria-hidden="true">
              {GS_STEPS.map((s) => (
                <span key={s} className={`h-1.5 w-5 rounded-full transition-colors duration-200 ${gs.done.includes(s) ? "bg-accent" : "bg-rule-strong"}`} />
              ))}
            </span>
            {t("gs.progress", { k, n: total })}
          </span>
          <span className="ml-auto flex items-center gap-1">
            {allDone && (
              <button type="button" className="btn btn-quiet px-2.5 text-[0.8rem]" onClick={collapseGs}>
                {t("gs.collapse")}
              </button>
            )}
            <button type="button" className="tap grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-panel-2 hover:text-ink" aria-label={t("gs.close")} title={t("gs.close")} onClick={dismissGs}>
              <Icon name="close" size={16} />
            </button>
          </span>
        </div>
        <ol className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 xl:grid-cols-5">
          {GS_STEPS.map((s, i) => {
            const done = gs.done.includes(s);
            const target = locked && TARGET[s] !== "tarlam" ? "tarlam" : TARGET[s];
            return (
              <li key={s} className="w-[15.5rem] shrink-0 snap-start sm:w-auto">
                <button type="button" className="gs-card h-full w-full" data-done={done} onClick={() => goToSection(target)}>
                  <span className="gs-art text-ink-2">
                    <Art step={s} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[0.86rem] font-semibold leading-tight">
                        <span className="text-ink-2 tabular-nums">{i + 1}. </span>
                        {t(`gs.${s}.t` as DictKey)}
                      </span>
                      <span className="gs-check mt-0.5 shrink-0" aria-hidden="true">
                        <Icon name="check" size={12} />
                      </span>
                    </span>
                    <span className="mt-1 block text-[0.76rem] leading-snug text-ink-2">{t(`gs.${s}.b` as DictKey)}</span>
                    <span className="sr-only">, {done ? t("gs.done") : t("gs.todo")}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="gs-compact items-center gap-3 rounded-xl border border-rule bg-panel px-3.5 py-2 text-[0.82rem]">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-on-accent">
          <Icon name="check" size={13} />
        </span>
        <span className="min-w-0 flex-1 text-ink-2">{t("gs.doneLine")}</span>
        <button type="button" className="btn btn-quiet px-2.5 text-[0.8rem]" onClick={reopenGs}>
          {t("gs.show")}
        </button>
        <button type="button" className="tap grid h-8 w-8 place-items-center rounded-lg text-ink-2 hover:bg-panel-2 hover:text-ink" aria-label={t("gs.close")} onClick={dismissGs}>
          <Icon name="close" size={14} />
        </button>
      </div>
    </section>
  );
}

/** Small drawings, one per card: geometry only, in the icon family's stroke. */
function Art({ step }: { step: GsStep }) {
  const common = { width: 34, height: 34, viewBox: "0 0 40 40", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (step) {
    case "field":
      return (
        <svg {...common}>
          <rect x="2.75" y="2.75" width="34.5" height="34.5" rx="9" stroke="var(--rule-strong)" />
          <path d="M8 27h24M8 31.5h18" stroke="var(--loam)" />
          <path d="M20 23s-6-5.2-6-9.7a6 6 0 0 1 12 0c0 4.5-6 9.7-6 9.7Z" stroke="var(--accent-ink)" />
          <circle cx="20" cy="13.3" r="2" stroke="var(--accent-ink)" />
        </svg>
      );
    case "water":
      return (
        <svg {...common}>
          <rect x="2.75" y="2.75" width="34.5" height="34.5" rx="9" stroke="var(--rule-strong)" />
          <path d="M15 8.5c2.4 3 4.3 5.4 4.3 8a4.3 4.3 0 0 1-8.6 0c0-2.6 1.9-5 4.3-8Z" stroke="var(--c-precip)" />
          <rect x="23" y="10" width="10" height="4" rx="2" fill="#E69F00" stroke="none" />
          <rect x="23" y="17" width="10" height="4" rx="2" fill="#009E73" stroke="none" />
          <rect x="23.75" y="24.75" width="8.5" height="2.5" rx="1.25" stroke="var(--loam)" strokeDasharray="2 1.6" />
          <path d="M8 31h24" stroke="var(--rule-strong)" />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <rect x="2.75" y="2.75" width="34.5" height="34.5" rx="9" stroke="var(--rule-strong)" />
          <path d="M9 30h22" stroke="var(--rule-strong)" />
          <rect x="11" y="19" width="4" height="11" rx="1.5" stroke="var(--ink-2)" />
          <rect x="18" y="12" width="4" height="18" rx="1.5" fill="var(--accent)" stroke="none" />
          <rect x="25" y="16" width="4" height="14" rx="1.5" stroke="var(--ink-2)" />
        </svg>
      );
    case "scenario":
      return (
        <svg {...common}>
          <rect x="2.75" y="2.75" width="34.5" height="34.5" rx="9" stroke="var(--rule-strong)" />
          <circle cx="14" cy="15" r="4" stroke="var(--c-et0)" />
          <path d="M14 7.5v1.6M14 20.9v1.6M6.5 15h1.6M19.9 15h1.6" stroke="var(--c-et0)" />
          <path d="M18.5 29a4 4 0 0 1 .4-8 5 5 0 0 1 9.4 1.6 3.2 3.2 0 0 1-.3 6.4Z" stroke="var(--ink-2)" />
          <path d="M22 33h4" stroke="var(--c-precip)" />
        </svg>
      );
    case "evidence":
      return (
        <svg {...common}>
          <rect x="2.75" y="2.75" width="34.5" height="34.5" rx="9" stroke="var(--rule-strong)" />
          <path d="M7 28c5-12 21-12 26 0" stroke="var(--accent-ink)" strokeDasharray="2 3" />
          <rect x="17" y="11" width="6" height="6" rx="1.2" transform="rotate(45 20 14)" stroke="var(--ink)" />
          <path d="M12 9.5l3 3M25 15.5l3 3" stroke="var(--ink-2)" />
          <path d="M10 32h20" stroke="var(--loam)" />
        </svg>
      );
  }
}
