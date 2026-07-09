import { randomUUID } from "node:crypto";

import { ENGINE_VERSION } from "@elektroplan/calculation-core";
import { app, dialog, type IpcMain, type IpcMainInvokeEvent } from "electron";

import type { AppServices } from "../services/index.js";
import { IPC_CHANNELS, type IpcEnvelope } from "./channels.js";

type Handler = (
  event: IpcMainInvokeEvent,
  payload: unknown,
) => Promise<unknown> | unknown;

export interface IpcSecurityOptions {
  readonly devServerUrl?: string;
  readonly isDevelopment: boolean;
}

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof Error) {
    return { code: err.name || "Error", message: err.message };
  }
  return { code: "UnknownError", message: String(err) };
}

function wrap(handler: Handler): Handler {
  return async (event, payload) => {
    try {
      const value = await handler(event, payload);
      const envelope: IpcEnvelope<unknown> = { ok: true, value };
      return envelope;
    } catch (err) {
      const envelope: IpcEnvelope<never> = { ok: false, error: toError(err) };
      return envelope;
    }
  };
}

function isTrustedSender(
  event: IpcMainInvokeEvent,
  options: IpcSecurityOptions,
): boolean {
  const sender = event.sender as { getURL?: () => string };
  const senderUrl = sender.getURL?.();

  if (typeof senderUrl !== "string" || senderUrl.length === 0) {
    return false;
  }

  if (options.isDevelopment && options.devServerUrl) {
    const senderOrigin = extractHttpOrigin(senderUrl);
    const expectedOrigin = extractHttpOrigin(options.devServerUrl);

    if (senderOrigin === null || expectedOrigin === null) {
      return false;
    }

    return senderOrigin === expectedOrigin;
  }

  return senderUrl.startsWith("file://");
}

function extractHttpOrigin(url: string): string | null {
  const match = /^(https?:\/\/[^/]+)/i.exec(url);
  return match?.[1] ?? null;
}

function secureHandle(
  ipcMain: IpcMain,
  channel: string,
  options: IpcSecurityOptions,
  handler: Handler,
): void {
  ipcMain.handle(
    channel,
    wrap((event, payload) => {
      if (!isTrustedSender(event, options)) {
        throw new Error(`Blocked IPC request on '${channel}' from an untrusted renderer.`);
      }

      return handler(event, payload);
    }),
  );
}

function assertOptionalGroupId(payload: unknown): string | undefined {
  if (payload === undefined || payload === null) {
    return undefined;
  }
  if (typeof payload === "object") {
    const candidate = (payload as { groupId?: unknown }).groupId;
    if (candidate === undefined) {
      return undefined;
    }
    if (typeof candidate !== "string" || candidate.length === 0) {
      throw new TypeError("groupId must be a non-empty string.");
    }
    return candidate;
  }
  throw new TypeError("records:list payload must be an object or undefined.");
}

function assertSettingSetPayload(payload: unknown): {
  key: string;
  value: unknown;
} {
  if (typeof payload !== "object" || payload === null) {
    throw new TypeError("settings:set payload must be an object.");
  }
  const { key, value } = payload as { key?: unknown; value?: unknown };
  if (typeof key !== "string" || key.length === 0) {
    throw new TypeError("settings:set payload must include a non-empty `key`.");
  }
  if (value === undefined) {
    throw new TypeError("settings:set payload must include a `value`.");
  }
  return { key, value };
}

/**
 * Pulls the `sourceGroupId`/`newTitle` fields off an IPC payload without
 * validating them — shape extraction only. `records.duplicateGroup` is the
 * single validation boundary; it throws for non-string/blank values.
 */
function extractDuplicateGroupPayload(payload: unknown): {
  newTitle: unknown;
  sourceGroupId: unknown;
} {
  const candidate = (payload ?? {}) as {
    newTitle?: unknown;
    sourceGroupId?: unknown;
  };
  return { newTitle: candidate.newTitle, sourceGroupId: candidate.sourceGroupId };
}

/**
 * Pulls `filePath`/`mode` off an IPC payload without validating them — shape
 * extraction only, needed to look up the resolved path behind the opaque
 * import handle. `materials.importExcel` is the single validation boundary
 * for `mode`; an invalid/missing `filePath` naturally misses the handle map
 * below and produces the same error as before.
 */
function extractMaterialsImportPayload(payload: unknown): {
  filePath: unknown;
  mode: unknown;
} {
  const candidate = (payload ?? {}) as { filePath?: unknown; mode?: unknown };
  return { filePath: candidate.filePath, mode: candidate.mode };
}

