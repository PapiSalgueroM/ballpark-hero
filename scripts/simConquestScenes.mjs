/* Round 529: a settled Conquest round plays as scenes, and every scene is the engine's.
 *
 * THE CHANGE. /conquest, /conquest-nba, /conquest-mlb, /conquest-nhl and
 * /soccer-conquest stop showing a settled round as a list of result lines and
 * play it as scenes on the map: the matchup card, the camera, the score at its
 * final value, the takeover wave. The season keeps the owners map after every
 * settled round (run.history) and every settled round (run.rounds), rebuilt on
 * reload from the club plus the calls, so nothing new is saved.
 *
 * The exposure is that a scene shows something the engine did not do: a game
 * that was not played, a score off by one, land moving that did not move, a
 * record book that names the wrong team. Nothing here adds data; it holds the
 * presentation layer to the engine's own log.
 *
 * WHAT IT MEASURES, through the REAL modules (conquestRun, conquestScenes,
 * imperialismEngine) with the five sports the routes inject, over seeded runs
 * played to the end (eight dates per sport through the daily rng, a mixed
 * caller right every third call, exactly as the board plays a daily):
 *   1. THE SCENE LIST IS THE ROUND. For every settled round, buildScenes
 *      returns exactly that round's games in engine order (home, away, winner
 *      and index all match), an out of range index returns nothing, exactly
 *      one scene is the featured one in either orientation, and only it
 *      carries the call and the hit.
 *   2. THE SCORE IS THE ENGINE'S. Every scene's home and away score equal the
 *      engine's for that game, the scene length is the four beats with the
 *      takeover dropped when nothing moved, and the beats sum to 3100.
 *   3. THE TAKEOVER IS EXACTLY WHAT MOVED. Every scene's flipped list equals
 *      the game's, the difference between its before and after maps names
 *      exactly those regions with the loser as the old owner, applying the
 *      scenes in order reproduces the engine's map for the next round, and the
 *      real renderer given the scene's after map and takeover draws overlay
 *      groups naming exactly the flipped regions.
 *   4. THE RECORD BOOK IS RECOMPUTED. seasonRecords for every finished run
 *      equals an independent recomputation written here from history and
 *      rounds (its own loops, not the lib's), for all four keys, and a run
 *      with no settled round gives four empty records in the fixed order.
 *   5. THE TIMELINE IS THE SEASON. history has one map per settled round plus
 *      the opening map, the opening map is the sport's seed, the last map is
 *      the run's owners, no two entries share an object, every mid season
 *      snapshot is a prefix, replayRun over the picks reproduces history and
 *      rounds byte for byte, and the saved daily record is the Round 476
 *      shape with nothing added.
 *   6. THE WHEEL LANDS ON THE ATTACKER. For every featured pairing the wheel's
 *      wedges are the sport's team order in the map's colours with the landing
 *      on the attacker, an unknown attacker lands nowhere, and arrowAngle
 *      answers the four compass cases and stays on [0, 360). The renderer with
 *      none of the Round 529 props draws none of the Round 529 layers.
 *   7 and 8 land with wave 2 (the scene player, the wheel, the timeline, the
 *      strip): see the marked place at the bottom.
 *
 * NEGATIVE CONTROLS (SCENE_CONTROL=...), each rewriting a temp copy of one
 * lib and refusing to run if the rewrite changed nothing. A control run exits
 * 0 only when exactly its own section went red:
 *   extra      buildScenes appends a scene for a game the engine did not play.
 *              Section 1 must go red.
 *   fakescore  every scene carries a home score one above the engine's.
 *              Section 2 must go red.
 *   records    Biggest Land Grab is reported from the second largest swing.
 *              Section 4 must go red.
 *
 * Run: node scripts/simConquestScenes.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
/* The nearest node_modules that really holds react, walking up from the repo
   root: a worktree resolves the main tree's packages the same way node does. */
const NM = (() => {
  let dir = ROOT;
  for (;;) {
    if (fs.existsSync(`${dir}/node_modules/react/package.json`)) return `${dir}/node_modules`;
    const up = path.dirname(dir).replace(/\\/g, '/');
    if (up === dir) { console.error('no node_modules with react found above ' + ROOT); process.exit(1); }
    dir = up;
  }
})();
const CONTROL = process.env.SCENE_CONTROL || '';
const KNOWN_CONTROLS = { extra: '1', fakescore: '2', records: '4' };
if (CONTROL && !(CONTROL in KNOWN_CONTROLS)) {
  console.error(`SCENE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(KNOWN_CONTROLS).join(', ')})`);
  process.exit(1);
}
/* Eight seeded seasons per sport: the daily rng for eight consecutive dates. */
const DATES = Array.from({ length: 8 }, (_, i) => `2026-09-${String(12 + i).padStart(2, '0')}`);
const norm = s => s.replace(/\r\n/g, '\n');
let failures = 0;
const fired = new Set();
const fail = (section, m) => { failures += 1; fired.add(section); console.error('  FAIL: ' + m); };
const refuse = m => { console.error(`control ${CONTROL}: ${m}, refusing to run a dead control`); process.exit(1); };

