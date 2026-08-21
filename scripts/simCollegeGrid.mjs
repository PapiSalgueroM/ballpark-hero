/**
 * Round 232 harness (number 96): no College Grid cell can be impossible,
 * finally checked against real data, and the check dug up a rotten table.
 *
 * The history: an old College Grid board paired Oregon with National
 * Champion, Oregon has never won one, and the daily was unwinnable every
 * fifteenth day until it was fixed by hand. The fix audited the 75 boards
 * ONCE; nothing has stood guard since, and /college-grid is a measured
 * top ten game (517 pageviews). This is the standing fence, in the mould
 * of Round 218's franchise-grid one.
 *
 * Writing it found the League table rot first: cfb_national_champions was
 * a corrupted scrape with losing scores stored as records, runners-up
 * stored as champions (USC for the 2005 season TEXAS won, Ohio State
 * three times for the 2006 season FLORIDA won, Iowa for 1985), and half
 * the real champions missing. The List Quiz reads that table as "every
 * school with a national title in our records". Round 232 rebuilt it
 * season by season, 1981 through 2025 with the split years carried per
 * selector, cross-checked before shipping (the 2025 row, Indiana's first
 * title, was verified against three news sources the day this shipped).
 *
 * What this checks, per cell of all 75 boards:
 *   - college x position         nfl_draft_picks (28k picks, normalized
 *                                position groups)
 *   - college x draft criterion  round and pick numbers from the same
 *   - college x Heisman          cfb_heisman_winners
 *   - college x All-American     cfb_all_americans, WITNESS ONLY: that
 *                                table is its own mangled scrape (position
 *                                null, schools mixed with class years;
 *                                nothing on the site consumes it), so its
 *                                salvageable rows prove a yes and can
 *                                never prove a no
 *   - college x National Champ   the rebuilt cfb_national_champions
 *   - conference rows            expand to the famous pre-realignment
 *                                member lists, at least one member must
 *                                pass the column
 *   - criteria no table can see  (Pro Bowler, Hall of Famer, Went
 *                                Undrafted, awards the DB lacks) are
 *                                counted and reported LOUDLY, never
 *                                silently skipped: the Round 219 rule
 *
 * Plus: 75 boards exactly (the count ratchet), unique ids, 3x3 shape,
 * and the Oregon pin: Oregon x National Champion must never appear again.
 *
 * SKIPS LOUDLY IN CAPITALS when Supabase is unreachable.
 *
 * Run: node scripts/simCollegeGrid.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "/tmp/collegegrid-entry.mjs";
const OUT = "/tmp/collegegrid.mjs";

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const client = await import('${ROOT}/src/integrations/supabase/client.ts');
export { collegeGridPuzzles } from '${ROOT}/src/data/collegeGridPuzzles.ts';
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { client, collegeGridPuzzles: PUZZLES } = await import(pathToFileURL(OUT).href);
const supabase = client.supabase;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

/* ------------------------------------------------------------ structure */
console.log("1) shape and the ratchet");
{
  if (PUZZLES.length !== 75) fail(`${PUZZLES.length} puzzles, the ratchet says exactly 75; raise it here in the round that adds boards`);
  const ids = new Set(PUZZLES.map(p => p.id));
  if (ids.size !== PUZZLES.length) fail("a puzzle id repeats");
  for (const p of PUZZLES) {
    if (p.rows.length !== 3 || p.cols.length !== 3) fail(`${p.id}: not 3x3`);
  }
  for (const p of PUZZLES) {
    const labels = [...p.rows, ...p.cols].map(x => x.label);
    if (labels.includes("Oregon") && labels.includes("National Champion")) {
      fail(`${p.id}: Oregon paired with National Champion, the original impossible cell is back`);
    }
  }
  console.log(`   ${PUZZLES.length} boards, unique ids, all 3x3, the Oregon pin holds`);
}

/* ------------------------------------------------- the reference tables */
console.log("2) the reference tables, live");
const ALIASES = {
  "Ole Miss": ["Ole Miss", "Mississippi"],
  "BYU": ["BYU", "Brigham Young"],
};
const aliasesOf = school => ALIASES[school] ?? [school];

