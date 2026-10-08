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
 *   era2020  -> year IN (2020, 2021), prefer 2020 (offline only, see below)
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
 *
 * OFFLINE (--offline, Round 1015) bakes from committed pulls with no database:
 * the era worlds from the era dumps, the modern world from the shipped map plus
 * one production read of its gap that the lead runs. Its rules are in the block
 * above it, below prune.
 *
 * PRUNE (--prune) is the one thing that still works once the session inputs
 * are gone. A round that drops players from a roster leaves their entries
 * behind, and simNationalities calls those a leak. Prune rebuilds the file
 * from the shipped map, keeping only names the world still carries, and it is
 * removal only: a roster name with no entry kills the run rather than being
 * guessed, so it can never stand in for the real bake. See the block above
 * the emitter for the rest of its rules.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = '/tmp/nat194';
const OUT = path.join(ROOT, 'src/data/playerNationalities.ts');
const B = 700;

const WORLDS = [
  { id: 'now', file: 'src/data/clubManagerRosters.ts' },
  /* Release AF: the 2020-21 world (Round 971). Its block was first written by
     scripts/bakeEra2020.mjs through updateNationalityBlock; the offline bake
     below re-derives it from the 2020-21 dump under the same window rule as
     the other eras and must agree with that block. The full bake (no flag)
     has no session blobs for it, as for every world. */
  { id: 'era2020', file: 'src/data/clubManagerEra2020.ts' },
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
  era2015: {
    /* Round 1015 review: Udinese's Guilherme (defensive midfield, 23 in his
       2015 row). The window's richest row was Lokomotiv Moscow's goalkeeper
       (Russia), which is what shipped; his own row says Qatar, but
       Wikipedia's 2015-16 Udinese season page lists the squad's Guilherme as
       Guilherme dos Santos Torres of Brazil (read 2026-10-06). The two
       sources disagree, so he carries no flag rather than either one. */
    Guilherme: '?',
  },
};

let failed = false;
const die = m => { console.error('  BAKE FAIL: ' + m); failed = true; };

/* Load FLAG_CODES through esbuild so the check reads the real component, and
   the shipped map beside it because prune mode rebuilds from it. The scratch
   dir is the platform's own temp dir: the session inputs under IN only ever
   existed on the machine that ran the queries, and prune does not need them. */
const TMP = path.join(os.tmpdir(), 'nat194bake');
fs.mkdirSync(TMP, { recursive: true });
const R = ROOT.replaceAll('\\', '/');
fs.writeFileSync(path.join(TMP, 'flagEntry.mjs'), `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export { FLAG_CODES } from '${R}/src/components/FlagImg.tsx';
export { NATIONALITY_BY_WORLD as SHIPPED } from '${R}/src/data/nationalities/allWorlds.ts';
`);
execSync(`"${R}/node_modules/.bin/esbuild" "${path.join(TMP, 'flagEntry.mjs')}" --bundle --format=esm --platform=node --loader:.tsx=tsx --outfile="${path.join(TMP, 'flag.bundle.mjs')}" --log-level=error`, { stdio: 'inherit' });
const { FLAG_CODES, SHIPPED } = await import(pathToFileURL(path.join(TMP, 'flag.bundle.mjs')).href);

const extractNames = src => {
  const t = fs.readFileSync(path.join(ROOT, src), 'utf-8');
  const out = [];
  for (const m of t.matchAll(/\bn:\s*'((?:[^'\\]|\\.)*)'/g)) out.push(m[1].replace(/\\'/g, "'"));
  for (const m of t.matchAll(/\bn:\s*"((?:[^"\\]|\\.)*)"/g)) out.push(m[1]);
  return out;
};

/* One emitter, used by the full bake and by prune, so the shipped file keeps
   the same shape whichever path wrote it. */
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const emitMap = m => Object.keys(m).sort().map(k => `  '${esc(k)}': '${esc(m[k])}',`).join('\n');
/* Round 1042: each world is a file of its own. The modern world stays in
   src/data/playerNationalities.ts with the table of the past worlds' files and
   nationalityOf; each past world is src/data/nationalities/<id>.ts, fetched with
   that season's squads; allWorlds.ts beside them hands scripts and tests all
   five at once. The three templates below ARE those files: change one here and
   run --rewrite. The list of past worlds is WORLDS above, never typed twice. */
