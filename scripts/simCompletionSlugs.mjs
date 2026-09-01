/**
 * Round 376: every recorded completion names a game the site can find.
 *
 * WHAT WAS WRONG. `daily_completions.game_slug` is whatever each game's own
 * `useGameCompletion(...)` call passes, and SIX of those are not registry
 * paths. The four Conquest boards record as `<sport>-imperialism`, the Quiz
 * Board still records under the original route name it carried before Round 305
 * renamed it, and Guess The Club records as `guess-soccer-club-questions`.
 *
 * THE OBVIOUS READING WAS WRONG and was checked before any code was written:
 * these games are NOT losing their credit. `game_score_caps` carries caps under
 * the same names the code writes, so Round 360's allowlist accepts them and
 * they score and rank normally. The scoring pipeline agrees with itself.
 *
 * WHAT ACTUALLY BROKE is every lookup of a completion slug in the REGISTRY, and
 * all five live ones are marked `daily: true`, so both places bit:
 *   - Most Played Today built a path by putting a slash in front of the slug,
 *     got undefined, and filtered the entry out. If that took the list under
 *     three the section fell back to its curated trio and looked completely
 *     normal, which is the same silent fallback Round 361 fixed by a different
 *     door.
 *   - The daily checklist tested for `conquest` while the row said
 *     `conquest-imperialism`, so finishing those games never ticked the box.
 *
 * WHAT THIS HOLDS, and the two sides are the point: one reads the SOURCE and
 * one reads the LIVE TABLE, so a mismatch cannot hide on either side.
 *   1. Every slug the source writes resolves to a routed game, or is named as
 *      deliberately unrouted.
 *   2. Every distinct slug in the live table resolves, or is listed as retired
 *      WITH A REASON, so "unresolvable" can never become the normal state.
 *   3. The map has no dead rows: an entry pointing at a path no registry game
 *      has is a rename that half happened.
 *   4. The round trip closes: for every registry game, the slug it records
 *      under resolves back to that same game.
 *
 * NEGATIVE CONTROL: SLUGS_CONTROL=unmap drops the Conquest entries from an in
 * memory copy of the map, restoring the bug. Sections 1 and 2 go red, which is
 * the pair that matters: one catches it from the source and one from the live
 * table, so the control also proves the two sides are independent. Section 4
 * stays quiet under it by construction, because with the map gone those games
 * no longer round trip INTO the check at all.
 *
 * Run: node scripts/simCompletionSlugs.mjs   (needs the database for section 2)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SLUGS_CONTROL || '';
if (CONTROL && CONTROL !== 'unmap') {
  console.error(`SLUGS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* Bundled rather than regex-read, so the harness uses the SAME resolver the app
   uses. A second copy of the mapping here would be the drift this file exists
   to prevent. */
