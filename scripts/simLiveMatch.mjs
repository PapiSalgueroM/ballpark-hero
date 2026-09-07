/* Club Manager: the live match, committed half by half.

   Round 504. His words: "Ball at players' feet, both teams with names and
   numbers on their dots, players cover the whole pitch, throw ins, corners
   and fouls exist. Live stats visible during play, subs and tactics at any
   moment, the AI opponent also subs."

   The engine side of that is a match the engine COMMITS as a stream: kick
   off decides the first half (goals, chances, corners, throw ins, fouls,
   cards, an injury, the ball share), startSecondHalf decides the second
   (plus the other dugout's substitutions), and a change the manager makes
   at minute M keeps everything at or before M and redraws the rest of that
   half off the eleven and the shape he just chose. The report's stats
   block is counted off the same stream the viewer walks. This harness holds
   the engine to that from the outside, with numbers, and never trusts a
   "no crash".

   Sections (one line of measurements each, one FAIL line per failure):

     1) Kick off commits the first half. Every event 1..45, every goal shot
        mirrors a scorer line, every booking is a foul by the booked man at
        that minute, shots >= goals and on target >= goals, liveStatsAt at 45
        agrees with counting the list by hand, the ball share is 28..72, the
        clock is 0, nothing has been drawn for the second half, no subs.
     2) The report is counted off the same stream. Half the matches finish
        through the live path (startSecondHalf then resumeMatch), half
        through the quick sim. detail.play covers both halves, detail.stats
        equals liveStatsAt over that play field by field, every goal on the
        timeline has a goal shot at its minute, and where a ten minute bucket
        had chances, no goal, and one side clearly out shot the other the
        momentum leans that way. (A one shot edge can be outweighed by the
        match's underlying lean, by the engine's own formula, so the sign
        check asks only where the shot share is decisive.)
     3) The opposition eleven. Eleven named men with a keeper, every name off
        the era roster, every scorer on the pitch at his minute, the ratings
        sheet names the eleven plus the men who came on, subs 0 to 3 in
        56..88 from their own bench, at least one a match over the named
        matches, the pitch at a sub's minute still holding the man replaced
        and at the next minute the man who came on, nobody taken off before
        his last goal. Thin clubs are allowed no eleven; the count of each is
        printed. Three counts are asserted at floor 0 (a man on the ball after
        he came off, a man booked after he came off, a man scoring after a
        red) and the mirror is asserted at a floor: the man who came on is on
        the ball or on the scoresheet after his minute on a measured share of
        subs.
     4) A change keeps the past and redraws the future. A sub at 70 in a
        drawn second half: every event at or before 70 is byte identical,
        every event after it lands in 71..90, the sub is recorded at 70 with
        both ids, the pitch at 69 and at 70 holds the old man (a sub takes
        effect strictly after its minute) and at 71 the new, the clock reads
        70, the report prints the sub at 70, the man who went off is never on
        the ball after 70, in play or on the scoresheet, and the report is the
        stream the viewer walked: its play is h1Play plus h2Play verbatim, its
        scorers are the halves' scorer lines by name and minute, its subs are
        the live subs. Then the same at 20 in the first half, where the
        halftime score and the read are recomputed.
     5) The change moves the football, with common random numbers. From one
        drawn second half per club, on the same seed, an attacking shape at
        70 must never score fewer goals after 70 than a balanced one (the
        redraw is Poisson and Poisson is monotone in lambda under a shared
        uniform stream), must score more on a measured share of seeds, and
        must carry the larger lambda every time.
     6) One match, two ways, with the second half drawn by the viewer path.
        Kick off, startSecondHalf, resumeMatch on one seed must equal the
        quick sim on the same seed down to the JSON of the play.
     7) Rules. Fourth sub refused, a man not on the pitch refused, a man
        already on refused, minute 91 refused, the clock only runs forward
        (a change at 10 with the clock at 46 is recorded at 46), and the
        dressing room sub still prints at 46 on the report.
     8) A paused save is picked back up, never kicked off a second time.
     9) A save from before this round (no play, no eleven, no clock) still
        resolves to a full report.

   Negative controls, LIVE_MATCH_CONTROL=<name>. Each rewrites a copy of the
   engine before bundling, refuses to run if the string it rewrites is not
   there, and passes only when the sections it names went red and nothing
   else did:
     noplay     drawSegmentPlay returns []. Sections 1 and 2 must go red.
                Section 9 reads the same list (an old save's halves are
                drawn by the same function) and section 3 counts the men who
                came on off it (with no play nobody touches the ball), so
                both go red by construction; they are tolerated, not
                required.
     nocut      changeLive records the change and skips the redraw. Sections
                4 and 5 must go red.
     rekick     playNextEntry kicks a paused match off again. Section 8 must
                go red.
     nooppsubs  drawOppSubs hands back the subs already made and draws none
                (its count line becomes zero). Section 3 must go red, on the
                subs floor and the sub-on share, and nothing else may.
     statsroll  buildMatchDetail adds one to the shots it counted off the
                play, so the report's stats block is no longer the stream.
                Section 2 must go red and nothing else may (the stream, the
                two ways of finishing and the old shape never read that
                block against the play).

   Thresholds, measured on this harness's own seed and under SIM_SEED=1, 2
   and 3 (2026-09-07; SIM_SEED is folded into every seed the harness draws
   with, so each value is a different sample of 42 fixtures):
     seeds where attacking > balanced after 70   8.4, 8.0, 7.8, 7.2 percent of 500      floor 3
     stream after the change redrawn (70, 20)    100 percent on every seed, both        floor 50
     (nocut measures 0 percent on both; noplay, with no play left to redraw,
      still measures well above 90 percent off the goals, cards and subs,
      which is why the floor sits at 50 rather than higher)
     opposition subs a named match               2.03, 1.85, 1.75, 1.70                 floor 1
     men who came on then on the ball            42.4, 31.1, 46.9, 51.8 percent         floor 15
       (25 of 59, 19 of 61, 23 of 49, 29 of 56; at 55 subs the binomial SD
        is about 6.5 points, so 15 sits more than two SDs under the lowest
        sample and four under the mean; nooppsubs measures 0 of 0)
     named elevens 29, 33, 28, 33 of 42; kick offs 42, finished 42, seeds 500

   Negative baseline for section 3, from the engine before its draw was
   reordered (415 matches, 2026-09-07): the second half's play and bookings
   were drawn off the eleven at 45 and the other dugout's subs after them,
   so 241 of 346 named matches listed a man on the ball after he came off
   (513 events), 45 of 657 subs saw the man booked after he had gone, and no
   man who came on touched the ball in any of the 657. All three are
   asserted now: the first two at floor 0, the third at the floor above.

   Run: node scripts/simLiveMatch.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.LIVE_MATCH_CONTROL || '';
const lf = s => s.replaceAll('\r\n', '\n');

const CONTROLS = {
  noplay: {
    must: [1, 2], also: [3, 9],
    what: 'the first line of drawSegmentPlay',
    edits: [[
      'function drawSegmentPlay(inp: SegmentPlayIn): PlayEvent[] {\n  const len = (inp.to - inp.from) / 45;\n',
      'function drawSegmentPlay(inp: SegmentPlayIn): PlayEvent[] {\n  if (inp) return [];\n  const len = (inp.to - inp.from) / 45;\n',
    ]],
    note: 'drawSegmentPlay commits nothing; sections 1 and 2 must go red (3 and 9 go with them)',
  },
  nocut: {
    must: [4, 5], also: [],
    what: 'the two recut calls at the end of changeLive',
    edits: [[
      '  if (entry && m < 45) recutFirstHalf(state, entry, live, m);\n  else if (entry && m >= 46 && live.h2Drawn) recutSecondHalf(state, entry, live, m);\n',
      '  if (entry && m < 45) void 0;\n  else if (entry && m >= 46 && live.h2Drawn) void 0;\n',
    ]],
    note: 'changeLive records the change and never redraws; sections 4 and 5 must go red',
  },
  rekick: {
    must: [8], also: [],
    what: 'the playNextEntry guard that returns the paused match',
    edits: [[
      '    if (state.live && state.live.week === state.week) {\n',
      '    if (false) {\n',
    ]],
    note: 'playNextEntry kicks a paused match off a second time; section 8 must go red',
  },
  nooppsubs: {
    must: [3], also: [],
    what: 'the count line in drawOppSubs',
    edits: [[
      '  const count = Math.min(room, Math.round(ri(1, 3) * len));\n',
      '  const count = 0;\n',
    ]],
    note: 'drawOppSubs hands back the subs already made and draws none; section 3 must go red',
  },
  statsroll: {
    must: [2], also: [],
    what: 'the line after the stats block in buildMatchDetail',
    edits: [[
      '  const { onTarget } = stats;\n',
      '  stats.shots = stats.shots + 1; const { onTarget } = stats;\n',
    ]],
    note: 'buildMatchDetail ships one more shot than the stream carries; section 2 must go red',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`LIVE_MATCH_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

/* ---- the engine, regressed in a copy beside the original when a control asks ---- */
const ENGINE = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
const ENTRY = `${TMP}/liveMatch.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/liveMatch.${process.pid}.bundle.mjs`;
let controlCopy = null;
const cleanup = () => {
  for (const f of [controlCopy, ENTRY, BUNDLE]) {
    if (f) { try { fs.rmSync(f, { force: true }); } catch { /* already gone */ } }
  }
  controlCopy = null;
};
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130); });

