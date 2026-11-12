import type { AnalysisInput, AnalysisResult, ClimateSeries } from "@/lib/types";

export type AnalysisRequest = Omit<AnalysisInput, "climate">;

export type WorkerRequest =
  | { type: "climate"; key: string; climate: ClimateSeries }
  | { type: "run"; id: number; key: string; input: AnalysisRequest };

export type WorkerResponse =
  | { type: "result"; id: number; result: AnalysisResult; ms: number }
  | { type: "error"; id: number; message: string };
