import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// Remote CI only. Original source and each guard arm use the existing alias seam.
const base = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const component = 'src/components/soccer-career/DrillBoard.tsx';
const fixture = 'src/test/drillKeyboardRouting.test.tsx';
const related = [
  { file: 'src/test/drillBoardMatch.test.tsx', titles: [
    'plays the wall shot round it was handed, once, and writes no daily record',
    'wins the tackle round by tapping the loose ball, and reports what the engine settles',
    'lets a glove round run out as a miss, once',
    'plays one through ball, reports once and offers no next ball or menu',
    'cancels a Wall Shot drag without spending the round, then releases once',
    'cancels a Gloves drag without spending the round, then releases once',
  ] },
  { file: 'src/test/drillBoardMarkup.test.tsx', titles: [
    'draws the Wall Shot as recorded', 'draws the Tackle as recorded', 'draws the Glove Save as recorded',
    'draws the Through Ball as recorded', 'matches the record made before the match prop existed',
  ] },
];
const mode = process.argv[2], out = process.env.DRILL_KEYBOARD_OUT;
assert(['baseline', 'fixed'].includes(mode), 'Explicit baseline or fixed phase');
assert(out && path.isAbsolute(out) && fs.existsSync(out), 'Existing absolute evidence folder');
assert(path.relative(process.cwd(), out).split(path.sep).includes('..'), 'Evidence stays outside checkout');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Offline preload inherited');
assert.equal(process.versions.node.split('.')[0], '24');
const controlDir = path.resolve('src/test/__drillKeyboardControls'), copies = [];
assert(!fs.existsSync(controlDir), 'Fresh exclusive temporary controls');
const sha = body => createHash('sha256').update(body).digest('hex');
const clean = text => text.replace(/\x1b\[[0-9;]*m/g, '');
const write = (name, body) => fs.writeFileSync(path.join(out, name), body, { flag: 'wx' });
function replaceOnce(body, from, to) {
  assert.equal(body.split(from).length - 1, 1, 'Exactly one executable source anchor');
  const changed = body.replace(from, to); assert.notEqual(changed, body, 'Effective source control'); return changed;
}
const original = execFileSync('git', ['show', `${base}:${component}`], { encoding: 'utf8' });
assert.equal(sha(original), '42591173de244f05f7e21166035ee6b7fe2d04ac78a8dc54c69bbd817038a99e');
const anchor = '    const down = (e: KeyboardEvent) => {\n';
const target = `(e.target instanceof Element && e.target.closest('button, a[href], input, select, textarea, [contenteditable]:not([contenteditable="false"])'))`;
const guard = `      if (e.defaultPrevented || ${target}) return;\n`;
const expectedFixed = replaceOnce(original, anchor, anchor + guard);
assert.equal(replaceOnce(expectedFixed, guard, ''), original, 'Whole one-line inverse');
const source = fs.readFileSync(component, 'utf8');
assert.equal(source, mode === 'baseline' ? original : expectedFixed, 'Only the declared keyboard guard changes');
const cases = [];
for (const position of ['ST', 'CB', 'GK']) for (const control of ['close', 'back']) for (const word of ['Enter', 'Space'])
  cases.push({ key: `ready_${position}_${control}_${word}`, title: `${position} ready ${control} retains native ${word} routing`, group: 'interactive' });
for (const position of ['ST', 'CB', 'GK']) for (const control of ['close', 'back'])
  cases.push({ key: `playing_${position}_${control}_Space`, title: `${position} playing ${control} retains native Space routing`, group: 'interactive' });
for (const position of ['ST', 'CB', 'GK']) for (const word of ['Enter', 'Space'])
  cases.push({ key: `prevented_${position}_${word}`, title: `${position} ready ignores prevented ${word} on the board body`, group: 'prevented' });
for (const word of ['ArrowLeft', 'ArrowRight']) cases.push({ key: `range_ST_${word}`, title: `ST playing power range retains native ${word} routing`, group: 'interactive' });
for (const position of ['ST', 'CB', 'GK']) for (const word of ['Enter', 'Space'])
  cases.push({ key: `ready_body_${position}_${word}`, title: `${position} board body ${word} starts one round`, group: 'healthy' });
for (const position of ['ST', 'CB', 'GK']) cases.push({ key: `playing_body_${position}_Space`, title: `${position} playing board body Space settles one round`, group: 'healthy' });
assert.equal(cases.length, 35);
const titles = cases.map(row => row.title), observations = new Map();
const manifest = { version: 1, mode, base, source: sha(source), original: sha(original), fixed: sha(expectedFixed),
  fixture: sha(fs.readFileSync(fixture)), related: related.map(row => ({ file: row.file, sha256: sha(fs.readFileSync(row.file)) })), arms: [] };
write('original-component.tsx', original); write('expected-fixed-component.tsx', expectedFixed);
function run(name, input, file = fixture, faults = [], expectedTitles = titles) {
  const raw = path.join(out, `${name}.raw.json`), report = path.join(out, `${name}.vitest.json`);
  const env = { ...process.env, DRILL_KEYBOARD_RAW: file === fixture ? raw : '', SIM_OFFLINE_RECEIPT: path.join(out, `${name}.transport`) };
  delete env.NO_DOUBLE_SWAP;
  if (input !== null) {
    if (!copies.length) fs.mkdirSync(controlDir);
    const redirected = path.join(controlDir, `${name}.component.tsx`);
    fs.writeFileSync(redirected, input, { flag: 'wx' }); copies.push({ file: redirected, body: input });
    write(`${name}.component.tsx`, input);
    env.NO_DOUBLE_SWAP = JSON.stringify({ './DrillBoard': redirected, '@/components/soccer-career/DrillBoard': redirected });
  }
  const args = ['node_modules/vitest/vitest.mjs', 'run', file, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', `--outputFile=${report}`];
  const child = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 360000, maxBuffer: 64 * 1024 * 1024 });
  write(`${name}.stdout.log`, child.stdout ?? ''); write(`${name}.stderr.log`, child.stderr ?? '');
  write(`${name}.process.json`, JSON.stringify({ args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null }, null, 2) + '\n');
  assert.ifError(child.error); assert.equal(child.signal, null, `${name} completed`);
  const output = clean(`${child.stdout ?? ''}\n${child.stderr ?? ''}`);
  assert(!/Unhandled (?:Errors?|Rejection)|Uncaught (?:Exception|Error)|TypeError:|ReferenceError:|SyntaxError:|Cannot find (?:module|package)|Failed to (?:load|resolve)|ERR_MODULE_NOT_FOUND/i.test(output), `${name} no setup or unhandled errors`);
  assert.equal(child.status, faults.length ? 1 : 0, `${name} actual child exit`);
  const json = JSON.parse(fs.readFileSync(report, 'utf8')), rows = json.testResults.flatMap(row => row.assertionResults);
  assert.equal(json.testResults.length, 1); assert.equal(json.testResults[0].message, '', 'No suite setup error');
  assert.equal(json.numTotalTests, expectedTitles.length); assert.equal(rows.length, expectedTitles.length);
  assert.equal(json.numPendingTests, 0); assert.equal(json.numTodoTests, 0);
  if (json.numRuntimeErrorTestSuites !== undefined) assert.equal(json.numRuntimeErrorTestSuites, 0);
  if (json.unhandledErrors !== undefined) assert.deepEqual(json.unhandledErrors, []);
  assert.equal(json.numFailedTests, faults.length); assert.equal(json.numPassedTests, expectedTitles.length - faults.length);
  assert.equal(json.success, faults.length === 0);
  assert.deepEqual(rows.map(row => row.title), expectedTitles, `${name} exact ordered cases`);
  assert(rows.every(row => ['passed', 'failed'].includes(row.status)), 'All cases completed');
  assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => row.title).sort(), [...faults].sort(), `${name} exact causal targets`);
  for (const row of rows) {
    if (row.status === 'passed') assert.deepEqual(row.failureMessages, []);
    else {
      assert.equal(row.failureMessages.length, 1);
      const failure = clean(row.failureMessages[0]);
      assert(failure.startsWith('AssertionError: DRILL_KEYBOARD_ROUTING:'), 'Only the named routing assertion fails');
      assert(/expected false to be true/i.test(failure), 'Exact Boolean routing failure');
    }
  }
  let rawSha256 = null;
  if (file === fixture) {
    const bytes = fs.readFileSync(raw), observation = JSON.parse(bytes);
    assert.equal(observation.version, 1); assert.deepEqual(observation.caseTitles, titles);
    assert.deepEqual(Object.keys(observation.cases), cases.map(row => row.key));
    for (const entry of cases) {
      const row = observation.cases[entry.key], failed = faults.includes(entry.title);
      assert.equal(row.key, entry.key); assert.equal(row.title, entry.title); assert.equal(row.routingCorrect, !failed);
      assert.equal(row.inputAfterJSON, row.inputJSON); assert.equal(row.cleanup.inputJSON, row.inputJSON);
      assert.deepEqual(row.storesAfter, row.expectedStores); assert.deepEqual(row.cleanup.stores, row.expectedStores);
      assert.deepEqual(row.draws, []); assert.deepEqual(row.cleanup.draws, []); assert.deepEqual(row.callbacks, []);
      assert.deepEqual(row.cleanup.callbacks, []); assert.equal(row.cleanup.html, '');
    }
    rawSha256 = sha(bytes); observations.set(name, observation);
  }
  assert.equal(fs.readFileSync(component, 'utf8'), source, 'Actual product body held');
  assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, 'No outbound transport');
  const arm = { name, tests: expectedTitles.length, passed: expectedTitles.length - faults.length, failed: faults.length, failedTitles: faults, rawSha256 };
  manifest.arms.push(arm); console.log(`${name}: ${arm.passed} pass, ${arm.failed} exact semantic faults`); return arm;
}
function heldHealthy(name, groups) {
  for (const entry of cases.filter(row => groups.includes(row.group)))
    assert.deepEqual(observations.get(name).cases[entry.key], observations.get('normal').cases[entry.key], `${name} complete unaffected observation ${entry.key}`);
}
function relatedRuns(label) {
  for (const [index, entry] of related.entries()) run(`${label}-${index}`, null, entry.file, [], entry.titles);
}
try {
  if (mode === 'baseline') {
    const faults = cases.filter(row => row.group !== 'healthy').map(row => row.title);
    const first = run('baseline-original', null, fixture, faults);
    const replay = run('baseline-original-replay', null, fixture, faults);
    assert.equal(replay.rawSha256, first.rawSha256, 'Two independent original children retain the whole raw observations');
    relatedRuns('baseline-related'); manifest.status = 'diagnosed-original-only';
  } else {
    assert.match(process.env.DRILL_KEYBOARD_BASELINE_RAW_SHA ?? '', /^[a-f0-9]{64}$/, 'Actual received baseline raw required');
    relatedRuns('related-normal'); run('normal', null);
    const inverse = run('original-inverse', original, fixture, cases.filter(row => row.group !== 'healthy').map(row => row.title));
    assert.equal(inverse.rawSha256, process.env.DRILL_KEYBOARD_BASELINE_RAW_SHA, 'Whole separately received original raw binding');
    heldHealthy('original-inverse', ['healthy']);
    const noInteractive = replaceOnce(source, guard, '      if (e.defaultPrevented) return;\n');
    assert.equal(replaceOnce(noInteractive, '      if (e.defaultPrevented) return;\n', guard), source);
    run('remove-interactive', noInteractive, fixture, cases.filter(row => row.group === 'interactive').map(row => row.title));
    heldHealthy('remove-interactive', ['healthy', 'prevented']);
    const noPrevented = replaceOnce(source, guard, `      if (${target}) return;\n`);
    assert.equal(replaceOnce(noPrevented, `      if (${target}) return;\n`, guard), source);
    run('remove-prevented', noPrevented, fixture, cases.filter(row => row.group === 'prevented').map(row => row.title));
    heldHealthy('remove-prevented', ['healthy', 'interactive']);
    run('restored', null); assert.deepEqual(observations.get('restored'), observations.get('normal'), 'Whole normal and restored raw held');
    relatedRuns('related-restored'); manifest.status = 'passed';
  }
} catch (error) { manifest.status = 'failed'; manifest.error = String(error.stack || error); throw error;
} finally {
  assert.equal(fs.readFileSync(component, 'utf8'), source, 'Final actual component held');
  if (copies.length) {
    assert.deepEqual(fs.readdirSync(controlDir).sort(), copies.map(row => path.basename(row.file)).sort(), 'Only owned temporary files');
    for (const copy of copies) { assert.equal(fs.readFileSync(copy.file, 'utf8'), copy.body, 'Exact owned body before removal'); fs.unlinkSync(copy.file); }
    fs.rmdirSync(controlDir);
  }
  assert(!fs.existsSync(controlDir)); manifest.temporaryControlsRemoved = true;
  write('proof.json', JSON.stringify(manifest, null, 2) + '\n');
}
