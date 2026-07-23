import { validateSelectionInput } from "./validate.js";
import type { CableSelectionInput } from "./types.js";

function detailedInput(): CableSelectionInput {
  return {
    mode: "detailed", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
    detailed: {
      earthingSystem: "TN", circuitRole: "final", breakerCurve: "C",
      peLocation: "in-cable", conductorArrangement: "multicore",
      loopImpedance: { method: "estimated" },
    },
  };
}

describe("detailed mode validation", () => {
  it("accepts a complete detailed input", () => {
    expect(() => validateSelectionInput(detailedInput())).not.toThrow();
  });

  it("rejects detailed mode without the detailed block", () => {
    const { detailed, ...rest } = detailedInput();
    expect(() => validateSelectionInput(rest as CableSelectionInput))
      .toThrow("detailed mode requires the 'detailed' options block.");
  });

  it("rejects a non-positive parallelConductors", () => {
    const input = detailedInput();
    expect(() => validateSelectionInput({
      ...input,
      detailed: { ...input.detailed!, parallelConductors: 0 },
    })).toThrow();
  });

  it("rejects measured loop impedance without a source impedance", () => {
    const input = detailedInput();
    expect(() => validateSelectionInput({
      ...input,
      detailed: { ...input.detailed!, loopImpedance: { method: "measured" } as never },
    })).toThrow("loopImpedance 'measured' requires sourceImpedanceOhm.");
  });

  it("still accepts standard mode without the detailed block (regression)", () => {
    const { detailed, ...rest } = detailedInput();
    const input: CableSelectionInput = { ...rest, mode: "standard" as const };
    expect(() => validateSelectionInput(input)).not.toThrow();
  });
});
