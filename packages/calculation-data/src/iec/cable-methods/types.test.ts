/// <reference types="vitest" />
import { CABLE_METHOD_CODES, isCableMethodCode } from "./index.js";

describe("cable methods", () => {
  it("freezes the D1/D2 method set", () => {
    expect(CABLE_METHOD_CODES).toEqual(["A1", "A2", "B1", "B2", "C", "D1", "D2"]);
  });

  it("guards membership", () => {
    expect(isCableMethodCode("D1")).toBe(true);
    expect(isCableMethodCode("D")).toBe(false);
    expect(isCableMethodCode("E")).toBe(false);
  });
});
