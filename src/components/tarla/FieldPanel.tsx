"use client";

import { useMemo, useState } from "react";
import { useI18n, type DictKey } from "@/lib/i18n";
import { climateEvidence, CROPS, usdaTextureClass } from "@/lib/engine";
import type { ClimateSeries, CropId, SoilLayer } from "@/lib/types";
import { useTheme } from "@/lib/ui/theme";
import { PILOTS } from "@/lib/data/pilots";
import { renameField, setInputs, setStore, TON_PER_IRRIGATION, useHydrated, useStore } from "@/lib/ui/fieldStore";
import { describeRing } from "@/lib/ui/geo";
import { frostStats, isoLabel, moistureNow, monthNames, monthlyTemps, ndviYears, doyLabel } from "@/lib/ui/derive";
import { useFieldData, type Part } from "@/components/data/FieldData";
import { SpotArt } from "@/components/brand/SpotArt";
import { Icon } from "@/components/ui/Icons";
import { Big, Card, MiniTable, TableToggle, TierBadge, type CardState, type Tier } from "./CardKit";

const MODIS_PIXEL_HA = 6.25;

interface Props {
  onDraw: () => void;
  onPin: () => void;
  onPilot: (id: string) => void;
  onSave: () => void;
  onOpenSaved: (id: string) => void;
  onRemoveSaved: (id: string) => void;
  onCells: () => void;
  cellsOn: boolean;
  onDismissHint: () => void;
  onImport: () => void;
  onExport: () => void;
}

function partState<T>(p: Part<T>): CardState {
  return p.status === "ok" ? "ok" : p.status === "error" ? "error" : "loading";
}

export function FieldPanel(props: Props) {
  const store = useStore();
  const hydrated = useHydrated();
  if (!hydrated) return <div className="space-y-3 p-4"><div className="skel h-24" /><div className="skel h-40" /></div>;
  if (!store.field) return <EmptyPanel {...props} />;
  return <FilledPanel {...props} />;
}