const NAT_DIR = path.join(ROOT, 'src/data/nationalities');
const ERA_IDS = WORLDS.map(w => w.id).filter(id => id !== 'now');
const nowFileText = (nowBody, eraIds, nowCount) => `/* AUTO-GENERATED by scripts/bakeNationalities.mjs (Round 194). DO NOT EDIT BY HAND.
   One map per sealed world, because a name is not a person: the 2010
   Aaron Ramsey is Welsh, the modern one is English, and a single map
   would invent one of them. Provenance, year windows and the fail-closed
   rules live in the bake script's header.

   Since Round 1042 each world lives in a file of its own. This file holds
   today's world (${nowCount} entries), the table of the past worlds' files and
   nationalityOf. A past world's map is src/data/nationalities/<its id>.ts and
   arrives with that season's squads. To change anything here, change the
   template in scripts/bakeNationalities.mjs (writeOut) and run
   node scripts/bakeNationalities.mjs --rewrite. Never edit this file.

   Since Round 1015 the bake runs without a database (--offline): the era
   blocks from the committed era dumps, the modern block from this file plus
   one production read of the names it lacks. An era bake that extends a world
   (scripts/lib/eraBakeExtend.mjs, updateNationalityBlock) also rewrites that
   world's block, in that world's own file, with the nationality on each baked
   row. Earlier hand edits (Rounds 567 and 616) are in the git history of this
   file. */

/* WHERE CLUB MANAGER'S DATA LIVES, AND WHAT LOADS WHEN (Round 1042). Read before adding a league.
   - Today's world ships with the engine: its squads (clubManagerRosters, clubManagerWorldRosters
     and the generated league files beside them) and its nationalities (the modern block below,
     then a generated league's own map, read after it the way CM_ALEAGUE_NATIONALITIES is). A NEW
     MODERN LEAGUE goes there and nowhere else: its squads in its own generated file, its
     nationalities in the modern block or in its own generated map read by nationalityOf.
   - A past season is sealed and arrives on demand, in one promise: its squads
     (src/data/clubManagerEraNNNN.ts) and its nationalities (src/data/nationalities/eraNNNN.ts),
     through ensureEraRosters in src/lib/clubManagerEras.ts. A league added to a past season is
     written by that season's bake (scripts/bakeEraNNNN.mjs), which rewrites both files, so it
     lands in the right chunk with nobody remembering. A NEW SEASON is four steps, in this order:
     one row in ERA_BAKES (src/lib/clubManagerEras.ts); one row in WORLDS in
     scripts/bakeNationalities.mjs; node scripts/bakeNationalities.mjs --rewrite, which writes
     that world's file with an EMPTY block, its row in the table below and its line in
     allWorlds.ts; then that season's own bake (scripts/bakeEraNNNN.mjs), which fills the block
     from the rows it bakes. Between the last two steps scripts/simCmDataOnDemand.mjs section 3
     is red on the empty block, on purpose: a season with no nationalities must not ship.
   - nationalityOf and the table of files below are written from the TEMPLATE in
     scripts/bakeNationalities.mjs (writeOut). A new generated map that nationalityOf should read
     is added there, and the files are remade with --rewrite, never by editing this file.
   - National team pools (src/data/nationalPools.ts) belong to Soccer Career's squad picker
     (src/lib/soccerInternationalSquads.ts). A manager game never imports that file.
   - src/data/nationalities/allWorlds.ts is for scripts and tests. The app never imports it.
   scripts/simCmDataOnDemand.mjs and scripts/sweepWeight.mjs section 4 hold all of this. */
import { CM_ALEAGUE_NATIONALITIES } from '@/data/clubManagerALeague2026';

/** Today's world, under the key it has always had. */
export const NATIONALITY_WORLD_NOW: Record<string, Record<string, string>> = {
now: {
${nowBody}
},
};

/** The sealed past worlds and the file each lives in. One row per world; written with the files. */
export const NATIONALITY_WORLD_LOADERS: Record<string, () => Promise<Record<string, string>>> = {
${eraIds.map(id => `  ${id}: () => import('@/data/nationalities/${id}').then(m => m.NATIONALITY_WORLD.${id}),`).join('\n')}
};

/* The past worlds that have arrived, by id. Filled by registerNationalityWorld, which the era
   gate (ensureEraRosters in src/lib/clubManagerEras.ts) calls before it hands out the squads. */
const ARRIVED: Record<string, Record<string, string>> = {};

/** Fetches one past world's map. A key with no row above rejects, naming the key. */
export function loadNationalityWorld(key: string): Promise<Record<string, string>> {
  if (!Object.prototype.hasOwnProperty.call(NATIONALITY_WORLD_LOADERS, key)) {
    return Promise.reject(new Error(\`no nationality file for the world "\${key}": add its row to WORLDS in scripts/bakeNationalities.mjs and run it with --rewrite\`));
  }
  return NATIONALITY_WORLD_LOADERS[key]();
}

/** Hands nationalityOf a past world's map. Throws on a key with no row above, so today's world
    can never be sealed by mistake and lose its fall through to the A-League map. */
export function registerNationalityWorld(key: string, world: Record<string, string>): void {
  if (!Object.prototype.hasOwnProperty.call(NATIONALITY_WORLD_LOADERS, key)) {
    throw new Error(\`"\${key}" is not a past world with a nationality file\`);
  }
  ARRIVED[key] = world;
}

/** The world's honest answer, or null: generated and academy players are
    made up and get no flag, and an unresolved real name shows nothing
    rather than a guess. Round 1035: the modern world also reads the A-League
    Men's map, generated with its squads (two hosts a nationality,
    scripts/genClubManagerALeague.mjs), after its own entries.
    Round 1042, three cases. A past world that has arrived answers from its own
    map. A past world that has NOT arrived answers null: no flag, never the
    modern namesake's (no screen can get there, every one waits on the era
    gate; it exists so a mistake shows as a missing flag and not a wrong one).
    Anything else (undefined, 'now', an id no table knows) reads today's world
    and then the A-League map, as it always did. */
export function nationalityOf(eraId: string | undefined, name: string): string | null {
  const key = eraId ?? 'now';
  const sealed = ARRIVED[key];
  if (sealed) return sealed[name] ?? null;
  if (Object.prototype.hasOwnProperty.call(NATIONALITY_WORLD_LOADERS, key)) return null;
  return NATIONALITY_WORLD_NOW.now[name] ?? CM_ALEAGUE_NATIONALITIES[name] ?? null;
}
`;

