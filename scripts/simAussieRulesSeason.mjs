/**
 * Round 1014 harness: Aussie Rules Manager, the full season (src/lib/aussieRulesLeague.ts).
 *
 * Bundles the REAL engine (which pulls in the v1 match core, leagueCore, the
 * format data and finalsBracket) and drives it with a bot: rest when the
 * matchday 23 is tired (mean fatigue above 45), else train; counter the
 * opponent's read; play the whole match; the list manager drafts.
 *
 * Sections: 0 sources, 1 v1 frozen, 2 calendar, 3 ladder maths, 4 finals,
 * 5 score realism and the long season, 6 strength decides, 7 summer and
 * lists, 8 save, 9 determinism and dice, 10 tiles and routing. Every section
 * prints its counts, so a pass on empty input cannot happen.
 *
 * Controls: AUSSIE_SEASON_CONTROL=<name> patches the BUNDLE (an esbuild onLoad
 * hook, never the source on disk), asserts its anchor occurs exactly once and
 * that the patched code differs, then runs only its target section plus one
 * independent check. A control run ends on "RED as intended" and exits 1;
 * a control that fails to turn its section red exits 3.
 *
 * AUSSIE_SEASON_LONG=1 is the measuring mode: 5 seeds x 40 seasons. Run it
 * detached (it takes several minutes). The bands below came from it.
 *
 * MEASURED 2026-10-05, AUSSIE_SEASON_LONG=1 (5 seeds x 40 seasons, 41,400 home
 * and away games, 2188 s) against the 3 seed x 8 season baseline (4,968 games):
 *   team score 79.95 (seeds 79.54 to 80.23; baseline 80.10), goals 11.67,
 *   behinds 9.93, accuracy 0.5403 (baseline 0.5409), draws 0.77% (baseline
 *   0.72%), mean margin 38.78 (baseline 39.58), late (rounds 18 to 23) over
 *   early (1 to 6) 0.9665 (seeds 0.961 to 0.970; baseline 0.9614). The late
 *   dip is the fresh first rounds: RECOVERY 26 gave 0.974 and 32 gave 0.981
 *   in a 4 seed probe, so v1's 20 stays and the band sits around it.
 *   Paired +10 skill lift in win share 0.139 (sd 0.069, 24 pairs; baseline
 *   0.144, sd 0.064, 8 pairs); the floor 0.05 is 4 standard errors under the
 *   baseline mean. League mean skill at season start 63.3 to 68.6 across 40
 *   seasons, slope -0.031 to 0.013 a season, player spread 10.3 to 10.6
 *   (15 in the generated first season; the 24 season baseline run, seed 61,
 *   dips to 7.4 as draft cohorts converge). Save peak 150,647 chars at 40
 *   seasons, growing 374 to 393 chars a season (history rows only).
 *   Extra time: 16 of 2,200 finals; constructed level finals need 1 block
 *   almost always (the bound of 20 is never reached).
 *   League mean fatigue after each home and away round (section 5, measured
 *   the same day over 5 seeds x 40 seasons): rounds 1 to 6 46.80, rounds 18
 *   to 23 57.37 (seeds 56.34 to 58.35; baseline 56.48). With no between round
 *   recovery (the fatigue control) it reads 78.94, so the band is [50, 63].
 *   Printed, not asserted: the bot's club won 155 of 200 flags (it counters
 *   every read, worth 18 strength points a quarter); AI ladder leaders won
 *   16 to 17.5 of 23 and AI bottom clubs 5.5 to 6.8 in tier probes from +-6
 *   to +-12, against a two sourced real shape of 17 to 19 and 1 to 3.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.AUSSIE_SEASON_CONTROL || '';
const LONG = process.env.AUSSIE_SEASON_LONG === '1';
const started = Date.now();

const LEAGUE = 'src/lib/aussieRulesLeague.ts', V1 = 'src/lib/aussieRulesManager.ts', FORMAT = 'src/lib/aussieRulesFormat.ts', BRACKET = 'src/lib/finalsBracket.ts';
/* [file, anchor, replacement, target section, independent section] */
const CONTROLS = {
  onesource: [FORMAT, "'aflwildcard', 'abcwildcard'),", "'aflwildcard'),", 0, 2],
  v1drift: [V1, 'minutes = 20)', 'minutes = 19)', 1, 0],
  schedule: [LEAGUE, 'roundRobinCalendar(CLUB_COUNT).slice(0, ROUNDS * (CLUB_COUNT / 2))', 'roundRobinCalendar(CLUB_COUNT).slice(0, (ROUNDS - 1) * (CLUB_COUNT / 2))', 2, 0],
  winpoints: [V1, 'row.wins += 1; row.points += 4;', 'row.wins += 1; row.points += 3;', 3, 2],
  drawpoints: [V1, 'row.draws += 1; row.points += 2;', 'row.draws += 1; row.points += 1;', 3, 2],
  percentage: [V1, 'row.percentage = row.pointsAgainst ? row.pointsFor / row.pointsAgainst * 100 : row.pointsFor ? 100 : 0;', 'row.percentage = row.pointsFor - row.pointsAgainst;', 3, 2],
  lexical: [LEAGUE, "id: `club-${String(index).padStart(2, '0')}`", 'id: `club-${index}`', 3, 0],
  crossover: [FORMAT, "home: { loserOf: 'QF1' }, away: { winnerOf: 'EF1' } }", "home: { loserOf: 'QF1' }, away: { winnerOf: 'EF2' } }", 4, 2],
  doublechance: [FORMAT, "{ id: 'SF1', week: offset + 1, home: { loserOf: 'QF1' }", "{ id: 'SF1', week: offset + 1, home: { loserOf: 'EF2' }", 4, 2],
  seven: [FORMAT, 'qualifiers: 10,', 'qualifiers: 7,', 4, 2],
  noextratime: [LEAGUE, 'if (match.homeScore.total !== match.awayScore.total) return { ...result, extraTime: false, blocks: 0 };', 'if (true) return { ...result, extraTime: false, blocks: 0 };', 4, 2],
  behind: [V1, 'total: goals * 6 + behinds', 'total: goals * 5 + behinds', 5, 2],
  accuracy: [V1, 'const goal = accuracy < clamp(0.42 + value * 0.002, 0.3, 0.7);', 'const goal = accuracy < clamp(0.52 + value * 0.002, 0.3, 0.7);', 5, 2],
  fatigue: [LEAGUE, 'fatigue: Math.max(0, player.fatigue - RECOVERY)', 'fatigue: player.fatigue', 5, 2],
  nostrength: [V1, 'return player.skill * (1 - player.fatigue * 0.0045) + player.prep;', 'return 60;', 6, 2],
  growthcap: [LEAGUE, 'raiseWithinPotential(player.skill, player.potential, change)', 'Math.min(99, player.skill + change)', 7, 2],
  rolefloor: [LEAGUE, 'if (needed.length) return bestOf(needed);', 'if (false) return bestOf(needed);', 7, 2],
  listfill: [LEAGUE, 'LIST_SIZE - club.players.length]));', 'LIST_SIZE - 1 - club.players.length]));', 7, 2],
  trustlist: [LEAGUE, 'club.players.length === LIST_SIZE && ROLES.every(role => roleDeficits(club)[role] === 0)', 'club.players.length >= LIST_SIZE && ROLES.every(role => roleDeficits(club)[role] === 0)', 8, 2],
  size: [LEAGUE, 'clubs, week: 0, results: [], goals: {}', 'clubs, week: 0, results: state.results, goals: {}', 8, 2],
  samedice: [LEAGUE, 'hashLabel(`${seed}|${season}`)', 'hashLabel(`${seed}`)', 9, 2],
  v2matchday: [LEAGUE, 'automaticLineup({ ...club, players: club.players.filter(player => squad.includes(player.id)) }).starters', 'automaticLineup(club).starters', 9, 2],
  tileround: [LEAGUE, 'value: `Round ${state.round + 1} of ${ROUNDS}`', 'value: `Round ${state.round} of ${ROUNDS}`', 10, 2],
  legacylost: [LEAGUE, "return legacy && legacy.state.phase !== 'complete' ? 'legacy' : 'menu';", "return 'menu';", 10, 2],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const ONLY = process.env.AUSSIE_SEASON_ONLY || ''; // e.g. "7,8" while iterating; a gate run never sets it
const RUN = CONTROL ? new Set([CONTROLS[CONTROL][3], CONTROLS[CONTROL][4]]) : ONLY ? new Set(ONLY.split(',').map(Number)) : new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

const readSrc = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
let patched = false;
const mutate = {
  name: 'aussie-season-control',
  setup(build) {
    build.onLoad({ filter: /(aussieRulesLeague|aussieRulesManager|aussieRulesFormat|finalsBracket)\.ts$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      let src = readSrc(rel);
      const c = CONTROL && CONTROLS[CONTROL];
      if (c && c[0] === rel) {
        const count = src.split(c[1]).length - 1;
        if (count !== 1) { console.error(`control ${CONTROL} cannot run: anchor occurs ${count} times in ${rel}`); process.exit(2); }
        const next = src.replace(c[1], c[2]);
        if (next === src) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
        src = next; patched = true;
      }
      return { contents: src, loader: 'ts' };
    });
  },
};
const esbuild = await import('esbuild');
const BUNDLE = path.join(os.tmpdir(), `simAussieRulesSeason-${process.pid}-${Date.now()}.mjs`);
await esbuild.build({
  stdin: { contents: [
    "export * from './src/lib/aussieRulesLeague.ts';",
    "export * as V1 from './src/lib/aussieRulesManager.ts';",
    "export * as FMT from './src/lib/aussieRulesFormat.ts';",
    "export * as BR from './src/lib/finalsBracket.ts';",
  ].join('\n'), resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', plugins: [mutate],
});
const L = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(BUNDLE, { force: true });
if (CONTROL && !patched) { console.error(`control ${CONTROL}: the anchor's file was never bundled`); process.exit(2); }

const failures = new Map();
let section = -1;
const fail = m => { failures.set(section, (failures.get(section) || 0) + 1); console.error(`  FAIL [${section}]: ${m}`); };
const ok = m => console.log(`  ok: ${m}`);
const check = (cond, m) => (cond ? ok(m) : fail(m));
const head = (n, title) => { section = n; console.log(`\n${n}. ${title}`); };

/* ---------- the bot and the runs ---------- */
/* An engine throw ends that career and is recorded here; every section that plays careers fails on one. */
const crashes = [];
const noCrash = () => check(crashes.length === 0, `no career crashed (${crashes.length}${crashes.length ? `, first: ${crashes[0]}` : ""})`);
const COUNTER = { direct: 'control', pressure: 'direct', control: 'pressure' };
function botAction(s) {
  if (s.phase === 'prepare') {
    if (!s.match) return { type: 'simWeek' };
    const club = L.clubOf(s, s.myClub);
    const ids = new Set([...s.starters, ...s.bench]);
    const tired = club.players.filter(p => ids.has(p.id)).reduce((sum, p) => sum + p.fatigue, 0) / 23;
    return { type: 'prepare', choice: tired > 45 ? 'rest' : 'train' };
  }
  if (s.phase === 'quarter' || s.phase === 'break') {
    const other = s.match.homeId === s.myClub ? s.match.awayId : s.match.homeId;
    return { type: 'playMatch', tactic: COUNTER[L.clubOf(s, other).style] };
  }
  if (s.phase === 'draft' && s.draft.at < s.draft.order.length) return { type: 'draftAuto' };
  return { type: 'next' };
}
/* Plays a career for `seasons` seasons and records what every section needs. */
function runCareer(seed, clubId, seasons, opts = {}) {
  let s = L.createLeague(seed, clubId);
  if (opts.tweak) s = opts.tweak(s);
  const out = { seed, clubId, seasons: [], steps: 0, sizes: [], tiles: [], states: opts.keepStates ? [] : null, myMatches: [] };
  let current = { start: s, rounds: [], fatigue: [], lastHomeAway: null, closed: null, preSummer: null, postSummer: null, draftDone: null };
  while (s.season <= seasons && out.steps < 200000) {
    out.steps += 1;
    if (opts.onStep) opts.onStep(s);
    const action = botAction(s);
    let next;
    try { next = L.reduceLeague(s, action); } catch (e) { out.crash = `${s.phase}/${s.stage} season ${s.season} round ${s.round + 1}: ${String(e).slice(0, 90)}`; crashes.push(`seed ${seed} ${clubId}: ${out.crash}`); break; }
    if (next === s) { out.stuck = `${s.phase}/${s.stage}/${action.type}`; break; }
    if (s.phase === 'report' && s.stage === 'homeAway') current.rounds.push(s.results.length);
    if (next.phase === 'report' && next.match) out.myMatches.push(next.match);
    if (next.phase === 'report' && next.stage === 'homeAway' && next.round === L.ROUNDS - 1) current.lastHomeAway = next;
    if (next.phase === 'seasonOver') current.closed = next;
    if (next.phase === 'summer') { current.preSummer = s; current.postSummer = next; }
    if (next.phase === 'report' && next.stage === 'homeAway') current.fatigue.push(mean(next.clubs.flatMap(c => c.players.map(p => p.fatigue))));
    if (s.phase === 'draft' && next.phase === 'prepare') { current.draftDone = s; out.seasons.push(current); current = { start: next, rounds: [], fatigue: [] }; }
    s = next;
  }
  out.final = s;
  return out;
}
/* The harness's OWN ladder: no engine code. Order: points, percentage, club index in CLUBS. */
function ownLadder(results, clubIds) {
  const rows = new Map(clubIds.map((id, index) => [id, { id, index, p: 0, w: 0, d: 0, l: 0, pts: 0, pf: 0, pa: 0 }]));
  for (const m of results) {
    for (const [id, own, other] of [[m.homeId, m.homeScore, m.awayScore], [m.awayId, m.awayScore, m.homeScore]]) {
      const row = rows.get(id);
      const a = own.goals * 6 + own.behinds, b = other.goals * 6 + other.behinds;
      row.p += 1; row.pf += a; row.pa += b;
      if (a > b) { row.w += 1; row.pts += 4; } else if (a === b) { row.d += 1; row.pts += 2; } else row.l += 1;
    }
  }
  const list = [...rows.values()].map(r => ({ ...r, pct: r.pa ? r.pf / r.pa * 100 : r.pf ? 100 : 0 }));
  return list.sort((x, y) => y.pts - x.pts || y.pct - x.pct || x.index - y.index);
}
/* The 2026 bracket, hard coded here from the receipts (AFL.com.au and ABC, 2025-11-10), never imported. */
function expectedPairs(seeds, won) {
  const w = id => won[id]?.winner, l = id => won[id]?.loser;
  const wc = [w('WC1'), w('WC2')].sort((a, b) => seeds.indexOf(a) - seeds.indexOf(b));
  return {
    WC1: [seeds[6], seeds[9]], WC2: [seeds[7], seeds[8]],
    QF1: [seeds[0], seeds[3]], QF2: [seeds[1], seeds[2]], EF1: [seeds[4], wc[1]], EF2: [seeds[5], wc[0]],
    SF1: [l('QF1'), w('EF1')], SF2: [l('QF2'), w('EF2')], PF1: [w('QF1'), w('SF2')], PF2: [w('QF2'), w('SF1')], GF: [w('PF1'), w('PF2')],
  };
}
const EXPECTED_WEEKS = { WC1: 0, WC2: 0, QF1: 1, QF2: 1, EF1: 1, EF2: 1, SF1: 2, SF2: 2, PF1: 3, PF2: 3, GF: 4 };
const total = sc => sc.goals * 6 + sc.behinds;
const winnerOf = t => (total(t.result.home) > total(t.result.away) ? { winner: t.homeId, loser: t.awayId } : { winner: t.awayId, loser: t.homeId });
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const sd = xs => { const m = mean(xs); return Math.sqrt(mean(xs.map(x => (x - m) ** 2))); };
const slope = ys => { const xs = ys.map((_, i) => i); const mx = mean(xs), my = mean(ys); const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0); const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0); return den ? num / den : 0; };
const hashOf = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const CLUB_IDS = L.CLUBS.map(c => c.id);

