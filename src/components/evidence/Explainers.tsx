"use client";

import { useI18n, type DictKey } from "@/lib/i18n";

const ITEMS: [DictKey, DictKey][] = [
  ["ex.et0.t", "ex.et0.b"],
  ["ex.ndvi.t", "ex.ndvi.b"],
  ["ex.wb.t", "ex.wb.b"],
  ["ex.gwet.t", "ex.gwet.b"],
  ["ex.sat.t", "ex.sat.b"],
];

/** Plain-language notes on the terms used in the evidence charts. */
export function Explainers() {
  const { t } = useI18n();
  return (
    <aside className="h-fit rounded-lg bg-panel-2 p-4 xl:sticky xl:top-4" aria-labelledby="ex-title">
      <h3 id="ex-title" className="font-serif text-lg font-semibold">
        {t("ex.title")}
      </h3>
      <div className="mt-2 divide-y divide-rule">
        {ITEMS.map(([title, body], i) => (
          <details key={title} className="py-2" open={i === 4}>
            <summary className="font-medium">
              <span className="chev mr-1.5 text-ink-2">›</span>
              {t(title)}
            </summary>
            <p className="prose-serif mt-1.5 text-[0.95rem] text-ink-2">{t(body)}</p>
          </details>
        ))}
      </div>
    </aside>
  );
}
