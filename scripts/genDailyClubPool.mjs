/**
 * Round 1040: writes the daily club pool of Manager Hot Seat and Deadline
 * Day, src/data/dailyClubPool.json.
 *
 * WHY A FILE. Both dailies deal one club a day by an index into a list of
 * clubs (dailyIndex(date, pool.length)). That list used to be worked out live
 * from the engine: every club of REAL_LEAGUES the roster bake does not mark
 * partial, in league order, then the engine's own stature order. So any
 * roster bake (a man moving club reorders a league, or tips a squad under the
 * partial line) and any new league re-dealt every date, the day the release
 * went live included. Round 1040's bake did both (Monza and Lecce swapped
 * places, Lausanne-Sport fell to seven real men, four Serie B clubs came in).
 * The file is the history, the Career Ladder way (Round 718): append only,
 * every added line dated, and the dailies read it rather than the engine.
 *
 * WHAT IT DOES. Reads the live pool (hotSeatPool) and appends every club in
 * it the file does not have, dated --since (default: 30 Eastern days from
 * today). It never removes, reorders or redates a line: a club that falls
 * under the partial line stays dealable (the engine pads its squad), and a
 * club the engine no longer knows at all is skipped by the dailies (that one
 * re-deals; simManagerHotSeat names it).
 *
 * Run:   node scripts/genDailyClubPool.mjs [--since YYYY-MM-DD] [--check]
 *        --check prints what it would append and exits 1 if anything, writing nothing.
 * Offline: it bundles the engine with the database client stubbed out.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const POOL_PATH = path.join(ROOT, 'src', 'data', 'dailyClubPool.json');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const sinceArg = args.find(a => a.startsWith('--since'));
const etToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const since = sinceArg ? (sinceArg.includes('=') ? sinceArg.split('=')[1] : args[args.indexOf(sinceArg) + 1]) : addDays(etToday(), 30);
if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) { console.error(`--since ${since} is not a date`); process.exit(1); }
if (since <= etToday()) { console.error(`--since ${since} is not after today (${etToday()}): a line dated today or earlier re-deals days already dealt`); process.exit(1); }

const file = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));
const have = new Set(file.entries.map(e => e[0]));

const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'dailypool-'));
const entry = path.join(TMP, 'entry.mjs');
const out = path.join(TMP, 'pool.mjs');
fs.writeFileSync(entry, `export { hotSeatPool } from '${ROOT_FWD}/src/lib/managerHotSeat.ts';\n`);
await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
  alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error',
  plugins: [{ name: 'offline', setup(b) {
    b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' }));
    b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("offline"); } }); export const SUPABASE_URL = "http://offline.invalid"; export const SUPABASE_PUBLISHABLE_KEY = "offline";', loader: 'js' }));
  } }],
});
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const { hotSeatPool } = await import(pathToFileURL(out).href);
fs.rmSync(TMP, { recursive: true, force: true });

const adds = hotSeatPool().map(c => c.club).filter(c => !have.has(c));
console.log(`${file.entries.length} lines in the file, ${hotSeatPool().length} clubs in the live pool, ${adds.length} to append from ${since}${adds.length ? `: ${adds.join(', ')}` : ''}`);
if (CHECK) process.exit(adds.length ? 1 : 0);
if (!adds.length) process.exit(0);
file.entries.push(...adds.map(c => [c, since]));
fs.writeFileSync(POOL_PATH, formatPool(file));
console.log(`wrote ${path.relative(ROOT, POOL_PATH)}`);

/** One line per entry, so a diff shows exactly the lines a run appended. */
function formatPool(f) {
  return `{\n  "about": ${JSON.stringify(f.about)},\n  "entries": [\n${f.entries.map(e => `    ${JSON.stringify(e)}`).join(',\n')}\n  ]\n}\n`;
}
