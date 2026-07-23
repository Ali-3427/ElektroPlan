import type { CalculationResult } from "../common/types/result.js";
import type {
  CableConductorMaterial,
  CableInsulation,
  CableMethodCode,
  ConductorArrangement,
  ProtectionDeviceCurve,
} from "@elektroplan/calculation-data";
import type { VoltageDropResult, VoltageDropSystemType } from "../voltage-drop/index.js";

export type CableSizingMode = "standard" | "detailed";
export type CablePhase = 1 | 3;
export type CircuitKind = "power" | "signal";

export const CRITERION_IDS = [
  "mechanical",
  "thermal",
  "device",
  "voltageDrop",
  "pe",
  "shortCircuit",
  "loopImpedance",
  "neutral",
] as const;
export type CriterionId = (typeof CRITERION_IDS)[number];
export type CriterionStatus = "pass" | "fail" | "not-applicable" | "skipped";

export interface CriterionOutcome {
  id: CriterionId;
  status: CriterionStatus;
  detail: Readonly<Record<string, number | string | null>>;
}

export interface CandidateEvaluation {
  sectionMm2: number;
  criteria: readonly CriterionOutcome[];
  failedAt: CriterionId | null;
  accepted: boolean;
}

export type EarthingSystem = "TN" | "TT";
export type CircuitRole = "final" | "distribution";
export type PeLocation = "in-cable" | "separate";

export type LoopImpedanceSource =
  | { method: "estimated" }
  | { method: "calculated"; prospectiveEarthFaultKa: number }
  | { method: "measured"; sourceImpedanceOhm: number };

export interface ShortCircuitInput {
  prospectiveFaultKa: number;
  clearingTimeS: number;
}

export interface DetailedOptions {
  earthingSystem: EarthingSystem;
  circuitRole: CircuitRole;
  breakerCurve: ProtectionDeviceCurve;
  peLocation: PeLocation;
  conductorArrangement: ConductorArrangement;
  parallelConductors?: number;
  soilThermalResistivityKmPerW?: number;
  burialDepthM?: number;
  shortCircuit?: ShortCircuitInput;
  loopImpedance: LoopImpedanceSource;
}

export interface SelectedDevice {
  id: string;
  nominalCurrentA: number;
  curve: ProtectionDeviceCurve | null;
  family: string;
  i2A: number;
}

export interface CableSelectionInput {
  mode: CableSizingMode;
  designCurrentA: number;
  phase: CablePhase;
  circuitKind: CircuitKind;
  conductorMaterial: CableConductorMaterial;
  insulation: CableInsulation;
  installationMethod: CableMethodCode;
  ambientTemperatureC: number;
  groupedCircuits: number;
  groupingArrangement: "bunched" | "single-layer-tray-horizontal" | "buried-in-ducts";
  thirdHarmonicPercent: number;
  voltageDropLimitPercent: number;
  voltageDrop: {
    systemType: VoltageDropSystemType;
    lengthM: number;
    baseVoltageV: number;
    cosPhi: number;
  };
  extraCorrectionFactor?: number;
  detailed?: DetailedOptions;
}

export interface CableSelectionOutput {
  mode: CableSizingMode;
  selectedSectionMm2: number;
  designCurrentA: number;
  sizingCurrentA: number;
  kT: number;
  kG: number;
  kH: number;
  kTotal: number;
  izRequiredA: number;
  candidateTrace: readonly CandidateEvaluation[];
  vdResult: VoltageDropResult;
  kS: number;
  kD: number;
  selectedDevice: SelectedDevice | null;
  peSectionMm2: number | null;
  neutralSectionMm2: number | null;
}

export type CableSelectionResult = CalculationResult<CableSelectionOutput>;

export const ACTIVE_CRITERIA: Record<CableSizingMode, readonly CriterionId[]> = {
  standard: ["mechanical", "thermal", "voltageDrop"],
  detailed: [
    "mechanical",
    "thermal",
    "device",
    "voltageDrop",
    "pe",
    "shortCircuit",
    "loopImpedance",
    "neutral",
  ],
};