if (CONTROL) {
  const spec = CONTROLS[CONTROL];
  let src = lf(fs.readFileSync(ENGINE, 'utf8'));
  for (const [from, to] of spec.edits) {
    if (!src.includes(from)) {
      console.error(`control cannot run: ${spec.what} is not in the shape LIVE_MATCH_CONTROL=${CONTROL} rewrites (${from.slice(0, 70).replaceAll('\n', '\\n')}...)`);
      process.exit(1);
    }
    src = src.replace(from, to);
  }
  controlCopy = path.join(ROOT, 'src', 'lib', `__control_clubManager.${CONTROL}.${process.pid}.ts`);
  fs.writeFileSync(controlCopy, src);
  enginePath = controlCopy.replaceAll('\\', '/');
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${spec.note}`);
}

/* The simLiveSim bundle: the shim goes in before the engine is imported,
   because the engine may touch storage at module scope. The pid is in every
   temp name so seeds and controls can run side by side. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const mod = await import('${enginePath}');
export const engine = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const cm = (await import(pathToFileURL(BUNDLE).href)).engine;
for (const name of ['startCareer', 'playNextEntry', 'resumeMatch', 'startSecondHalf', 'changeLive', 'makeHalftimeSub',
  'benchForHalftime', 'liveStatsAt', 'oppOnPitchAt', 'myOnPitchAt', 'projectedRoster', 'yearsOn', 'MAX_SUBS', 'squadNumbers', 'liveFeed']) {
  if (cm[name] === undefined) { console.error(`the engine does not export ${name}`); process.exit(1); }
}
const {
  startCareer, playNextEntry, resumeMatch, startSecondHalf, changeLive, makeHalftimeSub,
  benchForHalftime, liveStatsAt, oppOnPitchAt, myOnPitchAt, projectedRoster, yearsOn, MAX_SUBS,
} = cm;

/* ---- failures, attributed to the section they fell in ---- */
let section = 0;
let failures = 0;
const failedIn = new Map();
const PRINT_CAP = 10;
const fail = m => {
  failures += 1;
  const n = (failedIn.get(section) ?? 0) + 1;
  failedIn.set(section, n);
  if (n <= PRINT_CAP) console.error(`  FAIL [${section}]: ${m}`);
  else if (n === PRINT_CAP + 1) console.error(`  FAIL [${section}]: (further failures in this section not printed)`);
};
const begin = (n, title) => { section = n; console.log(`${n}) ${title}`); };
const J = v => JSON.stringify(v);
const inRange = (m, lo, hi) => Number.isInteger(m) && m >= lo && m <= hi;
const min = a => (a.length ? Math.min(...a) : NaN);
const max = a => (a.length ? Math.max(...a) : NaN);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) : 'n/a');
const FULLBACK = new Set(['LB', 'RB', 'LWB', 'RWB']);
const DEF = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB']);

/* ---- a seeded stream I can rewind, on top of the harness's own ---- */
/* Every draw below sits inside withSeed on a fixed seed, so the house
   SIM_SEED would be a no-op here without this: it is folded into every
   seed as an offset, and SIM_SEED=1, 2, 3 walk three different samples. */
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
  Math.random = seeded(seed + OFF);
  try { return fn(); } finally { Math.random = HOUSE_RANDOM; }
}

/* ---- the material: fixtures paused at the interval, with the save they kicked off from ---- */
const CLUBS = ['Everton', 'Real Madrid', 'Wolves', 'Ajax', 'Napoli', 'Newcastle'];
const PER_CLUB = 7;
/** { club, seed, pre: the save before kick off, ht: the save paused at the interval } */
const fixtures = [];
for (const club of CLUBS) {
  let base = withSeed(4100 + club.length, () => startCareer(club));
  let got = 0;
  let guard = 0;
  while (got < PER_CLUB && guard < 40) {
    guard += 1;
    const seed = 70001 + fixtures.length * 7919 + guard;
    const res = withSeed(seed, () => playNextEntry(base));
    if (res.kind === 'seasonOver') break;
    if (res.kind === 'halftime' && res.state.live) {
      fixtures.push({ club, seed, pre: base, ht: res.state });
      got += 1;
      base = withSeed(seed + 1, () => resumeMatch(res.state)).state;
    } else {
      base = res.state;
    }
  }
}
if (fixtures.length < 20) {
  console.error(`only ${fixtures.length} fixtures reached the interval, the walk is too shallow to measure anything`);
  process.exit(1);
}
const ctxOf = f => `${f.club} v ${f.ht.live.opponent} (week ${f.ht.live.week})`;

/* What a side's half looks like, counted by hand off the play list. */
function countByHand(play, side, upTo) {
  const mine = play.filter(e => e.side === side && e.minute <= upTo);
  const shots = mine.filter(e => e.kind === 'shot');
  return {
    shots: shots.length,
    onTarget: shots.filter(e => e.on || e.goal).length,
    goals: shots.filter(e => e.goal).length,
    xg: Math.round(shots.reduce((s, e) => s + (e.xg ?? 0), 0) * 100) / 100,
    corners: mine.filter(e => e.kind === 'corner').length,
    fouls: mine.filter(e => e.kind === 'foul').length,
  };
}

/* ---------- 1. kick off commits the first half ---------- */
begin(1, 'Kick off commits the first half');
{
  const counts = [];
  let goals = 0;
  let bookings = 0;
  const goalLines = xs => xs.map(l => `${l.name}@${l.minute}`).sort();
  for (const f of fixtures) {
    const live = f.ht.live;
    const ctx = ctxOf(f);
    if (!Array.isArray(live.h1Play)) { fail(`${ctx}: the kick off committed no h1Play`); continue; }
    counts.push(live.h1Play.length);
    for (const e of live.h1Play) {
      if (!inRange(e.minute, 1, 45)) fail(`${ctx}: a ${e.kind} at minute ${e.minute} in the first half`);
      if (!['shot', 'corner', 'throwin', 'foul'].includes(e.kind)) fail(`${ctx}: unknown play kind ${e.kind}`);
      if (typeof e.who !== 'string') fail(`${ctx}: a ${e.kind} with no man on the ball`);
    }
    const shotsOf = side => live.h1Play.filter(e => e.side === side && e.goal).map(e => `${e.who}@${e.minute}`).sort();
    if (J(shotsOf('me')) !== J(goalLines(live.h1My ?? []))) fail(`${ctx}: my goal shots [${shotsOf('me')}] do not mirror h1My [${goalLines(live.h1My ?? [])}]`);
    if (J(shotsOf('opp')) !== J(goalLines(live.h1Opp ?? []))) fail(`${ctx}: their goal shots [${shotsOf('opp')}] do not mirror h1Opp [${goalLines(live.h1Opp ?? [])}]`);
    goals += (live.h1My ?? []).length + (live.h1Opp ?? []).length;
    for (const [side, cards] of [['me', live.h1Cards ?? []], ['opp', live.h1OppCards ?? []]]) {
      for (const c of cards) {
        bookings += 1;
        if (!inRange(c.minute, 1, 45)) fail(`${ctx}: a ${c.kind} at minute ${c.minute} in the first half`);
        if (!live.h1Play.some(e => e.side === side && e.kind === 'foul' && e.minute === c.minute && e.who === c.name)) {
          fail(`${ctx}: ${c.name}'s ${c.kind} at ${c.minute} has no foul by him at that minute`);
        }
      }
    }
    for (const inj of live.h1Injuries ?? []) if (!inRange(inj.minute, 1, 45)) fail(`${ctx}: an injury at minute ${inj.minute} in the first half`);
    const stats = liveStatsAt(live, 45);
    for (const side of ['me', 'opp']) {
      const hand = countByHand(live.h1Play, side, 45);
      const lines = side === 'me' ? (live.h1My ?? []).length : (live.h1Opp ?? []).length;
      if (hand.shots < lines) fail(`${ctx}: ${side} had ${hand.shots} shots for ${lines} goals`);
      if (hand.onTarget < lines) fail(`${ctx}: ${side} had ${hand.onTarget} on target for ${lines} goals`);
      const pre = side === 'me' ? '' : 'opp';
      const key = k => (pre ? pre + k[0].toUpperCase() + k.slice(1) : k);
      for (const k of ['shots', 'onTarget', 'xg', 'corners', 'fouls']) {
        if (stats[key(k)] !== hand[k]) fail(`${ctx}: liveStatsAt says ${key(k)} ${stats[key(k)]}, counting the list gives ${hand[k]}`);
      }
    }
    if (stats.possession !== live.possH1) fail(`${ctx}: liveStatsAt possession ${stats.possession}, possH1 ${live.possH1}`);
    if (!inRange(live.possH1, 28, 72)) fail(`${ctx}: possH1 ${live.possH1} is outside 28..72`);
    if (live.minute !== 0) fail(`${ctx}: the clock stands at ${live.minute} at kick off`);
    if (live.h2Drawn !== false) fail(`${ctx}: h2Drawn is ${live.h2Drawn} at the interval`);
    if (J(live.subs) !== '[]') fail(`${ctx}: subs at kick off are ${J(live.subs)}`);
    if (live.h1My.length !== live.myGoals || live.h1Opp.length !== live.oppGoals) fail(`${ctx}: scorer lines ${live.h1My.length}/${live.h1Opp.length} for a ${live.myGoals}-${live.oppGoals} half`);
  }
  console.log(`   ${fixtures.length} kick offs: h1Play ${min(counts)} to ${max(counts)} events (mean ${mean(counts).toFixed(1)}), ${goals} first half goals mirrored shot for shot, ${bookings} bookings each a foul by the booked man, stats counted by hand agree at 45`);
}

