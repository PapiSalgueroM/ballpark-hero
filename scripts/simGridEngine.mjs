/* Grid engine harness: the lifted engine rebuilds every published board, and the libs carry no copies.

   Round 402, phase 1 of docs/designs/NFL-GRID-ENGINE-DESIGN.md. The helpers
   that were byte identical across src/lib/nbaGrid.ts, mlbGrid.ts and
   hockeyGrid.ts moved into src/lib/gridEngine.ts. The one thing that must not
   change is the SEQUENCE: a date seed has to rebuild the exact board every
   archive page was generated from, or four published pages go stale at once.

   WHAT THIS HOLDS:
     1. THE SEQUENCE, OFFLINE. Every board in src/data/gridArchive.json for
        the three franchise sports rebuilds from its date seed through the
        lib, which now routes through the engine, to the same rows and cols.
        No database needed, which is the point: simGridArchive proves the
        answers against live data, this proves the engine against the
        published boards even where the database is unreachable.
     2. ONE COPY, AS CODE. Each of the three libs imports the engine and
        carries none of the lifted helpers: no local mulberry32, pickN,
        diacritics regex, paged fetch or difficulty storage read. Comments
        stripped first, so a docstring mentioning a helper does not count.
     3. THE ENGINE'S IDENTITY. gridEngine.ts still draws from mulberry32 with
        the constant every published seed was built on, and still carries the
        three difficulty branches.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_ENGINE_CONTROL=seed   bundles the libs against a copy of the engine
                               whose PRNG constant is off by one; section 1
                               must go red.
     SIM_ENGINE_CONTROL=copy   plants a local mulberry32 back into the NBA lib
                               in memory; section 2 must go red.
   Each control refuses to run if what it rewrites is not there, and is
   judged on its own section only.

   Run: node scripts/simGridEngine.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_ENGINE_CONTROL || '';
const SPORTS = [
  { key: 'nba', lib: 'src/lib/nbaGrid.ts' },
  { key: 'mlb', lib: 'src/lib/mlbGrid.ts' },
  { key: 'nhl', lib: 'src/lib/hockeyGrid.ts' },
];
const failures = { 1: 0, 2: 0, 3: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const p = rel => path.join(ROOT, rel).replaceAll('\\', '/');

/* Bundle the three libs plus dateUtils, with browser storage stubbed because
   the pages read a remembered difficulty at module scope. Under the seed
   control the engine import is aliased to a perturbed copy. */
let aliasArg = '';
let controlDir = null;
if (CONTROL === 'seed') {
  const src = read('src/lib/gridEngine.ts');
  const off = src.replace('a = (a + 0x6d2b79f5) | 0;', 'a = (a + 0x6d2b79f6) | 0;');
  if (off === src) abort('control cannot run: the engine PRNG constant is not in the shape this control rewrites');
  controlDir = path.join(ROOT, 'dist', '.engine-control');
  fs.mkdirSync(controlDir, { recursive: true });
  const copy = path.join(controlDir, 'gridEngine.ts');
  fs.writeFileSync(copy, off.replace("from '@/integrations/supabase/client'", `from '${p('src/integrations/supabase/client.ts')}'`));
  aliasArg = ` --alias:@/lib/gridEngine=${copy.replaceAll('\\', '/')}`;
  console.log('   NEGATIVE CONTROL ON: the libs are bundled against an engine whose PRNG constant is off by one');
}
const ENTRY = path.join(os.tmpdir(), 'gridEngineEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'gridEngine.bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
${SPORTS.map(s => `const ${s.key} = await import('${p(s.lib)}');`).join('\n')}
const dateLib = await import('${p('src/lib/dateUtils.ts')}');
export const libs = { ${SPORTS.map(s => `${s.key}: ${s.key}`).join(', ')} };
export const dateSeed = dateLib.dateSeed;
`);
try {
  execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error${aliasArg}`, { stdio: 'inherit' });
} finally {
  if (controlDir) fs.rmSync(controlDir, { recursive: true, force: true });
}
const { libs, dateSeed } = await import(pathToFileURL(BUNDLE).href);
const archive = JSON.parse(read('src/data/gridArchive.json'));

