/* Grid rarity harness: the crowd is counted before the player joins it.

   Round 401. The three community rarity grids (NFL, college, soccer) score
   a correct pick by how many earlier players picked the same name for the
   same cell. The formula adds the player's own row itself, and the hooks
   inserted that row BEFORE counting, so it was counted twice: a first pick
   read 100 percent instead of the unicorn tier, and every later share was
   biased upward. The formula now lives once in src/lib/gridRarity.ts and
   every hook measures first, then inserts.

   WHAT THIS HOLDS:
     1. THE FORMULA. src/lib/gridRarity.test.ts, through vitest.
     2. THE ORDER, AS CODE. In each of the three hooks, inside the correct
        answer branch, fetchRarity( comes before the selections insert, and
        the insert is still there. Comments stripped first.
     3. ONE FORMULA. Each hook's fetchRarity returns rarityPercent( and
        carries no arithmetic of its own.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_RARITY_CONTROL=order   swaps insert and measure back in memory for
                                the NFL hook; section 2 must go red.
     SIM_RARITY_CONTROL=local   puts a local formula back in memory for the
                                NFL hook; section 3 must go red.
   Each control refuses to run if what it rewrites is not there, and is
   judged on its own section only.

   Run: node scripts/simGridRarity.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_RARITY_CONTROL || '';
const HOOKS = [
  { file: 'src/hooks/useFootballGrid.ts', table: 'football_grid_selections' },
  { file: 'src/hooks/useCollegeGrid.ts', table: 'college_grid_selections' },
  { file: 'src/hooks/useSoccerGrid.ts', table: 'soccer_grid_selections' },
];
const failures = { 1: 0, 2: 0, 3: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

section = 1;
console.log('1) The formula, through vitest');
{
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', 'src/lib/gridRarity.test.ts'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  if (!out.includes('gridRarity.test.ts')) abort('vitest did not report on the test file at all, so nothing was checked:\n' + out.slice(-1500));
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (r.status !== 0) fail('the formula test is red:\n    ' + out.split('\n').filter(l => /×|FAIL|AssertionError|expected/.test(l)).slice(0, 8).join('\n    '));
  if (!/4 passed/.test(out)) fail(`expected all four cases to pass, vitest says: ${summary ? summary[1].trim() : 'nothing'}`);
}

const sources = new Map(HOOKS.map(h => [h.file, stripComments(read(h.file))]));
if (CONTROL === 'order' || CONTROL === 'local') {
  const f = HOOKS[0].file;
  let code = sources.get(f);
  if (CONTROL === 'order') {
    const measure = code.match(/^\s*const rarity = await fetchRarity\([^\n]*\n/m);
    const insertStart = code.indexOf("await supabase.from('football_grid_selections').insert({");
    if (!measure || insertStart < 0 || measure.index > insertStart) abort('control cannot run: the NFL hook is not in the measure-then-insert shape this control rewrites');
    const insertEnd = code.indexOf('});', insertStart) + 3;
    const insertBlock = code.slice(insertStart, insertEnd);
    code = code.slice(0, measure.index) + '          ' + insertBlock + '\n' + code.slice(measure.index, insertStart) + code.slice(insertEnd + 1);
    console.log('   NEGATIVE CONTROL ON: the NFL hook inserts before it measures, in memory');
  } else {
    const swapped = code.replace('return rarityPercent(totalCount ?? 0, playerCount ?? 0);', 'if (!totalCount) return 101;\n        return Math.round((((playerCount ?? 0) + 1) / (totalCount + 1)) * 100);');
    if (swapped === code) abort('control cannot run: the NFL hook does not call rarityPercent in the shape this control rewrites');
    code = swapped;
    console.log('   NEGATIVE CONTROL ON: a local formula is back in the NFL hook, in memory');
  }
  sources.set(f, code);
}

section = 2;
console.log('2) The order, as code: each hook measures before it inserts');
for (const h of HOOKS) {
  const code = sources.get(h.file);
  const insertNeedle = `.from('${h.table}').insert(`;
  const insertAt = code.indexOf(insertNeedle);
  const measureAt = code.indexOf('const rarity = await fetchRarity(');
  if (insertAt < 0) { fail(`${h.file}: the ${h.table} insert is gone, the check needs re-anchoring`); continue; }
  if (measureAt < 0) { fail(`${h.file}: no "const rarity = await fetchRarity(" line, the check needs re-anchoring`); continue; }
  if (measureAt > insertAt) fail(`${h.file}: the selections row is inserted before rarity is measured, so the player counts twice`);
  console.log(`   ${h.file}: measure at ${measureAt}, insert at ${insertAt}`);
}

section = 3;
console.log('3) One formula: every fetchRarity returns rarityPercent and does no arithmetic of its own');
for (const h of HOOKS) {
  const code = sources.get(h.file);
  const start = code.indexOf('const fetchRarity = useCallback(');
  if (start < 0) { fail(`${h.file}: no fetchRarity, the check needs re-anchoring`); continue; }
  const body = code.slice(start, code.indexOf('const submitGuess', start));
  if (!body.includes('return rarityPercent(')) fail(`${h.file}: fetchRarity does not return rarityPercent(...)`);
  if (/Math\.round|\+ 1\)/.test(body)) fail(`${h.file}: fetchRarity carries its own arithmetic beside the shared formula`);
  if (!/import \{ rarityPercent \} from '@\/lib\/gridRarity';/.test(code)) fail(`${h.file}: rarityPercent is not imported from @/lib/gridRarity`);
}

const own = { order: 2, local: 3 }[CONTROL];
const total = failures[1] + failures[2] + failures[3];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (order, local)`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimGridRarity: ${total} failure(s)`); process.exit(1); }
console.log('\nsimGridRarity: green. The crowd is counted before the player joins it, in all three grids.');
