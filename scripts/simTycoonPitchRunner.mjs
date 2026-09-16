/** Fail closed on Pitch test-runner errors without replaying another match. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'scripts/simTycoonPitch.mjs'), 'utf8').replaceAll('\r\n', '\n');
const parsed = ts.createSourceFile('simTycoonPitch.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declarations = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'runnerFailure');
assert.equal(declarations.length, 1, 'Read the one actual Pitch runner classifier');
const classify = vm.runInNewContext(`(${declarations[0].getText(parsed)})`);
const clean = { status: 0, signal: null, error: null };
const report = { numFailedTests: 0 };
assert.equal(classify(clean, report, '', false), null, 'Healthy runner is accepted');
assert.equal(classify({ ...clean, status: 1 }, { numFailedTests: 1 }, '', true), null,
  'An intended negative assertion remains eligible for case-by-case grading');

const controls = [
  ['nonzero', { ...clean, status: 1 }, report, '', false, 'runner exit'],
  ['unhandled-count', clean, { ...report, numUnhandledErrors: 1 }, '', false, 'unhandled errors'],
  ['unhandled-array', clean, { ...report, unhandledErrors: [{ message: 'late update' }] }, '', false, 'unhandled errors'],
  ['unhandled-text', clean, report, 'Vitest caught 13 unhandled errors during the test run.', false, 'unhandled errors'],
  ['late-error', clean, report, 'Unhandled Error', false, 'unhandled errors'],
  ['signal', { ...clean, status: null, signal: 'SIGTERM' }, report, '', false, 'runner signal'],
  ['spawn-error', { ...clean, error: { message: 'fixture spawn failed' } }, report, '', false, 'runner error'],
  ['negative-exit2', { ...clean, status: 2 }, { numFailedTests: 1 }, '', true, 'runner exit'],
];
for (const [name, result, counts, text, negative, reason] of controls) {
  assert.notDeepEqual([result, counts, text, negative], [clean, report, '', false], `Control ${name} changes the input`);
  assert.ok(classify(result, counts, text, negative)?.includes(reason), `Control ${name} must reject the runner`);
  console.log(`CONTROL PROVED: ${name}`);
}
console.log('simTycoonPitchRunner: healthy and intended assertion exits accepted; all 8 runner error controls rejected.');
