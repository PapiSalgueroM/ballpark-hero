/**
 * Round 1500 harness: what to do with dirty money, in all four US My Careers (src/lib/careerDirtyMoney.ts).
 *
 * Player report (/nba-my-career, 2026-10-16): "i got shady money and i want to wash it". The desk under the heat
 * meter offers four ways (come clean, give it away, keep it quiet, wash it) and prints every number before you
 * choose; the four "money has nowhere to live" cards wash on the same rule.
 *
 *   1. Words are the effect. A grid of dirty money (0.05 to 40M) by heat (0 to 100) by karma by cash by a pending
 *      ban, every way: the numbers its lines print (parsed back out of the words) are the change the desk applies.
 *   2. Keyed and stream free. Math.random throws on every call while the whole grid runs, and the same career asks
 *      twice gets the same answer.
 *   3. The rule exactly. Caught is the keyed draw below the printed whole percent, for every career of the grid;
 *      the caught share and the mean printed chance are printed side by side, never banded.
 *   4. The four cards. Fleet saves of every sport set to 5M dirty with the card unplayed are dealt their corruption
 *      deck; the "money has nowhere to live" card's launder option must print launderEffectText of that career, wash
 *      it exactly as the desk's Wash it does (dirty money to 0, +3.5M when not caught, a one season ban when caught,
 *      the card's own sentence kept on a clean wash) and still close the card. Both outcomes must be seen per sport.
 *   5. A/B against the base decks, rebuilt from the head by taking this round's three hunks per deck back out (no
 *      sha to go stale; with BASE=<40 hex> the rebuilt files are also compared with that commit's to the byte).
 *      400 careers a sport (US_DIRTY_MONEY_AB, and on until three took the card), each on its own seeded stream on both: every career that never took
 *      the launder option is byte equal after every season and every card; the takers are counted and none fails.
 *   6. Controls only: the board test (src/test/usCareerDirtyMoney.test.tsx) run against a copy of the shared board
 *      with the desk (nodesk), the honest sentence (sentence) or the season guard (anyphase) taken out; exactly the
 *      named cases must fail.
 *   7. Never a heat eraser, never a karma farm (the critic's correction 2, binding). Fleet saves of every sport
 *      (real careers through the bindings on the seeded stream, each also at heat 91, at heat 100, holding 20M
 *      more, broke at 1M and just back from a ban), every option of the four corruption decks that adds dirty money,
 *      and the two life cards that do (NFL's cousin at the register, NHL's brewery stake: an option that costs no
 *      heat may not raise what the desk hands back at all), then at once each way:
 *      the heat after is never below the heat before the option (exact), and the heat plus karma the desk hands
 *      back never adds up to more than the heat the option cost (its printed "heat +N"). Every dirty option in the
 *      four deck sources must be dealt at least once, or the fleet is too small. The table prints per option the
 *      worst net heat and the most handed back, and Give it away's karma per million beside the clean ways to give
 *      in the rivalry decks (printed, plus the one assertion that the desk never pays more karma a million than the
 *      cheapest clean gift).
 *   8. The help line holds: every binding's meter turns FLAGGED at 40 (the help's example says so) and every shop
 *      has three washers the desk can read.
 *   9. The printed bans are the engines': each sport's recorded dirty save over heat, a pending ban and dirty money, dealt
 *      each way and played six season ends through the binding's own progress; the seasons served and the new
 *      suspensions must be the numbers the way printed.
 *
 * Controls (US_DIRTY_MONEY_CONTROL), each a one anchor edit of an isolated copy of careerDirtyMoney.ts, asserted
 * present once first. A control that fires exits 1 with its last line "CONTROL <name> FIRED"; one that does not
 * exits 2.
 *   words       the wash banks 60 percent while its line prints 70           -> section 1
 *   mathrandom  the wash draws Math.random                                    -> section 2
 *   flat        Come clean cools a flat 35 (the draft's number)               -> section 7, memorabilia among the red
 *   farm        Give it away pays up to 12 karma                              -> section 7
 *   cap         Come clean cools up to 6 (one point more)                     -> section 7, red only for NFL's cousin at the register (heat 8)
 *   cool8       the desk's copy of the season end cools 8, the engines cool 9 -> section 9
 *   deck        launderEffectText draws one Math.random                       -> section 5
 *   noop        one sport's launder apply put back to the flag and heat +10   -> section 4, naming that sport only
 *               (US_DIRTY_MONEY_SPORT=nba|nfl|mlb|nhl, default nba; run once per sport)
 *   nodesk      the board's Deal with it button never drawn                   -> section 6, the 12 cases that need a desk (of 16)
 *   sentence    the board always keeps the old Shady aisle sentence           -> section 6, the 4 desk cases
 *   anyphase    the Deal with it button drawn in every phase                  -> section 6, the 4 phase cases only
 *
 * Nothing here reaches the network. Run: node scripts/simUsDirtyMoney.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE = 'src/lib/careerDirtyMoney.ts';
const PER_SPORT = Number(process.env.US_DIRTY_MONEY_CAREERS || 120);
const control = process.env.US_DIRTY_MONEY_CONTROL || '';
const SPORTS = ['nba', 'nfl', 'mlb', 'nhl'];
const DECK_FILE = { nba: 'src/lib/nbaCareerCorruption.ts', nfl: 'src/lib/nflCareerCorruption.ts', mlb: 'src/lib/mlbCareerCorruption.ts', nhl: 'src/lib/nhlCareerCorruption.ts' };

const CONTROLS = {
  words: ['  if (n.way === \'wash\' && !caught) c.netWorth = round2((c.netWorth ?? 0) + n.keep);', '  if (n.way === \'wash\' && !caught) c.netWorth = round2((c.netWorth ?? 0) + round1(n.amount * 0.6));', [1]],
  mathrandom: ['  return keyedRng(launderKey(c))() < caughtPct / 100;', '  return Math.random() < caughtPct / 100;', [2]],
  flat: ['  if (heat >= 100) return 0;\n  return Math.max(0, Math.min(CLEAN_HEAT_CAP, Math.floor(dirty), Math.floor(heat)));', '  return Math.max(0, Math.min(35, Math.floor(heat)));', [7]],
  farm: ['export const GIVE_KARMA_CAP = 6;', 'export const GIVE_KARMA_CAP = 12;', [7]],
  cap: ['export const CLEAN_HEAT_CAP = 5;', 'export const CLEAN_HEAT_CAP = 6;', [7]],
  cool8: ['const SEASON_COOL = 9;', 'const SEASON_COOL = 8;', [9]],
  deck: ['export function launderEffectText(c: DirtyMoneyHost): string {\n  const n = wayNumbers(c, \'wash\');', 'export function launderEffectText(c: DirtyMoneyHost): string {\n  Math.random();\n  const n = wayNumbers(c, \'wash\');', [5]],
};
/* Controls that edit another file: noop edits one deck (US_DIRTY_MONEY_SPORT, default nba) in the head bundle,
   nodesk and sentence edit the shared board for the vitest run of section 6. */
