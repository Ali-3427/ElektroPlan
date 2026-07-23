import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { PeConductorTableDataset } from "./types.js";

export const peConductorTableDataset: Readonly<PeConductorTableDataset> = loadJsonDataset(
  raw as PeConductorTableDataset,
  "packages/calculation-data/src/iec/pe-conductor-table/data.json",
);
