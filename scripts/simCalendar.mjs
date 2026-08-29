/**
 * Round 158 harness: the season calendar's date maths.
 *
 * The month calendar derives every date from the save's clock with its own
 * Gregorian helpers (no Date object, so nothing depends on the machine the
 * site runs on). Wrong date maths on a calendar is invisible in a type check
 * and glaring on screen: a fixture drifting off Saturday, a leap February
 * with the wrong length, a season that ends in the wrong month. This pins:
 *
 *  - day-of-week against known anchors (2026-08-18 was a Tuesday, the day
 *    the owner sent the calendar screenshot; 2026-08-01 was a Saturday)
 *  - every engine week lands on a Saturday, across the December year wrap
 *  - leap and non-leap Februaries
 *  - a real save's season span: kicks off mid August, ends April to June
 * Run: node scripts/simCalendar.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'cmCalEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'cmCal.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const cal = await import('${ROOT.replaceAll('\\', '/')}/src/components/club-manager/CalendarScreen.tsx');
const cm = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const mods = { cal, cm };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --jsx=automatic`, { stdio: 'inherit' });

const { cal, cm } = (await import(pathToFileURL(BUNDLE).href)).mods;
const { dayOfWeek, daysInMonth, seasonKickoff, dateOfWeek, dateOfEntries } = cal;
const { startCareer } = cm;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };

/* ---------- 1. Anchors ---------- */
console.log('1) Known date anchors');
if (dayOfWeek(2026, 8, 18) !== 2) fail(`2026-08-18 computed as day ${dayOfWeek(2026, 8, 18)}, it was a Tuesday (2)`);
if (dayOfWeek(2026, 8, 1) !== 6) fail(`2026-08-01 computed as day ${dayOfWeek(2026, 8, 1)}, it was a Saturday (6)`);
if (dayOfWeek(2010, 8, 14) !== 6) fail(`2010-08-14 computed as day ${dayOfWeek(2010, 8, 14)}, the 2010-11 Premier League kicked off on a Saturday`);
if (dayOfWeek(2027, 1, 1) !== 5) fail(`2027-01-01 computed as day ${dayOfWeek(2027, 1, 1)}, it is a Friday (5)`);
if (daysInMonth(2028, 2) !== 29) fail('February 2028 must have 29 days');
if (daysInMonth(2026, 2) !== 28) fail('February 2026 must have 28 days');
if (daysInMonth(2100, 2) !== 28) fail('February 2100 must have 28 days (century rule)');

/* ---------- 2. Kickoff and Saturdays ---------- */
console.log('2) Kickoff lands on the second Saturday of August, every week a Saturday');
for (const year of [2010, 2026, 2027, 2031]) {
  const k = seasonKickoff(year);
  if (k.m !== 8) fail(`${year}: kickoff in month ${k.m}`);
  if (dayOfWeek(k.y, k.m, k.d) !== 6) fail(`${year}: kickoff ${k.d} August is not a Saturday`);
  if (k.d < 8 || k.d > 14) fail(`${year}: kickoff on the ${k.d}th is not the second Saturday`);
  for (let w = 0; w < 46; w++) {
    const d = dateOfWeek(year, w);
    if (dayOfWeek(d.y, d.m, d.d) !== 6) { fail(`${year} week ${w}: ${d.y}-${d.m}-${d.d} is not a Saturday`); break; }
  }
  const wrap = dateOfWeek(year, 22);
  if (wrap.y !== year + 1 && wrap.m < 8) fail(`${year} week 22 did not wrap the year: ${wrap.y}-${wrap.m}`);
}

/* ---------- 3. A real save's season span, entry aware ---------- */
console.log('3) A real calendar spans August to spring, cups midweek');
{
  const s = startCareer('Everton');
  const dates = dateOfEntries(2026, s.calendar);
  if (dates.length !== s.calendar.length) fail(`${dates.length} dates for ${s.calendar.length} entries`);
  const start = dates[0];
  const end = dates[dates.length - 1];
  if (start.m !== 8) fail(`season starts in month ${start.m}`);
  if (end.y !== 2027) fail(`season ends in ${end.y}`);
  if (end.m < 4 || end.m > 6) fail(`season of ${s.calendar.length} entries ends in month ${end.m}, expected April to June`);
  console.log(`   ${s.calendar.length} entries: ${start.y}-0${start.m}-${start.d} to ${end.y}-0${end.m}-${end.d}`);
  // League and window entries take Saturdays; cups and Europe go midweek.
  let lastA = 0;
  s.calendar.forEach((entry, i) => {
    const d = dates[i];
    const dow = dayOfWeek(d.y, d.m, d.d);
    const a = d.y * 10000 + d.m * 100 + d.d;
    if (a <= lastA) fail(`entry ${i} dated ${a} does not come after ${lastA}`);
    lastA = a;
    if ((entry.type === 'league' || entry.type === 'window') && dow !== 6) {
      fail(`entry ${i} (${entry.type}) lands on day ${dow}, not Saturday`);
    }
    if (entry.type !== 'league' && entry.type !== 'window' && (dow < 2 || dow > 4)) {
      fail(`entry ${i} (${entry.type}) lands on day ${dow}, not midweek`);
    }
  });
  // A 2010 era save reads its own year.
  const h = startCareer('Barcelona', 'era2010');
  const hDates = dateOfEntries(h.startYear ?? 2010, h.calendar);
  if (hDates[0].y !== 2010) fail(`the 2010 era season starts in ${hDates[0].y}`);
}

if (failures > 0) {
  console.error(`simCalendar: ${failures} FAILURES`);
  process.exit(1);
}
console.log('simCalendar: all green');
