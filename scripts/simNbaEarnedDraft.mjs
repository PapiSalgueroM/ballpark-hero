/* Round 1321: the NBA Front Office's earned draft, part A, measured.
 *
 * Part A puts the NBA on the shared draft of Round 1222 in the engine and two
 * libraries only (src/lib/gmEarnedDraft.ts, src/lib/nbaEarnedDraft.ts) and
 * NOTHING A PLAYER SEES: no board, no screen and no copy calls the new code.
 * This harness bundles the real engine, desk, lift and libraries and holds
 * what part A promises, then measures the earned draft against today's draft
 * in two arms so the lead reads the table before a screen is built on it.
 *
 * SECTIONS LAND WITH THEIR CODE (the brief's advice 23): nothing here feature
 * detects, and the last lines print how many sections ran.
 *   1. WHAT MUST NOT MOVE. 1a: the season before the draft, desk on, seeds 1
 *      to 30 (the user club is the seed's own club of the thirty, so every
 *      club is the user once), a new league with the desk open on day one,
 *      played the board's way (the tip off trim, simRound with the desk's
 *      round options, nbaDeskAfterRound, the playoffs with the desk's edges,
 *      the tax, the season's lines) to the press of "Go to the draft". The
 *      hash of the league and of the desk (ids with their per process epoch
 *      taken out) and the generator's call count equal
 *      scripts/data/nbaEarnedDraftFixture.json, recorded from the BASE commit
 *      with SIM_NBA_EARNED_DRAFT_RECORD=<base sha> (every src file the bundle
 *      reads is then read from that commit). 1a GUARDS THE ENGINE AND THE
 *      DESK, NOT THE BOARD: this harness replays the board's calls and never
 *      mounts it, and in part A nothing calls the new code; the board is
 *      untouched and the round's git diff proves it. 1b: the desk off fixture
 *      and its harnesses equal the base (git diff --quiet against the sha the
 *      fixture was recorded from).
 *   THE WALK, for sections 2, 3, 4, 8 and 9: ten leagues (thirty with
 *      FLEET=full) of three seasons, desk on, the earned draft through the
 *      libraries' own presses, a seeded handful of this year's picks moved
 *      before each draft (a club holding none, a club holding four, his own
 *      among the moved half the time).
 *   2. THE LOTTERY THROUGH THE BIND. Every closed season gives the bind 30
 *      rows and the first round's sixteen (read by the harness off the series'
 *      names, by the bind off their numbers), and a lottery is drawn on every
 *      one. On twenty of them, 10,000 keyed lotteries each (40,000 with
 *      FLEET=full) through the bind's own order: each club's share of the first
 *      pick within 4.5 standard errors of the chance the harness works out from
 *      the TABLE (NBA_PICK_RULES, never the saved field) and the records, level
 *      clubs on the mean of the seeds they span; a club alone on its record is
 *      drawn on exactly its seed's chance.
 *   3. THE SLOT IS THE TRUTH. The saved order agrees with the season the
 *      harness saw (round one opens with the clubs out of the sixteen, then
 *      worst record first; round two worst record first); every pick the ledger
 *      holds is one slot, at its first owner's place, used by its holder; on
 *      the clock at N exactly N minus 1 slots are used; the class loses exactly
 *      the men signed and never runs dry; nobody is on two rosters; every row a
 *      run shows is a man now on that club at his scout's read.
 *   4. DRAWN ONCE. Opening the same season twice gives the identical block;
 *      the block survives a JSON round trip and every press changes only `made`
 *      and `seen`; a draft replayed with the table swapped under the saved block
 *      is the same draft.
 *   6. THE CLASS. The curve's shape; today's twelve found in every class by
 *      replaying nbaDraftClass on a twin generator; every man after them held
 *      to the curve rating by rating; the mean true rating falls ten slots
 *      after ten; slots plus four, never over 70; the board's load guard.
 *   8. THE FALLBACK. Mid draft, a block broken at its year, its order, a
 *      slot, a `made` past the end or a `seen` that is not a boolean is never
 *      current and no press runs on it, and the old engine calls (the old draft
 *      on the class left, two rival batches) and the desk's summer finish on a
 *      valid league without a throw.
 *   9. NEED. No rival passes a man whose read beats its choice by more than
 *      NBA_DRAFT_NEED_WEIGHT, and a rival short at a position takes it more
 *      often than one that is not, by more than the floor, at every position.
 *  10. THE SHARED HALF KNOWS NO SPORT. gmEarnedDraft.ts imports only the lift
 *      and names no sport in its code (comments stripped); neither library
 *      draws from Math.random or carries an address.
 *   7. THE TABLE (FLEET=full only). Step (a): the OLD arm alone, the board's
 *      draft of today replayed as simNbaGmDesk's draftNight does, on the
 *      fleet below; per seed set S1 to S6 and their spread over the sets.
 *
 * THE FLEET. Six user clubs, the two strongest, the two middle and the two
 * weakest by opening nbaStrength, on seed sets of ten seeds: 60 careers of ten
 * seasons a set. The auto GM takes the best man on his own scout's read,
 * leaves every contract to the staff's rule and trims for tip off the way
 * simNbaGmDesk.mjs does. SIM_NBA_EARNED_DRAFT_FLEET=quick (the default) runs
 * the gate lane: no fleet. FLEET=full runs the fleet, SIM_NBA_EARNED_DRAFT_SETS
 * sets (default 12), sharded by SIM_NBA_EARNED_DRAFT_SHARD=k/n (sets k, k+n,
 * ...), each shard's careers written as JSON into SIM_NBA_EARNED_DRAFT_OUT when
 * set; SIM_NBA_EARNED_DRAFT_COMBINE=<dir> reads every shard file in it and
 * prints the table. Every career plays in a loaded copy of the bundle of its
 * own whose id epoch is seeded by the career and the run, so both arms of one
 * career walk the same ids and play the same season one, and a career's
 * numbers do not depend on how the fleet was sharded. The second run of the
 * same sets is SIM_NBA_EARNED_DRAFT_RUN=2: the same leagues with another id
 * epoch, so the scout's reads (a hash of the man's id) and the injuries (a
 * hash of it too) move.
 *
 * Controls, through SIM_NBA_EARNED_DRAFT_CONTROL, applied to the source at
 * bundle time and never on disk, each asserted to find its target exactly
 * once. With a control on the harness exits 1 when exactly its sections went
 * red (the last line says FIRED), 2 when they did not, 3 when the control
 * cannot run, 4 on a crash. =all runs every control and exits 0 only if every
 * one fired.
 *   touchseason  one stray draw before the playoffs                    (1)
 *   flatodds     the bound pick rules hand every club one weight          (2)
 *   playinmade   a play-in game counts as the playoffs: no night opens    (2, 3, 4, 8, 9)
 *   gmfirst      the night is drawn as if his club had the worst record   (3)
 *   origholder   every slot used by its first owner                       (3)
 *   shortclass   a class four short of the picks                          (3, 6)
 *   shownread    the run prints the engine's grade                        (3)
 *   redraw       the order's key takes a Math.random draw                 (4)
 *   fatclass     the curve is the old class's 70 to 87                    (6)
 *   flatclass    the curve flattened to one range                         (6)
 *   nocurve      the class ignores the curve                              (6)
 *   trustblock   any block on the desk is trusted                         (8)
 *   noneed       rivals choose on their read alone                        (9)
 *   sportname    the shared half names a sport (in memory)                (10)
 *
 * MEASURED 2026-10-12 (quick walk, fixed seeds, so the same on every run of
 * this commit), failures each control put in its sections on this PC:
 *   1   30 seasons, 315,516 draws held to 48cb9d4b; touchseason 41.
 *   2   30 seasons, a lottery on every one, none free of level records (real
 *       fields rarely are); 280 club shares over 20 seasons, the worst 3.26
 *       standard errors (band 4.5); flatodds 461, playinmade 32.
 *   3   30 drafts, 1,800 picks, 150 picks moved first (16 his), a club with
 *       three or more and a club with none in all 30, on the clock 46 times,
 *       561 rival rows; gmfirst 60, origholder 192, shortclass 30, shownread
 *       545, playinmade 32.
 *   4   30 nights, 10 tables swapped; redraw 30, playinmade 1.
 *   6   1,500 classes of 64, worst 1.63 standard errors from the curve, steps
 *       by ten slots 5.11, 3.04, 2.16, 1.72, 1.70, 1.70 (floor 1.19); fatclass
 *       3, flatclass 3, nocurve 22, shortclass 1,519.
 *   8   50 broken blocks, 50 finished the old way; trustblock 100, playinmade 1.
 *   9   1,754 rival choices, none past a better read by more than 2; taken
 *       when short vs not, G 31.7, F 29.3, C 29.6 points (floor 20); noneed
 *       4.4, -0.1, 0.9 (3 failures), playinmade 3.
 *  10   sportname 1.
 *   7   the OLD arm on 12 sets, two runs: see docs/audits/ROUND-1321-NOTES.md.
 */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const J = v => JSON.stringify(v);
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'nbaEarnedDraftFixture.json');
const NAME = 'simNbaEarnedDraft';

