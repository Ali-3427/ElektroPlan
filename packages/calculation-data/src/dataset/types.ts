export interface DatasetMetadata {
  id: string;
  standard: string;
  revision: string;
  source: string;
  validFrom: string;
  notes: string;
  /**
   * Optional self-declared row/entry count, so a dataset.ts's row-count
   * guard can compare against a number that lives beside the data it
   * describes instead of a separately hand-maintained TS constant.
   */
  expectedRowCount?: number;
}

export interface DatasetWithMetadata {
  metadata: DatasetMetadata;
}
