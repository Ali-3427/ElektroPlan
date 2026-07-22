import { minimumSectionDataset } from "./dataset.js";
import type { CircuitKind } from "./types.js";

export function getMinimumSection(
  circuitKind: CircuitKind,
  material: "copper" | "aluminum",
): number | undefined {
  return minimumSectionDataset.entries.find(
    (e) => e.circuitKind === circuitKind && e.material === material,
  )?.minSectionMm2;
}
