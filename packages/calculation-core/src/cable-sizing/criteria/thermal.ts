import { getCableAmpacity } from "@elektroplan/calculation-data";
import type { CableAmpacityKey, CableMethodCode } from "@elektroplan/calculation-data";
import type { CriterionOutcome } from "../types.js";

export interface ThermalArgs {
  key: CableAmpacityKey;
  sectionMm2: number;
  method: CableMethodCode;
  kTotal: number;
  sizingCurrentA: number;
}

export function evaluateThermal(args: ThermalArgs): CriterionOutcome {
  const base = getCableAmpacity(args.key, args.sectionMm2, args.method);
  if (base === undefined || base === null) {
    return {
      id: "thermal",
      status: "skipped",
      detail: { reason: "no-ampacity-cell", sectionMm2: args.sectionMm2 },
    };
  }
  const izCorrectedA = base * args.kTotal;
  return {
    id: "thermal",
    status: izCorrectedA >= args.sizingCurrentA ? "pass" : "fail",
    detail: { baseAmpacityA: base, izCorrectedA, sizingCurrentA: args.sizingCurrentA },
  };
}
