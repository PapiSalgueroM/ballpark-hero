/* Round 821: every Perfect Season wheel can land on every season its table
   holds, and a daily already dealt keeps the wheel it was dealt from.

   The MLB wheel index asked the server for 5,000 rows in one request. The
   server caps a request at 1,000 rows and says nothing, so for its whole life
   the wheel only ever landed on 1901 to 1962 of 2,572 team seasons (1901 to
   2021), while the guide said "1901 onward" and its worked example drafted
   Bob Gibson off the 1968 Cardinals and Ken Griffey Jr. off the 1997 Mariners,
   two stops nobody could ever spin. The NHL wheel had the same read and
   counted its franchise decades from the first 1,000 of 5,180 skater rows
   (194 stops). The NFL read had the same shape with 828 rows in its window,
   and the NBA read asked for a fixed fifteen pages (15,000 rows against 14,722
   on 2026-10-01) and skipped a page that failed. Round 487 met the same cap in
   the tennis validator (scripts/simUnboundedSelects.mjs).

   All four now page through fetchAllRowsParallel (src/lib/fetchAllRows.ts) in
   id order. A daily dated before FULL_WHEEL_DAILY_FROM (src/lib/perfectSeason.ts)
   still deals from the old wheel, because the daily picks stops by position
   and drops themes by count, so a longer wheel deals a different daily.

   MEASURED 2026-10-01 (live tables, read only):
     MLB  2,572 stops, 1901 to 2021 (was 1,000, 1901 to 1962)
     NHL  222 stops counted from 5,180 rows, 1960s to 2020s (was 1,000 rows, 194 stops)
     NFL  828 stops, 1999 to 2024 (unchanged)
     NBA  14,722 rows, 1951-52 to 2024-25 (unchanged)
   The old reads, replayed from main at 729b9f3b, return exactly the first
   1,000 id ordered rows (15,000 for the NBA), so the old wheel is rebuilt
   exactly from the new read.

   Sections (a failure names its sport):
     1. THE WHEEL IS THE WHOLE TABLE. Each sport's full wheel read is logged
        request by request: the rows it received equal the table's exact count
        for the same filter, the last page it read is short (no read stops at
        exactly 1,000 rows without asking for the next page), and the wheel's
        season range equals the table's (MLB, NFL and NBA seasons, NHL
        decades).
     2. THE OLD WHEEL IS KEPT FOR DAILIES BEFORE THE SWITCH. The wheel a daily
        dated before FULL_WHEEL_DAILY_FROM gets equals, entry for entry and in
        order, what the pre Round 821 adapter (read from git at 729b9f3b)
        builds today, and for MLB the full wheel deals a different daily on
        2026-10-01, so the pin is doing something. Once the switch date has
        passed nobody can be dealt an old daily again, so this section says so
        loudly and skips: delete the oldWheel option, this section and the
        nopin control together.
     3. THE GUIDE NAMES ONLY STOPS THE WHEEL CAN LAND ON. Every "the 1927
        Yankees", "the 1986-87 Lakers", "the 1980s Oilers" or "the 2007
        Patriots" in the guide entry and the page resolves to a stop on the
        full wheel, and the MLB example's three named players are in those
        squads at the slots the example gives them.

   Negative controls (SIM_PS_WHEEL_CONTROL=...), each edits an in memory copy,
   refuses to run if its anchor is not there exactly once, and must redden
   exactly its labels:
     unpaged     the MLB read goes back to one request with .limit(5000)   1:mlb 2:mlb 3:mlb
     unpagednhl  the NHL read goes back to one request with .limit(6000)   1:nhl
     nopin       the MLB adapter ignores oldWheel                          2:mlb
     example     the guide's Griffey stop moves to the 2024 Mariners       3:mlb
   Exit 0 green or a control that fired exactly, 1 otherwise, 2 for an
   unknown control. Needs the network: an unreachable database is a failure,
   not a pass.

   Run: node scripts/simPerfectSeasonWheel.mjs */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPORTS = ['nba', 'nhl', 'mlb', 'nfl'];
