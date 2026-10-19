/* Fixed proof after admitted original88aa: actual suites and isolated copied-source controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { NFL_STAFF_RECOVERY_HUNK, NFL_STAFF_RECOVERY_PANEL_HUNKS, stripNflStaffRecoveryHunk, stripNflStaffRecoveryPanelHunks } from './lib/usNflStaffRecoveryHunks.mjs';
import { stripRetireHunks } from './lib/usCoachRetireHunks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = '775564305e9da84dab59f2b9fe246d044a3cc8e9', admitted = '88aa833b9d295ec22fb68f899d9b533116a14b28';
const engine = 'src/lib/usCoachCareer.ts', panel = 'src/components/us-career/CoachCareerPanel.tsx';
const suite = 'src/test/nflCoachStaffRecovery.test.tsx', oldSuite = 'src/test/usCoachRetirement.test.tsx';
const group = 'actual NFL empty coaching market recovery';
const titles = [
  'fresh NFL retiree can take a staff role without skipping a season',
  'JSON-restored stranded NFL coach can take staff work and keep the record',
  'unused recovery preserves the original empty market and idle decline',
  'completed NFL coach keeps recovery and progression unavailable',
  'employed NFL coach keeps recovery unavailable and the ordinary season intact',
  'earned NFL offers stay available without a staff shortcut',
  'nba empty coaching keeps the existing sit-out path',
  'mlb empty coaching keeps the existing sit-out path',
  'nhl empty coaching keeps the existing sit-out path',
];
const oldTitles = [
  'completed coach cannot play another season',
  'completed coach cannot sit out another season',
  'completed coach cannot accept an old offer',
  'completed coach cannot refresh the market',
  'retiring changes only done and is pure and idempotent',
  'retirement requires confirmation and accepts once after cancel and escape',
  'completed employed coach keeps the record and log without season actions',
  'completed unemployed coach cannot take offers or advance the calendar',
  'completed start card opens a review instead of offering a coaching return',
  'active coaching still plays one season and leaves its input unchanged',
  'active coach still accepts a genuine offer without changing year or history',
  'legacy coaching saves without done keep their active career',
  'completed coaching saves preserve their full record on JSON reload',
  'active start card still resumes the sideline without starting over',
];
const faults = [
  'Fresh NFL Take a staff role is missing from the actual empty-market panel',
  'Stranded NFL Take a staff role is missing from the actual empty-market panel',
];
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Ordinary offline transport inherited');
assert(!process.env.NFL_COACH_MODE || process.env.NFL_COACH_MODE === 'fixed', 'Fixed qualification only; original88aa evidence is retained separately');
for (const key of ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'US_COACH_RETIRE_CONTROL']) assert(!process.env[key], 'No inherited control ' + key);
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.replaceAll('\r\n', '\n');
const clean = value => value.replace(/\x1b\[[0-9;]*m/g, '');
const read = file => lf(fs.readFileSync(path.join(root, file), 'utf8'));
const original = file => git(['show', base + ':' + file]);
function once(source, from, to) {
  assert.equal(source.split(from).length - 1, 1, 'One exact executable source hunk');
  const changed = source.replace(from, () => to); assert.notEqual(changed, source, 'Source mutation changes bytes'); return changed;
}
const expectedHunk = `
/** An explicit NFL staff entry when the automatic market has nothing. */
export function takeNflStaffRole(
  prev: CoachCareerState,
  rng: () => number = Math.random,
): CoachCareerState {
  if (prev.sport !== 'nfl' || prev.done || !prev.unemployed || prev.job !== null || prev.offers.length !== 0) return prev;
  const opening = coachingVacancies('nfl', rng).find(job => job.tier === 4)!;
  return acceptCoachOffer({
    ...prev,
    offers: [{
      ...opening,
      brief: briefFor(4, 'nfl', rng),
      roster: rosterFor(4, rng),
      reason: 'You chose a staff role to get back to work.',
      keenness: 0,
    }],
  }, 0);
}
`;
const staffButton = `            {canTakeStaffRole && (
              <button
                onClick={takeStaffRole}
                className="min-h-11 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Take a staff role
              </button>
            )}