/* Main runs, shared by sections 3, 4, 5 and 7. */
const MAIN_SEEDS = LONG ? [11, 22, 33, 44, 55] : [11, 22, 33];
const MAIN_SEASONS = LONG ? 40 : 8;
const needMain = [3, 4, 5, 7, 8, 10].some(n => RUN.has(n));
const tileStates = [];
let stepCount = 0;
const main = needMain ? MAIN_SEEDS.map((seed, i) => runCareer(seed, CLUB_IDS[(i * 5) % 18], MAIN_SEASONS, { onStep: s => { stepCount += 1; if (stepCount % 13 === 0) tileStates.push(s); } })) : [];
const mainSeasons = main.flatMap(run => run.seasons);
console.log(`main runs: ${main.length} careers x ${MAIN_SEASONS} seasons, ${mainSeasons.length} seasons complete, ${main.reduce((a, r) => a + r.steps, 0)} actions, ${((Date.now() - started) / 1000).toFixed(1)} s`);
for (const run of main) if (run.stuck) console.error(`  STUCK seed ${run.seed}: ${run.stuck}`);

if (RUN.has(0)) {
  head(0, 'Sources: every verified fact has two publishers, none of them a wiki');
  const sources = new Map(L.FMT.AFL_FORMAT_SOURCES.map(s => [s.id, s]));
  const facts = Object.entries(L.FMT.AFL_FORMAT_FACTS);
  const verified = facts.filter(([, f]) => f.verified);
  console.log(`  facts ${facts.length}, verified ${verified.length}, game rules ${facts.length - verified.length}, sources ${sources.size}`);
  check(/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(L.FMT.AFL_FORMAT_VERIFIED_ON), `VERIFIED_ON is a date (${L.FMT.AFL_FORMAT_VERIFIED_ON})`);
  check(verified.length >= 1, 'at least one fact is two sourced (the 2026 finals)');
  for (const [key, fact] of verified) {
    const pubs = new Set(fact.sources.map(id => sources.get(id)?.publisher));
    check(fact.sources.every(id => sources.has(id)) && pubs.size >= 2 && !pubs.has(undefined), `${key}: ${pubs.size} distinct publishers`);
    check(fact.sources.every(id => !/wiki/i.test(sources.get(id)?.url || '') && !/wiki/i.test(sources.get(id)?.publisher || '')), `${key}: no wiki source`);
  }
  check(facts.every(([, f]) => f.verified || f.gameRule), 'every fact is either verified or labelled a game rule');
  const deny = new Set(L.FMT.NICKNAME_DENY_LIST.map(n => n.toLowerCase().replace(/s$/, '')));
  const clash = L.CLUBS.filter(c => deny.has(c.nickname.toLowerCase().replace(/s$/, '')));
  check(L.FMT.NICKNAME_DENY_LIST.length >= 40 && clash.length === 0, `no club nickname is on the ${L.FMT.NICKNAME_DENY_LIST.length} name deny list${clash.length ? ` (${clash.map(c => c.nickname).join(', ')})` : ''}`);
  const preset = L.FMT.FINALS_PRESETS[L.FMT.CURRENT_FINALS_FORMAT];
  check(!!L.FMT.AFL_FORMAT_FACTS[preset.fact], `the default finals format (${L.FMT.CURRENT_FINALS_FORMAT}) names its fact`);
}