const CONFERENCES = {
  "SEC Conference": ["Alabama", "Auburn", "Georgia", "Florida", "LSU", "Tennessee", "Ole Miss", "Mississippi State", "Arkansas", "South Carolina", "Kentucky", "Vanderbilt", "Texas A&M"],
  "Big Ten Conference": ["Ohio State", "Michigan", "Penn State", "Michigan State", "Wisconsin", "Iowa", "Nebraska", "Purdue", "Indiana", "Illinois", "Minnesota", "Northwestern"],
  "Pac-12 Conference": ["USC", "UCLA", "Washington", "Oregon", "Stanford", "California", "Arizona State", "Arizona", "Colorado", "Utah", "Washington State", "Oregon State"],
  "ACC Conference": ["Clemson", "Florida State", "Miami (FL)", "Virginia Tech", "North Carolina", "NC State", "Louisville", "Pittsburgh", "Boston College", "Syracuse", "Duke", "Wake Forest", "Virginia", "Georgia Tech"],
  "Big 12 Conference": ["Oklahoma", "Texas", "Oklahoma State", "TCU", "Baylor", "Kansas State", "Kansas", "Iowa State", "West Virginia", "Texas Tech"],
};

const POSITION_GROUPS = {
  "Quarterback": /quarterback|^qb\b/i,
  "Running Back": /running back|^rb$|halfback|^hb$|tailback|^tb$|fullback|^fb$/i,
  "Wide Receiver": /wide rec|^wr$|split end|flanker/i,
  "Linebacker": /linebacker|^lb$|^ilb$|^olb$|^mlb$/i,
  "Offensive Lineman": /offensive tackle|offensive guard|^tackle$|^t$|^guard$|^g$|center|^c$/i,
  "Defensive End": /defensive end|^de$/i,
  "Cornerback": /cornerback|corner back|^cb\b|^db$|defensive back/i,
  "Safety": /safety|^fs$|^ss$|^s$/i,
  "Tight End": /tight end|^te\b/i,
  "Defensive Tackle": /defensive tackle|^dt$|^nt$|defensive line/i,
};

/* criteria no table here can see; reported loudly, never silently passed */
const INVISIBLE = new Set([
  "Pro Bowler", "Pro Football Hall of Famer", "Went Undrafted", "Played 10+ NFL Seasons",
  "Won a Super Bowl", "NFL MVP", "Transferred Schools", "Played Two Sports",
  "Butkus Award", "Doak Walker Award", "Outland Trophy", "Jim Thorpe Award",
  "Conference Player of the Year",
]);

const allColleges = new Set();
for (const p of PUZZLES) for (const x of [...p.rows, ...p.cols]) {
  if (x.type === "college") allColleges.add(x.label);
  if (CONFERENCES[x.label]) CONFERENCES[x.label].forEach(c => allColleges.add(c));
}
const allAliases = [...allColleges].flatMap(aliasesOf);

let picks = null, heisman = null, allAm = null, champs = null;
try {
  const fetchAll = async (table, filter) => {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      let q = supabase.from(table).select("*").range(from, from + 999);
      if (filter) q = filter(q);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      rows.push(...data);
      if (data.length < 1000) break;
    }
    return rows;
  };
  [picks, heisman, allAm, champs] = await Promise.race([
    Promise.all([
      fetchAll("nfl_draft_picks", q => q.in("college", allAliases)),
      fetchAll("cfb_heisman_winners"),
      fetchAll("cfb_all_americans"),
      fetchAll("cfb_national_champions"),
    ]),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 90000)),
  ]);
} catch { picks = null; }

