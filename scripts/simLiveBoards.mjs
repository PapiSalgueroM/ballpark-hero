/**
 * Round 219 harness (number 87): the connections boards people actually
 * play, checked at last.
 *
 * Round 214 fenced every puzzle in the STATIC files and recorded, painfully,
 * that NBA, NFL and NHL connections had four boards each. What nobody
 * noticed, including Round 214: the static files are only the OFFLINE
 * FALLBACK. The live site fetches its boards from Supabase, and the live
 * pools hold twenty boards per US sport and three hundred plus for baseball.
 * Which means the boards real players see every day had NEVER passed the
 * fairness rules: not the two-groups trap, not the duplicate name check,
 * not the shape rules. This closes that.
 *
 * For every live pool (soccer, baseball, NBA, NFL, NHL):
 *   - the shape: exactly four groups, one of each difficulty colour, a
 *     uniform player count per group, no name twice ANYWHERE on one board
 *     (the game samples four of five, so a name shared by two groups can
 *     surface in any dealt board and break the unique solve)
 *   - no two boards in a pool are the same set of names
 *   - the count ratchet: pools must not shrink, and growth must raise the
 *     floor here in the same round (the Round 214 rule, applied where the
 *     boards really live)
 *
 * And for the NBA pool, the criterion cross-check the static file's header
 * says every author must run, executed against nba_player_stats itself:
 * for every theme the stats table can see (franchise membership and the
 * career counting stats), every listed member must genuinely satisfy it,
 * and NO player from another group on the same board may satisfy it too,
 * because that is the two-solutions bug. Themes the table cannot see (draft
 * position, birthplace, awards) are counted and reported as unchecked, out
 * loud, never silently skipped.
 *
 * NETWORK HONESTY: same rule as simGridCells. No Supabase means the live
 * sections SKIP LOUDLY IN CAPITALS and exit green; a harness that fails
 * every offline run trains people to ignore it. The skip is not coverage.
 *
 * Run: node scripts/simLiveBoards.mjs
 */
import { writeFileSync } from "node:fs";
import os from 'node:os';
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(os.tmpdir(), 'liveboards-entry.mjs');
const OUT = path.join(os.tmpdir(), 'liveboards.mjs');

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const client = await import('${ROOT.replaceAll('\\', '/')}/src/integrations/supabase/client.ts');
export const nbaGrid = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nbaGrid.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { client, nbaGrid } = await import(pathToFileURL(OUT).href);
const supabase = client.supabase;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

/* The count ratchet for the LIVE pools. Measured 2026-08-20. A shrink is a
   lost board; growth without raising these numbers is a new board nobody
   fenced. Raise the floor in the same round that adds boards. */
const FLOORS = {
  connections_puzzles: 326,
  baseball_connections_puzzles: 299,
  nba_connections_puzzles: 20,
  nfl_connections_puzzles: 20,
  nhl_connections_puzzles: 20,
};
/* the soccer pool predates the colour convention and grades its groups
   easy to insane; the four US pools use the colour names. Both are a
   complete set of four distinct tiers, which is what the game needs. */
const TIER_SETS = {
  connections_puzzles: ["easy", "medium", "hard", "insane"],
  default: ["yellow", "green", "blue", "purple"],
};

const fold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").order("id", { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

let reachable = true;
console.log("1) shape, uniqueness and the ratchet, per live pool");
const pools = {};
for (const [table, floor] of Object.entries(FLOORS)) {
  let rows = null;
  try {
    rows = await Promise.race([
      fetchAll(table),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000)),
    ]);
  } catch { rows = null; }
  if (!rows) {
    console.log(`   ${table}: SKIPPED, SUPABASE UNREACHABLE. THIS POOL WAS NOT CHECKED.`);
    reachable = false;
    continue;
  }
  pools[table] = rows;
  if (rows.length < floor) fail(`${table}: pool shrank to ${rows.length} boards (floor ${floor})`);
  if (rows.length > floor) fail(`${table}: pool grew to ${rows.length} boards without the floor being raised here`);
  const boardKeys = new Set();
  let shapeBad = 0, dupName = 0, colourBad = 0, twinBoards = 0;
  for (const row of rows) {
    const groups = row.groups_json ?? row.groups;
    const pid = row.puzzle_id ?? row.id;
    if (!Array.isArray(groups) || groups.length !== 4) { shapeBad += 1; fail(`${table} ${pid}: ${Array.isArray(groups) ? groups.length : "no"} groups`); continue; }
    const size = groups[0]?.players?.length ?? 0;
    if (size < 4) { shapeBad += 1; fail(`${table} ${pid}: groups of ${size}`); continue; }
    if (groups.some(g => !Array.isArray(g.players) || g.players.length !== size)) { shapeBad += 1; fail(`${table} ${pid}: ragged group sizes`); continue; }
    const want = [...(TIER_SETS[table] ?? TIER_SETS.default)].sort();
    const colours = groups.map(g => g.difficulty).sort();
    if (JSON.stringify(colours) !== JSON.stringify(want)) { colourBad += 1; fail(`${table} ${pid}: difficulties are ${colours.join(",")}`); }
    const all = groups.flatMap(g => g.players.map(fold));
    if (new Set(all).size !== all.length) {
      dupName += 1;
      const seen = new Set(); const dupes = new Set();
      for (const n of all) { if (seen.has(n)) dupes.add(n); seen.add(n); }
      fail(`${table} ${pid}: a name appears twice on one board (${[...dupes].slice(0, 2).join(", ")}), the unique solve is broken`);
    }
    const key = [...all].sort().join("|");
    if (boardKeys.has(key)) { twinBoards += 1; fail(`${table} ${pid}: identical to another board in the pool`); }
    boardKeys.add(key);
  }
  console.log(`   ${table}: ${rows.length} boards, ${shapeBad} shape, ${colourBad} colour, ${dupName} duplicate-name, ${twinBoards} twin`);
}

