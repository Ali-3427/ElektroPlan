import {
  calcCurrentFromPowerKW,
  type PowerToCurrentPhaseMode,
} from "../common/power-to-current.js";
import type { VoltageDropInput, VoltageDropSystemType } from "./types.js";

function toPhaseMode(systemType: VoltageDropSystemType): PowerToCurrentPhaseMode {
  if (systemType === "dc-two-conductor") {
    return "dc";
  }

  if (systemType === "single-phase-ac-two-conductor") {
    return "single-phase";
  }

  if (systemType === "three-phase-ac-ll") {
    return "three-phase-ll";
  }

  return "three-phase-ln";
}

export function calculateCurrentFromPower(
  systemType: VoltageDropSystemType,
  powerKW: number,
  baseVoltageV: number,
  cosPhi?: number,
): number {
  if (systemType !== "dc-two-conductor" && cosPhi === undefined) {
    throw new RangeError("cosPhi is required for AC power mode.");
  }

  return calcCurrentFromPowerKW({
    phaseMode: toPhaseMode(systemType),
    powerKW,
    voltageV: baseVoltageV,
    ...(cosPhi === undefined ? {} : { cosPhi }),
  });
}

export function deriveCurrentForVoltageDrop(input: VoltageDropInput): number {
  if (input.mode === "current") {
    return input.currentA;
  }

  return calculateCurrentFromPower(
    input.systemType,
    input.powerKW,
    input.baseVoltageV,
    input.cosPhi,
  );
}
