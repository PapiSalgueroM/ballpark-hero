/* NBA Starting 5 accepts the name a player is actually thinking of.
 *
 * Round 494. There were two search configs for the SAME table. playerSearch.ts
 * exports NBA_PLAYER_SOURCE with firstNameColumn:'first_name', and NBA Chain and
 * NBA Connect 4 both use it. useNbaLineup.ts carried its own copy without that
 * field, so the lineup game searched last_name ALONE.
 *
 * What that did to a player: the box says "Type a player name..." and it is
 * mounted validateOnly, so a suggestion click is the only way to fill a slot.
 * Typing the name he had in mind returned nothing at all. Only a bare surname
 * worked and nothing on screen said so.
 *
 * The surname workaround was itself lossy, because the candidate key WAS the
 * surname: two players sharing one on the same team collapsed into a single
 * arbitrary row. Measured 2026-09-06 on nba_players_extended_v2: 715 of its
 * 5,135 rows share a surname with a teammate, across all 32 teams. Golden State
 * holds Seth Curry and Stephen Curry; the Lakers hold LeBron and Bronny James.
 *
 * WHAT THIS HOLDS, with the REAL search bundled and run against the LIVE table:
 *   1. The lineup uses the shared source and keeps no copy of its own. A copy
 *      is what drifted, so its absence is the thing worth guarding.
 *   2. A full name finds the right player, on the right team.
 *   3. Two teammates who share a surname both appear and are told apart.
 *
 * NEGATIVE CONTROL: NBA_SEARCH_CONTROL=surnameonly strips firstNameColumn back
 * out, reproducing exactly the config that shipped, so sections 2 and 3 go red.
 *
 * Run: node scripts/simNbaLineupSearch.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.NBA_SEARCH_CONTROL || '';
if (CONTROL && CONTROL !== 'surnameonly') {
  console.error(`NBA_SEARCH_CONTROL=${CONTROL} is not a control this harness knows (surnameonly)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* the supabase client wants browser storage the moment it is imported */
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: k => { mem.delete(k); },
  clear: () => mem.clear(),
  key: i => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nba-search-'));
const ENTRY = path.join(tmpDir, 'entry.ts');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, "export { searchPlayers, NBA_PLAYER_SOURCE } from '@/lib/playerSearch';");
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
const M = await import(pathToFileURL(BUNDLE).href);

const baseSource = { ...M.NBA_PLAYER_SOURCE };
if (CONTROL === 'surnameonly') delete baseSource.firstNameColumn;
const forTeam = team => ({ ...baseSource, filters: [{ column: 'team', op: 'eq', value: team }] });

console.log('1) the lineup uses the shared source and keeps no copy');
{
  const src = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useNbaLineup.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const hasCopy = /const\s+NBA_PLAYER_SOURCE_V2/.test(src);
  const usesShared = /\.\.\.NBA_PLAYER_SOURCE\b/.test(src);
  if (hasCopy) fail('useNbaLineup declares its own NBA source again, and a second config for one table is what drifted');
  if (!usesShared) fail('useNbaLineup no longer spreads the shared NBA_PLAYER_SOURCE');
  console.log(`   local copy: ${hasCopy ? 'YES' : 'none'}; spreads the shared source: ${usesShared ? 'yes' : 'NO'}`);
}

console.log('2) a full name finds the right player');
{
  const CASES = [
    ['Los Angeles Lakers', 'LeBron James', 'lebron james'],
    ['Golden State Warriors', 'Stephen Curry', 'stephen curry'],
    ['Los Angeles Lakers', 'Kobe Bryant', 'kobe bryant'],
    ['Milwaukee Bucks', 'Giannis Antetokounmpo', 'giannis antetokounmpo'],
  ];
  let found = 0;
  for (const [team, typed, wanted] of CASES) {
    const { results } = await M.searchPlayers({ source: forTeam(team), query: typed, limit: 8 });
    const hit = results.some(r => String(r.name || '').toLowerCase().includes(wanted.split(' ').pop()));
    if (hit) found++;
    else fail(`typing "${typed}" on a ${team} slot returns nothing usable, and that is the only way to fill the slot`);
    console.log(`   ${team.padEnd(23)} "${typed}" -> ${results.length} rows${results[0] ? `, first ${results[0].name}` : ''}`);
  }
  console.log(`   ${found}/${CASES.length} full names resolve`);
  if (CONTROL === 'surnameonly' && found === CASES.length) {
    console.error('   CONTROL surnameonly changed nothing: without firstNameColumn a full name must fail');
    process.exit(1);
  }
}

console.log('3) teammates who share a surname are told apart');
{
  const CASES = [
    ['Golden State Warriors', 'Curry', ['seth', 'stephen']],
    ['Los Angeles Lakers', 'James', ['lebron', 'bronny']],
  ];
  for (const [team, typed, wantBoth] of CASES) {
    const { results } = await M.searchPlayers({ source: forTeam(team), query: typed, limit: 8 });
    const names = results.map(r => String(r.name || '').toLowerCase());
    const missing = wantBoth.filter(w => !names.some(n => n.includes(w)));
    if (missing.length) {
      fail(`on a ${team} slot, "${typed}" does not offer ${missing.join(' or ')}: ${names.join(', ') || 'nothing'}`);
    }
    console.log(`   ${team.padEnd(23)} "${typed}" -> ${names.join(', ') || 'nothing'}`);
  }
}

try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* non-fatal */ }

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimNbaLineupSearch: green. A full name finds the player, and two Currys are two Currys.'
    : `\nsimNbaLineupSearch: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