const OTHER_CONTROLS = { noop: [4], nodesk: [6], sentence: [6], anyphase: [6] };
assert.ok(!control || control in CONTROLS || control in OTHER_CONTROLS, `Known control (${[...Object.keys(CONTROLS), ...Object.keys(OTHER_CONTROLS)].join(', ')})`);
/* The three board controls only need section 6: the rest is skipped so a control run stays short. */
const boardOnly = control === 'nodesk' || control === 'sentence' || control === 'anyphase';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replaceAll('\r\n', '\n');
const source = read(MODULE);
for (const [anchor, replacement] of Object.values(CONTROLS)) {
  assert.equal(source.split(anchor).length - 1, 1, `Control anchor held once: ${anchor.slice(0, 60)}`);
  assert.notEqual(source.replace(anchor, () => replacement), source, 'Control changes the module');
}
const moduleText = control in CONTROLS ? source.replace(CONTROLS[control][0], () => CONTROLS[control][1]) : source;

let failures = 0;
const red = new Map();
const fail = (section, who, m) => {
  failures += 1;
  const set = red.get(section) ?? new Set();
  if (!set.has(who) && set.size < 6) console.error(`  FAIL [section ${section}] ${who}: ${m}`);
  set.add(who);
  red.set(section, set);
};

/* ---------- section 6: the board test with the desk or the honest sentence taken out (controls only) ----------
   src/test/usCareerDirtyMoney.test.tsx runs in the vitest suite on its own; here it is run once more against a copy
   of the shared board (NO_DOUBLE_SWAP, the simUsCareerActionConfirm way) and the named cases must fail, the rest
   pass. A default run does not spawn vitest. */
const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const BOARD_TEST = 'src/test/usCareerDirtyMoney.test.tsx';
const CASE = {
  desk: s => `${s}: every washer owned, the desk previews, holds a second tap, and Come clean saves exactly the rule`,
  sentence: s => `${s}: with one washer unowned the old sentence stands byte for byte, beside the desk`,
  none: s => `${s}: no dirty money, no desk; the recorded dirty save mounts without a write and offers it`,
  phase: s => `${s}: outside a playing season the desk is not offered, over a contract talk or free agency`,
};
/* The phase case passes under nodesk (no desk anywhere) and is the only one anyphase (advice 17's guard dropped,
   the Round 1500 review's run minor 1) turns red. */
