import { getHarmonicFactor } from "@elektroplan/calculation-data";

export interface SizingCurrentResult {
  sizingCurrentA: number;
  kH: number;
  basis: "phase" | "neutral";
}

export function computeSizingCurrent(
  designCurrentA: number,
  thirdHarmonicPercent: number,
): SizingCurrentResult {
  const harmonic = getHarmonicFactor(thirdHarmonicPercent);
  if (harmonic === undefined) {
    throw new RangeError(`No harmonic factor for h3 ${thirdHarmonicPercent}%.`);
  }

  if (harmonic.sizingCurrentBasis === "neutral" && harmonic.neutralCurrentMultiplier !== null) {
    return {
      sizingCurrentA: designCurrentA * harmonic.neutralCurrentMultiplier,
      kH: harmonic.factor,
      basis: "neutral",
    };
  }

  return { sizingCurrentA: designCurrentA, kH: harmonic.factor, basis: "phase" };
}