// ── empty state ─────────────────────────────────────────────────────────
function EmptyPanel({ onDraw, onPin, onPilot, onOpenSaved, onRemoveSaved, onImport }: Props) {
  const { t, n, lang } = useI18n();
  const s = useStore();
  return (
    <div className="px-4 py-5">
      <h1 className="display text-[30px]">{t("empty.title")}</h1>
      <p className="mt-2 text-[15px] text-ink-2">{t("empty.lead")}</p>
      <SpotArt name="draw-field" width={220} className="mt-4 text-ink-3" />
      <ol className="mt-4 space-y-3">
        {(["empty.s1", "empty.s2", "empty.s3"] as const).map((k, i) => (
          <li key={k} className="flex gap-3">
            <span className="numeral flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-[15px]">{i + 1}</span>
            <span className="pt-0.5 text-[14px]">{t(k)}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 grid gap-2">
        <button type="button" className="btn btn-primary" onClick={onDraw}>
          <Icon name="polygon" size={18} />
          {t("empty.draw")}
        </button>
        <button type="button" className="btn" onClick={onPin}>
          <Icon name="pin" size={18} />
          {t("empty.pin")}
        </button>
        <button type="button" className="btn" onClick={() => onPilot(PILOTS[0].id)}>
          <Icon name="field" size={18} />
          {t("empty.example", { name: lang === "tr" ? PILOTS[0].nameTr : PILOTS[0].nameEn })}
        </button>
        <button type="button" className="btn btn-quiet" onClick={onImport}>
          <Icon name="upload" size={18} />
          {t("geo.import")}
        </button>
      </div>
      {s.saved.length > 0 && (
        <section className="mt-6 border-t border-line pt-4" aria-labelledby="kayitli-h">
          <h2 id="kayitli-h" className="text-[15px] font-semibold">
            {t("saved.title")}
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {s.saved.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-1.5">
                <button type="button" className="tap min-w-0 flex-1 gap-2 text-left" onClick={() => onOpenSaved(f.id)}>
                  <Outline ring={f.ring} size={28} />
                  <span className="truncate text-[14px] font-medium">{f.name}</span>
                  <span className="readout ml-auto shrink-0">
                    {n(f.areaDa, 0)} {t("u.da")}
                  </span>
                </button>
                <button type="button" className="btn btn-quiet btn-icon" aria-label={t("saved.remove", { name: f.name })} onClick={() => onRemoveSaved(f.id)}>
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-5 text-[13px] text-ink-2">{t("saved.local")}</p>
    </div>
  );
}

// ── filled ──────────────────────────────────────────────────────────────
function FilledPanel({ onSave, onCells, cellsOn, onDismissHint, onExport }: Props) {
  const { t } = useI18n();
  const s = useStore();
  const d = useFieldData();
  const f = s.field!;
  const geo = useMemo(() => describeRing(f.ring), [f.ring]);
  const climate = d.climate.status === "ok" ? d.climate.data : null;
  const summary = useMemo(() => (climate ? climateEvidence(climate) : null), [climate]);
  const layers: SoilLayer[] | null = (d.soilPart.status === "ok" ? d.soilPart.data.soilLayers : null) ?? d.snapshot?.snap.soilLayers ?? null;
  const fieldState: CardState = d.field.status === "ok" ? "ok" : d.field.status === "error" ? "error" : "loading";
  const soilPartState: CardState = d.soilPart.status === "ok" ? "ok" : d.soilPart.status === "error" ? "error" : "loading";
  const soilState: CardState = layers ? "ok" : soilPartState === "ok" ? "empty" : soilPartState;
  const loadingCount = [d.field, d.soilPart, d.precip, d.climate, d.ndvi].filter((p) => p.status === "loading").length;
  return (
    <div>
      {loadingCount > 0 && <div className="progress-line" aria-hidden="true" />}
      {!s.hintDismissed && (
        <div className="flex items-start gap-2 border-b border-line bg-surface px-4 py-3 text-[14px]">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-ink-2" />
          <p className="flex-1">{t("hint.filled")}</p>
          <button type="button" className="btn btn-quiet btn-icon -m-2" aria-label={t("hint.dismiss")} onClick={onDismissHint}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      <SummaryCard onSave={onSave} onExport={onExport} geo={geo} />
      <SaysCard climate={climate} summaryP={summary?.meanAnnualPrecipMm ?? null} summaryE={summary?.meanAnnualEt0Mm ?? null} layers={layers} />
      <TerrainCard state={d.terrain ? "ok" : fieldState} cellElevation={climate?.elevation ?? null} />
      <SoilCard state={soilState} layers={layers} areaHa={geo.areaHa} />
      <ChemCard state={soilState} layers={layers} areaHa={geo.areaHa} />
      <MoistureCard climateP={d.climate} />
      <ClimateCard climateP={d.climate} />
      <RainCard />
      <FrostCard climateP={d.climate} />
      <NdviCard areaHa={geo.areaHa} />
      <IrrigationCard />
      <SourcesCard areaHa={geo.areaHa} onCells={onCells} cellsOn={cellsOn} />
      <StatusList />
      <p className="px-4 py-4 text-[13px] text-ink-2">{t("saved.local")}</p>
    </div>
  );
}

function StatusList() {
  const { t } = useI18n();
  const d = useFieldData();
  const row = (label: string, p: Part<unknown>) => {
    const st = p.status === "ok" ? "ok" : p.status === "error" ? "err" : p.status === "loading" ? "busy" : "idle";
    return (
      <li className="flex items-center gap-2">
        <span className="readout w-28 shrink-0">{label}</span>
        <Icon name={st === "ok" ? "check" : st === "err" ? "alert" : "calendar"} size={14} className={st === "err" ? "text-bad" : "text-ink-2"} />
        <span className="text-[13px]">{t(`status.${st}`)}{p.status === "ok" && p.from === "snapshot" ? ` (${t("status.saved")})` : ""}</span>
      </li>
    );
  };
  return (
    <section className="border-b border-line px-4 py-3" aria-label={t("status.title")}>
      <ul className="space-y-1">
        {row(t("status.field"), d.field)}
        {row(t("status.soil"), d.soilPart)}
        {row(t("status.precip"), d.precip)}
        {row("NASA POWER", d.climate)}
        {row("MODIS NDVI", d.ndvi)}
      </ul>
    </section>
  );
}

function fmtCoord(lat: number, lon: number, lang: "tr" | "en", n: (v: number, d?: number) => string) {
  return lang === "tr" ? `${n(Math.abs(lat), 4)}° ${lat >= 0 ? "K" : "G"}, ${n(Math.abs(lon), 4)}° ${lon >= 0 ? "D" : "B"}` : `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
}

export function Outline({ ring, size = 56 }: { ring: { lat: number; lon: number }[]; size?: number }) {
  const k = Math.cos((ring[0].lat * Math.PI) / 180);
  const xs = ring.map((p) => p.lon * k);
  const ys = ring.map((p) => -p.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const pad = 3;
  const sc = (size - pad * 2) / span;
  const pts = xs.map((x, i) => `${(pad + (x - minX) * sc + ((span - (maxX - minX)) * sc) / 2).toFixed(1)},${(pad + (ys[i] - minY) * sc + ((span - (maxY - minY)) * sc) / 2).toFixed(1)}`).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0">
      <polygon points={pts} fill="none" stroke="var(--accent-ink)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryCard({ onSave, onExport, geo }: { onSave: () => void; onExport: () => void; geo: ReturnType<typeof describeRing> }) {
  const { t, n, lang } = useI18n();
  const s = useStore();
  const f = s.field!;
  const [editName, setEditName] = useState(false);
  const saved = s.saved.some((x) => x.id === f.id);
  const da = geo.areaDa;
  const per = geo.perimeterM < 2000 ? `${n(geo.perimeterM)} m` : `${n(geo.perimeterM / 1000, 2)} km`;
  return (
    <article className="border-b border-line px-4 pb-4 pt-4" aria-labelledby="ozet-h">
      <div className="flex items-start gap-3">
        <Outline ring={f.ring} size={56} />
        <div className="min-w-0 flex-1">
          {editName ? (
            <input
              className="input text-[16px] font-semibold"
              defaultValue={f.name}
              autoFocus
              aria-label={t("sum.rename")}
              onBlur={(e) => {
                renameField(e.target.value.trim() || f.name);
                setEditName(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <h2 id="ozet-h" className="flex items-center gap-1 text-[17px] font-semibold">
              <span className="truncate">{f.name}</span>
              <button type="button" className="btn btn-quiet btn-icon -my-2 shrink-0" aria-label={t("sum.rename")} onClick={() => setEditName(true)}>
                <Icon name="edit" size={16} />
              </button>
            </h2>
          )}
          <p className="readout">{fmtCoord(geo.centroid.lat, geo.centroid.lon, lang, n)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-1">
        <Big value={n(da, da < 100 ? 1 : 0)} unit={t("u.dekar")} size={56} />
        <span className="pb-1.5 text-[14px] text-ink-2">
          {n(geo.areaHa, 2)} ha · {t("sum.perimeter")} {per}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-ink-2">
        {t(`sum.kind.${f.kind}`)} · {t("sum.geodesic")}
      </p>
      {da < 1 && <p className="note mt-2 px-3 py-2 text-[13px]">{t("sum.tiny")}</p>}
      {da > 5000 && <p className="note mt-2 px-3 py-2 text-[13px]">{t("sum.huge")}</p>}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-[13px]">
          <span className="text-ink-2">{t("sum.override")}</span>
          <input
            className="input mt-1"
            inputMode="decimal"
            placeholder={n(da, 0)}
            defaultValue={s.inputs.areaOverrideDa ?? ""}
            key={f.id}
            onBlur={(e) => {
              const v = Number(e.target.value.replace(",", "."));
              setInputs({ areaOverrideDa: e.target.value.trim() && Number.isFinite(v) && v > 0 ? v : null });
            }}
          />
        </label>
        <button type="button" className="btn" onClick={onSave} aria-pressed={saved}>
          <Icon name={saved ? "check" : "save"} size={18} />
          {saved ? t("sum.saved") : t("sum.save")}
        </button>
        <button type="button" className="btn btn-icon" aria-label={t("geo.export")} title={t("geo.export")} onClick={onExport}>
          <Icon name="download" size={18} />
        </button>
      </div>
      {s.inputs.areaOverrideDa !== null && <p className="mt-1.5 text-[13px] text-ink-2">{t("sum.overrideOn", { da: n(s.inputs.areaOverrideDa, 0) })}</p>}
    </article>
  );
}

// ── "Bu arazi ne diyor?" from real values only ─────────────────────────
function SaysCard({ climate, summaryP, summaryE, layers }: { climate: ClimateSeries | null; summaryP: number | null; summaryE: number | null; layers: SoilLayer[] | null }) {
  const { t, n, lang } = useI18n();
  const d = useFieldData();
  const terr = d.terrain?.data;
  const fr = useMemo(() => (climate ? frostStats(climate) : null), [climate]);
  const mo = useMemo(() => (climate ? moistureNow(climate) : null), [climate]);
  const top = layers ? topsoil(layers) : null;
  const s1 =
    terr && top?.texture
      ? t("says.land", { slope: slopeWord(terr.slopePct, t), pct: n(terr.slopePct, 1), soil: texName(top.texture, t) })
      : terr
        ? t("says.landOnly", { slope: slopeWord(terr.slopePct, t), pct: n(terr.slopePct, 1) })
        : top?.texture
          ? t("says.soilOnly", { soil: texName(top.texture, t) })
          : null;
  const s2 = summaryP !== null && summaryE !== null ? t("says.water", { p: n(summaryP), e: n(summaryE), share: pctText(summaryP / summaryE, lang, n) }) : null;
  const s3 =
    fr?.lastSpring && mo ? t("says.frostMoist", { d: doyLabel(fr.lastSpring.median, lang), m: moistWord(mo.percentile, t) }) : fr?.lastSpring ? t("says.frost", { d: doyLabel(fr.lastSpring.median, lang) }) : null;
  const lines = [s1, s2, s3].filter(Boolean) as string[];
  return (
    <section className="border-b border-line bg-surface px-4 py-4" aria-labelledby="diyor-h">
      <h2 id="diyor-h" className="text-[15px] font-semibold">
        {t("says.title")}
      </h2>
      {lines.length === 0 ? (
        <div className="mt-2 space-y-1.5">
          <div className="skel h-4 w-11/12" />
          <div className="skel h-4 w-4/5" />
        </div>
      ) : (
        <p className="mt-1.5 text-[16px] leading-relaxed">{lines.join(" ")}</p>
      )}
      {lines.length > 0 && <p className="readout mt-2">{t("says.basis")}</p>}
    </section>
  );
}

const slopeWord = (pct: number, t: (k: DictKey) => string) => t(pct < 2 ? "slope.flat" : pct < 5 ? "slope.gentle" : pct < 10 ? "slope.moderate" : "slope.steep");
const moistWord = (p: number, t: (k: DictKey) => string) => t(p < 0.2 ? "moist.dry" : p < 0.4 ? "moist.drier" : p < 0.6 ? "moist.normal" : p < 0.8 ? "moist.wetter" : "moist.wet");
export const pctText = (share: number, lang: "tr" | "en", n: (v: number, d?: number) => string) => (lang === "tr" ? `%${n(share * 100)}` : `${n(share * 100)} %`);

const TEX_KEYS: Record<string, DictKey> = {
  sand: "tex.sand",
  "loamy sand": "tex.loamySand",
  "sandy loam": "tex.sandyLoam",
  loam: "tex.loam",
  "silt loam": "tex.siltLoam",
  silt: "tex.silt",
  "sandy clay loam": "tex.sandyClayLoam",
  "clay loam": "tex.clayLoam",
  "silty clay loam": "tex.siltyClayLoam",
  "sandy clay": "tex.sandyClay",
  "silty clay": "tex.siltyClay",
  clay: "tex.clay",
};
export const texName = (cls: string, t: (k: DictKey) => string) => (TEX_KEYS[cls.toLowerCase()] ? t(TEX_KEYS[cls.toLowerCase()]) : cls);

function weighted(layers: SoilLayer[], k: keyof SoilLayer, maxDepth = 30): number | null {
  let s = 0, w = 0;
  for (const l of layers) {
    const v = l[k];
    if (typeof v !== "number" || l.top >= maxDepth) continue;
    const th = Math.min(l.bottom, maxDepth) - l.top;
    s += v * th;
    w += th;
  }
  return w ? s / w : null;
}

function topsoil(layers: SoilLayer[]) {
  const sand = weighted(layers, "sand"), silt = weighted(layers, "silt"), clay = weighted(layers, "clay");
  const texture = sand !== null && silt !== null && clay !== null ? usdaTextureClass(sand, silt, clay) : null;
  return { sand, silt, clay, texture, ph: weighted(layers, "ph"), soc: weighted(layers, "soc"), cec: weighted(layers, "cec"), n: weighted(layers, "nitrogen") };
}

// ── 2. terrain ──────────────────────────────────────────────────────────
function TerrainCard({ state, cellElevation }: { state: CardState; cellElevation: number | null }) {
  const { t, n } = useI18n();
  const d = useFieldData();
  const tr = d.terrain;
  const aspect = tr?.data.aspectDeg ?? null;
  const dirs = ["dir.n", "dir.ne", "dir.e", "dir.se", "dir.s", "dir.sw", "dir.w", "dir.nw"] as const;
  const dir = aspect !== null ? t(dirs[Math.round(aspect / 45) % 8]) : null;
  const tier: Tier = tr?.basis === "polygon" ? (tr.data.samples >= 9 ? "inside" : "few") : "few";
  const deg = tr ? (Math.atan(tr.data.slopePct / 100) * 180) / Math.PI : 0;
  return (
    <Card
      id="kart-yukselti"
      title={t("c.terrain")}
      state={state}
      tier={tr ? tier : undefined}
      tierNote={tr ? t(tr.basis === "polygon" ? "terrain.basis.polygon" : "terrain.basis.point", { n: tr.data.samples }) : undefined}
      res="SRTM 30 m"
      onRetry={() => d.retry("field")}
      errorText={t("terrain.err")}
      finding={tr ? t("terrain.finding", { slope: slopeWord(tr.data.slopePct, t), pct: n(tr.data.slopePct, 1), dir: dir ? t("terrain.facing", { dir }) : t("terrain.noDir") }) : undefined}
      source={tr ? `${t("terrain.src")} · ${t(tr.basis === "polygon" ? "terrain.basis.polygon" : "terrain.basis.point", { n: tr.data.samples })}` : undefined}
    >
      {tr && (
        <>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <Big value={n(tr.data.elevationMean)} unit="m" />
              <p className="text-[13px] text-ink-2">{t("terrain.mean")}</p>
            </div>
            <div>
              <Big value={n(tr.data.slopePct, 1)} unit="%" size={32} />
              <p className="text-[13px] text-ink-2">{t("terrain.slope", { deg: n(deg, 1) })}</p>
            </div>
            <div>
              <Big value={n(tr.data.elevationMax - tr.data.elevationMin)} unit="m" size={32} />
              <p className="text-[13px] text-ink-2">{t("terrain.relief")}</p>
            </div>
          </div>
          <ElevBar min={tr.data.elevationMin} mean={tr.data.elevationMean} max={tr.data.elevationMax} cell={cellElevation} />
        </>
      )}
    </Card>
  );
}

function ElevBar({ min, mean, max, cell }: { min: number; mean: number; max: number; cell: number | null }) {
  const { t, n } = useI18n();
  const lo = Math.min(min, cell ?? min) - 30;
  const hi = Math.max(max, cell ?? max) + 30;
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div className="mt-3">
      <div className="relative h-9" role="img" aria-label={t("terrain.barAria", { min: n(min), max: n(max), cell: cell !== null ? n(cell) : "–" })}>
        <div className="absolute inset-x-0 top-4 h-px bg-line-strong" />
        <div className="absolute top-2.5 h-3.5 rounded-sm bg-soil" style={{ left: `${x(min)}%`, width: `${Math.max(1, x(max) - x(min))}%` }} />
        <div className="absolute top-1.5 h-5.5 w-0.5 bg-ink" style={{ left: `${x(mean)}%` }} />
        {cell !== null && (
          <div className="absolute top-0 flex flex-col items-center" style={{ left: `${x(cell)}%`, transform: "translateX(-50%)" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 1h8L5 9Z" fill="none" stroke="var(--ref)" strokeWidth="1.4" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex justify-between text-[12px] text-ink-2">
        <span>
          {t("terrain.minmax", { min: n(min), max: n(max) })}
        </span>
        {cell !== null && <span>{t("terrain.cell", { v: n(cell), d: n(cell - mean) })}</span>}
      </div>
    </div>
  );
}

// ── 3. soil profile ─────────────────────────────────────────────────────
function soilTier(areaHa: number): Tier {
  return areaHa >= 9 * MODIS_PIXEL_HA ? "inside" : "few";
}

function SoilCard({ state, layers, areaHa }: { state: CardState; layers: SoilLayer[] | null; areaHa: number }) {
  const { t, n } = useI18n();
  const d = useFieldData();
  const top = layers ? topsoil(layers) : null;
  const wrb = d.soilPart.status === "ok" ? d.soilPart.data.wrb : d.snapshot?.snap.wrb;
  return (
    <Card
      id="kart-toprak"
      title={t("c.soil")}
      state={state}
      tier={soilTier(areaHa)}
      tierNote={t("tier.soilNote", { ha: n(areaHa, 1) })}
      res="SoilGrids 250 m"
      onRetry={() => d.retry("soilPart")}
      slow={d.soilPart.status === "loading" ? t("soil.slow") : null}
      errorText={t("soil.err")}
      emptyText={t("soil.empty")}
      minH={260}
      finding={top?.texture ? t("soil.finding", { tex: texName(top.texture, t), clay: n(top.clay ?? 0), sand: n(top.sand ?? 0) }) : undefined}
      source={`ISRIC SoilGrids v2.0 · ${t("soil.model")}${wrb ? ` · WRB: ${wrb}` : ""}`}
    >
      {layers && (
        <div className="grid grid-cols-[minmax(0,1fr)_132px] gap-3">
          <ul className="space-y-1" aria-label={t("soil.columnAria")}>
            {layers.map((l) => {
              const tex = l.sand !== null && l.silt !== null && l.clay !== null ? usdaTextureClass(l.sand, l.silt, l.clay) : null;
              const h = 18 + Math.log2(l.bottom - l.top) * 4;
              return (
                <li key={l.top} className="flex items-stretch gap-2">
                  <span className="readout w-14 shrink-0 pt-0.5 text-right">{l.top}–{l.bottom}</span>
                  <span className="flex min-w-0 flex-1 overflow-hidden rounded-[3px] border border-line" style={{ height: h }} title={tex ?? ""}>
                    <span style={{ width: `${l.clay ?? 0}%`, background: "color-mix(in srgb, var(--soil) 85%, transparent)" }} />
                    <span style={{ width: `${l.silt ?? 0}%`, background: "color-mix(in srgb, var(--soil) 45%, transparent)" }} />
                    <span style={{ width: `${l.sand ?? 0}%`, background: "color-mix(in srgb, var(--soil) 18%, transparent)" }} />
                  </span>
                  <span className="w-[4.5rem] shrink-0 truncate pt-0.5 text-[12px]">{tex ? texName(tex, t) : "–"}</span>
                </li>
              );
            })}
          </ul>
          <TextureTriangle layers={layers} />
        </div>
      )}
      <p className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-ink-2">
        <Swatch o={85} label={t("soil.clay")} />
        <Swatch o={45} label={t("soil.silt")} />
        <Swatch o={18} label={t("soil.sand")} />
        <span>{t("soil.depth")}</span>
      </p>
      {layers && (
        <TableToggle label={t("common.table")}>
          <MiniTable
            head={[t("soil.depthCol"), t("soil.sand"), t("soil.silt"), t("soil.clay"), "pH", t("soil.soc"), t("soil.cec"), t("soil.bd")]}
            rows={layers.map((l) => [`${l.top}–${l.bottom} cm`, f1(l.sand, n), f1(l.silt, n), f1(l.clay, n), f1(l.ph, n), f1(l.soc, n), f1(l.cec, n), l.bulkDensity !== null ? n(l.bulkDensity, 2) : "–"])}
          />
        </TableToggle>
      )}
    </Card>
  );
}

const f1 = (v: number | null, n: (v: number, d?: number) => string) => (v === null ? "–" : n(v, 1));

function Swatch({ o, label }: { o: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block size-3 rounded-[2px] border border-line" style={{ background: `color-mix(in srgb, var(--soil) ${o}%, transparent)` }} />
      {label}
    </span>
  );
}

function TextureTriangle({ layers }: { layers: SoilLayer[] }) {
  const { t } = useI18n();
  const W = 132, H = 118;
  const A = { x: W / 2, y: 8 }; // clay 100
  const B = { x: 6, y: H - 16 }; // sand 100
  const C = { x: W - 6, y: H - 16 }; // silt 100
  const pt = (sand: number, silt: number, clay: number) => {
    const s = sand + silt + clay || 1;
    return { x: (clay * A.x + sand * B.x + silt * C.x) / s, y: (clay * A.y + sand * B.y + silt * C.y) / s };
  };
  const pts = layers.filter((l) => l.sand !== null && l.silt !== null && l.clay !== null).map((l) => ({ ...pt(l.sand!, l.silt!, l.clay!), top: l.top }));
  const grid = [20, 40, 60, 80].map((c) => {
    const a = pt(100 - c, 0, c);
    const b = pt(0, 100 - c, c);
    return <line key={c} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--grid)" strokeWidth="0.8" />;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={t("soil.triAria")}>
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke="var(--axis)" strokeWidth="1" />
      {grid}
      {pts.length > 1 && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--ink-2)" strokeWidth="1" />}
      {pts.map((p, i) => (
        <circle key={p.top} cx={p.x} cy={p.y} r={i === 0 ? 3.5 : 2.2} fill={i === 0 ? "var(--ink)" : "var(--ink-2)"} />
      ))}
      <text x={A.x} y={A.y - 1} textAnchor="middle" fontSize="10" fill="var(--ink-2)" dy="-0.1em">
        {t("soil.clay")}
      </text>
      <text x={B.x} y={H - 3} fontSize="10" fill="var(--ink-2)">
        {t("soil.sand")}
      </text>
      <text x={C.x} y={H - 3} textAnchor="end" fontSize="10" fill="var(--ink-2)">
        {t("soil.silt")}
      </text>
    </svg>
  );
}

// ── 4. chemistry ────────────────────────────────────────────────────────
interface Zone {
  to: number;
  key: DictKey;
}
const ZONES: { key: "ph" | "soc" | "cec" | "n"; label: DictKey; unit: string; lo: number; hi: number; zones: Zone[]; digits: number }[] = [
  { key: "ph", label: "chem.ph", unit: "", lo: 4, hi: 10, digits: 1, zones: [{ to: 5.5, key: "zone.acid" }, { to: 6, key: "zone.slightAcid" }, { to: 7.5, key: "zone.good" }, { to: 8.5, key: "zone.calc" }, { to: 10, key: "zone.alk" }] },
  { key: "soc", label: "chem.soc", unit: "g/kg", lo: 0, hi: 40, digits: 1, zones: [{ to: 10, key: "zone.low" }, { to: 20, key: "zone.mid" }, { to: 40, key: "zone.high" }] },
  { key: "cec", label: "chem.cec", unit: "cmol/kg", lo: 0, hi: 40, digits: 1, zones: [{ to: 10, key: "zone.low" }, { to: 25, key: "zone.mid" }, { to: 40, key: "zone.high" }] },
  { key: "n", label: "chem.n", unit: "g/kg", lo: 0, hi: 4, digits: 2, zones: [{ to: 1, key: "zone.low" }, { to: 2, key: "zone.mid" }, { to: 4, key: "zone.high" }] },
];

function ChemCard({ state, layers, areaHa }: { state: CardState; layers: SoilLayer[] | null; areaHa: number }) {
  const { t, n } = useI18n();
  const d = useFieldData();
  const top = layers ? topsoil(layers) : null;
  const vals: Record<string, number | null> = { ph: top?.ph ?? null, soc: top?.soc ?? null, cec: top?.cec ?? null, n: top?.n ?? null };
  const phZone = vals.ph !== null ? ZONES[0].zones.find((z) => vals.ph! <= z.to) : null;
  return (
    <Card
      id="kart-kimya"
      title={t("c.chem")}
      state={state}
      tier={soilTier(areaHa)}
      res="SoilGrids 250 m"
      onRetry={() => d.retry("soilPart")}
      slow={d.soilPart.status === "loading" ? t("soil.slow") : null}
      errorText={t("soil.err")}
      emptyText={t("soil.empty")}
      minH={220}
      finding={phZone ? t("chem.finding", { ph: n(vals.ph!, 1), zone: t(phZone.key) }) : undefined}
      source={t("chem.src")}
    >
      <div className="space-y-3">
        {ZONES.map((z) => {
          const v = vals[z.key];
          const x = (u: number) => ((Math.min(z.hi, Math.max(z.lo, u)) - z.lo) / (z.hi - z.lo)) * 100;
          const zone = v !== null ? z.zones.find((q) => v <= q.to) ?? z.zones[z.zones.length - 1] : null;
          let start = z.lo;
          return (
            <div key={z.key}>
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-medium">{t(z.label)}</span>
                <span>
                  <span className="numeral text-[20px]">{v !== null ? n(v, z.digits) : "–"}</span> <span className="text-ink-2">{z.unit}</span>
                  {zone && <span className="ml-1.5 text-ink-2">({t(zone.key)})</span>}
                </span>
              </div>
              <div className="relative mt-1 h-3 overflow-hidden rounded-sm" role="img" aria-label={`${t(z.label)}: ${v !== null ? n(v, z.digits) : "–"} ${z.unit}${zone ? `, ${t(zone.key)}` : ""}`}>
                {z.zones.map((q, i) => {
                  const left = x(start);
                  const w = x(q.to) - left;
                  start = q.to;
                  return <span key={i} className="absolute inset-y-0" style={{ left: `${left}%`, width: `${w}%`, background: `color-mix(in srgb, var(--ink-3) ${[16, 30, 44, 30, 16][i] ?? 20}%, transparent)` }} />;
                })}
                {v !== null && <span className="absolute inset-y-[-2px] w-[3px] bg-ink" style={{ left: `calc(${x(v)}% - 1.5px)` }} />}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-ink-2">{t("chem.thresholds")}</p>
      {vals.ph !== null && vals.ph > 7.5 && <p className="mt-1.5 text-[13px]">{t("chem.calcNote")}</p>}
    </Card>
  );
}

// ── 5. root-zone moisture ──────────────────────────────────────────────
function MoistureCard({ climateP }: { climateP: Part<ClimateSeries> }) {
  const { t, n, lang } = useI18n();
  const d = useFieldData();
  const c = climateP.status === "ok" ? climateP.data : null;
  const m = useMemo(() => (c ? moistureNow(c) : null), [c]);
  const state: CardState = climateP.status === "ok" ? (m ? "ok" : "empty") : partState(climateP);
  const x = (v: number) => Math.max(0, Math.min(100, v * 100));
  return (
    <Card
      id="kart-nem"
      title={t("c.moist")}
      state={state}
      tier="cell"
      res="POWER ~55 km"
      onRetry={() => d.retry("climate")}
      errorText={t("climate.err")}
      emptyText={t("moist.none")}
      slow={climateP.status === "loading" ? t("climate.slow") : null}
      finding={m && m.percentile === 0 ? t("moist.finding0", { d: isoLabel(m.date, lang), y: m.years }) : m ? t("moist.finding", { word: moistWord(m.percentile, t), p: pctText(m.percentile, lang, n), d: isoLabel(m.date, lang) }) : undefined}
      source={t("moist.src", { y: m?.years ?? 0 })}
    >
      {m && (
        <>
          <div className="relative h-8" role="img" aria-label={t("moist.aria", { v: n(m.value * 100), p: pctText(m.percentile, lang, n) })}>
            <div className="absolute inset-x-0 top-3 h-2.5 rounded-sm bg-surface-2" />
            <div className="absolute top-3 h-2.5" style={{ left: `${x(m.bands.p10)}%`, width: `${x(m.bands.p90) - x(m.bands.p10)}%`, background: "color-mix(in srgb, var(--moist) 30%, transparent)" }} />
            <div className="absolute top-3 h-2.5" style={{ left: `${x(m.bands.p25)}%`, width: `${x(m.bands.p75) - x(m.bands.p25)}%`, background: "color-mix(in srgb, var(--moist) 55%, transparent)" }} />
            <div className="absolute top-2 h-4.5 w-px bg-ref" style={{ left: `${x(m.bands.p50)}%` }} />
            <div className="absolute top-0.5 h-7 w-[3px] bg-ink" style={{ left: `calc(${x(m.value)}% - 1.5px)` }} />
          </div>
          <div className="flex justify-between text-[12px] text-ink-2">
            <span>{t("moist.dryEnd")}</span>
            <span>{t("moist.bands")}</span>
            <span>{t("moist.wetEnd")}</span>
          </div>
          <p className="mt-2 text-[13px]">
            {t("moist.value", { v: n(m.value * 100) })}
            {m.staleDays > 3 && <span className="text-ink-2"> · {t("moist.stale", { d: isoLabel(m.date, lang) })}</span>}
          </p>
        </>
      )}
    </Card>
  );
}

// ── 6. climate normals (climograph) ────────────────────────────────────
function ClimateCard({ climateP }: { climateP: Part<ClimateSeries> }) {
  const { t, n, lang } = useI18n();
  const d = useFieldData();
  const c = climateP.status === "ok" ? climateP.data : null;
  const sum = useMemo(() => (c ? climateEvidence(c) : null), [c]);
  const temps = useMemo(() => (c ? monthlyTemps(c) : null), [c]);
  const months = monthNames(lang);
  const state = partState(climateP);
  const deficitMonths = sum ? sum.monthly.filter((m) => m.precipMm !== null && m.et0Mm !== null && m.et0Mm > m.precipMm).map((m) => m.month) : [];
  const run = deficitMonths.length ? `${months[deficitMonths[0] - 1]}–${months[deficitMonths[deficitMonths.length - 1] - 1]}` : "";
  return (
    <Card
      id="kart-iklim"
      title={t("c.climate")}
      state={state}
      tier="cell"
      res="POWER 0,5°×0,625°"
      onRetry={() => d.retry("climate")}
      errorText={t("climate.err")}
      slow={climateP.status === "loading" ? t("climate.slow") : null}
      minH={240}
      finding={sum && sum.meanAnnualPrecipMm !== null && sum.meanAnnualEt0Mm !== null ? t("climate.finding", { p: n(sum.meanAnnualPrecipMm), e: n(sum.meanAnnualEt0Mm), run }) : undefined}
      source={sum ? t("climate.src", { a: sum.period.start.slice(0, 4), b: sum.period.end.slice(0, 4), y: sum.completeYears.length }) : undefined}
    >
      {sum && temps && (
        <>
          <p className="mb-1 flex flex-wrap gap-x-4 text-[12px] text-ink-2">
            <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 bg-[var(--rain)]" />{t("climate.rain")}</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-[3px] w-3 bg-[var(--et0)]" />{t("climate.et0Short")}</span>
            <span>{t("climate.tempRows")}</span>
          </p>
          <Climograph monthly={sum.monthly} temps={temps} months={months} />
          <TableToggle label={t("common.table")}>
            <MiniTable
              head={[t("climate.month"), t("climate.rain"), "ET₀", "Tmax", "Tmin"]}
              rows={sum.monthly.map((m, i) => [months[i], n(m.precipMm), n(m.et0Mm), temps.tmax[i] !== null ? n(temps.tmax[i]!, 1) : "–", temps.tmin[i] !== null ? n(temps.tmin[i]!, 1) : "–"])}
            />
          </TableToggle>
          <p className="mt-2 text-[12px] text-ink-2">{t("climate.et0Gloss")}</p>
        </>
      )}
    </Card>
  );
}

function Climograph({ monthly, temps, months }: { monthly: { precipMm: number | null; et0Mm: number | null }[]; temps: ReturnType<typeof monthlyTemps>; months: string[] }) {
  const { t, n } = useI18n();
  const W = 380, H = 170, L = 30, R = 6, T = 14, B = 48;
  const max = Math.max(10, ...monthly.map((m) => Math.max(m.precipMm ?? 0, m.et0Mm ?? 0)));
  const top = Math.ceil(max / 50) * 50;
  const bw = (W - L - R) / 12;
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const ticks = [0, top / 2, top];
  const et = monthly.map((m, i) => (m.et0Mm !== null ? `${L + bw * (i + 0.5)},${y(m.et0Mm)}` : null)).filter(Boolean).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("climate.aria")}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={v === 0 ? 1 : 0.6} />
          <text x={L - 4} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-2)">
            {n(v)}
          </text>
        </g>
      ))}
      <text x={2} y={T + 4} fontSize="10" fill="var(--ink-2)">mm</text>
      {monthly.map((m, i) => {
        const deficit = m.precipMm !== null && m.et0Mm !== null && m.et0Mm > m.precipMm;
        return (
          <g key={i}>
            {deficit && <rect x={L + bw * i} y={T} width={bw} height={H - T - B} fill="var(--et0)" opacity="0.07" />}
            {m.precipMm !== null && <rect x={L + bw * i + 3} y={y(m.precipMm)} width={bw - 6} height={Math.max(0, y(0) - y(m.precipMm))} fill="var(--rain)" rx="1" />}
            <text x={L + bw * (i + 0.5)} y={H - B + 13} textAnchor="middle" fontSize="11" fill="var(--ink-2)">
              {months[i].slice(0, 3)}
            </text>
            {temps.tmax[i] !== null && (
              <text x={L + bw * (i + 0.5)} y={H - B + 28} textAnchor="middle" fontSize="10.5" fill="var(--tmax)">
                {n(temps.tmax[i]!)}
              </text>
            )}
            {temps.tmin[i] !== null && (
              <text x={L + bw * (i + 0.5)} y={H - B + 42} textAnchor="middle" fontSize="10.5" fill={temps.tmin[i]! <= 0 ? "var(--ink)" : "var(--ink-2)"} fontWeight={temps.tmin[i]! <= 0 ? 700 : 400}>
                {n(temps.tmin[i]!)}
              </text>
            )}
          </g>
        );
      })}
      <polyline points={et} fill="none" stroke="var(--et0)" strokeWidth="2" />
      {monthly.map((m, i) => (m.et0Mm !== null ? <rect key={i} x={L + bw * (i + 0.5) - 2.5} y={y(m.et0Mm) - 2.5} width="5" height="5" fill="var(--et0)" /> : null))}
    </svg>
  );
}

// ── rainfall source comparison (POWER vs ERA5), the user decides ───────
function RainCard() {
  const { t, n, L } = useI18n();
  const d = useFieldData();
  const s = useStore();
  const pc = (d.precip.status === "ok" ? d.precip.data.precipCheck : null) ?? d.snapshot?.snap.precipCheck ?? null;
  const [station, setStation] = useState(s.precip.mode === "station" ? String(s.precip.mm) : "");
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const pu = d.analysis.result?.precipUncertainty ?? null;
  const precipState: CardState = d.precip.status === "ok" || pc ? "ok" : d.precip.status === "error" ? "error" : "loading";
  const state: CardState = precipState === "ok" && !pc ? "empty" : precipState;
  const stationNum = Number(station.replace(",", "."));
  const stationOk = station.trim() !== "" && Number.isFinite(stationNum) && stationNum >= 20 && stationNum <= 5000;
  const pMean = pc ? mean(pc.powerAnnual) : null;
  const rMean = pc ? mean(pc.referenceAnnual) : null;
  return (
    <Card
      id="kart-yagis"
      title={t("c.rain")}
      state={state}
      tier="cell"
      res={pc ? `${pc.reference.toUpperCase()} 0,25°` : undefined}
      onRetry={() => d.retry("precip")}
      errorText={t("rain.err")}
      emptyText={t("rain.none")}
      minH={220}
      finding={pc && pMean !== null && rMean !== null ? t("rain.finding", { p: n(pMean), r: n(rMean), ref: pc.reference.toUpperCase(), y: pc.years.length }) : undefined}
      source={pc ? t("rain.src", { ref: pc.reference.toUpperCase() }) : undefined}
    >
      {pc && pMean !== null && rMean !== null && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Big value={n(pMean)} unit={t("u.mmYr")} size={34} />
              <p className="text-[13px] text-ink-2">NASA POWER</p>
            </div>
            <div>
              <Big value={n(rMean)} unit={t("u.mmYr")} size={34} />
              <p className="text-[13px] text-ink-2">{pc.reference.toUpperCase()}</p>
            </div>
          </div>
          <YearPairs years={pc.years} a={pc.powerAnnual} b={pc.referenceAnnual} />
          <fieldset className="mt-3">
            <legend className="text-[14px] font-semibold">{t("rain.choose")}</legend>
            <p className="text-[13px] text-ink-2">{t("rain.chooseLead")}</p>
            {(["none", "reference", "station"] as const).map((m) => (
              <label key={m} className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1">
                <input
                  type="radio"
                  name="precip"
                  className="mt-1 size-4 accent-[var(--accent-ink)]"
                  checked={s.precip.mode === m}
                  onChange={() => {
                    if (m === "station") {
                      if (stationOk) setStore({ precip: { mode: "station", mm: stationNum } });
                      else document.getElementById("istasyon-mm")?.focus();
                    } else setStore({ precip: { mode: m } });
                  }}
                />
                <span className="text-[14px]">
                  {t(`rain.opt.${m}`, { ref: pc.reference.toUpperCase() })}
                  {m === "reference" && <span className="block text-[12px] text-ink-2">{t("rain.refCaution", { ref: pc.reference.toUpperCase() })}</span>}
                </span>
              </label>
            ))}
            <div className="ml-6.5 flex items-center gap-2">
              <label htmlFor="istasyon-mm" className="sr-only">
                {t("rain.stationLabel")}
              </label>
              <input
                id="istasyon-mm"
                className="input max-w-[9rem]"
                inputMode="decimal"
                placeholder={t("rain.stationPh")}
                value={station}
                onChange={(e) => setStation(e.target.value)}
              />
              <button type="button" className="btn btn-sm" disabled={!stationOk} onClick={() => setStore({ precip: { mode: "station", mm: stationNum } })}>
                {t("rain.stationApply")}
              </button>
            </div>
            {station.trim() !== "" && !stationOk && <p className="ml-6.5 mt-1 text-[13px] text-bad">{t("rain.stationBad")}</p>}
          </fieldset>
          <p className="mt-2 text-[13px]">
            <strong className="font-semibold">{t("rain.now")}</strong> {t(`rain.now.${s.precip.mode}`, { mm: s.precip.mode === "station" ? n(s.precip.mm) : "" })}
          </p>
          {pu && (
            <p className="mt-2 rounded-md border border-line p-2.5 text-[13px] text-ink-2">
              {t("rain.range", { a: n(pu.rangeMm[0]), b: n(pu.rangeMm[1]) })} {L(pu.note)}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function YearPairs({ years, a, b }: { years: number[]; a: number[]; b: number[] }) {
  const { t, n } = useI18n();
  const W = 380, H = 80, T = 6, B = 16;
  const max = Math.max(...a, ...b, 1);
  const bw = (W - 4) / years.length;
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-auto w-full" role="img" aria-label={t("rain.pairsAria")}>
        {years.map((yr, i) => (
          <g key={yr}>
            <rect x={2 + bw * i + 1} y={y(a[i])} width={bw / 2 - 1} height={y(0) - y(a[i])} fill="var(--rain)" />
            <rect x={2 + bw * i + bw / 2} y={y(b[i])} width={bw / 2 - 1} height={y(0) - y(b[i])} fill="var(--ref)" />
            {(i === 0 || i === years.length - 1) && (
              <text x={2 + bw * (i + 0.5)} y={H - 3} textAnchor="middle" fontSize="10" fill="var(--ink-2)">
                {yr}
              </text>
            )}
          </g>
        ))}
        <line x1="2" x2={W - 2} y1={y(0)} y2={y(0)} stroke="var(--axis)" />
      </svg>
      <p className="flex gap-4 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 bg-[var(--rain)]" />NASA POWER</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 bg-[var(--ref)]" />ERA5</span>
        <span>{t("rain.perYear", { max: n(max) })}</span>
      </p>
    </>
  );
}

// ── 7. frost and growing degree days ───────────────────────────────────
function FrostCard({ climateP }: { climateP: Part<ClimateSeries> }) {
  const { t, n, lang } = useI18n();
  const d = useFieldData();
  const c = climateP.status === "ok" ? climateP.data : null;
  const fs = useMemo(() => (c ? frostStats(c) : null), [c]);
  const state = partState(climateP);
  const months = monthNames(lang);
  const W = 380, H = 92, L = 6, R = 6;
  const x = (k: number) => L + ((k - 1) / 365) * (W - L - R);
  return (
    <Card
      id="kart-don"
      title={t("c.frost")}
      state={state}
      tier="cell"
      res="POWER ~55 km"
      onRetry={() => d.retry("climate")}
      errorText={t("climate.err")}
      slow={climateP.status === "loading" ? t("climate.slow") : null}
      finding={
        fs?.lastSpring && fs.firstAutumn
          ? t("frost.finding", { ls: doyLabel(fs.lastSpring.median, lang), lsLate: doyLabel(fs.lastSpring.latest, lang), fa: doyLabel(fs.firstAutumn.median, lang), faEarly: doyLabel(fs.firstAutumn.earliest, lang) })
          : fs
            ? t("frost.none")
            : undefined
      }
      source={fs ? t("frost.src", { y: fs.years }) : undefined}
    >
      {fs && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("frost.aria")}>
            {months.map((m, i) => (
              <g key={m}>
                <line x1={x(i * 30.4 + 1)} x2={x(i * 30.4 + 1)} y1={10} y2={H - 18} stroke="var(--grid)" strokeWidth="0.6" />
                <text x={x(i * 30.4 + 15)} y={H - 4} textAnchor="middle" fontSize="10.5" fill="var(--ink-2)">
                  {m.slice(0, 3)}
                </text>
              </g>
            ))}
            {fs.lastSpring && <Whisker y={28} lo={x(fs.lastSpring.earliest)} hi={x(fs.lastSpring.latest)} mid={x(fs.lastSpring.median)} p={x(fs.lastSpring.p90)} label={t("frost.last")} />}
            {fs.firstAutumn && <Whisker y={56} lo={x(fs.firstAutumn.earliest)} hi={x(fs.firstAutumn.latest)} mid={x(fs.firstAutumn.median)} p={x(fs.firstAutumn.p10)} label={t("frost.first")} />}
          </svg>
          <p className="text-[12px] text-ink-2">{t("frost.legend")}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <Big value={n(fs.gdd0)} unit={t("u.gdd")} size={30} />
              <p className="text-[13px] text-ink-2">{t("frost.gdd0")}</p>
            </div>
            <div>
              <Big value={n(fs.gdd10)} unit={t("u.gdd")} size={30} />
              <p className="text-[13px] text-ink-2">{t("frost.gdd10")}</p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function Whisker({ y, lo, hi, mid, p, label }: { y: number; lo: number; hi: number; mid: number; p: number; label: string }) {
  return (
    <g>
      <line x1={lo} x2={hi} y1={y} y2={y} stroke="var(--tmin)" strokeWidth="2" />
      <line x1={lo} x2={lo} y1={y - 5} y2={y + 5} stroke="var(--tmin)" strokeWidth="1.5" />
      <line x1={hi} x2={hi} y1={y - 5} y2={y + 5} stroke="var(--tmin)" strokeWidth="1.5" />
      <rect x={mid - 4} y={y - 4} width="8" height="8" fill="var(--ink)" transform={`rotate(45 ${mid} ${y})`} />
      <circle cx={p} cy={y} r="3" fill="var(--bg)" stroke="var(--ink)" strokeWidth="1.4" />
      <text x={hi > 260 ? lo - 6 : hi + 6} y={y + 4} fontSize="11" fill="var(--ink)" textAnchor={hi > 260 ? "end" : "start"}>
        {label}
      </text>
    </g>
  );
}

// ── 8. NDVI phenology ──────────────────────────────────────────────────
function NdviCard({ areaHa }: { areaHa: number }) {
  const { t, n, lang } = useI18n();
  const d = useFieldData();
  const s = d.ndvi.status === "ok" ? d.ndvi.data : null;
  const ny = useMemo(() => (s ? ndviYears(s) : null), [s]);
  const state: CardState = d.ndvi.status === "ok" ? (ny && ny.years.length ? "ok" : "empty") : partState(d.ndvi);
  const months = monthNames(lang);
  const W = 380, H = 150, L = 28, R = 6, T = 8, B = 20;
  const x = (k: number) => L + ((k - 1) / 365) * (W - L - R);
  const y = (v: number) => T + (1 - (v + 0.1) / 1.0) * (H - T - B);
  const latestYear = ny?.years.at(-1)?.year;
  return (
    <Card
      id="kart-ndvi"
      title={t("c.ndvi")}
      state={state}
      tier={areaHa >= 9 * MODIS_PIXEL_HA ? "inside" : "few"}
      res="MODIS 250 m"
      onRetry={() => d.retry("ndvi")}
      errorText={t("ndvi.err")}
      emptyText={t("ndvi.none")}
      slow={d.ndvi.status === "loading" ? t("ndvi.slow") : null}
      minH={230}
      finding={ny?.last ? t("ndvi.finding", { v: n(ny.last.v, 2), d: isoLabel(ny.last.date, lang), bare: ny.bareShareLastYear !== null ? pctText(ny.bareShareLastYear, lang, n) : "–" }) : undefined}
      source={t("ndvi.src")}
    >
      {areaHa < MODIS_PIXEL_HA && <p className="note mb-2 px-3 py-2 text-[13px]">{t("ndvi.small", { share: pctText(areaHa / MODIS_PIXEL_HA, lang, n) })}</p>}
      {ny && (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("ndvi.aria")}>
          <rect x={L} y={y(0.2)} width={W - L - R} height={y(-0.1) - y(0.2)} fill="var(--soil)" opacity="0.12" />
          {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0.2 ? "var(--soil)" : "var(--grid)"} strokeWidth={v === 0.2 ? 1 : 0.6} strokeDasharray={v === 0.2 ? "4 3" : undefined} />
              <text x={L - 4} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--ink-2)">
                {n(v, 1)}
              </text>
            </g>
          ))}
          <text x={L + 4} y={y(0.2) + 12} fontSize="10.5" fill="var(--soil)">
            {t("ndvi.bare")}
          </text>
          {months.map((m, i) => (
            <text key={m} x={x(i * 30.4 + 15)} y={H - 5} textAnchor="middle" fontSize="10.5" fill="var(--ink-2)">
              {m.slice(0, 1)}
            </text>
          ))}
          <polyline points={ny.median.map((p) => `${x(p.doy || 1)},${y(p.v)}`).join(" ")} fill="none" stroke="var(--ref)" strokeWidth="1.2" strokeDasharray="5 4" />
          {ny.years.map((yr) => (
            <polyline
              key={yr.year}
              points={yr.pts.map((p) => `${x(p.doy)},${y(p.v)}`).join(" ")}
              fill="none"
              stroke={yr.year === latestYear ? "var(--crop)" : "var(--ink-3)"}
              strokeWidth={yr.year === latestYear ? 2.2 : 1}
              opacity={yr.year === latestYear ? 1 : 0.5}
            />
          ))}
        </svg>
      )}
      {ny && (
        <p className="flex flex-wrap gap-x-4 text-[12px] text-ink-2">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-[var(--crop)]" />{latestYear}</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-px w-4 bg-[var(--ink-3)]" />{t("ndvi.earlier", { n: Math.max(0, (ny.years.length ?? 1) - 1) })}</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-4 border-t border-dashed border-[var(--ref)]" />{t("ndvi.median")}</span>
        </p>
      )}
    </Card>
  );
}

// ── 9. monthly irrigation need (engine, current plan) ──────────────────
function IrrigationCard() {
  const { t, n, L, lang } = useI18n();
  const d = useFieldData();
  const s = useStore();
  const theme = useTheme();
  const res = d.analysis.result;
  const md = res?.current.monthlyDemand ?? null;
  const state: CardState = md ? "ok" : d.analysis.error ? "error" : d.request ? "loading" : "empty";
  const months = monthNames(lang);
  const totalIrr = md ? md.reduce((a, m) => a + m.irrigationMm, 0) / 3 : 0;
  const totalDef = md ? md.reduce((a, m) => a + m.deficitMm, 0) / 3 : 0;
  const crops = res ? res.current.crops.map((c) => L(cropName(c))).join(", ") : "";
  const W = 380, H = 120, T = 8, B = 20;
  const max = md ? Math.max(5, ...md.map((m) => m.irrigationMm + m.deficitMm)) : 1;
  const bw = (W - 4) / 36;
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  return (
    <Card
      id="kart-sulama"
      title={t("c.irr")}
      state={state}
      tier="engine"
      res={t("irr.res")}
      errorText={t("irr.err")}
      emptyText={t("irr.wait")}
      minH={200}
      finding={md ? t(s.inputs.rainfed ? "irr.findingRainfed" : "irr.finding", { crops, irr: n(totalIrr), k: n(totalIrr / TON_PER_IRRIGATION, 1), def: n(totalDef) }) : undefined}
      source={t("irr.src", { w: res?.windows.count ?? 0 })}
    >
      {md && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("irr.aria", { irr: n(totalIrr), def: n(totalDef) })}>
            {md.map((m, i) => (
              <g key={i}>
                <rect x={2 + bw * i + 1} y={y(m.irrigationMm)} width={bw - 2} height={y(0) - y(m.irrigationMm)} fill="var(--water)" />
                {m.deficitMm > 0.5 && <rect x={2 + bw * i + 1} y={y(m.irrigationMm + m.deficitMm)} width={bw - 2} height={y(0) - y(m.deficitMm)} fill={`url(#agro-tex-fallow-${theme})`} stroke="var(--risk)" strokeWidth="0.8" />}
                {m.month === 10 && (
                  <text x={2 + bw * i + 2} y={H - 5} fontSize="10.5" fill="var(--ink-2)">
                    {t("irr.year", { y: m.year })}
                  </text>
                )}
              </g>
            ))}
            <line x1="2" x2={W - 2} y1={y(0)} y2={y(0)} stroke="var(--axis)" />
            <text x={4} y={T + 8} fontSize="10" fill="var(--ink-2)">
              {t("irr.max", { v: n(max) })}
            </text>
          </svg>
          <p className="flex flex-wrap gap-x-4 text-[12px] text-ink-2">
            <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 bg-[var(--water)]" />{t("irr.given")}</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 border border-[var(--risk)]" />{t("irr.unmet")}</span>
          </p>
          <p className="mt-2 text-[12px] text-ink-2">{t("irr.bridge", { k: TON_PER_IRRIGATION })}</p>
          <TableToggle label={t("common.table")}>
            <MiniTable head={[t("irr.col.m"), t("irr.given"), t("irr.unmet")]} rows={md.map((m) => [`${t("irr.year", { y: m.year })} ${months[m.month - 1]}`, n(m.irrigationMm), n(m.deficitMm)])} />
          </TableToggle>
        </>
      )}
    </Card>
  );
}

const cropName = (id: CropId) => CROPS[id].name;

// ── 10. sources and resolution ─────────────────────────────────────────
function SourcesCard({ areaHa, onCells, cellsOn }: { areaHa: number; onCells: () => void; cellsOn: boolean }) {
  const { t, n, lang } = useI18n();
  const d = useFieldData();
  const tr = d.terrain;
  const snapDate = d.snapshot?.entry.retrievedAt;
  const rows: { what: string; src: string; res: string; tier: Tier }[] = [
    { what: t("src.area"), src: t("src.areaSrc"), res: "–", tier: "computed" },
    { what: t("c.terrain"), src: "NASA SRTM v3", res: `30 m${tr ? `, ${tr.data.samples} ${t("src.samples")}` : ""}`, tier: tr?.basis === "polygon" && tr.data.samples >= 9 ? "inside" : "few" },
    { what: t("c.soil"), src: "ISRIC SoilGrids v2.0", res: "250 m", tier: soilTier(areaHa) },
    { what: t("c.climate"), src: "NASA POWER", res: "0,5° × 0,625°", tier: "cell" },
    { what: t("c.rain"), src: "ERA5 (Open-Meteo)", res: "0,25°", tier: "cell" },
    { what: t("c.ndvi"), src: "MODIS MOD13Q1", res: "250 m", tier: areaHa >= 9 * MODIS_PIXEL_HA ? "inside" : "few" },
    { what: t("c.irr"), src: t("src.engine"), res: t("src.engineRes"), tier: "engine" },
  ];
  return (
    <Card id="kart-kaynak" title={t("c.sources")} state="ok" finding={areaHa < MODIS_PIXEL_HA ? t("src.finding", { ha: n(areaHa, 1), share: pctText(areaHa / MODIS_PIXEL_HA, lang, n) }) : t("src.findingBig", { ha: n(areaHa, 1), k: n(areaHa / MODIS_PIXEL_HA, 1) })}>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.what} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-1.5 text-[13px]">
            <span>
              <span className="font-medium">{r.what}</span>
              <span className="block text-ink-2">
                {r.src} · <span className="font-mono text-[12px]">{r.res}</span>
              </span>
            </span>
            <TierBadge tier={r.tier} />
          </li>
        ))}
      </ul>
      {snapDate && <p className="mt-2 text-[13px] text-ink-2">{t("src.snapshot", { d: isoLabel(snapDate, lang) })}</p>}
      <button type="button" className="btn mt-3" aria-pressed={cellsOn} onClick={onCells}>
        <Icon name="cells" size={18} />
        {cellsOn ? t("src.cellsHide") : t("src.cellsShow")}
      </button>
    </Card>
  );
}