const CONTROL = process.env.SIM_NBA_EARNED_DRAFT_CONTROL || '';
const RECORD = process.env.SIM_NBA_EARNED_DRAFT_RECORD || '';
const FLEET = process.env.SIM_NBA_EARNED_DRAFT_FLEET || 'quick';
const COMBINE = process.env.SIM_NBA_EARNED_DRAFT_COMBINE || '';
const OUT = process.env.SIM_NBA_EARNED_DRAFT_OUT || '';

/* A crash is not a result: without this a throw exits 1, which is what a control that fired exits with. */
for (const event of ['uncaughtException', 'unhandledRejection']) {
  process.on(event, error => {
    console.error(error);
    console.log(`${NAME}: CRASHED${CONTROL ? ` under control ${CONTROL}` : ''}. Not a result.`);
    process.exit(4);
  });
}
const cannotRun = why => { console.error(`control cannot run: ${why}`); console.log(`${NAME}: control ${CONTROL || '(none)'} cannot run.`); process.exit(3); };

const SECTION_NAMES = {
  1: 'what must not move: the season before the draft, and the desk off fixture',
  2: 'the lottery through the bind: the sixteen off the numbers, drawn every season, the table\'s chances',
  3: 'the slot is the truth: every pick used once by its holder at its first owner\'s place',
  4: 'drawn once: the block survives a round trip, every press, a second open and a swapped table',
  6: 'the class: today\'s twelve, then the curve, slots plus four, never over 70',
  8: 'the fallback: a block broken mid draft finishes the old way on a valid league',
  9: 'need: a club short at a position leans to it, and never past a better read by more than the weight',
  10: 'the shared half names no sport; neither library draws from Math.random or carries an address',
  7: 'the table: the old arm on the fleet (FLEET=full only)',
};

/* control -> { expect: the sections that must go red, swaps: { file key: [[from, to]] } } */
const CONTROLS = {
  touchseason: { expect: [1], swaps: { engine: [['  const confWinners: string[] = [];', '  rng(); const confWinners: string[] = [];']] } },
  /* every man after today's twelve drawn as the old class draws them, 70 to 87 */
  fatclass: { expect: [6], swaps: { engine: [
    ['  { from: 13, to: 30, ovr: [72, 80] },', '  { from: 13, to: 30, ovr: [70, 87] },'],
    ['  { from: 31, to: 45, ovr: [69, 76] },', '  { from: 31, to: 45, ovr: [70, 87] },'],
    ['  { from: 46, to: 70, ovr: [66, 72] },', '  { from: 46, to: 70, ovr: [70, 87] },'],
  ] } },
  /* the class ignores the curve and draws every man after the twelve as the old class does */
  nocurve: { expect: [6], swaps: { engine: [['    const trueOvr = lo + Math.floor(rng() * (hi - lo + 1));', '    const trueOvr = 70 + Math.floor(rng() * 18) + 0 * (lo + hi);']] } },
  /* the bound pick rules hand every club one weight under the same table name */
  flatodds: { expect: [2], swaps: { bind: [['  return buildDraftOrder(season, rules, nbaGamePickRules(), key ?? draftSeasonKey(season, rules.id));',
    '  return buildDraftOrder(season, rules, { ...nbaGamePickRules(), lottery: { ...nbaGamePickRules().lottery!, odds: nbaGamePickRules().lottery!.odds.map(() => 100 / 14) } }, key ?? draftSeasonKey(season, rules.id));']] } },
  /* a play-in game counts as making the playoffs, so no season is drawn and no night opens */
  playinmade: { expect: [2, 3, 4, 8, 9], swaps: { bind: [['    if (s && (s.homeWins === 4 || s.awayWins === 4)) { made.add(s.home); made.add(s.away); }',
    '    if (s && (s.homeWins >= 1 || s.awayWins >= 1)) { made.add(s.home); made.add(s.away); }']] } },
  /* his slots put first: the night is drawn on a season where his club had the worst record */
  gmfirst: { expect: [3], swaps: { bind: [['  const season = nbaDraftSeason(league, series);\n  const order = season ? nbaDraftOrder(season) : null;',
    '  const real = nbaDraftSeason(league, series);\n  const season = real && { ...real, rows: real.rows.map(r => (r.id === me ? { ...r, wins: 0, losses: 82 } : r)) };\n  const order = season ? nbaDraftOrder(season) : null;']] } },
  /* every slot used by its first owner, whoever holds the pick */
  origholder: { expect: [3], swaps: { bind: [['draftSlots(order, nbaPicksOf(desk, league), league.season, 2)', 'draftSlots(order, nbaPicksOf(desk, league), league.season, 2).map(s => ({ ...s, holder: s.orig }))']] } },
  /* a class four short of the picks instead of four over */
  shortclass: { expect: [3, 6], swaps: { engine: [['  const size = Math.min(70, Math.max(0, Math.floor(slots)) + 4);', '  const size = Math.min(70, Math.max(0, Math.floor(slots)) - 4);']] } },
  /* the run prints the engine's grade, not his scout's read */
  shownread: { expect: [3], swaps: { bind: [['    shown: scout,', '    shown: p => p.grade,']] } },
  /* the order's key takes a Math.random draw, so the same season draws another night */
  redraw: { expect: [4], swaps: { bind: [['  return buildDraftOrder(season, rules, nbaGamePickRules(), key ?? draftSeasonKey(season, rules.id));',
    '  return buildDraftOrder(season, rules, nbaGamePickRules(), `${key ?? draftSeasonKey(season, rules.id)}|${Math.random()}`);']] } },
  /* any block on the desk is trusted */
  trustblock: { expect: [8], swaps: { bind: [['  return isGmDraftNight(raw, Object.keys(league.teams), league.season) ? raw : null;', '  return raw as GmDraftNight;']] } },
  /* rivals choose on their read alone */
  noneed: { expect: [9], swaps: { bind: [['    needWeight: NBA_DRAFT_NEED_WEIGHT,', '    needWeight: 0,']] } },
  /* the shared half names a sport (in memory, the shape of simGmDraftOrder's mounted control) */
  sportname: { expect: [10] },
  /* the curve flattened: every band one range */
  flatclass: { expect: [6], swaps: { engine: [
    ['  { from: 13, to: 30, ovr: [72, 80] },', '  { from: 13, to: 30, ovr: [66, 80] },'],
    ['  { from: 31, to: 45, ovr: [69, 76] },', '  { from: 31, to: 45, ovr: [66, 80] },'],
    ['  { from: 46, to: 70, ovr: [66, 72] },', '  { from: 46, to: 70, ovr: [66, 80] },'],
  ] } },
};

