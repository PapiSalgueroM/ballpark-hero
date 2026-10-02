/* Club Manager: extra time before penalties. Round 670.

   A player's footer report: "for a cup game if it goes to extra time there
   can be a goal in 91+, but only if the game is a tie in the first 90
   minutes". Before this round a Champions League decider level after ninety
   minutes went straight to a shootout, in the manager's matches and in every
   AI tie. Now a match that settles its tie (the final, a one legged tie, a
   second leg) and is level as the ninety run out (on the night, or on the
   aggregate after away goals in the eras that had them) plays one thirty
   minute stretch, 91 to 120, and only then penalties. Every such decider
   draws at ET_DEFLATOR so goals per match there do not move. Domestic cups
   are deliberately untouched (their real rule differs by cup and round), and
   docs/design/round-670-extra-time-contract.md says why.

   This harness holds that from the outside, with numbers. It bundles the
   real engine three times: A, the engine as it is (or as a control rewrote
   it), B, the engine before this round (no extra time anywhere and no
   deflator), and C, extra time with the deflator taken out. B and C are
   always built from the source on disk, never from a control's copy, so a
   control moves only arm A. Fixtures are real: a walk of real careers,
   strong clubs across the modern save and the three historic eras, captures
   the save the week before every Champions League decider, and each one is
   replayed on many seeds through the live path (kick off, startSecondHalf,
   startExtraTime when the engine says it is due, resumeMatch), the same
   seeds in every arm, so the arms differ only by the rule.

   Sections (one line of measurements each, one FAIL line per failure):

     1) Extra time is played exactly when it is due, in the manager's
        deciders (arm A). Level at 90 is worked out here from the drawn
        halves and the bracket's first leg, through uclTieOutcome and the
        era's away goals rule. Extra time present if and only if level,
        every event of it in 91..120, nothing past 90 without it and nothing
        past 120 with it. Coverage floor: at least 40 extra time matches.
     2) Nothing else ever gets it. Every league, group, domestic cup and
        first leg match of the capture walk: no extra time, never 'aet', no
        minute past 90 anywhere in the report, nine momentum buckets. The
        level ones are counted and floored so the check has teeth, and a
        level domestic cup tie still goes straight to penalties.
     3) Balance, three arms on the same fixtures and seeds. The strongest
        signal is the engine's own expected goals per decider, the lambdas in
        force summed over every stretch actually played, which is what the
        goals are drawn from and carries none of the Poisson noise: A must
        sit within a tolerance of B, and C must clear B by a floor, so the
        section carries its own positive signal. The actual goals of my
        deciders and of the AI's are printed beside it and held too. The
        solved deflator is printed: B's expectation over A's, times the
        constant, is the fixed point the constant should sit on.
     4) The result after extra time. decidedBy is 'aet' when extra time
        settled it and 'pens' only when still level after it, won reads the
        night including extra time (a single leg shootout aside), the report
        counts the extra time goals, the second leg's tie line is the
        aggregate with them and says who went through, the bracket carries
        aet and pens to match, the timeline has its extra time marker at 90
        and its whistle at 120, and momentum has twelve buckets. Then
        uclTieOutcome driven directly with extra time goals folded into leg
        two: an away goal in extra time wins it in the 2005 era and goes to
        penalties in the modern one.
     5) The AI plays it too. Across every AI tie the replays settle: every
        shootout came after extra time and was level after it, every tie
        settled in extra time has the winner the tie's own score says, and
        there is at least one of each. Round 670 review: and the one legged
        AI ties too, every AI final the capture walk played, read the same
        way and floored so the final's own branch is held (the replays only
        ever settle two legged rounds).
     6) The screens, through react-dom/server. The report card prints (AET),
        an AET chip and the extra time line on an aet report, "Still level
        after extra time" on a shootout after it, and none of that on a
        regular one; the viewer at the 97th minute of extra time reads ET 97'
        on stage extra, and AET at the end; the bracket says who won it in
        extra time, and an old tie with no aet keeps its old line.
     7) One match, two ways, extra time included. The live path equals the
        quick sim on the same seed down to the report's JSON and the bracket,
        on at least 20 extra time matches. A change in the 100th minute keeps
        everything at or before it and redraws the rest inside 101..120; a
        change at 121 is refused, a change at 91 is refused in a match with
        no extra time, and the clock mark caps at 120.
     8) Round 670 review: extra time is played by men with names. Every
        event of mine in an extra time match (every chance, corner, foul and
        throw in, every goal and every card) names a man who is on my pitch
        at that minute, going by the eleven, the changes, the reds and the
        injuries. The review found every one of my events from the 99th
        minute on with no name at all, because "never leaves the pitch" was
        written as minute 99. Floored on events past the 99th minute.
     9) Round 670 review: possession in extra time is read off rates. The
        share of the ball over the second period moves no further from 50
        on average when extra time is drawn than the football in it
        explains (the raw 45 to 120 sum pushed it about two points out),
        and a change in the 100th minute that alters nothing (the same
        shape, with no goal, red or injury of mine since 90) leaves it
        exactly where it was.
    10) Round 670 polish: what announces extra time is true. A one legged
        tie is level on the night; a second leg is level on the AGGREGATE,
        and the night's own score often is not (0-3 after a 3-0 first leg),
        so "Level after 90 minutes" beside a 0-3 was false. The aggregate
        at 90 is worked out here from the bracket's first leg and the goals
        drawn by 90. The viewer's banner line (extraTimeCall) and the
        report's timeline marker must say "Level after 90 minutes" on a one
        legged tie and "Level X-X on aggregate" on a second leg (with "and on
        away goals" in the eras that had them); a shootout after extra time
        says the aggregate is still level in the report's event line and on
        the report card, and the bracket says "Level on aggregate after
        extra time". Floored on second legs that were NOT level on the night,
        the case that was false. The viewer's banner itself is drawn inside
        an effect, which react-dom/server never runs, so the banner on the
        screen is held by src/test/liveSimMotion.test.tsx (simLiveSimMotion,
        control banner).

   Negative controls, EXTRA_TIME_CONTROL=<name>. Each rewrites a copy (the
   engine, the report card or the bracket) under .sim-control/extratime,
   refuses to run (exit 2) unless its anchor is found exactly once, and then
   must turn its named section red and no other (a tolerated section is
   listed where one is red by construction):
     noet       playsExtraTime answers false. Section 1 must go red (7, 8,
                9 and 10 are tolerated: with no extra time they have nothing
                to read).
     nodeflate  ET_DEFLATOR is 1. Section 3 must go red.
     etleague   playsExtraTime answers true for every match that is not a
                first leg. Section 2 must go red.
     noaet      a second leg settled in extra time is reported as 'regular'.
                Section 4 must go red.
     noaiet     the AI plays its deciders the pre 670 way (no extra time, no
                deflator). Section 5 must go red.
     noaifinal  only the AI's one legged ties (the final) go back to the pre
                670 way. Section 5 must go red, which is what proves the
                final's branch is read.
     nolabel    the report card drops (AET). Section 6 must go red.
     livedraw   startExtraTime draws one number before extra time, so the
                viewer's extra time is not the whistle's. Section 7 must go red.
     noname     "never leaves" is minute 99 again in drawSegment. Section 8
                must go red.
     possinflate  possession reads the raw 45 to 120 sum again. Section 9
                must go red.
     possstale  drawing extra time leaves the second half's possession
                alone, so a change that alters nothing moves it. Section 9
                must go red.
     levelline  the engine says "Level after 90 minutes" on a second leg
                again (the banner line and the timeline). Section 10 must go
                red.
     pensline   the report's event line says "Still level after extra time"
                on a second leg again. Section 10 must go red.
     cardlevel  the report card says it on a second leg again. Section 10
                must go red.
     bracketlevel  the bracket says "Level after extra time" on a two legged
                tie again. Section 10 must go red.
   Under a control the run exits 1 when the control fired on exactly its
   section (the engine it ran is a regression, so the harness is red) and 3
   when the control did not fire or bled into another section.

   Thresholds, measured 2026-09-28 on this harness's seed and SIM_SEED=1 to 4:
   see the THRESHOLDS block below, every number with its measurement.

   Run: node scripts/simExtraTime.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.EXTRA_TIME_CONTROL || '';
const lf = s => s.replaceAll('\r\n', '\n');

/* The node_modules that holds react, found by walking up, so a worktree
   inside the repo resolves the main one the way node itself does. */
