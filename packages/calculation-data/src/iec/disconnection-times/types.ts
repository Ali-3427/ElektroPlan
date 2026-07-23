import type { DatasetWithMetadata } from "../../dataset/types.js";

export const EARTHING_SYSTEMS = ["TN", "TT"] as const;
export type EarthingSystem = (typeof EARTHING_SYSTEMS)[number];
export const CIRCUIT_ROLES = ["final", "distribution"] as const;
export type CircuitRole = (typeof CIRCUIT_ROLES)[number];

export interface DisconnectionTimeEntry {
  system: EarthingSystem;
  circuitRole: CircuitRole;
  /** Band is (u0MinV, u0MaxV]; u0MaxV null = unbounded. */
  u0MinV: number;
  u0MaxV: number | null;
  maxSeconds: number;
}

export interface DisconnectionTimesDataset extends DatasetWithMetadata {
  entries: readonly DisconnectionTimeEntry[];
}

export interface DisconnectionTimeQuery {
  system: EarthingSystem;
  circuitRole: CircuitRole;
  u0V: number;
}