const BOARD_CONTROLS = {
  nodesk: ["{phase === 'season' && canDealWithDirtyMoney(career) && (", '{false && (', SPORTS.flatMap(s => [CASE.desk(s), CASE.sentence(s), CASE.none(s)])],
  sentence: ['(washersLeft(sport.shopItems, career.purchased) > 0 ? (', '(true ? (', SPORTS.map(CASE.desk)],
  anyphase: ["{phase === 'season' && canDealWithDirtyMoney(career) && (", '{canDealWithDirtyMoney(career) && (', SPORTS.map(CASE.phase)],
};
const BOARD_CASES = 16;
const boardText = read(BOARD);
for (const [anchor, replacement] of Object.values(BOARD_CONTROLS)) {
  assert.equal(boardText.split(anchor).length - 1, 1, `Board control anchor held once: ${anchor}`);
  assert.equal(fs.readFileSync(path.join(ROOT, BOARD), 'utf8').split(anchor).length - 1, 1, 'and once in the bytes on disk, CRLF or LF');
  assert.notEqual(boardText.replace(anchor, () => replacement), boardText, 'Board control changes the board');
}
const testText = read(BOARD_TEST);
for (const make of Object.values(CASE)) assert.ok(testText.includes(`'%s: ${make('').slice(2)}'`), `the board test still names: ${make('%s')}`);
console.log(`6) the board test under the board controls: ${boardOnly ? control : 'run only as a control (nodesk, sentence, anyphase)'}`);
if (boardOnly) {
  const { spawnSync } = await import('node:child_process');
  let up = ROOT, vitestBin = '';
  for (let i = 0; i < 6 && !vitestBin; i++, up = path.dirname(up)) {
    const at = path.join(up, 'node_modules/vitest/vitest.mjs');
    if (fs.existsSync(at)) vitestBin = at;
  }
  assert.ok(vitestBin, 'vitest found');
  fs.mkdirSync(path.join(ROOT, '.sim-control'), { recursive: true });
  const folder = fs.mkdtempSync(path.join(ROOT, '.sim-control/us-dirty1500-'));
  const [anchor, replacement, expected] = BOARD_CONTROLS[control];
  const copy = path.join(folder, 'UsCareerBoard.tsx');
  fs.writeFileSync(copy, boardText.replace(anchor, () => replacement));
  const reportFile = path.join(folder, 'report.json');
  const env = { ...process.env, FORCE_COLOR: '0', NO_DOUBLE_SWAP: JSON.stringify({ '@/components/us-career/UsCareerBoard': copy }) };
  const run = spawnSync(process.execPath, ['--require', path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), vitestBin, 'run', BOARD_TEST, '--reporter=json', `--outputFile.json=${reportFile}`, '--testTimeout=300000'], { cwd: ROOT, env, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  fs.rmSync(folder, { recursive: true, force: true });
  const rows = report.testResults.flatMap(f => f.assertionResults);
  const failedTitles = rows.filter(r => r.status === 'failed').map(r => r.title).sort();
  const passed = rows.filter(r => r.status === 'passed').length;
  console.log(`   control ${control}: ${rows.length} cases, ${failedTitles.length} failed (${expected.length} named), ${passed} passed, vitest exit ${run.status}`);
  const exact = rows.length === BOARD_CASES && passed + failedTitles.length === BOARD_CASES && JSON.stringify(failedTitles) === JSON.stringify([...expected].sort());
  if (!exact) console.log(`   failed: ${failedTitles.join(' | ') || 'none'}`);
  console.log(exact ? `CONTROL ${control} FIRED (red sections 6)` : `CONTROL ${control} DID NOT FIRE (red sections none)`);
  process.exit(exact ? 1 : 2);
}

/* ---------- the base decks: this round's three hunks per deck taken back out (the simUsCoachPoaching way) ----------
   No commit is named, so this stays true until someone edits these hunks; each is asserted present exactly once.
   With BASE set to a 40 hex commit and git at hand, the rebuilt text is also compared with that commit's file. */
const IMPORT_LINE = "import { launderDirtyMoney, launderEffectText } from './careerDirtyMoney';\n";
const EFFECT_NOW = 'effect: launderEffectText(D(c)),';
const EFFECT_BASE = "effect: 'Launder it, heat +10 now',";
const APPLY_NOW = /return launderDirtyMoney\(D\(cc\), ('[^']*')\); \}/g;
const applyBack = text => {
  assert.equal((text.match(APPLY_NOW) ?? []).length, 1, 'One wash apply bound to the shared rule');
  return text.replace(APPLY_NOW, (_, said) => `heatUp(cc, 10); return ${said}; }`);
};
function baseDeck(text) {
  for (const anchor of [IMPORT_LINE, EFFECT_NOW]) assert.equal(text.split(anchor).length - 1, 1, `Round 1500 hunk held once: ${anchor.trim()}`);
  return applyBack(text.replace(IMPORT_LINE, '').replace(EFFECT_NOW, EFFECT_BASE));
}
const noopSport = process.env.US_DIRTY_MONEY_SPORT || 'nba';
if (control === 'noop') assert.ok(SPORTS.includes(noopSport), 'US_DIRTY_MONEY_SPORT names a sport');

/* ---------- two bundles: the head (the module, or its control copy) and the base decks ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'us-dirty1500-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });
const modulePath = path.join(ROOT, MODULE);
const headSwaps = new Map([[path.resolve(modulePath), moduleText]]);
if (control === 'noop') headSwaps.set(path.resolve(ROOT, DECK_FILE[noopSport]), applyBack(read(DECK_FILE[noopSport])));
const baseSwaps = new Map(SPORTS.map(slug => [path.resolve(ROOT, DECK_FILE[slug]), baseDeck(read(DECK_FILE[slug]))]));
const swapPlugin = swaps => ({
  name: 'dirty-money-copies',
  setup(b) {
    b.onLoad({ filter: /(careerDirtyMoney|CareerCorruption)\.ts$/ }, args => {
      const text = swaps.get(path.resolve(args.path));
      return text === undefined ? undefined : { contents: text, loader: 'ts', resolveDir: path.dirname(args.path) };
    });
  },
});
const lib = rel => `${ROOT.replaceAll('\\', '/')}/src/lib/${rel}`;
fs.writeFileSync(path.join(tmp, 'entry.mjs'), [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `export * as DM from '${lib('careerDirtyMoney.ts')}';`,
  /* The desk's words and its apply on a copy live beside it (they load with the desk's lazy chunk); they import the
     module above, so a control copy of it reaches them too. */
  `export * as DESK from '${lib('careerDirtyMoneyDesk.ts')}';`,
  `export { keyedRng } from '${lib('keyedRng.ts')}';`,
  `export { defaultAppearance } from '${lib('soccerCareerAppearance.ts')}';`,
  `export { NBA_CAREER_SPORT } from '${lib('nbaCareerSport.ts')}';`,
  `export { NFL_CAREER_SPORT } from '${lib('nflCareerSport.ts')}';`,
  `export { MLB_CAREER_SPORT } from '${lib('mlbCareerSport.ts')}';`,
  `export { NHL_CAREER_SPORT } from '${lib('nhlCareerSport.ts')}';`,
  `export { getNbaCorruptionEvents } from '${lib('nbaCareerCorruption.ts')}';`,
  `export { getNflCorruptionEvents } from '${lib('nflCareerCorruption.ts')}';`,
  `export { getMlbCorruptionEvents } from '${lib('mlbCareerCorruption.ts')}';`,
  `export { getNhlCorruptionEvents } from '${lib('nhlCareerCorruption.ts')}';`,
  `export { getNflLifeEventsB } from '${lib('nflCareerLifeB.ts')}';`,
  `export { getNhlLifeEventsB } from '${lib('nhlCareerLifeB.ts')}';`,
].join('\n'));
async function bundle(swaps, file) {
  const built = await build({
    entryPoints: [path.join(tmp, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node',
    outfile: path.join(tmp, file), logLevel: 'error', absWorkingDir: ROOT,
    alias: { '@': path.join(ROOT, 'src') }, metafile: true, plugins: [swapPlugin(swaps)],
  });
  assert.ok(!Object.keys(built.metafile.inputs).some(f => f.includes('supabase')), 'No database client in the bundle');
  return import(pathToFileURL(path.join(tmp, file)).href);
}
const E = await bundle(headSwaps, 'bundle.mjs');
const B = await bundle(baseSwaps, 'bundle-base.mjs');
const DM = { ...E.DM, ...E.DESK };
const bindOf = X => ({ nba: X.NBA_CAREER_SPORT, nfl: X.NFL_CAREER_SPORT, mlb: X.MLB_CAREER_SPORT, nhl: X.NHL_CAREER_SPORT });
const BIND = bindOf(E);
const DECK = { nba: E.getNbaCorruptionEvents, nfl: E.getNflCorruptionEvents, mlb: E.getMlbCorruptionEvents, nhl: E.getNhlCorruptionEvents };
const BASE = process.env.BASE || '';
if (/^[0-9a-f]{40}$/.test(BASE)) {
  const { execFileSync } = await import('node:child_process');
  for (const slug of SPORTS) {
    const then = execFileSync('git', ['show', `${BASE}:${DECK_FILE[slug]}`], { cwd: ROOT, encoding: 'utf8' }).replaceAll('\r\n', '\n');
    assert.equal(baseDeck(read(DECK_FILE[slug])), then, `the rebuilt base of ${DECK_FILE[slug]} is ${BASE}'s file`);
  }
  console.log(`   the four rebuilt base decks equal ${BASE.slice(0, 8)}'s files to the byte`);
} else {
  console.log('   base decks rebuilt from the head by taking this round\'s hunks out (no BASE given to compare them with a commit)');
}
const clone = x => JSON.parse(JSON.stringify(x));
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;

/* ---------- sections 1 to 3: the grid ---------- */
const GRID_DIRTY = [0.05, 0.1, 0.4, 0.9, 1, 1.1, 2.5, 6, 9.5, 20, 40];
const GRID_HEAT = [0, 0.55, 3, 9, 39.5, 40, 64, 81, 88.95, 89, 90, 98, 99, 100];
const host = o => ({ name: 'Grid', year: 2031, seasons: [1, 2, 3], netWorth: 12, dirtyMoney: 5, heat: 40, fanbase: 60, morale: 70, karma: 55, ...o });
const num = (text, re) => { const mm = text.match(re); return mm ? Number(mm[1]) : null; };
function printed(way, lines, heatNow) {
  const t = lines.join(' | ');
  if (way === 'clean') return { net: -(num(t, /plus a (\d+\.\d+)M fine/) ?? 0), heat: num(t, /Heat (-\d+)/) ?? 0, karma: num(t, /Karma \+(\d+)/) ?? 0 };
  if (way === 'give') return { net: 0, heat: 0, karma: num(t, /Karma \+(\d+)/) ?? 0 };
  if (way === 'wash') {
    /* A wash near the top prints "goes to the top of the meter" (the rest of it), never a fraction. */
    const heat = t.includes('Heat goes to the top of the meter now') ? r2(100 - heatNow) : num(t, /Heat \+(\d+) now/) ?? 0;
    const keep = t.includes('Not caught: too little of it') ? 0 : num(t, /Not caught: (\d+\.\d+)M/);
    return { heat, pct: num(t, /(\d+) percent chance/), keep, fan: num(t, /is seized, fanbase -(\d+)/), mor: num(t, /is seized, fanbase -\d+, morale -(\d+)/), seized: num(t, /Caught: all (\d+\.\d+)M/) };
  }
  return {};
}
console.log('1-3) the grid: words, keys and the rule');
let gridCases = 0, caught = 0, washes = 0, pctSum = 0, idx = 0;
const realRandom = Math.random;
let drewRandom = 0;
Math.random = () => { drewRandom += 1; throw new Error('Math.random during the desk'); };
try {
  for (const dirtyMoney of GRID_DIRTY) for (const heat of GRID_HEAT) for (const karma of [undefined, 0, 50, 98, 100]) for (const netWorth of [undefined, 0, 0.3, 0.35, 40]) for (const suspendedSeasons of [undefined, 0, 1]) {
    const c = host({ name: `Grid ${idx++}`, dirtyMoney, heat, karma, netWorth, suspendedSeasons, fanbase: heat > 50 ? 12 : 60 });
    const frozen = JSON.stringify(c);
    for (const way of DM.DIRTY_WAYS) {
      gridCases += 1;
      const who = `${way} at ${dirtyMoney}M heat ${heat}`;
      let p, r;
      try { p = DM.previewDirty(c, way); r = DM.dealWithDirtyMoney(c, way); } catch (e) { fail(2, way, `threw: ${e.message}`); continue; }
      if (JSON.stringify(c) !== frozen) fail(1, who, 'the desk changed its input');
      if (way === 'quiet') { if (r.state !== c || r.line !== '') fail(1, who, 'keep it quiet changed something'); continue; }
      const s = r.state, w = printed(way, p.lines, heat);
      const dNet = r2((s.netWorth ?? 0) - (netWorth ?? 0)), dHeat = r2((s.heat ?? 0) - heat), dKarma = (s.karma ?? 50) - (karma ?? 50);
      if (s.dirtyMoney !== 0) fail(1, who, `dirty money left: ${s.dirtyMoney}`);
      if ((s.netWorth ?? 0) < 0) fail(1, who, `below zero: ${s.netWorth}`);
      if (way === 'wash') {
        washes += 1; pctSum += w.pct ?? 0;
        const again = DM.dealWithDirtyMoney(c, way);
        if (again.caught !== r.caught) fail(2, who, 'the same career asked twice got two answers');
        const draw = E.keyedRng(DM.launderKey(c))();
        if (r.caught !== (draw < (w.pct ?? -1) / 100)) fail(3, who, `caught ${r.caught} but the draw ${draw.toFixed(4)} against ${w.pct} percent says otherwise`);
        if (r.caught) caught += 1;
        if (dHeat !== w.heat) fail(1, who, `heat ${dHeat} applied, ${w.heat} printed`);
        if (w.seized !== r2(dirtyMoney)) fail(1, who, `printed seized ${w.seized}`);
        if (r.caught) {
          if (dNet !== 0) fail(1, who, `a caught wash banked ${dNet}`);
          if (c.fanbase - s.fanbase !== w.fan || c.morale - s.morale !== w.mor) fail(1, who, `fanbase or morale off the print (${c.fanbase - s.fanbase}, ${c.morale - s.morale} against ${w.fan}, ${w.mor})`);
          if ((s.suspendedSeasons ?? 0) !== 1) fail(1, who, `suspension ${s.suspendedSeasons}`);
        } else {
          if (dNet !== w.keep) fail(1, who, `banked ${dNet}, printed ${w.keep}`);
          if (s.fanbase !== c.fanbase || s.morale !== c.morale || (s.suspendedSeasons ?? 0) !== (suspendedSeasons ?? 0)) fail(1, who, 'a clean wash touched the meters');
        }
      } else {
        if (dNet !== w.net) fail(1, who, `money ${dNet} applied, ${w.net} printed`);
        if (dHeat !== w.heat) fail(1, who, `heat ${dHeat} applied, ${w.heat} printed`);
        if (dKarma !== w.karma) fail(1, who, `karma ${dKarma} applied, ${w.karma} printed`);
      }
    }
  }
} finally {
  Math.random = realRandom;
}
if (drewRandom > 0) fail(2, 'Math.random', `the grid drew Math.random ${drewRandom} times`);
console.log(`   ${gridCases} cases, ${washes} washes: caught ${(100 * caught / Math.max(1, washes)).toFixed(1)} percent of them, mean printed chance ${(pctSum / Math.max(1, washes)).toFixed(1)} percent; Math.random draws ${drewRandom}`);

/* ---------- the fleet: real careers through the four bindings, on the seeded stream ---------- */
function playFleet(slug, n) {
  const sport = BIND[slug];
  const saves = [];
  for (let i = 0; i < n; i++) {
    const pos = sport.create.positions[i % sport.create.positions.length];
    const archs = sport.create.archetypes[pos];
    const eraId = sport.create.eras[i % sport.create.eras.length].id;
    const c = sport.startCareer(`Dirty ${slug} ${i}`, pos, archs[i % archs.length], Math.random, E.defaultAppearance(), eraId);
    let tq = sport.rollTeamQuality(null, Math.random);
    sport.assignRole(c, tq, Math.random);
    for (let guard = 0; guard < 30 && !c.retired; guard++) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push(sport.suspendedLine(c));
        sport.progress(c, Math.random);
      } else {
        sport.campBattle(c, tq, Math.random);
        sport.simSeason(c, tq, Math.random);
        sport.progress(c, Math.random);
      }
      saves.push(clone(c));
      const ev = sport.drawEvent(c, Math.random);
      if (ev) ev.options[Math.floor(Math.random() * ev.options.length)].apply(c, Math.random);
      tq = sport.rollTeamQuality(tq, Math.random);
      if (sport.shouldRetire(c)) c.retired = true;
    }
  }
  return saves;
}

