import {
  ACTIVE_CRITERIA,
  type CableSizingMode,
  type CableSelectionInput,
  type CandidateEvaluation,
  type CriterionId,
  type CriterionOutcome,
  type CircuitKind,
} from "./types.js";
import { evaluateMechanical } from "./criteria/mechanical-min.js";
import { evaluateThermal } from "./criteria/thermal.js";
import { evaluateVoltageDrop } from "./criteria/voltage-drop.js";
import type { CableAmpacityKey, CableMethodCode } from "@elektroplan/calculation-data";
import type { VoltageDropResult } from "../voltage-drop/index.js";

export interface CandidateContext {
  mode: CableSizingMode;
  sectionMm2: number;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  circuitKind: CircuitKind;
  ampacityKey: CableAmpacityKey;
  method: CableMethodCode;
  kTotal: number;
  sizingCurrentA: number;
  input: CableSelectionInput;
}

export interface CandidateResult extends CandidateEvaluation {
  vdResult: VoltageDropResult | null;
}

export function evaluateCandidate(ctx: CandidateContext): CandidateResult {
  const criteria: CriterionOutcome[] = [];
  let failedAt: CriterionId | null = null;
  let vdResult: VoltageDropResult | null = null;

  for (const id of ACTIVE_CRITERIA[ctx.mode]) {
    let outcome: CriterionOutcome;
    if (id === "mechanical") {
      outcome = evaluateMechanical(ctx.sectionMm2, ctx.material, ctx.circuitKind);
    } else if (id === "thermal") {
      outcome = evaluateThermal({
        key: ctx.ampacityKey,
        sectionMm2: ctx.sectionMm2,
        method: ctx.method,
        kTotal: ctx.kTotal,
        sizingCurrentA: ctx.sizingCurrentA,
      });
    } else if (id === "voltageDrop") {
      const r = evaluateVoltageDrop({
        sectionMm2: ctx.sectionMm2,
        material: ctx.material,
        insulation: ctx.insulation,
        input: ctx.input,
      });
      outcome = r.outcome;
      vdResult = r.vdResult;
    } else {
      // Plan B criteria (device, pe, shortCircuit, loopImpedance, neutral):
      // no evaluator exists yet, so they always resolve as not-applicable.
      outcome = { id, status: "not-applicable", detail: {} };
    }
    criteria.push(outcome);
    if (outcome.status === "fail") {
      failedAt = id;
      break;
    }
    if (outcome.status === "skipped") {
      // Skipped rejects the candidate (accepted stays false) but does not
      // short-circuit the loop and does not set failedAt.
      continue;
    }
  }

  const accepted =
    failedAt === null &&
    criteria.every((c) => c.status === "pass" || c.status === "not-applicable");

  return { sectionMm2: ctx.sectionMm2, criteria, failedAt, accepted, vdResult };
}
