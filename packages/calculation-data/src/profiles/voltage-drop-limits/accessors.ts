import { voltageDropProfilesDataset } from "./dataset.js";
import type { VoltageDropProfile, VoltageDropProfileId } from "./types.js";

export function getVoltageDropProfiles(): readonly VoltageDropProfile[] {
  return voltageDropProfilesDataset.profiles;
}

// NOTE (not-found convention, F4): unlike most accessors in this package,
// this intentionally still throws instead of returning `undefined`.
// `dataset.ts`'s `assertDataset` already guarantees at module-load time that
// `defaultProfileId` is present among `profiles`, so this throw is dead code
// under any dataset that has passed validation — the guard is defensive only.
// Its one external caller (`apps/desktop/main/src/services/calculate-service.ts`,
// workstream E's directory) declares a non-optional `VoltageDropProfile`
// return type and does not handle `undefined`, so switching this to the
// `undefined` convention would require a coordinated edit outside this
// package. Left as-is; revisit together with workstream E if desired.
export function getDefaultProfile(): VoltageDropProfile {
  const id = voltageDropProfilesDataset.defaultProfileId;
  const profile = voltageDropProfilesDataset.profiles.find((p) => p.id === id);
  if (!profile) {
    throw new Error(`Default VD profile '${id}' not found.`);
  }
  return profile;
}

export function getProfileById(
  id: VoltageDropProfileId | string,
): VoltageDropProfile | undefined {
  return voltageDropProfilesDataset.profiles.find((p) => p.id === id);
}
