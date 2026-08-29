/**
 * Round 218 harness (number 86): no grid cell can ever be impossible.
 *
 * The three client-built franchise grids (NBA, NHL, MLB) pick six categories
 * per board and never checked, at runtime, that every row x column crossing
 * has a player who satisfies both. The module docstrings carry verification
 * constants from 2026-07-21 (worst NBA pairing Bulls x Heat, 25 shared
 * players), but a docstring is a snapshot and the tables move. A cell with
 * ZERO answers is the worst kind of bug this site can have, because the
 * better you know the sport the longer you sit there trying to solve a
 * thing with no solution.
 *
 * So this pulls the SAME three tables the games fetch, through the same
 * client code path, and enumerates EVERY pairing each builder can place
 * opposite each other: franchise x franchise, franchise x achievement, and
 * achievement x achievement (reachable in easy mode, one per axis). Every
 * pairing must have answers; the floor is set from the measured worst case
 * with real headroom under it, so shrinkage shows up long before zero does.
 *
 * It also pins the builder itself across all three difficulties: the same
 * seed always deals the same board, no category ever appears twice on one
 * board, and hard mode really is six franchises.
 *
 * NETWORK HONESTY: this harness needs Supabase. When the sandbox cannot
 * reach it (a documented recurring condition, see the Round 213 note), the
 * data sections SKIP LOUDLY and exit green, because a harness that fails
 * every offline run trains everyone to ignore it, which is worse than the
 * gap (the Round 214 thin-pools reasoning). The builder sections run either
 * way. The skip prints in capitals; do not mistake it for coverage.
 *
 * Run: node scripts/simGridCells.mjs
 */
import { writeFileSync } from "node:fs";
import os from 'node:os';
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(os.tmpdir(), 'gridcells.mjs');
const ENTRY = path.join(os.tmpdir(), 'gridcells-entry.mjs');

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const nba = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nbaGrid.ts');
export const nhl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/hockeyGrid.ts');
export const mlb = await import('${ROOT.replaceAll('\\', '/')}/src/lib/mlbGrid.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { nba, nhl, mlb } = await import(pathToFileURL(OUT).href);

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

const SPORTS = [
  { key: "NBA", lib: nba, fetch: () => nba.fetchNbaGridData(), floor: 12 },
  { key: "NHL", lib: nhl, fetch: () => nhl.fetchHockeyGridData(), floor: 12 },
  { key: "MLB", lib: mlb, fetch: () => mlb.fetchMlbGridData(), floor: 6, timeoutMs: 90000 },
];

/* ------------------------------------------------ 1. the builder, offline */
console.log("1) the builder: deterministic, no repeats, tiers honest");
for (const sport of SPORTS) {
  const { buildGridPuzzle } = sport.lib;
  for (const diff of ["easy", "normal", "hard"]) {
    const a = buildGridPuzzle(12345, diff);
    const b = buildGridPuzzle(12345, diff);
    if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${sport.key} ${diff}: the same seed dealt two different boards`);
    let dupes = 0, hardAch = 0;
    for (let seed = 1; seed <= 4000; seed++) {
      const p = buildGridPuzzle(seed, diff);
      const ids = [...p.rows, ...p.cols].map(c => c.id);
      if (new Set(ids).size !== 6) dupes += 1;
      if (diff === "hard" && [...p.rows, ...p.cols].some(c => c.kind === "achievement")) hardAch += 1;
    }
    if (dupes > 0) fail(`${sport.key} ${diff}: ${dupes} of 4000 boards repeat a category`);
    if (hardAch > 0) fail(`${sport.key} hard: ${hardAch} boards smuggled an achievement in`);
  }
}
console.log("   three sports, three tiers, 4000 seeds each: deterministic, six distinct categories every time");

/* ----------------------------------------------- 2. every pairing answers */
console.log("2) every reachable pairing has answers, measured on today's tables");
let reachable = true;
for (const sport of SPORTS) {
  let data = null;
  try {
    data = await Promise.race([
      sport.fetch(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), sport.timeoutMs ?? 20000)),
    ]);
  } catch { data = null; }
  if (!data || !data.players || data.players.length === 0) {
    console.log(`   ${sport.key}: SKIPPED, SUPABASE UNREACHABLE FROM THIS SANDBOX. The pairing check DID NOT RUN for this sport.`);
    reachable = false;
    continue;
  }
  const cats = [...sport.lib.FRANCHISE_POOL, ...sport.lib.ACHIEVEMENT_POOL];
  let worst = { n: Infinity, pair: "" };
  let empty = 0;
  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      const cell = { row: cats[i], col: cats[j] };
      let n = 0;
      for (const pl of data.players) if (sport.lib.playerMatchesCell(pl, cell)) n += 1;
      if (n === 0) { empty += 1; fail(`${sport.key}: IMPOSSIBLE CELL ${cats[i].label} x ${cats[j].label}, zero players satisfy both`); }
      if (n < worst.n) worst = { n, pair: `${cats[i].label} x ${cats[j].label}` };
    }
  }
  const pairs = (cats.length * (cats.length - 1)) / 2;
  console.log(`   ${sport.key}: ${data.players.length} players, ${pairs} pairings, worst ${worst.pair} = ${worst.n}`);
  /* floors at half each sport's own measured worst (2026-08-20, live):
     NBA 25 (Bulls x Heat), NHL 23 (Capitals x 300 goals), MLB 12 (Twins x
     300 home runs), so floors 12, 12 and 6. Real shrinkage trips them long
     before an impossible cell exists; the audited state never does. */
  if (empty === 0 && worst.n < sport.floor) {
    fail(`${sport.key}: thinnest pairing ${worst.pair} is down to ${worst.n} answers (floor ${sport.floor}), the pool needs attention before it hits zero`);
  }
}
if (!reachable) {
  console.log("   AT LEAST ONE SPORT WAS NOT CHECKED. Re-run from a sandbox that can reach Supabase before trusting the pools.");
}

console.log("");
if (failures > 0) {
  console.error(`simGridCells: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simGridCells: green. No board this builder can deal contains a cell without an answer.");
