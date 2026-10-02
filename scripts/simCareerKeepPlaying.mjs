/* Round 850: Keep Playing plays the season you aged into.
 *
 * THE DEFECT (audit QA847-14, a real live career): Next Season runs
 * advanceProSeason, which starts the year (the birthday, bans, the heat, the
 * drug test) and only then asks whether to retire. Keep Playing used to set
 * the phase back to playing and nothing else, so the year he had just aged
 * into was never played or written down, the next Next Season aged him again,
 * and the calendar fell one year behind his age every time. That live career
 * lost the seasons at 33, 37, 41, 42, 43 and 44 and finished six years behind.
 *
 * THE FIX: the season is its own step (playPendingProSeason) and Keep Playing
 * resumes exactly that pending season. Accepting is untouched.
 *
 * WHAT THIS HOLDS, driving the real engine with seeded Math.random:
 *   1. Over a fleet that declines EVERY suggestion, every year lived from the
 *      first season to retirement has exactly one season row (a ban or prison
 *      year has its own zero appearance row and counts), no age has two, and
 *      the calendar runs one year per row without a gap. Each decline adds
 *      the row for the age on the suggestion screen and never moves the age.
 *   2. The same fleet on the pre-850 engine (this file's engine with the
 *      round reverted, built in memory) loses years, so check 1 is a check
 *      that fails on the old code rather than one that cannot fail.
 *   3. Accepting retirement ends every career at the same point, byte for
 *      byte, as the pre-850 engine. Careers that never see a suggestion are
 *      byte identical end to end. Careers that decline are byte identical up
 *      to the moment the first suggestion is raised.
 *   4. Old saves. A save written by the pre-850 engine while SITTING on the
 *      suggestion plays that season once when declined: one row, at the age
 *      on the screen, and the next Next Season moves one year on. A save that
 *      already lost years keeps every row it had and loses no more.
 *   5. Balance, printed, never asserted: what declining every suggestion does
 *      to retirement age, goals, net worth and legacy, and how a 40 plus
 *      season reads.
 *
 * TWO SIBLINGS THIS DOES NOT FIX, counted and printed, never silently passed.
 * Both lose a lived year through the same shape (aged first, early return,
 * then the phase goes back to playing): a severe injury's rehab choice
 * (rehab_choice) and a corruption conviction (newspaper, prison the year
 * after). A year the driver SAW the engine stop for one of those is exempt
 * from check 1 and listed; any other missing year fails. Fixing those moves
 * careers that never see a suggestion, so they are their own round.
 *
 * MEASURED (60 careers per fleet, KEEP_PLAYING_SEED 0x850a, 0x1234, 0x5eed,
 * 0xbeef and 0x7777, 2026-10-01): the pre-850 engine lost 177, 199, 207, 201
 * and 202 years to declines (2.95 to 3.45 per career, every career lost at
 * least one); this engine loses 0. Floor: 1 lost year per career on the old
 * engine, under a third of the lowest. Declines per fleet ran 143 to 160,
 * floor 1.5 per career (90). Saves with lost years continued: 17 to 23 of
 * 24, floor 12. The sibling years exempted ran 50 to 69 per fleet.
 *
 * NEGATIVE CONTROLS, each must exit 1:
 *   KEEP_PLAYING_CONTROL=olddecline  Keep Playing only sets the phase again
 *     (exactly what shipped), so check 1 and check 4 go red.
 *   KEEP_PLAYING_CONTROL=readvance   Keep Playing starts the year over before
 *     playing (ages him a second time), so check 1 and check 4 go red.
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

let failures = 0;
let checks = 0;
const fail = m => { failures += 1; if (failures <= 25) console.error("  FAIL: " + m); };
const check = (ok, m) => { checks += 1; if (!ok) fail(m); };

/* ── the two engines ── */
const SRC = readFileSync(ENGINE, "utf8").replace(/\r\n/g, "\n");
const count = (hay, needle) => hay.split(needle).length - 1;

/* the pre-850 engine: undo the split and put the old decline back. Both
   anchors must match exactly once or the harness refuses to run, so a later
   edit cannot quietly turn the baseline into a copy of the current engine. */