/* ---------- section 7: never a heat eraser, never a karma farm ---------- */
console.log('7) every corruption card that pays dirty money, followed at once by the desk');
const printedHeat = effect => num(effect, /heat \+(\d+)/i);
const WAYS = ['clean', 'give', 'wash'];
const table = new Map();
let optionRuns = 0;
const fleetSize = {};
const fleets = {};
for (const slug of SPORTS) {
  const saves = playFleet(slug, PER_SPORT);
  fleets[slug] = saves;
  fleetSize[slug] = saves.length;
  for (const [vi, save] of saves.entries()) {
    /* The sixth variant has served a ban (its last season marked SUSPENDED, nothing pending): the only state the
       four "Reinstated" cards are dealt in. On the runner's stream the NFL fleet of 120 never reached one on its
       own (8 of 9 dirty options dealt, r1500-s1), so the variant deals it every time instead of by luck. */
    const banned = clone(save);
    if (banned.seasons.length) banned.seasons[banned.seasons.length - 1] = { ...banned.seasons[banned.seasons.length - 1], teamResult: 'SUSPENDED' };
    banned.suspendedSeasons = 0;
    const variants = [save, { ...clone(save), heat: 91 }, { ...clone(save), heat: 100 }, { ...clone(save), dirtyMoney: r1((save.dirtyMoney ?? 0) + 20) }, { ...clone(save), netWorth: 1 }, banned];
    for (const [k, base] of variants.entries()) {
      const deck = DECK[slug](clone(base), E.keyedRng(`deck|${slug}|${vi}|${k}`));
      for (const card of deck) for (const opt of card.options) {
        /* A cheap first look: an option whose code never names dirty money cannot add any. The applied change
           below is what decides. */
        if (!/dirty/i.test(String(opt.apply))) continue;
        const before = clone(base);
        const c = clone(base);
        opt.apply(c, E.keyedRng(`opt|${slug}|${vi}|${k}|${card.id}`));
        if ((c.dirtyMoney ?? 0) <= (before.dirtyMoney ?? 0)) continue;
        const key = `${slug} ${card.id} / ${opt.label}`;
        let cost = printedHeat(opt.effect);
        if (cost == null) {
          const z = { ...clone(base), heat: 0 };
          opt.apply(z, E.keyedRng(`zero|${slug}|${vi}`));
          cost = z.heat ?? 0;
        }
        const row = table.get(key) ?? { slug, card: card.id, label: opt.label, dirty: r1((c.dirtyMoney ?? 0) - (before.dirtyMoney ?? 0)), cost, saves: 0, worstNet: {}, mostBack: {} };
        row.saves += 1;
        for (const way of WAYS) {
          optionRuns += 1;
          const r = DM.dealWithDirtyMoney(c, way);
          const net = r2((r.state.heat ?? 0) - (before.heat ?? 0));
          const back = r2(Math.max(0, (c.heat ?? 0) - (r.state.heat ?? 0)) + Math.max(0, (r.state.karma ?? 50) - (c.karma ?? 50)));
          row.worstNet[way] = Math.min(row.worstNet[way] ?? Infinity, net);
          row.mostBack[way] = Math.max(row.mostBack[way] ?? -Infinity, back);
          if (net < 0) fail(7, key, `${way} leaves heat ${net} below where it was before the card (heat ${before.heat ?? 0}, ${before.dirtyMoney ?? 0}M held)`);
          if (back > cost) fail(7, key, `${way} hands back ${back} of heat and karma for a card that cost heat +${cost}`);
        }
        table.set(key, row);
      }
    }
  }
}
/* The life cards that pay dirty money too (the Round 1500 review's run minor 7 and read minor 4): NFL's cousin at
   the register (0.6M for heat +8) and NHL's brewery stake (0.05M for no heat). The same exact check on the same fleet
   and variants, with one difference for an option that costs no heat: it may not raise what the desk hands back at
   all (the desk on the career after it against the desk on the career just before it). A hand back is paid by
   whole millions and any money held before came with its own heat, so this is the honest bound there; an option
   that costs heat is held to the absolute bound like every corruption card, which leaves the cousin no spare point
   (the desk's most, 5 heat and 3 karma, is his 8). */
