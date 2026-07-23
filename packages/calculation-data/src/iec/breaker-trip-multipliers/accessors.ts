import { breakerTripMultipliersDataset } from "./dataset.js";

export function getTripMultiplier(
  curve: "B" | "C" | "D",
): { min: number; max: number; design: number } | undefined {
  const e = breakerTripMultipliersDataset.entries.find((x) => x.curve === curve);
  return e === undefined
    ? undefined
    : { min: e.minMultiplier, max: e.maxMultiplier, design: e.designMultiplier };
}