/* ---------- the libs, copied so a control can rewrite one ----------
   The scene lib and the run lib import their siblings with relative paths,
   so the copies bind to each other and a rewrite in one is what the others
   see. Everything reached through the @ alias stays the real file. */
const LIB = `${TMP}/conquestScenesCtl`;
fs.rmSync(LIB, { recursive: true, force: true });
fs.mkdirSync(LIB, { recursive: true });
const COPIED = ['conquestRun.ts', 'conquestDaily.ts', 'imperialismEngine.ts', 'conquestMomentum.ts', 'conquestMapLook.ts', 'conquestScenes.ts'];
const sources = new Map();
for (const f of COPIED) {
  const src = norm(fs.readFileSync(`${ROOT}/src/lib/${f}`, 'utf8'));
  sources.set(f, src);
  fs.writeFileSync(`${LIB}/${f}`, src);
}
function controlRewrite(file, needle, replacement, what) {
  const src = sources.get(file);
  if (!src.includes(needle)) refuse(`the line to rewrite is not in src/lib/${file} (${needle})`);
  const rewritten = src.split(needle).join(replacement);
  if (rewritten === src) refuse('the rewrite changed nothing');
  fs.writeFileSync(`${LIB}/${file}`, rewritten);
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${what}`);
}
if (CONTROL === 'extra') {
  controlRewrite(
    'conquestScenes.ts',
    '  return scenes;',
    '  return scenes.concat({ ...scenes[0], index: scenes.length, game: { ...scenes[0].game, home: scenes[0].game.away, away: scenes[0].game.home } });',
    'a scene for a game the engine did not play is appended to every round; section 1 must go red',
  );
}
if (CONTROL === 'fakescore') {
  controlRewrite(
    'conquestScenes.ts',
    '      game,',
    '      game: { ...game, homeScore: game.homeScore + 1 },',
    'every scene carries a home score one above the engine\'s; section 2 must go red',
  );
}
if (CONTROL === 'records') {
  controlRewrite(
    'conquestRun.ts',
    'const top = grabs[0];',
    'const top = grabs[1] ?? grabs[0];',
    'Biggest Land Grab is reported from the second largest swing; section 4 must go red',
  );
}

/* ---------- bundle the copies, the real renderer and the five sport specs ----------
   Rendered inside a StaticRouter, the server side router, so a wave 2
   component that carries a Link renders; the in-memory router warns about a
   layout effect on every server render and would bury the output. */
const ENTRY = `${TMP}/conquestScenes.entry.mjs`;
const BUNDLE = `${TMP}/conquestScenes.bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as runlib from '${LIB}/conquestRun.ts';
export * as scenelib from '${LIB}/conquestScenes.ts';
export * as daily from '${LIB}/conquestDaily.ts';
export * as eng from '${LIB}/imperialismEngine.ts';
export * as look from '${LIB}/conquestMapLook.ts';
export * as usSports from '${ROOT}/src/data/conquestSports.ts';
export { SOCCER_IMPERIALISM, SOCCER_CONQUEST_MAP } from '${ROOT}/src/data/soccerConquest.ts';
export { NFL_CONQUEST_MAP } from '${ROOT}/src/data/conquestData.ts';
export { NBA_CONQUEST_MAP } from '${ROOT}/src/data/conquestDataNba.ts';
export { MLB_CONQUEST_MAP } from '${ROOT}/src/data/conquestDataMlb.ts';
export { NHL_CONQUEST_MAP } from '${ROOT}/src/data/conquestDataNhl.ts';
export { default as ConquestRegionMap } from '${ROOT}/src/components/conquest/ConquestRegionMap.tsx';
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
import { StaticRouter } from '${NM}/react-router/dist/development/index.mjs';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(StaticRouter, { location: '/' }, React.createElement(Component, props)));
`);
execSync(`"${NM}/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: NM },
});
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
const mod = createRequire(import.meta.url)(BUNDLE);
const { runlib, scenelib, daily, eng, look, usSports, render, ConquestRegionMap } = mod;

