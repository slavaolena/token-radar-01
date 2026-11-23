/**
 * Token Radar - String Utility Functions
 * Provides help for formatting, line handling, and string manipulation.
 */

/**
 * Convert a JSON object to a single-line string (no newlines, minimal whitespace).
 * Useful for compact logs or one-line file outputs.
 */
export function jsonLine(value: unknown): string {
  return JSON.stringify(value, null, 0).replace(/\s+/g, ' ');
}

/**
 * Return the plural suffix for a given count.
 * - "s" for most counts ≠ 1
 * - "" for count === 1
 */
export function pluralSuffix(count: number): string {
  return count === 1 ? '' : 's';
}