const eraFileText = (id, body) => `/* AUTO-GENERATED by scripts/bakeNationalities.mjs. DO NOT EDIT BY HAND.
   The nationalities of one sealed past world, ${id} (Round 1042: one file per past world).
   It is fetched on demand, in the same promise as that season's squads (ensureEraRosters in
   src/lib/clubManagerEras.ts), so the app never imports it statically.
   scripts/bakeEra${id.slice(3)}.mjs rewrites the block below when it extends that season
   (updateNationalityBlock in scripts/lib/eraBakeExtend.mjs, which reads from the line
   "${id}: {" to the line "},"), and node scripts/bakeNationalities.mjs --rewrite remakes the
   whole file. Where everything lives: the top of src/data/playerNationalities.ts. */
export const NATIONALITY_WORLD: Record<string, Record<string, string>> = {
${id}: {
${body ? `${body}\n` : ''}},
};
`;

const allWorldsText = (eraIds) => `/* AUTO-GENERATED by scripts/bakeNationalities.mjs. DO NOT EDIT BY HAND.
   FOR SCRIPTS AND TESTS ONLY. The app must never import this file: it pulls every past world
   back onto whatever page imports it, which is the download Round 1042 took off Club Manager,
   Manager Hot Seat and Deadline Day (scripts/simCmDataOnDemand.mjs section 1 fails on it).
   A harness that wants all five worlds at once reads them from here. The maps are the SAME
   objects the registry is handed, never copies, so a negative control that writes into one is
   writing into what nationalityOf reads. */
import { NATIONALITY_WORLD_NOW, registerNationalityWorld } from '../playerNationalities';
${eraIds.map(id => `import { NATIONALITY_WORLD as ${id.toUpperCase()} } from './${id}';`).join('\n')}

export const NATIONALITY_BY_WORLD: Record<string, Record<string, string>> = {
  now: NATIONALITY_WORLD_NOW.now,
${eraIds.map(id => `  ${id}: ${id.toUpperCase()}.${id},`).join('\n')}
};

/** Registers every past world at once, for a script that calls nationalityOf without loading
 *  the engine's eras. In the game each world is registered by its own era gate instead. */
export function registerAllNationalityWorlds(): void {
  for (const key of Object.keys(NATIONALITY_BY_WORLD)) {
    if (key !== 'now') registerNationalityWorld(key, NATIONALITY_BY_WORLD[key]);
  }
}
`;