if (RUN.has(1)) {
  head(1, 'v1 frozen: the recorded Round 792 saves replay through the edited file to their hashes');
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/aussieV1SaveFixture.json'), 'utf8'));
  let same = 0;
  for (const save of fixture.saves) {
    const state = L.V1.replayManager(save.seed, save.clubId, save.actions);
    if (state && hashOf(state) === save.hash) same += 1; else fail(`v1 save "${save.name}" no longer replays to its recorded state`);
  }
  console.log(`  ${fixture.saves.length} recorded saves, ${same} replay exactly (phases ${[...new Set(fixture.saves.map(s => s.phase))].join(', ')})`);
  check(fixture.saves.length >= 12 && same === fixture.saves.length, 'every recorded v1 save replays bit for bit');
}

if (RUN.has(2)) {
  head(2, 'Calendar: 23 rounds, everyone once a round, 17 opponents, 6 doubled with venues reversed');
  const seeds = LONG ? [11, 22, 33, 44, 55] : [11, 22, 33, 44, 55];
  let bad = 0, pairs = 0, changed = 0;
  const homes = [];
  for (const seed of seeds) {
    let lastDoubles = null;
    for (let season = 1; season <= 40; season += 1) {
      const rounds = Array.from({ length: L.ROUNDS }, (_, r) => L.fixturesFor(seed, season, r));
      if (rounds.some(games => games.length !== 9 || new Set(games.flatMap(g => [g.homeId, g.awayId])).size !== 18)) bad += 1;
      const doubles = new Map();
      for (const id of CLUB_IDS) {
        const mine = rounds.flat().filter(g => g.homeId === id || g.awayId === id);
        const opp = mine.map(g => (g.homeId === id ? g.awayId : g.homeId));
        const twice = [...new Set(opp)].filter(o => opp.filter(x => x === o).length === 2);
        const reversed = twice.every(o => mine.filter(g => g.homeId === id && g.awayId === o).length === 1);
        if (mine.length !== 23 || new Set(opp).size !== 17 || twice.length !== 6 || !reversed) bad += 1;
        homes.push(mine.filter(g => g.homeId === id).length);
        doubles.set(id, twice.sort().join());
      }
      if (lastDoubles) for (const id of CLUB_IDS) { pairs += 1; if (lastDoubles.get(id) !== doubles.get(id)) changed += 1; }
      lastDoubles = doubles;
    }
  }
  console.log(`  ${seeds.length} seeds x 40 seasons checked, ${bad} faults; double ups changed in ${changed} of ${pairs} club season pairs (${(100 * changed / pairs).toFixed(1)}%); home games ${Math.min(...homes)} to ${Math.max(...homes)} (printed, not asserted)`);
  check(bad === 0, 'every season: each round has every club once, 23 games, 17 opponents, 6 met twice with venues reversed');
  check(changed / pairs >= 0.9, 'the double up opponents change between seasons in at least 90 percent of club season pairs');
}

