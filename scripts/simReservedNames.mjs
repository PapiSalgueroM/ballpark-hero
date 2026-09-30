/* Round 747: reserve site authority names without blocking sports and fan
   names. Control severs enforcement in an asserted copy, never live source. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.RESERVED_NAMES_CONTROL || '';
assert.ok(['', 'unguard'].includes(control), 'Unknown reserved names control');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  if (control) {
    const source = await readFile(path.join(root, 'src/lib/nameModeration.ts'), 'utf8');
    const anchor = 'if (isReservedName(name)) {';
    assert.equal(source.split(anchor).length - 1, 1, 'Control anchor must occur once');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'reserved-'));
    copy = path.join(folder, 'nameModeration.ts');
    await writeFile(copy, source.replace(anchor, 'if (false) {'));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/nameModeration': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/reservedNames.test.ts'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  const diagnostic = output.slice(-2500);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /reservedNames\.test\.ts/, 'The actual moderation tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /60 failed.*29 passed/, diagnostic);
    assert.match(output, /AssertionError|expected/i, diagnostic);
    console.log('simReservedNames control: 60 enforcement and public-name checks rejected an unguarded helper; 29 unrelated checks stayed green.');
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /89 passed/, diagnostic);
    console.log('simReservedNames: 89 reserved, ordinary-name, substitution, profanity and blank-name checks passed.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
