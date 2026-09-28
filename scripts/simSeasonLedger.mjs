/* Season ledger harness, Round 647: the four front offices and the two
   dynasties score a season against its own projection, a season left alone
   pays next to nothing, and the pick of team does not decide what the
   economy pays.

   WHY THIS EXISTS. The first version of Round 647 scored a season on its
   record and its postseason and nothing else; the review measured it
   tracking the pick hands off at 0.77 (CFB), 0.90 (CBB) and 0.70 (NFL). The
   second version scored PAR (50) plus the season's value minus the
   projection's, and the review of that found three things this harness now
   measures: a season nobody touched paid 50 of 100 against Round 645's rule
   that zero skill pays at most 5 percent; the pick still changed what the
   economy paid through the spread and the ceiling (the best of ten idle
   seasons, a strong pick's perfect season scoring under the cap); and a GM
   could cut his three best men before the whistle, let the projection see
   the gutted roster, and sign them back (NFL +18.2 points for 3.7).

   THE RULE THIS HOLDS (src/lib/seasonLedger.ts): a season scores only the
   share of its projection's best seasons it beat. The projection plays the
   season 300 times; the bar is the season 95 percent of those reach or fall
   short of; a season at or under it scores 0, and past it the score is the
   share of the seasons above the bar that it beat (100 past all of them).
   The next season is projected at the close, from the league as the regular
   season finished it, carried through the offseason a GM who touches nothing
   gets (src/lib/seasonFormats.ts, untouched), with every man he cut that
   season counted as his.

   Sections, headless on the real engines, the real ledger and the real
   shapes. Sections 2 to 5 play careers the way the boards play them
   (scripts/lib/seasonLedgerPlay.mjs); sections 1, 6 and 7 read hands off
   seasons.
     1) the shapes are their engines (every postseason game maps to a round,
        each round has the games the shape implies, the field, series
        lengths, the spread of games played), and the untouched offseason's
        draft is the board's (the class size, the GM's picks, the rival takes
        and their order, read out of each board's code).
     2) a season left alone pays next to nothing: the idle GM (the draft's
        first name at every pick, nothing else; a dynasty signs nobody),
        IDLE_LEAGUES careers of SEASONS seasons per sport. Its mean score
        must stay at or under IDLE_LIMIT (5, Round 645's zero skill rule).
     3) the pick decides nothing. Idle, by pick strength: the correlation
        of score with opening strength, and the weakest fifth of picks
        against the strongest on the mean and the 90th percentile (the best
        of ten idle seasons, what a day of them pays under Round 648's best
        of the day, is printed by half of the pick order). Then the same
        share of headroom, the lead's rule for equal skill: each idle
        projection's own seasons past its bar, scored against it, pooled by
        fifth, must pay the same mean and 90th percentile to the weakest and
        the strongest picks. And what a scoring idle season pays, pooled
        over the six sports, the weaker half against the stronger. Every
        bound is set from measured headroom (see the constants). The
        results-alone score is computed on the same careers every run and
        MUST fail the idle checks (the check can see the rule it was
        written against).
        Printed, not judged: the same added rating (DELTA points on every
        man after the pick and every offseason). It leans to the weaker
        picks, most in the NFL, where a strong roster's season is a playoff
        lottery the bar sits inside: the same added rating is a smaller
        share of that headroom, which is the lead's rule doing what it says.
        And two real policies (the GM who signs the best free agents the
        cap allows, the coach who signs the trail's best graded names while
        the NIL lasts), which carry the game's own economy.
     4) skill counts: the GM with the added rating must beat the idle GM's
        mean by MANAGE_MARGIN in every sport.
     5) the dodge gains nothing (front offices): the same league and seed
        played straight and with the three best men cut, before the last
        period of season one (a board's last chance before the close),
        between that period and the playoffs (the review's dodge, only the
        engine allows it) or at the close, and signed back after the
        offseason. Seasons one and two together must not score more than
        DODGE_LIMIT above the straight career per sport and cut, nor more
        than DODGE_POOLED on average over all of them, and the cut men must
        actually come back (coverage).
     6) the ladder counts the round reached (bye seeds against lower seeds
        out in the same round, CFB, NFL, MLB), and it rises with every round.
     7) the CFB form term is the regular season (a conference title game
        never changes the record the ledger reads).
   It prints what a perfect season pays against every idle projection: the
   ceiling, except for the few college programs whose own projection goes
   perfect (THE LIMIT IT CANNOT HELP in src/lib/seasonLedger.ts).

   The careers play in one worker thread per sport
   (scripts/lib/seasonLedgerWorker.mjs); the numbers do not depend on it.

   Negative controls (SEASON_LEDGER_CONTROL=...). Each must turn red exactly
   the checks listed for it and nothing outside its may list. Each asserts
   its anchor is in its file EXACTLY ONCE and refuses a rewrite that changed
   nothing.
     raw     the ledger scores the results alone: idle and pick red in every
             sport.
     median  the bar at the projection's middle season: idle red in every
             sport.
     value   the points past the bar over the points left above it: the
             share of headroom red in the NFL, MLB, CFB and CBB.
     flat    a small constant whatever happened: manage red in every sport.
     wins    stageOf counts games won: bye red in CFB, NFL and MLB.
     ccg     cfbRegularRecord counts the conference title game: cfb:form.
     spread  the drawn schedules carry no spread: shape red in NBA, MLB, NHL.
     nokeep  the untouched offseason does not count the men a GM cut: the
             dodge red in the NFL, MLB and NHL and pooled (the NBA cap
             refuses most signings back, so it may stay green).

   SEASON_LEDGER_SEED_BASE shifts every seed, which is how the bounds were
   measured over several seed sets. Nothing here reads the clock.

   Run: node scripts/simSeasonLedger.mjs
*/
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEDGER_CONTROL_WORDS, LEDGER_CONTROLS, writeLedgerControl } from './lib/seasonLedgerControl.mjs';
import { Worker } from 'node:worker_threads';
import { lehmer as playLehmer } from './lib/seasonLedgerPlay.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SEASON_LEDGER_CONTROL || '';
const SEED_BASE = Number(process.env.SEASON_LEDGER_SEED_BASE || 0);
const LEDGER = LEDGER_CONTROLS.filter(c => c !== 'double');
const CONTROLS = [...LEDGER, 'ccg', 'spread', 'nokeep'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`SEASON_LEDGER_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }

const SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'cfb', 'cbb'];
const PRO = ['nfl', 'nba', 'mlb', 'nhl'];
const BYE_SPORTS = ['cfb', 'nfl', 'mlb'];
const DRAWN = ['nba', 'mlb', 'nhl'];
const each = (keys, s) => keys.map(k => `${k}:${s}`);
const SCORING = [...each(SPORTS, 'idle'), ...each(SPORTS, 'pick'), ...each(SPORTS, 'share'), ...each(SPORTS, 'manage'), ...each(PRO, 'dodge'), 'dodge', 'tail'];
const but = (...keys) => SCORING.filter(k => !keys.includes(k));
const VALUE_MUST = each(['nfl', 'mlb', 'cfb', 'cbb'], 'share');
const NOKEEP_MUST = [...each(['nfl', 'mlb', 'nhl'], 'dodge'), 'dodge'];
const EXPECT = {
  raw: { must: [...each(SPORTS, 'idle'), ...each(SPORTS, 'pick')], may: but(...each(SPORTS, 'idle'), ...each(SPORTS, 'pick')) },
  median: { must: each(SPORTS, 'idle'), may: but(...each(SPORTS, 'idle')) },
  value: { must: VALUE_MUST, may: but(...VALUE_MUST) },
  flat: { must: each(SPORTS, 'manage'), may: [] },
  wins: { must: each(BYE_SPORTS, 'bye'), may: SCORING },
  ccg: { must: ['cfb:form'], may: ['cfb:shape', 'cfb:idle', 'cfb:pick', 'cfb:share', 'cfb:manage', 'tail'] },
  spread: { must: each(DRAWN, 'shape'), may: [...each(DRAWN, 'idle'), ...each(DRAWN, 'pick'), ...each(DRAWN, 'share'), ...each(DRAWN, 'manage'), ...each(DRAWN, 'dodge'), 'dodge', 'tail'] },
  /* The NBA cap refuses most signings back, so its dodge may stay green. */
  nokeep: { must: NOKEEP_MUST, may: ['nba:dodge'] },
};

/* Sizes. Every career is SEASONS seasons; section 5 reads the first two
   seasons of the first DODGE_PAIRS idle careers as its straight arm. */
const SEASONS = 4;
const IDLE_LEAGUES = 120;
const SKILL_LEAGUES = 120;
const REPORT_LEAGUES = 40;
const DODGE_PAIRS = 100;
const DELTA = 2;
/* Bounds, set from measured headroom: SEASON_LEDGER_SEED_BASE 0, 1000 and
   2000, 480 seasons a sport and policy.
   IDLE_LIMIT is Round 645's 5 percent; the idle means measured 2.06 to 4.00.
   The idle correlation with the pick measured -0.078 to +0.059 and the
   fifth against fifth mean gap up to 4.4 points (a fifth holds about a
   dozen scoring seasons, so that gap is noisy); the results alone, on the
   same careers, sit at 0.5 and more and 20 points and more. The idle 90th
   percentile is 0 in every fifth: a season left alone scores about one
   year in twenty.
   What a scoring idle season pays, weaker half against stronger half over
   all six sports: gaps -0.6 to -5.9; the value control measured 13.4.
   The same share of headroom by fifth: mean gaps up to 6.1 (CFB, whose
   twelve game seasons tie often, and ties count half) and 90th percentile
   gaps up to 6; the value control measured 15.5 (NFL), 52 (CFB), 49 (CBB)
   and a 90th percentile gap of 28 (MLB).
   Skill over idle measured 4.19 (NFL) and up.
   The dodge, per sport and cut, measured -7.23 to +0.88 over 60 pairs,
   which is noise of about two points; the limit per estimate catches a
   dodge that pays (the review measured +14.5 net in the NFL) and the
   pooled mean, measured -3.6 to -1.9, catches a small one. */
const IDLE_LIMIT = 5;
const PICK_CORR = 0.12;
const PICK_MEAN_GAP = 8;
const PICK_P90_GAP = 10;
const TAIL_GAP = 12;
const SHARE_MEAN_GAP = 9;
const SHARE_P90_GAP = 10;
const MANAGE_MARGIN = 3;
const DODGE_LIMIT = 4;
const DODGE_POOLED = 0;
const MIN_RESIGNED = 1.5;
const MIN_BYE_PAIRS = 40;
const MIN_CCG_TEAMS = 100;

let failures = 0;
const fired = new Set();
const fail = (key, m) => { failures += 1; fired.add(key); console.error(`  FAIL [${key}]: ${m}`); };
const abort = m => { console.error(m); process.exit(1); };
const matches = (src, anchor) => src.split(anchor).length - 1;

/* ---- bundle the engines, the shapes and the ledger, regressed under a control ---- */
const TMP = (process.env.TEMP || os.tmpdir()).replace(/\\/g, '/');
const WORK = `${TMP}/simSeasonLedger.${process.pid}`;
fs.mkdirSync(WORK, { recursive: true });
let ledgerSrc = `${ROOT_URL}/src/lib/seasonLedger.ts`;
let formatsSrc = `${ROOT_URL}/src/lib/seasonFormats.ts`;
let cfbRecordSrc = `${ROOT_URL}/src/lib/cfbDynasty.ts`;
if (LEDGER.includes(CONTROL)) {
  try { ledgerSrc = writeLedgerControl(ROOT, CONTROL, WORK).replaceAll('\\', '/'); } catch (e) { abort(e.message); }
  console.log(`NEGATIVE CONTROL ON: the ledger ${LEDGER_CONTROL_WORDS[CONTROL]}`);
}
const rewriteCopy = (rel, anchor, broken, name) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n');
  if (matches(src, anchor) !== 1) abort(`control "${CONTROL}" cannot run: ${rel} holds its anchor ${matches(src, anchor)} times, not exactly once`);
  let out = src.replace(anchor, broken);
  if (out === src || matches(out, anchor) !== 0) abort(`control "${CONTROL}" cannot run: the rewrite of ${rel} changed nothing`);
  out = out.replace(/from '\.\/([^']+)'/g, (_, r) => `from '${ROOT_URL}/src/lib/${r}'`);
  const copy = `${WORK}/${name}`;
  fs.writeFileSync(copy, out);
  return copy;
};
if (CONTROL === 'ccg') {
  cfbRecordSrc = rewriteCopy('src/lib/cfbDynasty.ts',
    "  const wins = t.wins - ccgWins;\n  const losses = t.losses - (played.length - ccgWins);\n",
    "  const wins = t.wins;\n  const losses = t.losses;\n", 'cfbDynasty.ccg.control.ts');
  console.log('NEGATIVE CONTROL ON: cfbRegularRecord counts the conference title game again');
}
if (CONTROL === 'spread') {
  formatsSrc = rewriteCopy('src/lib/seasonFormats.ts',
    'const drawnSpread = (games: number) => Math.sqrt(0.75 * games);',
    'const drawnSpread = (games: number) => 0 * games;', 'seasonFormats.spread.control.ts');
  console.log('NEGATIVE CONTROL ON: the season shapes carry no spread of games played');
}
if (CONTROL === 'nokeep') {
  formatsSrc = rewriteCopy('src/lib/seasonFormats.ts',
    '  if (!mine || !cut.size) return;\n',
    '  if (!mine || !cut.size || cut.size > 0) return;\n', 'seasonFormats.nokeep.control.ts');
  console.log('NEGATIVE CONTROL ON: the untouched offseason does not count the men a GM cut');
}
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as nfl from '${ROOT_URL}/src/lib/frontOffice.ts';
export * as nba from '${ROOT_URL}/src/lib/nbaFrontOffice.ts';
export * as mlb from '${ROOT_URL}/src/lib/mlbFrontOffice.ts';
export * as nhl from '${ROOT_URL}/src/lib/nhlFrontOffice.ts';
export * as cfb from '${ROOT_URL}/src/lib/cfbDynasty.ts';
export * as cbb from '${ROOT_URL}/src/lib/cbbDynasty.ts';
export { cfbRegularRecord } from '${cfbRecordSrc}';
export * as L from '${ledgerSrc}';
export * as F from '${formatsSrc}';
`);
/* Walk up for esbuild: a worktree inside the repo has no node_modules of its own. */
let esbuild = null;
for (let d = ROOT, i = 0; i < 6 && !esbuild; i += 1, d = path.dirname(d)) {
  const js = path.join(d, 'node_modules', 'esbuild', 'bin', 'esbuild');
  if (fs.existsSync(js)) esbuild = js;
}
if (!esbuild) abort('esbuild not found in any node_modules above the repo');
execFileSync(process.execPath, [esbuild, ENTRY, '--bundle', '--format=esm', '--platform=node', `--outfile=${BUNDLE}`, '--log-level=error', `--alias:@=${ROOT_URL}/src`], { stdio: 'inherit' });
const M = await import(pathToFileURL(BUNDLE).href);
const { nfl, nba, mlb, nhl, cfb, cbb, L, F, cfbRegularRecord } = M;

