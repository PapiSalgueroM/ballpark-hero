/* Club Manager: the referee's board is football, and a second leg shows the tie. Round 781.

   A player's report: "In manager mode for soccer, make it so goals can be
   scored in stoppage time (such as 90+5), and also for a cup game if it goes
   to extra time they can be a goal in 91+, but that's only if the game is a
   tie in the first 90 minutes. Also, in the UCL, show the aggregate score so
   the player knows what the score is after 2 legs."

   Before this round nothing could happen past the 45th or the 90th minute:
   the board on the clock was a caption rolled at the whistle. Now the last
   stretch of each period is drawn over its minutes plus the board, anything
   past the period's last minute is folded onto it with a plus (90+3' is
   minute 90, plus 3), and every screen prints that plus. Extra time (Round
   670) keeps its one board at 120. On a second leg the first leg and the
   running aggregate show in the live header, the report and the bracket.

   This harness holds all of that from the outside, with numbers. It bundles
   the real engine twice: A, the engine as it is (or as a control rewrote
   it), and B, the same engine with the board closed to events (every
   stretch drawn over its own minutes only, the board still sized), always
   built from the source on disk. Both arms walk the same careers on the same
   seeds, so they differ only by the board. The screens are bundled against
   arm A, so a control on the engine reaches them too.

   Sections (one line of measurements each, one FAIL line per failure):

     1) Goals land in the board at a measured share, and the board adds no
        goals. Over every match of mine the walk plays (league, cups, Europe,
        both sides' goals), the share of the goals of the ninety minutes and
        their boards that fell in first half added time (45+) and in second
        half added time (90+) sits in a band, and goals per match in A sit
        within a tolerance of B, so the board moved goals in time and did not
        add any. Real football, for comparison: roughly 7 to 9 percent of
        goals after the 90th minute and about 4 percent in first half added
        time.
     2) Every line in a board says so, everywhere a minute is printed. Every
        goal, card, injury, change, chance and timeline row with a plus sits
        at 45, 90 or the end of extra time, with a whole plus of at least one
        and no larger than that period's board in the report; nothing sits
        past 90 without extra time; the clock rows (half time, the whistle,
        extra time) carry the board they close and the timeline reads in
        clock order. The report card prints every goal and card in a board as
        45+N' or 90+N', the match centre timeline's goal rows read the same,
        and the live commentary (liveFeed, which the viewer's banner prints
        through the same label) carries exactly the report's goals with their
        plus, on matches played through the live path. A shape change made
        inside the second half's board (at 90 plus 0, 1 or 2) keeps every
        line the clock had reached and files everything it draws inside
        the board, the other dugout's changes included, and the commentary
        still equals the report after it. The viewer's own clock in the
        board (LIVE 90+2', ET 120+1') and its goal banner (GOAL! ... 90+N')
        are held by the vitest src/test/liveSimMotion.test.tsx.
     3) Extra time only on a level knockout tie. A report with extra time is
        a Champions League decider (a final, a one legged tie, a second leg)
        that was level after ninety minutes and their boards, on the night or
        on aggregate by the era's away goals rule; every such level decider
        has it; no league, group, domestic cup or first leg match ever does,
        and none of them has a minute past 90.
     4) The aggregate on a second leg. On every second leg the report's tie
        line carries the first leg in my orientation as the bracket holds it,
        and its aggregate equals leg one plus tonight; secondLegContext (the
        live header's source) gives the first leg before a ball is kicked and
        leg one plus any score after it, and nothing on any other week;
        matchFacts carries the first leg for the match centre. The report
        card prints "First leg X-Y ... Agg A-B" with those numbers and says
        where the tie ended, naming away goals or extra time when they
        decided it; the bracket's headline on every finished two legged tie
        is labelled as the aggregate and equals leg one plus leg two; and the
        viewer, rendered at the interval, in the 70th minute and at the end,
        shows the aggregate as it stands then.
     5) A save from before this round loads and plays. Real saves from the
        walk, stripped back to the shape this round found (no plus anywhere,
        no board on the live match, no extra time board, no first leg on a
        tie line), written with saveCareer and opened with loadCareer: one
        between matches, one paused at the interval, one paused in the 70th
        minute. Each loads, plays to the whistle and on, the halves drawn
        before the round get the old board rolled at the whistle in its old
        range (1 to 5, 2 to 8), nothing drawn before the round grows a plus,
        and the screens render it.

   Negative controls, STOPPAGE_CONTROL=<name>. Each rewrites a copy (the
   engine or the clock helpers) under .sim-control/stoppage, refuses to run
   (exit 2) unless its anchor is found exactly once, and must then turn its
   named section red and no other (a tolerated section is listed where one
   is red by construction):
     noboard   the board is closed to events in arm A (no added time goals).
               Section 1 must go red (2 is tolerated: with no board lines its
               floors cannot be met).
     nolabel   minuteLabel drops the plus, so every screen prints 90'.
               Section 2 must go red.
     dropplus  the report's own scorer lines lose their plus. Section 2 must
               go red (1 is tolerated: my board goals drop out of its count).
     etleague  every match that is not a first leg plays extra time. Section
               3 must go red (2 and 4 are tolerated: a league match then runs
               to 120 and a second leg can turn).
     aggsum    secondLegContext forgets the first leg in its aggregate.
               Section 4 must go red.
     subfold   a change made inside the board leaves the other dugout's
               changes unfolded (the bug the review found). Section 2
               must go red.
     oldsave   the whistle no longer rolls a board for a half drawn before
               this round. Section 5 must go red.
   Under a control the run exits 1 when the control fired on exactly its
   section (the engine it ran is a regression, so the harness is red) and 3
   when the control did not fire or bled into another section.

   Thresholds, measured 2026-10-01 on this harness's seed and SIM_SEED=1 to
   4: see the THRESHOLDS block below, every number with its measurement.

   Run: node scripts/simCmStoppageTime.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const TMP = os.tmpdir();
const CONTROL = process.env.STOPPAGE_CONTROL || '';
const lf = s => s.replaceAll('\r\n', '\n');
const require = createRequire(import.meta.url);

/* The node_modules that holds react and esbuild, found by walking up, so a
   worktree inside the repo resolves the main one the way node itself does. */
function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'react', 'package.json')) && fs.existsSync(path.join(nm, 'esbuild'))) return nm;
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with react and esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}
const NM = modulesDir();

/* ---- THRESHOLDS, each from measured headroom ----
   Measured 2026-10-01 on five samples, this harness's own seed and SIM_SEED
   1 to 4 (each a different stream through the same twenty careers), with the
   second half's board weighted 1.5 for a goal (BOARD in clubManager.ts):
     matches of mine per arm (1)         824 to 860                  floor 600
     goals in first half added time,
       share of all goals (1)            2.87 to 4.21 percent        band 2 to 6
       (about 2,350 goals a sample, so one sample's own SD is about
        0.4 points; 2 is over two of them under the lowest seen and four
        under the mean of 3.71; real football is about 4)
     goals after the 90th minute (1)     7.25 to 8.60 percent        band 6 to 10
       (SD about 0.55 points; 6 is over two under the lowest and three and
        a half under the mean of 7.96; real football is about 7 to 9. With
        the board uniform for a goal, weight 1, it measured 5.60 on this
        seed, which is why the weight is there. The band is the realism
        claim; it is not sharp enough to hold the weight itself, and does
        not try to.)
     of each half's own goals            first half 5.96 to 8.96 percent in its board, second half 13.96 to 16.48
     mean boards                         3.63 to 3.71 and 6.15 to 6.28 minutes
     goals per match in the ninety and
       their boards, board open minus
       closed (1)                        -0.004 to +0.001            tolerance 0.05
       (the arms share every seed, so the gap is near zero by
        construction; a board that added its own goals would add about a
        third of a goal a match)
     goals in a board read (2)           340 to 444                  floor 150
     board goals checked on the card (2) 289 to 335                  floor 150
     board goal rows on the timeline (2) 340 to 444                  floor 150
     matches through the live path (2)   120 to 138                  floor 80
     board goals in the commentary (2)   35 to 53                    floor 15
     changes inside the board (2)        475 to 479                  floor 300
       of them in an eight minute
       board (2)                         123 to 156                  floor 60
       (measured in the review, same five samples; under subfold 7 to
        11 of them leave a change of the other dugout's past 90)
     deciders read (3)                   325 to 455                  floor 150
     deciders to extra time (3)          33 to 66                    floor 15
     level matches that are not
       deciders (3)                      151 to 171                  floor 75
     second legs read (4)                260 to 377                  floor 130
     second leg report cards (4)         260 to 377 (capped at 400)  floor 130
     brackets read (4)                   120 every sample (the cap)  floor 60
     second legs through the viewer (4)  40 to 58                    floor 20
     settled on away goals (4)           13 to 33                    floor 5
     settled in extra time (4)           5 to 25                     floor 2
     old saves opened (5)                48 every sample             floor 30 */