const OLD_REF = '729b9f3b';
const ADAPTER = { nba: 'perfectSeasonNba', nhl: 'perfectSeasonNhl', mlb: 'perfectSeasonMlb', nfl: 'perfectSeasonNfl' };
const INDEX_FN = { nba: 'fetchTeamSeasonIndex', nhl: 'fetchTeamEraIndex', mlb: 'fetchTeamSeasonIndex', nfl: 'fetchTeamSeasonIndex' };
const TABLE = { nba: 'bref_nba_player_seasons', nhl: 'nhl_player_stats', mlb: 'lahman_teams', nfl: 'nfl_team_seasons' };
const FILTER = { nba: 'minutes=gte.1000', nhl: 'games=gte.15', mlb: 'yearid=gte.1901', nfl: 'year=gte.1999&year=lte.2024' };
const GUIDE = { nba: 'basketball', nhl: 'hockey', mlb: 'baseball', nfl: 'football' };
const PAGE = { nba: 'PerfectSeasonNba', nhl: 'PerfectSeasonNhl', mlb: 'PerfectSeasonMlb', nfl: 'PerfectSeasonNfl' };

const lf = s => s.replace(/\r\n/g, '\n');
const MLB_PAGED = `const { data, error } = await fetchAllRowsParallel<any>((from, to) => supabase
      .from('lahman_teams' as any)
      .select('yearid, teamid, name, w, l, g')
      .gte('yearid', 1901)
      .order('id', { ascending: true })
      .range(from, to), INDEX_PAGES);`;
const NHL_PAGED = `const { data, error } = await fetchAllRowsParallel<any>((from, to) => supabase
      .from('nhl_player_stats' as any)
      .select('teams, year_from, year_to')
      .gte('games', MIN_GAMES)
      .order('id', { ascending: true })
      .range(from, to), INDEX_PAGES);`;