const lehmer = playLehmer;
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const corr = (xs, ys) => {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i += 1) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
};
const pct = (xs, q) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length - 1e-9) - 1))]; };
/* The weakest fifth of picks and the strongest, by opening strength. */
const fifths = rows => {
  const order = [...rows].sort((a, b) => a.pick - b.pick);
  const k = Math.max(1, Math.floor(order.length / 5));
  return { weak: order.slice(0, k), strong: order.slice(-k) };
};
/* The best of ten seasons, averaged over resamples: what a day of ten
   seasons pays under the best of the day. Seeded, so the same scores give
   the same number. */
const bestOfTen = (scores, seed) => {
  const rng = lehmer(seed);
  let sum = 0;
  for (let b = 0; b < 2000; b += 1) {
    let best = 0;
    for (let i = 0; i < 10; i += 1) best = Math.max(best, scores[Math.floor(rng() * scores.length)]);
    sum += best;
  }
  return sum / 2000;
};
const t0 = Date.now();
const secs = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

/* ---- the hands off seasons sections 1, 6 and 7 read ---- */
const flatNfl = rounds => rounds.flatMap(r => r.games.map(g => ({ name: r.name, home: g.home, away: g.away, winner: g.winner })));
const ENGINES = {
  nfl: {
    shape: F.NFL_SEASON, seedMul: 101, init: rng => nfl.initLeague(rng), ids: lg => Object.keys(lg.teams),
    regular: (lg, rng) => { for (let w = 1; w <= nfl.REGULAR_WEEKS; w += 1) { nfl.injuryPass(lg.teams, rng); for (const g of lg.schedule[w - 1]) nfl.simGame(g, lg.teams, rng); lg.week = w; } },
    record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses }),
    post: (lg, rng) => { const { rounds, champion } = nfl.runPlayoffs(lg.teams, rng); return { games: flatNfl(rounds), champion, series: null }; },
    offseason: (lg, rng) => nfl.runOffseason(lg, rng), groups: () => 2,
  },
  nba: {
    shape: F.NBA_SEASON, seedMul: 103, init: rng => nba.initNbaLeague(rng), ids: lg => Object.keys(lg.teams),
    regular: (lg, rng) => { for (let r = 1; r <= nba.NBA_ROUNDS; r += 1) { nba.simRound(lg, '', rng); lg.round = r; } },
    record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses }),
    post: (lg, rng) => { const { series, champion } = nba.runNbaPlayoffs(lg, rng); return { games: series, champion, series }; },
    offseason: (lg, rng) => nba.nbaOffseason(lg, rng), groups: () => 2,
  },
  mlb: {
    shape: F.MLB_SEASON, seedMul: 107, init: rng => mlb.initMlbLeague(rng), ids: lg => Object.keys(lg.teams),
    regular: (lg, rng) => { for (let r = 1; r <= mlb.MLB_ROUNDS; r += 1) { mlb.simMlbRound(lg, '', rng); lg.round = r; } },
    record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses }),
    post: (lg, rng) => { const { series, champion } = mlb.runMlbPlayoffs(lg, rng); return { games: series, champion, series }; },
    offseason: (lg, rng) => mlb.mlbOffseason(lg, rng), groups: () => 2,
  },
  nhl: {
    shape: F.NHL_SEASON, seedMul: 109, init: rng => nhl.initNhlLeague(rng), ids: lg => Object.keys(lg.teams),
    regular: (lg, rng) => { for (let r = 1; r <= nhl.NHL_FO_ROUNDS; r += 1) { nhl.simNhlRound(lg, '', rng); lg.round = r; } },
    record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses + lg.teams[id].otLosses }),
    post: (lg, rng) => { const { series, champion } = nhl.runNhlFoPlayoffs(lg, rng); return { games: series, champion, series }; },
    offseason: (lg, rng) => nhl.nhlOffseason(lg, rng), groups: () => 2,
  },
  cfb: {
    shape: F.CFB_SEASON, seedMul: 113, init: rng => cfb.initCfb('UGA', rng), ids: st => Object.keys(st.teams),
    regular: (st, rng) => { for (let r = 1; r <= cfb.CFB_ROUNDS; r += 1) { cfb.simCfbRound(st, rng); st.round += 1; } },
    record: (st, id, p) => cfbRegularRecord(st, p.ccgs, id),
    post: (st, rng) => { const p = cfb.runCfbPostseason(st, rng); st.natties.push({ season: st.season, team: p.champion }); return { games: p.bracket, champion: p.champion, series: null, ccgs: p.ccgs, field: p.field }; },
    offseason: (st, rng) => cfb.cfbOffseason(st, rng), groups: () => cfb.CFB_CONFS.length,
  },
  cbb: {
    shape: F.CBB_SEASON, seedMul: 127, init: rng => cbb.initCbb(cbb.CBB_SCHOOLS[0].id, rng), ids: st => Object.keys(st.teams),
    regular: (st, rng) => { for (let r = 1; r <= cbb.CBB_ROUNDS; r += 1) { cbb.simCbbRound(st, rng); st.round += 1; } },
    record: (st, id) => cbb.cbbRegularRecord(st, id),
    post: (st, rng) => { const p = cbb.runMarch(st, rng); st.titles.push({ season: st.season, team: p.champion }); return { games: p.bracket, champion: p.champion, series: null, field: p.field }; },
    offseason: (st, rng) => cbb.cbbOffseason(st, rng), groups: () => cbb.CBB_CONFS.length,
  },
};
const handsOff = {};
for (const key of SPORTS) {
  const e = ENGINES[key];
  const seasons = [];
  for (let seed = 1; seed <= 20; seed += 1) {
    const rng = lehmer((seed + SEED_BASE) * e.seedMul + 29);
    const lg = e.init(rng);
    for (let s = 1; s <= 5; s += 1) {
      e.regular(lg, rng);
      const pre = Object.fromEntries(e.ids(lg).map(id => [id, { w: lg.teams[id].wins, l: lg.teams[id].losses }]));
      const post = e.post(lg, rng);
      const records = Object.fromEntries(e.ids(lg).map(id => [id, e.record(lg, id, post)]));
      seasons.push({ season: lg.season, post, pre, records });
      e.offseason(lg, rng);
    }
  }
  handsOff[key] = seasons;
}

