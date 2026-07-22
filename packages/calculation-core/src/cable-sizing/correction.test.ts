import { computeCorrection, validateSelectionInput } from "./correction.js";
import type { CableSelectionInput } from "./types.js";

function base(): CableSelectionInput {
  return {
    mode: "standard", designCurrentA: 50, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
  };
}

describe("computeCorrection", () => {
  it("multiplies kT·kG·kH·extra", () => {
    const r = computeCorrection({ ...base(), ambientTemperatureC: 40, groupedCircuits: 4 }, 1);
    expect(r.kT).toBe(0.91);        // XLPE @40C air
    expect(r.kG).toBe(0.65);        // bunched, 4 circuits
    expect(r.kTotal).toBeCloseTo(0.91 * 0.65, 6);
  });
});

describe("validateSelectionInput", () => {
  it("rejects an invalid installation method", () => {
    expect(() => validateSelectionInput({ ...base(), installationMethod: "E" as never }))
      .toThrow("installationMethod must be one of: A1, A2, B1, B2, C, D1, D2.");
  });
  it("rejects non-positive design current", () => {
    expect(() => validateSelectionInput({ ...base(), designCurrentA: 0 })).toThrow();
  });
});
