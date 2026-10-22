/**
 * Round 1552: the display names in the 2026 market values that belong to more than one player.
 *
 * Sports Millionaire asks about player_market_values_dedup, which keeps ONE row per name and year.
 * The 2026 slice was also cut to one row per name in place (migration 20260526000008, the highest
 * value kept). So when two different footballers share a display name, the 2026 row is one of them
 * and the question cannot say which: "Which club was Danilo at?" has an answer for each Danilo.
 *
 * The saved raw rows show which names those are. scripts/data/stockMarketPools.json holds, for the
 * seasons 2014 to 2022, every raw row of player_market_values whose name is still in the 2026 slice
 * (the player_market_tracked view, pulled 2026-09-05), with position and age. A name is a namesake
 * when either:
 *   A. one season carries two rows under it whose ages differ by 2 or more (one man is not two ages
 *      apart from himself in one season's snapshot), or
 *   B. its rows across seasons imply birth years (season minus age) 3 or more apart (one man's implied
 *      birth year moves by at most 1 between snapshots).
 * Only names in the 2026 slice (scripts/data/alphabetSprintPool.json, pulled 2026-09-05) are kept,
 * because only those are ever asked.
 *
 * WHAT THIS CANNOT SEE: a pair of namesakes that never both appear in 2014 to 2022 (two men who are
 * both newer than that, or one retired before 2014). 2,315 of the 5,496 names of 2026 have a row in
 * those seasons. The rest need one read only query on the live table, which only the lead runs (the
 * production rule of 2026-10-02); its answer goes in scripts/data/marketNamesakesLive.json as
 * { "readAt": "YYYY-MM-DD", "query": "...", "names": [...] } and this script merges it.
 *
 * The list is only ever used to LEAVE A QUESTION OUT. It states nothing about anybody on screen.
 *
 * Nothing here reaches the network. Run: node scripts/genMarketNamesakes.mjs  (writes
 * src/data/marketNamesakes.json; --check exits 1 when the committed file differs, for a harness).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const OUT = 'src/data/marketNamesakes.json';
const LIVE = 'scripts/data/marketNamesakesLive.json';

export function deriveNamesakes(stock, slice2026) {
  const inSlice = new Set(slice2026.map(r => r.player_name));
  const byName = new Map();
  for (const [season, rows] of Object.entries(stock.pools)) {
    for (const [name, , age] of rows) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push({ season: Number(season), age });
    }
  }
  const evidence = new Map();
  for (const [name, rows] of byName) {
    if (!inSlice.has(name)) continue;
    const aged = rows.filter(r => Number.isFinite(r.age));
    const seasons = new Map();
    for (const r of aged) { if (!seasons.has(r.season)) seasons.set(r.season, []); seasons.get(r.season).push(r.age); }
    for (const [season, ages] of seasons) {
      if (Math.max(...ages) - Math.min(...ages) >= 2) { evidence.set(name, `A ${season}: ages ${Math.min(...ages)} and ${Math.max(...ages)}`); break; }
    }
    if (evidence.has(name) || aged.length < 2) continue;
    const births = aged.map(r => r.season - r.age);
    if (Math.max(...births) - Math.min(...births) >= 3) evidence.set(name, `B: born ${Math.min(...births)} and ${Math.max(...births)}`);
  }
  return evidence;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const stock = read('scripts/data/stockMarketPools.json');
  const slice = read('scripts/data/alphabetSprintPool.json');
  const evidence = deriveNamesakes(stock, slice.rows);
  const live = fs.existsSync(path.join(ROOT, LIVE)) ? read(LIVE) : null;
  const names = new Set(evidence.keys());
  for (const n of live?.names ?? []) names.add(n);
  const out = {
    about: 'Display names in the 2026 market values that belong to more than one player. Sports Millionaire leaves them out of its questions. Made by scripts/genMarketNamesakes.mjs; do not edit by hand.',
    sources: [
      `scripts/data/stockMarketPools.json (raw rows 2014 to 2022, pulled ${String(stock.fetchedAt).slice(0, 10)})`,
      `scripts/data/alphabetSprintPool.json (the 2026 slice, pulled ${slice.fetched})`,
      ...(live ? [`${LIVE} (read only query, ${live.readAt})`] : []),
    ],
    names: [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
  };
  const text = JSON.stringify(out, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(path.join(ROOT, OUT)) ? fs.readFileSync(path.join(ROOT, OUT), 'utf8').replace(/\r\n/g, '\n') : '';
    if (now !== text) { console.error(`${OUT} is stale: run node scripts/genMarketNamesakes.mjs`); process.exit(1); }
    console.log(`${OUT} is current: ${out.names.length} names`);
  } else {
    fs.writeFileSync(path.join(ROOT, OUT), text);
    console.log(`wrote ${OUT}: ${out.names.length} names (${evidence.size} from the saved rows${live ? `, ${live.names.length} from the live query` : ''})`);
    if (process.argv.includes('--evidence')) for (const [n, e] of [...evidence].sort()) console.log(`  ${n}: ${e}`);
  }
}
