/** The suffix for a regular English plural after a count. */
export function pluralSuffix(count: number): string {
  return count === 1 ? '' : 's';
}

/** Serialize a JSON value on one line, optionally as a script assignment. */
export function jsonLine(value: unknown, assignment?: string): string {
  const json = JSON.stringify(value);
  return assignment === undefined ? `${json}\n` : `${assignment}=${json};\n`;
}
