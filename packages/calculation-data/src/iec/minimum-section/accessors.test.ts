import { describe, expect, it } from "vitest";
import { getMinimumSection } from "./index.js";

describe("minimum section", () => {
  it("returns Table 52.2 minimums", () => {
    expect(getMinimumSection("power", "copper")).toBe(1.5);
    expect(getMinimumSection("power", "aluminum")).toBe(16);
    expect(getMinimumSection("signal", "copper")).toBe(0.5);
  });

  it("returns undefined for an untabulated combination", () => {
    expect(getMinimumSection("signal", "aluminum")).toBeUndefined();
  });
});
