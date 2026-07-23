import { evaluatePeConductor } from "./pe-conductor.js";

const KEY = { material: "copper", insulation: "XLPE/EPR", loadedConductors: 3 } as const;

describe("PE conductor criterion", () => {
  it("uses the table value when no fault data is supplied", () => {
    const r = evaluatePeConductor({
      sectionMm2: 50, material: "copper", insulation: "XLPE/EPR",
      peLocation: "in-cable", ampacityKey: KEY, fault: null,
    });
    expect(r.peSectionMm2).toBe(25); // 50/2 per Table 54.2
    expect(r.outcome.status).toBe("pass");
  });

  it("upsizes to the adiabatic result when the fault demands it", () => {
    // I=10000 A, t=0.1 s, k=143 (Cu XLPE in-cable) -> sqrt(1e8*0.1)/143 = 22.1 mm² -> 25
    const r = evaluatePeConductor({
      sectionMm2: 16, material: "copper", insulation: "XLPE/EPR",
      peLocation: "in-cable", ampacityKey: KEY,
      fault: { earthFaultA: 10000, clearingTimeS: 0.1 },
    });
    expect(r.peSectionMm2).toBe(25);
    expect(Number(r.outcome.detail.byAdiabaticMm2)).toBeCloseTo(22.1, 1);
  });

  it("uses the pe-bunched k constant for a separate PE conductor", () => {
    const r = evaluatePeConductor({
      sectionMm2: 16, material: "copper", insulation: "XLPE/EPR",
      peLocation: "separate", ampacityKey: KEY,
      fault: { earthFaultA: 10000, clearingTimeS: 0.1 },
    });
    // k = 176 -> sqrt(1e7)/176 = 17.96 mm² -> table gives 16 -> max -> 25 standard step
    expect(Number(r.outcome.detail.kUsed)).toBe(176);
  });
});
