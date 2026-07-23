import { describe, expect, it } from "vitest";
import { getAdiabaticK } from "./index.js";

describe("adiabatic k", () => {
  it("returns line constants (Table A.54.4)", () => {
    expect(getAdiabaticK({ material: "copper", insulation: "PVC", role: "line", sectionMm2: 16 })).toBe(115);
    expect(getAdiabaticK({ material: "copper", insulation: "XLPE/EPR", role: "line", sectionMm2: 16 })).toBe(143);
    expect(getAdiabaticK({ material: "aluminum", insulation: "PVC", role: "line", sectionMm2: 16 })).toBe(76);
    expect(getAdiabaticK({ material: "aluminum", insulation: "XLPE/EPR", role: "line", sectionMm2: 16 })).toBe(94);
  });

  it("returns pe-bunched constants (Table A.54.2, 30C start)", () => {
    expect(getAdiabaticK({ material: "copper", insulation: "PVC", role: "pe-bunched", sectionMm2: 16 })).toBe(143);
    expect(getAdiabaticK({ material: "copper", insulation: "XLPE/EPR", role: "pe-bunched", sectionMm2: 16 })).toBe(176);
    expect(getAdiabaticK({ material: "aluminum", insulation: "XLPE/EPR", role: "pe-bunched", sectionMm2: 16 })).toBe(116);
  });

  it("uses the reduced constant above 300 mm² for PVC", () => {
    expect(getAdiabaticK({ material: "copper", insulation: "PVC", role: "line", sectionMm2: 400 })).toBe(103);
    expect(getAdiabaticK({ material: "aluminum", insulation: "PVC", role: "line", sectionMm2: 400 })).toBe(68);
  });
});
