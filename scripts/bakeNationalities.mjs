/**
 * Round 194: bake player nationalities for the market filter, per sealed
 * world, from the same player_market_values table every roster came from.
 *
 * WHY PER WORLD, NOT ONE MAP: a name is not a person. The 2010 world's
 * Aaron Ramsey is the Welshman at Arsenal; the modern world's is the
 * English midfielder. A single latest-row map would hand the 2010 Gunners
 * an English Ramsey, which is invented data. So each world resolves its
 * names inside its own year window, matching the sealed-world rule the
 * eras have obeyed since Round 146:
 *   now      -> year >= 2025, prefer 2026, then highest value
 *   era2015  -> year IN (2015, 2016), prefer 2015
 *   era2010  -> year IN (2010, 2011), prefer 2010
 *   era2005  -> year IN (2005, 2006), prefer 2005
 * The query shape per world (run 2026-08-19 via the Supabase MCP against
 * project flawuiqbvjobmkfkauhw, 12 batches of at most 700 names):
 *   WITH world(idx,name) AS (VALUES ...),
 *   best AS (SELECT DISTINCT ON (player_name) player_name, nationality
 *            FROM player_market_values WHERE <window> AND player_name IN
 *            (SELECT name FROM world)
 *            ORDER BY player_name, <year pref> DESC, market_value_usd DESC)
 *   SELECT string_agg(COALESCE(b.nationality,'?'), E'\n' ORDER BY w.idx)
 *   FROM world w LEFT JOIN best b ON b.player_name = w.name;
 *
 * INPUTS are session files under /tmp/nat194 (<world>_names.txt extracted
 * from the four shipped roster files, blob_<world>_<n>.txt transcribed
 * verbatim from the MCP results). Like the Round 191 era dumps, those
 * inputs die with the session; the OUTPUT, src/data/playerNationalities.ts,
 * is the verified artifact and this header is its provenance.
 *
 * FAIL-CLOSED RULES:
 *  - blob line counts must equal batch sizes exactly (order is identity);
 *  - a name the window could not resolve ('?') is OMITTED, printed, and
 *    more than 3 per world kills the bake;
 *  - a name appearing TWICE inside one world file would make one map entry
 *    cover two different people, so it is asserted to zero (the one-name
 *    one-player collision rule has held since Round 175's audit);
 *  - every nationality string must have a FLAG_CODES entry, else the bake
 *    dies listing the gaps (the filter renders flags, not text);
 *  - VERIFIED_OVERRIDES: hand-pinned answers backed by receipts. Lucas
 *    Silva pins the modern man to Portugal per the Round 185 simEra2015
 *    receipt (Luzern's Lucas Manuel Silva Ferreira, b. 2006, Portuguese,
 *    per Soccerway and the club's July 2026 extension news); the 2025+
 *    window agrees today (his Luzern row is the only one), so this is
 *    belt and braces against a future Brazilian namesake row outbidding
 *    him, not a correction. Tonali is a genuine gap fill, see below.
 *
 * Run: node scripts/bakeNationalities.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = '/tmp/nat194';
const OUT = path.join(ROOT, 'src/data/playerNationalities.ts');
const B = 700;

const WORLDS = [
  { id: 'now', file: 'src/data/clubManagerRosters.ts' },
  { id: 'era2015', file: 'src/data/clubManagerEra2015.ts' },
  { id: 'era2010', file: 'src/data/clubManagerEra2010.ts' },
  { id: 'era2005', file: 'src/data/clubManagerEra2005.ts' },
];

const VERIFIED_OVERRIDES = {
  now: {
    'Lucas Silva': 'Portugal',
    /* No 2025+ row exists for Tonali (his table rows stop at 2022, AC
       Milan), but every row he has ever had says Italy and the modern
       roster's Tonali IS that one man, so the any-year answer is safe.
       Resolved 2026-08-19 with a targeted ILIKE query via the MCP. */
    'Sandro Tonali': 'Italy',
  },
};

let failed = false;
const die = m => { console.error('  BAKE FAIL: ' + m); failed = true; };

/* Load FLAG_CODES through esbuild so the check reads the real component. */
fs.writeFileSync('/tmp/nat194/flagEntry.mjs', `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export { FLAG_CODES } from '${ROOT}/src/components/FlagImg.tsx';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild /tmp/nat194/flagEntry.mjs --bundle --format=esm --platform=node --loader:.tsx=tsx --outfile=/tmp/nat194/flag.bundle.mjs --log-level=error`, { stdio: 'inherit' });
const { FLAG_CODES } = await import('/tmp/nat194/flag.bundle.mjs');

const extractNames = src => {
  const t = fs.readFileSync(path.join(ROOT, src), 'utf-8');
  const out = [];
  for (const m of t.matchAll(/\bn:\s*'((?:[^'\\]|\\.)*)'/g)) out.push(m[1].replace(/\\'/g, "'"));
  for (const m of t.matchAll(/\bn:\s*"((?:[^"\\]|\\.)*)"/g)) out.push(m[1]);
  return out;
};

