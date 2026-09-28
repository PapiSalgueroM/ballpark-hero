/**
 * Round 646: every leaderboard cap is its game's real ceiling.
 *
 * WHY THIS EXISTS. The World Leaderboard scores a player's day in a game as
 * 100 * min(day best, cap) / cap, so the cap is what every score in that game
 * is worth. Most caps were written on 2026-08-30 as the highest score anyone
 * had recorded so far, a fact about who had played rather than about the
 * game. A cap under the real ceiling pays the full 100 for less than a perfect
 * run (Golf Higher or Lower at 155 of 325, Face Off at 470 of 2360); a cap
 * over it means a perfect run can never reach 100 (Budget Builder at 1120 of
 * 126, Sign the Player at 56,000,000 of 697); and the four front offices paid
 * the same first season title 7.9, 11.9, 2.8 and 4.9 points.
 *
 * WHAT IT HOLDS. Every engine that records a score exports the most it can
 * record, computed from its rules (scripts/lib/scoreCeilingTable.mjs names
 * each export). This harness bundles every one of them and holds three things
 * to them: the committed snapshot of the table (scripts/data/gameScoreCaps.mjs),
 * the migration that sets it, and, when the database answers, the live table.
 *
 *   1) Every key the source can send (scripts/lib/completionKeys.mjs, the scan
 *      simLeaderboardCaps reads) is classified exactly once: a ceiling, a
 *      season game (Round 647), a game that records no score, or a game with
 *      no ceiling and a written reason. Nothing classified is unsendable.
 *   2) Every exported ceiling resolves to a positive whole number.
 *   3) THE FENCE: every scored game's snapshot row equals its engine's
 *      ceiling; a game that records no score has a NULL cap and its source
 *      really does record no score; a game with no ceiling, and every retired
 *      key, is exactly the value read (this round did not touch it).
 *   4) The migration sets exactly those ceilings: every scored game except
 *      the three Round 644's migration owns (whose own values are checked
 *      against their ceilings in that file), nothing else, and it carries the
 *      Round 647 ordering it depends on.
 *   5) What a perfect run pays, before and after, for every game the
 *      migration moves and for the four front offices; and the front offices
 *      must pay one number after, which they did not before.
 *   6) The live table, read only, against the snapshot: every row is either
 *      the value read (the migration is not applied yet) or the value after
 *      (it is). A row that is neither, or a row on one side only, means the
 *      table moved and the snapshot did not.
 *
 * NEGATIVE CONTROLS, CEILINGS_CONTROL=<name>. Each must turn exactly its own
 * findings red and nothing else; the harness compares the findings to the
 * expected set and exits 0 only on an exact match.
 *   ceiling    src/lib/clueAuction.ts is bundled with START_BANK at 101, so
 *              the engine's ceiling moves: clue-auction red in 3 and 4.
 *   snapshot   the snapshot's footle row is raised by one in memory: footle
 *              red in 3 only.
 *   migration  the migration's footle value is raised by one in memory:
 *              footle red in 4 only.
 * Each control refuses to run if the text it edits is not there.
 *
 * Run: node scripts/simCapsAreCeilings.mjs   (section 6 needs the database
 * and is skipped, loudly, when it cannot be read; controls skip it)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sourceCompletionKeys, declaredRetirements } from './lib/completionKeys.mjs';
import {
  CEILINGS, SEASON_LEDGER, SEASON_GAMES, UNSCORED, NO_CEILING,
  bundleCeilingModules, resolveCeiling,
} from './lib/scoreCeilingTable.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLS = ['ceiling', 'snapshot', 'migration'];
const CONTROL = process.env.CEILINGS_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`CEILINGS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

const MIGRATION = 'supabase/migrations/20260928_round_646_caps_at_real_ceilings.sql';
const MIGRATION_644 = 'supabase/migrations/20260919_round_644_scores_shown.sql';
const SET_BY_644 = ['soccer-career', 'player-bingo', 'rarity-round'];
const FRONT_OFFICES = ['front-office', 'mlb-front-office', 'nba-front-office', 'nhl-front-office'];

/* Findings carry their section and game so a control can be checked for
   firing on exactly its own and nowhere else. */