if (CONTROL === 'all') {
  const self = fileURLToPath(import.meta.url);
  let fired = 0;
  const lines = [];
  for (const name of Object.keys(CONTROLS)) {
    const run = spawnSync(process.execPath, [self], { env: { ...process.env, SIM_NBA_EARNED_DRAFT_CONTROL: name }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const last = String(run.stdout ?? '').trim().split('\n').pop() ?? '';
    const ok = run.status === 1 && last.includes(` CONTROL ${name} FIRED.`);
    if (ok) fired += 1;
    lines.push(`   ${ok ? 'fired ' : 'NOT OK'} exit ${run.status}  ${name.padEnd(14)} ${last.slice(0, 150)}`);
  }
  console.log(lines.join('\n'));
  const total = Object.keys(CONTROLS).length;
  console.log(fired === total ? `${NAME} controls: all ${total} fired, each in exactly its own sections.` : `${NAME} controls: ${total - fired} of ${total} DID NOT FIRE as expected.`);
  process.exit(fired === total ? 0 : 1);
}
if (CONTROL && !CONTROLS[CONTROL]) cannotRun(`${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, or all)`);
if (CONTROL && RECORD) cannotRun('a control and a recording at once');
if (!['quick', 'full'].includes(FLEET)) cannotRun(`SIM_NBA_EARNED_DRAFT_FLEET=${FLEET} is not quick or full`);

/* ---- the bundle, in a folder of this run's own so two runs cannot mix ---- */
function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) cannotRun(`no node_modules with esbuild above ${ROOT}`);
    d = up;
  }
}
const NM = modulesDir();
const FILES = {
  engine: 'src/lib/nbaFrontOffice.ts',
  desk: 'src/lib/nbaGmDesk.ts',
  bind: 'src/lib/nbaEarnedDraft.ts',
  shared: 'src/lib/gmEarnedDraft.ts',
};
const overrides = new Map();
const keyOf = abs => path.resolve(abs).toLowerCase();
if (CONTROL) {
  for (const [which, pairs] of Object.entries(CONTROLS[CONTROL].swaps ?? {})) {
    let src = fs.readFileSync(path.join(ROOT, FILES[which]), 'utf8').replaceAll('\r\n', '\n');
    for (const [from, to] of pairs) {
      const n = src.split(from).length - 1;
      if (n !== 1) cannotRun(`${FILES[which]} holds the line ${CONTROL} rewrites ${n} times, not once (${from.slice(0, 70)})`);
      const next = src.replace(from, to);
      if (next === src) cannotRun(`${CONTROL} changed nothing`);
      src = next;
    }
    overrides.set(keyOf(path.join(ROOT, FILES[which])), src);
  }
}
/* RECORDING: every src file the bundle reads comes from the base commit, so the fixture is the base's own season. */
const fromRef = rel => {
  try { return execFileSync('git', ['show', `${RECORD}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return null; }
};
let recordedFiles = 0;

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), `${NAME}-`)).replaceAll('\\', '/');
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* best effort */ } });
fs.writeFileSync(`${WORK}/entry.mjs`, `
export * as E from '${ROOT_URL}/src/lib/nbaFrontOffice.ts';
export * as D from '${ROOT_URL}/src/lib/nbaGmDesk.ts';
export * as S from '${ROOT_URL}/src/lib/gmStaff.ts';
export { nbaCloseSeasonStats } from '${ROOT_URL}/src/lib/nbaSeasonStats.ts';
export { NBA_OPENING_RATINGS } from '${ROOT_URL}/src/data/nbaOpeningRatings.ts';
export { leagueNames } from '${ROOT_URL}/src/lib/foNames.ts';
export { deadCapUsed } from '${ROOT_URL}/src/lib/frontOfficeCuts.ts';
export * as P from '${ROOT_URL}/src/lib/gmPicks.ts';
export * as GD from '${ROOT_URL}/src/lib/gmDesk.ts';
${RECORD ? '' : `export * as N from '${ROOT_URL}/src/lib/nbaEarnedDraft.ts';
export * as G from '${ROOT_URL}/src/lib/gmEarnedDraft.ts';`}
`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({
  entryPoints: [`${WORK}/entry.mjs`], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` }, outfile: `${WORK}/bundle.cjs`, logLevel: 'error',
  plugins: [{
    name: 'swap',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const loader = args.path.endsWith('.tsx') ? 'tsx' : 'ts';
        const hit = overrides.get(keyOf(args.path));
        if (hit !== undefined) return { contents: hit, loader };
        if (!RECORD) return undefined;
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (rel.startsWith('..')) return undefined;
        const old = fromRef(rel);
        if (old === null) return undefined;
        recordedFiles += 1;
        return { contents: old, loader };
      });
    },
  }],
});
/* Production is off limits: refuse to run a bundle that carries the database client. */
{
  const text = fs.readFileSync(`${WORK}/bundle.cjs`, 'utf8');
  for (const host of ['supabase.co', 'integrations/supabase']) if (text.includes(host)) cannotRun(`the bundle names ${host}`);
}
const BUNDLE = `${WORK}/bundle.cjs`;
const requireHere = createRequire(import.meta.url);
const M = requireHere(BUNDLE);
const { E, D, S, N, G, NBA_OPENING_RATINGS, leagueNames } = M;
if (RECORD) console.log(`RECORDING from ${RECORD}: ${recordedFiles} src files read from that commit`);
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}. Sections ${CONTROLS[CONTROL].expect.join(' and ')} must go red and no other.`);

/* ---- the verdict ---- */
const failures = {};
const shown = {};
let section = 0;
let checks = 0;
const ran = [];
function open(n) { section = n; ran.push(n); failures[n] = 0; shown[n] = 0; console.log(`${n}) ${SECTION_NAMES[n]}`); }
function fail(message) {
  failures[section] += 1;
  if (shown[section] < 8) { shown[section] += 1; console.error(`  FAIL [${section}]: ${message}`); }
}
function check(ok, message) { checks += 1; if (!ok) fail(typeof message === 'function' ? message() : message); }

/* ---- seeded draws and the board's own call order ---- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** The generator with its calls counted: section 1 holds the count, not only the result. */
function counted(rng) {
  const f = () => { f.calls += 1; return rng(); };
  f.calls = 0;
  return f;
}
/* Ids carry a per process epoch (entityIds.ts); a hash takes it out and keeps the counter. */
const hashOf = v => crypto.createHash('sha1').update(J(v).replace(/"n[0-9a-z]+-(\d+)"/g, '"n-$1"')).digest('hex');
/* Every club, by id, without building a league (that would mint ids before section 1). */
const CLUBS = [...E.EAST, ...E.WEST].sort();

/* Every helper below takes X, one loaded copy of the bundle: section 1 uses the first, and every career of the
   fleet gets a fresh copy (freshCopy) so its ids, and so its scout's reads, do not depend on the careers before it. */

/** The board will not tip off a roster over fifteen: the GM waives the weakest (simNbaGmDesk.mjs, trimForTipOff). */
function trimForTipOff(X, lg, team) {
  const mine = lg.teams[team];
  while (X.E.nbaTipOffRefusal(mine)) {
    const down = [...mine.players].sort((a, b) => a.ovr - b.ovr || a.id.localeCompare(b.id))[0];
    if (!X.E.nbaRelease(mine, lg.freeAgents, down.id)) break;
  }
}

/** The close of a season as the board runs it: the playoffs, the champion, the tax and the season's lines. */
function closeSeason(X, lg, rng, edges) {
  const po = X.E.runNbaPlayoffs(lg, rng, edges);
  lg.champions.push({ season: lg.season, team: po.champion });
  const taxes = X.E.nbaAssessTax(lg);
  X.nbaCloseSeasonStats(lg);
  return { series: po.series, champion: po.champion, taxes };
}

/** One season with the desk on, in the board's order, to the press of "Go to the draft". The fleet's GM makes no
    trade. `atTipOff` sees the league once every club has tipped off. */
function seasonToDraft(X, lg, team, desk, rng, atTipOff) {
  for (;;) {
    if (lg.round === 1) {
      trimForTipOff(X, lg, team);
      X.E.nbaTipOff(lg, rng, team);
      if (atTipOff) atTipOff(lg);
    }
    X.E.simRound(lg, team, rng, X.D.nbaDeskRoundOptions(desk, lg, team));
    desk = X.D.nbaDeskAfterRound(desk, lg, team).desk;
    if (lg.round >= X.E.NBA_ROUNDS) break;
    lg.round += 1;
  }
  return { desk, ...closeSeason(X, lg, rng, X.D.nbaDeskEdges(desk, lg, team)) };
}

/* ================================================================== */
open(1);
{
  /* 1a. First, before anything else mints an id, so the recorder and the replay walk the same id stream. */
  const got = {};
  for (let s = 1; s <= 30; s += 1) {
    const team = CLUBS[(s - 1) % CLUBS.length];
    const rng = counted(mulberry32(s));
    const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
    const closed = seasonToDraft(M, lg, team, D.openNbaDesk(lg, team), rng);
    /* The postseason rides on the save beside the league (the board's `postseason`), so it is hashed with it. */
    got[s] = { team, league: hashOf([lg, closed.series, closed.taxes]), desk: hashOf(closed.desk), calls: rng.calls };
  }
  if (RECORD) {
    fs.writeFileSync(FIXTURE, `${JSON.stringify({ recordedFrom: RECORD, seeds: got }, null, 2)}\n`);
    console.log(`wrote scripts/data/nbaEarnedDraftFixture.json from ${RECORD}: 30 seasons to the draft, desk on`);
    process.exit(0);
  }
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  let calls = 0;
  for (let s = 1; s <= 30; s += 1) {
    const want = fixture.seeds?.[s];
    check(want && want.team === got[s].team, `seed ${s}: the fixture's user club is ${want?.team}, this run's ${got[s].team}`);
    check(want && want.league === got[s].league, `seed ${s}: the league at the draft is not the base's (${got[s].league.slice(0, 10)} vs ${String(want?.league).slice(0, 10)})`);
    check(want && want.desk === got[s].desk, `seed ${s}: the desk at the draft is not the base's (${got[s].desk.slice(0, 10)} vs ${String(want?.desk).slice(0, 10)})`);
    check(want && want.calls === got[s].calls, `seed ${s}: the season drew ${got[s].calls} numbers, the base ${want?.calls}`);
    calls += got[s].calls;
  }
  console.log(`   1a: 30 seasons to the draft, desk on, every club the user once: league, desk and ${calls} draws held to the base ${fixture.recordedFrom}`);
  /* 1b. The desk off path is held by simNbaGmDesk's own fixture; here only that it and its harnesses did not move. */
  const held = ['scripts/data/nbaGmDeskFixture.json', 'scripts/simNbaGmDesk.mjs', 'scripts/simNbaDraftCapital.mjs', 'src/lib/nbaGmDesk.ts'];
  const diff = spawnSync('git', ['diff', '--quiet', fixture.recordedFrom, '--', ...held], { cwd: ROOT, encoding: 'utf8' });
  check(diff.status === 0, `git diff --quiet ${fixture.recordedFrom} -- ${held.join(' ')} exited ${diff.status}${diff.status === 1 ? ': one of them moved' : ': git could not answer'}`);
  console.log(`   1b: git diff --quiet ${fixture.recordedFrom} -- ${held.length} files: exit ${diff.status}`);
}

