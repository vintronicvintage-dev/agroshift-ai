/**
 * Deterministic Economic Net Return & Water Productivity Calculator (`src/lib/physics/economics.ts`).
 *
 * Uses TMO / regional reference crop purchase prices (TL/ton) and Üre/DAP fertilizer unit prices
 * (TL/kg) from `src/data/economic_rates.json` to compute per-plan:
 *   1. Expected annual net profit (TL/da/yr)
 *   2. Concrete fertilizer cost saving from legume nitrogen credit (TL/da/yr & kg Üre/da/yr)
 *   3. Irrigation water productivity (TL/m³ of irrigation water applied)
 */

import economicRates from "@/data/economic_rates.json";
import { CROPS } from "@/lib/crops/database";
import { N_NEED_KG_HA, preCropEffect, previousCrops } from "@/lib/crops/preCrop";
import type { CropId, PlanResult } from "@/lib/types";

export interface CropRateEntry {
  nameTr: string;
  nameEn: string;
  priceTLPerTon: number;
  priceTLPerKg: number;
  source: string;
  date: string;
}

export interface FertilizerRateEntry {
  nameTr: string;
  nameEn: string;
  priceTLPerKg: number;
  nContentFraction: number;
  effectiveNPriceTLPerKgN?: number;
  p2o5ContentFraction?: number;
  source: string;
  date: string;
}

export interface EconomicRatesCatalog {
  version: string;
  currency: string;
  referenceDate: string;
  sourceSummary: string;
  crops: Record<CropId, CropRateEntry>;
  fertilizers: {
    urea_46: FertilizerRateEntry;
    dap_18_46: FertilizerRateEntry;
  };
}

export const ECONOMIC_RATES = economicRates as EconomicRatesCatalog;

export interface PlanEconomicsBreakdown {
  /** Expected annual net profit using TMO/regional reference rates (TL/da/yr). */
  expectedAnnualNetProfitTLPerDa: number;
  /** Annualized concrete fertilizer saving from legume N credit (TL/da/yr). */
  legumeNitrogenSavingTLPerDa: number;
  /** Total 3-year cycle fertilizer saving from legume N credit (TL/da/3yr). */
  legumeNitrogenSaving3YrTLPerDa: number;
  /** Equivalent Üre (%46 N) fertilizer saved per year (kg/da/yr). */
  ureaEquivalentKgPerDaYr: number;
  /** Net return per m³ of irrigation water applied (TL/m³), or null if rainfed (0 m³). */
  waterProductivityTLPerM3: number | null;
  /** Mean annual irrigation water applied (m³/da/yr; 1 mm = 1 m³/da). */
  irrigationM3PerDaYr: number;
  /** Total N credit across the 3-year cycle (kg N/ha/3yr). */
  totalNCreditKgHa3Yr: number;
  /** Reference date of the TMO/market price table. */
  referenceDate: string;
  /** Source summary label. */
  sourceSummary: string;
}

export interface ComputeEconomicsOptions {
  /** Irrigation application efficiency (0..1, default 0.75). */
  efficiency?: number;
  /** Water price (TL/m³, default 0). */
  waterPriceTLPerM3?: number;
  /** Optional crop price overrides (TL/kg). */
  priceOverridesTLPerKg?: Partial<Record<CropId, number>>;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Deterministically compute annual net profit (TL/da), legume N fertilizer saving (TL/da),
 * and water productivity (TL/m³) for a 3-year crop rotation plan.
 */
export function computePlanEconomics(
  plan: PlanResult,
  opts: ComputeEconomicsOptions = {},
): PlanEconomicsBreakdown {
  const efficiency = Math.max(0.05, opts.efficiency ?? 0.75);
  const waterPrice = Math.max(0, opts.waterPriceTLPerM3 ?? 0);
  const urea = ECONOMIC_RATES.fertilizers.urea_46;
  const effectiveNPrice = urea.effectiveNPriceTLPerKgN ?? urea.priceTLPerKg / Math.max(0.01, urea.nContentFraction);

  const prevs = previousCrops(plan.crops);
  let totalNet3Yr = 0;
  let totalNSaving3Yr = 0;
  let totalNCreditKgHa3Yr = 0;

  for (let k = 0; k < 3; k++) {
    const cropId = plan.crops[k];
    const yr = plan.years[k];
    const rate = ECONOMIC_RATES.crops[cropId];
    const priceTLPerKg = opts.priceOverridesTLPerKg?.[cropId] ?? rate?.priceTLPerKg ?? CROPS[cropId].priceTLPerKg.value;

    const yieldTHa = yr?.yieldTHa?.p50 ?? 0;
    const revenueTLPerDa = yieldTHa * 100 * priceTLPerKg;

    const varCostTLPerDa = CROPS[cropId].varCostTLPerDa.value;
    const irrNetMm = yr?.irrigationNetMm?.p50 ?? 0;
    const waterCostTLPerDa = (irrNetMm / efficiency) * waterPrice;

    // Legume N credit (capped by following crop's N requirement)
    const pre = plan.preCrop?.[k];
    const nRange = pre ? pre.nCreditKgHa : preCropEffect(prevs[k], cropId).nCreditKgHa;
    const nMidKgHa = (nRange.low + nRange.high) / 2;
    const effectiveNCreditKgHa = Math.min(nMidKgHa, N_NEED_KG_HA[cropId]);
    const nSavingTLPerDa = (effectiveNCreditKgHa / 10) * effectiveNPrice;

    totalNCreditKgHa3Yr += effectiveNCreditKgHa;
    totalNSaving3Yr += nSavingTLPerDa;
    totalNet3Yr += revenueTLPerDa - varCostTLPerDa - waterCostTLPerDa + nSavingTLPerDa;
  }

  const expectedAnnualNetProfitTLPerDa = r2(totalNet3Yr / 3);
  const legumeNitrogenSavingTLPerDa = r2(totalNSaving3Yr / 3);
  const legumeNitrogenSaving3YrTLPerDa = r2(totalNSaving3Yr);
  const ureaEquivalentKgPerDaYr = r2((totalNCreditKgHa3Yr / 3 / 10) / Math.max(0.01, urea.nContentFraction));

  const irrigationM3PerDaYr = r2(plan.water.irrigationNetMmPerYr?.p50 ?? 0);
  const waterProductivityTLPerM3 =
    irrigationM3PerDaYr > 0 ? r2(expectedAnnualNetProfitTLPerDa / irrigationM3PerDaYr) : null;

  return {
    expectedAnnualNetProfitTLPerDa,
    legumeNitrogenSavingTLPerDa,
    legumeNitrogenSaving3YrTLPerDa,
    ureaEquivalentKgPerDaYr,
    waterProductivityTLPerM3,
    irrigationM3PerDaYr,
    totalNCreditKgHa3Yr: r2(totalNCreditKgHa3Yr),
    referenceDate: ECONOMIC_RATES.referenceDate,
    sourceSummary: ECONOMIC_RATES.sourceSummary,
  };
}