/* ======================= 1 ======================= */
console.log('1) the six season shapes are their engines, and the untouched offseason drafts the way each board drafts');
for (const key of SPORTS) {
  const e = ENGINES[key];
  const f = e.shape.format;
  const seasons = handsOff[key];
  const problems = [];
  const groups = f.bracket === 'group' ? e.groups() : 1;
  for (const { post } of seasons) {
    const byRound = new Map();
    for (const g of post.games) {
      const r = e.shape.roundOf(g.name);
      if (r === 0 && !/Play-In/.test(g.name)) problems.push(`"${g.name}" maps to no round`);
      if (r > 0) byRound.set(r, (byRound.get(r) ?? 0) + 1);
    }
    if (byRound.size !== e.shape.rounds) problems.push(`${byRound.size} rounds played, the shape says ${e.shape.rounds}`);
    if (byRound.get(e.shape.rounds) !== 1) problems.push(`the last round had ${byRound.get(e.shape.rounds)} games`);
    const entered = new Set(post.games.filter(g => e.shape.roundOf(g.name) > 0).flatMap(g => [g.home, g.away]));
    if (entered.size !== f.field * groups) problems.push(`${entered.size} teams in the bracket, the shape says ${f.field * groups}`);
    if (post.series) {
      for (const s of post.series) {
        const r = e.shape.roundOf(s.name);
        if (r > 0 && Math.max(s.homeWins, s.awayWins) !== f.winsToAdvance[r - 1]) problems.push(`${s.name} was won in ${Math.max(s.homeWins, s.awayWins)}, the shape says ${f.winsToAdvance[r - 1]}`);
      }
    }
  }
  if (e.shape.roundNames.length !== e.shape.rounds) problems.push(`${e.shape.roundNames.length} round names for ${e.shape.rounds} rounds`);
  const counts = seasons.flatMap(s => Object.values(s.records).map(r => r.games));
  const sd = Math.sqrt(mean(counts.map(x => (x - mean(counts)) ** 2)));
  const want = f.gamesSpread;
  const spreadOk = want === 0 ? sd === 0 : Math.abs(sd - want) <= 0.15 * want;
  if (!spreadOk) problems.push(`games played spread ${sd.toFixed(2)}, the shape carries ${want.toFixed(2)}`);
  console.log(`   ${key}: ${seasons.length} postseasons read, games played ${mean(counts).toFixed(1)} +/- ${sd.toFixed(2)} (shape ${f.games} +/- ${want.toFixed(2)}), ${problems.length} problem(s)`);
  if (problems.length) fail(`${key}:shape`, `${problems.length} case(s), first: ${[...new Set(problems)].slice(0, 3).join(' | ')}`);
}
{
  /* The board's draft, read out of its code (comments stripped): the class
     it draws, the picks it gives, the rival takes after each pick and the
     order they go in. The untouched offseason drafts with FO_DRAFTS and the
     order written beside it in seasonFormats.ts; a board that changes any
     of these without the shape would project a draft nobody plays. */
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  const code = rel => strip(fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n'));
  const formats = code('src/lib/seasonFormats.ts');
  const BOARD = {
    nfl: ['src/components/front-office/FrontOfficeBoard.tsx', 'generateDraftClass(Math.random, SIZE, leagueNames(lg))', 'draftOrder(lg.teams).filter(a => a !== myTeam)', 'draftOrder(lg.teams).filter(a => a !== team)'],
    nba: ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx', 'nbaDraftClass(Math.random, SIZE, leagueNames(lg))', 'nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam)', 'nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team)'],
    mlb: ['src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', 'mlbDraftClass(Math.random, SIZE, leagueNames(lg))', 'mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam)', 'mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team)'],
    nhl: ['src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', 'nhlDraftClass(Math.random, SIZE, leagueNames(lg))', 'nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam)', 'nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== team)'],
  };
  for (const key of PRO) {
    const [file, cls, boardOrder, shapeOrder] = BOARD[key];
    const d = F.FO_DRAFTS[key];
    const src = code(file);
    const wanted = [cls.replace('SIZE', String(d.size)), `setPicksLeft(${d.picks})`, `remaining.slice(0, ${d.rivals})`, boardOrder];
    const missing = wanted.filter(w => matches(src, w) < 1);
    if (!formats.includes(shapeOrder)) missing.push(`seasonFormats.ts: ${shapeOrder}`);
    console.log(`   ${key}: the board draws ${d.size}, gives ${d.picks} picks, the rivals take ${d.rivals} after each in the board's order: ${missing.length ? `${missing.length} missing` : 'read in the board'}`);
    if (missing.length) fail(`${key}:shape`, `the untouched draft is not the board's: ${missing.join(' | ')}`);
  }
}

