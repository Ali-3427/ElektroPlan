import { peConductorTableDataset } from "./dataset.js";

export function getPeSectionByTable(lineSectionMm2: number): number {
  const row = peConductorTableDataset.entries.find(
    (r) => r.lineSectionMaxMm2 === null || lineSectionMm2 <= r.lineSectionMaxMm2,
  );
  if (row === undefined) {
    throw new RangeError(`No PE table row for line section ${lineSectionMm2} mm².`);
  }
  if (row.rule === "equal") return lineSectionMm2;
  if (row.rule === "half") return lineSectionMm2 / 2;
  if (row.peSectionMm2 === null) {
    throw new Error(`PE table 'fixed' row must declare peSectionMm2.`);
  }
  return row.peSectionMm2;
}