const findings = [];
const fail = (section, game, msg) => { findings.push({ section, game, msg }); console.error(`  FAIL [${section}] ${game}: ${msg}`); };
const abort = msg => { console.error(`simCapsAreCeilings: cannot run: ${msg}`); process.exit(1); };

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/* A guard that reads SQL must read the SQL, not the prose explaining it. */
const stripSql = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, '');
const tuplesOf = sql => {
  const out = new Map();
  const dupes = [];
  for (const m of stripSql(sql).matchAll(/\(\s*'([a-z0-9-]+)'\s*,\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*\)/g)) {
    if (out.has(m[1])) dupes.push(m[1]);
    out.set(m[1], Number(m[2]));
  }
  return { values: out, dupes };
};

/* ---------------- the snapshot, and the in memory controls ---------------- */
const snapMod = await import(pathToFileURL(path.join(ROOT, 'scripts', 'data', 'gameScoreCaps.mjs')).href);
const SNAP = new Map(snapMod.CAPS.map(([game, after, live, denom]) => [game, { after, live, denom }]));
if (SNAP.size !== snapMod.CAPS.length) abort('the snapshot names a game twice');
if (CONTROL === 'snapshot') {
  const row = SNAP.get('footle');
  if (!row || typeof row.after !== 'number') abort('the snapshot control needs a numeric footle row, and there is none');
  SNAP.set('footle', { ...row, after: row.after + 1 });
  console.log('   NEGATIVE CONTROL ON: the snapshot footle row is raised by one in memory, section 3 must go red on footle alone');
}

let migrationSql = read(MIGRATION);
if (CONTROL === 'migration') {
  const anchor = /\('footle', (\d+), /;
  const m = migrationSql.match(anchor);
  if (!m) abort('the migration control needs the footle row in the migration, and it is not there');
  migrationSql = migrationSql.replace(anchor, `('footle', ${Number(m[1]) + 1}, `);
  console.log('   NEGATIVE CONTROL ON: the migration footle value is raised by one in memory, section 4 must go red on footle alone');
}

const plugins = [];
if (CONTROL === 'ceiling') {
  const file = 'src/lib/clueAuction.ts';
  const from = 'export const START_BANK = 100;';
  const to = 'export const START_BANK = 101;';
  if (!read(file).includes(from)) abort(`the ceiling control needs "${from}" in ${file}, and it is not there`);
  plugins.push({
    name: 'ceiling-control',
    setup(b) {
      b.onLoad({ filter: /[\\/]lib[\\/]clueAuction\.ts$/ }, args => ({
        contents: fs.readFileSync(args.path, 'utf8').split(from).join(to),
        loader: 'ts',
        resolveDir: path.dirname(args.path),
      }));
    },
  });
  console.log('   NEGATIVE CONTROL ON: clueAuction.ts is bundled with START_BANK at 101, section 3 and 4 must go red on clue-auction alone');
}

/* ======================= 1) classification ======================= */
console.log('1) every key the source can send is classified once');
const keys = sourceCompletionKeys(ROOT);
if (keys.size < 100) abort(`only ${keys.size} completion keys found in src, so the scan stopped reading the source`);
const retired = declaredRetirements(ROOT);
if (!retired || retired.size < 5) abort('RETIRED_COMPLETION_SLUGS could not be read out of src/data/completionSlugs.ts');
const classes = [
  ['ceiling', Object.keys(CEILINGS)],
  ['season', Object.keys(SEASON_GAMES)],
  ['unscored', UNSCORED],
  ['no ceiling', Object.keys(NO_CEILING)],
];
const classOf = new Map();
for (const [name, list] of classes) {
  for (const g of list) {
    if (classOf.has(g)) fail(1, g, `classified twice, as ${classOf.get(g)} and as ${name}`);
    classOf.set(g, name);
  }
}
for (const k of keys) if (!classOf.has(k)) fail(1, k, 'the source can send it and scripts/lib/scoreCeilingTable.mjs does not classify it, so nobody has said what its cap should be');
for (const g of classOf.keys()) if (!keys.has(g)) fail(1, g, 'classified, but no code can send it (a retired game belongs in RETIRED_COMPLETION_SLUGS, not here)');
for (const [g, why] of Object.entries(NO_CEILING)) if (!why || why.length < 20) fail(1, g, 'has no ceiling and no written reason why');
console.log(`   ${keys.size} keys the source can send: ${classes.map(([n, l]) => `${l.length} ${n}`).join(', ')}; ${retired.size} declared retirements`);

/* ======================= 2) the ceilings resolve ======================= */
console.log('2) every exported ceiling resolves to a positive whole number');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'caps-ceilings-'));
let bundled;
try {
  bundled = await bundleCeilingModules(ROOT, tmp, plugins);
} catch (e) {
  abort(`the engines would not bundle: ${String(e.message || e).slice(0, 400)}`);
}
const { mods, seasonLedgerPresent } = bundled;
const CEIL = new Map();
for (const [game, entry] of Object.entries(CEILINGS)) {
  const r = resolveCeiling(mods, entry);
  if (r.error) { fail(2, game, r.error); continue; }
  if (!Number.isInteger(r.value) || r.value < 1) { fail(2, game, `${entry[0]} ${entry[1]} gives ${r.value}, not a positive whole number`); continue; }
  CEIL.set(game, r.value);
}
let seasonCeiling = null;
if (seasonLedgerPresent) {
  const r = resolveCeiling(mods, SEASON_LEDGER);
  if (r.error || !Number.isInteger(r.value) || r.value < 1) fail(2, 'season', `${SEASON_LEDGER.join(' ')} does not resolve: ${r.error ?? r.value}`);
  else {
    seasonCeiling = r.value;
    for (const g of Object.keys(SEASON_GAMES)) CEIL.set(g, seasonCeiling);
  }
}
console.log(`   ${CEIL.size} ceilings resolved${seasonLedgerPresent ? `, the six season games at seasonCeiling() = ${seasonCeiling}` : ''}`);