/* ======================= 2 to 5: careers the way the boards play them ======================= */
/* One worker thread per sport, each loading the bundle above and playing
   its careers through scripts/lib/seasonLedgerPlay.mjs, so the six sports
   play at once. The numbers do not depend on the threads: every career
   draws from its own seeded stream. */
const data = Object.fromEntries(await Promise.all(SPORTS.map(key => new Promise((resolve, reject) => {
  const w = new Worker(new URL('./lib/seasonLedgerWorker.mjs', import.meta.url), {
    workerData: {
      bundle: BUNDLE, key, seedBase: SEED_BASE, seasons: SEASONS, idleLeagues: IDLE_LEAGUES, skillLeagues: SKILL_LEAGUES,
      reportLeagues: REPORT_LEAGUES, dodgePairs: DODGE_PAIRS, delta: DELTA, pro: PRO.includes(key),
    },
  });
  w.once('message', m => { console.log(`   (${key}: ${m.idle.length} idle, ${m.skill.length} skilled and ${m.real.length} real policy seasons played, ${secs()})`); resolve([key, m]); });
  w.once('error', reject);
  w.once('exit', code => { if (code !== 0) reject(new Error(`the ${key} worker exited ${code}`)); });
}))));

console.log(`2) a season left alone pays next to nothing: the idle GM's mean score, at most ${IDLE_LIMIT} of 100`);
for (const key of SPORTS) {
  const sc = data[key].idle.map(r => r.score);
  const m = mean(sc);
  console.log(`   ${key}: ${sc.length} idle seasons, mean ${m.toFixed(2)}, ${(100 * sc.filter(x => x > 0).length / sc.length).toFixed(1)} percent scored at all`);
  if (!(m <= IDLE_LIMIT)) fail(`${key}:idle`, `an idle season pays ${m.toFixed(2)} on average (limit ${IDLE_LIMIT})`);
}

