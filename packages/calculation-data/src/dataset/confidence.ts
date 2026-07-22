export const DATA_CONFIDENCE_VALUES = ["verified", "draft", "missing"] as const;
export type DataConfidence = (typeof DATA_CONFIDENCE_VALUES)[number];

export function assertConfidence(
  value: unknown,
  context: string,
): asserts value is DataConfidence {
  if (!(DATA_CONFIDENCE_VALUES as readonly unknown[]).includes(value)) {
    throw new Error(`Invalid data confidence '${String(value)}' in ${context}.`);
  }
}
