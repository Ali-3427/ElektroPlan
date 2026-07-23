import {
  getResistance20, getReactance, getTripMultiplier,
  type ConductorArrangement,
} from "@elektroplan/calculation-data";
import { ALPHA_ALUMINUM_20, ALPHA_COPPER_20 } from "../../common/constants/index.js";
import type { CriterionOutcome, LoopImpedanceSource } from "../types.js";

const MAX_TEMP_C = { PVC: 70, "XLPE/EPR": 90 } as const;
/** IEC 60364-4-41 estimate: 80 % of U0 is assumed available at the cable origin. */
const ESTIMATED_SOURCE_FRACTION = 0.2;

export interface LoopArgs {
  sectionMm2: number;
  peSectionMm2: number | null;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  lengthM: number;
  u0V: number;
  nominalCurrentA: number | null;
  curve: "B" | "C" | "D";
  arrangement: ConductorArrangement;
  parallelConductors: number;
  source: LoopImpedanceSource;
  /** Reported for traceability; the instantaneous Ia already clears well inside it. */
  maxDisconnectionS: number | null;
}

function alpha(material: "copper" | "aluminum"): number {
  return material === "copper" ? ALPHA_COPPER_20 : ALPHA_ALUMINUM_20;
}

/** Ω/km at the insulation's maximum operating temperature. */
function impedanceOhmPerKm(
  sectionMm2: number,
  args: LoopArgs,
): { r: number; x: number } | null {
  const r20 = getResistance20(args.material, sectionMm2);
  if (r20 === null || r20 === undefined) return null;
  const theta = MAX_TEMP_C[args.insulation];
  const r = r20 * (1 + alpha(args.material) * (theta - 20));
  const x = getReactance(args.arrangement, sectionMm2) ?? 0;
  return { r, x };
}

function sourceImpedance(args: LoopArgs, iaA: number): number {
  if (args.source.method === "measured") return args.source.sourceImpedanceOhm;
  if (args.source.method === "calculated") {
    return args.u0V / (args.source.prospectiveEarthFaultKa * 1000);
  }
  return (ESTIMATED_SOURCE_FRACTION * args.u0V) / iaA;
}

export function evaluateLoopImpedance(args: LoopArgs): { outcome: CriterionOutcome } {
  if (args.nominalCurrentA === null) {
    return {
      outcome: { id: "loopImpedance", status: "skipped", detail: { reason: "no-device-selected" } },
    };
  }
  if (args.peSectionMm2 === null) {
    return {
      outcome: { id: "loopImpedance", status: "skipped", detail: { reason: "no-pe-section" } },
    };
  }

  const multiplier = getTripMultiplier(args.curve);
  if (multiplier === undefined) {
    return {
      outcome: { id: "loopImpedance", status: "skipped", detail: { reason: "no-trip-multiplier" } },
    };
  }

  const phase = impedanceOhmPerKm(args.sectionMm2, args);
  const pe = impedanceOhmPerKm(args.peSectionMm2, args);
  if (phase === null || pe === null) {
    return {
      outcome: { id: "loopImpedance", status: "skipped", detail: { reason: "no-impedance-data" } },
    };
  }

  const iaA = multiplier.design * args.nominalCurrentA;
  const zPhase = Math.hypot(phase.r, phase.x) / args.parallelConductors;
  const zPe = Math.hypot(pe.r, pe.x) / args.parallelConductors;
  const zSourceOhm = sourceImpedance(args, iaA);
  const zsOhm = zSourceOhm + ((zPhase + zPe) * args.lengthM) / 1000;
  const zMaxOhm = args.u0V / iaA;
  const lMaxM = ((zMaxOhm - zSourceOhm) / (zPhase + zPe)) * 1000;

  return {
    outcome: {
      id: "loopImpedance",
      status: zsOhm * iaA <= args.u0V ? "pass" : "fail",
      detail: {
        iaA, zsOhm, zMaxOhm, zSourceOhm, lMaxM,
        method: args.source.method,
        maxDisconnectionS: args.maxDisconnectionS,
      },
    },
  };
}