/* ---------- 2. the report is counted off the same stream ---------- */
begin(2, 'The report is counted off the same stream, both ways of finishing a match');
/** { f, path, report, live: the halftime live (for the bench and the eleven) } */
const finished = [];
{
  let idx = 0;
  for (const f of fixtures) {
    const seed = f.seed + 100;
    let report;
    let pathName;
    if (idx % 2 === 0) {
      pathName = 'live';
      const s2 = withSeed(seed, () => startSecondHalf(f.ht));
      if (!s2) { fail(`${ctxOf(f)}: startSecondHalf returned null`); idx += 1; continue; }
      report = withSeed(seed + 1, () => resumeMatch(s2)).report;
    } else {
      pathName = 'quick';
      const res = withSeed(seed + 2, () => playNextEntry(f.pre, { skipHalftime: true }));
      if (res.kind !== 'match') { fail(`${ctxOf(f)}: the quick sim came back "${res.kind}"`); idx += 1; continue; }
      report = res.report;
    }
    idx += 1;
    if (!report || !report.detail) { fail(`${ctxOf(f)}: no report detail`); continue; }
    finished.push({ f, path: pathName, report, live: f.ht.live });
  }
  const h2Counts = [];
  let decisiveBuckets = 0;
  let timelineGoals = 0;
  for (const { f, path: p, report: r } of finished) {
    const d = r.detail;
    const ctx = `${ctxOf(f)} [${p}]`;
    if (!Array.isArray(d.play)) { fail(`${ctx}: the report carries no play`); continue; }
    const h1 = d.play.filter(e => e.minute <= 45);
    const h2 = d.play.filter(e => e.minute > 45);
    h2Counts.push(h2.length);
    for (const e of d.play) if (!inRange(e.minute, 1, 90)) fail(`${ctx}: a ${e.kind} at minute ${e.minute}`);
    if (!h1.length || !h2.length) fail(`${ctx}: play covers ${h1.length} first half and ${h2.length} second half events`);
    if (!Array.isArray(d.possHalves) || d.possHalves.length !== 2) { fail(`${ctx}: possHalves is ${J(d.possHalves)}`); continue; }
    const counted = liveStatsAt({ h1Play: h1, h2Play: h2, possH1: d.possHalves[0], possH2: d.possHalves[1] }, 90);
    for (const k of Object.keys(counted)) {
      if (d.stats[k] !== counted[k]) fail(`${ctx}: stats.${k} is ${d.stats[k]}, liveStatsAt over the play gives ${counted[k]}`);
    }
    for (const k of Object.keys(d.stats)) if (!(k in counted)) fail(`${ctx}: stats.${k} is not a field liveStatsAt counts`);
    const myG = r.myScorers.length;
    const oppG = r.oppScorers.length;
    if (!(d.stats.shots >= d.stats.onTarget && d.stats.onTarget >= myG)) fail(`${ctx}: mine shots ${d.stats.shots} >= on target ${d.stats.onTarget} >= goals ${myG} does not hold`);
    if (!(d.stats.oppShots >= d.stats.oppOnTarget && d.stats.oppOnTarget >= oppG)) fail(`${ctx}: theirs shots ${d.stats.oppShots} >= on target ${d.stats.oppOnTarget} >= goals ${oppG} does not hold`);
    if (!(d.stats.xg > 0) || !(d.stats.oppXg > 0)) fail(`${ctx}: xg ${d.stats.xg} / ${d.stats.oppXg}`);
    for (const t of d.timeline.filter(e => e.kind === 'goal')) {
      timelineGoals += 1;
      if (!d.play.some(e => e.kind === 'shot' && e.goal && e.side === t.side && e.minute === t.minute)) {
        fail(`${ctx}: the timeline's goal at ${t.minute} (${t.side}) has no goal shot at that minute`);
      }
    }
    if (d.play.filter(e => e.goal && e.side === 'me').length !== myG) fail(`${ctx}: ${d.play.filter(e => e.goal && e.side === 'me').length} goal shots for ${myG} goals`);
    if (d.play.filter(e => e.goal && e.side === 'opp').length !== oppG) fail(`${ctx}: ${d.play.filter(e => e.goal && e.side === 'opp').length} goal shots for ${oppG} of theirs`);
    /* Momentum against the shots by minute. */
    if (!Array.isArray(d.momentum) || d.momentum.length !== 9) { fail(`${ctx}: ${d.momentum?.length} momentum buckets`); continue; }
    const myShots = new Array(9).fill(0);
    const oppShots = new Array(9).fill(0);
    for (const e of d.play) {
      if (e.kind !== 'shot') continue;
      const b = Math.min(8, Math.max(0, Math.floor((e.minute - 1) / 10)));
      (e.side === 'me' ? myShots : oppShots)[b] += 1;
    }
    for (let b = 0; b < 9; b++) {
      const lo = b * 10;
      const hi = lo + 10;
      const had = myShots[b] + oppShots[b];
      const goalIn = [...r.myScorers, ...r.oppScorers].some(sc => sc.minute > lo && sc.minute <= hi);
      if (!had || goalIn) continue;
      const share = (myShots[b] - oppShots[b]) / had;
      if (Math.abs(share) < 0.3) continue;
      decisiveBuckets += 1;
      if (Math.sign(d.momentum[b]) !== Math.sign(share)) {
        fail(`${ctx}: bucket ${b} had ${myShots[b]} shots to ${oppShots[b]} and no goal, momentum reads ${d.momentum[b]}`);
      }
    }
  }
  const livePaths = finished.filter(x => x.path === 'live').length;
  if (finished.length < 30) fail(`only ${finished.length} matches finished`);
  console.log(`   ${finished.length} matches finished (${livePaths} live, ${finished.length - livePaths} quick): h2Play ${min(h2Counts)} to ${max(h2Counts)} events (mean ${mean(h2Counts).toFixed(1)}), stats equal liveStatsAt field by field, ${timelineGoals} timeline goals each a goal shot, ${decisiveBuckets} decisive buckets lean with their shots`);
}