const T = {
  minMatches: 600,
  h1Lo: 0.02, h1Hi: 0.06,
  h2Lo: 0.06, h2Hi: 0.10,
  tolGpm: 0.05,
  minBoardGoals: 150,
  minCardsChecked: 150,
  minTimelineBoard: 150,
  minLiveCompared: 15,
  minLiveMatches: 80,
  minBoardChanges: 300,
  minBoardChangesLong: 60,
  minDeciders: 150,
  minEt: 15,
  minLevelOther: 75,
  minSecondLegs: 130,
  minLegCards: 130,
  minBrackets: 60,
  minLiveHeaders: 20,
  minAwayGoals: 5,
  minAetSecond: 2,
  minOld: 30,
};

/* ---- controls ---- */
const ENGINE = path.join(SRC, 'lib', 'clubManager.ts');
const CLOCK = path.join(SRC, 'lib', 'clubManagerClock.ts');
const NO_BOARD = [
  '  const hi = period ? to + boardOf(period, stoppagesIn(live, BOARD[period].from, to) + nMine + nOpp, roll) : to;\n',
  '  const hi = to;\n',
];
const NO_BOARD_REDRAW = [
  "  drawSegment(state, live, fx, period === 'h1' ? 1 : 2, to + p, to + board, lamMine * share, lamOpp * share);\n",
  '',
];
const CONTROLS = {
  noboard: { must: [1], also: [2], file: 'engine', edits: [NO_BOARD, NO_BOARD_REDRAW], note: 'the board is closed to events; section 1 must go red' },
  nolabel: {
    must: [2], also: [], file: 'clock',
    edits: [["  return e.plus ? `${e.minute}+${e.plus}'` : `${e.minute}'`;\n", "  return `${e.minute}'`;\n"]],
    note: 'minuteLabel drops the plus; section 2 must go red',
  },
  dropplus: {
    must: [2], also: [1], file: 'engine',
    edits: [[
      '    ...(l.penalty ? { penalty: true } : {}), ...(l.freeKick ? { freeKick: true } : {}), ...plusOf(l),\n',
      '    ...(l.penalty ? { penalty: true } : {}), ...(l.freeKick ? { freeKick: true } : {}),\n',
    ]],
    note: "the report's scorer lines lose their plus; section 2 must go red",
  },
  etleague: {
    must: [3], also: [], file: 'engine',
    edits: [[
      "  if (entry.type !== 'uclKo' || !entry.uclRound) return false;\n  /* A legacy week",
      "  if (entry.type !== 'uclKo' || !entry.uclRound) return entry.type !== 'window';\n  /* A legacy week",
    ]],
    note: 'every match that is not a first leg plays extra time; section 3 must go red',
  },
  aggsum: {
    must: [4], also: [], file: 'engine',
    edits: [['    aggMine: first.mine + mine,\n', '    aggMine: mine,\n']],
    note: 'secondLegContext forgets the first leg in its aggregate; section 4 must go red',
  },
  subfold: {
    must: [2], also: [], file: 'engine',
    edits: [[
      ' live.h2Cards ?? [], live.h2OppCards ?? [], live.h2Injuries ?? [], live.oppSubs ?? []);\n',
      ' live.h2Cards ?? [], live.h2OppCards ?? [], live.h2Injuries ?? []);\n',
    ]],
    note: "a change inside the board leaves the other dugout's changes unfolded; section 2 must go red",
  },
  oldsave: {
    must: [5], also: [], file: 'engine',
    edits: [[
      '    h1: args.added?.h1 ?? clamp(1 + stoppages(0, 45) + ri(0, 1), 1, 5),\n',
      '    h1: args.added?.h1 as number,\n',
    ]],
    note: 'the whistle no longer rolls a board for a half drawn before this round; section 5 must go red',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`STOPPAGE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

/* One rewrite, refused unless its anchor is there exactly once. */
function rewrite(src, [from, to], label) {
  const n = src.split(from).length - 1;
  if (n !== 1) {
    console.error(`${label} cannot run: its anchor is in the file ${n} times, not once (${from.slice(0, 80).replaceAll('\n', '\\n')}...)`);
    process.exit(2);
  }
  const out = src.replace(from, to);
  if (out === src) { console.error(`${label} cannot run: the rewrite changed nothing`); process.exit(2); }
  return out;
}

const CONTROL_DIR = path.join(ROOT, '.sim-control', 'stoppage');
const tag = `${process.pid}`;
const written = [];
const ENTRY = path.join(TMP, `cmStoppage.${tag}.entry.mjs`);
const BUNDLE = path.join(TMP, `cmStoppage.${tag}.bundle.cjs`);
const cleanup = () => {
  for (const f of [...written, ENTRY, BUNDLE, BUNDLE.replace(/\.cjs$/, '.css')]) {
    try { fs.rmSync(f, { force: true }); } catch { /* already gone */ }
  }
};
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130); });
fs.mkdirSync(CONTROL_DIR, { recursive: true });
const writeCopy = (name, text) => {
  const p = path.join(CONTROL_DIR, `${name}.${tag}.ts`);
  fs.writeFileSync(p, text);
  written.push(p);
  return p;
};

const engineSrc = lf(fs.readFileSync(ENGINE, 'utf8'));
const clockSrc = lf(fs.readFileSync(CLOCK, 'utf8'));
let engineA = engineSrc;
let clockA = clockSrc;
if (CONTROL) {
  const spec = CONTROLS[CONTROL];
  for (const e of spec.edits) {
    if (spec.file === 'engine') engineA = rewrite(engineA, e, `STOPPAGE_CONTROL=${CONTROL}`);
    else clockA = rewrite(clockA, e, `STOPPAGE_CONTROL=${CONTROL}`);
  }
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${CONTROLS[CONTROL].note}`);
}
/* Arm B, always from the source on disk. */
const engineB = rewrite(rewrite(engineSrc, NO_BOARD, 'arm B'), NO_BOARD_REDRAW, 'arm B board redraw');
const pathA = engineA === engineSrc ? ENGINE : writeCopy('clubManagerA', engineA);
const pathB = writeCopy('clubManagerB', engineB);
const clockPath = clockA === clockSrc ? CLOCK : writeCopy('clubManagerClockA', clockA);

/* '@/x' resolved by hand, so the engine every screen imports is arm A and the
   clock helpers are the control's copy when there is one. */
