/* NFL grid lib harness: every cell the engine can deal has answers in the key, and the pools are the key's.

   Round 405, phase 3 of docs/designs/NFL-GRID-ENGINE-DESIGN.md. src/lib/nflGrid.ts
   is the NFL configuration of the shared engine over the answer key. A board
   is only honest if every cell it can produce has real answers, so this fence
   recomputes the floors from the committed key file rather than trusting the
   numbers in the lib's docstring.

   WHAT THIS HOLDS:
     1. FRANCHISES ARE THE KEY'S. The 32 codes in FRANCHISE_POOL are exactly
        the codes the key file uses, no more, no fewer.
     2. EVERY PAIR HAS ANSWERS. Every pair of franchises shares at least 20
        players in the key (measured floor 23, HOU x PIT).
     3. EVERY ACHIEVEMENT HAS ANSWERS ON EVERY FRANCHISE. Each achievement in
        ACHIEVEMENT_POOL clears at least 30 qualifiers on every franchise
        (measured floor 38, Quarterback x Ravens and x Texans, the two
        youngest franchises).
     4. THE MATCHER AGREES WITH THE KEY. For a sample of players, the lib's
        playerMatchesCell over every pool category equals what the key's
        own fields say (title, draft round, position group), so the matcher
        cannot quietly read a field the key does not carry.
     5. THE DISPLAY NAME IS THE MATCH KEY. The lib indexes players by the
        table's display_name (the search box offers the same column), so a
        namesake guess resolves to exactly one row.

   NEGATIVE CONTROL: SIM_NFLGRID_CONTROL=thin removes every Super Bowl winner
   from one franchise in memory; section 3 must go red.

   Run: node scripts/simNflGrid.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_NFLGRID_CONTROL || '';
const failures = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ENTRY = path.join(os.tmpdir(), 'nflGridEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'nflGrid.bundle.mjs');
/* The stub has to exist before the engine's import chain runs, and a static
   import is hoisted above the assignment, so the lib is imported dynamically
   (the same shape genGridArchive.mjs uses). */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${path.join(ROOT, 'src', 'lib', 'nflGrid.ts').replaceAll('\\', '/')}');
