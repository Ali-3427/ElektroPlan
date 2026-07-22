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
}
