import { calculateVoltageDrop, type VoltageDropResult } from "../../voltage-drop/index.js";
import { getReactance } from "@elektroplan/calculation-data";
import type { CableSelectionInput, CriterionOutcome } from "../types.js";

const MAX_TEMP_C = { PVC: 70, "XLPE/EPR": 90 } as const;

export interface VoltageDropArgs {
  sectionMm2: number;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  input: CableSelectionInput;
}

export function evaluateVoltageDrop(args: VoltageDropArgs): {
  outcome: CriterionOutcome;
  vdResult: VoltageDropResult;
} {
  const reactance = getReactance("multicore", args.sectionMm2);
  const vdResult = calculateVoltageDrop({
    mode: "current",
    currentA: args.input.designCurrentA,
    systemType: args.input.voltageDrop.systemType,
    impedanceMode: "exact-ac",
    conductorMaterial: args.material,
    lengthM: args.input.voltageDrop.lengthM,
    sectionMm2: args.sectionMm2,
    baseVoltageV: args.input.voltageDrop.baseVoltageV,
    cosPhi: args.input.voltageDrop.cosPhi,
    conductorTempC: MAX_TEMP_C[args.insulation],
    ...(typeof reactance === "number" ? { reactanceOhmPerKm: reactance } : {}),
  });
  const pass = vdResult.value.deltaVPercent <= args.input.voltageDropLimitPercent;
  return {
    outcome: {
      id: "voltageDrop",
      status: pass ? "pass" : "fail",
      detail: {
        deltaVPercent: vdResult.value.deltaVPercent,
        deltaVVolts: vdResult.value.deltaVVolts,
        limitPercent: args.input.voltageDropLimitPercent,
      },
    },
    vdResult,
  };
}