/* ---------- 3. the opposition eleven ---------- */
begin(3, 'The opposition eleven, their bench and their substitutions');
{
  let named = 0;
  let unnamed = 0;
  let subsSeen = 0;
  let scorersChecked = 0;
  let offStillOnBall = 0;
  let offStillOnBallMatches = 0;
  let redThenGoal = 0;
  let subOnTouched = 0;
  let bookedAfterGone = 0;
  for (const { f, report: r, live } of finished) {
    const ctx = ctxOf(f);
    const d = r.detail;
    if (!live.oppXi) {
      unnamed += 1;
      if (d.oppXi) fail(`${ctx}: the report names an eleven the kick off did not`);
      if ((d.oppSubs ?? []).length) fail(`${ctx}: ${d.oppSubs.length} subs for a club with no named eleven`);
      continue;
    }
    named += 1;
    const xi = live.oppXi;
    const bench = live.oppBench ?? [];
    if (xi.length !== 11) fail(`${ctx}: the opposition eleven has ${xi.length} men`);
    if (!xi.some(p => p.p === 'GK')) fail(`${ctx}: the opposition eleven has no keeper`);
    const names = xi.map(p => p.n);
    if (new Set(names).size !== names.length) fail(`${ctx}: the eleven repeats a name`);
    if (names.some(n => !n)) fail(`${ctx}: an unnamed man in the eleven`);
    const roster = new Set(projectedRoster(live.opponent, yearsOn(f.ht), f.ht.eraId ?? 'now').map(p => p.n));
    for (const p of [...xi, ...bench]) if (!roster.has(p.n)) fail(`${ctx}: ${p.n} is not on ${live.opponent}'s era roster`);
    for (const b of bench) if (names.includes(b.n)) fail(`${ctx}: ${b.n} is on the bench and the pitch`);
    if (J(d.oppXi) !== J(xi)) fail(`${ctx}: the report's eleven differs from the kick off's`);
    if (d.oppFormationIndex !== live.oppFormationIndex) fail(`${ctx}: the report's formation ${d.oppFormationIndex} differs from the kick off's ${live.oppFormationIndex}`);
    const subs = d.oppSubs ?? [];
    const withSubs = { ...live, oppSubs: subs };
    /* A sub takes effect strictly after its minute: the eleven at a goal's
       minute carries every sub before that minute and not the one at it,
       which is the pitch the engine names the scorer off. So a man who came
       on at 61 can score at 62, and a man hooked at 62 can score at 62. */
    for (const sc of r.oppScorers) {
      scorersChecked += 1;
      if (!oppOnPitchAt(withSubs, sc.minute).some(p => p.n === sc.name)) fail(`${ctx}: ${sc.name} scored at ${sc.minute} without being on the pitch`);
    }
    const sheet = (d.oppRatings ?? []).map(p => p.name).sort();
    const expected = [...new Set([...names, ...subs.map(s => s.on)])].sort();
    if (J(sheet) !== J(expected)) fail(`${ctx}: the ratings sheet names [${sheet.join(', ')}], the eleven plus the men who came on are [${expected.join(', ')}]`);
    if (!inRange(subs.length, 0, MAX_SUBS)) fail(`${ctx}: ${subs.length} opposition subs`);
    const lastGoal = new Map();
    for (const sc of r.oppScorers) lastGoal.set(sc.name, Math.max(lastGoal.get(sc.name) ?? 0, sc.minute));
    for (const s of subs) {
      subsSeen += 1;
      if (!inRange(s.minute, 56, 88)) fail(`${ctx}: an opposition sub at ${s.minute}`);
      /* The man replaced played the minute he was replaced in: the pitch at
         s.minute still holds him, the pitch at s.minute + 1 holds the man
         who came on in his slot. */
      const at = oppOnPitchAt(withSubs, s.minute);
      const next = oppOnPitchAt(withSubs, s.minute + 1);
      if (!at.some(p => p.n === s.off)) fail(`${ctx}: ${s.off} came off at ${s.minute} without being on the pitch`);
      if (at.some(p => p.n === s.on)) fail(`${ctx}: ${s.on} came on at ${s.minute} while already on the pitch`);
      if (!bench.some(b => b.n === s.on)) fail(`${ctx}: ${s.on} came on from nowhere (not on the bench)`);
      if (!next.some(p => p.n === s.on) || next.some(p => p.n === s.off)) fail(`${ctx}: the pitch at ${s.minute + 1} does not hold ${s.on} in place of ${s.off}`);
      if ((lastGoal.get(s.off) ?? 0) > s.minute) fail(`${ctx}: ${s.off} came off at ${s.minute} and scored at ${lastGoal.get(s.off)}`);
      const laterOnBall = d.play.filter(e => e.side === 'opp' && e.minute > s.minute && e.who === s.off).length;
      if (laterOnBall) { offStillOnBall += laterOnBall; }
      /* The other half of the same rule: the man who came on is picked from
         the pitch he joined, so on a measured share of subs he is on the ball
         (a throw in, a foul, a corner, a shot) or on the scoresheet after his
         minute. Before the reorder that share was exactly zero. */
      const touched = d.play.some(e => e.side === 'opp' && e.minute > s.minute && e.who === s.on)
        || r.oppScorers.some(sc => sc.minute > s.minute && sc.name === s.on);
      if (touched) subOnTouched += 1;
      /* And the booking a man took after he had gone: their cards are drawn
         off the pitch at each minute before their subs, and a booked man is
         never subbed before his booking. */
      bookedAfterGone += (d.oppCards ?? []).filter(c => c.name === s.off && c.minute > s.minute).length;
    }
    if (subs.some(s => d.play.some(e => e.side === 'opp' && e.minute > s.minute && e.who === s.off))) offStillOnBallMatches += 1;
    for (const c of d.oppCards ?? []) {
      if (c.kind !== 'red') continue;
      if (r.oppScorers.some(sc => sc.name === c.name && sc.minute > c.minute)) redThenGoal += 1;
    }
  }
  if (named < 10) fail(`only ${named} matches had a named opposition eleven`);
  /* The other dugout must actually make changes: the engine draws about
     two a named match (see the header), so one a match over the named
     matches is a floor with real headroom, and an engine that never subs
     (LIVE_MATCH_CONTROL=nooppsubs) goes red here rather than green. */
  const subsPerMatch = named ? subsSeen / named : 0;
  if (!(subsSeen >= named)) fail(`${subsSeen} opposition subs over ${named} named matches (${subsPerMatch.toFixed(2)} a match), floor one a match`);
  console.log(`   ${named} matches with a named eleven, ${unnamed} without (thin clubs): ${scorersChecked} scorers on the pitch at their minute, ${subsSeen} opposition subs in 56..88 from their bench (${subsPerMatch.toFixed(2)} a match, floor 1), every ratings sheet the eleven plus the men who came on`);
  /* Asserted at floor 0 since the engine draw was reordered (the man on the
     ball is picked from whoever is on the pitch at the event's minute, their
     cards are drawn before their subs, and their scorers are named off the
     pitch at each goal's minute): a man who came off is never on the ball
     again, never booked again, and nobody scores after a red. The numbers
     these measured before the reorder are in the header. */
  if (offStillOnBall > 0) fail(`${offStillOnBallMatches} of ${named} matches list a man on the ball after he came off (${offStillOnBall} events)`);
  if (bookedAfterGone > 0) fail(`${bookedAfterGone} opposition bookings for a man after he had come off`);
  if (redThenGoal > 0) fail(`${redThenGoal} opposition scorers scored after a red`);
  console.log(`   ${offStillOnBallMatches} of ${named} matches list a man on the ball after he came off (${offStillOnBall} events, floor 0); ${bookedAfterGone} bookings for a man after he came off (floor 0); ${redThenGoal} opposition scorers scored after a red (floor 0)`);
  /* The man who came on is on the ball on a measured share of subs. The
     floor is set from the header's measurements, not from a number that
     felt right. */
  const SUB_ON_FLOOR = 0.15;
  const subOnShare = subsSeen ? subOnTouched / subsSeen : 0;
  if (!(subOnShare >= SUB_ON_FLOOR)) fail(`the man who came on was on the ball after his minute on ${subOnTouched} of ${subsSeen} opposition subs (${pct(subOnTouched, subsSeen)} percent), floor ${Math.round(SUB_ON_FLOOR * 100)}`);
  console.log(`   ${subOnTouched} of ${subsSeen} men who came on were on the ball or on the scoresheet after their minute (${pct(subOnTouched, subsSeen)} percent, floor ${Math.round(SUB_ON_FLOOR * 100)})`);
}

