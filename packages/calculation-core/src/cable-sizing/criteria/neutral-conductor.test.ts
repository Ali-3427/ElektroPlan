import { evaluateNeutralConductor } from "./neutral-conductor.js";

describe("neutral conductor criterion", () => {
  it("equals the phase section on single-phase circuits", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 4, phase: 1, thirdHarmonicPercent: 0, material: "copper" });
    expect(r.neutralSectionMm2).toBe(4);
    expect(r.outcome.detail.basis).toBe("single-phase");
  });

  it("equals the phase section when triplen harmonics dominate", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 50, phase: 3, thirdHarmonicPercent: 40, material: "copper" });
    expect(r.neutralSectionMm2).toBe(50);
    expect(r.outcome.detail.basis).toBe("harmonic-driven");
  });

  it("equals the phase section at or below 16 mm² copper", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 16, phase: 3, thirdHarmonicPercent: 0, material: "copper" });
    expect(r.neutralSectionMm2).toBe(16);
    expect(r.outcome.detail.basis).toBe("small-section");
  });

  it("may be reduced on large balanced three-phase circuits", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 120, phase: 3, thirdHarmonicPercent: 0, material: "copper" });
    expect(r.neutralSectionMm2).toBe(60);
    expect(r.outcome.detail.basis).toBe("reduced-balanced");
  });

  it("prioritizes harmonic check over small-section check (ordering regression test)", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 10, phase: 3, thirdHarmonicPercent: 40, material: "copper" });
    expect(r.neutralSectionMm2).toBe(10);
    expect(r.outcome.detail.basis).toBe("harmonic-driven");
  });

  it("respects aluminum 25 mm² threshold for small sections", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 25, phase: 3, thirdHarmonicPercent: 0, material: "aluminum" });
    expect(r.neutralSectionMm2).toBe(25);
    expect(r.outcome.detail.basis).toBe("small-section");
  });

  it("allows reduction on large balanced aluminum three-phase circuits", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 30, phase: 3, thirdHarmonicPercent: 0, material: "aluminum" });
    expect(r.neutralSectionMm2).toBe(15);
    expect(r.outcome.detail.basis).toBe("reduced-balanced");
  });
});
