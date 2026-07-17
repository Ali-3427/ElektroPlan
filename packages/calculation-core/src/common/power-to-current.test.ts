import { describe, expect, it } from "vitest";

import { SQRT3 } from "./constants/index.js";
import {
  calcApparentPowerKVA,
  calcCurrentFromPowerKW,
  calcInputPowerKW,
} from "./power-to-current.js";

describe("calcInputPowerKW", () => {
  it("divides output power by efficiency (as a percent)", () => {
    expect(calcInputPowerKW(2.2, 81)).toBeCloseTo(2.2 / 0.81, 12);
  });
});

describe("calcApparentPowerKVA", () => {
  it("divides input power by cosPhi", () => {
    expect(calcApparentPowerKVA(2.716, 0.84)).toBeCloseTo(2.716 / 0.84, 12);
  });
});

describe("calcCurrentFromPowerKW", () => {
  it("computes DC current with no cosPhi and default (100%) efficiency", () => {
    expect(
      calcCurrentFromPowerKW({ phaseMode: "dc", powerKW: 4.8, voltageV: 240 }),
    ).toBeCloseTo(20, 12);
  });

  it("computes single-phase current using cosPhi and efficiency", () => {
    expect(
      calcCurrentFromPowerKW({
        phaseMode: "single-phase",
        powerKW: 4.8,
        voltageV: 240,
        cosPhi: 0.8,
        efficiencyPercent: 90,
      }),
    ).toBeCloseTo((1000 * 4.8) / (240 * 0.9 * 0.8), 12);
  });

  it("computes three-phase line-line current using SQRT3", () => {
    expect(
      calcCurrentFromPowerKW({
        phaseMode: "three-phase-ll",
        powerKW: 15,
        voltageV: 400,
        cosPhi: 0.9,
      }),
    ).toBeCloseTo((1000 * 15) / (SQRT3 * 400 * 0.9), 12);
  });

  it("computes three-phase line-neutral current using a factor of 3, not SQRT3", () => {
    expect(
      calcCurrentFromPowerKW({
        phaseMode: "three-phase-ln",
        powerKW: 15,
        voltageV: 400 / SQRT3,
        cosPhi: 0.9,
      }),
    ).toBeCloseTo((1000 * 15) / (3 * (400 / SQRT3) * 0.9), 12);
  });

  it("throws when cosPhi is missing for an AC phase mode", () => {
    expect(() =>
      calcCurrentFromPowerKW({ phaseMode: "single-phase", powerKW: 4.8, voltageV: 240 }),
    ).toThrow("cosPhi is required for AC current-from-power calculations.");
  });
});