/* A file keeps the line ending it has on disk (this checkout stores src as
   CRLF), so a rewrite that changes nothing shows as no change at all. */
const writeKeepingEol = (file, text) => {
  const crlf = fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('\r\n');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text);
};
const writeOut = maps => {
  for (const id of ['now', ...ERA_IDS]) if (!maps[id]) throw new Error(`writeOut was handed no map for ${id}`);
  const total = Object.values(maps).reduce((n, m) => n + Object.keys(m).length, 0);
  writeKeepingEol(OUT, nowFileText(emitMap(maps.now), ERA_IDS, Object.keys(maps.now).length));
  for (const id of ERA_IDS) writeKeepingEol(path.join(NAT_DIR, `${id}.ts`), eraFileText(id, emitMap(maps[id])));
  writeKeepingEol(path.join(NAT_DIR, 'allWorlds.ts'), allWorldsText(ERA_IDS));
  return total;
};

/* REWRITE MODE, node scripts/bakeNationalities.mjs --rewrite (Round 1042).
   Loads the shipped maps and writes the six files back out, and nothing else:
   no check, no database, no session input. It is how a change to a template
   above reaches the files, and it is the proof that the files are exactly
   what the writer would write: on an untouched tree it must leave
   git diff --ignore-cr-at-eol --stat -- src/data empty.
   A NEW SEASON starts here too (fixed 2026-10-08). The shipped maps are read
   through allWorlds.ts, which cannot know a world whose file does not exist
   yet, so until that day a new row in WORLDS made this mode throw "writeOut
   was handed no map" while the data shape comment and the loader's error
   message both sent the next builder here. A world WORLDS names that has no
   shipped map now starts as an EMPTY block: its file, its row in the loader
   table and its line in allWorlds.ts are written, the run says so loudly,
   and that season's own bake fills the block (updateNationalityBlock reads
   from the line "eraNNNN: {" to the line "}," and an empty block is one it
   accepts). On a tree where every world has its file this changes nothing. */
if (process.argv.includes('--rewrite')) {
  const fresh = ERA_IDS.filter(id => !SHIPPED[id]);
  const maps = { ...SHIPPED };
  for (const id of fresh) maps[id] = {};
  const total = writeOut(maps);
  console.log(`bakeNationalities --rewrite: ${total} entries written back across ${ERA_IDS.length + 1} worlds (${['now', ...ERA_IDS].map(id => `${id} ${Object.keys(maps[id]).length}`).join(', ')}) and allWorlds.ts`);
  if (fresh.length) {
    console.log(`  NEW WORLD${fresh.length === 1 ? '' : 'S'}: ${fresh.join(', ')}. Written with an EMPTY block, because no shipped map exists for ${fresh.length === 1 ? 'it' : 'them'} yet.`);
    console.log(`  Next: ${fresh.map(id => `node scripts/bakeEra${id.slice(3)}.mjs`).join(', ')} fills the block. Until then scripts/simCmDataOnDemand.mjs section 3 is red on it, on purpose.`);
  }
  process.exit(0);
}

