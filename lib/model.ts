/**
 * Token radar scoring model — revised.
 *
 * Formula (from competition rules):
 *   base      = tvl_usd * 0.25
 *   growth    = clamp(change_7d, -60, 120)          // percent
 *   growthMult = 1 + (growth / 100) * 0.5
 *   maturity  = 0.6 + min(age_days, 1095) / 1095 * 0.4
 *   implied   = max(1, Math.round(base * growthMult * maturity))
 *
 * Revised: improved category detection + contextual farm steps.
 */

import { jsonLine } from "./strings.ts";
import * as fs from "fs";
import * as path from "path";

export interface Protocol {
  slug: string;
  name: string;
  category: string;
  chains: string[];
  tvl_usd: number;
  change_7d: number;
  mcap_usd: number | null;
  listed_at: string;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Protocol[];
  watchlist: string[];
}

export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  implied_value_usd: number;
  farm_steps: string[];
}

// ── helpers ────────────────────────────────────────────────────────────────

function clamp(val: number, lo: number, hi: number): number {
  return Math.min(Math.max(val, lo), hi);
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

// ── core scoring ───────────────────────────────────────────────────────────

export function impliedValue(p: Protocol, asOf: string): number {
  const base = p.tvl_usd * 0.25;
  const growth = clamp(p.change_7d, -60, 120);
  const growthMult = 1 + (growth / 100) * 0.5;
  const ageDays = daysBetween(p.listed_at, asOf);
  const maturity =
    0.6 + Math.min(ageDays, 1095) / 1095 * 0.4;
  const raw = base * growthMult * maturity;
  return Math.max(1, Math.round(raw));
}

// ── farm templates per category ───────────────────────────────────────────

type FarmTemplate = Record<string, string[]>;

const FARM_TEMPLATES: FarmTemplate = {
  // ── Risk Curators (portfolio/risk management) ──────────────────────────
  "risk-curators": [
    "1. Kunjungi situs protokol (biasanya https://<slug>.finance atau .io) dan baca homepage + about section. Estimasi waktu: 15-30 menit.",
    "2. Cari dokumentasi resmi (docs.<slug>.io atau docs.<slug>.com) untuk memahami model risiko: VaR, stress testing, scenario analysis. Estimasi: 1-2 jam.",
    "3. Identifikasi klien institusi dari press release, tweet, atau blog post. Catat nama nama perusahaan yang disebutkan. Waktu: 30-45 menit.",
    "4. Hitung fee structure: apakah AUM-based (biasanya 0.5-2%/tahun), performance fee (10-20%), atau retainer flat. Estimasi cost investigasi: gratis (public info).",
    "5. Tinjau apakah ada conflict of interest: layanan riset vs manajemen dana, token holdings, atau affiliate relationships. Waktu: 20-30 menit.",
    "6. Cari audit report dari audit firm ternama (OpenZeppelin, Trail of Bits, CertiK) di GitHub atau situs. Estimasi: 30 menit.",
    "7. Bandingkan TVL dan change_7d dengan kompetitor: Gauntlet, Chaos Labs, Risklens, EigenTech. Gunakan DefiLlama untuk benchmark. Waktu: 15-20 menit.",
    "8. Cek regulatory compliance: apakah terdaftar di SEC, MAS, atau regulator lokal. Biasanya ada di footer website atau compliance page. Estimasi: 15 menit.",
    "9. Monitor social media (Twitter/X, LinkedIn) untuk update product launch, client announcement, atau partnership. Waktu: 10-15 menit/hari.",
    "10. Evaluasi track record: cari case study atau whitepaper yang menunjukkan performance selama market stress (2022, 2025 crash). Estimasi: 1-2 jam.",
    "11. Catat apakah ada token governance atau plan for token launch. Cek blog, roadmap, atau governance forum. Waktu: 15-20 menit.",
    "12. Siapkan checklist due diligence: fee analysis, client concentration, regulatory status, audit status, token potential. Digunakan saat investasi atau partnership. Estimasi total: 1-3 hari.",
  ],

  // ── RWA (Real World Assets) ────────────────────────────────────────────
  "rwa": [
    "1. Identifikasi jenis aset RWA yang ditawarkan: treasury bills, corporate bonds, real estate, commodity, atau private credit. Baca whitepaper/ dokumentasi. Estimasi: 30-60 menit.",
    "2. Hitung yield yang ditawarkan vs risk-free rate (misal US Treasury 3-5%). Apakah yield yang ditawarkan realistis atau terlalu tinggi? Waktu: 15-20 menit.",
    "3. Tinjau partner yang terlibat: custodian bank (BNY Mellon, State Street), oracle (Chainlink), auditor. Cek kredibilitas partner. Estimasi: 30-45 menit.",
    "4. Evaluasi struktur legal: apakah menggunakan SPV di yurisdiksi tertentu (Delaware, Singapore, Cayman)? Baca term sheet atau offering document. Waktu: 30-60 menit.",
    "5. Hitung biaya investasi: minimum investment (biasanya $100k-$1M untuk institutional), fee structure (management fee 0.5-1%, performance fee), dan tax implication. Estimasi: 20-30 menit.",
    "6. Periksa liquidity: apakah ada secondary market atau redemption window? Biasanya RWA memiliki lock-up 1-12 bulan. Waktu: 15-20 menit.",
    "7. Tinjau regulasi: apakah ashii compliant dengan SEC, MiCA, atau local regulator? Kunjungi regulatory page atau cari berita compliance. Estimasi: 20-30 menit.",
    "8. Monitor perubahan interest rate yang mempengaruhi yield RWA. Gunakan Treasury yield curve atau Fed rate sebagai benchmark. Waktu: 10-15 menit.",
    "9. Bandingkan dengan kompetitor RWA: Ondo, Franklin Templeton, Superstate, Maple Finance, Goldfinch. Lihat mana yang punya track record lebih baik. Estimasi: 30-45 menit.",
    "10. Hitung implied value sebagai referensi potensi token atau valuation. Gunakan token-radar score untuk baseline. Waktu: 5-10 menit.",
    "11. Evaluasi credit risk: apakah ada credit enhancement, insurance, atau overcollateralization? Baca risk disclosure. Estimasi: 30-45 menit.",
    "12. Siapkan analisis scenario: apa yang terjadi jika ada default, liquidity crunch, atau regulatory change? Buat pro/con list. Waktu: 1-2 jam.",
  ],

  // ── Onchain Capital Allocator ──────────────────────────────────────────
  "onchain-capital-allocator": [
    "1. Identifikasi strategi investasi: vault strategy, market making, arbitrage (CVX/CRV arb, basis arb), yield farming, atau directional bet. Baca docs/strategy page. Estimasi: 30-45 menit.",
    "2. Hitung expected return berdasarkan historical performance atau target APY yang diklaim. Bandingkan dengan benchmark (ETH yield ~3-5%, stablecoin yield ~5-10%). Waktu: 20-30 menit.",
    "3. Evaluasi fee structure: management fee (biasanya 0.5-2%/tahun) + performance fee (10-20% dari profit). Hitung net return setelah fee. Estimasi: 15-20 menit.",
    "4. Tinjau apakah ada leverage: berapa multiplier yang digunakan (2x, 3x, 5x+)? Leverage meningkatkan return tapi juga risiko liquidation. Waktu: 20-30 menit.",
    "5. Periksa lock-up period: apakah investor bisa withdraw kapan saja atau ada lock-up 30/60/90 hari? Cek terms of service. Estimasi: 15-20 menit.",
    "6. Analisis diversifikasi: berapa strategy/protocol yang terlibat? Apakah terkoncentrasikan pada satu aset atau diversified? Waktu: 20-30 menit.",
    "7. Cari informasi tim: founder background (ex-DeFi, ex-tradfi, ex-hedge fund), track record, LinkedIn/GitHub. Estimasi: 15-20 menit.",
    "8. Tentukan apakah strategi market-neutral (minimal correlation ke market) atau directional ( correlated ke crypto market). Ini penting untuk portfolio construction. Waktu: 10-15 menit.",
    "9. Periksa redemption mechanism: apakah first-come-first-serve, queue-based, atau memerlukan notice period? Cek FAQ atau docs. Estimasi: 15-20 menit.",
    "10. Monitor AUM weekly: apakah naik (positive momentum) atau turun (potential redemptions atau strategy underperformance)? Gunakan DefiLlama. Waktu: 5-10 menit.",
    "11. Hitung implied value dari token-radar sebagai referensi potensi token valuation. Bandingkan dengan similar allocator. Estimasi: 5 minit.",
    "12. Ikuti komunikasi tim: Twitter, Discord, atau governance forum untuk update strategy shift, new vault, atau fee change. Waktu: 10 menit/hari.",
  ],

  // ── Lending / Borrowing ────────────────────────────────────────────────
  "lending": [
    "1. Identifikasi model lending: over-collateralized (seperti Aave/Compound) atau under-collateralized (Credit protocol, Goldfinch). Baca docs. Estimasi: 20-30 menit.",
    "2. Daftar aset yang didukung: ETH, WBTC, stablecoins (USDC, USDT, DAI), atau aset eksotis. Cek asset list di protocol interface. Waktu: 10-15 menit.",
    "3. Hitung utilization rate pool: TVL borrowed / TVL deposited. Utilization tinggi (>80%) bisa menunjukkan demand tinggi tapi juga risiko liquidity. Estimasi: 10-15 menit.",
    "4. Evaluasi liquidation threshold: collateral factor (biasanya 70-85%) dan liquidation bonus. Protocol dengan threshold rendah lebih aman tapi kurang capital efficient. Waktu: 15-20 menit.",
    "5. Tinjau liquidation mechanism: apakah automatic via smart contract atau manual auction? Cek docs tentang liquidation process. Estimasi: 15-20 menit.",
    "6. Analisis model interest rate: dynamic rate (tergantung utilization) atau fixed rate? Hitung expected borrowing cost dan supply APY. Waktu: 20-30 menit.",
    "7. Cek audit report dari OpenZeppelin, Trail of Bits, atau CertiK. Prioritaskan protocol dengan multiple audit dan bug bounty program. Estimasi: 20-30 menit.",
    "8. Bandingkan dengan kompetitor besar: Aave V3, Compound V3, Morpho, Spark. Lihat mana yang punya TVL lebih besar atau yield lebih baik. Waktu: 15-20 menit.",
    "9. Catat metrik kunci: bad debt ratio (historical), default rate, dan solvency ratio. Protocol yang sehat seharusnya tidak ada bad debt. Estimasi: 15-20 menit.",
    "10. Monitor parameter governance: apakah ada proposal untuk mengubah interest rate model, collateral factor, atau asset listing? Cek governance forum. Waktu: 10-15 menit.",
    "11. Hitung implied value sebagai referensi potensi token atau valuation. Gunakan token-radar score untuk baseline. Estimasi: 5-10 menit.",
    "12. Siapkan exit strategy: jika yield memburuk, protocol ada masalah, atau market crash, kapan dan bagaimana withdraw? Buat plan. Waktu: 20-30 menit.",
  ],

  // ── DEX / AMM ──────────────────────────────────────────────────────────
  "dex": [
    "1. Identifikasi pair token paling likuid: cari pair dengan volume 24h tertinggi di top 10 pair. Gunakan DefiLlama atau DEX dashboard. Estimasi: 15-20 menit.",
    "2. Hitung fee structure: trading fee (biasanya 0.05-0.3%), LP fee share, dan apakah ada rebate untuk maker. Hitung break-even untuk LP. Waktu: 15-20 menit.",
    "3. Analisis komposisi pool: stablecoin pair (USDC/USDT, lower risk) vs volatile pair (ETH/USDC, higher risk+reward). Tentukan risk appetite. Estimasi: 10-15 menit.",
    "4. Tinjau AMM model: CPMM (constant product seperti Uniswap), CLAMM (concentrated liquidity seperti Uniswap V3), atau hybrid. Masing-masing punya risk/reward berbeda. Waktu: 20-30 menit.",
    "5. Hitung depth dan slippage: untuk order size tertentu (misal $10k, $100k), berapa slippage yang diharapkan? Cek chart atau estimasi dari DEX. Estimasi: 15-20 menit.",
    "6. Evaluasi kompetisi: bagaimana DEX ini dibanding Uniswap, PancakeSwap, Curve, atau dYdX di jaringan yang sama? Lihat volume dan fee. Waktu: 15-20 menit.",
    "7. Cek apakah ada token reward untuk LP (yield farming) atau trader (cashback). Ini menambah return tapi bisa uncapped emission. Estimasi: 15-20 menit.",
    "8. Monitor regulatory risk: beberapa DEX facing SEC scrutiny. Cek berita atau governance forum tentang regulatory compliance plan. Waktu: 10-15 menit.",
    "9. Verifikasi oracle integrity: jika DEX bergantung pada price feed (seperti lending protocol), cek apakah menggunakan Chainlink atau built-in oracle. Estimasi: 15-20 menit.",
    "10. Catat weekly TVL dan change_7d untuk analisis tren: apakah growing atau shrinking? Gunakan DefiLlama atau DEX dashboard. Waktu: 5-10 menit.",
    "11. Ikuti governance forum untuk proposal tokenomics, fee change, atau new pool addition. Prioritaskan proposal yang berdampak besar. Estimasi: 15-20 menit.",
    "12. Siapkan strategi entry: apakah target LP pada stablecoin pair untuk yield stable, atau volatile pair untuk higher return dengan higher risk? Buat plan. Waktu: 30-45 menit.",
  ],

  // ── Yield / Staking Pool ───────────────────────────────────────────────
  "yield": [
    "1. Lihat daftar pool/yield strategy yang tersedia di dashboard. Catat nama pool, APY, dan TVL masing-masing. Estimasi: 10-15 menit.",
    "2. Filter pool dengan APY tertinggi dan pelajari apa yang mendasarinya: apakah yield dari trading fee, lending interest, reward token, atau revenue share? Waktu: 20-30 menit.",
    "3. Hitung real yield setelah deduct gas cost, slippage, dan opportunity cost. Gas di Ethereum bisa $5-50 per transaction, di L2 biasanya $0.01-0.1. Estimasi: 15-20 menit.",
    "4. Pastikan wallet memiliki gas dan aset awal yang cukup. Untuk Ethereum mainnet, siapkan minimal 0.01-0.05 ETH untuk gas buffer. Waktu: 5-10 menit.",
    "5. Ikuti proses stake/delegation: connect wallet, approve token, deposit ke pool. Verifikasi di block explorer (Etherscan, Solscan). Estimasi: 10-20 menit.",
    "6. Pantau compounding schedule: apakah auto-compound atau manual claim. Auto-compound lebih efisien tapi mungkin ada fee. Waktu: 10-15 menit.",
    "7. Catat withdraw fee dan lock-up period: apakah ada penalty untuk early withdrawal? Cek terms atau FAQ. Estimasi: 10-15 menit.",
    "8. Kumpulkan data weekly change_7d untuk assess trend: apakah pool growing atau shrinking? Gunakan dashboard atau DefiLlama. Waktu: 5-10 menit.",
    "9. Evaluasi apakah yield berasal dari genuine revenue (trading fee, lending interest) atau token emission (inflationary reward). Emission-based yield tidak sustainable. Estimasi: 20-30 menit.",
    "10. Ikuti roadmap token launch yang diumumkan tim: apakah ada vesting schedule, emission rate, atau token utility? Cek blog atau governance. Waktu: 15-20 menit.",
    "11. Hitung implied value dari token-radar sebagai referensi potensi token valuation. Bandingkan dengan similar yield protocol. Estimasi: 5-10 menit.",
    "12. Siapkan exit strategy: jika yield turun drastis, token price Collapse, atau protocol ada masalah, kapan dan bagaimana withdraw? Buat contingency plan. Waktu: 20-30 menit.",
  ],

  // ── Staking Pool ──────────────────────────────────────────────────────
  "staking-pool": [
    "1. Identifikasi apa yang di-stake: native token (ETH, SOL, AVAX), LP token, atau validator node. Baca docs atau staking page. Estimasi: 10-15 menit.",
    "2. Hitung staking reward rate: APY/APR yang ditawarkan (biasanya 5-10% untuk PoS, bisa lebih untuk LP staking). Bandingkan dengan network average. Waktu: 10-15 menit.",
    "3. Evaluasi risiko slashing: jika stake ke validator, berapa penalty jika validator downtime atau malfeasance? Beberapa protocol punya insurance atau guarantee. Estimasi: 15-20 menit.",
    "4. Lihat delegation mechanism: apakah bisa delegating ke validator tertentu (seperti Rocket Pool, Lido) atau harus run own validator? Cek options. Waktu: 10-15 menit.",
    "5. Tinjau lock-up period dan early withdrawal penalty: apakah ada unbonding period (misal 7-21 hari) atau bisa withdraw immediate? Waktu: 10-15 menit.",
    "6. Periksa apakah staking memberikan akses ke governance voting (seperti Compound, Aave). Ini bisa menambah utility tapi juga requirement. Estimasi: 10-15 menit.",
    "7. Tinjau historical uptime dan performance validator: apakah validator reliable, apakah ada incident? Cek status page atau community report. Waktu: 15-20 menit.",
    "8. Bandingkan dengan staking pool lain di jaringan yang sama: Lido, Rocket Pool, StakeWise, atau native staking. Lihat mana yang punya fee lebih rendah atau yield lebih tinggi. Estimasi: 15-20 menit.",
    "9. Catat weekly change_7d untuk memantau aliran staking net: apakah semakin banyak yang stake atau withdraw? Gunakan DefiLlama. Waktu: 5-10 menit.",
    "10. Persiapkan untuk participate governance jika ada proposal yang berpengaruh pada staking parameter atau reward distribution. Waktu: 10-15 menit.",
    "11. Monitor perubahan network difficulty, reward distribution, atau protocol upgrade yang mempengaruhi staking yield. Waktu: 5-10 menit/hari.",
    "12. Siapkan roadmap untuk potentially unstaking: jika yield turun, protocol upgrade berdampak negatif, atau ada better opportunity, kapan migrate? Estimasi: 15-20 menit.",
  ],

  // ── Basis Trading ─────────────────────────────────────────────────────
  "basis-trading": [
    "1. Pelajari strategi basis trading yang digunakan: cash-future arb (spot vs perp), funding rate arb (long spot + short perp), atau cash-carry (lend stablecoin, borrow asset). Baca strategy doc. Estimasi: 30-45 menit.",
    "2. Identifikasi aset underlying dan kontrak derivatif: ETH, BTC, stablecoin? Gunakan perps DEX (dYdX, Hyperliquid, GMX) atau CEX (Binance, Bybit). Waktu: 15-20 menit.",
    "3. Tinjau historical basis spread: rata-rata spread dan volatility-nya. Spread yang terlalu sempit atau terlalu volatil bisa kurang profitable. Estimasi: 20-30 menit.",
    "4. Evaluasi leverage yang digunakan: berapa multiplier (2x, 3x, 5x)? Leverage tinggi meningkatkan return tapi juga liquidation risk. Waktu: 10-15 menit.",
    "5. Periksa liquidation mechanics: berapa maintenance margin, berapa penalty untuk liquidation? Pastikan risk management parameters memadai. Estimasi: 15-20 menit.",
    "6. Analisis correlation strategi dengan market direction: apakah market-neutral (spread trading) atau biased (directional)? Ini penting untuk portfolio allocation. Waktu: 10-15 menit.",
    "7. Monitor funding rate environment: apakah positif (long bias) atau negatif (short bias)? Funding rate yang ekstrem bisa menunjukkan overcrowded position. Estimasi: 10-15 menit.",
    "8. Tinjau infrastruktur: apakah menggunakan perps DEX (non-custodial) atau CEX (custodial)? Risk profile berbeda: smart contract risk vs counterparty risk. Waktu: 15-20 menit.",
    "9. Hitung expected return berdasarkan historical spread dan leverage. Gunakan backtest data atau paper trading untuk validasi. Estimasi: 30-45 menit.",
    "10. Analisis drawdown history: berapa max drawdown yang terjadi dan berapa lama recovery? Protocol dengan drawdown terkontrol lebih diinginkan. Waktu: 15-20 menit.",
    "11. Siapkan analisis untuk potensi token governance atau revenue sharing: apakah ada plan untuk token launch? Cek blog atau governance forum. Estimasi: 10-15 menit.",
    "12. Buat risk management plan: berapa max position size, berapa stop-loss level, kapan reduce position? Gunakan sebelum entry. Waktu: 20-30 menit.",
  ],

  // ── Chain / L2 ────────────────────────────────────────────────────────
  "chain": [
    "1. Pelajari arsitektur jaringan: apakah L1 (Ethereum, Solana), L2 rollup (Optimism, Arbitrum, Base), sidechain (Polygon PoS), atau appchain khusus? Baca docs/network page. Estimasi: 30-45 menit.",
    "2. Identifikasi consensus mechanism dan validator set: Proof-of-Stake, Proof-of-Authority, atau hybrid? Berapa validator dan berapa staking requirement? Waktu: 15-20 menit.",
    "3. Evaluasi TVL yang terkunci di jaringan: berapa total value, dan apakah growing atau shrinking? Gunakan DefiLlama atau chain dashboard. Estimasi: 10-15 menit.",
    "4. Lihat scalability metrics: TPS (transaction per second), latency (block time), dan fee structure (gas cost). Bandingkan dengan competitor chain. Waktu: 15-20 menit.",
    "5. Tinjau ecosystem dApps: berapa aplikasi yang berjalan di jaringan, kategori apa (DeFi, Gaming, NFT, Infra)? Cek ecosystem page atau DappRadar. Estimasi: 20-30 menit.",
    "6. Periksa keamanan jaringan: slashing mechanism, bond requirement, fault tolerance, dan historical security incident. Baca security whitepaper. Waktu: 15-20 menit.",
    "7. Analisis kompetisi dengan chain lain di layer yang sama: L2 competition (OP vs Arb vs Base), atau L1 competition (ETH vs SOL vs AVAX). Waktu: 20-30 menit.",
    "8. Monitor developer activity: berapa developer aktif, commit frequency, migration dari L1 ke jaringan ini. Gunakan Santiment, GitHub, atau electric capital report. Estimasi: 15-20 menit.",
    "9. Cek apakah ada token native dan utilitynya: apakah untuk gas, governance, staking, atau other utility? Baca tokenomics paper. Waktu: 15-20 menit.",
    "10. Kumpulkan data chain-specific metrics: block time, finality time, gas average, dan transaction count. Gunakan block explorer atau analytics platform. Estimasi: 15-20 menit.",
    "11. Ikuti roadmap upgrade atau hard fork yang direncanakan: apakah ada major upgrade yang berdampak pada security atau scalability? Cek governance atau blog. Waktu: 10-15 menit.",
    "12. Siapkan analisis untuk potensi token launch dan distribution: apakah ada token generation event, airdrop, atau staking reward? Cek timeline dan eligibility criteria. Estimasi: 20-30 menit.",
  ],

  // ── Restaking ──────────────────────────────────────────────────────────
  "restaking": [
    "1. Pelajari konsep restaking: bagaimana PoS stake (ETH, SOL) bisa di-reuse untuk layanan tambahan seperti oracle, data availability, atau AVS. Baca docs/EigenLayer paper. Estimasi: 30-45 menit.",
    "2. Identifikasi layanan tambahan (AVS - Actively Validated Services) yang bisa didapat dari restaking: oracle network, bridge security, data availability, atau custom validation. Waktu: 20-30 menit.",
    "3. Evaluasi additional yield vs additional risk: berapa extra yield yang ditawarkan dan berapa additional slashing risk atau liquidity risk? Hitung risk-adjusted return. Estimasi: 20-30 menit.",
    "4. Tinjau slashing condition dari restaking: berbeda dari native staking? Apakah ada additional penalty untuk AVS misbehavior? Cek terms. Waktu: 15-20 menit.",
    "5. Lihat composability dengan other protocol: apakah restaked asset bisa dipakai di lending, LP, atau other DeFi? Cek integration list. Estimasi: 15-20 menit.",
    "6. Analisis liquidity restaked: apakah bisa di-withdraw kapan saja atau ada lock-up? Beberapa restaking protocol punya withdrawal queue atau delay. Waktu: 15-20 menit.",
    "7. Periksa security model dan trust assumption: apakah ada trusted committee, multi-sig, atau decentralized validation? Baca security whitepaper. Estimasi: 20-30 menit.",
    "8. Bandingkan dengan protokol restaking lain: EigenLayer, Bedrock, Babylon, atau 다른 restaking protocol. Lihat mana yang punya TVL lebih besar atau yield lebih baik. Waktu: 15-20 menit.",
    "9. Monitor total value restaked dan growth pace: apakah semakin banyak yang restake atau ada churn? Gunakan DefiLlama atau protocol dashboard. Estimasi: 5-10 menit.",
    "10. Evaluasi implication untuk validator dan delegator: apakah restaking mengubah risk/return profile mereka? Cek analysis atau community discussion. Waktu: 15-20 menit.",
    "11. Hitung implied value dari token-radar sebagai referensi potensi token. Bandingkan dengan similar restaking protocol. Estimasi: 5-10 menit.",
    "12. Ikuti governance untuk perubahan restaking parameters: apakah ada proposal untuk adjust slashing, yield distribution, atau new AVS onboarding? Waktu: 10-15 menit.",
  ],

  // ── Insurance ──────────────────────────────────────────────────────────
  "insurance": [
    "1. Pelajari model insurance: mutual (policyholder-owned), pool-based (provide coverage from pool), atau parametric (payout berdasarkan predefined trigger). Baca docs. Estimasi: 20-30 menit.",
    "2. Identifikasi coverage yang ditawarkan: smart contract failure, stablecoin de-peg, exchange hack, atau other risk. Cek coverage list. Waktu: 10-15 menit.",
    "3. Evaluasi pricing mechanism: apakah berdasarkan risk assessment (dynamic premium), fixed premium, atau pool participation fee? Hitung cost-benefit. Estimasi: 15-20 menit.",
    "4. Tinjau historical claims: berapa banyak claim yang diajukan, berapa yang approved/rejected, berapa payout yang terjadi? Cek claims history atau transparency report. Waktu: 15-20 menit.",
    "5. Analisis reserve ratio dan solvency: apakah pool punya cukup reserve untuk coverage? Apakah ada reinsurance atau overcollateralization? Estimasi: 15-20 menit.",
    "6. Lihat apakah ada governance untuk adjust coverage parameters: coverage limit, premium rate, atau eligible risks. Cek governance forum. Waktu: 10-15 menit.",
    "7. Periksa kompetisi dengan insurance protocol lain: Nexus Mutual, InsurAce, Sherlock, atau kristal finance. Lihat mana yang punya coverage lebih luas atau pricing lebih kompetitif. Estimasi: 15-20 menit.",
    "8. Monitor perubahan landscape DeFi yang mempengaruhi demand insurance: semakin banyak protocol, semakin tinggi demand untuk coverage. Waktu: 10-15 menit.",
    "9. Hitung implied value sebagai referensi potensi token launch atau valuation. Gunakan token-radar score untuk baseline. Estimasi: 5-10 menit.",
    "10. Siapkan analisis untuk risk exposure dari portofolio sendiri: berapa nilai yang perlu diasuransikan, berapa premium yang reasonable? Waktu: 15-20 menit.",
    "11. Evaluasi reputation dan track record team: founder background, auditor, partner. Cek LinkedIn, GitHub, atau press release. Estimasi: 15-20 menit.",
    "12. Kunjungi governance forum dan social media untuk update product, claim, atau partnership. Waktu: 10 menit/hari.",
  ],

  // ── CeDeFi (Centralized + DeFi hybrid) ────────────────────────────────
  "cedefi": [
    "1. Identifikasi elemen centralized dan elemen DeFi dalam hybrid ini: apakah ada custodial component, centralized matching, atau fully on-chain? Baca docs. Estimasi: 15-20 menit.",
    "2. Tinjau trust assumption: berapa bagian yang memerlukan trust ke centralized entity? Apakah ada proof-of-reserves atau attestor mechanism? Waktu: 15-20 menit.",
    "3. Evaluasi benefit hybrid: liquidity aggregation, UX simplification, regulatory compliance, atau yield enhancement? Catat value proposition. Estimasi: 10-15 menit.",
    "4. Periksa regulatory status: apakah centralized component terdaftar di regulator tertentu (SEC, FCA, MAS)? Cek compliance page atau press release. Waktu: 10-15 menit.",
    "5. Analisis risiko custodial: apakah ada proof-of-reserves (semacam Merkle tree audit), third-party attestation, atau insurance? Gunakan seperti yang dipakai di centralized exchange. Estimasi: 15-20 menit.",
    "6. Lihat apakah ada token native dan utility: apakah untuk fee discount, governance, atau staking? Baca tokenomics. Waktu: 10-15 menit.",
    "7. Bandingkan dengan pure DeFi alternatives dan centralized alternatives: mana yang punya better UX, better yield, atau better security? Estimasi: 15-20 menit.",
    "8. Monitor transparansi laporan: apakah ada regular report (weekly/monthly) tentang AUM, revenue, atau position? Cek transparency page. Waktu: 10-15 menit.",
    "9. Hitung implied value sebagai referensi potensi token atau valuation. Gunakan token-radar score untuk baseline. Estimasi: 5-10 menit.",
    "10. Siapkan analisis untuk migrasi dari centralized ke DeFi components: jika protocol ingin menjadi lebih decentralized, apa dampaknya pada user? Waktu: 15-20 menit.",
    "11. Evaluasi track record dan reputation team: founder background, operational history, community trust. Cek social media, review, atau incident history. Estimasi: 15-20 menit.",
    "12. Ikuti komunikasi tim untuk update product, regulatory change, atau security incident. Waktu: 10 menit/hari.",
  ],

  // ── Payments ──────────────────────────────────────────────────────────
  "payments": [
    "1. Pelajari use case payment: cross-border remittance (LayerZero, Axelar), micropayment (Solana, Lightning), atau merchant payment (Stripe crypto, Coinbase Commerce). Baca docs. Estimasi: 20-30 menit.",
    "2. Identifikasi asset yang digunakan: stablecoin (USDC, USDT), native token (ETH, SOL), atau fiat-backed token. Cek supported assets. Waktu: 10-15 menit.",
    "3. Evaluasi fee structure: apakah fee per transaction (0.1-1%), spread, atau subscription? Bandingkan dengan traditional payment rails (SWIFT, Visa). Estimasi: 15-20 menit.",
    "4. Tinjau settlement time dan finality guarantee: apakah instant settlement, 1-block confirmation, atau multi-block finality? Ini penting untuk UX. Waktu: 10-15 menit.",
    "5. Periksa integration dengan merchant platforms atau payment gateway: apakah ada plugin untuk Shopify, WooCommerce, atau custom API? Cek documentation. Estimasi: 15-20 menit.",
    "6. Analisis adoption metrics: transaction volume, active users, GMV (gross merchant value), atau payment count. Gunakan dashboard atau press release. Waktu: 10-15 menit.",
    "7. Lihat regulatory considerations: apakah ada money transmitter license, MSB registration, atau compliance dengan payment regulation? Cek regulatory page. Estimasi: 10-15 menit.",
    "8. Monitor competitor landscape: bagaimana dibanding PayPal crypto, Stripe crypto, Circle, atau traditional payment processor yang masuk crypto? Waktu: 15-20 menit.",
    "9. Hitung implied value sebagai referensi potensi token atau valuation. Gunakan token-radar score untuk baseline. Estimasi: 5-10 menit.",
    "10. Siapkan analisis untuk payment flow dan network effect: apakah ada chicken-and-egg problem, bagaimana untuk achieve critical mass? Waktu: 15-20 menit.",
    "11. Evaluasi security dan custody: apakah ada custodial wallet, non-custodial, atau hybrid? Cek security model dan incident history. Estimasi: 15-20 menit.",
    "12. Ikuti announcement untuk partnership dengan merchant, payment network, atau regulatory milestone. Waktu: 10 menit/hari.",
  ],

  // ── Governance Incentives ─────────────────────────────────────────────
  "governance-incentives": [
    "1. Pelajari model governance: on-chain voting (Snapshot, Tally), delegation (Compound style), atau off-chain signaling (Discord, forum)? Baca governance docs. Estimasi: 15-20 menit.",
    "2. Identifikasi siapa yang memiliki voting power: apakah terfokus pada founder, investor, atau decentralized community? Cek token holder distribution. Waktu: 15-20 menit.",
    "3. Evaluasi incentive structure: apakah voting dioptimasi (yield untuk voter, delegation reward) atau hanya membership (no direct incentive)? Waktu: 10-15 menit.",
    "4. Tinjau historical proposal outcomes: berapa proposal yang diajukan, berapa yang lolos, apa dampaknya pada protocol? Cek governance dashboard. Estimasi: 20-30 menit.",
    "5. Analisis apakah ada quadratic voting, weighted voting (1 token = 1 vote), atau reputation-based voting. Masing-masing punya trade-off. Waktu: 10-15 menit.",
    "6. Periksa komposisi token holder: tim (team allocation), investor, community, atau foundation. Lihat apakah ada concentration risk. Estimasi: 15-20 menit.",
    "7. Lihat apakah ada delegation market atau mev-boost-like mechanism untuk incentivize participation. Cek docs atau governance forum. Waktu: 10-15 menit.",
    "8. Monitor proposal yang berpengaruh pada TVL, tokenomics, atau protocol parameters. Prioritaskan proposal dengan impact tinggi. Estimasi: 10-15 menit.",
    "9. Hitung implied value sebagai referensi potensi token atau valuation. Gunakan token-radar score untuk baseline. Estimasi: 5-10 menit.",
    "10. Siapkan untuk participate dalam governance bila token dimiliki: pahami voting process, delegation mechanism, dan proposal analysis. Waktu: 15-20 menit.",
    "11. Evaluasi apakah governance model memadai: apakah bisa prevent malicious proposal, apakah ada timelock, apakah ada multisig fallback? Cek security model. Estimasi: 15-20 menit.",
    "12. Ikuti governance forum dan social media untuk update proposal, voting result, atau governance crisis. Waktu: 10 menit/hari.",
  ],

  // ── CDP (Collateralized Debt Position) ────────────────────────────────
  "cdp": [
    "1. Pelajari mekanisme CDP: bagaimana collateral di-deposit dan debt di-issue (mint stablecoin atau borrow asset). Baca docs/MakerDAO style documentation. Estimasi: 20-30 menit.",
    "2. Identifikasi collateral assets yang didukung dan collateral factor masing-masing: ETH (biasanya 80-85%), WBTC (70-80%), stablecoin (lebih rendah). Cek asset list. Waktu: 10-15 menit.",
    "3. Evaluasi liquidation mechanism dan stability fee/interest rate: berapa liquidation ratio, berapa stability fee (biaya meminjam), dan bagaimana rate ditentukan? Estimasi: 15-20 menit.",
    "4. Tinjau historical liquidations dan system solvency: apakah sistem pernah punya mass liquidation atau remain solvent selama stress period? Cek transparency report. Waktu: 15-20 menit.",
    "5. Analisis risk parameters: liquidation ratio, debt ceiling, feedback mechanism (Diamond or PID controller), dan governance control. Baca risk framework. Estimasi: 20-30 menit.",
    "6. Periksa apakah ada secondary market untuk debt atau collateral: apakah bisa trading CDP position, collateral tokenization, atau debt securitization? Waktu: 10-15 menit.",
    "7. Bandingkan dengan protocol CDP lain: MakerDAO (DAI), Spark (ETH-backed), atau Liquity (debt-free model). Lihat mana yang punya model lebih baik. Estimasi: 15-20 menit.",
    "8. Monitor changes pada parameter governance dan dampaknya: apakah ada proposal untuk adjust stability fee, collateral factor, atau debt ceiling? Waktu: 10-15 menit.",
    "9. Hitung implied value sebagai referensi potensi token atau valuation. Gunakan token-radar score untuk baseline. Estimasi: 5-10 menit.",
    "10. Siapkan analisis untuk risk exposure dan hedging strategy: jika collateral value turun, kapan liquidate atau add collateral? Buat plan. Waktu: 20-30 menit.",
    "11. Evaluasi token utility: apakah governance token memberikan benefit untuk cdp user (fee discount, priority, dll)? Cek tokenomics. Estimasi: 10-15 menit.",
    "12. Ikuti governance forum dan MakerDAO-style process untuk update risk parameter, new collateral type, atau system upgrade. Waktu: 15-20 menit.",
  ],

  // ── Stablecoin Wrapper ────────────────────────────────────────────────
  "stablecoin-wrapper": [
    "1. Pelajari mekanisme stablecoin: collateralized (over-collateralized crypto, seperti DAI), seigniorage (algorithmic, seperti USDD), atau hybrid. Baca whitepaper/model. Estimasi: 20-30 menit.",
    "2. Identifikasi jenis collateral: crypto (ETH, WBTC), RWA (Treasury, bond), atau multi-asset portfolio. Cek collateral composition. Waktu: 10-15 menit.",
    "3. Evaluasi depeg risk dan historical stability: apakah pernah depeg, berapa besar deviation, berapa lama recovery? Cek historical price chart. Estimasi: 15-20 menit.",
    "4. Tinjau reserve backing dan proof-of-reserves: apakah collateral transparan, apakah ada attestation atau audit? Cek reserve page. Waktu: 15-20 menit.",
    "5. Analisis redemption mechanism dan liquidity depth: apakah bisa redeem langsung ke collateral, apakah ada limit, apakah ada liquidity pool? Estimasi: 15-20 menit.",
    "6. Periksa regulatory classification dan jurisdictional risk: apakah stablecoin dianggap sebagai security, payment instrument, atau something else? Cek legal opinion. Waktu: 10-15 menit.",
    "7. Bandingkan dengan stablecoin kompetitor: USDT (Tether), USDC (Circle), DAI (MakerDAO), PYUSD (PayPal), atau kembali ke centralized stablecoin. Lihat mana yang paling transparan. Estimasi: 15-20 menit.",
    "8. Monitor peg deviation dan recovery mechanism: apakah ada arbitrage mechanism, redemption guarantee, atau liquidity incentive untuk maintain peg? Waktu: 10-15 menit.",
    "9. Hitung implied value sebagai referensi potensi token atau valuation. Gunakan token-radar score untuk baseline. Estimasi: 5-10 menit.",
    "10. Siapkan analisis untuk stablecoin ecosystem synergies: bagaimana stablecoin ini integrasi dengan DeFi, payment, atau other application? Waktu: 15-20 menit.",
    "11. Evaluasi team dan track record: founder background, auditor, partner, dan operational history. Cek social media dan press release. Estimasi: 15-20 menit.",
    "12. Ikuti announcement untuk regulatory milestone, reserve update, atau peg mechanism change. Waktu: 10 menit/hari.",
  ],

  // ── Collateral Markets ────────────────────────────────────────────────
  "collateral-markets": [
    "1. Pelajari jenis collateral yang didukung dan acceptance criteria: kriteria apa yang membuat aset eligible sebagai collateral (liquidity, market cap, volatility)? Baca docs. Estimasi: 20-30 menit.",
    "2. Identifikasi liquidity market untuk collateral tersebut: apakah ada deep liquidity di DEX atau CEX, atau collateral cenderung illiquid? Waktu: 10-15 menit.",
    "3. Evaluasi liquidation mechanism dan oracle dependency: bagaimana liquidation dipicu, apakah menggunakan on-chain oracle atau off-chain feed? Cek liquidation model. Estimasi: 15-20 menit.",
    "4. Tinjau historical performance dan stress test results: bagaimana collateral perform selama market crash, flash crash, atau extreme volatility? Cek report. Waktu: 15-20 menit.",
    "5. Analisis concentration risk: apakah terlalu banyak terpaku pada satu aset (seperti ETH) atau diversified? Concentration tinggi meningkatkan correlation risk. Estimasi: 15-20 menit.",
    "6. Periksa governance model dan parameter adjustment process: siapa yang bisa mengubah collateral factor, liquidation ratio, atau asset listing? Cek governance docs. Waktu: 10-15 menit.",
    "7. Bandingkan dengan collateral markets lain di DeFi: Aave, Compound, Morpho, Spark, atau specialized collateral protocol. Lihat mana yang punya model lebih baik. Estimasi: 15-20 menit.",
    "8. Monitor trend collateral preferences dan rotation: apakah user lebih prefer stablecoin collateral atau crypto collateral? Gunakan analytics. Waktu: 5-10 menit.",
    "9. Hitung implied value sebagai referensi potensi token atau valuation. Gunakan token-radar score untuk baseline. Estimasi: 5-10 menit.",
    "10. Siapkan analisis untuk optimal collateral allocation: berapa persentase di masing-masing collateral untuk minimize risk? Buat recommendation. Waktu: 15-20 menit.",
    "11. Evaluasi security dan audit status: apakah protocol memiliki audit dari reputable firm, bug bounty program, atau insurance? Cek security page. Estimasi: 10-15 menit.",
    "12. Ikuti governance forum dan protocol update untuk perubahan collateral list, parameter adjustment, atau new integration. Waktu: 10 menit/hari.",
  ],

  // ── Default fallback ──────────────────────────────────────────────────
  "default": [
    "1. Kunjungi situs resmi protokol (biasanya https://<slug>.finance, .io, atau .com) dan baca homepage, about, dan product section. Estimasi waktu: 15-20 menit.",
    "2. Tentukan jaringan blockchain tempat protokol beroperasi: Ethereum, Base, Arbitrum, Solana, atau multi-chain. Cek chain list di docs atau dashboard. Waktu: 5-10 menit.",
    "3. Siapkan dompet non-custodial (MetaMask, Rabby, Phantom untuk Solana) dengan gas yang cukup. Untuk Ethereum, minimal 0.01 ETH; untuk L2, 0.001-0.01 ETH; untuk Solana, 0.01-0.05 SOL. Estimasi: 10-15 menit.",
    "4. Sambil menunggu, baca whitepaper atau litepaper (biasanya di situs atau GitHub) untuk memahami model bisnis dan value proposition. Waktu: 30-60 menit.",
    "5. Sambungkan dompet ke dashboard protokol dan jelajahi fitur: deposit, withdraw, stake, trade, atau seed sesuai kategori. Estimasi: 20-30 menit.",
    "6. Catat metrics kunci dari DefiLlama atau dashboard: TVL, change_7d, implied value, dan fees. Gunakan untuk due diligence. Waktu: 5-10 menit.",
    "7. Analisis komposisi tim: founder, developer, advisor. Cari LinkedIn, GitHub, atau past project. Evaluasi pengalaman di industri terkait. Estimasi: 15-20 menit.",
    "8. Evaluasi sosial proof: community size (Discord, Telegram, Twitter followers), engagement quality, dan reputasi. Waktu: 10-15 menit.",
    "9. Pelajari roadmap dan milestone yang sudah dicapai: apa yang sudah launch, apa yang direncanakan, apa yang sudah delivered vs promise? Estimasi: 15-20 menit.",
    "10. Monitor update melalui saluran komunikasi resmi: Twitter/X, Discord announcement channel, blog, atau newsletter. Waktu: 10 menit/hari.",
    "11. Siapkan checklist due diligence sebelum investasi atau partisipasi: security (audit, bug bounty), team (background, track record), product (roadmap, milestone), token (utility, emission). Estimasi total: 2-4 jam.",
    "12. Ikuti announcement resmi untuk potensi token launch, airdrop campaign, atau governance participation opportunity. Waktu: 5-10 menit/hari.",
  ],
};

// ── category detection ────────────────────────────────────────────────────

function normalizeCategory(cat: string): string {
  const lower = cat.toLowerCase().trim();

  // Explicit mappings for known categories (from watchlist analysis)
  if (lower === "risk curators") return "risk-curators";
  if (lower === "rwa") return "rwa";
  if (lower === "onchain capital allocator") return "onchain-capital-allocator";
  if (lower === "basis trading") return "basis-trading";
  if (lower === "lending") return "lending";
  if (lower === "chain") return "chain";
  if (lower === "yield") return "yield";
  if (lower === "restaking") return "restaking";
  if (lower === "dexs") return "dex";
  if (lower === "cedefi") return "cedefi";
  if (lower === "insurance") return "insurance";
  if (lower === "payments") return "payments";
  if (lower === "governance incentives") return "governance-incentives";
  if (lower === "staking pool") return "staking-pool";
  if (lower === "stablecoin wrapper") return "stablecoin-wrapper";
  if (lower === "collateral markets") return "collateral-markets";
  if (lower === "cdp") return "cdp";

  // Fuzzy fallback
  if (lower.includes("lending") || lower.includes("borrow")) return "lending";
  if (lower.includes("dex") || lower.includes("swap") || lower.includes("amm")) return "dex";
  if (lower.includes("farm") || lower.includes("yield") || lower.includes("staking")) return "yield";
  if (lower.includes("rwa") || lower.includes("real world")) return "rwa";
  if (lower.includes("restake")) return "restaking";
  if (lower.includes("insurance")) return "insurance";
  if (lower.includes("payment")) return "payments";
  if (lower.includes("governance")) return "governance-incentives";
  if (lower.includes("stablecoin") || lower.includes("wrapper")) return "stablecoin-wrapper";
  if (lower.includes("collateral")) return "collateral-markets";
  if (lower.includes("cdp")) return "cdp";
  if (lower.includes("basis") || lower.includes("trading")) return "basis-trading";
  if (lower.includes("chain") || lower.includes("l2") || lower.includes("rollup")) return "chain";

  return "default";
}

// ── farm steps generator ──────────────────────────────────────────────────

function generateFarmSteps(
  p: Protocol,
  implied: number,
  asOf: string
): string[] {
  const normalized = normalizeCategory(p.category);
  const templates = FARM_TEMPLATES[normalized] ?? FARM_TEMPLATES.default;

  const steps: string[] = [];

  // Step 1: Protocol identity
  steps.push(
    `Protokol "${p.name}" (${p.slug}) adalah "${p.category}" yang berjalan di ${p.chains.join(", ")}.`
  );

  // Step 2: Current snapshot metrics
  steps.push(
    `Data snapshot ${asOf}: TVL ${p.tvl_usd.toLocaleString()} USD, perubahan 7 hari ${p.change_7d >= 0 ? "+" : ""}${p.change_7d.toFixed(2)}%, nilai implisit ${implied.toLocaleString()} USD.`
  );

  // Step 3: Floor validation
  const aboveFloor = p.tvl_usd >= 50_000_000;
  steps.push(
    aboveFloor
      ? `TVL saat ini sudah di atas floor $50.000.000 USD — memenuhi kriteria watchlist pre-token.`
      : `TVL di bawah floor $50.000.000 USD — perlu monitoring pertumbuhan sebelum masuk watchlist.`
  );

  // Steps 4-12: category-specific templates
  const remaining = 12 - steps.length;
  for (let i = 0; i < remaining && i < templates.length; i++) {
    steps.push(templates[i]);
  }

  return steps;
}

// ── board builder ──────────────────────────────────────────────────────────

export function parseSnapshot(raw: string): Snapshot {
  return JSON.parse(raw) as Snapshot;
}

export function buildBoard(snapshot: Snapshot): BoardRow[] {
  const asOf = snapshot.as_of;

  const scored = snapshot.watchlist
    .map((slug) => {
      const proto = snapshot.protocols.find((p) => p.slug === slug);
      if (!proto) return null;
      const implied = impliedValue(proto, asOf);
      return { proto, implied };
    })
    .filter(
      (item): item is { proto: Protocol; implied: number } => item !== null
    )
    .sort((a, b) => b.implied - a.implied);

  return scored.map((item, idx) => {
    const farmSteps = generateFarmSteps(item.proto, item.implied, asOf);
    return {
      rank: idx + 1,
      slug: item.proto.slug,
      name: item.proto.name,
      implied_value_usd: item.implied,
      farm_steps: farmSteps,
    };
  });
}

// ── CLI helpers ────────────────────────────────────────────────────────────

export function writeBoard(board: BoardRow[], outPath: string): void {
  const text = jsonLine(board);
  fs.writeFileSync(outPath, text, "utf-8");
}

export function copyScreenshots(srcDir: string, outDir: string): void {
  if (!fs.existsSync(srcDir)) {
    console.log(`[warn] screenshots dir not found: ${srcDir}`);
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  const entries = fs.readdirSync(srcDir);
  for (const e of entries) {
    const src = path.join(srcDir, e);
    const dst = path.join(outDir, e);
    fs.copyFileSync(src, dst);
    console.log(`[copy] ${src} → ${dst}`);
  }
}
