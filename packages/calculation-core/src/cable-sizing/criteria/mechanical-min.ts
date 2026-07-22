import { getMinimumSection } from "@elektroplan/calculation-data";
import type { CriterionOutcome, CircuitKind } from "../types.js";

export function evaluateMechanical(
  sectionMm2: number,
  material: "copper" | "aluminum",
  circuitKind: CircuitKind,
): CriterionOutcome {
  const min = getMinimumSection(circuitKind, material);
  if (min === undefined) {
    return { id: "mechanical", status: "skipped", detail: { reason: "no-minimum-data" } };
  }
  return {
    id: "mechanical",
    status: sectionMm2 >= min ? "pass" : "fail",
    detail: { minRequiredMm2: min, sectionMm2 },
  };
}
