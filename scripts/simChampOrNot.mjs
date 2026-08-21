/**
 * Round 235 harness (number 98): Champ or Not's generator proven over a
 * simulated year against the live champion tables.
 *
 * The game's whole promise is "every claim is real history or a real
 * winner in the wrong year, never an invention". This proves it with the
 * game's own code paths (fetchCompetitionRows, buildRounds, the real
 * labels) and an INDEPENDENT truth map built here from the same fetched
 * rows:
 *   1. LIVE POOLS: every competition's fetch returns enough rows to play
 *      and decoy honestly (floors at about half of measured).
 *   2. A YEAR OF DAILIES: 365 days x 10 rounds. Every TRUE claim's
 *      (year, team) exists in the table. Every FALSE claim's (year, team)
 *      is ABSENT from that year's winners, which is exactly the split
 *      title trap: USC really took the 2003 AP crown, so "USC won a
 *      national title for the 2003 season" can never be served as false.
 *   3. SHAPE OF A DAY: 10 rounds, every competition appears, no
 *      back-to-back repeats of one competition, truth rate in a band
 *      around the coin, consecutive days never deal identical sets,
 *      and the same day rebuilt is identical (determinism).
 *   4. STYLE: no statement may carry an em or en dash, and every reveal
 *      names at least one real champion.
 *   5. THE BEAT LINE (Round 249): every finals-competition reveal also
 *      teaches who the real champion beat and the series or score, and
 *      the line is checked against the finals tables read through the
 *      OTHER game's fetcher (whodTheyBeat.ts), so the two games can
 *      never disagree about a final. List competitions never carry one.
 *
 * SKIPS LOUDLY IN CAPITALS when Supabase is unreachable.
 *
 * Run: node scripts/simChampOrNot.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "/tmp/champornot-entry.mjs";
const OUT = "/tmp/champornot.mjs";

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT}/src/lib/champOrNot.ts');
export const hookmod = await import('${ROOT}/src/hooks/useChampOrNot.ts');
export const beatlib = await import('${ROOT}/src/lib/whodTheyBeat.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { lib, hookmod, beatlib } = await import(pathToFileURL(OUT).href);
const { COMPETITIONS, DAILY_ROUNDS, buildRounds, fetchCompetitionRows } = lib;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

/* -------------------------------------- 0: the daily save loads fail closed */
console.log("0) hostile saves load as null, never as state");
const hostile = [
  ["null literal", "null"],
  ["empty string", ""],
  ["not json", "{{{"],
  ["array root", "[true]"],
  ["answers not array", JSON.stringify({ answers: "yes" })],
  ["answers of numbers", JSON.stringify({ answers: [1, 0, 1] })],
  ["answers oversize", JSON.stringify({ answers: new Array(50).fill(true) })],
];
for (const [name, raw] of hostile) {
  if (hookmod.loadDailySave(raw) !== null) fail(`hostile save (${name}) was accepted`);
}
const good = hookmod.loadDailySave(JSON.stringify({ answers: [true, false, true] }));
if (!good || good.answers.length !== 3 || good.answers[1] !== false) fail("a genuine save failed to load");
console.log(`   ${hostile.length} hostile shapes rejected, the real shape loads`);

/* ------------------------------------------------------- 1: live pools */
console.log("1) live pools through the game's own fetch");
/* floors ~half of measured 2026-08-20: sb 60, nba 80, ws 121, cup 110,
   wnba 29, cfb 49, cbb 87, epl 127 (the filter covers the whole English
   top flight, which the claim phrasing is deliberately neutral about),
   afl 129 */
const FLOORS = { sb: 30, nba: 40, ws: 60, cup: 55, wnba: 14, cfb: 24, cbb: 40, epl: 60, afl: 64, nrl: 58 };
const rowsByKey = new Map();
let reachable = true;
for (const def of COMPETITIONS) {
  try {
    const rows = await fetchCompetitionRows(def);
    rowsByKey.set(def.key, rows);
    const floor = FLOORS[def.key];
    if (floor == null) fail(`${def.key}: no floor recorded for this competition, add one`);
    else if (rows.length < floor) fail(`${def.key}: ${rows.length} rows, the floor is ${floor}`);
    const badYear = rows.find(r => r.year < 1850 || r.year > 2100);
    if (badYear) fail(`${def.key}: unbelievable year ${badYear.year}`);
    console.log(`   ${def.key}: ${rows.length} rows, ${new Set(rows.map(r => r.team)).size} distinct winners`);
  } catch {
    console.log(`   ${def.key}: SKIPPED, SUPABASE UNREACHABLE. NOT CHECKED.`);
    reachable = false;
  }
}