section = 1;
console.log('1) Every published franchise board rebuilds from its date seed through the engine');
{
  let boards = 0;
  for (const s of SPORTS) {
    const sport = archive.sports?.[s.key];
    if (!sport || !Array.isArray(sport.boards) || sport.boards.length === 0) { fail(`${s.key}: no boards in src/data/gridArchive.json to rebuild`); continue; }
    for (const b of sport.boards) {
      boards += 1;
      const built = libs[s.key].buildGridPuzzle(dateSeed(b.date));
      const rows = built.rows.map(c => c.label);
      const cols = built.cols.map(c => c.label);
      if (rows.join('|') !== b.rows.join('|') || cols.join('|') !== b.cols.join('|')) {
        fail(`${s.key} ${b.date}: engine built ${rows.join(', ')} x ${cols.join(', ')}, the archive published ${b.rows.join(', ')} x ${b.cols.join(', ')}`);
      }
    }
  }
  if (boards < 30) abort(`only ${boards} boards were available to rebuild, the archive file is not what this harness expects; NOTHING WAS CHECKED`);
  console.log(`   ${boards} boards rebuilt across ${SPORTS.length} sports`);
}

section = 2;
console.log('2) One copy: each lib imports the engine and carries none of the lifted helpers');
{
  const LIFTED = [
    ['function mulberry32', 'a local PRNG'],
    ['function pickN', 'a local pickN'],
    ['String.fromCharCode(0x0300)', 'a local diacritics regex'],
    ['.range(from', 'a local paged fetch'],
    ['localStorage.getItem(', 'a local difficulty read'],
  ];
  for (const s of SPORTS) {
    let code = stripComments(read(s.lib));
    if (CONTROL === 'copy' && s.key === 'nba') {
      if (code.includes('function mulberry32')) abort('control cannot run: the NBA lib already carries a local mulberry32');
      code += '\nfunction mulberry32(seed) { return () => seed; }\n';
      console.log('   NEGATIVE CONTROL ON: a local mulberry32 planted in the NBA lib, in memory');
    }
    if (!/from '@\/lib\/gridEngine'/.test(code)) fail(`${s.lib} does not import from @/lib/gridEngine`);
    for (const [needle, what] of LIFTED) {
      if (code.includes(needle)) fail(`${s.lib} still carries ${what} (${needle}); the engine owns it now`);
    }
    if (!/buildFranchisePuzzle\(FRANCHISE_POOL, ACHIEVEMENT_POOL, seed, difficulty\)/.test(code)) fail(`${s.lib} does not build its puzzle through buildFranchisePuzzle with its own pools`);
    if (!/fetchFranchiseGridData\(/.test(code)) fail(`${s.lib} does not fetch through fetchFranchiseGridData`);
  }
  console.log(`   ${SPORTS.length} libs read as code`);
}

section = 3;
console.log("3) The engine's identity: the PRNG constant and the three difficulty branches");
{
  const engine = stripComments(read('src/lib/gridEngine.ts'));
  if (!engine.includes('a = (a + 0x6d2b79f5) | 0;')) fail('gridEngine.ts no longer draws from mulberry32 with the published constant');
  /* Round 412: the branches read the EFFECTIVE difficulty, because a pool
     whose achievements are mutually exclusive is dealt one of them even at
     easy (see the engine's note). The branches themselves are the sequence. */
  for (const branch of ["effective === 'hard'", "effective === 'easy'", 'rng() < 0.5']) {
    if (!engine.includes(branch)) fail(`gridEngine.ts lost the ${branch} branch of the puzzle builder`);
  }
  const libsImportEngine = SPORTS.every(s => /from '@\/lib\/gridEngine'/.test(stripComments(read(s.lib))));
  console.log(`   constant present: ${engine.includes('0x6d2b79f5')}, all libs on the engine: ${libsImportEngine}`);
}

const own = { seed: 1, copy: 2 }[CONTROL];
const total = failures[1] + failures[2] + failures[3];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (seed, copy)`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimGridEngine: ${total} failure(s)`); process.exit(1); }
console.log('\nsimGridEngine: green. One engine, three configurations, every published board still rebuilds.');