/* PRUNE MODE, node scripts/bakeNationalities.mjs --prune.
   A round that drops a player from a roster leaves his entry behind, and an
   entry for a man no world contains is a name nobody can check, which is what
   simNationalities section 1 calls a leak. The session inputs above died with
   the 2026-08-19 session, so prune rebuilds the file from the shipped map
   itself and touches nothing else.
   It may only ever REMOVE. A roster name with no entry kills the run instead
   of being filled with a guess, so prune can never stand in for the real bake,
   and the flag rule and the namesake pins are re-checked on what survives. */
if (process.argv.includes('--prune')) {
  const pruned = {};
  const kept = new Set();
  for (const w of WORLDS) {
    const names = new Set(extractNames(w.file));
    const shipped = SHIPPED[w.id];
    if (!shipped) { die(`${w.id}: the shipped file has no map for this world`); continue; }
    const dropped = [];
    const map = {};
    for (const [n, nat] of Object.entries(shipped)) {
      if (names.has(n)) { map[n] = nat; kept.add(nat); } else dropped.push(n);
    }
    const orphans = [...names].filter(n => !map[n]);
    if (orphans.length) {
      die(`${w.id}: ${orphans.length} roster names carry no entry and prune may not invent one (${orphans.slice(0, 5).join(', ')}). Re-run the full bake.`);
    }
    console.log(`  ${w.id}: ${Object.keys(map).length} kept for ${names.size} names, ${dropped.length} dropped${dropped.length ? ': ' + dropped.join(', ') : ''}`);
    pruned[w.id] = map;
  }
  const noFlag = [...kept].filter(n => !FLAG_CODES[n]).sort();
  if (noFlag.length) die(`nationalities with no FLAG_CODES entry: ${noFlag.join(' | ')}`);
  if (pruned.era2010?.['Aaron Ramsey'] !== 'Wales') die('the 2010 Aaron Ramsey must stay Welsh');
  if (pruned.era2015?.['Aaron Ramsey'] !== 'Wales') die('the 2015 Aaron Ramsey must stay Welsh');
  if (pruned.now?.['Lucas Silva'] !== 'Portugal') die('the modern Lucas Silva override must survive');
  if (failed) process.exit(1);
  const total = writeOut(pruned);
  console.log(`\nwrote ${OUT}: ${total} entries across ${WORLDS.length} worlds, ${kept.size} nationalities, all flagged.`);
  process.exit(0);
}

/* OFFLINE MODE (Round 1015), node scripts/bakeNationalities.mjs --offline.
   Production is off limits to builders since 2026-10-02, and the session
   inputs above died with their session, so this mode bakes from committed
   pulls instead.
   - The era worlds are resolved from the era dumps (--dumps=DIR, default
     C:/Users/antho/dukb-handoff/data: market-base-2005-2010-2015.json,
     market-base-2006-2011-2016.json and, since Release AF, the 2020-21 era's
     market-base-2020-2021.json, all pulled from player_market_values
     with nationality) under the SAME windows and tie breaks as the queries
     above: the window's years only, the preferred year first, then the
     highest market_value_usd. Where the window holds two men of the name with
     different countries, only the rows of the roster's own man (same age and
     position) are read, when there are any (see the loop). Where two rows
     still tie on both and disagree on the country, Postgres would have picked
     one at random, so the name is left unresolved instead. An answer the
     roster's own man decided may correct the shipped map, and says so; every
     other answer is compared with the shipped map, and a
     disagreement kills the run: one of the two is wrong and this run cannot
     say which.
   - The modern world has no offline pull with a country in it. It keeps every
     shipped answer whose name is still on the roster (removal only, like
     prune), and the roster names with no answer are the gap, written one per
     line, sorted, to --gap-out (default <tmp>/nat1015/now_gap_names.txt).
     The gap is resolved by ONE production read the lead runs, with the query
     shape at the top of this header, window year >= 2025, ORDER BY
     player_name, year DESC, market_value_usd DESC, over exactly those names in
     that order. Its result goes into DIR as blob_now_gap_1.txt (and _2, _3 if
     batched), one country or '?' per line, beside the now_gap_names.txt it was
     run on, and --now-gap=DIR finishes the bake: the names file must equal
     today's gap line for line, the blob must have one line per name, and more
     than 3 '?' kills the run as in every world.
   - Without --now-gap, a gap of more than 3 kills the run unless
     --allow-now-gap is passed, which writes the file with the gap still open
     and says so. That is the honest state between a roster change and the read.
   - A name twice in one world is two men (Round 883 keeps namesakes apart in
     the modern roster) and one map entry would cover both, so the name is
     refused: it gets no entry, is printed, and is not counted as unresolved.
   - VERIFIED_OVERRIDES win everywhere, the flag rule and the namesake pins
     hold as in the full bake. */