function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'react', 'package.json')) && fs.existsSync(path.join(nm, 'esbuild'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with react and esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}
const NM = modulesDir();

/* ---- THRESHOLDS, each from measured headroom ----
   Measured 2026-09-28 on five samples: this harness's own seed and SIM_SEED
   1 to 4 (each a different walk, so different careers and fixtures), at
   ET_DEFLATOR 0.97 and 0.95 and carried to 0.965 by the constant's own
   proportion (every expectation below is linear in it).
     replays per arm                        3000 to 3150                 floor 2500
     extra time matches (section 1)         314 to 368 (this seed 320)   floor 40
     level league matches (section 2)       190 and up                   floor 100
     extra time matches compared (7)        40 every sample              floor 20
     expected goals per decider, A - B      -0.006 to +0.013             tolerance 0.04
       (nodeflate turns A into C and measured +0.098 here, over twice the tolerance)
     expected goals per decider, C - B      +0.090 to +0.112             floor 0.06
     actual goals per decider, A - B        within 0.025 either way      tolerance 0.10
     AI second legs, A - B                  -0.044 to +0.015             tolerance 0.08
       (an actual goals mean over about 9,000 legs a side, SD of the
        difference about 0.023, and the AI's own fixed point sits a little
        above the constant, 0.960 to 0.982, because fewer of its ties are
        level; 0.08 is under twice the largest seen and three and a half SD)
     AI second legs, C - B                  +0.062 to +0.090             floor 0.02
       (the same noise; the section's positive signal is the expected
        goals line above, this one only says the AI's extra time adds)
   Round 670 review, measured 2026-09-28 on the same five samples after the
   review's fixes (the Infinity sentinel moves the random stream inside extra
   time, so the numbers above moved a little too: P 0.103 to 0.125, A - B
   -0.006 to +0.016, AI A - B -0.046 to +0.004, all inside their tolerances):
     AI finals read (section 5)             289 to 328                   floor 100
     AI finals that went to extra time      69 to 91                     floor 20
     my events from the 99th minute on (8)  3665 to 4510                 floor 1000
     possession shift at extra time (9)     -0.029 to +0.038             tolerance 0.5
       (possinflate measured +2.359 here, the review's +2.17; the mean is
        over about 340 matches whose single shifts spread about two points,
        so its own SD is near 0.1 and 0.5 is five of them)
     unchanged matches, same shape at 100   210 to 274, none moved       floor 100
   Round 670 polish, measured 2026-09-28 on the same five samples (each
   floor is under half the lowest):
     one legged ties to extra time (10)     100 to 151                   floor 45
     second legs to extra time not level
       on the night (10)                    142 to 171                   floor 60
     second legs to extra time in the
       away goals eras (10)                 67 to 146                    floor 30 */
const T = {
  minEt: 40,
  minLevelLeague: 100,
  minReplays: 2500,
  minCompared: 20,
  tolXg: 0.04,
  gainXg: 0.06,
  tolGoals: 0.10,
  tolAi: 0.08,
  gainAi: 0.02,
  minFinals: 100,
  minFinalsAet: 20,
  minPast99: 1000,
  tolPoss: 0.5,
  minNoop: 100,
  minNotLevelNight: 60,
  minAwayEra: 30,
  minSingleEt: 45,
};

/* ---- controls ---- */
const ENGINE = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
const CARD = path.join(ROOT, 'src', 'components', 'club-manager', 'MatchReportCard.tsx');
const BRACKET = path.join(ROOT, 'src', 'components', 'club-manager', 'UclBracketCard.tsx');
const DEFLATOR_LINE = /export const ET_DEFLATOR = [0-9.]+;\n/g;
const AI_EDITS = [
  ['      const [a2, h2] = simAiMatch(state, t.away, t.home, ET_DEFLATOR);\n', '      const [a2, h2] = simAiMatch(state, t.away, t.home);\n'],
  ['      let out = uclTieOutcome(t, uclAwayGoalsApply(state.eraId));\n      if (out.winner === null) {\n', '      let out = uclTieOutcome(t, uclAwayGoalsApply(state.eraId));\n      if (false) {\n'],
  ['    let [hg, ag] = simAiMatch(state, t.home, t.away, ET_DEFLATOR);\n    if (hg === ag) {\n', '    let [hg, ag] = simAiMatch(state, t.home, t.away);\n    if (false) {\n'],
];
const NO_ET_EDIT = ['function playsExtraTime(state: CareerState, entry: CalendarEntry): boolean {\n', 'function playsExtraTime(state: CareerState, entry: CalendarEntry): boolean {\n  if (entry) return false;\n'];
const CONTROLS = {
  noet: { must: [1], also: [7, 8, 9, 10], file: 'engine', edits: [NO_ET_EDIT], note: 'playsExtraTime answers false; section 1 must go red' },
  noaet: {
    must: [4], also: [], file: 'engine',
    edits: [["      advanced = (out.winner === 'home') === iAmHome;\n      if (etPlayed) decidedBy = 'aet';\n", "      advanced = (out.winner === 'home') === iAmHome;\n"]],
    note: "a second leg settled in extra time is reported as 'regular'; section 4 must go red",
  },
  noaifinal: { must: [5], also: [], file: 'engine', edits: [AI_EDITS[2]], note: 'only the AI final goes back to the pre 670 way; section 5 must go red' },
  noname: {
    must: [8], also: [], file: 'engine',
    edits: [['  const mineAt = (m: number): CMPlayer[] => xi.filter(p => (exits.get(p.id) ?? Infinity) > m);\n', '  const mineAt = (m: number): CMPlayer[] => xi.filter(p => (exits.get(p.id) ?? 99) > m);\n']],
    note: '"never leaves" is minute 99 again; section 8 must go red',
  },
  possinflate: {
    must: [9], also: [], file: 'engine',
    edits: [['  const halves = ((live.et ? live.et.to : 90) - 45) / 45;\n', '  const halves = 1;\n']],
    note: 'possession reads the raw 45 to 120 sum again; section 9 must go red',
  },
  possstale: {
    must: [9], also: [], file: 'engine',
    edits: [['lamOpp * ET_MINUTES / 45);\n  live.possH2 = secondPeriodPossession(live);\n', 'lamOpp * ET_MINUTES / 45);\n']],
    note: "drawing extra time leaves the second half's possession alone; section 9 must go red",
  },
  nodeflate: { must: [3], also: [], file: 'engine', edits: [[DEFLATOR_LINE, 'export const ET_DEFLATOR = 1;\n']], note: 'ET_DEFLATOR is 1; section 3 must go red' },
  etleague: {
    must: [2], also: [], file: 'engine',
    edits: [[
      "  if (entry.type !== 'uclKo' || !entry.uclRound) return false;\n  /* A legacy week",
      "  if (entry.type !== 'uclKo' || !entry.uclRound) return entry.type !== 'window';\n  /* A legacy week",
    ]],
    note: 'every match that is not a first leg plays extra time; section 2 must go red',
  },
  noaiet: { must: [5], also: [], file: 'engine', edits: AI_EDITS, note: 'the AI plays its deciders the pre 670 way; section 5 must go red' },
  nolabel: {
    must: [6], also: [], file: 'card',
    edits: [["{resultWord}{r.decidedBy === 'pens' ? ' (PENS)' : r.decidedBy === 'aet' ? ' (AET)' : ''}", "{resultWord}{r.decidedBy === 'pens' ? ' (PENS)' : ''}"]],
    note: 'the report card drops (AET); section 6 must go red',
  },
  livedraw: {
    must: [7], also: [], file: 'engine',
    edits: [['  drawExtraTime(state, state.calendar[live.week], live);\n  live.minute = Math.max(90, live.minute ?? 0);\n', '  Math.random();\n  drawExtraTime(state, state.calendar[live.week], live);\n  live.minute = Math.max(90, live.minute ?? 0);\n']],
    note: 'the viewer draws one number before extra time; section 7 must go red',
  },
  levelline: {
    must: [10], also: [], file: 'engine',
    edits: [["  if (!secondLegTonight(state, entry)) return 'Level after 90 minutes';\n", "  return 'Level after 90 minutes';\n"]],
    note: 'the ninetieth minute says "Level after 90 minutes" on a second leg again; section 10 must go red',
  },
  pensline: {
    must: [10], also: [], file: 'engine',
    edits: [[
      "    events.push(tieLine ? `⏱️ Still level ${tieLine.aggMine}-${tieLine.aggTheirs} on aggregate after extra time.` : '⏱️ Still level after extra time.');\n",
      "    events.push('⏱️ Still level after extra time.');\n",
    ]],
    note: 'the event line says "Still level after extra time" on a second leg again; section 10 must go red',
  },
  cardlevel: {
    must: [10], also: [], file: 'card',
    edits: [[
      "    : r.tie?.leg === 2 ? `Still level ${r.tie.aggMine}-${r.tie.aggTheirs} on aggregate after extra time. ` : 'Still level after extra time. ';\n",
      "    : 'Still level after extra time. ';\n",
    ]],
    note: 'the report card says "Still level after extra time" on a second leg again; section 10 must go red',
  },
  bracketlevel: {
    must: [10], also: [], file: 'bracket',
    edits: [["{t.aet ? (t.legs === 2 ? 'Level on aggregate after extra time.' : 'Level after extra time.') : ", "{t.aet ? 'Level after extra time.' : "]],
    note: 'the bracket says "Level after extra time" on a two legged tie again; section 10 must go red',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`EXTRA_TIME_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

/* One rewrite, refused unless its anchor is there exactly once. */
function rewrite(src, [from, to], label) {
  const n = typeof from === 'string' ? src.split(from).length - 1 : (src.match(from) ?? []).length;
  if (n !== 1) {
    const shown = (typeof from === 'string' ? from : String(from)).slice(0, 80).replaceAll('\n', '\\n');
    console.error(`${label} cannot run: its anchor is in the file ${n} times, not once (${shown}...)`);
    process.exit(2);
  }
  if (typeof from !== 'string') from.lastIndex = 0;
  const out = src.replace(from, to);
  if (out === src) { console.error(`${label} cannot run: the rewrite changed nothing`); process.exit(2); }
  return out;
}

const CONTROL_DIR = path.join(ROOT, '.sim-control', 'extratime');
const tag = `${process.pid}`;
const written = [];
const ENTRY = `${TMP}/extraTime.${tag}.entry.mjs`;
const BUNDLE = `${TMP}/extraTime.${tag}.bundle.cjs`;
const cleanup = () => {
  for (const f of [...written, ENTRY, BUNDLE, BUNDLE.replace(/\.cjs$/, '.css')]) {
    try { fs.rmSync(f, { force: true }); } catch { /* already gone */ }
  }
};
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130); });
fs.mkdirSync(CONTROL_DIR, { recursive: true });
const writeCopy = (name, text) => {
  const p = path.join(CONTROL_DIR, `${name}.${tag}${name.includes('Card') ? '.tsx' : '.ts'}`);
  fs.writeFileSync(p, text);
  written.push(p);
  return p.replaceAll('\\', '/');
};

const engineSrc = lf(fs.readFileSync(ENGINE, 'utf8'));
const cardSrc = lf(fs.readFileSync(CARD, 'utf8'));
const bracketSrc = lf(fs.readFileSync(BRACKET, 'utf8'));
let engineA = engineSrc;
let cardA = cardSrc;
let bracketA = bracketSrc;
if (CONTROL) {
  const spec = CONTROLS[CONTROL];
  for (const e of spec.edits) {
    if (spec.file === 'engine') engineA = rewrite(engineA, e, `EXTRA_TIME_CONTROL=${CONTROL}`);
    else if (spec.file === 'card') cardA = rewrite(cardA, e, `EXTRA_TIME_CONTROL=${CONTROL}`);
    else bracketA = rewrite(bracketA, e, `EXTRA_TIME_CONTROL=${CONTROL}`);
  }
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${spec.note}`);
}
/* The arms, always from the source on disk. */
const engineC = rewrite(engineSrc, [DEFLATOR_LINE, 'export const ET_DEFLATOR = 1;\n'], 'arm C');
let engineB = rewrite(engineC, NO_ET_EDIT, 'arm B');
for (const e of AI_EDITS) engineB = rewrite(engineB, e, 'arm B');

const pathA = engineA === engineSrc ? `${ROOT_URL}/src/lib/clubManager.ts` : writeCopy('clubManagerA', engineA);
const pathB = writeCopy('clubManagerB', engineB);
const pathC = writeCopy('clubManagerC', engineC);
const cardPath = cardA === cardSrc ? `${ROOT_URL}/src/components/club-manager/MatchReportCard.tsx` : writeCopy('MatchReportCardA', cardA);
const bracketPath = bracketA === bracketSrc ? `${ROOT_URL}/src/components/club-manager/UclBracketCard.tsx` : writeCopy('UclBracketCardA', bracketA);

fs.writeFileSync(ENTRY, `
export * as cmA from '${pathA}';
export * as cmB from '${pathB}';
export * as cmC from '${pathC}';
export { MatchReportCard } from '${cardPath}';
export { LiveSimScreen } from '${ROOT_URL}/src/components/club-manager/LiveSimScreen.tsx';
export { UclBracketCard } from '${bracketPath}';
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
execSync(`"${NM}/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { cmA, cmB, cmC, MatchReportCard, LiveSimScreen, UclBracketCard, render } = createRequire(import.meta.url)(BUNDLE);
/* Round 832: an era's squads load with the era, so every arm fetches all three first. */
for (const engine of [cmA, cmB, cmC]) await engine.ensureAllEraRosters();
for (const [arm, cm] of [['A', cmA], ['B', cmB], ['C', cmC]]) {
  for (const name of ['startCareer', 'playNextEntry', 'resumeMatch', 'startSecondHalf', 'startExtraTime', 'isExtraTimeDue',
    'changeLive', 'markLiveMinute', 'uclTieOutcome', 'uclAwayGoalsApply', 'uclLegsFor', 'ET_DEFLATOR', 'ET_MINUTES', 'myOnPitchAt', 'extraTimeCall']) {
    if (cm[name] === undefined) { console.error(`arm ${arm}: the engine does not export ${name}`); process.exit(2); }
  }
}
if (cmB.ET_DEFLATOR !== 1 || cmC.ET_DEFLATOR !== 1 || !(cmA.ET_DEFLATOR > 0 && cmA.ET_DEFLATOR <= 1)) {
  console.error(`the arms did not build as described: A ${cmA.ET_DEFLATOR}, B ${cmB.ET_DEFLATOR}, C ${cmC.ET_DEFLATOR}`);
  process.exit(2);
}

/* ---- failures, attributed to the section they fell in, printed in order ---- */
let failures = 0;
const failedIn = new Map();
const failText = new Map();
const PRINT_CAP = 8;
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
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const f3 = n => (Number.isFinite(n) ? n.toFixed(3) : String(n));
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) : 'n/a');

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

