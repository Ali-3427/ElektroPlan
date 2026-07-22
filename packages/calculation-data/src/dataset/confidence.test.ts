import { assertConfidence, type DataConfidence } from "./confidence.js";

describe("assertConfidence", () => {
  it("accepts the three known confidence values", () => {
    for (const value of ["verified", "draft", "missing"] as DataConfidence[]) {
      expect(() => assertConfidence(value, "test")).not.toThrow();
    }
  });

  it("throws on an unknown value", () => {
    expect(() => assertConfidence("guess", "cable-ampacity")).toThrow(
      "Invalid data confidence 'guess' in cable-ampacity.",
    );
  });
});
