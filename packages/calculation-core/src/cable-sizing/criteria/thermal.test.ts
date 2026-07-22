import { evaluateThermal } from "./thermal.js";

const KEY = { material: "copper", insulation: "XLPE/EPR", loadedConductors: 3 } as const;
const NULL_CELL_KEY = { material: "aluminum", insulation: "PVC", loadedConductors: 3 } as const;

describe("thermal criterion", () => {
  it("passes when corrected ampacity >= sizing current", () => {
    // 16 mm² C = 96 A; kTotal 1 => 96 >= 60
    const o = evaluateThermal({ key: KEY, sectionMm2: 16, method: "C", kTotal: 1, sizingCurrentA: 60 });
    expect(o.status).toBe("pass");
    expect(o.detail.izCorrectedA).toBe(96);
  });

  it("fails when corrected ampacity < sizing current", () => {
    // 2.5 mm² C = 30 A; kTotal 1 => 30 < 60
    const o = evaluateThermal({ key: KEY, sectionMm2: 2.5, method: "C", kTotal: 1, sizingCurrentA: 60 });
    expect(o.status).toBe("fail");
  });

  it("skips when the cell is null (missing data)", () => {
    // aluminum-pvc-70c-3loaded 2.5 mm² method D2 is a genuinely-null cell.
    const o = evaluateThermal({
      key: NULL_CELL_KEY,
      sectionMm2: 2.5,
      method: "D2",
      kTotal: 1,
      sizingCurrentA: 10,
    });
    expect(o.status).toBe("skipped");
  });

  it("applies kTotal correction to the base ampacity", () => {
    // 16 mm² C = 96 A; kTotal 0.5 => 48 < 60 => fail
    const o = evaluateThermal({ key: KEY, sectionMm2: 16, method: "C", kTotal: 0.5, sizingCurrentA: 60 });
    expect(o.status).toBe("fail");
    expect(o.detail.izCorrectedA).toBe(48);
  });

  it("returns the thermal criterion id", () => {
    const o = evaluateThermal({ key: KEY, sectionMm2: 16, method: "C", kTotal: 1, sizingCurrentA: 60 });
    expect(o.id).toBe("thermal");
  });
});
