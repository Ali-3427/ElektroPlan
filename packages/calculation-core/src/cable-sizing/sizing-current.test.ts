import { computeSizingCurrent } from "./sizing-current.js";

describe("computeSizingCurrent", () => {
  it("keeps design current when h3 ≤ 33% (phase basis)", () => {
    const r = computeSizingCurrent(50, 20);
    expect(r.basis).toBe("phase");
    expect(r.sizingCurrentA).toBe(50);
  });

  it("switches to neutral basis when h3 > 33% (I_N = 3·Ib·h3/100)", () => {
    const r = computeSizingCurrent(50, 40);
    expect(r.basis).toBe("neutral");
    expect(r.sizingCurrentA).toBeCloseTo(60, 6); // 3 * 50 * 0.40
  });
});
