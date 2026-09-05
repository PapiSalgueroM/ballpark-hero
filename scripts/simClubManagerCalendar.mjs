/* Club Manager: the calendar you can click.

   Round 466, his words (docs/TWEAKS-2026-08-28.md): "Calendar: click any day
   and sim to it (keep the four fast forwards), bigger emojis, match days
   name the opponent, transfer window open and close clearly marked."

   What this holds, all of it through the real modules bundled with esbuild
   (src/lib/clubManagerCalendar.ts on top of src/lib/clubManager.ts):

     1) Sim to a day lands on the day. Over seeded saves in every era and
        three league sizes, a run of taps on chosen days (a quiet day, the
        next match day, a random day weeks out, the window's day, a day deep
        in the second half, the last day of the season) must leave the save's
        week pointer exactly on the day's target unless the loop halted for
        something that needs the manager (the window opening, the season's
        end, the sack, an approach), must never overshoot it, and every
        league round between the start and where it stopped must have a
        result in the log with nothing logged beyond it.
     2) The four fast forwards ARE taps. For every save at three points of
        the season, each button's week must equal the week the tap rule
        gives its day, and running the button and running the tap must
        produce identical saves under the same seed, compared as JSON with
        the engine's generated id serials masked (the inbox, press question,
        youth and scout ids carry a module level counter and a clock stamp,
        so two runs of the same draws differ in nothing else; the clock is
        frozen here and the serials are masked, everything else is byte for
        byte). Next match is also compared the same way with one call of the
        engine's own playNextEntry (what Quick Sim on the hub runs), so the
        loop cannot drift from the engine's single step, and the older
        "n games" fast forward must land where the same tap lands.
     3) The windows on the grid are the engine's. The module's match week
        counts (summer 4, January 3) must equal what the engine writes into a
        fresh save and at the window entry; the summer deadline day the grid
        predicts from a FRESH save, and the January deadline day it predicts
        the moment the window opens, must be the very entries on which the
        engine shut the market, in every era (a January projection made in
        August can move a match earlier when a club reaches the European
        knockouts and the tie lands inside the window, which is why it is
        read at the opening; the harness reports how many August projections
        held); the January window entry must be drawn in January; and the
        derived days must sit near the real deadlines of each era's season
        (two sources each, cited in the module). Measured on 2026-09-05:
        summer deadline 0 to 6 days from the real one, January opening 0 to 6
        days for 18 and 20 club leagues (the 24 club Championship's falls on
        16 January, 15 days out, because 46 Saturday rounds reach January
        on their own), January deadline 5 to 16 days (16 when a European
        round of 16 lands inside the window and brings the third match a
        week forward). Fences: 21, 10 and 21.
     4) Match days name the opponent. Every match day ahead carries the
        opponent and venue the engine's own fixtureFor resolves; a cup or
        European round ahead of the one I am in is drawn as a maybe with no
        opponent invented; an entry my club is out of (a cup round after
        elimination, Europe when not in it) is not a match day; a played day
        carries the result log's own line; club tags are two or three
        capitals or digits and tell Manchester's two clubs apart.
     5) The grid's shape: seven columns, never more than six rows, every day
        of every month of the season exactly once, today exactly once.

   Negative controls (house rule: prove the checks can fail):
     CM_CALENDAR_CONTROL=drift    bundles a copy of the calendar module whose
       Next match button computes its own week (one past the tap's) instead
       of taking it from the tap rule. Section 2 must go red (measured: 88
       failures, every Next match pair disagreeing on the week and the save).
     CM_CALENDAR_CONTROL=window   bundles a copy whose summer window count is
       5 where the engine writes 4. Section 3 must go red (measured: 16
       failures, the count off the fresh save and the deadline a match late).
     CM_CALENDAR_CONTROL=december bundles a copy without the new year clamp
       on the window entry, which is the shape Round 158 shipped. Section 3
       must go red (measured: 9 failures, the January window drawn on 12 to
       25 December for every 18 and 20 club league).
     Each control refuses to run if its rewrite did not find its text.

   Run: node scripts/simClubManagerCalendar.mjs
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
const CONTROL = process.env.CM_CALENDAR_CONTROL || '';
const CONTROLS = {
  drift: {
    fixed: "    if (entry.type === 'window' || fixtureFor(state, entry)) { nextMatch = at(entryDates[w]); break; }",
    broken: "    if (entry.type === 'window' || fixtureFor(state, entry)) { nextMatch = { date: entryDates[w], week: w + 2 }; break; }",
    say: 'NEGATIVE CONTROL ON: the Next match button counts its own week instead of taking the tap rule',
  },
  window: {
    fixed: 'export const WINDOW_MATCH_WEEKS = { summer: 4, january: 3 } as const;',
    broken: 'export const WINDOW_MATCH_WEEKS = { summer: 5, january: 3 } as const;',
    say: 'NEGATIVE CONTROL ON: the summer window is drawn five match weeks long where the engine runs four',
  },
  december: {
    fixed: "      if (entry.type === 'window' && dateKey(next) < dateKey(newYear)) {",
    broken: "      if (false && entry.type === 'window' && dateKey(next) < dateKey(newYear)) {",
    say: 'NEGATIVE CONTROL ON: the window entry takes the next Saturday after the last league round again, December included',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`CM_CALENDAR_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---- a resettable stream and a frozen clock, so two paths see the same draws ---- */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const reseed = seed => { Math.random = mulberry(seed); };
