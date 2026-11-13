"use client";

import Image from "next/image";
import { useI18n, type DictKey } from "@/lib/i18n";
import { collapseGs, dismissGs, GS_STEPS, reopenGs, useGettingStarted, type GsStep } from "@/lib/ui/gettingStarted";
import { goToSection, type SectionId } from "@/lib/ui/steps";
import { Icon } from "@/components/ui/Icons";
import { IMAGES, type ImageId } from "@/lib/ui/images";

/** One small real image per step (decorative: the card text says what the step is). Credits: Methods page. */
const THUMB: Record<GsStep, ImageId> = { field: "gsField", water: "gsWater", compare: "gsCompare", scenario: "gsScenario", evidence: "gsEvidence" };

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
                  <span className="gs-thumb" aria-hidden="true">
                    <Image src={IMAGES[THUMB[s]].src} alt="" width={40} height={40} sizes="40px" className="h-full w-full object-cover" />
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
