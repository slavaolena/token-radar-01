// Runtime utilities for the token-radar-01 entry (Node 22, standard library only).

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** The scorer's text limit, in bytes. */
export const TEXT_MAX_BYTES = 65_536;

/** The scorer's screenshot count and per-image byte limits. */
export const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };

/** A screenshot filename accepted by the gate. */
export const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** Read --name <value> or --name=<value> from the arguments, or use the fallback. */
export function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

/** Copy a directory's regular files, skipping dotfiles and subdirectories; return their names. */
export function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}