/* The season games on a tree without Round 647. They are only excused while
   their boards still record the cumulative number, which has no ceiling; a
   board that moved on without the module is a finding, not a wait. */
const seasonPending = !seasonLedgerPresent;
if (seasonPending) {
  for (const [game, board] of Object.entries(SEASON_GAMES)) {
    const code = read(board).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
    const call = code.match(new RegExp(`useGameCompletion\\(\\s*'${game}'[^;]*;`));
    /* The GM boards write titles * 100 + seasonsPlayed * 5; the dynasties read
       the same two numbers off their state, (st?.myTitles ?? 0) * 100 +
       (st?.seasonsPlayed ?? 0) * 5. Spaces and the optional reads are dropped
       before matching, so both shapes read as the one formula. */
    const flat = call ? call[0].replace(/\s+/g, '').replace(/\(?\w+\?\./g, '').replace(/\?\?0\)/g, '') : '';
    if (!call || !/[tT]itles\*100\+seasonsPlayed\*5/.test(flat)) {
      fail(2, game, `${SEASON_LEDGER[0]} is not on this tree, yet ${board} no longer records the cumulative titles * 100 + seasonsPlayed * 5, so nothing says what its ceiling is`);
    }
  }
  console.log(`   PENDING Round 647: ${SEASON_LEDGER[0]} is not on this tree, and the six season boards still record titles * 100 + seasonsPlayed * 5 on every title, which has no ceiling. Their rows are held to the migration (section 4) until 647 lands, then to seasonCeiling().`);
}