const SPLIT_RE = /  return playPendingProSeason\(s, clubs\);\n\}\n\n\/\*[^]*?\*\/\nfunction playPendingProSeason\(s: CareerState, clubs: ClubData\[\]\): CareerState \{\n/g;
const DECLINE_RE = /export function declineRetirementSuggestion\(prev: CareerState, clubs: ClubData\[\]\): CareerState \{\n[^]*?\n\}\n/g;
const OLD_DECLINE = 'export function declineRetirementSuggestion(prev: CareerState): CareerState {\n'
  + '  const s = { ...prev };\n'
  + '  s.events = [...s.events, "\u{1F4AA} Decided to push on, not ready to hang up the boots yet"];\n'
  + '  s.phase = "playing";\n'
  + '  return s;\n'
  + '}\n';
const splitHits = (SRC.match(SPLIT_RE) || []).length;
const declineHits = (SRC.match(DECLINE_RE) || []).length;
if (splitHits !== 1 || declineHits !== 1) {
  console.error(`  FAIL: cannot rebuild the pre-850 engine (split anchor ${splitHits}, decline anchor ${declineHits}, each must be 1)`);
  process.exit(1);
}
const BASELINE_SRC = SRC.replace(SPLIT_RE, "").replace(DECLINE_RE, OLD_DECLINE);

/* the negative controls mutate the CURRENT engine's decline */
const RESUME = '|| prev.retired) {\n    s.phase = "playing";\n    return s;\n  }\n  return playPendingProSeason(s, clubs);';
const CONTROLS = {
  olddecline: '|| prev.retired) {\n    s.phase = "playing";\n    return s;\n  }\n  s.phase = "playing";\n  return s;',
  readvance: '|| prev.retired) {\n    s.phase = "playing";\n    return s;\n  }\n  return advanceProSeason({ ...s, phase: "playing" }, clubs);',
};
let CURRENT_SRC = SRC;
if (CONTROL) {
  if (!CONTROLS[CONTROL]) { console.error(`  FAIL: unknown KEEP_PLAYING_CONTROL=${CONTROL}`); process.exit(1); }
  if (count(SRC, RESUME) !== 1) { console.error("  FAIL: the control anchor is not in the engine exactly once, so the control would change nothing"); process.exit(1); }
  CURRENT_SRC = SRC.replace(RESUME, CONTROLS[CONTROL]);
  if (CURRENT_SRC === SRC) { console.error("  FAIL: the control changed nothing"); process.exit(1); }
  console.log(`CONTROL ${CONTROL}: Keep Playing mutated in the current engine, this run must go red`);
}

const TMP = mkdtempSync(path.join(os.tmpdir(), "keep-playing-"));
async function bundle(name, source) {
  const entry = path.join(TMP, `${name}-entry.mjs`);
  const out = path.join(TMP, `${name}.mjs`);
  writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${ENGINE.replaceAll("\\", "/")}';
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

/* One step of the loop the page runs. `policy` answers the suggestion:
   decline, accept, or never (retire by hand at 29, before one can come). */
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
      noteStop(n, log);
      return n;
    }
    case "retirement_suggestion": {
      log.suggestions.push(s.age);
      if (!log.firstSuggestion) log.firstSuggestion = JSON.stringify(s);
      if (policy !== "decline") return E.acceptRetirementSuggestion(s);
      log.declines += 1;
      const before = s;
      const n = E.declineRetirementSuggestion(s, clubs);
      log.declineSteps.push({ before, after: n });
      noteStop(n, log);
      return n;
    }
    case "newspaper": return E.dismissNewspaper(s);
    case "season_summary": return E.dismissSummary(s, clubs);
    case "random_events":
      if (!s.pendingEvents || !s.pendingEvents[0]) return { ...s, pendingEvents: [], phase: "playing" };
      return E.applyEventChoice(s, 0, clubs);
    case "moral_dilemma": return E.dismissMoralDilemma(s, clubs);
    case "social_media_action": return E.dismissSocialMediaPhase(s, clubs);
    case "red_card_appeal_result": return E.dismissAppealResult(s, clubs);
    case "international_debut": return E.dismissDebut(s, clubs);
    case "world_cup": return E.dismissWorldCup(s, clubs);
    case "rivalry_event": return E.dismissRivalryEvent(s, clubs);
    case "ballon_dor": return E.dismissBallonDor(s, clubs);
    case "rehab_choice": return E.applyRehabChoice(s, 1);
    case "transfer_window": return E.stayAtClub(s);
    default: throw new Error(`unhandled phase ${s.phase}`);
  }
}
/* the two sibling stops, recorded at the age they happen */
function noteStop(s, log) {
  if (s.phase === "rehab_choice") log.exempt.add(s.age);
  if (s.phase === "newspaper" && (s.prisonSeasons ?? 0) > 0) log.exempt.add(s.age);
}
function freshLog() { return { suggestions: [], declines: 0, declineSteps: [], exempt: new Set(), firstSuggestion: null }; }