/* ---------- 4. a change keeps the past and redraws the future ---------- */
begin(4, 'A change keeps the past and redraws the future');
const H2_KEYS = ['h2My', 'h2Opp', 'h2Play', 'h2Cards', 'h2OppCards', 'h2Injuries', 'oppSubs'];
const H1_KEYS = ['h1My', 'h1Opp', 'h1Play', 'h1Cards', 'h1OppCards', 'h1Injuries'];
const upTo = (live, keys, m) => J(keys.map(k => (live[k] ?? []).filter(x => x.minute <= m)));
const afterM = (live, keys, m) => keys.flatMap(k => (live[k] ?? []).filter(x => x.minute > m).map(x => ({ k, ...x })));
/** The starter to hook: not sent off, not hurt, and the man most likely to be on the ball (a full back). */
function pickOut(state, live) {
  const reds = new Set([...(live.h1Cards ?? []), ...(live.h2Cards ?? [])].filter(c => c.kind === 'red').map(c => c.id));
  const hurt = new Set([...(live.h1Injuries ?? []), ...(live.h2Injuries ?? [])].map(i => i.id));
  const men = live.onPitch.map(id => state.squad.find(p => p.id === id)).filter(p => p && !reds.has(p.id) && !hurt.has(p.id) && p.position !== 'GK');
  const rank = p => (FULLBACK.has(p.position) ? 3 : DEF.has(p.position) ? 2 : 1);
  men.sort((a, b) => rank(b) - rank(a));
  return men[0] ?? null;
}
function checkChange(ctx, before, after, keys, m, half, outMan, inMan) {
  const live = after.live;
  const [lo, hi] = half === 2 ? [46, 90] : [1, 45];
  if (upTo(before, keys, m) !== upTo(live, keys, m)) fail(`${ctx}: something at or before ${m} changed`);
  for (const e of afterM(live, keys, m)) if (!inRange(e.minute, m + 1, hi)) fail(`${ctx}: a ${e.k} event at ${e.minute} after a change at ${m}`);
  for (const k of keys) for (const e of live[k] ?? []) if (!inRange(e.minute, lo, hi)) fail(`${ctx}: ${k} holds a minute ${e.minute} outside ${lo}..${hi}`);
  const subs = live.subs ?? [];
  if (subs.length !== 1) fail(`${ctx}: ${subs.length} subs recorded`);
  else if (subs[0].minute !== m || subs[0].offId !== outMan.id || subs[0].onId !== inMan.id) fail(`${ctx}: the sub reads ${J(subs[0])}`);
  if (live.minute !== m) fail(`${ctx}: the clock reads ${live.minute} after a change at ${m}`);
  /* A sub takes effect strictly after its minute: the man replaced played
     the minute he was replaced in, so the pitch at m - 1 and at m both hold
     him, and the pitch at m + 1 holds the man who came on in his slot. */
  const was = myOnPitchAt(live, m - 1);
  const at = myOnPitchAt(live, m);
  const now = myOnPitchAt(live, m + 1);
  if (!was.includes(outMan.id) || was.includes(inMan.id)) fail(`${ctx}: the pitch at ${m - 1} does not hold the man who went off`);
  if (!at.includes(outMan.id) || at.includes(inMan.id)) fail(`${ctx}: the pitch at ${m} does not still hold the man who went off (he played that minute)`);
  if (!now.includes(inMan.id) || now.includes(outMan.id)) fail(`${ctx}: the pitch at ${m + 1} does not hold the man who came on`);
  if (!live.onPitch.includes(inMan.id) || live.onPitch.includes(outMan.id)) fail(`${ctx}: onPitch was not updated`);
  /* The man who went off is never on the ball after he went. Unique names only. */
  const sameName = after.squad.filter(p => p.name === outMan.name).length;
  if (sameName === 1) {
    const playKey = half === 2 ? 'h2Play' : 'h1Play';
    const goalKey = half === 2 ? 'h2My' : 'h1My';
    for (const e of (live[playKey] ?? []).filter(e => e.side === 'me' && e.minute > m && e.who === outMan.name)) {
      fail(`${ctx}: ${outMan.name} went off at ${m} and took a ${e.kind} at ${e.minute}`);
    }
    for (const g of (live[goalKey] ?? []).filter(g => g.minute > m && g.id === outMan.id)) fail(`${ctx}: ${outMan.name} went off at ${m} and scored at ${g.minute}`);
  }
  return J(afterM(before, keys, m)) !== J(afterM(live, keys, m));
}
{
  let second = 0;
  let first = 0;
  let redrawn2 = 0;
  let redrawn1 = 0;
  let k = 0;
  for (const f of fixtures) {
    k += 1;
    const ctx = ctxOf(f);
    /* The second half, from a drawn one. */
    const s2 = withSeed(f.seed + 200, () => startSecondHalf(f.ht));
    if (!s2 || !s2.live.h2Drawn) { fail(`${ctx}: startSecondHalf did not draw the half`); continue; }
    const outMan = pickOut(s2, s2.live);
    const bench = benchForHalftime(s2);
    if (!outMan || !bench.length) { fail(`${ctx}: nobody to hook or nobody on the bench`); continue; }
    const inMan = bench[0];
    const before = JSON.parse(J(s2.live));
    const after = withSeed(f.seed + 201, () => changeLive(s2, 70, { kind: 'sub', outId: outMan.id, inId: inMan.id }));
    if (!after) { fail(`${ctx}: a legal sub at 70 was refused`); continue; }
    second += 1;
    if (checkChange(`${ctx} at 70`, before, after, H2_KEYS, 70, 2, outMan, inMan)) redrawn2 += 1;
    const fin = withSeed(f.seed + 202, () => resumeMatch(after));
    const d = fin.report?.detail;
    if (!d) fail(`${ctx}: no report after the sub`);
    else {
      if (d.subs.length !== 1 || d.subs[0].minute !== 70) fail(`${ctx}: the report prints subs ${J(d.subs)}`);
      else if (d.subs[0].off !== outMan.name || d.subs[0].on !== inMan.name) fail(`${ctx}: the report's sub reads ${J(d.subs[0])}`);
      for (const sc of fin.report.myScorers) if (sc.minute > 70 && sc.name === outMan.name) fail(`${ctx}: ${outMan.name} went off at 70 and the report has him scoring at ${sc.minute}`);
      if (!d.timeline.some(t => t.kind === 'sub' && t.minute === 70 && t.side === 'me')) fail(`${ctx}: no sub on the timeline at 70`);
      /* The report is the stream the viewer walked, verbatim: the play both
         halves in order, the scorers by name and minute, and the subs the
         manager made. The whistle settles what was drawn; it draws nothing. */
      const al = after.live;
      const lines = xs => xs.map(l => `${l.name}@${l.minute}`);
      const trio = xs => xs.map(s => ({ off: s.off, on: s.on, minute: s.minute }));
      if (J(d.play) !== J([...(al.h1Play ?? []), ...(al.h2Play ?? [])])) fail(`${ctx}: the report's play (${d.play.length} events) is not h1Play plus h2Play (${(al.h1Play ?? []).length} plus ${(al.h2Play ?? []).length}) the viewer walked`);
      if (J(lines(fin.report.myScorers)) !== J(lines([...(al.h1My ?? []), ...(al.h2My ?? [])]))) fail(`${ctx}: the report's scorers [${lines(fin.report.myScorers)}] are not h1My plus h2My [${lines([...(al.h1My ?? []), ...(al.h2My ?? [])])}]`);
      if (J(lines(fin.report.oppScorers)) !== J(lines([...(al.h1Opp ?? []), ...(al.h2Opp ?? [])]))) fail(`${ctx}: their scorers [${lines(fin.report.oppScorers)}] are not h1Opp plus h2Opp [${lines([...(al.h1Opp ?? []), ...(al.h2Opp ?? [])])}]`);
      if (J(trio(d.subs)) !== J(trio(al.subs ?? []))) fail(`${ctx}: the report's subs ${J(trio(d.subs))} are not the live subs ${J(trio(al.subs ?? []))}`);
    }
    /* The first half, from the kick off (the clock at 0). */
    const outMan1 = pickOut(f.ht, f.ht.live);
    const bench1 = benchForHalftime(f.ht);
    if (!outMan1 || !bench1.length) { fail(`${ctx}: nobody to hook in the first half`); continue; }
    const inMan1 = bench1[0];
    const before1 = JSON.parse(J(f.ht.live));
    const after1 = withSeed(f.seed + 203, () => changeLive(f.ht, 20, { kind: 'sub', outId: outMan1.id, inId: inMan1.id }));
    if (!after1) { fail(`${ctx}: a legal sub at 20 was refused`); continue; }
    first += 1;
    if (checkChange(`${ctx} at 20`, before1, after1, H1_KEYS, 20, 1, outMan1, inMan1)) redrawn1 += 1;
    const l1 = after1.live;
    if (l1.myGoals !== l1.h1My.length || l1.oppGoals !== l1.h1Opp.length) fail(`${ctx}: the halftime score reads ${l1.myGoals}-${l1.oppGoals} for ${l1.h1My.length} and ${l1.h1Opp.length} lines`);
    if (typeof l1.read !== 'string' || !l1.read) fail(`${ctx}: the halftime read is ${J(l1.read)}`);
    if (l1.h2Drawn) fail(`${ctx}: a first half change drew the second half`);
    if (!inRange(l1.possH1, 28, 72)) fail(`${ctx}: possH1 ${l1.possH1} after the change`);
  }
  if (second < 20) fail(`only ${second} second half changes exercised`);
  if (first < 20) fail(`only ${first} first half changes exercised`);
  const share2 = second ? redrawn2 / second : 0;
  const share1 = first ? redrawn1 / first : 0;
  if (!(share2 >= 0.5)) fail(`the stream after 70 was redrawn in ${pct(redrawn2, second)} percent of changes, floor 50`);
  if (!(share1 >= 0.5)) fail(`the stream after 20 was redrawn in ${pct(redrawn1, first)} percent of changes, floor 50`);
  console.log(`   ${second} subs at 70 and ${first} at 20: the past byte identical, the future in range, the pitch through the sub's minute holds the man who went off and from the next minute the man who came on, the man who went off never on the ball again, the report the stream the viewer walked; the stream after the change was redrawn in ${pct(redrawn2, second)} and ${pct(redrawn1, first)} percent (floor 50)`);
}

