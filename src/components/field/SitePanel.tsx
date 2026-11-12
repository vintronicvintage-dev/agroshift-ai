"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { SnapshotIndexEntry } from "@/lib/data/snapshots";
import { useI18n } from "@/lib/i18n";
import type { PartName, SiteData } from "@/lib/ui/siteData";
import { isoDay } from "@/lib/ui/sources";

const FieldMap = dynamic(() => import("./FieldMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-panel-2" />,
});

export interface Site {
  kind: "pilot" | "point";
  id: string | null;
  nameTr: string | null;
  nameEn: string | null;
  lat: number;
  lon: number;
  retrievedAt: string | null;
}

interface Props {
  pilots: SnapshotIndexEntry[] | null;
  site: Site | null;
  data: SiteData | null;
  elevation: number | null;
  zoneLabel: string | null;
  onPilot: (id: string) => void;
  onPoint: (lat: number, lon: number) => void;
  onRetry: (p: PartName) => void;
}

export function SitePanel({ pilots, site, data, elevation, zoneLabel, onPilot, onPoint, onRetry }: Props) {
  const { t, n, lang } = useI18n();
  const [showNdvi, setShowNdvi] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [coordErr, setCoordErr] = useState(false);
  const pname = (p: { nameTr: string | null; nameEn: string | null }) => (lang === "tr" ? p.nameTr : p.nameEn) ?? "";

  const submitCoords = () => {
    const a = Number(lat.replace(",", ".")), b = Number(lon.replace(",", "."));
    if (lat.trim() === "" || lon.trim() === "" || !Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) {
      setCoordErr(true);
      return;
    }
    setCoordErr(false);
    onPoint(a, b);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="min-w-0">
        <div className="relative h-[19rem] overflow-hidden rounded-lg border border-rule sm:h-[26rem] lg:h-[30rem]">
          <FieldMap
            pilots={(pilots ?? []).map((p) => ({ id: p.id, name: pname(p), lat: p.lat, lon: p.lon }))}
            selected={site ? { lat: site.lat, lon: site.lon } : null}
            showNdvi={showNdvi}
            onPick={onPoint}
            onPilot={onPilot}
            label={t("site.mapLabel")}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-sm">
          <p className="max-w-[60ch] text-ink-2">{t("site.mapHint")}</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showNdvi} onChange={(e) => setShowNdvi(e.target.checked)} />
            <span>{t("site.ndviLayer")}</span>
          </label>
        </div>
      </div>

      <div className="min-w-0 space-y-5">
        <section aria-labelledby="pilots-h">
          <h3 id="pilots-h" className="text-sm font-semibold text-ink-2">
            {t("site.pilots")}
          </h3>
          {pilots === null ? (
            <p className="mt-2 text-sm text-ink-2">{t("site.pilotsLoading")}</p>
          ) : pilots.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">{t("site.noPilots")}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {pilots.map((p) => (
                <li key={p.id}>
                  <button type="button" className="btn" aria-pressed={site?.kind === "pilot" && site.id === p.id} onClick={() => onPilot(p.id)}>
                    {pname(p)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form
          className="text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            submitCoords();
          }}
        >
          <fieldset>
            <legend className="font-semibold text-ink-2">{t("site.coords")}</legend>
            <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <label>
                <span className="text-ink-2">{t("site.lat")}</span>
                <input className="field-input mt-1" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="37.57" aria-invalid={coordErr} />
              </label>
              <label>
                <span className="text-ink-2">{t("site.lon")}</span>
                <input className="field-input mt-1" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="32.77" aria-invalid={coordErr} />
              </label>
              <button type="submit" className="btn">
                {t("site.go")}
              </button>
            </div>
            {coordErr && <p className="mt-1 text-bad">{t("site.coordsInvalid")}</p>}
          </fieldset>
        </form>

        <section aria-live="polite" className="rounded-lg border border-rule bg-panel p-4">
          <h3 className="text-sm font-semibold text-ink-2">{t("site.selected")}</h3>
          {!site ? (
            <p className="mt-1 text-sm">{t("site.none")}</p>
          ) : (
            <>
              <p className="mt-1 font-serif text-xl font-semibold">{site.kind === "pilot" ? pname(site) : `${n(site.lat, 3)}°, ${n(site.lon, 3)}°`}</p>
              <p className="text-sm text-ink-2 tabular-nums">
                {n(site.lat, 3)}° N, {n(site.lon, 3)}° E{elevation !== null && <>, {t("site.elevation", { m: n(elevation) })}</>}
              </p>
              {zoneLabel && (
                <p className="text-sm text-ink-2">
                  {t("site.zone")}: {zoneLabel}
                </p>
              )}
              <p className="mt-1 text-sm">{site.kind === "pilot" && site.retrievedAt ? t("site.snapshot", { date: isoDay(site.retrievedAt) }) : t("site.live")}</p>
              {data && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {(["climate", "soil", "ndvi"] as const).map((k) => (
                    <PartRow key={k} name={k} part={data[k]} onRetry={() => onRetry(k)} />
                  ))}
                </ul>
              )}
              {data?.climate.status === "loading" && site.kind === "point" && <p className="mt-2 text-sm text-ink-2">{t("load.loadingLong")}</p>}
              {data?.climate.status === "error" && <p className="mt-2 text-sm text-bad">{t("load.noClimate")}</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function PartRow({ name, part, onRetry }: { name: PartName; part: SiteData[PartName]; onRetry: () => void }) {
  const { t } = useI18n();
  const label = t(`load.${name}`);
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${part.status === "ok" ? "bg-[var(--c-green)]" : part.status === "error" ? "bg-bad" : "recalc bg-sky"}`}
        aria-hidden="true"
      />
      <span>{label}:</span>
      <span className={part.status === "error" ? "text-bad" : "text-ink-2"}>
        {part.status === "ok" ? t("load.ok") : part.status === "loading" ? t("load.loading") : `${t("load.error")} (${part.code === "timeout" ? t("load.timeout") : part.code === "network" ? t("load.network") : part.message})`}
      </span>
      {part.status === "error" && (
        <button type="button" className="btn py-0.5" onClick={onRetry}>
          {t("load.retry")}
        </button>
      )}
    </li>
  );
}