Date.now = () => 1757000000000;

/* The engine's generated ids carry a module level counter (msg-1-4-3, the
   third message of the run) that keeps counting across the two paths being
   compared. Everything else in the two saves must match byte for byte. */
const ID_SERIAL = /^(msg|pq|youth|sc|pr)-[\w-]+$/;
const relevant = state => JSON.stringify(state, (k, v) => (typeof v === 'string' && ID_SERIAL.test(v) ? v.replace(ID_SERIAL, '$1-#') : v));
const same = (a, b) => relevant(a) === relevant(b);

/* ---- bundle the modules, the calendar regressed when a control is on ---- */
const CAL = path.join(ROOT, 'src', 'lib', 'clubManagerCalendar.ts');
let calPath = `${ROOT_URL}/src/lib/clubManagerCalendar.ts`;
if (CONTROL) {
  const src = fs.readFileSync(CAL, 'utf8').replaceAll('\r\n', '\n');
  const { fixed, broken, say } = CONTROLS[CONTROL];
  if (!src.includes(fixed)) {
    console.error(`control cannot run: clubManagerCalendar.ts is not in the shape CM_CALENDAR_CONTROL=${CONTROL} rewrites`);
    process.exit(1);
  }
  calPath = `${TMP}/clubManagerCalendar.control.ts`;
  fs.writeFileSync(calPath, src.replace(fixed, broken));
  console.log(say);
}
const ENTRY = `${TMP}/clubManagerCalendar.entry.mjs`;
const BUNDLE = `${TMP}/clubManagerCalendar.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const cal = await import('${calPath}');
const cm = await import('${ROOT_URL}/src/lib/clubManager.ts');
export const mods = { cal, cm };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { cal, cm } = (await import(pathToFileURL(BUNDLE).href)).mods;
const {
  seasonDays, monthGrid, fastForwardTargets, targetWeekForDate, simToWeek, simToDate, weekAfterMatches,
  windowSpans, dateOfEntries, worldYearOf, dateKey, addDays, daysBetween, daysInMonth, clubTag, potentialEntry,
  WINDOW_MATCH_WEEKS, REAL_WINDOWS,
} = cal;
const { startCareer, playNextEntry, fixtureFor, entryInvolvesMe } = cm;

const fmt = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const clone = s => JSON.parse(JSON.stringify(s));

/* Clubs in even sized leagues (a bye week would blur the "every round has a
   result" check), across the four eras and three league lengths. */
const SAVES = [
  ['Everton', 'now'], ['Arsenal', 'now'], ['Augsburg', 'now'], ['Norwich City', 'now'],
  ['Barcelona', 'era2015'], ['Juventus', 'era2015'], ['Barcelona', 'era2010'], ['Chelsea', 'era2005'],
];
const fresh = ([club, era], seed) => {
  reseed(seed);
  const s = startCareer(club, era);
  if (s.leagueClubs.length % 2 !== 0) throw new Error(`${club} plays an odd sized league, pick another`);
  return s;
};
const haltKinds = new Set(['window', 'seasonOver', 'sacked', 'approach']);

/* ---------- 1. Sim to a day lands on the day ---------- */
console.log('1) Sim to a day: the week pointer lands on the target, never past it, every league round on the way in the log');
{
  let taps = 0, landed = 0, halted = 0;
  const haltCounts = { window: 0, seasonOver: 0, sacked: 0, approach: 0 };
  SAVES.forEach((pick, i) => {
    let s = fresh(pick, 1000 + i);
    const dates = dateOfEntries(worldYearOf(s), s.calendar);
    const windowIdx = s.calendar.findIndex(e => e.type === 'window');
    const plan = [
      addDays(dates[0], 3),                       // a quiet day before the second match
      dates[1],                                   // the next match day
      addDays(dates[3], 17),                      // a day weeks out
      dates[windowIdx],                           // the window's own day
      addDays(dates[windowIdx], 40),              // deep into the second half
      dates[dates.length - 1],                    // the last day of the season
    ];
    for (const date of plan) {
      if (s.week >= s.calendar.length || s.sacked) break;
      const target = targetWeekForDate(dates, s.week, date);
      const startWeek = s.week;
      const run = simToDate(s, date);
      taps += 1;
      if (target === null) {
        if (run !== null) fail(`${pick[0]} ${fmt(date)}: the tap rule said nothing to play but the loop ran`);
        continue;
      }
      if (run === null) { fail(`${pick[0]} ${fmt(date)}: target ${target} but no run`); continue; }
      const st = run.state;
      if (st.week > target) fail(`${pick[0]} ${fmt(date)}: overshot, week ${st.week} past target ${target}`);
      if (run.halt === null) {
        if (st.week !== target) fail(`${pick[0]} ${fmt(date)}: no halt but week ${st.week} is not the target ${target}`);
        else landed += 1;
      } else {
        halted += 1;
        if (!haltKinds.has(run.halt)) fail(`${pick[0]} ${fmt(date)}: unknown halt ${run.halt}`);
        else haltCounts[run.halt] += 1;
        if (run.halt === 'window' && (st.transferWindow !== 'january' || st.week !== windowIdx + 1)) fail(`${pick[0]} ${fmt(date)}: halted for the window but the save is not at it (week ${st.week}, window ${st.transferWindow})`);
        if (run.halt === 'sacked' && !st.sacked) fail(`${pick[0]}: halted for the sack without one`);
        if (run.halt === 'approach' && !st.approach) fail(`${pick[0]}: halted for an approach without one`);
        if (run.halt === 'seasonOver' && st.week !== st.calendar.length) fail(`${pick[0]}: season over at week ${st.week} of ${st.calendar.length}`);
      }
      // Every league round between the start and where it stopped is in the log, and nothing beyond.
      const logged = new Set((st.resultLog ?? []).map(r => r.week));
      for (let w = startWeek; w < st.week; w++) {
        if (st.calendar[w].type === 'league' && !logged.has(w)) fail(`${pick[0]} ${fmt(date)}: league entry ${w} between ${startWeek} and ${st.week} has no result`);
      }
      for (const w of logged) if (w >= st.week) fail(`${pick[0]}: a result is logged at ${w}, beyond the week pointer ${st.week}`);
      s = st;
    }
  });
  console.log(`   ${taps} taps over ${SAVES.length} saves: ${landed} landed on the day, ${halted} halted (window ${haltCounts.window}, season over ${haltCounts.seasonOver}, sacked ${haltCounts.sacked}, approach ${haltCounts.approach})`);
  if (landed < 12) fail(`only ${landed} taps landed on their day, expected at least 12 of ${taps}`);
  if (haltCounts.window < SAVES.length - 1) fail(`the window halted only ${haltCounts.window} runs, expected one per save`);
}

/* ---------- 2. The four fast forwards are taps ---------- */
console.log('2) Fast forwards: each button equals the tap on its day, save for save, and Next match equals the engine\'s own single step');
{
  let pairs = 0, compares = 0;
  const points = (pick, seed) => {
    // Fresh, five matches in, and inside the January window.
    const a = fresh(pick, seed);
    let b = a;
    for (let k = 0; k < 5; k++) b = playNextEntry(b, { skipHalftime: true }).state;
    let c = b;
    for (let k = 0; k < 60 && c.transferWindow !== 'january' && c.week < c.calendar.length; k++) c = playNextEntry(c, { skipHalftime: true }).state;
    return [a, b, c];
  };
  SAVES.forEach((pick, i) => {
    points(pick, 2000 + i).forEach((state, p) => {
      if (state.sacked || state.week >= state.calendar.length) return;
      const days = seasonDays(state);
      const ff = fastForwardTargets(state, days);
      for (const name of ['nextMatch', 'aboutAMonth', 'toWindow', 'restOfSeason']) {
        const t = ff[name];
        if (!t) {
          if (name !== 'toWindow' || state.calendar.findIndex((e, w) => w >= state.week && e.type === 'window') >= 0) fail(`${pick[0]} point ${p}: ${name} has no target`);
          continue;
        }
        pairs += 1;
        const tapWeek = targetWeekForDate(days.entryDates, state.week, t.date);
        if (tapWeek !== t.week) fail(`${pick[0]} point ${p}: ${name} button week ${t.week}, the tap on ${fmt(t.date)} gives ${tapWeek}`);
        const seed = 5000 + i * 10 + p;
        reseed(seed);
        const viaButton = simToWeek(clone(state), t.week);
        reseed(seed);
        const viaTap = simToDate(clone(state), t.date);
        compares += 1;
        if (!viaTap || !same(viaButton.state, viaTap.state) || viaButton.halt !== viaTap.halt) fail(`${pick[0]} point ${p}: ${name} button and tap produced different saves`);
        if (name === 'nextMatch') {
          reseed(seed);
          const single = playNextEntry(clone(state), { skipHalftime: true });
          compares += 1;
          if (!same(viaButton.state, single.state)) fail(`${pick[0]} point ${p}: Next match drifted from the engine's own playNextEntry`);
          reseed(seed);
          const viaCount = simToWeek(clone(state), weekAfterMatches(state, 1));
          compares += 1;
          if (!same(viaButton.state, viaCount.state)) fail(`${pick[0]} point ${p}: the "1 game" fast forward drifted from Next match`);
        }
        if (name === 'toWindow' && viaButton.halt !== 'window' && viaButton.halt !== 'sacked' && viaButton.halt !== 'approach') fail(`${pick[0]} point ${p}: To the window stopped for ${viaButton.halt} rather than the window`);
        if (name === 'restOfSeason' && viaButton.halt === null && viaButton.state.week !== state.calendar.length) fail(`${pick[0]} point ${p}: Rest of season stopped at week ${viaButton.state.week} with no halt`);
        if (name === 'aboutAMonth' && daysBetween(days.today, t.date) > 28) fail(`${pick[0]} point ${p}: About a month taps ${daysBetween(days.today, t.date)} days out`);
      }
    });
  });
  console.log(`   ${pairs} button/tap pairs, ${compares} save compares with id serials masked`);
  if (pairs < 40) fail(`only ${pairs} button/tap pairs were checked`);
}

