import assert from "node:assert/strict";

import { assertReferenceMetadata } from "../dist/index.js";

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

console.log("load-json-dataset assertion helper tests passed.");
