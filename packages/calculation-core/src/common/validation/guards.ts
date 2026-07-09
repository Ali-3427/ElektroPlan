export function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number.`);
  }
}

export function assertInRange(
  value: number,
  min: number,
  max: number,
  name: string,
  options?: { readonly exclusiveMin?: boolean }
): void {
  const violatesMin = options?.exclusiveMin ? value <= min : value < min;
  if (!Number.isFinite(value) || violatesMin || value > max) {
    const suffix = options?.exclusiveMin ? ` (exclusive of ${min})` : "";
    throw new RangeError(`${name} must be between ${min} and ${max}${suffix}.`);
  }
}

export function assertOneOf<T extends string | number>(
  value: T,
  allowedValues: readonly T[],
  name: string
): void {
  if (!allowedValues.includes(value)) {
    throw new RangeError(
      `${name} must be one of: ${allowedValues.join(", ")}.`
    );
  }
}
