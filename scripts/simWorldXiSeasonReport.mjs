/* The World XI season report: months, player stats, awards and the what-if,
   all of it arithmetic on the season the sim already played.

   Round 726, the other half of his 2026-08-28 "more in the season report"
   (the respin picker half shipped as Round 743). The sim now writes a month
   by month form line, a stat line for every one of the eleven, three awards
   and one "what would have changed" line that replays the same rolls under
   a different shape or with the lowest rated slot lifted. This harness runs
   the REAL engine (bundled from src, with the Round 726 lines rewritten in
   memory for the controls) and holds the numbers to each other.

   WHAT THIS HOLDS, over 400 seeded XIs (hard unless marked):
     1) The stats add up. Every player's goals sum to the team's goals and
        every assist to the team's assists; the top scorer keeps the goals the
        report already printed and nobody passes him; the ten months sum to
        the record and to the goals for and against; appearances sit in 1..38;
        the keeper's clean sheets never exceed his appearances nor the team's;
        a forward has no clean sheet column at all; at most one month claims
        the season's big win and no month says "1 wins".
     2) A stronger eleven does better than a weaker one on average, over 200
        seeded seasons a side (BANDS, from measurement): it finishes higher,
        takes more points, scores more and concedes fewer.
        Measured 2026-10-01 at base seeds 0, 1000, 2000, ..., 7000:
          places  5.7 5.6 6.1 5.8 6.1 5.9 6.1 6.3   (strong about 2.1st, weak about 8.0th)
          points 31.7 32.7 33.5 33.7 35.0 33.7 34.7 34.5
          for    30.4 30.3 30.9 30.9 33.0 31.8 32.6 32.4
          against 13.4 14.8 14.4 14.5 14.9 14.2 15.3 15.3
        Floors at roughly 60 to 80 percent of the lowest: 3.5 places,
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
        month's moment, the award lines, the what-if line) no squad member's
        name sits immediately before a colon or a quote mark, none is followed
        by a speech verb, and a month's moment carries no squad name at all.
     5) Old reports render. A report stripped of every Round 726 field renders
        SeasonReportTabs to nothing without throwing; a new one renders every
        month and every player; both pages mount the component.
     6) The season did not move. For 30 fixed squads every field the report
        printed before this round hashes to what the engine at 6970737f gave,
        the 3-5-2 squads included, so the chosen shape is never charged.
   Negative controls (WORLD_XI_SEASON_CONTROL=...), each measured to fire:
     statsum   adds a goal to one player's tally after the team total is read,
               so section 1 goes red.
     speaker   prefixes each month's moment with the standout's name and a
               colon, so section 4 goes red.
     noresim   replaces the shape alternative with a guessed finish instead of
               a replay, so section 3 goes red.
     penalty   charges the chosen shape for its own misfits, so the 3-5-2
               seasons move and sections 3 and 6 go red.
     flatgoals aims every side at the same goal total whatever its points, so
               the goals for band in section 2 goes red.
   Each control asserts the line it rewrites exists first and refuses to run
   otherwise. Under a control the harness exits 0 only if something failed.

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
const CONTROLS = ['statsum', 'speaker', 'noresim', 'penalty', 'flatgoals'];
const CONTROL = process.env.WORLD_XI_SEASON_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`WORLD_XI_SEASON_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
const BASE = Number(process.env.WORLD_XI_SEASON_BASE || 0);
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(`simWorldXiSeasonReport: cannot run: ${m}`); process.exit(2); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const MATCHES = 38;
const SEEDS = 400;
const SIDES = 200;
const OFF_SHAPE = 60;
const SHAPES = ['4-3-3', '4-4-2', '4-2-3-1', '4-1-2-1-2', '4-5-1', '3-5-2', '3-4-3', '5-3-2', '4-4-1-1'];
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
  if (!src.includes(needle)) abort(`control cannot run: worldXi.ts no longer carries "${needle.trim().slice(0, 60)}" (${what})`);
  src = src.replace(needle, replacement);
};
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
const { simulateWorldXiSeason: simulate, whatIfFinish } = engine;
if (typeof simulate !== 'function' || typeof whatIfFinish !== 'function') abort('worldXi.ts does not export simulateWorldXiSeason and whatIfFinish');
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
const SPEAKS = /\s+(said|says|told|tells|insisted|insists|admitted|admits|claimed|claims|demanded|demands|refused|refuses|added|adds)\b/;

/* ---------- 1) the stats add up ---------- */
console.log('1) every player line adds up to the team totals');
{
  let seasons = 0, lines = 0, months = 0, keeperSheets = 0;
  for (let k = 1; k <= SEEDS; k++) {
    const seed = BASE + k;
    const squad = mixed(seed);
    const r = simulate(squad, '4-3-3');
    seasons += 1;
    const stats = r.playerStats ?? [];
    if (stats.length !== squad.length) { fail(`seed ${seed}: ${stats.length} player lines for ${squad.length} players`); continue; }
    lines += stats.length;
    if (sum(stats.map(s => s.goals)) !== r.goalsFor) fail(`seed ${seed}: player goals sum to ${sum(stats.map(s => s.goals))}, the team scored ${r.goalsFor}`);
    if (sum(stats.map(s => s.assists)) !== r.assists) fail(`seed ${seed}: player assists sum to ${sum(stats.map(s => s.assists))}, the team made ${r.assists}`);
    if (r.topScorer) {
      const top = stats.find(s => s.name === r.topScorer.name);
      if (!top) fail(`seed ${seed}: the top scorer has no stat line`);
      else {
        if (top.goals !== r.topScorer.goals) fail(`seed ${seed}: the top scorer line says ${top.goals}, the report says ${r.topScorer.goals}`);
        const over = stats.filter(s => s.name !== top.name && s.goals >= top.goals);
        if (over.length) fail(`seed ${seed}: ${over[0].name} has ${over[0].goals} goals beside a top scorer on ${top.goals}`);
      }
    }
    if (r.goalsFor < r.record.wins) fail(`seed ${seed}: ${r.goalsFor} goals in a season of ${r.record.wins} wins`);
    for (const s of stats) {
      if (!(s.appearances >= 1 && s.appearances <= MATCHES)) fail(`seed ${seed}: ${s.name} made ${s.appearances} appearances`);
      if (KEEPS_SHEETS.has(s.position)) {
        if (s.cleanSheets === null) fail(`seed ${seed}: ${s.name} (${s.position}) has no clean sheet count`);
        else {
          if (s.cleanSheets > s.appearances) fail(`seed ${seed}: ${s.name} kept ${s.cleanSheets} clean sheets in ${s.appearances} appearances`);
          if (s.cleanSheets > r.cleanSheets) fail(`seed ${seed}: ${s.name} kept ${s.cleanSheets} clean sheets, the team kept ${r.cleanSheets}`);
          if (s.position === 'GK') keeperSheets += s.cleanSheets;
        }
      } else if (s.cleanSheets !== null) fail(`seed ${seed}: ${s.name} (${s.position}) carries a clean sheet count`);
      if (!(s.avgRating >= 5 && s.avgRating <= 10)) fail(`seed ${seed}: ${s.name} averaged ${s.avgRating}`);
    }
    const ms = r.months ?? [];
    if (ms.length !== 10) fail(`seed ${seed}: ${ms.length} months`);
    months += ms.length;
    if (sum(ms.map(m => m.played)) !== MATCHES) fail(`seed ${seed}: the months hold ${sum(ms.map(m => m.played))} matches`);
    if (sum(ms.map(m => m.wins)) !== r.record.wins || sum(ms.map(m => m.draws)) !== r.record.draws || sum(ms.map(m => m.losses)) !== r.record.losses) fail(`seed ${seed}: the months do not add up to ${r.record.wins}W ${r.record.draws}D ${r.record.losses}L`);
    if (sum(ms.map(m => m.goalsFor)) !== r.goalsFor || sum(ms.map(m => m.goalsAgainst)) !== r.goalsAgainst) fail(`seed ${seed}: the months score ${sum(ms.map(m => m.goalsFor))}-${sum(ms.map(m => m.goalsAgainst))}, the season ${r.goalsFor}-${r.goalsAgainst}`);
    const bigWins = ms.filter(m => /bringing up in ten years|kept the team sheet/.test(m.moment)).length;
    if (bigWins > 1) fail(`seed ${seed}: ${bigWins} months each claim the season's big win`);
    for (const m of ms) {
      if (/\b1 (wins|defeats|games)\b/.test(m.moment)) fail(`seed ${seed}: ${m.month} reads "${m.moment.slice(0, 80)}"`);
      if (m.wins + m.draws + m.losses !== m.played) fail(`seed ${seed}: ${m.month} record does not add to its ${m.played} games`);
      if (!m.moment) fail(`seed ${seed}: ${m.month} has no moment`);
      if (!m.standout) fail(`seed ${seed}: ${m.month} has no standout`);
      else if (!squad.some(p => p.name === m.standout.name)) fail(`seed ${seed}: ${m.month} standout is not in the XI`);
    }
    if (!r.whatIf) fail(`seed ${seed}: no what-if`);
    if (!r.awards) fail(`seed ${seed}: no awards`);
    else {
      const young = squad.filter(p => p.age <= 23);
      if (young.length && !r.awards.youngPlayer) fail(`seed ${seed}: ${young.length} picks 23 or under and no young player of the season`);
      if (!young.length && r.awards.youngPlayer) fail(`seed ${seed}: a young player of the season with nobody 23 or under`);
      if (r.awards.youngPlayer && !young.some(p => p.name === r.awards.youngPlayer.name)) fail(`seed ${seed}: the young player is not one of the picks 23 or under`);
      if (r.goalsFor > 0 && !r.awards.goalOfSeason) fail(`seed ${seed}: ${r.goalsFor} goals and no goal of the season`);
      if (r.awards.goalOfSeason && !squad.some(p => p.name === r.awards.goalOfSeason.scorer)) fail(`seed ${seed}: the goal of the season scorer is not in the XI`);
    }
  }
  console.log(`   ${seasons} seasons, ${lines} player lines, ${months} months, keepers kept ${keeperSheets} clean sheets in all`);
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
  if (posGap < POS_GAP_FLOOR) fail(`the strong eleven finishes only ${posGap.toFixed(1)} places above the weak one`);
  if (ptsGap < PTS_GAP_FLOOR) fail(`the strong eleven scores only ${ptsGap.toFixed(1)} more points`);
  if (gfGap < GF_GAP_FLOOR) fail(`the strong eleven scores only ${gfGap.toFixed(1)} more goals than the weak one`);
  if (gaGap < GA_GAP_FLOOR) fail(`the strong eleven concedes only ${gaGap.toFixed(1)} fewer goals than the weak one`);
  if (new Set(sPts).size < 3) fail(`${SIDES} strong squads produced ${new Set(sPts).size} distinct points totals`);
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
    if (same.points !== r.points || same.tablePosition !== r.tablePosition) fail(`seed ${seed}: the chosen shape replays to ${same.points} points and ${same.tablePosition}th, the season was ${r.points} and ${r.tablePosition}th`);
    if (none.points !== r.points || none.tablePosition !== r.tablePosition) fail(`seed ${seed}: no change replays to a different season`);
    const w = r.whatIf;
    if (!w) continue;
    checked += 1;
    kinds[w.kind] = (kinds[w.kind] ?? 0) + 1;
    if (w.finishFrom !== r.tablePosition || w.pointsFrom !== r.points) fail(`seed ${seed}: the what-if starts from ${w.finishFrom}/${w.pointsFrom}, the season was ${r.tablePosition}/${r.points}`);
    if (w.kind === 'formation') {
      const alt = whatIfFinish(squad, shape, { formation: w.alternative });
      if (alt.points !== w.pointsTo || alt.tablePosition !== w.finishTo) fail(`seed ${seed}: the ${w.alternative} line says ${w.finishTo}th on ${w.pointsTo}, the replay says ${alt.tablePosition}th on ${alt.points}`);
      if (w.alternative === shape) fail(`seed ${seed}: the shape alternative is the chosen shape`);
      if (w.finishTo === w.finishFrom && w.pointsTo === w.pointsFrom) fail(`seed ${seed}: a shape what-if that moved nothing`);
    } else if (w.kind === 'respin') {
      const alt = whatIfFinish(squad, shape, { liftWeakest: true });
      if (alt.points !== w.pointsTo || alt.tablePosition !== w.finishTo) fail(`seed ${seed}: the respin line says ${w.finishTo}th on ${w.pointsTo}, the replay says ${alt.tablePosition}th on ${alt.points}`);
      if (w.finishTo === w.finishFrom && w.pointsTo === w.pointsFrom) fail(`seed ${seed}: a respin what-if that moved nothing`);
    } else if (w.kind === 'none') {
      const lift = whatIfFinish(squad, shape, { liftWeakest: true });
      if (lift.points !== r.points || lift.tablePosition !== r.tablePosition) fail(`seed ${seed}: the line says nothing moves, lifting the weakest slot moves it to ${lift.tablePosition}th on ${lift.points}`);
      if (w.finishTo !== w.finishFrom || w.pointsTo !== w.pointsFrom) fail(`seed ${seed}: a none what-if with a delta`);
    } else fail(`seed ${seed}: unknown what-if kind ${w.kind}`);
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
    if (!/^What would have changed: /.test(w.line)) fail(`seed ${seed}: the what-if line does not start the way the page expects`);
    if (!/Same dice, no promises\.$/.test(w.line)) fail(`seed ${seed}: the what-if line reads as a certainty: "${w.line.slice(-80)}"`);
    const held = w.line.match(/from (\d+(?:st|nd|rd|th)) to (\d+(?:st|nd|rd|th))/g)?.find(m => /from (\S+) to \1$/.test(m));
    if (held) fail(`seed ${seed}: the what-if says "${held}", a place that did not move`);
    if (/right call/.test(w.line) && shape !== '4-3-3') fail(`seed ${seed}: a ${shape} with two men out of position is called the right call`);
  }
  console.log(`   ${checked} what-ifs (${offShape} of them in a 3-5-2 two of the eleven do not fit): ${kinds.formation} shape, ${kinds.respin} respin, ${kinds.none} none`);
  if (shapeGains) fail(`${shapeGains} shape alternative(s) gained points on the same rolls`);
  if (liftLosses) fail(`${liftLosses} lifted slot(s) lost points on the same rolls`);
  if (kinds.formation + kinds.respin === 0) fail('no what-if ever moved the finish, so the line never says anything');
}

