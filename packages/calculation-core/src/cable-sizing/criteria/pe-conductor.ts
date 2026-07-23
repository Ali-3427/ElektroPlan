import {
  getAdiabaticK, getPeSectionByTable, getCableCrossSections,
  type CableAmpacityKey,
} from "@elektroplan/calculation-data";
import type { CriterionOutcome } from "../types.js";

export interface PeArgs {
  sectionMm2: number;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  peLocation: "in-cable" | "separate";
  ampacityKey: CableAmpacityKey;
  fault: { earthFaultA: number; clearingTimeS: number } | null;
}

function nextStandardSection(minimumMm2: number, sections: readonly number[]): number | null {
  return sections.find((s) => s >= minimumMm2) ?? null;
}

export function evaluatePeConductor(args: PeArgs): {
  outcome: CriterionOutcome;
  peSectionMm2: number | null;
} {
  const byTable = getPeSectionByTable(args.sectionMm2);
  const role = args.peLocation === "separate" ? "pe-bunched" : "line";
  const k = getAdiabaticK({
    material: args.material,
    insulation: args.insulation,
    role,
    sectionMm2: args.sectionMm2,
  });

  if (k === undefined) {
    return {
      outcome: { id: "pe", status: "skipped", detail: { reason: "no-adiabatic-k" } },
      peSectionMm2: null,
    };
  }

  const byAdiabatic =
    args.fault === null
      ? 0
      : Math.sqrt(args.fault.earthFaultA ** 2 * args.fault.clearingTimeS) / k;

  const required = Math.max(byTable, byAdiabatic);
  const sections = getCableCrossSections(args.ampacityKey);
  const peSectionMm2 = nextStandardSection(required, sections);

  if (peSectionMm2 === null) {
    return {
      outcome: {
        id: "pe",
        status: "fail",
        detail: { reason: "no-standard-section-for-pe", requiredMm2: required, kUsed: k },
      },
      peSectionMm2: null,
    };
  }

  return {
    outcome: {
      id: "pe",
      status: "pass",
      detail: {
        byTableMm2: byTable,
        byAdiabaticMm2: byAdiabatic,
        peSectionMm2,
        kUsed: k,
        faultDataUsed: args.fault === null ? "no" : "yes",
      },
    },
    peSectionMm2,
  };
}