console.log('3) the pick decides nothing: weakest fifth of picks against strongest, idle and skilled');
const sc = rs => rs.map(r => r.score);
const tails = { weaker: [], stronger: [] };
for (const key of SPORTS) {
  const { weak, strong } = fifths(data[key].idle);
  const c = corr(data[key].idle.map(r => r.pick), sc(data[key].idle));
  const gapMean = mean(sc(strong)) - mean(sc(weak));
  const gapP90 = pct(sc(strong), 0.9) - pct(sc(weak), 0.9);
  /* The halves of the pick order: the best of ten idle seasons (printed,
     noisy: a fifth holds a dozen scoring seasons) and what a scoring idle
     season pays (pooled over the sports below). */
  const byPick = [...data[key].idle].sort((a, b) => a.pick - b.pick);
  const lowHalf = byPick.slice(0, byPick.length >> 1), highHalf = byPick.slice(byPick.length >> 1);
  tails.weaker.push(...sc(lowHalf).filter(x => x > 0));
  tails.stronger.push(...sc(highHalf).filter(x => x > 0));
  /* The equal share of headroom: every idle projection's own seasons past
     its bar, scored against it, pooled by fifth of the pick. A GM who
     lands his seasons in that headroom as often as the projection does has
     won the same share of it whoever the pick is, and the lead's rule is
     that he is paid the same: the mean and the 90th percentile. */
  const shareOf = rs => rs.flatMap(r => r.headroom);
  const shMean = mean(shareOf(strong)) - mean(shareOf(weak));
  const shP90 = pct(shareOf(strong), 0.9) - pct(shareOf(weak), 0.9);
  const saturated = data[key].idle.filter(r => !r.headroom.length).length;
  /* The same added rating, printed: see the header for why it leans. */
  const sk = fifths(data[key].skill);
  console.log(`   ${key} idle: corr with the pick ${c.toFixed(3)}; mean ${mean(sc(weak)).toFixed(1)} weak, ${mean(sc(strong)).toFixed(1)} strong; p90 ${pct(sc(weak), 0.9)} and ${pct(sc(strong), 0.9)}; best of ten ${bestOfTen(sc(lowHalf), 13).toFixed(1)} weaker half, ${bestOfTen(sc(highHalf), 11).toFixed(1)} stronger half`);
  console.log(`   ${key} the same share of headroom: mean ${mean(shareOf(weak)).toFixed(1)} weak, ${mean(shareOf(strong)).toFixed(1)} strong; p90 ${pct(shareOf(weak), 0.9)} and ${pct(shareOf(strong), 0.9)} (${shareOf(data[key].idle).length} projected seasons, ${saturated} projection(s) with no season past the bar)`);
  console.log(`   ${key} the same added rating (+${DELTA} a man a season, printed, not judged): mean ${mean(sc(sk.weak)).toFixed(1)} weak, ${mean(sc(sk.strong)).toFixed(1)} strong; p90 ${pct(sc(sk.weak), 0.9)} and ${pct(sc(sk.strong), 0.9)}`);
  if (Math.abs(c) > PICK_CORR || Math.abs(gapMean) > PICK_MEAN_GAP || Math.abs(gapP90) > PICK_P90_GAP) {
    fail(`${key}:pick`, `idle seasons pay by pick: corr ${c.toFixed(3)} (bound ${PICK_CORR}), mean gap ${gapMean.toFixed(1)} (bound ${PICK_MEAN_GAP}), p90 gap ${gapP90} (bound ${PICK_P90_GAP})`);
  }
  if (Math.abs(shMean) > SHARE_MEAN_GAP || Math.abs(shP90) > SHARE_P90_GAP) {
    fail(`${key}:share`, `the same share of headroom pays by pick: mean gap ${shMean.toFixed(1)} (bound ${SHARE_MEAN_GAP}), p90 gap ${shP90} (bound ${SHARE_P90_GAP})`);
  }
  /* The positive control, every run: the results alone, on the same idle
     careers, must fail the idle checks. */
  const raw = rs => rs.map(r => Math.min(100, Math.round(r.value)));
  const rawGap = mean(raw(strong)) - mean(raw(weak));
  if (!(mean(raw(data[key].idle)) > IDLE_LIMIT && Math.abs(rawGap) > PICK_MEAN_GAP)) fail(`${key}:blind`, `the checks cannot see the results-alone score (mean ${mean(raw(data[key].idle)).toFixed(1)}, fifth gap ${rawGap.toFixed(1)})`);
  /* Printed, not judged: the real policies, which carry the game's economy. */
  const rf = fifths(data[key].real);
  console.log(`   ${key} ${PRO.includes(key) ? 'signing the best free agents' : 'signing the trail\'s best names'} (printed, not judged): mean ${mean(sc(data[key].real)).toFixed(1)}, ${mean(sc(rf.weak)).toFixed(1)} weak and ${mean(sc(rf.strong)).toFixed(1)} strong`);
}
{
  /* What a scoring idle season pays, the weaker half of every sport's picks
     against the stronger half, pooled: a season left alone is past the bar
     equally often whoever the pick, and when it is, it must pay the same.
     Measured as points past the bar over the points left above it, a
     favourite's lucky season took a big share of a small headroom. */
  const gap = mean(tails.stronger) - mean(tails.weaker);
  console.log(`   a scoring idle season pays ${mean(tails.weaker).toFixed(1)} on the weaker half of the picks (${tails.weaker.length} seasons) and ${mean(tails.stronger).toFixed(1)} on the stronger half (${tails.stronger.length}), gap ${gap.toFixed(1)}`);
  if (Math.abs(gap) > TAIL_GAP) fail('tail', `a scoring idle season pays by pick: gap ${gap.toFixed(1)} (bound ${TAIL_GAP})`);
  /* The ceiling, printed: a perfect season (every game won and the title)
     against each idle season's projection. It pays the full 100 unless the
     projection itself went perfect, which only a dominant college program's
     does (see THE LIMIT IT CANNOT HELP in src/lib/seasonLedger.ts). */
  const lines = SPORTS.map(key => {
    const pays = data[key].idle.map(r => r.perfect);
    return `${key} ${pays.filter(x => x === 100).length} of ${pays.length} (lowest ${Math.min(...pays)}, ${pays.filter(x => x === 0).length} pay 0)`;
  });
  console.log(`   a perfect season against each idle projection pays the full 100: ${lines.join(', ')}`);
}

