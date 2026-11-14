"use client";

import { useState } from "react";
import { CROPS, CROP_IDS } from "@/lib/engine";
import type { CropId, RotationSequence } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export function CropSelect({ id, value, onChange, label }: { id: string; value: CropId; onChange: (c: CropId) => void; label: string }) {
  const { L } = useI18n();
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="text-ink-2">{label}</span>
      <select id={id} className="field-input mt-1" value={value} onChange={(e) => onChange(e.target.value as CropId)}>
        {CROP_IDS.map((c) => (
          <option key={c} value={c}>
            {L(CROPS[c].name)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function RotationBuilder({ existing, onAdd }: { existing: RotationSequence[]; onAdd: (r: RotationSequence) => void }) {
  const { t } = useI18n();
  const [seq, setSeq] = useState<RotationSequence>(["wheat_winter", "chickpea", "barley_winter"]);
  const dup = existing.some((e) => e.join() === seq.join());
  return (
    <div className="rounded-lg border border-dashed border-ink-2/60 p-4">
      <h3 className="sec-title">{t("build.title")}</h3>
      <p className="mt-1 max-w-[70ch] text-sm text-ink-2">{t("build.help")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
        {[0, 1, 2].map((k) => (
          <CropSelect
            key={k}
            id={`build-${k}`}
            label={t("field.year", { n: k + 1 })}
            value={seq[k]}
            onChange={(c) => {
              const next = [...seq] as RotationSequence;
              next[k] = c;
              setSeq(next);
            }}
          />
        ))}
        <button type="button" className="btn btn-primary justify-center" disabled={dup} aria-disabled={dup} onClick={() => onAdd(seq)}>
          {t("build.add")}
        </button>
      </div>
      {dup && <p className="mt-2 text-sm text-ink-2">{t("build.duplicate")}</p>}
    </div>
  );
}