/* ---------- 5. the change moves the football, with common random numbers ---------- */
begin(5, 'The change moves the football: attacking at 70 against balanced at 70 on the same seed');
{
  const SEEDS_PER_CLUB = 125;
  let seeds = 0;
  let greater = 0;
  let less = 0;
  let lamWrong = 0;
  let totalA = 0;
  let totalB = 0;
  const lamGaps = [];
  for (const club of ['Everton', 'Real Madrid', 'Wolves', 'Ajax']) {
    const f = fixtures.find(x => x.club === club);
    if (!f) { fail(`${club} has no fixture at the interval`); continue; }
    const pre = { ...f.pre, mentality: 'balanced' };
    const ht = withSeed(f.seed, () => playNextEntry(pre));
    if (ht.kind !== 'halftime') { fail(`${club}: the balanced kick off came back "${ht.kind}"`); continue; }
    if (ht.state.live.mentality !== 'balanced') { fail(`${club}: the live match kicked off ${ht.state.live.mentality}`); continue; }
    const base = withSeed(f.seed + 300, () => startSecondHalf(ht.state));
    if (!base) { fail(`${club}: startSecondHalf returned null`); continue; }
    const goalsAfter70 = s => (s.live.h2My ?? []).filter(g => g.minute > 70).length;
    for (let k = 0; k < SEEDS_PER_CLUB; k++) {
      const seed = 500000 + seeds * 31 + k;
      const A = withSeed(seed, () => changeLive(base, 70, { kind: 'shape', mentality: 'attacking' }));
      const B = withSeed(seed, () => changeLive(base, 70, { kind: 'shape', mentality: 'balanced' }));
      if (!A || !B) { fail(`${club}: a shape change at 70 was refused`); continue; }
      seeds += 1;
      const gA = goalsAfter70(A);
      const gB = goalsAfter70(B);
      totalA += gA;
      totalB += gB;
      if (gA > gB) greater += 1;
      if (gA < gB) { less += 1; fail(`${club} seed ${seed}: attacking scored ${gA} after 70, balanced ${gB}`); }
      if (!(A.live.lam2Mine > B.live.lam2Mine)) { lamWrong += 1; fail(`${club} seed ${seed}: lam2Mine attacking ${A.live.lam2Mine} is not above balanced ${B.live.lam2Mine}`); }
      if (k === 0) lamGaps.push(A.live.lam2Mine - B.live.lam2Mine);
      if (A.live.mentality !== 'attacking' || (A.live.shapeChanges ?? []).at(-1)?.minute !== 70) fail(`${club} seed ${seed}: the shape change was not recorded at 70`);
    }
  }
  const share = seeds ? greater / seeds : 0;
  if (seeds < 400) fail(`only ${seeds} seeds compared`);
  if (!(share >= 0.03)) fail(`attacking out scored balanced after 70 on ${pct(greater, seeds)} percent of seeds, floor 3`);
  if (!(totalA > totalB)) fail(`attacking scored ${totalA} after 70 over all seeds, balanced ${totalB}`);
  console.log(`   ${seeds} seeds: attacking > balanced after 70 on ${greater} (${pct(greater, seeds)} percent, floor 3), never fewer (${less} seeds), goals after 70 ${totalA} against ${totalB}, lam2Mine gap ${min(lamGaps).toFixed(3)} to ${max(lamGaps).toFixed(3)} (${lamWrong} seeds wrong way)`);
}

