/* Remote-only fault for the actual documentary target-availability guard. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Target control requires remote offline transport');
assert.equal(process.env.CAREER_DOCUMENTARY_PHASE, 'fixed');
assert(!process.env.SC_DOCUMENTARY_CONTROL && process.env.SC_DOCUMENTARY_EXPECT_RED !== '1', 'Only the separate target fault may run');
assert(process.env.CAREER_DOCUMENTARY_OUT && path.isAbsolute(process.env.CAREER_DOCUMENTARY_OUT), 'An absolute packet root is required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = 'f1839dd7a22e3b8fbf9e8038554a295bffd0700a';
const HELPER = 'scripts/simSoccerCareerDocumentaryReview.mjs';
const SELF = 'scripts/qa/qualifySoccerCareerDocumentaryTarget.mjs';
const WORKFLOW = '.github/workflows/soccer-career-documentary-target-control.yml';
const OUT = path.join(process.env.CAREER_DOCUMENTARY_OUT, 'target-control');
assert(OUT !== ROOT && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep), 'Evidence must stay outside the actual build');
assert(!fs.existsSync(OUT), 'Refuse to replace retained target-control evidence');
fs.mkdirSync(OUT, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.error, undefined); assert.equal(result.signal, null); assert.equal(result.status, 0, 'Actual Git source binding must finish');
  return result.stdout;
}
const head = git(['rev-parse', 'HEAD']).trim();
git(['diff', '--exit-code', BASE, '--', 'src', 'scripts', '.github/workflows', 'package.json', 'package-lock.json', 'bun.lock', ':!' + SELF, ':!' + WORKFLOW]);
const files = ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerLife.ts', 'src/lib/soccerCareerRealismA.ts',
  'src/lib/soccerCareerSave.ts', 'src/lib/soccerCareerContracts.ts', 'src/lib/soccerCareerRoutineEvents.ts',
  'src/lib/soccerCareerLifeConsequences.ts', 'src/pages/SoccerCareer.tsx', HELPER,
  'src/test/soccerCareerDocumentaryReview.test.ts', 'scripts/playSoccerCareerDocumentaryReview.mjs',
  '.github/workflows/soccer-career-documentary-review.yml', 'scripts/simSoccerCareerColdContext.mjs',
  'scripts/simCareerLifeCooldowns.mjs', 'scripts/qa/qualifySoccerCareerDocumentaryBinding.mjs',
  SELF, WORKFLOW, 'package.json', 'package-lock.json', 'bun.lock'];
const held = new Map(files.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
for (const [file, bytes] of held) {
  const before = path.join(OUT, 'before', file); fs.mkdirSync(path.dirname(before), { recursive: true }); fs.writeFileSync(before, bytes);
}
const original = held.get(HELPER).toString('utf8');
const anchor = "acquire('second-priority631', secondLater, [4], true)";
const replacement = "acquire('second-priority631', secondLater, [220], true)";
assert.equal(original.split(anchor).length - 1, 1, 'One actual repeat-target call must exist');
const offset = original.indexOf(anchor), copied = original.slice(0, offset) + replacement + original.slice(offset + anchor.length);
const inverse = copied.slice(0, offset) + anchor + copied.slice(offset + replacement.length);
assert.notEqual(copied, original); assert.equal(inverse, original, 'The sole target-call inverse restores the complete helper');
fs.writeFileSync(path.join(OUT, 'helper.before.mjs'), original); fs.writeFileSync(path.join(OUT, 'helper.control.mjs'), copied);
const expectedCause = 'second-priority631: requested target must exist in the actual catalog and be available to the original picker';
const receipt = { head, appRef: BASE, status: 'running', expectedCause, transform: { anchor, replacement, offset,
  beforeSha256: sha(original), afterSha256: sha(copied), inverseSha256: sha(inverse) } };
const save = () => write(path.join(OUT, 'source.json'), { ...receipt, sourceReceipts: [...held].map(([file, before]) => ({
  file, beforePath: 'before/' + file, beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(path.join(ROOT, file))) })) });
write(path.join(OUT, 'transform.json'), receipt.transform); save();
const childFile = path.join(ROOT, `scripts/.qa-documentary-target-${randomUUID()}.mjs`);
const childOut = path.join(OUT, 'fixed');
const SETUP = /SyntaxError:|ReferenceError:|TypeError:|ERR_MODULE_NOT_FOUND|ERR_REQUIRE_ESM|Cannot find module|Failed to load|Failed to resolve import|Unhandled (?:Errors?|Rejection)|Uncaught Exception/i;
try {
  let result;
  try {
    fs.writeFileSync(childFile, copied);
    result = spawnSync(process.execPath, [childFile], { cwd: ROOT, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', CAREER_DOCUMENTARY_PHASE: 'fixed', CAREER_DOCUMENTARY_OUT: OUT,
        SC_DOCUMENTARY_EXPECT_RED: '', SC_DOCUMENTARY_CONTROL: '' } });
  } finally { fs.rmSync(childFile, { force: true }); }
  const output = (result.stdout || '') + (result.stderr || ''); fs.writeFileSync(path.join(OUT, 'output.log'), output);
  receipt.process = { status: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null };
  receipt.outputSha256 = sha(output); write(path.join(OUT, 'process.json'), receipt.process); save();
  assert.equal(result.error, undefined); assert.equal(result.signal, null); assert.equal(result.status, 1, 'The actual availability guard must reject the expired target');
  assert(!SETUP.test(output), 'No setup, module or unhandled failure credit');
  assert.deepEqual(output.match(/^AssertionError \[ERR_ASSERTION\]: .+$/gm), ['AssertionError [ERR_ASSERTION]: ' + expectedCause]);
  const source = JSON.parse(fs.readFileSync(path.join(childOut, 'source.json'), 'utf8'));
  const unit = JSON.parse(fs.readFileSync(path.join(childOut, 'unit.json'), 'utf8'));
  const progress = JSON.parse(fs.readFileSync(path.join(childOut, 'fixture-progress.json'), 'utf8'));
  assert.equal(source.sourceHead, head); assert.equal(source.arm, 'fixed'); assert.equal(source.exitCode, 0);
  assert.equal(source.processSignal, null); assert.equal(source.processError, null); assert.deepEqual(source.actualSourceEdits, []);
  assert(source.methodError.startsWith('AssertionError [ERR_ASSERTION]: ' + expectedCause));
  assert.equal(unit.numTotalTests, 22); assert.equal(unit.numPassedTests, 22); assert.equal(unit.numFailedTests, 0); assert.equal(unit.numPendingTests, 0);
  assert.equal(unit.success, true); assert.equal(unit.testResults.length, 1);
  assert(!unit.testResults[0].message && unit.testResults[0].name.replaceAll('\\', '/').endsWith('/src/test/soccerCareerDocumentaryReview.test.ts'));
  assert.equal(unit.testResults[0].assertionResults.length, 22);
  assert(unit.testResults[0].assertionResults.every(test => test.status === 'passed' && test.failureMessages.length === 0));
  assert.equal(fs.readFileSync(path.join(childOut, path.basename(childFile) + '.before'), 'utf8'), copied, 'Actual child must retain the complete executed helper');
  assert.equal(source.sourceReceipts.length, 11); assert.equal(source.parentBindings.length, 8); assert.equal(source.compiled.length, 6);
  for (const row of source.sourceReceipts) {
    const before = fs.readFileSync(path.join(childOut, path.basename(row.file) + '.before'));
    assert.equal(sha(before), row.beforeSha256); assert.equal(row.afterSha256, row.beforeSha256);
    assert.deepEqual(before, row.file === path.relative(ROOT, childFile).replaceAll('\\', '/') ? Buffer.from(copied) : held.get(row.file));
  }
  for (const row of source.compiled) assert.equal(sha(fs.readFileSync(path.join(childOut, row.file))), row.sha256);
  assert.equal(progress.status, 'controlled-picker-inputs'); assert.equal(progress.acquisitions.length, 5);
  assert.equal(progress.answers.length, 5); assert.equal(progress.seasons.length, 4); assert.deepEqual(progress.scenarios, []);
  const last = progress.acquisitions[4], target = last.witness.targetAvailability[0];
  assert.equal(last.witness.name, 'second-priority631'); assert.deepEqual(last.witness.targets, [220]);
  assert.equal(last.witness.priorityReview, true); assert.equal(last.context.seasons.at(-1).year, 2030);
  assert.equal(last.witness.targetAvailability.length, 1); assert.equal(target.id, 220); assert.equal(target.matches, 1);
  assert.equal(target.card.id, 220); assert.equal(target.card.story, 'squadChatLeak'); assert.equal(target.ledgerKey, 'story:squadChatLeak');
  assert.equal(target.cooldown, 99); assert.equal(target.season, 2030); assert.equal(target.lastFired, 2027);
  assert.equal(last.context.eventLastFired['story:squadChatLeak'], 2027); assert.equal(target.onCooldown, true);
  assert.equal(target.lastEventId, last.context.lastEventId); assert.notEqual(target.lastEventId, 220); assert.deepEqual(target.draws, []);
  assert.deepEqual(last.witness.comparisons, []); assert.deepEqual(last.witness.input.draws, []); assert.equal(last.witness.input.drawCount, 0);
  assert.equal(last.witness.observed, null); assert.equal(last.witness.replay, null);
  assert(!fs.existsSync(path.join(OUT, 'browser-fixtures.json')), 'The refused target must not produce complete fixtures');
  for (const [file, before] of held) assert.deepEqual(fs.readFileSync(path.join(ROOT, file)), before, 'Every actual app and proof file must stay held');
  git(['diff', '--exit-code', BASE, '--', 'src', 'scripts', '.github/workflows', 'package.json', 'package-lock.json', 'bun.lock', ':!' + SELF, ':!' + WORKFLOW]);
  receipt.status = 'qualified-rejection'; receipt.effective = true; receipt.refusedTarget = target;
  receipt.partial = { unitsPassed: 22, acquisitions: 5, answers: 5, actualSeasons: 4, completedScenarios: 0 };
  save(); write(path.join(OUT, 'qualified.json'), receipt);
  console.log('Actual target-control child: exit1, one exact availability refusal, 22 actual unit cases passed.');
  console.log('Actual expired target220: once99, story stamp2027, saved season2030, cooldown true, zero availability draws.');
  console.log(`Effective repeat-target fault: ${receipt.transform.afterSha256}; complete helper inverse and ${held.size} actual source holds.`);
  console.log('Supplemental guard sensitivity only. Normal available4 replay, complete fixtures and UI qualification remain separate.');
} catch (error) { receipt.methodError = error?.stack || String(error); save(); throw error; }
