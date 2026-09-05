/**
 * Round 367: every Rarity Round category serves its whole pool.
 *
 * WHY THIS MATTERS MORE HERE THAN ANYWHERE ELSE. Rarity Round's premise is
 * naming the answer nobody else would, and the pool size is not an internal
 * number: it is rendered to the player as the size of the field they are
 * picking from, it feeds scoreRound, and any answer outside the pool is refused
 * with "that player doesn't count for this category". So a truncated pool does
 * not merely make the game smaller, it deletes exactly the obscure answers the
 * game exists to reward and then tells the player they were wrong.
 *
 * WHAT WAS WRONG. Every category selected from player_market_values across ALL
 * YEARS with .limit(1000) ordered by value descending. PostgREST caps at 1,000
 * regardless, the window filled with a few hundred stars, and rankPool then
 * collapsed those to distinct players. Measured: Brazil has 1,722 distinct
 * players and 206 were reachable; Centre-Forward has 2,457 and 241 were.
 *
 * The file's own comments named the pools it meant to have ("Brazil 1680,
 * Centre-Forward 2396, Centre-Back 2381"), which is what makes the fix
 * verifiable rather than a matter of taste: the player_peak_values view
 * reproduces those numbers to within one.
 *
 * What this holds, per category, against live data:
 *   1. The pool is not truncated: it clears the 1,000 row page cap wherever the
 *      real pool is bigger than that.
 *   2. The pool size matches what the database independently says it should be,
 *      counted here by a separate query rather than by calling the same code.
 *   3. Every pool is internally sane: unique names, ranks 1..n, no zero size.
 *   4. The Ballon d'Or winners mostly resolve to a real market value rather
 *      than falling through to the synthetic recency fallback, which is what
 *      the truncated prominence map used to force.
 *
 * NEGATIVE CONTROL: RARITY_CONTROL=truncate re-caps every pool at 1,000 rows
 * after fetching, which is what production did before this round, and sections
 * 1 and 2 must go red.
 *
 * Run: node scripts/simRarityPools.mjs   (needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.RARITY_CONTROL || '';
if (CONTROL && CONTROL !== 'truncate' && CONTROL !== 'blindcount') {
  console.error(`RARITY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];

/** Ask the database how big a pool really is, with an exact count header, so
 *  section 2 never shares a code path with the thing it is checking. */
async function trueCount(query) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 400 * attempt));
    const r = await fetch(`${URL_}/rest/v1/${query}&limit=1`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact' },
    });
    const cr = r.headers.get('content-range');
    if (r.ok && cr && cr.includes('/')) return Number(cr.split('/')[1]);
  }
  return null;
}

const ENTRY = path.join(os.tmpdir(), 'rarityEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'rarity.bundle.mjs');
const rel = r => path.join(ROOT, r).replaceAll('\\', '/');
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `const m = await import('${rel('src/lib/rarityRound.ts')}');`,
  'export const CATEGORIES = m.CATEGORIES;',
].join('\n'));
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const { CATEGORIES } = await import(pathToFileURL(BUNDLE).href);

/* What the database should say for each category, expressed as its own query.
   ROUND 387: the nationality and position pools count on the tag views (one
   row per player and tag), because that is what the pools now read and what
   the filtered dropdown offers.
   ROUND 463: the value comes from the category's own eq filter, the exact
   string the dropdown and the pool both send, instead of the id suffix. The
   suffix was "brazil" and the view holds "Brazil", so every one of these
   counts came back 0 and the ratio test passed on nothing: section 2 had been
   reporting "5 of 5 checkable pools match" while checking no pool at all
   (measured 2026-09-05: nationality-brazil against the view returned 0 rows;
   with the filter value it returns 1,722). A zero count is now a failure in
   its own right, and RARITY_CONTROL=blindcount sends the old suffix so that
   guard is proven to fire. The $50M category is elite-50m, not the
   fifty-million this used to look for.
   Derived from the category, so a category added later without a filter here
   is reported rather than silently skipped. */
const enc = encodeURIComponent;
function eqFilter(cat) {
  const f = cat.sourceConfig && Array.isArray(cat.sourceConfig.filters) ? cat.sourceConfig.filters : [];
  return f.length === 1 && f[0].op === 'eq' ? f[0] : null;
}
function expectedQuery(cat) {
  const id = cat.id;
  const f = eqFilter(cat);
  const blind = CONTROL === 'blindcount';
  if (id.startsWith('nationality-')) {
    const value = blind || !f ? id.replace('nationality-', '') : f.value;
    return `player_nationality_peaks?select=player_name&nationality=eq.${enc(value)}`;
  }
  if (id.startsWith('position-')) {
    const value = blind || !f ? id.replace('position-', '') : f.value;
    return `player_position_peaks?select=player_name&position=eq.${enc(value)}`;
  }
  if (id === 'elite-100m') return 'player_peak_values?select=player_name&peak_value_usd=gte.100000000';
  if (id === 'elite-50m') return 'player_peak_values?select=player_name&peak_value_usd=gte.50000000';
  return null;
}

console.log(`${CATEGORIES.length} categories`);
const sizes = [];

for (const cat of CATEGORIES) {
  let pool = await cat.fetchPool();
  if (!pool || pool.length === 0) {
    fail(`${cat.id}: the pool came back empty, so nothing was checked for it`);
    continue;
  }
  if (CONTROL === 'truncate') pool = pool.slice(0, 1000);
  sizes.push({ id: cat.id, n: pool.length });
}