/* ---------- 3. The windows on the grid are the engine's ---------- */
console.log('3) Windows: the grid\'s deadline day is the entry the engine shut the market on, January is drawn in January, and both sit near the real dates');
{
  let predicted = 0, augustHeld = 0;
  const gaps = { summer: [], janOpen: [], janOpenBig: [], janClose: [] };
  SAVES.forEach((pick, i) => {
    const s = fresh(pick, 3000 + i);
    if (s.windowWeeksLeft !== WINDOW_MATCH_WEEKS.summer) fail(`${pick[0]}: a fresh save opens the summer with ${s.windowWeeksLeft} match weeks, the module says ${WINDOW_MATCH_WEEKS.summer}`);
    const spans0 = windowSpans(s);
    const summer0 = spans0.find(w => w.kind === 'summer');
    const jan0 = spans0.find(w => w.kind === 'january');
    if (!summer0 || summer0.openWeek !== 0 || summer0.deadlineWeek === null) { fail(`${pick[0]}: no summer window span on a fresh save`); return; }
    if (!jan0 || jan0.deadlineWeek === null) { fail(`${pick[0]}: no January window span on a fresh save`); return; }
    const days0 = seasonDays(s);
    const dates = days0.entryDates;
    const summerDay = days0.entryDays.get(dateKey(dates[summer0.deadlineWeek]));
    if (!summerDay || summerDay.deadline !== 'summer') fail(`${pick[0]}: the summer deadline day is not marked on the grid`);
    const janOpenDay = days0.entryDays.get(dateKey(dates[jan0.openWeek]));
    if (!janOpenDay || janOpenDay.windowOpens !== 'january') fail(`${pick[0]}: the January window's open day is not marked on the grid`);
    const janDay = days0.entryDays.get(dateKey(dates[jan0.deadlineWeek]));
    if (!janDay || janDay.deadline !== 'january') fail(`${pick[0]}: the January deadline day is not marked on the grid`);
    if (dates[jan0.openWeek].m !== 1) fail(`${pick[0]}: the January window is drawn on ${fmt(dates[jan0.openWeek])}`);
    // Days drawn open between kickoff and the summer deadline.
    let openDays = 0;
    for (let m = 0; m < 3; m++) {
      for (const cell of monthGrid(days0, days0.seasonStart.y, days0.seasonStart.m + m, 'normal')) {
        if (cell && cell.windowOpen && dateKey(cell.date) <= dateKey(dates[summer0.deadlineWeek])) openDays += 1;
      }
    }
    if (openDays < 14 || openDays > 45) fail(`${pick[0]}: ${openDays} days drawn open for the summer window, expected 14 to 45`);

    // Run the engine and note the entry on which each window actually shut.
    let st = s, summerShut = null, janShut = null, janOpened = null, janLive = null;
    for (let k = 0; k < 80 && st.week < st.calendar.length && !st.sacked; k++) {
      const before = st.transferWindow;
      const res = playNextEntry(st, { skipHalftime: true });
      st = res.state;
      if (before === 'summer' && st.transferWindow === null && summerShut === null) summerShut = st.week - 1;
      if (res.kind === 'window') {
        janOpened = st.week - 1;
        if (st.windowWeeksLeft !== WINDOW_MATCH_WEEKS.january) fail(`${pick[0]}: the engine opens January with ${st.windowWeeksLeft} match weeks, the module says ${WINDOW_MATCH_WEEKS.january}`);
        const live = windowSpans(st).find(w => w.kind === 'january');
        if (!live || !live.live) fail(`${pick[0]}: inside the window the grid does not show January as live`);
        janLive = live ? live.deadlineWeek : null;
      }
      if (before === 'january' && st.transferWindow === null && janShut === null) { janShut = st.week - 1; break; }
    }
    if (summerShut !== summer0.deadlineWeek) fail(`${pick[0]}: the grid put the summer deadline on entry ${summer0.deadlineWeek}, the engine shut the market on entry ${summerShut}`);
    else predicted += 1;
    if (janOpened !== jan0.openWeek) fail(`${pick[0]}: the grid opens January on entry ${jan0.openWeek}, the engine opened it on ${janOpened}`);
    if (janShut === null) fail(`${pick[0]}: the January window never shut in 80 entries (sacked ${st.sacked})`);
    else if (janShut !== janLive) fail(`${pick[0]}: at the opening the grid put the January deadline on entry ${janLive}, the engine shut the market on entry ${janShut}`);
    else predicted += 1;
    if (janShut !== null && janShut === jan0.deadlineWeek) augustHeld += 1;
    // After the fact, the grid reads the windows off the log and still agrees with the engine.
    const later = windowSpans(st);
    if (later.find(w => w.kind === 'summer')?.deadlineWeek !== summerShut) fail(`${pick[0]}: after the fact the grid moved the summer deadline`);
    if (janShut !== null && later.find(w => w.kind === 'january')?.deadlineWeek !== janShut) fail(`${pick[0]}: after the fact the grid moved the January deadline`);

    const real = REAL_WINDOWS[pick[1]];
    if (!real) { fail(`no real window dates recorded for ${pick[1]}`); return; }
    gaps.summer.push(Math.abs(daysBetween(dates[summer0.deadlineWeek], real.summerClose)));
    (s.leagueClubs.length <= 20 ? gaps.janOpen : gaps.janOpenBig).push(Math.abs(daysBetween(dates[jan0.openWeek], real.januaryOpen)));
    gaps.janClose.push(Math.abs(daysBetween(dates[janShut ?? jan0.deadlineWeek], real.januaryClose)));
    console.log(`   ${pick[0]} ${pick[1]} (${s.leagueClubs.length} clubs): summer deadline ${fmt(dates[summer0.deadlineWeek])} (real ${fmt(real.summerClose)}), January opens ${fmt(dates[jan0.openWeek])} (real ${fmt(real.januaryOpen)}), deadline ${fmt(dates[janShut ?? jan0.deadlineWeek])} (real ${fmt(real.januaryClose)})`);
  });
  const max = a => (a.length ? Math.max(...a) : 0);
  console.log(`   ${predicted} of ${SAVES.length * 2} deadline days matched the engine (${augustHeld} of ${SAVES.length} August projections of January held); gaps to the real windows: summer up to ${max(gaps.summer)} days, January open up to ${max(gaps.janOpen)} (Championship ${max(gaps.janOpenBig)}), January deadline up to ${max(gaps.janClose)}`);
  if (predicted < SAVES.length * 2) fail(`only ${predicted} of ${SAVES.length * 2} deadline days matched the engine`);
  if (max(gaps.summer) > 21) fail(`the summer deadline drifts ${max(gaps.summer)} days from the real one`);
  if (max(gaps.janOpen) > 10) fail(`the January window opens ${max(gaps.janOpen)} days from the real 1 January`);
  if (max(gaps.janClose) > 21) fail(`the January deadline drifts ${max(gaps.janClose)} days from the real one`);
  for (const era of ['now', 'era2015', 'era2010', 'era2005']) if (!REAL_WINDOWS[era]) fail(`no real window dates recorded for ${era}`);
}

