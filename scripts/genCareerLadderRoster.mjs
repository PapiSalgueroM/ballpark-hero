/**
 * Round 718: writes Career Ladder's daily rotation roster,
 * src/data/careerLadderRoster.json, from the live tables.
 *
 * WHY A FILE. The daily is a pure function of the date, so it works out every
 * past cycle of the rotation each time it is asked. If it read who is in each
 * cycle from the live tables, any change to them (a new man, a 4th season
 * making a man eligible, a peak crossing the 50M line, a quarantined row)
 * would put a man into cycles that were dealt without him, and the walk would
 * jump back onto men dealt a day or three ago. The tables keep no history, so
 * the roster is the history: append only, every line dated.
 *
 * WHAT IT DOES. Pulls career_players and career_seasons (read only), compares
 * them with the roster, and appends a line for every man whose standing
 * differs: in (h or e) for a man with at least MIN_STINTS seasons the roster
 * does not have in, x for a man it has in who is gone from the table or under
 * MIN_STINTS now. A man keeps the side he first joined on for good (moving
 * sides mid walk is a repeat of its own); a man new to the roster takes the
 * side his peak puts him on today. It never edits or removes a line.
 *
 * THE SINCE DATE. Every appended line counts from --since (default: 30 ET days
 * from today), and only for cycles that START on or after it. It must be after
 * the day the file reaches the live site: a line dated earlier reaches cycles
 * the old file already dealt, which is the bug this file exists to end. The
 * script refuses a date that is not after today, and simCareerLadderRotation
 * fails a line new since origin/main that is not after today. Ship the file
 * within the margin, or rerun with a later date.
 *
 * Run:   node scripts/genCareerLadderRoster.mjs [--since YYYY-MM-DD] [--check]
 *        --check prints what it would append and exits 1 if anything, writing nothing.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { fetchLiveCareerPool } from './lib/careerTablesLive.mjs';
import { ROSTER_PATH, formatRoster, planAppends, readRoster } from './lib/careerLadderRoster.mjs';
import { writeFileAtomic } from './lib/atomicWrite.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const sinceArg = args.includes('--since') ? args[args.indexOf('--since') + 1] : null;

/* The lib's own constants, so the line and the eligibility rule are never typed twice. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'genCareerLadderRoster-'));
const q = s => s.replaceAll('\\', '/');
fs.writeFileSync(path.join(tmp, 'stub.mjs'), 'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };\n');
fs.writeFileSync(path.join(tmp, 'entry.mjs'), [
  `import '${q(path.join(tmp, 'stub.mjs'))}';`,
  `export { peakValue, MIN_STINTS, ROTATION_SPLIT_VALUE } from '${q(path.join(ROOT, 'src', 'lib', 'careerLadder.ts'))}';`,
  `export { dayNumber, getTodayET } from '${q(path.join(ROOT, 'src', 'lib', 'dateUtils.ts'))}';`,
].join('\n'));
await build({ entryPoints: [path.join(tmp, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'bundle.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const lib = await import(pathToFileURL(path.join(tmp, 'bundle.mjs')).href);
fs.rmSync(tmp, { recursive: true, force: true });

const iso = dn => new Date(dn * 86_400_000).toISOString().slice(0, 10);
const today = lib.getTodayET();
const since = sinceArg ?? iso(lib.dayNumber(today) + 30);
if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) {
  console.error(`--since "${since}" is not a YYYY-MM-DD date`);
  process.exit(2);
}
if (lib.dayNumber(since) <= lib.dayNumber(today)) {
  console.error(`--since ${since} is not after today (${today} ET): a line dated today or earlier reaches cycles the live file already dealt`);
  process.exit(2);
}
const entries = readRoster(ROOT);
const latest = entries.reduce((m, e) => (e[2] > m ? e[2] : m), '');
if (since < latest) {
  console.error(`--since ${since} is before the roster's latest line (${latest}): lines stay in date order, use ${latest} or later`);
  process.exit(2);
}

const live = await fetchLiveCareerPool(ROOT);
const appends = planAppends({ live, entries, since, minStints: lib.MIN_STINTS, splitValue: lib.ROTATION_SPLIT_VALUE, peakValue: lib.peakValue });
const count = side => appends.filter(e => e[1] === side).length;
console.log(`live: ${live.length} men, ${live.filter(p => p.seasons.length >= lib.MIN_STINTS).length} with ${lib.MIN_STINTS}+ seasons; roster: ${entries.length} lines`);
console.log(`${appends.length} line${appends.length === 1 ? '' : 's'} to append, counting from ${since}: ${count('h')} in on the harder side, ${count('e')} in on the easier side, ${count('x')} out`);
for (const e of appends.slice(0, 20)) console.log(`   ${e[1]} ${e[3]} (${e[0]})`);
if (appends.length > 20) console.log(`   ... and ${appends.length - 20} more`);
if (check) process.exit(appends.length ? 1 : 0);
if (!appends.length) {
  console.log('the roster already matches the live tables, nothing written');
  process.exit(0);
}
writeFileAtomic(path.join(ROOT, ROSTER_PATH), formatRoster([...entries, ...appends]));
console.log(`wrote ${ROSTER_PATH}: ${entries.length + appends.length} lines`);
