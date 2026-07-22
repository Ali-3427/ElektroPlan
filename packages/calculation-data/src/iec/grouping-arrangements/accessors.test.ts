import { describe, it, expect } from "vitest";
import { getGroupingArrangementFactor } from "./index.js";

describe("grouping arrangements", () => {
  it("returns B.52.17 bunched factors", () => {
    expect(getGroupingArrangementFactor("bunched", 1)).toBe(1);
    expect(getGroupingArrangementFactor("bunched", 4)).toBe(0.65);
    expect(getGroupingArrangementFactor("bunched", 20)).toBe(0.38);
  });

  it("returns undefined for an unlisted circuit count", () => {
    expect(getGroupingArrangementFactor("bunched", 11)).toBeUndefined();
  });
});
