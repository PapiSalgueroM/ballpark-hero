/**
 * Round 287 harness: the scores on the ticker cannot lie, leak, or crash.
 *
 * Three things are held here, and the third is the one that matters most:
 *
 *   1. THE SHAPING IS RIGHT. teamShort says what a fan says, the sort puts
 *      what is happening now first, the window is the one the comment
 *      promises, and a row that cannot be shown honestly (a live game with no
 *      score) is not shown at all. Hostile rows (nulls, garbage, missing
 *      fields) shape to nothing rather than to a crash, because the ticker is
 *      on every page.
 *   2. THE FEED STAYS SERVER SIDE. The browser reads public.live_scores and
 *      nothing else: src/ must not contain the feed's host, and the browser
 *      side must read through the one file that knows the live project.
 *   3. NO SECRET IN THE REPO. The API key and the poll secret live in the
 *      database. A 32 hex character literal anywhere near the words that name
 *      them, in the function or the client, is a key pasted where a key must
 *      never be, and the repo is public.
 *
 * NEGATIVE CONTROL: LIVE_CONTROL=leak appends a fake key literal to the
 * function source in memory; section 3 must report it.
 *
 * Run: node scripts/simLiveScores.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* the OS temp dir, not a literal /tmp: the desktop lane runs this on Windows */
