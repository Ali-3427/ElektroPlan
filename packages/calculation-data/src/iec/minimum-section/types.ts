import type { DatasetWithMetadata } from "../../dataset/types.js";

export const CIRCUIT_KINDS = ["power", "signal"] as const;
export type CircuitKind = (typeof CIRCUIT_KINDS)[number];

export interface MinimumSectionEntry {
  circuitKind: CircuitKind;
  material: "copper" | "aluminum";
  minSectionMm2: number;
}

export interface MinimumSectionDataset extends DatasetWithMetadata {
  entries: readonly MinimumSectionEntry[];
}
