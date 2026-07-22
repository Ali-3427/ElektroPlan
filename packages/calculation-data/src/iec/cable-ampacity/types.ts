import type { DatasetWithMetadata } from "../../dataset/types.js";
import type { DataConfidence } from "../../dataset/confidence.js";
import type { CableMethodCode } from "../cable-methods/types.js";

export type CableInsulation = "PVC" | "XLPE/EPR";
export type CableConductorMaterial = "copper" | "aluminum";
export type LoadedConductorCount = 2 | 3;

export interface CableAmpacityEntry {
  crossSectionMm2: number;
  methods: Readonly<Record<CableMethodCode, number | null>>;
}

export interface CableAmpacityDataset extends DatasetWithMetadata {
  material: CableConductorMaterial;
  insulation: CableInsulation;
  insulationTemperatureC: 70 | 90;
  loadedConductors: LoadedConductorCount;
  referenceAmbientAirC: 30;
  referenceGroundC: 20;
  confidence: DataConfidence;
  entries: readonly CableAmpacityEntry[];
}

export interface CableAmpacityKey {
  material: CableConductorMaterial;
  insulation: CableInsulation;
  loadedConductors: LoadedConductorCount;
}
