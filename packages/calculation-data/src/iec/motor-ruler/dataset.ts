import standardMotorsJson from "./standard-motors.json" with { type: "json" };

import {
  assertColumnsMatchSchema,
  assertExpectedRowCount,
  loadJsonDataset,
} from "../../dataset/load-json-dataset.js";
import {
  MOTOR_TABLE_COLUMNS,
  type MotorTableDataset,
  type MotorTableEntry,
} from "./types.js";

const MOTOR_TABLE_DATASET_PATH =
  "packages/calculation-data/src/iec/motor-ruler/standard-motors.json";

function assertMotorTableEntry(
  entry: unknown,
  index: number,
): asserts entry is MotorTableEntry {
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`Motor table entry ${index} must be an object.`);
  }

  const candidate = entry as Record<string, unknown>;

  const requiredNumberFields = [
    "kW",
    "PS",
    "cosPhi",
    "efficiencyPercent",
    "currentA_220V",
  ] as const;

  for (const field of requiredNumberFields) {
    if (typeof candidate[field] !== "number") {
      throw new Error(`Motor table entry ${index} has invalid '${field}'.`);
    }
  }

  if (
    candidate.currentA_380V !== null &&
    typeof candidate.currentA_380V !== "number"
  ) {
    throw new Error(`Motor table entry ${index} has invalid 'currentA_380V'.`);
  }

  if (typeof candidate.cableSpec !== "string") {
    throw new Error(`Motor table entry ${index} has invalid 'cableSpec'.`);
  }
}

function assertMotorTableDataset(
  dataset: Readonly<MotorTableDataset>,
): Readonly<MotorTableDataset> {
  if (!Array.isArray(dataset.columns)) {
    throw new Error(`Motor table columns must be an array.`);
  }

  assertColumnsMatchSchema(
    dataset.columns,
    MOTOR_TABLE_COLUMNS,
    `Motor table columns in '${dataset.metadata.id}'`,
  );

  if (!Array.isArray(dataset.entries)) {
    throw new Error(`Motor table entries must be an array.`);
  }

  assertExpectedRowCount(
    dataset.entries.length,
    dataset.metadata.expectedRowCount,
    `Motor table '${dataset.metadata.id}'`,
  );

  dataset.entries.forEach((entry, index) => {
    assertMotorTableEntry(entry, index);
  });

  return dataset;
}

export const motorTableDataset = assertMotorTableDataset(
  loadJsonDataset(
    standardMotorsJson as MotorTableDataset,
    MOTOR_TABLE_DATASET_PATH,
  ),
);
