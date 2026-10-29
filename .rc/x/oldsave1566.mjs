// Reviewer probe for Round 1566 (never committed). Run from the repo root on a runner, after
//   mkdir -p .rc/ob && git archive 5d1198389 src | tar -x -C .rc/ob
// NBA: an old save made by the BASE engine (named rows), deep (one whole season with a draft behind it) and
// stopped at a seed's own point of season two, is loaded on the HEAD (board path: nbaCleanStats; engine path: no
// clean call) and played on; the base plays the same save on. The head must end where the base ends, in the new
// shape, byte for byte (stats converted from the base's), with the same draws, the same readers and the same close.
// NFL: the base recorder and the head recorder fed the same told games of one league, week by week: the saved block
// must be the same bytes, and every reader must say the same thing.
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = path.join(ROOT, '.rc/ob');
const SEEDS = Number(process.env.OS_SEEDS || 24);
const NFL_SEASONS = Number(process.env.OS_NFL || 20);
let fails = 0, checks = 0;
const ok = (label, cond, detail = '') => { checks += 1; if (!cond) { fails += 1; console.log(`FAIL ${label} ${detail}`.slice(0, 400)); } };

async function bundleTree(root, lines, tag) {
  const out = path.join(os.tmpdir(), `r1566-review-${tag}-${process.pid}-${Date.now()}.mjs`);
  await build({
    stdin: { contents: lines.join('\n'), resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: root, logLevel: 'error',
    alias: { '@': './src' }, jsx: 'automatic', nodePaths: [path.join(ROOT, 'node_modules')],
  });
  return import(pathToFileURL(out).href);
}
const lcg = start => { let seed = start >>> 0; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; };
const counted = (seed, skip = 0) => { const g = lcg(seed); let n = 0; const f = () => { n += 1; return g(); }; for (let i = 0; i < skip; i += 1) f(); f.count = () => n; return f; };
const clone = v => JSON.parse(JSON.stringify(v));
/** Ids renamed by first appearance, so leagues whose bundles minted with different epochs can be compared. */
const renameIds = text => { const m = new Map(); return text.replace(/"n[0-9a-z]{2,14}-\d+"/g, id => { if (!m.has(id)) m.set(id, `"#${m.size}"`); return m.get(id); }); };

const NBA_LINES = ["export * as nba from './src/lib/nbaFrontOffice.ts';", "export * as st from './src/lib/nbaSeasonStats.ts';"];
const H = await bundleTree(ROOT, NBA_LINES, 'nba-head');
const B = await bundleTree(BASE, NBA_LINES, 'nba-base');
ok('the base bundle is the base (no foStatsCodec export there)', typeof B.st.nbaCleanStats !== 'function' && typeof H.st.nbaCleanStats === 'function');

function tip(N, lg, me, rng) {
  while (lg.teams[me].players.length > 15) {
    const worst = [...lg.teams[me].players].sort((a, b) => a.ovr - b.ovr)[0];
    if (!N.nba.nbaRelease(lg.teams[me], lg.freeAgents, worst.id)) break;
  }
  N.nba.nbaTipOff(lg, rng, me);
}
/** Rounds until the league stands at `stop` (the board's loop: round r played, then the round moves on). */
function playTo(N, lg, me, rng, stop) { while (lg.round < stop) { N.nba.simRound(lg, me, rng); lg.round += 1; } }
function finishRegular(N, lg, me, rng) { playTo(N, lg, me, rng, N.nba.NBA_ROUNDS); N.nba.simRound(lg, me, rng); }
function close(N, lg, rng) {
  const po = N.nba.runNbaPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: po.champion });
  N.nba.nbaAssessTax(lg);
  return N.st.nbaCloseSeasonStats(lg);
}
function draftAndSummer(N, lg, me, rng) {
  let remaining = N.nba.nbaDraftClass(rng, 24, new Set());
  const signing = N.nba.nbaDraftSigning(lg);
  for (let k = 0; k < 2; k += 1) {
    lg.teams[me].players.push(N.nba.nbaProspectToPlayer(remaining[0], rng, signing));
    remaining = remaining.slice(1);
    const ai = remaining.slice(0, 5);
    const order = N.nba.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== me);
    ai.forEach((p, i) => { lg.teams[order[i % order.length]].players.push(N.nba.nbaProspectToPlayer(p, rng, signing)); });
    remaining = remaining.filter(p => !ai.includes(p));
  }
  N.nba.nbaOffseason(lg, rng, me);
}
const reads = (N, L) => JSON.stringify([N.st.nbaLeaders(L), Object.keys(L.teams).map(t => N.st.nbaTeamLines(L, t)), N.st.nbaSeasonAwards(L)]);
const noStats = L => { const c = clone(L); delete c.stats; return JSON.stringify(c); };

