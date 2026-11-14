import type { AnalysisInput, AnalysisResult, ClimateSeries, SoilLayer } from "@/lib/types";

export type AnalysisRequest = Omit<AnalysisInput, "climate">;

export type WorkerRequest =
  | {
      type: "climate";
      key: string;
      climate: ClimateSeries;
      soilLayers?: SoilLayer[] | null;
      precipCheck?: AnalysisInput["precipCheck"] | null;
    }
  | {
      type: "run";
      id: number;
      key: string;
      input: AnalysisRequest;
      useSiteSoilLayers?: boolean;
      useSitePrecipCheck?: boolean;
    };

export type WorkerResponse =
  | { type: "result"; id: number; result: AnalysisResult; ms: number }
  | { type: "error"; id: number; message: string };