/* ---------- 6. one match, two ways, with the second half drawn by the viewer path ---------- */
begin(6, 'One match, two ways: kick off, startSecondHalf, resumeMatch against the quick sim');
{
  const sameKeys = r => J({
    home: r.home, away: r.away, hg: r.homeGoals, ag: r.awayGoals, decidedBy: r.decidedBy,
    mine: r.myScorers.map(s => `${s.name} ${s.minute} ${s.assist ?? ''}`),
    theirs: r.oppScorers.map(s => `${s.name} ${s.minute}`),
    poss: r.detail?.stats.possession, xg: r.detail?.stats.xg, oppXg: r.detail?.stats.oppXg,
    shots: r.detail?.stats.shots, oppShots: r.detail?.stats.oppShots,
    corners: r.detail?.stats.corners, oppCorners: r.detail?.stats.oppCorners,
    fouls: r.detail?.stats.fouls, oppFouls: r.detail?.stats.oppFouls,
    oppSubs: r.detail?.oppSubs, oppCards: r.detail?.oppCards,
    momentum: r.detail?.momentum, added: r.detail?.added,
    play: r.detail?.play,
  });
  let pairs = 0;
  const scorelines = new Set();
  for (const f of fixtures) {
    const seed = f.seed + 400;
    const liveRun = withSeed(seed, () => {
      const stop = playNextEntry(f.pre);
      if (stop.kind !== 'halftime') return stop;
      const s2 = startSecondHalf(stop.state);
      if (!s2) return { kind: 'null' };
      return resumeMatch(s2);
    });
    const quickRun = withSeed(seed, () => playNextEntry(f.pre, { skipHalftime: true }));
    if (liveRun.kind !== 'match' || quickRun.kind !== 'match') { fail(`${ctxOf(f)}: live gave "${liveRun.kind}", quick gave "${quickRun.kind}"`); continue; }
    const a = sameKeys(liveRun.report);
    const b = sameKeys(quickRun.report);
    if (a !== b) fail(`${ctxOf(f)}: the two ways played different matches\n        live : ${a.slice(0, 180)}\n        quick: ${b.slice(0, 180)}`);
    if (liveRun.state.week !== quickRun.state.week) fail(`${ctxOf(f)}: live left the calendar on ${liveRun.state.week}, quick on ${quickRun.state.week}`);
    if (liveRun.state.live || quickRun.state.live) fail(`${ctxOf(f)}: a finished match left a live match on the save`);
    scorelines.add(`${liveRun.report.homeGoals}-${liveRun.report.awayGoals}`);
    pairs += 1;
  }
  if (pairs < 20) fail(`only ${pairs} fixtures replayed both ways`);
  if (scorelines.size < 4) fail(`the ${pairs} pairs produced only ${scorelines.size} distinct scorelines`);
  console.log(`   ${pairs} fixtures replayed both ways, ${scorelines.size} distinct scorelines, every pair identical down to the JSON of the play`);
}

/* ---------- 7. rules ---------- */
begin(7, 'Rules: three subs, on the pitch, not already on, 90 minutes, a clock that only runs forward');
{
  let states = 0;
  for (const f of fixtures.slice(0, 6)) {
    const ctx = ctxOf(f);
    let s = withSeed(f.seed + 500, () => startSecondHalf(f.ht));
    if (!s) { fail(`${ctx}: startSecondHalf returned null`); continue; }
    if (s.live.minute !== 46) fail(`${ctx}: the clock reads ${s.live.minute} at the restart`);
    /* Three subs go through, the fourth is refused. */
    let made = 0;
    for (let i = 0; i < MAX_SUBS; i++) {
      const out = pickOut(s, s.live);
      const bench = benchForHalftime(s);
      if (!out || !bench.length) break;
      const next = withSeed(f.seed + 510 + i, () => changeLive(s, 46 + i, { kind: 'sub', outId: out.id, inId: bench[0].id }));
      if (!next) { fail(`${ctx}: sub ${i + 1} of ${MAX_SUBS} was refused`); break; }
      s = next;
      made += 1;
    }
    if (made !== MAX_SUBS) { fail(`${ctx}: only ${made} subs could be made`); continue; }
    if (s.live.subsUsed !== MAX_SUBS) fail(`${ctx}: subsUsed reads ${s.live.subsUsed} after ${MAX_SUBS} subs`);
    {
      const out = pickOut(s, s.live);
      const bench = benchForHalftime(s);
      if (out && bench.length && changeLive(s, 60, { kind: 'sub', outId: out.id, inId: bench[0].id }) !== null) fail(`${ctx}: a fourth sub went through`);
    }
    /* On a fresh restart: the other refusals. */
    const fresh = withSeed(f.seed + 520, () => startSecondHalf(f.ht));
    const bench = benchForHalftime(fresh);
    const on = fresh.live.onPitch;
    if (bench.length >= 2 && changeLive(fresh, 60, { kind: 'sub', outId: bench[0].id, inId: bench[1].id }) !== null) fail(`${ctx}: a sub for a man not on the pitch went through`);
    if (changeLive(fresh, 60, { kind: 'sub', outId: on[1], inId: on[2] }) !== null) fail(`${ctx}: bringing on a man already on the pitch went through`);
    if (bench.length && changeLive(fresh, 91, { kind: 'sub', outId: on[1], inId: bench[0].id }) !== null) fail(`${ctx}: a sub at minute 91 went through`);
    if (changeLive(fresh, 91, { kind: 'shape', mentality: 'attacking' }) !== null) fail(`${ctx}: a shape change at minute 91 went through`);
    /* The clock only runs forward: a change at 10 with the clock at 46 lands at 46. */
    if (bench.length) {
      const out = pickOut(fresh, fresh.live);
      const back = withSeed(f.seed + 521, () => changeLive(fresh, 10, { kind: 'sub', outId: out.id, inId: bench[0].id }));
      if (!back) fail(`${ctx}: a sub at 10 with the clock at 46 was refused instead of moved`);
      else {
        if (back.live.subs.at(-1).minute !== 46) fail(`${ctx}: a sub at 10 with the clock at 46 was recorded at ${back.live.subs.at(-1).minute}`);
        if (back.live.minute !== 46) fail(`${ctx}: the clock reads ${back.live.minute} after a change at 10 with the clock at 46`);
        if ((back.live.h1Play ?? []).length !== (fresh.live.h1Play ?? []).length) fail(`${ctx}: a change moved to 46 redrew the first half`);
      }
    }
    /* The dressing room sub still prints at 46 on the report. */
    {
      const out = pickOut(f.ht, f.ht.live);
      const b0 = benchForHalftime(f.ht);
      const ht2 = withSeed(f.seed + 522, () => makeHalftimeSub(f.ht, out.id, b0[0].id));
      if (!ht2) fail(`${ctx}: makeHalftimeSub was refused`);
      else {
        if (ht2.live.subs.at(-1).minute !== 46) fail(`${ctx}: makeHalftimeSub recorded minute ${ht2.live.subs.at(-1).minute}`);
        const fin = withSeed(f.seed + 523, () => resumeMatch(ht2));
        const subs = fin.report?.detail?.subs ?? [];
        if (subs.length !== 1 || subs[0].minute !== 46) fail(`${ctx}: the report prints the dressing room sub as ${J(subs)}`);
      }
    }
    states += 1;
  }
  if (states < 5) fail(`only ${states} states exercised the rules`);
  console.log(`   ${states} states: ${MAX_SUBS} subs go through and the fourth is refused, a man off the pitch, a man already on and minute 91 are refused, a change at 10 with the clock at 46 lands at 46, the dressing room sub prints at 46`);
}

