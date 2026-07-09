import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createCalculateService } from "./calculate-service.js";

describe("CalculateService runGroupCableSuggest", () => {
  it("accepts a raw finite number payload", () => {
    const service = createCalculateService();

    const result = service.runGroupCableSuggest(16);

    assert.ok(result.toprak_20C !== undefined);
    assert.ok(result.hava_30C !== undefined);
  });

  it("extracts groupTotalCurrentA from a wrapped IPC-style payload", () => {
    const service = createCalculateService();

    const result = service.runGroupCableSuggest({ groupTotalCurrentA: 16 });

    assert.ok(result.toprak_20C !== undefined);
    assert.ok(result.hava_30C !== undefined);
  });

  it("rejects a non-finite groupTotalCurrentA", () => {
    const service = createCalculateService();

    assert.throws(
      () => service.runGroupCableSuggest(Number.NaN),
      /groupTotalCurrentA must be a finite number\./,
    );
  });

  it("rejects a wrapped payload with a non-finite groupTotalCurrentA", () => {
    const service = createCalculateService();

    assert.throws(
      () => service.runGroupCableSuggest({ groupTotalCurrentA: Number.NaN }),
      /groupTotalCurrentA must be a finite number\./,
    );
  });

  it("rejects a payload that has neither a raw number nor a groupTotalCurrentA field", () => {
    const service = createCalculateService();

    assert.throws(
      () => service.runGroupCableSuggest({ notIt: 16 }),
      /groupTotalCurrentA must be a finite number\./,
    );
  });
});
