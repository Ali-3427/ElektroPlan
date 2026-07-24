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

describe("CalculateService runCableSelect", () => {
  const base = {
    mode: "standard",
    designCurrentA: 60,
    phase: 3,
    circuitKind: "power",
    conductorMaterial: "copper",
    insulation: "XLPE/EPR",
    installationMethod: "C",
    ambientTemperatureC: 30,
    groupedCircuits: 1,
    groupingArrangement: "bunched",
    thirdHarmonicPercent: 0,
    voltageDropLimitPercent: 5,
    voltageDrop: {
      systemType: "three-phase-ac-ll",
      lengthM: 25,
      baseVoltageV: 400,
      cosPhi: 0.9,
    },
  };

  it("selects a cross-section for a valid standard request", () => {
    const service = createCalculateService();

    const result = service.runCableSelect(base);

    assert.ok(result.value.selectedSectionMm2 > 0);
    assert.equal(result.value.mode, "standard");
  });

  it("rejects an invalid installation method via the schema", () => {
    const service = createCalculateService();

    assert.throws(() =>
      service.runCableSelect({ ...base, installationMethod: "E" }),
    );
  });
});
