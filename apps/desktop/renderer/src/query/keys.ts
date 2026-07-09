export const queryKeys = {
  motorTable: ["motor-table"] as const,
  cableRulerTable: ["cable-ruler-table"] as const,
  vdProfiles: ["vd-profiles"] as const,
  vdDefaultProfile: ["vd-default-profile"] as const,
  installationMethods: ["installation-methods"] as const,
  engineVersion: ["engine-version"] as const,
  appVersion: ["app-version"] as const,
  records: (groupId?: string) =>
    ["records", groupId ?? "__all__"] as const,
  recordById: (id: string) => ["records", "by-id", id] as const,
  groups: ["groups"] as const,
  settings: ["settings"] as const,
  setting: (key: string) => ["settings", key] as const,
  materialsAll: ["materials"] as const,
  materialCategories: ["materials", "categories"] as const,
  materialsList: (filter: { categoryId?: string; search?: string }) =>
    ["materials", "list", filter] as const,
  assignmentsAll: ["assignments"] as const,
  assignmentsForRecords: (sortedRecordIds: readonly string[]) =>
    ["assignments", sortedRecordIds] as const,
  groupCableSuggest: (groupId: string, totalCurrentACentiAmps: number) =>
    ["group-cable-suggest", groupId, totalCurrentACentiAmps] as const,
};
