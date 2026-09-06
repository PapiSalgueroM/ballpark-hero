/**
 * Round 474: bake the nationality of every real player Club Manager can put
 * on a teamsheet, from the SAME Supabase source the ratings and values come
 * from (player_market_values_dedup for the 2026 world, player_market_values
 * for the era worlds, which is what scripts/bakeEra20*.mjs read).
 *
 * Why this file has to exist: the board asks added in Round 474 include a
 * nationality quota ("field N players from <country>"), and until now the
 * engine did not know one single player's country. Writing one in by hand
 * would be inventing a fact about a real person, so it is pulled instead,
 * once, from the table the rest of the roster came out of.
 *
 * Names that the table does not carry a nationality for are simply absent
 * from the map, and the engine treats an unknown nationality as "not from
 * that country" rather than guessing. That is the fail closed side of it:
 * a quota can only ever be met by a player whose country is actually known.
 *
 * Re-run whenever a roster bake moves:
 *   node scripts/bakeCmNationalities.mjs
 *
 * FAILS CLOSED if coverage of the real (non generated) roster names drops
 * below the floor recorded in COVERAGE_FLOOR, because a thin map would make
 * every nationality quota quietly unreachable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* The share of real roster names that must resolve to a country. Measured on
   the first run of this script (see the printed line); set a little under it
   so ordinary data drift does not go red but a broken pull does. */
const COVERAGE_FLOOR = 0.9;

const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const urlMatch = clientTs.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
const keyMatch = clientTs.match(/eyJ[A-Za-z0-9_.-]+/);
if (!urlMatch || !keyMatch) {
  console.error('FATAL: could not extract Supabase URL/key from client.ts');
  process.exit(1);
}
const supabase = createClient(urlMatch[0], keyMatch[0], { auth: { persistSession: false } });

/* ------------------------------------------------------------------ */
/* Every real name the four bakes can hand the engine                 */
/* ------------------------------------------------------------------ */
const ROSTER_FILES = [
  'src/data/clubManagerRosters.ts',
  'src/data/clubManagerEra2005.ts',
  'src/data/clubManagerEra2010.ts',
  'src/data/clubManagerEra2015.ts',
];

/** A baked row is `{ n: 'Name', p: 'ST', a: 24, v: 12, r: 80 }`, and a
 *  generated one carries `g: true`. Generated players are this game's own
 *  inventions and have no country to look up. */
const ROW_RE = /\{\s*n:\s*'((?:[^'\\]|\\.)*)'[^}]*\}/g;

const names = new Set();
let generated = 0;
for (const rel of ROSTER_FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let m;
  while ((m = ROW_RE.exec(src)) !== null) {
    if (/\bg:\s*true/.test(m[0])) { generated += 1; continue; }
    names.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  }
}
console.log(`Roster names to resolve: ${names.size} real, ${generated} generated rows skipped`);
if (names.size < 4000) {
  console.error(`FATAL: only ${names.size} names scraped, the roster files did not parse`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Pull the nationality for each of them                              */
/* ------------------------------------------------------------------ */
const wanted = [...names];
const nationOf = new Map();

async function pull(table, chunk) {
  const { data, error } = await supabase
    .from(table)
    .select('player_name,nationality')
    .in('player_name', chunk);
  if (error) {
    console.error(`FATAL: ${table} query failed: ${error.message}`);
    process.exit(1);
  }
  for (const row of data ?? []) {
    if (!row.nationality) continue;
    const nat = String(row.nationality).trim();
    if (!nat) continue;
    if (!nationOf.has(row.player_name)) nationOf.set(row.player_name, nat);
  }
}

const CHUNK = 200;
for (const table of ['player_market_values_dedup', 'player_market_values']) {
  const missing = wanted.filter(n => !nationOf.has(n));
  if (missing.length === 0) break;
  console.log(`  ${table}: looking up ${missing.length} still unresolved`);
  for (let i = 0; i < missing.length; i += CHUNK) {
    await pull(table, missing.slice(i, i + CHUNK));
  }
}

const resolved = wanted.filter(n => nationOf.has(n));
const coverage = resolved.length / wanted.length;
console.log(`Resolved ${resolved.length}/${wanted.length} (${(coverage * 100).toFixed(1)}%) across ${new Set(nationOf.values()).size} countries`);
if (coverage < COVERAGE_FLOOR) {
  console.error(`FATAL: coverage ${(coverage * 100).toFixed(1)}% is under the ${(COVERAGE_FLOOR * 100).toFixed(0)}% floor`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Write the map, countries interned so the file stays small          */
/* ------------------------------------------------------------------ */
const countries = [...new Set(resolved.map(n => nationOf.get(n)))].sort();
const idx = new Map(countries.map((c, i) => [c, i]));
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const entries = resolved
  .sort((a, b) => a.localeCompare(b))
  .map(n => `'${esc(n)}':${idx.get(nationOf.get(n))}`);

const lines = [];
for (let i = 0; i < entries.length; i += 6) lines.push('  ' + entries.slice(i, i + 6).join(','));

const out = `// AUTO-GENERATED by scripts/bakeCmNationalities.mjs (Round 474).
// The country of every real player the Club Manager bakes can field, pulled
// from the same Supabase rows the ratings and values came from
// (player_market_values_dedup, falling back to player_market_values for the
// era worlds). ${resolved.length} of ${wanted.length} roster names resolved,
// ${countries.length} countries. Generated players are this game's own and are
// deliberately absent, as is anybody the table has no country for: the engine
// reads an absent name as "country unknown", never as a guess.
// DO NOT EDIT BY HAND. Regenerate with: node scripts/bakeCmNationalities.mjs

export const CM_NATION_META = {
  generated: '${new Date().toISOString().slice(0, 10)}',
  resolved: ${resolved.length},
  names: ${wanted.length},
  countries: ${countries.length},
};

/** Country names, indexed by the numbers in CM_NATION_IDX. */
export const CM_COUNTRIES: string[] = [
${countries.map(c => `  '${esc(c)}',`).join('\n')}
];

/** Player name to an index into CM_COUNTRIES. */
export const CM_NATION_IDX: Record<string, number> = {
${lines.join(',\n')},
};

/** The country a real player represents, or null when it is not known. */
export function nationOfPlayer(name: string): string | null {
  const i = CM_NATION_IDX[name];
  return i === undefined ? null : CM_COUNTRIES[i];
}
`;

const target = path.join(ROOT, 'src/data/clubManagerNations.ts');
fs.writeFileSync(target, out);
console.log(`Wrote ${target} (${(out.length / 1024).toFixed(0)} KB)`);
