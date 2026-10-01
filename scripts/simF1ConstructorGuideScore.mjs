/* Actual rendered guide and unchanged F1 constructor hook. Controls change source copies only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.F1_GUIDE_SCORE_CONTROL || '';
const controls = {
  score: { file: 'src/data/gameContent/moreSports.ts', module: '@/data/gameContent/moreSports', anchor: 'Holding out for the championship clue, a count of 16 titles, would have confirmed it at 400.', replacement: 'Holding out for the championship clue, a count of 16 titles, would have confirmed it at 600.', test: 'renders the championship example' },
  titles: { file: 'src/pages/F1Constructor.tsx', module: '@/pages/F1Constructor', anchor: "McLaren: 10× Constructors' Champion, Senna/Prost/Hamilton, Woking", replacement: "McLaren: 8× Constructors' Champion, Senna/Prost/Hamilton, Woking", test: 'keeps the unused McLaren example' },
};
assert.ok(!control || control in controls, 'Unknown F1 guide score control');
const held = ['src/data/gameContent/moreSports.ts', 'src/pages/F1Constructor.tsx', 'src/hooks/useF1Constructor.ts', 'src/types/f1Constructor.ts', 'src/data/f1Constructors.ts', 'src/components/seo/GameSeoContent.tsx'];
const verifyBytes = [];
for (const file of held) {
  const bytes = await readFile(path.join(root, file));
  verifyBytes.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Original guide, Page, hook, rules, data and renderer must remain byte-held')));
}
let folder, copy;
try {
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/f1ConstructorGuideScore.test.tsx', '--reporter=verbose', '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Control must change exactly one actual example');
    let changed = source.replace(spec.anchor, spec.replacement); assert.notEqual(changed, source, 'Copied example must change');
    if (control === 'score') {
      assert.equal(changed.split("from './types'").length - 1, 1);
      changed = changed.replace("from './types'", "from '@/data/gameContent/types'");
      // The unchanged loader imports this sport file relatively, so copy that loader to bind the actual changed guide.
      const loader = (await readFile(path.join(root, 'src/data/gameContent/loader.ts'), 'utf8')).replace(/\r\n/g, '\n');
      assert.equal(loader.split("import('./moreSports')").length - 1, 1);
      await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/f1-guide-score-'));
      copy = path.join(folder, 'moreSports.ts'); await writeFile(copy, changed);
      const changedLoader = loader.replace("import('./moreSports')", "import('@/data/gameContent/moreSports')").replaceAll("from './types'", "from '@/data/gameContent/types'").replaceAll("import('./", "import('@/data/gameContent/");
      const loaderCopy = path.join(folder, 'loader.ts'); await writeFile(loaderCopy, changedLoader);
      env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.module]: copy, '@/data/gameContent/loader': loaderCopy });
    } else {
      await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/f1-guide-score-'));
      copy = path.join(folder, 'F1Constructor.tsx'); await writeFile(copy, changed);
      env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.module]: copy });
    }
    args.push('--testNamePattern', spec.test + '|preserves independent earlier');
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.match(output, /f1ConstructorGuideScore\.test\.tsx/);
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Runner failures earn no control credit');
  if (control) {
    assert.notEqual(run.status, 0, 'Changed example must fail its intended outcome');
    assert.match(output, /Tests\s+1 failed.*1 passed.*1 skipped/); assert.match(output, new RegExp('FAIL[^\n]*' + controls[control].test)); assert.match(output, /AssertionError/);
    console.log(`simF1ConstructorGuideScore ${control}: one changed example fails its intended assertion while independent real-hook payouts pass.`);
  } else { assert.equal(run.status, 0, output.slice(-5000)); assert.match(output, /3 passed/); console.log('simF1ConstructorGuideScore: three actual guide, hook and legacy-prop outcomes pass.'); }
  console.log('simF1ConstructorGuideScore: clue four pays 400 after three hints and one correct guess, with no earlier wrong guesses.');
  console.log('simF1ConstructorGuideScore: unchanged clue 1/2/3/5/6 scores and no Unlimited save writes remain verified.');
  console.log('simF1ConstructorGuideScore: McLaren 10 is a source-prop consistency check, not a claim that legacy examples render.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) { await rm(path.join(folder, 'loader.ts'), { force: true }); await rmdir(folder); }
  for (const verify of verifyBytes) await verify();
}
