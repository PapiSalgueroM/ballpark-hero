/**
 * The real rows the Player Stock Market harnesses run on, saved once.
 *
 * Round 458. scripts/data/stockMarketPools.json holds, for 2014 and for
 * every season the market can open in, the player_market_tracked view rows
 * a campaign is dealt from (pulled through the engine's own
 * fetchStartSeasonPool, so the file is exactly what the page reads), and
 * for every name in those pools its season by season values from the
 * dedup view (through fetchHoldingHistories, in chunks of eighty names,
 * which is the page's own query with a longer list). 2014 is saved on
 * purpose: it is the season BEFORE the first offered one, and the depth
 * check needs a season that fails the floor to prove the floor bites.
 *
 * Fail closed: a missing file is an error naming the refresh path, never
 * an empty pool, because a harness that measures nothing must not read as
 * green.
 *
 *   node scripts/simStockFormat.mjs --refresh     (needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
export const DATA_FILE = `${ROOT}/scripts/data/stockMarketPools.json`;
/** The row fields saved, in column order, so the file stays compact. */
const COLUMNS = ['player_name', 'position', 'age', 'matches', 'goals', 'assists', 'yellow_cards', 'red_cards', 'market_value_usd', 'year', 'final_year', 'final_value_usd'];
/** The earliest season the histories are kept from: the year before the
 *  first saved pool has nothing to say, and the file is a megabyte lighter. */
const HISTORY_FROM = 2014;

/**
 * Bundle the real engine for node. The localStorage shim runs before the
 * Supabase client's module scope reads it, hence the dynamic import; a
 * static `export * as` is hoisted above the shim.
 */
export async function bundleStockEngine(libPath, tag = 'stock') {
  const entry = `${TMP}/${tag}.entry.mjs`;
  const bundle = `${TMP}/${tag}.bundle.mjs`;
  fs.writeFileSync(entry, [
    'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 };',
    `export const sm = await import('${libPath}');`,
    /* The position rule the depth measure applies is the real one. */
    `export const sd = await import('${ROOT}/src/lib/squadDeal.ts');`,
  ].join('\n'));
  execSync(`${ROOT}/node_modules/.bin/esbuild ${entry} --bundle --format=esm --platform=node --outfile=${bundle} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
  const { sm, sd } = await import(pathToFileURL(bundle).href + `?t=${Date.now()}`);
  return { sm, sd };
}

/** Expand a saved row (array in COLUMNS order) into the view's object shape. */
function expand(arr) {
  const row = {};
  COLUMNS.forEach((c, i) => { row[c] = arr[i]; });
  return row;
}

/**
 * Load the saved data: { fetchedAt, finalYear, pools: {year: TrackedRow[]},
 * histories: {name: [[year, value], ...]} }. With refresh true the file is
 * rebuilt through the engine handed in first.
 */
export async function loadStockData({ refresh = false, sm = null, years = null } = {}) {
  if (refresh) {
    if (!sm) throw new Error('loadStockData: a refresh needs the bundled engine');
    const wanted = years ?? [2014, ...sm.START_YEARS];
    const pools = {};
    let finalYear = 0;
    for (const y of wanted) {
      const rows = await sm.fetchStartSeasonPool(y);
      if (!rows) throw new Error(`refresh: fetchStartSeasonPool(${y}) returned null`);
      for (const r of rows) {
        if (finalYear === 0) finalYear = r.final_year;
        else if (r.final_year !== finalYear) throw new Error(`refresh: two final years in the pools, ${finalYear} and ${r.final_year}`);
      }
      pools[y] = rows.map(r => COLUMNS.map(c => r[c] ?? null));
      console.log(`   refresh: ${y} pool ${rows.length} rows`);
    }
    const names = [...new Set(Object.values(pools).flat().map(r => r[0]))].sort();
    const histories = {};
    for (let i = 0; i < names.length; i += 80) {
      const chunk = names.slice(i, i + 80);
      const rows = await sm.fetchHoldingHistories(chunk, HISTORY_FROM, finalYear);
      if (!rows) throw new Error(`refresh: fetchHoldingHistories failed on the chunk starting at ${i}`);
      for (const r of rows) {
        if (!histories[r.player_name]) histories[r.player_name] = [];
        histories[r.player_name].push([r.year, r.market_value_usd]);
      }
    }
    for (const n of names) if (!histories[n]) throw new Error(`refresh: no history rows at all for ${n}, which the tracked view says has a final season row`);
    console.log(`   refresh: histories for ${names.length} names, ${Object.values(histories).reduce((s, h) => s + h.length, 0)} rows`);
    fs.writeFileSync(DATA_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), finalYear, historyFrom: HISTORY_FROM, columns: COLUMNS, pools, histories }));
  }
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`${path.relative(ROOT, DATA_FILE)} is missing. Run: node scripts/simStockFormat.mjs --refresh   (needs the database)`);
  }
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!raw || !raw.pools || !raw.histories || !raw.finalYear) throw new Error(`${DATA_FILE} is not in the shape this loader writes; refresh it`);
  const pools = {};
  for (const [y, rows] of Object.entries(raw.pools)) pools[y] = rows.map(expand);
  return { fetchedAt: raw.fetchedAt, finalYear: raw.finalYear, historyFrom: raw.historyFrom, pools, histories: raw.histories };
}

/** The saved histories as the HistoryRow[] shape the engine's buildHoldings takes. */
export function historyRowsFor(data, names) {
  const rows = [];
  for (const n of names) {
    for (const [year, value] of data.histories[n] ?? []) rows.push({ player_name: n, year, market_value_usd: value, club: null, nationality: null });
  }
  return rows;
}