/* ======================= 3) the snapshot is the ceilings ======================= */
console.log('3) every row of the snapshot is its game\'s ceiling, or untouched');
let heldRows = 0;
for (const game of Object.keys(CEILINGS)) {
  const row = SNAP.get(game);
  const c = CEIL.get(game);
  if (!row) { fail(3, game, 'is a scored game with no row in the snapshot, so it would score nothing'); continue; }
  if (c === undefined) continue;
  if (row.after !== c) fail(3, game, `the snapshot cap is ${row.after}, the engine's ceiling is ${c}`);
  else heldRows += 1;
}
for (const game of Object.keys(SEASON_GAMES)) {
  const row = SNAP.get(game);
  if (!row) { fail(3, game, 'is a season game with no row in the snapshot'); continue; }
  if (seasonCeiling !== null) {
    if (row.after !== seasonCeiling) fail(3, game, `the snapshot cap is ${row.after}, seasonCeiling() is ${seasonCeiling}`);
    else heldRows += 1;
  }
}
/* A game that records no score: the cap stays NULL, and the claim itself is
   checked, by reading every call that records the key. */
const srcFiles = [];
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) srcFiles.push(p);
  }
};
walk(path.join(ROOT, 'src'));
const callArgs = (text, at) => {
  let depth = 0; let i = at; const args = []; let cur = '';
  for (; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') { depth += 1; if (depth === 1) continue; }
    if (ch === ')') { depth -= 1; if (depth === 0) { args.push(cur.trim()); return args; } }
    if (ch === ',' && depth === 1) { args.push(cur.trim()); cur = ''; continue; }
    if (depth >= 1) cur += ch;
  }
  return null;
};
for (const game of UNSCORED) {
  const row = SNAP.get(game);
  if (!row) { fail(3, game, 'records no score and has no row in the snapshot'); continue; }
  if (row.after !== null) fail(3, game, `records no score, yet the snapshot gives it a cap of ${row.after}`);
  let calls = 0;
  for (const f of srcFiles) {
    const text = fs.readFileSync(f, 'utf8');
    const re = new RegExp(`recordCompletion\\(\\s*['"]/${game}['"]`, 'g');
    for (const m of text.matchAll(re)) {
      calls += 1;
      const args = callArgs(text, m.index + 'recordCompletion'.length);
      if (!args || (args.length > 1 && args[1] !== 'undefined')) {
        fail(3, game, `is classified as recording no score, but ${path.relative(ROOT, f)} records it with ${args ? args[1] : 'an unreadable call'}`);
      }
    }
    if (new RegExp(`useGameCompletion\\(\\s*['"]${game}['"]`).test(text)) {
      fail(3, game, `is classified as recording no score, but ${path.relative(ROOT, f)} records it through useGameCompletion, which takes a score`);
    }
  }
  if (calls === 0) fail(3, game, 'is classified as recording no score, and no recordCompletion call for it was found to check');
}
for (const [game, row] of SNAP) {
  const cls = classOf.get(game);
  if (cls === 'ceiling' || cls === 'season' || cls === 'unscored') continue;
  if (!cls && !retired.has(game)) { fail(3, game, 'is in the snapshot but no code can send it and nobody declared it retired'); continue; }
  if (row.after !== row.live) fail(3, game, `${cls ? 'has no ceiling' : 'is retired'}, so this round must leave it as read (${row.live}), but the snapshot says ${row.after}`);
}
console.log(`   ${heldRows} scored rows equal their engine's ceiling; ${UNSCORED.length} unscored rows NULL; ${Object.keys(NO_CEILING).length} no ceiling rows and ${retired.size} retired rows as read`);

