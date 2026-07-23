import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import { assertConfidence } from "../../dataset/confidence.js";
import type { SoilResistivityDataset } from "./types.js";

export const soilResistivityDataset: Readonly<SoilResistivityDataset> = (() => {
  const d = loadJsonDataset(
    raw as SoilResistivityDataset,
    "packages/calculation-data/src/iec/soil-resistivity-factors/data.json",
  );
  assertConfidence(d.confidence, "soil-resistivity-factors");
  return d;
})();
