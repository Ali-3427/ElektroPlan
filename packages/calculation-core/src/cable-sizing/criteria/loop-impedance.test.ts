import { evaluateLoopImpedance } from "./loop-impedance.js";

function args(over: Partial<Parameters<typeof evaluateLoopImpedance>[0]> = {}) {
  return {
    sectionMm2: 16, peSectionMm2: 16, material: "copper" as const,
    insulation: "XLPE/EPR" as const, lengthM: 30, u0V: 230,
    nominalCurrentA: 32, curve: "C" as const, arrangement: "multicore" as const,
    parallelConductors: 1, source: { method: "estimated" as const },
    maxDisconnectionS: 0.4,
    ...over,
  };
}

describe("loop impedance criterion", () => {
  it("passes a short run with adequate conductors", () => {
    const r = evaluateLoopImpedance(args());
    expect(r.outcome.status).toBe("pass");
    expect(Number(r.outcome.detail.iaA)).toBe(320); // C curve, design ×10
  });

  it("reports the required disconnection time alongside the verdict", () => {
    const r = evaluateLoopImpedance(args());
    expect(Number(r.outcome.detail.maxDisconnectionS)).toBe(0.4);
  });

  it("fails an over-long run", () => {
    const r = evaluateLoopImpedance(args({ lengthM: 3000 }));
    expect(r.outcome.status).toBe("fail");
  });

  it("reports the maximum permissible length", () => {
    const r = evaluateLoopImpedance(args());
    expect(Number(r.outcome.detail.lMaxM)).toBeGreaterThan(30);
  });

  it("skips when no device was selected", () => {
    const r = evaluateLoopImpedance(args({ nominalCurrentA: null }));
    expect(r.outcome.status).toBe("skipped");
    expect(r.outcome.detail.reason).toBe("no-device-selected");
  });

  it("uses the measured source impedance when supplied", () => {
    const r = evaluateLoopImpedance(args({ source: { method: "measured", sourceImpedanceOhm: 0.35 } }));
    expect(Number(r.outcome.detail.zSourceOhm)).toBe(0.35);
  });
});
