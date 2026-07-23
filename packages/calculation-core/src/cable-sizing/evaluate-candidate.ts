import {
  ACTIVE_CRITERIA,
  type CableSizingMode, type CableSelectionInput, type CandidateEvaluation,
  type CriterionId, type CriterionOutcome, type CircuitKind, type SelectedDevice,
} from "./types.js";
import { evaluateMechanical } from "./criteria/mechanical-min.js";
import { evaluateThermal } from "./criteria/thermal.js";
import { evaluateVoltageDrop } from "./criteria/voltage-drop.js";
import { evaluateDeviceCoordination } from "./criteria/device-coordination.js";
import { evaluatePeConductor } from "./criteria/pe-conductor.js";
import { evaluateShortCircuit } from "./criteria/short-circuit.js";
import { evaluateLoopImpedance } from "./criteria/loop-impedance.js";
import { evaluateNeutralConductor } from "./criteria/neutral-conductor.js";
import { getMaxDisconnectionTime } from "@elektroplan/calculation-data";
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
  device: SelectedDevice | null;
  peSectionMm2: number | null;
  neutralSectionMm2: number | null;
}

/** Values produced by earlier criteria and consumed by later ones. */
interface ChainState {
  izCorrectedA: number | null;
  device: SelectedDevice | null;
  peSectionMm2: number | null;
  neutralSectionMm2: number | null;
  vdResult: VoltageDropResult | null;
}

function runCriterion(
  id: CriterionId,
  ctx: CandidateContext,
  state: ChainState,
): CriterionOutcome {
  const detailed = ctx.input.detailed;

  if (id === "mechanical") {
    return evaluateMechanical(ctx.sectionMm2, ctx.material, ctx.circuitKind);
  }

  if (id === "thermal") {
    const outcome = evaluateThermal({
      key: ctx.ampacityKey, sectionMm2: ctx.sectionMm2, method: ctx.method,
      kTotal: ctx.kTotal, sizingCurrentA: ctx.sizingCurrentA,
    });
    const iz = outcome.detail.izCorrectedA;
    state.izCorrectedA = typeof iz === "number" ? iz : null;
    return outcome;
  }

  if (id === "device") {
    if (detailed === undefined || state.izCorrectedA === null) {
      return { id, status: "skipped", detail: { reason: "no-detailed-options-or-ampacity" } };
    }
    const r = evaluateDeviceCoordination({
      designCurrentA: ctx.input.designCurrentA,
      izCorrectedA: state.izCorrectedA,
      curve: detailed.breakerCurve,
      enforce: ctx.mode === "detailed",
    });
    state.device = r.device;
    return r.outcome;
  }

  if (id === "voltageDrop") {
    const r = evaluateVoltageDrop({
      sectionMm2: ctx.sectionMm2, material: ctx.material,
      insulation: ctx.insulation, input: ctx.input,
    });
    state.vdResult = r.vdResult;
    return r.outcome;
  }

  if (id === "pe") {
    if (detailed === undefined) {
      return { id, status: "skipped", detail: { reason: "no-detailed-options" } };
    }
    const fault =
      detailed.shortCircuit === undefined
        ? null
        : {
            earthFaultA: detailed.shortCircuit.prospectiveFaultKa * 1000,
            clearingTimeS: detailed.shortCircuit.clearingTimeS,
          };
    const r = evaluatePeConductor({
      sectionMm2: ctx.sectionMm2, material: ctx.material, insulation: ctx.insulation,
      peLocation: detailed.peLocation, ampacityKey: ctx.ampacityKey, fault,
    });
    state.peSectionMm2 = r.peSectionMm2;
    return r.outcome;
  }

  if (id === "shortCircuit") {
    if (detailed === undefined) {
      return { id, status: "skipped", detail: { reason: "no-detailed-options" } };
    }
    return evaluateShortCircuit({
      sectionMm2: ctx.sectionMm2, material: ctx.material, insulation: ctx.insulation,
      deviceId: state.device?.id ?? null,
      manual: detailed.shortCircuit ?? null,
    }).outcome;
  }

  if (id === "loopImpedance") {
    if (detailed === undefined) {
      return { id, status: "skipped", detail: { reason: "no-detailed-options" } };
    }
    const u0V = ctx.input.voltageDrop.baseVoltageV;
    return evaluateLoopImpedance({
      sectionMm2: ctx.sectionMm2,
      peSectionMm2: state.peSectionMm2,
      material: ctx.material,
      insulation: ctx.insulation,
      lengthM: ctx.input.voltageDrop.lengthM,
      u0V,
      nominalCurrentA: state.device?.nominalCurrentA ?? null,
      curve: detailed.breakerCurve,
      arrangement: detailed.conductorArrangement,
      parallelConductors: detailed.parallelConductors ?? 1,
      source: detailed.loopImpedance,
      maxDisconnectionS:
        getMaxDisconnectionTime({
          system: detailed.earthingSystem,
          circuitRole: detailed.circuitRole,
          u0V,
        }) ?? null,
    }).outcome;
  }

  const neutral = evaluateNeutralConductor({
    sectionMm2: ctx.sectionMm2,
    phase: ctx.input.phase,
    thirdHarmonicPercent: ctx.input.thirdHarmonicPercent,
    material: ctx.material,
  });
  state.neutralSectionMm2 = neutral.neutralSectionMm2;
  return neutral.outcome;
}

export function evaluateCandidate(ctx: CandidateContext): CandidateResult {
  const criteria: CriterionOutcome[] = [];
  const state: ChainState = {
    izCorrectedA: null, device: null, peSectionMm2: null,
    neutralSectionMm2: null, vdResult: null,
  };
  let failedAt: CriterionId | null = null;

  for (const id of ACTIVE_CRITERIA[ctx.mode]) {
    const outcome = runCriterion(id, ctx, state);
    criteria.push(outcome);
    if (outcome.status === "fail") {
      failedAt = id;
      break;
    }
    // "skipped" rejects the candidate (accepted stays false) but does not
    // short-circuit the loop and does not set failedAt.
  }

  const accepted =
    failedAt === null &&
    criteria.every((c) => c.status === "pass" || c.status === "not-applicable");

  return {
    sectionMm2: ctx.sectionMm2,
    criteria,
    failedAt,
    accepted,
    vdResult: state.vdResult,
    device: state.device,
    peSectionMm2: state.peSectionMm2,
    neutralSectionMm2: state.neutralSectionMm2,
  };
}
