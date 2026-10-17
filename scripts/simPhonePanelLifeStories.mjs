/* Remote-only real PhonePanel outcomes and an exact original-source control. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Life stories proof requires remote offline CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'd4f2c6f688d656205722ba52bbdb33f03490966a';
const PHASE = process.env.LIFE_STORIES_PHASE || 'fixed'; assert(['baseline', 'fixed'].includes(PHASE));
const OUT = path.resolve(process.env.LIFE_STORIES_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'life-stories-')));
fs.mkdirSync(OUT, { recursive: true });
const TEST = 'src/test/phonePanelLifeStories.test.tsx', PANEL = 'src/components/soccer-career/PhonePanel.tsx';
const missing = ['esports', 'cursedBoots', 'teammateLoan', 'coachingBadges', 'rDocCrew'].map(key => 'life stories missing: acquired ' + key + ' shows its neutral status');
missing.push('life stories missing: saved stories survive close reopen Back and literal remount',
  'life stories missing: actual resolved followups remove only their own ongoing row',
  'life stories missing: display navigation holds full saved state callbacks storage and RNG');
const preservation = ['life stories preservation: legacy missing flags keep the original Life meters and Back',
  'life stories preservation: resolved declined and unrelated flags do not create stories',
  'life stories preservation: retired careers omit unfinished flags',
  'life stories preservation: five actual acquisition and followup meanings supply held browser fixtures'];
const sourceFiles = [PANEL, TEST, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerLife.ts', 'src/lib/soccerCareerRealismA.ts',
  'src/lib/soccerCareerSave.ts', 'src/lib/soccerPhone.ts', 'src/lib/soccerMoney.ts', 'src/pages/SoccerCareer.tsx',
  'scripts/simPhonePanelLifeStories.mjs', 'scripts/playPhonePanelLifeStories.mjs', '.github/workflows/career-life-stories.yml',
  'package.json', 'package-lock.json', 'bun.lock'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => { const run = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); assert.equal(run.status, 0); return run.stdout; };
const head = git(['rev-parse', 'HEAD']).trim(), sources = sourceFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const receiptFile = path.join(OUT, 'proof.json'); assert(!fs.existsSync(receiptFile), 'Refuse to replace Life stories evidence');
const receipt = { status: 'running', head, base: BASE, phase: PHASE, sources, runs: [], fixture: null };
const write = () => fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');
write();
function run(label, expected, extraEnv = {}) {
  const reportFile = path.join(OUT, label + '.json'); assert(!fs.existsSync(reportFile));
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...extraEnv };
  if (!Object.hasOwn(extraEnv, 'NO_DOUBLE_SWAP')) delete env.NO_DOUBLE_SWAP;
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile], { cwd: ROOT, env, encoding: 'utf8', timeout: 240000, maxBuffer: 128 * 1024 * 1024 });
  const output = (child.stdout || '') + (child.stderr || ''); fs.writeFileSync(path.join(OUT, label + '.log'), output); process.stdout.write(output);
  const processResult = { status: child.status, signal: child.signal, error: child.error?.message || null };
  fs.writeFileSync(path.join(OUT, label + '.process.json'), JSON.stringify(processResult, null, 2));
  assert(!child.error && !child.signal && child.status !== null && fs.existsSync(reportFile), 'Actual child must complete');
  assert(!/Unhandled (?:Errors?|Rejection)|Uncaught Exception|ERR_MODULE_NOT_FOUND|Cannot find module|SyntaxError|ReferenceError|TypeError|\[SIM_OFFLINE_BLOCK\]/.test(output), 'No setup or unrelated failure credit');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')), cases = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(report.testResults.length, 1);
  assert(report.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST) && !report.testResults[0].message);
  assert.equal(report.numTotalTests, 12); assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  assert.deepEqual(cases.map(row => row.title).sort(), [...missing, ...preservation].sort());
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  const failed = cases.filter(row => row.status === 'failed'); assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort());
  for (const row of failed) assert(row.failureMessages.length === 1 && /^AssertionError: Life must show its active stories: expected false to be true/s.test(row.failureMessages[0]), 'Only the exact missing-section Boolean fault qualifies');
  assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 12 - expected.length);
  assert.equal(report.success, expected.length === 0); assert.equal(child.status, expected.length ? 1 : 0);
  const rows = output.split('\n').filter(line => line.startsWith('SC_LIFE_STORIES_FIXTURE:')).map(line => JSON.parse(line.slice('SC_LIFE_STORIES_FIXTURE:'.length)));
  assert.equal(rows.length, 1, 'One actual acquisition/resolution fixture receipt is required');
  const result = { label, ...processResult, passed: report.numPassedTests, failed: failed.map(row => row.title), reportSha256: sha(fs.readFileSync(reportFile)) };
  receipt.runs.push(result); write(); return rows[0];
}
try {
  const original = git(['show', BASE + ':' + PANEL]), current = fs.readFileSync(path.join(ROOT, PANEL), 'utf8');
  if (PHASE === 'baseline') assert.equal(current.replaceAll('\r\n', '\n'), original, 'Baseline must hold the exact original PhonePanel');
  const fixture = run('current', PHASE === 'baseline' ? missing : []);
  const fixtureFile = path.join(OUT, 'browser-fixtures.json'); fs.writeFileSync(fixtureFile, JSON.stringify({ head, ...fixture }, null, 2) + '\n');
  receipt.fixture = { file: 'browser-fixtures.json', sha256: sha(fs.readFileSync(fixtureFile)) }; write();
  if (PHASE === 'fixed') {
    assert.notEqual(current.replaceAll('\r\n', '\n'), original, 'Original-source control must change the component');
    const originalFile = path.join(OUT, 'PhonePanel.original.tsx'); fs.writeFileSync(originalFile, original);
    run('original', missing, { NO_DOUBLE_SWAP: JSON.stringify({ '@/components/soccer-career/PhonePanel': originalFile }) });
    const restored = run('restored', []); assert.deepEqual(restored, fixture, 'Restored actual fixture semantics remain exact');
  }
  for (const row of sources) assert.equal(sha(fs.readFileSync(path.join(ROOT, row.file))), row.sha256, 'Source held: ' + row.file);
  receipt.status = 'complete'; receipt.sourceHeld = true; write();
  console.log('PASS Life stories: twelve exact real-component cases, ' + (PHASE === 'baseline' ? 'eight owned baseline faults and four preservation passes' : 'current and restored green, original eight faults and four preservation passes'));
  console.log('PASS five actual acquisition/resolution meanings retained; prepared presentation, no natural delivery or elapsed-time claim');
  console.log('PASS entire declared component, engine, test, method and package sources held');
} catch (error) { receipt.error = error?.stack || String(error); write(); throw error; }
