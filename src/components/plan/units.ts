// Farmer-unit helpers for the plan screens (formatting only; numbers come from the engine).
export { outOf, trLocative } from "@/lib/engine/units";
import { TON_PER_IRRIGATION } from "@/lib/ui/fieldStore";

export const TON_PER_IRRIGATION_LABEL = TON_PER_IRRIGATION;

/** Irrigations from m³/da (= ton/da), using the labelled UI assumption. */
export const irrigations = (tonPerDa: number) => tonPerDa / TON_PER_IRRIGATION;