const LIFE_DECK = { nfl: ['getNflLifeEventsB', 'src/lib/nflCareerLifeB.ts'], nhl: ['getNhlLifeEventsB', 'src/lib/nhlCareerLifeB.ts'] };
const handBack = (from, to) => r2(Math.max(0, (from.heat ?? 0) - (to.heat ?? 0)) + Math.max(0, (to.karma ?? 50) - (from.karma ?? 50)));
for (const [slug, [fn, file]] of Object.entries(LIFE_DECK)) {
  for (const [vi, save] of fleets[slug].entries()) {
    const variants = [save, { ...clone(save), heat: 91 }, { ...clone(save), heat: 100 }, { ...clone(save), dirtyMoney: r1((save.dirtyMoney ?? 0) + 20) }, { ...clone(save), netWorth: 1 }];
    for (const [k, base] of variants.entries()) {
      for (const card of E[fn](clone(base), E.keyedRng(`life|${slug}|${vi}|${k}`))) for (const opt of card.options) {
        if (!/dirty/i.test(String(opt.apply))) continue;
        const before = clone(base);
        const c = clone(base);
        opt.apply(c, E.keyedRng(`lifeopt|${slug}|${vi}|${k}|${card.id}`));
        if ((c.dirtyMoney ?? 0) <= (before.dirtyMoney ?? 0)) continue;
        const key = `${slug} ${card.id} / ${opt.label}`;
        let cost = printedHeat(opt.effect);
        if (cost == null) {
          const z = { ...clone(base), heat: 0 };
          opt.apply(z, E.keyedRng(`lifezero|${slug}|${vi}`));
          cost = z.heat ?? 0;
        }
        const row = table.get(key) ?? { slug, card: card.id, label: opt.label, dirty: r2((c.dirtyMoney ?? 0) - (before.dirtyMoney ?? 0)), cost, saves: 0, worstNet: {}, mostBack: {}, life: true };
        row.saves += 1;
        for (const way of WAYS) {
          optionRuns += 1;
          const r = DM.dealWithDirtyMoney(c, way);
          const net = r2((r.state.heat ?? 0) - (before.heat ?? 0));
          const back = handBack(c, r.state);
          const bound = cost > 0 ? cost : DM.canDealWithDirtyMoney(before) ? handBack(before, DM.dealWithDirtyMoney(before, way).state) : 0;
          row.worstNet[way] = Math.min(row.worstNet[way] ?? Infinity, net);
          row.mostBack[way] = Math.max(row.mostBack[way] ?? -Infinity, back);
          if (net < 0) fail(7, key, `${way} leaves heat ${net} below where it was before the card (heat ${before.heat ?? 0}, ${before.dirtyMoney ?? 0}M held)`);
          if (back > bound) fail(7, key, `${way} hands back ${back} of heat and karma for a life card that cost heat +${cost} (bound ${bound})`);
        }
        table.set(key, row);
      }
    }
  }
  const inSource = (read(file).match(/addDirty\(cc, /g) ?? []).length;
  const dealt = [...table.values()].filter(r => r.slug === slug && r.life).length;
  console.log(`   ${slug} life cards: ${dealt} of ${inSource} dirty options dealt (${file})`);
  if (!inSource || dealt < inSource) fail(7, `${slug} life coverage`, `${dealt} of the ${inSource} dirty options in ${file} were dealt`);
}
/* No other source pays dirty money: every US sport file that adds to it (an assignment of the held amount plus
   something) is one of the four corruption decks or the two life decks above, so a new one cannot slip past this
   section. The shop's washers subtract and the engines set it to 0, which this does not match. */
const ADDS = /dirtyMoney\s*=\s*[^;]*\?\?\s*0\)\s*\+/;
const adders = fs.readdirSync(path.join(ROOT, 'src/lib')).filter(f => /^(nba|nfl|mlb|nhl|usCareer)\w*\.ts$/.test(f) && !f.endsWith('.test.ts'))
  .filter(f => ADDS.test(read(`src/lib/${f}`))).map(f => `src/lib/${f}`).sort();
