import { SQRT3, THREE_PHASE_COUNT } from "./constants/index.js";

export type PowerToCurrentPhaseMode =
  | "dc"
  | "single-phase"
  | "three-phase-ll"
  | "three-phase-ln";

export function calcInputPowerKW(outputPowerKW: number, efficiencyPercent: number): number {
  return outputPowerKW / (efficiencyPercent / 100);
}

export function calcApparentPowerKVA(inputPowerKW: number, cosPhi: number): number {
  return inputPowerKW / cosPhi;
}

function getPhaseMultiplier(phaseMode: PowerToCurrentPhaseMode): number {
  if (phaseMode === "three-phase-ll") {
    return SQRT3;
  }

  if (phaseMode === "three-phase-ln") {
    return THREE_PHASE_COUNT;
  }

  return 1;
}

export function calcCurrentFromPowerKW(input: {
  readonly phaseMode: PowerToCurrentPhaseMode;
  readonly powerKW: number;
  readonly voltageV: number;
  readonly cosPhi?: number;
  readonly efficiencyPercent?: number;
}): number {
  const efficiency = (input.efficiencyPercent ?? 100) / 100;

  if (input.phaseMode === "dc") {
    return (1000 * input.powerKW) / (input.voltageV * efficiency);
  }

  if (input.cosPhi === undefined) {
    throw new RangeError("cosPhi is required for AC current-from-power calculations.");
  }

  const phaseMultiplier = getPhaseMultiplier(input.phaseMode);
  return (1000 * input.powerKW) / (phaseMultiplier * input.voltageV * efficiency * input.cosPhi);
}