if (RUN.has(3)) {
  head(3, "Ladder maths: the engine's ladder against the harness's own, after every round");
  noCrash();
  let compared = 0, mismatched = 0, draws = 0, sums = 0;
  for (const season of mainSeasons) {
    const all = season.closed.results;
    draws += all.filter(m => total(m.homeScore) === total(m.awayScore)).length;
    for (let r = 0; r < L.ROUNDS; r += 1) {
      const prefix = all.slice(0, 9 * (r + 1));
      const engine = L.leagueLadder({ clubs: season.closed.clubs, results: prefix });
      const own = ownLadder(prefix, CLUB_IDS);
      compared += 1;
      const same = engine.every((row, i) => row.clubId === own[i].id && row.played === own[i].p && row.played === r + 1 && row.wins + row.draws + row.losses === r + 1
        && row.wins === own[i].w && row.draws === own[i].d && row.losses === own[i].l && row.points === 4 * row.wins + 2 * row.draws && row.points === own[i].pts
        && row.pointsFor === own[i].pf && row.pointsAgainst === own[i].pa && Math.abs(row.percentage - own[i].pct) < 1e-9);
      if (!same) mismatched += 1;
      const pf = engine.reduce((a, x) => a + x.pointsFor, 0), pa = engine.reduce((a, x) => a + x.pointsAgainst, 0);
      const w = engine.reduce((a, x) => a + x.wins, 0), l = engine.reduce((a, x) => a + x.losses, 0), d = engine.reduce((a, x) => a + x.draws, 0);
      if (pf !== pa || w !== l || d % 2 !== 0) sums += 1;
    }
  }
  console.log(`  ${compared} round ladders compared over ${mainSeasons.length} seasons; ${mismatched} mismatched; ${sums} with broken totals; ${draws} drawn games`);
  check(compared > 0 && mismatched === 0, 'played, W/D/L, points (4 and 2), PF, PA and percentage match the own ladder, in the same order, after every round');
  check(sums === 0, 'sum of PF equals sum of PA, wins equal losses, draws come in pairs');
  check(draws > 0, `drawn games occur (${draws})`);
  /* A constructed exact tie: club 2 and club 10 level on points and percentage. */
  const c = i => CLUB_IDS[i];
  const sc = (g, b) => ({ goals: g, behinds: b, total: g * 6 + b });
  const fixture = [
    { round: 0, homeId: c(2), awayId: c(5), quarter: 4, homeScore: sc(15, 10), awayScore: sc(8, 2), events: [], homeSquad: [], awaySquad: [] },
    { round: 0, homeId: c(7), awayId: c(10), quarter: 4, homeScore: sc(8, 2), awayScore: sc(15, 10), events: [], homeSquad: [], awaySquad: [] },
  ];
  const tied = L.leagueLadder({ clubs: L.CLUBS.map(x => ({ id: x.id, name: x.place, style: x.style, players: [] })), results: fixture });
  const i2 = tied.findIndex(r => r.clubId === c(2)), i10 = tied.findIndex(r => r.clubId === c(10));
  console.log(`  constructed tie: ${c(2)} ${tied[i2].points} pts ${tied[i2].percentage.toFixed(1)}% at ${i2 + 1}, ${c(10)} ${tied[i10].points} pts ${tied[i10].percentage.toFixed(1)}% at ${i10 + 1}`);
  check(tied[i2].points === tied[i10].points && tied[i2].percentage === tied[i10].percentage && i2 === 0 && i10 === 1, 'an exact tie orders by club index: club 2 above club 10');
}

if (RUN.has(4)) {
  head(4, 'Finals: the 2026 wildcard week then the final eight, against a bracket hard coded from the receipts');
  noCrash();
  let seasons = 0, pairFaults = 0, reappear = 0, qualFaults = 0, levelFinals = 0, extraTimes = 0, pathFaults = 0, countFaults = 0, exitFaults = 0;
  const byPremierSeed = new Map();
  for (const season of mainSeasons.filter(x => x.closed.format === 'wildcard')) {
    seasons += 1;
    const st = season.closed, ties = st.finals.ties;
    const seeds = ownLadder(st.results, CLUB_IDS).map(r => r.id);
    if (ties.length !== 11) countFaults += 1;
    const won = {};
    for (const t of ties) { if (total(t.result.home) === total(t.result.away)) levelFinals += 1; else won[t.id] = winnerOf(t); if (t.result.extraTime) extraTimes += 1; }
    const expected = expectedPairs(seeds, won);
    for (const t of ties) if (!expected[t.id] || expected[t.id][0] !== t.homeId || expected[t.id][1] !== t.awayId || EXPECTED_WEEKS[t.id] !== t.week) pairFaults += 1;
    const inFinals = new Set(ties.flatMap(t => [t.homeId, t.awayId]));
    if (inFinals.size !== 10 || seeds.slice(0, 10).some(id => !inFinals.has(id))) qualFaults += 1;
    for (const id of CLUB_IDS) if ((L.finalsExit(st, id) === 'missed') !== (seeds.indexOf(id) >= 10)) exitFaults += 1;
    /* Own elimination rule: losing any final but a qualifying final ends your season. */
    const out = new Set();
    for (const t of [...ties].sort((a, b) => a.week - b.week)) {
      if (out.has(t.homeId) || out.has(t.awayId)) reappear += 1;
      if (won[t.id] && !t.id.startsWith('QF')) out.add(won[t.id].loser);
    }
    const gf = ties.find(t => t.id === 'GF');
    if (!gf || !won.GF) continue;
    const premier = won.GF.winner, seed = seeds.indexOf(premier) + 1;
    if (L.finalsExit(st, premier) !== 'premiers' || L.finalsExit(st, won.GF.loser) !== 'runnerUp' || st.history.at(-1).premier !== premier) exitFaults += 1;
    byPremierSeed.set(seed, (byPremierSeed.get(seed) || 0) + 1);
    const played = ties.filter(t => t.homeId === premier || t.awayId === premier).map(t => t.id.slice(0, 2));
    const lost = ties.filter(t => won[t.id]?.loser === premier).map(t => t.id.slice(0, 2));
    const qfWinner = ['QF1', 'QF2'].some(id => won[id]?.winner === premier);
    if (seed <= 4 && (lost.length > 1 || lost.some(x => x !== 'QF'))) pathFaults += 1;
    if (qfWinner && played.join() !== 'QF,PF,GF') pathFaults += 1;
    if (seed >= 5 && seed <= 6 && played.join() !== 'EF,SF,PF,GF') pathFaults += 1;
    if (seed >= 7 && seed <= 10 && played.join() !== 'WC,EF,SF,PF,GF') pathFaults += 1;
  }
  console.log(`  ${seasons} finals series; pair faults ${pairFaults}, qualifier faults ${qualFaults}, exit faults ${exitFaults}, eliminated clubs reappearing ${reappear}, path faults ${pathFaults}, count faults ${countFaults}`);
  console.log(`  level finals ${levelFinals}, finals that went to extra time ${extraTimes}; premiers by ladder place ${JSON.stringify([...byPremierSeed].sort((a, b) => a[0] - b[0]))}`);
  check(seasons > 0 && pairFaults === 0, 'every tie pairs exactly the clubs the 2026 bracket names, in the right week');
  check(qualFaults === 0 && exitFaults === 0, 'the top ten and nobody else play the finals, and only the rest missed them');
  check(reappear === 0, 'an eliminated club never plays again');
  check(pathFaults === 0, 'premier paths: top four lose at most a qualifying final, QF winners play QF, PF, GF, 5th and 6th play EF, SF, PF, GF, 7th to 10th add the wildcard');
  check(countFaults === 0, 'eleven finals a season');
  check(levelFinals === 0, 'no final ends level');
  /* Extra time on a constructed level match, and the bound on repeated extra time blocks. */
  const s0 = L.createLeague(4242, 'club-00');
  const blocks = [];
  let bound = 0, settledLevel = 0;
  for (let i = 0; i < 300; i += 1) {
    const home = CLUB_IDS[i % 18], away = CLUB_IDS[(i + 5) % 18];
    const sc = { goals: 10, behinds: 8, total: 68 };
    const lu = id => L.V1.automaticLineup(L.clubOf(s0, id));
    const level = { round: 23 + (i % 5), homeId: home, awayId: away, quarter: 4, homeScore: sc, awayScore: sc, events: [], homeSquad: [], awaySquad: [] };
    const r = L.settleLevelFinal(s0.clubs, level, 1000 + i, () => [lu(home).starters, lu(away).starters], ['control', 'pressure']);
    if (!r.extraTime) settledLevel += 1;
    if (r.match.homeScore.total === r.match.awayScore.total) bound += 1;
    blocks.push(r.blocks);
  }
  console.log(`  300 constructed level finals: extra time blocks mean ${mean(blocks).toFixed(2)}, most ${Math.max(...blocks)} (printed, not asserted), bound ${L.FMT.EXTRA_TIME.blockBound}, still level ${bound}`);
  check(settledLevel === 0 && bound === 0, 'a final level after four quarters goes to extra time and ends with a winner');
  check(LONG || extraTimes >= 1 || seasons < 20, `extra time happened in the run (${extraTimes})`);
  /* The resolver alone over 2000 random outcome sets. */
  let rngState = 99;
  const rnd = () => { rngState = (Math.imul(rngState, 1103515245) + 12345) >>> 0; return rngState / 4294967296; };
  const preset = L.FMT.FINALS_PRESETS.wildcard;
  let resolverFaults = 0;
  for (let k = 0; k < 2000; k += 1) {
    const seeds = [...CLUB_IDS].sort(() => rnd() - 0.5);
    const won = {};
    for (const week of L.BR.finalsWeeks(preset.ties)) {
      const pairs = L.BR.resolveWeek(preset.ties, seeds, won, week);
      if (!pairs) { resolverFaults += 1; break; }
      const exp = expectedPairs(seeds, won);
      for (const p of pairs) {
        if (exp[p.id][0] !== p.homeId || exp[p.id][1] !== p.awayId) resolverFaults += 1;
        won[p.id] = rnd() < 0.5 ? { winner: p.homeId, loser: p.awayId } : { winner: p.awayId, loser: p.homeId };
      }
    }
    const out = L.BR.eliminated(preset.ties, seeds, preset.qualifiers, won);
    if (out.size !== 17 || out.has(won.GF?.winner)) resolverFaults += 1;
  }
  console.log(`  resolver alone: 2000 random outcome sets, ${resolverFaults} faults`);
  check(resolverFaults === 0, 'the bracket resolver names every pairing the receipts name, and leaves exactly one club standing');
}

