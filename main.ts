/**
 * Token Radar - Main Entry Point
 *
 * --- Fix Log: token-radar-01 round 7 (run_completes failure) ---
 *
 * Bug 1 - Import paths used .ts extension but Node22 ESM requires .js
 *   Changed: './lib/model'  → './lib/model.js'
 *   Changed: './lib/strings' → './lib/strings.js'
 *
 * Bug 2 - __dirname is not defined in ES modules
 *   Added:  import { fileURLToPath } from 'url';
 *   Added:  const __dirname = dirname(fileURLToPath(import.meta.url));
 *
 * After fixes: node main.ts --input input/snapshot.json --output /tmp/test-output
 *   Exit code 0, processes 758 protocols, writes board.json and dashboard files.
 * ---
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import { parseSnapshot, buildBoard, impliedValue } from './lib/model.js';
import { jsonLine } from './lib/strings.js';

// --- CLI argument parsing (simple) ---

function parseArgs(): { input: string; output: string } {
  const args = process.argv.slice(2);
  let input = 'input/snapshot.json';
  let output = 'output';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' && args[i + 1]) {
      input = args[i + 1];
      i++;
    } else if (arg === '--output' && args[i + 1]) {
      output = args[i + 1];
      i++;
    }
  }

  return { input, output };
}

// --- Main ---

async function main(): Promise<void> {
  const { input, output } = parseArgs();

  console.log(`📡 Token Radar starting...`);
  console.log(`📂 Input:  ${input}`);
  console.log(`📁 Output: ${output}`);

  // 1. Read snapshot.json
  const raw = readFileSync(input, 'utf-8');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('❌ Failed to parse snapshot JSON:', err);
    process.exit(1);
  }

  // 2. Parse snapshots
  const snapshots = parseSnapshot(data);
  console.log(`📊 Parsed ${snapshots.length} protocol entries`);

  if (snapshots.length === 0) {
    console.warn('⚠️  No protocols found in snapshot. Writing empty board.');
  }

  // 3. Build board
  const board = buildBoard(snapshots);
  const rows = board.rows;
  console.log(`🏆 Built board with ${rows.length} ranked rows`);

  // Log top 5
  rows.slice(0, 5).forEach(row => {
    console.log(`   #${row.rank} ${row.name} (slug: ${row.slug}) — $${row.implied_value_usd.toLocaleString()} implied`);
  });

  // 4. Ensure output directory exists
  if (!existsSync(output)) {
    mkdirSync(output, { recursive: true });
  }

  // 5. Write board.json
  const outPath = join(output, 'board.json');
  writeFileSync(outPath, JSON.stringify(board, null, 2), 'utf-8');
  console.log(`✅ Wrote board to ${outPath}`);

  // 6. Copy dashboard files to output
  const dashboardDir = join(__dirname, 'dashboard');
  if (existsSync(dashboardDir)) {
    const files = ['index.html', 'app.css', 'app.js'];
    files.forEach(file => {
      const src = join(dashboardDir, file);
      if (existsSync(src)) {
        const dst = join(output, file);
        copyFileSync(src, dst);
        console.log(`📄 Copied ${file} → ${output}`);
      }
    });
  } else {
    console.warn('⚠️  Dashboard directory not found, skipping copy.');
  }

  // 7. Summary report
  console.log('\n📋 Token Radar Summary');
  console.log(`==================`);
  console.log(`Input:  ${input}`);
  console.log(`Output: ${output}`);
  console.log(`Protocols scored: ${snapshots.length}`);
  console.log(`Board rows: ${rows.length}`);
  console.log(`Top implied value: $${rows.length > 0 ? rows[0].implied_value_usd.toLocaleString() : 'N/A'}`);
  console.log(`Lowest implied value: $${rows.length > 0 ? rows[rows.length - 1].implied_value_usd.toLocaleString() : 'N/A'}`);
}

main().catch(err => {
  console.error('❌ Token Radar fatal error:', err);
  process.exit(1);
});