const fwd = p => p.replaceAll('\\', '/');
function resolveSrc(rel) {
  const base = path.join(SRC, rel);
  for (const c of ['.ts', '.tsx', '/index.ts', '/index.tsx', '']) {
    const p = base + c;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}
const atPlugin = {
  name: 'at-alias',
  setup(build) {
    build.onResolve({ filter: /^@\// }, args => {
      const rel = args.path.slice(2);
      if (rel === 'lib/clubManager') return { path: pathA };
      if (rel === 'lib/clubManagerClock') return { path: clockPath };
      const p = resolveSrc(rel);
      return p ? { path: p } : { errors: [{ text: `cannot resolve ${args.path}` }] };
    });
  },
};
fs.writeFileSync(ENTRY, `
export * as cmA from '${fwd(pathA)}';
export * as cmB from '${fwd(pathB)}';
export { timelineRows } from '${fwd(path.join(SRC, 'lib', 'clubManagerMatchCentre.ts'))}';
export { MatchReportCard } from '${fwd(path.join(SRC, 'components', 'club-manager', 'MatchReportCard.tsx'))}';
export { UclBracketCard } from '${fwd(path.join(SRC, 'components', 'club-manager', 'UclBracketCard.tsx'))}';
export { LiveSimScreen } from '${fwd(path.join(SRC, 'components', 'club-manager', 'LiveSimScreen.tsx'))}';
import React from '${fwd(path.join(NM, 'react', 'index.js'))}';
import { renderToStaticMarkup } from '${fwd(path.join(NM, 'react-dom', 'server.node.js'))}';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
const esbuild = require(path.join(NM, 'esbuild'));
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
  outfile: BUNDLE, logLevel: 'error', plugins: [atPlugin],
});
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
const { cmA, cmB, timelineRows, MatchReportCard, UclBracketCard, LiveSimScreen, render } = require(BUNDLE);
/* Round 832: an era's squads load with the era, so every arm fetches all three
   first. Without it the twelve era careers below throw inside walk()'s try and
   are skipped, and the walk stops at eight careers ("too thin"). */
for (const engine of [cmA, cmB]) await engine.ensureAllEraRosters();
for (const [arm, cm] of [['A', cmA], ['B', cmB]]) {
  for (const name of ['startCareer', 'playNextEntry', 'resumeMatch', 'startSecondHalf', 'startExtraTime', 'isExtraTimeDue',
    'markLiveMinute', 'changeLive', 'liveFeed', 'uclTieOutcome', 'uclAwayGoalsApply', 'uclLegsFor', 'secondLegContext', 'matchFacts',
    'saveCareer', 'loadCareer', 'minuteLabel']) {
    if (cm[name] === undefined) { console.error(`arm ${arm}: the engine does not export ${name}`); process.exit(2); }
  }
}

/* ---- failures, attributed to the section they fell in, printed in order ---- */
let failures = 0;
const failedIn = new Map();
const failText = new Map();
const PRINT_CAP = Number(process.env.STOPPAGE_PRINT_CAP) || 8;
const fail = (sec, m) => {
  failures += 1;
  const n = (failedIn.get(sec) ?? 0) + 1;
  failedIn.set(sec, n);
  const lines = failText.get(sec) ?? [];
  if (n <= PRINT_CAP) lines.push(`  FAIL [${sec}]: ${m}`);
  else if (n === PRINT_CAP + 1) lines.push(`  FAIL [${sec}]: (further failures in this section not printed)`);
  failText.set(sec, lines);
};
const report = (sec, title, lines) => {
  console.log(`${sec}) ${title}`);
  for (const l of lines) console.log(`   ${l}`);
  for (const l of failText.get(sec) ?? []) console.error(l);
};
const J = v => JSON.stringify(v);
const pct = (n, d) => (d ? (100 * n / d).toFixed(2) : 'n/a');
/* The text a reader sees: React's text separators go, tags become spaces. */
const visible = html => html.replace(/<!-- -->/g, '').replace(/<[^>]*>/g, ' ')
  .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();
const attrs = (html, name) => [...html.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map(m => m[1]);
/* The label written here, not through the engine's helper, so a control on the helper cannot grade itself. */
const label = e => (e.plus ? `${e.minute}+${e.plus}'` : `${e.minute}'`);
const noop = () => {};
const SCREEN_PROPS = { clubColor: '#ffffff', onSub: noop, onShape: noop, onTalk: noop, onSecondHalf: noop, onExit: noop, onStartSecondHalf: noop, onStartExtraTime: noop, onChange: noop, onMark: noop };

/* ---- a seeded stream I can rewind, on top of the harness's own ---- */
const OFF = Number(process.env.SIM_SEED) || 0;
const HOUSE_RANDOM = Math.random;
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function withSeed(seed, fn) {
  Math.random = seeded(seed + OFF * 7919);
  try { return fn(); } finally { Math.random = HOUSE_RANDOM; }
}

/* ---- the shape of a match ---- */
const mineOf = (r, club) => (r.home === club ? r.homeGoals : r.awayGoals);
const theirsOf = (r, club) => (r.home === club ? r.awayGoals : r.homeGoals);
const myTie = (s, round) => (s.uclBracket ?? []).find(t => t.round === round && t.mine);
/* The week my match was played in: a step plays every entry before it that is
   not mine (the rest of a league round, a cup I am out of), then mine, and
   leaves the save on the week after it. */
const matchWeek = (pre, res) => {
  const w = res.state.week - 1;
  return w >= pre.week && pre.calendar[w] ? w : pre.week;
};
const entryOf = (pre, res) => pre.calendar[matchWeek(pre, res)];
const isDecider = (cm, s, e) => !!e && e.type === 'uclKo' && !!e.uclRound && s.uclKoRound === e.uclRound
  && !(e.uclLeg === 1 && cm.uclLegsFor(s.eraId, e.uclRound) === 2);
const isSecondLeg = (cm, s, e) => isDecider(cm, s, e) && e.uclLeg === 2 && cm.uclLegsFor(s.eraId, e.uclRound) === 2;
const isFirstLeg = (cm, s, e) => !!e && e.type === 'uclKo' && !!e.uclRound && s.uclKoRound === e.uclRound
  && e.uclLeg === 1 && cm.uclLegsFor(s.eraId, e.uclRound) === 2;
/** The first leg in my orientation, off the bracket the match was played from. */
function firstLegOf(pre, round, club) {
  const t = myTie(pre, round);
  if (!t?.leg1) return null;
  const home = t.home === club;
  return { mine: home ? t.leg1.homeGoals : t.leg1.awayGoals, theirs: home ? t.leg1.awayGoals : t.leg1.homeGoals, home };
}
const CLOCK_KINDS = new Set(['kickoff', 'halftime', 'extratime', 'pens', 'fulltime']);

/* ================= the material: a walk of real careers, both arms ================= */
const CAREERS = [
  ['Real Madrid', undefined], ['Man City', undefined], ['Bayern Munich', undefined], ['Barcelona', undefined],
  ['Liverpool', undefined], ['PSG', undefined], ['Inter', undefined], ['Arsenal', undefined],
  ['Barcelona', 'era2005'], ['Real Madrid', 'era2005'], ['Chelsea', 'era2005'], ['Arsenal', 'era2005'],
  ['Barcelona', 'era2010'], ['Real Madrid', 'era2010'], ['Chelsea', 'era2010'], ['Man United', 'era2010'],
  ['Barcelona', 'era2015'], ['Real Madrid', 'era2015'], ['Chelsea', 'era2015'], ['Juventus', 'era2015'],
];
const S1 = {
  A: { matches: 0, goals90: 0, h1: 0, h2: 0, et: 0, h1Goals: 0, boardH1: 0, boardH2: 0 },
  B: { matches: 0, goals90: 0, h1: 0, h2: 0, et: 0, h1Goals: 0, boardH1: 0, boardH2: 0 },
};
function countGoals(arm, r) {
  const s = S1[arm];
  s.matches += 1;
  s.boardH1 += r.detail?.added?.h1 ?? 0;
  s.boardH2 += r.detail?.added?.h2 ?? 0;
  for (const g of [...r.myScorers, ...r.oppScorers]) {
    if (g.minute > 90 || (r.detail?.et && g.minute === r.detail.et.to && g.plus)) { s.et += 1; continue; }
    s.goals90 += 1;
    if (g.minute <= 45) s.h1Goals += 1;
    if (g.plus && g.minute === 45) s.h1 += 1;
    else if (g.plus && g.minute === 90) s.h2 += 1;
  }
}

/** Every match played is read the same way, whatever produced it. */
const S2 = { lines: 0, boardLines: 0, boardGoals: 0, cardsChecked: 0, cardGoals: 0, timelineBoard: 0, liveMatches: 0, liveBoardGoals: 0, boardChanges: 0, boardChangesAt90: 0, boardChangesLong: 0 };
const S3 = { deciders: 0, levelDeciders: 0, et: 0, other: 0, levelOther: 0 };
const S4 = { secondLegs: 0, legCards: 0, brackets: 0, bracketTies: 0, liveHeaders: 0, away: 0, aet: 0, firstLegs: 0, quiet: 0 };
const CARD_CAP = 400;
const BRACKET_CAP = 120;

let typeMismatch = 0;
function readMatch(pre, res, ctx) {
  const r = res.report;
  const club = pre.clubName;
  const e = entryOf(pre, res);
  if (e.type !== r.competition) typeMismatch += 1;
  readLines(r, club, ctx);
  readEt(pre, e, r, club, ctx);
  readTie(pre, e, res, club, ctx);
}

/* Section 2: the lines of one report. */
function readLines(r, club, ctx) {
  const d = r.detail;
  if (!d) { fail(2, `${ctx}: the report has no detail`); return; }
  const added = d.added ?? {};
  const etTo = d.et ? d.et.to : null;
  const lists = {
    myScorers: r.myScorers, oppScorers: r.oppScorers, cards: d.cards ?? [], oppCards: d.oppCards ?? [],
    injuries: d.injuries ?? [], subs: d.subs ?? [], oppSubs: d.oppSubs ?? [], play: d.play ?? [],
    timeline: (d.timeline ?? []).filter(x => !CLOCK_KINDS.has(x.kind)),
  };
  for (const [k, xs] of Object.entries(lists)) {
    for (const x of xs) {
      S2.lines += 1;
      if (!Number.isInteger(x.minute) || x.minute < 0 || x.minute > (etTo ?? 90)) fail(2, `${ctx}: a ${k} line at minute ${x.minute}${etTo ? ' (extra time to ' + etTo + ')' : ''}`);
      if (x.plus === undefined) continue;
      S2.boardLines += 1;
      const board = x.minute === 45 ? added.h1 : x.minute === 90 ? added.h2 : etTo !== null && x.minute === etTo ? added.et : undefined;
      if (!Number.isInteger(x.plus) || x.plus < 1) fail(2, `${ctx}: a ${k} line at ${x.minute} carries plus ${J(x.plus)}`);
      else if (board === undefined) fail(2, `${ctx}: a ${k} line at ${x.minute}+${x.plus} sits in no board`);
      else if (x.plus > board) fail(2, `${ctx}: a ${k} line at ${x.minute}+${x.plus} is deeper than the board of ${board}`);
    }
  }
  /* The clock rows carry the board they close, and the timeline reads in clock order. */
  const tl = d.timeline ?? [];
  const ht = tl.find(x => x.kind === 'halftime');
  if (!ht || ht.minute !== 45 || ht.plus !== added.h1) fail(2, `${ctx}: the half time row is ${J(ht)} for a first half board of ${added.h1}`);
  const ft = tl.find(x => x.kind === 'fulltime');
  const ftPlus = etTo !== null ? added.et : added.h2;
  if (!ft || ft.minute !== (etTo ?? 90) || (ft.plus ?? undefined) !== (ftPlus || undefined)) fail(2, `${ctx}: the whistle row is ${J(ft)} for a board of ${ftPlus}`);
  if (etTo !== null) {
    const et = tl.find(x => x.kind === 'extratime');
    if (!et || et.minute !== 90 || et.plus !== added.h2) fail(2, `${ctx}: the extra time row is ${J(et)} after a board of ${added.h2}`);
  }
  for (let i = 1; i < tl.length; i++) {
    const a = tl[i - 1];
    const b = tl[i];
    if (b.minute < a.minute || (b.minute === a.minute && (b.plus ?? 0) < (a.plus ?? 0))) {
      fail(2, `${ctx}: the timeline runs backwards, ${label(a)} ${a.kind} before ${label(b)} ${b.kind}`);
      break;
    }
  }
  /* The match centre timeline: every goal row's clock is the goal's own label. */
  const goalsTl = tl.filter(x => x.kind === 'goal');
  const rows = timelineRows(d, 'all').filter(x => x.kind === 'goal');
  const want = goalsTl.map(label).sort();
  const got = rows.map(x => x.clock).sort();
  if (J(want) !== J(got)) fail(2, `${ctx}: the match centre timeline's goal clocks read ${J(got)} for goals at ${J(want)}`);
  S2.timelineBoard += goalsTl.filter(x => x.plus).length;
  /* The report card prints every goal and card in a board with its plus. */
  const boardGoals = [...r.myScorers, ...r.oppScorers].filter(g => g.plus);
  S2.boardGoals += boardGoals.length;
  const boardCards = [...(d.cards ?? []), ...(d.oppCards ?? [])].filter(c => c.plus);
  if ((boardGoals.length || boardCards.length) && S2.cardsChecked < CARD_CAP) {
    S2.cardsChecked += 1;
    const v = visible(render(MatchReportCard, { report: r, clubName: club, onContinue: noop }));
    for (const g of boardGoals) {
      S2.cardGoals += 1;
      if (!v.includes(`⚽ ${g.name} ${label(g)}`)) fail(2, `${ctx}: the report card does not print "⚽ ${g.name} ${label(g)}"`);
    }
    for (const c of boardCards) if (!v.includes(`${c.name} ${label(c)}`)) fail(2, `${ctx}: the report card does not print the card "${c.name} ${label(c)}"`);
  }
}

