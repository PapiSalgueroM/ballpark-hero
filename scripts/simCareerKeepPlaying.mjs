/* Round 850: a year he lived always has exactly one row.
 *
 * THE DEFECT (audit QA847-14, a real live career): Next Season runs
 * advanceProSeason, which starts the year (the birthday, bans, the heat, the
 * drug test) and only then asks whether to retire. Keep Playing used to set
 * the phase back to playing and nothing else, so the year he had just aged
 * into was never played or written down, the next Next Season aged him again,
 * and the calendar fell one year behind his age every time. That live career
 * lost the seasons at 33, 37, 41, 42, 43 and 44 and finished six years behind.
 * Two more stops had the same shape from the player's side (aged first, an
 * early return, then back to playing with no row): a severe injury's rehab
 * choice threw the generated season away, and a corruption conviction
 * returned with no row (prison is the year after).
 *
 * THE FIX: the season is its own step (playPendingProSeason) and Keep Playing
 * resumes exactly that pending season. The injury stop writes the season the
 * engine generated (his own line, marked injured, team trophy rolls dropped
 * because the rest of that season never runs). The conviction writes the zero
 * appearance row the ban and prison years use, with CONVICTED as the reason.
 * A save sitting on either screen from an older version gets its row once:
 * applyRehabChoice writes a zero appearance injured row (the games it had were
 * thrown away and are not invented back), dismissNewspaper the CONVICTED row.
 *
 * WHAT THIS HOLDS, driving the real engine with seeded Math.random:
 *   1. Three fleets (accept every suggestion, decline every suggestion, and
 *      the worst road: decline, rush every rehab, take every dirty choice):
 *      every age he lived, from the first row to the age he retired at, has
 *      exactly one row, and the calendar runs one year per row. No exemption
 *      list. The pre-850 engine (this file's engine with the round reverted,
 *      built in memory) loses years in all three, so the check can fail.
 *   2. Every Keep Playing keeps the age, writes one row at that age the year
 *      after the last, and says "Decided to push on" exactly once. Off the
 *      suggestion screen it writes nothing. Every injury stop's row carries
 *      the injury on the screen, at least one game, and no team trophy.
 *      Every season row has exactly one money season (simCareerParity's
 *      rule), and every professional season in a tournament year has that
 *      summer in the international history (the injury and trial years play
 *      it without him), so the calendar moving on never skips a World Cup.
 *   3. Nothing moves before the first stop. A career the pre-850 engine
 *      never stopped (no suggestion declined, no rehab, no conviction) is
 *      byte identical end to end; one it did stop is byte identical up to the
 *      stop, except for the new row. Accepting still ends a career at the same
 *      point as the pre-850 engine when it never stopped for a rehab or a
 *      conviction.
 *   4. Old saves written by the pre-850 engine: sitting on the suggestion
 *      (declining plays that season once), on the rehab choice (one zero
 *      appearance injured row, then the next year), on the conviction paper
 *      (one CONVICTED row, then the prison year). Saves written by this engine
 *      on the rehab choice or the conviction paper, reloaded, get nothing
 *      twice. A save that already lost years keeps every row it had and loses
 *      no more.
 *   5. Balance, printed, never asserted, for all three fleets against the
 *      pre-850 engine.
 *
 * MEASURED (60 careers per fleet, KEEP_PLAYING_SEED 0x850a, 0x1234, 0x5eed,
 * 0xbeef and 0x7777, 2026-10-01): see the FLOORS block below for the numbers
 * each floor was set from. The in-memory pre-850 engine was checked against
 * the real origin/main file of that day (29e64f42): byte identical on 60 of 60
 * careers in each of the three fleets.
 *
 * NEGATIVE CONTROLS, each must exit 1 (KEEP_PLAYING_CONTROL=<name>):
 *   olddecline        Keep Playing only sets the phase again (what shipped)
 *   readvance         Keep Playing starts the year over (ages him twice)
 *   stuck             Keep Playing plays the season but leaves the warning up
 *   offphase          Keep Playing plays a season off the suggestion screen
 *   pushtwice         the "Decided to push on" line is written twice
 *   acceptresume      accepting plays the pending season before retiring
 *   norehabrow        the injury stop writes no row again
 *   zerorehab         the injury stop writes an empty row, not the season
 *   noconvictionrow   the conviction writes no row again
 *   norehabsave       an old save on the rehab choice still gets no row
 *   rehabtwice        a reloaded rehab save gets a second row
 *   noconvictionsave  an old save on the conviction paper still gets no row
 *   convictiontwice   a reloaded conviction save gets a second row
 *   pageclubs         the page's Keep Playing hands the engine no clubs
 *   nomoney           the injury year runs no money season
 *   nomoneytrial      the trial year runs no money season
 *   nomoneysave       an old rehab save's row runs no money season
 *   nosummer          the injury year skips its tournament summer
 *   nosummertrial     the trial year skips its tournament summer
 *   nosummersave      an old rehab save's row skips its tournament summer
 *
 * 6. The page's Keep Playing passes the clubs it loaded (an empty list
 *    compiles, plays the season and only stops the rival moving clubs, which
 *    no fleet check could see).
 *
 * Run: node scripts/simCareerKeepPlaying.mjs [careers]
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE = path.join(ROOT, "src/lib/soccerCareerEngine.ts");
const CAREERS = Math.max(60, Number(process.argv[2] || 60));
const NEVER = 40;
const OLD_SAVES = 24;
const SEED_BASE = Number(process.env.KEEP_PLAYING_SEED || 0x850a);
const CONTROL = process.env.KEEP_PLAYING_CONTROL || "";

/* FLOORS, each under half of the lowest of the five measured seed bases
   (0x850a, 0x1234, 0x5eed, 0xbeef, 0x7777), 60 careers per fleet, measured
   2026-10-01 on the pre-850 engine unless it says otherwise:
     years lost, accept fleet   28 to 40 (rehab 25 to 36, conviction 3 to 5)    floor 12
     years lost, decline fleet  234 to 263 (Keep Playing 177 to 207)            floor 90
     years lost, worst fleet    211 to 269                                      floor 100
     declines, decline fleet    138 to 152 (this engine)                        floor 60
     rehab stops, accept fleet  25 to 36                                        floor 9
     convictions, worst fleet   12 to 19                                        floor 3
   This engine lost 0 on every base. Old saves: 24 of 24 reached each of the
   three screens on every base; 17 to 23 saves with lost years continued. */
