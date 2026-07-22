import raw from "./data.json" with { type: "json" };
import { assertAscending, loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { ConductorImpedanceDataset } from "./types.js";

export const conductorImpedanceDataset: Readonly<ConductorImpedanceDataset> = (() => {
  const d = loadJsonDataset(
    raw as ConductorImpedanceDataset,
    "packages/calculation-data/src/iec/conductor-impedance/data.json"
  );
  assertAscending(
    d.entries.map((e) => e.crossSectionMm2),
    "conductor-impedance cross-sections"
  );
  return d;
})();
