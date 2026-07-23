import { protectionCatalogDataset } from "./dataset.js";
import type {
  LetThroughPoint,
  ProtectionCatalogEntry,
  ProtectionDeviceLookupQuery,
} from "./types.js";

function compareEntries(
  left: ProtectionCatalogEntry,
  right: ProtectionCatalogEntry,
): number {
  return (
    left.nominalCurrentA - right.nominalCurrentA ||
    left.poles - right.poles ||
    left.voltageV - right.voltageV ||
    left.id.localeCompare(right.id)
  );
}

export function lookupProtectionDevice(
  query: Readonly<ProtectionDeviceLookupQuery>,
): readonly ProtectionCatalogEntry[] {
  if (
    typeof query.minimumNominalCurrentA !== "number" ||
    query.minimumNominalCurrentA <= 0
  ) {
    throw new Error(`lookupProtectionDevice requires a positive minimumNominalCurrentA.`);
  }

  if (
    query.limit !== undefined &&
    (!Number.isInteger(query.limit) || query.limit <= 0)
  ) {
    throw new Error(`lookupProtectionDevice limit must be a positive integer when provided.`);
  }

  const familyFilter = query.families !== undefined
    ? new Set(query.families)
    : null;

  const matches = protectionCatalogDataset.entries.filter((entry) => {
    if (entry.nominalCurrentA < query.minimumNominalCurrentA) {
      return false;
    }

    if (familyFilter !== null && !familyFilter.has(entry.family)) {
      return false;
    }

    if (query.poles !== undefined && entry.poles !== query.poles) {
      return false;
    }

    if (query.voltageV !== undefined && entry.voltageV !== query.voltageV) {
      return false;
    }

    if (query.curve !== undefined && entry.curve !== query.curve) {
      return false;
    }

    if (
      query.residualCurrentMa !== undefined &&
      entry.residualCurrentMa !== query.residualCurrentMa
    ) {
      return false;
    }

    return true;
  });

  matches.sort(compareEntries);
  return query.limit === undefined ? matches : matches.slice(0, query.limit);
}

/** Linear interpolation between catalog let-through points; null when absent. */
export function getLetThroughI2t(
  entryId: string,
  prospectiveFaultKa: number,
): number | null {
  const entry = protectionCatalogDataset.entries.find((e) => e.id === entryId);
  const points = entry?.letThroughI2t;
  if (entry === undefined || points === null || points === undefined || points.length === 0) {
    return null;
  }
  const sorted = [...points].sort((a, b) => a.prospectiveFaultKa - b.prospectiveFaultKa);
  const first = sorted[0] as LetThroughPoint;
  const last = sorted[sorted.length - 1] as LetThroughPoint;
  if (prospectiveFaultKa <= first.prospectiveFaultKa) return first.i2tA2s;
  if (prospectiveFaultKa >= last.prospectiveFaultKa) return last.i2tA2s;
  for (let i = 1; i < sorted.length; i += 1) {
    const lo = sorted[i - 1] as LetThroughPoint;
    const hi = sorted[i] as LetThroughPoint;
    if (prospectiveFaultKa <= hi.prospectiveFaultKa) {
      const span = hi.prospectiveFaultKa - lo.prospectiveFaultKa;
      const ratio = span === 0 ? 0 : (prospectiveFaultKa - lo.prospectiveFaultKa) / span;
      return lo.i2tA2s + ratio * (hi.i2tA2s - lo.i2tA2s);
    }
  }
  return last.i2tA2s;
}
