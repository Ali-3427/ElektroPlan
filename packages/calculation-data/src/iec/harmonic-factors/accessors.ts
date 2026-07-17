import { harmonicFactorDataset } from "./dataset.js";
import type {
  HarmonicFactorEntry,
  HarmonicFactorResult,
} from "./types.js";

function normalizeDecimal(value: number): number {
  return Number(value.toFixed(12));
}

function isWithinRange(
  value: number,
  entry: HarmonicFactorEntry,
): boolean {
  const {
    minPercent,
    maxPercent,
    minInclusive,
    maxInclusive,
  } = entry.range;

  const lowerBoundPass = minInclusive ? value >= minPercent : value > minPercent;
  const upperBoundPass =
    maxPercent === null
      ? true
      : maxInclusive
        ? value <= maxPercent
        : value < maxPercent;

  return lowerBoundPass && upperBoundPass;
}

export function getHarmonicFactor(
  thirdHarmonicPercent: number,
): HarmonicFactorResult | undefined {
  // Not-found convention: like the other accessors in this package
  // (getAmpacity, getGroupingFactor, getTempFactor, getProfileById), this
  // returns undefined rather than throwing for any input that doesn't
  // resolve to a usable result — including out-of-range input and a
  // (dataset-integrity-only) null factor for the matched range's basis.
  if (thirdHarmonicPercent < 0) {
    return undefined;
  }

  const entry = harmonicFactorDataset.entries.find((candidate) =>
    isWithinRange(thirdHarmonicPercent, candidate),
  );

  if (entry === undefined) {
    return undefined;
  }

  const factor =
    entry.sizingCurrentBasis === "phase"
      ? entry.phaseFactor
      : entry.neutralFactor;

  if (factor === null) {
    return undefined;
  }

  return {
    thirdHarmonicPercent,
    factor,
    appliedTo: entry.sizingCurrentBasis,
    sizingCurrentBasis: entry.sizingCurrentBasis,
    phaseFactor: entry.phaseFactor,
    neutralFactor: entry.neutralFactor,
    neutralCurrentMultiplier:
      entry.sizingCurrentBasis === "neutral"
        ? normalizeDecimal((thirdHarmonicPercent / 100) * 3)
        : null,
  };
}