const FLOOR = {
  lostAccept: 12, lostDecline: 90, lostWorst: 100, declines: 60, rehabAccept: 9, convictionsWorst: 3,
};

let failures = 0;
let checks = 0;
const fail = m => { failures += 1; if (failures <= 25) console.error("  FAIL: " + m); };
const check = (ok, m) => { checks += 1; if (!ok) fail(m); };

/* ── the two engines ── */
const SRC = readFileSync(ENGINE, "utf8").replace(/\r\n/g, "\n");
const count = (hay, needle) => hay.split(needle).length - 1;
function swap(src, from, to, label) {
  if (count(src, from) !== 1) {
    console.error(`  FAIL: anchor "${label}" is in the engine ${count(src, from)} times, it must be exactly once`);
    process.exit(1);
  }
  const out = src.replace(from, () => to);
  if (out === src) { console.error(`  FAIL: anchor "${label}" changed nothing`); process.exit(1); }
  return out;
}

/* the pre-850 engine: undo the split, put the old decline back, and take the
   four new rows out. Every anchor must match exactly once or the harness
   refuses to run, so a later edit cannot quietly turn the baseline into a
   copy of the current engine. */
/* Release AI: Round 1022 (Release AH) put INT_SCORING_RECORDS and
   awardAllTimeTopScorer between the year's beginning and playPendingProSeason's
   comment, and the old lazy match ran through that code to the comment, so the
   baseline lost the award and every pre-850 career threw "awardAllTimeTopScorer
   is not defined" (red on main since AH; no gate list carried this harness).
   The comment part now cannot cross a closing comment mark, and whatever sits
   between the two functions is kept: it moves to the end of the baseline, where
   its top level declarations mean the same thing (nothing runs them at load). */
