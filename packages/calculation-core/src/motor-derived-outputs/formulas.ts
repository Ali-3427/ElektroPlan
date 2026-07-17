import { calcCurrentFromPowerKW } from "../common/power-to-current.js";
import type { MotorVoltageMode } from "../motor/types.js";

const MAX_INFERRED_POLES = 24;
const RPM_PER_KILOWATT_TO_NEWTON_METER = 9550;

export function calcDerivedCurrent(input: {
  P_out: number;
  phase: 1 | 3;
  voltage: number;
  voltageMode?: MotorVoltageMode;
  cosPhi: number;
  efficiencyPercent: number;
}): number {
  if (input.phase === 1) {
    return calcCurrentFromPowerKW({
      phaseMode: "single-phase",
      powerKW: input.P_out,
      voltageV: input.voltage,
      cosPhi: input.cosPhi,
      efficiencyPercent: input.efficiencyPercent,
    });
  }

  return calcCurrentFromPowerKW({
    phaseMode: input.voltageMode === "LN" ? "three-phase-ln" : "three-phase-ll",
    powerKW: input.P_out,
    voltageV: input.voltage,
    cosPhi: input.cosPhi,
    efficiencyPercent: input.efficiencyPercent,
  });
}

export function calcSynchronousSpeedRpm(frequency: number, poles: number): number {
  return (120 * frequency) / poles;
}

export function calcSlipRatio(synchronousSpeedRpm: number, operatingSpeedRpm: number): number {
  return (synchronousSpeedRpm - operatingSpeedRpm) / synchronousSpeedRpm;
}

export function calcTorqueNm(powerKW: number, speedRpm: number): number {
  return (RPM_PER_KILOWATT_TO_NEWTON_METER * powerKW) / speedRpm;
}

export function isPoleCount(value: number): boolean {
  return Number.isInteger(value) && value >= 2 && value <= MAX_INFERRED_POLES && value % 2 === 0;
}

export function inferPoleCountFromRpm(frequency: number, ratedSpeedRpm: number): number {
  let selectedPoleCount: number | undefined;
  let smallestPositiveDelta = Number.POSITIVE_INFINITY;

  for (let poles = 2; poles <= MAX_INFERRED_POLES; poles += 2) {
    const synchronousSpeedRpm = calcSynchronousSpeedRpm(frequency, poles);
    const delta = synchronousSpeedRpm - ratedSpeedRpm;

    if (delta <= 0 || delta >= smallestPositiveDelta) {
      continue;
    }

    smallestPositiveDelta = delta;
    selectedPoleCount = poles;
  }

  if (selectedPoleCount === undefined) {
    throw new RangeError(
      `polesOrRpm=${ratedSpeedRpm} cannot be resolved to a valid pole count at ${frequency} Hz.`,
    );
  }

  return selectedPoleCount;
}