/* Section 3: extra time only on a level knockout decider. */
function readEt(pre, e, r, club, ctx) {
  const d = r.detail;
  const hasEt = !!d?.et;
  if (!isDecider(cmA, pre, e) || r.competition !== 'uclKo') {
    S3.other += 1;
    if (r.homeGoals === r.awayGoals) S3.levelOther += 1;
    if (hasEt) fail(3, `${ctx}: a ${r.competition}${isFirstLeg(cmA, pre, e) ? ' first leg' : ''} match played extra time`);
    if (r.decidedBy === 'aet') fail(3, `${ctx}: a ${r.competition} match was decided after extra time`);
    const past = [...r.myScorers, ...r.oppScorers, ...(d?.play ?? []), ...(d?.timeline ?? [])].filter(x => x.minute > 90);
    if (past.length) fail(3, `${ctx}: a ${r.competition} match has ${past.length} line(s) past 90, first ${label(past[0])}`);
    return;
  }
  S3.deciders += 1;
  const mine90 = r.myScorers.filter(g => g.minute <= 90).length;
  const opp90 = r.oppScorers.filter(g => g.minute <= 90).length;
  let level;
  if (isSecondLeg(cmA, pre, e)) {
    const t = myTie(pre, e.uclRound);
    const home = t.home === club;
    const leg2 = home ? { homeGoals: mine90, awayGoals: opp90 } : { homeGoals: opp90, awayGoals: mine90 };
    level = cmA.uclTieOutcome({ leg1: t.leg1, leg2 }, cmA.uclAwayGoalsApply(pre.eraId)).winner === null;
  } else {
    level = mine90 === opp90;
  }
  if (level) S3.levelDeciders += 1;
  if (hasEt) S3.et += 1;
  if (level !== hasEt) fail(3, `${ctx}: ${mine90}-${opp90} after ninety minutes and the board is ${level ? '' : 'not '}level and extra time was ${hasEt ? '' : 'not '}played`);
  if (hasEt && d.et.from !== 90) fail(3, `${ctx}: extra time ran ${J(d.et)}`);
}

