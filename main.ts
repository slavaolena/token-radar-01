#!/usr/bin/env node
/**
 * Token radar entry-point.
 *
 * Usage:
 *   node main.ts --input  <path> --output <dir>
 *
 * Reads snapshot JSON, scores watchlist protocols, writes ranked board
 * to <output>/board.json, and copies dashboard/screenshots into <output>.
 */

import { parseSnapshot, buildBoard, writeBoard, copyScreenshots } from "./lib/model.ts";
import * as fs from "fs";
import * as path from "path";

// ── arg parse (no dependencies) ────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--input" && i + 1 < argv.length) {
      args.input = argv[++i];
    } else if (argv[i] === "--output" && i + 1 < argv.length) {
      args.output = argv[++i];
    }
  }
  return args;
}

// ── main ───────────────────────────────────────────────────────────────────

function main(): void {
  const args = parseArgs(process.argv);

  const inputPath = args.input ?? "input/snapshot.json";
  const outputDir = args.output ?? "out";

  console.log(`[token-radar-01] reading ${inputPath} ...`);

  if (!fs.existsSync(inputPath)) {
    console.error(`[error] input file not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf-8");
  const snapshot = parseSnapshot(raw);

  console.log(
    `[info] snapshot as_of=${snapshot.as_of} floor_usd=${snapshot.floor_usd} ` +
    `protocols=${snapshot.protocols.length} watchlist=${snapshot.watchlist.length}`
  );

  const board = buildBoard(snapshot);

  console.log(`[info] board built: ${board.length} rows`);

  // Write board.json
  const boardPath = path.join(outputDir, "board.json");
  fs.mkdirSync(outputDir, { recursive: true });
  writeBoard(board, boardPath);
  console.log(`[ok] wrote ${boardPath}`);

  // Copy screenshots if they exist
  const screenshotsSrc = path.join("dashboard", "screenshots");
  copyScreenshots(screenshotsSrc, outputDir);

  // Summary
  console.log(`\n=== TOP 5 ===`);
  for (let i = 0; i < Math.min(5, board.length); i++) {
    const row = board[i];
    console.log(
      `  #${row.rank} ${row.name}  implied=${row.implied_value_usd.toLocaleString()}  steps=${row.farm_steps.length}`
    );
  }

  console.log(`\n[done] token-radar-01 round 7 complete`);
}

main();
