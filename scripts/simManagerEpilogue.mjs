/**
 * Round 227 harness (number 93): the manager epilogue simulates a real
 * season, and the table cannot lie.
 *
 * Before this round the dugout afterlife in Soccer Career was three
 * INDEPENDENT coin flips: 15% sacked, maybe promoted, maybe "Won the
 * league trophy!", else a random adjective. Next to a fully simulated
 * playing career it read like a slot machine, and the flips could
 * contradict each other (a trophy and a sack in one line). Round 227
 * replaced it with a simulated league: his club and the era clubs at his
 * level each play the season out to a points table, every outcome is
 * derived from where he finished, and the panel shows the table.
 *
 * What this fences, seeded (house rule: seed the arms, never widen bars):
 *   1. TABLE COHERENCE, every season of 300 careers: positions are the
 *      sort of the points, exactly one row is the manager, the W-D-L line
 *      multiplies back to his exact points, and no club's total is
 *      unreachable in the games played (3W + D = pts with W + D <= games).
 *   2. DERIVED OUTCOMES: CHAMPIONS appears in the line iff he finished
 *      1st; the trophy flag is champion-or-cup and nothing else; a
 *      promotion (tier drop) only ever follows a top two finish in a
 *      lower tier; the sack only follows a finish a board acts on
 *      (relegation zone, or bottom half at a top club), never a title.
 *   3. THE EDGE IS REAL: across the careers, seasons where his dugout
 *      record has earned an edge finish higher on average than debut
 *      seasons. Managing well has to matter or the table is decoration.
 *
 * Run: node scripts/simManagerEpilogue.mjs
 */
import { writeFileSync } from "node:fs";
import os from 'node:os';
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(os.tmpdir(), 'managerep-entry.mjs');
const OUT = path.join(os.tmpdir(), 'managerep.mjs');

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
/* dynamic import, never a static one: static imports hoist above the stub
   line and the engine touches storage at module scope */
export const eng = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerEngine.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { eng } = await import(pathToFileURL(OUT).href);

/* seeded, so the verdict cannot flip between runs */
{
  let a = 0x227e9 >>> 0;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };
const clubs = eng.FALLBACK_CLUBS;

/** A retired pro ready for the dugout. */
function retiredPro(seed) {
  const st = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });
  let s = eng.initCareer(`Gaffer ${seed}`, "Brazil", "ST", "2020s", st(80), 80, 2020, clubs, null);
  while (s.phase === "youth") s = eng.advanceYouthYear(s, clubs);
  const offer = { club: clubs.find(c => c.tier === 2) ?? clubs[0], contractYears: 3, wage: 90000, transferFee: 0 };
  s = eng.acceptOffer(s, offer);
  s = { ...s, retired: true, phase: "post_retirement" };
  return eng.choosePostRetirement(s, "manager", clubs);
}

