import { selectCable } from "./index.js";
import type { CableSelectionInput } from "./types.js";

function detailed(over: Partial<CableSelectionInput> = {}): CableSelectionInput {
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
      shortCircuit: { prospectiveFaultKa: 6, clearingTimeS: 0.1 },
    },
    ...over,
  };
}

describe("selectCable — not-applicable criteria surfaced as warnings", () => {
  it("pushes a criterion-not-verified warning referencing shortCircuit when it is omitted", () => {
    const input = detailed();
    delete input.detailed!.shortCircuit;
    const r = selectCable(input);
    const warning = r.warnings.find((w) => w.code === "criterion-not-verified");
    expect(warning).toBeDefined();
    expect(warning!.messageKey).toBe("cable.criterion.notApplicable");
    expect(warning!.detail).toContain("shortCircuit");
  });

  it("does not push the warning when shortCircuit data is fully specified", () => {
    const r = selectCable(detailed());
    expect(r.warnings.some((w) => w.code === "criterion-not-verified")).toBe(false);
  });
});
