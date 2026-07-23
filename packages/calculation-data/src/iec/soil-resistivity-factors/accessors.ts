import { soilResistivityDataset } from "./dataset.js";

export function getSoilResistivityFactor(
  thermalResistivityKmPerW: number,
): number | undefined {
  return soilResistivityDataset.entries.find(
    (e) => e.thermalResistivityKmPerW === thermalResistivityKmPerW,
  )?.buriedInDucts;
}
