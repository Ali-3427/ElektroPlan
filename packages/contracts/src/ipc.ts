// Single source of truth for the Electron IPC channel map and envelope type,
// shared between apps/desktop/main and apps/desktop/preload. Both packages
// already depend on @elektroplan/contracts, and preload cannot depend on
// main directly (they are bundled as separate Electron processes), so this
// is the one location both build graphs can import from without duplication.
export const IPC_CHANNELS = Object.freeze({
  CalcMotor: "calc:motor",
  CalcVoltageDrop: "calc:vd",
  CalcVoltageDropGroup: "calc:vd-group",
  CalcCable: "calc:cable",
  CalcCableSelect: "calc:cable-select",
  CalcCableRuler: "calc:cable-ruler",
  CalcGroupCableSuggest: "calc:group-cable-suggest",
  CalcProtection: "calc:protection",
  DataMotorTable: "data:motor-table",
  DataCableRulerTable: "data:cable-ruler-table",
  DataVoltageDropProfiles: "data:vd-profiles",
  DataDefaultVoltageDropProfile: "data:vd-default-profile",
  DataInstallationMethods: "data:installation-methods",
  RecordsList: "records:list",
  RecordsGet: "records:get",
  RecordsSave: "records:save",
  RecordsDelete: "records:delete",
  GroupsList: "groups:list",
  GroupsSave: "groups:save",
  GroupsDelete: "groups:delete",
  GroupsDuplicate: "groups:duplicate",
  ExportJson: "export:json",
  ExportExcel: "export:excel",
  ExportPdf: "export:pdf",
  SettingsGet: "settings:get",
  SettingsSet: "settings:set",
  SettingsList: "settings:list",
  SettingsDelete: "settings:delete",
  AppEngineVersion: "app:engine-version",
  AppVersion: "app:version",
  MaterialsListCategories: "materials:list-categories",
  MaterialsUpsertCategory: "materials:upsert-category",
  MaterialsDeleteCategory: "materials:delete-category",
  MaterialsList: "materials:list",
  MaterialsUpsert: "materials:upsert",
  MaterialsDelete: "materials:delete",
  MaterialsImportExcel: "materials:import-excel",
  MaterialsPickExcel: "materials:pick-excel",
  AssignmentsListForRecords: "assignments:list-for-records",
  AssignmentsUpsert: "assignments:upsert",
  AssignmentsDelete: "assignments:delete",
} as const);

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type IpcEnvelope<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | {
      readonly ok: false;
      readonly error: { readonly code: string; readonly message: string };
    };
