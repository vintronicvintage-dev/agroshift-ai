"use client";

import type { ReactNode } from "react";
import { CROPS } from "@/lib/engine";
import type { AnalysisResult, PlanResult } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import { composeVerdict, deltaTone, SAME_EPS } from "@/lib/ui/verdict";
import { Num } from "@/components/ui/Num";
import { DeltaMark } from "@/components/ui/Glyphs";

export function usePlanTitle() {
  const { t } = useI18n();
  return (p: PlanResult) => (p.kind === "current" ? t("plan.current") : p.kind === "recommended" ? t("plan.rec", { n: p.rank ?? 0 }) : t("plan.user"));
}

/**
 * The answer, from engine numbers only (see lib/ui/verdict.ts). One serif headline (which plan),
 * the crops, then the three differences against the current plan as a short list, each with a
 * direction mark and a word, so colour is never the only signal.
 */
export function Verdict({ result, size = "lg" }: { result: AnalysisResult; size?: "lg" | "sm" }) {
  const { t, L } = useI18n();
  const title = usePlanTitle();
  const v = composeVerdict(result);
  const crops = v.best.crops.map((c) => L(CROPS[c].name)).join(", ");
  const head =
    size === "sm"
      ? "font-display text-[length:var(--text-step-2)] font-[560] leading-[1.15] tracking-[-0.015em] text-balance"
      : "font-display text-[length:var(--text-step-3)] font-[560] leading-[1.1] tracking-[-0.02em] text-balance";

  if (v.bestIsCurrent) {
    return <p className={`max-w-[34ch] ${head}`}>{t("v.current", { crops })}</p>;
  }

  const rows: { key: string; node: ReactNode }[] = [];
  const clause = (prefix: "v.def" | "v.mar" | "v.soil", k: "deficit" | "margin" | "soil", delta: number | null) => {
    const tone = deltaTone(k, delta, SAME_EPS[k]);
    if (tone === null) return;
    if (tone === "same") {
      rows.push({
        key: k,
        node: (
          <>
            <span className="text-ink-2">
              <DeltaMark delta={0} />
            </span>
            <span>{t(`${prefix}.same` as DictKey)}</span>
          </>
        ),
      });
      return;
    }
    const [before, after] = t(`${prefix}.${tone}` as DictKey, { v: "\u0000" }).split("\u0000");
    const color = tone === "better" ? "text-[var(--c-green)]" : "text-bad";
    rows.push({
      key: k,
      node: (
        <>
          <span className={color}>
            <DeltaMark delta={delta} />
          </span>
          <span>
            {before}
            <strong className={`readout text-[1.05em] font-medium ${color}`}>
              <Num value={delta} abs />
            </strong>
            {after}
            <span className="sr-only">, {t(`tbl.${tone}`)}</span>
          </span>
        </>
      ),
    });
  };
  clause("v.def", "deficit", v.deficitDelta);
  clause("v.mar", "margin", v.marginDelta);
  clause("v.soil", "soil", v.soilDelta);

  return (
    <div>
      <p className={`max-w-[30ch] ${head}`}>{t("v.lead", { plan: title(v.best) })}</p>
      <p className={`mt-1 max-w-[60ch] font-medium ${size === "sm" ? "text-[0.95rem]" : "text-[length:var(--text-step-1)]"}`}>{crops}</p>
      <p className="lbl mt-4">{t("v.vs")}</p>
      <ul className="mt-1.5 space-y-1 text-[0.95rem]">
        {rows.map((r) => (
          <li key={r.key} className="flex items-baseline gap-2">
            {r.node}
          </li>
        ))}
      </ul>
    </div>
  );
}
