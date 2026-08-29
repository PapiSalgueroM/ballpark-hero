/**
 * Round 250 harness (number 102): Silverware Sort proven over a
 * simulated year against the live champion tables.
 *
 * The game's promise: five teams from one competition, exactly one right
 * order, every count the audited record's count. Proven here:
 *   1. SAVES: the daily loader fails closed on hostile shapes, including
 *      internally inconsistent ones (score not matching the greens, a
 *      first-try flag without a perfect board).
 *   2. LIVE POOLS: every competition aggregates enough teams (floors at
 *      half of measured), and the ELIGIBLE SET IS PINNED EXACTLY:
 *      sb, nba, ws, cup, cfb, cbb, epl, afl, nrl in, wnba out (only
 *      three distinct count values in its history). If a new season
 *      creates a fifth WNBA value this pin fails and promotion becomes a
 *      deliberate reviewed change, the ratchet convention.
 *   3. COUNT TRUTH: famous counts pinned exactly (Yankees 27, Canadiens
 *      24, Celtics 18, Liverpool and Manchester United 20 each, the
 *      three 16-flag AFL clubs, Souths 21, St George 15, UCLA 11,
 *      Steelers and Patriots 6 each), and every count shown on every
 *      board equals an independent recount of the fetched rows.
 *   4. A YEAR OF BOARDS: 365 days x 3 boards. Every board holds five
 *      pairwise-DISTINCT counts sorted most-first, a tray that is a
 *      permutation and never the solved order, three different
 *      competitions a day, wnba never dealt, no long dashes, consecutive
 *      days never identical, the same day byte-identical, and every
 *      eligible competition served across the year.
 *
 * SKIPS LOUDLY IN CAPITALS when Supabase is unreachable.
 *
 * Run: node scripts/simSilverwareSort.mjs
 */