/* Measured bands (see the header). Each is [low, high]. */
const BANDS = {
  teamScore: [76, 84], goals: [11.0, 12.4], behinds: [9.3, 10.6], accuracy: [0.52, 0.56], drawRate: [0.0025, 0.0135], margin: [36, 42], lateOverEarly: [0.94, 0.99],
  strengthLift: 0.05, leagueSkill: [58, 74], leagueSpread: [5, 18], skillSlope: 0.25, lateFatigue: [50, 63],
};
const inBand = (x, [lo, hi]) => x >= lo && x <= hi;

if (RUN.has(5)) {
  head(5, 'Score realism and the long season');
  noCrash();
  const scores = [], goals = [], behinds = [], margins = [], early = [], late = [];
  let games = 0, drawn = 0;
  for (const season of mainSeasons) for (const m of season.closed.results) {
    games += 1;
    const a = total(m.homeScore), b = total(m.awayScore);
    if (m.homeScore.total !== a || m.awayScore.total !== b) fail(`score total is not goals x 6 plus behinds in round ${m.round + 1}`);
    if (a === b) drawn += 1;
    scores.push(a, b); goals.push(m.homeScore.goals, m.awayScore.goals); behinds.push(m.homeScore.behinds, m.awayScore.behinds); margins.push(Math.abs(a - b));
    if (m.round <= 5) early.push(a, b);
    if (m.round >= 17) late.push(a, b);
  }
  const g = goals.reduce((x, y) => x + y, 0), bh = behinds.reduce((x, y) => x + y, 0);
  const stats = { teamScore: mean(scores), goals: mean(goals), behinds: mean(behinds), accuracy: g / (g + bh), drawRate: drawn / games, margin: mean(margins), lateOverEarly: mean(late) / mean(early) };
  console.log(`  ${games} games: team score ${stats.teamScore.toFixed(2)}, goals ${stats.goals.toFixed(2)}, behinds ${stats.behinds.toFixed(2)}, accuracy ${stats.accuracy.toFixed(4)}, draws ${(100 * stats.drawRate).toFixed(2)}%, margin ${stats.margin.toFixed(2)}, late over early ${stats.lateOverEarly.toFixed(4)}`);
  if (LONG) for (const run of main) {
    const sc = run.seasons.flatMap(x => x.closed.results.flatMap(m => [total(m.homeScore), total(m.awayScore)]));
    const e = run.seasons.flatMap(x => x.closed.results.filter(m => m.round <= 5).flatMap(m => [total(m.homeScore), total(m.awayScore)]));
    const l = run.seasons.flatMap(x => x.closed.results.filter(m => m.round >= 17).flatMap(m => [total(m.homeScore), total(m.awayScore)]));
    console.log(`  seed ${run.seed}: team score ${mean(sc).toFixed(2)}, late over early ${(mean(l) / mean(e)).toFixed(4)}, late fatigue ${mean(run.seasons.flatMap(x => x.fatigue.slice(17))).toFixed(2)}`);
  }
  check(games > 0, `${games} games measured`);
  const earlyFatigue = mean(mainSeasons.flatMap(x => x.fatigue.slice(0, 6))), lateFatigue = mean(mainSeasons.flatMap(x => x.fatigue.slice(17)));
  console.log(`  league mean fatigue after each round: rounds 1 to 6 ${earlyFatigue.toFixed(2)}, rounds 18 to 23 ${lateFatigue.toFixed(2)}`);
  check(inBand(lateFatigue, BANDS.lateFatigue), `late season league fatigue ${lateFatigue.toFixed(2)} inside [${BANDS.lateFatigue.join(', ')}]`);
  for (const key of ['teamScore', 'goals', 'behinds', 'accuracy', 'drawRate', 'margin', 'lateOverEarly']) check(inBand(stats[key], BANDS[key]), `${key} ${stats[key].toFixed(4)} inside [${BANDS[key].join(', ')}]`);
}

