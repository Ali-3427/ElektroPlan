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

function buried(over: Partial<CableSelectionInput> = {}): CableSelectionInput {
  return {
    mode: "detailed", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "D1",
    ambientTemperatureC: 20, groupedCircuits: 1, groupingArrangement: "buried-in-ducts",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
    detailed: {
      earthingSystem: "TN", circuitRole: "final", breakerCurve: "C",
      peLocation: "in-cable", conductorArrangement: "multicore",
      loopImpedance: { method: "estimated" },
      soilThermalResistivityKmPerW: 1.0,
    },
    ...over,
  };
}

describe("computeCorrection with kS/kD", () => {
  it("applies the soil resistivity factor on buried methods", () => {
    const input = buried();
    // buried-in-ducts kG at 1 circuit is not tabulated; use 2 circuits
    const r = computeCorrection({ ...input, groupedCircuits: 2 }, 1);
    expect(r.kS).toBe(1.18);
    expect(r.kTotal).toBeCloseTo(r.kT * r.kG * r.kH * r.kS * r.kD, 9);
  });

  it("keeps kS = 1 on non-buried methods", () => {
    const r = computeCorrection({ ...buried(), installationMethod: "C", groupingArrangement: "bunched" }, 1);
    expect(r.kS).toBe(1);
  });

  it("always returns kD = 1 and records an assumption when a depth is given", () => {
    const input = buried();
    const r = computeCorrection({
      ...input, groupedCircuits: 2,
      detailed: { ...input.detailed!, burialDepthM: 1.5 },
    }, 1);
    expect(r.kD).toBe(1);
    expect(r.assumptions.some((a) => a.field === "kD" && a.source === "estimated")).toBe(true);
  });
});