function play(E, c, policy, from = null, logIn = null) {
  let s = from ?? newCareer(E, c);
  const log = logIn ?? freshLog();
  let guard = 0;
  while (!s.retired && guard++ < 900) s = step(E, s, policy, log);
  if (!s.retired) throw new Error(`career ${c} never finished`);
  return { s, log };
}

/* Every lived year has one row: returns the missing ages that are not
   exempt, and checks duplicates and the calendar. */
function audit(s, log, label) {
  const rows = s.seasons;
  const ages = rows.map(r => r.age);
  const seen = new Set();
  for (const a of ages) {
    check(!seen.has(a), `${label}: two rows at age ${a}`);
    seen.add(a);
  }
  for (let i = 1; i < rows.length; i++) {
    check(rows[i].year === rows[i - 1].year + 1, `${label}: calendar went ${rows[i - 1].year} to ${rows[i].year}`);
  }
  const missing = [];
  const exemptMissing = [];
  for (let a = ages[0]; a <= ages[ages.length - 1]; a++) {
    if (seen.has(a)) continue;
    if (log.exempt.has(a)) exemptMissing.push(a); else missing.push(a);
  }
  check(rows[rows.length - 1].type === "retired" || s.phase === "retirement_ceremony", `${label}: ended without a retirement`);
  return { missing, exemptMissing };
}

/* ── 1 and 2: the decline fleet, current and pre-850 ── */
console.log(`1) ${CAREERS} careers that decline every retirement suggestion`);
let declines = 0, lostNow = 0, lostOld = 0, exemptNow = 0, exemptOld = 0, careersLostOld = 0;
const bal = { cur: [], old: [] };
const prefixPairs = [];
for (let c = 0; c < CAREERS; c++) {
  const cur = play(CUR, c, "decline");
  const old = play(OLD, c, "decline");
  declines += cur.log.declines;
  const a = audit(cur.s, cur.log, `career ${c}`);
  lostNow += a.missing.length;
  exemptNow += a.exemptMissing.length;
  if (a.missing.length) fail(`career ${c}: lived ${a.missing.join(", ")} with no season row`);
  /* every decline plays the season on the screen, at that age, the year after the last row */
  for (const { before, after } of cur.log.declineSteps) {
    check(after.age === before.age, `career ${c}: Keep Playing moved the age ${before.age} to ${after.age}`);
    if (after.phase === "rehab_choice") continue;
    const last = after.seasons[after.seasons.length - 1];
    const prevLast = before.seasons[before.seasons.length - 1];
    check(after.seasons.length === before.seasons.length + 1, `career ${c}: Keep Playing at ${before.age} wrote ${after.seasons.length - before.seasons.length} rows`);
    check(last.age === before.age && last.year === prevLast.year + 1, `career ${c}: Keep Playing at ${before.age} wrote age ${last.age} year ${last.year} after ${prevLast.year}`);
    check(after.events.some(e => e.includes("Decided to push on")), `career ${c}: the decision line is gone from the season's events`);
  }
  /* the old engine, same seeds: the years it loses are the defect */
  const b = audit(old.s, old.log, `career ${c} (pre-850)`);
  const oldLost = b.missing.filter(x => old.log.suggestions.includes(x)).length;
  lostOld += oldLost;
  exemptOld += b.exemptMissing.length;
  if (oldLost) careersLostOld += 1;
  prefixPairs.push([cur.log.firstSuggestion, old.log.firstSuggestion]);
  bal.cur.push(cur.s); bal.old.push(old.s);
  if (c < 3) {
    const goals = s => s.seasons.reduce((t, r) => t + (r.goals || 0), 0);
    console.log(`   seed ${c}: pre-850 ${old.s.seasons.length} rows, retired at ${old.s.age} in ${old.s.seasons.at(-1).year}, ${goals(old.s)} goals; now ${cur.s.seasons.length} rows, retired at ${cur.s.age} in ${cur.s.seasons.at(-1).year}, ${goals(cur.s)} goals`);
  }
}
console.log(`   ${declines} declines; years lost to a decline: now ${lostNow}, pre-850 ${lostOld} (in ${careersLostOld} careers)`);
console.log(`   known sibling years (rehab or conviction, not this round): now ${exemptNow}, pre-850 ${exemptOld}`);
check(declines >= CAREERS * 1.5, `only ${declines} declines over ${CAREERS} careers, the floor is ${CAREERS * 1.5}: the fleet is not reaching the screen`);
check(lostNow === 0, `${lostNow} lived years with no row after a decline`);
console.log("2) the same check on the pre-850 engine finds the defect");
check(lostOld >= CAREERS,`the pre-850 engine lost only ${lostOld} years to declines, the floor is ${CAREERS}: the check may not be able to fail`);

