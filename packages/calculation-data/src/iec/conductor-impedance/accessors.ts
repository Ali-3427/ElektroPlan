import { conductorImpedanceDataset } from "./dataset.js";
import type { ConductorArrangement } from "./types.js";

function entry(sectionMm2: number) {
  return conductorImpedanceDataset.entries.find((e) => e.crossSectionMm2 === sectionMm2);
}

export function getResistance20(
  material: "copper" | "aluminum",
  sectionMm2: number
): number | null | undefined {
  return entry(sectionMm2)?.resistance20OhmPerKm[material];
}

export function getReactance(
  arrangement: ConductorArrangement,
  sectionMm2: number
): number | null | undefined {
  return entry(sectionMm2)?.reactanceOhmPerKm[arrangement];
}