const SPORTS = [
  { sport: usSports.NFL_IMPERIALISM, map: mod.NFL_CONQUEST_MAP },
  { sport: usSports.NBA_IMPERIALISM, map: mod.NBA_CONQUEST_MAP },
  { sport: usSports.MLB_IMPERIALISM, map: mod.MLB_CONQUEST_MAP },
  { sport: usSports.NHL_IMPERIALISM, map: mod.NHL_CONQUEST_MAP },
  { sport: mod.SOCCER_IMPERIALISM, map: mod.SOCCER_CONQUEST_MAP },
];
for (const { sport, map } of SPORTS) {
  if (!sport || !Array.isArray(sport.teams) || !map || !Array.isArray(map.regions) || !Array.isArray(map.teams)) {
    console.error('a sport spec or its map is missing its teams or regions');
    process.exit(1);
  }
}

/* ---------- helpers ---------- */
const canon = o => JSON.stringify(o, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v));
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map(m => {
  const attrs = {};
  for (const a of m[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
  return attrs;
});
const loserOf = g => (g.winner === g.home ? g.away : g.home);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- the board's loop over the real modules ----------
   start, then preview -> playRound -> recap -> continueRun to the end, with
   the invariant history.length === rounds.length + 1 === picks.length + 1
   checked after EVERY transition, not only at settled rounds. */
function playRun(sport, favorite, date, caller) {
  const rng = daily.dailyConquestRng(sport.key, date);
  let run = runlib.startRun(sport, favorite, rng);
  let invariantBreaks = 0;
  const check = r => { if (r.history.length !== r.rounds.length + 1 || r.history.length !== r.picks.length + 1) invariantBreaks += 1; };
  check(run);
  const snaps = [];
  let guard = 0;
  while (run.phase !== 'done') {
    if (guard++ > 400) throw new Error('the season did not end');
    if (run.phase === 'preview') {
      const featured = runlib.featuredPairing(sport, run);
      const call = caller(run, snaps.length, featured);
      run = runlib.playRound(sport, run, call, rng);
      check(run);
      snaps.push({ run, featured, call });
    } else {
      run = runlib.continueRun(sport, run, rng);
      check(run);
    }
  }
  return { run, snaps, invariantBreaks, date, favorite };
}
/* The winner of each featured game, learned from a first play through: the
   results do not depend on the calls, so a caller can be right on purpose. */
function featuredWinners(sport, favorite, date) {
  const first = playRun(sport, favorite, date, (_run, _i, featured) => featured[0]);
  return first.snaps.map(s => runlib.featuredResult(s.run, s.featured)?.winner ?? null);
}

console.log(`Seeded seasons: ${SPORTS.length} sports x ${DATES.length} dates through the daily rng, a mixed caller right every third call`);
const RUNS = new Map(); // sport key -> [{run, snaps, ...}]
{
  let total = 0, settled = 0;
  for (const { sport } of SPORTS) {
    const list = [];
    DATES.forEach((date, i) => {
      const favorite = sport.teams[(3 + i * 7) % sport.teams.length].id;
      const winners = featuredWinners(sport, favorite, date);
      const mixed = (_run, k, featured) => (k % 3 === 0 ? winners[k] : featured.find(id => id !== winners[k]) ?? winners[k]);
      const played = playRun(sport, favorite, date, mixed);
      list.push(played);
      total += 1;
      settled += played.run.rounds.length;
    });
    RUNS.set(sport.key, list);
    const rounds = list.map(p => p.run.rounds.length);
    console.log(`   ${sport.key}: ${list.length} seasons, settled rounds ${rounds.join('/')}, hits ${list.map(p => p.run.hits).join('/')}`);
  }
  console.log(`   ${total} seasons, ${settled} settled rounds in all`);
}

/* ---------- 1: the scene list is the round ---------- */
console.log('1) For every settled round the scene list is exactly that round\'s games in engine order, one of them featured');
{
  let rounds = 0, scenes = 0, lengthOff = 0, wrongGame = 0, outOfRange = 0, featuredCount = 0, featuredWrong = 0, strayCall = 0, wrongHit = 0, hitsSeen = 0, missesSeen = 0;
  for (const { sport } of SPORTS) {
    for (const played of RUNS.get(sport.key)) {
      const { run, snaps } = played;
      if (scenelib.buildScenes(run, run.rounds.length, null, null).length !== 0) outOfRange += 1;
      if (scenelib.buildScenes(run, -1, null, null).length !== 0) outOfRange += 1;
      for (let i = 0; i < run.rounds.length; i++) {
        rounds += 1;
        const { featured, call } = snaps[i];
        const list = scenelib.buildScenes(run, i, featured, call);
        const games = run.rounds[i].games;
        scenes += list.length;
        if (list.length !== games.length) lengthOff += 1;
        games.forEach((g, j) => {
          const s = list[j];
          if (!s || s.index !== j || s.game.home !== g.home || s.game.away !== g.away || s.game.winner !== g.winner) wrongGame += 1;
        });
        const marked = list.filter(s => s.featured);
        if (marked.length !== 1) { featuredWrong += 1; continue; }
        featuredCount += 1;
        const f = marked[0];
        const pairMatches = featured && ((f.game.home === featured[0] && f.game.away === featured[1]) || (f.game.home === featured[1] && f.game.away === featured[0]));
        if (!pairMatches) featuredWrong += 1;
        if (f.call !== call || f.hit !== (call === f.game.winner)) wrongHit += 1;
        if (f.hit) hitsSeen += 1; else missesSeen += 1;
        for (const s of list) if (!s.featured && (s.call !== null || s.hit !== null)) strayCall += 1;
      }
    }
  }
  console.log(`   ${rounds} settled rounds, ${scenes} scenes; ${lengthOff} rounds with a scene count off the game count, ${wrongGame} scenes not the engine's game at that index, ${outOfRange} out of range indexes that returned scenes`);
  console.log(`   ${featuredCount} rounds with exactly one featured scene, ${featuredWrong} with the wrong or no featured scene, ${wrongHit} featured scenes with a wrong call or hit, ${strayCall} other scenes carrying a call or hit; hits ${hitsSeen}, misses ${missesSeen}`);
  if (rounds < 400) fail('1', `only ${rounds} settled rounds, too few to have measured anything`);
  if (scenes < 6000) fail('1', `only ${scenes} scenes were built`);
  if (lengthOff > 0) fail('1', `${lengthOff} rounds built a scene count that is not the game count`);
  if (wrongGame > 0) fail('1', `${wrongGame} scenes did not carry the engine's game at that index`);
  if (outOfRange > 0) fail('1', `${outOfRange} out of range round indexes returned scenes`);
  if (featuredWrong > 0) fail('1', `${featuredWrong} rounds did not mark exactly the featured game`);
  if (wrongHit > 0) fail('1', `${wrongHit} featured scenes carried a call or hit that is not the player's`);
  if (strayCall > 0) fail('1', `${strayCall} non featured scenes carried a call or hit`);
  if (hitsSeen === 0 || missesSeen === 0) fail('1', `hits ${hitsSeen} and misses ${missesSeen}: the mixed caller did not produce both, so the hit flag was not measured both ways`);
}

/* ---------- 2: the score is the engine's, the beats are the beats ---------- */
console.log('2) Every scene\'s score is the engine\'s, and the scene length is the four beats with the takeover dropped when nothing moved');
{
  const T = scenelib.SCENE_TIMINGS;
  const sum = T.card + T.fight + T.score + T.takeover;
  let checked = 0, wrongScore = 0, wrongLength = 0, moved = 0, still = 0;
  for (const { sport } of SPORTS) {
    for (const { run, snaps } of RUNS.get(sport.key)) {
      for (let i = 0; i < run.rounds.length; i++) {
        const list = scenelib.buildScenes(run, i, snaps[i].featured, snaps[i].call);
        run.rounds[i].games.forEach((g, j) => {
          const s = list[j];
          if (!s) return;
          checked += 1;
          if (s.game.homeScore !== g.homeScore || s.game.awayScore !== g.awayScore) wrongScore += 1;
          const want = T.card + T.fight + T.score + (g.flipped.length > 0 ? T.takeover : 0);
          if (scenelib.sceneDurationMs(s) !== want) wrongLength += 1;
          if (g.flipped.length > 0) moved += 1; else still += 1;
        });
      }
    }
  }
  console.log(`   ${checked} scenes: ${wrongScore} with a score off the engine's, ${wrongLength} with a length off the beats; ${moved} moved land, ${still} moved nothing; beats ${T.card}+${T.fight}+${T.score}+${T.takeover}=${sum}, wheel ${scenelib.WHEEL_SPIN_MS}ms`);
  if (checked < 6000) fail('2', `only ${checked} scenes checked`);
  if (wrongScore > 0) fail('2', `${wrongScore} scenes carried a score that is not the engine's`);
  if (wrongLength > 0) fail('2', `${wrongLength} scenes had a length that is not the beats`);
  if (moved === 0 || still === 0) fail('2', `moved ${moved}, still ${still}: both branches of the takeover beat were not exercised`);
  if (sum !== 3100) fail('2', `the beats sum to ${sum}, not 3100`);
}

/* ---------- 3: the takeover is exactly what moved ---------- */
console.log('3) Every scene flips exactly the regions its game flipped, the scenes chain back to the engine\'s map, and the renderer marks exactly those regions');
{
  let checked = 0, wrongFlipped = 0, wrongDiff = 0, wrongChain = 0, wrongAfter = 0, wrongClose = 0, rendered = 0, wrongOverlay = 0;
  for (const { sport, map } of SPORTS) {
    RUNS.get(sport.key).forEach(({ run, snaps }, seedIndex) => {
      for (let i = 0; i < run.rounds.length; i++) {
        const list = scenelib.buildScenes(run, i, snaps[i].featured, snaps[i].call);
        const games = run.rounds[i].games;
        /* The independent recomputation: apply each game's flipped regions to
           its winner over a copy of the map the round opened on. */
        let mine = { ...run.history[i] };
        games.forEach((g, j) => {
          const s = list[j];
          if (!s) return;
          checked += 1;
          if (s.flipped.join('|') !== g.flipped.join('|')) wrongFlipped += 1;
          const from = look.diffOwners(s.before, s.after);
          const keys = Object.keys(from).sort();
          if (keys.join('|') !== [...g.flipped].sort().join('|') || keys.some(r => from[r] !== loserOf(g))) wrongDiff += 1;
          if (j === 0 ? canon(s.before) !== canon(run.history[i]) : canon(s.before) !== canon(list[j - 1].after)) wrongChain += 1;
          for (const r of g.flipped) mine[r] = g.winner;
          if (canon(s.after) !== canon(mine)) wrongAfter += 1;
          /* The real renderer, on the first season of each sport only. */
          if (seedIndex === 0 && g.flipped.length > 0) {
            rendered += 1;
            const html = render(ConquestRegionMap, { sport: map, owners: s.after, takeover: { key: j + 1, from } });
            const marked = tags(html, 'g').filter(x => x['data-layer'] === 'takeover').map(x => x['data-region']).sort();
            if (marked.join('|') !== keys.join('|')) wrongOverlay += 1;
          }
        });
        const closing = list[games.length - 1];
        if (!closing || canon(closing.after) !== canon(run.history[i + 1])) wrongClose += 1;
      }
    });
  }
  console.log(`   ${checked} scenes: ${wrongFlipped} flipped lists off the game's, ${wrongDiff} before/after diffs not naming exactly those regions with the loser as old owner, ${wrongChain} scenes not opening on the previous scene's map, ${wrongAfter} after maps off the independent recomputation, ${wrongClose} rounds whose last scene does not close on the engine's next map`);
  console.log(`   ${rendered} scenes with land moving rendered through the real map, ${wrongOverlay} overlays naming a different region set`);
  if (checked < 6000) fail('3', `only ${checked} scenes checked`);
  if (wrongFlipped > 0) fail('3', `${wrongFlipped} scenes carried a flipped list that is not the game's`);
  if (wrongDiff > 0) fail('3', `${wrongDiff} scenes moved a different region set than the game`);
  if (wrongChain > 0) fail('3', `${wrongChain} scenes did not open on the previous scene's map`);
  if (wrongAfter > 0) fail('3', `${wrongAfter} scenes closed on a map the independent recomputation disagrees with`);
  if (wrongClose > 0) fail('3', `${wrongClose} rounds did not close on the engine's map for the next round`);
  if (rendered < 300) fail('3', `only ${rendered} scenes with land moving were rendered`);
  if (wrongOverlay > 0) fail('3', `${wrongOverlay} rendered takeovers marked a different region set than the scene flipped`);
}

/* ---------- 4: the record book is recomputed ---------- */
console.log('4) The four season records equal an independent recomputation over history and rounds, every finished run, every sport');
/** Written apart from the lib on purpose: plain loops, strict comparisons, no sort. */
function recomputeRecords(sport, run) {
  const held = (owners, teamId) => { let n = 0; for (const r in owners) if (owners[r] === teamId) n += 1; return n; };
  let landGrab = { teamId: null, value: 0 };
  for (const round of run.rounds) for (const g of round.games) if (g.swing > 0 && g.swing > landGrab.value) landGrab = { teamId: g.winner, value: g.swing };
  const leaderOf = owners => {
    const tally = {};
    for (const r in owners) tally[owners[r]] = (tally[owners[r]] || 0) + 1;
    let best = null, max = -1, ties = 0;
    for (const t in tally) { if (tally[t] > max) { max = tally[t]; best = t; ties = 1; } else if (tally[t] === max) ties += 1; }
    return ties === 1 ? best : null;
  };
  let reign = { teamId: null, value: 0 };
  let current = null, length = 0;
  for (let i = 1; i < run.history.length; i++) {
    const leader = leaderOf(run.history[i]);
    if (leader !== null && leader === current) length += 1; else { current = leader; length = leader === null ? 0 : 1; }
    if (leader !== null && length > reign.value) reign = { teamId: leader, value: length };
  }
  const wipeCount = {}, firstWipe = {}, lastWipe = {};
  let collapse = { teamId: null, value: 0 };
  for (let i = 1; i < run.history.length; i++) {
    for (const t of sport.teams) {
      const before = held(run.history[i - 1], t.id);
      if (before > 0 && held(run.history[i], t.id) === 0) {
        wipeCount[t.id] = (wipeCount[t.id] || 0) + 1;
        if (!(t.id in firstWipe)) firstWipe[t.id] = i;
        lastWipe[t.id] = i;
        if (before > collapse.value) collapse = { teamId: t.id, value: before };
      }
    }
  }
  let conquered = { teamId: null, value: 0 };
  for (const t of sport.teams) {
    const n = wipeCount[t.id] || 0;
    if (n === 0) continue;
    if (n > conquered.value || (n === conquered.value && firstWipe[t.id] < firstWipe[conquered.teamId])) conquered = { teamId: t.id, value: n };
  }
  return { landGrab, reign, conquered, collapse, lastWipe };
}
{
  const TITLES = ['Biggest Land Grab', 'Longest Reign', 'Most Conquered', 'Biggest Collapse'];
  const KEYS = ['landGrab', 'reign', 'conquered', 'collapse'];
  let runs = 0, wrongShape = 0, wrong = { landGrab: 0, reign: 0, conquered: 0, collapse: 0 }, named = { landGrab: 0, reign: 0, conquered: 0, collapse: 0 }, badDetail = 0;
  for (const { sport } of SPORTS) {
    for (const { run } of RUNS.get(sport.key)) {
      runs += 1;
      const got = runlib.seasonRecords(sport, run);
      const want = recomputeRecords(sport, run);
      if (got.length !== 4 || got.some((r, i) => r.key !== KEYS[i] || r.title !== TITLES[i])) { wrongShape += 1; continue; }
      for (const r of got) {
        const w = want[r.key];
        if (r.teamId !== w.teamId || r.value !== w.value) wrong[r.key] += 1;
        if (r.teamId !== null) {
          named[r.key] += 1;
          if (!r.detail || !r.detail.includes(eng.teamLabel(sport, r.teamId))) badDetail += 1;
        } else if (r.detail !== '') badDetail += 1;
      }
      /* The round label in the detail must be a real round's label. */
      const labels = new Set(run.rounds.map(x => x.label));
      for (const r of got) if (r.teamId !== null && ![...labels].some(l => r.detail.endsWith(l) || r.detail.includes(`${l} to `) || r.detail.includes(`in ${l}`))) badDetail += 1;
    }
    /* The empty case: a run with no settled round has four empty records. */
    const fresh = runlib.startRun(sport, sport.teams[0].id, daily.dailyConquestRng(sport.key, DATES[0]));
    const empty = runlib.seasonRecords(sport, fresh);
    if (empty.length !== 4 || empty.some((r, i) => r.key !== KEYS[i] || r.title !== TITLES[i] || r.teamId !== null || r.value !== 0 || r.detail !== '')) wrongShape += 1;
  }
  console.log(`   ${runs} finished runs: ${wrongShape} with the wrong keys, titles or order (empty case included), disagreements with the recomputation: landGrab ${wrong.landGrab}, reign ${wrong.reign}, conquered ${wrong.conquered}, collapse ${wrong.collapse}; records naming a team: ${KEYS.map(k => `${k} ${named[k]}`).join(', ')}; ${badDetail} details not naming the team and a real round`);
  if (runs < 20) fail('4', `only ${runs} finished runs`);
  if (wrongShape > 0) fail('4', `${wrongShape} record books did not carry the four fixed keys and titles in order`);
  for (const k of KEYS) {
    if (wrong[k] > 0) fail('4', `${k} disagreed with the independent recomputation on ${wrong[k]} runs`);
    if (named[k] < runs / 2) fail('4', `${k} named a team on only ${named[k]} of ${runs} runs, so the non empty case was barely measured`);
  }
  if (badDetail > 0) fail('4', `${badDetail} record details did not name the team and a real round label`);
}

/* ---------- 5: the timeline is the season, and the saved record did not grow ---------- */
console.log('5) history is one map per settled round plus the opening map, replayRun reproduces it, and the daily record is still the club plus the calls');
{
  let runs = 0, lengthOff = 0, invariantBreaks = 0, wrongOpen = 0, wrongLast = 0, shared = 0, notPrefix = 0, replayOff = 0, recordOff = 0, snapsChecked = 0;
  for (const { sport } of SPORTS) {
    for (const played of RUNS.get(sport.key)) {
      const { run, snaps, date, favorite } = played;
      runs += 1;
      invariantBreaks += played.invariantBreaks;
      if (run.history.length !== run.rounds.length + 1 || run.history.length !== run.picks.length + 1) lengthOff += 1;
      if (canon(run.history[0]) !== canon(sport.seed())) wrongOpen += 1;
      if (canon(run.history[run.history.length - 1]) !== canon(run.owners)) wrongLast += 1;
      if (new Set(run.history).size !== run.history.length) shared += 1;
      snaps.forEach((s, k) => {
        snapsChecked += 1;
        if (canon(s.run.history) !== canon(run.history.slice(0, k + 2)) || canon(s.run.rounds) !== canon(run.rounds.slice(0, k + 1))) notPrefix += 1;
      });
      const replayed = runlib.replayRun(sport, favorite, run.picks, daily.dailyConquestRng(sport.key, date));
      if (canon(replayed.history) !== canon(run.history) || canon(replayed.rounds) !== canon(run.rounds)) replayOff += 1;
      if (JSON.stringify(runlib.dailyRunRecord(run)) !== JSON.stringify({ team: run.favorite, picks: run.picks, done: false, result: null })) recordOff += 1;
    }
  }
  console.log(`   ${runs} runs: ${lengthOff} with history off rounds plus one, ${invariantBreaks} phase transitions that broke the invariant, ${wrongOpen} not opening on the seed, ${wrongLast} not closing on the run's owners, ${shared} sharing an object between entries; ${snapsChecked} mid season snapshots, ${notPrefix} not a prefix of the finished run; ${replayOff} replays not byte identical; ${recordOff} daily records not the Round 476 shape`);
  if (runs < 20) fail('5', `only ${runs} runs`);
  if (lengthOff > 0) fail('5', `${lengthOff} runs ended with history not one longer than rounds and picks`);
  if (invariantBreaks > 0) fail('5', `${invariantBreaks} transitions broke history.length === rounds.length + 1 === picks.length + 1`);
  if (wrongOpen > 0) fail('5', `${wrongOpen} runs did not open on the sport's seed`);
  if (wrongLast > 0) fail('5', `${wrongLast} runs did not close on the run's owners`);
  if (shared > 0) fail('5', `${shared} runs shared an object between history entries`);
  if (snapsChecked < 400) fail('5', `only ${snapsChecked} mid season snapshots`);
  if (notPrefix > 0) fail('5', `${notPrefix} mid season snapshots were not a prefix of the finished history`);
  if (replayOff > 0) fail('5', `${replayOff} replays did not reproduce history and rounds byte for byte`);
  if (recordOff > 0) fail('5', `${recordOff} daily records changed shape, the saved record must stay the club plus the calls`);
}

/* ---------- 6: the wheel lands on the attacker, the arrow points the right way ---------- */
console.log('6) The wheel lands on the featured attacker in the sport\'s team order and the map\'s colours, and arrowAngle answers the compass');
{
  let pairings = 0, wrongOrder = 0, wrongLanding = 0, wrongColour = 0, unknownLanded = 0;
  for (const { sport, map } of SPORTS) {
    const order = sport.teams.map(t => t.id).join('|');
    const colours = new Map(map.teams.map(t => [t.id, t.color]));
    for (const { snaps } of RUNS.get(sport.key)) {
      for (const { featured } of snaps) {
        if (!featured) continue;
        pairings += 1;
        const spec = scenelib.wheelSpec(sport, map, featured[0]);
        if (spec.wedges.map(w => w.teamId).join('|') !== order) wrongOrder += 1;
        if (spec.landingIndex < 0 || spec.wedges[spec.landingIndex]?.teamId !== featured[0]) wrongLanding += 1;
        if (spec.wedges.some(w => w.color !== (colours.get(w.teamId) ?? look.UNCLAIMED_COLOR) || w.name !== sport.teams.find(t => t.id === w.teamId).name)) wrongColour += 1;
      }
    }
    if (scenelib.wheelSpec(sport, map, 'nobody-of-this-sport').landingIndex !== -1) unknownLanded += 1;
  }
  const compass = [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, 0],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, 90],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, 180],
    [{ x: 0, y: 0 }, { x: 0, y: -1 }, 270],
    [{ x: 5, y: 5 }, { x: 5, y: 5 }, 0],
  ];
  const compassWrong = compass.filter(([a, b, want]) => Math.abs(scenelib.arrowAngle(a, b) - want) > 1e-9).length;
  const rng = mulberry32(529);
  let outOfRange = 0;
  for (let i = 0; i < 200; i++) {
    const deg = scenelib.arrowAngle({ x: rng() * 1000 - 500, y: rng() * 1000 - 500 }, { x: rng() * 1000 - 500, y: rng() * 1000 - 500 });
    if (!(deg >= 0 && deg < 360) || !Number.isFinite(deg)) outOfRange += 1;
  }
  console.log(`   ${pairings} featured pairings: ${wrongOrder} wheels not in the sport's team order, ${wrongLanding} not landing on the attacker, ${wrongColour} with a wedge off the map's colour or name; ${unknownLanded} unknown attackers that landed; compass cases wrong ${compassWrong} of ${compass.length}, random arrows off [0, 360): ${outOfRange} of 200`);
  if (pairings < 400) fail('6', `only ${pairings} featured pairings`);
  if (wrongOrder > 0) fail('6', `${wrongOrder} wheels were not the sport's team order`);
  if (wrongLanding > 0) fail('6', `${wrongLanding} wheels did not land on the attacker`);
  if (wrongColour > 0) fail('6', `${wrongColour} wheels carried a wedge in the wrong colour or name`);
  if (unknownLanded > 0) fail('6', 'an attacker the sport does not have landed on a wedge');
  if (compassWrong > 0) fail('6', `${compassWrong} compass cases came back wrong`);
  if (outOfRange > 0) fail('6', `${outOfRange} arrows left [0, 360)`);

  /* The renderer with none of the Round 529 props draws none of the Round 529
     layers: this is the baseline the camera, home ring, highlight, caps and
     stage checks compare against. */
  let plainRenders = 0, leaked = 0;
  for (const { sport, map } of SPORTS) {
    const html = render(ConquestRegionMap, { sport: map, owners: RUNS.get(sport.key)[0].run.history[0] });
    plainRenders += 1;
    const layers = [...tags(html, 'g'), ...tags(html, 'circle'), ...tags(html, 'path')].map(x => x['data-layer']);
    if (layers.some(l => l === 'camera' || l === 'home' || l === 'highlight')) leaked += 1;
    const root = tags(html, 'svg')[0] || {};
    if ('data-size' in root || 'data-label-style' in root) leaked += 1;
  }
  console.log(`   ${plainRenders} maps rendered with none of the Round 529 props, ${leaked} drew a camera, home or highlight layer or carried a size or label style attribute`);
  if (plainRenders < SPORTS.length) fail('6', 'not every sport rendered the plain map');
  if (leaked > 0) fail('6', `${leaked} plain renders carried a Round 529 layer or attribute without the prop`);

  /* WAVE 1 RENDERER, LANDS WITH THE ConquestRegionMap PROPS (focusRegions,
     homeRegions, highlightTeam, labelStyle, size): rendering the map with
     focusRegions set to the two empires' regions yields one camera group with
     a transform and data-camera-scale on [1, 2.6]; homeRegions yields one home
     circle per team with a drawn region; highlightTeam rings exactly that
     team's regions; labelStyle caps renders every label as its uppercase and
     no label under 5.5 units; size stage drops the border classes. */
}