export function registerIpcHandlers(
  ipcMain: IpcMain,
  services: AppServices,
  securityOptions: IpcSecurityOptions,
): void {
  const excelImportHandles = new Map<string, string>();

  secureHandle(
    ipcMain,
    IPC_CHANNELS.CalcMotor,
    securityOptions,
    (_event, payload) => services.calculate.runMotor(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.CalcVoltageDrop,
    securityOptions,
    (_event, payload) => services.calculate.runVoltageDrop(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.CalcVoltageDropGroup,
    securityOptions,
    (_event, payload) => services.calculate.runVoltageDropGroup(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.CalcCable,
    securityOptions,
    (_event, payload) => services.calculate.runCable(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.CalcCableRuler,
    securityOptions,
    (_event, payload) => services.calculate.runCableRuler(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.CalcGroupCableSuggest,
    securityOptions,
    (_event, payload) => services.calculate.runGroupCableSuggest(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.CalcProtection,
    securityOptions,
    (_event, payload) => services.calculate.runProtection(payload),
  );

  secureHandle(
    ipcMain,
    IPC_CHANNELS.DataMotorTable,
    securityOptions,
    () => services.calculate.listMotorTableEntries(),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.DataCableRulerTable,
    securityOptions,
    () => services.calculate.listCableRulerEntries(),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.DataVoltageDropProfiles,
    securityOptions,
    () => services.calculate.listVoltageDropProfiles(),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.DataDefaultVoltageDropProfile,
    securityOptions,
    () => services.calculate.getDefaultVoltageDropProfile(),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.DataInstallationMethods,
    securityOptions,
    () => services.calculate.getInstallationMethods(),
  );

  secureHandle(
    ipcMain,
    IPC_CHANNELS.RecordsList,
    securityOptions,
    (_event, payload) => {
      const groupId = assertOptionalGroupId(payload);
      return services.records.listRecords(
        groupId === undefined ? undefined : { groupId },
      );
    },
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.RecordsGet,
    securityOptions,
    (_event, payload) => services.records.getRecord(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.RecordsSave,
    securityOptions,
    (_event, payload) => services.records.saveRecord(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.RecordsDelete,
    securityOptions,
    (_event, payload) => services.records.deleteRecord(payload),
  );

  secureHandle(
    ipcMain,
    IPC_CHANNELS.GroupsList,
    securityOptions,
    () => services.records.listGroups(),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.GroupsSave,
    securityOptions,
    (_event, payload) => services.records.saveGroup(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.GroupsDelete,
    securityOptions,
    (_event, payload) => services.records.deleteGroup(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.GroupsDuplicate,
    securityOptions,
    (_event, payload) => {
      const { newTitle, sourceGroupId } = extractDuplicateGroupPayload(payload);
      return services.records.duplicateGroup(sourceGroupId, newTitle);
    },
  );

  secureHandle(
    ipcMain,
    IPC_CHANNELS.ExportJson,
    securityOptions,
    (_event, payload) => services.export.exportJson(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.ExportExcel,
    securityOptions,
    (_event, payload) => services.export.exportExcel(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.ExportPdf,
    securityOptions,
    (_event, payload) => services.export.exportPdf(payload),
  );

  secureHandle(
    ipcMain,
    IPC_CHANNELS.SettingsGet,
    securityOptions,
    (_event, payload) => services.settings.getSetting(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.SettingsSet,
    securityOptions,
    (_event, payload) => {
      const { key, value } = assertSettingSetPayload(payload);
      return services.settings.setSetting(key, value as never);
    },
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.SettingsList,
    securityOptions,
    () => services.settings.listSettings(),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.SettingsDelete,
    securityOptions,
    (_event, payload) => services.settings.deleteSetting(payload),
  );

  secureHandle(
    ipcMain,
    IPC_CHANNELS.AppEngineVersion,
    securityOptions,
    () => ENGINE_VERSION,
  );

  secureHandle(
    ipcMain,
    IPC_CHANNELS.AppVersion,
    securityOptions,
    () => app.getVersion(),
  );

  secureHandle(
    ipcMain,
    IPC_CHANNELS.MaterialsListCategories,
    securityOptions,
    () => services.materials.listCategories(),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.MaterialsUpsertCategory,
    securityOptions,
    (_event, payload) => services.materials.upsertCategory(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.MaterialsDeleteCategory,
    securityOptions,
    (_event, payload) => services.materials.deleteCategory(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.MaterialsList,
    securityOptions,
    (_event, payload) => services.materials.listMaterials(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.MaterialsUpsert,
    securityOptions,
    (_event, payload) => services.materials.upsertMaterial(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.MaterialsDelete,
    securityOptions,
    (_event, payload) => services.materials.deleteMaterial(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.MaterialsImportExcel,
    securityOptions,
    async (_event, payload) => {
      const { filePath, mode } = extractMaterialsImportPayload(payload);
      if (typeof filePath !== "string") {
        throw new Error("Excel import handle is missing, expired, or invalid.");
      }

      const resolvedPath = excelImportHandles.get(filePath);
      if (resolvedPath === undefined) {
        throw new Error("Excel import handle is missing, expired, or invalid.");
      }

      excelImportHandles.delete(filePath);
      return services.materials.importExcel({ filePath: resolvedPath, mode });
    },
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.MaterialsPickExcel,
    securityOptions,
    async () => {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });

      const selectedPath = result.filePaths[0] ?? null;
      if (result.canceled || selectedPath === null) {
        return null;
      }

      const importHandle = randomUUID();
      excelImportHandles.set(importHandle, selectedPath);
      return importHandle;
    },
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.AssignmentsListForRecords,
    securityOptions,
    (_event, payload) => services.materials.listAssignments(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.AssignmentsUpsert,
    securityOptions,
    (_event, payload) => services.materials.upsertAssignment(payload),
  );
  secureHandle(
    ipcMain,
    IPC_CHANNELS.AssignmentsDelete,
    securityOptions,
    (_event, payload) => services.materials.deleteAssignment(payload),
  );
}
