import { render, screen } from "@testing-library/react";
import { CriterionTrace } from "./CriterionTrace";

const trace = [
  { sectionMm2: 2.5, failedAt: "thermal", accepted: false,
    criteria: [
      { id: "mechanical", status: "pass", detail: {} },
      { id: "thermal", status: "fail", detail: { izCorrectedA: 30, sizingCurrentA: 60 } },
    ] },
  { sectionMm2: 16, failedAt: null, accepted: true,
    criteria: [
      { id: "mechanical", status: "pass", detail: {} },
      { id: "thermal", status: "pass", detail: {} },
      { id: "voltageDrop", status: "pass", detail: {} },
    ] },
] as const;

describe("CriterionTrace", () => {
  it("marks the selected candidate", () => {
    render(<CriterionTrace trace={trace} selectedSectionMm2={16} />);
    const selected = screen.getByTestId("candidate-16");
    expect(selected).toHaveAttribute("data-selected", "true");
  });

  it("flags the failing criterion on a rejected candidate", () => {
    render(<CriterionTrace trace={trace} selectedSectionMm2={16} />);
    expect(screen.getByTestId("candidate-2.5-thermal")).toHaveAttribute("data-status", "fail");
  });
});
