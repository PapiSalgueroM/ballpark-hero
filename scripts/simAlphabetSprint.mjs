/* Alphabet Sprint accepts the player you name, if he is playing this season.

   Round 464. A player wrote in through the report button on 2026-09-05:
   "Bug: wont exept anything". The mechanics were fine: a live run in a real
   browser took "Allister" for A, scored it and moved to the next letter. The
   pool was the problem. The game borrowed Who Am I's guessable pool, the 500
   most valuable current players, because it was there, and then asked you to
   name ANY footballer whose surname starts with the letter. A fan who knows
   the game names real players outside the 500 all day and gets "That doesn't
   match an unused surname" for every one of them, which reads exactly like
   the report. The 2026 season carries 5,496 named players in the market
   table; the 500 accepted about one real answer in eleven.

   The pool is now the whole current season (fetchSprintPool: every 2026 row
   of player_market_values_dedup with a value, one row per player, paged).

   WHAT THIS HOLDS, against a saved copy of the real season rows
   (scripts/data/alphabetSprintPool.json, refreshed with --refresh through
   PostgREST; the harness refuses to run without it):
     1) The pool is the season: at least 4,500 players after bucketing
        (measured 5,4xx), and every letter A to Z except the genuinely thin
        ones is playable (at least 22 of 26; measured with the 500 it was 22
        only because MIN_PLAYERS_PER_LETTER is 5, and I, Q and U sat at 3, 2
        and 4).
     2) EVERY player in the pool can be named: his full name is a hit, and
        his bare surname is a hit or an honest "which one" (ambiguous), never
        a miss. The share that is ambiguous on a bare surname is measured and
        reported (a bigger pool means more Silvas), and must stay under a
        third so surnames remain the fast way to play.
     3) The boot cost is measured: rows, pages of 1,000, and bytes of the
        four columns the fetch selects, and the fetch selects exactly those
        four columns and nothing else (a source check, comments stripped).
     4) The report reproduced and closed: under the old 500 player pool,
        fewer than 20 percent of this season's surnames resolve; under the
        new one, 100 percent.

   Negative control:
     ALPHABET_SPRINT_CONTROL=top500 cuts the pool to the 500 most valuable in
       memory, the shape the game shipped with; section 4 must go red with the
       measured acceptance, and section 1 with the missing letters.
   Refuses to run if the cut changes nothing.

   Run: node scripts/simAlphabetSprint.mjs [--refresh]
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'scripts', 'data', 'alphabetSprintPool.json');
const CONTROL = process.env.ALPHABET_SPRINT_CONTROL || '';
if (CONTROL && CONTROL !== 'top500') { console.error(`ALPHABET_SPRINT_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

/* The client file carries the live url and anon key on purpose (CLAUDE.md). */
const client = read('src/integrations/supabase/client.ts');
const URL_ = /const SUPABASE_URL = ['"]([^'"]+)['"]/.exec(client)?.[1];
const KEY = /const SUPABASE_PUBLISHABLE_KEY = ['"]([^'"]+)['"]/.exec(client)?.[1];

