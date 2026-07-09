import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { openStorageDatabase } from "@elektroplan/storage";

import { createSettingsService } from "./settings-service.js";

function newService() {
  const db = openStorageDatabase({ filename: ":memory:" });
  return { db, service: createSettingsService(db.repositories.settings) };
}

describe("SettingsService key validation", () => {
  it("getSetting rejects a non-string key coming from an untrusted (unknown) caller", () => {
    const { db, service } = newService();
    const untrusted: unknown = { key: "theme" };

    assert.throws(
      () => service.getSetting(untrusted),
      /Setting key must be a non-empty string\./,
    );

    db.close();
  });

  it("getSetting rejects an empty string key", () => {
    const { db, service } = newService();

    assert.throws(
      () => service.getSetting(""),
      /Setting key must be a non-empty string\./,
    );

    db.close();
  });

  it("deleteSetting rejects a non-string key coming from an untrusted (unknown) caller", () => {
    const { db, service } = newService();
    const untrusted: unknown = 42;

    assert.throws(
      () => service.deleteSetting(untrusted),
      /Setting key must be a non-empty string\./,
    );

    db.close();
  });

  it("getSetting/setSetting/deleteSetting round-trip with a valid key", () => {
    const { db, service } = newService();

    service.setSetting("theme", "dark");
    const stored = service.getSetting("theme");
    assert.equal(stored?.value, "dark");

    assert.equal(service.deleteSetting("theme"), true);
    assert.equal(service.getSetting("theme"), null);

    db.close();
  });
});

describe("SettingsService setSetting value validation", () => {
  it("accepts nested JSON-serializable values without a cast at the call site", () => {
    const { db, service } = newService();

    const stored = service.setSetting("layout", {
      panels: ["left", "right"],
      widths: [240, null, 320],
      collapsed: false,
    });

    assert.deepEqual(stored.value, {
      panels: ["left", "right"],
      widths: [240, null, 320],
      collapsed: false,
    });

    db.close();
  });

  it("rejects a value that isn't JSON-serializable (e.g. a function) from an untrusted caller", () => {
    const { db, service } = newService();
    const untrusted: unknown = () => "not json";

    assert.throws(
      () => service.setSetting("theme", untrusted),
      /Setting value must be a JSON-serializable value\./,
    );

    db.close();
  });

  it("rejects undefined as a value from an untrusted caller", () => {
    const { db, service } = newService();
    const untrusted: unknown = undefined;

    assert.throws(
      () => service.setSetting("theme", untrusted),
      /Setting value must be a JSON-serializable value\./,
    );

    db.close();
  });
});
