import {
  getCableCrossSections, getCableAmpacityConfidence, getCableAmpacityDataset, type CableAmpacityKey,
  type CableMethodCode, type LoadedConductorCount,
} from "@elektroplan/calculation-data";
import { ENGINE_VERSION } from "../version.js";
import type { WarningEntry } from "../common/types/result.js";
import { validateSelectionInput } from "./validate.js";
import { computeSizingCurrent } from "./sizing-current.js";
import { computeCorrection } from "./correction.js";
import { evaluateCandidate } from "./evaluate-candidate.js";
import type { CableSelectionInput, CableSelectionResult, CandidateEvaluation } from "./types.js";

function loadedConductors(phase: 1 | 3): LoadedConductorCount {
  return phase === 3 ? 3 : 2;
}

function createDataVersion(key: CableAmpacityKey): string {
  const ds = getCableAmpacityDataset(key);
  return `${ds.metadata.id}:${ds.metadata.revision}|confidence=${ds.confidence}`;
}

export function selectCable(input: CableSelectionInput): CableSelectionResult {
  validateSelectionInput(input);

  const sizing = computeSizingCurrent(input.designCurrentA, input.thirdHarmonicPercent);
  const correction = computeCorrection(input, sizing.kH);

  const ampacityKey: CableAmpacityKey = {
    material: input.conductorMaterial,
    insulation: input.insulation,
    loadedConductors: loadedConductors(input.phase),
  };

  const sections = getCableCrossSections(ampacityKey);
  const trace: CandidateEvaluation[] = [];
  const warnings: WarningEntry[] = [];

  if (getCableAmpacityConfidence(ampacityKey) === "draft") {
    warnings.push({
      code: "unverified-data",
      messageKey: "cable.ampacity.draft",
      detail: `${ampacityKey.material}/${ampacityKey.insulation}/${ampacityKey.loadedConductors}`,
    });
  }

  for (const sectionMm2 of sections) {
    const evaluation = evaluateCandidate({
      mode: input.mode, sectionMm2,
      material: input.conductorMaterial, insulation: input.insulation, circuitKind: input.circuitKind,
      ampacityKey, method: input.installationMethod as CableMethodCode,
      kTotal: correction.kTotal, sizingCurrentA: sizing.sizingCurrentA, input,
    });
    trace.push({
      sectionMm2: evaluation.sectionMm2, criteria: evaluation.criteria,
      failedAt: evaluation.failedAt, accepted: evaluation.accepted,
    });
    if (evaluation.accepted && evaluation.vdResult !== null) {
      return {
        value: {
          mode: input.mode,
          selectedSectionMm2: sectionMm2,
          designCurrentA: input.designCurrentA,
          sizingCurrentA: sizing.sizingCurrentA,
          kT: correction.kT, kG: correction.kG, kH: correction.kH, kTotal: correction.kTotal,
          izRequiredA: sizing.sizingCurrentA / correction.kTotal,
          candidateTrace: trace,
          vdResult: evaluation.vdResult,
        },
        warnings,
        assumptions: evaluation.vdResult.assumptions,
        formulaVariant: `cable-sizing-${input.mode}-ascending-scan`,
        dataVersion: createDataVersion(ampacityKey),
        engineVersion: ENGINE_VERSION,
      };
    }
  }

  throw new RangeError("No cable cross-section satisfies the active criteria.");
}
