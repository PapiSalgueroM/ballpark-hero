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
        a forward has no clean sheet column at all.
     2) A stronger eleven finishes higher on average than a weaker one over
        200 seeded seasons a side (BAND, from measurement).
        Measured 2026-10-01 across base seeds 0, 1000, 2000, 3000 and 4000:
          finish gap 7.6, 7.8, 7.5, 7.5, 7.7 places (strong about 1.8th, weak about 9.4th)
          points gap 53.6, 54.2, 53.5, 53.6, 54.1 (strong about 112, weak about 58)
        Floors at half: 3.5 places and 25 points.
     3) The what-if really re-simulates. whatIfFinish with the chosen shape and
        no change returns the season's own finish exactly (delta zero on the
        chosen set up); the reported alternative recomputes to the numbers the
        line prints; a shape alternative never gains points and a lifted slot
        never loses them, because the rolls are the same rolls.
     4) Nobody real speaks. In every line the report prints (narrative, each
        month's moment, the award lines, the what-if line) no squad member's
        name sits immediately before a colon or a quote mark, none is followed
        by a speech verb, and a month's moment carries no squad name at all.
     5) Old reports render. A report stripped of every Round 726 field renders
        SeasonReportTabs to nothing without throwing; a new one renders every
        month and every player; both pages mount the component.
   Negative controls (WORLD_XI_SEASON_CONTROL=...):
     statsum   adds a goal to one player's tally after the team total is read,
               so section 1 must go red.
     speaker   prefixes each month's moment with the standout's name and a
               colon, so section 4 must go red.
     noresim   replaces the shape alternative with a guessed finish instead of
               a replay, so section 3 must go red.
   Each control asserts the line it rewrites exists first and refuses to run
   otherwise. Under a control the harness exits 0 only if something failed.

   Run: node scripts/simWorldXiSeasonReport.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const require = createRequire(import.meta.url);
const CONTROLS = ['statsum', 'speaker', 'noresim'];
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
const POS_GAP_FLOOR = 3.5;
const PTS_GAP_FLOOR = 25;

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
    for (const m of ms) {
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
  const sPos = [], sPts = [], wPos = [], wPts = [];
  for (let k = 1; k <= SIDES; k++) {
    const s = simulate(strong(BASE + k), '4-3-3');
    const w = simulate(weak(BASE + k), '4-3-3');
    sPos.push(s.tablePosition); sPts.push(s.points); wPos.push(w.tablePosition); wPts.push(w.points);
  }
  const posGap = mean(wPos) - mean(sPos);
  const ptsGap = mean(sPts) - mean(wPts);
  console.log(`   strong: ${mean(sPos).toFixed(1)}th, ${mean(sPts).toFixed(1)} points; weak: ${mean(wPos).toFixed(1)}th, ${mean(wPts).toFixed(1)} points over ${SIDES} seasons a side`);
  console.log(`   gaps: ${posGap.toFixed(1)} places, ${ptsGap.toFixed(1)} points (floors ${POS_GAP_FLOOR} and ${PTS_GAP_FLOOR})`);
  if (posGap < POS_GAP_FLOOR) fail(`the strong eleven finishes only ${posGap.toFixed(1)} places above the weak one`);
  if (ptsGap < PTS_GAP_FLOOR) fail(`the strong eleven scores only ${ptsGap.toFixed(1)} more points`);
  if (new Set(sPts).size < 3) fail(`${SIDES} strong squads produced ${new Set(sPts).size} distinct points totals`);
}

/* ---------- 3) the what-if replays the rolls ---------- */
console.log('3) the what-if re-simulates on the same rolls');
{
  const kinds = { formation: 0, respin: 0, none: 0 };
  let shapeGains = 0, liftLosses = 0, checked = 0;
  for (let k = 1; k <= SEEDS; k++) {
    const seed = BASE + k;
    const squad = mixed(seed);
    const r = simulate(squad, '4-3-3');
    const same = whatIfFinish(squad, '4-3-3', { formation: '4-3-3' });
    const none = whatIfFinish(squad, '4-3-3', {});
    if (same.points !== r.points || same.tablePosition !== r.tablePosition) fail(`seed ${seed}: the chosen shape replays to ${same.points} points and ${same.tablePosition}th, the season was ${r.points} and ${r.tablePosition}th`);
    if (none.points !== r.points || none.tablePosition !== r.tablePosition) fail(`seed ${seed}: no change replays to a different season`);
    const w = r.whatIf;
    if (!w) continue;
    checked += 1;
    kinds[w.kind] = (kinds[w.kind] ?? 0) + 1;
    if (w.finishFrom !== r.tablePosition || w.pointsFrom !== r.points) fail(`seed ${seed}: the what-if starts from ${w.finishFrom}/${w.pointsFrom}, the season was ${r.tablePosition}/${r.points}`);
    if (w.kind === 'formation') {
      const alt = whatIfFinish(squad, '4-3-3', { formation: w.alternative });
      if (alt.points !== w.pointsTo || alt.tablePosition !== w.finishTo) fail(`seed ${seed}: the ${w.alternative} line says ${w.finishTo}th on ${w.pointsTo}, the replay says ${alt.tablePosition}th on ${alt.points}`);
      if (w.alternative === '4-3-3') fail(`seed ${seed}: the shape alternative is the chosen shape`);
      if (w.finishTo === w.finishFrom && w.pointsTo === w.pointsFrom) fail(`seed ${seed}: a shape what-if that moved nothing`);
    } else if (w.kind === 'respin') {
      const alt = whatIfFinish(squad, '4-3-3', { liftWeakest: true });
      if (alt.points !== w.pointsTo || alt.tablePosition !== w.finishTo) fail(`seed ${seed}: the respin line says ${w.finishTo}th on ${w.pointsTo}, the replay says ${alt.tablePosition}th on ${alt.points}`);
      if (w.finishTo === w.finishFrom && w.pointsTo === w.pointsFrom) fail(`seed ${seed}: a respin what-if that moved nothing`);
    } else if (w.kind === 'none') {
      const lift = whatIfFinish(squad, '4-3-3', { liftWeakest: true });
      if (lift.points !== r.points || lift.tablePosition !== r.tablePosition) fail(`seed ${seed}: the line says nothing moves, lifting the weakest slot moves it to ${lift.tablePosition}th on ${lift.points}`);
      if (w.finishTo !== w.finishFrom || w.pointsTo !== w.pointsFrom) fail(`seed ${seed}: a none what-if with a delta`);
    } else fail(`seed ${seed}: unknown what-if kind ${w.kind}`);
    /* Monotone by construction: the same rolls under a lower win chance can
       only lose points, under a higher one can only gain. */
    for (const f of ['4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-5-1']) {
      const alt = whatIfFinish(squad, '4-3-3', { formation: f });
      if (alt.points > r.points) shapeGains += 1;
    }
    const lift = whatIfFinish(squad, '4-3-3', { liftWeakest: true });
    if (lift.points < r.points) liftLosses += 1;
    if (!/^What would have changed: /.test(w.line)) fail(`seed ${seed}: the what-if line does not start the way the page expects`);
    if (!/Same dice, no promises\.$/.test(w.line)) fail(`seed ${seed}: the what-if line reads as a certainty: "${w.line.slice(-80)}"`);
  }
  console.log(`   ${checked} what-ifs: ${kinds.formation} shape, ${kinds.respin} respin, ${kinds.none} none`);
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

await new Promise(r => setTimeout(r, 50));
if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimWorldXiSeasonReport: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimWorldXiSeasonReport: green. The report says a great deal more, every number adds up, and nobody real says a word.');