/* ---- the material: a walk of real careers, capturing every decider ---- */
const secondLegOf = (cm, s, entry) => entry.uclLeg === 2 && cm.uclLegsFor(s.eraId, entry.uclRound) === 2;
const isDecider = (cm, s, entry) => !!entry && entry.type === 'uclKo' && !!entry.uclRound && s.uclKoRound === entry.uclRound
  && !(entry.uclLeg === 1 && cm.uclLegsFor(s.eraId, entry.uclRound) === 2);
const CAREERS = [
  ['Real Madrid', undefined], ['Man City', undefined], ['Bayern Munich', undefined], ['Barcelona', undefined],
  ['Liverpool', undefined], ['PSG', undefined], ['Inter', undefined], ['Arsenal', undefined],
  ['Barcelona', 'era2005'], ['Real Madrid', 'era2005'], ['Chelsea', 'era2005'], ['Arsenal', 'era2005'],
  ['Barcelona', 'era2010'], ['Real Madrid', 'era2010'], ['Chelsea', 'era2010'], ['Man United', 'era2010'],
  ['Barcelona', 'era2015'], ['Real Madrid', 'era2015'], ['Chelsea', 'era2015'], ['Juventus', 'era2015'],
];
const WANT_FIXTURES = 60;
const fixtures = [];
/* Section 2 reads the walk as it goes, so no report is kept. */
const s2 = { counts: { league: 0, uclGroup: 0, cup: 0, firstLeg: 0 }, level: { league: 0, uclGroup: 0, cup: 0, firstLeg: 0 }, cupPens: 0 };
function readWalkReport(r, era) {
  const kind = r.competition === 'uclKo' ? 'firstLeg' : r.competition;
  if (!(kind in s2.counts)) return;
  s2.counts[kind] += 1;
  const ctx = `${r.home} v ${r.away} (${r.compLabel}, ${era})`;
  const d = r.detail;
  const level = r.homeGoals === r.awayGoals;
  if (level) s2.level[kind] += 1;
  if (d?.et) fail(2, `${ctx}: a ${kind} match played extra time`);
  if (r.decidedBy === 'aet') fail(2, `${ctx}: a ${kind} match was decided after extra time`);
  const minutes = [...(d?.play ?? []).map(e => e.minute), ...r.myScorers.map(e => e.minute), ...r.oppScorers.map(e => e.minute), ...(d?.timeline ?? []).map(e => e.minute)];
  const over = minutes.filter(m => m > 90);
  if (over.length) fail(2, `${ctx}: ${over.length} minute(s) past 90, first ${over[0]}`);
  if (d && d.momentum.length !== 9) fail(2, `${ctx}: ${d.momentum.length} momentum buckets`);
  if (kind === 'cup' && level) {
    if (r.decidedBy === 'pens') s2.cupPens += 1;
    else fail(2, `${ctx}: a level cup tie was decided by ${r.decidedBy}`);
  }
}
/* Round 670 review: the AI's one legged ties. The replays below only ever
   settle a two legged round (a decider of mine is never the AI's final), so
   the finals the walk plays are read here, each once, by readAiTie (section 5). */
