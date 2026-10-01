/* The World XI season report: months, player stats, awards and the what-if,
   all of it arithmetic on the season the sim already played.

   Round 726, the other half of his 2026-08-28 "more in the season report"
   (the respin picker half shipped as Round 743). The sim now writes a month
   by month form line, a stat line for every one of the eleven, three awards
   and one "what would have changed" line that replays the same rolls under
   a different shape or with the lowest rated slot lifted. This harness runs
   the REAL engine (bundled from src, with the Round 726 lines rewritten in
   memory for the controls). One rewrite is always on: a single line that
   copies buildSeasonExtras' own match ledger (who played which match, every
   scoreline, every goal with its scorer and assister, the month of each
   match) out to the harness, so section 7 can hold the printed numbers to
   the matches they came from. It changes no value and draws nothing.

   WHAT THIS HOLDS, over 400 seeded XIs (hard unless marked):
     1) The stats add up. Every player's goals sum to the team's goals and
        every assist to the team's assists; the top scorer keeps the goals the
        report already printed and nobody passes him; the ten months sum to
        the record and to the goals for and against; appearances sit in 1..38;
        the keeper's clean sheets never exceed his appearances nor the team's;
        a forward has no clean sheet column at all; at most one month claims
        the season's big win and no month says "1 wins". The goal of the
        season came against a side named by where it finished (2nd to 20th,
        never our own place) or the eventual champions, never a club name.
     2) A stronger eleven does better than a weaker one on average, over 200
        seeded seasons a side (BANDS, from measurement): it finishes higher,
        takes more points, scores more and concedes fewer.
        Measured 2026-10-01 at base seeds 0, 1000, 2000, ..., 7000, on the
        engine before players had a match by match availability:
          places  5.7 5.6 6.1 5.8 6.1 5.9 6.1 6.3   (strong about 2.1st, weak about 8.0th)
          points 31.7 32.7 33.5 33.7 35.0 33.7 34.7 34.5
          for    30.4 30.3 30.9 30.9 33.0 31.8 32.6 32.4
          against 13.4 14.8 14.4 14.5 14.9 14.2 15.3 15.3
        Remeasured after it (same seeds):
          places  5.7 5.6 6.1 5.8 6.1 5.9 6.1 6.3   (unchanged, the league is untouched)
          points 31.7 32.7 33.5 33.7 35.0 33.7 34.7 34.5
          for    29.1 29.9 31.9 31.7 32.6 31.2 33.0 32.3
          against 14.0 14.2 14.9 14.0 14.7 14.4 14.7 14.6
        Floors at roughly 55 to 80 percent of the lowest: 3.5 places,
        25 points, 18 goals for, 8 goals against.
     3) The what-if really re-simulates. whatIfFinish with the chosen shape and
        no change returns the season's own finish exactly (delta zero on the
        chosen set up); the reported alternative recomputes to the numbers the
        line prints; a shape alternative never gains points and a lifted slot
        never loses them, because the rolls are the same rolls; no line says a
        place moved "from 8th to 8th". Run on the 400 4-3-3 seeds and on 60
        more in a 3-5-2 two of the eleven do not fit (what Build Your XI hands
        the sim when a pick's history let him into a slot), where a shape the
        eleven fit better still must not gain and the line must not call the
        chosen shape the right call.
     4) Nobody real speaks. In every line the report prints (narrative, each
        month's moment, the award lines, the what-if line):
          a) no squad member's name sits immediately before a colon or a quote
             mark, and none is followed by a speech verb (the old guard);
          b) a line that names a squad member carries no quote mark at all,
             once the names themselves, the minute mark after a number (34')
             and an apostrophe inside a word (eleven's) are set aside;
          c) every sentence that names a squad member is one of the report's
             six result shapes (top scorer, player of the season, young
             player, goal of the season, injury, the lowest rated slot in the
             what-if). A name given words through ANY verb is a sentence of
             none of those shapes, so this holds whatever the verb is;
          d) a month's moment names nobody from the squad and carries no quote
             mark or apostrophe at all.
     5) Old reports render. A report stripped of every Round 726 field renders
        SeasonReportTabs to nothing without throwing; a new one renders every
        month and every player; both pages mount the component.
     6) The season did not move. For 30 fixed squads every field the report
        printed before this round hashes to what the engine at 6970737f gave,
        the 3-5-2 squads included, so the chosen shape is never charged.
     7) Every number comes off who played which match, and every month line
        fits its month. Over 400 mixed, 200 strong and 200 weak seasons, read
        against the engine's own match ledger:
          a) nobody scores or assists in a match he missed, nobody assists
             his own goal, each match's goals for are exactly the goals placed
             in it, and each man's appearances, goals and assists are counted
             off the ledger;
          b) a keeper's or defender's clean sheets are exactly the shutouts in
             the games he played (not the team's, not a share of the team's),
             and the team's are every shutout of the season;
          c) a month's standout played in that month;
          d) each month's moment is, word for word, a line from the pool its
             record calls for (unbeaten, winless, more wins than defeats,
             otherwise uneven; the big win line only in the month that holds
             the season's biggest win by four or more), filled with that
             month's own numbers;
          e) no season uses a month line twice, and every record pool holds
             at least as many lines as a season has months.
        Measured 2026-10-01 at bases 0 to 7000: 800 seasons a base, 68,235 to
        76,768 goals and 4,000 clean sheet lines read against who played,
        8,000 months, 0 failures and 0 seasons repeating a line at every base
        (before the pools grew to twelve, a reviewer counted repeats in 331,
        474, 989 and 996 of 1,000 weak, mixed, strong and elite seasons).
   Negative controls (WORLD_XI_SEASON_CONTROL=...). Each one names the check
   it targets, asserts the line it rewrites exists exactly once first and
   refuses to run otherwise, and exits 0 only if THAT check failed:
     statsum     adds a goal to one player's tally after the team total is
                 read (section 1, sums).
     speaker     prefixes each month's moment with the standout's name and a
                 colon (section 4a, speech).
     noresim     replaces the shape alternative with a guessed finish instead
                 of a replay (section 3, replay).
     penalty     charges the chosen shape for its own misfits, so the 3-5-2
                 seasons move (section 6, golden).
     flatgoals   aims every side at the same goal total whatever its points
                 (section 2, band).
     anyscorer   lets a man's goals land in matches he missed (section 7a,
                 ledger).
     teamsheets  gives each back man the team's clean sheets scaled by his
                 appearances, the formula this round replaced (section 7b,
                 sheets).
     repeat      always picks the first line of a pool (section 7e, repeat).
     poolswap    swaps the unbeaten and winless pools (section 7d, pool).
     realclub    names a real club as the goal of the season opponent
                 (section 1, opponent).
     quoteverb   the reviewer's mutation: the goal of the season scorer
                 "reckons" something in quote marks (section 4b, quote).
     reported    the same, with no quote marks at all, which the old verb list
                 and 4b both miss (section 4c, shape).
     quotemoment wraps every month's moment in curly quotes (section 4d,
                 momentquote).

   Run: node scripts/simWorldXiSeasonReport.mjs   (WORLD_XI_SEASON_BASE=n moves the seeds)
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const require = createRequire(import.meta.url);
/* Each control and the check it must turn red. */
const TARGET = {
  statsum: 'sums', speaker: 'speech', noresim: 'replay', penalty: 'golden', flatgoals: 'band',
  anyscorer: 'ledger', teamsheets: 'sheets', repeat: 'repeat', poolswap: 'pool', realclub: 'opponent',
  quoteverb: 'quote', reported: 'shape', quotemoment: 'momentquote',
};
const CONTROLS = Object.keys(TARGET);
const CONTROL = process.env.WORLD_XI_SEASON_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`WORLD_XI_SEASON_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
const BASE = Number(process.env.WORLD_XI_SEASON_BASE || 0);
let failures = 0;
const failuresBy = {};
const fail = (m, key = 'other') => {
  failures += 1;
  failuresBy[key] = (failuresBy[key] ?? 0) + 1;
  if (failuresBy[key] <= 20) console.error(`  FAIL [${key}]: ${m}`);
  else if (failuresBy[key] === 21) console.error(`  FAIL [${key}]: ... more of these, counted below`);
};
const abort = m => { console.error(`simWorldXiSeasonReport: cannot run: ${m}`); process.exit(2); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const MATCHES = 38;
const SEEDS = 400;
const SIDES = 200;
const OFF_SHAPE = 60;
const SHAPES = ['4-3-3', '4-4-2', '4-2-3-1', '4-1-2-1-2', '4-5-1', '3-5-2', '3-4-3', '5-3-2', '4-4-1-1'];
const MONTH_NAMES = ['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
/* Section 6. One hash per season of every field the report printed before
   Round 726 (rating, place, points, record, run, gaps, top scorer, trophies,
   injuries, saga, player of the season, the old narrative lines), taken from
   the engine at 6970737f, the commit this round branched from. Cases, in
   order: seeds 1..8 x (weak, mixed, strong) in a 4-3-3, then seeds 1..6 mixed
   in a 3-5-2 where two of the eleven have no slot. Regenerate ONLY in a round
   that means to change the season and says so: WORLD_XI_SEASON_GOLDEN=print. */
const GOLDEN = ['387f9afe', 'f9e12d50', '8a9fa930', '7122f20e', 'fc6b8351', 'dc770764', 'dd4998a3', '17af54ff', '43f7c777', '50a9f9c4', 'c7054818', '0f9c44ad', '2cd207e5', 'cb912ebd', 'a48bf4b5', 'e8ce1802', '0f8aa06a', 'e85ebe01', 'a358def4', 'e23c91ec', '53ca4110', 'bfa9e5c0', '71d6a9c3', '2e68668d', 'b7372c3c', '281da61d', '685926db', '0e74ea14', 'e1b4c9f1', '4383ef9e'];
const POS_GAP_FLOOR = 3.5;
const PTS_GAP_FLOOR = 25;
const GF_GAP_FLOOR = 18;
const GA_GAP_FLOOR = 8;

/* ---------- the engine, rewritten in memory for a control ---------- */
let src = read('src/lib/worldXi.ts');
const rewrite = (needle, replacement, what) => {
  const count = src.split(needle).length - 1;
  if (count !== 1) abort(`worldXi.ts carries "${needle.trim().slice(0, 60)}" ${count} times, not once (${what})`);
  src = src.replace(needle, () => replacement);
};
/* Always on: copy the match ledger out. Values only, no draw, no change. */
rewrite('  return {\n    goalsFor,\n    goalsAgainst,\n', '  __ledger.last = { played, gf, ga, goals, monthOf };\n  return {\n    goalsFor,\n    goalsAgainst,\n', 'the end of buildSeasonExtras');
src += '\nexport const __ledger: { last: null | Record<string, unknown> } = { last: null };\n';

const GOAL_LINE_END = "${desc} in a ${score} ${outcome}.`;";
if (CONTROL === 'statsum') {
  const needle = '  let goalsFor = playerGoals.reduce((s, g) => s + g, 0);';
  rewrite(needle, `${needle}\n  playerGoals[0] += 1;`, 'the team goals line');
  console.log('NEGATIVE CONTROL ON: one player gains a goal after the team total is read');
}
if (CONTROL === 'speaker') {
  const needle = '    const moment = fillMonth(template, ';
  rewrite(needle, "    const moment = (standout ? standout.name + ': ' : '') + fillMonth(template, ", 'the month moment line');
  console.log('NEGATIVE CONTROL ON: each month moment is spoken by the standout, name then colon');
}
if (CONTROL === 'noresim') {
  const needle = '      const alt = whatIfFinish(players, formationName, { formation: f.name });';
  rewrite(needle, '      const alt = { points: Math.max(0, points - 9), tablePosition: Math.min(20, tablePosition + 1) };', 'the shape alternative');
  console.log('NEGATIVE CONTROL ON: the shape alternative is a guess, not a replay');
}
if (CONTROL === 'penalty') {
  const needle = '  const overall = ratingToOverall(squadRating);\n';
  rewrite(needle, '  const overall = ratingToOverall(squadRating) - misfitPenalty(formationMisfits(players, formationName));\n', 'the season overall line');
  console.log('NEGATIVE CONTROL ON: the chosen shape pays for its own misfits, so an old season moves');
}
if (CONTROL === 'flatgoals') {
  const needle = '  const teamTarget = Math.round(points * (0.85 + rand() * 0.2));';
  rewrite(needle, '  const teamTarget = Math.round(80 * (0.85 + rand() * 0.2));', 'the team goals target');
  console.log('NEGATIVE CONTROL ON: every side aims at the same goal total whatever its points');
}
if (CONTROL === 'anyscorer') {
  rewrite('    const where = matchWeight.map((w, m) => (played[i][m] ? w : 0));', '    const where = matchWeight;', 'where a man\'s goals land');
  console.log('NEGATIVE CONTROL ON: a man\'s goals land in any match, played or not');
}
if (CONTROL === 'teamsheets') {
  rewrite('    const cs = keepsSheets(p.position) ? sheetsIn(i, allMatches) : null;', '    const cs = keepsSheets(p.position) ? Math.min(appearances[i], Math.round((cleanSheets * appearances[i]) / LEAGUE_MATCHES)) : null;', 'a back man\'s clean sheets');
  console.log('NEGATIVE CONTROL ON: each back man gets the team\'s clean sheets scaled by his appearances');
}
if (CONTROL === 'repeat') {
  rewrite('    const line = open[Math.floor(rand() * open.length)];', '    const line = pool[0];', 'the month line pick');
  console.log('NEGATIVE CONTROL ON: every month takes the first line of its pool');
}
if (CONTROL === 'poolswap') {
  rewrite('      ? MONTH_UNBEATEN\n      : w === 0\n      ? MONTH_WINLESS\n', '      ? MONTH_WINLESS\n      : w === 0\n      ? MONTH_UNBEATEN\n', 'the month pool choice');
  console.log('NEGATIVE CONTROL ON: unbeaten months take winless lines and winless months unbeaten ones');
}
if (CONTROL === 'realclub') {
  rewrite("    return rank === 1 ? 'the eventual champions' : `the side that finished ${ordinal(rank)}`;", "    return rank === 1 ? 'the eventual champions' : 'Arsenal';", 'the opponent label');
  console.log('NEGATIVE CONTROL ON: the goal of the season comes against a real club');
}
if (CONTROL === 'quoteverb') {
  rewrite(GOAL_LINE_END, "${desc} in a ${score} ${outcome}. ${scorer.name} reckons it was \"the best goal of my life\".`;", 'the goal of the season line');
  console.log('NEGATIVE CONTROL ON: the goal of the season scorer is given quoted words');
}
if (CONTROL === 'reported') {
  rewrite(GOAL_LINE_END, "${desc} in a ${score} ${outcome}. ${scorer.name} reckons it was the best goal of his life.`;", 'the goal of the season line');
  console.log('NEGATIVE CONTROL ON: the goal of the season scorer is given reported words, no quote marks');
}
if (CONTROL === 'quotemoment') {
  rewrite('    const template = pickLine(pool);', "    const template = '\u201c' + pickLine(pool) + '\u201d';", 'the month line pick');
  console.log('NEGATIVE CONTROL ON: every month moment sits in curly quotes');
}

