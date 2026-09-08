/* Footle never grades a guess against a squad number from a club the player left.
 *
 * Round 495. Footle's KIT # tile GRADES an answer against a number, so a wrong
 * number is not a cosmetic gap, it marks a correct guess wrong.
 *
 * The numbers come from a hand-typed list in src/data/footleEnrichment.ts: one
 * number per player, typed once, belonging to whichever club he was at that day.
 * Round 315 already found this exact problem in the LEAGUE field of the same
 * entries and fixed it, writing that "anyone in the hand list who has moved
 * since it was written kept their old league forever", and the league has been
 * derived from the current club ever since. The kit number never got that guard.
 *
 * Measured 2026-09-06 against the live 2026 pool: 221 players in the hand list,
 * 195 of them in the pool, and 37 of those, nearly one in five, have changed
 * LEAGUE since the list was written. Salah's 11 is Liverpool's and the pool has
 * him at Trabzonspor. Luis Diaz's 7 is Liverpool's and he is at Bayern Munich.
 * Gabriel Jesus's 9 is Arsenal's and he is at Barcelona.
 *
 * The entry records the league it was written with, so a disagreement with the
 * league the CURRENT club maps to is proof of a move, and the number is dropped
 * to null. The tile already renders null as "?", a path Round 443 built for the
 * players who were never in the list at all.
 *
 * WHAT THIS CANNOT CATCH, and the harness says so rather than implying otherwise:
 * a move WITHIN one league. Arsenal to Chelsea keeps the league and the stale
 * number survives. Catching that needs the club the number was written against,
 * which the entry does not record.
 *
 * WHAT THIS HOLDS, against the live pool:
 *   1. No player whose league has changed still gets a number.
 *   2. Players who have NOT moved still get theirs, so the guard did not just
 *      delete the feature. A rule that returned null for everybody would pass a
 *      check that only looked for wrong numbers.
 *   3. The number is never 0, which is the Round 443 defect.
 *
 * NEGATIVE CONTROL: FOOTLE_KIT_CONTROL=trusting reads the hand entry directly,
 * the way the code did before this round, so section 1 goes red with the real
 * movers named.
 * Round 510: each page has an eight-second fetch/body deadline and one retry
 * at the same offset. Exact response counts must prove the pool is complete.
 * Unavailable, empty or incomplete data fails before any kit checks run.
 *
 * Run: node scripts/simFootleKitNumbers.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.FOOTLE_KIT_CONTROL || '';
if (CONTROL && CONTROL !== 'trusting') {
  console.error(`FOOTLE_KIT_CONTROL=${CONTROL} is not a control this harness knows (trusting)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-footle-kit-'));
process.once('exit', () => {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* non-fatal */ }
});
const ENTRY = path.join(tmp, 'entry.ts');
const BUNDLE = path.join(tmp, 'bundle.mjs');
fs.writeFileSync(ENTRY, "export { footleEnrichment, getEnrichment } from '@/data/footleEnrichment';");
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const M = await import(pathToFileURL(BUNDLE).href);

/* The current club, from the same table and year Footle builds its pool from. */
const rows = [];
let total = null;
const nothingChecked = message => {
  console.error(`FOOTLE POOL UNAVAILABLE OR INCOMPLETE: ${message}. NOTHING WAS CHECKED.`);
  process.exit(1);
};
async function fetchPage(from) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(`${URL_}/rest/v1/player_market_values?select=player_name,club&year=eq.2026&order=player_name.asc`,
          { signal: controller.signal, headers: { ...HEAD, Prefer: 'count=exact', Range: `${from}-${from + 999}` } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const page = await response.json();
        if (!Array.isArray(page) || page.length === 0 || page.some(row =>
          !row || typeof row.player_name !== 'string' || !row.player_name.trim()
          || typeof row.club !== 'string' || !row.club.trim())) {
          throw new Error('empty or malformed player page');
        }
        const range = /^(\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range') || '');
        if (!range) throw new Error('missing exact response range or total');
        const [, first, last, count] = range.map(Number);
        if (!Number.isSafeInteger(count) || count <= from || first !== from
          || last !== from + page.length - 1 || page.length !== Math.min(1000, count - from)
          || (total !== null && count !== total)) {
          throw new Error('response range, row count or total does not match the requested page');
        }
        return { page, count };
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('request or body read exceeded 8000ms'));
        }, 8000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
for (let from = 0; from < 22000; from += 1000) {
  let result = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      result = await fetchPage(from);
      break;
    } catch (error) {
      if (attempt === 1) nothingChecked(`offset ${from} failed twice (${error.message})`);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }
  total = result.count;
  rows.push(...result.page);
  if (rows.length === total) break;
}
if (rows.length !== total) nothingChecked(`page limit reached with ${rows.length} of ${total} rows`);
const clubOf = new Map(rows.map(r => [r.player_name, r.club]));
const names = Object.keys(M.footleEnrichment);
if (!names.some(name => clubOf.has(name))) nothingChecked('no players from the hand list are in the returned pool');
console.log(`   ${names.length} in the hand list, ${clubOf.size} players in the 2026 pool`);

console.log('1) nobody who has changed league still gets a number');
let inPool = 0, movers = 0, moversWithNumber = 0, stayers = 0, stayersWithNumber = 0, zeros = 0;
const named = [];
for (const name of names) {
  const club = clubOf.get(name);
  if (!club) continue;
  inPool++;
  const entry = M.footleEnrichment[name];
  const got = M.getEnrichment(name, club);
  const kit = CONTROL === 'trusting' ? entry.kitNumber : got.kitNumber;
  const moved = got.league !== entry.league;
  if (moved) {
    movers++;
    if (kit !== null && kit !== undefined) {
      moversWithNumber++;
      if (named.length < 6) named.push(`${name}: kit ${kit} is from ${entry.league}, he is at ${club} in ${got.league}`);
    }
  } else {
    stayers++;
    if (kit !== null && kit !== undefined) stayersWithNumber++;
  }
  if (kit === 0) zeros++;
}
for (const n of named) fail(`Footle would grade against a stale squad number. ${n}`);
if (moversWithNumber > 6) fail(`and ${moversWithNumber - 6} more`);
console.log(`   ${inPool} of the hand list are in the pool, ${movers} have changed league, ${moversWithNumber} of those still carry a number`);
if (CONTROL === 'trusting' && moversWithNumber === 0) {
  console.error('   CONTROL trusting changed nothing: reading the entry directly must hand back stale numbers');
  process.exit(1);
}

console.log('2) players who have not moved keep their number');
{
  console.log(`   ${stayersWithNumber}/${stayers} still have one`);
  if (stayers > 0 && stayersWithNumber === 0) {
    fail('nobody in the hand list has a number any more, so the guard deleted the feature instead of correcting it');
  }
}

console.log('3) a number is never zero');
{
  console.log(`   ${zeros} players carrying kit 0`);
  if (zeros > 0) fail(`${zeros} players report kit number 0, which the tile prints as though it were a real number (the Round 443 defect)`);
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimFootleKitNumbers: green. No tile grades against a number from a club the player left.'
    : `\nsimFootleKitNumbers: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
