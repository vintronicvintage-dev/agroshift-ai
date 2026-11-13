"use client";

import { CROPS, CROP_IDS } from "@/lib/engine";
import type { CropId } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { cropColor } from "@/lib/ui/crops";
import { Chevron } from "@/components/ui/Glyphs";
import { CropArt } from "@/components/brand/CropArt";

/** Crop-family swatch, the same colour as the crop's band in the strip calendar; fallow is hatched. */
export function CropSwatch({ id, size = 14 }: { id: CropId; size?: number }) {
  if (id === "fallow") return <span className="hatch inline-block shrink-0 rounded-[4px] border border-loam" style={{ width: size, height: size, opacity: 1 }} aria-hidden="true" />;
  return <span className="inline-block shrink-0 rounded-[4px]" style={{ width: size, height: size, background: cropColor(id), boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.18)" }} aria-hidden="true" />;
}

/** A native select dressed as a chip with the crop's colour swatch. */
export function CropChip({ id, label, value, onChange }: { id: string; label: string; value: CropId; onChange: (c: CropId) => void }) {
  const { L } = useI18n();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs text-ink-2">
        {label}
      </label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
          <CropArt crop={value} size={28} />
        </span>
        <select
          id={id}
          className="field-input min-h-11 w-full cursor-pointer appearance-none truncate py-2 pl-11 pr-7 text-[0.92rem] font-medium"
          style={{ appearance: "none" }}
          value={value}
          onChange={(e) => onChange(e.target.value as CropId)}
        >
          {CROP_IDS.map((c) => (
            <option key={c} value={c}>
              {L(CROPS[c].name)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-2">
          <Chevron dir="down" size={12} />
        </span>
      </div>
    </div>
  );
}