console.log(`4) skill counts: the skilled GM (+${DELTA} a man a season) against the idle one, at least ${MANAGE_MARGIN} more on average`);
for (const key of SPORTS) {
  const d = mean(sc(data[key].skill)) - mean(sc(data[key].idle));
  console.log(`   ${key}: skilled ${mean(sc(data[key].skill)).toFixed(2)}, idle ${mean(sc(data[key].idle)).toFixed(2)}, ${d.toFixed(2)} more`);
  if (!(d >= MANAGE_MARGIN)) fail(`${key}:manage`, `skill pays only ${d.toFixed(2)} more than an idle season (need ${MANAGE_MARGIN})`);
}

console.log(`5) the dodge gains nothing: the three best men cut and signed back, against the same league played straight, seasons one and two`);
const DODGES = [
  ['cutBefore', 'cut before the last period'],
  ['cutPlayoffs', 'cut between the last period and the playoffs'],
  ['cutAfter', 'cut at the close'],
];
const signedBack = [];
const allGains = [];
for (const key of PRO) {
  for (const [policy, words] of DODGES) {
    const { gains, back } = data[key].dodge[policy];
    const g = mean(gains);
    allGains.push(...gains);
    if (policy !== 'cutBefore') signedBack.push(...back);
    console.log(`   ${key} ${words}: ${gains.length} pairs, ${g >= 0 ? '+' : ''}${g.toFixed(2)} points over two seasons, ${mean(back).toFixed(2)} of 3 signed back`);
    if (!(g <= DODGE_LIMIT)) fail(`${key}:dodge`, `${words}: cutting and signing back gains ${g.toFixed(2)} points (limit ${DODGE_LIMIT})`);
  }
}
console.log(`   all four sports and all three cuts together: ${allGains.length} pairs, ${mean(allGains) >= 0 ? '+' : ''}${mean(allGains).toFixed(2)} points over two seasons`);
if (!(mean(allGains) <= DODGE_POOLED)) fail('dodge', `cutting and signing back gains ${mean(allGains).toFixed(2)} points on average over every sport and cut (limit ${DODGE_POOLED})`);
/* Coverage: the dodge was really played. Rivals sign most men cut before
   the last period, and the NBA cap refuses most signings back, so the
   floor is on the other two cuts over all four sports together. */
