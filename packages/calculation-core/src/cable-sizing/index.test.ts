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
