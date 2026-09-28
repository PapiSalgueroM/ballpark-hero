/**
 * Round 646: every leaderboard cap is its game's real ceiling, and a cap
 * change does not rewrite what past days were worth.
 *
 * WHY THIS EXISTS. The World Leaderboard scores a player's day in a game as
 * 100 * min(day best, cap) / cap, so the cap is what every score in that game
 * is worth. Most caps were written on 2026-08-30 as the highest score anyone
 * had recorded so far, a fact about who had played rather than about the
 * game. A cap under the real ceiling pays the full 100 for less than a perfect
 * run (Golf Higher or Lower at 155 of 325, Face Off at 470 of 1900); a cap
 * over it means a perfect run can never reach 100 (Budget Builder at 1120 of
 * 126, Sign the Player at 56,000,000 of 697); and the four front offices paid
 * the same first season title 7.9, 11.9, 2.8 and 4.9 points.
 *
 * WHAT IT HOLDS. Every engine that records a score exports the most it can
 * record, read off the code that records it (scripts/lib/scoreCeilingTable.mjs
 * names each export and says why that is not a copy). This harness bundles
 * every one of them and holds three things to them: the committed snapshot of
 * the table (scripts/data/gameScoreCaps.mjs), the migration that sets it, and,
 * when the database answers, the live table and its cap history.
 *
 *   1) Every key the source can send (scripts/lib/completionKeys.mjs, the scan
 *      simLeaderboardCaps reads) is classified exactly once: a ceiling, a
 *      season game (Round 647), a game that records no score, or a game with
 *      no ceiling and a written reason. Nothing classified is unsendable.
 *   2) Every exported ceiling resolves to a positive whole number. The six
 *      season games resolve through Round 647's seasonCeiling() once
 *      src/lib/seasonLedger.ts is on the tree, and until then are excused only
 *      while their boards still record the cumulative titles * 100 +
 *      seasonsPlayed * 5. Perfect Lineup's cap is the classic daily's, which
 *      is only right while Go Unbeaten is unranked (Round 645): once the hook
 *      passes a ranked flag it must rank the daily classic result and nothing
 *      else; until then the fence says the cap is waiting on 645.
 *   3) THE FENCE: every scored game's snapshot row equals its engine's
 *      ceiling; a game that records no score has a NULL cap and its source
 *      really does record no score; a game with no ceiling, and every retired
 *      key, is exactly the value read (this round did not touch it).
 *   4) The migration sets exactly those ceilings, each written against the
 *      value the snapshot read, for every scored game except the three Round
 *      644's migration owns (whose own values are checked against their
 *      ceilings in that file), nothing else; and its code (SQL comments
 *      stripped) keeps the guards it is only safe with: the Round 647 refusal,
 *      the not-run-before refusal, the backup, the cap history, the board
 *      reading the cap in force, and the check that past days are unchanged.
 *   5) A PERFECT RUN THROUGH THE SCORING CODE, against the cap. For every game
 *      scripts/lib/scoreCeilingTable.mjs gives a driver, the fence plays the
 *      function the recorder calls (not the ceiling export) over its input
 *      domain: a perfect run must pay exactly 100 against the snapshot cap,
 *      and no run may record past it. A `days` driver plays each day's perfect
 *      run on the real deal, which varies: none may record past the cap. Every
 *      other scored game is listed with the reason no run is played. Then what
 *      a perfect run paid before and pays after, for every cap that moves.
 *   6) The live table, read only, against the snapshot. Every row is the value
 *      read (the migration is not applied yet) or the value after (it is), and
 *      all the rows this round moves sit on the SAME side (the migration is one
 *      statement, so a mix means something else moved the table: a partial
 *      restore, an older caps migration re-run). Round 644's three rows are
 *      their own group. The cap history must match: absent before, and after,
 *      one row per moved game at the cap it replaced. Skipped loudly if the
 *      database cannot be read.
 *
 * NEGATIVE CONTROLS, CEILINGS_CONTROL=<name>. Each asserts its anchor exists
 * exactly once, and must turn exactly its own findings red and nothing else;
 * the harness compares the findings to the expected set and exits 0 only on an
 * exact match.
 *   classify   a source line recording an unclassified key is scanned with
 *              the real scan: 1:ceilings-control-unclassified.
 *   resolve    clueAuction.ts is bundled with its ceiling at START_BANK + 0.5:
 *              2:clue-auction.
 *   season     without Round 647 on the tree, FrontOfficeBoard.tsx is read
 *              recording titles * 90: 2:front-office. With it, seasonLedger.ts
 *              is bundled returning a non whole ceiling: 2:season.
 *   ranked     usePerfectLineup.ts is read ranking every finish (a ranked flag
 *              of true): 2:perfect-lineup.
 *   ceiling    clueAuction.ts is bundled with START_BANK at 101, so the
 *              engine's ceiling moves: 3:clue-auction and 4:clue-auction.
 *   snapshot   the snapshot's world-cup row is raised by one in memory:
 *              3:world-cup.
 *   migration  the migration's footle cap is raised by one in memory:
 *              4:footle.
 *   guard      the migration's refusal of old scale season rows is removed in
 *              memory: 4:guard-647-old-scale.
 *   perfect    useGame.ts is bundled with footleScore paying a second guess
 *              win 800, while footleCeiling (a first guess) stays 700:
 *              5:footle.
 *   live       one moved row of the live read is flipped to the other side in
 *              memory, a half applied table: 6 on that game. Needs the
 *              database, and refuses without it.
 *
 * Run: node scripts/simCapsAreCeilings.mjs   (section 6 needs the database
 * and is skipped, loudly, when it cannot be read; every control but live
 * skips it)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sourceCompletionKeys, declaredRetirements } from './lib/completionKeys.mjs';
import {
  CEILINGS, SEASON_LEDGER, SEASON_GAMES, UNSCORED, NO_CEILING, PERFECT_RUNS, UNPLAYED,
  seasonRuns, bundleCeilingModules, resolveCeiling,
} from './lib/scoreCeilingTable.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLS = ['classify', 'resolve', 'season', 'ranked', 'ceiling', 'snapshot', 'migration', 'guard', 'perfect', 'live'];
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
/* A guard that reads code must read the code, not the prose explaining it. */
const stripSql = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, '');
const stripTs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
const count = (hay, needle) => hay.split(needle).length - 1;
/* A control's anchor must be in the code exactly once, or the control could
   change nothing and still be read as proof. */