const CONTROLS = {
  unpaged: { file: 'src/lib/perfectSeasonMlb.ts', module: true, from: MLB_PAGED, to: `const { data, error } = await supabase
      .from('lahman_teams' as any)
      .select('yearid, teamid, name, w, l, g')
      .gte('yearid', 1901)
      .limit(5000);`, note: 'the MLB wheel reads one capped request again (section 2 reddens too: the full wheel is the old one, so the pin proves nothing)', want: ['1:mlb', '2:mlb', '3:mlb'] },
  unpagednhl: { file: 'src/lib/perfectSeasonNhl.ts', module: true, from: NHL_PAGED, to: `const { data, error } = await supabase
      .from('nhl_player_stats' as any)
      .select('teams, year_from, year_to')
      .gte('games', MIN_GAMES)
      .limit(6000);`, note: 'the NHL wheel reads one capped request again', want: ['1:nhl'] },
  nopin: { file: 'src/lib/perfectSeasonMlb.ts', module: true, from: '(opts.oldWheel ? data.slice(0, OLD_WHEEL_ROWS) : data)', to: '(data)', note: 'an MLB daily before the switch deals from the full wheel, so the day it ships changes mid day', want: ['2:mlb'] },
  example: { file: 'src/data/gameContent/baseball.ts', module: false, from: 'Ken Griffey Jr. from the 1997 Mariners', to: 'Ken Griffey Jr. from the 2024 Mariners', note: 'the guide example drafts from a season the table does not hold', want: ['3:mlb'] },
};
const CONTROL = process.env.SIM_PS_WHEEL_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`SIM_PS_WHEEL_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }
const control = CONTROL ? CONTROLS[CONTROL] : null;
if (control) {
  const n = lf(fs.readFileSync(path.join(ROOT, control.file), 'utf8')).split(control.from).length - 1;
  if (n !== 1) { console.error(`control ${CONTROL}: the anchor appears ${n} times in ${control.file}, refusing to run a dead control`); process.exit(1); }
  console.log(`NEGATIVE CONTROL ON: ${control.note}`);
}
const readSrc = rel => {
  const src = lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  return control && !control.module && control.file === rel ? src.replace(control.from, control.to) : src;
};

/* Every REST response the bundled client receives, logged before the
   supabase client is created so it captures this fetch. A network error is
   retried, so a transient timeout does not read as a defect. */
const LOG = [];
const realFetch = globalThis.fetch;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function patientFetch(input, init) {
  for (let t = 0; ; t++) {
    try { return await realFetch(input, init); } catch (e) { if (t >= 3) throw e; await sleep(1500 * (t + 1)); }
  }
}
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const res = await patientFetch(input, init);
  if (url.includes('/rest/v1/')) {
    let rows = null;
    try { const j = await res.clone().json(); rows = Array.isArray(j) ? j.length : null; } catch { /* not json */ }
    LOG.push({ url: decodeURIComponent(url), status: res.status, rows });
  }
  return res;
};

/* Bundle the new adapters, the old ones from git, the themes and the client. */
const TMP = path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), `ps-wheel-${process.pid}`);
fs.mkdirSync(TMP, { recursive: true });
const redirect = new Map();
if (control && control.module) {
  const copy = path.join(TMP, `control-${path.basename(control.file)}`);
  fs.writeFileSync(copy, lf(fs.readFileSync(path.join(ROOT, control.file), 'utf8')).replace(control.from, control.to));
  redirect.set(path.join(ROOT, control.file), copy);
}
const oldFiles = {};
for (const s of SPORTS) {
  let src;
  try { src = execFileSync('git', ['show', `${OLD_REF}:src/lib/${ADAPTER[s]}.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }); } catch { console.error(`git show ${OLD_REF} failed: the pre Round 821 adapters are not in this clone's history, so section 2 cannot run`); process.exit(1); }
  oldFiles[s] = path.join(TMP, `old-${ADAPTER[s]}.ts`);
  fs.writeFileSync(oldFiles[s], src);
}
const resolveAt = p => {
  const base = path.join(ROOT, 'src', p.slice(2));
  for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
    const full = base + ext;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return redirect.get(full) || full;
  }
  return null;
};
const fwd = p => p.replaceAll('\\', '/');
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  'const store = new Map();',
  'globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };',
  "export const client = await import('@/integrations/supabase/client');",
  "export const core = await import('@/lib/perfectSeason');",
  "export const themes = await import('@/lib/perfectSeasonThemes');",
  ...SPORTS.map(s => `export const new_${s} = await import('@/lib/${ADAPTER[s]}');`),
  ...SPORTS.map(s => `export const old_${s} = await import('${fwd(oldFiles[s])}');`),
].join('\n'));
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error',
  plugins: [{ name: 'at-alias', setup(b) { b.onResolve({ filter: /^@\// }, args => { const r = resolveAt(args.path); return r ? { path: r } : undefined; }); } }],
});
const M = await import(pathToFileURL(OUT).href);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* temp only */ }
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = M.client;
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) { console.error('the client module exports no SUPABASE_URL or key'); process.exit(1); }
const HEAD = { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` };
const rest = async (q, extra = {}) => {
  const res = await patientFetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: { ...HEAD, ...extra } });
  if (!res.ok) throw new Error(`${q}: HTTP ${res.status}`);
  return res;
};
const exactCount = async (table, filter) => {
  const res = await rest(`${table}?select=id&${filter}`, { Prefer: 'count=exact', Range: '0-0' });
  const n = Number((res.headers.get('content-range') || '').split('/')[1]);
  if (!Number.isFinite(n)) throw new Error(`${table}: no exact count`);
  return n;
};
const firstValue = async (table, col, filter, dir) => {
  const j = await (await rest(`${table}?select=${col}&${filter}&order=${col}.${dir}&limit=1`)).json();
  return j[0]?.[col];
};

let failures = 0;
let section = 0;
let sport = '';
const red = new Set();
const fail = m => { failures += 1; red.add(`${section}:${sport}`); console.error(`  FAIL [${sport}]: ${m}`); };
const fullIndex = {};

async function logged(fn) {
  LOG.length = 0;
  const out = await fn();
  return { out, log: [...LOG] };
}

section = 1;
console.log('1) the wheel is the whole table');
for (sport of SPORTS) {
  let res;
  try { res = await logged(() => M[`new_${sport}`][INDEX_FN[sport]]()); } catch (e) { fail(`the wheel read threw: ${e.message}`); continue; }
  const index = res.out;
  if (!index || !index.length) { fail('the wheel read returned nothing (database unreachable or a page failed every retry)'); continue; }
  fullIndex[sport] = index;
  const reads = res.log.filter(r => r.url.includes(`/rest/v1/${TABLE[sport]}?`));
  if (!reads.length) { fail(`the request logger saw no read of ${TABLE[sport]}, so nothing below measures anything`); continue; }
  const offsetOf = r => Number(/[?&]offset=(\d+)/.exec(r.url)?.[1] ?? 0);
  reads.sort((a, b) => offsetOf(a) - offsetOf(b));
  const received = reads.reduce((t, r) => t + (r.rows ?? 0), 0);
  const count = await exactCount(TABLE[sport], FILTER[sport]);
  const last = reads[reads.length - 1];
  console.log(`   ${sport}: ${reads.length} request(s), ${received.toLocaleString('en-US')} rows received, table holds ${count.toLocaleString('en-US')}; ${index.length} stops`);
  if (received !== count) fail(`the wheel read received ${received} rows but ${TABLE[sport]} holds ${count} for its filter`);
  if (last.rows === 1000 || reads.some(r => r.rows === null)) fail(`the last read stopped at ${last.rows} rows without asking for the next page (${reads.map(r => r.rows).join(', ')})`);
  /* the season range */
  if (sport === 'mlb') {
    const lo = Number(await firstValue('lahman_teams', 'yearid', 'yearid=gte.1901&g=gte.100', 'asc'));
    const hi = Number(await firstValue('lahman_teams', 'yearid', 'yearid=gte.1901&g=gte.100', 'desc'));
    const ys = index.map(e => e.yearid);
    const [a, b] = [Math.min(...ys), Math.max(...ys)];
    console.log(`        wheel ${a} to ${b}, table ${lo} to ${hi}`);
    if (a !== lo || b !== hi) fail(`the wheel spans ${a} to ${b} but the table holds ${lo} to ${hi}`);
  }
  if (sport === 'nfl') {
    const lo = Number(await firstValue('nfl_team_seasons', 'year', FILTER.nfl, 'asc'));
    const hi = Number(await firstValue('nfl_team_seasons', 'year', FILTER.nfl, 'desc'));
    const ys = index.map(e => e.year);
    const [a, b] = [Math.min(...ys), Math.max(...ys)];
    console.log(`        wheel ${a} to ${b}, table ${lo} to ${hi}`);
    if (a !== lo || b !== hi) fail(`the wheel spans ${a} to ${b} but the table holds ${lo} to ${hi}`);
  }
  if (sport === 'nba') {
    const lo = await firstValue('bref_nba_player_seasons', 'season', FILTER.nba, 'asc');
    const hi = await firstValue('bref_nba_player_seasons', 'season', FILTER.nba, 'desc');
    const ss = index.map(e => e.season).sort();
    console.log(`        wheel ${ss[0]} to ${ss[ss.length - 1]}, table ${lo} to ${hi}`);
    if (ss[0] !== lo || ss[ss.length - 1] !== hi) fail(`the wheel spans ${ss[0]} to ${ss[ss.length - 1]} but the table holds ${lo} to ${hi}`);
  }
  if (sport === 'nhl') {
    /* The adapter spins on decades from 1960; the last one is the decade of
       the latest season the table holds. */
    const hiText = await firstValue('nhl_player_stats', 'year_to', FILTER.nhl, 'desc');
    const want = Math.floor(parseInt(String(hiText), 10) / 10) * 10;
    const eras = index.map(e => e.eraStart);
    const [a, b] = [Math.min(...eras), Math.max(...eras)];
    console.log(`        wheel ${a}s to ${b}s, table runs to ${hiText}`);
    if (a !== 1960 || b !== want) fail(`the wheel spans the ${a}s to the ${b}s, the table runs 1960s to ${want}s`);
  }
}

section = 2;
console.log('2) a daily dated before the switch keeps the old wheel');
const SWITCH = M.core.FULL_WHEEL_DAILY_FROM;
const today = M.core.getDailyDateET();
sport = 'all';
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(SWITCH))) fail(`FULL_WHEEL_DAILY_FROM is not a date: ${SWITCH}`);
const dayBefore = new Date(`${SWITCH}T12:00:00Z`); dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
if (!M.core.dailyUsesOldWheel(dayBefore.toISOString().slice(0, 10)) || M.core.dailyUsesOldWheel(SWITCH)) fail(`dailyUsesOldWheel does not switch at ${SWITCH}`);
if (today > SWITCH) {
  console.log(`   SKIPPED: TODAY (${today}) IS PAST THE SWITCH (${SWITCH}). NO DAILY CAN BE DEALT FROM THE OLD WHEEL ANY MORE: DELETE THE oldWheel OPTION, THIS SECTION AND THE nopin CONTROL.`);
} else {
  for (sport of SPORTS) {
    const old = await M[`old_${sport}`][INDEX_FN[sport]]();
    const pinned = await M[`new_${sport}`][INDEX_FN[sport]]({ oldWheel: true });
    if (!old || !pinned) { fail('a wheel read returned nothing'); continue; }
    const same = JSON.stringify(old) === JSON.stringify(pinned);
    console.log(`   ${sport}: old read ${old.length} stops, pinned ${pinned.length}, full ${fullIndex[sport]?.length}; identical in order: ${same}`);
    if (!same) fail(`a daily before ${SWITCH} would deal from a different wheel than the one the old read built (${old.length} against ${pinned.length} stops)`);
    if (sport === 'mlb' && fullIndex.mlb) {
      /* The pin is not vacuous: the full wheel deals a different daily. */
      const deal = idx => {
        const theme = M.themes.getDailyTheme('mlb', '2026-10-01', idx);
        const pool = M.themes.applyTheme(idx, theme);
        const pick = M.core.makeDailyPicker('mlb', '2026-10-01');
        return `${theme?.id ?? 'none'}: ${Array.from({ length: 11 }, () => { const e = pool[pick(pool.length)]; return `${e.yearid} ${e.teamid}`; }).join(', ')}`;
      };
      const a = deal(pinned);
      const b = deal(fullIndex.mlb);
      console.log(`        2026-10-01 from the old wheel  ${a}\n        2026-10-01 from the full wheel ${b}`);
      if (a === b) fail('the old and the full wheel deal the same 2026-10-01 daily, so this section proves nothing about the pin');
    }
  }
}

section = 3;
console.log('3) the guide names only stops the wheel can land on');
function guideEntry(rel, route) {
  const src = readSrc(rel);
  const start = src.indexOf(`'${route}': {`);
  if (start < 0) return '';
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i += 1) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i += 1; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i += 1; i += 1; } continue; }
    if (c === '{') depth += 1;
    if (c === '}') { depth -= 1; if (depth === 0) return src.slice(start, i + 1); }
  }
  return '';
}
const stripComments = s => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* How a stop is written in prose, and how it resolves on the wheel. */
const STOP = {
  mlb: { re: /\bthe (\d{4}) ([A-Z][a-z]+)\b/g, on: (e, y, t) => e.yearid === Number(y) && e.name.endsWith(t), least: 5 },
  nfl: { re: /\bthe (\d{4}) ([A-Z][a-z]+)\b/g, on: (e, y, t) => e.year === Number(y) && e.name.endsWith(t), least: 2 },
  nba: { re: /\bthe (\d{4}-\d{2}) ([A-Z][a-z]+)\b/g, on: (e, y, t) => e.season === y && e.teamName.endsWith(t), least: 1 },
  nhl: { re: /\bthe (\d{4})s ([A-Z][a-z]+)\b/g, on: (e, y, t) => e.eraStart === Number(y) && e.teamName.endsWith(t), least: 1 },
};
/* The MLB example's named picks: the stop, the player as the adapter names
   him, and the slot the example puts him in. */
const MLB_PICKS = [
  ['the 1927 Yankees', 'Lou Gehrig', 'Lou Gehrig', '1B'],
  ['the 1968 Cardinals', 'Bob Gibson', 'Bob Gibson', 'SP'],
  ['the 1997 Mariners', 'Ken Griffey Jr.', 'Ken Griffey', 'CF'],
];
for (sport of SPORTS) {
  const index = fullIndex[sport];
  if (!index) { fail('no full wheel to check against (section 1 failed to read it)'); continue; }
  const text = guideEntry(`src/data/gameContent/${GUIDE[sport]}.ts`, `/perfect-season-${sport}`) + '\n' + stripComments(readSrc(`src/pages/${PAGE[sport]}.tsx`));
  const found = new Map();
  for (const m of text.matchAll(STOP[sport].re)) found.set(m[0], [m[1], m[2]]);
  console.log(`   ${sport}: ${[...found.keys()].join('; ') || 'nothing'}`);
  if (found.size < STOP[sport].least) fail(`found ${found.size} stops named in the guide and page, expected at least ${STOP[sport].least}: the reader no longer sees them`);
  for (const [phrase, [y, t]] of found) {
    if (!index.some(e => STOP[sport].on(e, y, t))) fail(`the copy names ${phrase}, which the wheel can never land on`);
  }
  if (sport === 'mlb') {
    for (const [stop, said, name, slot] of MLB_PICKS) {
      if (!text.includes(`${said}`) || !text.includes(stop)) { fail(`the example no longer names ${said} off ${stop}; update MLB_PICKS`); continue; }
      const [y, t] = found.get(stop) || [];
      const entry = index.find(e => STOP.mlb.on(e, y, t));
      if (!entry) continue;
      const squad = await M.new_mlb.fetchSquad(entry);
      const p = squad?.players.find(x => x.name === name);
      if (!p) { fail(`${stop} deals no ${name} (${squad ? squad.players.length + ' players' : 'squad failed to load'})`); continue; }
      if (!p.eligible.includes(slot)) fail(`${name} off ${stop} cannot play ${slot} (eligible ${p.eligible.join(', ')})`);
      else console.log(`        ${name} is on ${entry.yearid} ${entry.name}, rated ${p.rating}, eligible at ${slot}`);
    }
  }
}

console.log('');
if (control) {
  const want = new Set(control.want);
  const got = [...red].sort();
  const same = got.length === want.size && got.every(g => want.has(g));
  if (same) { console.log(`simPerfectSeasonWheel: control ${CONTROL} turned ${control.want.join(', ')} red and nothing else. The check works.`); process.exit(0); }
  console.error(`simPerfectSeasonWheel: control ${CONTROL} should have reddened exactly ${control.want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`);
  process.exit(1);
}
if (failures) { console.error(`simPerfectSeasonWheel: ${failures} failure(s) in ${[...red].sort().join(', ')}`); process.exit(1); }
console.log('simPerfectSeasonWheel: green. Every Perfect Season wheel reads its whole table, a daily already dealt keeps its wheel, and the guides name only stops the wheel can land on.');
process.exit(0);
