import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { GroupingArrangementsDataset } from "./types.js";

export const groupingArrangementsDataset: Readonly<GroupingArrangementsDataset> =
  loadJsonDataset(raw as GroupingArrangementsDataset,
    "packages/calculation-data/src/iec/grouping-arrangements/data.json");