/* ---------- 4) nobody real speaks ---------- */
console.log('4) no squad member speaks a line');
{
  let lines = 0, named = 0;
  for (let k = 1; k <= SEEDS; k++) {
    const seed = BASE + k;
    const squad = mixed(seed);
    const r = simulate(squad, '4-3-3');
    const moments = (r.months ?? []).map(m => m.moment);
    const awardLines = [r.awards?.goalOfSeason?.line].filter(Boolean);
    const all = [...r.narrative, ...moments, ...awardLines, r.whatIf?.line].filter(Boolean);
    for (const line of all) {
      lines += 1;
      for (const p of squad) {
        if (!line.includes(p.name)) continue;
        named += 1;
        if (new RegExp(`${esc(p.name)}\\s*[:"'“”‘’]`).test(line)) fail(`seed ${seed}: a name before a colon or quote mark: "${line.slice(0, 90)}"`);
        if (new RegExp(`${esc(p.name)}${SPEAKS.source}`).test(line)) fail(`seed ${seed}: a name with a speech verb: "${line.slice(0, 90)}"`);
      }
    }
    for (const m of moments) {
      const who = squad.find(p => m.includes(p.name));
      if (who) fail(`seed ${seed}: a month's moment names ${who.name}: "${m.slice(0, 90)}"`);
    }
  }
  console.log(`   ${lines} lines, ${named} naming a squad member (as a result, never as a speaker)`);
  if (lines === 0) fail('no lines at all, so this section measured nothing');
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
  try { oldHtml = quiet(() => render(old, null)); } catch (e) { fail(`an old report threw in SeasonReportTabs: ${String(e.message).slice(0, 120)}`); }
  if (oldHtml !== null && oldHtml !== '') fail(`an old report rendered ${oldHtml.length} characters where nothing was expected`);
  else if (oldHtml === '') console.log('   an old report renders to nothing, no throw');
  const closed = quiet(() => render(fresh, null));
  if (!closed.includes('Month by month') || !closed.includes('Player stats')) fail('a new report does not offer both toggles');
  if (closed.includes('August')) fail('the months panel is open before anyone tapped it');
  const monthsHtml = quiet(() => render(fresh, 'months'));
  for (const m of fresh.months) {
    if (!monthsHtml.includes(m.month.slice(0, 3))) fail(`the months panel does not show ${m.month}`);
    if (m.standout && !monthsHtml.includes(m.standout.name)) fail(`the months panel does not show ${m.month}'s standout`);
  }
  const playersHtml = quiet(() => render(fresh, 'players'));
  for (const s of fresh.playerStats) {
    if (!playersHtml.includes(s.name)) fail(`the player panel does not show ${s.name}`);
  }
  console.log(`   new report: ${fresh.months.length} months and ${fresh.playerStats.length} players rendered`);
  const wx = stripComments(read('src/pages/WorldXi.tsx'));
  const lb = stripComments(read('src/pages/LineupBuilder.tsx'));
  if (!/<SeasonReportTabs report=\{seasonReport\}/.test(wx)) fail('World XI does not mount SeasonReportTabs');
  if (!/<SeasonReportTabs report=\{seasonReport\}/.test(lb)) fail('Build Your XI does not mount SeasonReportTabs');
  if (!/Top scorer: \$\{seasonReport\.topScorer\.name\}/.test(wx) || !/Player of the season: \$\{seasonReport\.playerOfSeason\.name\}/.test(wx)) fail('the World XI share card does not carry the top scorer and the player of the season');
  if (!failures) console.log('   both pages mount the component, and the World XI share card names the top scorer and the player of the season');
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
  if (now.length !== GOLDEN.length) fail(`${now.length} cases against ${GOLDEN.length} golden hashes`);
  const moved = now.map((h, i) => (h === GOLDEN[i] ? null : i)).filter(i => i !== null);
  for (const i of moved) fail(`case ${i} (${cases[i][1]}): the old fields hash to ${now[i]}, the engine before this round gave ${GOLDEN[i]}`);
  console.log(`   ${now.length - moved.length} of ${now.length} seasons print exactly what they printed before (${cases.filter(c => c[1] === '3-5-2').length} of them in a shape two men do not fit)`);
}

await new Promise(r => setTimeout(r, 50));
if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimWorldXiSeasonReport: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimWorldXiSeasonReport: green. The report says a great deal more, every number adds up, and nobody real says a word.');