const S5 = { ties: 0, twoLeg: 0, aetSettled: 0, pens: 0, finals: 0, finalsAet: 0, finalsPens: 0 };
const finalsSeen = new Set();
const finalPres = [];
const WANT_FINAL_PRES = 12;
const FINAL_SEEDS = 25;
function readWalkFinals(s, era, careerNo) {
  for (const t of s.uclBracket ?? []) {
    if (t.legs === 2 || t.mine || !t.winner) continue;
    const key = `${careerNo}|${t.round}|${t.home}|${t.away}`;
    if (finalsSeen.has(key)) continue;
    finalsSeen.add(key);
    S5.finals += 1;
    if (t.aet) S5.finalsAet += 1;
    if (t.pens) S5.finalsPens += 1;
    readAiTie(t, s.eraId, `${t.home} v ${t.away} (${era} ${t.round}, the walk's career ${careerNo})`);
  }
}
let careersWalked = 0;
let walked = 0;
for (let pass = 0; pass < 6 && fixtures.length < WANT_FIXTURES; pass++) {
  for (const [club, era] of CAREERS) {
    if (fixtures.length >= WANT_FIXTURES) break;
    let s = withSeed(31000 + pass * 101 + careersWalked, () => { try { return cmA.startCareer(club, era); } catch { return null; } });
    if (!s || s.clubName !== club) continue;
    careersWalked += 1;
    let guard = 0;
    while (guard++ < 200) {
      const entry = s.calendar[s.week];
      const decider = isDecider(cmA, s, entry);
      /* Round 670 review: a final week my club is not in, kept to replay the AI final on many seeds. */
      if (!decider && entry && entry.type === 'uclKo' && entry.uclRound === 'F' && finalPres.length < WANT_FINAL_PRES) finalPres.push({ pre: s, era: era ?? 'modern', careerNo: careersWalked });
      if (decider) fixtures.push({ pre: s, club, era: era ?? 'modern', round: entry.uclRound, secondLeg: secondLegOf(cmA, s, entry) });
      const res = withSeed(52000 + careersWalked * 997 + guard, () => cmA.playNextEntry(s, { skipHalftime: true }));
      if (!res || !res.state) break;
      if (res.report) { walked += 1; if (!decider) readWalkReport(res.report, era ?? 'modern'); }
      s = res.state;
      readWalkFinals(s, era ?? 'modern', careersWalked);
      if (res.kind === 'seasonOver' || s.sacked) break;
    }
  }
}
if (fixtures.length < 30) {
  console.error(`only ${fixtures.length} Champions League deciders were reached in ${careersWalked} careers; the walk is too shallow to measure anything`);
  process.exit(1);
}
const byEra = {};
for (const f of fixtures) byEra[f.era] = (byEra[f.era] ?? 0) + 1;
console.log(`material: ${careersWalked} careers walked, ${walked} matches played, ${fixtures.length} deciders captured (${Object.entries(byEra).map(([e, n]) => `${e} ${n}`).join(', ')}; ${fixtures.filter(f => f.secondLeg).length} second legs)`);
/* Round 670 review: each final week my club was not in, replayed on its own
   seeds, so the AI's one legged branch is read on a few hundred finals
   rather than the dozen the walk happens to play. */
finalPres.forEach((fp, fi) => {
  for (let j = 0; j < FINAL_SEEDS; j++) {
    const res = withSeed(700001 + fi * 1009 + j * 13, () => cmA.playNextEntry(fp.pre, { skipHalftime: true }));
    if (res && res.state) readWalkFinals(res.state, fp.era, `${fp.careerNo} replay ${j}`);
  }
});

/* ---- one replay through the live path ---- */
const mineOf = (r, club) => (r.home === club ? r.homeGoals : r.awayGoals);
const theirsOf = (r, club) => (r.home === club ? r.awayGoals : r.homeGoals);
const myTie = (s, round) => (s.uclBracket ?? []).find(t => t.round === round && t.mine);
/** Level after the goals given, the way the competition reads it. */
function levelAfter(cm, f, mine, opp) {
  if (!f.secondLeg) return mine === opp;
  const tie = myTie(f.pre, f.round);
  const iAmHome = tie ? tie.home === f.club : true;
  const leg1 = tie?.leg1 ?? { homeGoals: 0, awayGoals: 0 };
  const leg2 = { homeGoals: iAmHome ? mine : opp, awayGoals: iAmHome ? opp : mine };
  return cm.uclTieOutcome({ leg1, leg2 }, cm.uclAwayGoalsApply(f.pre.eraId)).winner === null;
}
function livePlay(cm, f, seed) {
  return withSeed(seed, () => {
    const r1 = cm.playNextEntry(f.pre);
    if (r1.kind !== 'halftime' || !r1.state.live) return { err: `kick off came back ${r1.kind}` };
    const beforeEt = cm.startSecondHalf(r1.state);
    const l2 = beforeEt.live;
    const at90 = { mine: l2.myGoals + (l2.h2My ?? []).length, opp: l2.oppGoals + (l2.h2Opp ?? []).length };
    let withEt = beforeEt;
    if (cm.isExtraTimeDue(beforeEt)) {
      const drawn = cm.startExtraTime(beforeEt);
      if (drawn) withEt = drawn;
    }
    const live = withEt.live;
    const xg = (live.lamMine ?? 0) + (live.lamOpp ?? 0) + (live.lam2Mine ?? 0) + (live.lam2Opp ?? 0);
    const res = cm.resumeMatch(withEt);
    return { at90, live, beforeEt, withEt, xg, report: res.report, state: res.state };
  });
}
const SEEDS = 50;
const seedOf = (fi, j) => 900001 + fi * 1009 + j * 13;

/* Everything is read as it is played and only numbers are kept, because a
   replay leaves three whole careers behind it. */
const S1 = { n: 0, level: 0, et: 0 };
const S3 = { A: { n: 0, xg: [], goals: [], ai: [], aiAet: 0 }, B: { n: 0, xg: [], goals: [], ai: [], aiAet: 0 }, C: { n: 0, xg: [], goals: [], ai: [], aiAet: 0 } };
const S4 = { checked: 0, aet: 0, pens: 0 };
const S7 = { compared: 0, base: 0, changes: 0 };
const S8 = { matches: 0, events: 0, past99: 0 };
const S9 = { n: 0, shift: [], noop: 0, noopMoved: 0, noopSkipped: 0 };
const S10 = { single: 0, second: 0, secondNotLevelNight: 0, awayEra: 0, pensSingle: 0, pensSecond: 0 };
const kept = { etA: [], plainA: null, aetC: null, pensEtC: null, regularC: null, aet2C: null, pens2A: null, pens1A: null };

function readS1(r) {
  const f = r.f;
  const ctx = `${f.club} (${f.era}) ${f.round}${f.secondLeg ? ' second leg' : ''} seed ${r.j}`;
  S1.n += 1;
  const isLevel = levelAfter(cmA, f, r.at90.mine, r.at90.opp);
  const hasEt = !!r.live.et;
  if (isLevel) S1.level += 1;
  if (hasEt) S1.et += 1;
  if (isLevel !== hasEt) fail(1, `${ctx}: ${r.at90.mine}-${r.at90.opp} at 90 is ${isLevel ? '' : 'not '}level and extra time was ${hasEt ? '' : 'not '}played`);
  if (hasEt && (r.live.et.from !== 90 || r.live.et.to !== 90 + cmA.ET_MINUTES)) fail(1, `${ctx}: extra time ran ${J(r.live.et)}`);
  const d = r.report.detail;
  const minutes = [
    ...(d?.play ?? []).map(e => e.minute), ...r.report.myScorers.map(e => e.minute), ...r.report.oppScorers.map(e => e.minute),
    ...(d?.cards ?? []).map(e => e.minute), ...(d?.oppCards ?? []).map(e => e.minute), ...(d?.subs ?? []).map(e => e.minute),
    ...(d?.oppSubs ?? []).map(e => e.minute), ...(d?.injuries ?? []).map(e => e.minute),
  ];
  const cap = hasEt ? 90 + cmA.ET_MINUTES : 90;
  const past = minutes.filter(m => !(Number.isInteger(m) && m >= 0 && m <= cap));
  if (past.length) fail(1, `${ctx}: ${past.length} event minute(s) outside 0..${cap}, first ${past[0]}`);
  if (hasEt && !minutes.some(m => m > 90)) fail(1, `${ctx}: extra time was played and nothing at all happened in it`);
}

