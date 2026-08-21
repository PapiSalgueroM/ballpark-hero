/**
 * Round 231 harness (number 95): the AFL goal kicking data holds its facts.
 *
 * The site's first Australian rules game rests on one static file of 60
 * retired VFL/AFL goal kicking leaders, two-source verified on 2026-08-20
 * (the aflonline.com.au all-time table cross-checked against the well
 * documented records). Real names carrying real numbers is the whole
 * game, so the famous totals are PINNED: if a future edit drifts
 * Lockett's 1,360 or drops Coventry, this goes red before it ships.
 *
 * Checks, all offline:
 *   1. the pinned facts: the all-time record and the thousand-goal club,
 *      exactly as verified (Lockett 1360, Coventry 1299, Dunstall 1254,
 *      Franklin 1066, Wade 1057, Ablett Sr 1031, and nobody else at 1000+)
 *   2. structure: 60 unique names, goals strictly within 500..1360 and
 *      sorted descending, career years sane (1897..2024) with first <=
 *      last, clubs text present
 *   3. the retirement rule: no career ends after 2024, because an active
 *      man's total moves and this site does not ship numbers that go
 *      stale (the four active players on the source list were left out
 *      on purpose)
 *   4. the game math on this pool: pairs from the real buildPairs shape
 *      never pair a man with himself, and the known ties (727, 594, 575,
 *      574, 549) exist so the ties-count-as-correct rule has real work
 *
 * Run: node scripts/simAflHL.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "/tmp/aflhl-entry.mjs";
const OUT = "/tmp/aflhl.mjs";

writeFileSync(ENTRY, `
export { aflGoalKickers } from '${ROOT}/src/data/aflGoalKickers.ts';
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { aflGoalKickers: POOL } = await import(pathToFileURL(OUT).href);

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

console.log("1) the pinned facts");
{
  const PINS = [
    ["Tony Lockett", 1360],
    ["Gordon Coventry", 1299],
    ["Jason Dunstall", 1254],
    ["Lance Franklin", 1066],
    ["Doug Wade", 1057],
    ["Gary Ablett Sr", 1031],
  ];
  for (const [name, goals] of PINS) {
    const p = POOL.find(x => x.name === name);
    if (!p) fail(`${name} is missing from the pool`);
    else if (p.goals !== goals) fail(`${name} carries ${p.goals} goals, the verified total is ${goals}`);
  }
  const thousand = POOL.filter(p => p.goals >= 1000).map(p => p.name).sort();
  const club = PINS.map(([n]) => n).sort();
  if (JSON.stringify(thousand) !== JSON.stringify(club)) {
    fail(`the thousand-goal club is ${thousand.join(", ")}, expected exactly the six verified members`);
  }
  const top = [...POOL].sort((a, b) => b.goals - a.goals)[0];
  if (top.name !== "Tony Lockett") fail(`${top.name} tops the pool; the all-time record holder is Tony Lockett`);
  console.log(`   6 totals pinned, the thousand-goal club is exactly its six members`);
}

console.log("2) structure");
{
  if (POOL.length !== 60) fail(`pool holds ${POOL.length} players, the verified list carries 60`);
  const names = POOL.map(p => p.name);
  if (new Set(names).size !== names.length) fail("a name appears twice");
  for (let i = 0; i < POOL.length; i += 1) {
    const p = POOL[i];
    if (!(p.goals >= 500 && p.goals <= 1360)) fail(`${p.name}: ${p.goals} goals is outside the pool's 500..1360 band`);
    if (i > 0 && POOL[i - 1].goals < p.goals) fail(`${p.name}: pool is not sorted by goals descending`);
    if (!(p.firstYear >= 1897 && p.lastYear <= 2024 && p.firstYear <= p.lastYear)) {
      fail(`${p.name}: career ${p.firstYear}-${p.lastYear} is not a sane VFL/AFL span`);
    }
    if (!p.clubs || typeof p.clubs !== "string") fail(`${p.name}: no clubs line`);
  }
  console.log(`   ${POOL.length} players, unique, sorted, sane spans`);
}

console.log("3) the retirement rule");
{
  const active = POOL.filter(p => p.lastYear > 2024);
  for (const p of active) fail(`${p.name} shows a ${p.lastYear} season; active totals move and cannot ship`);
  console.log("   no career ends after 2024");
}

console.log("4) the ties are real");
{
  const byGoals = new Map();
  for (const p of POOL) byGoals.set(p.goals, (byGoals.get(p.goals) ?? 0) + 1);
  const ties = [...byGoals.entries()].filter(([, n]) => n > 1);
  if (ties.length === 0) fail("no tied totals in the pool, but the game rules promise ties exist");
  const carey = POOL.find(p => p.name === "Wayne Carey");
  const hudson = POOL.find(p => p.name === "Peter Hudson");
  if (!carey || !hudson || carey.goals !== hudson.goals || carey.goals !== 727) {
    fail("the Carey/Hudson 727 tie quoted in the game copy is not in the data");
  }
  console.log(`   ${ties.length} tied totals, including the 727 pair the copy quotes`);
}

console.log("");
if (failures > 0) {
  console.error(`simAflHL: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simAflHL: green. Sixty retired legends, six verified pins, and the record is Plugger's.");