const needOnce = (text, anchor, where, strip) => {
  const n = count(strip(text), anchor);
  if (n !== 1) abort(`the ${CONTROL} control needs "${anchor}" exactly once in the code of ${where}, and it is there ${n} times`);
};

/* The arguments of the call whose name ends at `at` (the index of its "("). */
const callArgs = (text, at) => {
  let depth = 0; const args = []; let cur = '';
  for (let i = at; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') { depth += 1; if (depth === 1) continue; }
    if (ch === ')') { depth -= 1; if (depth === 0) { args.push(cur.trim()); return { args, end: i }; } }
    if (ch === ',' && depth === 1) { args.push(cur.trim()); cur = ''; continue; }
    if (depth >= 1) cur += ch;
  }
  return null;
};

/* ---------------- the snapshot, and the in memory controls ---------------- */
const snapMod = await import(pathToFileURL(path.join(ROOT, 'scripts', 'data', 'gameScoreCaps.mjs')).href);
const SNAP = new Map(snapMod.CAPS.map(([game, after, live, denom]) => [game, { after, live, denom }]));
if (SNAP.size !== snapMod.CAPS.length) abort('the snapshot names a game twice');
if (CONTROL === 'snapshot') {
  const row = SNAP.get('world-cup');
  if (!row || typeof row.after !== 'number' || snapMod.CAPS.filter(r => r[0] === 'world-cup').length !== 1) abort('the snapshot control needs exactly one numeric world-cup row, and there is not');
  SNAP.set('world-cup', { ...row, after: row.after + 1 });
  console.log('   NEGATIVE CONTROL ON: the snapshot world-cup row is raised by one in memory, section 3 must go red on world-cup alone');
}

