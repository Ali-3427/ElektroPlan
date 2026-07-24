import {
  getTempFactor, getGroupingArrangementFactor, getSoilResistivityFactor,
} from "@elektroplan/calculation-data";
import type { AssumptionEntry } from "../common/types/result.js";
import type { CableSelectionInput } from "./types.js";
export { validateSelectionInput } from "./validate.js";

const INSULATION_RATING = { PVC: "PVC_70C", "XLPE/EPR": "XLPE_EPR_90C" } as const;
// Method D1/D2 -> underground row in the temperature table; every other method is air.
const UNDERGROUND_METHODS = new Set(["D1", "D2"]);

export interface CorrectionResult {
  kT: number;
  kG: number;
  kH: number;
  kS: number;
  kD: number;
  kTotal: number;
  assumptions: AssumptionEntry[];
}

export function computeCorrection(input: CableSelectionInput, kH: number): CorrectionResult {
  const buried = UNDERGROUND_METHODS.has(input.installationMethod);
  const method = buried ? "D" : input.installationMethod;
  const assumptions: AssumptionEntry[] = [];

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

  // kS: soil thermal resistivity factor, buried methods only, and only when provided.
  let kS = 1;
  const soil = input.detailed?.soilThermalResistivityKmPerW;
  if (buried && soil !== undefined) {
    const factor = getSoilResistivityFactor(soil);
    if (factor === undefined) {
      throw new RangeError(`No soil resistivity factor for ${soil} K·m/W (no interpolation).`);
    }
    kS = factor;
  }

  // kD: IEC 60364-5-52 publishes no numeric burial-depth table (VERILER.md §5).
  const kD = 1;
  if (input.detailed?.burialDepthM !== undefined) {
    assumptions.push({ field: "kD", usedValue: 1, source: "estimated" });
  }

  const extra = input.extraCorrectionFactor ?? 1;
  return { kT, kG, kH, kS, kD, kTotal: kT * kG * kH * kS * kD * extra, assumptions };
}