/* ================================================================== */
open(6);
{
  /* The class of an earned draft. Today's twelve are found by replaying nbaDraftClass on a twin of the generator,
     the old draft's own function, never a copy of the new one; every other man is held, number for number over
     the fleet of classes, to the curve the engine exports. */
  const CURVE = E.NBA_EARNED_CLASS_CURVE;
  /* THE CURVE'S SHAPE, whatever its tuned numbers: it covers every man from 13 to 70 once, in order; it falls band
     after band (both ends never up, the middle always down); and by the last pick it is at the minimum man's band
     (nbaMinimumMan rates 66 to 71, and 66 is the grade's own floor), so the class runs down to the end of a bench. */
  CURVE.forEach((b, i) => {
    check(b.from === (i === 0 ? 13 : CURVE[i - 1].to + 1) && b.to >= b.from && b.ovr[0] <= b.ovr[1], `the curve's band ${i + 1} (${J(b)}) does not follow the one before it`);
    if (i === 0) return;
    const a = CURVE[i - 1];
    check(b.ovr[0] <= a.ovr[0] && b.ovr[1] <= a.ovr[1] && b.ovr[0] + b.ovr[1] < a.ovr[0] + a.ovr[1], `the curve does not fall from band ${i} ${J(a.ovr)} to band ${i + 1} ${J(b.ovr)}`);
  });
  const tail = CURVE[CURVE.length - 1];
  check(tail.to === 70 && tail.ovr[0] >= 66 && tail.ovr[1] <= 72, `the curve's last band ${J(tail)} does not reach slot 70 at the minimum man's band (66 to 72)`);
  const SLOTS = 60;
  const N = 1500;
  const size = Math.min(70, SLOTS + 4);
  const observed = new Map();
  const bandSum = [];
  const bandN = [];
  let men = 0;
  let headMatched = 0;
  for (let i = 0; i < N; i += 1) {
    const cls = E.nbaEarnedDraftClass(mulberry32(60000 + i), SLOTS, new Set());
    const twin = E.nbaDraftClass(mulberry32(60000 + i), 24, new Set()).slice(0, 12);
    check(cls.length === size, () => `class ${i}: ${cls.length} men for ${SLOTS} slots, the rule is ${size}`);
    const names = new Set(cls.map(p => p.name));
    check(names.size === cls.length && new Set(cls.map(p => p.id)).size === cls.length, () => `class ${i}: two men share a name or an id`);
    for (let k = 1; k < cls.length; k += 1) check(cls[k - 1].grade >= cls[k].grade, () => `class ${i}: not sorted by grade at ${k}`);
    const head = new Set();
    for (const t of twin) {
      const p = cls.find(x => x.name === t.name);
      const same = !!p && p.trueOvr === t.trueOvr && p.grade === t.grade && p.pos === t.pos && p.age === t.age;
      check(same, () => `class ${i}: today's man ${t.name} (${t.trueOvr}) is not in the earned class as drawn`);
      if (same) { head.add(p); headMatched += 1; }
    }
    cls.forEach((p, k) => {
      /* The board's load guard on a saved class (NbaFrontOfficeBoard.tsx, the restore of a draft). */
      check(typeof p.name === 'string' && p.name.trim() !== '' && ['G', 'F', 'C'].includes(p.pos) && Number.isInteger(p.age) && p.age > 0
        && Number.isFinite(p.grade) && p.grade >= 0 && p.grade <= 99 && Number.isFinite(p.trueOvr) && p.trueOvr >= 0 && p.trueOvr <= 99,
      () => `class ${i}: ${J(p)} fails the board's load guard`);
      const band = Math.floor(k / 10);
      bandSum[band] = (bandSum[band] ?? 0) + p.trueOvr;
      bandN[band] = (bandN[band] ?? 0) + 1;
      if (head.has(p)) return;
      observed.set(p.trueOvr, (observed.get(p.trueOvr) ?? 0) + 1);
      men += 1;
    });
  }
  /* What the curve says men 13 to `size` are, rating by rating, over N classes. */
  const expected = new Map();
  const variance = new Map();
  for (let man = 13; man <= size; man += 1) {
    const b = CURVE.find(x => man >= x.from && man <= x.to) ?? CURVE[CURVE.length - 1];
    const w = b.ovr[1] - b.ovr[0] + 1;
    for (let v = b.ovr[0]; v <= b.ovr[1]; v += 1) {
      expected.set(v, (expected.get(v) ?? 0) + N / w);
      variance.set(v, (variance.get(v) ?? 0) + (N / w) * (1 - 1 / w));
    }
  }
  let worstZ = 0;
  for (let v = 0; v <= 99; v += 1) {
    const o = observed.get(v) ?? 0;
    const e = expected.get(v) ?? 0;
    if (e === 0) { check(o === 0, `${o} men after today's twelve are rated ${v}, which the curve never draws`); continue; }
    const z = Math.abs(o - e) / Math.sqrt(variance.get(v));
    worstZ = Math.max(worstZ, z);
    check(z <= 4.5, () => `men after today's twelve rated ${v}: ${o}, the curve says ${e.toFixed(0)} (${z.toFixed(1)} standard errors)`);
  }
  const bands = bandSum.map((s, b) => s / bandN[b]);
  const steps = bands.slice(1).map((m, b) => bands[b] - m);
  /* Floor: 70 percent of the smallest step measured on these fixed classes (1.70, 2026-10-12, the starting curve;
     the house rule), see MEASURED. A tuned curve is remeasured here and the floor moves with it. */
  const STEP_FLOOR = 1.19;
  steps.forEach((d, b) => check(d > STEP_FLOOR, `the mean true rating does not fall from slots ${b * 10 + 1}-${b * 10 + 10} to ${b * 10 + 11}-${Math.min(size, b * 10 + 20)} (${d.toFixed(2)})`));
  /* The size rule at every number of slots a draft can have, and two it cannot. */
  for (const s of [-3, 0, 1, 7, 8, 12, 30, 59, 60, 61, 66, 70, 75]) {
    const n = E.nbaEarnedDraftClass(mulberry32(6100 + s + 3), s, new Set()).length;
    check(n === Math.min(70, Math.max(0, s) + 4), `${s} slots gave a class of ${n}`);
  }
  check(men > 0 && headMatched === N * 12, `the fleet of classes read ${men} men after the twelve and matched ${headMatched} of today's ${N * 12}`);
  console.log(`   ${N} classes of ${size} for ${SLOTS} slots: today's twelve found in every one, ${men} men after them held to the curve rating by rating (worst ${worstZ.toFixed(2)} standard errors, band 4.5)`);
  console.log(`   mean true rating by ten slots: ${bands.map(m => m.toFixed(2)).join(', ')}; steps ${steps.map(d => d.toFixed(2)).join(', ')}`);
}

/* ================================================================== */
/* THE WALK: the earned draft through the libraries on real seasons, for sections 2, 3, 4, 8 and 9. Each league
   plays three seasons with the desk on, the board's way, and before each draft a seeded handful of this year's
   picks change hands (one club gives both of its picks to another, so a club holds none and one holds four, and
   two to four more move, his among them half the time). The GM continues, takes the best man on his scout's read
   at each of his slots and lets the draft run on; the desk's summer follows. */
const WALK_SEEDS = FLEET === 'full' ? 30 : 10;
const WALK_SEASONS = 3;
const LOTTERIES = FLEET === 'full' ? 40000 : 10000;
const Q = { 2: [], 3: [], 4: [], 8: [] };
const W = { seasons: 0, drawn: 0, tieFree: 0, drafts: 0, opened: 0, moved: 0, mineMoved: 0, three: 0, none: 0, clocks: 0, steps: 0, rivalRows: 0, swaps: 0, breaks: 0, fallbacks: 0 };
const seasonsForLotteries = [];
const needRows = [];
const shareOf = t => (t.wins + t.losses > 0 ? t.wins / (t.wins + t.losses) : 0.5);
/* The harness's own reading of the playoff sixteen: the first round's series, by name. The bind reads numbers. */
const firstRoundClubs = series => { const s = new Set(); for (const x of series) if (/ R1$/.test(x.name)) { s.add(x.home); s.add(x.away); } return s; };

function movePicksBeforeDraft(lg, team, desk, r) {
  const ids = Object.keys(lg.teams).sort();
  const any = list => list[Math.floor(r() * list.length)];
  let ledger = D.nbaPicksOf(desk, lg);
  const year = () => ledger.picks.filter(p => p.year === lg.season);
  const move = (p, to) => {
    if (p.holder === team || to === team) W.mineMoved += 1;
    ledger = M.P.movePicks(ledger, [M.P.pickKey(p)], to);
    W.moved += 1;
  };
  const giver = any(ids.filter(c => c !== team));
  const taker = any(ids.filter(c => c !== team && c !== giver));
  for (const p of year().filter(x => x.holder === giver)) move(p, taker);
  const more = 2 + Math.floor(r() * 3);
  for (let i = 0; i < more; i += 1) {
    const pool = year().filter(x => x.holder !== giver);
    const p = i === 0 && r() < 0.5 ? (pool.find(x => x.holder === team) ?? any(pool)) : any(pool);
    move(p, any(ids.filter(c => c !== p.holder && c !== giver)));
  }
  D.syncNbaPicks(lg, ledger);
  const held = ids.map(c => year().filter(p => p.holder === c).length);
  if (held.some(n => n >= 3)) W.three += 1;
  if (held.some(n => n === 0)) W.none += 1;
  return M.GD.withGmBlock(desk, D.NBA_DESK_KEYS.picks, ledger);
}

/** Section 3's first half: the saved order against the season the harness saw. Round one opens with every club out
    of the sixteen, the lottery field is worst record first, the sixteen follow worst record first, and round two is
    every club worst record first. Level records may stand in any order. */
