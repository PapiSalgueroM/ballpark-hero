/* Exercise the actual runner's default omission and browser opt-in selection.
   Child sentinels exit before gameplay; this checks discovery, not browser play. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Actual drivers require a served page, including a mandatory import in its own
   try and a loader reached through an executable path expression. The two real
   optional hybrids keep their core checks in the default group. */
const drivers = ['scripts/playSoccerHubGrid1089.mjs', 'scripts/playSoccerOfferReview1082.mjs', 'scripts/playTycoonSaleReview1083.mjs',
  'scripts/playNbaLotteryNight.mjs', 'scripts/playTycoonScorelines.mjs'];
const mandatoryCatch = ['scripts/playNbaLotteryNight.mjs'];
const computedImport = ['scripts/playTycoonScorelines.mjs'];
const selfGuarded = ['scripts/simBracketMoment.mjs', 'scripts/simLoginReturn.mjs'];
const helpers = ['scripts/lib/offlineTransport.cjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/answerConsent.mjs'];
const fixtureFiles = [...drivers, ...selfGuarded, 'scripts/simNoRivalNames.mjs'];
const held = ['scripts/runAllSims.mjs', ...helpers, ...fixtureFiles];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const before = Object.fromEntries(held.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const runner = fs.readFileSync(path.join(ROOT, held[0]), 'utf8').replace(/\r\n/g, '\n');
const parent = path.join(ROOT, '.sim-control');
fs.mkdirSync(parent, { recursive: true });
const folder = fs.mkdtempSync(path.join(parent, 'browser-discovery-'));
const scripts = path.join(folder, 'scripts'), lib = path.join(scripts, 'lib');
fs.mkdirSync(lib, { recursive: true });
/* Release AP: no link to the real node_modules (a link there is forbidden in
   this repo, and Windows refuses one without Developer Mode, so this harness
   could not run on the owner's PC at all). The copied runner sits under ROOT,
   so its typescript import resolves by walking up, the way every worktree's does. */
fs.mkdirSync(path.join(folder, 'node_modules'));
for (const helper of helpers) fs.copyFileSync(path.join(ROOT, helper), path.join(lib, path.basename(helper)));
fs.writeFileSync(path.join(lib, 'playwrightLoader.mjs'), 'export const chromium = {};\n');
const stub = path.join(folder, 'node_modules/playwright');
fs.mkdirSync(stub);
fs.writeFileSync(path.join(stub, 'package.json'), JSON.stringify({ name: 'playwright', version: '0.0.0', main: 'index.cjs' }));
fs.writeFileSync(path.join(stub, 'index.cjs'), 'exports.chromium = {};\n');
fs.mkdirSync(path.join(folder, 'dist'));
fs.writeFileSync(path.join(folder, 'dist/index.html'), '<!doctype html><title>Owned runner selection fixture</title>');

/* `dynamic`: filed as a browser harness only because a dynamic import is seen.
   `guarded`: kept in the default group only because its import has a try of its own. */
const fixtures = fixtureFiles.map(file => ({ file: path.basename(file), browser: drivers.includes(file), dynamic: drivers.includes(file),
  guarded: selfGuarded.includes(file), terminal: mandatoryCatch.includes(file), computed: computedImport.includes(file),
  source: fs.readFileSync(path.join(ROOT, file), 'utf8'), actualSourceSha256: before[file] }));
fixtures.push(
  { file: 'simStaticNamed.mjs', browser: true, source: "import { chromium } from 'playwright';" },
  { file: 'simStaticLoader.mjs', browser: true, source: "import { chromium } from './lib/playwrightLoader.mjs';" },
  { file: 'simDirectRequire.mjs', browser: true, source: "const module = require('playwright');" },
  { file: 'simDynamicSpaced.mjs', browser: true, dynamic: true, source: "await import /* actual import */ ('./lib/playwrightLoader.mjs');" },
  { file: 'simGuardedImport.mjs', browser: false, guarded: true, source: "let chromium = null; try { ({ chromium } = await import('playwright')); } catch { /* it skips its one browser section */ }" },
  { file: 'simWrappedDriver.mjs', browser: true, dynamic: true, source: "try { const { chromium } = await import('./lib/playwrightLoader.mjs'); await chromium.launch(); } catch (error) { throw error; }" },
  { file: 'simTryFinally.mjs', browser: true, dynamic: true, source: "try { await import('./lib/playwrightLoader.mjs'); } finally { /* no catch: nothing handles a missing browser */ }" },
  { file: 'simLineComment.mjs', browser: false, source: "// import './lib/playwrightLoader.mjs';" },
  { file: 'simBlockComment.mjs', browser: false, source: "/* require('playwright'); */" },
  { file: 'simQuotedSource.mjs', browser: false, source: 'const example = "await import(\'./lib/playwrightLoader.mjs\')";' },
  { file: 'simTemplateSource.mjs', browser: false, source: 'const example = `import "playwright";`;' },
  { file: 'simPlainNode.mjs', browser: false, source: "import os from 'node:os'; const note = 'playwright';" },
  { file: 'simFatalImportExit.mjs', browser: true, dynamic: true, terminal: true, source: "try { await import('playwright'); } catch { process.exit(2); }" },
  { file: 'simFatalImportThrow.mjs', browser: true, dynamic: true, terminal: true, source: "try { await import('playwright'); } catch (error) { throw error; }" },
  { file: 'simComputedImport.mjs', browser: true, dynamic: true, computed: true, source: "await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);" },
  { file: 'simComputedRequire.mjs', browser: true, computed: true, source: "require(path.resolve(ROOT, 'scripts', 'lib', 'playwrightLoader.mjs'));" },
  { file: 'simTemplateImport.mjs', browser: true, dynamic: true, source: 'await import(`playwright`);' },
  { file: 'simNestedOptionalCatch.mjs', browser: false, guarded: true, source: "try { await import('playwright'); } catch { const later = () => { throw new Error('deferred'); }; }" },
  { file: 'simUnrelatedPathText.mjs', browser: false, source: "const example = pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href; await import('node:os');" },
  { file: 'simComputedNodeImport.mjs', browser: false, source: "await import(pathToFileURL(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')).href);" },
);
const marker = path.join(folder, 'children.jsonl');
for (const row of fixtures) {
  assert(!row.source.includes('_dukbDiscovery'), 'Sentinel names do not collide with the actual source');
  const prelude = `const _dukbDiscovery = await import('node:fs');\n` +
    `_dukbDiscovery.appendFileSync(process.env.DISCOVERY_MARKER, JSON.stringify({file:${JSON.stringify(row.file)},only:process.env.ONLY??null,browser:process.env.BROWSER??null,base:process.env.BASE??null,sweep:process.env.SWEEP_BASE??null})+'\\n');\n` +
    `console.log(${JSON.stringify(row.file + '\nOwned child selected\nNo game or browser executed\nSelection receipt complete')});\nprocess.exit(0);\n`;
  fs.writeFileSync(path.join(scripts, row.file), prelude + row.source);
}
const expected = browser => fixtures.filter(row => browser || !row.browser).map(row => row.file).sort();
const observations = [];
async function run(source, browser) {
  fs.writeFileSync(path.join(scripts, 'runAllSims.mjs'), source);
  fs.writeFileSync(marker, '');
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
  });
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(scripts, 'runAllSims.mjs'), ...(browser ? ['--browser'] : [])], {
      cwd: folder, env: { ...process.env, ONLY: fixtures.map(row => row.file).join(','), BROWSER: '', SIM_NETWORK: 'offline',
        DISCOVERY_MARKER: marker, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', bytes => { output += bytes; }); child.stderr.on('data', bytes => { output += bytes; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Owned runner selection exceeded 45 seconds')); }, 45000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => { clearTimeout(timer); resolve({ code, output }); });
  });
  const rows = fs.readFileSync(marker, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  observations.push({ browser, sourceSha256: digest(source), ...result, rows });
  assert.equal(result.code, 0, result.output);
  assert(rows.every(row => row.only === null && row.browser === null), 'Runner controls do not leak into children');
  if (browser) assert(rows.filter(row => fixtures.find(item => item.file === row.file).browser)
    .every(row => row.base === `http://127.0.0.1:${port}` && row.sweep === row.base), 'Browser children receive the owned server');
  return rows.map(row => row.file).sort();
}
try {
  assert.deepEqual(await run(runner, false), expected(false), 'Default runner omits every actual and synthetic browser import');
  assert.deepEqual(await run(runner, true), expected(true), 'Browser opt-in runs every selected child exactly once');
  const anchor = 'node.expression.kind === ts.SyntaxKind.ImportKeyword';
  assert.equal(runner.split(anchor).length - 1, 1, 'Dynamic-import control has one executable anchor');
  const controlled = runner.replace(anchor, 'false');
  assert.notEqual(controlled, runner, 'Copied control changes executable classification');
  const actual = await run(controlled, false);
  const dynamicChildren = fixtures.filter(row => row.browser && row.dynamic).map(row => row.file);
  assert.equal(dynamicChildren.length, 12, 'Five actual drivers and seven synthetic dynamic imports are held');
  assert.deepEqual(actual, [...expected(false), ...dynamicChildren].sort(), 'Control adds exactly twelve dynamic-import children to the unchanged node baseline');
  let failure;
  try { assert.deepEqual(actual, expected(false), 'Default runner omits every actual and synthetic browser import'); } catch (error) { failure = error; }
  assert(failure instanceof assert.AssertionError, 'Removing dynamic recognition reaches the intended selection failure');
  observations.at(-1).intendedFailure = { name: failure.name, message: failure.message, actual: failure.actual, expected: failure.expected };
  /* Release AP control: without the rule for a self guarded import, the two real
     harnesses and the synthetic one leave the default run, which is the loss
     this harness did not see when it was written. */
  const guardedChildren = fixtures.filter(row => row.guarded).map(row => row.file);
  assert.deepEqual(guardedChildren.sort(), ['simBracketMoment.mjs', 'simGuardedImport.mjs', 'simLoginReturn.mjs', 'simNestedOptionalCatch.mjs'], 'Both real optional hybrids and the two synthetic optional catches are held');
  assert(guardedChildren.every(file => expected(false).includes(file)), 'A self guarded import stays in the default run');
  const guardAnchor = 'ts.isTryStatement(block.parent) && block.parent.tryBlock === block';
  assert.equal(runner.split(guardAnchor).length - 1, 1, 'Self-guard control has one executable anchor');
  const unguarded = runner.replace(guardAnchor, 'false');
  assert.notEqual(unguarded, runner, 'Copied control changes executable classification');
  const withoutGuard = await run(unguarded, false);
  assert.deepEqual(withoutGuard, expected(false).filter(file => !guardedChildren.includes(file)), 'Control drops exactly four optional-import children from the default run');
  let guardFailure;
  try { assert.deepEqual(withoutGuard, expected(false), 'Default runner keeps every self guarded harness'); } catch (error) { guardFailure = error; }
  assert(guardFailure instanceof assert.AssertionError, 'Removing the self-guard rule reaches the intended selection failure');
  observations.at(-1).intendedFailure = { name: guardFailure.name, message: guardFailure.message, actual: guardFailure.actual, expected: guardFailure.expected };
  const terminalChildren = fixtures.filter(row => row.terminal).map(row => row.file).sort();
  assert.deepEqual(terminalChildren, ['playNbaLotteryNight.mjs', 'simFatalImportExit.mjs', 'simFatalImportThrow.mjs']);
  const terminalAnchor = '&& !catchTerminates(block.parent.catchClause.block)';
  assert.equal(runner.split(terminalAnchor).length - 1, 1, 'Mandatory catch guard has one executable anchor');
  const optionalAgain = runner.replace(terminalAnchor, '');
  assert.notEqual(optionalAgain, runner);
  const withoutTerminalGuard = await run(optionalAgain, false);
  assert.deepEqual(withoutTerminalGuard, [...expected(false), ...terminalChildren].sort(), 'Ignoring terminal catches adds exactly the mandatory-import children');
  let terminalFailure;
  try { assert.deepEqual(withoutTerminalGuard, expected(false), 'Default runner omits mandatory browser imports'); } catch (error) { terminalFailure = error; }
  assert(terminalFailure instanceof assert.AssertionError);
  observations.at(-1).intendedFailure = { name: terminalFailure.name, message: terminalFailure.message, actual: terminalFailure.actual, expected: terminalFailure.expected };
  const computedChildren = fixtures.filter(row => row.computed).map(row => row.file).sort();
  assert.deepEqual(computedChildren, ['playTycoonScorelines.mjs', 'simComputedImport.mjs', 'simComputedRequire.mjs']);
  const computedAnchor = "['join', 'resolve'].includes(node.expression.name.text)";
  assert.equal(runner.split(computedAnchor).length - 1, 1, 'Computed module path has one executable anchor');
  const literalOnly = runner.replace(computedAnchor, 'false');
  assert.notEqual(literalOnly, runner);
  const withoutComputedPaths = await run(literalOnly, false);
  assert.deepEqual(withoutComputedPaths, [...expected(false), ...computedChildren].sort(), 'Ignoring computed path imports adds exactly those three browser children');
  let computedFailure;
  try { assert.deepEqual(withoutComputedPaths, expected(false), 'Default runner omits computed browser imports'); } catch (error) { computedFailure = error; }
  assert(computedFailure instanceof assert.AssertionError);
  observations.at(-1).intendedFailure = { name: computedFailure.name, message: computedFailure.message, actual: computedFailure.actual, expected: computedFailure.expected };
} finally {
  assert.deepEqual(Object.fromEntries(held.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))])), before,
    'Discovery verification leaves runner, drivers and helpers byte-identical');
  fs.writeFileSync(path.join(folder, 'report.json'), JSON.stringify({ before, fixtures: fixtures.map(({source, ...row}) => row), observations }, null, 2));
}
console.log('Browser discovery: five actual dynamic drivers, including mandatory and computed imports, omitted by default and selected with browser opt-in.');
console.log('simBracketMoment and simLoginReturn guard their own browser import and stay in the default run.');
console.log('Static imports and direct require retain browser selection.');
console.log('Comments, copied source strings and the actual rival-name guard retain node selection.');
console.log('Effective copied control adds exactly twelve dynamic children while the node baseline stays unchanged.');
console.log('Effective copied control drops exactly four optional children when the self-guard rule is removed.');
console.log('Effective copied controls restore exactly three mandatory-catch and three computed-path browser children to the node group.');
console.log(`Retained actual child receipts: ${path.relative(ROOT, folder)}/report.json`);
