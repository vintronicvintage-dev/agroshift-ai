// Types shared by the field (polygon) data layer. SoilLayer / TerrainInfo live in @/lib/types.
import type { PrecipCrossCheck as EnginePrecipCrossCheck, SoilLayer, SoilProfile, SourceMeta, TerrainInfo } from "@/lib/types";

export type { SoilLayer, TerrainInfo, SourceMeta };

/**
 * Same shape as the engine's PrecipCrossCheck, but `reference` is widened: Open-Meteo currently serves no
 * ERA5-Land precipitation (all values null), so the live reference is plain ERA5 (0.25 deg) and is labelled as such.
 */
export type PrecipCrossCheck = Omit<EnginePrecipCrossCheck, "reference"> & { reference: "era5-land" | "era5" };

export interface LonLat {
  lon: number;
  lat: number;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface FieldGeometry {
  areaM2: number;
  areaDa: number; // dekar (1 da = 1000 m2)
  areaHa: number;
  perimeterM: number;
  centroid: LonLat;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

export interface FieldResponse {
  geometry: FieldGeometry;
  terrain: TerrainInfo | null;
  soilLayers: SoilLayer[] | null;
  soil: SoilProfile;
  wrb?: string;
  precipCheck: PrecipCrossCheck | null;
  notes: string[];
}
