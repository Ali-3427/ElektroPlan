import {
  calcApparentPowerKVA,
  calcCurrentFromPowerKW,
  calcInputPowerKW,
} from "../common/power-to-current.js";
import type { FormulaModeOutput, MotorVoltageMode } from "./types.js";

export function calcInputPower(
  outputPowerKW: number,
  efficiency: number,
): number {
  return calcInputPowerKW(outputPowerKW, efficiency * 100);
}

export function calcApparentPower(
  inputPowerKW: number,
  cosPhi: number,
): number {
  return calcApparentPowerKVA(inputPowerKW, cosPhi);
}

export function calcSinglePhaseCurrent(
  outputPowerKW: number,
  voltage: number,
  efficiency: number,
  cosPhi: number,
): number {
  return calcCurrentFromPowerKW({
    phaseMode: "single-phase",
    powerKW: outputPowerKW,
    voltageV: voltage,
    cosPhi,
    efficiencyPercent: efficiency * 100,
  });
}

export function calcThreePhaseLineLineCurrent(
  outputPowerKW: number,
  lineToLineVoltage: number,
  efficiency: number,
  cosPhi: number,
): number {
  return calcCurrentFromPowerKW({
    phaseMode: "three-phase-ll",
    powerKW: outputPowerKW,
    voltageV: lineToLineVoltage,
    cosPhi,
    efficiencyPercent: efficiency * 100,
  });
}

export function calcThreePhaseLineNeutralCurrent(
  outputPowerKW: number,
  lineToNeutralVoltage: number,
  efficiency: number,
  cosPhi: number,
): number {
  return calcCurrentFromPowerKW({
    phaseMode: "three-phase-ln",
    powerKW: outputPowerKW,
    voltageV: lineToNeutralVoltage,
    cosPhi,
    efficiencyPercent: efficiency * 100,
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
  const efficiency = input.efficiencyPercent / 100;
  const inputPowerKW = calcInputPower(input.P_out, efficiency);
  const apparentPowerKVA = calcApparentPower(inputPowerKW, input.cosPhi);

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
          efficiency,
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
          efficiency,
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
        efficiency,
        input.cosPhi,
      ),
    },
  };
}
