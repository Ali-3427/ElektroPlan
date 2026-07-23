import type { DatasetWithMetadata } from "../../dataset/types.js";
import type { DataConfidence } from "../../dataset/confidence.js";

export interface SoilResistivityEntry {
  thermalResistivityKmPerW: number;
  buriedInDucts: number;
  /** Standard publishes no numeric direct-buried variant; null until sourced. */
  buriedDirect: number | null;
}

export interface SoilResistivityDataset extends DatasetWithMetadata {
  referenceResistivityKmPerW: 2.5;
  confidence: DataConfidence;
  entries: readonly SoilResistivityEntry[];
}
