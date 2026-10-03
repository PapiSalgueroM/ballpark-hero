/**
 * Round 949 harness: every Missing Five sheet is read on two hosts.
 *
 * Missing Five deals a real NBA Finals starting five with one man blanked.
 * Round 949 grew the pool from 14 sheets to 40 and read every sheet on two
 * hosts: the basketball-reference.com box score Starters block and the
 * nba.com box score starters block (statmuse.com for 1998, where nba.com has
 * no box). The per-sheet record is docs/audits/MISSING-FIVE-SOURCES-2026-10-03.md.
 * Before that round six sheets named one host and two leaned on Wikipedia,
 * which is never a source here.
 *
 * What it asserts, reading the module itself (bundled), never its comments:
 *   1. The pool holds at least 40 sheets (a floor, so it cannot quietly shrink).
 *   2. Every sheet's source string names at least two distinct hosts, written
 *      as domains. A wiki host never counts.
 *   3. The box ids in the source belong to this sheet's game: the bref id
 *      starts with the match date, and an nba.com id is the Finals id for
 *      that season and game number (004 + season + 0040 + game).
 *   4. dateLabel, competition and matchDate agree (year, "NBA Finals", game),
 *      so the guide's "NBA Finals night" wording stays true.
 *   5. No game is on the sheet list twice for the same team.
 *   6. The daily pick deals every sheet within a simulated year.
 *
 * Measured at Round 949 (deterministic, no seed: the data is fixed and the
 * daily walk is a fixed function of the date, so one run is the measurement):
 *   sheets 40; hosts per sheet: 2 on all 40 (minimum 2); bref ids matching
 *   the date 40 of 40; nba.com ids matching 38 of 38 that name nba.com (the
 *   two 1998 sheets name statmuse.com); duplicate team-games 0; distinct
 *   sheets dealt in 365 days 40 of 40.
 *
 * Negative controls (SIM_MF_CONTROL=<name>), each must turn this red:
 *   onehost  cuts one sheet's source down to its first host     -> check 2
 *   wiki     swaps one sheet's nba.com for en.wikipedia.org     -> check 2
 *   wrongid  points one sheet's nba.com id at another game      -> check 3
 *   label    moves one sheet's dateLabel to the wrong year      -> check 4
 *   shrink   drops one sheet                                    -> check 1
 *   dupe     adds a second copy of one game under a new id      -> check 5
 *   stuck    makes the daily pick see one sheet in two places   -> check 6
 * Each control asserts that the string or shape it mutates exists first, so
 * a control that changes nothing fails loudly instead of passing quietly.
 */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = `simMissingFiveSources-${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `${TAG}.entry.mjs`);
const OUT = path.join(os.tmpdir(), `${TAG}.bundle.mjs`);
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const m5 = await import('${ROOT.replaceAll('\\', '/')}/src/lib/missingFive.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
});

/* The daily pick reads today's date in Eastern time, so the clock is
   replaced before the bundle is imported and moved a day at a time. */
const RealDate = Date;
const START = RealDate.UTC(2026, 0, 1, 17, 0, 0);
const DAY = 86400000;
let fixedNow = START;
globalThis.Date = class extends RealDate {
  constructor(...a) { if (a.length === 0) super(fixedNow); else super(...a); }
  static now() { return fixedNow; }
};
const { m5 } = await import(pathToFileURL(OUT).href);
for (const f of [ENTRY, OUT]) { try { fs.unlinkSync(f); } catch { /* already gone */ } }

let failures = 0;
const fail = (m) => { failures += 1; console.error('  FAIL: ' + m); };
const L = m5.FIVE_LINEUPS;
const CONTROL = process.env.SIM_MF_CONTROL || '';
const must = (cond, what) => { if (!cond) { console.error(`control ${CONTROL}: ${what} not found, the control would change nothing`); process.exit(2); } };

if (CONTROL) {
  console.log(`CONTROL ${CONTROL} active: this run must go red`);
  const withNba = L.find((l) => l.source.includes(' + nba.com box '));
  if (CONTROL === 'onehost') { must(withNba, "a source with ' + nba.com box '"); withNba.source = withNba.source.split(' + ')[0]; }
  else if (CONTROL === 'wiki') { must(withNba, "a source naming nba.com"); withNba.source = withNba.source.replace('nba.com', 'en.wikipedia.org'); }
  else if (CONTROL === 'wrongid') {
    must(withNba && /nba\.com box 004\d{7}/.test(withNba.source), 'an nba.com box id');
    withNba.source = withNba.source.replace(/(nba\.com box 004\d{6})(\d)/, (_, a, d) => a + (d === '1' ? '2' : '1'));
  }
  else if (CONTROL === 'label') { must(/^\d{4} NBA Finals/.test(L[0].dateLabel), 'a dateLabel starting with a year'); L[0].dateLabel = L[0].dateLabel.replace(/^(\d{4})/, (y) => String(Number(y) - 1)); }
  else if (CONTROL === 'shrink') { must(L.length > 0, 'a sheet'); L.pop(); }
  else if (CONTROL === 'dupe') { must(L.length > 0, 'a sheet'); L.push({ ...L[0], id: L[0].id + '-copy' }); }
  else if (CONTROL === 'stuck') { must(L.length > 1 && L[1] !== L[0], 'two different sheets'); L[1] = L[0]; }
  else { console.error(`unknown control ${CONTROL}`); process.exit(2); }
}

const FLOOR = 40;
const WIKI = /wiki/i;
const hostsOf = (s) => [...new Set((s.match(/\b(?:[a-z0-9-]+\.)+(?:com|org|net)\b/gi) || []).map((h) => h.toLowerCase()))].filter((h) => !WIKI.test(h));

console.log('1) The pool is at least the Round 949 size');
if (L.length < FLOOR) fail(`only ${L.length} sheets, the floor is ${FLOOR}`);
console.log(`   ${L.length} sheets`);

console.log('2) Every sheet names two hosts');
let twoHosts = 0, minHosts = Infinity;
for (const l of L) {
  const h = hostsOf(l.source || '');
  minHosts = Math.min(minHosts, h.length);
  if (h.length < 2) fail(`${l.id}: source names ${h.length} host${h.length === 1 ? '' : 's'} (${h.join(', ') || 'none'})`);
  else twoHosts += 1;
}
console.log(`   ${twoHosts} of ${L.length} name two or more hosts, fewest on one sheet ${minHosts}`);

console.log('3) The box ids belong to the sheet');
let brefOk = 0, nbaOk = 0, nbaNamed = 0;
for (const l of L) {
  const ymd = l.matchDate.replace(/-/g, '');
  const bref = (l.source.match(/basketball-reference\.com box (\d{9}[A-Z]{3})/) || [])[1];
  if (!bref) fail(`${l.id}: no basketball-reference.com box id in the source`);
  else if (!bref.startsWith(ymd + '0')) fail(`${l.id}: bref box ${bref} is not a game on ${l.matchDate}`);
  else brefOk += 1;
  if (l.source.includes('nba.com box')) {
    nbaNamed += 1;
    const game = (l.dateLabel.match(/Game (\d)/) || [])[1];
    const yy = String((Number(l.matchDate.slice(0, 4)) - 1) % 100).padStart(2, '0');
    const want = `004${yy}0040${game}`;
    const got = (l.source.match(/nba\.com box (\d{10})/) || [])[1];
    if (got !== want) fail(`${l.id}: nba.com box ${got} is not Finals ${l.dateLabel} (${want})`);
    else nbaOk += 1;
  }
}
console.log(`   bref ids on the right date ${brefOk} of ${L.length}, nba.com ids for the right game ${nbaOk} of ${nbaNamed}`);

console.log('4) Every sheet is an NBA Finals game and says which one');
let labelled = 0;
for (const l of L) {
  const m = l.dateLabel.match(/^(\d{4}) NBA Finals, Game ([1-7])$/);
  if (l.competition !== 'NBA Finals') fail(`${l.id}: competition is "${l.competition}", the guide promises NBA Finals nights`);
  else if (!m) fail(`${l.id}: dateLabel "${l.dateLabel}" is not "YYYY NBA Finals, Game N"`);
  else if (m[1] !== l.matchDate.slice(0, 4)) fail(`${l.id}: dateLabel year ${m[1]} but the game was played ${l.matchDate}`);
  else labelled += 1;
}
console.log(`   ${labelled} of ${L.length} labelled with the year they were played`);

console.log('5) No team-game appears twice');
const seen = new Map();
let dupes = 0;
for (const l of L) {
  const k = `${l.team}|${l.matchDate}`;
  if (seen.has(k)) { dupes += 1; fail(`${l.id} and ${seen.get(k)} are the same team in the same game`); }
  else seen.set(k, l.id);
}
console.log(`   ${dupes} duplicate team-games`);

console.log('6) The daily pick deals the whole pool');
const DAYS = 365;
const dealt = new Set();
for (let d = 0; d < DAYS; d += 1) {
  fixedNow = START + d * DAY;
  const a = m5.getDailyFivePuzzle();
  const b = m5.getDailyFivePuzzle();
  if (a.lineup.id !== b.lineup.id || a.candidate.name !== b.candidate.name) fail(`day ${d}: the same date dealt two different puzzles`);
  dealt.add(a.lineup.id);
}
const pool = L.length;
if (dealt.size < pool) fail(`only ${dealt.size} of ${pool} sheets dealt in ${DAYS} days`);
console.log(`   ${dealt.size} of ${pool} distinct sheets dealt in ${DAYS} days`);

console.log('');
if (failures > 0) {
  console.error(`simMissingFiveSources: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
if (CONTROL) {
  console.error(`simMissingFiveSources: control ${CONTROL} did not fire, the check it targets is blind`);
  process.exit(2);
}
console.log(`simMissingFiveSources: green. ${L.length} sheets, every one read on two hosts.`);