`;
const panelEdits = [
  ['  acceptCoachOffer, playCoachSeason, sitOutCoachSeason, retireCoachCareer,\n', '  acceptCoachOffer, playCoachSeason, sitOutCoachSeason, retireCoachCareer, takeNflStaffRole,\n'],
  ['  const last = state.results[state.results.length - 1];\n', "  const last = state.results[state.results.length - 1];\n  const canTakeStaffRole = state.sport === 'nfl' && !state.done && state.unemployed && state.job === null && state.offers.length === 0;\n  const marketNote = canTakeStaffRole\n    ? 'No automatic offers right now. You can take a staff role or wait for another opening.'\n    : state.offerNote;\n"],
  ['  /* Round 1346: the player ends it himself, behind the shared confirm. Only `done` changes. */\n', "  const takeStaffRole = () => {\n    const next = takeNflStaffRole(state);\n    if (next === state) return;\n    onChange(next, [`You took a staff role with ${next.job!.team}. Work your way up from here.`]);\n  };\n  /* Round 1346: the player ends it himself, behind the shared confirm. Only `done` changes. */\n"],
  ["{state.done ? 'You retired from coaching, so nobody is calling now.' : state.offerNote || 'Nothing on the table right now.'}", "{state.done ? 'You retired from coaching, so nobody is calling now.' : marketNote || 'Nothing on the table right now.'}"],
  ['<p className="mt-1 text-[11px] italic text-muted-foreground">{state.offerNote}</p>', '<p className="mt-1 text-[11px] italic text-muted-foreground">{marketNote}</p>'],
  ['            <button\n              onClick={sitOut}\n', staffButton + '            <button\n              onClick={sitOut}\n'],
  ['            {state.offers.length === 0 && (\n', '            {state.offers.length === 0 && !canTakeStaffRole && (\n'],
];
const originalEngine = original(engine), originalPanel = original(panel), fixedEngine = read(engine), fixedPanel = read(panel);
assert.equal(NFL_STAFF_RECOVERY_HUNK, expectedHunk, 'Inverse contains exactly the proposed function');
const section = '\n/* ---------------- playing a coaching season ---------------- */';
assert.equal(fixedEngine, once(originalEngine, section, expectedHunk + section), 'Only the exact new engine function differs');
assert.equal(stripNflStaffRecoveryHunk(fixedEngine), originalEngine, 'Whole engine inverse recovers main775');
assert.equal(stripNflStaffRecoveryHunk(fixedEngine.replaceAll('\n', '\r\n')), originalEngine, 'CRLF whole engine inverse');
for (const subject of [once(fixedEngine, expectedHunk, ''), once(fixedEngine, expectedHunk, once(expectedHunk, 'job.tier === 4', 'job.tier === 3')), fixedEngine + expectedHunk]) {
  assert.throws(() => stripNflStaffRecoveryHunk(subject), /Exactly one whole NFL staff recovery function/, 'Missing altered or duplicated literal is refused');
}
assert.equal(fixedPanel, panelEdits.reduce((body, [from, to]) => once(body, from, to), originalPanel), 'Only seven exact panel hunks differ');
assert.deepEqual(NFL_STAFF_RECOVERY_PANEL_HUNKS, panelEdits, 'Historical presentation inverse contains only the seven proposed panel hunks');
assert.equal(stripNflStaffRecoveryPanelHunks(fixedPanel), originalPanel);
assert.equal(stripNflStaffRecoveryPanelHunks(fixedPanel.replaceAll('\n', '\r\n')), originalPanel);
for (const [, to] of panelEdits) {
  for (const subject of [once(fixedPanel, to, ''), once(fixedPanel, to, to + ' '), fixedPanel + to]) {
    assert.throws(() => stripNflStaffRecoveryPanelHunks(subject), /Exactly one NFL staff panel inverse hunk|Whole historical panel SHA/, 'Missing changed or duplicated panel inverse is refused');
  }
}
assert.throws(() => stripNflStaffRecoveryPanelHunks(fixedPanel + '// unrelated panel change\n'), /Whole historical panel SHA/, 'Unrelated presentation changes cannot hide');
const poaching = 'scripts/simUsCoachPoaching.mjs';
const poachImport = "import { stripRetireHunks } from './lib/usCoachRetireHunks.mjs';\n";
const expectedPoach = once(once(original(poaching), poachImport, poachImport + "import { stripNflStaffRecoveryHunk } from './lib/usNflStaffRecoveryHunks.mjs';\n"), 'const preRetire = stripRetireHunks(source);', 'const preRetire = stripRetireHunks(stripNflStaffRecoveryHunk(source));');
assert.equal(read(poaching), expectedPoach, 'Historical harness changes only its two exact inverse bindings');
const departure = '  const departure: CoachDeparture = exit.stay ? s.profile.departure : exit.departure;';
const oldDeparture = "  const departure: CoachDeparture = poachedTo !== null ? 'poached'\n    : exit.stay ? s.profile.departure\n    : exit.departure;";
const credit = "      s.profile = { ...s.profile, departure: 'poached' };\n";
const reconstructed = once(once(stripRetireHunks(stripNflStaffRecoveryHunk(fixedEngine)), departure, oldDeparture), credit, '');
const historicalHash = 'e607f294869072f78f63433bfda86f018b845443a6cb580b58c3fd5f3d955879';
assert.equal(sha(reconstructed), historicalHash, 'Historical pre888 hash stays exact');
for (const file of [oldSuite, 'src/lib/usCareerToCoach.ts', 'src/components/us-career/UsCareerBoard.tsx', 'src/test/usCareerReports1346.test.tsx', 'scripts/data/usBoardFixture.json', 'src/test/fixtures/usCoachPoachingScouts888.json', 'vitest.config.ts', 'package.json', 'package-lock.json']) assert.equal(read(file), original(file), 'Frozen whole source: ' + file);
assert.equal(read(suite), git(['show', admitted + ':' + suite]), 'All nine admitted tests remain whole');
const artifactRoot = process.env.NFL_COACH_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfl-staff-'));
assert(path.isAbsolute(artifactRoot) && fs.statSync(artifactRoot).isDirectory(), 'Existing absolute evidence root');
assert(path.relative(root, artifactRoot).split(path.sep).includes('..'), 'Evidence outside checkout');
const out = path.join(artifactRoot, 'unit'); assert(!fs.existsSync(out)); fs.mkdirSync(out);
const write = (file, body) => fs.writeFileSync(path.join(out, file), typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2) + '\n', { flag: 'wx' });
function sourceMap() {
  return git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => { const body = Buffer.from(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')); return { file, bytes: body.length, sha256: sha(body) }; });
}
const initial = sourceMap(), statusBefore = git(['status', '--porcelain', '--untracked-files=all']);
const report = { version: 2, base, admitted, head: git(['rev-parse', 'HEAD']).trim(), mode: 'fixed', qualified: false, productQualified: false, cases: 23, arms: [], sourceHeld: false, temporaryControlsRemoved: false, historicalHash, inverseControls: ['missing', 'altered', 'duplicated'], panelInverseControls: { hunks: 7, cases: 22, kinds: ['missing', 'changed', 'duplicated', 'unrelated'] } };
write('source-before.json', initial);
write('source-bindings.json', { engine: sha(fixedEngine), panel: sha(fixedPanel), suite: sha(read(suite)), oldSuite: sha(read(oldSuite)), originalEngine: sha(originalEngine), originalPanel: sha(originalPanel), titles, oldTitles, faults });
const require = createRequire(import.meta.url);
const installedAliases = Object.fromEntries(['react/jsx-dev-runtime', 'react/jsx-runtime', 'react', 'lucide-react'].map(id => [id, require.resolve(id)]));
for (const file of Object.values(installedAliases)) assert(file.startsWith(path.join(root, 'node_modules') + path.sep) && fs.statSync(file).isFile(), 'Native installed copied-panel alias');
write('installed-aliases.json', Object.entries(installedAliases).map(([id, file]) => ({ id, file, sha256: sha(fs.readFileSync(file)) })));
const controls = path.join(out, 'control-sources'), owned = new Map();
function copiedEngine(body) {
  const from = "from './usCareerToCoach'", to = "from '@/lib/usCareerToCoach'";
  assert.equal(body.split(from).length - 1, 3, 'Three exact relative imports and type re-export');
  const copy = body.replaceAll(from, to); assert.notEqual(copy, body);
  assert.equal(copy.replaceAll(to, from), body, 'Whole copied engine inverse held'); return copy;
}
function copy(name, body) {
  const file = path.join(controls, name); fs.writeFileSync(file, body, { flag: 'wx' }); owned.set(file, body);
  write('copy-' + name, body); return file;
}
function removeControls() {
  for (const file of owned.keys()) if (fs.existsSync(file)) fs.unlinkSync(file);
  if (fs.existsSync(controls)) { assert.deepEqual(fs.readdirSync(controls), []); fs.rmdirSync(controls); }
}
function directTransportHeld() {
  const file = process.env.SIM_OFFLINE_RECEIPT;
  assert(!file || !fs.existsSync(file) || fs.statSync(file).size === 0, 'No swallowed direct transport denial');
}
function run(name, fault = null, aliases = null) {
  const arm = path.join(out, name); fs.mkdirSync(arm);
  const receipt = path.join(arm, 'transport.transport'), fixture = path.join(arm, 'fixtures.json');
  const env = { ...process.env, FORCE_COLOR: '0', NFL_COACH_FIXTURE_OUT: fixture, SIM_OFFLINE_RECEIPT: receipt };
  if (aliases) env.NO_DOUBLE_SWAP = JSON.stringify({ ...installedAliases, ...aliases });
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', suite, oldSuite, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + path.join(arm, 'vitest.json')];
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  write(name + '/stdout.log', child.stdout ?? ''); write(name + '/stderr.log', child.stderr ?? '');
  write(name + '/process.json', { command: process.execPath, args, aliases, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null });
  assert.ifError(child.error); assert.equal(child.signal, null, 'No timeout or signal earns proof');
  assert(!fs.existsSync(receipt) || fs.statSync(receipt).size === 0, 'No swallowed child transport denial');
  const stderr = clean(child.stderr ?? ''), output = clean((child.stdout ?? '') + '\n' + (child.stderr ?? ''));
  assert.doesNotMatch(output, /Unhandled (?:Errors?|Rejection)|Uncaught (?:Exception|Error)|(?:^|\n)(?:TypeError|ReferenceError|SyntaxError):|Cannot find (?:module|package)|Failed to (?:load|resolve)|ERR_MODULE_NOT_FOUND|Test timed out|Timeout calling|Invalid hook call|multiple copies of React/, 'No setup transform undefined-call duplicate-React or timeout credit');
  const json = JSON.parse(fs.readFileSync(path.join(arm, 'vitest.json'), 'utf8')), failedCount = fault ? 2 : 0;
  assert.equal(child.status, fault ? 1 : 0); assert.equal(json.testResults.length, 2); assert.equal(json.numTotalTests, 23);
  assert.equal(json.numPassedTests, 23 - failedCount); assert.equal(json.numFailedTests, failedCount);
  assert.equal(json.numPendingTests, 0); assert.equal(json.numTodoTests, 0); assert.equal(json.success, !fault);
  if (json.numRuntimeErrorTestSuites !== undefined) assert.equal(json.numRuntimeErrorTestSuites, 0);
  if (json.numUnhandledErrors !== undefined) assert.equal(json.numUnhandledErrors, 0);
  if (json.unhandledErrors !== undefined) assert.deepEqual(json.unhandledErrors, []);
  const failures = [];
  for (const expected of [{ file: suite, group, titles }, { file: oldSuite, group: 'US coaching retirement', titles: oldTitles }]) {
    const matches = json.testResults.filter(row => row.name.replaceAll('\\', '/').endsWith('/' + expected.file)); assert.equal(matches.length, 1);
    const result = matches[0]; assert.equal(result.message, ''); assert.equal(result.status, fault && expected.file === suite ? 'failed' : 'passed');
    assert.deepEqual(result.assertionResults.map(row => row.title), expected.titles);
    for (const [index, row] of result.assertionResults.entries()) {
      assert.deepEqual(row.ancestorTitles, [expected.group]); assert.equal(row.fullName, expected.group + ' ' + row.title);
      const failed = Boolean(fault && expected.file === suite && index < 2);
      assert.equal(row.status, failed ? 'failed' : 'passed'); assert.equal(row.failureMessages.length, failed ? 1 : 0);
      if (failed) {
        const message = clean(row.failureMessages[0]);
        if (fault === 'missing') {
          assert(message.startsWith('AssertionError: ' + faults[index] + ': expected null not to be null'), 'Only the actual missing button assertion fails');
          assert(stderr.includes(faults[index]), 'Printed failure identifies the same actual missing action');
        } else {
          const callbackFault = 'expected "spy" to be called 1 times, but got 0 times';
          assert(message.startsWith('AssertionError: ' + callbackFault), 'Only the unchanged callback assertion fails');
          assert(stderr.includes(callbackFault) && stderr.includes(titles[index]), 'Printed failure identifies actual click without persistence callback');
        }
        failures.push({ title: row.title, message });
      }
    }
  }
  assert.equal(failures.length, failedCount);
  const fixtureBytes = fs.readFileSync(fixture), fixtures = JSON.parse(fixtureBytes);
  assert.equal(fixtures.fresh.phase, 'retired'); assert.equal(fixtures.fresh.coach, null);
  assert.equal(fixtures.freshCoach.offers.length, 0); assert.equal(fixtures.freshCoach.done, false);
  assert.equal(fixtures.stranded.coach.profile.seasonsOut, 3); assert.equal(fixtures.stranded.coach.offers.length, 0);
  assert.equal(fixtures.stranded.coach.results.length, 3); assert.equal(fixtures.done.coach.done, true);
  const shared = path.join(out, 'fixtures.json');
  if (name === 'fixed') write('fixtures.json', fixtureBytes); else assert(fs.readFileSync(shared).equals(fixtureBytes), 'Every arm emits identical whole fictional fixtures');
  const current = sourceMap(); write(name + '/source-after.json', current); assert.deepEqual(current, initial, 'Every tracked source body and member held');
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), statusBefore, 'Working source and untracked membership held');
  directTransportHeld();
  report.arms.push({ name, passed: json.numPassedTests, failed: json.numFailedTests, fixtureSha256: sha(fixtureBytes), failures });
}
try {
  directTransportHeld(); run('fixed');
  assert(!fs.existsSync(controls)); fs.mkdirSync(controls);
  const originalEngineCopy = copy('whole-original-engine.ts', copiedEngine(originalEngine));
  const originalPanelCopy = copy('whole-original-panel.tsx', originalPanel);
  run('whole-original', 'missing', { '@/lib/usCoachCareer': originalEngineCopy, '@/components/us-career/CoachCareerPanel': originalPanelCopy });
  const buttonPanel = once(fixedPanel, staffButton, '');
  const buttonCopy = copy('button-removed-panel.tsx', buttonPanel);
  run('button-removed', 'missing', { '@/lib/usCoachCareer': path.join(root, engine), '@/components/us-career/CoachCareerPanel': buttonCopy });
  const changedHunk = once(expectedHunk, '  return acceptCoachOffer({', '  return prev;\n  return acceptCoachOffer({');
  const neutralEngine = once(fixedEngine, expectedHunk, changedHunk);
  assert.equal(once(neutralEngine, changedHunk, expectedHunk), fixedEngine, 'Transition control changes only actual recovery acceptance');
  const neutralCopy = copy('transition-neutral-engine.ts', copiedEngine(neutralEngine));
  run('transition-neutral', 'callback', { '@/lib/usCoachCareer': neutralCopy, '@/components/us-career/CoachCareerPanel': path.join(root, panel) });
  for (const [file, body] of owned) assert.equal(fs.readFileSync(file, 'utf8'), body, 'Copied control body held');
  assert.deepEqual(fs.readdirSync(controls).sort(), [...owned.keys()].map(file => path.basename(file)).sort(), 'Exact disposable control membership');
  removeControls(); assert(!fs.existsSync(controls)); report.temporaryControlsRemoved = true;
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), statusBefore, 'Controls removed before restored runtime');
  run('restored'); assert.equal(report.arms.length, 5); report.qualified = true;
} finally {
  removeControls(); report.temporaryControlsRemoved = !fs.existsSync(controls);
  const final = sourceMap(); write('source-after.json', final);
  try {
    assert.deepEqual(final, initial, 'Every tracked source body and member held finally');
    assert.equal(git(['status', '--porcelain', '--untracked-files=all']), statusBefore, 'Working source and untracked membership held finally');
    directTransportHeld(); report.sourceHeld = true;
  } finally { write('report.json', report); }
}
console.log('simNflCoachStaffRecovery: fixed23pass, whole-original21pass2missing, button-removed21pass2missing, transition-neutral21pass2callback, restored23pass.');
console.log('simNflCoachStaffRecovery: all fourteen original retirement cases pass in every arm; whole fixtures, tracked bodies, membership and empty child/direct transports held.');
console.log('simNflCoachStaffRecovery: exact engine/panel inverses, unchanged historical hash and effective inverse controls held (3 engine,22 panel).');
console.log('simNflCoachStaffRecovery: component evidence ' + path.join(out, 'report.json') + '; actual production-route evidence is separate.');