console.log(`   cut men signed back after the offseason, the two later cuts over all four sports: ${mean(signedBack).toFixed(2)} of 3`);
if (mean(signedBack) < MIN_RESIGNED) fail('coverage', `only ${mean(signedBack).toFixed(2)} of 3 cut men came back, so the dodge was not played`);

/* ======================= 6 ======================= */
console.log('6) the ladder counts the round reached: a bye seed out in its first game is paid what a lower seed out in the same round is');
{
  const bad = [];
  for (let R = 1; R <= 6; R += 1) for (let s = 1; s <= R + 1; s += 1) if (!(L.ladderPoints(s, R) > L.ladderPoints(s - 1, R))) bad.push(`rounds ${R}: stage ${s} pays ${L.ladderPoints(s, R)}, stage ${s - 1} pays ${L.ladderPoints(s - 1, R)}`);
  if (bad.length) fail('ladder', `the ladder does not rise with every round: ${bad.slice(0, 3).join(' | ')}`);
}
for (const key of BYE_SPORTS) {
  const e = ENGINES[key];
  let pairs = 0;
  const bad = [];
  for (const { post, season } of handsOff[key]) {
    const inBracket = post.games.filter(g => e.shape.roundOf(g.name) > 0);
    const teams = [...new Set(inBracket.flatMap(g => [g.home, g.away]))].filter(id => id !== post.champion);
    const info = teams.map(id => {
      const mine = inBracket.filter(g => g.home === id || g.away === id).map(g => e.shape.roundOf(g.name));
      const stage = L.stageOf(post.games, id, e.shape.roundOf, e.shape.rounds, post.champion);
      return { id, bye: Math.min(...mine) > 1, out: Math.max(...mine), pts: L.ladderPoints(stage, e.shape.rounds) };
    });
    for (const b of info.filter(x => x.bye)) {
      for (const n of info.filter(x => !x.bye && x.out === b.out)) {
        pairs += 1;
        if (b.pts !== n.pts) bad.push(`${season}: bye seed ${b.id} out in round ${b.out} paid ${b.pts.toFixed(1)}, ${n.id} out in the same round paid ${n.pts.toFixed(1)}`);
      }
    }
  }
  console.log(`   ${key}: ${pairs} pairs of a bye seed and a lower seed out in the same round, ${bad.length} paid differently`);
  if (bad.length) fail(`${key}:bye`, `${bad.length} case(s), first: ${bad.slice(0, 2).join(' | ')}`);
  if (pairs < MIN_BYE_PAIRS) fail('coverage', `${key}: only ${pairs} bye pairs, too few for the check to mean anything`);
}