function readS4(r) {
  if (!r.live.et) return;
  S4.checked += 1;
  const rep = r.report;
  const f = r.f;
  const ctx = `${f.club} (${f.era}) ${f.round}${f.secondLeg ? ' second leg' : ''} seed ${r.j}`;
  const mine = mineOf(rep, f.club);
  const opp = theirsOf(rep, f.club);
  const liveMine = r.live.myGoals + (r.live.h2My ?? []).length;
  const liveOpp = r.live.oppGoals + (r.live.h2Opp ?? []).length;
  if (mine !== liveMine || opp !== liveOpp) fail(4, `${ctx}: the report says ${mine}-${opp} and the match drew ${liveMine}-${liveOpp}`);
  const stillLevel = levelAfter(cmA, f, mine, opp);
  const want = stillLevel ? 'pens' : 'aet';
  if (rep.decidedBy !== want) fail(4, `${ctx}: ${mine}-${opp} after extra time was decided by ${rep.decidedBy}, not ${want}`);
  if (want === 'aet') S4.aet += 1; else S4.pens += 1;
  if (!(stillLevel && !f.secondLeg) && rep.won !== (mine > opp)) fail(4, `${ctx}: won is ${rep.won} for ${mine}-${opp} after extra time`);
  const tie = myTie(r.state, f.round);
  if (!tie) { fail(4, `${ctx}: my tie is gone from the bracket`); return; }
  if (tie.aet !== true) fail(4, `${ctx}: the bracket does not carry aet`);
  if (!!tie.pens !== stillLevel) fail(4, `${ctx}: the bracket's pens is ${!!tie.pens} and the tie was ${stillLevel ? '' : 'not '}level after extra time`);
  const through = tie.winner === f.club;
  if (f.secondLeg) {
    const preTie = myTie(f.pre, f.round);
    const iAmHome = preTie.home === f.club;
    const l1Mine = iAmHome ? preTie.leg1.homeGoals : preTie.leg1.awayGoals;
    const l1Opp = iAmHome ? preTie.leg1.awayGoals : preTie.leg1.homeGoals;
    if (!rep.tie || rep.tie.leg !== 2 || rep.tie.aggMine !== l1Mine + mine || rep.tie.aggTheirs !== l1Opp + opp) {
      fail(4, `${ctx}: the tie line reads ${J(rep.tie)} for a first leg ${l1Mine}-${l1Opp} and ${mine}-${opp} tonight`);
    }
    if (rep.tie && rep.tie.through !== through) fail(4, `${ctx}: the tie line says through ${rep.tie.through} and the bracket says ${through}`);
  } else if (rep.tie) {
    fail(4, `${ctx}: a one legged tie carries a tie line`);
  }
  if (want === 'aet' && through !== (f.secondLeg ? rep.tie?.through : rep.won)) fail(4, `${ctx}: through ${through} does not match the report`);
  const d = rep.detail;
  if (J(d?.et) !== J(r.live.et)) fail(4, `${ctx}: the report's extra time ${J(d?.et)} is not the match's ${J(r.live.et)}`);
  const tl = d?.timeline ?? [];
  const etMark = tl.filter(e => e.kind === 'extratime');
  if (etMark.length !== 1 || etMark[0].minute !== 90) fail(4, `${ctx}: the timeline carries ${etMark.length} extra time marker(s) at ${etMark.map(e => e.minute)}`);
  const last = tl[tl.length - 1];
  if (!last || last.kind !== 'fulltime' || last.minute !== 90 + cmA.ET_MINUTES) fail(4, `${ctx}: the timeline ends ${J(last)}`);
  if (d?.momentum.length !== 12) fail(4, `${ctx}: ${d?.momentum.length} momentum buckets for a match of 120 minutes`);
  const shots = (d?.play ?? []).filter(e => e.kind === 'shot' && e.side === 'me').length;
  if (d && d.stats.shots !== shots) fail(4, `${ctx}: the stats count ${d.stats.shots} shots and the match had ${shots}, extra time included`);
  if (!rep.events.some(e => e.includes('extra time'))) fail(4, `${ctx}: no event line mentions extra time`);
}

/* One AI tie, one legged or two, read the way the competition reads it. */
function readAiTie(t, eraId, ctx) {
  S5.ties += 1;
  const out = t.legs === 2 ? cmA.uclTieOutcome(t, cmA.uclAwayGoalsApply(eraId)) : null;
  if (t.legs === 2) {
    S5.twoLeg += 1;
    if (t.homeGoals !== out.homeAgg || t.awayGoals !== out.awayAgg) fail(5, `${ctx}: the headline ${t.homeGoals}-${t.awayGoals} is not the legs' ${out.homeAgg}-${out.awayAgg}`);
  }
  const levelNow = t.legs === 2 ? out.winner === null : t.homeGoals === t.awayGoals;
  if (t.pens) {
    S5.pens += 1;
    if (!t.aet) fail(5, `${ctx}: went to penalties without extra time`);
    if (!levelNow) fail(5, `${ctx}: went to penalties while not level after extra time`);
  } else {
    if (levelNow) fail(5, `${ctx}: level after everything and no penalties`);
    const want = t.legs === 2 ? (out.winner === 'home' ? t.home : t.away) : (t.homeGoals > t.awayGoals ? t.home : t.away);
    if (t.winner !== want) fail(5, `${ctx}: ${t.winner} through where the score says ${want}`);
    if (t.aet) S5.aetSettled += 1;
  }
}

function readS5(r) {
  for (const t of r.state.uclBracket ?? []) {
    if (t.round !== r.f.round || t.mine || !t.winner) continue;
    readAiTie(t, r.f.pre.eraId, `${t.home} v ${t.away} (${r.f.era} ${t.round}, seed ${r.j})`);
  }
}

/* Section 8: every event of mine in an extra time match names a man on my
   pitch at that minute. The pitch is worked out here from the match's own
   record (the eleven, the changes, the reds and the injuries), not through
   the engine's own picker, so this reads what the picker did. A man is still
   out there at the minute he walks or limps off (the foul behind his red is
   his, at that minute). */
function readS8(r) {
  if (!r.live.et) return;
  const live = r.live;
  const s = r.withEt;
  const ctx = `${r.f.club} (${r.f.era}) ${r.f.round}${r.f.secondLeg ? ' second leg' : ''} seed ${r.j}`;
  const nameOf = new Map((s.squad ?? []).map(p => [p.id, p.name]));
  const exits = new Map();
  for (const c of [...(live.h1Cards ?? []), ...(live.h2Cards ?? [])]) if (c.kind === 'red' && c.id) exits.set(c.id, c.minute);
  for (const x of [...(live.h1Injuries ?? []), ...(live.h2Injuries ?? [])]) if (x.id) exits.set(x.id, Math.min(exits.get(x.id) ?? Infinity, x.minute));
  const onAt = m => new Set(cmA.myOnPitchAt(live, m).filter(id => !((exits.get(id) ?? Infinity) < m)).map(id => nameOf.get(id)));
  const events = [
    ...(live.h2Play ?? []).filter(e => e.side === 'me').map(e => ({ minute: e.minute, who: e.who, what: e.kind })),
    ...(live.h2My ?? []).map(g => ({ minute: g.minute, who: g.name, what: 'goal' })),
    ...(live.h2Cards ?? []).map(c => ({ minute: c.minute, who: c.name, what: `${c.kind} card` })),
  ].filter(e => e.minute > live.et.from);
  S8.matches += 1;
  for (const e of events) {
    S8.events += 1;
    if (e.minute >= 99) S8.past99 += 1;
    if (!e.who) { fail(8, `${ctx}: my ${e.what} at ${e.minute} has no name`); continue; }
    if (!onAt(e.minute).has(e.who)) fail(8, `${ctx}: my ${e.what} at ${e.minute} names ${e.who}, who is not on my pitch then`);
  }
}

