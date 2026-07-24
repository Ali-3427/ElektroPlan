// Renderer-local declarations, plus type-only re-exports of the canonical shapes from
// @elektroplan/contracts (see below). `import type` is fully erased by tsc/vite, so it does
// NOT pull zod into the renderer runtime bundle — do NOT add a runtime `import` from
// @elektroplan/contracts in this file.

import type {
  CableOutput,
  CableRequest,
  CableResponse,
  CableRulerAmbient,
  CableRulerEntryDto,
  CableRulerOutput,
  CableRulerRequest,
  CableSelectRequest,
  CalculationGroup,
  GroupingMetadata,
  InstallationMethod,
  ManualCurrentRequest,
  ManualCurrentResponse,
  MaterialCategory,
  MotorOutput,
  MotorRequest,
  MotorSuggestedCableSection,
  ProtectionRequest,
  RecordVersion,
  VoltageDropGroupOptimizationStep,
  VoltageDropGroupPhaseMode,
  VoltageDropGroupRequest,
  VoltageDropGroupSystemType,
  VoltageDropOutput,
  VoltageDropRequest,
  VoltageDropResponse,
} from "@elektroplan/contracts";

export type {
  CableOutput,
  CableRequest,
  CableResponse,
  CableRulerAmbient,
  CableRulerEntryDto,
  CableRulerOutput,
  CableRulerRequest,
  CableSelectRequest,
  CalculationGroup,
  GroupingMetadata,
  InstallationMethod,
  ManualCurrentRequest,
  ManualCurrentResponse,
  MaterialCategory,
  MotorOutput,
  MotorRequest,
  MotorSuggestedCableSection,
  ProtectionRequest,
  RecordVersion,
  VoltageDropGroupOptimizationStep,
  VoltageDropGroupPhaseMode,
  VoltageDropGroupRequest,
  VoltageDropGroupSystemType,
  VoltageDropOutput,
  VoltageDropRequest,
  VoltageDropResponse,
};