if (RUN.has(6)) {
  head(6, 'Strength decides: one club at +10 skill against the same seeds unmodified');
  noCrash();
  const target = 'club-09';
  const boost = s => ({ ...s, clubs: s.clubs.map(c => c.id !== target ? c : { ...c, players: c.players.map(p => ({ ...p, skill: Math.min(99, p.skill + 10), potential: Math.max(Math.min(99, p.skill + 10), p.potential) })) }) });
  const share = run => { const st = run.seasons[0].closed; const row = L.leagueLadder(st).find(r => r.clubId === target); return (row.wins + row.draws / 2) / row.played; };
  const pairs = LONG ? 24 : 8;
  const lifts = [];
  for (let k = 0; k < pairs; k += 1) {
    const seed = 500 + k;
    lifts.push(share(runCareer(seed, 'club-00', 1, { tweak: boost })) - share(runCareer(seed, 'club-00', 1)));
  }
  console.log(`  ${pairs} paired seeds: win share lift mean ${mean(lifts).toFixed(3)}, sd ${sd(lifts).toFixed(3)}, floor ${BANDS.strengthLift}`);
  check(mean(lifts) > BANDS.strengthLift, 'a +10 skill club wins clearly more often on the same seeds');
  if (mainSeasons.length) {
    const tops = mainSeasons.map(x => L.leagueLadder(x.closed)[0].wins), bottoms = mainSeasons.map(x => L.leagueLadder(x.closed)[17].wins);
    const tierWins = new Map();
    for (const x of mainSeasons) { const p = x.closed.history.at(-1).premier; if (p === x.closed.myClub) continue; const tier = L.CLUBS.find(c => c.id === p).tier; tierWins.set(tier, (tierWins.get(tier) || 0) + 1); }
    const mine = mainSeasons.filter(x => x.closed.history.at(-1).premier === x.closed.myClub).length;
    console.log(`  ladder leader wins mean ${mean(tops).toFixed(1)}, bottom club wins mean ${mean(bottoms).toFixed(1)}; AI premierships by tier ${JSON.stringify([...tierWins].sort((a, b) => a[0] - b[0]))}, the bot club won ${mine} of ${mainSeasons.length} (printed)`);
  }
}

const FLOORS = { defender: 7, midfielder: 6, ruck: 2, forward: 7 };
const floorsOk = club => Object.entries(FLOORS).every(([role, n]) => club.players.filter(p => p.role === role).length >= n);
/* The harness's own draft order: non-finalists reverse ladder, then finalists by the week they went out (lower place first), premier last. */
function ownDraftOrder(closed, vacancies) {
  const seeds = ownLadder(closed.results, CLUB_IDS).map(r => r.id);
  const outWeek = new Map();
  for (const t of closed.finals.ties) {
    const w = winnerOf(t);
    if (!t.id.startsWith('QF')) outWeek.set(w.loser, t.week);
  }
  const finalists = seeds.slice(0, 10).sort((a, b) => (outWeek.get(a) ?? 99) - (outWeek.get(b) ?? 99) || seeds.indexOf(b) - seeds.indexOf(a));
  const base = [...seeds.slice(10).reverse(), ...finalists];
  const order = [];
  for (let pass = 0; base.some(id => vacancies.get(id) > pass); pass += 1) for (const id of base) if (vacancies.get(id) > pass) order.push(id);
  return order;
}
if (RUN.has(7)) {
  head(7, 'Summer and lists: ageing, growth inside potential, retirements, the draft refill');
  const CAREERS = LONG ? 200 : 6, YEARS = LONG ? 3 : 2;
  const extra = [];
  for (let k = 0; k < CAREERS; k += 1) extra.push(runCareer(7000 + k, CLUB_IDS[k % 18], YEARS));
  const seasons = [...mainSeasons, ...extra.flatMap(r => r.seasons)];
  let starts = 0, startFaults = 0, floorFaults = 0, aboveCap = 0, ceilingGain = 0, ageFaults = 0, retireFaults = 0, draftAgeFaults = 0, nameFaults = 0, orderFaults = 0, pickFaults = 0;
  const youngGain = [];
  let maxNames = 0;
  for (const x of seasons) {
    for (const st of [x.start]) {
      starts += 1;
      if (st.clubs.some(c => c.players.length !== 36)) startFaults += 1;
      if (st.clubs.some(c => !floorsOk(c))) floorFaults += 1;
      const names = st.clubs.flatMap(c => c.players.map(p => p.name));
      if (names.some(n => !n || !n.trim()) || new Set(names).size !== names.length) nameFaults += 1;
      maxNames = Math.max(maxNames, names.length);
    }
    const pre = new Map(x.preSummer.clubs.flatMap(c => c.players.map(p => [p.id, p])));
    for (const c of x.postSummer.clubs) for (const p of c.players) {
      const before = pre.get(p.id);
      if (p.skill > p.potential) aboveCap += 1;
      if (before.skill >= Math.min(99, before.potential) && p.skill > before.skill) ceilingGain += 1;
      if (p.age !== before.age + 1) ageFaults += 1;
      if (before.age < 22 && before.skill < before.potential) youngGain.push(p.skill - before.skill);
    }
    const done = x.draftDone;
    const retired = L.retirees(x.postSummer);
    const listed = new Set(done.clubs.flatMap(c => c.players.map(p => p.id)));
    for (const id of retired) if (listed.has(id)) retireFaults += 1;
    for (const c of x.postSummer.clubs) for (const p of c.players) if (!retired.has(p.id) && !listed.has(p.id)) retireFaults += 1;
    const drafted = new Set(done.draft.made.map(m => m.prospectId));
    for (const c of done.clubs) for (const p of c.players) if (drafted.has(p.id) && p.age !== 18) draftAgeFaults += 1;
    if (done.clubs.some(c => c.players.length !== 36 || !floorsOk(c))) floorFaults += 1;
    const vacancies = new Map(x.postSummer.clubs.map(c => [c.id, c.players.filter(p => !retired.has(p.id)).length]).map(([id, n]) => [id, 36 - n]));
    if (ownDraftOrder(x.closed, vacancies).join() !== done.draft.order.join()) orderFaults += 1;
    for (const id of CLUB_IDS) if (done.draft.made.filter(m => m.clubId === id).length !== vacancies.get(id)) pickFaults += 1;
  }
  noCrash();
  console.log(`  ${seasons.length} summers (${CAREERS} extra careers x ${YEARS} seasons plus the main runs), ${starts} season starts`);
  console.log(`  faults: list size ${startFaults}, floors ${floorFaults}, above potential ${aboveCap}, gain at ceiling ${ceilingGain}, ages ${ageFaults}, retirements ${retireFaults}, draftee ages ${draftAgeFaults}, names ${nameFaults}, draft order ${orderFaults}, picks vs vacancies ${pickFaults}`);
  console.log(`  young players with headroom: ${youngGain.length}, mean gain ${mean(youngGain).toFixed(2)}; name bank load ${maxNames} of ${L.NAME_BANK_SIZE} (${(100 * maxNames / L.NAME_BANK_SIZE).toFixed(1)}%)`);
  check(seasons.length > 0 && startFaults === 0, '36 players on every list at every season start');
  check(floorFaults === 0, 'every list keeps 7 defenders, 6 midfielders, 2 rucks and 7 forwards after every draft');
  check(aboveCap === 0 && ceilingGain === 0, 'nobody grows above potential, and players at their ceiling never gain');
  check(youngGain.length > 0 && mean(youngGain) > 1, 'young players with headroom gain on average');
  check(ageFaults === 0 && retireFaults === 0 && draftAgeFaults === 0, 'everyone ages a year, retirees leave, draftees are 18');
  check(nameFaults === 0, 'names are unique and non-empty across every list');
  check(orderFaults === 0 && pickFaults === 0, "the draft order follows the declared rule and each club's picks equal its vacancies");
  /* Constructed need: three rival clubs lose all four rucks to retirement this summer. */
  let needDrafts = 0, needFaults = 0;
  for (const seed of [801, 802, 803, 804]) {
    let s = L.createLeague(seed, 'club-00');
    while (s.phase !== 'summer') s = L.reduceLeague(s, botAction(s));
    const victims = ['club-04', 'club-08', 'club-13'];
    s = { ...s, clubs: s.clubs.map(c => !victims.includes(c.id) ? c : { ...c, players: c.players.map(p => p.role === 'ruck' ? { ...p, age: 40 } : p) }) };
    s = L.reduceLeague(s, { type: 'next' });
    s = L.reduceLeague(s, { type: 'draftAuto' });
    needDrafts += 1;
    for (const id of victims) if (!floorsOk(L.clubOf(s, id))) needFaults += 1;
  }
  console.log(`  constructed: ${needDrafts} drafts where three clubs lost every ruck, ${needFaults} lists left short`);
  check(needDrafts > 0 && needFaults === 0, 'clubs pick role need first, so a club that lost its rucks drafts back to the floor');
  /* Your floor breaking pick is refused, with the reason. */
  let s = L.createLeague(901, 'club-06');
  while (!(s.phase === 'draft' && s.draft.at < s.draft.order.length) && s.season < 3) s = L.reduceLeague(s, botAction(s));
  if (s.phase === 'draft') {
    const at = s.draft.at;
    const order = [...s.draft.order.slice(0, at + 1), ...s.draft.order.slice(at + 1).filter(id => id !== s.myClub)];
    const mine = L.clubOf(s, s.myClub);
    let rucks = mine.players.filter(p => p.role === 'ruck');
    const keep = new Set(rucks.slice(0, 1).map(p => p.id));
    const players = mine.players.map(p => p.role === 'ruck' && !keep.has(p.id) ? { ...p, role: 'midfielder' } : p);
    const t = { ...s, clubs: s.clubs.map(c => c.id === s.myClub ? { ...c, players } : c), draft: { ...s.draft, order } };
    const wrong = L.draftPool(t).find(p => p.role !== 'ruck'), right = L.draftPool(t).find(p => p.role === 'ruck');
    const reason = L.pickRefusal(t, wrong.id);
    console.log(`  constructed: one pick left and one ruck short; refusal reads "${reason}"`);
    check(!!reason && /ruck/.test(reason) && L.reduceLeague(t, { type: 'pick', prospectId: wrong.id }) === t, 'a pick that leaves your list short of a floor is refused with the reason');
    check(!!right && L.pickRefusal(t, right.id) === null && L.reduceLeague(t, { type: 'pick', prospectId: right.id }) !== t, 'the pick that fills the floor is taken');
  } else fail('no draft turn of your own was reached in two seasons');
  /* The league over many summers: mean skill and spread inside a band, no slope. */
  const longRuns = LONG ? main : [runCareer(61, CLUB_IDS[16], 24)];
  for (const run of longRuns) {
    const means = run.seasons.map(x => mean(x.start.clubs.flatMap(c => c.players.map(p => p.skill))));
    const spreads = run.seasons.map(x => sd(x.start.clubs.flatMap(c => c.players.map(p => p.skill))));
    const b = slope(means);
    console.log(`  seed ${run.seed}: league mean skill ${means[0].toFixed(2)} to ${means.at(-1).toFixed(2)} (range ${Math.min(...means).toFixed(2)} to ${Math.max(...means).toFixed(2)}, slope ${b.toFixed(3)} a season), player spread ${Math.min(...spreads).toFixed(2)} to ${Math.max(...spreads).toFixed(2)}`);
    check(means.every(m => inBand(m, BANDS.leagueSkill)) && spreads.every(v => inBand(v, BANDS.leagueSpread)), `seed ${run.seed}: league mean skill and spread stay inside their bands`);
    check(Math.abs(b) < BANDS.skillSlope, `seed ${run.seed}: no drift in league skill across ${means.length} seasons`);
  }
}