if (!reachable || rowsByKey.size < COMPETITIONS.length) {
  console.log("SUPABASE UNREACHABLE FOR AT LEAST ONE POOL. THE YEAR SIMULATION DID NOT RUN.");
  console.log("");
  if (failures > 0) { console.error(`simChampOrNot: ${failures} failures`); process.exit(1); }
  console.log("simChampOrNot: green (WITH LOUD SKIPS ABOVE)");
  process.exit(0);
}

/* independent truth map: year -> set of winners, per competition */
const truth = new Map();
for (const [key, rows] of rowsByKey) {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.year)) m.set(r.year, new Set());
    m.get(r.year).add(r.team);
  }
  truth.set(key, m);
}

/* Round 249: independent truth for the reveal's beat line, read through
   the OTHER game's fetcher (whodTheyBeat.ts), a separate code path over
   the same audited tables. comp -> year -> {loser, series, score}. */
const FINALS_KEYS = new Set(["sb", "nba", "ws", "cup", "wnba"]);
const beatTruth = new Map();
for (const def of beatlib.FINALS_COMPS) {
  const rows = await beatlib.fetchFinalsRows(def);
  const m = new Map();
  for (const r of rows) m.set(r.year, r);
  beatTruth.set(def.key, m);
}

/* ------------------------------------------------- 2 + 3: a year of days */
console.log("2) a simulated year of dailies");
const BASE = Date.UTC(2026, 7, 20);
const dates = Array.from({ length: 365 }, (_, i) =>
  new Date(BASE + i * 86400000).toISOString().slice(0, 10));

let trueCount = 0, totalCount = 0;
let prevStatements = null;
let identicalNeighbours = 0;
const perCompServed = new Map(COMPETITIONS.map(c => [c.key, 0]));

for (const day of dates) {
  const prefix = `champ-or-not:${day}`;
  const rounds = buildRounds(rowsByKey, prefix, DAILY_ROUNDS);
  if (rounds.length !== DAILY_ROUNDS) fail(`${day}: ${rounds.length} rounds instead of ${DAILY_ROUNDS}`);

  const seenComp = new Set();
  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    totalCount += 1;
    if (r.isTrue) trueCount += 1;
    seenComp.add(r.compKey);
    perCompServed.set(r.compKey, (perCompServed.get(r.compKey) ?? 0) + 1);

    const winners = truth.get(r.compKey)?.get(r.year);
    if (!winners || winners.size === 0) {
      fail(`${day} slot ${i}: claim about ${r.compKey} ${r.year}, a year with no row`);
      continue;
    }
    if (r.isTrue && !winners.has(r.shownTeam)) {
      fail(`${day} slot ${i}: TRUE claim "${r.statement}" but ${r.shownTeam} did not win ${r.compKey} ${r.year}`);
    }
    if (!r.isTrue && winners.has(r.shownTeam)) {
      fail(`${day} slot ${i}: FALSE claim "${r.statement}" is actually TRUE (split title trap)`);
    }
    if (!r.isTrue) {
      const allTeams = new Set(rowsByKey.get(r.compKey).map(x => x.team));
      if (!allTeams.has(r.shownTeam)) fail(`${day} slot ${i}: decoy ${r.shownTeam} is not a real ${r.compKey} winner`);
    }
    if (r.realTeams.length === 0) fail(`${day} slot ${i}: reveal has no real champion to name`);
    /* Round 249: finals competitions must teach the real final on the
       reveal, and the line must match the finals table read through the
       other game's fetcher exactly: right loser, right series or score,
       winner first. List competitions must never carry one. */
    if (FINALS_KEYS.has(r.compKey)) {
      const bt = beatTruth.get(r.compKey)?.get(r.year);
      const tail = r.compKey === "sb" ? bt?.score : bt?.series;
      if (!bt || !bt.loser || !tail) {
        fail(`${day} slot ${i}: no independent finals truth for ${r.compKey} ${r.year}, those columns are complete`);
      } else if (r.beatLine !== `the ${bt.loser} ${tail}`) {
        fail(`${day} slot ${i}: beatLine ${JSON.stringify(r.beatLine)}, the finals table says ${JSON.stringify(`the ${bt.loser} ${tail}`)}`);
      }
    } else if (r.beatLine) {
      fail(`${day} slot ${i}: ${r.compKey} carries a beat line with no beaten-side data behind it`);
    }
    for (const ch of r.statement + (r.beatLine ?? "")) {
      const code = ch.charCodeAt(0);
      if (code === 8211 || code === 8212) fail(`${day} slot ${i}: statement carries a long dash: ${r.statement}`);
    }
    if (i > 0 && rounds[i - 1].compKey === r.compKey) {
      fail(`${day}: slots ${i - 1} and ${i} are both ${r.compKey}, back to back`);
    }
  }
  if (seenComp.size !== COMPETITIONS.length) {
    fail(`${day}: only ${seenComp.size} of ${COMPETITIONS.length} competitions appeared`);
  }

  const statements = rounds.map(r => r.statement).join("|");
  if (prevStatements !== null && statements === prevStatements) identicalNeighbours += 1;
  prevStatements = statements;
}