export interface SettingRecord {
  readonly key: string;
  readonly value: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VoltageDropProfileSummary {
  readonly id: string;
  readonly titleKey: string;
  readonly titleTr: string;
  readonly limitPercent: number;
}

export interface ExportPayloadBundle {
  readonly records?: readonly CalculationRecord[];
  readonly groups?: readonly CalculationGroup[];
  readonly resultDocument?: unknown;
}

export interface ExportPdfPayload {
  readonly presentation: unknown;
}

export type ExportResult =
  | { readonly canceled: true }
  | { readonly canceled: false; readonly path: string };

// ── Warning / Assumption ──────────────────────────────────────────────────────
export interface WarningEntry {
  readonly code: string;
  readonly messageKey: string;
  readonly detail?: string;
}

export interface AssumptionEntry {
  readonly field: string;
  readonly usedValue: string | number;
  readonly source: "user" | "estimated" | "default";
}

// ── Motor ─────────────────────────────────────────────────────────────────────
export type MotorPhase = 1 | 3;
export type MotorVoltageMode = "LL" | "LN";

export interface MotorFormulaRequest {
  mode: "formula";
  phase: MotorPhase;
  P_out?: number;
  voltage?: number;
  cosPhi?: number;
  efficiencyPercent?: number;
  voltageMode?: MotorVoltageMode;
}

export interface MotorTableRequest {
  mode: "table";
  kW: number;
  voltage: 220 | 380;
}

export interface MotorFormulaOutput {
  mode: "formula";
  phase: MotorPhase;
  voltage: number;
  cosPhi: number;
  efficiencyPercent: number;
  P_out: number;
  inputPowerKW: number;
  apparentPowerKVA: number;
  currentA: number;
  voltageMode?: MotorVoltageMode;
  suggestedCableSection?: MotorSuggestedCableSection;
}

export interface MotorTableOutput {
  mode: "table";
  kW: number;
  PS: number;
  cosPhi: number;
  efficiencyPercent: number;
  currentA: number;
  cableSpec: string;
}

// NOTE: MotorResponse is intentionally NOT re-exported from @elektroplan/contracts, even
// though its field shape matches. Its `warnings`/`assumptions` arrays embed contracts' zod-
// inferred WarningEntryDto/AssumptionEntryDto, whose optional `detail`/fields are typed as
// `T | undefined` (zod always adds this explicitly). Under this project's
// `exactOptionalPropertyTypes: true`, that is NOT assignable to this file's local WarningEntry/
// AssumptionEntry (`detail?: string`, no explicit undefined) — confirmed by a real tsc failure
// in FormulaMode.tsx / TableMode.tsx when this was swapped. Leave local until reconciled.
export interface MotorResponse {
  value: MotorOutput;
  warnings: WarningEntry[];
  assumptions: AssumptionEntry[];
  formulaVariant: string;
  dataVersion: string;
  engineVersion: string;
}

// ── Voltage Drop ──────────────────────────────────────────────────────────────
export type VoltageDropSystemType =
  | "single-phase-ac-two-conductor"
  | "dc-two-conductor"
  | "three-phase-ac-ll"
  | "three-phase-ac-ln";

export type VoltageDropImpedanceMode = "simplified" | "exact-ac";

export interface VoltageDropCurrentRequest {
  mode: "current";
  systemType: VoltageDropSystemType;
  impedanceMode: VoltageDropImpedanceMode;
  conductorMaterial: "copper" | "aluminum";
  lengthM: number;
  sectionMm2: number;
  baseVoltageV: number;
  currentA: number;
  cosPhi?: number;
  parallelConductors?: number;
  conductorTempC?: number;
  reactanceOhmPerKm?: number;
}

export interface VoltageDropPowerRequest {
  mode: "power";
  systemType: VoltageDropSystemType;
  impedanceMode: VoltageDropImpedanceMode;
  conductorMaterial: "copper" | "aluminum";
  lengthM: number;
  sectionMm2: number;
  baseVoltageV: number;
  powerKW: number;
  cosPhi?: number;
  parallelConductors?: number;
  conductorTempC?: number;
  reactanceOhmPerKm?: number;
}

// ── Voltage Drop Group ────────────────────────────────────────────────────────
export interface VoltageDropGroupSegmentInput {
  readonly id?: string;
  readonly parentId?: string | null;
  readonly title: string;
  readonly loadPowerKW?: number;
  readonly localPowerKW?: number;
  readonly lengthM: number;
  readonly fixedSectionKey?: string;
  readonly sectionMm2?: number;
  readonly settings?: VoltageDropGroupSegmentSettings;
}

export interface VoltageDropGroupSettings {
  readonly limitPercent?: number;
  readonly phaseMode?: VoltageDropGroupPhaseMode;
  readonly singlePhaseVoltageV?: number;
  readonly threePhaseVoltageV?: number;
  readonly cosPhi?: number;
  readonly efficiencyPercent?: number;
  readonly conductorMaterial?: "copper" | "aluminum";
  readonly installationMethod?: "A1" | "A2" | "B1" | "B2" | "C" | "D" | "E";
  readonly insulationRating?: "PVC_70C" | "XLPE_EPR_90C";
  readonly ambientTemperatureC?: number;
  readonly groupedCircuits?: number;
  readonly thirdHarmonicPercent?: number;
  readonly conductorTempC?: number;
  readonly impedanceMode?: VoltageDropImpedanceMode;
  readonly reactanceOhmPerKm?: number;
  readonly terminalLossFactor?: number;
}

export type VoltageDropGroupSegmentSettings = Omit<
  VoltageDropGroupSettings,
  "limitPercent" | "phaseMode" | "singlePhaseVoltageV" | "threePhaseVoltageV"
>;

// NOTE: VoltageDropGroupResolvedSettings, VoltageDropGroupSegmentOutput, VoltageDropGroupOutput,
// and VoltageDropGroupResponse are intentionally NOT re-exported from @elektroplan/contracts,
// even though their field shapes match. Real drifts surface once ElektroPlanBridge (which uses
// these) gets intersected with the parallel local type family in
// features/voltageDrop/voltageDropGroup.ts (which also extends ElektroPlanBridge but declares
// its own hand-rolled VoltageDropGroup* types): (1) contracts' zod-inferred optional fields
// (e.g. `reactanceOhmPerKm?: number | undefined`, `title?: string | undefined`) are not
// assignable to this project's hand-rolled `field?: T` (no explicit undefined) under
// `exactOptionalPropertyTypes: true`, and (2) contracts' `childIds` infers as mutable
// `string[]`, which is not assignable to the local `readonly string[]`. Confirmed by real tsc
// failures in VoltageDropPage.tsx when these were swapped. Leave local until reconciled (either
// the contracts schema or the local voltageDropGroup.ts type family would need to change first).
export interface VoltageDropGroupResolvedSettings {
  readonly limitPercent: number;
  readonly phaseMode: VoltageDropGroupPhaseMode;
  readonly systemType: VoltageDropGroupSystemType;
  readonly baseVoltageV: number;
  readonly cosPhi: number;
  readonly efficiencyPercent: number;
  readonly conductorMaterial: "copper" | "aluminum";
  readonly installationMethod: "A1" | "A2" | "B1" | "B2" | "C" | "D" | "E";
  readonly insulationRating: "PVC_70C" | "XLPE_EPR_90C";
  readonly ambientTemperatureC: number;
  readonly groupedCircuits: number;
  readonly thirdHarmonicPercent: number;
  readonly conductorTempC: number;
  readonly impedanceMode: VoltageDropImpedanceMode;
  readonly reactanceOhmPerKm?: number;
  readonly terminalLossFactor: number;
}

export interface VoltageDropGroupSegmentOutput {
  readonly id?: string;
  readonly parentId?: string | null;
  readonly title: string;
  readonly order: number;
  readonly depth?: number;
  readonly childIds?: readonly string[];
  readonly pathIds?: readonly string[];
  readonly loadPowerKW?: number;
  readonly localPowerKW: number;
  readonly flowPowerKW: number;
  readonly lengthM: number;
  readonly currentA: number;
  readonly selectedSectionKey?: string;
  readonly selectedSectionAreaMm2?: number;
  readonly selectedParallelRuns?: number;
  readonly selectedSectionMm2: number;
  readonly fixedSection?: boolean;
  readonly settings?: Required<
    Omit<
      VoltageDropGroupSettings,
      "limitPercent" | "phaseMode" | "singlePhaseVoltageV" | "threePhaseVoltageV" | "reactanceOhmPerKm"
    >
  > & { readonly reactanceOhmPerKm?: number };
  readonly baseAmpacityA: number;
  readonly correctedAmpacityA: number;
  readonly segmentDeltaVVolts: number;
  readonly segmentDeltaVPercent: number;
  readonly cumulativeDeltaVPercent: number;
  readonly thermalPass: boolean;
  readonly voltageDropPass: boolean;
  readonly compliant: boolean;
}

export interface VoltageDropGroupOutput {
  readonly title?: string;
  readonly settings: VoltageDropGroupResolvedSettings;
  readonly totalLocalPowerKW: number;
  readonly maxCumulativeDeltaVPercent: number;
  readonly isCompliant: boolean;
  readonly segments: readonly VoltageDropGroupSegmentOutput[];
  readonly optimizationSteps: readonly VoltageDropGroupOptimizationStep[];
}

export interface VoltageDropGroupResponse {
  value: VoltageDropGroupOutput;
  warnings: WarningEntry[];
  assumptions: AssumptionEntry[];
  formulaVariant: string;
  dataVersion: string;
  engineVersion: string;
}

// ── Cable ─────────────────────────────────────────────────────────────────────
export type CableVoltageDropSystemType =
  | "single-phase-ac-two-conductor"
  | "three-phase-ac-ll"
  | "three-phase-ac-ln";

export interface CableVoltageDropRequest {
  mode: "current";
  systemType: CableVoltageDropSystemType;
  impedanceMode: VoltageDropImpedanceMode;
  lengthM: number;
  baseVoltageV: number;
  parallelConductors?: number;
  conductorTempC?: number;
  reactanceOhmPerKm?: number;
  cosPhi?: number;
}

export interface CandidateStep {
  sectionMm2: number;
  baseAmpacityA: number | null;
  correctedAmpacityA: number | null;
  thermalPass: boolean;
  vdPass: boolean;
  accepted: boolean;
  vdResult: VoltageDropResponse;
}

// ── Cable Select ──────────────────────────────────────────────────────────────
export type CableSelectMode = "standard" | "detailed";
export type CableMethodCode = "A1" | "A2" | "B1" | "B2" | "C" | "D1" | "D2";
export type GroupingArrangement = "bunched" | "single-layer-tray-horizontal" | "buried-in-ducts";
export type ConductorArrangement = "multicore" | "singleCoreTrefoil" | "singleCoreFlatTouching";
export type CriterionId =
  | "mechanical" | "thermal" | "device" | "voltageDrop"
  | "pe" | "shortCircuit" | "loopImpedance" | "neutral";
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
export interface SelectedDevice {
  id: string; nominalCurrentA: number; curve: string | null; family: string; i2A: number;
}
export interface CableDetailedOptions {
  earthingSystem: "TN" | "TT";
  circuitRole: "final" | "distribution";
  breakerCurve: "B" | "C" | "D";
  peLocation: "in-cable" | "separate";
  conductorArrangement: ConductorArrangement;
  parallelConductors?: number;
  soilThermalResistivityKmPerW?: number;
  burialDepthM?: number;
  shortCircuit?: { prospectiveFaultKa: number; clearingTimeS: number };
  loopImpedance:
    | { method: "estimated" }
    | { method: "calculated"; prospectiveEarthFaultKa: number }
    | { method: "measured"; sourceImpedanceOhm: number };
}
export interface CableSelectOutput {
  mode: CableSelectMode;
  selectedSectionMm2: number;
  designCurrentA: number;
  sizingCurrentA: number;
  kT: number; kG: number; kH: number; kS: number; kD: number; kTotal: number;
  izRequiredA: number;
  selectedDevice: SelectedDevice | null;
  peSectionMm2: number | null;
  neutralSectionMm2: number | null;
  candidateTrace: readonly CandidateEvaluation[];
  vdResult: CableResponse["value"]["vdResult"]; // reuse existing VD output type, do not duplicate
}
// NOTE: CableSelectResponse is intentionally NOT re-exported from @elektroplan/contracts.
// The contracts version (packages/contracts/src/schemas.ts cableSelectResponseSchema) has
// drifted to a loosely-typed `value: Record<string, unknown>` / `warnings: unknown[]` /
// `assumptions: unknown[]` shape, while this bridge type keeps the precise CableSelectOutput /
// structured warnings / AssumptionEntry[] shape that renderer code relies on. Do not swap this
// one without first tightening the contracts schema to match.
export interface CableSelectResponse {
  value: CableSelectOutput;
  warnings: readonly { code: string; messageKey: string; detail?: string }[];
  assumptions: readonly AssumptionEntry[];
  formulaVariant: string;
  dataVersion: string;
  engineVersion: string;
}

// NOTE: CableRulerResponse is deliberately NOT in the dedupe list (not part of the 37
// verified-compatible names) — keep this local declaration as-is.
export interface CableRulerResponse {
  value: CableRulerOutput;
  warnings: WarningEntry[];
  assumptions: AssumptionEntry[];
  formulaVariant: string;
  dataVersion: string;
  engineVersion: string;
}

export interface GroupCableSuggestionEntry {
  sectionMm2: number;
  label: string;
  ambient: CableRulerAmbient;
  ampacityA: number;
  standardHintMm2?: 2.5 | 4;
}

export interface GroupCableSuggestionResult {
  toprak_20C: GroupCableSuggestionEntry | null;
  hava_30C: GroupCableSuggestionEntry | null;
}

// ── Protection ────────────────────────────────────────────────────────────────
// NOTE: ProtectionResponse is intentionally NOT re-exported from @elektroplan/contracts.
// The contracts version is a structured `ProtectionCandidate[]`, while this bridge type is a
// loose `unknown[]` — a real shape drift, not just a naming difference. Swapping would change
// what call sites are allowed to assume about array elements. Leave local until reconciled.
export type ProtectionResponse = unknown[];

// ── Records / Groups ──────────────────────────────────────────────────────────
export type CalculatorKind =
  | "motor"
  | "voltage-drop"
  | "voltage-drop-group"
  | "cable"
  | "protection"
  | "manual-current";

export interface MotorCalculationRecord {
  id: string;
  calculator: "motor";
  title?: string;
  grouping?: GroupingMetadata;
  version: RecordVersion;
  input: MotorRequest;
  output: MotorResponse;
}

export interface VoltageDropCalculationRecord {
  id: string;
  calculator: "voltage-drop";
  title?: string;
  grouping?: GroupingMetadata;
  version: RecordVersion;
  input: VoltageDropRequest;
  output: VoltageDropResponse;
}

export interface VoltageDropGroupCalculationRecord {
  id: string;
  calculator: "voltage-drop-group";
  title?: string;
  grouping?: GroupingMetadata;
  version: RecordVersion;
  input: VoltageDropGroupRequest;
  output: VoltageDropGroupResponse;
}

export interface CableCalculationRecord {
  id: string;
  calculator: "cable";
  title?: string;
  grouping?: GroupingMetadata;
  version: RecordVersion;
  input: CableRequest;
  output: CableResponse;
}

export interface ProtectionCalculationRecord {
  id: string;
  calculator: "protection";
  title?: string;
  grouping?: GroupingMetadata;
  version: RecordVersion;
  input: ProtectionRequest;
  output: ProtectionResponse;
}

export interface ManualCurrentCalculationRecord {
  id: string;
  calculator: "manual-current";
  title?: string;
  grouping?: GroupingMetadata;
  version: RecordVersion;
  input: ManualCurrentRequest;
  output: ManualCurrentResponse;
}

// NOTE: CalculationRecord is intentionally NOT re-exported from @elektroplan/contracts, even
// though its per-calculator shapes match. Contracts builds its union from its own
// recordBaseSchema, whose `title` field infers to `string | undefined` (zod always adds this
// explicitly for `.optional()`); this file's per-calculator *CalculationRecord interfaces above
// declare `title?: string` (no explicit undefined). Under `exactOptionalPropertyTypes: true`
// these are NOT interchangeable — confirmed by real tsc failures in RecordDetail.tsx and
// VoltageDropPage.tsx when this was swapped (code narrows the contracts union and passes the
// result into functions typed against the local per-calculator record interfaces). Leave local
// until reconciled.
export type CalculationRecord =
  | MotorCalculationRecord
  | VoltageDropCalculationRecord
  | VoltageDropGroupCalculationRecord
  | CableCalculationRecord
  | ProtectionCalculationRecord
  | ManualCurrentCalculationRecord;

export const PROJECT_MARKER_TAG = "project" as const;

export function isProjectGroup(group: CalculationGroup): boolean {
  if (group.parentGroupId !== undefined) {
    return false;
  }

  return group.tags?.includes(PROJECT_MARKER_TAG) === true;
}

// ── Motor table DTO ───────────────────────────────────────────────────────────
export interface MotorTableEntryDto {
  kW: number;
  PS: number;
  cosPhi: number;
  efficiencyPercent: number;
  currentA_220V: number;
  currentA_380V: number | null;
  cableSpec: string;
}

// ── Materials / Assignments ───────────────────────────────────────────────────
// NOTE: Material and MaterialAssignment are intentionally NOT re-exported from
// @elektroplan/contracts. The contracts versions narrow `unit` from `string` to the
// `MaterialUnit` enum ("adet" | "m" | "kg" | "set" | "paket") and narrow
// `attributes`/`snapshotAttributes` from `Record<string, unknown>` to a specific primitive
// union — a real type drift, not just a naming difference. Swapping would break any renderer
// code assigning a plain string/unknown value into those fields. Leave local until reconciled.
// (MaterialCategory itself IS re-exported above — its shape matches exactly.)

export interface Material {
  id: string; categoryId: string; name: string; orderValue?: number;
  brand?: string; modelCode?: string; unit?: string; unitPrice?: number;
  stockQty?: number; notes?: string; attributes?: Record<string, unknown>;
  source: "seed" | "user"; seedDataVersion?: string;
}

export interface MaterialAssignment {
  id: string; recordId: string; materialId: string | null;
  quantity: number; unit?: string;
  snapshotName: string; snapshotCategoryId: string; snapshotCategoryTitle: string;
  snapshotBrand?: string; snapshotModelCode?: string;
  snapshotUnitPrice?: number; snapshotAttributes?: Record<string, unknown>;
  orderValue?: number;
}

export interface ImportSummary {
  categoriesAdded: number; materialsAdded: number; materialsUpdated: number; untouched: number;
}

// ── Bridge ────────────────────────────────────────────────────────────────────
export interface ElektroPlanBridge {
  readonly runtime: Readonly<{
    platform: string;
    versions: Readonly<{ chrome: string; electron: string; node: string }>;
  }>;
  readonly calc: Readonly<{
    motor(request: MotorRequest): Promise<MotorResponse>;
    voltageDrop(request: VoltageDropRequest): Promise<VoltageDropResponse>;
    voltageDropGroup(request: VoltageDropGroupRequest): Promise<VoltageDropGroupResponse>;
    cable(request: CableRequest): Promise<CableResponse>;
    cableSelect(request: CableSelectRequest): Promise<CableSelectResponse>;
    cableRuler(request: CableRulerRequest): Promise<CableRulerResponse>;
    groupCableSuggest(groupTotalCurrentA: number): Promise<GroupCableSuggestionResult>;
    protection(request: ProtectionRequest): Promise<ProtectionResponse>;
  }>;
  readonly data: Readonly<{
    motorTable(): Promise<readonly MotorTableEntryDto[]>;
    cableRulerTable(): Promise<readonly CableRulerEntryDto[]>;
    voltageDropProfiles(): Promise<readonly VoltageDropProfileSummary[]>;
    defaultVoltageDropProfile(): Promise<VoltageDropProfileSummary>;
    installationMethods(): Promise<readonly string[]>;
  }>;
  readonly records: Readonly<{
    list(options?: { groupId?: string }): Promise<readonly CalculationRecord[]>;
    get(id: string): Promise<CalculationRecord | null>;
    save(record: CalculationRecord): Promise<CalculationRecord>;
    delete(id: string): Promise<boolean>;
  }>;
  readonly groups: Readonly<{
    list(): Promise<readonly CalculationGroup[]>;
    save(group: CalculationGroup): Promise<CalculationGroup>;
    delete(id: string): Promise<boolean>;
    duplicate(sourceGroupId: string, newTitle: string): Promise<CalculationGroup>;
  }>;
  readonly export: Readonly<{
    json(bundle: ExportPayloadBundle): Promise<ExportResult>;
    excel(bundle: ExportPayloadBundle): Promise<ExportResult>;
    pdf(bundle: ExportPdfPayload): Promise<ExportResult>;
  }>;
  readonly settings: Readonly<{
    get(key: string): Promise<SettingRecord | null>;
    set(key: string, value: unknown): Promise<SettingRecord>;
    list(): Promise<readonly SettingRecord[]>;
    delete(key: string): Promise<boolean>;
  }>;
  readonly app: Readonly<{
    engineVersion(): Promise<string>;
    version(): Promise<string>;
  }>;
  readonly materials: Readonly<{
    listCategories(): Promise<readonly MaterialCategory[]>;
    upsertCategory(cat: MaterialCategory): Promise<MaterialCategory>;
    deleteCategory(id: string): Promise<boolean>;
    list(filter?: { categoryId?: string; search?: string }): Promise<readonly Material[]>;
    upsert(material: Material): Promise<Material>;
    delete(id: string): Promise<boolean>;
    importExcel(filePath: string, mode?: "merge"): Promise<ImportSummary>;
    pickExcel(): Promise<string | null>;
  }>;
  readonly assignments: Readonly<{
    listForRecords(recordIds: string[]): Promise<readonly MaterialAssignment[]>;
    upsert(assignment: MaterialAssignment): Promise<MaterialAssignment>;
    delete(id: string): Promise<boolean>;
  }>;
}

declare global {
  interface Window {
    elektroPlan?: ElektroPlanBridge;
  }
}