/* ---------- 8. a paused save is picked back up ---------- */
begin(8, 'A paused save is picked back up, never kicked off a second time');
{
  const pausedKeys = live => J({
    h1My: live.h1My, h1Opp: live.h1Opp, startXi: live.startXi, h1Play: live.h1Play,
    h1Cards: live.h1Cards, h1OppCards: live.h1OppCards, possH1: live.possH1, oppXi: live.oppXi, week: live.week,
  });
  let states = 0;
  let goalsCarried = 0;
  for (const f of fixtures.slice(0, 14)) {
    const ctx = ctxOf(f);
    const was = pausedKeys(f.ht.live);
    const again = withSeed(f.seed + 600, () => playNextEntry(f.ht));
    if (again.kind !== 'halftime') fail(`${ctx}: playNextEntry on a paused save came back "${again.kind}"`);
    else if (!again.state.live || pausedKeys(again.state.live) !== was) fail(`${ctx}: playNextEntry on a paused save kicked the match off again (the first half changed)`);
    else if (again.live !== again.state.live) fail(`${ctx}: the result's live is not the save's live`);
    const fin = withSeed(f.seed + 601, () => playNextEntry(f.ht, { skipHalftime: true }));
    if (fin.kind !== 'match' || !fin.report?.detail) { fail(`${ctx}: the quick sim of a paused save came back "${fin.kind}"`); continue; }
    const lines = xs => xs.map(l => `${l.name}@${l.minute}`);
    const gotMy = lines(fin.report.myScorers.filter(s => s.minute <= 45));
    const gotOpp = lines(fin.report.oppScorers.filter(s => s.minute <= 45));
    if (J(gotMy) !== J(lines(f.ht.live.h1My))) fail(`${ctx}: the report's first half [${gotMy}] is not the paused one [${lines(f.ht.live.h1My)}]`);
    if (J(gotOpp) !== J(lines(f.ht.live.h1Opp))) fail(`${ctx}: their first half [${gotOpp}] is not the paused one [${lines(f.ht.live.h1Opp)}]`);
    if (J(fin.report.detail.play.filter(e => e.minute <= 45)) !== J(f.ht.live.h1Play)) fail(`${ctx}: the report's first half play is not the paused one`);
    if (fin.state.week !== f.ht.live.week + 1) fail(`${ctx}: the calendar stands at ${fin.state.week} after week ${f.ht.live.week}`);
    if (fin.state.live) fail(`${ctx}: a live match is still on the save after the quick sim`);
    goalsCarried += f.ht.live.h1My.length + f.ht.live.h1Opp.length;
    states += 1;
  }
  if (states < 10) fail(`only ${states} paused saves picked back up`);
  console.log(`   ${states} paused saves: picked back up with the same first half, quick simmed with ${goalsCarried} first half goals and every first half event carried verbatim`);
}

/* ---------- 9. old shape ---------- */
begin(9, 'A save paused before this round still resolves');
{
  let states = 0;
  const halves = [];
  for (const f of fixtures.slice(0, 10)) {
    const ctx = ctxOf(f);
    const s = JSON.parse(J(f.ht));
    const htMy = s.live.myGoals;
    const htOpp = s.live.oppGoals;
    for (const k of ['h1Play', 'h1Cards', 'h1OppCards', 'h1Injuries', 'possH1', 'oppXi', 'oppBench', 'oppFormationIndex', 'subs', 'minute', 'h2Drawn']) delete s.live[k];
    let done;
    try { done = withSeed(f.seed + 700, () => resumeMatch(s)); } catch (e) { fail(`${ctx}: resumeMatch threw on the old shape: ${e.message}`); continue; }
    const d = done.report?.detail;
    if (done.kind !== 'match' || !d) { fail(`${ctx}: the old shape came back "${done.kind}" with ${d ? 'a' : 'no'} detail`); continue; }
    if (!Array.isArray(d.play)) { fail(`${ctx}: the old shape resolved with no play`); continue; }
    const h1 = d.play.filter(e => e.minute <= 45).length;
    const h2 = d.play.filter(e => e.minute > 45).length;
    halves.push(h1, h2);
    if (!h1 || !h2) fail(`${ctx}: the old shape's play covers ${h1} first half and ${h2} second half events`);
    for (const e of d.play) if (!inRange(e.minute, 1, 90)) fail(`${ctx}: an old shape ${e.kind} at ${e.minute}`);
    const myG = done.report.myScorers.length;
    const oppG = done.report.oppScorers.length;
    if (!(d.stats.shots >= d.stats.onTarget && d.stats.onTarget >= myG)) fail(`${ctx}: old shape mine shots ${d.stats.shots} >= on target ${d.stats.onTarget} >= goals ${myG} does not hold`);
    if (!(d.stats.oppShots >= d.stats.oppOnTarget && d.stats.oppOnTarget >= oppG)) fail(`${ctx}: old shape theirs shots ${d.stats.oppShots} >= on target ${d.stats.oppOnTarget} >= goals ${oppG} does not hold`);
    if (done.report.myScorers.filter(x => x.minute <= 45).length !== htMy) fail(`${ctx}: old shape ${htMy} first half goals but ${done.report.myScorers.filter(x => x.minute <= 45).length} lines`);
    if (done.report.oppScorers.filter(x => x.minute <= 45).length !== htOpp) fail(`${ctx}: old shape their ${htOpp} first half goals but ${done.report.oppScorers.filter(x => x.minute <= 45).length} lines`);
    if (!Array.isArray(d.subs)) fail(`${ctx}: old shape has no subs list`);
    if (done.state.live) fail(`${ctx}: old shape left a live match on the save`);
    states += 1;
  }
  if (states < 8) fail(`only ${states} old shape saves resolved`);
  console.log(`   ${states} old shape saves resolved with a full report: play per half ${min(halves)} to ${max(halves)} events, stats shots >= on target >= goals both sides, first half scorer counts kept`);
}

/* ---------- the verdict ---------- */
const red = [...failedIn.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const spec = CONTROLS[CONTROL];
  const missing = spec.must.filter(s => !failedIn.has(s));
  const unexpected = red.filter(s => !spec.must.includes(s) && !spec.also.includes(s));
  const tolerated = red.filter(s => spec.also.includes(s));
  console.log(`\nsimLiveMatch control ${CONTROL}: sections red [${red.join(', ')}], required [${spec.must.join(', ')}]${tolerated.length ? `, tolerated [${tolerated.join(', ')}]` : ''}`);
  if (missing.length) console.error(`  the control did not fire: section(s) ${missing.join(', ')} stayed green`);
  if (unexpected.length) console.error(`  the control bled: section(s) ${unexpected.join(', ')} went red and were not expected to`);
  const ok = !missing.length && !unexpected.length;
  console.log(ok
    ? `simLiveMatch control ${CONTROL}: PASS (the named sections went red, the rest stayed green)`
    : `simLiveMatch control ${CONTROL}: FAIL`);
  process.exit(ok ? 0 : 1);
}
console.log(failures === 0
  ? '\nsimLiveMatch: PASS. Each half is committed as one stream, the report is counted off it, a change keeps the past and redraws the future, and the other dugout fields eleven named men who come and go on the same clock.'
  : `\nsimLiveMatch: ${failures} FAILURES in section(s) ${red.join(', ')}`);
process.exit(failures === 0 ? 0 : 1);