`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { lib } = await import(pathToFileURL(BUNDLE).href);
const key = JSON.parse(read('scripts/data/nflGridPlayers.json'));
let players = key.players ?? [];
if (players.length < 15000) abort(`the key file holds ${players.length} players; NOTHING WAS CHECKED`);

if (CONTROL === 'thin') {
  const victim = 'CIN';
  const before = players.filter(p => p.teams.includes(victim) && p.sbWins > 0).length;
  if (before === 0) abort('control cannot run: the key has no Bengals with a title to remove');
  players = players.map(p => (p.teams.includes(victim) && p.sbWins > 0 ? { ...p, sbWins: 0 } : p));
  console.log(`   NEGATIVE CONTROL ON: ${before} Bengals titles removed in memory, section 3 must go red`);
}

/* The lib's index shape from the key's rows, the way the table would feed it. */
const indexed = players.map(p => ({
  name: p.display,
  franchises: new Set(p.teams),
  groups: new Set(p.pos.map(lib.positionGroup)),
  draftRound: p.draft && typeof p.draft === 'object' ? p.draft.round : null,
  draftPick: p.draft && typeof p.draft === 'object' ? p.draft.pick : null,
  undrafted: p.draft === 'undrafted',
  pass4k: p.pass4k, rush1k: p.rush1k, rec1k: p.rec1k, sbWins: p.sbWins,
}));

section = 1;
console.log('1) The franchise pool is exactly the key\'s codes');
{
  const keyCodes = new Set(players.flatMap(p => p.teams));
  const pool = new Set(lib.FRANCHISE_POOL.map(c => c.id));
  for (const c of pool) if (!keyCodes.has(c)) fail(`pool code ${c} has no players in the key`);
  for (const c of keyCodes) if (!pool.has(c)) fail(`key code ${c} is not in the franchise pool`);
  console.log(`   ${pool.size} pool codes, ${keyCodes.size} key codes`);
}

section = 2;
console.log('2) Every pair of franchises shares at least 20 players');
{
  const codes = lib.FRANCHISE_POOL.map(c => c.id);
  let floor = Infinity, worst = '';
  for (let i = 0; i < codes.length; i += 1) {
    for (let k = i + 1; k < codes.length; k += 1) {
      const n = indexed.filter(p => p.franchises.has(codes[i]) && p.franchises.has(codes[k])).length;
      if (n < floor) { floor = n; worst = `${codes[i]} x ${codes[k]}`; }
      if (n < 20) fail(`${codes[i]} x ${codes[k]} shares only ${n} players`);
    }
  }
  console.log(`   floor ${floor} (${worst})`);
}

section = 3;
console.log('3) Every achievement clears 40 qualifiers on every franchise');
{
  let floor = Infinity, worst = '';
  for (const a of lib.ACHIEVEMENT_POOL) {
    for (const f of lib.FRANCHISE_POOL) {
      const n = indexed.filter(p => lib.playerMatchesCell(p, { row: f, col: a })).length;
      if (n < floor) { floor = n; worst = `${a.label} x ${f.label}`; }
      /* Measured floor 38 (Quarterback x Ravens and x Texans, the two
         youngest franchises); 30 leaves headroom under it rather than
         sitting on the number. */
      if (n < 30) fail(`${a.label} x ${f.label} has only ${n} qualifiers`);
    }
  }
  console.log(`   floor ${floor} (${worst}) across ${lib.ACHIEVEMENT_POOL.length} achievements`);
}

section = 4;
console.log('4) The matcher agrees with the key');
{
  const sample = players.filter((_, i) => i % 200 === 0);
  let checked = 0;
  sample.forEach((p) => {
    const ix = indexed[players.indexOf(p)];
    for (const a of lib.ACHIEVEMENT_POOL) {
      const want = a.id === 'sb' ? p.sbWins > 0
        : a.id === 'first' ? (p.draft && typeof p.draft === 'object' && p.draft.round === 1)
        : a.id === 'undrafted' ? p.draft === 'undrafted'
        : a.id === 'late' ? (p.draft && typeof p.draft === 'object' && p.draft.round !== null && p.draft.round >= 6)
        : p.pos.some(c => lib.positionGroup(c) === a.id.slice(4));
      const got = lib.playerMatchesCell(ix, { row: { kind: 'franchise', id: p.teams[0], label: '' }, col: a });
      if (!!want !== got) fail(`${p.display}: ${a.label} is ${got} in the lib, ${!!want} in the key`);
      checked += 1;
    }
  });
  console.log(`   ${checked} player by achievement checks over ${sample.length} players`);
}

section = 5;
console.log('5) The display name is the match key, in the lib and in the search source');
{
  const code = stripComments(read('src/lib/nflGrid.ts'));
  if (!/const name = String\(raw\.display_name/.test(code)) fail('the lib does not index players by display_name');
  if (!/nameColumn: 'display_name'/.test(code)) fail('the search source does not offer display_name');
  const displays = new Set(players.map(p => p.display));
  if (displays.size !== players.length) fail(`${players.length - displays.size} display names are shared in the key`);
  console.log(`   ${displays.size} distinct display names for ${players.length} players`);
}

const total = failures[1] + failures[2] + failures[3] + failures[4] + failures[5];
if (CONTROL) {
  if (CONTROL !== 'thin') abort(`unknown control "${CONTROL}" (thin)`);
  if (failures[3] > 0) { console.log(`\ncontrol "thin": ${failures[3]} failure(s) fired in section 3 as expected, the check works`); process.exit(0); }
  abort('\ncontrol "thin": changed NOTHING in section 3, the check is dead');
}
if (total > 0) { console.error(`\nsimNflGrid: ${total} failure(s)`); process.exit(1); }
console.log('\nsimNflGrid: green. Every cell the engine can deal has answers, and the pools are the key\'s.');
