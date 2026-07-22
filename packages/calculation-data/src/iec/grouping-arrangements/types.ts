import type { DatasetWithMetadata } from "../../dataset/types.js";

export const GROUPING_ARRANGEMENT_IDS = ["bunched", "single-layer-tray-horizontal", "buried-in-ducts"] as const;
export type GroupingArrangementId = (typeof GROUPING_ARRANGEMENT_IDS)[number];

export interface GroupingArrangementRow {
  circuits: number;
  factor: number;
}

export interface GroupingArrangement {
  id: GroupingArrangementId;
  sourceTable: string;
  entries: readonly GroupingArrangementRow[];
}

export interface GroupingArrangementsDataset extends DatasetWithMetadata {
  arrangements: readonly GroupingArrangement[];
}
