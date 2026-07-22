import type { DatasetWithMetadata } from "../../dataset/types.js";

export const CONDUCTOR_ARRANGEMENTS = ["multicore", "singleCoreTrefoil", "singleCoreFlatTouching"] as const;
export type ConductorArrangement = (typeof CONDUCTOR_ARRANGEMENTS)[number];

export interface ConductorImpedanceEntry {
  crossSectionMm2: number;
  resistance20OhmPerKm: { copper: number | null; aluminum: number | null };
  reactanceOhmPerKm: Readonly<Record<ConductorArrangement, number | null>>;
}

export interface ConductorImpedanceDataset extends DatasetWithMetadata {
  referenceTemperatureC: 20;
  entries: readonly ConductorImpedanceEntry[];
}