let migrationSql = read(MIGRATION);
if (CONTROL === 'migration') {
  const anchor = /\('footle', (null|\d+), (\d+), /;
  needOnce(migrationSql, "('footle', ", MIGRATION, stripSql);
  const m = migrationSql.match(anchor);
  if (!m) abort('the migration control needs the footle row in the migration, and it is not there');
  migrationSql = migrationSql.replace(anchor, `('footle', ${m[1]}, ${Number(m[2]) + 1}, `);
  console.log('   NEGATIVE CONTROL ON: the migration footle cap is raised by one in memory, section 4 must go red on footle alone');
}
const GUARD_647 = /if v_old_scale > 0 then[\s\S]*?end if;/;
if (CONTROL === 'guard') {
  needOnce(migrationSql, 'if v_old_scale > 0 then', MIGRATION, stripSql);
  migrationSql = migrationSql.replace(GUARD_647, '');
  console.log('   NEGATIVE CONTROL ON: the migration no longer refuses old scale season rows, section 4 must go red on that guard alone');
}

/* Bundle time rewrites: one file, one anchor, found exactly once. */
const plugins = [];
const rewrite = (file, filter, from, to, note) => {
  needOnce(read(file), from, file, stripTs);
  plugins.push({
    name: `ceilings-control-${CONTROL}`,
    setup(b) {
      b.onLoad({ filter }, args => ({
        contents: fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n').split(from).join(to),
        loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts',
        resolveDir: path.dirname(args.path),
      }));
    },
  });
  console.log(`   NEGATIVE CONTROL ON: ${note}`);
};
if (CONTROL === 'ceiling') {
  rewrite('src/lib/clueAuction.ts', /[\\/]lib[\\/]clueAuction\.ts$/, 'export const START_BANK = 100;', 'export const START_BANK = 101;',
    'clueAuction.ts is bundled with START_BANK at 101, sections 3 and 4 must go red on clue-auction alone');
}
if (CONTROL === 'resolve') {
  rewrite('src/lib/clueAuction.ts', /[\\/]lib[\\/]clueAuction\.ts$/, 'export const CLUE_AUCTION_CEILING = START_BANK;', 'export const CLUE_AUCTION_CEILING = START_BANK + 0.5;',
    'clueAuction.ts is bundled with its ceiling at START_BANK + 0.5, section 2 must go red on clue-auction alone');
}
if (CONTROL === 'perfect') {
  rewrite('src/hooks/useGame.ts', /[\\/]hooks[\\/]useGame\.ts$/, '  return guessCountScore(won, guessCount, MAX_GUESSES);',
    '  return won && guessCount === 2 ? 800 : guessCountScore(won, guessCount, MAX_GUESSES);',
    'useGame.ts is bundled with a second guess Footle win paying 800, section 5 must go red on footle alone');
}
const seasonLedgerOnTree = fs.existsSync(path.join(ROOT, SEASON_LEDGER[0]));
if (CONTROL === 'season' && seasonLedgerOnTree) {
  rewrite(SEASON_LEDGER[0], /[\\/]lib[\\/]seasonLedger\.ts$/, 'return SEASON_CEILING;', 'return SEASON_CEILING + 0.5;',
    'seasonLedger.ts is bundled with seasonCeiling() not a whole number, section 2 must go red on the season ceiling alone');
}

/* ======================= 1) classification ======================= */
console.log('1) every key the source can send is classified once');
const extraSources = [];
if (CONTROL === 'classify') {
  extraSources.push("  useGameCompletion('ceilings-control-unclassified', done, 1);\n");
  console.log('   NEGATIVE CONTROL ON: a source line recording an unclassified key is scanned, section 1 must go red on it alone');
}
const keys = sourceCompletionKeys(ROOT, extraSources);
if (keys.size < 100) abort(`only ${keys.size} completion keys found in src, so the scan stopped reading the source`);
if (CONTROL === 'classify' && !keys.has('ceilings-control-unclassified')) abort('the classify control line was scanned and its key was not found, so the scan does not read it');
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
  if (r.error || !Number.isInteger(r.value) || r.value < 1) fail(2, 'season', `${SEASON_LEDGER.join(' ')} does not resolve to a positive whole number: ${r.error ?? r.value}`);
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
    let text = read(board);
    if (CONTROL === 'season' && game === 'front-office') {
      needOnce(text, 'titles * 100 + seasonsPlayed * 5', board, stripTs);
      text = text.replace('titles * 100 + seasonsPlayed * 5', 'titles * 90 + seasonsPlayed * 5');
      console.log('   NEGATIVE CONTROL ON: FrontOfficeBoard.tsx is read recording titles * 90, section 2 must go red on front-office alone');
    }
    const code = stripTs(text);
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
} else if (CONTROL === 'season' && !seasonLedgerOnTree) {
  abort('the season control found no season ledger to rewrite');
}