const known = [...Object.values(DECK_FILE), ...Object.values(LIFE_DECK).map(([, f]) => f)].sort();
console.log(`   files that add dirty money: ${adders.length} (${adders.map(f => path.basename(f, '.ts')).join(', ')})`);
if (JSON.stringify(adders) !== JSON.stringify(known)) fail(7, 'sources', `the files that add dirty money are ${adders.join(', ')}, and this section deals ${known.join(', ')}`);

/* Every dirty option in the four sources must have been dealt: the count of dirty(cc, ...) calls per deck file. */
for (const slug of SPORTS) {
  const inSource = (read(DECK_FILE[slug]).match(/dirty\(cc, /g) ?? []).length;
  const dealt = [...table.values()].filter(r => r.slug === slug && !r.life).length;
  console.log(`   ${slug}: ${fleetSize[slug]} fleet saves, ${dealt} of ${inSource} dirty options dealt`);
  if (dealt < inSource) fail(7, `${slug} coverage`, `only ${dealt} of the ${inSource} dirty options in ${DECK_FILE[slug]} were dealt: widen the fleet (US_DIRTY_MONEY_CAREERS)`);
}
console.log(`   ${optionRuns} card then desk runs. Per option: dirty paid, heat it cost, saves, then per way the worst net heat and the most handed back:`);
for (const row of [...table.values()].sort((a, b) => a.slug.localeCompare(b.slug) || a.cost - b.cost)) {
  const ways = WAYS.map(w => `${w} ${row.worstNet[w]}/${row.mostBack[w]}`).join(', ');
  console.log(`     ${row.slug} ${row.card} "${row.label}": ${row.dirty}M, heat +${row.cost}, ${row.saves} saves; ${ways}`);
}
/* Give it away's karma a million beside the clean ways to give in the four rivalry decks (cash out, karma in). */
const cleanGifts = [];
for (const slug of SPORTS) {
  const text = read(`src/lib/${slug}CareerRivalryEvents.ts`);
  for (const mm of text.matchAll(/effect: \{ cash: -(\d+(?:\.\d+)?)([^}]*)\}/g)) {
    const karma = num(mm[2], /karma: (\d+)/);
    if (karma) cleanGifts.push({ slug, cash: Number(mm[1]), karma, perM: karma / Number(mm[1]) });
  }
}
const cheapest = Math.min(...cleanGifts.map(g => g.perM));
console.log(`   clean gifts in the rivalry decks: ${cleanGifts.map(g => `${g.slug} ${g.cash}M for karma +${g.karma} (${g.perM.toFixed(1)} a million)`).join('; ')}`);
for (const d of [1, 2.5, 6, 10, 20]) {
  const give = DM.previewDirty(host({ dirtyMoney: d, karma: 0 }), 'give').karma;
  const clean = DM.previewDirty(host({ dirtyMoney: d, karma: 0 }), 'clean').karma;
  console.log(`   desk at ${d}M: give it away karma +${give} (${(give / d).toFixed(2)} a million), come clean karma +${clean}`);
  if (give / d > cheapest) fail(7, `give at ${d}M`, `pays ${(give / d).toFixed(2)} karma a million, more than the cheapest clean gift (${cheapest.toFixed(2)})`);
}
if (!cleanGifts.length) fail(7, 'clean gifts', 'no clean gift found in the rivalry decks: the reader is broken');

