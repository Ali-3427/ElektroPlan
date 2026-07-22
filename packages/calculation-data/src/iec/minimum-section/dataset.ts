import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { MinimumSectionDataset } from "./types.js";

export const minimumSectionDataset: Readonly<MinimumSectionDataset> =
  loadJsonDataset(
    raw as MinimumSectionDataset,
    "packages/calculation-data/src/iec/minimum-section/data.json",
  );
