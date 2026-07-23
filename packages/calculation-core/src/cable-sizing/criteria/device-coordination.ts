import { lookupProtectionDevice } from "@elektroplan/calculation-data";
import type { ProtectionDeviceCurve } from "@elektroplan/calculation-data";
import type { CriterionOutcome, SelectedDevice } from "../types.js";

const I2_LIMIT_FACTOR = 1.45; // IEC 60364-4-43 §433.1: I2 ≤ 1.45 · Iz

export interface DeviceArgs {
  designCurrentA: number;
  izCorrectedA: number;
  curve: ProtectionDeviceCurve;
  /** true in detailed mode (gate), false in standard mode (advisory only). */
  enforce: boolean;
}

export function evaluateDeviceCoordination(args: DeviceArgs): {
  outcome: CriterionOutcome;
  device: SelectedDevice | null;
} {
  const candidates = lookupProtectionDevice({
    minimumNominalCurrentA: args.designCurrentA,
    families: ["MCB"],
    curve: args.curve,
  });

  const fitting = candidates.find((c) => {
    const i2 = c.nominalCurrentA * c.i2Multiplier;
    return (
      c.nominalCurrentA <= args.izCorrectedA &&
      i2 <= I2_LIMIT_FACTOR * args.izCorrectedA
    );
  });

  if (fitting === undefined) {
    return {
      outcome: {
        id: "device",
        status: args.enforce ? "fail" : "pass",
        detail: {
          coordinated: "no",
          reason: "no-device-between-ib-and-iz",
          designCurrentA: args.designCurrentA,
          izCorrectedA: args.izCorrectedA,
        },
      },
      device: null,
    };
  }

  const i2A = fitting.nominalCurrentA * fitting.i2Multiplier;
  return {
    outcome: {
      id: "device",
      status: "pass",
      detail: {
        coordinated: "yes",
        nominalCurrentA: fitting.nominalCurrentA,
        i2A,
        i2LimitA: I2_LIMIT_FACTOR * args.izCorrectedA,
      },
    },
    device: {
      id: fitting.id,
      nominalCurrentA: fitting.nominalCurrentA,
      curve: fitting.curve,
      family: fitting.family,
      i2A,
    },
  };
}
