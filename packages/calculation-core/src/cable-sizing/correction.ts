import { getTempFactor, getGroupingArrangementFactor } from "@elektroplan/calculation-data";
import type { CableSelectionInput } from "./types.js";
export { validateSelectionInput } from "./validate.js";

const INSULATION_RATING = { PVC: "PVC_70C", "XLPE/EPR": "XLPE_EPR_90C" } as const;
// Method D1/D2 -> underground row in the temperature table; every other method is air.
const UNDERGROUND_METHODS = new Set(["D1", "D2"]);

export interface CorrectionResult {
  kT: number;
  kG: number;
  kH: number;
  kTotal: number;
}

export function computeCorrection(input: CableSelectionInput, kH: number): CorrectionResult {
  const method = UNDERGROUND_METHODS.has(input.installationMethod) ? "D" : input.installationMethod;
  const kT = getTempFactor({
    method: method as never,
    temperatureC: input.ambientTemperatureC,
    insulation: INSULATION_RATING[input.insulation],
  });
  if (kT === undefined) {
    throw new RangeError(`No temperature factor for ${input.installationMethod} at ${input.ambientTemperatureC}C.`);
  }
  const kG = getGroupingArrangementFactor(input.groupingArrangement, input.groupedCircuits);
  if (kG === undefined) {
    throw new RangeError(`No grouping factor for ${input.groupingArrangement} × ${input.groupedCircuits}.`);
  }
  const extra = input.extraCorrectionFactor ?? 1;
  return { kT, kG, kH, kTotal: kT * kG * kH * extra };
}