/* ── 3: nothing else moves ── */
console.log("3) byte identity with the pre-850 engine where nobody declines");
let prefixSame = 0;
for (const [x, y] of prefixPairs) if (x !== null && x === y) prefixSame += 1;
check(prefixSame === CAREERS, `only ${prefixSame} of ${CAREERS} declining careers match the pre-850 engine up to the first suggestion`);
let acceptSame = 0, acceptSaw = 0;
for (let c = 0; c < CAREERS; c++) {
  const cur = play(CUR, c, "accept");
  const old = play(OLD, c, "accept");
  if (cur.log.suggestions.length) acceptSaw += 1;
  if (JSON.stringify(cur.s) === JSON.stringify(old.s)) acceptSame += 1;
  else fail(`career ${c}: accepting retirement ended at ${cur.s.age} in ${cur.s.seasons.at(-1).year}, pre-850 at ${old.s.age} in ${old.s.seasons.at(-1).year}`);
}
let neverSame = 0, neverSaw = 0;
for (let c = 0; c < NEVER; c++) {
  const cur = play(CUR, 1000 + c, "never");
  const old = play(OLD, 1000 + c, "never");
  if (cur.log.suggestions.length || old.log.suggestions.length) neverSaw += 1;
  if (JSON.stringify(cur.s) === JSON.stringify(old.s)) neverSame += 1;
}
console.log(`   declining careers identical to the first suggestion: ${prefixSame}/${CAREERS}`);
console.log(`   accepting careers identical end to end: ${acceptSame}/${CAREERS} (${acceptSaw} saw the suggestion)`);
console.log(`   careers that never see a suggestion identical end to end: ${neverSame}/${NEVER} (${neverSaw} saw one)`);
check(acceptSaw === CAREERS, `${CAREERS - acceptSaw} accepting careers never reached the suggestion, so they test nothing`);
check(neverSaw === 0, `${neverSaw} careers in the no-suggestion fleet saw one`);
check(neverSame === NEVER, `only ${neverSame} of ${NEVER} careers that never see a suggestion match the pre-850 engine`);