/* Perfect Lineup: the cap is the classic daily's, which assumes Round 645's
   ranked flag keeps Go Unbeaten and Unlimited off the board. */
{
  const file = 'src/hooks/usePerfectLineup.ts';
  let text = stripTs(read(file));
  const at = text.search(/useGameCompletion\(\s*'perfect-lineup'/);
  if (at < 0) fail(2, 'perfect-lineup', `${file} no longer records perfect-lineup through useGameCompletion, so nothing says which finishes are ranked`);
  else {
    const open = text.indexOf('(', at);
    let call = callArgs(text, open);
    if (CONTROL === 'ranked') {
      if (count(text, "useGameCompletion('perfect-lineup'") !== 1) abort(`the ranked control needs the perfect-lineup call exactly once in ${file}`);
      const args = [...call.args];
      while (args.length < 4) args.push('0');
      args[4] = 'true';
      text = `${text.slice(0, open)}(${args.join(', ')})${text.slice(call.end + 1)}`;
      call = callArgs(text, open);
      console.log('   NEGATIVE CONTROL ON: usePerfectLineup.ts is read ranking every finish, section 2 must go red on perfect-lineup alone');
    }
    const ranked = call.args[4];
    if (ranked === undefined) {
      console.log('   PENDING Round 645: usePerfectLineup records every finish as ranked on this tree, Go Unbeaten (up to 114) included; the cap is the classic daily\'s 100, which is right once 645 ranks only mode === \'daily\' && phase === \'result\'');
    } else if (!/mode\s*===\s*'daily'/.test(ranked) || !/phase\s*===\s*'result'/.test(ranked) || /unbeaten/i.test(ranked)) {
      fail(2, 'perfect-lineup', `the ranked flag is ${ranked}, which ranks more than the daily classic lineup, so the cap of the classic rating (${CEIL.get('perfect-lineup')}) is wrong`);
    } else {
      console.log(`   perfect-lineup ranks only ${ranked}, so its cap is the classic rating's ${CEIL.get('perfect-lineup')}`);
    }
  }
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
      const c = callArgs(text, m.index + 'recordCompletion'.length);
      if (!c || (c.args.length > 1 && c.args[1] !== 'undefined')) {
        fail(3, game, `is classified as recording no score, but ${path.relative(ROOT, f)} records it with ${c ? c.args[1] : 'an unreadable call'}`);
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

/* ======================= 4) the migration ======================= */
console.log('4) the migration sets every scored game to its ceiling, written against the value read, and keeps its guards');
{
  const code = stripSql(migrationSql);
  const values = new Map();
  const dupes = [];
  for (const m of code.matchAll(/\(\s*'([a-z0-9-]+)'\s*,\s*(null|\d+)\s*,\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*\)/g)) {
    if (values.has(m[1])) dupes.push(m[1]);
    values.set(m[1], { read: m[2] === 'null' ? null : Number(m[2]), after: Number(m[3]) });
  }
  for (const d of dupes) fail(4, d, 'appears twice in the migration');
  if (values.size < 50) abort(`only ${values.size} rows parsed out of ${MIGRATION}, so the parse is off`);
  const expected = [...Object.keys(CEILINGS).filter(g => !SET_BY_644.includes(g)), ...Object.keys(SEASON_GAMES)];
  for (const game of expected) {
    const v = values.get(game);
    if (!v) { fail(4, game, 'is a scored game the migration does not set'); continue; }
    const snapRow = SNAP.get(game);
    if (snapRow && v.read !== snapRow.live) fail(4, game, `the migration is written against a cap of ${v.read}, the snapshot read ${snapRow.live}`);
    const want = CEIL.get(game) ?? (seasonPending && SEASON_GAMES[game] ? snapRow?.after : undefined);
    if (want === undefined) continue;
    if (v.after !== want) fail(4, game, `the migration sets ${v.after}, the ${SEASON_GAMES[game] && seasonPending ? 'snapshot' : "engine's ceiling"} is ${want}`);
  }
  for (const game of values.keys()) {
    if (!expected.includes(game)) fail(4, game, SET_BY_644.includes(game) ? 'belongs to the Round 644 migration, whose part 1 refuses to run once its row has moved' : 'is set by the migration but is not a scored game this round owns');
  }
  /* The guards, each a shape in the code with the comments gone. */
  const guards = [
    ['guard-one-block', /^\s*do\s+\$r646\$[\s\S]*\$r646\$;\s*$/, 'everything that writes must be one DO block, one statement, so a refusal takes the whole change back'],
    ['guard-647-ledger', /count\(\*\)\s*filter\s*\(\s*where\s+gc\.score\s+between\s+1\s+and\s+100\s*\)[\s\S]*?gc\.game\s*=\s*any\(v_season\)[\s\S]*?if\s+v_ledger_scale\s*=\s*0\s+then\s+raise\s+exception/i, 'must refuse while no season game row is on Round 647\'s scale'],
    ['guard-647-old-scale', /if\s+v_old_scale\s*>\s*0\s+then\s+raise\s+exception/i, 'must refuse while an old client still records the cumulative scale'],
    ['guard-647-games', new RegExp(`v_season\\s+constant\\s+text\\[\\]\\s*:=\\s*array\\[${Object.keys(SEASON_GAMES).map(g => `\\s*'${g}'\\s*`).join(',')}\\]`), 'must read exactly the six season games'],
    ['guard-not-run-before', /if\s+to_regclass\('public\.game_score_cap_history'\)\s+is\s+not\s+null\s+then\s+raise\s+exception/i, 'must refuse to run twice'],
    ['guard-read-values', /where\s+c\.game\s+is\s+null\s+or\s+c\.max_score\s+is\s+distinct\s+from\s+r\.cap_read[\s\S]*?raise\s+exception/i, 'must refuse when a row no longer reads the value it was written against'],
    ['guard-backup', /create\s+table\s+private\.r646_caps_bak[\s\S]*?insert\s+into\s+private\.r646_caps_bak/i, 'must back the table up before it changes'],
    ['guard-upsert', /on\s+conflict\s*\(\s*game\s*\)\s*do\s+update/i, 'must update the rows that already exist'],
    ['guard-history', /insert\s+into\s+public\.game_score_cap_history[\s\S]*?v_switch[\s\S]*?from\s+r646_rows\s+r\s+join\s+r646_pre_denoms/i, 'must write each moved game\'s old denominator into the history, valid until the switch'],
    ['guard-past-unchanged', /r646_pre_denoms\s+o\s+on\s+o\.game\s*=\s*gc\.game[\s\S]*?where\s+o\.pts\s+is\s+distinct\s+from\s+n\.pts;\s*if\s+v_n\s*>\s*0\s+then\s+raise\s+exception/i, 'must prove every day played before the change is worth what it was'],
  ];
  for (const [name, re, why] of guards) if (!re.test(code)) fail(4, name, `the migration ${why}, and its code no longer does`);
  /* Every refusal comes before the first write. */
  const firstWrite = code.search(/create\s+table\s+private\.r646_caps_bak/i);
  for (const [name, re] of guards.filter(([n]) => /^guard-(647-ledger|647-old-scale|not-run-before|read-values)$/.test(n))) {
    const at = code.search(re);
    if (at >= 0 && firstWrite >= 0 && at > firstWrite) fail(4, 'guard-order', `${name} comes after the first write, so it can refuse only once something has already changed`);
  }
  /* The board reads the cap in force, each piece read on its own so one
     piece cannot borrow another's join. */
  const periodJoin = /join\s+public\.game_cap_periods\s+p\s+on\s+p\.game\s*=\s*gc\.game\s+and\s+gc\.created_at\s*>=\s*p\.valid_from\s+and\s+gc\.created_at\s*<\s*p\.valid_until/i;
  const pieces = [
    ['guard-board-leaderboard', 'global_leaderboard', /create\s+or\s+replace\s+function\s+public\.global_leaderboard[\s\S]*?\$function\$;/i],
    ['guard-board-rank', 'global_rank', /create\s+or\s+replace\s+function\s+public\.global_rank[\s\S]*?\$function\$;/i],
    ['guard-board-cache', 'player_ranks', /create\s+materialized\s+view\s+public\.player_ranks_next[\s\S]*?create\s+unique\s+index/i],
  ];
  for (const [name, what, re] of pieces) {
    const body = code.match(re)?.[0] ?? '';
    if (!body) fail(4, name, `the migration no longer redefines ${what}`);
    else if (!periodJoin.test(body)) fail(4, name, `${what} does not score each row against the cap in force when it was played (game_cap_periods on created_at)`);
    else if (/game_denominators/.test(body)) fail(4, name, `${what} still reads game_denominators, today's caps, beside the periods`);
  }
  /* The three rows the 644 migration owns, against their ceilings. */
  const own644 = new Map();
  for (const m of stripSql(read(MIGRATION_644)).matchAll(/\(\s*'([a-z0-9-]+)'\s*,\s*(\d+)\s*,\s*'((?:[^']|'')*)'\s*\)/g)) own644.set(m[1], Number(m[2]));
  for (const game of SET_BY_644) {
    if (!own644.has(game)) fail(4, game, `${MIGRATION_644} no longer sets it`);
    else if (CEIL.has(game) && own644.get(game) !== CEIL.get(game)) fail(4, game, `${MIGRATION_644} sets ${own644.get(game)}, the engine's ceiling is ${CEIL.get(game)}`);
  }
  console.log(`   ${values.size} rows set by the migration, ${expected.length} expected, each written against the value read; ${guards.length + pieces.length} guards read in its code, every refusal before the first write; the Round 644 migration sets ${SET_BY_644.join(', ')}`);
}

/* ======================= 5) a perfect run through the scoring code ======================= */
console.log('5) a perfect run through the scoring code the recorder calls, against the cap');
const pays = (score, cap) => (cap ? (100 * Math.min(score, cap)) / cap : NaN);
const PERFECT = new Map();
{
  for (const g of Object.keys(PERFECT_RUNS)) if (!CEILINGS[g]) fail(5, g, 'has a perfect run driver but is not a scored game with a ceiling');
  for (const g of Object.keys(UNPLAYED)) if (!CEILINGS[g]) fail(5, g, 'is listed as unplayed but is not a scored game with a ceiling');
  let measured = 0; let days = 0; const unplayed = [];
  for (const game of Object.keys(CEILINGS).sort()) {
    const driver = PERFECT_RUNS[game];
    const why = UNPLAYED[game];
    if (driver && why) { fail(5, game, 'has a perfect run driver and is also listed as unplayed'); continue; }
    if (!driver && !why) { fail(5, game, 'has neither a perfect run driver nor a written reason why none is played'); continue; }
    if (!driver) { unplayed.push(game); continue; }
    const cap = SNAP.get(game)?.after;
    if (typeof cap !== 'number') continue;
    let runs;
    try { runs = driver.runs(mods); } catch (e) { fail(5, game, `the perfect run driver threw: ${String(e.message || e).slice(0, 200)}`); continue; }
    if (!runs.length) { fail(5, game, 'the perfect run driver played nothing'); continue; }
    const over = runs.find(r => !(r.score <= cap));
    if (over) fail(5, game, `"${over.label}" records ${over.score} through the scoring code, past the cap of ${cap}, so an honest run is clipped`);
    if (driver.days) {
      days += 1;
      const sorted = runs.map(r => r.score).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      PERFECT.set(game, { score: median, note: `a median day's perfect run (${runs.length} days)` });
      console.log(`   ${game.padEnd(28)} ${runs.length} real days, every perfect run at most the cap ${cap}; a day's perfect run pays from ${pays(sorted[0], cap).toFixed(1)} to ${pays(sorted[sorted.length - 1], cap).toFixed(1)}, the median day ${pays(median, cap).toFixed(1)}`);
    } else {
      measured += 1;
      const perfect = runs.filter(r => r.perfect);
      if (!perfect.length) { fail(5, game, 'the driver flags no perfect run'); continue; }
      const short = perfect.find(r => r.score !== cap);
      if (short) {
        fail(5, game, short.score > cap
          ? `the perfect run "${short.label}" records ${short.score} through the scoring code, more than the cap of ${cap}, so the cap is not what a perfect run records`
          : `the perfect run "${short.label}" records ${short.score} through the scoring code, so it pays ${pays(short.score, cap).toFixed(1)} against the cap of ${cap}, not 100`);
      }
      PERFECT.set(game, { score: perfect[0].score, note: 'a perfect run' });
    }
  }
  /* The season games through Round 647's scoreSeason. */
  let seasonPlayed = null;
  if (seasonLedgerPresent) {
    try { seasonPlayed = seasonRuns(mods); } catch (e) { fail(5, 'season', `the season driver could not play scoreSeason (${String(e.message || e).slice(0, 200)}), so Round 647's scoring has moved and this driver must follow it`); }
  }
  if (seasonPlayed) {
    const runs = seasonPlayed;
    for (const game of Object.keys(SEASON_GAMES)) {
      const cap = SNAP.get(game)?.after;
      const over = runs.find(r => !(r.score <= cap));
      if (over) fail(5, game, `"${over.label}" records ${over.score} through scoreSeason, past the cap of ${cap}`);
      if (!runs.some(r => r.perfect)) fail(5, game, 'the season driver flags no perfect season');
      const short = runs.filter(r => r.perfect).find(r => r.score !== cap);
      if (short) fail(5, game, `a perfect season "${short.label}" records ${short.score} through scoreSeason, so it pays ${pays(short.score, cap).toFixed(1)}, not 100`);
      PERFECT.set(game, { score: runs.find(r => r.perfect)?.score, note: 'a perfect season' });
      measured += 1;
    }
  }
  console.log(`   ${measured} games play a perfect run through their scoring code to exactly the cap, with nothing past it; ${days} deal real days and none records past the cap${seasonLedgerPresent ? '' : '; the six season games wait on Round 647'}`);
  console.log(`   ${unplayed.length} scored games play no run, each for a reason in scripts/lib/scoreCeilingTable.mjs UNPLAYED (ladders read straight off an exported table, clamps and bounds over a pool the database deals, whole simulated careers)`);

  /* What a perfect run paid before and pays after, for every cap that moves.
     Measured where a run was played; the ceiling export otherwise, labelled. */
  const moved = [];
  for (const [game, row] of SNAP) {
    if (!(CEILINGS[game] || SEASON_GAMES[game]) || row.after === row.live || SET_BY_644.includes(game)) continue;
    const p = PERFECT.get(game);
    const score = p?.score ?? CEIL.get(game) ?? row.after;
    moved.push([game, row.live ?? row.denom, row.after, score, p ? p.note : (UNPLAYED[game] ? 'the ceiling (no run played)' : 'the ceiling')]);
  }
  moved.sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`   ${moved.length} caps move. What the run below paid before, and pays after:`);
  for (const [game, before, after, score, note] of moved) {
    console.log(`     ${game.padEnd(28)} cap ${String(before).padStart(9)} -> ${String(after).padStart(6)}   ${String(score).padStart(6)} pays ${pays(score, before).toFixed(1).padStart(5)} -> ${pays(score, after).toFixed(1).padStart(5)}   (${note})`);
  }
  /* The front offices, the case the round was opened for: one achievement
     recorded the same number in all four and was paid four amounts. */
  const perfectSeason = PERFECT.get('front-office')?.score ?? SNAP.get('front-office')?.after;
  const row = v => FRONT_OFFICES.map((g, i) => `${g.replace('-front-office', '').replace('front-office', 'nfl')} ${v[i].toFixed(1)}`).join(', ');
  const before = FRONT_OFFICES.map(g => pays(perfectSeason, SNAP.get(g).live));
  const after = FRONT_OFFICES.map(g => pays(perfectSeason, SNAP.get(g).after));
  console.log(`   the four front offices, a perfect season (${perfectSeason}${seasonLedgerPresent ? ', played through scoreSeason' : ', Round 647\'s record'}): before ${row(before)}; after ${row(after)}`);
}

/* ======================= 6) the live table and its history ======================= */
console.log('6) the live table and the cap history against the snapshot');
if (CONTROL && CONTROL !== 'live') {
  console.log('   skipped under a control, which is about the files');
} else {
  let live = null;
  let history = null;
  let historyNote = '';
  try {
    const client = read('src/integrations/supabase/client.ts');
    const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
    const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
    const head = { apikey: key, Authorization: `Bearer ${key}` };
    const r = await fetch(`${url}/rest/v1/game_score_caps?select=game,max_score&limit=2000`, { headers: head });
    if (r.ok) live = await r.json();
    else console.log(`   SKIPPED: the database answered ${r.status}`);
    if (live) {
      const h = await fetch(`${url}/rest/v1/game_score_cap_history?select=game,max_score,valid_until,note&limit=2000`, { headers: head });
      if (h.ok) history = await h.json();
      else if (h.status === 404) historyNote = 'absent';
      else historyNote = `unreadable (${h.status})`;
    }
  } catch (e) {
    console.log(`   SKIPPED: the database could not be read (${String(e.message || e).slice(0, 120)})`);
  }
  if (!live && CONTROL === 'live') abort('the live control needs the database, and it could not be read');
  if (live) {
    const liveMap = new Map(live.map(r => [r.game, r.max_score]));
    const moved646 = [...SNAP].filter(([g, r]) => r.after !== r.live && !SET_BY_644.includes(g)).map(([g]) => g).sort();
    const moved644 = [...SNAP].filter(([g, r]) => r.after !== r.live && SET_BY_644.includes(g)).map(([g]) => g).sort();
    if (CONTROL === 'live') {
      const g = moved646[0];
      const row = SNAP.get(g);
      if (!liveMap.has(g)) abort(`the live control needs ${g} in the live table`);
      const flipped = liveMap.get(g) === row.after ? row.live : row.after;
      liveMap.set(g, flipped);
      console.log(`   NEGATIVE CONTROL ON: the live ${g} row is flipped to ${flipped} in memory, section 6 must go red on ${g} alone`);
    }
    let same = 0;
    for (const [game, row] of SNAP) {
      if (!liveMap.has(game)) { fail(6, game, 'is in the snapshot but not in the live table'); continue; }
      if (row.after !== row.live) continue;
      if (liveMap.get(game) === row.after) same += 1;
      else fail(6, game, `the live cap is ${liveMap.get(game)}, but this round leaves it at ${row.after}, so the table moved without the snapshot`);
    }
    for (const game of liveMap.keys()) if (!SNAP.has(game)) fail(6, game, 'is in the live table but not in the snapshot');
    /* One side for a whole group: the migration is one statement. */
    const sideOf = games => {
      const read = []; const after = [];
      for (const g of games) {
        if (!liveMap.has(g)) continue;
        const v = liveMap.get(g); const row = SNAP.get(g);
        if (v === row.after) after.push(g);
        else if (v === row.live) read.push(g);
        else fail(6, g, `the live cap is ${v}, which is neither the value read (${row.live}) nor the value after (${row.after}), so the table moved without the snapshot`);
      }
      if (read.length && after.length) {
        const [minority, side] = read.length < after.length ? [read, 'the value read'] : [after, 'the value after'];
        for (const g of minority) fail(6, g, `sits at ${side} while ${Math.max(read.length, after.length)} other moved rows sit at the other: half a migration, so something else moved the table (a partial restore, an older caps migration re-run)`);
        return 'mixed';
      }
      return after.length ? 'applied' : 'waiting';
    };
    const state = sideOf(moved646);
    const state644 = sideOf(moved644);
    /* The history has to agree with the side the caps are on. */
    if (state === 'applied') {
      if (!history) fail(6, 'history', `the caps are at the values after, but public.game_score_cap_history is ${historyNote || 'unreadable'}, so every past day in the moved games is being scored against today's cap`);
      else {
        const byGame = new Map();
        for (const h of history) byGame.set(h.game, [...(byGame.get(h.game) ?? []), h]);
        for (const g of moved646) {
          const rows = byGame.get(g) ?? [];
          const readCap = SNAP.get(g).live;
          if (readCap !== null && rows.length !== 1) fail(6, g, `moved from ${readCap} and has ${rows.length} history rows, not one, so its past days are not held at the cap they were played under`);
          if (readCap !== null && rows.length === 1 && Number(rows[0].max_score) !== readCap) fail(6, g, `its history row holds ${rows[0].max_score}, not the ${readCap} its past days were played under`);
        }
        for (const g of byGame.keys()) if (!moved646.includes(g)) fail(6, g, 'has a history row, but this round did not move its cap');
        const switches = new Set(history.map(h => h.valid_until));
        if (switches.size > 1) fail(6, 'history', `the history rows end at ${switches.size} different moments, not the one switch`);
      }
    } else if (state === 'waiting' && history && history.length) {
      fail(6, 'history', `the caps are at the values read, yet public.game_score_cap_history holds ${history.length} rows, so past days are held at caps that never changed`);
    }
    console.log(`   ${live.length} live rows: ${same} unchanged by design; the ${moved646.length} rows this round moves are ${state === 'applied' ? 'all at the value after (applied)' : state === 'waiting' ? 'all at the value read (not applied yet)' : 'MIXED'}; Round 644's ${moved644.length} are ${state644}; the cap history is ${history ? `${history.length} rows` : historyNote || 'not read'}`);
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
  const firstMoved = [...SNAP].filter(([g, r]) => r.after !== r.live && !SET_BY_644.includes(g)).map(([g]) => g).sort()[0];
  const EXPECT = {
    classify: ['1:ceilings-control-unclassified'],
    resolve: ['2:clue-auction'],
    season: seasonLedgerPresent ? ['2:season'] : ['2:front-office'],
    ranked: ['2:perfect-lineup'],
    ceiling: ['3:clue-auction', '4:clue-auction'],
    snapshot: ['3:world-cup'],
    migration: ['4:footle'],
    guard: ['4:guard-647-old-scale'],
    perfect: ['5:footle'],
    live: [`6:${firstMoved}`],
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
  console.log(`simCapsAreCeilings: green. ${CEIL.size} scored games each hold the ceiling their engine exports, in the snapshot and in the migration, and every perfect run played pays exactly the cap${seasonPending ? ', with the six season games waiting on Round 647' : ''}.`);
  process.exitCode = 0;
}
