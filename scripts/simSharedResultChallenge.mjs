/* Round 761: actual clipboard, navbar and public score URL outcomes.
   SHARED_RESULT_CONTROL selects an asserted broken copy without production writes. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const controls = {
  payload: {
    file: 'src/components/game/ShareButtons.tsx', alias: '@/components/game/ShareButtons',
    anchor: 'await navigator.clipboard.writeText(challengeUrl);', replacement: 'await navigator.clipboard.writeText(shareText);',
    failed: 1, passed: 23, failure: 'copies only the public score and registered path, then displays that exact result',
  },
  duplicates: {
    file: 'src/lib/sharedResult.ts', alias: '@/lib/sharedResult',
    anchor: 'scores.length !== 1', replacement: 'scores.length === 0',
    failed: 2, passed: 22, failure: 'rejects the duplicate field without displaying a shared result',
  },
  validation: {
    file: 'src/lib/sharedResult.ts', alias: '@/lib/sharedResult',
    anchor: 'return score.trim().length > 0 && score.length <= MAX_SHARED_SCORE_LENGTH\n    && !/[\\u0000-\\u001f\\u007f-\\u009f\\u2028-\\u202e\\u2066-\\u2069]/.test(score);', replacement: 'return true;',
    failed: 8, passed: 16, failure: 'rejects the oversized field without displaying a shared result',
  },
  plaintext: {
    file: 'src/components/game/SharedResultCard.tsx', alias: '@/components/game/SharedResultCard',
    anchor: '<p className="text-foreground"><span className="font-semibold">{result.gameName}:</span> {result.score}</p>',
    replacement: '<p className="text-foreground"><span className="font-semibold">{result.gameName}:</span> <span dangerouslySetInnerHTML={{ __html: result.score }} /></p>',
    failed: 1, passed: 23, failure: 'renders markup-shaped input as literal text without creating injected elements',
  },
  volatile: {
    file: 'src/components/game/SharedResultCard.tsx', alias: '@/components/game/SharedResultCard',
    anchor: ' data-no-prerender=""', replacement: '',
    failed: 1, passed: 23, failure: 'copies only the public score and registered path, then displays that exact result',
  },
  slash: {
    file: 'src/components/game/SharedResultCard.tsx', alias: '@/components/game/SharedResultCard',
    anchor: 'decodeSharedResult(routePath, location.search)', replacement: 'decodeSharedResult(location.pathname, location.search)',
    failed: 1, passed: 23, failure: 'displays a registered game with a trailing slash and preserves that URL on dismissal',
  },
};
const control = process.env.SHARED_RESULT_CONTROL || '';
assert.ok(!control || controls[control], 'Unknown shared result control');
const sourceFiles = ['src/components/game/ShareButtons.tsx', 'src/components/game/GameNavbar.tsx', 'src/components/game/SharedResultCard.tsx', 'src/lib/sharedResult.ts'];
/* Release H: read with the line endings folded, so the multi line anchors match on a CRLF checkout (simHarnessAnchors). */
const originals = await Promise.all(sourceFiles.map(async file => [file, (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n')]));
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const spec = controls[control];
    const source = originals.find(([file]) => file === spec.file)[1];
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Actual shared result control anchor must occur once');
    const changed = source.replace(spec.anchor, spec.replacement);
    assert.notEqual(changed, source, 'Control must change the actual bound module');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'shared-result-'));
    copy = path.join(folder, path.basename(spec.file));
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.alias]: copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/sharedResultChallenge.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  if (control) {
    process.stdout.write(output.split('\n').filter(line => /[✓×]|FAIL |Tests\s|Test Files|Duration/.test(line)).join('\n') + '\n');
    process.stdout.write(diagnostic + '\n');
  } else process.stdout.write(output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /sharedResultChallenge\.test\.tsx/, 'The actual shared result tests must run');
  if (control) {
    const spec = controls[control];
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, new RegExp(`Tests\\s+${spec.failed} failed.*${spec.passed} passed`), diagnostic);
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes(spec.failure)), `Expected outcome failure missing: ${spec.failure}\n${diagnostic}`);
    console.log(`simSharedResultChallenge ${control}: asserted module copy produced ${spec.failed} expected outcome failures and ${spec.passed} passes.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+24 passed/, diagnostic);
    console.log('simSharedResultChallenge: 24 actual clipboard, URL round-trip, privacy, bounds, plaintext, dismissal, focus and existing-sharing checks passed.');
  }
  for (const [file, source] of originals) assert.equal((await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n'), source, `Production file changed: ${file}`);
  console.log('simSharedResultChallenge: production modules remain unchanged; controls use only owned temporary copies.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