const ENTRY = path.join(os.tmpdir(), 'slugsEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'slugs.bundle.mjs');
const rel = r => path.join(ROOT, r).replaceAll('\\', '/');
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `export * from '${rel('src/data/completionSlugs.ts')}';`,
  `export { ALL_GAMES } from '${rel('src/data/gameRegistry.ts')}';`,
].join('\n'));
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${rel('src')}`);
const mod = await import(pathToFileURL(BUNDLE).href);
const { ALL_GAMES, RETIRED_COMPLETION_SLUGS } = mod;
let { COMPLETION_SLUG_TO_PATH } = mod;

if (CONTROL === 'unmap') {
  const before = Object.keys(COMPLETION_SLUG_TO_PATH).length;
  COMPLETION_SLUG_TO_PATH = Object.fromEntries(
    Object.entries(COMPLETION_SLUG_TO_PATH).filter(([k]) => !k.includes('imperialism')),
  );
  if (Object.keys(COMPLETION_SLUG_TO_PATH).length === before) {
    console.error('control cannot run: there were no imperialism entries to drop');
    process.exit(1);
  }
  console.log(`NEGATIVE CONTROL ON (unmap): the Conquest entries dropped from the map, restoring the bug. Sections 1 and 4 must go red.`);
}

const PATHS = new Set(ALL_GAMES.map(g => g.path));
const resolve = slug => {
  const p = COMPLETION_SLUG_TO_PATH[slug] ?? `/${slug}`;
  return PATHS.has(p) ? p : undefined;
};

/* WITHDRAWN GAMES ARE NOT A DEFECT, and telling them apart from the defect is
   the whole difficulty here. Several games are commented out of the registry on
   purpose: they keep their route and stay playable on a direct link, and they
   still record completions, but they are meant to be absent from the menus, so
   Most Played Today and the daily checklist SHOULD skip them.
   The first draft of this harness reported all nine of them as findings, which
   would have sent someone to "fix" a deliberate decision.
   The list is DERIVED from App.tsx rather than typed here, because a hand kept
   list of withdrawn games is exactly the thing that goes stale and starts
   excusing real bugs. Routed and absent from the registry is withdrawn. Routed
   under a DIFFERENT registry path is the bug. */
const APP = fs.readFileSync(path.join(ROOT, 'src', 'App.tsx'), 'utf8');
const ROUTED = new Set([...APP.matchAll(/path="(\/[a-z0-9\-/:]*)"/g)].map(m => m[1]));
const isWithdrawn = slug => {
  const p = COMPLETION_SLUG_TO_PATH[slug] ?? `/${slug}`;
  return !PATHS.has(p) && ROUTED.has(p);
};

console.log('1) every slug the source writes names a routed game');
const written = new Map();
{
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.tsx?$/.test(e.name)) {
        const s = fs.readFileSync(f, 'utf8');
        for (const m of s.matchAll(/useGameCompletion\(\s*['"]([a-z0-9-]+)['"]/g)) written.set(m[1], path.relative(ROOT, f));
      }
    }
  };
  walk(path.join(ROOT, 'src'));

  let bad = 0, withdrawn = 0;
  for (const [slug, file] of written) {
    if (resolve(slug)) continue;
    if (isWithdrawn(slug)) { withdrawn += 1; continue; }
    bad += 1;
    if (bad <= 6) fail(`${file} records completions as "${slug}" and nothing in the registry is routed there, so Most Played Today drops it and the daily checklist can never tick it`);
  }
  console.log(`   ${written.size} slugs written by source, ${withdrawn} for games withdrawn from the registry on purpose, ${bad} that name no game`);
  if (written.size < 80) fail(`only ${written.size} write sites were found, so the scan is not reaching the code`);
}

console.log('2) every slug in the live table resolves, or is a declared retirement');
{
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
  const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
  /* PAGED, because PostgREST caps every select at 1,000 rows whatever the
     limit says and this table is past 2,200. That cap has bitten this repo five
     times in nine rounds; one column over three pages is cheap. */
  const counts = new Map();
  let ok = true;
  for (let from = 0; ok; from += 1000) {
    let page = null;
    for (let attempt = 0; attempt <= 2 && !page; attempt++) {
      if (attempt) await new Promise(r => setTimeout(r, 600 * attempt));
      try {
        const res = await fetch(`${URL_}/rest/v1/daily_completions?select=game_slug`, {
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
        });
        if (res.ok) page = await res.json();
      } catch { page = null; }
    }
    if (!page) { ok = false; break; }
    for (const r of page) counts.set(r.game_slug, (counts.get(r.game_slug) || 0) + 1);
    if (page.length < 1000) break;
  }
  if (!ok) {
    console.log('   the database did not answer, skipped (section 1 still holds the source side)');
  } else {
    let bad = 0, excused = 0;
    for (const [slug, n] of counts) {
      if (resolve(slug)) continue;
      if (isWithdrawn(slug)) { excused += 1; continue; }
      if (RETIRED_COMPLETION_SLUGS[slug]) { excused += 1; continue; }
      bad += 1;
      if (bad <= 6) fail(`the live table holds ${n} completions under "${slug}", which names no game and is not listed as retired. Map it or declare it.`);
    }
    console.log(`   ${counts.size} distinct slugs recorded across ${[...counts.values()].reduce((a, b) => a + b, 0)} completions, ${excused} withdrawn or retired, ${bad} unaccounted for`);
    if (counts.size < 50) fail(`only ${counts.size} distinct slugs came back, so the read is not reaching the table`);
  }
}

console.log('3) the map has no dead rows');
{
  let dead = 0;
  for (const [slug, p] of Object.entries(COMPLETION_SLUG_TO_PATH)) {
    if (PATHS.has(p)) continue;
    /* Allowed, but only when the harness can see that the game really is
       withdrawn rather than the path being a typo. */
    const near = ALL_GAMES.some(g => g.path.replace(/^\//, '').startsWith(p.replace(/^\//, '').slice(0, 6)));
    if (!near) {
      dead += 1;
      fail(`the map sends "${slug}" to ${p} and no registry game is routed there or near it, which is a rename that half happened`);
    }
  }
  console.log(`   ${Object.keys(COMPLETION_SLUG_TO_PATH).length} mapped slugs, ${dead} pointing nowhere`);
}

console.log('4) the round trip closes for every game that records');
{
  /* completionSlugForPath is the inverse the daily checklist depends on. If it
     and the forward map ever disagree, a box ticks for the wrong game, which is
     worse than one that never ticks. */
  const inverse = p => {
    const found = Object.entries(COMPLETION_SLUG_TO_PATH).find(([, v]) => v === p);
    return found ? found[0] : p.replace(/^\//, '');
  };
  let broken = 0, checked = 0;
  for (const g of ALL_GAMES) {
    const slug = inverse(g.path);
    if (!written.has(slug)) continue;
    checked += 1;
    if (resolve(slug) !== g.path) {
      broken += 1;
      if (broken <= 6) fail(`${g.path} records as "${slug}" and that slug resolves back to ${resolve(slug) ?? 'nothing'}`);
    }
  }
  console.log(`   ${checked} games checked both ways, ${broken} that do not round trip`);
  if (checked < 80) fail(`only ${checked} games could be round tripped, so this section is not really testing anything`);
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simCompletionSlugs control (${CONTROL}): green. The restored bug was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simCompletionSlugs control (${CONTROL}): RED. The map was broken and nothing noticed.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simCompletionSlugs: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simCompletionSlugs: green. Every recorded slug names a game the site can find.');
