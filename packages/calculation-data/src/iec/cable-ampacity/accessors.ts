import { cableAmpacityDatasets, datasetKey } from "./dataset.js";
import type { CableMethodCode } from "../cable-methods/types.js";
import type { DataConfidence } from "../../dataset/confidence.js";
import type { CableAmpacityDataset, CableAmpacityKey } from "./types.js";

export function getCableAmpacityDataset(key: CableAmpacityKey): Readonly<CableAmpacityDataset> {
  const d = cableAmpacityDatasets.get(datasetKey(key));
  if (d === undefined) {
    throw new RangeError(`No cable ampacity dataset for ${datasetKey(key)}.`);
  }
  return d;
}

export function getCableCrossSections(key: CableAmpacityKey): readonly number[] {
  return getCableAmpacityDataset(key).entries.map((e) => e.crossSectionMm2);
}

export function getCableAmpacityConfidence(key: CableAmpacityKey): DataConfidence {
  return getCableAmpacityDataset(key).confidence;
}

export function getCableAmpacity(
  key: CableAmpacityKey,
  crossSectionMm2: number,
  method: CableMethodCode,
): number | null | undefined {
  const entry = getCableAmpacityDataset(key).entries.find(
    (e) => e.crossSectionMm2 === crossSectionMm2,
  );
  return entry?.methods[method];
}
