import { evaluateMechanical } from "./mechanical-min.js";

describe("mechanical minimum criterion", () => {
  it("fails aluminum below 16 mm²", () => {
    const o = evaluateMechanical(10, "aluminum", "power");
    expect(o.id).toBe("mechanical");
    expect(o.status).toBe("fail");
    expect(o.detail.minRequiredMm2).toBe(16);
  });

  it("passes copper at 1.5 mm²", () => {
    expect(evaluateMechanical(1.5, "copper", "power").status).toBe("pass");
  });
});