/* ======================= 7 ======================= */
console.log('7) the form term is the regular season: a CFB conference title game never changes the record the ledger reads');
{
  let teams = 0;
  const bad = [];
  for (const { post, pre, records, season } of handsOff.cfb) {
    for (const g of post.ccgs) {
      for (const id of [g.home, g.away]) {
        teams += 1;
        const r = records[id];
        if (r.wins !== pre[id].w || r.games !== pre[id].w + pre[id].l) bad.push(`${season} ${id}: ${pre[id].w}-${pre[id].l} before the title game, the ledger reads ${r.wins} of ${r.games}`);
      }
    }
  }
  console.log(`   cfb: ${teams} title game teams, ${bad.length} read a record other than the regular season`);
  if (bad.length) fail('cfb:form', `${bad.length} case(s), first: ${bad.slice(0, 2).join(' | ')}`);
  if (teams < MIN_CCG_TEAMS) fail('coverage', `cfb: only ${teams} title game teams, too few for the check to mean anything`);
}

fs.rmSync(WORK, { recursive: true, force: true });
console.log(`\n(${secs()})`);
if (CONTROL) {
  const { must, may } = EXPECT[CONTROL];
  const missing = must.filter(x => !fired.has(x));
  const leaked = [...fired].filter(x => !must.includes(x) && !may.includes(x));
  if (leaked.length) abort(`control "${CONTROL}" is not specific, it turned checks red it was not written to break: ${leaked.join(', ')}`);
  if (missing.length) abort(`control "${CONTROL}": the check is dead where it should have fired: ${missing.join(', ')}`);
  console.log(`control "${CONTROL}": ${must.join(', ')} went red and nothing outside its list did, the check works`);
  process.exit(0);
}
if (failures > 0) { console.error(`simSeasonLedger: ${failures} failure(s)`); process.exit(1); }
console.log('simSeasonLedger: all green. Six season shapes match their engines and their boards\' drafts, an idle season pays next to nothing, the pick does not decide what an idle season or the same share of headroom pays, skill counts, cutting and signing back gains nothing, the ladder counts the round reached, and the form term is the regular season.');
