import { ACTIVE_CRITERIA } from "./types.js";

describe("cable-sizing mode config", () => {
  it("standard mode runs mechanical, thermal, voltageDrop", () => {
    expect(ACTIVE_CRITERIA.standard).toEqual(["mechanical", "thermal", "voltageDrop"]);
  });

  it("detailed mode runs the full chain in dependency order", () => {
    expect(ACTIVE_CRITERIA.detailed).toEqual([
      "mechanical",
      "thermal",
      "device",
      "voltageDrop",
      "pe",
      "shortCircuit",
      "loopImpedance",
      "neutral",
    ]);
  });
});