function checkOrder(lg, series, order, where) {
  const made = firstRoundClubs(series);
  const share = id => shareOf(lg.teams[id]);
  if (made.size !== 16 || order.first.slice(0, 30 - made.size).some(c => made.has(c))) Q[3].push(`${where}: round one's head holds a club of the sixteen`);
  const rising = (list, label) => {
    for (let i = 1; i < list.length; i += 1) {
      if (share(list[i]) < share(list[i - 1]) - 1e-12) { Q[3].push(`${where}: ${label} puts ${list[i]} (${share(list[i]).toFixed(3)}) after ${list[i - 1]} (${share(list[i - 1]).toFixed(3)})`); return; }
    }
  };
  rising(order.first.slice(30 - made.size), 'round one after the lottery');
  rising(order.later, 'round two');
  if (order.lottery) rising(order.lottery.field.map(f => f.club), 'the lottery field');
}

/** Section 2 on one closed season, through the bind's own season and order. */
function checkSeason(lg, series, where) {
  W.seasons += 1;
  const season = N.nbaDraftSeason(lg, series);
  if (!season) { Q[2].push(`${where}: the bind drew no season from a closed one`); return; }
  const made = season.rows.filter(r => r.made).map(r => r.id).sort();
  if (season.rows.length !== 30 || J(made) !== J([...firstRoundClubs(series)].sort())) Q[2].push(`${where}: the bind's sixteen are not the first round's clubs`);
  const order = N.nbaDraftOrder(season);
  if (!order || order.plain !== null || !order.lottery) { Q[2].push(`${where}: no lottery was drawn (${order?.plain})`); return; }
  W.drawn += 1;
  /* Every club's chance at the first pick, worked out here from the TABLE, read by the harness itself and never off
     the saved field (a bad bind would carry it there too), and the season's records: clubs level on record share
     the chances of the seeds they span (the rule set's level odds), the rest hold their seed's. */
  const table = M.P.NBA_PICK_RULES.lottery.odds;
  const missed = season.rows.filter(r => !r.made).sort((a, b) => a.wins / (a.wins + a.losses) - b.wins / (b.wins + b.losses));
  const chance = new Map();
  let level = 0;
  for (let i = 0; i < missed.length;) {
    let j = i + 1;
    const at = r => r.wins / (r.wins + r.losses);
    while (j < missed.length && at(missed[j]) === at(missed[i])) j += 1;
    const mean = table.slice(i, j).reduce((a, b) => a + b, 0) / (j - i);
    for (let k = i; k < j; k += 1) chance.set(missed[k].id, { pct: mean, seed: k + 1, alone: j - i === 1 });
    if (j - i > 1) level += 1;
    i = j;
  }
  for (const f of order.lottery.field) {
    const c = chance.get(f.club);
    if (c?.alone && Math.abs(f.pct - table[c.seed - 1]) > 1e-9) Q[2].push(`${where}: ${f.club}, alone on its record at seed ${c.seed}, is drawn on ${f.pct}, the table says ${table[c.seed - 1]}`);
  }
  if (level === 0) W.tieFree += 1;
  if (seasonsForLotteries.length < 20) seasonsForLotteries.push({ season, chance });
}

/** Section 9's reading of one night, on a copy: every rival choice with the club's need and how far its read fell
    short of the best man left on its own read. The copy's draws are its own, so the walk is untouched. */
function readNeed(lg, team, desk, night, cls, level, key) {
  const l = JSON.parse(J(lg));
  const { host } = N.nbaDraftHost({ me: team, season: l.season, scoutLevel: level, rng: mulberry32(key) });
  let pool = JSON.parse(J(cls));
  const watched = {
    ...host,
    sign: (league, club, p, slot) => {
      if (club !== team) {
        const best = Math.max(...pool.map(x => host.read(x, club)));
        needRows.push({ need: host.need(league, club), pos: p.pos, gap: best - host.read(p, club) });
      }
      pool = pool.filter(x => x !== p);
      host.sign(league, club, p, slot);
    },
  };
  G.earnedByStaff(watched, l, JSON.parse(J(night)), team, pool);
}

/** Section 8 on one night, mid draft: a block broken at each field is never current, no press runs on it, and the
    old engine calls finish the draft and the summer on a valid league without a throw. */
function breakNight(lg, team, desk, cls, where, key) {
  const BREAKS = {
    year: n => ({ ...n, year: n.year + 1 }),
    order: n => ({ ...n, order: { ...n.order, first: [...n.order.first].reverse() } }),
    slot: n => ({ ...n, slots: n.slots.map((x, i) => (i === 5 ? { ...x, slot: x.slot + 1 } : x)) }),
    made: n => ({ ...n, made: n.slots.length + 1 }),
    seen: n => ({ ...n, seen: 'yes' }),
  };
  for (const [name, broken] of Object.entries(BREAKS)) {
    W.breaks += 1;
    const l = JSON.parse(J(lg));
    const c = JSON.parse(J(cls));
    let d = JSON.parse(J(desk));
    d = M.GD.withGmBlock(d, N.NBA_DRAFT_BLOCK, broken(d.blocks[N.NBA_DRAFT_BLOCK]));
    try {
      if (N.nbaDraftNightOf(d, l) !== null) Q[8].push(`${where}: a block broken at ${name} is still current`);
      if (N.nbaDraftContinue(l, d, team, c, mulberry32(key)) !== null) Q[8].push(`${where}: Continue ran on a block broken at ${name}`);
      d = oldDraftWith(M, l, team, mulberry32(key + 1), d, c).desk;
      const summer = D.nbaDeskOffseason(l, d, team, mulberry32(key + 2));
      if (!summer.ok) { Q[8].push(`${where}: the summer refused after the fallback at ${name}`); continue; }
      const ids = Object.values(l.teams).flatMap(t => t.players.map(p => p.id));
      const bad = [];
      if (new Set(ids).size !== ids.length) bad.push('a man on two rosters');
      if (!M.P.validateLedger(summer.desk.blocks[D.NBA_DESK_KEYS.picks], Object.keys(l.teams), D.nbaGamePickRules())) bad.push('a pick ledger that does not validate');
      if (Object.values(l.teams).some(t => E.nbaDraftCapital(t) === null)) bad.push('a draft list the engine cannot read');
      if (l.round !== 1 || l.season !== lg.season + 1) bad.push('a season that did not roll');
      if (bad.length) Q[8].push(`${where}: after the fallback at ${name}: ${bad.join(', ')}`);
      else W.fallbacks += 1;
    } catch (error) {
      Q[8].push(`${where}: the fallback at ${name} threw ${error.message}`);
    }
  }
}

/** One earned draft through the libraries, checked press by press (sections 3 and 4). Answers his first selection
    and the desk, or null when the night did not open (the old draft then runs, so the walk goes on). */
