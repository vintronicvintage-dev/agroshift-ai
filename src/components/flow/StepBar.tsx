"use client";

import { useI18n, type DictKey } from "@/lib/i18n";
import { dismissHint, type HintId } from "@/lib/ui/intro";
import { Close } from "@/components/ui/Glyphs";
import { Icon } from "@/components/ui/Icons";

/**
 * One dismissible line at the top of a section, once per section. Hidden by CSS after dismissal.
 * (The v1.1 step bar itself moved into the dashboard sidebar.)
 */
export function StepHint({ id }: { id: HintId }) {
  const { t } = useI18n();
  const key = `hint.${id}` as DictKey;
  return (
    <div data-hint={id} className="enter mb-5 flex items-start gap-3">
      <p className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl border border-rule bg-panel px-3.5 py-2 text-sm text-ink">
        <span className="mt-0.5 text-accent-ink">
          <Icon name="info" size={16} />
        </span>
        <span className="flex-1">{t(key)}</span>
        <button
          type="button"
          className="tap -my-1 -mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-panel-2 hover:text-ink"
          aria-label={t("hint.close")}
          onClick={(e) => {
            dismissHint(id);
            (e.currentTarget.closest("[data-step-root]") as HTMLElement | null)?.focus();
          }}
        >
          <Close size={12} />
        </button>
      </p>
    </div>
  );
}