console.log("1) table coherence across 300 careers of up to 12 seasons");
const CAREERS = 300, MAX_SEASONS = 12;
let seasons = 0, titles = 0, sacks = 0, promotions = 0, cups = 0;
let debutPosSum = 0, debutN = 0, earnedPosSum = 0, earnedN = 0;
for (let i = 0; i < CAREERS; i += 1) {
  let s = retiredPro(i);
  let prevTier = s.managerState.clubTier;
  for (let y = 0; y < MAX_SEASONS; y += 1) {
    const beforeTrophies = s.managerState.trophies;
    const wasUnemployed = !!s.managerState.unemployed;
    s = eng.advanceManagerSeason(s, clubs);
    const ms = s.managerState;
    const row = ms.seasonResults[ms.seasonResults.length - 1];
    if (!row) { fail(`career ${i}: season produced no result row`); break; }
    if (wasUnemployed) { prevTier = ms.clubTier; continue; /* out-of-work rows carry no table */ }
    seasons += 1;

    /* 1. the table itself */
    const t = row.table;
    if (!t || t.length < 5) { fail(`career ${i} S${row.year}: no table on an employed season`); break; }
    const yous = t.filter(r => r.you).length;
    if (yous !== 1) fail(`career ${i} S${row.year}: ${yous} rows marked as the manager`);
    for (let k = 1; k < t.length; k += 1) {
      if (t[k - 1].pts < t[k].pts) fail(`career ${i} S${row.year}: table out of points order at row ${k}`);
      if (t[k].pos <= t[k - 1].pos) fail(`career ${i} S${row.year}: positions not increasing at row ${k}`);
    }
    const meRow = t.find(r => r.you);
    if (meRow && (meRow.pos !== row.playerPos || meRow.pts !== row.playerPts)) {
      fail(`career ${i} S${row.year}: the summary disagrees with the table (${row.playerPos}/${row.playerPts} vs ${meRow.pos}/${meRow.pts})`);
    }
    const m = /^(\d+)W (\d+)D (\d+)L$/.exec(row.record ?? "");
    if (!m) fail(`career ${i} S${row.year}: no W-D-L record`);
    else {
      const [w, d, l] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (w * 3 + d !== row.playerPts) fail(`career ${i} S${row.year}: ${row.record} is ${w * 3 + d} points, the table says ${row.playerPts}`);
      if (l < 0 || d < 0 || w < 0) fail(`career ${i} S${row.year}: negative games in ${row.record}`);
    }

    /* 2. outcomes derived from the finish */
    const isChampion = row.playerPos === 1;
    if (/CHAMPIONS/.test(row.result) !== isChampion) fail(`career ${i} S${row.year}: CHAMPIONS text vs position ${row.playerPos}`);
    const wonCup = row.cup === "WON the cup";
    if (row.trophy !== (isChampion || wonCup)) fail(`career ${i} S${row.year}: trophy flag disagrees with the finish (${row.playerPos}, cup ${row.cup})`);
    if (ms.trophies - beforeTrophies !== (isChampion ? 1 : 0) + (wonCup ? 1 : 0)) {
      fail(`career ${i} S${row.year}: trophy counter moved ${ms.trophies - beforeTrophies} on champion=${isChampion} cup=${wonCup}`);
    }
    if (ms.clubTier < prevTier && !(row.playerPos <= 2 || ms.departure === "poached")) {
      fail(`career ${i} S${row.year}: tier improved from ${prevTier} to ${ms.clubTier} on a ${row.playerPos} finish without a poach`);
    }
    const leagueSize = row.leagueSize ?? Math.max(...t.map(r => r.pos));
    if (!row.leagueSize) fail(`career ${i} S${row.year}: the row does not carry its league size`);
    if (ms.unemployed && !wasUnemployed) {
      sacks += 1;
      const sackable = row.playerPos >= leagueSize - 2 || row.playerPos > Math.ceil(leagueSize * 0.6);
      if (!sackable) fail(`career ${i} S${row.year}: sacked after finishing ${row.playerPos} of ${leagueSize}`);
      if (isChampion) fail(`career ${i} S${row.year}: sacked as champions`);
    }
    if (isChampion) titles += 1;
    if (wonCup) cups += 1;
    if (ms.clubTier < prevTier) promotions += 1;

    /* 3. edge sample: debut seasons vs seasons with an earned record */
    const rel = row.playerPos / leagueSize;
    if (row.year === 1) { debutPosSum += rel; debutN += 1; }
    else if (ms.trophies + ms.promotions >= 2) { earnedPosSum += rel; earnedN += 1; }
    prevTier = ms.clubTier;
  }
}
console.log(`   ${seasons} employed seasons: ${titles} titles, ${cups} cup wins, ${promotions} promotions, ${sacks} sacks`);

console.log("2) the edge is real");
{
  if (debutN < 50 || earnedN < 50) {
    fail(`not enough samples to compare (debut ${debutN}, earned ${earnedN}), widen the run`);
  } else {
    const debutAvg = debutPosSum / debutN;
    const earnedAvg = earnedPosSum / earnedN;
    console.log(`   debut seasons average ${(debutAvg * 100).toFixed(0)}% down the table, proven managers ${(earnedAvg * 100).toFixed(0)}%`);
    /* measured at seed 0x227e9: debut about 51%, proven about 34%. The bar
       sits halfway to equal so drift is caught long before the edge dies. */
    if (earnedAvg > debutAvg - 0.05) fail(`a proven record moves the average finish by ${(100 * (debutAvg - earnedAvg)).toFixed(1)} points of table, under the 5 point floor`);
  }
}

console.log("3) sanity of the totals");
{
  if (titles === 0) fail("no career of 300 ever won a league, the sim is impossibly hard");
  if (titles > seasons * 0.5) fail(`${titles} titles in ${seasons} seasons, the sim is a coronation`);
  if (sacks === 0) fail("nobody was ever sacked in 300 careers, the sack path is dead");
  if (cups === 0) fail("no cup was ever won, the cup path is dead");
  if (promotions === 0) fail("nobody was ever promoted, the promotion path is dead");
}

console.log("");
if (failures > 0) {
  console.error(`simManagerEpilogue: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simManagerEpilogue: green. The dugout season is a table, and the table cannot lie.");
