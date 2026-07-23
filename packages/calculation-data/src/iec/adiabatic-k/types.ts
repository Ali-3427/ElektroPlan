import type { DatasetWithMetadata } from "../../dataset/types.js";

export const ADIABATIC_ROLES = ["line", "pe-bunched"] as const;
export type AdiabaticRole = (typeof ADIABATIC_ROLES)[number];

export interface AdiabaticKEntry {
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  role: AdiabaticRole;
  initialTempC: number;
  finalTempC: number;
  k: number;
  /** Applies when section > this value; null means the base row. */
  aboveSectionMm2: number | null;
}

export interface AdiabaticKDataset extends DatasetWithMetadata {
  entries: readonly AdiabaticKEntry[];
}

export interface AdiabaticKQuery {
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  role: AdiabaticRole;
  sectionMm2: number;
}
