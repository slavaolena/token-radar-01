/**
 * Small string utilities for token-radar-01.
 */

/**
 * Format a value as a JSON line string with 2-space indentation.
 */
export function jsonLine(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/**
 * Return plural suffix: "s" when count is not 1, empty string otherwise.
 */
export function pluralSuffix(count: number): string {
  return count === 1 ? "" : "s";
}