/* Section 9: possession across the second period, off rates. */
function readS9(r) {
  if (!r.live.et) return;
  const ctx = `${r.f.club} ${r.f.round} seed ${r.j}`;
  const p90 = r.beforeEt.live.possH2;
  const pEt = r.withEt.live.possH2;
  if (!Number.isFinite(p90) || !Number.isFinite(pEt)) { fail(9, `${ctx}: possession ${p90} at 90 and ${pEt} with extra time`); return; }
  S9.n += 1;
  S9.shift.push(Math.abs(pEt - 50) - Math.abs(p90 - 50));
  /* The same shape at 100, where nothing of mine has changed since 90: the
     lambdas it redraws with are the ones extra time was drawn with. */
  const live = r.withEt.live;
  const since90 = xs => (xs ?? []).some(e => e.minute > 90 && e.minute <= 100);
  if (since90(live.h2My) || since90(live.h2Opp) || since90((live.h2Cards ?? []).filter(c => c.kind === 'red')) || since90(live.h2Injuries)) { S9.noopSkipped += 1; return; }
  const after = cmA.changeLive(r.withEt, 100, { kind: 'shape', mentality: live.mentality });
  if (!after) { fail(9, `${ctx}: the same shape at 100 was refused`); return; }
  S9.noop += 1;
  if (after.live.possH2 !== pEt) { S9.noopMoved += 1; fail(9, `${ctx}: the same shape at 100 moved possession from ${pEt} to ${after.live.possH2}`); }
}

/* Section 10: what announces extra time is true. The aggregate is worked out
   here from the bracket's first leg in the save before the match, in my
   orientation, plus tonight's goals; the three historic eras are the ones
   with away goals. */
function firstLegOf(f) {
  const t = myTie(f.pre, f.round);
  const iAmHome = t.home === f.club;
  return { mine: iAmHome ? t.leg1.homeGoals : t.leg1.awayGoals, theirs: iAmHome ? t.leg1.awayGoals : t.leg1.homeGoals };
}
function wordsAt90(f, at90) {
  if (!f.secondLeg) return 'Level after 90 minutes';
  const l1 = firstLegOf(f);
  return `Level ${l1.mine + at90.mine}-${l1.theirs + at90.opp} on aggregate${f.era === 'modern' ? '' : ' and on away goals'}`;
}
function readS10(r) {
  if (!r.live.et) return;
  const f = r.f;
  const ctx = `${f.club} (${f.era}) ${f.round}${f.secondLeg ? ' second leg' : ''} seed ${r.j}`;
  const want = wordsAt90(f, r.at90);
  if (f.secondLeg) {
    S10.second += 1;
    if (r.at90.mine !== r.at90.opp) S10.secondNotLevelNight += 1;
    if (f.era !== 'modern') S10.awayEra += 1;
  } else {
    S10.single += 1;
  }
  const call = cmA.extraTimeCall(r.withEt, r.withEt.live);
  if (call !== want) fail(10, `${ctx}: ${r.at90.mine}-${r.at90.opp} on the night at 90, and the banner line reads "${call}" where the tie says "${want}"`);
  const d = r.report.detail;
  const mark = (d?.timeline ?? []).find(e => e.kind === 'extratime');
  const wantMark = `${want} (+${d?.added?.h2}'), extra time`;
  if (!mark || mark.text !== wantMark) fail(10, `${ctx}: the timeline marker reads "${mark?.text}", not "${wantMark}"`);
  if (r.report.decidedBy !== 'pens') return;
  let wantEvent;
  if (f.secondLeg) {
    S10.pensSecond += 1;
    const l1 = firstLegOf(f);
    wantEvent = `Still level ${l1.mine + mineOf(r.report, f.club)}-${l1.theirs + theirsOf(r.report, f.club)} on aggregate after extra time.`;
    if (!kept.pens2A) kept.pens2A = r;
  } else {
    S10.pensSingle += 1;
    wantEvent = 'Still level after extra time.';
    if (!kept.pens1A) kept.pens1A = r;
  }
  if (!r.report.events.some(e => e.includes(wantEvent))) {
    fail(10, `${ctx}: a shootout after extra time, and no event line reads "${wantEvent}" (${J(r.report.events.filter(e => e.includes('extra time')))})`);
  }
}

function readS7(r) {
  const hasEt = !!r.live.et;
  if (hasEt ? S7.compared >= 40 : S7.base >= 10) return;
  const quick = withSeed(seedOf(r.fi, r.j), () => cmA.playNextEntry(r.f.pre, { skipHalftime: true }));
  const ctx = `${r.f.club} ${r.f.round} seed ${r.j}`;
  if (J(quick.report) !== J(r.report)) fail(7, `${ctx}: the quick sim's report is not the live path's${hasEt ? ' (extra time)' : ''}`);
  else if (J(quick.state.uclBracket) !== J(r.state.uclBracket)) fail(7, `${ctx}: the two ways left different brackets`);
  if (hasEt) S7.compared += 1; else S7.base += 1;
}

function readS3(arm, r) {
  const acc = S3[arm];
  acc.n += 1;
  acc.xg.push(r.xg);
  acc.goals.push(r.report.homeGoals + r.report.awayGoals);
  for (const t of r.state.uclBracket ?? []) {
    if (t.round !== r.f.round || t.mine || !t.winner || t.legs !== 2 || !t.leg2) continue;
    acc.ai.push(t.leg2.homeGoals + t.leg2.awayGoals);
    if (t.aet) acc.aiAet += 1;
  }
}

for (const [arm, cm] of [['A', cmA], ['B', cmB], ['C', cmC]]) {
  fixtures.forEach((f, fi) => {
    for (let j = 0; j < SEEDS; j++) {
      const out = livePlay(cm, f, seedOf(fi, j));
      if (out.err || !out.report) { fail(arm === 'A' ? 1 : 3, `arm ${arm}, ${f.club} ${f.round}: ${out.err ?? 'no report'}`); continue; }
      const r = { f, fi, j, ...out };
      readS3(arm, r);
      if (arm === 'A') {
        readS1(r);
        readS4(r);
        readS5(r);
        readS7(r);
        readS8(r);
        readS9(r);
        readS10(r);
        if (r.live.et && kept.etA.length < 12) kept.etA.push(r);
        if (!r.live.et && !kept.plainA) kept.plainA = r;
      }
      if (arm === 'C') {
        const by = r.report.decidedBy;
        if (by === 'aet' && !kept.aetC) kept.aetC = r;
        if (by === 'aet' && f.secondLeg && !kept.aet2C) kept.aet2C = r;
        if (by === 'pens' && r.report.detail?.et && !kept.pensEtC) kept.pensEtC = r;
        if (by === 'regular' && !kept.regularC) kept.regularC = r;
      }
    }
  });
}

/* ================= 1 ================= */
if (S1.n < T.minReplays) fail(1, `only ${S1.n} replays, under the ${T.minReplays} this harness needs`);
if (S1.et < T.minEt) fail(1, `only ${S1.et} extra time matches, under the coverage floor of ${T.minEt}`);
report(1, "Extra time is played exactly when it is due, in the manager's deciders", [
  `${S1.n} decider replays over ${fixtures.length} fixtures x ${SEEDS} seeds: ${S1.level} level at 90 (P = ${f3(S1.level / S1.n)}), ${S1.et} played extra time`,
]);

/* ================= 2 ================= */
if (s2.level.league < T.minLevelLeague) fail(2, `only ${s2.level.league} level league matches, under the floor of ${T.minLevelLeague}`);
if (s2.level.firstLeg < 1) fail(2, 'no level first leg was played, so the first leg rule went unmeasured');
report(2, 'No league, group, domestic cup or first leg match ever gets extra time', [
  `${s2.counts.league} league (${s2.level.league} level), ${s2.counts.uclGroup} group (${s2.level.uclGroup} level), ${s2.counts.cup} domestic cup (${s2.level.cup} level, ${s2.cupPens} straight to penalties), ${s2.counts.firstLeg} first legs (${s2.level.firstLeg} level): none past 90`,
]);

