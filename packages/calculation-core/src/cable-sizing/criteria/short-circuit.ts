import { getAdiabaticK, getLetThroughI2t } from "@elektroplan/calculation-data";
import type { CriterionOutcome } from "../types.js";

export interface ShortCircuitArgs {
  sectionMm2: number;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  deviceId: string | null;
  manual: { prospectiveFaultKa: number; clearingTimeS: number } | null;
}

export function evaluateShortCircuit(args: ShortCircuitArgs): { outcome: CriterionOutcome } {
  const k = getAdiabaticK({
    material: args.material,
    insulation: args.insulation,
    role: "line",
    sectionMm2: args.sectionMm2,
  });
  if (k === undefined) {
    return { outcome: { id: "shortCircuit", status: "skipped", detail: { reason: "no-adiabatic-k" } } };
  }

  // Prefer catalog let-through energy; fall back to manual Isc²·t.
  const catalogI2t =
    args.deviceId === null || args.manual === null
      ? null
      : getLetThroughI2t(args.deviceId, args.manual.prospectiveFaultKa);

  const manualI2t =
    args.manual === null
      ? null
      : (args.manual.prospectiveFaultKa * 1000) ** 2 * args.manual.clearingTimeS;

  const i2t = catalogI2t ?? manualI2t;
  if (i2t === null) {
    return {
      outcome: { id: "shortCircuit", status: "not-applicable", detail: { reason: "no-fault-energy-data" } },
    };
  }

  const withstand = k ** 2 * args.sectionMm2 ** 2;
  const energyRatio = i2t / withstand;
  const sMinMm2 = Math.sqrt(i2t) / k;

  return {
    outcome: {
      id: "shortCircuit",
      status: energyRatio <= 1 ? "pass" : "fail",
      detail: {
        i2tA2s: i2t,
        withstandA2s: withstand,
        energyRatio,
        sMinMm2,
        kUsed: k,
        source: catalogI2t === null ? "manual-isc-t" : "catalog-let-through",
      },
    },
  };
}
