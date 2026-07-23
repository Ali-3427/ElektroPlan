import { evaluateCandidate } from "./evaluate-candidate.js";
import type { CableSelectionInput, CriterionOutcome } from "./types.js";

function ctx(sectionMm2: number, over: Partial<CableSelectionInput> = {}) {
  const input: CableSelectionInput = {
    mode: "standard", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 150, baseVoltageV: 400, cosPhi: 0.9 },
    ...over,
  };
  return {
    mode: input.mode, sectionMm2, material: "copper" as const, insulation: "XLPE/EPR" as const,
    circuitKind: "power" as const,
    ampacityKey: { material: "copper" as const, insulation: "XLPE/EPR" as const, loadedConductors: 3 as const },
    method: "C" as const, kTotal: 1, sizingCurrentA: 60, input,
  };
}

describe("evaluateCandidate (standard mode)", () => {
  it("runs only the three standard criteria", () => {
    const e = evaluateCandidate(ctx(16));
    expect(e.criteria.map((c: CriterionOutcome) => c.id)).toEqual(["mechanical", "thermal", "voltageDrop"]);
  });
  it("stops at the first failing criterion and records failedAt", () => {
    const e = evaluateCandidate(ctx(10)); // thermal passes, VD fails at 150 m
    expect(e.failedAt).toBe("voltageDrop");
    expect(e.accepted).toBe(false);
  });
  it("accepts when all active criteria pass", () => {
    const e = evaluateCandidate(ctx(16));
    expect(e.accepted).toBe(true);
    expect(e.failedAt).toBeNull();
  });
});