function walkDraft(lg, team, rng, desk, series, where, first) {
  const before = J(desk);
  const opened = N.openNbaDraftNight(desk, lg, series, team);
  if (!opened) { Q[3].push(`${where}: the night did not open`); return null; }
  W.opened += 1;
  const night0 = opened.night;
  desk = opened.desk;
  const again = N.openNbaDraftNight(JSON.parse(before), JSON.parse(J(lg)), series, team);
  if (!again || J(again.night) !== J(night0)) Q[4].push(`${where}: opening the same season twice gave another block`);
  if (J(N.nbaDraftNightOf(JSON.parse(J(desk)), lg)) !== J(night0)) Q[4].push(`${where}: the block does not survive a JSON round trip`);
  checkOrder(lg, series, night0.order, where);
  const ledger = D.nbaPicksOf(desk, lg);
  const held = ledger.picks.filter(p => p.year === lg.season);
  if (night0.slots.length !== held.length) Q[3].push(`${where}: ${night0.slots.length} slots for the ${held.length} picks the ledger holds`);
  for (const s of night0.slots) {
    const line = s.round === 1 ? night0.order.first : night0.order.later;
    if (line[s.slot - 1] !== s.orig) Q[3].push(`${where}: slot ${s.overall} is ${s.orig}'s, the order has ${line[s.slot - 1]} at ${s.slot}`);
    const p = held.find(x => x.round === s.round && x.orig === s.orig);
    if (!p || p.holder !== s.holder) Q[3].push(`${where}: slot ${s.overall} (${s.orig}'s round ${s.round}) is used by ${s.holder}, the ledger says ${p?.holder}`);
  }
  const level = S.gmStaffLevel(D.nbaStaffOf(desk, lg, team).block, 'scouting');
  const read = p => D.nbaScoutRead(p, team, lg.season, level);
  let cls = E.nbaEarnedDraftClass(rng, night0.slots.length, leagueNames(lg));
  const byName = new Map(cls.map(p => [p.name, p]));
  readNeed(lg, team, desk, night0, cls, level, 9000 + W.drafts);
  if (first) {
    /* Section 4: the table swapped under the saved block changes nothing in that draft. */
    const play = swap => {
      const odds = M.P.NBA_PICK_RULES.lottery.odds;
      if (swap) M.P.NBA_PICK_RULES.lottery.odds = [...odds].reverse();
      try {
        const l = JSON.parse(J(lg));
        const r = N.nbaDraftByStaff(l, JSON.parse(J(desk)), team, JSON.parse(J(cls)), mulberry32(4242));
        return r ? J([r.steps, N.nbaDraftNightOf(r.desk, l)]) : 'refused';
      } finally { M.P.NBA_PICK_RULES.lottery.odds = odds; }
    };
    W.swaps += 1;
    if (play(false) !== play(true)) Q[4].push(`${where}: swapping the table under the saved block changed the draft`);
  }
  let signed = 0;
  let firstPick = null;
  const press = (res, label) => {
    if (!res) { Q[3].push(`${where}: ${label} was refused`); return null; }
    const night = N.nbaDraftNightOf(res.desk, lg);
    if (!night || J(night.order) !== J(night0.order) || J(night.slots) !== J(night0.slots)) Q[4].push(`${where}: ${label} changed the saved order or slots`);
    const gone = cls.filter(p => !res.left.includes(p)).map(p => p.name).sort();
    if (J(gone) !== J(res.steps.map(s => s.playerName).sort())) Q[3].push(`${where}: ${label}: the class lost ${gone.length} men and ${res.steps.length} signed`);
    for (const st of res.steps) {
      const slot = night0.slots[st.overall - 1];
      if (!slot || slot.holder !== st.team || st.mine !== (st.team === team)) Q[3].push(`${where}: pick ${st.overall} made by ${st.team}, the slot is ${slot?.holder}'s`);
      if (!lg.teams[st.team]?.players.some(p => p.name === st.playerName)) Q[3].push(`${where}: ${st.playerName}, pick ${st.overall}, is not on ${st.team}`);
      if (st.mine && !firstPick) firstPick = { overall: st.overall, trueOvr: byName.get(st.playerName)?.trueOvr };
    }
    for (const row of N.nbaDraftRun(res.steps, res.onClock).night.picks) {
      if (!row.mine) W.rivalRows += 1;
      const pr = byName.get(row.playerName);
      if (!pr || row.grade !== Math.round(read(pr))) Q[3].push(`${where}: the run shows ${row.playerName} at ${row.grade}, his scout's read is ${pr ? Math.round(read(pr)) : 'nobody'}`);
      if (!lg.teams[row.team]?.players.some(p => p.name === row.playerName)) Q[3].push(`${where}: the run shows ${row.playerName} at ${row.team}, who does not have him`);
    }
    if (res.onClock) {
      W.clocks += 1;
      if (res.onClock.holder !== team || night?.made !== res.onClock.overall - 1) Q[3].push(`${where}: on the clock at ${res.onClock.overall} with ${night?.made} slots used`);
    }
    if (res.done !== (night?.made === night0.slots.length)) Q[3].push(`${where}: ${label} says done ${res.done} with ${night?.made} of ${night0.slots.length} used`);
    signed += res.steps.length;
    cls = res.left;
    desk = res.desk;
    return res;
  };
  let res = press(N.nbaDraftContinue(lg, desk, team, cls, rng), 'Continue');
  if (first && res && !res.done) breakNight(lg, team, desk, cls, where, 8000 + W.drafts);
  while (res && !res.done) {
    const best = [...cls].sort((a, b) => read(b) - read(a) || (a.id < b.id ? -1 : 1))[0];
    res = press(best ? N.nbaDraftPick(lg, desk, team, cls, best.id, rng) : N.nbaDraftByStaff(lg, desk, team, cls, rng), best ? 'his pick' : 'the staff');
  }
  if (signed !== night0.slots.length) Q[3].push(`${where}: ${signed} men signed over ${night0.slots.length} slots, so a slot found the class empty`);
  const ids = Object.values(lg.teams).flatMap(t => t.players.map(p => p.id));
  if (new Set(ids).size !== ids.length) Q[3].push(`${where}: a man is on two rosters`);
  W.drafts += 1;
  W.steps += signed;
  return { desk, first: firstPick, signed };
}

for (let seed = 1; seed <= WALK_SEEDS; seed += 1) {
  const team = CLUBS[(seed * 7) % CLUBS.length];
  const rng = mulberry32(70000 + seed);
  const lg = E.initNbaLeague(rng, NBA_OPENING_RATINGS);
  let desk = D.openNbaDesk(lg, team);
  for (let s = 1; s <= WALK_SEASONS; s += 1) {
    const where = `walk seed ${seed} season ${s} (${team})`;
    const closedSeason = seasonToDraft(M, lg, team, desk, rng);
    desk = closedSeason.desk;
    checkSeason(lg, closedSeason.series, where);
    desk = movePicksBeforeDraft(lg, team, desk, mulberry32(71000 + seed * 10 + s));
    const done = walkDraft(lg, team, rng, desk, closedSeason.series, where, s === 1);
    desk = done ? done.desk : oldDraft(M, lg, team, rng, desk).desk;
    const summer = D.nbaDeskOffseason(lg, desk, team, rng);
    if (!summer.ok) { Q[3].push(`${where}: the desk's summer refused`); break; }
    desk = summer.desk;
  }
}

open(2);
{
  for (const p of Q[2]) fail(p);
  check(W.seasons > 0 && W.drawn === W.seasons, `${W.drawn} of ${W.seasons} closed seasons drew a lottery`);
  check(seasonsForLotteries.length > 0, 'no closed season to draw keyed lotteries on');
  /* Keyed lotteries through the bind's own order on real seasons: each club's share of the first pick against the
     chance the harness worked out from the TABLE and the records, in the house band of simGmPicks (4.5 standard
     errors). Real fields are rarely free of level records (W.tieFree counts the ones that were), so a level club is
     held to the mean of the seeds its group spans; the drawing that hands out an odd combination changes with the
     key, so over the keys that is its share. MEASURED in the header. */
  let worst = 0;
  let clubs = 0;
  for (const { season, chance } of seasonsForLotteries) {
    const base = G.draftSeasonKey(season, G.draftRulesFor('nba', season.draftYear).id);
    const wins = new Map();
    for (let i = 0; i < LOTTERIES; i += 1) {
      const club = N.nbaDraftOrder(season, `${base}|k${i}`).lottery.wins[0].club;
      wins.set(club, (wins.get(club) ?? 0) + 1);
    }
    for (const [club, c] of chance) {
      clubs += 1;
      const p = c.pct / 100;
      const got = wins.get(club) ?? 0;
      const z = Math.abs(got - LOTTERIES * p) / Math.sqrt(LOTTERIES * p * (1 - p));
      worst = Math.max(worst, z);
      check(z <= 4.5, () => `${club} (seed ${c.seed}${c.alone ? '' : ', level'}) won the first pick ${got} times in ${LOTTERIES}, the table says ${(LOTTERIES * p).toFixed(0)} (${z.toFixed(1)} standard errors)`);
    }
  }
  console.log(`   ${W.seasons} closed seasons, a lottery drawn on ${W.drawn} (${W.tieFree} with no level records in the field); ${seasonsForLotteries.length} of them, ${LOTTERIES} keyed lotteries each: ${clubs} club shares, the worst ${worst.toFixed(2)} standard errors from the table (band 4.5)`);
}

open(3);
{
  for (const p of Q[3]) fail(p);
  check(W.drafts > 0 && W.opened === W.drafts, `${W.opened} nights opened, ${W.drafts} drafts played`);
  check(W.moved > 0 && W.mineMoved > 0 && W.three > 0 && W.none > 0, `picks moved ${W.moved}, his ${W.mineMoved}, a club holding three ${W.three} times, a club holding none ${W.none} times`);
  check(W.clocks > 0 && W.rivalRows > 0, `on the clock ${W.clocks} times, ${W.rivalRows} rival rows shown`);
  console.log(`   ${W.drafts} drafts, ${W.steps} picks: ${W.moved} of the year's picks moved first (${W.mineMoved} his), a club with three or more ${W.three} times, a club with none ${W.none} times; on the clock ${W.clocks} times; ${W.rivalRows} rival rows shown, every one on its club at his scout's read`);
}

open(4);
{
  for (const p of Q[4]) fail(p);
  check(W.opened > 0 && W.swaps > 0, `${W.opened} nights opened, ${W.swaps} tables swapped`);
  console.log(`   ${W.opened} nights: each opened twice to the same block, read back after a JSON round trip, unchanged by every press; ${W.swaps} drafts replayed with the table swapped under the block`);
}

open(8);
{
  for (const p of Q[8]) fail(p);
  check(W.breaks > 0 && W.fallbacks === W.breaks, `${W.fallbacks} of ${W.breaks} broken blocks finished the old way`);
  console.log(`   ${W.breaks} blocks broken mid draft (year, order, a slot, made past the end, seen): never current, no press ran, ${W.fallbacks} finished the old way to a valid league`);
}

