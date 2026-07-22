import { evaluateVoltageDrop } from "./voltage-drop.js";
import type { CableSelectionInput } from "../types.js";

function input(): CableSelectionInput {
  return {
    mode: "standard",
    designCurrentA: 60,
    phase: 3,
    circuitKind: "power",
    conductorMaterial: "copper",
    insulation: "XLPE/EPR",
    installationMethod: "C",
    ambientTemperatureC: 30,
    groupedCircuits: 1,
    groupingArrangement: "bunched",
    thirdHarmonicPercent: 0,
    voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 150, baseVoltageV: 400, cosPhi: 0.9 },
  };
}

describe("voltage-drop criterion", () => {
  it("fails a long thin run and passes a thicker one", () => {
    const thin = evaluateVoltageDrop({ sectionMm2: 10, material: "copper", insulation: "XLPE/EPR", input: input() });
    const thick = evaluateVoltageDrop({ sectionMm2: 16, material: "copper", insulation: "XLPE/EPR", input: input() });
    expect(thin.outcome.status).toBe("fail");
    expect(thick.outcome.status).toBe("pass");
  });

  it("uses maximum conductor temperature (theta = 90C for XLPE)", () => {
    const r = evaluateVoltageDrop({ sectionMm2: 16, material: "copper", insulation: "XLPE/EPR", input: input() });
    expect(r.vdResult.value.conductorTempC).toBe(90);
  });
});