const ENTRY = path.join(os.tmpdir(), 'liveScoresEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'liveScores.bundle.mjs');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.LIVE_CONTROL || '';
const CONTROLS = ['leak', 'feedhost', 'citedespn'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`LIVE_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const m = await import('${ROOT.replaceAll('\\', '/')}/src/lib/liveScores.ts');
export const { teamShort, sortForTicker, isShowable, windowFor, startLabel, LOOKBACK_MS, LOOKAHEAD_MS, SPORT_HUB, SPORT_TAG } = m;
`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { teamShort, sortForTicker, isShowable, windowFor, startLabel, LOOKBACK_MS, LOOKAHEAD_MS, SPORT_HUB, SPORT_TAG } = await import(pathToFileURL(BUNDLE).href);

console.log('1) the shaping says what a fan says and puts now first');
{
  const cases = [
    ['New York Yankees', 'mlb', 'Yankees'], ['Boston Red Sox', 'mlb', 'Red Sox'], ['Chicago White Sox', 'mlb', 'White Sox'],
    ['Toronto Blue Jays', 'mlb', 'Blue Jays'], ['Portland Trail Blazers', 'nba', 'Trail Blazers'], ['Toronto Maple Leafs', 'nhl', 'Maple Leafs'],
    ['Vegas Golden Knights', 'nhl', 'Golden Knights'], ['Athletics', 'mlb', 'Athletics'], ['Kansas City Chiefs', 'nfl', 'Chiefs'],
    ['Valencia', 'soccer', 'Valencia'], ['Real Betis', 'soccer', 'Real Betis'], ['Borussia Monchengladbach', 'soccer', 'Borussia Monchengl.'],
    ['', 'mlb', ''], ['   ', 'nfl', ''],
  ];
  for (const [name, sport, want] of cases) {
    const got = teamShort(name, sport);
    if (got !== want) fail(`teamShort(${JSON.stringify(name)}, ${sport}) = ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  }
  const t = h => new Date(Date.UTC(2026, 7, 25, h)).toISOString();
  const rows = [
    { id: 'a', sport: 'mlb', home: 'A', away: 'B', home_score: 1, away_score: 0, start_at: t(23), live: false, finished: true },
    { id: 'b', sport: 'mlb', home: 'C', away: 'D', home_score: null, away_score: null, start_at: t(20), live: false, finished: false },
    { id: 'c', sport: 'nfl', home: 'E', away: 'F', home_score: 7, away_score: 3, start_at: t(22), live: true, finished: false },
    { id: 'd', sport: 'soccer', home: 'G', away: 'H', home_score: 2, away_score: 2, start_at: t(19), live: true, finished: false },
  ];
  const order = sortForTicker(rows).map(r => r.id).join('');
  if (order !== 'dcba') fail(`sort put the rows in ${order}, wanted live first (kickoff order), then upcoming, then final: dcba`);
  const showable = [
    [{ home: 'A', away: 'B', start_at: t(1), live: true, finished: false, home_score: null, away_score: 1 }, false, 'a live game with no score'],
    [{ home: 'A', away: 'B', start_at: t(1), live: false, finished: true, home_score: 1, away_score: null }, false, 'a final with half a score'],
    [{ home: 'A', away: 'B', start_at: t(1), live: false, finished: false, home_score: null, away_score: null }, true, 'a game that has not started'],
    [{ home: '', away: 'B', start_at: t(1), live: false, finished: false, home_score: null, away_score: null }, false, 'a game with no home team'],
    [{ home: 'A', away: 'B', start_at: '', live: false, finished: false, home_score: null, away_score: null }, false, 'a game with no start time'],
  ];
  for (const [row, want, what] of showable) {
    if (isShowable(row) !== want) fail(`isShowable said ${!want} for ${what}`);
  }
  const now = new Date(Date.UTC(2026, 7, 25, 12));
  const w = windowFor(now);
  if (new Date(w.from).getTime() !== now.getTime() - LOOKBACK_MS) fail('the window does not start LOOKBACK_MS ago');
  if (new Date(w.to).getTime() !== now.getTime() + LOOKAHEAD_MS) fail('the window does not end LOOKAHEAD_MS ahead');
  if (LOOKBACK_MS < 6 * 3600e3 || LOOKAHEAD_MS < 12 * 3600e3) fail('the window is too narrow to hold a day of games');
  if (startLabel('not a date') !== '') fail('a garbage start time did not label as empty');
  if (!/\d/.test(startLabel(new Date().toISOString()))) fail('a valid start time produced no clock');
  for (const s of ['nfl', 'nba', 'mlb', 'nhl', 'soccer']) {
    if (!SPORT_HUB[s] || !SPORT_HUB[s].startsWith('/')) fail(`${s} has no hub route`);
    if (!SPORT_TAG[s]) fail(`${s} has no tag`);
  }
  /* hostile rows through the whole pipeline must not throw */
  try {
    sortForTicker([{}, { start_at: null }, { live: 'yes' }].filter(isShowable));
  } catch (e) { fail(`hostile rows threw: ${String(e).slice(0, 80)}`); }
  console.log(`   ${cases.length} names, the sort, ${showable.length} showability cases, the window, the labels, hostile rows`);
}

console.log('2) the feed stays server side');
{
  const src = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true })
    .filter(f => /\.(ts|tsx)$/.test(String(f)))
    .map(f => [String(f), fs.readFileSync(path.join(ROOT, 'src', String(f)), 'utf8')]);
  if (CONTROL === 'feedhost') {
    const i = src.findIndex(([f]) => String(f).endsWith('liveScores.ts'));
    if (i < 0) { console.error('control feedhost cannot find liveScores.ts, so it would change nothing'); process.exit(1); }
    const before = src[i][1];
    const after = `${before}\nconst poll = "https://site.api.espn.com/apis/site/v2/scoreboard";\n`;
    if (after === before) { console.error('control feedhost changed nothing'); process.exit(1); }
    src[i] = [src[i][0], after];
    console.log('   NEGATIVE CONTROL ON: the feed host pasted into a browser file, this section must go red');
  }
  if (CONTROL === 'citedespn') {
    const i = src.findIndex(([f]) => String(f).endsWith('leagueCaps.ts'));
    if (i < 0) { console.error('control citedespn cannot find leagueCaps.ts, so it would change nothing'); process.exit(1); }
    const before = src[i][1];
    const after = `${before}\nconst elsewhere = "https://www.espn.com/nfl/story/_/id/1";\n`;
    if (after === before) { console.error('control citedespn changed nothing'); process.exit(1); }
    src[i] = [src[i][0], after];
    console.log('   NEGATIVE CONTROL ON: an espn.com string outside a cited source url, this section must go red');
  }
  /* A FEED HOST IS A FETCH TARGET. A PUBLISHER IS A CITATION. They are not the
     same thing and this check used to ban both, because when it was written
     nothing in src had any reason to name ESPN except calling it.
     That changed on 2026-09-12: the reference explainers cite ESPN articles as
     one of their two publishers per period and print the URL on the page, the
     way they already cite Wikipedia, and src/lib/leagueCaps.ts cites ESPN for
     two of the four salary cap figures. Three files went red for doing exactly
     what the data rules ask.
     So the ban is now precise instead of broad, and stricter where it counts.
     The feed's own hosts are refused outright, wherever they appear and in
     whatever shape, because nothing in the browser may ever name one. Any
     other espn.com string is allowed ONLY as the value of a url field, which
     is what a source list entry looks like; the same string in a fetch, a
     template literal or a bare constant still fails. Comments are stripped
     first so prose about the rule cannot satisfy it. */
  const FEED_HOSTS = /api-sports\.io|apisports|site\.api\.espn/i;
  /* The line comment stripper must not eat a URL, and the lookbehind below is
     the whole reason it does not. A stripper that matches two slashes anywhere
     also matches the pair inside a scheme, so it deletes the host and the rest
     of the line with it. That silently emptied this entire check on the first
     attempt: both new controls fired and the section stayed green, because no
     URL survived stripping to be found. Requiring that the pair is not
     preceded by a colon leaves a scheme alone and still removes a real
     comment. */
  const stripped = src.map(([f, t]) => [f, t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ')]);
  const feedOffenders = stripped.filter(([, t]) => FEED_HOSTS.test(t)).map(([f]) => f);
  if (feedOffenders.length) fail(`the feed's host is named in the browser bundle: ${feedOffenders.join(', ')}`);
  const looseOffenders = stripped.filter(([, t]) => {
    const hits = [...t.matchAll(/espn\.com/gi)];
    if (!hits.length) return false;
    /* every occurrence must sit inside a url: '...' or url: "..." value */
    const cited = [...t.matchAll(/\burl:\s*(['"])([^'"]*espn\.com[^'"]*)\1/gi)].length;
    return hits.length !== cited;
  }).map(([f]) => f);
  if (looseOffenders.length) {
    fail(`espn.com is named outside a cited source url in the browser bundle: ${looseOffenders.join(', ')}`);
  }
  const client = fs.readFileSync(path.join(ROOT, 'src/lib/liveScores.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (!/from '@\/integrations\/supabase\/client'/.test(client)) fail('liveScores.ts does not read the project URL and key from the one file that knows them');
  if (/VITE_SUPABASE/.test(client)) fail('liveScores.ts reads VITE_SUPABASE_*, which points at a deleted project (see CLAUDE.md)');
  const fn = fs.readFileSync(path.join(ROOT, 'supabase/functions/scores-poll/index.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (!/rpc\("app_secret"/.test(fn)) fail('the poller does not read its secrets through app_secret(), so where does the key come from');
  if (!/x-poll-secret/.test(fn)) fail('the poller no longer requires the poll secret, so anyone can burn the daily allowance');
  console.log(`   ${src.length} browser files, none name the feed; the poller reads its secrets from the database and checks the caller`);
}

console.log('3) no secret in the repo');
{
  let fn = fs.readFileSync(path.join(ROOT, 'supabase/functions/scores-poll/index.ts'), 'utf8');
  if (CONTROL === 'leak') {
    const before = fn;
    fn += '\nconst apisportsKey = "0123456789abcdef0123456789abcdef";\n';
    if (fn === before) { console.error('control changed nothing'); process.exit(1); }
    console.log('   NEGATIVE CONTROL ON: a key literal appended to the function source in memory, this section must go red');
  }
  const client = fs.readFileSync(path.join(ROOT, 'src/lib/liveScores.ts'), 'utf8');
  const hook = fs.readFileSync(path.join(ROOT, 'src/hooks/useLiveScores.ts'), 'utf8');
  let leaks = 0;
  for (const [name, text] of [['scores-poll/index.ts', fn], ['liveScores.ts', client], ['useLiveScores.ts', hook]]) {
    for (const m of text.matchAll(/\b[0-9a-f]{32,64}\b/g)) {
      leaks += 1;
      fail(`${name} carries a ${m[0].length} character hex literal (${m[0].slice(0, 6)}...), which has the shape of a key`);
    }
  }
  console.log(`   3 files scanned for key shaped literals, ${leaks} found`);
}

console.log('');
if (CONTROL === 'leak') {
  if (failures > 0) { console.log(`simLiveScores control: green. The planted key was reported (${failures} finding).`); process.exit(0); }
  console.error('simLiveScores control: RED. A planted key literal went unreported.'); process.exit(1);
}
if (failures > 0) { console.error(`simLiveScores: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simLiveScores: green. The scores on the strip are shaped honestly, read from the table, and the keys stay in the database.');
