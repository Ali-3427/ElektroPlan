import { adiabaticKDataset } from "./dataset.js";
import type { AdiabaticKQuery } from "./types.js";

export function getAdiabaticK(query: AdiabaticKQuery): number | undefined {
  const matches = adiabaticKDataset.entries.filter(
    (e) =>
      e.material === query.material &&
      e.insulation === query.insulation &&
      e.role === query.role,
  );
  if (matches.length === 0) return undefined;

  // Prefer the most specific "above" row that the section exceeds.
  const above = matches
    .filter((e) => e.aboveSectionMm2 !== null && query.sectionMm2 > e.aboveSectionMm2)
    .sort((a, b) => (b.aboveSectionMm2 as number) - (a.aboveSectionMm2 as number))[0];
  if (above !== undefined) return above.k;

  return matches.find((e) => e.aboveSectionMm2 === null)?.k;
}
