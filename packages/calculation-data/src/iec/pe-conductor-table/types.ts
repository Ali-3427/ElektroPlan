import type { DatasetWithMetadata } from "../../dataset/types.js";

export const PE_RULES = ["equal", "fixed", "half"] as const;
export type PeRule = (typeof PE_RULES)[number];

export interface PeConductorRow {
  /** Upper bound of the line section band, inclusive. null = unbounded. */
  lineSectionMaxMm2: number | null;
  rule: PeRule;
  peSectionMm2: number | null;
}

export interface PeConductorTableDataset extends DatasetWithMetadata {
  entries: readonly PeConductorRow[];
}
