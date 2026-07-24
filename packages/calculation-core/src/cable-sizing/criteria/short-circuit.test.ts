import { evaluateShortCircuit } from "./short-circuit.js";

describe("short-circuit criterion", () => {
  it("is not-applicable when neither catalog let-through nor manual data exists", () => {
    const r = evaluateShortCircuit({
      sectionMm2: 16, material: "copper", insulation: "XLPE/EPR",
      deviceId: null, manual: null,
    });
    expect(r.outcome.status).toBe("not-applicable");
    expect(r.outcome.detail.reason).toBe("no-fault-energy-data");
  });

  it("passes when I²t is below k²S²", () => {
    // k=143, S=16 -> k²S² = 143² * 256 = 5,234,944 A²s
    // I=6 kA, t=0.1 s -> I²t = 3.6e6 -> ratio < 1
    const r = evaluateShortCircuit({
      sectionMm2: 16, material: "copper", insulation: "XLPE/EPR",
      deviceId: null, manual: { prospectiveFaultKa: 6, clearingTimeS: 0.1 },
    });
    expect(r.outcome.status).toBe("pass");
    expect(Number(r.outcome.detail.energyRatio)).toBeLessThan(1);
  });

  it("fails when I²t exceeds k²S²", () => {
    const r = evaluateShortCircuit({
      sectionMm2: 2.5, material: "copper", insulation: "XLPE/EPR",
      deviceId: null, manual: { prospectiveFaultKa: 6, clearingTimeS: 0.1 },
    });
    expect(r.outcome.status).toBe("fail");
    expect(Number(r.outcome.detail.sMinMm2)).toBeGreaterThan(2.5);
  });
});
