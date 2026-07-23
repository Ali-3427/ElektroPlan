import { evaluateDeviceCoordination } from "./device-coordination.js";

describe("device coordination criterion", () => {
  it("selects the smallest In at or above the design current", () => {
    const r = evaluateDeviceCoordination({ designCurrentA: 22, izCorrectedA: 96, curve: "C", enforce: true });
    expect(r.device?.nominalCurrentA).toBe(25);
    expect(r.outcome.status).toBe("pass");
  });

  it("fails when no In fits between Ib and Iz", () => {
    const r = evaluateDeviceCoordination({ designCurrentA: 22, izCorrectedA: 23, curve: "C", enforce: true });
    expect(r.outcome.status).toBe("fail");
    expect(r.device).toBeNull();
  });

  it("reports but does not fail when enforce is false (standard mode)", () => {
    const r = evaluateDeviceCoordination({ designCurrentA: 22, izCorrectedA: 23, curve: "C", enforce: false });
    expect(r.outcome.status).toBe("pass");
    expect(r.outcome.detail.coordinated).toBe("no");
  });

  it("computes I2 as In × i2Multiplier", () => {
    const r = evaluateDeviceCoordination({ designCurrentA: 22, izCorrectedA: 96, curve: "C", enforce: true });
    expect(r.device?.i2A).toBeCloseTo(25 * 1.45, 6);
  });
});
