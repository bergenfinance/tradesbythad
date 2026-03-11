/**
 * Fetch OHLC data from Polygon API for all symbols in the project.
 *
 * Usage:
 *   node scripts/fetch-ohlc.js YOUR_API_KEY
 *   node scripts/fetch-ohlc.js YOUR_API_KEY --force
 *   node scripts/fetch-ohlc.js              (reads POLYGON_API_KEY env var)
 *
 * Fetches:
 *   - Daily bars (5 years) for ALL symbols (indices, ETFs, example stocks)
 *   - 5-min bars for example stocks only (around their trade date ranges)
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : process.env.POLYGON_API_KEY;
const FORCE = process.argv.includes('--force');

if (!API_KEY) {
  console.error('Usage: node scripts/fetch-ohlc.js <API_KEY> [--force]');
  console.error('  or set POLYGON_API_KEY environment variable');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(DATA_DIR, 'ohlc');

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ---- Collect symbols from data files ----

function collectSymbols() {
  const groups = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'groups.json'), 'utf-8'));
  const examples = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'examples.json'), 'utf-8'));

  const dailySymbols = new Set(['SPY', 'QQQ', 'IWM']);
  groups.forEach(g => dailySymbols.add(g.etfSymbol));
  examples.forEach(e => dailySymbols.add(e.symbol));

  // For 5-min, collect per-symbol date ranges from examples
  const fiveMinRanges = {};
  examples.forEach(e => {
    if (!fiveMinRanges[e.symbol]) {
      fiveMinRanges[e.symbol] = { from: e.startDate, to: e.endDate };
    } else {
      if (e.startDate < fiveMinRanges[e.symbol].from) fiveMinRanges[e.symbol].from = e.startDate;
      if (e.endDate > fiveMinRanges[e.symbol].to) fiveMinRanges[e.symbol].to = e.endDate;
    }
  });

  // Extend ranges by 7 days each side
  for (const sym of Object.keys(fiveMinRanges)) {
    fiveMinRanges[sym].from = addDays(fiveMinRanges[sym].from, -7);
    fiveMinRanges[sym].to = addDays(fiveMinRanges[sym].to, 7);
  }

  return { dailySymbols: [...dailySymbols], fiveMinRanges };
}

// ---- API fetch helpers ----

async function fetchBars(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} — ${text}`);
  }
  const json = await res.json();
  if (json.status !== 'OK' && json.status !== 'DELAYED') {
    throw new Error(`API status "${json.status}" — ${json.error || 'unknown'}`);
  }
  return json;
}

async function fetchAllPages(baseUrl) {
  let allResults = [];
  let url = baseUrl;

  while (url) {
    const json = await fetchBars(url);
    if (json.results) allResults = allResults.concat(json.results);
    if (json.next_url) {
      url = json.next_url + `&apiKey=${API_KEY}`;
      await delay(250);
    } else {
      url = null;
    }
  }

  return allResults;
}

function isUpToDate(filePath) {
  if (FORCE) return false;
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  const age = Date.now() - stat.mtimeMs;
  // Consider up-to-date if modified within last 12 hours
  return age < 12 * 60 * 60 * 1000;
}

// ---- Daily OHLC ----

async function fetchDailyOHLC(symbol) {
  const outPath = path.join(OUT_DIR, `${symbol}.json`);
  if (isUpToDate(outPath)) {
    console.log(`  ${symbol}: skipped (up-to-date)`);
    return;
  }

  const today = new Date();
  const fiveYearsAgo = new Date(today);
  fiveYearsAgo.setFullYear(today.getFullYear() - 5);
  const from = formatDate(fiveYearsAgo);
  const to = formatDate(today);

  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${API_KEY}`;

  console.log(`  ${symbol}: fetching daily (${from} to ${to})...`);
  const results = await fetchAllPages(url);

  if (!results.length) {
    throw new Error(`${symbol}: no daily results`);
  }

  const bars = results.map(bar => ({
    time: formatDate(new Date(bar.t)),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c
  }));

  fs.writeFileSync(outPath, JSON.stringify(bars));
  console.log(`  ${symbol}: ${bars.length} daily bars (${bars[0].time} → ${bars[bars.length - 1].time})`);
}

// ---- 5-min OHLC ----

async function fetch5minOHLC(symbol, from, to) {
  const outPath = path.join(OUT_DIR, `${symbol}-5min.json`);
  if (isUpToDate(outPath)) {
    console.log(`  ${symbol}: 5-min skipped (up-to-date)`);
    return;
  }

  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/5/minute/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${API_KEY}`;

  console.log(`  ${symbol}: fetching 5-min (${from} to ${to})...`);
  const results = await fetchAllPages(url);

  if (!results.length) {
    throw new Error(`${symbol}: no 5-min results`);
  }

  const bars = results.map(bar => ({
    time: Math.floor(bar.t / 1000),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c
  }));

  fs.writeFileSync(outPath, JSON.stringify(bars));
  console.log(`  ${symbol}: ${bars.length} 5-min bars`);
}

// ---- Main ----

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const { dailySymbols, fiveMinRanges } = collectSymbols();

  console.log(`\n=== Daily OHLC (${dailySymbols.length} symbols) ===\n`);

  let success = 0;
  let failed = 0;

  for (const symbol of dailySymbols) {
    try {
      await fetchDailyOHLC(symbol);
      success++;
    } catch (err) {
      console.error(`  ERROR ${symbol}: ${err.message}`);
      failed++;
    }
    await delay(250);
  }

  console.log(`\n=== 5-min OHLC (${Object.keys(fiveMinRanges).length} symbols) ===\n`);

  for (const [symbol, range] of Object.entries(fiveMinRanges)) {
    try {
      await fetch5minOHLC(symbol, range.from, range.to);
      success++;
    } catch (err) {
      console.error(`  ERROR ${symbol} 5-min: ${err.message}`);
      failed++;
    }
    await delay(250);
  }

  console.log(`\nDone. ${success} succeeded, ${failed} failed.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
