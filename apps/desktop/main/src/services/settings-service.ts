import type {
  JsonValue,
  SettingsRepository,
  StorageSetting,
} from "@elektroplan/storage";

export interface SettingsService {
  getSetting(key: unknown): StorageSetting | null;
  setSetting(key: unknown, value: unknown): StorageSetting;
  listSettings(): readonly StorageSetting[];
  deleteSetting(key: unknown): boolean;
}

function assertKey(key: unknown): asserts key is string {
  if (typeof key !== "string" || key.length === 0) {
    throw new TypeError("Setting key must be a non-empty string.");
  }
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (valueType === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

function assertJsonValue(value: unknown): asserts value is JsonValue {
  if (!isJsonValue(value)) {
    throw new TypeError("Setting value must be a JSON-serializable value.");
  }
}

export function createSettingsService(
  repository: SettingsRepository,
): SettingsService {
  return {
    getSetting(key) {
      assertKey(key);
      return repository.get(key);
    },
    setSetting(key, value) {
      assertKey(key);
      assertJsonValue(value);
      return repository.set(key, value);
    },
    listSettings() {
      return repository.list();
    },
    deleteSetting(key) {
      assertKey(key);
      return repository.delete(key);
    },
  };
}
