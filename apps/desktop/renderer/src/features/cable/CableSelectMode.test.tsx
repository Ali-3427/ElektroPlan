import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { CableSelectMode } from "./CableSelectMode";

const cableSelect = vi.fn();
vi.mock("../../bridge/client", () => ({
  isBridgeAvailable: () => true,
  getBridge: () => ({
    calc: { cableSelect },
    data: { installationMethods: () => Promise.resolve(["A1", "A2", "B1", "B2", "C", "D1", "D2"]) },
  }),
}));

function wrap(ui: ReactElement) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}

describe("CableSelectMode", () => {
  beforeEach(() => cableSelect.mockReset());

  it("sends mode='standard' without a detailed block", async () => {
    cableSelect.mockResolvedValue({
      value: { selectedSectionMm2: 16, candidateTrace: [], kTotal: 1 },
      warnings: [],
      assumptions: [],
    });
    render(wrap(<CableSelectMode mode="standard" />));
    fireEvent.change(screen.getByLabelText(/^Tasarım Akımı/i), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: /hesapla/i }));
    await waitFor(() => expect(cableSelect).toHaveBeenCalled());
    const req = cableSelect.mock.calls[0]![0];
    expect(req.mode).toBe("standard");
    expect(req.detailed).toBeUndefined();
  });

  it("includes the detailed block in detailed mode", async () => {
    cableSelect.mockResolvedValue({
      value: { selectedSectionMm2: 16, candidateTrace: [], kTotal: 1 },
      warnings: [],
      assumptions: [],
    });
    render(wrap(<CableSelectMode mode="detailed" />));
    fireEvent.change(screen.getByLabelText(/^Tasarım Akımı/i), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: /hesapla/i }));
    await waitFor(() => expect(cableSelect).toHaveBeenCalled());
    const req = cableSelect.mock.calls[0]![0];
    expect(req.mode).toBe("detailed");
    expect(req.detailed).toBeDefined();
    expect(req.detailed.loopImpedance.method).toBeDefined();
  });
});