/* Section 4: the tie on a second leg (and a first leg, and nothing elsewhere). */
function readTie(pre, e, res, club, ctx) {
  const r = res.report;
  const mine = mineOf(r, club);
  const theirs = theirsOf(r, club);
  const week = matchWeek(pre, res);
  if (!isSecondLeg(cmA, pre, e) || r.competition !== 'uclKo') {
    if (S4.quiet < 400) {
      S4.quiet += 1;
      if (cmA.secondLegContext(pre, week, 0, 0) !== null) fail(4, `${ctx}: secondLegContext answers on a week that is not a second leg`);
      if (cmA.matchFacts(pre)?.firstLeg) fail(4, `${ctx}: the match centre carries a first leg on a week that is not a second leg`);
    }
    if (isFirstLeg(cmA, pre, e) && r.competition === 'uclKo') {
      S4.firstLegs += 1;
      if (!r.tie || r.tie.leg !== 1 || r.tie.aggMine !== mine || r.tie.aggTheirs !== theirs) fail(4, `${ctx}: a first leg ${mine}-${theirs} carries the tie line ${J(r.tie)}`);
    }
    return;
  }
  S4.secondLegs += 1;
  const l1 = firstLegOf(pre, e.uclRound, club);
  if (!l1) { fail(4, `${ctx}: a second leg with no first leg in the bracket`); return; }
  const tie = r.tie;
  const wantAgg = `${l1.mine + mine}-${l1.theirs + theirs}`;
  if (!tie || tie.leg !== 2) { fail(4, `${ctx}: a second leg carries the tie line ${J(tie)}`); return; }
  if (tie.leg1Mine !== l1.mine || tie.leg1Theirs !== l1.theirs || tie.leg1Home !== l1.home) fail(4, `${ctx}: the tie line's first leg ${tie.leg1Mine}-${tie.leg1Theirs} ${tie.leg1Home ? 'home' : 'away'} is not the bracket's ${l1.mine}-${l1.theirs} ${l1.home ? 'home' : 'away'}`);
  if (`${tie.aggMine}-${tie.aggTheirs}` !== wantAgg) fail(4, `${ctx}: the tie line's aggregate ${tie.aggMine}-${tie.aggTheirs} is not leg one ${l1.mine}-${l1.theirs} plus tonight ${mine}-${theirs}`);
  if (tie.byAwayGoals) S4.away += 1;
  if (r.decidedBy === 'aet') S4.aet += 1;
  /* The live header's source, before a ball is kicked and after the night. */
  const before = cmA.secondLegContext(pre, week, 0, 0);
  const after = cmA.secondLegContext(pre, week, mine, theirs);
  if (!before || before.leg1Mine !== l1.mine || before.leg1Theirs !== l1.theirs || before.leg1Home !== l1.home || before.aggMine !== l1.mine || before.aggTheirs !== l1.theirs) {
    fail(4, `${ctx}: before kick off secondLegContext reads ${J(before)} for a first leg ${l1.mine}-${l1.theirs}`);
  }
  if (!after || `${after.aggMine}-${after.aggTheirs}` !== wantAgg) fail(4, `${ctx}: after ${mine}-${theirs} secondLegContext reads ${J(after)}, not ${wantAgg}`);
  if (after && after.awayGoalsRule !== cmA.uclAwayGoalsApply(pre.eraId)) fail(4, `${ctx}: secondLegContext's away goals rule is ${after.awayGoalsRule}`);
  const facts = cmA.matchFacts(pre);
  if (!facts?.firstLeg || facts.firstLeg.mine !== l1.mine || facts.firstLeg.theirs !== l1.theirs || facts.firstLeg.home !== l1.home) fail(4, `${ctx}: the match centre's first leg is ${J(facts?.firstLeg)}, not ${l1.mine}-${l1.theirs}`);
  /* The report card. */
  if (S4.legCards < CARD_CAP) {
    S4.legCards += 1;
    const html = render(MatchReportCard, { report: r, clubName: club, onContinue: noop });
    const v = visible(html);
    const legLine = `First leg ${l1.mine}-${l1.theirs} ${l1.home ? 'at home' : 'away'} · Agg ${wantAgg}`;
    if (!v.includes(legLine)) fail(4, `${ctx}: the report card does not read "${legLine}"`);
    if (J(attrs(html, 'data-cm-leg-line')) !== J([wantAgg])) fail(4, `${ctx}: the report card's leg line is marked ${J(attrs(html, 'data-cm-leg-line'))}, not ${wantAgg}`);
    const through = tie.through === true;
    if (r.decidedBy === 'regular') {
      const end = tie.byAwayGoals
        ? `Level ${wantAgg} on aggregate, ${through ? 'through' : 'out'} on away goals`
        : `${through ? 'Through' : 'Out'} ${wantAgg} on aggregate`;
      if (!v.includes(end)) fail(4, `${ctx}: the report card of a second leg settled in ninety minutes does not read "${end}"`);
    } else if (r.decidedBy === 'aet') {
      if (!/on aggregate after extra time/.test(v)) fail(4, `${ctx}: the report card of a second leg settled in extra time does not say so`);
      if (tie.byAwayGoals && !v.includes('on away goals')) fail(4, `${ctx}: the report card of a second leg settled on away goals in extra time does not name them`);
    } else if (r.decidedBy === 'pens') {
      if (!v.includes(`Still level ${wantAgg} on aggregate after extra time`)) fail(4, `${ctx}: the report card of a second leg shootout does not give the aggregate after extra time`);
    }
  }
  /* The bracket: every finished two legged tie's headline is the aggregate, and labelled so. */
  if (S4.brackets < BRACKET_CAP) {
    S4.brackets += 1;
    const html = render(UclBracketCard, { career: res.state });
    const got = attrs(html, 'data-cm-bracket-legs').filter(x => x !== 'open').sort();
    const want = [];
    for (const t of res.state.uclBracket ?? []) {
      if (t.legs !== 2 || !t.leg1 || !t.leg2) continue;
      S4.bracketTies += 1;
      const h = t.leg1.homeGoals + t.leg2.homeGoals;
      const a = t.leg1.awayGoals + t.leg2.awayGoals;
      if (t.homeGoals !== h || t.awayGoals !== a) fail(4, `${ctx}: the bracket's ${t.home} v ${t.away} headline ${t.homeGoals}-${t.awayGoals} is not the legs' ${h}-${a}`);
      want.push(`${h}-${a}`);
    }
    if (J(got) !== J(want.sort())) fail(4, `${ctx}: the bracket labels ${J(got)} as aggregates, the legs say ${J(want)}`);
    if (got.length && !visible(html).includes(`Agg ${got[0]}.`)) fail(4, `${ctx}: the bracket does not print "Agg ${got[0]}."`);
  }
}

/* ---------- walk both arms, the same careers on the same seeds ---------- */
const deciders = [];
const livePres = [];
const oldPres = { second: [], plain: [] };
let careersWalked = 0;
function walk(arm, cm, club, era, ci, onStep) {
  let s = withSeed(31000 + ci, () => { try { return cm.startCareer(club, era); } catch { return null; } });
  if (!s || s.clubName !== club) return false;
  for (let g = 0; g < 200; g++) {
    const pre = s;
    /* Round 1146: the two arms' careers are walked without the quick sim's coach. Since that round he makes a
       change in nine quick sims in ten and decides it off the score at a minute, and a goal's minute is the
       one thing the two arms place differently, so with him in the dugout the arms stop being the same
       careers after a match or two and section 1's gap (near zero by construction, tolerance 0.05) turns
       into the noise of two separate samples: -0.134 on the default seed the day the round landed. The
       coach in a board is held by simCmQuickSubs (its clock case) and simCmQuickLegs; the deciders, the old
       saves and the live path below still play with him. */
    const res = withSeed(52000 + ci * 997 + g, () => cm.playNextEntry(s, { skipHalftime: true, noCoach: true }));
    if (!res || !res.state) break;
    if (res.report) { countGoals(arm, res.report); onStep(pre, res, g); }
    s = res.state;
    if (res.kind === 'seasonOver' || s.sacked) break;
  }
  return true;
}
let mineSeen = 0;
CAREERS.forEach(([club, era], ci) => {
  const ok = walk('A', cmA, club, era, ci, (pre, res, g) => {
    const ctx = `${club} (${era ?? 'modern'}) week ${matchWeek(pre, res)}`;
    readMatch(pre, res, ctx);
    const e = entryOf(pre, res);
    mineSeen += 1;
    if (isDecider(cmA, pre, e) && res.report.competition === 'uclKo') deciders.push({ pre, club, era: era ?? 'modern', round: e.uclRound, second: isSecondLeg(cmA, pre, e) });
    else if (mineSeen % 7 === 0 && livePres.length < 80) livePres.push({ pre, club });
    if (isSecondLeg(cmA, pre, e) && oldPres.second.length < 6) oldPres.second.push({ pre, club, g });
    else if (mineSeen % 11 === 0 && oldPres.plain.length < 10 && !isDecider(cmA, pre, e)) oldPres.plain.push({ pre, club, g });
  });
  if (ok) careersWalked += 1;
  walk('B', cmB, club, era, ci, () => {});
});
console.log(`material: ${careersWalked} careers walked per arm, ${S1.A.matches} matches of mine in arm A and ${S1.B.matches} in arm B, ${deciders.length} Champions League deciders captured (${deciders.filter(d => d.second).length} second legs), ${typeMismatch} reports whose week did not read as their competition`);
if (careersWalked < 15) { console.error('fewer than 15 careers started; the walk is too thin to measure anything'); process.exit(2); }
if (S1.B.h1 + S1.B.h2 !== 0) { console.error(`arm B put ${S1.B.h1 + S1.B.h2} goals in a board; it did not build as described`); process.exit(2); }

