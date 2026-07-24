import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { CablePage } from "./CablePage";

vi.mock("../../bridge/client", () => ({
  isBridgeAvailable: () => true,
  getBridge: () => ({
    calc: { cableSelect: vi.fn(), cableRuler: vi.fn() },
    data: {
      installationMethods: () => Promise.resolve(["A1", "A2", "B1", "B2", "C", "D1", "D2"]),
      cableRulerTable: () => Promise.resolve([]),
    },
  }),
}));

function wrap(ui: ReactElement) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}

describe("CablePage", () => {
  it("does not leak field values between Hesap (standard) and Detaylı (detailed) tabs on switch", () => {
    render(wrap(<CablePage />));

    fireEvent.click(screen.getByRole("button", { name: "Hesap Modu" }));
    fireEvent.change(screen.getByLabelText(/^Tasarım Akımı/i), { target: { value: "60" } });
    expect(screen.getByLabelText(/^Tasarım Akımı/i)).toHaveValue("60");

    fireEvent.click(screen.getByRole("button", { name: "Detaylı Hesap" }));
    expect(screen.getByLabelText(/^Tasarım Akımı/i)).toHaveValue("");
  });
});
