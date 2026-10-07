/**
 * Round 1044: writes the dailies' club ledger, src/data/dailyClubPool.json,
 * from the engine. Modelled on scripts/genCareerLadderRoster.mjs (Round 718).
 *
 * WHY A FILE. Manager Hot Seat's and Deadline Day's dailies pick their club
 * with dailyIndex(date, pool.length), a pure function of the date and the
 * pool. Until this round the pool was worked out fresh on every load from
 * REAL_LEAGUES less the partial clubs, so a re-bake, a new league or a club
 * marked partial changed its length and re-dealt every day, today and the
 * archive included (Release AF's re-bake did it, Round 1035's A-League would
 * have done it again). The engine keeps no history, so the ledger is the
 * history: append only, every line dated.
 *
 * WHAT IT DOES. Compares the engine's eligible clubs, hotSeatPool() with no
 * date (the REAL_LEAGUES clubs with a def, less the CM_PARTIAL ones), with the
 * ledger's open lines and appends: a join line { club, leagueId, leagueName,
 * from } for an eligible club with no open line, and a leave line { club,
 * leagueId, until } for an open line whose club is no longer eligible. It
 * never edits or removes a line. The shapes and the one reader are in
 * scripts/lib/dailyClubPool.mjs and src/lib/managerHotSeat.ts.
 *
 * THE SINCE DATE. Every appended line counts from --since (default: 30 ET days
 * from today). It must be after the day the file reaches the live site: a line
 * dated earlier changes the pool on days already dealt, which is the bug this
 * file exists to end. The script refuses a date that is not after today, and
 * simDailyClubPool fails a line new since origin/main that is not after the
 * day it is committed. Ship the file within the margin, or rerun later.
 *
 * Run:   node scripts/genDailyClubPool.mjs [--since YYYY-MM-DD] [--check]
 *        --check prints what it would append and exits 1 if anything, writing nothing.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { LEDGER_PATH, formatLedger, latestDate, planLines, readLedger } from './lib/dailyClubPool.mjs';
import { writeFileAtomic } from './lib/atomicWrite.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const sinceArg = args.includes('--since') ? args[args.indexOf('--since') + 1] : null;

/* The engine's own pool and reader, so eligibility and the ledger's meaning are never typed twice. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'genDailyClubPool-'));
const q = s => s.replaceAll('\\', '/');
fs.writeFileSync(path.join(tmp, 'stub.mjs'), 'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };\n');
fs.writeFileSync(path.join(tmp, 'entry.mjs'), [
  `import '${q(path.join(tmp, 'stub.mjs'))}';`,
  `export { hotSeatPool, dailyPoolEntries } from '${q(path.join(ROOT, 'src', 'lib', 'managerHotSeat.ts'))}';`,
  `export { dayNumber, getTodayET } from '${q(path.join(ROOT, 'src', 'lib', 'dateUtils.ts'))}';`,
].join('\n'));
await build({ entryPoints: [path.join(tmp, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'bundle.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const lib = await import(pathToFileURL(path.join(tmp, 'bundle.mjs')).href);
fs.rmSync(tmp, { recursive: true, force: true });

const iso = dn => new Date(dn * 86_400_000).toISOString().slice(0, 10);
const today = lib.getTodayET();
const since = sinceArg ?? iso(lib.dayNumber(today) + 30);
if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || iso(lib.dayNumber(since)) !== since) {
  console.error(`--since "${since}" is not a real YYYY-MM-DD date`);
  process.exit(2);
}
if (lib.dayNumber(since) <= lib.dayNumber(today)) {
  console.error(`--since ${since} is not after today (${today} ET): a line dated today or earlier changes days the live file already dealt`);
  process.exit(2);
}
const lines = readLedger(ROOT);
const latest = latestDate(lines);
if (since < latest) {
  console.error(`--since ${since} is before the ledger's latest line (${latest}): lines stay in date order, use ${latest} or later`);
  process.exit(2);
}

const eligible = lib.hotSeatPool();
const appends = planLines({ eligible, entries: lib.dailyPoolEntries(lines), since });
const joins = appends.filter(l => 'from' in l), leaves = appends.filter(l => !('from' in l));
console.log(`engine: ${eligible.length} eligible clubs; ledger: ${lines.length} lines; today ${today} ET`);
console.log(`${appends.length} line${appends.length === 1 ? '' : 's'} to append, counting from ${since}: ${joins.length} joining, ${leaves.length} leaving`);
for (const l of appends.slice(0, 30)) console.log(`   ${'from' in l ? `join  ${l.club} (${l.leagueName}) from ${l.from}` : `leave ${l.club} (${l.leagueId}) from ${l.until}`}`);
if (appends.length > 30) console.log(`   ... and ${appends.length - 30} more`);
if (check) process.exit(appends.length ? 1 : 0);
if (!appends.length) {
  console.log('the ledger already matches the engine, nothing written');
  process.exit(0);
}
writeFileAtomic(path.join(ROOT, LEDGER_PATH), formatLedger([...lines, ...appends]));
console.log(`wrote ${LEDGER_PATH}: ${lines.length + appends.length} lines`);
