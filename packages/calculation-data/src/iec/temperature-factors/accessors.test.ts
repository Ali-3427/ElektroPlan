import { describe, expect, it } from "vitest";

import { getTempFactor } from "./accessors.js";

describe("temperature factors accessors", () => {
  it("resolves newly added air rows (B.52.14)", () => {
    expect(getTempFactor({ method: "C", temperatureC: 25, insulation: "XLPE_EPR_90C" })).toBe(1.04);
    expect(getTempFactor({ method: "C", temperatureC: 35, insulation: "PVC_70C" })).toBe(0.94);
    expect(getTempFactor({ method: "C", temperatureC: 60, insulation: "XLPE_EPR_90C" })).toBe(0.71);
  });

  it("keeps existing 30C reference at 1.00 (regression)", () => {
    expect(getTempFactor({ method: "C", temperatureC: 30, insulation: "XLPE_EPR_90C" })).toBe(1);
    expect(getTempFactor({ method: "C", temperatureC: 40, insulation: "PVC_70C" })).toBe(0.87);
  });
});