const maps = {};
const natSet = new Set();
for (const w of WORLDS) {
  const all = extractNames(w.file);
  const names = [...new Set(all)].sort();
  if (all.length !== names.length) {
    /* One entry would cover two different people. The collision rule has
       held since the 175 audit; if it ever breaks, this bake must not
       paper over it. */
    const seen = new Set(); const dups = new Set();
    for (const n of all) { if (seen.has(n)) dups.add(n); seen.add(n); }
    die(`${w.id}: duplicate names inside one world: ${[...dups].join(', ')}`);
  }
  const saved = fs.existsSync(path.join(IN, `${w.id}_names.txt`))
    ? fs.readFileSync(path.join(IN, `${w.id}_names.txt`), 'utf-8').split('\n')
    : null;
  if (saved && (saved.length !== names.length || saved.some((n, i) => n !== names[i]))) {
    die(`${w.id}: the roster names no longer match the queried name list; requery before baking`);
  }

  const nats = [];
  for (let bi = 1; ; bi++) {
    const f = path.join(IN, `blob_${w.id}_${bi}.txt`);
    if (!fs.existsSync(f)) break;
    const lines = fs.readFileSync(f, 'utf-8').replace(/\n$/, '').split('\n');
    const expected = Math.min(B, names.length - (bi - 1) * B);
    if (lines.length !== expected) die(`${w.id} batch ${bi}: ${lines.length} lines, expected ${expected}`);
    nats.push(...lines);
  }
  if (nats.length !== names.length) die(`${w.id}: ${nats.length} nationalities for ${names.length} names`);

  const map = {};
  const missing = [];
  for (let i = 0; i < names.length; i++) {
    const override = (VERIFIED_OVERRIDES[w.id] ?? {})[names[i]];
    const nat = override ?? nats[i];
    if (!nat || nat === '?') { missing.push(names[i]); continue; }
    map[names[i]] = nat;
    natSet.add(nat);
  }
  if (missing.length) console.log(`  ${w.id}: ${missing.length} unresolved, omitted honestly: ${missing.join(', ')}`);
  if (missing.length > 3) die(`${w.id}: too many unresolved names, the window or the transcription is wrong`);
  maps[w.id] = map;
  console.log(`  ${w.id}: ${Object.keys(map).length} of ${names.length} names carry a nationality`);
}

const flagless = [...natSet].filter(n => !FLAG_CODES[n]).sort();
if (flagless.length) die(`nationalities with no FLAG_CODES entry: ${flagless.join(' | ')}`);

/* The two same-name different-world sanity pins that motivated per-world
   maps in the first place. If these ever fail, the windows regressed. */
if (maps.era2010['Aaron Ramsey'] !== 'Wales') die(`the 2010 Aaron Ramsey must be Welsh, got ${maps.era2010['Aaron Ramsey']}`);
if (maps.era2015['Aaron Ramsey'] !== 'Wales') die(`the 2015 Aaron Ramsey must be Welsh, got ${maps.era2015['Aaron Ramsey']}`);
if (maps.now['Lucas Silva'] !== 'Portugal') die('the modern Lucas Silva override did not apply');

if (failed) process.exit(1);

const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const emitMap = m => Object.keys(m).sort().map(k => `  '${esc(k)}': '${esc(m[k])}',`).join('\n');
const total = Object.values(maps).reduce((n, m) => n + Object.keys(m).length, 0);

const body = `/* AUTO-GENERATED by scripts/bakeNationalities.mjs (Round 194). DO NOT EDIT BY HAND.
   One map per sealed world, because a name is not a person: the 2010
   Aaron Ramsey is Welsh, the modern one is English, and a single map
   would invent one of them. Provenance, year windows and the fail-closed
   rules live in the bake script's header. ${total} entries total. */

export const NATIONALITY_BY_WORLD: Record<string, Record<string, string>> = {
now: {
${emitMap(maps.now)}
},
era2015: {
${emitMap(maps.era2015)}
},
era2010: {
${emitMap(maps.era2010)}
},
era2005: {
${emitMap(maps.era2005)}
},
};

/** The world's honest answer, or null: generated and academy players are
    made up and get no flag, and an unresolved real name shows nothing
    rather than a guess. */
export function nationalityOf(eraId: string | undefined, name: string): string | null {
  const world = NATIONALITY_BY_WORLD[eraId ?? 'now'] ?? NATIONALITY_BY_WORLD.now;
  return world[name] ?? null;
}
`;
fs.writeFileSync(OUT, body);
console.log(`\nwrote ${OUT}: ${total} entries across ${WORLDS.length} worlds, ${natSet.size} nationalities, all flagged.`);