import { writeFileSync } from "node:fs";
import os from 'node:os';
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(os.tmpdir(), 'silverware-entry.mjs');
const OUT = path.join(os.tmpdir(), 'silverware.mjs');

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT.replaceAll('\\', '/')}/src/lib/silverwareSort.ts');
export const hookmod = await import('${ROOT.replaceAll('\\', '/')}/src/hooks/useSilverwareSort.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { lib, hookmod } = await import(pathToFileURL(OUT).href);
const {
  COMPETITIONS, fetchCompetitionRows, aggregateCounts, isEligible,
  buildBoards, judge, BOARD_SIZE, DAILY_BOARDS,
} = lib;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

/* ---------------------------------------------- 0: fail-closed saves */
console.log("0) hostile saves load as null, never as state");
const okBoard = { s: 3, f: false, g: [true, false, true, false, true] };
const hostile = [
  ["null literal", "null"],
  ["empty string", ""],
  ["not json", "{{{"],
  ["array root", "[1]"],
  ["results not array", JSON.stringify({ results: "yes" })],
  ["too many boards", JSON.stringify({ results: [okBoard, okBoard, okBoard, okBoard] })],
  ["score out of range", JSON.stringify({ results: [{ ...okBoard, s: 6 }] })],
  ["score not matching greens", JSON.stringify({ results: [{ ...okBoard, s: 2 }] })],
  ["greens wrong length", JSON.stringify({ results: [{ s: 1, f: false, g: [true] }] })],
  ["first-try flag without perfection", JSON.stringify({ results: [{ ...okBoard, f: true }] })],
];
for (const [name, raw] of hostile) {
  if (hookmod.loadDailySave(raw) !== null) fail(`hostile save (${name}) was accepted`);
}
const genuine = hookmod.loadDailySave(JSON.stringify({ results: [okBoard, { s: 5, f: true, g: [true, true, true, true, true] }] }));
if (!genuine || genuine.results.length !== 2 || genuine.results[1].f !== true) fail("a genuine save failed to load");
console.log(`   ${hostile.length} hostile shapes rejected, the real shape loads`);

/* ---------------------------------- 1: live pools and the eligible set */
console.log("1) live pools, the eligible set, and the famous counts");
/* floors ~half of measured 2026-08-21: sb 23 teams, nba 25, ws 32,
   cup 30, wnba 12, cfb 22, cbb 37, epl 24, afl 18, nrl 20.
   Round 334: brownlow and dallym joined the game in Round 291 and never got
   floors, so this harness has demanded them ever since; measured 2026-08-29
   at 91 and 34 medallists (the exact totals Round 291 verified), floored at
   half like every other row. These two count PEOPLE, not clubs. */
const TEAM_FLOORS = { sb: 11, nba: 12, ws: 16, cup: 15, wnba: 6, cfb: 11, cbb: 18, epl: 12, afl: 9, nrl: 10, brownlow: 45, dallym: 17 };
const ELIGIBLE = ["sb", "nba", "ws", "cup", "cfb", "cbb", "epl", "afl", "nrl"];
/* the independent truth for count derivation: knowledge-verified pins,
   most already guarded by the Name Them All ratchets */
const COUNT_PINS = [
  ["ws", "New York Yankees", 27], ["ws", "St. Louis Cardinals", 11],
  ["cup", "Montreal Canadiens", 24],
  ["nba", "Boston Celtics", 18], ["nba", "Los Angeles Lakers", 12],
  ["epl", "Liverpool", 20], ["epl", "Manchester United", 20],
  ["afl", "Essendon", 16], ["afl", "Carlton", 16], ["afl", "Collingwood", 16],
  ["nrl", "South Sydney Rabbitohs", 21], ["nrl", "St George", 15],
  ["cbb", "UCLA", 11],
  ["sb", "Pittsburgh Steelers", 6], ["sb", "New England Patriots", 6],
];

const countsByKey = new Map();
let reachable = true;
for (const def of COMPETITIONS) {
  try {
    const rows = await fetchCompetitionRows(def);
    const counts = aggregateCounts(rows);
    countsByKey.set(def.key, counts);
    /* independent recount with different code: a plain object tally */
    const tally = {};
    for (const r of rows) tally[r.team] = (tally[r.team] ?? 0) + 1;
    for (const c of counts) {
      if (tally[c.team] !== c.count) fail(`${def.key}: aggregate says ${c.team} ${c.count}, recount says ${tally[c.team]}`);
    }
    const floor = TEAM_FLOORS[def.key];
    if (floor == null) fail(`${def.key}: no team floor recorded, add one`);
    else if (counts.length < floor) fail(`${def.key}: ${counts.length} teams, the floor is ${floor}`);
    const distinct = new Set(counts.map(c => c.count)).size;
    console.log(`   ${def.key}: ${counts.length} teams, ${distinct} distinct counts, eligible: ${isEligible(counts)}`);
  } catch {
    console.log(`   ${def.key}: SKIPPED, SUPABASE UNREACHABLE. NOT CHECKED.`);
    reachable = false;
  }
}
if (!reachable || countsByKey.size < COMPETITIONS.length) {
  console.log("SUPABASE UNREACHABLE FOR AT LEAST ONE POOL. THE YEAR SIMULATION DID NOT RUN.");
  console.log("");
  if (failures > 0) { console.error(`simSilverwareSort: ${failures} failures`); process.exit(1); }
  console.log("simSilverwareSort: green (WITH LOUD SKIPS ABOVE)");
  process.exit(0);
}

for (const key of ELIGIBLE) {
  if (!isEligible(countsByKey.get(key) ?? [])) fail(`${key} should be eligible and is not`);
}
for (const [key, counts] of countsByKey) {
  if (!ELIGIBLE.includes(key) && isEligible(counts)) {
    fail(`${key} became eligible: promote it DELIBERATELY (add to the pin, the labels, the SEO copy)`);
  }
}
for (const [key, team, want] of COUNT_PINS) {
  const got = countsByKey.get(key)?.find(c => c.team === team)?.count;
  if (got !== want) fail(`${key}: ${team} counts ${got}, the record says ${want}`);
}

/* --------------------------------------------------- 2: a year of boards */
console.log("2) a simulated year of dailies");
const BASE = Date.UTC(2026, 7, 21);
const dates = Array.from({ length: 365 }, (_, i) =>
  new Date(BASE + i * 86400000).toISOString().slice(0, 10));

const served = new Map(ELIGIBLE.map(k => [k, 0]));
let prevSig = null, identical = 0;

for (const day of dates) {
  const prefix = `silverware-sort:${day}`;
  const boards = buildBoards(countsByKey, prefix, DAILY_BOARDS);
  if (boards.length !== DAILY_BOARDS) fail(`${day}: ${boards.length} boards instead of ${DAILY_BOARDS}`);
  const dayComps = new Set();
  for (const b of boards) {
    dayComps.add(b.compKey);
    served.set(b.compKey, (served.get(b.compKey) ?? 0) + 1);
    if (!ELIGIBLE.includes(b.compKey)) fail(`${day}: dealt ${b.compKey}, which is not in the eligible set`);
    if (b.teams.length !== BOARD_SIZE) fail(`${day} ${b.compKey}: ${b.teams.length} teams`);
    const values = b.teams.map(t => t.count);
    if (new Set(values).size !== BOARD_SIZE) fail(`${day} ${b.compKey}: tied counts on one board: ${values.join(",")}`);
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] <= values[i]) fail(`${day} ${b.compKey}: solution not sorted most-first at rung ${i}`);
    }
    const tally = countsByKey.get(b.compKey);
    for (const t of b.teams) {
      const real = tally.find(c => c.team === t.team)?.count;
      if (real !== t.count) fail(`${day} ${b.compKey}: board says ${t.team} ${t.count}, the record says ${real}`);
      for (const ch of t.team + b.title + b.noun) {
        const c = ch.charCodeAt(0);
        if (c === 8211 || c === 8212) fail(`${day} ${b.compKey}: long dash in board text`);
      }
    }
    const sortedTray = [...b.tray].sort((a, z) => a - z);
    if (sortedTray.join(",") !== Array.from({ length: BOARD_SIZE }, (_, i) => i).join(",")) {
      fail(`${day} ${b.compKey}: tray is not a permutation: ${b.tray.join(",")}`);
    }
    if (b.tray.every((v, i) => v === i)) fail(`${day} ${b.compKey}: tray hands the player the solved order`);
  }
  if (dayComps.size !== DAILY_BOARDS) fail(`${day}: a competition repeated within the day`);
  const sig = boards.map(b => `${b.compKey}:${b.teams.map(t => t.team).join(",")}`).join("|");
  if (prevSig !== null && sig === prevSig) identical += 1;
  prevSig = sig;
}
if (identical > 0) fail(`${identical} consecutive days dealt an identical set`);
for (const [k, n] of served) {
  /* 9 eligible comps, 3 boards a day: expectation ~122 a year; half is 60 */
  if (n < 60) fail(`${k}: served ${n} boards over a year, the floor is 60`);
}
console.log(`   ${dates.length * DAILY_BOARDS} boards, coverage: ${[...served.entries()].map(([k, n]) => `${k} ${n}`).join(", ")}`);

/* determinism: the same day rebuilt is byte-identical */
const a = buildBoards(countsByKey, `silverware-sort:${dates[0]}`, DAILY_BOARDS);
const b = buildBoards(countsByKey, `silverware-sort:${dates[0]}`, DAILY_BOARDS);
if (JSON.stringify(a) !== JSON.stringify(b)) fail("the same day rebuilt differently, determinism is broken");

/* ------------------------------------------------- 3: the judge is exact */
console.log("3) the judge");
const solved = judge([0, 1, 2, 3, 4]);
if (!solved.every(Boolean)) fail("judge marks the solved order wrong");
const rotated = judge([1, 2, 3, 4, 0]);
if (rotated.some(Boolean)) fail("judge marks a full rotation as having greens");
const half = judge([0, 1, 3, 2, 4]);
if (half.filter(Boolean).length !== 3 || half[2] || half[3]) fail("judge miscounts a two-rung swap");
const withNull = judge([0, null, 2, null, 4]);
if (withNull.filter(Boolean).length !== 3) fail("judge mishandles empty rungs");

console.log("");
if (failures > 0) {
  console.error(`simSilverwareSort: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simSilverwareSort: green. Every board one right order, every count the record's.");