/* ── 4: old saves ── */
console.log("4) saves written by the pre-850 engine");
let sittingOk = 0, sittingOldLost = 0, sittingReached = 0, lostSavesOk = 0, lostSavesWithGap = 0;
for (let c = 0; c < OLD_SAVES; c++) {
  /* a: sitting on the suggestion screen */
  let s = newCareer(OLD, 2000 + c);
  const log = freshLog();
  let guard = 0;
  while (s.phase !== "retirement_suggestion" && !s.retired && guard++ < 900) s = step(OLD, s, "decline", log);
  if (s.phase !== "retirement_suggestion") { fail(`old save ${c}: never reached the suggestion`); continue; }
  sittingReached += 1;
  const save = JSON.stringify(s);
  const loaded = CUR.repairCareer(JSON.parse(save));
  const before = JSON.parse(save);
  const after = CUR.declineRetirementSuggestion(loaded, clubs);
  const oldAfter = OLD.declineRetirementSuggestion(JSON.parse(save), clubs);
  if (oldAfter.seasons.length === before.seasons.length) sittingOldLost += 1;
  let ok = after.age === before.age;
  if (after.phase !== "rehab_choice") {
    const last = after.seasons.at(-1);
    ok = ok && after.seasons.length === before.seasons.length + 1
      && last.age === before.age && last.year === before.seasons.at(-1).year + 1;
  }
  /* and it is played once: the next Next Season is the year after */
  let t = after; guard = 0;
  while (t.phase !== "playing" && !t.retired && guard++ < 60) t = step(CUR, t, "decline", freshLog());
  if (!t.retired) {
    const rowsBefore = t.seasons.length;
    const lastYear = t.seasons.at(-1).year;
    const n = CUR.advanceProSeason(t, clubs);
    ok = ok && n.age === t.age + 1;
    if (n.seasons.length > rowsBefore) ok = ok && n.seasons.at(-1).year === lastYear + 1 && n.seasons.at(-1).age === n.age;
  }
  check(ok, `old save ${c}: declining a save sitting on the suggestion at ${before.age} did not play that season exactly once`);
  if (ok) sittingOk += 1;

  /* b: a save that already lost years, continued on this engine */
  let l = newCareer(OLD, 3000 + c);
  const llog = freshLog();
  guard = 0;
  while (!l.retired && llog.declines < 2 && guard++ < 900) l = step(OLD, l, "decline", llog);
  while (!l.retired && l.phase !== "playing" && guard++ < 900) l = step(OLD, l, "decline", llog);
  if (l.retired) continue;
  const lostSave = JSON.stringify(l);
  const keptRows = JSON.stringify(l.seasons);
  const loadAge = l.age;
  const fin = play(CUR, 3000 + c, "decline", CUR.repairCareer(JSON.parse(lostSave)), llog);
  const keptSame = JSON.stringify(fin.s.seasons.slice(0, l.seasons.length)) === keptRows;
  const a = audit(fin.s, fin.log, `lost save ${c}`);
  const newGaps = a.missing.filter(x => x > loadAge);
  if (a.missing.length) lostSavesWithGap += 1;
  check(keptSame, `lost save ${c}: the rows it already had were rewritten`);
  check(newGaps.length === 0, `lost save ${c}: lost ${newGaps.join(", ")} after it was loaded`);
  if (keptSame && newGaps.length === 0) lostSavesOk += 1;
}
console.log(`   sitting on the suggestion: ${sittingOk}/${sittingReached} play that season once here; the pre-850 decline lost it on ${sittingOldLost}/${sittingReached}`);
console.log(`   already lost years: ${lostSavesOk} kept every row and lost no more (${lostSavesWithGap} carry their old gaps, nothing invented to fill them)`);
check(sittingReached === OLD_SAVES, `only ${sittingReached} of ${OLD_SAVES} old saves reached the suggestion`);
check(sittingOldLost === sittingReached, `the pre-850 decline kept the season on ${sittingReached - sittingOldLost} saves, so the old save check may not be able to fail`);
check(lostSavesOk >= OLD_SAVES / 2, `only ${lostSavesOk} saves with lost years were continued, the floor is ${OLD_SAVES / 2}`);

/* ── 5: balance, printed only ── */
console.log("5) balance with every suggestion declined (printed, not asserted)");
const mean = xs => xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length);
const pct = (xs, p) => { const v = [...xs].sort((x, y) => x - y); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : 0; };
for (const [name, fleet] of [["pre-850", bal.old], ["now", bal.cur]]) {
  const late = fleet.flatMap(s => s.seasons.filter(r => r.type === "playing" && r.age >= 40 && r.apps > 0));
  const lateGoals = late.map(r => r.goals);
  console.log(`   ${name.padEnd(8)} retire age ${mean(fleet.map(s => s.age)).toFixed(2)}, playing rows ${mean(fleet.map(s => s.seasons.filter(r => r.type === "playing" && r.apps > 0).length)).toFixed(2)}, goals ${mean(fleet.map(s => s.seasons.reduce((t, r) => t + (r.goals || 0), 0))).toFixed(1)}, net worth ${mean(fleet.map(s => s.netWorth)).toFixed(1)}M, legacy ${mean(fleet.map(s => s.legacy?.score ?? 0)).toFixed(1)}; seasons at 40+ ${late.length}, goals mean ${mean(lateGoals).toFixed(2)} p90 ${pct(lateGoals, 0.9)}, 20+ goal seasons ${lateGoals.filter(g => g >= 20).length}`);
}

console.log(`simCareerKeepPlaying: ${checks} checks, ${failures} failures${CONTROL ? ` (control ${CONTROL}, red expected)` : ""}`);
process.exitCode = failures === 0 ? 0 : 1;