open(9);
{
  /* Need: a rival short at a position takes it more often than one that is not; none passes a man whose read beats
     its choice by more than the need weight. Floors in MEASURED. */
  const weight = E.NBA_DRAFT_NEED_WEIGHT;
  let over = 0;
  for (const r of needRows) if (r.gap > weight + 1e-9) over += 1;
  check(over === 0, `${over} rival choices passed a man whose read beat theirs by more than ${weight}`);
  const lift = {};
  for (const pos of ['G', 'F', 'C']) {
    const short = needRows.filter(r => r.need[pos] > 0);
    const not = needRows.filter(r => r.need[pos] === 0);
    const rate = list => (list.length ? list.filter(r => r.pos === pos).length / list.length : NaN);
    lift[pos] = { short: short.length, not: not.length, gap: 100 * (rate(short) - rate(not)) };
  }
  /* 70 percent of the smallest lift measured on the quick walk (F 29.3 points, 2026-10-12); with the need weight at
     nothing (control noneed) the three read 4.4, -0.1 and 0.9. */
  const NEED_FLOOR = 20;
  for (const [pos, v] of Object.entries(lift)) check(v.short > 0 && v.not > 0 && v.gap > NEED_FLOOR, `${pos}: a club short there takes one ${v.gap.toFixed(1)} points more often than one that is not (${v.short} and ${v.not} choices), floor ${NEED_FLOOR}`);
  console.log(`   ${needRows.length} rival choices; none passed a better read by more than ${weight}; taken when short vs not, in points: ${Object.entries(lift).map(([p, v]) => `${p} ${v.gap.toFixed(1)} (${v.short}/${v.not})`).join(', ')}`);
}

open(10);
{
  /* The shared half knows no sport (correction 10), and neither new library draws from Math.random or carries an
     address. Code is read with comments stripped; the address scan reads the raw file, as simGmDraftOrder's does. */
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const raw = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let shared = strip(raw(FILES.shared));
  if (CONTROL === 'sportname') shared += "\nconst league = 'nba';\n";
  const ALLOWED = ['./gmDraftNight', './gmDraftOrder', './gmLotteryNight', './gmPicks', '@/data/gmDraftOrder/rules'];
  const froms = [...shared.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  check(froms.length > 0, `${FILES.shared} imports nothing this check can read`);
  for (const f of froms) check(ALLOWED.includes(f), `${FILES.shared} imports ${f}; the shared half may import the lift and nothing of a sport`);
  check(!/nba|nfl|nhl|mlb/i.test(shared), `${FILES.shared} names a sport in its code`);
  for (const rel of [FILES.shared, FILES.bind]) {
    check(!/Math\.random/.test(strip(raw(rel))), `${rel} draws from Math.random`);
    check(!/https?:\/\/|www\.[a-z0-9-]+\.[a-z]/i.test(raw(rel)), `${rel} carries an address`);
  }
  console.log(`   ${FILES.shared}: ${froms.length} imports, all the lift's; no sport named; neither library draws from Math.random or carries an address`);
}

/* ================================================================== */
/* THE FLEET. One career is one league, one user club, ten seasons, in a loaded copy of the bundle of its own whose
   id epoch is seeded by the career and the run, so both arms of a career walk the same ids and the same season one. */
const SEASONS = 10;
const RUN = Number(process.env.SIM_NBA_EARNED_DRAFT_RUN || 1);
function freshCopy(key) {
  delete requireHere.cache[requireHere.resolve(BUNDLE)];
  const saved = Math.random;
  Math.random = mulberry32(key);
  try { return requireHere(BUNDLE); } finally { Math.random = saved; }
}
/** The six user clubs by opening strength: the two strongest, the two in the middle, the two weakest. */
function fleetClubs() {
  const lg = E.initNbaLeague(mulberry32(1), NBA_OPENING_RATINGS);
  const ranked = [...CLUBS].sort((a, b) => E.nbaStrength(lg.teams[b]) - E.nbaStrength(lg.teams[a]) || (a < b ? -1 : 1));
  const n = ranked.length;
  return [[0, 'strong'], [1, 'strong'], [n / 2 - 1, 'middle'], [n / 2, 'middle'], [n - 2, 'weak'], [n - 1, 'weak']]
    .map(([i, tier]) => ({ club: ranked[i], tier, strength: Math.round(E.nbaStrength(lg.teams[ranked[i]]) * 100) / 100 }));
}
/** The clubs of the playoff sixteen: home or away in a series somebody won with four wins (the play-in is to one). */
function sixteenOf(series) {
  const out = new Set();
  for (const s of series) if (s.homeWins === 4 || s.awayWins === 4) { out.add(s.home); out.add(s.away); }
  return out;
}

/** Today's draft, desk on, as the board plays it (simNbaGmDesk.mjs, draftNight): the GM takes the best man on his
    scout's read first in each batch, then the other clubs go in batches of five in reverse standings. */
function oldDraft(X, lg, team, rng, desk) {
  const capital = X.E.nbaDraftCapital(lg.teams[team]) ?? 0;
  const rivalCapital = Object.values(lg.teams).filter(t => t.abbr !== team).reduce((s, t) => s + (X.E.nbaDraftCapital(t) ?? 0), 0);
  return oldDraftWith(X, lg, team, rng, desk, X.E.nbaDraftClass(rng, Math.max(24, capital + Math.min(10, rivalCapital)), X.leagueNames(lg)));
}
/** The same old draft on a class already drawn: what a board falls back to when a saved night cannot be trusted,
    with the two rival batches an open saves (the brief's open question 3). */
function oldDraftWith(X, lg, team, rng, desk, drawn) {
  const mine = lg.teams[team];
  const capital = X.E.nbaDraftCapital(mine) ?? 0;
  let cls = drawn;
  const level = X.S.gmStaffLevel(X.D.nbaStaffOf(desk, lg, team).block, 'scouting');
  const read = pr => X.D.nbaScoutRead(pr, team, lg.season, level);
  let batches = 2;
  let taken = 0;
  let first = null;
  const aiBatch = () => {
    const order = X.E.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team);
    const r = X.E.nbaAiDraftPicks(lg, cls, order, rng);
    cls = r.remaining;
    taken += r.picks.length;
    batches -= 1;
  };
  if (capital === 0) { mine.picks = []; while (batches > 0) aiBatch(); return { desk, first, signed: taken }; }
  let picksLeft = capital;
  while (picksLeft > 0) {
    const cap = X.E.nbaDraftCapital(mine) ?? 0;
    if (cap === 0) break;
    if (cap > picksLeft) mine.picks = mine.picks.slice(-picksLeft);
    const pr = [...cls].sort((a, b) => read(b) - read(a) || a.id.localeCompare(b.id))[0];
    if (!pr) break;
    const round = mine.picks[0];
    if (!X.E.nbaConsumeDraftPick(mine)) break;
    const p = X.E.nbaProspectToPlayer(pr, rng, X.E.nbaDraftSigning(lg));
    X.D.nbaSignDraftee(p, round);
    mine.players.push(p);
    desk = X.D.nbaNoteArrivals(desk, lg, team, [p.id], 'draft', round);
    taken += 1;
    if (!first) first = { overall: taken, trueOvr: pr.trueOvr };
    cls = cls.filter(x => x.id !== pr.id);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    do { if (batches === 0) break; aiBatch(); } while (nextPicks === 0 && batches > 0);
    picksLeft = nextPicks;
  }
  return { desk, first, signed: taken };
}

const ARM_DRAFT = { old: oldDraft };

/** One career: ten seasons, a draft after each, the desk's summer after each but the last. */
function career(arm, set, seed, ci, club, tier) {
  /* The league's stream is the seed's and the club's; only the id epoch follows the run. */
  const key = (100003 + seed * 64 + ci) >>> 0;
  const X = freshCopy((key ^ Math.imul(RUN, 0x5bd1e995)) >>> 0);
  const rng = mulberry32(key);
  const lg = X.E.initNbaLeague(rng, X.NBA_OPENING_RATINGS);
  let desk = X.D.openNbaDesk(lg, club);
  const rec = { arm, run: RUN, set, seed, club, tier, at: {}, seasons: [] };
  for (let s = 1; s <= SEASONS; s += 1) {
    const out = seasonToDraft(X, lg, club, desk, rng, l => {
      if (s !== 5 && s !== 10) return;
      const teams = Object.values(l.teams);
      rec.at[s] = {
        strength: teams.reduce((sum, t) => sum + X.E.nbaStrength(t), 0) / teams.length,
        stars: teams.reduce((sum, t) => sum + t.players.filter(p => p.ovr >= 85).length, 0),
      };
    });
    desk = out.desk;
    const sixteen = sixteenOf(out.series);
    const worstFirst = X.E.nbaStandings(lg).map(t => t.abbr).reverse();
    const row = {
      s, wins: lg.teams[club].wins, made: sixteen.has(club), title: out.champion === club, sixteen: sixteen.size,
      finish: worstFirst.indexOf(club) + 1,
      dead: Object.values(lg.teams).filter(t => t.abbr !== club).reduce((sum, t) => sum + X.deadCapUsed(t), 0),
      payers: out.taxes.filter(x => x.bill > 0).length,
    };
    const d = ARM_DRAFT[arm](X, lg, club, rng, desk);
    desk = d.desk;
    row.first = d.first;
    row.signed = d.signed;
    rec.seasons.push(row);
    if (s < SEASONS) {
      const summer = X.D.nbaDeskOffseason(lg, desk, club, rng);
      if (!summer.ok) { rec.refused = s; break; }
      desk = summer.desk;
    }
  }
  return rec;
}