/* Each decider replayed on its own seeds, through the quick sim. */
const REPLAYS = 12;
deciders.forEach((f, fi) => {
  for (let j = 0; j < REPLAYS; j++) {
    const res = withSeed(900001 + fi * 1009 + j * 13, () => cmA.playNextEntry(f.pre, { skipHalftime: true }));
    if (!res?.report) { fail(3, `${f.club} replay ${j}: the decider produced no report`); continue; }
    readMatch(f.pre, res, `${f.club} (${f.era}) ${f.round}${f.second ? ' second leg' : ''} replay ${j}`);
  }
});

/* ---------- the live path: commentary against the report, and the viewer's header ---------- */
function livePath(pre, seed) {
  return withSeed(seed, () => {
    const r1 = cmA.playNextEntry(pre);
    if (r1.kind !== 'halftime' || !r1.state.live) return null;
    /* Kick off hands the viewer the first half at minute 0; the interval is where its clock stops. */
    const kickoff = r1.state;
    const half = cmA.markLiveMinute(kickoff, 45);
    const s2 = cmA.startSecondHalf(half);
    const at70 = cmA.markLiveMinute(s2, 70);
    let withEt = s2;
    if (cmA.isExtraTimeDue(s2)) withEt = cmA.startExtraTime(s2) ?? s2;
    const live = withEt.live;
    const res = cmA.resumeMatch(withEt);
    return { kickoff, half, at70, live, res };
  });
}
const goalKeys = xs => xs.map(g => `${g.side}|${g.name}|${g.minute}|${g.plus ?? 0}`).sort();
function readLive(f, seed, ctx) {
  const L = livePath(f.pre, seed);
  if (!L) return;
  S2.liveMatches += 1;
  const feed = cmA.liveFeed(L.live).filter(x => x.kind === 'goal').map(x => ({ side: x.side, name: x.text, minute: x.minute, plus: x.plus }));
  const rep = [...L.res.report.myScorers.map(g => ({ ...g, side: 'me' })), ...L.res.report.oppScorers.map(g => ({ ...g, side: 'opp' }))];
  if (J(goalKeys(feed)) !== J(goalKeys(rep))) fail(2, `${ctx}: the commentary's goals ${J(goalKeys(feed))} are not the report's ${J(goalKeys(rep))}`);
  S2.liveBoardGoals += feed.filter(g => g.plus).length;
  const e = entryOf(f.pre, L.res);
  if (!isSecondLeg(cmA, f.pre, e)) return;
  const l1 = firstLegOf(f.pre, e.uclRound, f.club);
  if (!l1) return;
  /* The viewer at kick off, at the interval, in the 70th minute and at the end. */
  const at0 = `${l1.mine}-${l1.theirs}`;
  const html0 = render(LiveSimScreen, { ...SCREEN_PROPS, career: L.kickoff, live: L.kickoff.live, report: null });
  if (!html0.includes('data-cm-live-stage="first"')) fail(4, `${ctx}: the viewer at kick off is not on the first half`);
  if (J(attrs(html0, 'data-cm-live-agg')) !== J([at0])) fail(4, `${ctx}: the viewer at kick off shows the aggregate ${J(attrs(html0, 'data-cm-live-agg'))}, not the first leg ${at0}`);
  const lh = L.half.live;
  const at45 = `${l1.mine + (lh.h1My ?? []).length}-${l1.theirs + (lh.h1Opp ?? []).length}`;
  const html45 = render(LiveSimScreen, { ...SCREEN_PROPS, career: L.half, live: L.half.live, report: null });
  if (!html45.includes('data-cm-live-stage="interval"')) fail(4, `${ctx}: the viewer at half time is not at the interval`);
  if (J(attrs(html45, 'data-cm-live-agg')) !== J([at45])) fail(4, `${ctx}: the viewer at half time shows the aggregate ${J(attrs(html45, 'data-cm-live-agg'))}, not ${at45}`);
  const l7 = L.at70.live;
  const by70 = xs => (xs ?? []).filter(g => g.minute <= 70).length;
  const at70 = `${l1.mine + (l7.h1My ?? []).length + by70(l7.h2My)}-${l1.theirs + (l7.h1Opp ?? []).length + by70(l7.h2Opp)}`;
  const html70 = render(LiveSimScreen, { ...SCREEN_PROPS, career: L.at70, live: L.at70.live, report: null });
  if (!html70.includes('data-cm-live-minute="70"')) fail(4, `${ctx}: the viewer at 70 is not at the 70th minute`);
  if (J(attrs(html70, 'data-cm-live-agg')) !== J([at70])) fail(4, `${ctx}: the viewer in the 70th minute shows the aggregate ${J(attrs(html70, 'data-cm-live-agg'))}, not ${at70}`);
  const r = L.res.report;
  const end = `${l1.mine + mineOf(r, f.club)}-${l1.theirs + theirsOf(r, f.club)}`;
  const htmlEnd = render(LiveSimScreen, { ...SCREEN_PROPS, career: L.res.state, live: null, report: r });
  if (J(attrs(htmlEnd, 'data-cm-live-agg')) !== J([end])) fail(4, `${ctx}: the viewer at the end shows the aggregate ${J(attrs(htmlEnd, 'data-cm-live-agg'))}, not ${end}`);
  S4.liveHeaders += 1;
}
livePres.forEach((f, i) => readLive(f, 600001 + i * 31, `${f.club} live ${i}`));
deciders.filter(d => d.second).slice(0, 40).forEach((f, i) => {
  for (let j = 0; j < 2; j++) readLive(f, 610001 + i * 37 + j, `${f.club} (${f.era}) second leg live ${i}.${j}`);
});

/* ---------- section 2, a change made inside the second half's board ----------
   Round 781 review: the redraw of the rest of a board (recutBoard) had no
   check, and a change at 90 on the dot with an eight minute board filed the
   other dugout's change at 91 to 96, printed as 94' in a match of ninety
   minutes. A shape change at 90 plus 0, 1 and 2 (whatever the board allows),
   then the whistle: everything the clock had reached stays exactly as it
   was, every line of the report sits at or before 90 with any plus inside
   the board, and the commentary's goals are the report's. */
const BOARD_PLUS = [0, 1, 2];
const lineKey = x => `${x.kind}|${x.side}|${x.text}|${x.minute}|${x.plus ?? 0}`;
function readBoardChange(f, seed, ctx) {
  withSeed(seed, () => {
    const r1 = cmA.playNextEntry(f.pre);
    if (r1.kind !== 'halftime' || !r1.state.live) return;
    const s2 = cmA.startSecondHalf(r1.state);
    const board = s2.live?.added?.h2 ?? 0;
    for (const p of BOARD_PLUS) {
      if (p >= board) continue;
      const at = cmA.markLiveMinute(s2, 90);
      const kept = cmA.liveFeed(at.live).filter(x => x.kind !== 'halftime' && (x.minute < 90 || (x.minute === 90 && (x.plus ?? 0) <= p))).map(lineKey);
      const mentality = at.live.mentality === 'attacking' ? 'defensive' : 'attacking';
      const next = cmA.changeLive(at, 90, { kind: 'shape', mentality }, p);
      if (!next?.live) { fail(2, `${ctx}: a shape change at 90+${p} was refused`); continue; }
      S2.boardChanges += 1;
      if (p === 0) S2.boardChangesAt90 += 1;
      if (board === 8) S2.boardChangesLong += 1;
      const now = new Set(cmA.liveFeed(next.live).map(lineKey));
      const lost = kept.filter(k => !now.has(k));
      if (lost.length) fail(2, `${ctx}: a change at 90+${p} redrew ${lost.length} line(s) the clock had already reached, first ${lost[0]}`);
      const res = cmA.resumeMatch(next);
      if (!res?.report) { fail(2, `${ctx}: no report after a change at 90+${p}`); continue; }
      readLines(res.report, f.club, `${ctx} change at 90+${p} (board ${board})`);
      const feed = cmA.liveFeed(next.live).filter(x => x.kind === 'goal' && x.minute <= 90).map(x => ({ side: x.side, name: x.text, minute: x.minute, plus: x.plus }));
      const rep = [...res.report.myScorers.map(g => ({ ...g, side: 'me' })), ...res.report.oppScorers.map(g => ({ ...g, side: 'opp' }))].filter(g => g.minute <= 90);
      if (J(goalKeys(feed)) !== J(goalKeys(rep))) fail(2, `${ctx}: after a change at 90+${p} the commentary's goals ${J(goalKeys(feed))} are not the report's ${J(goalKeys(rep))}`);
    }
  });
}
livePres.forEach((f, i) => {
  for (let j = 0; j < 2; j++) readBoardChange(f, 620001 + i * 41 + j, `${f.club} board change ${i}.${j}`);
});

