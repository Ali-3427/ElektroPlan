import { getMaxDisconnectionTime } from "./index.js";

describe("disconnection times (Table 41.1)", () => {
  it("returns 0.4 s for a TN final circuit at 230 V", () => {
    expect(getMaxDisconnectionTime({ system: "TN", circuitRole: "final", u0V: 230 })).toBe(0.4);
  });
  it("returns 5 s for TN distribution regardless of U0 band", () => {
    expect(getMaxDisconnectionTime({ system: "TN", circuitRole: "distribution", u0V: 230 })).toBe(5);
    expect(getMaxDisconnectionTime({ system: "TN", circuitRole: "distribution", u0V: 400 })).toBe(5);
  });
  it("returns 0.2 s for a TT final circuit at 230 V", () => {
    expect(getMaxDisconnectionTime({ system: "TT", circuitRole: "final", u0V: 230 })).toBe(0.2);
  });
  it("returns 0.2 s for a TN final circuit in the 230-400 V band", () => {
    expect(getMaxDisconnectionTime({ system: "TN", circuitRole: "final", u0V: 400 })).toBe(0.2);
  });
});