/* ======================= 4) the migration sets exactly the ceilings ======================= */
console.log('4) the migration sets every scored game to its ceiling and touches nothing else');
{
  const { values, dupes } = tuplesOf(migrationSql);
  for (const d of dupes) fail(4, d, 'appears twice in the migration');
  if (values.size < 50) abort(`only ${values.size} rows parsed out of ${MIGRATION}, so the parse is off`);
  const expected = [...Object.keys(CEILINGS).filter(g => !SET_BY_644.includes(g)), ...Object.keys(SEASON_GAMES)];
  for (const game of expected) {
    if (!values.has(game)) { fail(4, game, 'is a scored game the migration does not set'); continue; }
    const want = CEIL.get(game) ?? (seasonPending && SEASON_GAMES[game] ? SNAP.get(game)?.after : undefined);
    if (want === undefined) continue;
    if (values.get(game) !== want) fail(4, game, `the migration sets ${values.get(game)}, the ${SEASON_GAMES[game] && seasonPending ? 'snapshot' : "engine's ceiling"} is ${want}`);
  }
  for (const game of values.keys()) {
    if (!expected.includes(game)) fail(4, game, SET_BY_644.includes(game) ? 'belongs to the Round 644 migration, whose part 1 refuses to run once its row has moved' : 'is set by the migration but is not a scored game this round owns');
  }
  const code = stripSql(migrationSql);
  if (!/on\s+conflict\s*\(\s*game\s*\)\s*do\s+update/i.test(code)) fail(4, 'migration', 'does not update the rows that already exist, so every existing cap would stay as it was');
  if (!/private\.r646_caps_bak/.test(code)) fail(4, 'migration', 'writes no backup before it changes the caps');
  if (!/PUBLISH ROUND 647 FIRST/.test(migrationSql)) fail(4, 'migration', 'no longer says Round 647 must be published first, and applied before it every title pays the full 100');
  /* The three rows the 644 migration owns, against their ceilings. */
  const own644 = tuplesOf(read(MIGRATION_644)).values;
  for (const game of SET_BY_644) {
    if (!own644.has(game)) fail(4, game, `${MIGRATION_644} no longer sets it`);
    else if (CEIL.has(game) && own644.get(game) !== CEIL.get(game)) fail(4, game, `${MIGRATION_644} sets ${own644.get(game)}, the engine's ceiling is ${CEIL.get(game)}`);
  }
  console.log(`   ${values.size} rows set by the migration, ${expected.length} expected; the Round 644 migration sets ${SET_BY_644.join(', ')}`);
}

/* ======================= 5) what a perfect run pays ======================= */
console.log('5) what a perfect run pays, before and after');
{
  const pays = (score, cap) => (cap ? (100 * Math.min(score, cap)) / cap : NaN);
  const moved = [];
  for (const [game, c] of CEIL) {
    const row = SNAP.get(game);
    if (!row || row.after === row.live) continue;
    const before = row.live ?? row.denom;
    moved.push([game, before, row.after, c]);
  }
  moved.sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`   ${moved.length} caps move. A perfect run pays, and so does a run worth half the ceiling:`);
  for (const [game, before, after, c] of moved) {
    console.log(`     ${game.padEnd(28)} cap ${String(before).padStart(9)} -> ${String(after).padStart(7)}   perfect ${pays(c, before).toFixed(1).padStart(5)} -> ${pays(c, after).toFixed(1).padStart(5)}   half ${pays(c / 2, before).toFixed(1).padStart(5)} -> ${pays(c / 2, after).toFixed(1).padStart(5)}`);
  }
  /* The front offices, the case the round was opened for. The same
     achievement recorded the same number in all four and was paid four
     different amounts; after, it must be paid one. */
  const perfect = seasonCeiling ?? SNAP.get('front-office')?.after;
  const titleOne = 105; // the old boards' record for a title in the first season: 1 * 100 + 1 * 5
  const before = FRONT_OFFICES.map(g => pays(perfect, SNAP.get(g).live));
  const beforeTitle = FRONT_OFFICES.map(g => pays(titleOne, SNAP.get(g).live));
  const after = FRONT_OFFICES.map(g => pays(perfect, SNAP.get(g).after));
  const afterTitle = FRONT_OFFICES.map(g => pays(titleOne, SNAP.get(g).after));
  const row = v => FRONT_OFFICES.map((g, i) => `${g.replace('-front-office', '').replace('front-office', 'nfl')} ${v[i].toFixed(1)}`).join(', ');
  console.log(`   the four front offices, a perfect season (${perfect}, Round 647's record): before ${row(before)}; after ${row(after)}`);
  console.log(`   the four front offices, a first season title under the old record (${titleOne}): before ${row(beforeTitle)}; after ${row(afterTitle)}`);
  const spread = v => Math.max(...v) - Math.min(...v);
  if (spread(after) !== 0) fail(5, 'front-office', `the same perfect season still pays ${row(after)} across the four front offices`);
  /* The baseline is the snapshot's read column. Once somebody reads the table
     again after the migration, before and after are the same values and there
     is nothing left to compare, which is not a failure of the fence. */
  if (spread(before) > 1) console.log(`   before, one achievement paid four amounts ${spread(before).toFixed(1)} points apart; after, ${spread(after).toFixed(1)}`);
  else console.log('   the snapshot was read after the migration, so there is no before to set against the after');
}

