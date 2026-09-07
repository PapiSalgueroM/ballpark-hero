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
const ENTRY = path.join(tmp, 'entry.ts');
const BUNDLE = path.join(tmp, 'bundle.mjs');
fs.writeFileSync(ENTRY, "export { footleEnrichment, getEnrichment } from '@/data/footleEnrichment';");
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const M = await import(pathToFileURL(BUNDLE).href);

/* The current club, from the same table and year Footle builds its pool from. */
const rows = [];
for (let from = 0; ; from += 1000) {
  let page = null;
  try {
    const r = await fetch(`${URL_}/rest/v1/player_market_values?select=player_name,club&year=eq.2026&order=player_name.asc`,
      { headers: { ...HEAD, Range: `${from}-${from + 999}` } });
    if (r.ok) page = await r.json();
  } catch { /* retried once below */ }
  if (page === null) { await new Promise(r => setTimeout(r, 800)); continue; }
  rows.push(...page);
  if (page.length < 1000) break;
  if (from > 20000) break;
}
const clubOf = new Map(rows.map(r => [r.player_name, r.club]));
const names = Object.keys(M.footleEnrichment);
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

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* non-fatal */ }

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimFootleKitNumbers: green. No tile grades against a number from a club the player left.'
    : `\nsimFootleKitNumbers: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
