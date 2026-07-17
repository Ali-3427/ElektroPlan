import assert from "node:assert/strict";

import {
  assertAscending,
  assertColumnsMatchSchema,
  assertExpectedRowCount,
  assertReferenceMetadata,
} from "../dist/index.js";

const expected = {
  standard: "IEC 60364-5-52",
  revision: "v1",
  validFrom: "2026-04-19",
};

assert.throws(
  () =>
    assertReferenceMetadata(
      { standard: "wrong", revision: "v1", validFrom: "2026-04-19" },
      expected,
      "ampacity",
    ),
  /standard/,
);

assert.throws(
  () =>
    assertReferenceMetadata(
      { standard: "IEC 60364-5-52", revision: "wrong", validFrom: "2026-04-19" },
      expected,
      "ampacity",
    ),
  /revision/,
);

assert.throws(
  () =>
    assertReferenceMetadata(
      { standard: "IEC 60364-5-52", revision: "v1", validFrom: "wrong" },
      expected,
      "ampacity",
    ),
  /validFrom/,
);

assert.doesNotThrow(() =>
  assertReferenceMetadata(
    { standard: "IEC 60364-5-52", revision: "v1", validFrom: "2026-04-19" },
    expected,
    "ampacity",
  ),
);

assert.throws(
  () => assertAscending([1, 2, 2, 3], "test entries"),
  /ascending/,
);
assert.throws(
  () => assertAscending([3, 2, 1], "test entries"),
  /ascending/,
);
assert.doesNotThrow(() => assertAscending([1, 2, 3, 4], "test entries"));
assert.doesNotThrow(() => assertAscending([], "test entries"));
assert.doesNotThrow(() => assertAscending([1], "test entries"));

assert.throws(
  () => assertColumnsMatchSchema(["a", "b"], ["a", "b", "c"], "test columns"),
  /test columns/,
);
assert.throws(
  () => assertColumnsMatchSchema(["a", "x", "c"], ["a", "b", "c"], "test columns"),
  /test columns/,
);
assert.doesNotThrow(() =>
  assertColumnsMatchSchema(["a", "b", "c"], ["a", "b", "c"], "test columns"),
);

assert.throws(
  () => assertExpectedRowCount(17, 18, "test rows"),
  /test rows/,
);
assert.throws(
  () => assertExpectedRowCount(18, undefined, "test rows"),
  /expectedRowCount/,
);
assert.doesNotThrow(() => assertExpectedRowCount(18, 18, "test rows"));

console.log("load-json-dataset assertion helper tests passed.");
