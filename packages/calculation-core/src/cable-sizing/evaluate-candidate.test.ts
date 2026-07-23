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

// NOTE: designCurrentA/sizingCurrentA are 22 A rather than the 60 A used in the
// task brief's Step 1 listing. The v1 seed protection catalog
// (packages/calculation-data/src/iec/protection-catalog/data.json) only carries
// MCB curve-C devices up to 32 A — lookupProtectionDevice(minimumNominalCurrentA:
// 60, families: ["MCB"], curve: "C") returns no candidates, which fails "device"
// and short-circuits the chain before pe/shortCircuit/loopImpedance/neutral ever
// run. 22 A is the same design current already proven to resolve to a 25 A MCB
// in criteria/device-coordination.test.ts, so it exercises the full 8-criterion
// chain against real (not synthetic) catalog data. See task-13-report.md.
function detailedCtx(sectionMm2: number) {
  const input: CableSelectionInput = {
    mode: "detailed", designCurrentA: 22, phase: 3, circuitKind: "power",
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
  };
  return {
    mode: input.mode, sectionMm2, material: "copper" as const, insulation: "XLPE/EPR" as const,
    circuitKind: "power" as const,
    ampacityKey: { material: "copper" as const, insulation: "XLPE/EPR" as const, loadedConductors: 3 as const },
    method: "C" as const, kTotal: 1, sizingCurrentA: 22, input,
  };
}

describe("evaluateCandidate (detailed mode)", () => {
  it("runs all eight criteria in dependency order", () => {
    const e = evaluateCandidate(detailedCtx(25));
    expect(e.criteria.map((c) => c.id)).toEqual([
      "mechanical", "thermal", "device", "voltageDrop",
      "pe", "shortCircuit", "loopImpedance", "neutral",
    ]);
  });

  it("threads the selected device into later criteria", () => {
    const e = evaluateCandidate(detailedCtx(25));
    expect(e.device?.nominalCurrentA).toBeGreaterThanOrEqual(22);
    const loop = e.criteria.find((c) => c.id === "loopImpedance");
    expect(loop?.status).not.toBe("skipped");
  });

  it("exposes PE and neutral sections", () => {
    const e = evaluateCandidate(detailedCtx(25));
    expect(e.peSectionMm2).not.toBeNull();
    expect(e.neutralSectionMm2).not.toBeNull();
  });

  it("keeps standard mode limited to three criteria (regression)", () => {
    const c = detailedCtx(16);
    const e = evaluateCandidate({ ...c, mode: "standard", input: { ...c.input, mode: "standard" } });
    expect(e.criteria.map((c) => c.id)).toEqual(["mechanical", "thermal", "voltageDrop"]);
  });
});