if (RUN.has(8)) {
  head(8, 'Save: round trips in every phase, size over many seasons, refusals');
  noCrash();
  /* Round trip at every step for three seasons; the result must equal an uninterrupted run. */
  /* This bot plays every third match quarter by quarter, with a swap at some breaks, so every phase is saved. */
  const bot8 = s => {
    if (!s.match || (s.phase !== 'quarter' && s.phase !== 'break') || s.match.round % 3 !== 0) return botAction(s);
    if (s.phase === 'quarter') return { type: 'play', tactic: COUNTER[L.clubOf(s, s.match.homeId === s.myClub ? s.match.awayId : s.match.homeId).style] };
    if (s.swapsThisBreak === 0 && s.match.round % 6 === 0) {
      const inP = L.leaguePlayer(s, s.bench[0]);
      const outId = s.starters.find(id => L.leaguePlayer(s, id).role === inP.role);
      if (outId) return { type: 'swap', outId, inId: inP.id };
    }
    return { type: 'next' };
  };
  let straight = L.createLeague(31, 'club-11');
  for (let n = 0; straight.season <= 3 && n < 20000; n += 1) straight = L.reduceLeague(straight, bot8(straight));
  let s = L.createLeague(31, 'club-11'), trips = 0, refusedTrips = 0;
  const phases = new Set();
  while (s.season <= 3) {
    const back = L.readLeagueSave(JSON.stringify(s));
    trips += 1; phases.add(s.phase === 'prepare' && s.stage === 'finals' ? 'finals' : s.phase);
    if (!back) { refusedTrips += 1; if (refusedTrips < 3) console.error(`  refused a real save in ${s.phase}/${s.stage} round ${s.round} week ${s.week}`); }
    const cur = back || s, nx = L.reduceLeague(cur, bot8(cur));
    if (nx === cur) { fail(`the bot was refused in ${cur.phase}`); break; }
    s = nx;
  }
  console.log(`  ${trips} saves written and read back across phases ${[...phases].sort().join(', ')}; ${refusedTrips} refused`);
  check(refusedTrips === 0 && phases.size >= 8, 'every real save reads back, in every phase');
  check(JSON.stringify(s) === JSON.stringify(straight), 'playing on from read back saves ends season 3 exactly where an uninterrupted run does');
  /* Size: per season peak over the main runs. */
  for (const run of main) {
    const peaks = run.seasons.map(x => JSON.stringify(x.closed).length);
    const tail = peaks.slice(3);
    console.log(`  seed ${run.seed}: save peak ${Math.max(...peaks)} chars over ${peaks.length} seasons (cap ${L.MAX_SAVE_CHARS}), slope after season 3 ${slope(tail).toFixed(1)} chars a season`);
    check(Math.max(...peaks) < L.MAX_SAVE_CHARS * 0.8, `seed ${run.seed}: the save stays well under its cap`);
    check(Math.abs(slope(tail)) < 1500, `seed ${run.seed}: the save does not grow season on season`);
  }
  /* Refusals. */
  const good = runCareer(32, 'club-02', 1).final;
  const raw = JSON.stringify(good);
  check(L.readLeagueSave(raw) !== null, 'a real save after one season reads');
  const bad = (label, mutateFn) => { const v = JSON.parse(raw); mutateFn(v); check(L.readLeagueSave(JSON.stringify(v)) === null, `refuses ${label}`); };
  bad('a wrong version', v => { v.version = 3; });
  bad('an unknown key', v => { v.extra = 1; });
  bad('37 players on a list', v => { const p = v.clubs[3].players[0]; v.clubs[3].players.push({ ...p, id: `p-${v.nextId}`, name: 'Spare Name' }); v.nextId += 1; });
  bad('a duplicate player id', v => { v.clubs[4].players[1].id = v.clubs[4].players[0].id; });
  bad('a floor broken outside the draft', v => { for (const p of v.clubs[5].players) if (p.role === 'ruck') p.role = 'forward'; });
  bad('a foreign club id', v => { v.myClub = 'club-18'; });
  bad('a raw input over the cap', v => { v.history = [...v.history, ...Array.from({ length: 4000 }, () => v.history[0])]; });
  check(L.readLeagueSave('{"version":2') === null && L.readLeagueSave(null) === null && L.readLeagueSave('x'.repeat(L.MAX_SAVE_CHARS + 1)) === null, 'refuses broken JSON, nothing, and raw input over the cap');
}

