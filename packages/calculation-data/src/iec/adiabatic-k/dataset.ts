import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { AdiabaticKDataset } from "./types.js";

export const adiabaticKDataset: Readonly<AdiabaticKDataset> = loadJsonDataset(
  raw as AdiabaticKDataset,
  "packages/calculation-data/src/iec/adiabatic-k/data.json",
);