const SPLIT_RE = /  return playPendingProSeason\(s, clubs\);\n\}\n\n([^]*?)\/\*(?:[^*]|\*(?!\/))*\*\/\nfunction playPendingProSeason\(s: CareerState, clubs: ClubData\[\]\): CareerState \{\n/g;
const DECLINE_RE = /export function declineRetirementSuggestion\(prev: CareerState, clubs: ClubData\[\]\): CareerState \{\n[^]*?\n\}\n/g;
const OLD_DECLINE = 'export function declineRetirementSuggestion(prev: CareerState): CareerState {\n'
  + '  const s = { ...prev };\n'
  + '  s.events = [...s.events, "\u{1F4AA} Decided to push on, not ready to hang up the boots yet"];\n'
  + '  s.phase = "playing";\n'
  + '  return s;\n'
  + '}\n';
const TRIAL_SUMMER = '    runTournamentSummer(s, s.seasons[s.seasons.length - 1], s.seasons[s.seasons.length - 1].year, true);\n';
/* Release AT: Rounds 1179, 1186 and 1187 settle the season target, the preseason plan and the mentor year on every
   recorded row, and Round 1190 settles the smaller role on the injury row, so those calls now sit inside the rows
   this harness takes out of the engine and puts back. They go with their row: a row that is never written has
   nothing to settle, and a career in this harness holds no target, plan, mentor or role for them to act on. */
const TRIAL_HOOKS = '    settleCareerAmbition(s, s.seasons[s.seasons.length - 1]);\n    settleCareerPreparation(s, s.seasons[s.seasons.length - 1]);\n    Object.assign(s, recordMentorSeason(s, s.seasons[s.seasons.length - 1]));\n';
const REHAB_HOOKS = '      settleCareerAmbition(s, injuryRow);\n      settleCareerPreparation(s, injuryRow);\n      Object.assign(s, recordMentorSeason(s, injuryRow));\n';
const ROWS = {
  conviction: ['    s.seasons = [...s.seasons, yearOutRow(s, "CONVICTED")];\n    simulateSeasonFinances(s, s.seasons[s.seasons.length - 1]);\n' + TRIAL_SUMMER + TRIAL_HOOKS + '    s.phase = "newspaper";', '    s.phase = "newspaper";'],
  rehab: ['      s.seasons = [...s.seasons, injuryRow];\n      settleReducedRole(s, injuryRow);\n      simulateSeasonFinances(s, injuryRow);\n      runTournamentSummer(s, injuryRow, injuryRow.year, true);\n' + REHAB_HOOKS + '      s.phase = "rehab_choice";', '      s.phase = "rehab_choice";'],
  rehabSave: ['  if (lastRow && lastRow.age < s.age) {\n    const row = yearOutRow(s, null);', '  if (false) {\n    const row = yearOutRow(s, null);'],
  newsSave: ['    if (lastRow && lastRow.age < s.age) {\n      s.events = [...s.events];', '    if (false) {\n      s.events = [...s.events];'],
};
const splitHits = (SRC.match(SPLIT_RE) || []).length;
const declineHits = (SRC.match(DECLINE_RE) || []).length;
if (splitHits !== 1 || declineHits !== 1) {
  console.error(`  FAIL: cannot rebuild the pre-850 engine (split anchor ${splitHits}, decline anchor ${declineHits}, each must be 1)`);
  process.exit(1);
}
let between = '';
let BASELINE_SRC = SRC.replace(SPLIT_RE, (_m, kept) => { between = kept; return ''; }).replace(DECLINE_RE, () => OLD_DECLINE);
if (between) BASELINE_SRC += `\n${between}`;
for (const [k, [from, to]] of Object.entries(ROWS)) BASELINE_SRC = swap(BASELINE_SRC, from, to, `revert ${k}`);

/* the negative controls mutate the CURRENT engine */
const RESUME = '|| prev.retired) {\n    s.phase = "playing";\n    return s;\n  }\n  return playPendingProSeason(s, clubs);';
const PUSH_LINE = '  s.events = [...s.events, "\u{1F4AA} Decided to push on, not ready to hang up the boots yet"];\n';
const ACCEPT_HEAD = 'export function acceptRetirementSuggestion(prev: CareerState): CareerState {\n  const s = { ...prev };';
const CONTROLS = {
  olddecline: [RESUME, '|| prev.retired) {\n    s.phase = "playing";\n    return s;\n  }\n  s.phase = "playing";\n  return s;'],
  readvance: [RESUME, '|| prev.retired) {\n    s.phase = "playing";\n    return s;\n  }\n  return advanceProSeason({ ...s, phase: "playing" }, clubs);'],
  stuck: [RESUME, '|| prev.retired) {\n    s.phase = "playing";\n    return s;\n  }\n  return { ...playPendingProSeason(s, clubs), phase: "retirement_suggestion" };'],
  offphase: ['  if (prev.phase !== "retirement_suggestion" || prev.retired) {', '  if (prev.retired) {'],
  pushtwice: [PUSH_LINE, PUSH_LINE + PUSH_LINE],
  acceptresume: [ACCEPT_HEAD, 'export function acceptRetirementSuggestion(prev: CareerState): CareerState {\n  const s = { ...playPendingProSeason(repairCareer({ ...prev }), FALLBACK_CLUBS) };'],
  norehabrow: ROWS.rehab,
  zerorehab: ['      const injuryRow: SeasonRecord = { ...season, leagueTitle: false, leagueFinish: undefined, leagueSize: undefined, domesticCup: false };', '      const injuryRow: SeasonRecord = yearOutRow(s, null);'],
  noconvictionrow: ROWS.conviction,
  norehabsave: ROWS.rehabSave,
  rehabtwice: [ROWS.rehabSave[0], '  if (lastRow) {\n    const row = yearOutRow(s, null);'],
  noconvictionsave: ROWS.newsSave,
  convictiontwice: [ROWS.newsSave[0], '    if (lastRow) {\n      s.events = [...s.events];'],
  nomoney: ['      settleReducedRole(s, injuryRow);\n      simulateSeasonFinances(s, injuryRow);', '      settleReducedRole(s, injuryRow);'],
  nomoneytrial: ['    simulateSeasonFinances(s, s.seasons[s.seasons.length - 1]);\n' + TRIAL_SUMMER + TRIAL_HOOKS + '    s.phase = "newspaper";', TRIAL_SUMMER + TRIAL_HOOKS + '    s.phase = "newspaper";'],
  nomoneysave: ['    s.seasons = [...s.seasons, row];\n    simulateSeasonFinances(s, row);', '    s.seasons = [...s.seasons, row];'],
  nosummer: ['      runTournamentSummer(s, injuryRow, injuryRow.year, true);\n', ''],
  nosummertrial: [TRIAL_SUMMER + TRIAL_HOOKS + '    s.phase = "newspaper";', TRIAL_HOOKS + '    s.phase = "newspaper";'],
  nosummersave: ['    simulateSeasonFinances(s, row);\n    runTournamentSummer(s, row, row.year, true);', '    simulateSeasonFinances(s, row);'],
};
/* and one that mutates the page's call instead of the engine */
const PAGE_CALL = "setCareer(declineRetirementSuggestion(career, clubs));";
const PAGE_CONTROLS = { pageclubs: [PAGE_CALL, "setCareer(declineRetirementSuggestion(career, []));"] };
let CURRENT_SRC = SRC;
if (CONTROL) {
  if (!CONTROLS[CONTROL] && !PAGE_CONTROLS[CONTROL]) { console.error(`  FAIL: unknown KEEP_PLAYING_CONTROL=${CONTROL}`); process.exit(1); }
  if (CONTROLS[CONTROL]) CURRENT_SRC = swap(SRC, CONTROLS[CONTROL][0], CONTROLS[CONTROL][1], `control ${CONTROL}`);
  console.log(`CONTROL ${CONTROL}: the current ${CONTROLS[CONTROL] ? "engine" : "page"} is mutated, this run must go red`);
}

const TMP = mkdtempSync(path.join(os.tmpdir(), "keep-playing-"));
async function bundle(name, source) {
  const entry = path.join(TMP, `${name}-entry.mjs`);
  const out = path.join(TMP, `${name}.mjs`);
  writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${ENGINE.replaceAll("\\", "/")}';
export { ensureMoney as moneyOf } from '${path.join(ROOT, "src/lib/soccerMoney.ts").replaceAll("\\", "/")}';
`);
  await build({
    entryPoints: [entry], bundle: true, format: "esm", platform: "node",
    outfile: out, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
    plugins: [{
      name: "engine-source",
      setup(b) {
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]soccerCareerEngine\.ts$/ }, () => ({
          contents: source, loader: "ts", resolveDir: path.join(ROOT, "src/lib"),
        }));
      },
    }],
  });
  return import(pathToFileURL(out).href);
}
const CUR = await bundle("current", CURRENT_SRC);
const OLD = await bundle("baseline", BASELINE_SRC);
rmSync(TMP, { recursive: true, force: true });
const clubs = CUR.FALLBACK_CLUBS;

/* identical seeded streams and a frozen clock, so the two engines can be
   compared byte for byte */
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
Date.now = () => 1790000000000;

const NATIONS = ["England", "Brazil", "France", "Japan", "Nigeria", "Argentina", "Morocco", "Norway"];
const POSITIONS = ["ST", "CAM", "CM", "CB", "GK", "LW", "RB", "CDM"];
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const seedOf = c => SEED_BASE + c * 7919;

function newCareer(E, c) {
  seedRandom(seedOf(c));
  const ovr = 50 + (c % 25);
  return E.initCareer(`Keep ${c}`, NATIONS[c % 8], POSITIONS[c % 8], "2020s", stats(ovr), ovr, 2025, clubs, null);
}

const isConvictionStop = s => s.phase === "newspaper" && !s.pendingSummary && (s.prisonSeasons ?? 0) > 0;

/* One step of the loop the page runs. `policy`: accept, decline, never
   (retire by hand at 29) or worst (decline, rush every rehab, take every
   dirty choice on offer). The log records every stop the engine made, by
   age, and the state at the first one. */
function step(E, s, policy, log) {
  switch (s.phase) {
    case "youth": return E.advanceYouthYear(s, clubs);
    case "contract_offer": {
      const offers = s.pendingOffers || [];
      if (!offers.length) return { ...s, phase: "playing" };
      return E.acceptOffer(s, offers.find(o => o.isHomegrown) || offers[0]);
    }
    case "playing": {
      if (policy === "never" && s.age >= 29) return E.manualRetire(s);
      const n = E.advanceProSeason(s, clubs);
      noteStop(s, n, log);
      return n;
    }
    case "retirement_suggestion": {
      log.suggestions.push(s.age);
      if (policy === "accept" || policy === "never") return E.acceptRetirementSuggestion(s);
      log.declines += 1;
      if (log.firstStop === null) log.firstStop = { kind: "decline", state: JSON.stringify(s) };
      const before = s;
      const n = E.declineRetirementSuggestion(s, clubs);
      log.declineSteps.push({ before, after: n });
      noteStop(s, n, log);
      return n;
    }
    case "newspaper": return E.dismissNewspaper(s);
    case "season_summary": return E.dismissSummary(s, clubs);
    case "random_events":
      if (!s.pendingEvents || !s.pendingEvents[0]) return { ...s, pendingEvents: [], phase: "playing" };
      return E.applyEventChoice(s, 0, clubs);
    /* the page answers the card, then Continue dismisses it */
    case "moral_dilemma":
      if (policy === "worst" && s.pendingMoralDilemma) return E.applyMoralDilemmaChoice(s, 0);
      return E.dismissMoralDilemma(s, clubs);
    case "social_media_action": return E.dismissSocialMediaPhase(s, clubs);
    case "red_card_appeal_result": return E.dismissAppealResult(s, clubs);
    case "international_debut": return E.dismissDebut(s, clubs);
    case "world_cup": return E.dismissWorldCup(s, clubs);
    case "rivalry_event": return E.dismissRivalryEvent(s, clubs);
    case "ballon_dor": return E.dismissBallonDor(s, clubs);
    case "rehab_choice": return E.applyRehabChoice(s, policy === "worst" ? 0 : 1);
    case "transfer_window": return E.stayAtClub(s);
    default: throw new Error(`unhandled phase ${s.phase}`);
  }
}
/* the two stops that are not the suggestion, at the age they happen; the
   first stop of any kind keeps the state the step that made it started from */
function noteStop(prev, s, log) {
  let kind = null;
  if (s.phase === "rehab_choice") kind = "rehab";
  else if (isConvictionStop(s)) kind = "conviction";
  if (!kind) return;
  log.stops.push({ kind, age: s.age });
  log.stopStates.push(s);
  if (log.firstStop === null) log.firstStop = { kind, state: JSON.stringify(prev) };
}
function freshLog() { return { suggestions: [], declines: 0, declineSteps: [], stops: [], stopStates: [], firstStop: null }; }

function play(E, c, policy, from = null, logIn = null) {
  let s = from ?? newCareer(E, c);
  const log = logIn ?? freshLog();
  let guard = 0;
  while (!s.retired && guard++ < 900) s = step(E, s, policy, log);
  if (!s.retired) throw new Error(`career ${c} never finished (stuck on ${s.phase} at ${s.age})`);
  return { s, log };
}
function safePlay(E, c, policy, label) {
  try { return play(E, c, policy); } catch (e) { fail(`${label} career ${c}: ${String(e.message || e).slice(0, 120)}`); return null; }
}

/* Every lived year has one row: every age from the first row to the age he
   retired at, once, and the calendar one year per row. Returns the ages with
   no row. */
function audit(s, label, quiet = false) {
  const rows = s.seasons;
  const seen = new Map();
  for (const r of rows) seen.set(r.age, (seen.get(r.age) || 0) + 1);
  const missing = [];
  let doubled = 0, calendar = 0;
  for (let a = rows[0].age; a <= s.age; a++) {
    const n = seen.get(a) || 0;
    if (n === 0) missing.push(a);
    if (n > 1) { doubled += 1; if (!quiet) fail(`${label}: ${n} rows at age ${a}`); }
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].year !== rows[i - 1].year + 1) { calendar += 1; if (!quiet) fail(`${label}: calendar went ${rows[i - 1].year} to ${rows[i].year}`); }
  }
  if (!quiet) check(rows.at(-1).age === s.age, `${label}: retired at ${s.age} but the last row is age ${rows.at(-1).age}`);
  return { missing, doubled, calendar };
}

/* One market season per season row, the rule simCareerParity holds: the
   seed academy row ticks nothing and the retirement marker is not a season.
   A ban or prison year runs its money; so must a rehab or a trial year. */
const playedRows = s => s.seasons.filter(r => r.type === "youth" || r.type === "playing").length - 1;
const ticks = (E, s) => E.moneyOf(JSON.parse(JSON.stringify(s))).age;
/* And the calendar moving on never skips a tournament: every professional
   season row in a tournament year has that summer in the international
   history, the injury and trial years included (played without him). The
   ban and prison years are left out: they have skipped the summer since
   long before this round, and changing them is not this round's to do. */
const YEAR_OUT = new Set(["BANNED", "BANNED (PED)", "PRISON"]);
const summersMissed = (E, s) => s.seasons.filter(r => r.type === "playing" && !YEAR_OUT.has(r.club)
  && E.tournamentForYear(s.nationality, r.year) && !(s.intlHistory || []).some(h => h.year === r.year)).map(r => r.year);

/* ── 1 to 3: the three fleets, current and pre-850 ── */
const FLEETS = ["accept", "decline", "worst"];
const bal = {};
const moved = {};
let declineRowsBad = 0, pushBad = 0, injuryRowsBad = 0, injuryRows = 0, moneyBad = 0, summerBad = 0, summersOld = 0;
for (const policy of FLEETS) {
  console.log(`1) ${CAREERS} careers, policy ${policy}`);
  let lostNow = 0, lostOld = 0, rehabStops = 0, convictions = 0, declines = 0;
  let identical = 0, untouched = 0, prefixSame = 0, prefixed = 0, gained = 0;
  const lostOldBy = { decline: 0, rehab: 0, conviction: 0, other: 0 };
  bal[policy] = { cur: [], old: [] };
  for (let c = 0; c < CAREERS; c++) {
    const cur = safePlay(CUR, c, policy, `${policy} (now)`);
    const old = safePlay(OLD, c, policy, `${policy} (pre-850)`);
    if (!cur || !old) continue;
    const a = audit(cur.s, `${policy} career ${c}`);
    lostNow += a.missing.length;
    if (a.missing.length) fail(`${policy} career ${c}: lived ${a.missing.join(", ")} with no season row`);
    checks += 1;
    if (ticks(CUR, cur.s) !== playedRows(cur.s)) {
      moneyBad += 1;
      fail(`${policy} career ${c}: ${playedRows(cur.s)} seasons on the record and the market ran ${ticks(CUR, cur.s)} times`);
    }
    const missedNow = summersMissed(CUR, cur.s);
    summersOld += summersMissed(OLD, old.s).length;
    checks += 1;
    if (missedNow.length) { summerBad += 1; fail(`${policy} career ${c}: the summers of ${missedNow.join(", ")} were never played`); }
    const b = audit(old.s, `${policy} career ${c} (pre-850)`, true);
    lostOld += b.missing.length;
    for (const age of b.missing) {
      if (old.log.declineSteps.some(d => d.before.age === age)) lostOldBy.decline += 1;
      else if (old.log.stops.some(x => x.kind === "rehab" && x.age === age)) lostOldBy.rehab += 1;
      else if (old.log.stops.some(x => x.kind === "conviction" && x.age === age)) lostOldBy.conviction += 1;
      else lostOldBy.other += 1;
    }
    declines += cur.log.declines;
    rehabStops += old.log.stops.filter(x => x.kind === "rehab").length;
    convictions += old.log.stops.filter(x => x.kind === "conviction").length;
    /* 2: every Keep Playing plays the season on the screen, once */
    for (const { before, after } of cur.log.declineSteps) {
      const last = after.seasons.at(-1);
      const ok = after.age === before.age && after.seasons.length === before.seasons.length + 1
        && last.age === before.age && last.year === before.seasons.at(-1).year + 1;
      checks += 1;
      if (!ok) { declineRowsBad += 1; fail(`${policy} career ${c}: Keep Playing at ${before.age} wrote ${after.seasons.length - before.seasons.length} rows, age now ${after.age}`); }
      const pushes = after.events.filter(e => e.includes("Decided to push on")).length;
      checks += 1;
      if (pushes !== 1) { pushBad += 1; fail(`${policy} career ${c}: "Decided to push on" written ${pushes} times`); }
    }
    /* 2: every injury stop writes the season the engine generated, marked */
    for (const st of cur.log.stopStates) {
      if (st.phase !== "rehab_choice") continue;
      injuryRows += 1;
      const row = st.seasons.at(-1);
      const r = st.pendingRehab;
      const ok = row && r && row.age === st.age && row.injury === r.name && row.injuryWeeks === r.weeks
        && row.injurySevere === true && row.apps >= 1 && !row.leagueTitle && !row.domesticCup && row.club === st.currentClub
        && (st.loan ? row.onLoanFrom === st.loan.parentClub : !row.onLoanFrom);
      checks += 1;
      if (!ok) { injuryRowsBad += 1; fail(`${policy} career ${c}: the injury stop at ${st.age} wrote ${row ? `${row.club} age ${row.age} ${row.apps} apps injury ${row.injury}` : "nothing"}`); }
    }
    /* 3: nothing moves before the first stop */
    if (old.log.firstStop === null) {
      untouched += 1;
      if (JSON.stringify(cur.s) === JSON.stringify(old.s)) identical += 1;
      else fail(`${policy} career ${c}: never stopped on the pre-850 engine but did not finish byte identical`);
    } else {
      prefixed += 1;
      const o = old.log.firstStop;
      const n = cur.log.firstStop;
      const same = !!n && n.kind === o.kind && n.state === o.state;
      if (same) prefixSame += 1;
      else fail(`${policy} career ${c}: differs from the pre-850 engine before its first ${o.kind} stop`);
      gained += cur.s.seasons.length - old.s.seasons.length;
    }
    bal[policy].cur.push(cur.s); bal[policy].old.push(old.s);
  }
  moved[policy] = { untouched, identical, prefixed, gained };
  console.log(`   lived years with no row: now ${lostNow}, pre-850 ${lostOld} (decline ${lostOldBy.decline}, rehab ${lostOldBy.rehab}, conviction ${lostOldBy.conviction}, other ${lostOldBy.other})`);
  console.log(`   pre-850 stops: ${rehabStops} rehab, ${convictions} convictions; declines now ${declines}`);
  console.log(`   never stopped ${untouched}, of them byte identical ${identical}; stopped ${prefixed}, identical up to the first stop ${prefixSame}`);
  check(lostNow === 0, `${policy}: ${lostNow} lived years with no row`);
  check(identical === untouched, `${policy}: only ${identical} of ${untouched} careers that never stopped are byte identical`);
  check(prefixSame === prefixed, `${policy}: only ${prefixSame} of ${prefixed} stopped careers match up to the first stop`);
  check(lostOldBy.other === 0, `${policy}: the pre-850 engine lost ${lostOldBy.other} years to no stop this harness knows, so the stop log is incomplete`);
  if (policy === "accept") {
    check(lostOld >= FLOOR.lostAccept, `accept: the pre-850 engine lost only ${lostOld} years, floor ${FLOOR.lostAccept}: the check may not be able to fail`);
    check(rehabStops >= FLOOR.rehabAccept, `accept: only ${rehabStops} rehab stops, floor ${FLOOR.rehabAccept}`);
    check(untouched > 0, "accept: no career ran without a stop, so the identity check tests nothing");
  }
  if (policy === "decline") {
    check(lostOld >= FLOOR.lostDecline, `decline: the pre-850 engine lost only ${lostOld} years, floor ${FLOOR.lostDecline}`);
    check(declines >= FLOOR.declines, `decline: only ${declines} declines, floor ${FLOOR.declines}: the fleet is not reaching the screen`);
  }
  if (policy === "worst") {
    check(lostOld >= FLOOR.lostWorst, `worst: the pre-850 engine lost only ${lostOld} years, floor ${FLOOR.lostWorst}`);
    check(convictions >= FLOOR.convictionsWorst, `worst: only ${convictions} convictions, floor ${FLOOR.convictionsWorst}: the conviction path is not being reached`);
  }
}
console.log(`2) Keep Playing steps wrong ${declineRowsBad}, push on line not once ${pushBad}; injury rows ${injuryRows}, wrong ${injuryRowsBad}; careers where the market and the record disagree ${moneyBad}; careers with a tournament summer never played ${summerBad} (pre-850 engine, same rule: ${summersOld})`);
check(injuryRows > 0, "no injury stop was reached on the current engine, so the injury row check tests nothing");

/* 2: off the suggestion screen Keep Playing plays nothing */
{
  let offBad = 0, offTried = 0;
  for (let c = 0; c < 12; c++) {
    let s = newCareer(CUR, 5000 + c);
    const log = freshLog();
    let guard = 0;
    while (!(s.phase === "playing" && s.seasons.some(r => r.type === "playing")) && !s.retired && guard++ < 200) s = step(CUR, s, "accept", log);
    if (s.phase !== "playing") continue;
    offTried += 1;
    const n = CUR.declineRetirementSuggestion(s, clubs);
    if (n.seasons.length !== s.seasons.length || n.age !== s.age || n.phase !== "playing") offBad += 1;
  }
  console.log(`   Keep Playing off the suggestion screen: ${offTried} tried, ${offBad} played something`);
  check(offTried >= 6, `only ${offTried} careers reached a playing state for the off screen check`);
  check(offBad === 0, `${offBad} Keep Playing calls off the suggestion screen played a season`);
}

/* the no-suggestion fleet: retire by hand at 29 */
{
  let same = 0, untouched = 0, saw = 0;
  for (let c = 0; c < NEVER; c++) {
    const cur = safePlay(CUR, 1000 + c, "never", "never (now)");
    const old = safePlay(OLD, 1000 + c, "never", "never (pre-850)");
    if (!cur || !old) continue;
    if (cur.log.suggestions.length || old.log.suggestions.length) saw += 1;
    audit(cur.s, `never career ${c}`);
    if (old.log.firstStop === null) {
      untouched += 1;
      if (JSON.stringify(cur.s) === JSON.stringify(old.s)) same += 1;
    }
  }
  console.log(`3) careers that retire at 29: ${untouched} of ${NEVER} never stopped, ${same} of them byte identical (${saw} saw a suggestion)`);
  check(saw === 0, `${saw} careers in the no-suggestion fleet saw one`);
  check(untouched >= NEVER / 2, `only ${untouched} of ${NEVER} no-suggestion careers ran without a stop`);
  check(same === untouched, `only ${same} of ${untouched} unstopped no-suggestion careers match the pre-850 engine`);
}

/* ── 4: old saves ── */
console.log("4) saves on the three screens");
const rows = s => s.seasons.length;
/* walk an engine's career to a screen; returns null if it retired first */
function walkTo(E, seed, policy, want, prep = null) {
  let s = newCareer(E, seed);
  const log = freshLog();
  let guard = 0;
  while (!want(s) && !s.retired && guard++ < 900) {
    if (prep && s.phase === "playing") s = prep(s);
    s = step(E, s, policy, log);
  }
  return want(s) ? s : null;
}
/* then the next Next Season moves one year on, from whatever the screen
   left: one more birthday and, if a row is written, the year after the last */
function nextYearOk(s) {
  let t = s; let guard = 0;
  while (t.phase !== "playing" && !t.retired && guard++ < 60) t = step(CUR, t, "accept", freshLog());
  if (t.retired) return true;
  const n = CUR.advanceProSeason(t, clubs);
  if (n.age !== t.age + 1) return false;
  if (rows(n) > rows(t)) return n.seasons.at(-1).year === t.seasons.at(-1).year + 1 && n.seasons.at(-1).age === n.age;
  return true;
}
/* heat at the trial line with money in the bags: the engine then runs the
   trial on its own 50 percent roll (a state the game reaches through the
   dirty choices; built here so every save gets there) */
const heatUp = s => (s.age >= 22 ? { ...s, corruptionHeat: 95, dirtyMoney: Math.max(2, s.dirtyMoney ?? 0) } : s);
{
  const tally = { sit: [0, 0, 0], rehabOld: [0, 0, 0], rehabNew: [0, 0], convOld: [0, 0, 0], convNew: [0, 0] };
  for (let c = 0; c < OLD_SAVES; c++) {
    /* a: pre-850, sitting on the suggestion */
    {
      const s = walkTo(OLD, 2000 + c, "decline", x => x.phase === "retirement_suggestion");
      if (s) {
        tally.sit[0] += 1;
        const save = JSON.stringify(s);
        const after = CUR.declineRetirementSuggestion(CUR.repairCareer(JSON.parse(save)), clubs);
        const oldAfter = OLD.declineRetirementSuggestion(JSON.parse(save), clubs);
        if (rows(oldAfter) === rows(s)) tally.sit[2] += 1;
        const last = after.seasons.at(-1);
        const ok = after.age === s.age && rows(after) === rows(s) + 1 && last.age === s.age
          && last.year === s.seasons.at(-1).year + 1 && nextYearOk(after);
        check(ok, `old save ${c}: declining on the suggestion at ${s.age} did not play that season exactly once`);
        if (ok) tally.sit[1] += 1;
      }
    }
    /* b: pre-850, sitting on the rehab choice */
    {
      let s = null;
      for (let k = 0; k < 24 && !s; k++) s = walkTo(OLD, 6000 + c * 24 + k, "accept", x => x.phase === "rehab_choice");
      if (s) {
        tally.rehabOld[0] += 1;
        const save = JSON.stringify(s);
        const after = CUR.applyRehabChoice(CUR.repairCareer(JSON.parse(save)), 1);
        const oldAfter = OLD.applyRehabChoice(JSON.parse(save), 1);
        if (rows(oldAfter) === rows(s)) tally.rehabOld[2] += 1;
        const last = after.seasons.at(-1);
        const ok = rows(after) === rows(s) + 1 && last.age === s.age && last.year === s.seasons.at(-1).year + 1
          && last.injurySevere === true && last.injury === s.pendingRehab.name && last.apps === 0 && last.goals === 0
          && JSON.stringify(after.seasons.slice(0, -1)) === JSON.stringify(s.seasons)
          && ticks(CUR, after) === playedRows(after) && summersMissed(CUR, after).length === 0 && nextYearOk(after);
        check(ok, `old rehab save ${c}: answering the rehab choice at ${s.age} did not write exactly one empty injured row`);
        if (ok) tally.rehabOld[1] += 1;
      }
    }
    /* c: this engine, sitting on the rehab choice, reloaded */
    {
      let s = null;
      for (let k = 0; k < 24 && !s; k++) s = walkTo(CUR, 6000 + c * 24 + k, "accept", x => x.phase === "rehab_choice");
      if (s) {
        tally.rehabNew[0] += 1;
        const after = CUR.applyRehabChoice(CUR.repairCareer(JSON.parse(JSON.stringify(s))), 1);
        const ok = rows(after) === rows(s) && after.seasons.filter(r => r.age === s.age).length === 1 && nextYearOk(after);
        check(ok, `rehab save ${c}: a reloaded save on the rehab choice at ${s.age} came out with ${after.seasons.filter(r => r.age === s.age).length} rows for that year`);
        if (ok) tally.rehabNew[1] += 1;
      }
    }
    /* d: pre-850, sitting on the conviction paper */
    {
      const s = walkTo(OLD, 7000 + c, "accept", isConvictionStop, heatUp);
      if (s) {
        tally.convOld[0] += 1;
        const save = JSON.stringify(s);
        const after = CUR.dismissNewspaper(CUR.repairCareer(JSON.parse(save)));
        const oldAfter = OLD.dismissNewspaper(JSON.parse(save));
        if (rows(oldAfter) === rows(s)) tally.convOld[2] += 1;
        const last = after.seasons.at(-1);
        let ok = rows(after) === rows(s) + 1 && last.age === s.age && last.year === s.seasons.at(-1).year + 1
          && last.club === "CONVICTED" && last.apps === 0 && after.phase === "playing"
          && ticks(CUR, after) === playedRows(after) && summersMissed(CUR, after).length === 0;
        if (ok) {
          const prison = CUR.advanceProSeason(after, clubs);
          ok = prison.age === s.age + 1 && prison.seasons.at(-1).club === "PRISON" && prison.seasons.at(-1).year === last.year + 1;
        }
        check(ok, `old conviction save ${c}: the trial year at ${s.age} did not come out as one CONVICTED row then the prison year`);
        if (ok) tally.convOld[1] += 1;
      }
    }
    /* e: this engine, sitting on the conviction paper, reloaded */
    {
      const s = walkTo(CUR, 7000 + c, "accept", isConvictionStop, heatUp);
      if (s) {
        tally.convNew[0] += 1;
        const after = CUR.dismissNewspaper(CUR.repairCareer(JSON.parse(JSON.stringify(s))));
        const ok = rows(after) === rows(s) && after.seasons.filter(r => r.age === s.age).length === 1
          && s.seasons.at(-1).club === "CONVICTED";
        check(ok, `conviction save ${c}: a reloaded save on the conviction paper at ${s.age} came out with ${after.seasons.filter(r => r.age === s.age).length} rows for that year`);
        if (ok) tally.convNew[1] += 1;
      }
    }
  }
  console.log(`   pre-850 on the suggestion: ${tally.sit[1]}/${tally.sit[0]} play that season once here (the pre-850 decline lost it on ${tally.sit[2]})`);
  console.log(`   pre-850 on the rehab choice: ${tally.rehabOld[1]}/${tally.rehabOld[0]} get one empty injured row (the pre-850 choice wrote none on ${tally.rehabOld[2]})`);
  console.log(`   this engine on the rehab choice, reloaded: ${tally.rehabNew[1]}/${tally.rehabNew[0]} keep one row for the year`);
  console.log(`   pre-850 on the conviction paper: ${tally.convOld[1]}/${tally.convOld[0]} get one CONVICTED row, then prison (the pre-850 paper wrote none on ${tally.convOld[2]})`);
  console.log(`   this engine on the conviction paper, reloaded: ${tally.convNew[1]}/${tally.convNew[0]} keep one row for the year`);
  for (const [k, need] of [["sit", true], ["rehabOld", true], ["rehabNew", false], ["convOld", true], ["convNew", false]]) {
    check(tally[k][0] === OLD_SAVES, `${k}: only ${tally[k][0]} of ${OLD_SAVES} saves reached the screen`);
    if (need) check(tally[k][2] === tally[k][0], `${k}: the pre-850 engine wrote the row on ${tally[k][0] - tally[k][2]} saves, so this check may not be able to fail`);
  }
}
/* f: a save that already lost years keeps every row and loses no more */
{
  let ok = 0, tried = 0, carrying = 0;
  for (let c = 0; c < OLD_SAVES; c++) {
    let l = newCareer(OLD, 3000 + c);
    const llog = freshLog();
    let guard = 0;
    while (!l.retired && llog.declines < 2 && guard++ < 900) l = step(OLD, l, "decline", llog);
    while (!l.retired && l.phase !== "playing" && guard++ < 900) l = step(OLD, l, "decline", llog);
    if (l.retired) continue;
    tried += 1;
    const keptRows = JSON.stringify(l.seasons);
    const loadAge = l.age;
    let fin;
    try { fin = play(CUR, 3000 + c, "decline", CUR.repairCareer(JSON.parse(JSON.stringify(l))), freshLog()); }
    catch (e) { fail(`lost save ${c}: ${e.message}`); continue; }
    const keptSame = JSON.stringify(fin.s.seasons.slice(0, l.seasons.length)) === keptRows;
    const a = audit(fin.s, `lost save ${c}`, true);
    const newGaps = a.missing.filter(x => x > loadAge);
    if (a.missing.length) carrying += 1;
    check(keptSame, `lost save ${c}: the rows it already had were rewritten`);
    check(newGaps.length === 0 && a.doubled === 0, `lost save ${c}: lost ${newGaps.join(", ")} after it was loaded, ${a.doubled} doubled ages`);
    if (keptSame && newGaps.length === 0 && a.doubled === 0) ok += 1;
  }
  console.log(`   already lost years: ${ok}/${tried} kept every row and lost no more (${carrying} carry their old gaps, nothing invented to fill them)`);
  check(tried >= OLD_SAVES / 2 && ok === tried, `only ${ok} of ${tried} saves with lost years continued cleanly (need ${OLD_SAVES / 2} tried)`);
}

/* ── 6: the page hands Keep Playing the clubs it plays the season against ──
   Dropping the argument is a type error, but an empty list compiles and
   quietly plays the season against no clubs (the rival can never move), so
   the call itself is held, read from the code with the comments stripped. */
{
  let page = readFileSync(path.join(ROOT, "src/pages/SoccerCareer.tsx"), "utf8").replace(/\r\n/g, "\n");
  if (PAGE_CONTROLS[CONTROL]) page = swap(page, PAGE_CONTROLS[CONTROL][0], PAGE_CONTROLS[CONTROL][1], `control ${CONTROL}`);
  const code = page.replace(/\/\*[^]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const calls = count(code, "declineRetirementSuggestion(");
  console.log(`6) the page calls Keep Playing ${calls} time(s), with its clubs ${count(code, PAGE_CALL)}`);
  check(calls === 1 && count(code, PAGE_CALL) === 1, "the page's Keep Playing does not pass the clubs it loaded");
}

/* ── 5: balance, printed only ── */
console.log("5) balance against the pre-850 engine (printed, not asserted)");
const mean = xs => xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length);
const pct = (xs, p) => { const v = [...xs].sort((x, y) => x - y); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : 0; };
for (const policy of FLEETS) {
  console.log(`   ${policy}: ${moved[policy].prefixed} careers moved after their first stop, +${moved[policy].gained} rows between them; ${moved[policy].identical} untouched and identical`);
  for (const [name, fleet] of [["pre-850", bal[policy].old], ["now", bal[policy].cur]]) {
    const late = fleet.flatMap(s => s.seasons.filter(r => r.type === "playing" && r.age >= 40 && r.apps > 0));
    const lateGoals = late.map(r => r.goals);
    console.log(`     ${name.padEnd(8)} retire age ${mean(fleet.map(s => s.age)).toFixed(2)}, rows ${mean(fleet.map(s => s.seasons.length)).toFixed(2)}, playing rows ${mean(fleet.map(s => s.seasons.filter(r => r.type === "playing" && r.apps > 0).length)).toFixed(2)}, goals ${mean(fleet.map(s => s.seasons.reduce((t, r) => t + (r.goals || 0), 0))).toFixed(1)}, net worth ${mean(fleet.map(s => s.netWorth)).toFixed(1)}M, legacy ${mean(fleet.map(s => s.legacy?.score ?? 0)).toFixed(1)}; 40+ seasons ${late.length}, goals mean ${mean(lateGoals).toFixed(2)} p90 ${pct(lateGoals, 0.9)}, 20+ goal seasons ${lateGoals.filter(g => g >= 20).length}`);
  }
}

console.log(`simCareerKeepPlaying: ${checks} checks, ${failures} failures${CONTROL ? ` (control ${CONTROL}, red expected)` : ""}`);
process.exitCode = failures === 0 ? 0 : 1;
