import { getTripMultiplier } from "./index.js";

describe("breaker trip multipliers (IEC 60898-1)", () => {
  it("returns the B/C/D bands", () => {
    expect(getTripMultiplier("B")).toEqual({ min: 3, max: 5, design: 5 });
    expect(getTripMultiplier("C")).toEqual({ min: 5, max: 10, design: 10 });
    expect(getTripMultiplier("D")).toEqual({ min: 10, max: 20, design: 20 });
  });
  it("uses the upper bound as the design multiplier (guaranteed trip)", () => {
    const c = getTripMultiplier("C");
    expect(c?.design).toBe(c?.max);
  });
});
