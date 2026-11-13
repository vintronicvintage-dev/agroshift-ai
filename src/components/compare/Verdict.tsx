"use client";

import { Fragment, type ReactNode } from "react";
import { CROPS } from "@/lib/engine";
import type { AnalysisResult, PlanResult } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import { composeVerdict, deltaTone, SAME_EPS } from "@/lib/ui/verdict";
import { Num } from "@/components/ui/Num";

export function usePlanTitle() {
  const { t } = useI18n();
  return (p: PlanResult) => (p.kind === "current" ? t("plan.current") : p.kind === "recommended" ? t("plan.rec", { n: p.rank ?? 0 }) : t("plan.user"));
}

/** The one-sentence answer, assembled from engine numbers only (see lib/ui/verdict.ts). */
export function Verdict({ result, size = "lg" }: { result: AnalysisResult; size?: "lg" | "sm" }) {
  const { t, L } = useI18n();
  const title = usePlanTitle();
  const v = composeVerdict(result);
  const crops = v.best.crops.map((c) => L(CROPS[c].name)).join(", ");

  const clause = (prefix: "v.def" | "v.mar" | "v.soil", k: "deficit" | "margin" | "soil", delta: number | null): ReactNode => {
    const tone = deltaTone(k, delta, SAME_EPS[k]);
    if (tone === null) return null;
    if (tone === "same") return t(`${prefix}.same` as DictKey);
    const text = t(`${prefix}.${tone}` as DictKey, { v: "\u0000" });
    const [before, after] = text.split("\u0000");
    return (
      <>
        {before}
        <strong className={`font-semibold tabular-nums ${tone === "better" ? "text-[var(--c-green)]" : "text-bad"}`}>
          <Num value={delta} abs />
        </strong>
        {after}
      </>
    );
  };

  const cls =
    size === "sm"
      ? "max-w-[52ch] font-display text-[1.08rem] font-medium leading-[1.35] tracking-[-0.01em] text-pretty"
      : "max-w-[52ch] font-display text-[clamp(1.3rem,2.1vw,1.8rem)] font-medium leading-[1.25] tracking-[-0.015em] text-balance";

  if (v.bestIsCurrent) {
    return <p className={cls}>{t("v.current", { crops })}</p>;
  }

  const parts = [clause("v.def", "deficit", v.deficitDelta), clause("v.mar", "margin", v.marginDelta), clause("v.soil", "soil", v.soilDelta)].filter((x) => x !== null);
  return (
    <p className={cls}>
      {t("v.lead", { plan: title(v.best), crops })}: {t("v.vs")}{" "}
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && (i === parts.length - 1 ? ` ${t("v.and")} ` : ", ")}
          {part}
        </Fragment>
      ))}
      .
    </p>
  );
}
