import { getSoilResistivityFactor } from "./index.js";

describe("soil thermal resistivity factor (B.52.16)", () => {
  it("is 1.00 at the 2.5 K·m/W reference", () => {
    expect(getSoilResistivityFactor(2.5)).toBe(1);
  });
  it("raises capacity for lower resistivity", () => {
    expect(getSoilResistivityFactor(1.0)).toBe(1.18);
    expect(getSoilResistivityFactor(0.5)).toBe(1.28);
  });
  it("lowers capacity above the reference", () => {
    expect(getSoilResistivityFactor(3.0)).toBe(0.96);
  });
  it("returns undefined for an untabulated value (no interpolation)", () => {
    expect(getSoilResistivityFactor(1.234)).toBeUndefined();
  });
});