/* ---------- section 5: a save from before this round ---------- */
const S5 = { saves: 0, stripped: 0, played: 0, rolledH1: 0, rolledH2: 0 };
function stripToOld(state) {
  const j = JSON.parse(J(state));
  let n = 0;
  if (j.live && j.live.added) { delete j.live.added; n += 1; }
  const walkObj = o => {
    if (Array.isArray(o)) { for (const x of o) walkObj(x); return; }
    if (!o || typeof o !== 'object') return;
    if ('plus' in o) { delete o.plus; n += 1; }
    if (o.tie && typeof o.tie === 'object' && 'aggMine' in o.tie) {
      if (o.tie.leg === 1) { delete o.tie; n += 1; } else {
        for (const k of ['leg1Mine', 'leg1Theirs', 'leg1Home']) if (k in o.tie) { delete o.tie[k]; n += 1; }
      }
    }
    if (o.added && typeof o.added === 'object' && 'h1' in o.added && 'et' in o.added) { delete o.added.et; n += 1; }
    for (const v of Object.values(o)) walkObj(v);
  };
  walkObj(j);
  return { j, n };
}
function openOld(state, ctx) {
  const { j, n } = stripToOld(state);
  S5.stripped += n;
  store.clear();
  if (!cmA.saveCareer(j)) { fail(5, `${ctx}: the stripped save could not be written`); return null; }
  const loaded = cmA.loadCareer();
  if (!loaded) { fail(5, `${ctx}: loadCareer refused a save from before this round`); return null; }
  S5.saves += 1;
  return loaded;
}
/** The report of a match whose halves were drawn before the round: the boards it rolls, and no plus where none could be. */
function readOldReport(r, club, ctx, oldHalves) {
  const d = r?.detail;
  if (!d) { fail(5, `${ctx}: no report, or a report with no detail`); return; }
  S5.played += 1;
  const a = d.added ?? {};
  if (!(Number.isInteger(a.h1) && a.h1 >= 1 && a.h1 <= 5)) fail(5, `${ctx}: the first half board is ${J(a.h1)}, outside 1 to 5`);
  if (!(Number.isInteger(a.h2) && a.h2 >= 2 && a.h2 <= 8)) fail(5, `${ctx}: the second half board is ${J(a.h2)}, outside 2 to 8`);
  const all = [...r.myScorers, ...r.oppScorers, ...(d.cards ?? []), ...(d.oppCards ?? []), ...(d.injuries ?? []), ...(d.play ?? [])];
  for (const m of oldHalves) {
    const grew = all.filter(x => x.minute === m && x.plus);
    if (grew.length) fail(5, `${ctx}: a half drawn before the round grew ${grew.length} line(s) in its board, first ${label(grew[0])}`);
  }
  if (oldHalves.includes(45)) S5.rolledH1 += 1;
  if (oldHalves.includes(90)) S5.rolledH2 += 1;
  for (const x of all) {
    const board = x.minute === 45 ? a.h1 : x.minute === 90 ? a.h2 : d.et && x.minute === d.et.to ? a.et : undefined;
    if (x.plus && !(board >= x.plus)) fail(5, `${ctx}: a line at ${label(x)} sits past its board of ${J(board)}`);
  }
  if (r.myScorers.length !== mineOf(r, club) || r.oppScorers.length !== theirsOf(r, club)) fail(5, `${ctx}: the score ${r.homeGoals}-${r.awayGoals} is not its scorer lines`);
  try { render(MatchReportCard, { report: r, clubName: club, onContinue: noop }); } catch (err) { fail(5, `${ctx}: the report card threw ${err.message}`); }
}
[...oldPres.second.map(x => ({ ...x, kind: 'second leg' })), ...oldPres.plain.map(x => ({ ...x, kind: 'match' }))].forEach((f, i) => {
  const base = `${f.club} old ${f.kind} ${i}`;
  try {
    /* (a) between matches. */
    const hub = openOld(f.pre, `${base} between matches`);
    if (hub) {
      let s = hub;
      for (let k = 0; k < 4; k++) {
        const res = withSeed(700001 + i * 41 + k, () => cmA.playNextEntry(s, { skipHalftime: true }));
        if (!res?.state) { fail(5, `${base} between matches: step ${k} came back empty`); break; }
        if (k === 0) {
          if (!res.report) fail(5, `${base} between matches: the next entry played no match`);
          else {
            readOldReport(res.report, f.club, `${base} between matches`, []);
            readLines(res.report, f.club, `${base} between matches`);
          }
        }
        s = res.state;
        if (res.kind === 'seasonOver' || s.sacked) break;
      }
    }
    /* (b) paused at the interval, (c) paused in the 70th minute. */
    const r1 = withSeed(710001 + i * 43, () => cmA.playNextEntry(f.pre));
    if (r1.kind !== 'halftime' || !r1.state.live) { fail(5, `${base}: kick off came back ${r1.kind}`); return; }
    const atHalf = openOld(cmA.markLiveMinute(r1.state, 45), `${base} at the interval`);
    if (atHalf) {
      if (atHalf.live?.added || cmA.liveFeed(atHalf.live).some(x => x.plus && x.kind !== 'halftime')) fail(5, `${base} at the interval: the stripped save still carries a board`);
      const html = render(LiveSimScreen, { ...SCREEN_PROPS, career: atHalf, live: atHalf.live, report: null });
      if (!html.includes('data-cm-live-stage="interval"')) fail(5, `${base} at the interval: the viewer does not open at the interval`);
      const res = withSeed(720001 + i * 47, () => {
        let s2 = cmA.startSecondHalf(atHalf);
        if (cmA.isExtraTimeDue(s2)) s2 = cmA.startExtraTime(s2) ?? s2;
        return cmA.resumeMatch(s2);
      });
      readOldReport(res.report, f.club, `${base} from the interval`, [45]);
    }
    const s70 = withSeed(730001 + i * 53, () => cmA.markLiveMinute(cmA.startSecondHalf(r1.state), 70));
    const at70 = openOld(s70, `${base} at 70`);
    if (at70) {
      const html = render(LiveSimScreen, { ...SCREEN_PROPS, career: at70, live: at70.live, report: null });
      if (!html.includes('data-cm-live-minute="70"')) fail(5, `${base} at 70: the viewer does not open at the 70th minute`);
      const res = withSeed(740001 + i * 59, () => cmA.resumeMatch(at70));
      readOldReport(res.report, f.club, `${base} from the 70th minute`, [45, 90]);
    }
  } catch (err) {
    fail(5, `${base}: threw ${err.stack?.split('\n').slice(0, 3).join(' | ')}`);
  }
});

