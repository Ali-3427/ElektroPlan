import { isCableMethodCode, CABLE_METHOD_CODES } from "@elektroplan/calculation-data";
import { assertPositive, assertOneOf } from "../common/validation/guards.js";
import type { CableSelectionInput } from "./types.js";

export function validateSelectionInput(input: CableSelectionInput): void {
  assertPositive(input.designCurrentA, "designCurrentA");
  assertOneOf(input.phase, [1, 3] as const, "phase");
  assertOneOf(input.mode, ["standard", "detailed"] as const, "mode");
  if (!isCableMethodCode(input.installationMethod)) {
    throw new RangeError(`installationMethod must be one of: ${CABLE_METHOD_CODES.join(", ")}.`);
  }
  assertPositive(input.ambientTemperatureC, "ambientTemperatureC");
  assertPositive(input.groupedCircuits, "groupedCircuits");
  if (!Number.isInteger(input.groupedCircuits)) throw new RangeError("groupedCircuits must be an integer.");
  if (!Number.isFinite(input.thirdHarmonicPercent) || input.thirdHarmonicPercent < 0) {
    throw new RangeError("thirdHarmonicPercent must be ≥ 0.");
  }
  assertPositive(input.voltageDropLimitPercent, "voltageDropLimitPercent");
  if (input.extraCorrectionFactor !== undefined) assertPositive(input.extraCorrectionFactor, "extraCorrectionFactor");
  validateDetailed(input);
}

function validateDetailed(input: CableSelectionInput): void {
  if (input.mode !== "detailed") return;
  const d = input.detailed;
  if (d === undefined) {
    throw new RangeError("detailed mode requires the 'detailed' options block.");
  }
  assertOneOf(d.earthingSystem, ["TN", "TT"] as const, "detailed.earthingSystem");
  assertOneOf(d.circuitRole, ["final", "distribution"] as const, "detailed.circuitRole");
  assertOneOf(d.breakerCurve, ["B", "C", "D"] as const, "detailed.breakerCurve");
  assertOneOf(d.peLocation, ["in-cable", "separate"] as const, "detailed.peLocation");

  if (d.parallelConductors !== undefined) {
    assertPositive(d.parallelConductors, "detailed.parallelConductors");
    if (!Number.isInteger(d.parallelConductors)) {
      throw new RangeError("detailed.parallelConductors must be an integer.");
    }
  }
  if (d.soilThermalResistivityKmPerW !== undefined) {
    assertPositive(d.soilThermalResistivityKmPerW, "detailed.soilThermalResistivityKmPerW");
  }
  if (d.burialDepthM !== undefined) assertPositive(d.burialDepthM, "detailed.burialDepthM");
  if (d.shortCircuit !== undefined) {
    assertPositive(d.shortCircuit.prospectiveFaultKa, "detailed.shortCircuit.prospectiveFaultKa");
    assertPositive(d.shortCircuit.clearingTimeS, "detailed.shortCircuit.clearingTimeS");
  }
  if (d.loopImpedance.method === "calculated") {
    assertPositive(d.loopImpedance.prospectiveEarthFaultKa, "detailed.loopImpedance.prospectiveEarthFaultKa");
  }
  if (d.loopImpedance.method === "measured") {
    if (typeof d.loopImpedance.sourceImpedanceOhm !== "number") {
      throw new RangeError("loopImpedance 'measured' requires sourceImpedanceOhm.");
    }
    assertPositive(d.loopImpedance.sourceImpedanceOhm, "detailed.loopImpedance.sourceImpedanceOhm");
  }
}