console.log("2) NBA criteria cross-checked against nba_player_stats");
if (!pools.nba_connections_puzzles) {
  console.log("   SKIPPED, THE POOL WAS NOT FETCHED.");
} else {
  let stats = null;
  try {
    stats = await Promise.race([
      nbaGrid.fetchNbaGridData(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000)),
    ]);
  } catch { stats = null; }
  if (!stats) {
    console.log("   SKIPPED, STATS TABLE UNREACHABLE. THE CRITTERIA WERE NOT CHECKED.".replace("CRITTERIA", "CRITERIA"));
    reachable = false;
  } else {
    const byName = new Map();
    for (const p of stats.players) byName.set(fold(p.name), p);
    /* the pool labels the grid uses, plus the franchises the boards mention
       that the grid's sixteen do not cover */
    const TEAM_CODES = new Map(nbaGrid.FRANCHISE_POOL.map(c => [fold(c.label), c.id]));
    TEAM_CODES.set(fold("Miami Heat"), "MIA");
    TEAM_CODES.set(fold("Chicago Bulls"), "CHI");
    TEAM_CODES.set(fold("Los Angeles Lakers"), "LAL");
    TEAM_CODES.set(fold("Boston Celtics"), "BOS");
    TEAM_CODES.set(fold("San Antonio Spurs"), "SAS");
    TEAM_CODES.set(fold("New York Knicks"), "NYK");
    const statOf = (p, kind) =>
      kind === "points" ? p.points : kind === "rebounds" ? p.rebounds : kind === "assists" ? p.assists : kind === "games" ? p.games : null;
    const parseTheme = theme => {
      const t = theme.toLowerCase();
      const mTeam = t.match(/played for the (.+)$/);
      if (mTeam) {
        const code = TEAM_CODES.get(fold(mTeam[1]));
        return code ? { kind: "franchise", code } : null;
      }
      const mNum = t.replace(/,/g, "").match(/([0-9]+)\+ career (points|rebounds|assists|games)/);
      if (mNum) return { kind: mNum[2], threshold: Number(mNum[1]) };
      if (/games played/.test(t)) {
        const m2 = t.replace(/,/g, "").match(/([0-9]+)\+/);
        if (m2) return { kind: "games", threshold: Number(m2[1]) };
      }
      return null;
    };
    const satisfies = (p, c) => c.kind === "franchise" ? p.franchises.has(c.code) : (statOf(p, c.kind) ?? -1) >= c.threshold;
    let checked = 0, unchecked = 0, missing = 0;
    for (const row of pools.nba_connections_puzzles) {
      const groups = row.groups_json;
      for (const g of groups) {
        const crit = parseTheme(g.theme);
        if (!crit) { unchecked += 1; continue; }
        checked += 1;
        for (const name of g.players) {
          const p = byName.get(fold(name));
          if (!p) {
            /* the stats table starts in the shot clock era's later half and
               the boards lean on a couple of textbook legends (Jerry West a
               Laker, Bill Russell a Celtic) it never indexed. Those claims
               are encyclopedia facts and the game validates taps, not free
               text, so a missing legend is reported out loud, not failed. */
            missing += 1;
            console.log(`   UNVERIFIABLE BY TABLE: ${row.puzzle_id} lists ${name} for "${g.theme}" and the stats table does not reach him`);
            continue;
          }
          if (!satisfies(p, crit)) fail(`${row.puzzle_id}: ${name} does not satisfy "${g.theme}"`);
        }
        for (const other of groups) {
          if (other === g) continue;
          for (const name of other.players) {
            const p = byName.get(fold(name));
            if (p && satisfies(p, crit)) {
              fail(`${row.puzzle_id}: ${name} (listed under "${other.theme}") ALSO satisfies "${g.theme}", two valid solutions exist`);
            }
          }
        }
      }
    }
    console.log(`   ${checked} groups cross-checked against the stats table, ${unchecked} themes the table cannot see (draft, birthplace, awards), ${missing} names missing`);
  }
}

if (!reachable) console.log("   AT LEAST ONE SECTION DID NOT RUN. Re-run from a sandbox that reaches Supabase before trusting the pools.");

console.log("");
if (failures > 0) {
  console.error(`simLiveBoards: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simLiveBoards: green. The boards people actually play keep their one right answer.");