/* ---------- section 4: the four wash cards wash on the shared rule ---------- */
console.log('4) the four "nowhere to live" cards: the launder option is the desk\'s wash, and its words are the effect');
const WASH_ID = { nba: 'ncorr_wash', nfl: 'corr_wash', mlb: 'mcorr_wash', nhl: 'hcorr_wash' };
const flagsOf = c => c.lifeFlags ?? {};
const withoutFlags = c => { const { lifeFlags, ...rest } = c; void lifeFlags; return JSON.stringify(rest); };
for (const slug of SPORTS) {
  let dealt = 0, caughtN = 0, freeN = 0;
  for (const [i, save] of fleets[slug].entries()) {
    if (i % 4 || save.retired) continue;
    const c = { ...clone(save), dirtyMoney: 5, suspendedSeasons: 0, lifeFlags: { ...flagsOf(save), wash: 0 } };
    const card = DECK[slug](clone(c), E.keyedRng(`wash|${slug}|${i}`)).find(e => e.id === WASH_ID[slug]);
    if (!card) continue;
    dealt += 1;
    const opt = card.options[0], who = `${slug} ${WASH_ID[slug]}`;
    if (opt.effect !== DM.launderEffectText(c)) fail(4, who, `the effect reads "${opt.effect}", the rule says "${DM.launderEffectText(c)}"`);
    const x = clone(c);
    const line = opt.apply(x, E.keyedRng(`apply|${slug}|${i}`));
    const twin = DM.dealWithDirtyMoney(clone(c), 'wash');
    if (twin.caught) caughtN += 1; else freeN += 1;
    const banked = r2((x.netWorth ?? 0) - (c.netWorth ?? 0));
    if ((x.dirtyMoney ?? 0) !== 0) fail(4, who, `the launder option left ${x.dirtyMoney}M dirty`);
    if (flagsOf(x).wash !== 1) fail(4, who, 'the card no longer closes itself (the wash flag)');
    if (withoutFlags(x) !== withoutFlags(twin.state)) fail(4, who, 'the card and the desk wash to different careers');
    if (twin.caught) {
      if (!line.startsWith('Caught.') || (x.suspendedSeasons ?? 0) !== 1 || banked !== 0) fail(4, who, `a caught wash: banked ${banked}, ban ${x.suspendedSeasons}, line "${line.slice(0, 40)}"`);
    } else if (banked !== 3.5 || !line.endsWith(' 3.5M came out clean.') || line.startsWith('Caught')) {
      fail(4, who, `a clean wash banked ${banked} with the line "${line.slice(-48)}"`);
    }
  }
  console.log(`   ${slug}: the card dealt to ${dealt} fleet saves set to 5M, ${freeN} washed clean (+3.5M), ${caughtN} caught`);
  if (!dealt || !freeN || !caughtN) fail(4, `${slug} coverage`, 'the fleet never saw the card both ways: widen it');
}

/* ---------- section 5: a career that never takes the launder option is the base decks' career, to the byte ----------
   Each career runs twice on its own seeded stream (the same seed both times): once on the head bundle and once on
   the base decks, the deck's option picked from the stream as the fleet above does. Nothing this round adds may draw
   from Math.random, so every career that never took the launder option must be byte equal after every season and
   every card. The careers that took it are counted, and a fleet where none did has not tested the change. */
console.log('5) A/B: careers that never take the launder option, head decks against the base decks, after every step');
const AB = Number(process.env.US_DIRTY_MONEY_AB || 400);
/* A fleet that saw one taker is green by luck (the NFL's 400 careers held one, r1500-s5a, the Round 1500 review's read
   minor 2), so each sport runs on past AB until at least AB_TAKERS careers took the launder option, up to ten times AB.
   Every career is still its own fixed stream, so the run is the same every time. */
const AB_TAKERS = 3;
const BBIND = bindOf(B);
const fnv = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const mulberry = seed => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function abCareer(X, sport, slug, i) {
  Math.random = mulberry(fnv(`ab|${slug}|${i}`));
  const pos = sport.create.positions[i % sport.create.positions.length];
  const archs = sport.create.archetypes[pos];
  const c = sport.startCareer(`AB ${slug} ${i}`, pos, archs[i % archs.length], Math.random, X.defaultAppearance(), sport.create.eras[i % sport.create.eras.length].id);
  let tq = sport.rollTeamQuality(null, Math.random);
  sport.assignRole(c, tq, Math.random);
  const states = [JSON.stringify(c)];
  let took = false, dealtWash = false;
  for (let guard = 0; guard < 30 && !c.retired; guard++) {
    if ((c.suspendedSeasons ?? 0) > 0) {
      c.suspendedSeasons -= 1;
      c.seasons.push(sport.suspendedLine(c));
      sport.progress(c, Math.random);
    } else {
      sport.campBattle(c, tq, Math.random);
      sport.simSeason(c, tq, Math.random);
      sport.progress(c, Math.random);
    }
    states.push(JSON.stringify(c));
    const ev = sport.drawEvent(c, Math.random);
    if (ev) {
      const k = Math.floor(Math.random() * ev.options.length);
      if (ev.id === WASH_ID[slug]) { dealtWash = true; if (k === 0) took = true; }
      ev.options[k].apply(c, Math.random);
    }
    states.push(JSON.stringify(c));
    tq = sport.rollTeamQuality(tq, Math.random);
    if (sport.shouldRetire(c)) c.retired = true;
  }
  return { states, took, dealtWash };
}
const streamRandom = Math.random;
const abCount = {};
try {
  for (const slug of SPORTS) {
    let same = 0, took = 0, passedOn = 0;
    let i = 0;
    for (; i < AB * 10 && (i < AB || took < AB_TAKERS); i++) {
      const head = abCareer(E, BIND[slug], slug, i);
      const base = abCareer(B, BBIND[slug], slug, i);
      if (head.took) { took += 1; continue; }
      if (head.dealtWash) passedOn += 1;
      const at = head.states.findIndex((s, k) => s !== base.states[k]);
      if (at >= 0 || head.states.length !== base.states.length) fail(5, `${slug} career ${i}`, `differs from the base decks at step ${at} though it never took the launder option`);
      else same += 1;
    }
    abCount[slug] = { same, took, passedOn };
    console.log(`   ${slug}: ${i} careers, ${same} byte equal to the base after every step, ${took} took the launder option (not compared), ${passedOn} were dealt the card and passed on it`);
    if (took < AB_TAKERS) fail(5, `${slug} takers`, `${took} of ${i} careers took the launder option, under ${AB_TAKERS}: widen it (US_DIRTY_MONEY_AB)`);
  }
} finally {
  Math.random = streamRandom;
}