if (CONTROL === 'truncate') {
  console.log('   NEGATIVE CONTROL ON: every pool re-capped at 1,000 entries, which is what production did, sections 1 and 2 must go red');
}
if (CONTROL === 'blindcount') {
  console.log('   NEGATIVE CONTROL ON: section 2 asks the view for the id suffix ("brazil") instead of the filter value ("Brazil"), the pre-Round-463 shape; its zero-count guard must go red');
}

console.log('1) no pool is sitting on the page cap');
{
  /* A pool of exactly 1,000, or a distinct count that lands suspiciously on
     that boundary, is the signature of the bug this round fixed. */
  const suspicious = sizes.filter(s => s.n === 1000);
  for (const s of suspicious) fail(`${s.id} returned exactly 1,000 entries, which is PostgREST's page cap and almost certainly a truncation`);
  const big = sizes.filter(s => s.n > 1000);
  console.log(`   ${sizes.length} pools, ${big.length} of them larger than one page, ${suspicious.length} sitting exactly on it`);
  if (big.length === 0 && CONTROL !== 'truncate') {
    fail('not one pool exceeds a single page, which given Brazil alone has 1,722 players means the read is still capped');
  }
}

console.log('2) each pool matches what the database independently says');
{
  let checked = 0, wrong = 0;
  for (const cat of CATEGORIES) {
    const q = expectedQuery(cat);
    if (!q) continue;
    const want = await trueCount(q);
    const got = sizes.find(s => s.id === cat.id);
    if (want === null || !got) continue;
    checked += 1;
    /* Round 463: a count of zero is not a match, it is a question the database
       was never really asked. */
    if (want === 0) {
      wrong += 1;
      if (wrong <= 4) fail(`${cat.id}: the database says the pool is EMPTY, so the expected query is not asking for what the game serves (${got.n})`);
      continue;
    }
    /* rankPool dedupes by NORMALISED name, so a couple of accent variants
       collapsing is expected and fine; a factor of eight is not. */
    const ratio = got.n / Math.max(want, 1);
    if (ratio < 0.95) {
      wrong += 1;
      if (wrong <= 4) fail(`${cat.id}: the game serves ${got.n} players and the database holds ${want}, so ${want - got.n} are unreachable`);
    }
  }
  console.log(`   ${checked - wrong} of ${checked} checkable pools match the database`);
  if (checked < 4) fail(`only ${checked} pools could be checked against the database, so this section is not really testing anything`);
}

console.log('3) every pool is internally sane');
{
  let bad = 0;
  for (const cat of CATEGORIES) {
    const pool = await cat.fetchPool();
    if (!pool || pool.length === 0) continue;
    const names = new Set(pool.map(e => e.name));
    if (names.size !== pool.length) { bad += 1; fail(`${cat.id} has ${pool.length - names.size} duplicate names after ranking`); }
    const ranks = pool.map(e => e.rank).sort((a, b) => a - b);
    if (ranks[0] !== 1 || ranks[ranks.length - 1] !== pool.length) {
      bad += 1;
      fail(`${cat.id} ranks run ${ranks[0]} to ${ranks[ranks.length - 1]} across ${pool.length} entries, so they are not a dense 1..n`);
    }
  }
  console.log(`   ${CATEGORIES.length - bad} of ${CATEGORIES.length} pools are internally consistent`);
}

console.log('4) Ballon d\'Or winners resolve to real market values');
{
  const cat = CATEGORIES.find(c => c.id === 'ballon-dor');
  if (!cat) {
    console.log('   no ballon-dor category, skipped');
  } else {
    const pool = await cat.fetchPool();
    /* The synthetic fallback is Math.max(1, year - 1950), so anything under a
       few hundred is a winner the value table does not carry.
       THE THRESHOLD HERE IS MEASURED, NOT CHOSEN. A first draft failed if more
       than 60 percent of winners were synthetic, which went red on correct
       code: player_market_values starts in 2004 and the award runs from 1956,
       so most winners legitimately have no value and the fallback exists for
       exactly them. The real invariant is that every winner the table DOES
       carry resolves to a real number, so the expected synthetic count is
       asked of the database rather than guessed. All 10 winners since 2004
       resolve; the 31 that do not are pre-2004 legends. */
    const present = await trueCount(`player_peak_values?select=player_name&player_name=in.(${pool.map(e => '"' + String(e.name).replaceAll('"', '') + '"').join(',')})`);
    const synthetic = pool.filter(e => e.prominence < 1000).length;
    const expected = present === null ? null : pool.length - present;
    console.log(`   ${pool.length} winners, ${present} carried by the value table, ${synthetic} on the synthetic fallback (expected ${expected})`);
    if (expected !== null && synthetic > expected) {
      fail(`${synthetic} winners fell back to a synthetic value but only ${expected} are genuinely absent from the value table, so the prominence lookup is dropping ${synthetic - expected} it should have found`);
    }
  }
}

console.log('');
if (CONTROL === 'truncate') {
  if (failures > 0) { console.log(`simRarityPools control: green. Re-capping the pools was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simRarityPools control: RED. Every pool was cut to 1,000 and nothing noticed.');
  process.exit(1);
}
if (CONTROL === 'blindcount') {
  if (failures > 0) { console.log(`simRarityPools control: green. Counting the id suffix instead of the filter value was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simRarityPools control: RED. Section 2 counted nothing and called it a match.');
  process.exit(1);
}
if (failures > 0) { console.error(`simRarityPools: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simRarityPools: green. Every category serves its whole pool.');
