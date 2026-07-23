import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { BreakerTripMultipliersDataset } from "./types.js";

export const breakerTripMultipliersDataset: Readonly<BreakerTripMultipliersDataset> = loadJsonDataset(
  raw as BreakerTripMultipliersDataset,
  "packages/calculation-data/src/iec/breaker-trip-multipliers/data.json",
);
