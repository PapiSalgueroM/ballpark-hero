/* Round 1587: is the apply day clear? Rarity Round is the one daily whose dealt state reads the rows this round moves:
 * on a day that deals the club-arsenal category, a run saved before the apply and one after score the same answer
 * against different pool sizes (scoreRound, src/lib/rarityRound.ts). So the apply happens on a day that does not deal it.
 * Method (critic 1584 advice 21): the SHIPPED pickDailyCategories, bundled with esbuild as connectionsDealtDay1558.mjs
 * does, called with the clock pinned to noon Eastern of each date (it takes no date: it reads getTodayET() itself, so
 * the global Date is swapped for one fixed instant per date). Nothing is reimplemented; no network.
 * Usage:
 *   node scripts/qa/namesakeDealtDay1587.mjs 2026-11-03 [2026-11-04 ...]   named dates: exit 1 when any deals Arsenal
 *   node scripts/qa/namesakeDealtDay1587.mjs 2026-10-30 +32                a listing: prints each day, exit 0
 * Control DEALT_CONTROL=always: club-arsenal forced into every day's five, so every date is dealt and it exits 1.
 * Soccer Grid (reported, never gated): its daily board is dateSeed(getTodayET()) % the live puzzle pool, which was not
 * exported in order, so the exact day is the lead's to read at the apply; the lead's Q5 export says how many of the
 * live puzzles carry "Played for Arsenal". Answers saved before the deploy keep; a guess after it meets the new rule. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node scripts/qa/namesakeDealtDay1587.mjs <YYYY-MM-DD> [... | +N]'); process.exit(2); }
const R = ROOT.split(path.sep).join('/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dealt1587-'));
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `export { pickDailyCategories, CATEGORIES } from '${R}/src/lib/rarityRound.ts';\nexport { getTodayET } from '${R}/src/lib/dateUtils.ts';`);
await build({ entryPoints: [path.join(TMP, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'b.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{}' } });
const m = await import(pathToFileURL(path.join(TMP, 'b.mjs')).href);

const listing = args.length === 2 && /^\+\d+$/.test(args[1]);
const dates = listing
  ? Array.from({ length: Number(args[1].slice(1)) }, (_, i) => new Date(new Date(`${args[0]}T12:00:00Z`).getTime() + i * 86400000).toISOString().slice(0, 10))
  : args;
const always = process.env.DEALT_CONTROL === 'always';
if (process.env.DEALT_CONTROL && !always) { console.error(`DEALT_CONTROL=${process.env.DEALT_CONTROL} is not a control this script knows, ABORTED`); process.exit(2); }
const arsenal = m.CATEGORIES.find(c => c.id === 'club-arsenal');
if (!arsenal) { console.error('rarityRound.ts has no club-arsenal category, ABORTED'); process.exit(2); }

const RealDate = Date;
let dealt = 0, wrongClock = 0;
for (const d of dates) {
  const instant = new RealDate(`${d}T17:00:00Z`).getTime(); /* noon Eastern in both EST and EDT */
  class PinnedDate extends RealDate { constructor(...a) { super(...(a.length ? a : [instant])); } static now() { return instant; } }
  globalThis.Date = PinnedDate;
  let today, picks;
  try { today = m.getTodayET(); picks = m.pickDailyCategories(); } finally { globalThis.Date = RealDate; }
  if (today !== d) wrongClock += 1;
  if (always && !picks.some(c => c.id === 'club-arsenal')) picks = [arsenal, ...picks.slice(1)];
  const hit = picks.some(c => c.id === 'club-arsenal');
  if (hit) dealt += 1;
  console.log(`${d}: ${hit ? 'DEALT club-arsenal: not this day' : 'clear'} (${picks.map(c => c.id).join(', ')})`);
}
if (wrongClock) { console.error(`${wrongClock} dates where the pinned clock did not read as that date, ABORTED`); process.exit(2); }
const labels = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/clubNamesakes1584/gridClubLabels-2026-10-29.json'), 'utf8'));
const row = (labels.labels || labels).find?.(l => /Played for Arsenal$/.test(l.label));
if (row) console.log(`Soccer Grid (report only): ${row.puzzles ?? row.n ?? row.count} live puzzles carry "Played for Arsenal" (the lead's Q5, 2026-10-29); the daily deal reads the live order, not exported.`);
console.log(`${dates.length} dates, ${dealt} deal club-arsenal${always ? ' (DEALT_CONTROL=always forced it into every day)' : ''}`);
process.exit(always ? (dealt ? 1 : 3) : (!listing && dealt ? 1 : 0));
