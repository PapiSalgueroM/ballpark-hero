/* NFL grid page harness: the money page judges in memory, offers the key's names, and says what it asks.

   Round 406, phase 3 of docs/designs/NFL-GRID-ENGINE-DESIGN.md. The NFL grid
   used to validate through an edge function and a free tier AI that ran out
   of quota; it now builds its board from the date seed and judges every
   guess against the answer key in memory. This fence reads the page's code
   and copy so the old path cannot come back one line at a time.

   WHAT THIS HOLDS:
     1. JUDGED IN MEMORY. src/hooks/useFootballGrid.ts imports the NFL lib,
        calls playerMatchesCell, and never invokes an edge function; the
        daily board comes from buildGridPuzzle over the date seed and is
        handed to useDailyPuzzle as supabasePuzzle (its contract).
     2. THE KEY'S NAMES. src/components/football-grid/GridPlayerSearch.tsx
        searches NFL_GRID_PLAYER_SOURCE (display names) with validateOnly.
     3. THE COPY ASKS ONLY WHAT THE POOL OFFERS. The page's examples and the
        gameContent entry for /football-grid name no criterion the engine
        cannot deal: no Pro Bowl, no MVP, no college, no award. Comments
        stripped, strings read.
     4. THE STATIC POOL IS GONE. src/data/footballGridPuzzles.ts and the
        Round 401 local names file no longer exist, and nothing imports them.
     5. THE BOARD IS THE ENGINE'S. Today's board rebuilt through the hook's
        dailyBoardFor equals buildGridPuzzle over the same seed, label for
        label, and every label maps to a pool category.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_NFLPAGE_CONTROL=invoke  plants a supabase.functions.invoke call back
                                 into the hook, in memory; section 1 must go
                                 red.
     SIM_NFLPAGE_CONTROL=copy    plants "3+ Pro Bowls" into the copy, in
                                 memory; section 3 must go red.

   Run: node scripts/simNflGridPage.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_NFLPAGE_CONTROL || '';
const failures = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

section = 1;
console.log('1) Judged in memory: the hook imports the lib, matches locally, never invokes an edge function');
{
  let hook = stripComments(read('src/hooks/useFootballGrid.ts'));
  if (CONTROL === 'invoke') {
    if (hook.includes('functions.invoke(')) abort('control cannot run: the hook already invokes an edge function');
    hook += "\nconst probe = () => supabase.functions.invoke('football-grid-validate', {});\n";
    console.log('   NEGATIVE CONTROL ON: an edge function call planted in the hook, in memory');
  }
  if (!/from '@\/lib\/nflGrid'/.test(hook)) fail('the hook does not import @/lib/nflGrid');
  if (!/playerMatchesCell\(/.test(hook)) fail('the hook does not judge with playerMatchesCell');
  if (/functions\.invoke\(/.test(hook)) fail('the hook invokes an edge function; the page must judge in memory');
  if (!/buildGridPuzzle\(dateSeed\(/.test(hook)) fail('the daily board is not built from the date seed');
  if (!/supabasePuzzle: board/.test(hook)) fail('the board is not handed to useDailyPuzzle as supabasePuzzle');
  if (!/fetchNflGridData\(\)/.test(hook)) fail('the hook does not fetch the key');
  console.log('   hook read as code');
}

section = 2;
console.log("2) The key's names: the search box offers NFL_GRID_PLAYER_SOURCE with validateOnly");
{
  const search = stripComments(read('src/components/football-grid/GridPlayerSearch.tsx'));
  if (!/source: NFL_GRID_PLAYER_SOURCE/.test(search)) fail('GridPlayerSearch does not search NFL_GRID_PLAYER_SOURCE');
  if (!/validateOnly/.test(search)) fail('GridPlayerSearch lets free text through (validateOnly is gone)');
  if (/localNames=/.test(search)) fail('GridPlayerSearch still hands a local names list to the autocomplete');
  console.log('   search box read as code');
}

section = 3;
console.log('3) The copy asks only what the pool offers');
{
  const page = stripComments(read('src/pages/FootballGrid.tsx'));
  const content = read('src/data/gameContent/football.ts');
  const start = content.indexOf("'/football-grid': {");
  const end = content.indexOf("\n  '/", start + 1);
  let entry = content.slice(start, end < 0 ? content.length : end);
  if (CONTROL === 'copy') {
    entry += '\n"3+ Pro Bowls"\n';
    console.log('   NEGATIVE CONTROL ON: a Pro Bowl criterion planted in the copy, in memory');
  }
  const banned = [/pro bowl/i, /\bMVP\b/, /\bcollege\b/i, /\baward/i, /All-Pro/i];
  for (const [name, text] of [['FootballGrid.tsx', page], ['gameContent football entry', entry]]) {
    for (const b of banned) if (b.test(text)) fail(`${name} still names a criterion the engine cannot deal: ${b}`);
  }
  console.log('   page and copy read');
}

section = 4;
console.log('4) The static pool is gone and nothing imports it');
{
  for (const f of ['src/data/footballGridPuzzles.ts', 'src/data/nflGridLocalNames.ts', 'scripts/genNflGridLocalNames.mjs']) {
    if (fs.existsSync(path.join(ROOT, f))) fail(`${f} still exists`);
  }
  const walk = (dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (/\.(ts|tsx|mjs)$/.test(e.name)) out.push(p); } return out; };
  const self = path.join(ROOT, 'scripts', 'simNflGridPage.mjs');
  for (const file of [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'scripts'))]) {
    if (file === self) continue;
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    if (/footballGridPuzzles|nflGridLocalNames/.test(code)) fail(`${path.relative(ROOT, file).replaceAll('\\', '/')} still refers to the static pool or the local names`);
  }
  console.log('   no importer left');
}

section = 5;
console.log("5) The board is the engine's: today's board rebuilt through the hook equals the lib's");
{
  /* Bundled under dist, inside the project, so react and sonner resolve
     from node_modules when the bundle is imported; os.tmpdir() cannot see
     them. dist is gitignored and the folder is removed below. */
  const BUNDLE_DIR = path.join(ROOT, 'dist', '.nflpage');
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  const ENTRY = path.join(os.tmpdir(), 'nflPageEntry.mjs');
  const BUNDLE = path.join(BUNDLE_DIR, 'nflPage.bundle.mjs');
  fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const hook = await import('${path.join(ROOT, 'src', 'hooks', 'useFootballGrid.ts').replaceAll('\\', '/')}');
