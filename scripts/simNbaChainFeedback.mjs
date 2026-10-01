/* Actual NBA Chain Page/hook/search over local fictional responses. Native scroll
   and production App geometry are checked separately on the finished build. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.NBA_CHAIN_FEEDBACK_CONTROL || '';
const independent = 'holds independent original ten-pick score';
const pageFile = 'src/pages/NbaChain.tsx';
const cssFile = 'src/pages/NbaChainFeedback.module.css';
const controls = {
  document: { test: 'reveals accepted links only inside', anchor: 'if (list) list.scrollTop = list.scrollHeight;', replacement: "if (list) list.lastElementChild?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });" },
  silent: { test: 'reveals accepted links only inside', anchor: 'if (appended) {', replacement: 'if (false) {' },
  names: { test: 'binds full names and connections', anchor: 'data-nba-chain-name className={feedback.fullName}', replacement: 'data-nba-chain-name' },
  finite: { test: 'binds finite single-iteration', css: true, anchor: 'nbaChainLink 420ms ease-out 1;', replacement: 'nbaChainLink 420ms ease-out infinite;' },
  reduced: { test: 'binds finite single-iteration', css: true, anchor: '.latest { animation: none; }', replacement: '.latest { animation: nbaChainLink 420ms ease-out 1; }' },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown NBA Chain control');
const held = [pageFile, cssFile, 'src/test/nbaChainFeedback.test.tsx', 'src/hooks/useNbaChain.ts', 'src/types/nbaChain.ts', 'src/lib/playerSearch.ts', 'src/components/game/PlayerAutocomplete.tsx', 'src/hooks/useGameCompletion.ts', 'src/components/game/ResultScreen.tsx', 'src/components/game/ShareButtons.tsx'];
const verifyBytes = [];
for (const file of held) { const bytes = await readFile(path.join(root, file)); verifyBytes.push(async () => assert.deepEqual(await readFile(path.join(root, file)), bytes, `${file} bytes must be held`)); }
const page = (await readFile(path.join(root, pageFile), 'utf8')).replace(/\r\n/g, '\n');
const css = (await readFile(path.join(root, cssFile), 'utf8')).replace(/\r\n/g, '\n');
let folder;
const created = [];
try {
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' }; delete env.NO_DOUBLE_SWAP; delete env.NBA_CHAIN_FEEDBACK_CSS;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/nbaChainFeedback.test.tsx', '--reporter=verbose', '--reporter=json', '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=30000'];
  await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/nba-chain-feedback-'));
  const report = path.join(folder, 'report.json'); created.push(report); args.push('--outputFile.json', report);
  if (control) {
    const spec = controls[control]; const source = spec.css ? css : page; assert.equal(source.split(spec.anchor).length - 1, 1, 'Control changes one unique actual binding');
    let changed = source.replace(spec.anchor, spec.replacement); assert.notEqual(changed, source);
    const boundCss = path.join(folder, 'NbaChainFeedback.module.css'); created.push(boundCss); await writeFile(boundCss, spec.css ? changed : css);
    let boundPage = spec.css ? page : changed; const importAnchor = "from './NbaChainFeedback.module.css'"; assert.equal(boundPage.split(importAnchor).length - 1, 1);
    boundPage = boundPage.replace(importAnchor, `from '${boundCss.replace(/\\/g, '/')}'`);
    const copy = path.join(folder, 'NbaChain.tsx'); created.push(copy); await writeFile(copy, boundPage); env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/NbaChain': copy });
    env.NBA_CHAIN_FEEDBACK_CSS = boundCss; args.push('--testNamePattern', `${spec.test}|${independent}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.equal(run.signal, null, 'Terminated runner earns no credit'); assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/);
  const result = JSON.parse(await readFile(report, 'utf8')); const cases = result.testResults.flatMap(file => file.assertionResults); assert.equal(cases.length, 7); assert.equal(result.testResults.length, 1);
  if (control) {
    assert.equal(run.status, 1); assert.equal(result.numFailedTests, 1); assert.equal(result.numPassedTests, 1); assert.equal(result.numPendingTests, 5);
    const intended = cases.find(item => item.fullName.includes(controls[control].test)); assert.equal(intended?.status, 'failed'); assert.match(intended.failureMessages.join('\n'), /AssertionError|expected .* to|expect\((?:element|received)\)\.to/i);
    assert.equal(cases.find(item => item.fullName.includes(independent))?.status, 'passed');
    console.log(`NBA_CHAIN_FEEDBACK_RECEIPT ${control}: one intended assertion fails, one independent original ten-pick outcome passes, five skipped.`);
  } else { assert.equal(run.status, 0); assert.equal(result.numPassedTests, 7); assert.equal(result.numFailedTests, 0); console.log('simNbaChainFeedback: seven actual Page/hook/search/result outcomes pass.'); }
  console.log('simNbaChainFeedback: accepted appends use list-only scroll; deferred/wrong/seed/reset remain quiet.');
  console.log('simNbaChainFeedback: retained nodes, validation focus, full names and finite/static CSS bindings are checked.');
  console.log('simNbaChainFeedback: original round10/par7, best/mode saves, exact clipboard and once1000 completion hold.');
  console.log('simNbaChainFeedback: protected bytes held; only owned disposable files removed.');
} finally { for (const file of created) await rm(file, { force: true }); if (folder) await rmdir(folder); for (const verify of verifyBytes) await verify(); }