const STOPS = ['mid', 'regular-end', 'recap', 'mid-early'];
const tally = { converted: 0, kept: 0, dropped: 0, none: 0 };
for (let seed = 1; seed <= SEEDS; seed += 1) {
  const kind = STOPS[seed % 4];
  const lg = B.nba.initNbaLeague(lcg(seed * 104729 + 1));
  const me = Object.keys(lg.teams)[seed % 30];
  const rng = counted(seed * 7919 + 17);
  tip(B, lg, me, rng); finishRegular(B, lg, me, rng); close(B, lg, rng); draftAndSummer(B, lg, me, rng);
  tip(B, lg, me, rng);
  const stopRound = kind === 'mid' ? 2 + (seed % 17) : kind === 'mid-early' ? 1 : null;
  let baseClosed = null;
  if (stopRound !== null) playTo(B, lg, me, rng, stopRound);
  else { finishRegular(B, lg, me, rng); if (kind === 'recap') baseClosed = close(B, lg, rng); }
  const oldText = JSON.stringify(lg);
  const drawn = rng.count();
  ok(`seed ${seed} ${kind}: the old save keeps named rows`, !!lg.stats && !!lg.stats.teams && !lg.stats.clubs);
  // the base plays its own save on
  if (stopRound !== null) finishRegular(B, lg, me, rng);
  const baseRegular = { stats: clone(lg.stats), reads: reads(B, lg) };
  if (kind !== 'recap') baseClosed = close(B, lg, rng);
  const baseAfterClose = { league: noStats(lg), draws: rng.count(), reads: reads(B, lg) };
  draftAndSummer(B, lg, me, rng);
  const baseSummer = { league: renameIds(noStats(lg)), draws: rng.count() };
  // the head loads the same save, the board's way (A) and the engine's way (B)
  for (const pathName of ['board', 'engine']) {
    const L = JSON.parse(oldText);
    const hr = counted(seed * 7919 + 17, drawn);
    if (pathName === 'board') { const did = H.st.nbaCleanStats(L); tally[did] += 1; ok(`seed ${seed} ${kind} board: converted`, did === 'converted', did); }
    if (stopRound !== null) finishRegular(H, L, me, hr);
    const want = { stats: clone(baseRegular.stats) };
    H.st.nbaCleanStats(want);
    if (kind !== 'recap') {
      ok(`seed ${seed} ${kind} ${pathName}: the block after the regular season is the base's, converted, byte for byte`, JSON.stringify(L.stats) === JSON.stringify(want.stats));
      ok(`seed ${seed} ${kind} ${pathName}: leaders, club lines and awards read what the base read`, reads(H, L) === baseRegular.reads);
    }
    const headClosed = kind === 'recap' ? H.st.nbaCloseSeasonStats(L) : close(H, L, hr);
    ok(`seed ${seed} ${kind} ${pathName}: the close names what the base named`, JSON.stringify(headClosed) === JSON.stringify(baseClosed));
    ok(`seed ${seed} ${kind} ${pathName}: the league after the close is the base's (block aside)`, noStats(L) === baseAfterClose.league);
    ok(`seed ${seed} ${kind} ${pathName}: the same draws`, hr.count() === baseAfterClose.draws, `${hr.count()} vs ${baseAfterClose.draws}`);
    ok(`seed ${seed} ${kind} ${pathName}: the recap reads what the base's recap read`, reads(H, L) === baseAfterClose.reads);
    ok(`seed ${seed} ${kind} ${pathName}: the block is the shared shape`, H.st.nbaCleanStats({ stats: clone(L.stats) }) === 'kept');
    draftAndSummer(H, L, me, hr);
    ok(`seed ${seed} ${kind} ${pathName}: the summer ends where the base's does (ids by first appearance, block aside)`, renameIds(noStats(L)) === baseSummer.league && hr.count() === baseSummer.draws);
    ok(`seed ${seed} ${kind} ${pathName}: the new season opens on the shared empty block`, JSON.stringify(L.stats) === JSON.stringify({ season: L.season, lines: {}, clubs: {} }), JSON.stringify(L.stats).slice(0, 80));
  }
}
console.log(`NBA: ${SEEDS} old saves, tally of the board's conversion ${JSON.stringify(tally)}`);