/* ---------- 4. Match days name the opponent ---------- */
console.log('4) Match days: the opponent and venue are the engine\'s own, rounds ahead are maybes, Europe is absent when I am not in it, played days carry the log');
{
  let named = 0, pending = 0, maybes = 0, played = 0, absent = 0;
  SAVES.forEach((pick, i) => {
    let s = fresh(pick, 4000 + i);
    for (let k = 0; k < 6; k++) s = playNextEntry(s, { skipHalftime: true }).state;
    const days = seasonDays(s);
    const logged = new Map((s.resultLog ?? []).map(r => [r.week, r]));
    s.calendar.forEach((entry, w) => {
      const day = days.entryDays.get(dateKey(days.entryDates[w]));
      if (entry.type === 'window') {
        if (!day || day.kind !== 'window') fail(`${pick[0]}: the window entry ${w} is not a window day`);
        return;
      }
      if (w < s.week) {
        const r = logged.get(w);
        if (r) {
          played += 1;
          if (!day || day.res !== r.res || day.opponent !== r.opp || day.score !== r.score || day.home !== r.home) fail(`${pick[0]}: played entry ${w} does not carry the result log's line`);
        } else if (day) fail(`${pick[0]}: a past entry ${w} with no result is drawn as a match day`);
        return;
      }
      const involves = entryInvolvesMe(s, entry);
      const fx = fixtureFor(s, entry);
      if (!involves) {
        if (potentialEntry(s, entry)) {
          maybes += 1;
          if (!day || !day.potential || day.opponent !== null || !day.compLabel) fail(`${pick[0]}: entry ${w} (${entry.type}) is a round ahead but is not drawn as a maybe`);
          if (entry.type === 'cup' && (s.cupRound === 'out' || s.cupRound === 'won')) fail(`${pick[0]}: a cup maybe while out of the cup`);
        } else {
          absent += 1;
          if (day) fail(`${pick[0]}: entry ${w} (${entry.type}) does not involve me but is drawn as a match day`);
        }
        return;
      }
      if (!day || day.kind !== 'match' || day.potential) { fail(`${pick[0]}: entry ${w} (${entry.type}) involves me but is not a match day`); return; }
      if (fx) {
        named += 1;
        if (day.opponent !== fx.opponent || day.home !== fx.home || day.compLabel !== fx.compLabel) fail(`${pick[0]}: entry ${w} names ${day.opponent} (${day.home}) where the engine plays ${fx.opponent} (${fx.home})`);
        const tag = clubTag(fx.opponent);
        if (!/^[A-Z0-9À-Ý]{2,3}$/.test(tag)) fail(`${pick[0]}: tag "${tag}" for ${fx.opponent} is not two or three capitals`);
      } else {
        pending += 1;
        if (day.opponent !== null) fail(`${pick[0]}: entry ${w} has no draw yet but names ${day.opponent}`);
        if (!day.compLabel) fail(`${pick[0]}: entry ${w} has no competition label`);
      }
    });
  });
  if (clubTag('Manchester United') === clubTag('Manchester City')) fail('the two Manchester clubs share a tag');
  if (clubTag('Real Madrid') === clubTag('Real Sociedad')) fail('Real Madrid and Real Sociedad share a tag');
  if (clubTag('Paris Saint-Germain') !== 'PSG') fail(`Paris Saint-Germain tags as ${clubTag('Paris Saint-Germain')}`);
  if (clubTag('1899 Hoffenheim') !== 'HOF') fail(`1899 Hoffenheim tags as ${clubTag('1899 Hoffenheim')}`);
  console.log(`   ${named} match days named, ${pending} draws to come, ${maybes} rounds ahead drawn as maybes, ${played} played days carry the log, ${absent} entries I am out of stay off the grid`);
  if (named < 200) fail(`only ${named} match days named`);
  if (maybes < 16) fail(`only ${maybes} maybes drawn, three cup rounds ahead per save should be more`);
  if (absent < 8) fail(`only ${absent} absent entries seen (Everton, Augsburg and Norwich play no Europe)`);
}

