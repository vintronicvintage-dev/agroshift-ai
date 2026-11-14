"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Download, MapPin, Plus, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader, ProvenanceBadge, SectionCard, StatCard, StatusNotice } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { useI18n } from "@/lib/i18n";
import { PILOTS } from "@/lib/data/pilots";
import { CROPS } from "@/lib/engine";
import { describeRing, ringFromGeoJSON, ringToGeoJSON } from "@/lib/ui/geo";
import { makeField, pilotField, saveField, setField, setStore, useStore } from "@/lib/ui/fieldStore";

const MapCanvas = dynamic(() => import("@/components/tarla/MapCanvas"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-2xl bg-surface-2" />,
});

export default function MyFieldsPage() {
  const { lang, n } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const tr = lang === "tr";

  const [drawMode, setDrawMode] = useState<"none" | "polygon">("none");
  const [geoJsonError, setGeoJsonError] = useState<string | null>(null);
  const [labPh, setLabPh] = useState<string>(store.soil?.ph?.toString() ?? "");
  const [labSoc, setLabSoc] = useState<string>(store.soil?.soc?.toString() ?? "");
  const [labSaved, setLabSaved] = useState(false);

  const field = store.field;
  const geo = field ? describeRing(field.ring) : null;
  const areaDa = field ? (store.inputs.areaOverrideDa ?? field.areaDa) : 0;

  const handleGeoJsonUpload = async (file: File) => {
    setGeoJsonError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const ring = ringFromGeoJSON(parsed);
      if (!ring || ring.length < 3) {
        setGeoJsonError(tr ? "Geçerli bir GeoJSON Polygon bulunamadı." : "No valid GeoJSON Polygon found.");
        return;
      }
      const info = describeRing(ring);
      setField(
        makeField(
          ring,
          "polygon",
          file.name.replace(/\.(geo)?json$/i, ""),
          { areaDa: Math.max(1, Math.round(info.areaDa)) },
        ),
      );
    } catch {
      setGeoJsonError(tr ? "GeoJSON dosyası okunamadı." : "Failed to parse GeoJSON file.");
    }
  };

  const handleExportGeoJson = () => {
    if (!field) return;
    const fc = ringToGeoJSON(field.ring, { id: field.id, name: field.name, areaDa });
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${field.id}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveLabSoil = () => {
    const phVal = parseFloat(labPh);
    const socVal = parseFloat(labSoc);
    const base = data.soil ?? { sand: 30, silt: 36, clay: 34, soc: 11, ph: 7.5 };
    setStore({
      soil: {
        sand: base.sand,
        silt: base.silt,
        clay: base.clay,
        ph: Number.isFinite(phVal) ? phVal : base.ph,
        soc: Number.isFinite(socVal) ? socVal : base.soc,
      },
    });
    setLabSaved(true);
    setTimeout(() => setLabSaved(false), 2500);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow={tr ? "Arazi Yönetimi" : "Parcel Management"}
          title={tr ? "Tarlalarım ve Parsel Haritası" : "My Fields & Parcel Map"}
          description={
            tr
              ? "Gerçek uydu haritası üzerinde parsel çizin, GeoJSON yükleyin/indirin ve laboratuvar toprak analizi sonuçlarınızı tanımlayın."
              : "Draw parcel boundaries on the live map, import/export GeoJSON, and record lab soil test values."
          }
          badge={<ProvenanceBadge kind="observed" label={tr ? "Canlı GIS Haritası" : "Live GIS Map"} />}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDrawMode(drawMode === "polygon" ? "none" : "polygon")}
                className={`btn ${drawMode === "polygon" ? "btn-primary" : ""}`}
              >
                <Plus className="size-4" />
                {drawMode === "polygon"
                  ? tr ? "Çizimi Bitir / Gezin" : "Finish Drawing"
                  : tr ? "Yeni Parsel Çiz" : "Draw New Parcel"}
              </button>
              {field && (
                <>
                  <button
                    type="button"
                    onClick={() => saveField()}
                    className="btn"
                  >
                    {store.saved.some((sv) => sv.id === field.id)
                      ? tr ? "Kayıtlı Tarla ✓" : "Saved ✓"
                      : tr ? "Tarlayı Kaydet" : "Save Parcel"}
                  </button>
                  <button type="button" onClick={handleExportGeoJson} className="btn">
                    <Download className="size-4" />
                    GeoJSON
                  </button>
                </>
              )}
            </div>
          }
        />

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={tr ? "Aktif Parsel" : "Active Parcel"}
            value={field?.name ?? "—"}
            sub={field ? (field.pilotId ? (tr ? "Referans Havza" : "Pilot Basin") : (tr ? "Özel Parsel" : "Custom Parcel")) : (tr ? "Seçim bekleniyor" : "Not selected")}
            icon={<MapPin className="size-4" />}
          />
          <StatCard
            label={tr ? "Parsel Alanı" : "Parcel Area"}
            value={field ? n(areaDa, areaDa < 100 ? 1 : 0) : "—"}
            unit={field ? "da" : undefined}
            sub={field ? `${n(areaDa / 10, 1)} ha` : undefined}
          />
          <StatCard
            label={tr ? "Merkez Koordinat" : "Centroid Coordinates"}
            value={geo ? `${geo.centroid.lat.toFixed(3)}°, ${geo.centroid.lon.toFixed(3)}°` : "—"}
            provenance="observed"
          />
          <StatCard
            label={tr ? "Mevcut 3 Yıllık Sıra" : "Current 3-Year Sequence"}
            value={store.inputs.rotation.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ")}
          />
        </div>

        {/* Map + Saved Parcels */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <SectionCard
              title={tr ? "Etkileşimli Uydu ve Parsel Haritası" : "Interactive Satellite & Parcel Map"}
              subtitle={
                tr
                  ? "Harita üzerinde çokgen çizerek kendi tarlanızı tanımlayabilir veya pilot parsellerden birini seçebilirsiniz."
                  : "Draw a polygon directly on the map or select a reference pilot parcel."
              }
            >
              <div className="relative h-[440px] overflow-hidden rounded-xl border border-line">
                <MapCanvas
                  label={tr ? "Tarlalarım Haritası" : "My Fields Map"}
                  ring={field?.ring ?? null}
                  fieldName={field?.name}
                  fieldAreaLabel={field ? `${n(areaDa, 0)} da` : undefined}
                  saved={store.saved.map((sv) => ({ id: sv.id, ring: sv.ring, name: sv.name }))}
                  mode={drawMode}
                  base="esri"
                  overlays={[]}
                  dates={{}}
                  cells={null}
                  onCommit={(ring) => {
                    const info = describeRing(ring);
                    setField(
                      makeField(
                        ring,
                        "polygon",
                        tr ? "Çizilen Tarla" : "Drawn Parcel",
                        { areaDa: Math.max(1, Math.round(info.areaDa)) },
                      ),
                    );
                    setDrawMode("none");
                  }}
                  onEdit={(ring) => {
                    if (field) setField({ ...field, ring, areaDa: Math.max(1, Math.round(describeRing(ring).areaDa)) });
                  }}
                  onPin={() => {}}
                  onLive={() => {}}
                  onView={() => {}}
                  onPickSaved={(id) => {
                    const found = store.saved.find((sv) => sv.id === id);
                    if (found) setField(found);
                  }}
                  onTileError={() => {}}
                  onProblem={() => {}}
                />
              </div>
            </SectionCard>
          </div>

          <div className="space-y-5 lg:col-span-4">
            <SectionCard title={tr ? "Pilot ve Hazır Parseller" : "Reference Parcels"}>
              <div className="space-y-2">
                {PILOTS.map((p) => {
                  const selected = field?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setField(pilotField(p.id, lang))}
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition-colors ${
                        selected
                          ? "border-[#123D2A] bg-[#EBF4ED] font-semibold text-[#123D2A]"
                          : "border-line bg-bg text-ink hover:border-[#397A42]"
                      }`}
                    >
                      <div>
                        <div>{tr ? p.nameTr : p.nameEn}</div>
                        <div className="text-[11.5px] font-normal text-ink-2">
                          {p.lat.toFixed(2)}°N, {p.lon.toFixed(2)}°E
                        </div>
                      </div>
                      <ArrowRight className="size-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title={tr ? "GeoJSON İçe Aktar" : "Import GeoJSON"}>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-bg p-5 text-center text-[13px] text-ink-2 hover:border-[#397A42]">
                <Upload className="size-5 text-[#397A42]" />
                <span>{tr ? ".geojson veya .json dosyası seçin" : "Choose a .geojson or .json file"}</span>
                <input
                  type="file"
                  accept=".geojson,.json,application/geo+json,application/json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleGeoJsonUpload(file);
                  }}
                />
              </label>
              {geoJsonError && <p className="mt-2 text-[12.5px] text-bad">{geoJsonError}</p>}
            </SectionCard>

            <SectionCard
              title={tr ? "Laboratuvar Toprak Analizi Ekle" : "Add Lab Soil Analysis"}
              subtitle={tr ? "Varsa laboratuvar pH ve organik karbon değerini önceliklendirin." : "Prioritize local lab pH and SOC over SoilGrids."}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="lab-ph" className="mb-1 block text-[12px] font-medium text-ink-2">
                    pH
                  </label>
                  <input
                    id="lab-ph"
                    type="number"
                    step="0.1"
                    min="4"
                    max="9.5"
                    placeholder="7.6"
                    value={labPh}
                    onChange={(e) => setLabPh(e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label htmlFor="lab-soc" className="mb-1 block text-[12px] font-medium text-ink-2">
                    SOC (g/kg)
                  </label>
                  <input
                    id="lab-soc"
                    type="number"
                    step="0.5"
                    min="1"
                    max="60"
                    placeholder="11.5"
                    value={labSoc}
                    onChange={(e) => setLabSoc(e.target.value)}
                    className="field-input"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={handleSaveLabSoil} className="btn btn-primary btn-sm flex-1">
                  {tr ? "Analizi Kaydet" : "Save Lab Test"}
                </button>
                {store.soil && (
                  <button
                    type="button"
                    onClick={() => {
                      setStore({ soil: null });
                      setLabPh("");
                      setLabSoc("");
                    }}
                    className="btn btn-sm btn-icon"
                    title={tr ? "Sıfırla" : "Reset"}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {labSaved && (
                <div className="mt-2 text-[12px] font-medium text-[#397A42]">
                  {tr ? "Laboratuvar değerleri modele uygulandı." : "Lab values applied to model."}
                </div>
              )}
              {data.soil && (
                <p className="mt-3 text-[12px] text-ink-2">
                  {tr ? "Aktif kaynak:" : "Active source:"}{" "}
                  <strong>{data.soil.origin === "user" ? (tr ? "Kullanıcı Laboratuvarı" : "User Lab") : "ISRIC SoilGrids 250m"}</strong>
                </p>
              )}
            </SectionCard>
          </div>
        </div>

        {!field && (
          <StatusNotice
            kind="info"
            title={tr ? "Parsel bekleniyor" : "Waiting for parcel"}
            message={tr ? "Sağdaki pilot parsellerden birini seçebilir veya haritada çizebilirsiniz." : "Select a reference parcel on the right or draw on the map."}
          />
        )}

        <div className="flex justify-end">
          <Link href="/toprak" className="btn btn-primary">
            {tr ? "Toprak Analizine Geç" : "Proceed to Soil Analysis"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