let esbuild;
try { esbuild = require('esbuild'); } catch { abort('esbuild not found in any node_modules above the repo'); }
const REACT = (() => { try { return require.resolve('react/package.json'); } catch { return null; } })();
if (!REACT) abort('react not found in any node_modules above the repo');
const MODULES = path.dirname(path.dirname(REACT));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `dukb-wxsr-${process.pid}-`));
const cleanup = () => fs.rmSync(TMP, { recursive: true, force: true });

const ENGINE_ENTRY = path.join(TMP, 'worldXi.ts');
const ENGINE_OUT = path.join(TMP, 'worldXi.mjs');
fs.writeFileSync(ENGINE_ENTRY, src);
esbuild.buildSync({
  entryPoints: [ENGINE_ENTRY], bundle: true, format: 'esm', platform: 'node',
  alias: { '@': `${ROOT_URL}/src` }, nodePaths: [MODULES], outfile: ENGINE_OUT, logLevel: 'error',
});

const RENDER_ENTRY = path.join(TMP, 'render.mjs');
const RENDER_OUT = path.join(TMP, 'render.cjs');
fs.writeFileSync(RENDER_ENTRY, `
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeasonReportTabs } from '${ROOT_URL}/src/components/world-xi/SeasonReportTabs.tsx';
export const render = (report, initialPanel) => renderToStaticMarkup(React.createElement(SeasonReportTabs, { report, initialPanel }));
`);
esbuild.buildSync({
  entryPoints: [RENDER_ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` }, nodePaths: [MODULES],
  define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  outfile: RENDER_OUT, logLevel: 'error',
});

/* The engine bundle pulls in the Supabase client, which reads localStorage
   at module scope. A Map stands in for it. */
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => store.clear(),
    key: i => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}
const engine = await import(pathToFileURL(ENGINE_OUT).href);
const { simulateWorldXiSeason: simulate, whatIfFinish, MONTH_LINES, __ledger } = engine;
if (typeof simulate !== 'function' || typeof whatIfFinish !== 'function') abort('worldXi.ts does not export simulateWorldXiSeason and whatIfFinish');
if (!MONTH_LINES || !__ledger) abort('worldXi.ts does not export MONTH_LINES, or the ledger line did not land');
const { render } = require(RENDER_OUT);
cleanup();

/* ---------- squads ---------- */
/* Eleven real names in the shape the engine reads, every man fitting his
   4-3-3 slot, so the chosen set up pays no shape penalty (as in the game). */
const NAMES = [
  ['Thibaut Courtois', 'GK'], ['Trent Alexander-Arnold', 'RB'], ['Virgil van Dijk', 'CB'], ['Ruben Dias', 'CB'],
  ['Theo Hernandez', 'LB'], ['Rodri', 'CDM'], ['Jude Bellingham', 'CAM'], ['Pedri', 'CM'],
  ['Bukayo Saka', 'RW'], ['Vinicius Junior', 'LW'], ['Erling Haaland', 'ST'],
];
const squadFor = (seed, lo, hi) => NAMES.map(([name, position], i) => ({
  name: `${name} ${seed}`, country: 'x', position, club: 'x',
  value: lo + ((seed * 7919 + i * 104729) % (hi - lo)),
  age: 19 + ((seed + i) % 17),
}));
const mixed = seed => squadFor(seed, 2_000_000, 182_000_000);
const strong = seed => squadFor(seed, 100_000_000, 180_000_000);
const weak = seed => squadFor(seed, 1_000_000, 3_000_000);
const KEEPS_SHEETS = new Set(['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB']);
const sum = a => a.reduce((s, v) => s + v, 0);
const mean = a => sum(a) / a.length;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ordinal = n => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const SPEAKS = /\s+(said|says|told|tells|insisted|insists|admitted|admits|claimed|claims|demanded|demands|refused|refuses|added|adds)\b/;
/* Every quote mark a line could carry: straight, curly, angled, low, backtick. */
const QUOTES = /["'\u201c\u201d\u2018\u2019\u00ab\u00bb\u201e\u201a\u2039\u203a`]/;
const ORD = '\\d+(?:st|nd|rd|th)';
/* Section 4c. The only sentences in the whole report a squad member's name
   may sit in, with the name as @NAME@. */
const NAME_SHAPES = [
  /^@NAME@ top-scored with \d+ goals\.$/,
  /^Player of the season: @NAME@ \(rating \d+\)\.$/,
  /^Young player of the season: @NAME@ \(\d+ on our list, rating \d+\)\.$/,
  new RegExp(`^Goal of the season: @NAME@, (?:90\\+)?\\d+', (?:at home to|away at) (?:the eventual champions|the side that finished ${ORD}) in [A-Z][a-z]+, [a-z ]+ in a \\d+-\\d+ (?:win|draw|defeat)\\.$`),
  /^Injury: @NAME@ out for \d+ weeks\.$/,
  new RegExp(`^A pick at the rest of the eleven's level in the [a-z]+ slot \\(@NAME@, the lowest rating at \\d+\\) takes the squad to \\d+/100, and on the same rolls the finish (?:(?:drops|climbs) from ${ORD} to ${ORD} \\(\\d+ points, not \\d+\\)|stays ${ORD} but the points go from \\d+ to \\d+)\\.$`),
];

/* ---------- 1) the stats add up ---------- */
console.log('1) every player line adds up to the team totals');
{
  let seasons = 0, lines = 0, months = 0, keeperSheets = 0, opponents = 0;
  for (let k = 1; k <= SEEDS; k++) {
    const seed = BASE + k;
    const squad = mixed(seed);
    const r = simulate(squad, '4-3-3');
    seasons += 1;
    const stats = r.playerStats ?? [];
    if (stats.length !== squad.length) { fail(`seed ${seed}: ${stats.length} player lines for ${squad.length} players`, 'sums'); continue; }
    lines += stats.length;
    if (sum(stats.map(s => s.goals)) !== r.goalsFor) fail(`seed ${seed}: player goals sum to ${sum(stats.map(s => s.goals))}, the team scored ${r.goalsFor}`, 'sums');
    if (sum(stats.map(s => s.assists)) !== r.assists) fail(`seed ${seed}: player assists sum to ${sum(stats.map(s => s.assists))}, the team made ${r.assists}`, 'sums');
    if (r.topScorer) {
      const top = stats.find(s => s.name === r.topScorer.name);
      if (!top) fail(`seed ${seed}: the top scorer has no stat line`, 'sums');
      else {
        if (top.goals !== r.topScorer.goals) fail(`seed ${seed}: the top scorer line says ${top.goals}, the report says ${r.topScorer.goals}`, 'sums');
        const over = stats.filter(s => s.name !== top.name && s.goals >= top.goals);
        if (over.length) fail(`seed ${seed}: ${over[0].name} has ${over[0].goals} goals beside a top scorer on ${top.goals}`, 'sums');
      }
    }
    if (r.goalsFor < r.record.wins) fail(`seed ${seed}: ${r.goalsFor} goals in a season of ${r.record.wins} wins`, 'sums');
    for (const s of stats) {
      if (!(s.appearances >= 1 && s.appearances <= MATCHES)) fail(`seed ${seed}: ${s.name} made ${s.appearances} appearances`, 'sums');
      if (KEEPS_SHEETS.has(s.position)) {
        if (s.cleanSheets === null) fail(`seed ${seed}: ${s.name} (${s.position}) has no clean sheet count`, 'sums');
        else {
          if (s.cleanSheets > s.appearances) fail(`seed ${seed}: ${s.name} kept ${s.cleanSheets} clean sheets in ${s.appearances} appearances`, 'sums');
          if (s.cleanSheets > r.cleanSheets) fail(`seed ${seed}: ${s.name} kept ${s.cleanSheets} clean sheets, the team kept ${r.cleanSheets}`, 'sums');
          if (s.position === 'GK') keeperSheets += s.cleanSheets;
        }
      } else if (s.cleanSheets !== null) fail(`seed ${seed}: ${s.name} (${s.position}) carries a clean sheet count`, 'sums');
      if (!(s.avgRating >= 5 && s.avgRating <= 10)) fail(`seed ${seed}: ${s.name} averaged ${s.avgRating}`, 'sums');
    }
    const ms = r.months ?? [];
    if (ms.length !== 10) fail(`seed ${seed}: ${ms.length} months`, 'sums');
    months += ms.length;
    if (sum(ms.map(m => m.played)) !== MATCHES) fail(`seed ${seed}: the months hold ${sum(ms.map(m => m.played))} matches`, 'sums');
    if (sum(ms.map(m => m.wins)) !== r.record.wins || sum(ms.map(m => m.draws)) !== r.record.draws || sum(ms.map(m => m.losses)) !== r.record.losses) fail(`seed ${seed}: the months do not add up to ${r.record.wins}W ${r.record.draws}D ${r.record.losses}L`, 'sums');
    if (sum(ms.map(m => m.goalsFor)) !== r.goalsFor || sum(ms.map(m => m.goalsAgainst)) !== r.goalsAgainst) fail(`seed ${seed}: the months score ${sum(ms.map(m => m.goalsFor))}-${sum(ms.map(m => m.goalsAgainst))}, the season ${r.goalsFor}-${r.goalsAgainst}`, 'sums');
    const bigWins = ms.filter(m => /bringing up in ten years|kept the team sheet/.test(m.moment)).length;
    if (bigWins > 1) fail(`seed ${seed}: ${bigWins} months each claim the season's big win`, 'sums');
    for (const m of ms) {
      if (/\b1 (wins|defeats|games)\b/.test(m.moment)) fail(`seed ${seed}: ${m.month} reads "${m.moment.slice(0, 80)}"`, 'sums');
      if (m.wins + m.draws + m.losses !== m.played) fail(`seed ${seed}: ${m.month} record does not add to its ${m.played} games`, 'sums');
      if (!m.moment) fail(`seed ${seed}: ${m.month} has no moment`, 'sums');
      if (!m.standout) fail(`seed ${seed}: ${m.month} has no standout`, 'sums');
      else if (!squad.some(p => p.name === m.standout.name)) fail(`seed ${seed}: ${m.month} standout is not in the XI`, 'sums');
    }
    if (!r.whatIf) fail(`seed ${seed}: no what-if`, 'sums');
    if (!r.awards) fail(`seed ${seed}: no awards`, 'sums');
    else {
      const young = squad.filter(p => p.age <= 23);
      if (young.length && !r.awards.youngPlayer) fail(`seed ${seed}: ${young.length} picks 23 or under and no young player of the season`, 'sums');
      if (!young.length && r.awards.youngPlayer) fail(`seed ${seed}: a young player of the season with nobody 23 or under`, 'sums');
      if (r.awards.youngPlayer && !young.some(p => p.name === r.awards.youngPlayer.name)) fail(`seed ${seed}: the young player is not one of the picks 23 or under`, 'sums');
      if (r.goalsFor > 0 && !r.awards.goalOfSeason) fail(`seed ${seed}: ${r.goalsFor} goals and no goal of the season`, 'sums');
      const gos = r.awards.goalOfSeason;
      if (gos) {
        if (!squad.some(p => p.name === gos.scorer)) fail(`seed ${seed}: the goal of the season scorer is not in the XI`, 'sums');
        /* The opponent is a place in the table, never a name. */
        opponents += 1;
        const mm = /^(?:the eventual champions|the side that finished (\d+)(st|nd|rd|th))$/.exec(gos.opponent);
        if (!mm) fail(`seed ${seed}: the goal of the season came against "${gos.opponent}", not a side named by where it finished`, 'opponent');
        else if (mm[1]) {
          const rank = Number(mm[1]);
          if (rank < 2 || rank > 20 || ordinal(rank) !== mm[1] + mm[2]) fail(`seed ${seed}: the goal of the season came against "${gos.opponent}"`, 'opponent');
          if (rank === r.tablePosition) fail(`seed ${seed}: the goal of the season came against the side in our own place, ${gos.opponent}`, 'opponent');
        } else if (r.tablePosition === 1) fail(`seed ${seed}: the champions scored their goal of the season against the eventual champions`, 'opponent');
        if (!gos.line.includes(gos.opponent)) fail(`seed ${seed}: the goal of the season line does not carry its opponent`, 'opponent');
      }
    }
  }
  console.log(`   ${seasons} seasons, ${lines} player lines, ${months} months, keepers kept ${keeperSheets} clean sheets in all, ${opponents} goal of the season opponents read`);
}

/* ---------- 2) stronger finishes higher ---------- */
console.log('2) a stronger eleven finishes higher than a weaker one, on average');
{
  const sPos = [], sPts = [], wPos = [], wPts = [], sGf = [], wGf = [], sGa = [], wGa = [];
  for (let k = 1; k <= SIDES; k++) {
    const s = simulate(strong(BASE + k), '4-3-3');
    const w = simulate(weak(BASE + k), '4-3-3');
    sPos.push(s.tablePosition); sPts.push(s.points); wPos.push(w.tablePosition); wPts.push(w.points);
    sGf.push(s.goalsFor); wGf.push(w.goalsFor); sGa.push(s.goalsAgainst); wGa.push(w.goalsAgainst);
  }
  const posGap = mean(wPos) - mean(sPos);
  const ptsGap = mean(sPts) - mean(wPts);
  const gfGap = mean(sGf) - mean(wGf);
  const gaGap = mean(wGa) - mean(sGa);
  console.log(`   strong: ${mean(sPos).toFixed(1)}th, ${mean(sPts).toFixed(1)} points, scored ${mean(sGf).toFixed(1)} conceded ${mean(sGa).toFixed(1)}; weak: ${mean(wPos).toFixed(1)}th, ${mean(wPts).toFixed(1)} points, scored ${mean(wGf).toFixed(1)} conceded ${mean(wGa).toFixed(1)} over ${SIDES} seasons a side`);
  console.log(`   gaps: ${posGap.toFixed(1)} places, ${ptsGap.toFixed(1)} points, ${gfGap.toFixed(1)} goals for, ${gaGap.toFixed(1)} goals against (floors ${POS_GAP_FLOOR}, ${PTS_GAP_FLOOR}, ${GF_GAP_FLOOR}, ${GA_GAP_FLOOR})`);
  if (posGap < POS_GAP_FLOOR) fail(`the strong eleven finishes only ${posGap.toFixed(1)} places above the weak one`, 'band');
  if (ptsGap < PTS_GAP_FLOOR) fail(`the strong eleven scores only ${ptsGap.toFixed(1)} more points`, 'band');
  if (gfGap < GF_GAP_FLOOR) fail(`the strong eleven scores only ${gfGap.toFixed(1)} more goals than the weak one`, 'band');
  if (gaGap < GA_GAP_FLOOR) fail(`the strong eleven concedes only ${gaGap.toFixed(1)} fewer goals than the weak one`, 'band');
  if (new Set(sPts).size < 3) fail(`${SIDES} strong squads produced ${new Set(sPts).size} distinct points totals`, 'band');
}

/* ---------- 3) the what-if replays the rolls ---------- */
console.log('3) the what-if re-simulates on the same rolls');
{
  const kinds = { formation: 0, respin: 0, none: 0 };
  let shapeGains = 0, liftLosses = 0, checked = 0, offShape = 0;
  /* Every seed in the 4-3-3 the names fit, and OFF_SHAPE more in a 3-5-2 they
     do not (two wingers with no slot), which is what Build Your XI hands the
     sim when a pick's history let him into a slot his primary does not fit. */
  const cases = [];
  for (let k = 1; k <= SEEDS; k++) cases.push([BASE + k, '4-3-3']);
  for (let k = 1; k <= OFF_SHAPE; k++) cases.push([BASE + k, '3-5-2']);
  for (const [seed, shape] of cases) {
    const squad = mixed(seed);
    const r = simulate(squad, shape);
    if (shape !== '4-3-3') offShape += 1;
    const same = whatIfFinish(squad, shape, { formation: shape });
    const none = whatIfFinish(squad, shape, {});
    if (same.points !== r.points || same.tablePosition !== r.tablePosition) fail(`seed ${seed}: the chosen shape replays to ${same.points} points and ${same.tablePosition}th, the season was ${r.points} and ${r.tablePosition}th`, 'replay');
    if (none.points !== r.points || none.tablePosition !== r.tablePosition) fail(`seed ${seed}: no change replays to a different season`, 'replay');
    const w = r.whatIf;
    if (!w) continue;
    checked += 1;
    kinds[w.kind] = (kinds[w.kind] ?? 0) + 1;
    if (w.finishFrom !== r.tablePosition || w.pointsFrom !== r.points) fail(`seed ${seed}: the what-if starts from ${w.finishFrom}/${w.pointsFrom}, the season was ${r.tablePosition}/${r.points}`, 'replay');
    if (w.kind === 'formation') {
      const alt = whatIfFinish(squad, shape, { formation: w.alternative });
      if (alt.points !== w.pointsTo || alt.tablePosition !== w.finishTo) fail(`seed ${seed}: the ${w.alternative} line says ${w.finishTo}th on ${w.pointsTo}, the replay says ${alt.tablePosition}th on ${alt.points}`, 'replay');
      if (w.alternative === shape) fail(`seed ${seed}: the shape alternative is the chosen shape`, 'replay');
      if (w.finishTo === w.finishFrom && w.pointsTo === w.pointsFrom) fail(`seed ${seed}: a shape what-if that moved nothing`, 'replay');
    } else if (w.kind === 'respin') {
      const alt = whatIfFinish(squad, shape, { liftWeakest: true });
      if (alt.points !== w.pointsTo || alt.tablePosition !== w.finishTo) fail(`seed ${seed}: the respin line says ${w.finishTo}th on ${w.pointsTo}, the replay says ${alt.tablePosition}th on ${alt.points}`, 'replay');
      if (w.finishTo === w.finishFrom && w.pointsTo === w.pointsFrom) fail(`seed ${seed}: a respin what-if that moved nothing`, 'replay');
    } else if (w.kind === 'none') {
      const lift = whatIfFinish(squad, shape, { liftWeakest: true });
      if (lift.points !== r.points || lift.tablePosition !== r.tablePosition) fail(`seed ${seed}: the line says nothing moves, lifting the weakest slot moves it to ${lift.tablePosition}th on ${lift.points}`, 'replay');
      if (w.finishTo !== w.finishFrom || w.pointsTo !== w.pointsFrom) fail(`seed ${seed}: a none what-if with a delta`, 'replay');
    } else fail(`seed ${seed}: unknown what-if kind ${w.kind}`, 'replay');
    /* Monotone by construction: the same rolls under a lower win chance can
       only lose points, under a higher one can only gain. An alternative shape
       pays only for misfits beyond the chosen shape's, so none may gain, the
       3-5-2 cases included (their 4-3-3 has fewer misfits and must not win). */
    for (const f of SHAPES) {
      if (f === shape) continue;
      const alt = whatIfFinish(squad, shape, { formation: f });
      if (alt.points > r.points) shapeGains += 1;
    }
    const lift = whatIfFinish(squad, shape, { liftWeakest: true });
    if (lift.points < r.points) liftLosses += 1;
    if (!/^What would have changed: /.test(w.line)) fail(`seed ${seed}: the what-if line does not start the way the page expects`, 'replay');
    if (!/Same dice, no promises\.$/.test(w.line)) fail(`seed ${seed}: the what-if line reads as a certainty: "${w.line.slice(-80)}"`, 'replay');
    const held = w.line.match(/from (\d+(?:st|nd|rd|th)) to (\d+(?:st|nd|rd|th))/g)?.find(m => /from (\S+) to \1$/.test(m));
    if (held) fail(`seed ${seed}: the what-if says "${held}", a place that did not move`, 'replay');
    if (/right call/.test(w.line) && shape !== '4-3-3') fail(`seed ${seed}: a ${shape} with two men out of position is called the right call`, 'replay');
  }
  console.log(`   ${checked} what-ifs (${offShape} of them in a 3-5-2 two of the eleven do not fit): ${kinds.formation} shape, ${kinds.respin} respin, ${kinds.none} none`);
  if (shapeGains) fail(`${shapeGains} shape alternative(s) gained points on the same rolls`, 'replay');
  if (liftLosses) fail(`${liftLosses} lifted slot(s) lost points on the same rolls`, 'replay');
  if (kinds.formation + kinds.respin === 0) fail('no what-if ever moved the finish, so the line never says anything', 'replay');
}

/* ---------- 4) nobody real speaks ---------- */
console.log('4) no squad member speaks a line');
{
  let lines = 0, named = 0, sentences = 0;
  for (let k = 1; k <= SEEDS; k++) {
    const seed = BASE + k;
    const squad = mixed(seed);
    const r = simulate(squad, '4-3-3');
    const moments = (r.months ?? []).map(m => m.moment);
    const awardLines = [r.awards?.goalOfSeason?.line].filter(Boolean);
    const all = [...r.narrative, ...moments, ...awardLines, r.whatIf?.line].filter(Boolean);
    /* Longest first, so no name is masked inside another. */
    const names = squad.map(p => p.name).sort((a, b) => b.length - a.length);
    const mask = line => names.reduce((s, n) => s.split(n).join('@NAME@'), line);
    for (const line of all) {
      lines += 1;
      for (const p of squad) {
        if (!line.includes(p.name)) continue;
        named += 1;
        if (new RegExp(`${esc(p.name)}\\s*[:"'“”‘’]`).test(line)) fail(`seed ${seed}: a name before a colon or quote mark: "${line.slice(0, 90)}"`, 'speech');
        if (new RegExp(`${esc(p.name)}${SPEAKS.source}`).test(line)) fail(`seed ${seed}: a name with a speech verb: "${line.slice(0, 90)}"`, 'speech');
      }
      const masked = mask(line);
      if (!masked.includes('@NAME@')) continue;
      /* 4b: the minute mark (34') and a word's own apostrophe (eleven's) are
         not quotes; anything else that looks like one is. */
      const bare = masked.replace(/(\d)'/g, '$1').replace(/([A-Za-z])'([A-Za-z])/g, '$1$2');
      if (QUOTES.test(bare)) fail(`seed ${seed}: a line naming a squad member carries a quote mark: "${line.slice(0, 140)}"`, 'quote');
      /* 4c: every sentence with a name in it is one of the result shapes. */
      for (const sentence of masked.split(/(?<=[.!?])\s+(?=[A-Z@])/)) {
        if (!sentence.includes('@NAME@')) continue;
        sentences += 1;
        if (!NAME_SHAPES.some(re => re.test(sentence))) fail(`seed ${seed}: a squad member sits in a sentence that is none of the report's result lines: "${sentence.slice(0, 140)}"`, 'shape');
      }
    }
    for (const m of moments) {
      const who = squad.find(p => m.includes(p.name));
      if (who) fail(`seed ${seed}: a month's moment names ${who.name}: "${m.slice(0, 90)}"`, 'speech');
      if (QUOTES.test(m)) fail(`seed ${seed}: a month's moment carries a quote mark or apostrophe: "${m.slice(0, 120)}"`, 'momentquote');
    }
  }
  console.log(`   ${lines} lines, ${named} naming a squad member, ${sentences} named sentences, every one a result shape (a name is a result, never a speaker)`);
  if (lines === 0 || sentences === 0) fail('no lines or no named sentences at all, so this section measured nothing', 'speech');
}

/* ---------- 5) old reports render, new ones render everything ---------- */
console.log('5) a report without the new fields renders, and a new one renders every month and player');
{
  const squad = mixed(BASE + 7);
  const fresh = simulate(squad, '4-3-3');
  const old = { ...fresh };
  for (const k of ['goalsFor', 'goalsAgainst', 'cleanSheets', 'assists', 'months', 'playerStats', 'awards', 'whatIf']) delete old[k];
  const quiet = fn => {
    const error = console.error;
    console.error = (...a) => { if (!String(a[0]).includes('useLayoutEffect does nothing on the server')) error(...a); };
    try { return fn(); } finally { console.error = error; }
  };
  let oldHtml = null;
  try { oldHtml = quiet(() => render(old, null)); } catch (e) { fail(`an old report threw in SeasonReportTabs: ${String(e.message).slice(0, 120)}`, 'render'); }
  if (oldHtml !== null && oldHtml !== '') fail(`an old report rendered ${oldHtml.length} characters where nothing was expected`, 'render');
  else if (oldHtml === '') console.log('   an old report renders to nothing, no throw');
  const closed = quiet(() => render(fresh, null));
  if (!closed.includes('Month by month') || !closed.includes('Player stats')) fail('a new report does not offer both toggles', 'render');
  if (closed.includes('August')) fail('the months panel is open before anyone tapped it', 'render');
  const monthsHtml = quiet(() => render(fresh, 'months'));
  for (const m of fresh.months) {
    if (!monthsHtml.includes(m.month.slice(0, 3))) fail(`the months panel does not show ${m.month}`, 'render');
    if (m.standout && !monthsHtml.includes(m.standout.name)) fail(`the months panel does not show ${m.month}'s standout`, 'render');
  }
  const playersHtml = quiet(() => render(fresh, 'players'));
  for (const s of fresh.playerStats) {
    if (!playersHtml.includes(s.name)) fail(`the player panel does not show ${s.name}`, 'render');
  }
  console.log(`   new report: ${fresh.months.length} months and ${fresh.playerStats.length} players rendered`);
  const wx = stripComments(read('src/pages/WorldXi.tsx'));
  const lb = stripComments(read('src/pages/LineupBuilder.tsx'));
  if (!/<SeasonReportTabs report=\{seasonReport\}/.test(wx)) fail('World XI does not mount SeasonReportTabs', 'render');
  if (!/<SeasonReportTabs report=\{seasonReport\}/.test(lb)) fail('Build Your XI does not mount SeasonReportTabs', 'render');
  if (!/Top scorer: \$\{seasonReport\.topScorer\.name\}/.test(wx) || !/Player of the season: \$\{seasonReport\.playerOfSeason\.name\}/.test(wx)) fail('the World XI share card does not carry the top scorer and the player of the season', 'render');
  if (!failuresBy.render) console.log('   both pages mount the component, and the World XI share card names the top scorer and the player of the season');
}

/* ---------- 6) the season the report already printed did not move ---------- */
console.log('6) every field printed before this round is what the old engine printed');
{
  const ADDED = /^(Scored \d|Young player of the season: |Goal of the season: |What would have changed: )/;
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  const printed = r => fnv(JSON.stringify([r.squadRating, r.tablePosition, r.points, r.record, r.unbeatenRun, r.gapToTop, r.marginAsChampion, r.topScorer, r.trophies, r.injuries, r.transferHeadline, r.playerOfSeason, r.narrative.filter(l => !ADDED.test(l))]));
  /* Fixed seeds on purpose (no BASE): the hashes belong to these squads. */
  const cases = [];
  for (let k = 1; k <= 8; k++) for (const [lo, hi] of [[1_000_000, 3_000_000], [2_000_000, 182_000_000], [100_000_000, 180_000_000]]) cases.push([squadFor(k, lo, hi), '4-3-3']);
  for (let k = 1; k <= 6; k++) cases.push([squadFor(k, 2_000_000, 182_000_000), '3-5-2']);
  const now = cases.map(([s, f]) => printed(simulate(s, f)));
  if (process.env.WORLD_XI_SEASON_GOLDEN === 'print') { console.log(JSON.stringify(now)); process.exit(0); }
  if (now.length !== GOLDEN.length) fail(`${now.length} cases against ${GOLDEN.length} golden hashes`, 'golden');
  const moved = now.map((h, i) => (h === GOLDEN[i] ? null : i)).filter(i => i !== null);
  for (const i of moved) fail(`case ${i} (${cases[i][1]}): the old fields hash to ${now[i]}, the engine before this round gave ${GOLDEN[i]}`, 'golden');
  console.log(`   ${now.length - moved.length} of ${now.length} seasons print exactly what they printed before (${cases.filter(c => c[1] === '3-5-2').length} of them in a shape two men do not fit)`);
}

/* ---------- 7) every number comes off who played which match ---------- */
console.log('7) every number comes off who played which match, and every month line fits its month');
{
  const counted = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const fill = (t, v) => t.replace(/\{(w|d|l|p|gf|ga|month|wins|defeats)\}/g, (_, k) => String(v[k]));
  for (const pool of ['unbeaten', 'winless', 'good', 'uneven']) {
    const lines = MONTH_LINES[pool] ?? [];
    if (lines.length < MONTH_NAMES.length) fail(`the ${pool} pool holds ${lines.length} lines, fewer than the ${MONTH_NAMES.length} months a season can hand it`, 'repeat');
    if (new Set(lines).size !== lines.length) fail(`the ${pool} pool holds the same line twice`, 'repeat');
  }
  let seasons = 0, goalsChecked = 0, sheetLines = 0, monthsChecked = 0, repeatSeasons = 0, overApps = 0;
  const tiers = [['mixed', mixed, SEEDS], ['strong', strong, SIDES], ['weak', weak, SIDES]];
  for (const [tier, make, count] of tiers) {
    for (let k = 1; k <= count; k++) {
      const seed = BASE + k;
      const squad = make(seed);
      __ledger.last = null;
      const r = simulate(squad, '4-3-3');
      const L = __ledger.last;
      if (!L) { fail(`${tier} ${seed}: the engine wrote no ledger`, 'ledger'); continue; }
      seasons += 1;
      const at = `${tier} ${seed}`;
      const who = i => squad[i]?.name ?? `#${i}`;
      /* a) goals and assists only in matches the man played */
      for (const g of L.goals) {
        goalsChecked += 1;
        if (!L.played[g.scorer][g.match]) fail(`${at}: ${who(g.scorer)} scored in match ${g.match + 1}, which he missed`, 'ledger');
        if (g.assister !== null) {
          if (g.assister === g.scorer) fail(`${at}: ${who(g.scorer)} assisted his own goal in match ${g.match + 1}`, 'ledger');
          else if (!L.played[g.assister][g.match]) fail(`${at}: ${who(g.assister)} assisted in match ${g.match + 1}, which he missed`, 'ledger');
        }
      }
      L.gf.forEach((n, m) => {
        const placed = L.goals.filter(g => g.match === m).length;
        if (n !== placed) fail(`${at}: match ${m + 1} shows ${n} goals for, ${placed} were placed in it`, 'ledger');
      });
      for (const s of r.playerStats ?? []) {
        const i = squad.findIndex(p => p.name === s.name);
        const apps = L.played[i].filter(Boolean).length;
        if (s.appearances !== apps) fail(`${at}: ${s.name} is listed on ${s.appearances} appearances, he played ${apps}`, 'ledger');
        const g = L.goals.filter(x => x.scorer === i).length;
        const a = L.goals.filter(x => x.assister === i).length;
        if (s.goals !== g || s.assists !== a) fail(`${at}: ${s.name} is listed ${s.goals}G ${s.assists}A, the matches hold ${g}G ${a}A`, 'ledger');
        if (s.goals > s.appearances) overApps += 1;
        /* b) his own clean sheets, not the team's */
        if (s.cleanSheets !== null) {
          sheetLines += 1;
          const own = L.ga.filter((x, m) => x === 0 && L.played[i][m]).length;
          if (s.cleanSheets !== own) fail(`${at}: ${s.name} is credited ${s.cleanSheets} clean sheets, he played in ${own} shutouts`, 'sheets');
        }
      }
      const shutouts = L.ga.filter(x => x === 0).length;
      if (r.cleanSheets !== shutouts) fail(`${at}: the team is credited ${r.cleanSheets} clean sheets, the season holds ${shutouts} shutouts`, 'sheets');
      /* The season's biggest win, the first on a tie, from the scorelines. */
      let best = { margin: 0, m: -1 };
      L.gf.forEach((f, m) => { if (f > L.ga[m] && f - L.ga[m] > best.margin) best = { margin: f - L.ga[m], m }; });
      const bigWinMonth = best.margin >= 4 ? L.monthOf[best.m] : -1;
      const used = new Set();
      let repeated = false;
      for (const mo of r.months ?? []) {
        monthsChecked += 1;
        const mi = MONTH_NAMES.indexOf(mo.month);
        const inMonth = L.monthOf.map((x, m) => (x === mi ? m : -1)).filter(m => m >= 0);
        /* c) the standout played in his month */
        if (mo.standout) {
          const i = squad.findIndex(p => p.name === mo.standout.name);
          if (!inMonth.some(m => L.played[i][m])) fail(`${at}: ${mo.standout.name} is ${mo.month}'s standout and played none of its matches`, 'ledger');
        }
        /* d) the line comes from the pool the record calls for */
        const { wins: w, draws: d, losses: l, played: p } = mo;
        const pool = mi === bigWinMonth ? 'bigWin' : l === 0 && w > 0 ? 'unbeaten' : w === 0 ? 'winless' : w > l ? 'good' : 'uneven';
        const v = {
          month: mo.month, w, d, l, p, wins: counted(w, 'win'), defeats: counted(l, 'defeat'),
          gf: mi === bigWinMonth ? L.gf[best.m] : 0, ga: mi === bigWinMonth ? L.ga[best.m] : 0,
        };
        const t = (MONTH_LINES[pool] ?? []).findIndex(line => fill(line, v) === mo.moment);
        if (t < 0) { fail(`${at}: ${mo.month} (${w}W ${d}D ${l}L) reads "${mo.moment.slice(0, 100)}", which is no ${pool} line`, 'pool'); continue; }
        /* e) no line twice in a season */
        const key = `${pool}:${t}`;
        if (used.has(key)) { repeated = true; fail(`${at}: ${mo.month} repeats a ${pool} line already used this season: "${mo.moment.slice(0, 100)}"`, 'repeat'); }
        used.add(key);
      }
      if (repeated) repeatSeasons += 1;
    }
  }
  console.log(`   ${seasons} seasons, ${goalsChecked} goals and ${sheetLines} clean sheet lines read against who played, ${monthsChecked} months, ${repeatSeasons} seasons repeating a month line`);
  console.log(`   (for the record, not a check: ${overApps} player lines with more goals than appearances)`);
  if (seasons === 0 || goalsChecked === 0 || sheetLines === 0) fail('section 7 read no seasons, goals or clean sheet lines, so it measured nothing', 'ledger');
}

await new Promise(r => setTimeout(r, 50));
const tally = Object.entries(failuresBy).map(([k, n]) => `${k} ${n}`).join(', ');
if (CONTROL) {
  const want = TARGET[CONTROL];
  const got = failuresBy[want] ?? 0;
  if (got > 0) { console.log(`\ncontrol "${CONTROL}": the ${want} check fired ${got} time(s) (all failures: ${tally}), the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": the ${want} check did NOT fire (${tally || 'nothing failed'}), the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimWorldXiSeasonReport: ${failures} failure(s) (${tally})`); process.exit(1); }
console.log('\nsimWorldXiSeasonReport: green. The report says a great deal more, every number adds up and comes off who played, and nobody real says a word.');
