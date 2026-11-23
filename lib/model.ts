/**
 * Token Radar - Scoring Model
 * Reads snapshot.json, scores DeFi protocols, builds ranked board.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// --- Types ---

export interface ProtocolSnapshot {
  slug: string;
  name: string;
  tvl_usd: number;
  change_7d: number;       // percent, can be negative
  age_days: number;        // days since protocol launch/creation
  // optional extra fields are allowed
  [key: string]: unknown;
}

export interface FarmStep {
  title: string;
  description: string;
}

export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  implied_value_usd: number;
  farm_steps: string[];    // 3-12 strings, each 20-600 chars
}

export interface Board {
  rows: BoardRow[];
}

// --- Scoring constants ---

const TVL_WEIGHT = 0.25;
const CLAMP_MIN = -60;
const CLAMP_MAX = 120;
const MATURITY_AGE_MAX = 1095;

// --- Helpers ---

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// --- Implied value computation ---

/**
 * Compute an implied USD valuation for a single protocol snapshot.
 */
export function impliedValue(snapshot: ProtocolSnapshot): number {
  // base = tvl_usd * 0.25
  const base = snapshot.tvl_usd * TVL_WEIGHT;

  // growth = clamp(change_7d, -60, 120)%
  const growth = clamp(snapshot.change_7d, CLAMP_MIN, CLAMP_MAX);

  // growthMult = 1 + (growth/100) * 0.5
  const growthMult = 1 + (growth / 100) * 0.5;

  // maturity = 0.6 + min(age_days, 1095)/1095 * 0.4
  const ageCoeff = Math.min(snapshot.age_days, MATURITY_AGE_MAX) / MATURITY_AGE_MAX;
  const maturity = 0.6 + ageCoeff * 0.4;

  // implied = max(1, round(base * growthMult * maturity))
  let implied = base * growthMult * maturity;
  implied = Math.max(1, implied);

  return roundTo(implied, 2);
}

// --- Snapshot parsing ---

/**
 * Parse a snapshot JSON object into an array of ProtocolSnapshot.
 * Supports both array and object-with-entries shapes.
 */
export function parseSnapshot(data: unknown): ProtocolSnapshot[] {
  if (Array.isArray(data)) {
    return data.map((item): ProtocolSnapshot => {
      const obj = item as Record<string, unknown>;
      return {
        slug: String(obj.slug ?? ''),
        name: String(obj.name ?? ''),
        tvl_usd: typeof obj.tvl_usd === 'number' ? obj.tvl_usd : 0,
        change_7d: typeof obj.change_7d === 'number' ? obj.change_7d : 0,
        age_days: typeof obj.age_days === 'number' ? obj.age_days : 0,
      };
    });
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // If it has a "protocols" array, use it
    if (Array.isArray(obj.protocols)) {
      return parseSnapshot(obj.protocols);
    }
    // If it has an "entries" array, use it
    if (Array.isArray(obj.entries)) {
      return parseSnapshot(obj.entries);
    }
    // Otherwise, treat keys as protocol slugs (object-of-objects shape)
    const entries = Object.entries(obj);
    if (entries.length > 0 && entries.every(([, v]) => v && typeof v === 'object')) {
      return parseSnapshot(entries.map(([, v]) => v));
    }
  }

  // Fallback: empty array
  return [];
}

// --- Farm steps generation ---

/**
 * Generate 3-12 farm step descriptions for a protocol.
 * Each step is 20-600 characters.
 */
function generateFarmSteps(slug: string, name: string): string[] {
  const steps: string[] = [];

  // Step 1: connect wallet
  steps.push(
    `🔗 Step 1: Connect your wallet to ${name} (slug: ${slug}) — ensure you're on the official site and approve only the minimal required permissions.`
  );

  // Step 2: deposit/provide liquidity
  steps.push(
    `💧 Step 2: Deposit assets into the ${name} liquidity pool or staking contract — check which token pair offers the best risk-adjusted APR.`
  );

  // Step 3: stake or farm
  steps.push(
    `🌾 Step 3: Stake LP tokens or single-asset position in ${name} farming rewards — watch the reward token emission schedule and cliff periods.`
  );

  // Step 4: claim rewards
  steps.push(
    `🏆 Step 4: Claim or auto-compound ${name} rewards regularly — compound during high-emission phases to maximize cumulative yield.`
  );

  // Step 5: monitor risks
  steps.push(
    `🛡️ Step 5: Monitor ${name} for smart contract risk, token unlocks, and TVL changes — use on-chain dashboards and set alerts for large outflows.`
  );

  // Step 6: exit strategy
  steps.push(
    `🚪 Step 6: Plan an exit strategy for ${name} positions — consider unlock schedules, gas costs, and market liquidity before harvesting.`
  );

  // Ensure we have at least 3, at most 12
  if (steps.length < 3) {
    steps.push(`ℹ️ Additional: Review ${name} documentation and community channels before committing capital.`);
  }

  // Trim to max 12 (already 6, so fine)
  if (steps.length > 12) {
    return steps.slice(0, 12);
  }

  // Ensure each step is between 20 and 600 chars
  return steps.map(step => {
    if (step.length < 20) {
      return step.padEnd(20, '·');
    }
    if (step.length > 600) {
      return step.slice(0, 597) + '...';
    }
    return step;
  });
}

// --- Board building ---

/**
 * Build a ranked board from snapshot data.
 * Sorts by implied_value_usd descending, then assigns rank.
 */
export function buildBoard(snapshots: ProtocolSnapshot[]): Board {
  const scored = snapshots.map(snapshot => ({
    snapshot,
    implied: impliedValue(snapshot),
  }));

  // Sort by implied value descending
  scored.sort((a, b) => b.implied - a.implied);

  const rows: BoardRow[] = scored.map((item, index) => {
    const snap = item.snapshot;
    const farmSteps = generateFarmSteps(snap.slug, snap.name);

    return {
      rank: index + 1,
      slug: snap.slug,
      name: snap.name,
      implied_value_usd: item.implied,
      farm_steps: farmSteps,
    };
  });

  return { rows };
}

// --- Export helpers for main.ts ---

export { readFileSync, writeFileSync, mkdirSync, join };
