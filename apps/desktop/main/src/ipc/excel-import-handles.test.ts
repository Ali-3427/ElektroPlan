import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { createExcelImportHandleStore } from "./excel-import-handles.js";

describe("createExcelImportHandleStore", () => {
  it("resolves a handle to the file path it was created with, then consumes it", () => {
    const store = createExcelImportHandleStore();

    const handle = store.create("C:/materials.xlsx");

    assert.equal(store.resolve(handle), "C:/materials.xlsx");
    // A handle can only be redeemed once.
    assert.equal(store.resolve(handle), undefined);
  });

  it("returns undefined for an unknown handle", () => {
    const store = createExcelImportHandleStore();

    assert.equal(store.resolve("not-a-real-handle"), undefined);
  });

  it("expires a handle after its TTL elapses, fixing the unbounded-growth leak", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const store = createExcelImportHandleStore(1000);

      const handle = store.create("C:/materials.xlsx");
      mock.timers.tick(1000);

      assert.equal(store.resolve(handle), undefined);
    } finally {
      mock.timers.reset();
    }
  });

  it("does not expire a handle before its TTL elapses", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const store = createExcelImportHandleStore(1000);

      const handle = store.create("C:/materials.xlsx");
      mock.timers.tick(999);

      assert.equal(store.resolve(handle), "C:/materials.xlsx");
    } finally {
      mock.timers.reset();
    }
  });
});