/* ================= 3 ================= */
{
  const stat = k => ({ n: S3[k].n, xg: mean(S3[k].xg), goals: mean(S3[k].goals), aiN: S3[k].ai.length, ai: mean(S3[k].ai), aiAet: S3[k].aiAet });
  const A = stat('A');
  const B = stat('B');
  const C = stat('C');
  for (const [k, s] of [['A', A], ['B', B], ['C', C]]) if (s.n < T.minReplays) fail(3, `arm ${k}: only ${s.n} replays, under ${T.minReplays}`);
  if (!(Math.abs(A.xg - B.xg) <= T.tolXg)) fail(3, `expected goals per decider moved by ${f3(A.xg - B.xg)} with extra time, over the tolerance of ${T.tolXg}`);
  if (!(C.xg - B.xg >= T.gainXg)) fail(3, `extra time without the deflator added only ${f3(C.xg - B.xg)} expected goals, under the floor of ${T.gainXg}, so this section cannot tell a deflator from none`);
  if (!(Math.abs(A.goals - B.goals) <= T.tolGoals)) fail(3, `actual goals per decider moved by ${f3(A.goals - B.goals)}, over ${T.tolGoals}`);
  if (!(Math.abs(A.ai - B.ai) <= T.tolAi)) fail(3, `the AI's goals per second leg moved by ${f3(A.ai - B.ai)}, over ${T.tolAi}`);
  if (!(C.ai - B.ai >= T.gainAi)) fail(3, `the AI's extra time without the deflator added only ${f3(C.ai - B.ai)}, under the floor of ${T.gainAi}`);
  const dNow = cmA.ET_DEFLATOR;
  report(3, 'Goals per decider do not move: A within tolerance of B, and C clears B', [
    `expected goals per decider (lambdas summed): A ${f3(A.xg)}, B ${f3(B.xg)}, C ${f3(C.xg)}; A - B ${f3(A.xg - B.xg)} (tolerance ${T.tolXg}), C - B ${f3(C.xg - B.xg)} (floor ${T.gainXg}); n ${A.n}, ${B.n}, ${C.n}`,
    `actual goals per decider: A ${f3(A.goals)}, B ${f3(B.goals)}, C ${f3(C.goals)}; A - B ${f3(A.goals - B.goals)} (tolerance ${T.tolGoals})`,
    `AI second legs: A ${f3(A.ai)}, B ${f3(B.ai)}, C ${f3(C.ai)} goals; A - B ${f3(A.ai - B.ai)} (tolerance ${T.tolAi}), C - B ${f3(C.ai - B.ai)} (floor ${T.gainAi}); n ${A.aiN}, ${B.aiN}, ${C.aiN}; extra time in ${pct(A.aiAet, A.aiN)} percent under A`,
    `solved deflator: mine ${f3(dNow * B.xg / A.xg)}, the AI's ${f3(dNow * B.ai / A.ai)} (the constant is ${dNow})`,
  ]);
}

/* ================= 4 ================= */
{
  /* uclTieOutcome, extra time goals folded into leg two, both eras. Leg one
     1-1 at tie.home. Leg two at tie.away, 1-1 after ninety; tie.home scores
     one in extra time and so does tie.away, so leg two is 2-2 in the tie's
     orientation. Aggregate 3-3; away goals tie.home 2 against tie.away 1. */
  const ERA = cmA.uclAwayGoalsApply('era2005');
  const NOW = cmA.uclAwayGoalsApply(undefined);
  const cases = [
    ['an away goal each in extra time, 2005', { leg1: { homeGoals: 1, awayGoals: 1 }, leg2: { homeGoals: 2, awayGoals: 2 } }, ERA, 'home'],
    ['an away goal each in extra time, modern', { leg1: { homeGoals: 1, awayGoals: 1 }, leg2: { homeGoals: 2, awayGoals: 2 } }, NOW, null],
    ['goalless extra time, 2005', { leg1: { homeGoals: 1, awayGoals: 1 }, leg2: { homeGoals: 1, awayGoals: 1 } }, ERA, null],
    ['the home side scores the only extra time goal, modern', { leg1: { homeGoals: 1, awayGoals: 1 }, leg2: { homeGoals: 1, awayGoals: 2 } }, NOW, 'away'],
    ['the home side scores the only extra time goal, 2005', { leg1: { homeGoals: 1, awayGoals: 1 }, leg2: { homeGoals: 1, awayGoals: 2 } }, ERA, 'away'],
  ];
  if (ERA !== true || NOW !== false) fail(4, `the era rule reads 2005 ${ERA} and modern ${NOW}`);
  for (const [label, tie, rule, want] of cases) {
    const out = cmA.uclTieOutcome(tie, rule);
    if (out.winner !== want) fail(4, `uclTieOutcome, ${label}: ${out.winner} rather than ${want}`);
  }
  report(4, 'The result after extra time is read the way the competition reads it', [
    `${S4.checked} extra time matches read: ${S4.aet} settled in extra time, ${S4.pens} to penalties after it (coverage is section 1's); ${cases.length} folded outcomes driven directly`,
  ]);
}

/* ================= 5 ================= */
if (S5.ties < 100) fail(5, `only ${S5.ties} AI ties, too few to read`);
if (S5.aetSettled < 1) fail(5, 'no AI tie was settled in extra time');
if (S5.pens < 1) fail(5, 'no AI tie went to penalties');
if (S5.finals < T.minFinals) fail(5, `only ${S5.finals} AI finals were read, under the floor of ${T.minFinals}`);
if (S5.finalsAet < T.minFinalsAet) fail(5, `only ${S5.finalsAet} AI finals went to extra time, under the floor of ${T.minFinalsAet}, so the one legged branch went unread`);
report(5, 'Every AI tie settled by these replays plays extra time before penalties', [
  `${S5.ties} AI ties read (${S5.twoLeg} over two legs): ${S5.aetSettled} settled in extra time, ${S5.pens} to penalties after it`,
  `of them ${S5.finals} AI finals, one legged (the walk's own, and ${finalPres.length} final weeks my club was not in, replayed ${FINAL_SEEDS} times each): ${S5.finalsAet} went to extra time, ${S5.finalsPens} of those to penalties`,
]);

/* ================= 6 ================= */
const visible = html => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
{
  /* From arm C, which is built from the source on disk whatever control is
     on, so a control on the engine cannot take the material away. */
  const { aetC, pensEtC, regularC, aet2C } = kept;
  const lines = [];
  if (!aetC || !pensEtC || !regularC || !aet2C) {
    fail(6, `the material is missing: aet ${!!aetC}, penalties after extra time ${!!pensEtC}, regular ${!!regularC}, aet second leg ${!!aet2C}`);
  } else {
    const card = r => visible(render(MatchReportCard, { report: r.report, clubName: r.f.club, onContinue: () => {} }));
    const a = card(aetC);
    if (!a.includes('(AET)')) fail(6, `the report card of an aet match does not print (AET): ${a.slice(0, 120)}`);
    /* Round 781: the chip carries the extra time board too (AET 120+1'). */
    const etBoard = aetC.report.detail?.added?.et;
    const chip = `AET ${90 + cmA.ET_MINUTES}${etBoard ? `+${etBoard}` : ''}'`;
    if (!a.includes(chip)) fail(6, `the report card of an aet match has no ${chip} chip`);
    if (!/in extra time|after extra time/.test(a)) fail(6, 'the report card of an aet match has no extra time line');
    if (!/on aggregate after extra time/.test(card(aet2C))) fail(6, 'the report card of an aet second leg does not give the aggregate after extra time');
    const p = card(pensEtC);
    /* Round 670 polish: on a second leg it is the aggregate that is still
       level, and section 10 holds which of the two it says. */
    if (!p.includes('(PENS)') || !/Still level (\d+-\d+ on aggregate )?after extra time/.test(p)) fail(6, 'the report card of a shootout after extra time does not say both');
    const g = card(regularC);
    if (g.includes('(AET)') || g.includes('extra time')) fail(6, 'a regular report mentions extra time');
    /* The viewer, 97 minutes in, and at the end. */
    const at97 = cmC.markLiveMinute(aetC.withEt, 97);
    const noop = () => {};
    const props = { clubColor: '#ffffff', onSub: noop, onShape: noop, onTalk: noop, onSecondHalf: noop, onExit: noop, onStartSecondHalf: noop, onStartExtraTime: noop, onChange: noop, onMark: noop };
    const v = render(LiveSimScreen, { ...props, career: at97, live: at97.live, report: null });
    if (!v.includes('data-cm-live-stage="extra"') || !v.includes('data-cm-live-minute="97"')) fail(6, 'the viewer 97 minutes into extra time is not on stage extra at 97');
    if (!visible(v).includes("ET 97'")) fail(6, "the viewer 97 minutes in does not read ET 97'");
    const done = visible(render(LiveSimScreen, { ...props, career: aetC.state, live: null, report: aetC.report }));
    if (!done.includes('AET') || !done.includes('Decided in extra time')) fail(6, 'the viewer at the end of an aet match does not say AET and decided in extra time');
    const doneReg = visible(render(LiveSimScreen, { ...props, career: regularC.state, live: null, report: regularC.report }));
    if (doneReg.includes('AET') || doneReg.includes('extra time')) fail(6, 'the viewer at the end of a regular match mentions extra time');
    /* The bracket. */
    const b = visible(render(UclBracketCard, { career: aetC.state }));
    if (!/won it in extra time|after extra time/.test(b)) fail(6, 'the bracket does not say the tie went to extra time');
    /* A bracket written before this round carries no aet on any tie. */
    const old = JSON.parse(J(pensEtC.state));
    for (const t of old.uclBracket ?? []) delete t.aet;
    const o = visible(render(UclBracketCard, { career: old }));
    if (o.includes('extra time')) fail(6, 'a bracket with no aet flag printed an extra time line');
    if (!/Level after 90\.|Level over two legs\./.test(o)) fail(6, 'a bracket with no aet flag lost its old penalties line');
    lines.push(`report card: (AET), the ${chip} chip, the extra time line, the aggregate after it, the shootout after it, none of it on a regular match; viewer ET 97' and AET at the end; bracket aet line and the old line on an old tie`);
  }
  report(6, 'The report card, the viewer and the bracket say that extra time happened', lines);
}

