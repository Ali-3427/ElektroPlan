import { getPeSectionByTable } from "./index.js";

describe("PE conductor table (54.2)", () => {
  it("equals the line section up to 16 mm²", () => {
    expect(getPeSectionByTable(1.5)).toBe(1.5);
    expect(getPeSectionByTable(16)).toBe(16);
  });
  it("is fixed at 16 mm² between 16 and 35 mm²", () => {
    expect(getPeSectionByTable(25)).toBe(16);
    expect(getPeSectionByTable(35)).toBe(16);
  });
  it("is half the line section above 35 mm²", () => {
    expect(getPeSectionByTable(50)).toBe(25);
    expect(getPeSectionByTable(240)).toBe(120);
  });
});