if (process.argv.includes('--offline')) {
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const DUMPS = arg('dumps') ?? 'C:/Users/antho/dukb-handoff/data';
  const GAP_OUT = arg('gap-out') ?? path.join(os.tmpdir(), 'nat1015', 'now_gap_names.txt');
  const NOW_GAP = arg('now-gap');
  const WINDOWS = {
    era2020: { years: [2020, 2021], prefer: 2020 },
    era2015: { years: [2015, 2016], prefer: 2015 },
    era2010: { years: [2010, 2011], prefer: 2010 },
    era2005: { years: [2005, 2006], prefer: 2005 },
  };
  const byName = new Map();
  for (const f of ['market-base-2005-2010-2015.json', 'market-base-2006-2011-2016.json', 'market-base-2020-2021.json']) {
    const j = JSON.parse(fs.readFileSync(path.join(DUMPS, f), 'utf8'));
    if (j.table !== 'player_market_values') die(`${f} was pulled from ${j.table}, the windows read player_market_values`);
    for (const r of j.rows ?? []) {
      if (!byName.has(r.player_name)) byName.set(r.player_name, []);
      byName.get(r.player_name).push({ year: Number(r.year), usd: Number(r.market_value_usd), nat: r.nationality ?? null, age: Number(r.age), pos: r.position });
    }
  }
  /* The roster bakes' own position map, and each name's roster line. */
  const POS_MAP = {
    'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
    'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
    'Left Midfield': 'LM', 'Right Midfield': 'RM', 'Left Winger': 'LW', 'Right Winger': 'RW',
    'Centre-Forward': 'ST', 'Second Striker': 'CF',
  };
  const rosterMen = file => {
    const t = fs.readFileSync(path.join(ROOT, file), 'utf-8');
    const m = new Map();
    for (const x of t.matchAll(/\bn:\s*'((?:[^'\\]|\\.)*)',\s*p:\s*'(\w+)',\s*a:\s*(\d+)/g)) m.set(x[1].replace(/\\'/g, "'"), { p: x[2], a: Number(x[3]) });
    return m;
  };
  if (!byName.size) die('the era dumps hold no rows');
  /* Negative control: NAT_BAKE_CONTROL=disagree makes the shipped 2005 Henry
     Spanish in memory, and the run must die on the disagreement, writing nothing. */
  if (process.env.NAT_BAKE_CONTROL === 'disagree') {
    if (SHIPPED.era2005?.['Thierry Henry'] !== 'France') { console.error('control refuses to run: the shipped 2005 Henry is not French'); process.exit(1); }
    SHIPPED.era2005['Thierry Henry'] = 'Spain';
    console.log('NEGATIVE CONTROL ON: the shipped 2005 Thierry Henry made Spanish; the run must die');
  }
  const offline = {};
  const kept = new Set();
  for (const w of WORLDS) {
    const all = extractNames(w.file);
    const count = new Map();
    for (const n of all) count.set(n, (count.get(n) ?? 0) + 1);
    const refused = [...count.keys()].filter(n => count.get(n) > 1).sort();
    if (refused.length) console.log(`  ${w.id}: ${refused.length} names refused, each is two men in this world: ${refused.join(', ')}`);
    const names = [...count.keys()].filter(n => count.get(n) === 1).sort();
    const overrides = VERIFIED_OVERRIDES[w.id] ?? {};
    const map = {};
    const missing = [];
    if (WINDOWS[w.id]) {
      const { years, prefer } = WINDOWS[w.id];
      const disagree = [];
      const corrected = [];
      const man = rosterMen(w.file);
      for (const n of names) {
        const cand = (byName.get(n) ?? []).filter(r => years.includes(r.year))
          .sort((a, b) => (b.year === prefer) - (a.year === prefer) || b.usd - a.usd);
        /* Two men of one name in the window with different countries. The
           query above took the preferred year's richest row, which is the
           roster's own man only when he is the richer one: an exact tie was a
           random pick (Pablo Hernández, Simão), and a richer namesake simply
           won (Round 1015 review: Barcelona's right back Douglas wore the
           Dutch flag of a Dynamo Moscow centre back, West Brom's Andy Johnson
           the English flag of Crystal Palace's striker). So whenever the
           window's rows disagree on the country, only the rows that are the
           roster's own man (same age and same position) are read, in the same
           order; if none is, all of them are, as before. A tie left between
           two countries at the top leaves the name unresolved. */
        let pool = cand;
        let idUsed = false;
        if (new Set(cand.map(r => r.nat)).size > 1) {
          const his = cand.filter(r => r.age === man.get(n)?.a && POS_MAP[r.pos] === man.get(n)?.p);
          if (his.length) { pool = his; idUsed = true; }
        }
        const tied = pool.filter(r => r.year === pool[0].year && r.usd === pool[0].usd);
        let nat = new Set(tied.map(r => r.nat)).size > 1 ? null : (pool[0]?.nat ?? null);
        const tieBroken = idUsed;
        if (idUsed && (nat !== cand[0].nat || new Set(cand.filter(r => r.year === cand[0].year && r.usd === cand[0].usd).map(r => r.nat)).size > 1)) {
          console.log(`  ${w.id}: ${n}: the window's first row is ${cand[0].nat} (${cand[0].pos} ${cand[0].age}); the roster's man (${man.get(n)?.p} ${man.get(n)?.a}) is ${nat ?? 'not one country alone'}`);
        }
        nat = overrides[n] ?? nat;
        if (!nat || nat === '?') { missing.push(n); continue; }
        map[n] = nat;
        const was = SHIPPED[w.id]?.[n];
        if (was !== nat) (tieBroken ? corrected : disagree).push(`${n} (shipped ${was ?? 'nothing'}, dump ${nat})`);
      }
      if (disagree.length) die(`${w.id}: ${disagree.length} answers differ from the shipped map: ${disagree.slice(0, 12).join('; ')}`);
      if (corrected.length) console.log(`  ${w.id}: CORRECTED ${corrected.length} shipped answers that were a namesake's country, not the roster man's:${corrected.join('; ')}`);
      console.log(`  ${w.id}: ${Object.keys(map).length} of ${names.length} names resolved from the era dumps, the rest of the shipped map agreeing`);
    } else {
      const shipped = SHIPPED[w.id] ?? {};
      const gap = [];
      for (const n of names) {
        const nat = overrides[n] ?? shipped[n];
        if (nat) map[n] = nat; else gap.push(n);
      }
      const dropped = Object.keys(shipped).filter(n => !Object.hasOwn(map, n));
      console.log(`  ${w.id}: ${Object.keys(map).length} shipped answers kept for ${names.length} names, ${dropped.length} dropped (no longer one man on the roster), ${gap.length} with no answer`);
      if (gap.length) {
        fs.mkdirSync(path.dirname(GAP_OUT), { recursive: true });
        fs.writeFileSync(GAP_OUT, gap.join('\n') + '\n');
        /* The read itself, beside the list: the header's query shape over the
           gap in its order, so its result is the blob line for line. */
        const values = gap.map((n, i) => `(${i + 1},'${n.replace(/'/g, "''")}')`).join(',\n');
        fs.writeFileSync(GAP_OUT.replace(/\.txt$/, '') + '.sql', `WITH world(idx,name) AS (VALUES\n${values}),\n`
          + 'best AS (SELECT DISTINCT ON (player_name) player_name, nationality\n'
          + '         FROM player_market_values WHERE year >= 2025 AND player_name IN (SELECT name FROM world)\n'
          + '         ORDER BY player_name, year DESC, market_value_usd DESC)\n'
          + "SELECT string_agg(COALESCE(b.nationality,'?'), E'\\n' ORDER BY w.idx)\n"
          + 'FROM world w LEFT JOIN best b ON b.player_name = w.name;\n');
        console.log(`  ${w.id}: the ${gap.length} names with no answer are in ${GAP_OUT}, the read that resolves them beside it (.sql)`);
      }
      if (NOW_GAP) {
        const asked = fs.readFileSync(path.join(NOW_GAP, 'now_gap_names.txt'), 'utf-8').replace(/\r/g, '').replace(/\n$/, '').split('\n');
        if (asked.length !== gap.length || asked.some((n, i) => n !== gap[i])) {
          die(`${w.id}: the read was run on ${asked.length} names that are not today's gap of ${gap.length}; requery before baking`);
        }
        const lines = [];
        for (let bi = 1; fs.existsSync(path.join(NOW_GAP, `blob_now_gap_${bi}.txt`)); bi++) {
          lines.push(...fs.readFileSync(path.join(NOW_GAP, `blob_now_gap_${bi}.txt`), 'utf-8').replace(/\r/g, '').replace(/\n$/, '').split('\n'));
        }
        if (lines.length !== gap.length) die(`${w.id}: ${lines.length} blob lines for ${gap.length} gap names`);
        else gap.forEach((n, i) => { const nat = lines[i].trim(); if (!nat || nat === '?') missing.push(n); else map[n] = nat; });
        console.log(`  ${w.id}: the production read resolved ${gap.length - missing.length} of the ${gap.length}`);
      } else if (gap.length > 3 && !process.argv.includes('--allow-now-gap')) {
        die(`${w.id}: ${gap.length} roster names have no answer; run the production read on ${GAP_OUT} and pass --now-gap, or --allow-now-gap to write with the gap open`);
      } else if (gap.length) {
        console.log(`  ${w.id}: GAP OPEN, written without ${gap.length} names until the production read lands`);
      }
    }
    if (missing.length) console.log(`  ${w.id}: ${missing.length} unresolved, omitted honestly: ${missing.join(', ')}`);
    if (missing.length > 3) die(`${w.id}: too many unresolved names, the window or the transcription is wrong`);
    offline[w.id] = map;
    for (const nat of Object.values(map)) kept.add(nat);
  }
  const noFlag = [...kept].filter(n => !FLAG_CODES[n]).sort();
  if (noFlag.length) die(`nationalities with no FLAG_CODES entry: ${noFlag.join(' | ')}`);
  if (offline.era2010?.['Aaron Ramsey'] !== 'Wales') die('the 2010 Aaron Ramsey must be Welsh');
  if (offline.era2015?.['Aaron Ramsey'] !== 'Wales') die('the 2015 Aaron Ramsey must be Welsh');
  if (offline.now?.['Lucas Silva'] !== 'Portugal') die('the modern Lucas Silva override did not apply');
  if (failed) process.exit(1);
  const total = writeOut(offline);
  console.log(`\nwrote ${OUT}: ${total} entries across ${WORLDS.length} worlds, ${kept.size} nationalities, all flagged.`);
  process.exit(0);
}

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

const total = writeOut(maps);
console.log(`\nwrote ${OUT}: ${total} entries across ${WORLDS.length} worlds, ${natSet.size} nationalities, all flagged.`);