if (RUN.has(9)) {
  head(9, 'Determinism and dice');
  noCrash();
  const a = runCareer(41, 'club-07', 1), b = runCareer(41, 'club-07', 1);
  check(hashOf(a.final) === hashOf(b.final) && a.steps === b.steps, `the same seed and actions give the same state (${a.steps} actions)`);
  let s = L.createLeague(42, 'club-01');
  s = L.reduceLeague(s, { type: 'prepare', choice: 'train' });
  const whole = L.reduceLeague(s, { type: 'playMatch', tactic: 'direct' });
  let step = s;
  for (let q = 0; q < 4; q += 1) { step = L.reduceLeague(step, { type: 'play', tactic: 'direct' }); if (step.phase === 'break') step = L.reduceLeague(step, { type: 'next' }); }
  check(whole.phase === 'report' && JSON.stringify(whole) === JSON.stringify(step), 'playing the whole match equals four quarters with the same tactic');
  const m = { ...L.V1.emptyMatch(5, 'club-03', 'club-04') };
  const lu = id => L.V1.automaticLineup(L.clubOf(s, id)).starters;
  const one = L.V1.quarter(s.clubs, m, L.seasonSeed(42, 1), lu('club-03'), lu('club-04'), 'control', 'control');
  const two = L.V1.quarter(s.clubs, m, L.seasonSeed(42, 2), lu('club-03'), lu('club-04'), 'control', 'control');
  check(JSON.stringify(one.match.events) !== JSON.stringify(two.match.events), 'the same pairing in seasons 1 and 2 rolls different dice');
  let outside = 0, events = 0;
  for (const match of a.myMatches) {
    for (const e of match.events) {
      events += 1;
      const squad = e.clubId === match.homeId ? match.homeSquad : match.awaySquad;
      if (!squad.includes(e.playerId)) outside += 1;
    }
  }
  console.log(`  ${a.myMatches.length} of your matches, ${events} scoring events, ${outside} by a player outside his club's matchday 23`);
  check(events > 0 && outside === 0, 'every score in your matches comes from that club\'s own matchday 23');
}

if (RUN.has(10)) {
  head(10, 'Tiles and routing');
  noCrash();
  const seen = new Set();
  let checked = 0, empty = 0, roundFaults = 0, ladderFaults = 0;
  const extraStates = [];
  runCareer(51, 'club-14', 1, { onStep: st => { if (!seen.has(st.phase + st.stage)) { seen.add(st.phase + st.stage); extraStates.push(st); } } });
  for (const st of [...tileStates, ...extraStates]) {
    const tiles = L.hubTiles(st);
    checked += 1;
    if (!tiles.length || tiles.some(t => !t.title || !t.value || !t.sub)) empty += 1;
    const next = tiles.find(t => t.key === 'match');
    if (st.stage === 'homeAway' && st.phase !== 'seasonOver' && next.value !== `Round ${st.round + 1} of 23`) roundFaults += 1;
    const own = ownLadder(st.results, CLUB_IDS);
    const at = own.findIndex(r => r.id === st.myClub), row = own[at];
    const ladder = tiles.find(t => t.key === 'ladder');
    const suffix = (at + 1) % 100 >= 11 && (at + 1) % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][(at + 1) % 10] || 'th';
    if (ladder.value !== `${at + 1}${suffix}` || ladder.sub !== `${row.pts} pts, ${row.pct.toFixed(1)}%`) ladderFaults += 1;
  }
  console.log(`  ${checked} states (phases ${[...seen].join(', ')}): ${empty} with an empty word, ${roundFaults} wrong round, ${ladderFaults} ladder tiles off the ladder row`);
  check(checked > 0 && empty === 0, 'every tile has a title, a value and a second line in every phase');
  check(roundFaults === 0, 'the Next match tile reads "Round N of 23" with the right N');
  check(ladderFaults === 0, 'the Ladder tile is the ladder row: place, points and percentage');
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/aussieV1SaveFixture.json'), 'utf8')).saves;
  const v1raw = name => { const f = fixture.find(x => x.name === name); return JSON.stringify({ version: 1, seed: f.seed, clubId: f.clubId, actions: f.actions }); };
  const v2raw = JSON.stringify(L.createLeague(77, 'club-05'));
  const cases = [[v2raw, null, 'league'], [v2raw, v1raw('mid season break'), 'league'], ['{"version":2}', v1raw('mid season break'), 'legacy'], [null, v1raw('fresh'), 'legacy'], [null, v1raw('completed season'), 'menu'], [null, null, 'menu'], ['{bad', null, 'menu']];
  const wrong = cases.filter(([a2, a1, want]) => L.chooseBoard(a2, a1) !== want);
  console.log(`  chooseBoard: ${cases.length} cases, ${wrong.length} wrong`);
  check(wrong.length === 0, 'a valid full season opens the league, an unfinished ten round season the legacy board, otherwise the menu');
}

const totalFails = [...failures.values()].reduce((a, b) => a + b, 0);
const secs = ((Date.now() - started) / 1000).toFixed(1);
if (CONTROL) {
  const [, , , target, indep] = CONTROLS[CONTROL];
  const t = failures.get(target) || 0, i = failures.get(indep) || 0;
  if (t > 0 && i === 0) { console.log(`\nsimAussieRulesSeason control ${CONTROL}: RED as intended (section ${target} failed ${t} checks, independent section ${indep} passed) in ${secs} s`); process.exit(1); }
  console.log(`\nsimAussieRulesSeason control ${CONTROL}: DID NOT FIRE (section ${target} failures ${t}, independent section ${indep} failures ${i}) in ${secs} s`);
  process.exit(3);
}
const scope = RUN.size === 11 ? 'all eleven sections green' : `the ${RUN.size} selected sections green (AUSSIE_SEASON_ONLY=${ONLY}, not a gate run)`;
console.log(`\nsimAussieRulesSeason: ${totalFails ? `${totalFails} checks FAILED` : scope} in ${secs} s`);
process.exit(totalFails ? 1 : 0);
