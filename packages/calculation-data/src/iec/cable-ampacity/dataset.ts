import cuPvc2 from "./copper-pvc-70c-2loaded.json" with { type: "json" };
import cuPvc3 from "./copper-pvc-70c-3loaded.json" with { type: "json" };
import cuXlpe2 from "./copper-xlpe-90c-2loaded.json" with { type: "json" };
import cuXlpe3 from "./copper-xlpe-90c-3loaded.json" with { type: "json" };
import alPvc3 from "./aluminum-pvc-70c-3loaded.json" with { type: "json" };
import alXlpe3 from "./aluminum-xlpe-90c-3loaded.json" with { type: "json" };

import { assertAscending, loadJsonDataset } from "../../dataset/load-json-dataset.js";
import { assertConfidence } from "../../dataset/confidence.js";
import { CABLE_METHOD_CODES } from "../cable-methods/types.js";
import type { CableAmpacityDataset, CableAmpacityKey } from "./types.js";

function keyOf(d: CableAmpacityDataset): string {
  return `${d.material}|${d.insulation}|${d.loadedConductors}`;
}

function assertDataset(raw: CableAmpacityDataset, path: string): Readonly<CableAmpacityDataset> {
  const d = loadJsonDataset(raw, path);
  assertConfidence(d.confidence, path);
  if (d.entries.length === 0) throw new Error(`${path} has no entries.`);
  for (const [i, entry] of d.entries.entries()) {
    for (const method of CABLE_METHOD_CODES) {
      const v = entry.methods[method];
      if (v !== null && typeof v !== "number") {
        throw new Error(`${path} entry ${i} method ${method} must be number or null.`);
      }
    }
  }
  assertAscending(d.entries.map((e) => e.crossSectionMm2), `${path} cross-sections`);
  return d;
}

const RAW: CableAmpacityDataset[] = [
  cuPvc2 as CableAmpacityDataset, cuPvc3 as CableAmpacityDataset,
  cuXlpe2 as CableAmpacityDataset, cuXlpe3 as CableAmpacityDataset,
  alPvc3 as CableAmpacityDataset, alXlpe3 as CableAmpacityDataset,
];

const PATHS = [
  "copper-pvc-70c-2loaded", "copper-pvc-70c-3loaded",
  "copper-xlpe-90c-2loaded", "copper-xlpe-90c-3loaded",
  "aluminum-pvc-70c-3loaded", "aluminum-xlpe-90c-3loaded",
];

export const cableAmpacityDatasets: ReadonlyMap<string, Readonly<CableAmpacityDataset>> =
  new Map(RAW.map((raw, i) => {
    const d = assertDataset(raw, `packages/calculation-data/src/iec/cable-ampacity/${PATHS[i]}.json`);
    return [keyOf(d), d];
  }));

export function datasetKey(key: CableAmpacityKey): string {
  return `${key.material}|${key.insulation}|${key.loadedConductors}`;
}