/* ---------- section 9: the printed bans are what the four engines serve ----------
   The desk copies the engines' season end (cool 9 with nothing held, a suspension at 90 once nothing is pending) to
   print "you sit out N seasons" (correction 3). Nothing else ties that copy to the engines (the Round 1500 review's
   read minor 3), so here each sport's recorded dirty save, over a grid of heat, a pending ban and dirty money, is
   dealt each way and then played six season ends the board's way (a banned year takes one off first, then
   sport.progress runs the meter): the seasons served, and how many suspensions started at a season end, must be
   the numbers the way printed (Keep it quiet: whether the first season end suspends). The method is the run
   reviewer's probe (2,304 of 2,304 matched, and 80 went red with the cooling off by one). */
console.log('9) the printed bans against the four engines\' season end');
const FIXTURE = JSON.parse(read('scripts/data/usBoardFixture.json'));
const BAN_HEATS = [0, 40, 70, 75, 79, 80, 81, 84, 85, 88, 89, 89.5, 90, 91, 95, 98, 99, 100];
let banCases = 0;
const served = new Map();
for (const slug of SPORTS) {
  const sport = BIND[slug];
  const recorded = JSON.parse(FIXTURE.sports[slug].saves.dirty).c;
  for (const heat of BAN_HEATS) for (const pending of [0, 1]) for (const dirty of [0.4, 1.1, 6, 20]) for (const way of DM.DIRTY_WAYS) {
    const c = { ...clone(recorded), heat, dirtyMoney: dirty, suspendedSeasons: pending, retired: false };
    const n = DM.wayNumbers(c, way);
    const r = way === 'quiet' ? { state: clone(c), caught: null } : DM.dealWithDirtyMoney(c, way);
    const s = clone(r.state);
    const rng = E.keyedRng(`ban|${slug}|${banCases}`);
    let banned = 0, starts = 0, firstEndBan = null;
    for (let i = 0; i < 6 && !s.retired; i++) {
      if ((s.suspendedSeasons ?? 0) > 0) { s.suspendedSeasons -= 1; banned += 1; }
      const was = s.suspendedSeasons ?? 0;
      sport.progress(s, rng);
      const began = was === 0 && (s.suspendedSeasons ?? 0) > 0;
      if (began) starts += 1;
      if (i === 0) firstEndBan = began;
    }
    banCases += 1;
    const k = `${way}:${banned}`;
    served.set(k, (served.get(k) ?? 0) + 1);
    const who = `${slug} ${way}${way === 'wash' ? (r.caught ? ' caught' : ' clean') : ''} at heat ${heat}, ${pending} pending, ${dirty}M`;
    if (way === 'quiet') {
      if (n.burnsToBan !== firstEndBan) fail(9, who, `prints burnsToBan ${n.burnsToBan}, the engine's first season end ${firstEndBan ? 'suspends' : 'does not'}`);
    } else if (way === 'wash' && r.caught) {
      if (n.bannedIfCaught !== banned || n.startsIfCaught !== starts) fail(9, who, `prints ${n.bannedIfCaught} seasons and ${n.startsIfCaught} new suspensions, the engine served ${banned} and started ${starts}`);
    } else if (n.bannedAfter !== banned || n.startsAfter !== starts) {
      fail(9, who, `prints ${n.bannedAfter} seasons and ${n.startsAfter} new suspensions, the engine served ${banned} and started ${starts}`);
    }
  }
}
console.log(`   ${banCases} cases; seasons the engines served by way: ${[...served].sort().map(([k, v]) => `${k}=${v}`).join(' ')}`);
for (const k of ['clean:1', 'give:1', 'quiet:2', 'wash:2']) if (!served.has(k)) fail(9, 'coverage', `no case served ${k}: the grid no longer reaches a ban`);

/* ---------- section 8: the help line holds ---------- */
console.log('8) the help line: FLAGGED at 40 and three washers in every shop');
for (const slug of SPORTS) {
  const sport = BIND[slug];
  if (sport.heatLabel(40).label !== 'FLAGGED' || sport.heatLabel(39.9).label === 'FLAGGED') fail(8, slug, 'the meter does not turn FLAGGED at 40, and the help example says it does');
  if (DM.washerIds(sport.shopItems).length !== 3) fail(8, slug, `the shop holds ${DM.washerIds(sport.shopItems).length} washers`);
}
if (!DM.US_DIRTY_MONEY_HELP_RULE.includes('just turned FLAGGED')) fail(8, 'help', 'the help line no longer names FLAGGED');

/* ---------- the end ---------- */
const redSections = [...red.keys()].sort();
if (control) {
  const want = CONTROLS[control]?.[2] ?? OTHER_CONTROLS[control];
  let fired = want.every(s => red.has(s));
  if (control === 'noop') {
    /* It must name the sport whose card it broke, and only that sport. */
    const named = SPORTS.filter(slug => [...(red.get(4) ?? [])].some(k => k.startsWith(`${slug} `)));
    console.log(`   control noop on ${noopSport}: section 4 names ${named.join(', ') || 'no sport'}`);
    fired = fired && named.length === 1 && named[0] === noopSport;
  }
  for (const s of want) console.log(`   control ${control}: section ${s} turned ${red.get(s)?.size ?? 0} red`);
  if (control === 'cap') {
    /* One point more of Come clean breaks no corruption card (heat 9 or more) and only the cousin (heat 8). */
    const reds = [...(red.get(7) ?? [])];
    console.log(`   control cap: section 7 red on ${reds.join('; ') || 'nothing'}`);
    if (!reds.length || !reds.every(k => k.startsWith('nfl ') && k.includes('cousin'))) {
      console.log('CONTROL cap DID NOT FIRE on the cousin alone');
      process.exit(2);
    }
  }
  if (control === 'flat' && !(red.get(7)?.has([...table.keys()].find(k => k.includes('ncorr_memorabilia')) ?? 'none'))) {
    console.log('CONTROL flat DID NOT FIRE on the memorabilia card');
    process.exit(2);
  }
  console.log(fired ? `CONTROL ${control} FIRED (red sections ${redSections.join(', ')})` : `CONTROL ${control} DID NOT FIRE (red sections ${redSections.join(', ') || 'none'})`);
  process.exit(fired ? 1 : 2);
}
console.log(failures ? `simUsDirtyMoney: ${failures} failures in sections ${redSections.join(', ')}` : 'simUsDirtyMoney: all sections green');
process.exit(failures ? 1 : 0);