/* ---------- 5. The grid's shape ---------- */
console.log('5) Grid: seven columns, at most six rows, every day of the season once, today once');
{
  const s = fresh(SAVES[0], 5000);
  let st = s;
  for (let k = 0; k < 9; k++) st = playNextEntry(st, { skipHalftime: true }).state;
  const days = seasonDays(st);
  let months = 0, todays = 0;
  for (let y = days.seasonStart.y, m = days.seasonStart.m; y * 100 + m <= days.seasonEnd.y * 100 + days.seasonEnd.m; m += 1) {
    if (m > 12) { m = 1; y += 1; }
    const cells = monthGrid(days, y, m, 'normal');
    months += 1;
    if (cells.length > 42) fail(`${y}-${m}: ${cells.length} cells, more than six rows of seven`);
    const dayCells = cells.filter(c => c !== null);
    if (dayCells.length !== daysInMonth(y, m)) fail(`${y}-${m}: ${dayCells.length} days drawn for a month of ${daysInMonth(y, m)}`);
    todays += dayCells.filter(c => c.isToday).length;
  }
  if (todays !== 1) fail(`today appears ${todays} times across the season`);
  console.log(`   ${months} months drawn, today once, no month over 42 cells`);
}

if (failures > 0) {
  console.error(`simClubManagerCalendar: ${failures} FAILURES`);
  process.exit(1);
}
console.log('simClubManagerCalendar: all green');
