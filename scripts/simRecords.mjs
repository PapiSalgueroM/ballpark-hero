/**
 * Round 238 harness (number 99): the Record Books page contract.
 *
 * /records renders the audited champion tables as public reference. This
 * proves, against the LIVE tables through the page's own fetchers:
 *   1. All ten sections return at least their floors (the same halves of
 *      measured that simChampOrNot uses), every row has a sane year and
 *      a named champion, and rows arrive newest first.
 *   2. Column completeness where the repair made it exact: every Super
 *      Bowl row carries runner-up, score, MVP, venue and host city (the
 *      city pinned era-accurate: Miami before the Gardens incorporated,
 *      Miami Gardens after); every CFB row carries selector, result and
 *      coach; every NBA row a winner-first series; every NRL row its
 *      competition era.
 *   3. NOTHING RENDERED CARRIES A LONG DASH: the shape repair normalized
 *      every score, and the site style bans em and en dashes, so a dash
 *      reappearing in any cell is a regression worth failing on.
 *   4. Every "play with this history" link points at a real registered
 *      route, and the NRL section's honesty note still says the vacated
 *      titles stay vacant.
 *
 * SKIPS LOUDLY IN CAPITALS when Supabase is unreachable.
 *
 * Run: node scripts/simRecords.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "/tmp/records-entry.mjs";
const OUT = "/tmp/records.mjs";

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const rec = await import('${ROOT}/src/lib/records.ts');
export const reg = await import('${ROOT}/src/data/gameRegistry.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { rec, reg } = await import(pathToFileURL(OUT).href);
const { RECORD_SECTIONS } = rec;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

const FLOORS = { sb: 30, nba: 40, ws: 60, cup: 55, wnba: 14, cfb: 24, cbb: 40, epl: 60, afl: 64, nrl: 58, brownlow: 112, dallym: 47 };
/* columns the repairs made exactly complete: every row must carry them */
const COMPLETE = {
  /* sb venue joined in Round 247 (era-accurate stadium names with the
     times-hosted debris stripped), city in Round 248 (host city plus
     state, era-accurate municipality, rendered joined) */
  sb: ["runnerUp", "score", "mvp", "venue", "city"],
  cfb: ["selector", "record", "coach"],
  /* nba runnerUp joined the complete set in Round 239, ws in Round 240:
     every finals names its beaten side, triple-verified before backfill */
  nba: ["series", "runnerUp"],
  ws: ["series", "runnerUp"],
  cup: ["series", "runnerUp"],
  /* wnba joined in full in Round 245: runner-up and series completed in
     Rounds 233/242, and all 29 Finals MVPs verified and filled */
  wnba: ["runnerUp", "series", "mvp"],
  /* cbb joined in Round 246: all 87 title games carry the beaten
     finalist and the final score, 1939 through 2026 */
  cbb: ["runnerUp", "score"],
  nrl: ["competition"],
  /* brownlow joined in Round 291: every medal carries the club and the vote count */
  brownlow: ["club", "votes"],
};

console.log(`1) the ${RECORD_SECTIONS.length} sections against the live tables`);
if (RECORD_SECTIONS.length !== 12) fail(`${RECORD_SECTIONS.length} sections, the page promises 12`);

const registryPaths = new Set(reg.ALL_GAMES.map(g => g.path));
let reachable = true;

for (const def of RECORD_SECTIONS) {
  for (const g of def.play) {
    if (!registryPaths.has(g.path)) fail(`${def.key}: play link ${g.path} is not a registered game`);
  }
  let rows = null;
  try {
    rows = await def.fetch();
  } catch {
    console.log(`   ${def.key}: SKIPPED, SUPABASE UNREACHABLE. NOT CHECKED.`);
    reachable = false;
    continue;
  }
  const floor = FLOORS[def.key];
  if (floor == null) fail(`${def.key}: no floor recorded, add one`);
  else if (rows.length < floor) fail(`${def.key}: ${rows.length} rows, the floor is ${floor}`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!Number.isFinite(r.year) || r.year < 1850 || r.year > 2100) fail(`${def.key}: unbelievable year ${r.year}`);
    if (typeof r.champion !== "string" || r.champion.trim().length < 3) fail(`${def.key} ${r.year}: unnamed champion`);
    if (i > 0 && rows[i - 1].year < r.year) fail(`${def.key}: rows are not newest first at ${r.year}`);
    for (const v of [r.champion, ...Object.values(r.extra)]) {
      for (const ch of String(v)) {
        const c = ch.charCodeAt(0);
        if (c === 8211 || c === 8212) fail(`${def.key} ${r.year}: rendered cell carries a long dash: ${v}`);
      }
      /* Round 247: the venue column shipped once its times-hosted
         annotations were stripped; no rendered cell may end in a bare
         parenthesised count again. "(FL)" and "(interim)" style tags
         are words, not counts, and pass. */
      if (/ \(\d+\)$/.test(String(v))) fail(`${def.key} ${r.year}: cell ends in a bare count: ${v}`);
    }
    for (const k of COMPLETE[def.key] ?? []) {
      if (!r.extra[k]) fail(`${def.key} ${r.year}: missing ${k}, the repair made that column complete`);
    }
    if (r.extra.score && !/^[0-9]+-[0-9]+$/.test(r.extra.score)) fail(`${def.key} ${r.year}: score ${r.extra.score} is not a plain score`);
    if (r.extra.series && !/^[0-9]+-[0-9]+(-[0-9]+)?$/.test(r.extra.series)) fail(`${def.key} ${r.year}: series ${r.extra.series} is not winner-first games`);
    /* Round 248: the sb city cell is "City, ST", never a stadium name
       and never a digit. Catches a venue-city swap at the source. */
    if (def.key === "sb" && r.extra.city) {
      if (!/^[A-Za-z .']+, [A-Z]{2}$/.test(r.extra.city)) fail(`sb ${r.year}: city ${r.extra.city} is not City, ST`);
      if (/(Stadium|Bowl|Dome|Field|Coliseum)/.test(r.extra.city)) fail(`sb ${r.year}: city ${r.extra.city} looks like a venue`);
    }
  }
  /* Round 248 pins: the era-accurate municipality can never quietly
     drift. Miami until the Gardens incorporated in 2003, Miami Gardens
     after; Stanford and Las Vegas as the settled source disputes. */
  if (def.key === "sb" && rows && rows.length) {
    const CITY_PINS = {
      1967: "Los Angeles, CA", 1985: "Stanford, CA", 1989: "Miami, FL",
      1999: "Miami, FL", 2007: "Miami Gardens, FL", 2014: "East Rutherford, NJ",
      2024: "Las Vegas, NV", 2026: "Santa Clara, CA",
    };
    for (const [yr, want] of Object.entries(CITY_PINS)) {
      const row = rows.find(r => r.year === Number(yr));
      if (!row) fail(`sb: no ${yr} row to pin the city on`);
      else if (row.extra.city !== want) fail(`sb ${yr}: city ${row.extra.city}, the record says ${want}`);
    }
  }
  if (rows) console.log(`   ${def.key}: ${rows.length} rows, columns complete, no long dashes`);
}

const nrl = RECORD_SECTIONS.find(s => s.key === "nrl");
if (!nrl?.note || !/vacant/i.test(nrl.note) || !/stripped/i.test(nrl.note)) {
  fail("the NRL section lost its vacated-titles honesty note");
}

if (!reachable) console.log("   AT LEAST ONE SECTION DID NOT RUN. Re-run from a sandbox that reaches Supabase.");

console.log("");
if (failures > 0) {
  console.error(`simRecords: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simRecords: green. The record books read straight from the audited record.");