export const lib = await import('${path.join(ROOT, 'src', 'lib', 'nflGrid.ts').replaceAll('\\', '/')}');
export const dates = await import('${path.join(ROOT, 'src', 'lib', 'dateUtils.ts').replaceAll('\\', '/')}');
`);
  execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --external:react --external:react-dom --external:sonner`, { stdio: 'inherit' });
  let hook, lib, dates;
  try { ({ hook, lib, dates } = await import(pathToFileURL(BUNDLE).href)); } finally { fs.rmSync(BUNDLE_DIR, { recursive: true, force: true }); }
  const labels = new Set([...lib.FRANCHISE_POOL.map(c => `Played for ${c.label}`), ...lib.ACHIEVEMENT_POOL.map(c => c.label)]);
  let checked = 0;
  for (const day of ['2026-09-02', '2026-09-03', '2026-10-15', '2027-01-01']) {
    const board = hook.dailyBoardFor(day);
    const built = lib.buildGridPuzzle(dates.dateSeed(day));
    const same = board.rows.map(a => a.label).join('|') === built.rows.map(c => (c.kind === 'franchise' ? `Played for ${c.label}` : c.label)).join('|')
      && board.cols.map(a => a.label).join('|') === built.cols.map(c => (c.kind === 'franchise' ? `Played for ${c.label}` : c.label)).join('|');
    if (!same) fail(`${day}: the hook's board differs from the lib's`);
    for (const a of [...board.rows, ...board.cols]) if (!labels.has(a.label)) fail(`${day}: label "${a.label}" is not a pool category`);
    checked += 1;
  }
  console.log(`   ${checked} days rebuilt`);
}

const own = { invoke: 1, copy: 3 }[CONTROL];
const total = failures[1] + failures[2] + failures[3] + failures[4] + failures[5];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (invoke, copy)`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimNflGridPage: ${total} failure(s)`); process.exit(1); }
console.log('\nsimNflGridPage: green. The money page judges in memory, offers the key\'s names, and asks only what it can answer.');
