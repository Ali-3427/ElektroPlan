import { selectCable } from "./index.js";
import { getCableCrossSections } from "@elektroplan/calculation-data";
import type { CableSelectionInput } from "./types.js";

function base(): CableSelectionInput {
  return {
    mode: "standard", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
  };
}

describe("selectCable (standard mode)", () => {
  it("upsizes when a thermally valid section fails voltage drop", () => {
    const r = selectCable({ ...base(), voltageDrop: { ...base().voltageDrop, lengthM: 150 } });
    expect(r.value.selectedSectionMm2).toBe(16);
    const s10 = r.value.candidateTrace.find((c) => c.sectionMm2 === 10);
    expect(s10?.failedAt).toBe("voltageDrop");
  });

  it("is monotone non-decreasing in design current", () => {
    const sizes = [40, 60, 100].map((designCurrentA) =>
      selectCable({ ...base(), designCurrentA }).value.selectedSectionMm2);
    expect(sizes[0]).toBeLessThanOrEqual(sizes[1] as number);
    expect(sizes[1]).toBeLessThanOrEqual(sizes[2] as number);
  });

  it("now supports single-phase PVC (previously threw)", () => {
    const r = selectCable({
      ...base(), phase: 1, insulation: "PVC", designCurrentA: 20,
      voltageDrop: { systemType: "single-phase-ac-two-conductor", lengthM: 20, baseVoltageV: 230, cosPhi: 0.9 },
    });
    expect(getCableCrossSections({ material: "copper", insulation: "PVC", loadedConductors: 2 }))
      .toContain(r.value.selectedSectionMm2);
  });

  it("stamps a draft warning when ampacity data is draft", () => {
    const r = selectCable(base());
    expect(r.warnings.some((w) => w.code === "unverified-data")).toBe(true);
  });

  it("stamps a composite dataVersion including ampacity + confidence", () => {
    const r = selectCable(base());
    expect(r.dataVersion).toContain("cable-ampacity");
    expect(r.dataVersion).toContain("confidence=draft");
  });

  it("throws when no section satisfies the active criteria", () => {
    expect(() => selectCable({ ...base(), designCurrentA: 100000 })).toThrow();
  });
});

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

/** Same input as `detailed()`, but stripped down to standard mode (no `detailed` block). */
function toStandardMode(input: CableSelectionInput): CableSelectionInput {
  const copy = { ...input, mode: "standard" as const };
  delete copy.detailed;
  return copy;
}

describe("selectCable (detailed mode)", () => {
  it("returns device, PE and neutral sections", () => {
    const r = selectCable(detailed());
    expect(r.value.selectedDevice).not.toBeNull();
    expect(r.value.peSectionMm2).not.toBeNull();
    expect(r.value.neutralSectionMm2).not.toBeNull();
    expect(r.formulaVariant).toBe("cable-sizing-detailed-ascending-scan");
  });

  it("never selects a smaller section than standard mode for the same load", () => {
    const std = selectCable(toStandardMode(detailed()));
    const det = selectCable(detailed());
    expect(det.value.selectedSectionMm2).toBeGreaterThanOrEqual(std.value.selectedSectionMm2);
  });

  it("upsizes when a long run breaches the loop impedance limit", () => {
    const short = selectCable(detailed());
    const long = selectCable(detailed({
      voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 400, baseVoltageV: 400, cosPhi: 0.9 },
      voltageDropLimitPercent: 100,
    }));
    expect(long.value.selectedSectionMm2).toBeGreaterThan(short.value.selectedSectionMm2);
  });

  it("records the criterion that rejected each smaller candidate", () => {
    const r = selectCable(detailed());
    const rejected = r.value.candidateTrace.filter((c) => !c.accepted);
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected.every((c) => c.failedAt !== null || c.criteria.some((x) => x.status === "skipped"))).toBe(true);
  });

  it("keeps standard mode output shape unchanged (regression)", () => {
    const r = selectCable(toStandardMode(detailed()));
    expect(r.value.selectedDevice).toBeNull();
    expect(r.value.kS).toBe(1);
    expect(r.value.kD).toBe(1);
  });
});
