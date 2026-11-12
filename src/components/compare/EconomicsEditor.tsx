"use client";

import { CROPS, CROP_CONSTANTS, CROP_IDS } from "@/lib/engine";
import type { CropId, EconomicsInput } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { parseNum } from "@/lib/ui/fieldState";

export interface EconDraft {
  crops: Partial<Record<CropId, { price?: string; cost?: string }>>;
  water: string;
}

export const EMPTY_ECON: EconDraft = { crops: {}, water: "" };

export function econToInput(d: EconDraft): EconomicsInput | undefined {
  const crops: EconomicsInput["crops"] = {};
  for (const [id, v] of Object.entries(d.crops) as [CropId, { price?: string; cost?: string }][]) {
    const price = parseNum(v.price ?? "");
    const cost = parseNum(v.cost ?? "");
    const o: { priceTLPerKg?: number; varCostTLPerDa?: number } = {};
    if (price !== null && price >= 0) o.priceTLPerKg = price;
    if (cost !== null && cost >= 0) o.varCostTLPerDa = cost;
    if (Object.keys(o).length) crops[id] = o;
  }
  const water = parseNum(d.water);
  const out: EconomicsInput = {};
  if (Object.keys(crops).length) out.crops = crops;
  if (water !== null && water >= 0) out.waterPriceTLPerM3 = water;
  return Object.keys(out).length ? out : undefined;
}

export function EconomicsEditor({ value, onChange }: { value: EconDraft; onChange: (v: EconDraft) => void }) {
  const { t, L } = useI18n();
  const ids = CROP_IDS.filter((id) => id !== "fallow");
  const setCrop = (id: CropId, k: "price" | "cost", v: string) => onChange({ ...value, crops: { ...value.crops, [id]: { ...value.crops[id], [k]: v } } });
  return (
    <details className="rounded-lg border border-rule bg-panel p-4">
      <summary className="tap flex items-center font-semibold">
        <span className="chev mr-1.5 text-ink-2">›</span>
        {t("sc.econ")} <span className="ml-1 rounded-full border border-loam px-2 text-xs font-medium text-loam">{t("plan.marginTag")}</span>
      </summary>
      <p className="mt-2 max-w-[70ch] text-sm text-ink-2">{t("sc.econHelp")}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr className="text-left text-ink-2">
              <th className="py-1 pr-3 font-medium">{t("sc.crop")}</th>
              <th className="py-1 pr-3 font-medium">{t("sc.priceCol")}</th>
              <th className="py-1 pr-3 font-medium">{t("sc.costCol")}</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const c = CROPS[id];
              return (
                <tr key={id} className="border-t border-rule/60">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {L(c.name)}
                  </th>
                  <td className="py-1.5 pr-3">
                    <input
                      className="field-input max-w-[8rem]"
                      inputMode="decimal"
                      aria-label={`${L(c.name)}: ${t("sc.priceCol")}`}
                      placeholder={String(c.priceTLPerKg.value)}
                      title={`${c.priceTLPerKg.source} (${t(`asm.conf.${c.priceTLPerKg.confidence}`)})`}
                      value={value.crops[id]?.price ?? ""}
                      onChange={(e) => setCrop(id, "price", e.target.value)}
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      className="field-input max-w-[8rem]"
                      inputMode="decimal"
                      aria-label={`${L(c.name)}: ${t("sc.costCol")}`}
                      placeholder={String(c.varCostTLPerDa.value)}
                      title={`${c.varCostTLPerDa.source} (${t(`asm.conf.${c.varCostTLPerDa.confidence}`)})`}
                      value={value.crops[id]?.cost ?? ""}
                      onChange={(e) => setCrop(id, "cost", e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="text-ink-2">{t("sc.waterPrice")}</span>
          <input className="field-input mt-1 max-w-[8rem]" inputMode="decimal" placeholder={String(CROP_CONSTANTS.waterPriceTLPerM3.value)} value={value.water} onChange={(e) => onChange({ ...value, water: e.target.value })} />
        </label>
        <button type="button" className="btn" onClick={() => onChange({ crops: {}, water: "" })}>
          {t("sc.resetEcon")}
        </button>
      </div>
    </details>
  );
}
