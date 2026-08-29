/**
 * Round 242 harness (number 100): Who'd They Beat? proven over a
 * simulated year against the live finals tables.
 *
 * The game's promise: the correct answer is THE beaten finalist of that
 * exact year, and every wrong option is a real beaten finalist of the
 * same competition. This proves it with the game's own code paths and an
 * INDEPENDENT truth map built here from the same fetched rows:
 *   0. Hostile daily saves load as null, never as state.
 *   1. LIVE POOLS: all five competitions return complete (winner, loser)
 *      rows at floors of about half of measured.
 *   2. A YEAR OF DAILIES: 365 days x 10 questions. The correct option
 *      equals the table's loser for that (competition, year); all four
 *      options are unique real losers of that competition and never the
 *      champion; the reveal's series detail matches the table; each
 *      competition appears exactly twice a day with no back-to-back
 *      repeats; the correct answer's position spreads evenly (no
 *      always-option-A tell); consecutive days never deal an identical
 *      set; the same day rebuilds byte-identical; and nothing rendered
 *      carries a long dash.
 *
 * SKIPS LOUDLY IN CAPITALS when Supabase is unreachable.
 *
 * Run: node scripts/simWhodTheyBeat.mjs
 */
import { writeFileSync } from "node:fs";
import os from 'node:os';
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(os.tmpdir(), 'whodbeat-entry.mjs');
const OUT = path.join(os.tmpdir(), 'whodbeat.mjs');

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT.replaceAll('\\', '/')}/src/lib/whodTheyBeat.ts');
export const hookmod = await import('${ROOT.replaceAll('\\', '/')}/src/hooks/useWhodTheyBeat.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { lib, hookmod } = await import(pathToFileURL(OUT).href);
const { FINALS_COMPS, BEAT_ROUNDS, buildQuestions, fetchFinalsRows } = lib;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

/* ------------------------------------ 0: hostile saves load fail closed */
console.log("0) hostile saves load as null, never as state");
const hostile = ["null", "", "{{{", "[true]", JSON.stringify({ answers: "x" }),
  JSON.stringify({ answers: [1] }), JSON.stringify({ answers: new Array(40).fill(true) })];
for (const raw of hostile) {
  if (hookmod.loadDailySave(raw) !== null) fail(`hostile save accepted: ${raw.slice(0, 30)}`);
}
if (!hookmod.loadDailySave(JSON.stringify({ answers: [true, false] }))) fail("a genuine save failed to load");
console.log(`   ${hostile.length} hostile shapes rejected, the real shape loads`);

/* ------------------------------------------------------- 1: live pools */
console.log("1) live pools through the game's own fetch");
const FLOORS = { sb: 30, nba: 40, ws: 60, cup: 55, wnba: 14 };
const rowsByKey = new Map();
let reachable = true;
for (const def of FINALS_COMPS) {
  try {
    const rows = await fetchFinalsRows(def);
    rowsByKey.set(def.key, rows);
    const floor = FLOORS[def.key];
    if (floor == null) fail(`${def.key}: no floor recorded`);
    else if (rows.length < floor) fail(`${def.key}: ${rows.length} complete rows, the floor is ${floor}`);
    console.log(`   ${def.key}: ${rows.length} finals, ${new Set(rows.map(r => r.loser)).size} distinct beaten sides`);
  } catch {
    console.log(`   ${def.key}: SKIPPED, SUPABASE UNREACHABLE. NOT CHECKED.`);
    reachable = false;
  }
}
if (!reachable || rowsByKey.size < FINALS_COMPS.length) {
  console.log("SUPABASE UNREACHABLE FOR AT LEAST ONE POOL. THE YEAR SIMULATION DID NOT RUN.");
  console.log("");
  if (failures > 0) { console.error(`simWhodTheyBeat: ${failures} failures`); process.exit(1); }
  console.log("simWhodTheyBeat: green (WITH LOUD SKIPS ABOVE)");
  process.exit(0);
}

/* independent truth: comp -> year -> {loser, series, winner} */
const truth = new Map();
for (const [key, rows] of rowsByKey) {
  const m = new Map();
  for (const r of rows) m.set(r.year, r);
  truth.set(key, m);
}

/* --------------------------------------------- 2: a year of daily sets */
console.log("2) a simulated year of dailies");
const BASE = Date.UTC(2026, 7, 20);
const dates = Array.from({ length: 365 }, (_, i) =>
  new Date(BASE + i * 86400000).toISOString().slice(0, 10));

const posCounts = [0, 0, 0, 0];
let totalQ = 0, prev = null, identical = 0;

for (const day of dates) {
  const prefix = `whod-they-beat:${day}`;
  const qs = buildQuestions(rowsByKey, prefix);
  if (qs.length !== BEAT_ROUNDS) fail(`${day}: ${qs.length} questions instead of ${BEAT_ROUNDS}`);
  const perComp = new Map();
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    totalQ += 1;
    perComp.set(q.compKey, (perComp.get(q.compKey) ?? 0) + 1);
    if (i > 0 && qs[i - 1].compKey === q.compKey) fail(`${day}: slots ${i - 1} and ${i} both ${q.compKey}`);

    const t = truth.get(q.compKey)?.get(q.year);
    if (!t) { fail(`${day} slot ${i}: no table row for ${q.compKey} ${q.year}`); continue; }
    const correct = q.options[q.correctIndex];
    if (correct !== t.loser) fail(`${day} slot ${i}: correct option ${correct}, the table says ${t.loser}`);
    if (q.winner !== t.winner) fail(`${day} slot ${i}: question winner ${q.winner} vs table ${t.winner}`);
    if (new Set(q.options).size !== 4) fail(`${day} slot ${i}: options not 4 unique`);
    const loserSet = new Set(rowsByKey.get(q.compKey).map(r => r.loser));
    for (const o of q.options) {
      if (!loserSet.has(o)) fail(`${day} slot ${i}: option ${o} never lost a ${q.compKey} final`);
      if (o === q.winner) fail(`${day} slot ${i}: the champion is an option`);
    }
    if (q.compKey === "sb") {
      /* Round 249: the reveal is the full almanac line, rebuilt here
         from the table row so a drift in numeral, score, venue, city or
         the article/duplicate-city rules fails loudly. The score, venue
         and place columns are complete (Rounds 247 and 248), so their
         absence from a fetched row is itself a failure. */
      if (!t.score || !t.venue || !t.place) {
        fail(`${day} slot ${i}: sb ${q.year} row missing score, venue or place, those columns are complete`);
      } else {
        const city = t.place.slice(0, t.place.indexOf(","));
        const where = t.venue.startsWith(city) ? "" : ` in ${t.place}`;
        const article = /(Bowl|dome|Coliseum)$/i.test(t.venue) ? "the " : "";
        const want = `Super Bowl ${t.series}, ${t.score} at ${article}${t.venue}${where}`;
        if (q.detail !== want) fail(`${day} slot ${i}: detail ${JSON.stringify(q.detail)}, the table says ${JSON.stringify(want)}`);
      }
    } else if (t.series && q.detail !== `Series: ${t.series}`) {
      fail(`${day} slot ${i}: detail ${JSON.stringify(q.detail)} vs table series ${t.series}`);
    }
    posCounts[q.correctIndex] += 1;
    for (const s of [q.question, q.detail, ...q.options]) {
      for (const ch of String(s)) {
        const c = ch.charCodeAt(0);
        if (c === 8211 || c === 8212) fail(`${day} slot ${i}: long dash in ${s}`);
      }
    }
  }
  for (const def of FINALS_COMPS) {
    if ((perComp.get(def.key) ?? 0) !== 2) fail(`${day}: ${def.key} appeared ${perComp.get(def.key) ?? 0} times, not 2`);
  }
  const sig = qs.map(q => q.question).join("|");
  if (prev !== null && sig === prev) identical += 1;
  prev = sig;
}
if (identical > 0) fail(`${identical} consecutive days dealt an identical set`);

for (let p = 0; p < 4; p++) {
  const share = posCounts[p] / totalQ;
  /* uniform would be 25%; with 3650 draws the sd is ~0.7 points, so a
     15-35 band only fails on a real position bias, never on noise */
  if (share < 0.15 || share > 0.35) fail(`correct answer sits at position ${p} ${(share * 100).toFixed(1)}% of the time`);
}
console.log(`   ${totalQ} questions over ${dates.length} days, correct-position spread ${posCounts.map(c => (c / totalQ * 100).toFixed(1)).join(" / ")}`);

const a = buildQuestions(rowsByKey, `whod-they-beat:${dates[0]}`);
const b = buildQuestions(rowsByKey, `whod-they-beat:${dates[0]}`);
if (JSON.stringify(a) !== JSON.stringify(b)) fail("the same day rebuilt differently");

console.log("");
if (failures > 0) {
  console.error(`simWhodTheyBeat: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simWhodTheyBeat: green. A year of finals, every answer the real one.");
