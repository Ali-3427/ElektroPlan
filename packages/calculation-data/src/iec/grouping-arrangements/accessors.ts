import { groupingArrangementsDataset } from "./dataset.js";
import type { GroupingArrangementId } from "./types.js";

export function getGroupingArrangementFactor(id: GroupingArrangementId, circuits: number): number | undefined {
  const a = groupingArrangementsDataset.arrangements.find((x) => x.id === id);
  return a?.entries.find((r) => r.circuits === circuits)?.factor;
}

export function listGroupingArrangements(): readonly GroupingArrangementId[] {
  return groupingArrangementsDataset.arrangements.map((a) => a.id);
}