/* ================= 1 ================= */
{
  const A = S1.A;
  const B = S1.B;
  const h1 = A.h1 / A.goals90;
  const h2 = A.h2 / A.goals90;
  /* The ninety and their boards only: extra time has goals of its own, and the claim is about the board. */
  const gpmA = A.goals90 / A.matches;
  const gpmB = B.goals90 / B.matches;
  if (A.matches < T.minMatches) fail(1, `only ${A.matches} matches of mine in arm A, under the floor of ${T.minMatches}`);
  if (!(h1 >= T.h1Lo && h1 <= T.h1Hi)) fail(1, `${pct(A.h1, A.goals90)} percent of goals in first half added time, outside ${Math.round(100 * T.h1Lo)} to ${Math.round(100 * T.h1Hi)}`);
  if (!(h2 >= T.h2Lo && h2 <= T.h2Hi)) fail(1, `${pct(A.h2, A.goals90)} percent of goals in second half added time, outside ${Math.round(100 * T.h2Lo)} to ${Math.round(100 * T.h2Hi)}`);
  if (!(Math.abs(gpmA - gpmB) <= T.tolGpm)) fail(1, `goals per match ${gpmA.toFixed(3)} with the board open and ${gpmB.toFixed(3)} with it closed, a gap over ${T.tolGpm}`);
  report(1, 'Goals land in the board at a measured share, and the board adds no goals', [
    `arm A: ${A.matches} matches, ${A.goals90} goals in the ninety and the boards (${A.et} more in extra time): ${A.h1} at 45+ (${pct(A.h1, A.goals90)} percent, band ${Math.round(100 * T.h1Lo)} to ${Math.round(100 * T.h1Hi)}), ${A.h2} at 90+ (${pct(A.h2, A.goals90)} percent, band ${Math.round(100 * T.h2Lo)} to ${Math.round(100 * T.h2Hi)})`,
    `goals per match in the ninety and the boards: board open ${gpmA.toFixed(3)}, board closed ${gpmB.toFixed(3)} (${B.matches} matches), gap ${(gpmA - gpmB).toFixed(3)} (tolerance ${T.tolGpm})`,
    `of each half's own goals: ${pct(A.h1, A.h1Goals)} percent of the first half's in its board, ${pct(A.h2, A.goals90 - A.h1Goals)} percent of the second half's; mean boards ${(A.boardH1 / A.matches).toFixed(2)} and ${(A.boardH2 / A.matches).toFixed(2)} minutes`,
  ]);
}

/* ================= 2 ================= */
{
  if (S2.boardGoals < T.minBoardGoals) fail(2, `only ${S2.boardGoals} goals in a board were read, under the floor of ${T.minBoardGoals}`);
  if (S2.cardGoals < T.minCardsChecked) fail(2, `only ${S2.cardGoals} board goals were checked on the report card, under the floor of ${T.minCardsChecked}`);
  if (S2.timelineBoard < T.minTimelineBoard) fail(2, `only ${S2.timelineBoard} board goals on the match centre timeline, under the floor of ${T.minTimelineBoard}`);
  if (S2.liveMatches < T.minLiveMatches) fail(2, `only ${S2.liveMatches} matches through the live path, under the floor of ${T.minLiveMatches}`);
  if (S2.liveBoardGoals < T.minLiveCompared) fail(2, `only ${S2.liveBoardGoals} board goals in the live commentary, under the floor of ${T.minLiveCompared}`);
  if (S2.boardChanges < T.minBoardChanges) fail(2, `only ${S2.boardChanges} changes made inside the second half's board, under the floor of ${T.minBoardChanges}`);
  if (S2.boardChangesLong < T.minBoardChangesLong) fail(2, `only ${S2.boardChangesLong} of them in an eight minute board, under the floor of ${T.minBoardChangesLong}`);
  report(2, 'Every line in a board says so, everywhere a minute is printed', [
    `${S2.lines} lines read, ${S2.boardLines} of them in a board, each within its board; ${S2.boardGoals} goals in a board`,
    `report card: ${S2.cardGoals} board goals printed with their plus on ${S2.cardsChecked} cards; match centre timeline: ${S2.timelineBoard} board goal rows; live commentary: ${S2.liveMatches} matches equal to their report, ${S2.liveBoardGoals} board goals with their plus`,
    `changes inside the second half's board: ${S2.boardChanges} (${S2.boardChangesAt90} at 90 on the dot, ${S2.boardChangesLong} in an eight minute board), each keeping what the clock had reached and filing what it drew inside the board`,
  ]);
}

/* ================= 3 ================= */
{
  if (S3.deciders < T.minDeciders) fail(3, `only ${S3.deciders} deciders read, under the floor of ${T.minDeciders}`);
  if (S3.et < T.minEt) fail(3, `only ${S3.et} deciders went to extra time, under the floor of ${T.minEt}`);
  if (S3.levelOther < T.minLevelOther) fail(3, `only ${S3.levelOther} level matches that are not deciders, under the floor of ${T.minLevelOther}`);
  report(3, 'Extra time only on a level knockout tie', [
    `${S3.deciders} deciders read (walk and ${REPLAYS} replays each): ${S3.levelDeciders} level after ninety and the board, ${S3.et} with extra time`,
    `${S3.other} other matches (league, group, cup, first legs), ${S3.levelOther} of them level: none with extra time or a minute past 90`,
  ]);
}

/* ================= 4 ================= */
{
  if (S4.secondLegs < T.minSecondLegs) fail(4, `only ${S4.secondLegs} second legs read, under the floor of ${T.minSecondLegs}`);
  if (S4.legCards < T.minLegCards) fail(4, `only ${S4.legCards} second leg report cards read, under the floor of ${T.minLegCards}`);
  if (S4.brackets < T.minBrackets) fail(4, `only ${S4.brackets} brackets read after a second leg, under the floor of ${T.minBrackets}`);
  if (S4.liveHeaders < T.minLiveHeaders) fail(4, `only ${S4.liveHeaders} second legs through the viewer, under the floor of ${T.minLiveHeaders}`);
  if (S4.away < T.minAwayGoals) fail(4, `only ${S4.away} second legs decided on away goals, under the floor of ${T.minAwayGoals}`);
  if (S4.aet < T.minAetSecond) fail(4, `only ${S4.aet} second legs settled in extra time, under the floor of ${T.minAetSecond}`);
  report(4, 'The aggregate on a second leg, everywhere the tie is shown', [
    `${S4.secondLegs} second legs: the tie line, secondLegContext before and after and the match centre's first leg all equal the bracket's first leg plus tonight (${S4.away} settled on away goals, ${S4.aet} in extra time)`,
    `${S4.legCards} report cards print the first leg and the aggregate and where the tie ended; ${S4.brackets} brackets label ${S4.bracketTies} finished ties' headlines as the aggregate; ${S4.liveHeaders} second legs through the viewer show the aggregate at the interval, at 70 and at the end`,
    `${S4.firstLegs} first legs carry their own score as the aggregate so far; ${S4.quiet} other weeks have no second leg context and no first leg in the match centre`,
  ]);
}

/* ================= 5 ================= */
{
  if (S5.saves < T.minOld) fail(5, `only ${S5.saves} old saves opened, under the floor of ${T.minOld}`);
  if (S5.stripped < 1) fail(5, 'stripping the saves removed nothing, so they were never in the old shape');
  report(5, 'A save from before this round loads and plays', [
    `${S5.saves} saves stripped of ${S5.stripped} fields from this round, opened with loadCareer and played: ${S5.played} matches, ${S5.rolledH1} with a first half drawn before the round and ${S5.rolledH2} with both halves, every board rolled in its old range and no old half grew a plus`,
  ]);
}

/* ---------- the verdict ---------- */
const red = [...failedIn.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const spec = CONTROLS[CONTROL];
  const missing = spec.must.filter(s => !failedIn.has(s));
  const unexpected = red.filter(s => !spec.must.includes(s) && !spec.also.includes(s));
  console.log(`\nsimCmStoppageTime control ${CONTROL}: sections red [${red.join(', ')}], required [${spec.must.join(', ')}]${spec.also.length ? `, tolerated [${spec.also.join(', ')}]` : ''}`);
  if (missing.length || unexpected.length) {
    if (missing.length) console.error(`  CONTROL BROKEN: section(s) ${missing.join(', ')} stayed green`);
    if (unexpected.length) console.error(`  CONTROL BROKEN: section(s) ${unexpected.join(', ')} went red and were not expected to`);
    process.exit(3);
  }
  console.log(`simCmStoppageTime control ${CONTROL}: FIRED on exactly its section(s), so the harness is red as it must be`);
  process.exit(1);
}
console.log(failures === 0
  ? '\nsimCmStoppageTime: PASS. Goals fall in the board at a measured share without adding any, every line in a board says 45+N or 90+N wherever a minute is printed, extra time comes only on a level knockout tie, a second leg shows the first leg and the running aggregate everywhere the tie is shown, and a save from before the round loads and plays.'
  : `\nsimCmStoppageTime: ${failures} FAILURES in section(s) ${red.join(', ')}`);
process.exit(failures === 0 ? 0 : 1);
