import {
  calcApparentPowerKVA,
  calcCurrentFromPowerKW,
  calcInputPowerKW,
} from "../common/power-to-current.js";
import type { FormulaModeOutput, MotorVoltageMode } from "./types.js";

export function calcSinglePhaseCurrent(
  outputPowerKW: number,
  voltage: number,
  efficiencyPercent: number,
  cosPhi: number,
): number {
  return calcCurrentFromPowerKW({
    phaseMode: "single-phase",
    powerKW: outputPowerKW,
    voltageV: voltage,
    cosPhi,
    efficiencyPercent,
  });
}

export function calcThreePhaseLineLineCurrent(
  outputPowerKW: number,
  lineToLineVoltage: number,
  efficiencyPercent: number,
  cosPhi: number,
): number {
  return calcCurrentFromPowerKW({
    phaseMode: "three-phase-ll",
    powerKW: outputPowerKW,
    voltageV: lineToLineVoltage,
    cosPhi,
    efficiencyPercent,
  });
}

export function calcThreePhaseLineNeutralCurrent(
  outputPowerKW: number,
  lineToNeutralVoltage: number,
  efficiencyPercent: number,
  cosPhi: number,
): number {
  return calcCurrentFromPowerKW({
    phaseMode: "three-phase-ln",
    powerKW: outputPowerKW,
    voltageV: lineToNeutralVoltage,
    cosPhi,
    efficiencyPercent,
  });
}

export function calculateMotorFormula(input: {
  phase: 1 | 3;
  P_out: number;
  voltage: number;
  cosPhi: number;
  efficiencyPercent: number;
  voltageMode?: MotorVoltageMode;
}): { value: FormulaModeOutput; formulaVariant: string } {
  const inputPowerKW = calcInputPowerKW(input.P_out, input.efficiencyPercent);
  const apparentPowerKVA = calcApparentPowerKVA(inputPowerKW, input.cosPhi);

  if (input.phase === 1) {
    return {
      formulaVariant: "single-phase",
      value: {
        mode: "formula",
        phase: 1,
        voltage: input.voltage,
        P_out: input.P_out,
        cosPhi: input.cosPhi,
        efficiencyPercent: input.efficiencyPercent,
        inputPowerKW,
        apparentPowerKVA,
        currentA: calcSinglePhaseCurrent(
          input.P_out,
          input.voltage,
          input.efficiencyPercent,
          input.cosPhi,
        ),
      },
    };
  }

  if (input.voltageMode === "LL") {
    return {
      formulaVariant: "three-phase-LL",
      value: {
        mode: "formula",
        phase: 3,
        voltage: input.voltage,
        voltageMode: "LL",
        P_out: input.P_out,
        cosPhi: input.cosPhi,
        efficiencyPercent: input.efficiencyPercent,
        inputPowerKW,
        apparentPowerKVA,
        currentA: calcThreePhaseLineLineCurrent(
          input.P_out,
          input.voltage,
          input.efficiencyPercent,
          input.cosPhi,
        ),
      },
    };
  }

  return {
    formulaVariant: "three-phase-LN",
    value: {
      mode: "formula",
      phase: 3,
      voltage: input.voltage,
      voltageMode: "LN",
      P_out: input.P_out,
      cosPhi: input.cosPhi,
      efficiencyPercent: input.efficiencyPercent,
      inputPowerKW,
      apparentPowerKVA,
      currentA: calcThreePhaseLineNeutralCurrent(
        input.P_out,
        input.voltage,
        input.efficiencyPercent,
        input.cosPhi,
      ),
    },
  };
}