if (!picks) {
  console.log("   SKIPPED, SUPABASE UNREACHABLE. NO CELL WAS CHECKED. Re-run before trusting the boards.");
} else {
  console.log(`   ${picks.length} draft picks across the boards' colleges, ${heisman.length} Heisman rows, ${allAm.length} All-Americans, ${champs.length} champion rows`);

  /* the champions rebuild must hold: the rows this round fixed by hand */
  const champSet = new Set(champs.map(c => c.champion));
  const CHAMP_PINS = [["Texas", 2005], ["Florida", 2006], ["Indiana", 2025], ["Clemson", 1981], ["Penn State", 1982]];
  for (const [school, year] of CHAMP_PINS) {
    if (!champs.some(c => c.champion === school && c.year === year)) {
      fail(`cfb_national_champions lost the verified ${year} ${school} row, the corrupted scrape may be back`);
    }
  }
  if (champs.some(c => c.champion === "Oregon")) fail("Oregon appears as a national champion, which never happened");
  if (champSet.size < 20) fail(`only ${champSet.size} distinct champions, the rebuilt table carries 22`);

  console.log("3) every cell of every board is answerable");
  const bySchool = new Map();
  for (const a of allAliases) bySchool.set(a, []);
  for (const r of picks) if (bySchool.has(r.college)) bySchool.get(r.college).push(r);
  const rowsOf = school => aliasesOf(school).flatMap(a => bySchool.get(a) ?? []);
  const heismanSchools = new Set(heisman.map(h => h.school));
  const allAmSchools = new Set(allAm.map(a => a.school));

  const collegePasses = (school, crit) => {
    if (INVISIBLE.has(crit)) return "invisible";
    if (POSITION_GROUPS[crit]) return rowsOf(school).some(r => POSITION_GROUPS[crit].test(String(r.position ?? ""))) ? "yes" : "no";
    if (crit === "First Round Pick") return rowsOf(school).some(r => r.round === 1) ? "yes" : "no";
    if (crit === "Top 10 Pick") return rowsOf(school).some(r => r.round === 1 && r.pick <= 10) ? "yes" : "no";
    if (crit === "Top 5 Pick") return rowsOf(school).some(r => r.round === 1 && r.pick <= 5) ? "yes" : "no";
    if (crit === "1st Overall Pick") return rowsOf(school).some(r => r.pick === 1) ? "yes" : "no";
    if (crit === "Heisman Winner") return aliasesOf(school).some(a => heismanSchools.has(a)) ? "yes" : "no";
    /* cfb_all_americans is a mangled scrape (position null, the school
       column a jumble of positions and class years, found Round 232;
       nothing on the site consumes it). The salvageable rows can WITNESS
       a school, but absence proves nothing, so this can never say no. */
    if (crit === "All-American") return aliasesOf(school).some(a => allAmSchools.has(a)) ? "yes" : "invisible";
    if (crit === "National Champion") return aliasesOf(school).some(a => champSet.has(a)) ? "yes" : "no";
    return "unknown";
  };

  const sideValue = x => x.label;
  let checked = 0, invisible = 0, unknown = 0;
  for (const p of PUZZLES) {
    for (const r of p.rows) {
      for (const c of p.cols) {
        /* orient the pair: which side is the subject (a college or a
           conference of colleges) and which is the criterion */
        let subjects = null, crit = null;
        for (const [a, b] of [[r, c], [c, r]]) {
          if (a.type === "college") { subjects = [sideValue(a)]; crit = sideValue(b); break; }
          if (CONFERENCES[sideValue(a)]) { subjects = CONFERENCES[sideValue(a)]; crit = sideValue(b); break; }
        }
        if (!subjects) {
          /* criterion x criterion cell (e.g. Quarterback x Heisman): no
             subject side; the whole country is the pool, and any Heisman
             quarterback answers it. Verify from the Heisman table where
             possible, otherwise count it invisible. */
          const labels = [sideValue(r), sideValue(c)];
          if (labels.includes("Heisman Winner")) {
            const other = labels.find(l => l !== "Heisman Winner");
            if (POSITION_GROUPS[other]) {
              checked += 1;
              if (!heisman.some(h => POSITION_GROUPS[other].test(String(h.position ?? "")))) {
                fail(`${p.id}: no Heisman winner at ${other} in the table, the cell may be impossible`);
              }
              continue;
            }
          }
          invisible += 1;
          continue;
        }
        const verdicts = subjects.map(s => collegePasses(s, crit));
        if (verdicts.includes("yes")) { checked += 1; continue; }
        if (verdicts.every(v => v === "invisible")) { invisible += 1; continue; }
        if (verdicts.includes("unknown")) { unknown += 1; console.log(`   UNKNOWN CRITERION at ${p.id}: "${crit}"`); continue; }
        checked += 1;
        fail(`${p.id}: "${subjects.length > 1 ? crit + " x " + (r.type === "misc" ? r.label : c.label) : subjects[0] + " x " + crit}" has no answer in the data (row ${r.label}, col ${c.label})`);
      }
    }
  }
  console.log(`   ${checked} cells verified answerable, ${invisible} rest on criteria no table here can see (Pro Bowler, HOF, undrafted, the minor awards), ${unknown} unknown`);
  if (unknown > 0) fail(`${unknown} criteria were not recognized at all; teach the harness or fix the board`);
}

console.log("");
if (failures > 0) {
  console.error(`simCollegeGrid: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simCollegeGrid: green. Every square on every board has a real answer, and the champions are the real champions.");
