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
     6) Round 1021, the late season. 2020-21 opens on each big five league's
        real Saturday (12 and 19 September, 22 August), its dates only ever
        go forward, the league keeps its full count of rounds, every round
        moved into midweek sits on a Wednesday between two Saturdays, and the
        last round lands on or before the real final weekend (22 May 2021)
        and no more than 21 days before it (measured, deterministic: 0 to 14).
        Every other save, an era2020 save's second season and an era2015
        save's sixth (world year 2020) draw the plain rule's dates with a
        four match window. A save started before this round migrates: it
        keeps its results and its four match window, every break it played
        stays behind it, the rest are played once each.
        Section 3 holds 2020-21 to the same fences as every era (summer
        deadline within 21 days of 5 October 2020, January opening within
        10, January deadline within 21).

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
     CM_CALENDAR_CONTROL=nolate   (Round 1021) takes the late start off the
       five 2020 rules rows at run time, so 2020-21 opens on 8 August with a
       four match window again. Sections 3 and 6 must go red, section 3 on
       the 21 day summer fence.
     CM_CALENDAR_CONTROL=nocram   (Round 1021) bundles a copy whose late
       season plays no league round in midweek. Section 3 must go red on the
       10 day January fence.
     Each control refuses to run if its rewrite did not find its text (nolate:
     unless exactly five rules rows carry a late start).

   Run: node scripts/simClubManagerCalendar.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
  /*
   * Pushes a window that has already cleared new year three weeks later.
   *
   * WHAT IT DOES NOT DO, corrected in Round 519 after this comment was caught
   * claiming the opposite: it does NOT move only the long league. The clamp in
   * dateOfEntries REASSIGNS `next` to the first Saturday of January before the
   * push this patches, so by then a short league's window is a January date
   * too and the condition is true for every league in the sample. All of them
   * move 21 days.
   *
   * So a red run here does not by itself prove the long league bound fired: the
   * pre-existing 10 day bound on the short leagues and the month check both go
   * red as well. What proves it is the MESSAGE, which names the long league and
   * its own number ("the long league's January window opens 36 days into
   * January"), and that message was checked by hand when the bound was written.
   * The control's job is to move the thing the bound reads; separating it from
   * the other checks would need a clamp that knows the club count, which the
   * calendar module deliberately does not.
   */
  /* Round 1021: the late 2020-21 season. nolate takes the late start off
     the five 2020 rules rows at run time (it is data, so no source text is
     rewritten, and the control refuses to run unless exactly five rows
     carry one), so the engine and this harness both draw 2020-21 the way
     the code before this round did: an 8 August start and a four match
     window, whose deadline lands weeks before the real 5 October. The 21 day
     summer fence in section 3 and the kickoff check in section 6 must go
     red. nocram keeps the late kickoff but drops the midweek rounds, so the
     January window lands two or three weeks into January: the 10 day
     January fence must go red. */
  nolate: {
    runtime: true,
    say: 'NEGATIVE CONTROL ON: 2020-21 opens on the second Saturday of August again, with the usual four match window',
  },
  nocram: {
    fixed: '  return drawEntries(plan.kickoff, worldYear, calendar, midweek);',
    broken: '  return plain;',
    say: 'NEGATIVE CONTROL ON: the late season plays no league round in midweek, so January drifts',
  },
  /* Round 1021 review: one round fewer crammed than the window is late, so
     the Premier League, La Liga and Ligue 1 open January on the 9th. The 10
     day fence in section 3 lets that through (8 days); section 6's pinned
     January dates must go red. */
  undercram: {
    fixed: '  for (let i = windowIdx - 1; i > 0 && midweek.size < late; i--) {',
    broken: '  for (let i = windowIdx - 1; i > 0 && midweek.size < late - 1; i--) {',
    say: 'NEGATIVE CONTROL ON: the late season crams one round fewer than the window is late',
  },
  /* Round 1021 review: a mid-season join in a later season of the 2020-21
     era keeps 2020-21's late window again. Section 6's join check must go red. */
  joinlate: {
    fixed: '  if (fresh.summerWindow && worldYearOf(fresh) !== worldYearOf(career)) {',
    broken: '  if (false && fresh.summerWindow && worldYearOf(fresh) !== worldYearOf(career)) {',
    say: 'NEGATIVE CONTROL ON: a mid-season join in a later season keeps 2020-21\'s late summer window',
  },
  /* Round 1021 review: the strip's match number back to the constant it
     shipped with (4th for the summer, 3rd for January), which is false for
     every 2020-21 save. Section 3's strip check must go red on those. */
  fourth: {
    fixed: '  const n = myMatchWeeks(state).filter(w => w >= from && w <= deadline).length;',
    broken: '  const n = span.kind === \'summer\' ? WINDOW_MATCH_WEEKS.summer : WINDOW_MATCH_WEEKS.january;',
    say: 'NEGATIVE CONTROL ON: the window strip names the 4th match for every summer deadline again',
  },
  latejan: {
    fixed: '      out.push(next);',
    broken: "      out.push(entry.type === 'window' && dateKey(next) >= dateKey(newYear) ? addDays(next, 21) : next);",
    say: 'NEGATIVE CONTROL ON: a window that already reached January is pushed three weeks later, which moves only the long league',
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
if (CONTROL && !CONTROLS[CONTROL].runtime) {
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
const intl = await import('${ROOT_URL}/src/lib/clubManagerInternationals.ts');
export const mods = { cal, cm, intl };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { cal, cm, intl } = (await import(pathToFileURL(BUNDLE).href)).mods;
/* Round 832: an era's squads load with the era, so the harness fetches all three first. */
await cm.ensureAllEraRosters();
if (CONTROL === 'nolate') {
  const rows = Object.values(cm.LEAGUE_RULES).filter(r => r.lateStart);
  if (rows.length !== 5) {
    console.error(`control cannot run: ${rows.length} rules rows carry a late start, not the five 2020-21 leagues`);
    process.exit(1);
  }
  for (const r of rows) delete r.lateStart;
  console.log(CONTROLS.nolate.say);
}
const {
  seasonDays, monthGrid, fastForwardTargets, targetWeekForDate, simToWeek, simToDate, weekAfterMatches,
  windowSpans, dateOfEntries, worldYearOf, dateKey, addDays, daysBetween, daysInMonth, clubTag, potentialEntry,
  WINDOW_MATCH_WEEKS, REAL_WINDOWS,
  entryDatesOf, kickoffOf, seasonPlanOf, summerWindowWeeksOf, lateSummerWindowWeeks, dayOfWeek,
  windowOpenLine, shortDate,
} = cal;
const { startCareer, playNextEntry, fixtureFor, entryInvolvesMe } = cm;

const fmt = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const clone = s => JSON.parse(JSON.stringify(s));

/* Clubs in even sized leagues (a bye week would blur the "every round has a
   result" check), across the five eras and three league lengths. Round
   1021: 2020-21 started late, so it brings three saves, one for each of its
   three opening dates (Liverpool 12 September, Bayern 19 September and the
   18 club league, Lille 22 August and the longest window). */
const SAVES = [
  ['Everton', 'now'], ['Arsenal', 'now'], ['Augsburg', 'now'], ['Norwich City', 'now'],
  ['Barcelona', 'era2015'], ['Juventus', 'era2015'], ['Barcelona', 'era2010'], ['Chelsea', 'era2005'],
  ['Liverpool', 'era2020'], ['Bayern Munich', 'era2020'], ['Lille', 'era2020'],
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
    const dates = entryDatesOf(s);
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
  let predicted = 0, augustHeld = 0, linesChecked = 0;
  /* Written here a second time, so the module's own ordinal is checked against a copy. */
  const nth = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] ?? 'th'}`;
  const gaps = { summer: [], janOpen: [], janOpenBig: [], janClose: [] };
  const janOpenMonths = [];
  SAVES.forEach((pick, i) => {
    /* Round 504: a manager sacked before January ends the engine run below
       with no January window to compare, which is the game working (about
       one seeded season in ten loses the job that early on either engine,
       measured 40 seasons a club) and not the calendar. The check is the
       grid against the engine's own window dates, so a sacked career is
       re-run on the next seed rather than read as a red. Same shape as the
       Round 471 and 474 gate fixes. */
    let attempt = 0;
    let s, spans0, summer0, jan0, days0, dates, st, summerShut, janShut, janOpened, janLive, janOpenState, janLiveSpan;
    while (true) {
    s = fresh(pick, 3000 + i + 1000 * attempt);
    /* Round 1021: a late season's window is as many matches as reach the
       real deadline (lateSummerWindowWeeks), every other season's is the
       module's four. */
    const summerWeeks = seasonPlanOf(s) ? lateSummerWindowWeeks(s) : WINDOW_MATCH_WEEKS.summer;
    if (s.windowWeeksLeft !== summerWeeks || summerWindowWeeksOf(s) !== summerWeeks) fail(`${pick[0]}: a fresh save opens the summer with ${s.windowWeeksLeft} match weeks (the grid reads ${summerWindowWeeksOf(s)}), the module says ${summerWeeks}`);
    spans0 = windowSpans(s);
    summer0 = spans0.find(w => w.kind === 'summer');
    jan0 = spans0.find(w => w.kind === 'january');
    if (!summer0 || summer0.openWeek !== 0 || summer0.deadlineWeek === null) { fail(`${pick[0]}: no summer window span on a fresh save`); return; }
    if (!jan0 || jan0.deadlineWeek === null) { fail(`${pick[0]}: no January window span on a fresh save`); return; }
    days0 = seasonDays(s);
    dates = days0.entryDates;
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
    st = s; summerShut = null; janShut = null; janOpened = null; janLive = null; janOpenState = null; janLiveSpan = null;
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
        janOpenState = st; janLiveSpan = live ?? null;
      }
      if (before === 'january' && st.transferWindow === null && janShut === null) { janShut = st.week - 1; break; }
    }
    if (st.sacked && janShut === null && attempt < 6) { attempt += 1; continue; }
    break;
    }
    if (attempt > 0) console.log(`   ${pick[0]}: sacked before January on ${attempt} seed(s), re-run on the next; a sacking is the game working, not the calendar`);
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
    /* Round 1021 review: the strip under a tapped day inside an open window
       says "Deadline day is <date>, your <n>th match". Both must be the
       engine's: the date it shut the market on, and how many matches of mine
       the engine had played by then (from kickoff for the summer, after the
       window entry for January). The line used to print the constant 4th,
       which a 2020-21 save's five to nine match summer made false. */
    const playedWeeks = [...new Set((st.resultLog ?? []).map(r => r.week))];
    const lineCheck = (label, state, span, shut, from) => {
      if (!span || shut === null) return;
      const line = windowOpenLine(state, span, dates);
      const n = playedWeeks.filter(w => w >= from && w <= shut).length;
      const want = `Deadline day is ${shortDate(dates[shut])}, your ${nth(n)} match`;
      linesChecked += 1;
      if (!line.includes(want)) fail(`${pick[0]} ${pick[1]}: the ${label} strip reads "${line}", the engine shut the market on ${shortDate(dates[shut])}, my ${nth(n)} match`);
      else if (pick[1] === 'era2020' || label === 'summer' && i === 0) console.log(`   ${pick[0]} ${pick[1]} ${label} strip: "${line}"`);
    };
    lineCheck('summer', s, summer0, summerShut, 0);
    lineCheck('January', janOpenState, janLiveSpan, janShut, (janOpened ?? 0) + 1);

    const real = REAL_WINDOWS[pick[1]];
    if (!real) { fail(`no real window dates recorded for ${pick[1]}`); return; }
    gaps.summer.push(Math.abs(daysBetween(dates[summer0.deadlineWeek], real.summerClose)));
    (s.leagueClubs.length <= 20 ? gaps.janOpen : gaps.janOpenBig).push(Math.abs(daysBetween(dates[jan0.openWeek], real.januaryOpen)));
    janOpenMonths.push({ who: `${pick[0]} ${pick[1]}`, clubs: s.leagueClubs.length, date: dates[jan0.openWeek] });
    gaps.janClose.push(Math.abs(daysBetween(dates[janShut ?? jan0.deadlineWeek], real.januaryClose)));
    console.log(`   ${pick[0]} ${pick[1]} (${s.leagueClubs.length} clubs): summer deadline ${fmt(dates[summer0.deadlineWeek])} (real ${fmt(real.summerClose)}), January opens ${fmt(dates[jan0.openWeek])} (real ${fmt(real.januaryOpen)}), deadline ${fmt(dates[janShut ?? jan0.deadlineWeek])} (real ${fmt(real.januaryClose)})`);
  });
  const max = a => (a.length ? Math.max(...a) : 0);
  console.log(`   ${predicted} of ${SAVES.length * 2} deadline days matched the engine (${augustHeld} of ${SAVES.length} August projections of January held); gaps to the real windows: summer up to ${max(gaps.summer)} days, January open up to ${max(gaps.janOpen)} (Championship ${max(gaps.janOpenBig)}), January deadline up to ${max(gaps.janClose)}`);
  if (predicted < SAVES.length * 2) fail(`only ${predicted} of ${SAVES.length * 2} deadline days matched the engine`);
  console.log(`   ${linesChecked} window strips checked against the engine's deadline day and match count`);
  if (linesChecked !== SAVES.length * 2) fail(`only ${linesChecked} of ${SAVES.length * 2} window strips were checked`);
  if (max(gaps.summer) > 21) fail(`the summer deadline drifts ${max(gaps.summer)} days from the real one`);
  if (max(gaps.janOpen) > 10) fail(`the January window opens ${max(gaps.janOpen)} days from the real 1 January`);
  /*
   * AND THE LONG LEAGUE, which was measured and then let go.
   *
   * The line above only ever held leagues of 20 clubs or fewer: the 24 club
   * Championship's gap went into its own bucket, was PRINTED in the summary and
   * never asserted. That was an open bug from the 2026-09-05 review.
   *
   * Reading it properly first, because most of what it implied is already
   * covered and a duplicate check would be noise. The window's MONTH is held for
   * every league including this one, up in section 3 ("the January window is
   * drawn on ..."), and the January DEADLINE drift is held for every league too,
   * because gaps.janClose is not bucketed by size. So the window cannot land in
   * December and cannot close far from the real date.
   *
   * What genuinely had no floor under it is the middle: the Championship's open
   * could drift to the END of January and nothing would notice, because the
   * month would still be January and the deadline three weeks later would still
   * be inside janClose's 21 day bound. A window a player is told is January that
   * opens on the 28th is not one.
   *
   * The bound is 22 rather than something tighter because 15 is correct and
   * deliberate: Round 466 leaves the long league where the round count puts it,
   * since it reaches January on its own. This is a DETERMINISTIC number, fixed
   * by league size and era rather than sampled, so the seven days between the
   * measured 15 and the bound are real headroom and not a coin toss.
   *
   * CM_CALENDAR_CONTROL=latejan pushes a window that already cleared new year
   * three weeks later, which moves only the long league and trips exactly this.
   */
  const bigOpens = janOpenMonths.filter(j => j.clubs > 20);
  if (bigOpens.length === 0) {
    fail('no league of more than 20 clubs was in the sample, so the long league check proved nothing');
  }
  console.log(`   ${bigOpens.length} long league save(s) checked for opening early enough in January: ${bigOpens.map(j => `${j.who} ${fmt(j.date)}`).join(', ')}`);
  if (max(gaps.janOpenBig) > 22) {
    fail(`the long league's January window opens ${max(gaps.janOpenBig)} days into January (bound 22; measured 15, and it is deterministic rather than sampled), which is too late to call a January window`);
  }
  if (max(gaps.janClose) > 21) fail(`the January deadline drifts ${max(gaps.janClose)} days from the real one`);
  for (const era of ['now', 'era2015', 'era2010', 'era2005', 'era2020']) if (!REAL_WINDOWS[era]) fail(`no real window dates recorded for ${era}`);
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
        /* Round 1021: any capital letter, not only Latin-1's. The 2010-11
           Champions League field brought Zilina, whose tag starts with a
           capital Z caron (U+017D, outside the old A to Z and À to Ý), and
           Barcelona drew them on this seed: red on 564d604e (the Round 971
           head this round is built on), and main carries the same regex. */
        if (!/^[\p{Lu}0-9]{2,3}$/u.test(tag)) fail(`${pick[0]}: tag "${tag}" for ${fx.opponent} is not two or three capitals`);
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

/* ---------- 6. The late season (Round 1021) ---------- */
console.log('6) Late season: 2020-21 opens on each league\'s real Saturday, crams rounds into midweek rather than drifting, ends by the real final weekend, and no other season moves a day');
{
  /* The real frame, typed here a second time on purpose so the module's
     table is checked against a copy rather than against itself: each
     league's opening Saturday, and the Saturday of the final weekend (22 May
     2021, the same for all five). Sources at the 2020 rows of LEAGUE_RULES (RSSSF and
     football-data.co.uk, which agree on every date).
     Round 1021 review: the fourth column is the day the January window
     entry is drawn on. The cram's whole promise is that it brings January
     back to its first Saturday (2 January 2021) wherever the season has
     enough league rounds that can move; Serie A and the Bundesliga, a week
     later to start, have one too few and open on the 9th. These are
     deterministic (the league's calendar and its kickoff, no draw), so they
     are pinned exactly: the 10 day fence in section 3 lets a round fewer
     crammed through (measured: 8 days), and this does not. Control
     undercram crams one round fewer than the window is late. */
  const REAL_2020 = [
    ['Liverpool', 'premier2020', '2020-09-12', '2021-01-02'], ['Barcelona', 'laliga2020', '2020-09-12', '2021-01-02'],
    ['Juventus', 'seriea2020', '2020-09-19', '2021-01-09'], ['Bayern Munich', 'bundesliga2020', '2020-09-19', '2021-01-09'],
    ['Lille', 'ligue12020', '2020-08-22', '2021-01-02'],
  ];
  const FINAL_SATURDAY = { y: 2021, m: 5, d: 22 };
  const SUMMER_CLOSE_2020 = { y: 2020, m: 10, d: 5 };
  let crammed = 0, fourOutside = 0;
  REAL_2020.forEach(([club, leagueId, open, january], i) => {
    const s = fresh([club, 'era2020'], 6000 + i);
    const dates = entryDatesOf(s);
    if (cm.careerLeagueOf(s).id !== leagueId) fail(`${club}: plays ${cm.careerLeagueOf(s).id}, the check expects ${leagueId}`);
    if (fmt(dates[0]) !== open || fmt(kickoffOf(s)) !== open || fmt(seasonDays(s).seasonStart) !== open) {
      fail(`${club}: 2020-21 opens on ${fmt(dates[0])} (kickoff ${fmt(kickoffOf(s))}, grid ${fmt(seasonDays(s).seasonStart)}), really ${open}`);
    }
    for (let w = 1; w < dates.length; w++) if (dateKey(dates[w]) <= dateKey(dates[w - 1])) fail(`${club}: entry ${w} is drawn on ${fmt(dates[w])}, not after entry ${w - 1}`);
    const leagueWeeks = s.calendar.map((e, w) => (e.type === 'league' ? w : -1)).filter(w => w >= 0);
    if (leagueWeeks.length !== (s.leagueClubs.length - 1) * 2) fail(`${club}: ${leagueWeeks.length} league rounds for ${s.leagueClubs.length} clubs`);
    const dow = d => dayOfWeek(d.y, d.m, d.d);
    const midweek = leagueWeeks.filter(w => dow(dates[w]) !== 6);
    for (const w of midweek) {
      if (dow(dates[w]) !== 3 || dow(dates[w - 1]) !== 6 || dow(dates[w + 1]) !== 6) fail(`${club}: the midweek round ${w} on ${fmt(dates[w])} does not sit on a Wednesday between two Saturdays`);
    }
    crammed += midweek.length;
    /* The window against the four match one it replaces: the late deadline
       must sit on or before 5 October and within the 21 day fence, and the
       four match deadline is printed beside it as the baseline. */
    const mine = cal.myMatchWeeks(s);
    const lateDeadline = dates[mine[s.windowWeeksLeft - 1]];
    const fourDeadline = dates[mine[WINDOW_MATCH_WEEKS.summer - 1]];
    const lateGap = daysBetween(lateDeadline, SUMMER_CLOSE_2020), fourGap = daysBetween(fourDeadline, SUMMER_CLOSE_2020);
    if (lateGap < 0 || lateGap > 21) fail(`${club}: the late summer window shuts on ${fmt(lateDeadline)}, ${lateGap} days before the real 5 October`);
    /* Every league's real deadline came after the usual four matches
       (measured deterministic: the four match deadline 5 to 26 days early,
       the late window 5 to 9 matches long). */
    if (s.windowWeeksLeft <= WINDOW_MATCH_WEEKS.summer) fail(`${club}: the late summer window is ${s.windowWeeksLeft} matches, no longer than the usual ${WINDOW_MATCH_WEEKS.summer}`);
    if (fourGap > 21) fourOutside += 1;
    const windowAt = dates[s.calendar.findIndex(e => e.type === 'window')];
    if (fmt(windowAt) !== january) fail(`${club}: the January window entry is drawn on ${fmt(windowAt)}, the cram brings it to ${january}`);
    const end = dates[leagueWeeks[leagueWeeks.length - 1]];
    const gap = daysBetween(end, FINAL_SATURDAY);
    /* Measured, deterministic: 0 to 14 days before the real final weekend. */
    if (gap < 0) fail(`${club}: the last league round is drawn on ${fmt(end)}, after the real final weekend`);
    else if (gap > 21) fail(`${club}: the last league round is drawn on ${fmt(end)}, ${gap} days before the real final weekend (fence 21)`);
    console.log(`   ${club} (${leagueId}): opens ${fmt(dates[0])}, ${midweek.length} league rounds in midweek (${midweek.map(w => fmt(dates[w])).join(", ") || "none"}), January window ${fmt(windowAt)}, last league round ${fmt(end)} (${gap} days before the real final weekend), summer window ${s.windowWeeksLeft} matches to ${fmt(lateDeadline)} (four would shut it on ${fmt(fourDeadline)}, ${fourGap} days early)`);
  });
  /* The baseline: with the usual four matches at least one league's window
     would shut more than 21 days early (Lille's August start, measured 26),
     so the late window is what keeps 2020-21 inside section 3's fence.
     Counted, not read off a maximum. */
  if (fourOutside === 0) fail('a four match window would already shut within 21 days of 5 October in every league, so the late window proved nothing');
  if (crammed === 0) fail('no late season crammed a single round into midweek, so the January check above proved nothing about it');

  /* No other season moves a day. Every other save draws exactly the dates
     the plain rule gives (the rule every season used before this round),
     carries no late window, and so do the two seasons that share a world
     year or an era with 2020-21 without being it: an era2020 save's second
     season (2021-22, an August start) and an era2015 save's sixth (world
     year 2020, a world that never had the pandemic). */
  let untouched = 0;
  const plainDates = s => JSON.stringify(dateOfEntries(worldYearOf(s), s.calendar));
  const checkUntouched = (who, s) => {
    untouched += 1;
    if (seasonPlanOf(s) !== null) fail(`${who}: has a late season plan`);
    if (JSON.stringify(entryDatesOf(s)) !== plainDates(s)) fail(`${who}: its dates moved off the plain rule`);
    if (summerWindowWeeksOf(s) !== WINDOW_MATCH_WEEKS.summer) fail(`${who}: its summer window is ${summerWindowWeeksOf(s)} matches`);
  };
  SAVES.forEach((pick, i) => {
    if (pick[1] === 'era2020') return;
    const s = fresh(pick, 6200 + i);
    checkUntouched(`${pick[0]} ${pick[1]}`, s);
    if (s.windowWeeksLeft !== WINDOW_MATCH_WEEKS.summer || s.summerWindow !== undefined) fail(`${pick[0]} ${pick[1]}: a fresh save carries a late window`);
  });
  const late = fresh(['Liverpool', 'era2020'], 6300);
  checkUntouched('Liverpool era2020, season two', { ...late, season: 2 });
  checkUntouched('Barcelona era2015, season six (world year 2020)', { ...fresh(['Barcelona', 'era2015'], 6301), season: 6 });
  console.log(`   ${untouched} seasons outside 2020-21 checked: every one draws the plain rule's dates and a four match window`);

  /* Round 1021 review: the check above proves those seasons take the plain
     rule, but it compares the module with itself, so it cannot see the plain
     rule move. This pins the rule's own output. Four real calendar shapes
     (fresh saves of 2026-10-06: L a league round, W the window entry, M any
     other night; the 18, 20 and 24 club modern leagues and a past era's 20),
     each drawn by dateOfEntries for every world year 2004 to 2031, hashed.
     The digest was taken from the module as it stood BEFORE this round
     (564d604e) and from this round's, and the two agree byte for byte, so
     "no other season moves a day" is held against the old rule itself. The
     shapes are typed here rather than read off fresh saves so a change to how
     the engine builds a season cannot move them. Control december (the
     window entry loses its new year clamp) changes the plain rule and must
     turn this red too. */
  const PLAIN_SHAPES = [
    'LLLMLLLMLMLLMLLMLLMLLMLMLLLWLLLLMLMLLLMLLLMLMLLLMLLMLL',
    'LLLMLLLLMLMLLLMLLMLLLMLLMLMLLLLWLLLLLMLMLLLMLLLLMLLMLLLMLLMLLL',
    'LLLMLLMLMLLMLLMLLMLLMMLLLWLLLLMLMLLMLLLMLMLLLMLMLL',
    'LLLMLLLMLMLLMLLMLLMLLMLMLLLWLMLMLLMLMLLLMLLLMLMLLLMLLMLL',
  ];
  const PLAIN_DIGEST = '61af451194fa4e13';
  const typeOf = c => (c === 'L' ? 'league' : c === 'W' ? 'window' : 'cup');
  let plainText = '';
  for (const shape of PLAIN_SHAPES) {
    for (let y = 2004; y <= 2031; y++) plainText += dateOfEntries(y, [...shape].map(c => ({ type: typeOf(c) }))).map(fmt).join(',') + ';';
  }
  const plainDigest = createHash('sha256').update(plainText).digest('hex').slice(0, 16);
  console.log(`   the plain rule over ${PLAIN_SHAPES.length} calendar shapes and 28 world years: digest ${plainDigest} (pinned ${PLAIN_DIGEST}, taken before this round)`);
  if (plainDigest !== PLAIN_DIGEST) fail(`the plain rule's dates changed: digest ${plainDigest}, before this round ${PLAIN_DIGEST}, so some season of some era moved`);

  /* Round 1021 review: walking into a new job mid-season (joinClubNow) opens
     the new club's season as a fresh season one save, which in this era is
     2020-21 with its late window, whatever year the career is in. A join in
     2020-21 keeps the late window; a join in a later season (here the save
     is read as its second, 2021-22, an August start) gets the usual four.
     The application is accepted by hand: what is checked is the join, not
     the job hunt (simCmApplications plays that). Control joinlate drops
     the guard and must go red on the later season. */
  const joinIn = season => {
    let st = fresh(['Liverpool', 'era2020'], 6500 + season);
    for (let k = 0; k < 2; k++) st = playNextEntry(st, { skipHalftime: true }).state;
    const open = { club: 'Arsenal', league: 'premier2020', tier: 1, season, week: st.week, matchesLeft: 0, roll: 0, status: 'accepted' };
    return cal.joinClubNow({ ...st, season, jobHunt: { open, cooldowns: [], sentSeason: season, sent: 1, summerMove: null } });
  };
  const join2020 = joinIn(1), join2021 = joinIn(2);
  if (!join2020 || !join2021) fail('joinClubNow refused the hand accepted move to Arsenal');
  else {
    if (join2020.clubName !== 'Arsenal' || join2021.clubName !== 'Arsenal') fail(`the joins landed at ${join2020.clubName} and ${join2021.clubName}`);
    if (summerWindowWeeksOf(join2020) <= WINDOW_MATCH_WEEKS.summer) fail(`a join in 2020-21 lost the late window (${summerWindowWeeksOf(join2020)} matches)`);
    if (summerWindowWeeksOf(join2021) !== WINDOW_MATCH_WEEKS.summer) fail(`a join in 2021-22 reads a ${summerWindowWeeksOf(join2021)} match summer window`);
    if (join2021.transferWindow === 'summer' && join2021.windowWeeksLeft > WINDOW_MATCH_WEEKS.summer) fail(`a join in 2021-22 carries 2020-21's late window: ${join2021.windowWeeksLeft} matches left of an August four`);
    console.log(`   joining Arsenal two entries in: in 2020-21 the summer window runs ${summerWindowWeeksOf(join2020)} matches (${join2020.windowWeeksLeft} left), in 2021-22 ${summerWindowWeeksOf(join2021)} (${join2021.windowWeeksLeft} left, window ${join2021.transferWindow ?? 'shut'})`);
  }

  /* A 2020-21 save started BEFORE this round is migrated, not frozen. Its
     dates were never stored (the grid draws them from the season and the
     calendar every time), so it loads on the late dates; what it did store
     (its results, its four match summer window, the breaks it played) is
     kept as it was. Built here the honest way: the late start comes off
     the five 2020 rules rows while the save starts and plays nine entries
     (the code before this round), then goes back. Dates only ever move later, so a break it played
     is still behind it, the next one is caught up on its next match, none is
     played twice, and the summer window it was dealt shuts where the grid
     says it did. */
  const lateRows = Object.entries(cm.LEAGUE_RULES).filter(([, r]) => r.lateStart);
  const saved = lateRows.map(([id, r]) => [id, r.lateStart]);
  for (const [, r] of lateRows) delete r.lateStart;
  let old = fresh(['Liverpool', 'era2020'], 6400);
  const oldShape = old.windowWeeksLeft === WINDOW_MATCH_WEEKS.summer && old.summerWindow === undefined && fmt(seasonDays(old).seasonStart) === '2020-08-08';
  let summerShut = null;
  const step = () => {
    const before = old.transferWindow;
    old = playNextEntry(old, { skipHalftime: true }).state;
    if (before === 'summer' && old.transferWindow === null && summerShut === null) summerShut = old.week - 1;
  };
  for (let k = 0; k < 9; k++) step();
  const firedOld = [...(old.intl?.fired ?? [])];
  const resultsOld = JSON.stringify(old.resultLog ?? []);
  for (const [id, late] of saved) cm.LEAGUE_RULES[id].lateStart = late;
  if (lateRows.length !== 5) fail(`${lateRows.length} rules rows carry a late start, the five 2020-21 leagues should`);
  if (!oldShape) fail('the emulated pre-round save does not have the pre-round shape (four match window, 8 August start)');
  if (firedOld.length === 0) fail('the emulated old save played no international break before migrating, so the catch-up proved nothing');
  const migrated = seasonDays(old);
  if (fmt(migrated.seasonStart) !== '2020-09-12') fail(`the migrated save opens on ${fmt(migrated.seasonStart)}`);
  const windows = intl.intlWindowsFor(worldYearOf(old));
  for (const id of firedOld) {
    const w = windows.find(x => x.id === id);
    if (!w || dateKey(w.start) > dateKey(migrated.today)) fail(`the migrated save played the ${id} break, which now lies after its today ${fmt(migrated.today)}`);
  }
  for (let k = 0; k < 80 && old.week < old.calendar.length && !old.sacked; k++) step();
  if (JSON.stringify((old.resultLog ?? []).slice(0, JSON.parse(resultsOld).length)) !== resultsOld) fail('the migrated save lost or rewrote a result it had');
  const fired = old.intl?.fired ?? [];
  if (new Set(fired).size !== fired.length) fail(`a break was played twice after migrating: ${fired.join(', ')}`);
  if (!old.sacked && fired.length !== windows.length) fail(`after migrating, ${fired.length} of the season's ${windows.length} breaks were played`);
  const shut = windowSpans(old).find(w => w.kind === 'summer')?.deadlineWeek;
  if (summerShut === null || shut !== summerShut) fail(`the migrated save's summer window shut on entry ${summerShut}, the grid says ${shut}`);
  console.log(`   a pre-round 2020-21 save migrated at week 9: ${firedOld.length} break(s) already played stay behind it, ${fired.length} of ${windows.length} played once each by the end${old.sacked ? ' (sacked before the end)' : ''}, its four match window shut on entry ${summerShut} and the grid agrees`);
}

if (failures > 0) {
  console.error(`simClubManagerCalendar: ${failures} FAILURES`);
  process.exit(1);
}
console.log('simClubManagerCalendar: all green');
