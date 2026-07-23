import { lookupProtectionDevice, getLetThroughI2t } from "./index.js";

describe("protection catalog coordination fields", () => {
  it("exposes i2Multiplier = 1.45 for MCB entries", () => {
    const [device] = lookupProtectionDevice({ minimumNominalCurrentA: 6, families: ["MCB"], limit: 1 });
    expect(device?.i2Multiplier).toBe(1.45);
  });

  it("returns null let-through when the catalog has no curve data", () => {
    const [device] = lookupProtectionDevice({ minimumNominalCurrentA: 6, families: ["MCB"], limit: 1 });
    expect(getLetThroughI2t(device?.id as string, 3)).toBeNull();
  });

  it("keeps existing lookup behaviour (regression)", () => {
    const matches = lookupProtectionDevice({ minimumNominalCurrentA: 20, families: ["MCB"] });
    expect(matches.every((m) => m.nominalCurrentA >= 20)).toBe(true);
  });
});
