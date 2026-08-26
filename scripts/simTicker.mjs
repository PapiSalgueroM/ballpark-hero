/**
 * Round 298 harness for the scores-only wire.
 *
 * The old strip (Round 167 through 297) was a list of derived site lines,
 * and this harness fed it hostile saves. The owner's 2026-08-26 tweaks
 * document replaced all of that: the strip now carries a LIVE chip and that
 * day's real games grouped by sport, and NOTHING about the site itself. So
 * the harness's job flipped with it:
 *
 *   1. The grouping is a fan's ordering: soccer leads, live before upcoming
 *      before finals, kickoffs soonest first, finals freshest first, and no
 *      empty sport ever gets a box.
 *   2. The dwell clock is bounded on both ends, so one busy league cannot
 *      park the loop and a quiet one does not blink past.
 *   3. The site promo vocabulary the owner ordered off the strip STAYS off:
 *      the component source is scanned with comments stripped, so prose
 *      about the old lines cannot satisfy or trip the check.
 *   4. Hostile rows (null scores, unknown sports, unparseable dates) group
 *      without throwing, because the strip renders on every route and a
 *      feed hiccup must never take the shell down.
 *
 * Negative control: SIM_TICKER_CONTROL=promo plants a banned phrase into the
 * in-memory copy of the source before the scan, and the run must then fail.
 *
 * Run: node scripts/simTicker.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/tickerEntry.mjs';
const BUNDLE = '/tmp/ticker.bundle.mjs';

fs.writeFileSync(ENTRY, `
export { groupScores, dwellMs } from '${ROOT}/src/components/layout/TopTicker.tsx';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --jsx=automatic --loader:.tsx=tsx`, { stdio: 'inherit' });

/* The stub lives in THIS process: an import inside the entry hoists above any
   statement beside it, and the bundled supabase client asks for localStorage
   at module scope. Same lesson simMissingXi learned the same night. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const { groupScores, dwellMs } = await import(BUNDLE);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const row = (sport, over = {}) => ({
  id: `${sport}-${Math.floor(Math.random() * 1e9)}`,
  sport, league: 'L', home: 'Home Club', away: 'Away Club',
  home_score: null, away_score: null,
  status_short: 'NS', status_long: '',
  start_at: '2026-08-26T20:00:00Z', live: false, finished: false,
  updated_at: '2026-08-26T00:00:00Z', ...over,
});

console.log('1) Sports group in the house order and empty sports get no box');
{
  const groups = groupScores([
    row('nhl'), row('mlb'), row('soccer'), row('cricket'), row('nba'),
  ]);
  const order = groups.map(g => g.sport).join(',');
  if (order !== 'soccer,mlb,nba,nhl,cricket') fail(`grouped as ${order}`);
  if (groups.some(g => g.rows.length === 0)) fail('an empty sport got a box');
  const none = groupScores([]);
  if (none.length !== 0) fail(`an empty wire produced ${none.length} groups`);
  console.log(`   order ${order}; empty wire produces no groups`);
}

console.log('2) Inside a sport: live first, then kickoffs soonest first, then finals freshest first');
{
  const g = groupScores([
    row('mlb', { id: 'final-old', finished: true, start_at: '2026-08-26T00:00:00Z', home_score: 3, away_score: 2 }),
    row('mlb', { id: 'up-late', start_at: '2026-08-26T23:00:00Z' }),
    row('mlb', { id: 'live-1', live: true, home_score: 1, away_score: 0 }),
    row('mlb', { id: 'up-early', start_at: '2026-08-26T18:00:00Z' }),
    row('mlb', { id: 'final-new', finished: true, start_at: '2026-08-26T04:00:00Z', home_score: 7, away_score: 6 }),
  ])[0];
  const ids = g.rows.map(r => r.id).join(',');
  if (ids !== 'live-1,up-early,up-late,final-new,final-old') fail(`mlb ordered as ${ids}`);
  console.log(`   ${ids}`);
}

console.log('3) The dwell clock is bounded on both ends');
{
  const floor = dwellMs(0), one = dwellMs(1), busy = dwellMs(40);
  if (floor < 5000) fail(`an empty box dwells ${floor}ms, under the 5s floor`);
  if (busy > 14000) fail(`a 40 game box dwells ${busy}ms, over the 14s ceiling`);
  if (!(one > floor - 1 && one <= busy)) fail(`dwell is not monotone: ${floor}, ${one}, ${busy}`);
  console.log(`   0 games ${floor}ms, 1 game ${one}ms, 40 games ${busy}ms`);
}

console.log('4) Hostile rows group without throwing');
{
  try {
    const g = groupScores([
      row('mlb', { start_at: 'not a date' }),
      { id: 'x' }, null, undefined,
      row('', {}), row('soccer', { home: null, away: null }),
    ].filter(x => x !== null && x !== undefined));
    console.log(`   ${g.length} groups from garbage, no throw`);
  } catch (e) {
    fail(`hostile rows threw: ${e.message}`);
  }
}

console.log('5) The owner\'s banned strip content stays off the wire, read from the code not the comments');
{
  const raw = fs.readFileSync(path.join(ROOT, 'src/components/layout/TopTicker.tsx'), 'utf8');
  let src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (process.env.SIM_TICKER_CONTROL === 'promo') {
    src += "\n<span>{`${all.length} free games, all playable without an account`}</span>";
  }
  /* Each of these is a thing the owner ordered off the strip on 2026-08-26:
     site promo lines, the dailies rotation, the save lines, the calendar,
     the catalog counts, the what's-new pointer, and the logo mark that read
     as a question mark at strip size. */
  const banned = [
    ['free games', 'a catalog count line'],
    ['Fresh daily', 'the dailies rotation'],
    ['New stuff ships', 'the whats-new pointer'],
    ['Your save', 'a personal save line'],
    ['Your pro', 'a personal save line'],
    ['stadium empire', 'a personal save line'],
    ['whats-new', 'a link to the site about itself'],
    ['sportsCalendar', 'the hand kept calendar feed'],
    ['gameRegistry', 'the registry import the counts rode in on'],
    ['LogoMark', 'the mark the owner read as a question mark'],
  ];
  let hits = 0;
  for (const [needle, why] of banned) {
    if (src.includes(needle)) { hits += 1; fail(`the strip carries ${why} again (${JSON.stringify(needle)})`); }
  }
  if (!/data-live-chip/.test(src)) fail('the LIVE chip marker is gone');
  if (!/bg-red-500/.test(src)) fail('the red live dot is gone');
  console.log(`   ${banned.length} banned shapes scanned, ${hits} present; LIVE chip and red dot present`);

  if (process.env.SIM_TICKER_CONTROL === 'promo') {
    if (hits > 0) { console.log('\ncontrol run: the planted promo line was caught'); process.exit(0); }
    console.error('\ncontrol run: a planted promo line changed NOTHING, the scan is dead');
    process.exit(1);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simTicker: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTicker: green. The wire carries the day\'s games and nothing about the site.');
