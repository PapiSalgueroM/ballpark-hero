/* Season ledger harness, Round 647: the four front offices and the two
   dynasties score a season against its own projection, and the pick of team
   does not decide the number.

   WHY THIS EXISTS. The first version of Round 647 scored a season on its
   record and its postseason and nothing else, and its fence proved only
   that two teams with IDENTICAL results scored the same. That fence passes
   the old titles * 100 rule too, and it passed a score the review measured
   tracking the pick hands off at 0.77 (CFB), 0.90 (CBB) and 0.70 (NFL):
   Duke averaged 84 and Butler 6 for doing nothing. The review also found a
   bye seed paid less than a lower seed out in the same round, and a CFB
   team paid less form for reaching its conference title game. Every check
   below measures one of those outcomes on the real engines.

   Sections, all headless on the real engines (src/lib/frontOffice.ts and its
   three siblings, cfbDynasty.ts, cbbDynasty.ts), the real ledger and the
   real season shapes (src/lib/seasonLedger.ts, src/lib/seasonFormats.ts):

     1) the shapes are their engines. The projection plays each sport from
        its shape, so a shape that drifts biases the score against whoever
        the drift favours. Over real seasons: every postseason game maps to a
        round, each round has the games the shape implies, the field is the
        shape's size, a series takes the wins the shape says, and the spread
        of games played is the one the shape carries (within 15 percent).
     2) the pick decides nothing. Hands off careers, every team of every
        league a pick, 20 seeds by 5 seasons, each season projected the way
        the boards project it (a front office at the pick and after each
        offseason, a dynasty at the pick and when the trail opens). Two
        statistics per sport against opening roster strength: the
        correlation, and the gap between the strongest fifth of picks and
        the weakest fifth, in points. Both must sit inside bounds set from
        measured headroom. The same statistics are run on the same careers
        for the old rule (titles * 100 + seasonsPlayed * 5, recorded on a
        title) and for the results alone (the first version), and each of
        those MUST fail them: a pick check that cannot see the rules it was
        written against is not a check.
     3) management still counts. 80 paired seasons on the same league, seed
        and pick: in a front office, keeping the roster against cutting its
        three best players right after the projection; in a dynasty, signing
        the best graded recruits and portal players the NIL allows against
        signing nobody. Both seasons of a pair are played on the same random
        stream (a dynasty's trail and offseason draw from a side generator),
        so the difference is the management. The better managed season must
        outscore the worse one on average by a margin set from measured
        headroom, in every sport.
     4) the ladder counts the round reached. In the three sports with byes
        (CFB, NFL, MLB), every pair of a bye seed and a lower seed that went
        out in the same round must be paid the same ladder points, over
        enough pairs to mean something; and the ladder rises with every
        round.
     5) the form term is the regular season. Every CFB team that played a
        conference title game has the regular season record it had before
        the game, so reaching it can never lower the form term.

   Negative controls (SEASON_LEDGER_CONTROL=...). Each must turn red exactly
   the checks listed for it; anything else going red refuses the control as
   not specific. Each asserts its anchor is in its file EXACTLY ONCE and
   refuses to run if the rewrite changed nothing.
     raw     the ledger scores the results and not the projection: section
             2's pick check goes red in every sport.
     titles  the ledger pays a title the ceiling and nothing else: section 2
             goes red in every sport (section 3 may).
     flat    the ledger pays par whatever happened: section 3 goes red in
             every sport, and section 2 stays green, which is why section 3
             exists.
     wins    stageOf counts games won instead of the round reached: section
             4 goes red in all three bye sports (section 2 may move).
     ccg     cfbRegularRecord puts the conference title game back in:
             section 5 goes red (CFB's section 2 may move, and section 1's
             games played check may see the thirteen game seasons too).
     spread  the drawn schedule spread is zero in the season shapes: section
             1 goes red for the NBA, MLB and NHL (section 2 may move there).

   SEASON_LEDGER_SEED_BASE shifts every seed, which is how the bounds were
   measured over several seed sets. Nothing here reads the clock.

   Run: node scripts/simSeasonLedger.mjs
*/
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LEDGER_CONTROL_WORDS, writeLedgerControl } from './lib/seasonLedgerControl.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SEASON_LEDGER_CONTROL || '';
const SEED_BASE = Number(process.env.SEASON_LEDGER_SEED_BASE || 0);
const LEDGER = ['raw', 'titles', 'flat', 'wins'];
const CONTROLS = [...LEDGER, 'ccg', 'spread'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`SEASON_LEDGER_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }

const SPORTS = ['nfl', 'nba', 'mlb', 'nhl', 'cfb', 'cbb'];
const BYE_SPORTS = ['cfb', 'nfl', 'mlb'];
const DRAWN = ['nba', 'mlb', 'nhl'];
const each = (keys, s) => keys.map(k => `${k}:${s}`);
const EXPECT = {
  raw: { must: each(SPORTS, 'pick'), may: [] },
  titles: { must: each(SPORTS, 'pick'), may: each(SPORTS, 'manage') },
  flat: { must: each(SPORTS, 'manage'), may: [] },
  wins: { must: each(BYE_SPORTS, 'bye'), may: each(SPORTS, 'pick') },
  ccg: { must: ['cfb:form'], may: ['cfb:pick', 'cfb:shape'] },
  spread: { must: each(DRAWN, 'shape'), may: each(DRAWN, 'pick') },
};

/* Bounds, set from measured headroom (SEASON_LEDGER_SEED_BASE 0, 1000, 2000,
   3000 and 4000, each 20 leagues by 5 seasons in every sport): the score's
   correlation with opening strength sat between -0.052 and +0.010, and the
   strongest fifth against the weakest between -1.6 and +0.5 points. On the
   same careers the results alone sat at 0.534 to 0.864 and 21.7 to 50.3
   points, and the old titles rule at 0.158 to 0.278 and 10.0 to 22.3
   points, so both bounds sit between the two with room either side. */
const PICK_CORR = 0.12;
const PICK_GAP = 5;
/* Management, 80 pairs, same five seed sets: the better managed season
   scored 3.8 to 18.3 more on average, the lowest sports being CFB (3.8 to
   6.5) and MLB (3.9 to 8.3). The margin sits more than two points under
   every measured mean and far above the zero a score nobody can move gives. */
const MANAGE_MARGIN = 1.5;
/* Coverage floors: measured 180 to 374 bye pairs a sport and 1000 title game
   teams on every seed set. */
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

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const corr = (xs, ys) => {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i += 1) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
};
/* The strongest fifth of picks against the weakest fifth, in points. */
const fifthGap = (pick, score) => {
  const order = pick.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const k = Math.max(1, Math.floor(order.length / 5));
  return mean(order.slice(-k).map(i => score[i])) - mean(order.slice(0, k).map(i => score[i]));
};

/* ---- the six sports, driven the way their boards drive them ---- */
const flatNfl = rounds => rounds.flatMap(r => r.games.map(g => ({ name: r.name, home: g.home, away: g.away, winner: g.winner })));
const ENGINES = {
  nfl: {
    shape: F.NFL_SEASON, dynasty: false, seedMul: 101,
    init: rng => nfl.initLeague(rng),
    ids: lg => Object.keys(lg.teams),
    regular: (lg, rng) => { for (let w = 1; w <= nfl.REGULAR_WEEKS; w += 1) { nfl.injuryPass(lg.teams, rng); for (const g of lg.schedule[w - 1]) nfl.simGame(g, lg.teams, rng); lg.week = w; } },
    record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses }),
    post: (lg, rng) => { const { rounds, champion } = nfl.runPlayoffs(lg.teams, rng); return { games: flatNfl(rounds), champion, series: null }; },
    offseason: (lg, rng) => nfl.runOffseason(lg, rng),
    cut: (lg, id) => { const t = lg.teams[id]; for (const p of [...t.players].sort((a, b) => b.ovr - a.ovr).slice(0, 3)) nfl.releasePlayer(t, lg.freeAgents, p.id); },
    groups: () => 2,
  },
  nba: {
    shape: F.NBA_SEASON, dynasty: false, seedMul: 103,
    init: rng => nba.initNbaLeague(rng),
    ids: lg => Object.keys(lg.teams),
    regular: (lg, rng) => { for (let r = 1; r <= nba.NBA_ROUNDS; r += 1) { nba.simRound(lg, '', rng); lg.round = r; } },
    record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses }),
    post: (lg, rng) => { const { series, champion } = nba.runNbaPlayoffs(lg, rng); return { games: series, champion, series }; },
    offseason: (lg, rng) => nba.nbaOffseason(lg, rng),
    cut: (lg, id) => { const t = lg.teams[id]; for (const p of [...t.players].sort((a, b) => b.ovr - a.ovr).slice(0, 3)) nba.nbaRelease(t, lg.freeAgents, p.id); },
    groups: () => 2,
  },
  mlb: {
    shape: F.MLB_SEASON, dynasty: false, seedMul: 107,
    init: rng => mlb.initMlbLeague(rng),
    ids: lg => Object.keys(lg.teams),
    regular: (lg, rng) => { for (let r = 1; r <= mlb.MLB_ROUNDS; r += 1) { mlb.simMlbRound(lg, '', rng); lg.round = r; } },
    record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses }),
    post: (lg, rng) => { const { series, champion } = mlb.runMlbPlayoffs(lg, rng); return { games: series, champion, series }; },
    offseason: (lg, rng) => mlb.mlbOffseason(lg, rng),
    cut: (lg, id) => { const t = lg.teams[id]; for (const p of [...t.players].sort((a, b) => b.ovr - a.ovr).slice(0, 3)) mlb.mlbRelease(t, lg.freeAgents, p.id); },
    groups: () => 2,
  },
  nhl: {
    shape: F.NHL_SEASON, dynasty: false, seedMul: 109,
    init: rng => nhl.initNhlLeague(rng),
    ids: lg => Object.keys(lg.teams),
    regular: (lg, rng) => { for (let r = 1; r <= nhl.NHL_FO_ROUNDS; r += 1) { nhl.simNhlRound(lg, '', rng); lg.round = r; } },
    record: (lg, id) => ({ wins: lg.teams[id].wins, games: lg.teams[id].wins + lg.teams[id].losses + lg.teams[id].otLosses }),
    post: (lg, rng) => { const { series, champion } = nhl.runNhlFoPlayoffs(lg, rng); return { games: series, champion, series }; },
    offseason: (lg, rng) => nhl.nhlOffseason(lg, rng),
    cut: (lg, id) => { const t = lg.teams[id]; for (const p of [...t.players].sort((a, b) => b.ovr - a.ovr).slice(0, 3)) nhl.nhlRelease(t, lg.freeAgents, p.id); },
    groups: () => 2,
  },
  cfb: {
    shape: F.CFB_SEASON, dynasty: true, seedMul: 113,
    init: rng => cfb.initCfb('UGA', rng),
    ids: st => Object.keys(st.teams),
    regular: (st, rng) => { for (let r = 1; r <= cfb.CFB_ROUNDS; r += 1) { cfb.simCfbRound(st, rng); st.round += 1; } },
    record: (st, id, p) => cfbRegularRecord(st, p.ccgs, id),
    post: (st, rng) => { const p = cfb.runCfbPostseason(st, rng); st.natties.push({ season: st.season, team: p.champion }); return { games: p.bracket, champion: p.champion, series: null, ccgs: p.ccgs, field: p.field }; },
    offseason: (st, rng) => cfb.cfbOffseason(st, rng),
    /* The trail the board opens: an NIL budget, a class and a portal pool,
       drawn either way so both seasons share the draws. The better manager
       signs the best graded names, class or portal, while the NIL lasts. */
    recruit: (st, rng, sign) => {
      st.nil = cfb.nilBudgetFor(cfb.CFB_SCHOOL_MAP.get(st.myTeam).prestige, st.teams[st.myTeam].wins);
      const cls = cfb.cfbRecruitClass(rng).map(r => [r, 'FR']);
      const por = cfb.cfbPortalPool(rng).map(r => [r, 'SO']);
      if (sign) for (const [r, c] of [...cls, ...por].sort((a, b) => b[0].grade - a[0].grade)) cfb.signRecruit(st, r, c, rng);
    },
    groups: () => cfb.CFB_CONFS.length,
  },
  cbb: {
    shape: F.CBB_SEASON, dynasty: true, seedMul: 127,
    init: rng => cbb.initCbb(cbb.CBB_SCHOOLS[0].id, rng),
    ids: st => Object.keys(st.teams),
    regular: (st, rng) => { for (let r = 1; r <= cbb.CBB_ROUNDS; r += 1) { cbb.simCbbRound(st, rng); st.round += 1; } },
    record: (st, id) => cbb.cbbRegularRecord(st, id),
    post: (st, rng) => { const p = cbb.runMarch(st, rng); st.titles.push({ season: st.season, team: p.champion }); return { games: p.bracket, champion: p.champion, series: null, field: p.field }; },
    offseason: (st, rng) => cbb.cbbOffseason(st, rng),
    recruit: (st, rng, sign) => {
      st.nil = cbb.cbbNilFor(cbb.CBB_SCHOOL_MAP.get(st.myTeam).prestige, st.teams[st.myTeam].wins);
      const cls = cbb.cbbRecruitClass(rng).map(r => [r, 'FR']);
      const por = cbb.cbbPortalPool(rng).map(r => [r, 'SO']);
      if (sign) for (const [r, c] of [...cls, ...por].sort((a, b) => b[0].grade - a[0].grade)) cbb.cbbSignRecruit(st, r, c, rng);
    },
    groups: () => cbb.CBB_CONFS.length,
  },
};
const projectAll = (e, lg, season) => L.projectSeason(e.shape.teams(lg), e.shape.format, season);
const resultOf = (e, lg, id, post, extra) => L.seasonResultOf(lg.season, id, e.record(lg, id, extra), post, e.shape);

const SEEDS = 20;
const SEASONS = 5;

/* ======================= 2 (gathered first, read by 1, 4 and 5) ======================= */
const careers = {};
for (const key of SPORTS) {
  const e = ENGINES[key];
  const samples = { pick: [], score: [], raw: [], old: [] };
  const seasons = [];
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const rng = lehmer((seed + SEED_BASE) * e.seedMul + 29);
    const lg = e.init(rng);
    const open = Object.fromEntries(e.shape.teams(lg).map(t => [t.id, t.strength]));
    const titles = {};
    let proj = projectAll(e, lg, lg.season);
    for (let s = 1; s <= SEASONS; s += 1) {
      e.regular(lg, rng);
      /* The columns before the postseason, which section 5 holds the CFB
         record to, and every team's record as the ledger reads it, taken
         now: the league moves on after this season. */
      const pre = Object.fromEntries(e.ids(lg).map(id => [id, { w: lg.teams[id].wins, l: lg.teams[id].losses }]));
      const post = e.post(lg, rng);
      const records = Object.fromEntries(e.ids(lg).map(id => [id, e.record(lg, id, post)]));
      seasons.push({ season: lg.season, post, pre, records });
      for (const id of e.ids(lg)) {
        const r = resultOf(e, lg, id, post, post);
        const exp = proj.get(id);
        samples.pick.push(open[id]);
        samples.score.push(L.scoreSeason(r, exp));
        samples.raw.push(Math.min(100, Math.round(L.seasonValue(r))));
        if (post.champion === id) titles[id] = (titles[id] ?? 0) + 1;
        samples.old.push(post.champion === id ? titles[id] * 100 + s * 5 : 0);
      }
      /* The boards' projection points: a dynasty's next season when the
         trail opens, before the offseason; a front office's after it. */
      if (e.dynasty) proj = projectAll(e, lg, lg.season + 1);
      e.offseason(lg, rng);
      if (!e.dynasty) proj = projectAll(e, lg, lg.season);
    }
  }
  careers[key] = { samples, seasons };
}

/* ======================= 1 ======================= */
console.log('1) the six season shapes are their engines: rounds, field, series length, and the spread of games played');
for (const key of SPORTS) {
  const e = ENGINES[key];
  const f = e.shape.format;
  const { seasons } = careers[key];
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
    /* The final is one game; each round before it halves toward it. */
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
  /* The spread of games played, measured against the shape's. */
  const counts = seasons.flatMap(s => Object.values(s.records).map(r => r.games));
  const sd = Math.sqrt(mean(counts.map(x => (x - mean(counts)) ** 2)));
  const want = f.gamesSpread;
  const spreadOk = want === 0 ? sd === 0 : Math.abs(sd - want) <= 0.15 * want;
  if (!spreadOk) problems.push(`games played spread ${sd.toFixed(2)}, the shape carries ${want.toFixed(2)}`);
  console.log(`   ${key}: ${seasons.length} postseasons read, games played ${mean(counts).toFixed(1)} +/- ${sd.toFixed(2)} (shape ${f.games} +/- ${want.toFixed(2)}), ${problems.length} problem(s)`);
  if (problems.length) fail(`${key}:shape`, `${problems.length} case(s), first: ${[...new Set(problems)].slice(0, 3).join(' | ')}`);
}

/* ======================= 2 ======================= */
console.log(`2) the pick decides nothing: hands off careers, ${SEEDS} leagues by ${SEASONS} seasons, every team a pick`);
for (const key of SPORTS) {
  const { pick, score, raw, old } = careers[key].samples;
  const c = corr(pick, score), g = fifthGap(pick, score);
  const cr = corr(pick, raw), gr = fifthGap(pick, raw);
  const co = corr(pick, old), go = fifthGap(pick, old);
  console.log(`   ${key}: ${score.length} seasons. score corr ${c.toFixed(3)}, strongest fifth minus weakest ${g.toFixed(1)} pts | results alone ${cr.toFixed(3)}, ${gr.toFixed(1)} | old titles rule ${co.toFixed(3)}, ${go.toFixed(1)}`);
  if (Math.abs(c) > PICK_CORR || Math.abs(g) > PICK_GAP) fail(`${key}:pick`, `the score tracks the pick: corr ${c.toFixed(3)} (bound ${PICK_CORR}), gap ${g.toFixed(1)} pts (bound ${PICK_GAP})`);
  /* The positive controls, every run: the check must see the rules it was
     written against. These are not negative controls of the score; they
     prove the statistic is able to fail. */
  if (!(Math.abs(cr) > PICK_CORR || Math.abs(gr) > PICK_GAP)) fail(`${key}:blind`, `the pick check cannot see the results-alone score (corr ${cr.toFixed(3)}, gap ${gr.toFixed(1)})`);
  if (!(Math.abs(co) > PICK_CORR || Math.abs(go) > PICK_GAP)) fail(`${key}:blind`, `the pick check cannot see the old titles rule (corr ${co.toFixed(3)}, gap ${go.toFixed(1)})`);
}

/* ======================= 3 ======================= */
console.log('3) management still counts: the same league, seed and pick, managed better and worse after the projection');
const MANAGE_SEEDS = 80;
for (const key of SPORTS) {
  const e = ENGINES[key];
  const diffs = [];
  for (let seed = 1; seed <= MANAGE_SEEDS; seed += 1) {
    const play = better => {
      const rng = lehmer((seed + SEED_BASE) * e.seedMul + 71);
      const lg = e.init(rng);
      const ids = e.ids(lg).sort((a, b) => e.shape.teams(lg).find(t => t.id === a).strength - e.shape.teams(lg).find(t => t.id === b).strength);
      const id = ids[(seed * 7) % ids.length];
      if (e.dynasty) {
        lg.myTeam = id;
        /* Season one has no lever in a dynasty; the lever is the trail. The
           trail and the offseason draw from a side generator, so signing a
           class does not shift the stream season two is played on: both
           seasons of a pair meet the same draws, and the difference is the
           class. */
        e.regular(lg, rng);
        e.post(lg, rng);
        const exp = projectAll(e, lg, lg.season + 1).get(id);
        const side = lehmer((seed + SEED_BASE) * e.seedMul + 97);
        e.recruit(lg, side, better);
        e.offseason(lg, side);
        e.regular(lg, rng);
        const post = e.post(lg, rng);
        return L.scoreSeason(resultOf(e, lg, id, post, post), exp);
      }
      const exp = projectAll(e, lg, lg.season).get(id);
      if (!better) e.cut(lg, id);
      e.regular(lg, rng);
      const post = e.post(lg, rng);
      return L.scoreSeason(resultOf(e, lg, id, post, post), exp);
    };
    diffs.push(play(true) - play(false));
  }
  const d = mean(diffs);
  console.log(`   ${key}: ${diffs.length} paired seasons, the better managed one scored ${d.toFixed(1)} more on average (${diffs.filter(x => x > 0).length} higher, ${diffs.filter(x => x < 0).length} lower)`);
  if (!(d >= MANAGE_MARGIN)) fail(`${key}:manage`, `a better managed season on the same roster scored only ${d.toFixed(1)} more on average (need ${MANAGE_MARGIN})`);
}

/* ======================= 4 ======================= */
console.log('4) the ladder counts the round reached: a bye seed out in its first game is paid what a lower seed out in the same round is');
{
  const bad = [];
  for (let R = 1; R <= 6; R += 1) for (let s = 1; s <= R + 1; s += 1) if (!(L.ladderPoints(s, R) > L.ladderPoints(s - 1, R))) bad.push(`rounds ${R}: stage ${s} pays ${L.ladderPoints(s, R)}, stage ${s - 1} pays ${L.ladderPoints(s - 1, R)}`);
  if (bad.length) fail('ladder', `the ladder does not rise with every round: ${bad.slice(0, 3).join(' | ')}`);
}
for (const key of BYE_SPORTS) {
  const e = ENGINES[key];
  let pairs = 0;
  const bad = [];
  for (const { post, season } of careers[key].seasons) {
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

/* ======================= 5 ======================= */
console.log('5) the form term is the regular season: a CFB conference title game never changes the record the ledger reads');
{
  let teams = 0;
  const bad = [];
  for (const { post, pre, records, season } of careers.cfb.seasons) {
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
console.log('');
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
console.log('simSeasonLedger: all green. Six season shapes match their engines, the pick does not decide the score, a better managed season outscores a worse one, the ladder counts the round reached, and the form term is the regular season.');