/* ================= 7 ================= */
{
  for (const r of kept.etA) {
    const s = r.withEt;
    const ctx = `${r.f.club} ${r.f.round} seed ${r.j}`;
    const after = withSeed(seedOf(r.fi, r.j) + 5, () => cmA.changeLive(s, 100, { kind: 'shape', mentality: 'attacking' }));
    if (!after) { fail(7, `${ctx}: a shape change at 100 in extra time was refused`); continue; }
    S7.changes += 1;
    const keep = xs => J((xs ?? []).filter(e => e.minute <= 100));
    for (const k of ['h2My', 'h2Opp', 'h2Play', 'h2Cards', 'h2OppCards']) {
      if (keep(s.live[k]) !== keep(after.live[k])) fail(7, `${ctx}: ${k} at or before 100 moved`);
      const late = (after.live[k] ?? []).filter(e => e.minute > 100 && !(e.minute >= 101 && e.minute <= 120));
      if (late.length) fail(7, `${ctx}: ${k} redrawn outside 101..120, first ${late[0].minute}`);
    }
    if (J(after.live.et) !== J(s.live.et)) fail(7, `${ctx}: the change moved extra time itself`);
    const segs = after.live.h2Segs ?? [];
    const lastSeg = segs[segs.length - 1];
    if (!lastSeg || lastSeg.from !== 100 || lastSeg.to !== 120) fail(7, `${ctx}: the redrawn stretch is ${J(lastSeg)}`);
    if (cmA.changeLive(s, 121, { kind: 'shape', mentality: 'attacking' }) !== null) fail(7, `${ctx}: a change at 121 was accepted`);
    if (cmA.markLiveMinute(s, 130).live.minute !== 120) fail(7, `${ctx}: the clock mark went past 120`);
  }
  if (kept.plainA && cmA.changeLive(kept.plainA.beforeEt, 91, { kind: 'shape', mentality: 'attacking' }) !== null) fail(7, 'a change at 91 was accepted in a match with no extra time');
  if (S7.compared < T.minCompared) fail(7, `only ${S7.compared} extra time matches compared, under ${T.minCompared}`);
  report(7, 'The live path and the quick sim are one match, extra time included', [
    `${S7.compared} extra time matches and ${S7.base} others equal both ways down to the report and the bracket; ${S7.changes} changes at 100 kept the past and redrew 101..120`,
  ]);
}

/* ================= 8 ================= */
if (S8.past99 < T.minPast99) fail(8, `only ${S8.past99} events of mine from the 99th minute on, under the floor of ${T.minPast99}`);
report(8, 'Extra time is played by men with names, on the pitch at the minute', [
  `${S8.matches} extra time matches, ${S8.events} events of mine past 90 (${S8.past99} from the 99th minute on), each naming a man on my pitch`,
]);

/* ================= 9 ================= */
{
  const shift = mean(S9.shift);
  if (S9.n < T.minEt) fail(9, `only ${S9.n} extra time matches read, under ${T.minEt}`);
  if (!(Math.abs(shift) <= T.tolPoss)) fail(9, `drawing extra time moved possession ${f3(shift)} points further from 50 on average, over the tolerance of ${T.tolPoss}`);
  if (S9.noop < T.minNoop) fail(9, `only ${S9.noop} unchanged extra time matches for the same shape at 100, under ${T.minNoop}`);
  report(9, 'Possession in extra time is read off rates, and a change that alters nothing leaves it', [
    `${S9.n} extra time matches: possession moved ${f3(shift)} points further from 50 on average when extra time was drawn (tolerance ${T.tolPoss}); the same shape at 100 left it exactly where it was in ${S9.noop - S9.noopMoved} of ${S9.noop} (${S9.noopSkipped} skipped, something of mine changed after 90)`,
  ]);
}

/* ================= 10 ================= */
{
  if (S10.secondNotLevelNight < T.minNotLevelNight) fail(10, `only ${S10.secondNotLevelNight} second legs went to extra time with the night's own score not level, under the floor of ${T.minNotLevelNight}, so the case that was false went unread`);
  if (S10.awayEra < T.minAwayEra) fail(10, `only ${S10.awayEra} second legs in the away goals eras went to extra time, under the floor of ${T.minAwayEra}`);
  if (S10.single < T.minSingleEt) fail(10, `only ${S10.single} one legged ties went to extra time, under the floor of ${T.minSingleEt}`);
  const lines = [
    `${S10.single} one legged ties and ${S10.second} second legs to extra time (${S10.secondNotLevelNight} of those not level on the night, ${S10.awayEra} in the away goals eras): the banner line and the timeline marker say what the tie says`,
  ];
  const card = r => visible(render(MatchReportCard, { report: r.report, clubName: r.f.club, onContinue: () => {} }));
  const bracketLine = r => {
    const b = visible(render(UclBracketCard, { career: r.state }));
    return { b, winner: myTie(r.state, r.f.round)?.winner };
  };
  if (!kept.pens2A) {
    fail(10, 'no second leg went to penalties after extra time, so the report card and the bracket went unread');
  } else {
    const r = kept.pens2A;
    const l1 = firstLegOf(r.f);
    const want = `Still level ${l1.mine + mineOf(r.report, r.f.club)}-${l1.theirs + theirsOf(r.report, r.f.club)} on aggregate after extra time`;
    const c = card(r);
    if (!c.includes(want)) fail(10, `the report card of a second leg shootout after extra time does not read "${want}": ${c.slice(0, 160)}`);
    if (c.includes('Still level after extra time')) fail(10, 'the report card of a second leg shootout after extra time says the night was still level');
    const { b, winner } = bracketLine(r);
    const wantB = `Level on aggregate after extra time. ${winner} win on penalties.`;
    if (!b.includes(wantB)) fail(10, `the bracket after a second leg shootout after extra time does not read "${wantB}"`);
    lines.push(`a second leg shootout after extra time: the report card reads "${want}", the bracket "${wantB}"`);
  }
  if (kept.pens1A) {
    const r = kept.pens1A;
    if (!card(r).includes('Still level after extra time')) fail(10, 'the report card of a one legged shootout after extra time does not say it was still level');
    const { b, winner } = bracketLine(r);
    if (!b.includes(`Level after extra time. ${winner} win on penalties.`)) fail(10, 'the bracket after a one legged shootout after extra time does not say it was level after it');
    lines.push('a one legged shootout after extra time: the report card and the bracket say it was level after it');
  } else {
    lines.push(`no one legged tie of mine went to penalties after extra time in this sample (${S10.pensSingle}), so that card line went unread`);
  }
  report(10, 'What announces extra time is true: level on the night, or level on aggregate on a second leg', lines);
}

/* ---------- the verdict ---------- */
const red = [...failedIn.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const spec = CONTROLS[CONTROL];
  const missing = spec.must.filter(s => !failedIn.has(s));
  const unexpected = red.filter(s => !spec.must.includes(s) && !spec.also.includes(s));
  console.log(`\nsimExtraTime control ${CONTROL}: sections red [${red.join(', ')}], required [${spec.must.join(', ')}]${spec.also.length ? `, tolerated [${spec.also.join(', ')}]` : ''}`);
  if (missing.length || unexpected.length) {
    if (missing.length) console.error(`  CONTROL BROKEN: section(s) ${missing.join(', ')} stayed green`);
    if (unexpected.length) console.error(`  CONTROL BROKEN: section(s) ${unexpected.join(', ')} went red and were not expected to`);
    process.exit(3);
  }
  console.log(`simExtraTime control ${CONTROL}: FIRED on exactly its section(s), so the harness is red as it must be`);
  process.exit(1);
}
console.log(failures === 0
  ? '\nsimExtraTime: PASS. A level Champions League decider plays thirty minutes of extra time before penalties, nothing else does, goals per decider hold, the AI plays it too (finals included), the screens say so, the two ways of playing it are one match, named men play it, its possession is read off rates, and what announces it says level on the night or level on aggregate, whichever is true.'
  : `\nsimExtraTime: ${failures} FAILURES in section(s) ${red.join(', ')}`);
process.exit(failures === 0 ? 0 : 1);
