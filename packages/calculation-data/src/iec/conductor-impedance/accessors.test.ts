import { getResistance20, getReactance } from "./index.js";

describe("conductor impedance", () => {
  it("returns IEC 60228 DC resistance at 20C (ohm/km)", () => {
    expect(getResistance20("copper", 16)).toBe(1.15);
    expect(getResistance20("aluminum", 16)).toBe(1.91);
  });

  it("returns null for aluminum below 10 mm² (not tabulated)", () => {
    expect(getResistance20("aluminum", 1.5)).toBeNull();
  });

  it("returns multicore reactance (ohm/km)", () => {
    expect(getReactance("multicore", 16)).toBe(0.081);
    expect(getReactance("singleCoreTrefoil", 16)).toBe(0.114);
  });
});
