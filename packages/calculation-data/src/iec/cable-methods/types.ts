export const CABLE_METHOD_CODES = ["A1", "A2", "B1", "B2", "C", "D1", "D2"] as const;
export type CableMethodCode = (typeof CABLE_METHOD_CODES)[number];

export function isCableMethodCode(value: unknown): value is CableMethodCode {
  return (CABLE_METHOD_CODES as readonly unknown[]).includes(value);
}
