import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// Remote CI only. Controls use the existing page alias with exclusive local copies.
const base = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const component = 'src/pages/LineupBuilder.tsx', fixture = 'src/test/xiQueryOwnership.test.tsx';
const related = [
  { file: 'src/test/xiSelectionHistoryRace.test.tsx', titles: [
    'history race missing: a late history cannot replace the latest enabled-picker selection',
    'history race preservation: a matching-primary club pick stays local and immediate',
    'history race preservation: valid history still admits the originally selected player',
    'history race preservation: refused history releases the picker for a valid retry',
    'history race preservation: an unverified nation pick releases the picker and retry can succeed',
    'history race preservation: reroll abandons a pending history without publishing into its new team',
    'history race preservation: reset abandons a pending history without repopulating the formation',
    'history race preservation: the existing next-door history wait stays busy and settles normally',
  ] },
  { file: 'src/test/lineupBuilderHistoryRead.test.tsx', titles: [
    'is busy while the history is read, and the pick lands once it answers',
    'gives up on a table that never answers, and the plain rule takes the pick',
    'a pick in his own position reads nothing',
  ] },
];
const definitions = [
  ['valid', 'a reroll keeps the newer query when abandoned valid history finishes'],
  ['refused', 'a reroll keeps the newer query when abandoned refused history finishes'],
  ['network', 'a reroll keeps the newer query when abandoned history fails'],
  ['timeout', 'a reroll keeps the newer query when abandoned history times out'],
  ['sameText', 'a reroll keeps an explicitly retyped identical query'],
  ['newPending', 'abandoned history cannot clear the newer pending player name'],
  ['samePending', 'abandoned history cannot clear an identical newer pending player name'],
  ['primary', 'the current local club acceptance still clears its query'],
  ['currentRefused', 'the current refused history still clears its query'],
  ['remote', 'the current remote acceptance still clears its query'],
  ['unverified', 'the current unverified reply still clears its query'],
  ['cancelledRemote', 'a cancelled validator settles before a later reroll query'],
];
const cases = definitions.map(([key, title], index) => ({ key, title, healthy: index >= 7 }));
const titles = cases.map(row => row.title), faults = cases.filter(row => !row.healthy).map(row => row.title);
const mode = process.argv[2], out = process.env.XI_QUERY_OUT;
assert(['baseline', 'fixed'].includes(mode), 'Explicit baseline or fixed phase');
assert(out && path.isAbsolute(out) && fs.existsSync(out), 'Existing absolute evidence folder');
assert(path.relative(process.cwd(), out).split(path.sep).includes('..'), 'Evidence stays outside checkout');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Offline preload inherited');
assert.equal(process.versions.node.split('.')[0], '24');
const controlDir = path.resolve('src/test/__xiQueryControls'), copies = [], observations = new Map();
assert(!fs.existsSync(controlDir), 'Fresh exclusive temporary controls');
const sha = body => createHash('sha256').update(body).digest('hex');
const clean = text => text.replace(/\x1b\[[0-9;]*m/g, '');
const write = (name, body) => fs.writeFileSync(path.join(out, name), body, { flag: 'wx' });
function replaceOnce(body, from, to) {
  assert.equal(body.split(from).length - 1, 1, 'Exactly one executable source anchor');
  const changed = body.replace(from, to); assert.notEqual(changed, body, 'Effective source control'); return changed;
}
const original = execFileSync('git', ['show', `${base}:${component}`], { encoding: 'utf8' });
assert.equal(sha(original), 'f5d480495513f58709dfcf4ff2151837135600e5bf5d7009c27a28ad13f62df4');
const edits = [
  ["import { useState, useEffect, useMemo } from 'react';", "import { useState, useEffect, useMemo, useRef } from 'react';"],
  ["  const [playerInput, setPlayerInput] = useState('');\n", "  const [playerInput, setPlayerInput] = useState('');\n  const inputRevision = useRef(0);\n"],
  ["    if (isValidating) return;\n    const raw =", "    if (isValidating) return;\n    const revision = inputRevision.current;\n    const raw ="],
  ["    });\n    setPlayerInput('');\n  };", "    });\n    if (inputRevision.current === revision) setPlayerInput('');\n  };"],
  ['                        onChange={setPlayerInput}', '                        onChange={value => { inputRevision.current += 1; setPlayerInput(value); }}'],
];
let expectedFixed = original;
for (const [from, to] of edits) expectedFixed = replaceOnce(expectedFixed, from, to);
let inverse = expectedFixed;
for (const [from, to] of [...edits].reverse()) inverse = replaceOnce(inverse, to, from);
assert.equal(inverse, original, 'Whole five-span inverse');
const source = fs.readFileSync(component, 'utf8');
assert.equal(source, mode === 'baseline' ? original : expectedFixed, 'Only the declared query ownership changes');
assert.equal(sha(fs.readFileSync(fixture)), '0c61770d4eb71134a88c85a90d10139018879e88e864df22bc661c0abc875faf');
const manifest = { version: 1, mode, base, source: sha(source), original: sha(original), fixed: sha(expectedFixed),
  fixture: sha(fs.readFileSync(fixture)), related: related.map(row => ({ file: row.file, sha256: sha(fs.readFileSync(row.file)) })), arms: [] };
write('original-component.tsx', original); write('expected-fixed-component.tsx', expectedFixed);
function run(name, input, file = fixture, failedTitles = [], expectedTitles = titles) {
  const raw = path.join(out, `${name}.raw.json`), report = path.join(out, `${name}.vitest.json`);
  const env = { ...process.env, XI_QUERY_RAW: file === fixture ? raw : '', SIM_OFFLINE_RECEIPT: path.join(out, `${name}.transport`) };
  delete env.NO_DOUBLE_SWAP;
  if (input !== null) {
    if (!copies.length) fs.mkdirSync(controlDir);
    const redirected = path.join(controlDir, `${name}.component.tsx`);
    fs.writeFileSync(redirected, input, { flag: 'wx' }); copies.push({ file: redirected, body: input });
    write(`${name}.component.tsx`, input); env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/LineupBuilder': redirected });
  }
  const args = ['node_modules/vitest/vitest.mjs', 'run', file, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', `--outputFile=${report}`];
  const child = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 360000, maxBuffer: 64 * 1024 * 1024 });
  write(`${name}.stdout.log`, child.stdout ?? ''); write(`${name}.stderr.log`, child.stderr ?? '');
  write(`${name}.process.json`, JSON.stringify({ args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null }, null, 2) + '\n');
  assert.ifError(child.error); assert.equal(child.signal, null, `${name} completed`);
  const output = clean(`${child.stdout ?? ''}\n${child.stderr ?? ''}`);
  assert(!/Unhandled (?:Errors?|Rejection)|Uncaught (?:Exception|Error)|TypeError:|ReferenceError:|SyntaxError:|Cannot find (?:module|package)|Failed to (?:load|resolve)|ERR_MODULE_NOT_FOUND/i.test(output), `${name} no setup or unhandled errors`);
  assert.equal(child.status, failedTitles.length ? 1 : 0, `${name} actual child exit`);
  const json = JSON.parse(fs.readFileSync(report, 'utf8')), rows = json.testResults.flatMap(row => row.assertionResults);
  assert.equal(json.testResults.length, 1); assert.equal(json.testResults[0].message, '', 'No suite setup error');
  assert.equal(json.numTotalTests, expectedTitles.length); assert.equal(rows.length, expectedTitles.length);
  assert.equal(json.numPendingTests, 0); assert.equal(json.numTodoTests, 0);
  if (json.numRuntimeErrorTestSuites !== undefined) assert.equal(json.numRuntimeErrorTestSuites, 0);
  if (json.unhandledErrors !== undefined) assert.deepEqual(json.unhandledErrors, []);
  assert.equal(json.numFailedTests, failedTitles.length); assert.equal(json.numPassedTests, expectedTitles.length - failedTitles.length);
  assert.equal(json.success, failedTitles.length === 0); assert.deepEqual(rows.map(row => row.title), expectedTitles, `${name} exact ordered cases`);
  assert(rows.every(row => ['passed', 'failed'].includes(row.status)), 'All cases completed');
  assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => row.title).sort(), [...failedTitles].sort(), `${name} exact causal targets`);
  for (const row of rows) {
    if (row.status === 'passed') assert.deepEqual(row.failureMessages, []);
    else {
      assert.equal(row.failureMessages.length, 1); const failure = clean(row.failureMessages[0]);
      assert(failure.startsWith('AssertionError: XI_QUERY_OWNERSHIP:'), 'Only the named ownership assertion fails');
      assert(/expected false to be true/i.test(failure), 'Exact Boolean ownership failure');
    }
  }
  let rawSha256 = null;
  if (file === fixture) {
    const bytes = fs.readFileSync(raw), observation = JSON.parse(bytes);
    assert.equal(observation.version, 1); assert.deepEqual(observation.caseTitles, titles);
    assert.deepEqual(Object.keys(observation.cases), cases.map(row => row.key));
    for (const entry of cases) {
      const row = observation.cases[entry.key]; assert.equal(row.key, entry.key); assert.equal(row.title, entry.title);
      assert.deepEqual(row.finalStores, row.initialStores); assert.deepEqual(row.unexpected, []); assert.deepEqual(row.consoleErrors, []);
      assert.deepEqual(row.completions, []); assert.equal(row.cleanupHTML, ''); assert(row.gates.every(gate => gate.settled));
      const final = row.moments.at(-1); assert.equal(final.label, 'settled-before-cleanup'); assert.deepEqual(final.stores, row.initialStores);
      for (const moment of row.moments) { assert.deepEqual(moment.stores, row.initialStores); assert.deepEqual(moment.completions, []); }
      if (!entry.healthy) {
        const target = row.moments.find(moment => moment.label === (entry.key.endsWith('Pending') ? 'obsolete-settled-during-current' : 'obsolete-settled'));
        assert(target && target.input, 'Actual target input observation retained');
        const wanted = ['sameText', 'samePending'].includes(entry.key) ? 'Fixture Harbor Defender' : entry.key === 'newPending' ? 'Fixture Harbor Review' : 'Fresh quarry';
        assert.equal(target.input.value, failedTitles.includes(entry.title) ? '' : wanted);
      }
    }
    rawSha256 = sha(bytes); observations.set(name, observation);
  }
  assert.equal(fs.readFileSync(component, 'utf8'), source, 'Actual product body held');
  assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, 'No outbound transport');
  const arm = { name, tests: expectedTitles.length, passed: expectedTitles.length - failedTitles.length, failed: failedTitles.length, failedTitles, rawSha256 };
  manifest.arms.push(arm); console.log(`${name}: ${arm.passed} pass, ${arm.failed} exact semantic faults`); return arm;
}
function heldHealthy(name) {
  for (const entry of cases.filter(row => row.healthy)) assert.deepEqual(observations.get(name).cases[entry.key], observations.get('normal').cases[entry.key], `${name} complete unaffected observation ${entry.key}`);
}
function relatedRuns(label) { for (const [index, entry] of related.entries()) run(`${label}-${index}`, null, entry.file, [], entry.titles); }
try {
  if (mode === 'baseline') {
    const first = run('baseline-original', null, fixture, faults), replay = run('baseline-original-replay', null, fixture, faults);
    assert.equal(replay.rawSha256, first.rawSha256, 'Two independent original children retain the whole raw observations');
    relatedRuns('baseline-related'); manifest.status = 'diagnosed-original-only';
  } else {
    assert.match(process.env.XI_QUERY_BASELINE_RAW_SHA ?? '', /^[a-f0-9]{64}$/, 'Actual received baseline raw required');
    relatedRuns('related-normal'); const normal = run('normal', null);
    const inverseArm = run('original-inverse', original, fixture, faults);
    assert.equal(inverseArm.rawSha256, process.env.XI_QUERY_BASELINE_RAW_SHA, 'Whole separately received original raw binding'); heldHealthy('original-inverse');
    const increment = 'inputRevision.current += 1; ', noIncrement = replaceOnce(source, increment, '');
    assert.equal(replaceOnce(noIncrement, 'onChange={value => { setPlayerInput(value); }}', 'onChange={value => { ' + increment + 'setPlayerInput(value); }}'), source);
    run('remove-increment', noIncrement, fixture, faults); heldHealthy('remove-increment');
    const guard = "    if (inputRevision.current === revision) setPlayerInput('');", noGuard = replaceOnce(source, guard, "    setPlayerInput('');");
    assert.equal(replaceOnce(noGuard, "    });\n    setPlayerInput('');\n  };", "    });\n" + guard + '\n  };'), source);
    run('remove-guard', noGuard, fixture, faults); heldHealthy('remove-guard');
    const restored = run('restored', null); assert.equal(restored.rawSha256, normal.rawSha256, 'Whole normal and restored raw bytes held');
    assert.deepEqual(observations.get('restored'), observations.get('normal'), 'Whole normal and restored observations held');
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
  assert(!fs.existsSync(controlDir)); manifest.temporaryControlsRemoved = true; write('proof.json', JSON.stringify(manifest, null, 2) + '\n');
}