/* ---------- 7 and 8: WAVE 2, NOT YET MEASURED ----------
   7. Reduced motion and the score element. useScenePlayer with initialCursor
      at each beat: the rendered player mounts data-scene-score only at beats
      score and takeover, with text equal to the engine's score; with
      reducedMotion true the cursor after play() is the last scene at beat
      done; the rendered style of the map under reduced motion carries the
      .cq-camera transform none rule and every .cq-* animation is stilled; the
      timeline and the strip render one chip per team with the favourite first.
   8. Source scan. In src/components/conquest, comments stripped first, the
      scene card, wheel and timeline data attributes appear only in
      ConquestScenePlayer.tsx, ConquestWheel.tsx and ConquestTimeline.tsx
      respectively; ImperialismBoardShared.tsx imports all five new components
      and seasonRecords; no other file draws a scene, a wheel or a timeline.
   Add them above this line, numbered 7 and 8, each with a printed count and a
   floor on its sample. */

if (CONTROL) {
  const want = KNOWN_CONTROLS[CONTROL];
  const list = [...fired].sort().join(', ') || 'none';
  console.log(`\ncontrol "${CONTROL}": sections fired: ${list} (expected exactly ${want})`);
  if (fired.has(want) && fired.size === 1) { console.log(`control "${CONTROL}": ${failures} failure(s) fired in section ${want} and nowhere else, the check works`); process.exitCode = 0; }
  else if (!fired.has(want)) { console.error(`control "${CONTROL}": section ${want} stayed green, the check is dead`); process.exitCode = 1; }
  else { console.error(`control "${CONTROL}": other sections went red too, the sections are not independent`); process.exitCode = 1; }
} else {
  console.log(failures === 0 ? '\nALL CONQUEST SCENE CHECKS PASSED' : `\n${failures} FAILURES`);
  process.exitCode = failures === 0 ? 0 : 1;
}