/* ======================= 6) the live table ======================= */
console.log('6) the live table against the snapshot');
if (CONTROL) {
  console.log('   skipped under a control, which is about the files');
} else {
  let live = null;
  try {
    const client = read('src/integrations/supabase/client.ts');
    const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
    const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
    const r = await fetch(`${url}/rest/v1/game_score_caps?select=game,max_score&limit=2000`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (r.ok) live = await r.json();
    else console.log(`   SKIPPED: the database answered ${r.status}`);
  } catch (e) {
    console.log(`   SKIPPED: the database could not be read (${String(e.message || e).slice(0, 120)})`);
  }
  if (live) {
    const liveMap = new Map(live.map(r => [r.game, r.max_score]));
    let applied = 0; let waiting = 0; let same = 0;
    for (const [game, row] of SNAP) {
      if (!liveMap.has(game)) { fail(6, game, 'is in the snapshot but not in the live table'); continue; }
      const v = liveMap.get(game);
      if (row.after === row.live && v === row.after) same += 1;
      else if (v === row.after) applied += 1;
      else if (v === row.live) waiting += 1;
      else fail(6, game, `the live cap is ${v}, which is neither the value read (${row.live}) nor the value after (${row.after}), so the table moved without the snapshot`);
    }
    for (const game of liveMap.keys()) if (!SNAP.has(game)) fail(6, game, 'is in the live table but not in the snapshot');
    console.log(`   ${live.length} live rows: ${same} unchanged by design, ${applied} at the new cap, ${waiting} still at the value read (the migration ${waiting ? 'is not applied yet' : 'is applied'})`);
  }
}

fs.rmSync(tmp, { recursive: true, force: true });

/* ======================= verdict ======================= */
/* No process.exit from here on: section 6's fetch may still be closing its
   keep alive socket, and on Windows node aborts on a libuv assertion when it
   exits under one (simSoccerConquest hit the same). Set the code and let the
   loop drain. */
console.log('');
if (CONTROL) {
  const EXPECT = {
    ceiling: ['3:clue-auction', '4:clue-auction'],
    snapshot: ['3:footle'],
    migration: ['4:footle'],
  }[CONTROL];
  const got = [...new Set(findings.map(f => `${f.section}:${f.game}`))].sort();
  const want = [...EXPECT].sort();
  const exact = got.length === want.length && got.every((g, i) => g === want[i]);
  if (exact) {
    console.log(`simCapsAreCeilings control ${CONTROL}: green. It turned exactly ${want.join(' and ')} red and nothing else.`);
    process.exitCode = 0;
  } else {
    console.error(`simCapsAreCeilings control ${CONTROL}: RED. Expected exactly ${want.join(', ')}, got ${got.length ? got.join(', ') : 'nothing'}.`);
    process.exitCode = 1;
  }
} else if (findings.length) {
  console.error(`simCapsAreCeilings: ${findings.length} failure${findings.length === 1 ? '' : 's'}`);
  process.exitCode = 1;
} else {
  console.log(`simCapsAreCeilings: green. ${CEIL.size} scored games each hold the ceiling their engine exports, in the snapshot and in the migration${seasonPending ? ', with the six season games waiting on Round 647' : ''}.`);
  process.exitCode = 0;
}
