import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { DisconnectionTimesDataset } from "./types.js";

export const disconnectionTimesDataset: Readonly<DisconnectionTimesDataset> = loadJsonDataset(
  raw as DisconnectionTimesDataset,
  "packages/calculation-data/src/iec/disconnection-times/data.json",
);
