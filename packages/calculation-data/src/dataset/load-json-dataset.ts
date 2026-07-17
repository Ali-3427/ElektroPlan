import type { DatasetMetadata, DatasetWithMetadata } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertMetadataString(
  metadata: Record<string, unknown>,
  key: keyof DatasetMetadata,
  context: string,
): void {
  if (typeof metadata[key] !== "string" || metadata[key].trim().length === 0) {
    throw new Error(`Invalid dataset metadata '${key}' in ${context}.`);
  }
}

export function assertDatasetMetadata(
  metadata: unknown,
  context: string,
): asserts metadata is DatasetMetadata {
  if (!isRecord(metadata)) {
    throw new Error(`Dataset metadata must be an object in ${context}.`);
  }

  assertMetadataString(metadata, "id", context);
  assertMetadataString(metadata, "standard", context);
  assertMetadataString(metadata, "revision", context);
  assertMetadataString(metadata, "source", context);
  assertMetadataString(metadata, "validFrom", context);
  assertMetadataString(metadata, "notes", context);

  if (
    metadata.expectedRowCount !== undefined &&
    typeof metadata.expectedRowCount !== "number"
  ) {
    throw new Error(`Invalid dataset metadata 'expectedRowCount' in ${context}.`);
  }
}

export interface ReferenceMetadata {
  standard: string;
  revision: string;
  validFrom: string;
}

export function assertReferenceMetadata(
  metadata: Pick<DatasetMetadata, "standard" | "revision" | "validFrom">,
  expected: ReferenceMetadata,
  label: string,
): void {
  if (metadata.standard !== expected.standard) {
    throw new Error(
      `${label} dataset must declare standard '${expected.standard}'.`,
    );
  }

  if (metadata.revision !== expected.revision) {
    throw new Error(
      `${label} dataset must declare revision '${expected.revision}'.`,
    );
  }

  if (metadata.validFrom !== expected.validFrom) {
    throw new Error(
      `${label} dataset must declare validFrom '${expected.validFrom}'.`,
    );
  }
}

export function assertAscending(
  values: readonly number[],
  label: string,
): void {
  for (const [index, value] of values.entries()) {
    const previous = values[index - 1];
    if (index > 0 && previous !== undefined && value <= previous) {
      throw new Error(`${label} must be strictly ascending.`);
    }
  }
}

export function assertExpectedRowCount(
  actual: number,
  expectedRowCount: number | undefined,
  label: string,
): void {
  if (typeof expectedRowCount !== "number") {
    throw new Error(`${label} dataset metadata must declare 'expectedRowCount'.`);
  }

  if (actual !== expectedRowCount) {
    throw new Error(`${label} row count must be ${expectedRowCount}.`);
  }
}

export function assertColumnsMatchSchema<T>(
  columns: readonly T[],
  expected: readonly T[],
  label: string,
): void {
  if (
    columns.length !== expected.length ||
    columns.some((column, index) => column !== expected[index])
  ) {
    throw new Error(`${label} do not match the expected schema.`);
  }
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
  } else if (isRecord(value)) {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue);
    }
  }

  return Object.freeze(value);
}

export function loadJsonDataset<T extends DatasetWithMetadata>(
  dataset: T,
  context: string,
): Readonly<T> {
  if (!isRecord(dataset)) {
    throw new Error(`Dataset must be an object in ${context}.`);
  }

  assertDatasetMetadata(dataset.metadata, context);
  return deepFreeze(dataset);
}
