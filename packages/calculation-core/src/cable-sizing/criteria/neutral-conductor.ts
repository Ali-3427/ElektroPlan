import type { CriterionOutcome } from "../types.js";

/** IEC 60364-5-52 §524: full-size neutral is mandatory at or below these sections. */
const FULL_NEUTRAL_LIMIT_MM2 = { copper: 16, aluminum: 25 } as const;
const HARMONIC_FULL_NEUTRAL_PERCENT = 33;

export interface NeutralArgs {
  sectionMm2: number;
  phase: 1 | 3;
  thirdHarmonicPercent: number;
  material: "copper" | "aluminum";
}

export function evaluateNeutralConductor(args: NeutralArgs): {
  outcome: CriterionOutcome;
  neutralSectionMm2: number;
} {
  let neutralSectionMm2 = args.sectionMm2;
  let basis = "single-phase";

  if (args.phase === 3) {
    if (args.thirdHarmonicPercent > HARMONIC_FULL_NEUTRAL_PERCENT) {
      basis = "harmonic-driven";
    } else if (args.sectionMm2 <= FULL_NEUTRAL_LIMIT_MM2[args.material]) {
      basis = "small-section";
    } else {
      neutralSectionMm2 = args.sectionMm2 / 2;
      basis = "reduced-balanced";
    }
  }

  return {
    outcome: {
      id: "neutral",
      status: "pass",
      detail: { neutralSectionMm2, basis, phaseSectionMm2: args.sectionMm2 },
    },
    neutralSectionMm2,
  };
}
