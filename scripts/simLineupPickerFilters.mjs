/* Round 765: rendered shared lineup targeting and option reachability.
   LINEUP_PICKER_CONTROL changes asserted temporary Board copies only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.LINEUP_PICKER_CONTROL || '';
const specs = {
  unfilter: {
    anchor: 'config.dimensions.every((dimension) => !filters[dimension.key] || dimension.valueOf(p) === filters[dimension.key])', replacement: 'true',
    failures: 2, passes: 7, test: 'combines existing dimensions and name search, keeps engine order, and resets all filters',
  },
  cap: {
    anchor: 'options.slice(0, visibleLimit)', replacement: 'options.slice(0, 40)',
    failures: 1, passes: 8, test: 'makes players beyond forty reachable, preserves earlier rows, and picks the exact later player',
  },
  eligibility: {
    anchor: 'const eligible = openSlot !== null ? game.eligibleFor(openSlot) : [];', replacement: 'const eligible = openSlot !== null ? config.pool : [];',
    failures: 5, passes: 4, test: 'preserves the existing slot constraint and position eligibility before applying filters',
  },
};
assert.ok(!control || specs[control], 'Unknown lineup picker control');
const sourcePath = path.join(root, 'src/components/perfect-lineup/GenericLineupBoard.tsx');
const source = await readFile(sourcePath, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const spec = specs[control];
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Actual lineup picker control anchor must occur once');
    const changed = source.replace(spec.anchor, spec.replacement);
    assert.notEqual(changed, source, 'Control must alter the actual Board binding');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'lineup-picker-'));
    copy = path.join(folder, 'GenericLineupBoard.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/perfect-lineup/GenericLineupBoard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/lineupPickerFilters.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  if (control) {
    process.stdout.write(output.split('\n').filter(line => /[✓×]|FAIL |Tests\s|Test Files|Duration/.test(line)).join('\n') + '\n');
    process.stdout.write(diagnostic + '\n');
  } else process.stdout.write(output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /lineupPickerFilters\.test\.tsx/, 'The actual lineup picker tests must run');
  if (control) {
    const spec = specs[control];
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, new RegExp(`Tests\\s+${spec.failures} failed.*${spec.passes} passed`), diagnostic);
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes(spec.test)), `Expected outcome failure missing: ${spec.test}\n${diagnostic}`);
    console.log(`simLineupPickerFilters ${control}: ${spec.failures} intended rendered outcome failures and ${spec.passes} unaffected passes.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+9 passed/, diagnostic);
    console.log('simLineupPickerFilters: nine actual Board/engine checks passed for dimensions, counts, reachability, exact picks, constraints, duplicate exclusion, scoring and no writes.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), source, 'Production Board must remain unchanged');
  console.log('simLineupPickerFilters: real Board source is unchanged; controls use only owned temporary copies.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