const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const sdOf = a => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const fix = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : 'n/a');
/* The stop lines' margins, in each outcome's own unit (decision 2 of the brief): S3 and S4 in points of a rate. */
const MARGIN = { S3: 10, S4: 5 };

/** One seed set's lines. S3 is playoff seasons over seasons 2 to 5 of the two weakest starts and S4 titles over
    seasons 2 to 10 of the two strongest, per season: season 1 is played before any draft and is the same in both
    arms. S6 is seasons 2 to 10 for the same reason. n is printed beside every rate. */
function setLines(careers) {
  const rows = (tier, from, to) => careers.filter(c => !tier || c.tier === tier).flatMap(c => c.seasons.filter(r => r.s >= from && r.s <= to));
  const rate = (list, key) => ({ n: list.length, rate: list.length ? (100 * list.filter(r => r[key]).length) / list.length : NaN });
  const all = rows(null, 1, SEASONS);
  const late = rows(null, 2, SEASONS);
  const tiers = {};
  for (const t of ['strong', 'middle', 'weak']) {
    const list = rows(t, 1, SEASONS);
    tiers[t] = { playoffs: rate(list, 'made'), titles: rate(list, 'title'), wins: mean(list.map(r => r.wins)) };
  }
  const bands = [];
  for (let b = 1; b <= 6; b += 1) {
    const list = all.filter(r => r.first && Math.ceil(r.finish / 5) === b);
    bands.push({ band: `${b * 5 - 4}-${b * 5}`, n: list.length, overall: mean(list.map(r => r.first.overall)), trueOvr: mean(list.map(r => r.first.trueOvr)) });
  }
  return {
    careers: careers.length,
    S1at5: mean(careers.map(c => c.at[5]?.strength).filter(Number.isFinite)),
    S1at10: mean(careers.map(c => c.at[10]?.strength).filter(Number.isFinite)),
    S2: mean(careers.map(c => c.at[10]?.stars).filter(Number.isFinite)),
    S3: rate(rows('weak', 2, 5), 'made'),
    S4: rate(rows('strong', 2, SEASONS), 'title'),
    S5: bands,
    S6dead: mean(late.map(r => r.dead)),
    S6payers: mean(late.map(r => r.payers)),
    tiers,
    signed: mean(all.map(r => r.signed)),
  };
}

/** The smallest number of sets with root 2 times the per set sd, over root k, under a third of the margin; never under 12. */
function fleetFor(sd, margin) {
  if (!Number.isFinite(sd)) return NaN;
  let k = 12;
  while (Math.SQRT2 * sd / Math.sqrt(k) >= margin / 3) k += 1;
  return k;
}

if (FLEET === 'full' || COMBINE) {
  open(7);
  let careers = [];
  if (COMBINE) {
    for (const f of fs.readdirSync(COMBINE).filter(x => /^old-run\d+-set\d+\.json$/.test(x)).sort()) {
      careers.push(...JSON.parse(fs.readFileSync(path.join(COMBINE, f), 'utf8')));
    }
    console.log(`   combined ${careers.length} careers from ${COMBINE}`);
  } else {
    const SETS = Number(process.env.SIM_NBA_EARNED_DRAFT_SETS || 12);
    const [at, of] = (process.env.SIM_NBA_EARNED_DRAFT_SHARD || '0/1').split('/').map(Number);
    if (!Number.isInteger(at) || !Number.isInteger(of) || of < 1 || at < 0 || at >= of) cannotRun('SIM_NBA_EARNED_DRAFT_SHARD is not k/n with 0 <= k < n');
    const clubs = fleetClubs();
    console.log(`   the six user clubs by opening strength: ${clubs.map(c => `${c.club} ${c.tier} ${c.strength}`).join(', ')}`);
    const started = Date.now();
    const realRandom = Math.random;
    let randomCalls = 0;
    Math.random = () => { randomCalls += 1; return realRandom(); };
    for (let set = 1; set <= SETS; set += 1) {
      if ((set - 1) % of !== at) continue;
      const t0 = Date.now();
      const mine = [];
      for (let seed = (set - 1) * 10 + 1; seed <= set * 10; seed += 1) {
        clubs.forEach((c, ci) => mine.push(career('old', set, seed, ci, c.club, c.tier)));
      }
      careers.push(...mine);
      if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, `old-run${RUN}-set${set}.json`), J(mine)); }
      console.log(`   set ${set} (seeds ${(set - 1) * 10 + 1} to ${set * 10}), run ${RUN}: ${mine.length} careers in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    }
    Math.random = realRandom;
    console.log(`   shard ${at}/${of}: ${careers.length} careers in ${((Date.now() - started) / 1000).toFixed(1)} s; Math.random called ${randomCalls} times while the fleet played`);
  }
  check(careers.length > 0, 'the fleet played no career');
  for (const c of careers) {
    check(c.refused === undefined, () => `${c.arm} set ${c.set} seed ${c.seed} ${c.club}: the desk summer refused after season ${c.refused}`);
    check(c.seasons.length === SEASONS, () => `${c.arm} set ${c.set} seed ${c.seed} ${c.club}: ${c.seasons.length} seasons, not ${SEASONS}`);
    for (const r of c.seasons) check(r.sixteen === 16, () => `${c.arm} set ${c.set} seed ${c.seed} season ${r.s}: a playoff field of ${r.sixteen}`);
  }
  const bySet = new Map();
  for (const c of careers) {
    const k = `${c.arm} run ${c.run} set ${c.set}`;
    if (!bySet.has(k)) bySet.set(k, []);
    bySet.get(k).push(c);
  }
  const lines = [];
  for (const [k, list] of [...bySet].sort((a, b) => a[1][0].set - b[1][0].set || a[1][0].run - b[1][0].run)) {
    check(list.length === 60, `${k}: ${list.length} careers, a set is 60`);
    const L = setLines(list);
    lines.push(L);
    console.log(`   ${k}: S1 ${fix(L.S1at5)} / ${fix(L.S1at10)}, S2 ${fix(L.S2, 1)}, S3 ${fix(L.S3.rate, 1)} (n ${L.S3.n}), S4 ${fix(L.S4.rate, 1)} (n ${L.S4.n}), S6 dead ${fix(L.S6dead, 1)} payers ${fix(L.S6payers, 2)}, signed a night ${fix(L.signed, 1)}`);
    console.log(`      S5 by finish band, worst first: ${L.S5.map(b => `${b.band}: #${fix(b.overall, 1)} ${fix(b.trueOvr, 1)} (n ${b.n})`).join(', ')}`);
    console.log(`      by tier: ${Object.entries(L.tiers).map(([t, v]) => `${t} playoffs ${fix(v.playoffs.rate, 1)} titles ${fix(v.titles.rate, 1)} wins ${fix(v.wins, 1)}`).join('; ')}`);
  }
  if (lines.length > 1) {
    const pool = (f, label, d = 2) => {
      const v = lines.map(f);
      console.log(`   over ${lines.length} sets, ${label}: mean ${fix(mean(v), d)}, per set sd ${fix(sdOf(v), d)}`);
      return sdOf(v);
    };
    pool(L => L.S1at5, 'S1 mean strength at season 5 tip off');
    pool(L => L.S1at10, 'S1 mean strength at season 10 tip off');
    pool(L => L.S2, 'S2 men rated 85 or more at season 10 tip off', 1);
    const s3 = pool(L => L.S3.rate, `S3 weak starts' playoff seasons, seasons 2 to 5, per season (n ${lines[0].S3.n} a set)`, 1);
    const s4 = pool(L => L.S4.rate, `S4 strong starts' titles, seasons 2 to 10, per season (n ${lines[0].S4.n} a set)`, 1);
    pool(L => L.S6dead, 'S6 CPU dead money a season, seasons 2 to 10', 1);
    pool(L => L.S6payers, 'S6 tax payers a season, seasons 2 to 10');
    const k3 = fleetFor(s3, MARGIN.S3);
    const k4 = fleetFor(s4, MARGIN.S4);
    console.log(`   the fleet by decision 2's rule: S3 needs ${k3} sets, S4 needs ${k4}, so ${Math.max(k3, k4)} sets of ten (never fewer than 12)`);
  }
}

/* ================================================================== */
/* The verdict. Green is this summary line and exit 0, never a filtered ok. */
{
  const red = ran.filter(n => failures[n] > 0);
  for (const n of ran) console.log(`   section ${n}: ${failures[n] === 0 ? 'green' : `${failures[n]} failures`}`);
  console.log(`   ${ran.length} sections ran (${ran.join(', ')}), ${checks} checks`);
  if (CONTROL) {
    const want = CONTROLS[CONTROL].expect;
    const exact = red.length === want.length && want.every(n => red.includes(n));
    console.log(exact
      ? `${NAME}: CONTROL ${CONTROL} FIRED. Red in section ${red.join(' and ')} (${red.map(n => failures[n]).join(' and ')} failures).`
      : `${NAME}: CONTROL ${CONTROL} DID NOT FIRE as expected: red in [${red.join(', ')}], expected [${want.join(', ')}].`);
    process.exit(exact ? 1 : 2);
  }
  if (red.length) { console.log(`${NAME}: RED in section ${red.join(', ')}.`); process.exit(1); }
  console.log(`${NAME}: green.`);
  process.exit(0);
}