if (identicalNeighbours > 0) fail(`${identicalNeighbours} consecutive days dealt an identical set`);

const trueRate = trueCount / totalCount;
console.log(`   ${totalCount} rounds over ${dates.length} days, true rate ${(trueRate * 100).toFixed(1)}%`);
/* the coin is dailyDraw(2): across 3650 rounds the sd is ~0.8 points, so
   a 46-54 band is over 4 sd of headroom */
if (trueRate < 0.46 || trueRate > 0.54) fail(`true rate ${(trueRate * 100).toFixed(1)}% is outside 46-54`);
for (const [k, n] of perCompServed) {
  if (n < 365) fail(`${k}: served ${n} rounds over a year, below one a day`);
}

/* determinism: the same day rebuilt is byte-identical */
const again = buildRounds(rowsByKey, `champ-or-not:${dates[0]}`, DAILY_ROUNDS);
const first = buildRounds(rowsByKey, `champ-or-not:${dates[0]}`, DAILY_ROUNDS);
if (JSON.stringify(again) !== JSON.stringify(first)) fail("the same day rebuilt differently, determinism is broken");

/* ------------------------------------------- 3b: hard mode (Round 237) */
console.log("3) hard mode: the fakes are close AND still honest");
const HW = lib.HARD_WINDOW;
let hardFalse = 0, hardClose = 0, hardFallback = 0;
for (let run = 0; run < 120; run++) {
  const prefix = `champ-or-not:unlimited:sim:${run}:hard`;
  const rounds = buildRounds(rowsByKey, prefix, DAILY_ROUNDS, true);
  if (rounds.length !== DAILY_ROUNDS) fail(`hard run ${run}: ${rounds.length} rounds`);
  for (const r of rounds) {
    const winners = truth.get(r.compKey)?.get(r.year);
    if (!winners) { fail(`hard run ${run}: year ${r.year} has no ${r.compKey} row`); continue; }
    if (r.isTrue && !winners.has(r.shownTeam)) fail(`hard run ${run}: TRUE claim wrong: ${r.statement}`);
    if (!r.isTrue) {
      hardFalse += 1;
      if (winners.has(r.shownTeam)) fail(`hard run ${run}: FALSE claim actually true: ${r.statement}`);
      /* closeness: when a near decoy exists it MUST be used */
      const rows = rowsByKey.get(r.compKey);
      const nearTeams = new Set(rows.filter(x => Math.abs(x.year - r.year) <= HW).map(x => x.team));
      for (const w of winners) nearTeams.delete(w);
      const isClose = rows.some(x => x.team === r.shownTeam && Math.abs(x.year - r.year) <= HW);
      if (nearTeams.size > 0 && !isClose) {
        fail(`hard run ${run}: decoy ${r.shownTeam} is not close to ${r.year} though close winners exist`);
      }
      if (isClose) hardClose += 1; else hardFallback += 1;
    }
  }
}
const hardSame = JSON.stringify(buildRounds(rowsByKey, "champ-or-not:unlimited:sim:0:hard", DAILY_ROUNDS, true));
if (hardSame !== JSON.stringify(buildRounds(rowsByKey, "champ-or-not:unlimited:sim:0:hard", DAILY_ROUNDS, true))) {
  fail("hard mode: same labels rebuilt differently");
}
console.log(`   ${hardFalse} hard fakes: ${hardClose} within ${HW} seasons, ${hardFallback} fell back to whole history`);
/* with 10 dense tables a close decoy nearly always exists; the fallback
   is for degenerate stretches where one club won everything in the
   window, which really happens: deep inside St George's eleven straight
   (1956-1966) there is no other winner within 3 seasons to borrow.
   Measured 2026-08-20: 616 close of 622, fallback 6. Floor: at least
   95% of hard fakes are close. */
if (hardFalse > 0 && hardClose / hardFalse < 0.95) {
  fail(`only ${((hardClose / hardFalse) * 100).toFixed(1)}% of hard fakes are close, the floor is 95%`);
}

console.log("");
if (failures > 0) {
  console.error(`simChampOrNot: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simChampOrNot: green. A year of claims, every one honest.");
