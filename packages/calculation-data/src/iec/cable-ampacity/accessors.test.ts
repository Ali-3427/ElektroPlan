import { describe, expect, it } from "vitest";

import {
  getCableAmpacity,
  getCableAmpacityConfidence,
  getCableCrossSections,
} from "./index.js";

const XLPE_CU_3 = { material: "copper", insulation: "XLPE/EPR", loadedConductors: 3 } as const;

describe("cable ampacity", () => {
  it("returns method C value for 16 mm² Cu XLPE 3-loaded (B.52.5)", () => {
    expect(getCableAmpacity(XLPE_CU_3, 16, "C")).toBe(96);
  });

  it("splits D into D1 and D2", () => {
    expect(getCableAmpacity(XLPE_CU_3, 16, "D1")).toBe(75);
    expect(getCableAmpacity(XLPE_CU_3, 16, "D2")).toBe(84);
  });

  it("exposes ascending cross-sections", () => {
    const sections = getCableCrossSections(XLPE_CU_3);
    expect(sections[0]).toBe(1.5);
    expect(sections.at(-1)).toBe(300);
    expect([...sections]).toEqual([...sections].sort((a, b) => a - b));
  });

  it("marks transcribed ampacity as draft", () => {
    expect(getCableAmpacityConfidence(XLPE_CU_3)).toBe("draft");
  });
});