// ---- NFL: the base recorder and the head recorder, the same told games ----
const { seededGen } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/gmGameDayFleet.mjs')).href);
const NH = await bundleTree(ROOT, [
  "export * as engine from './src/lib/frontOffice.ts';",
  "export { FO_DEPTH } from './src/data/frontOfficeDepth.ts';",
  "export { FO_TEAMS } from './src/data/frontOfficePlayers.ts';",
  "export * as bind from './src/lib/frontOfficeGameDay.ts';",
  "export * as stats from './src/lib/nflSeasonStats.ts';",
  "export * as awards from './src/lib/nflSeasonAwards.ts';",
  "export * as view from './src/lib/nflSeasonView.ts';",
], 'nfl-head');
const NB = await bundleTree(BASE, [
  "export * as stats from './src/lib/nflSeasonStats.ts';",
  "export * as awards from './src/lib/nflSeasonAwards.ts';",
  "export * as view from './src/lib/nflSeasonView.ts';",
], 'nfl-base');
ok('the NFL base bundle is the base (no NFL_CODEC there)', NB.stats.NFL_CODEC === undefined && NH.stats.NFL_CODEC !== undefined);
const withGen = (gen, fn) => { const real = Math.random; Math.random = () => gen.next(); try { return fn(); } finally { Math.random = real; } };
const nflReads = (S, lg) => JSON.stringify([S.view.nflLeaders(lg), Object.keys(lg.teams).sort().map(a => [S.view.nflTeamLines(lg, a), S.view.nflClubKicks(lg, a)]), S.awards.nflSeasonAwards(lg)]);
let weeks = 0, weekBad = 0, sizes = [];
for (let i = 0; i < NFL_SEASONS; i += 1) {
  const kind = i % 2 ? 'deep' : 'fifteen';
  const E = NH.engine, Bd = NH.bind;
  const gen = seededGen(`r1566 review nfl|${kind}|${i}`);
  const user = NH.FO_TEAMS[(i * 7 + (kind === 'deep' ? 11 : 0)) % NH.FO_TEAMS.length].abbr;
  const lg = withGen(gen, () => {
    const league = E.initLeague(Math.random, kind === 'deep' ? { depth: NH.FO_DEPTH, userTeam: user } : {});
    if (kind === 'deep' && E.deepOverLimit(league.teams[user]) > 0) E.cutDownToMax(league.teams[user], league.freeAgents);
    return league;
  });
  let sH, sB;
  const both = (fnH, fnB) => { lg.stats = sH; fnH(); sH = lg.stats; lg.stats = sB; fnB(); sB = lg.stats; };
  for (;;) {
    const told = withGen(gen, () => {
      E.injuryPass(lg.teams, Math.random);
      E.aiWeeklyMoves(lg, user, Math.random);
      const games = lg.schedule[lg.week - 1].map(g => E.simGame(g, lg.teams, Math.random));
      return games.map(g => Bd.nflTell(g, lg.teams, lg.season, Bd.nflWhere(lg.week))).flatMap(t => (t.last ? [t.last] : []));
    });
    both(() => NH.stats.nflRecordWeek(lg, told, user), () => NB.stats.nflRecordWeek(lg, told, user));
    weeks += 1;
    if (JSON.stringify(sH) !== JSON.stringify(sB)) weekBad += 1;
    if (lg.week >= E.REGULAR_WEEKS) break;
    lg.week += 1;
  }
  lg.stats = sH; const rH = nflReads(NH, lg); lg.stats = sB; const rB = nflReads(NB, lg);
  ok(`nfl ${kind} ${i}: every reader after Week 17 says the same on head and base`, rH === rB, `${rH.length} vs ${rB.length}`);
  const { rounds, champion } = withGen(gen, () => E.runPlayoffs(lg.teams, Math.random));
  for (const r of rounds) for (const g of r.games) {
    const t = Bd.nflTell(g, lg.teams, lg.season, r.name);
    if (t.last && (g.home === user || g.away === user)) both(() => NH.stats.nflRecordGame(lg, t.last, user, false), () => NB.stats.nflRecordGame(lg, t.last, user, false));
  }
  lg.champions.push({ season: lg.season, team: champion });
  const lH = clone({ ...lg, stats: sH }), lB = clone({ ...lg, stats: sB });
  const aH = NH.awards.nflCloseSeasonStats(lH), aB = NB.awards.nflCloseSeasonStats(lB);
  sizes.push(JSON.stringify(lH).length);
  ok(`nfl ${kind} ${i}: the closed league is the same bytes on head and base`, JSON.stringify(lH) === JSON.stringify(lB) && JSON.stringify(aH) === JSON.stringify(aB));
  ok(`nfl ${kind} ${i}: the base reads a head save (forward) and the head reads a base save`, NB.stats.readNflStats(sH) !== null && NH.stats.readNflStats(sB) !== null);
}
ok(`nfl: every week's block is the same bytes on head and base (${weeks} weeks)`, weekBad === 0, `${weekBad} weeks differ`);
console.log(`NFL: ${NFL_SEASONS} seasons, ${weeks} weeks recorded on both; closed league sizes ${Math.min(...sizes)} to ${Math.max(...sizes)}`);
console.log(`oldsave1566: ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
