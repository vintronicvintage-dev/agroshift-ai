"use client";

import Link from "next/link";
import type { Explanation, ExplanationItem } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import type { SourceRef } from "@/lib/ui/sources";

const SECTIONS: [keyof Explanation, DictKey][] = [
  ["why", "plan.sec.why"],
  ["evidence", "plan.sec.evidence"],
  ["benefits", "plan.sec.benefits"],
  ["gaps", "plan.sec.gaps"],
  ["localReview", "plan.sec.localReview"],
];

/** Expandable "Why this plan?" built from the engine's rule-based explanation objects. */
export function WhyPanel({ explanation, resolve, extraGaps }: { explanation: Explanation; resolve: (name: string) => SourceRef; extraGaps?: string[] }) {
  const { t } = useI18n();
  return (
    <details className="group mt-4 border-t border-rule pt-3">
      <summary className="flex items-center gap-1.5 font-semibold text-ink">
        <span className="chev" aria-hidden="true">
          ›
        </span>
        <span className="group-open:hidden">{t("plan.why")}</span>
        <span className="hidden group-open:inline">{t("plan.whyClose")}</span>
      </summary>
      <div className="mt-3 space-y-4">
        {SECTIONS.map(([key, label]) => {
          const items = explanation[key];
          const extras = key === "gaps" ? extraGaps ?? [] : [];
          if (!items.length && !extras.length) return null;
          return (
            <section key={key}>
              <h4 className="text-sm font-semibold text-ink-2">{t(label)}</h4>
              <ul className="prose-serif mt-1 space-y-1.5 text-[0.95rem]">
                {extras.map((x) => (
                  <li key={x} className="border-l border-warn-ink/50 pl-2.5">
                    {x}
                  </li>
                ))}
                {items.map((it, i) => (
                  <Item key={`${it.key}-${i}`} it={it} resolve={resolve} accent={key === "localReview"} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </details>
  );
}

function Item({ it, resolve, accent }: { it: ExplanationItem; resolve: (name: string) => SourceRef; accent: boolean }) {
  const { L } = useI18n();
  return (
    <li className={`pl-2.5 ${accent ? "border-l border-loam" : "border-l border-rule"}`}>
      {L(it.text)}
      {it.sources && it.sources.length > 0 && (
        <span className="ml-1 font-sans text-xs text-ink-2">
          [
          {it.sources.map((s, i) => {
            const r = resolve(s);
            return (
              <span key={s}>
                {i > 0 && ", "}
                {r.url ? (
                  r.url.startsWith("/") ? (
                    <Link href={r.url} className="underline hover:text-ink">
                      {s}
                    </Link>
                  ) : (
                    <a href={r.url} target="_blank" rel="noreferrer" className="underline hover:text-ink">
                      {s}
                    </a>
                  )
                ) : (
                  s
                )}
              </span>
            );
          })}
          ]
        </span>
      )}
    </li>
  );
}
