import type { DatasetWithMetadata } from "../../dataset/types.js";

export interface BreakerTripMultiplierEntry {
  curve: "B" | "C" | "D";
  minMultiplier: number;
  maxMultiplier: number;
  designMultiplier: number;
}

export interface BreakerTripMultipliersDataset extends DatasetWithMetadata {
  entries: readonly BreakerTripMultiplierEntry[];
}
