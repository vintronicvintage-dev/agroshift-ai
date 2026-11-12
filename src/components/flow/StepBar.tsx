"use client";

import { useI18n, type DictKey } from "@/lib/i18n";
import { dismissHint, type HintId } from "@/lib/ui/intro";
import { STEPS, type StepId } from "@/lib/ui/steps";
import { Close, Lock } from "@/components/ui/Glyphs";

const LABEL: Record<StepId, DictKey> = { tarlam: "step.field", oneriler: "step.compare", kanit: "step.evidence" };

interface Props {
  current: StepId;
  locked: boolean;
  /** Short status line under each step label. */
  sub: Record<StepId, string>;
}

/**
 * The three-step bar. Steps are plain hash links, so the back button and deep links work.
 * Locked steps stay visible and say why they are locked.
 */
export function StepBar({ current, locked, sub }: Props) {
  const { t } = useI18n();
  return (
    <nav className="stepbar" aria-label={t("step.nav")}>
      <ol className="mx-auto grid max-w-[1320px] grid-cols-3 px-1 sm:px-6">
        {STEPS.map((s, i) => {
          const isLocked = locked && s !== "tarlam";
          const here = s === current;
          const inner = (
            <>
              <span className="step-dot grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink-2 font-serif text-[0.95rem] font-semibold tabular-nums">
                {isLocked ? <Lock /> : i + 1}
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-[0.95rem] font-semibold leading-tight">{t(LABEL[s])}</span>
                <span className="block truncate text-xs leading-tight text-ink-2">{isLocked ? t("step.locked") : sub[s]}</span>
              </span>
              <span className="step-rail" aria-hidden="true" />
            </>
          );
          const cls = "tap relative flex h-[var(--stepbar-h)] items-center justify-center gap-2.5 px-2 sm:justify-start sm:px-3";
          return (
            <li key={s} className="min-w-0">
              {isLocked ? (
                <span className={`${cls} cursor-not-allowed opacity-70`} aria-disabled="true" title={t("step.locked")}>
                  <span className="sr-only">{t("step.of", { n: i + 1 })}: </span>
                  {inner}
                </span>
              ) : (
                <a href={`#${s}`} className={`${cls} rounded-sm hover:bg-panel-2/70`} aria-current={here ? "step" : undefined}>
                  <span className="sr-only">{t("step.of", { n: i + 1 })}: </span>
                  {inner}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** One dismissible line under the step bar, once per step. Hidden by CSS after dismissal. */
export function StepHint({ id }: { id: HintId }) {
  const { t } = useI18n();
  const key = `hint.${id}` as DictKey;
  return (
    <div data-hint={id} className="enter mx-auto mt-4 flex max-w-[1320px] items-start gap-3 px-4 sm:px-6">
      <p className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl bg-sky-soft px-3.5 py-2 text-sm text-ink">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0 text-sky">
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 7.2v3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="5" r="0.95" fill="currentColor" />
        </svg>
        <span className="flex-1">{t(key)}</span>
        <button
          type="button"
          className="tap -my-1 -mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-panel hover:text-ink"
          aria-label={t("hint.close")}
          onClick={(e) => {
            dismissHint(id);
            // the hint is gone: keep focus on the step content instead of the body
            (e.currentTarget.closest("[data-step-root]") as HTMLElement | null)?.focus();
          }}
        >
          <Close size={12} />
        </button>
      </p>
    </div>
  );
}