if (process.argv.includes('--refresh')) {
  if (!URL_ || !KEY) { console.error('could not read the Supabase url and key from the client file'); process.exit(1); }
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL_}/rest/v1/player_market_values_dedup?select=player_name,nationality,club,market_value_usd&year=eq.2026&market_value_usd=gt.0&order=player_name.asc`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    });
    if (!res.ok && res.status !== 206) { console.error(`refresh failed: HTTP ${res.status}`); process.exit(1); }
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  fs.writeFileSync(DATA, JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), rows }, null, 0));
  console.log(`refreshed ${rows.length} rows into scripts/data/alphabetSprintPool.json`);
}
if (!fs.existsSync(DATA)) { console.error('scripts/data/alphabetSprintPool.json is missing: run with --refresh first. Refusing to run on nothing.'); process.exit(1); }
const saved = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const rows = saved.rows;

/* Bundle the REAL lib. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-sprint-'));
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, `export * from '${ROOT.replace(/\\/g, '/')}/src/lib/alphabetSprint.ts';\n`);
const out = path.join(tmp, 'bundle.mjs');
const esbuild = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
execFileSync(esbuild, [entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, `--alias:@=${path.join(ROOT, 'src')}`, '--log-level=error'], { stdio: 'pipe', shell: process.platform === 'win32' });
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
const lib = await import(pathToFileURL(out).href);

let pool = lib.rowsToSprintPool(rows);
const fullPool = pool;
if (CONTROL === 'top500') {
  const cut = [...pool].sort((a, b) => b.value - a.value).slice(0, 500);
  if (cut.length >= pool.length) { console.error('control cannot run: the pool is not bigger than 500, so the cut changes nothing'); process.exit(1); }
  pool = cut;
  console.log(`NEGATIVE CONTROL ON: the pool is cut to the 500 most valuable players, the shape the game shipped with (${fullPool.length} before)`);
}

console.log(`season rows saved ${saved.fetched}: ${rows.length}; sprint pool after bucketing: ${pool.length}`);

console.log('1) the pool is the season, and nearly every letter is playable');
{
  if (pool.length < 4500) fail(`the pool holds ${pool.length} players; the season holds thousands, so this is a slice of it`);
  const playable = lib.playableLetters(pool);
  const missing = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => !playable.has(l));
  console.log(`   ${playable.size} playable letters; not on the wheel: ${missing.join('') || 'none'}`);
  if (playable.size < 22) fail(`only ${playable.size} letters are playable (${missing.join('')} missing), so letters a fan can answer never come up`);
  const counts = lib.letterCounts(pool);
  for (const l of ['I', 'Q', 'U']) if ((counts.get(l) || 0) < lib.MIN_PLAYERS_PER_LETTER) fail(`letter ${l} holds ${counts.get(l) || 0} players, under the ${lib.MIN_PLAYERS_PER_LETTER} the wheel needs; the season has dozens`);
}

console.log('2) every player in the pool can be named, by full name always and by surname unless it is shared');
{
  let fullHits = 0, surnameHits = 0, ambiguous = 0, twins = 0, misses = [];
  for (const p of pool) {
    const byFull = lib.resolveSprintGuess(pool, p.letter, p.name, new Set());
    /* Two real players can share a folded full name (the two Édersons, the
       two Ladislav Krejčís): typing it names one of them, which is a fair
       answer, so a hit on any player counts and the twins are only counted. */
    if (byFull.kind === 'hit') { fullHits += 1; if (byFull.player.name !== p.name) twins += 1; } else misses.push(`${p.name} by full name -> ${byFull.kind}`);
    const bySurname = lib.resolveSprintGuess(pool, p.letter, p.surname, new Set());
    if (bySurname.kind === 'hit') surnameHits += 1;
    else if (bySurname.kind === 'ambiguous') ambiguous += 1;
    else misses.push(`${p.name} by surname "${p.surname}" -> miss`);
  }
  const ambShare = ambiguous / pool.length;
  console.log(`   full names: ${fullHits} of ${pool.length} hit (${twins} land on a namesake, which is fair); surnames: ${surnameHits} hit, ${ambiguous} ask for the full name (${(100 * ambShare).toFixed(1)}%), ${misses.length} miss`);
  if (misses.length) fail(`${misses.length} pool players cannot be named: ${misses.slice(0, 3).join(' | ')}`);
  if (ambShare > 1 / 3) fail(`${(100 * ambShare).toFixed(1)}% of bare surnames are ambiguous, so surnames stop being the fast way to play`);
}

console.log('3) the boot cost, and the fetch selects only what the game reads');
{
  const bytes = Buffer.byteLength(JSON.stringify(rows.map(r => ({ player_name: r.player_name, nationality: r.nationality, club: r.club, market_value_usd: r.market_value_usd }))));
  console.log(`   ${rows.length} rows, ${Math.ceil(rows.length / 1000)} pages of 1,000, ${(bytes / 1024).toFixed(0)} KiB of JSON before compression`);
  const src = read('src/lib/alphabetSprint.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const sel = /\.select\('([^']+)'\)/.exec(src.slice(src.indexOf('fetchSprintPool')))?.[1];
  if (sel !== 'player_name, nationality, club, market_value_usd') fail(`fetchSprintPool selects "${sel}", not the four columns the sprint reads, so the boot pays for columns nobody looks at`);
  else console.log('   fetchSprintPool selects exactly the four columns the sprint reads');
  if (!/from\('player_market_values_dedup'\)/.test(src)) fail('fetchSprintPool does not read the dedup view, so a player with two 2026 rows would be counted twice');
}

console.log('4) the report, reproduced and closed: this season\'s surnames resolve');
{
  /* The season's players as a fan would name them: bare surnames from the
     full season, asked of whatever pool is in play. */
  let accepted = 0;
  for (const p of fullPool) {
    const r = lib.resolveSprintGuess(pool, p.letter, p.surname, new Set());
    if (r.kind !== 'miss') accepted += 1;
  }
  const share = accepted / fullPool.length;
  console.log(`   ${accepted} of ${fullPool.length} of this season's surnames resolve (${(100 * share).toFixed(1)}%)`);
  if (share < 0.95) fail(`only ${(100 * share).toFixed(1)}% of this season's surnames are accepted, which is the report: a fan naming real players gets "doesn't match"`);
}

fs.rmSync(tmp, { recursive: true, force: true });
await new Promise(r => setTimeout(r, 50));
if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimAlphabetSprint: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimAlphabetSprint: green. Name anyone playing this season and the sprint takes him.');
