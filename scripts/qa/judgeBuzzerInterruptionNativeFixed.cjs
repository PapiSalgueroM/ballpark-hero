/* QA observation judge only. Requires a future actual healthy collector run. */
const fs = require('node:fs'), path = require('node:path'), a = require('node:assert/strict');
const { createHash } = require('node:crypto'), sha = b => createHash('sha256').update(b).digest('hex');
const [collected, rawFile, output] = process.argv.slice(2);
a.equal(process.argv.length, 5); a.equal(process.env.CI, 'true'); a.equal(process.env.SIM_NETWORK, 'offline');
for (const file of [collected, rawFile, output]) a(file && path.isAbsolute(file), 'NATIVE_ABSOLUTE_INTERFACE');
const C = path.resolve(collected), J = path.resolve(output), root = process.cwd();
for (const file of [C, path.resolve(rawFile), J]) a(file !== root && !file.startsWith(root + path.sep), 'NATIVE_OUTSIDE_SOURCE');
a(J !== C && !J.startsWith(C + path.sep) && !fs.existsSync(J), 'NATIVE_FRESH_JUDGE_OUTPUT');
const collector = process.env.BUZZER_COLLECTOR_FILE, collectorSHA = process.env.BUZZER_COLLECTOR_SHA256;
a(collector && path.isAbsolute(collector)); a.match(collectorSHA || '', /^[a-f0-9]{64}$/);
a.equal(sha(fs.readFileSync(collector)), collectorSHA, 'NATIVE_BOUND_CORRECTED_COLLECTOR');
for (const name of ['EXPECTED_PARENT', 'EXPECTED_TREE', 'GITHUB_SHA']) a.match(process.env[name] || '', /^[a-f0-9]{40}$/);
const read = name => fs.readFileSync(path.join(C, name)), parse = name => JSON.parse(read(name));
const clone = value => JSON.parse(JSON.stringify(value)), encode = value => JSON.stringify(value, null, 2) + '\n';
const profiles = [{ id: 'global-space', key: ' ', global: true }, { id: 'button-space', key: ' ', global: false }, { id: 'button-enter', key: 'Enter', global: false }];
const stages = ['healthy', 'returned', 'released'], oldIDs = ['native-focus', 'native-power', 'native-witness'];
const oldCauses = ['BUZZER_INITIAL_NATIVE_FOCUS', 'BUZZER_NATIVE_POWER_MOVED_REQUIRED', 'BUZZER_ACTUAL_FOCUS_LOSS_REQUIRED'];
const core = s => [s.shot, s.rounds, s.made, s.points, s.storage];
const numbers = s => ['shot', 'rounds', 'made', 'points'].every(k => Number.isInteger(s[k]) && s[k] >= 0);
const keys = (s, mark, key) => s.trace.filter(e => e.seq >= mark && e.key === key);
function normal(cycle, shot, key, marker) {
  a(cycle.before.phase === 'aiming' && cycle.before.shot === shot && !cycle.before.charging, marker);
  a(cycle.after.phase === 'shotEnd' && cycle.after.shot === shot && !cycle.after.charging && numbers(cycle.after), marker);
  a(cycle.after.focused && cycle.after.visibility === 'visible' && cycle.quiet.phase === 'shotEnd' && !cycle.quiet.charging, marker);
  a.deepEqual(core(cycle.quiet), core(cycle.after), marker);
  const events = keys(cycle.after, cycle.before.trace.length, key);
  a(events.filter(e => e.type === 'keydown' && !e.repeat && e.trusted).length === 1
    && events.filter(e => e.type === 'keyup' && e.trusted).length === 1
    && events.filter(e => e.type === 'keyup').length === 1, marker);
}
function inspect(v) {
  const r = v.report;
  a(v.raw === '0' && r.methodFailures === 0 && r.ownedCases === 0 && r.diagnosticCases === 0
    && r.status === 'HYPOTHESIS_NOT_REPRODUCED' && r.headed === true && r.display, 'NATIVE_HEALTHY_ENVELOPE');
  a.equal(r.parent, process.env.EXPECTED_PARENT, 'NATIVE_HEALTHY_ENVELOPE');
  a.equal(r.parentTree, process.env.EXPECTED_TREE, 'NATIVE_HEALTHY_ENVELOPE');
  a.deepEqual(r.contexts.map(c => c.spec), profiles, 'NATIVE_HEALTHY_ENVELOPE');
  for (const row of r.contexts) {
    const s = row.initial, key = row.spec.key, returned = row.returned.trace.filter(e => e.seq >= row.mark);
    a(row.methodError === null && row.failures.length === 0 && row.help.opened && row.help.closed, 'NATIVE_INITIAL_FOUNDATION');
    a(s.phase === 'aiming' && s.mode === 'unlimited' && s.paused === 'false' && s.shot === 1 && s.rounds === 10
      && s.made === 0 && s.points === 0 && s.court && s.dialogs === 0 && s.focused && s.visibility === 'visible', 'NATIVE_INITIAL_FOUNDATION');
    a(s.fonts.status === 'loaded' && s.fonts.inter && s.fonts.display && s.fonts.faces.every(f => f.status === 'loaded'), 'NATIVE_INITIAL_FOUNDATION');
    normal(row.normalBefore, 1, key, 'NATIVE_FIRST_NORMAL_CYCLE');
    a(row.mark === row.beforeHold.trace.length && row.beforeHold.shot === 2 && row.beforeHold.rounds === 10
      && numbers(row.beforeHold) && row.held.charging && row.held.phase === 'aiming'
      && Number.isInteger(row.held.power) && row.held.power !== row.beforeHold.power, 'NATIVE_ORIGINAL_WITNESS');
    a(keys(row.held, row.mark, key).some(e => e.type === 'keydown' && e.trusted && !e.repeat), 'NATIVE_ORIGINAL_WITNESS');
    a(row.away.focused === false || row.away.visibility === 'hidden', 'NATIVE_ORIGINAL_WITNESS');
    a(returned.some(e => e.trusted && (e.type === 'blur' || e.type === 'visibilitychange' && e.visibility === 'hidden'))
      && !returned.some(e => e.type === 'keyup' && e.key === key)
      && row.returned.focused && row.returned.visibility === 'visible', 'NATIVE_ORIGINAL_WITNESS');
    a(row.returned.charging === false && row.beforeRelease.charging === false && row.afterRelease.charging === false, 'NATIVE_CANCELLED_CHARGE');
    const powers = [row.returned.power, row.beforeRelease.power, row.afterRelease.power];
    a(powers.every(p => Number.isInteger(p) && p >= 0 && p <= 100) && powers.every(p => p === powers[0]), 'NATIVE_STOPPED_POWER');
    const before = keys(row.beforeRelease, row.mark, key), after = keys(row.afterRelease, row.mark, key);
    a(!before.some(e => e.type === 'keyup') && after.filter(e => e.type === 'keyup').length === 1
      && after.filter(e => e.type === 'keyup' && e.trusted).length === 1
      && after.filter(e => e.type === 'keydown' && !e.repeat && e.trusted).length === 1, 'NATIVE_SINGLE_TRUSTED_KEYUP');
    for (const state of [row.returned, row.beforeRelease, row.afterRelease, row.fresh.before]) {
      a(state.phase === 'aiming' && state.mode === 'unlimited' && state.paused === 'false' && numbers(state), 'NATIVE_STALE_RELEASE_STATE');
      a.deepEqual(core(state), core(row.beforeHold), 'NATIVE_STALE_RELEASE_STATE');
    }
    normal(row.fresh, 2, key, 'NATIVE_FRESH_SAME_SHOT_CYCLE');
    a.deepEqual(row.fresh.after.storage, row.beforeHold.storage, 'NATIVE_FRESH_SAME_SHOT_CYCLE');
    a.deepEqual(row.diagnostics, { returnedCharging: false, powerContinues: false, postKeyupProgressed: false }, 'NATIVE_HEALTHY_ENVELOPE');
    a.deepEqual(row.images.map(im => im.file), stages.map(stage => row.spec.id + '-' + stage + '.png'), 'NATIVE_ORIGINAL_IMAGES');
    for (const im of row.images) {
      const bytes = read(im.file);
      a(im.original === true && im.bytes === bytes.length && im.sha256 === sha(bytes)
        && bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        && bytes.readUInt32BE(16) === 1280 && bytes.readUInt32BE(20) === 900, 'NATIVE_ORIGINAL_IMAGES');
    }
  }
  a.deepEqual(r.controls.map(c => c.id), oldIDs, 'NATIVE_OLD_CONTROLS');
  for (const [i, c] of r.controls.entries()) {
    a(c.working === c.id + '.control.json' && c.changed === c.id + '.changed.json', 'NATIVE_OLD_CONTROLS');
    const good = read(c.working), bad = read(c.changed), expected = clone(r.contexts[0]);
    if (i === 0) expected.initial.focused = false;
    else if (i === 1) expected.held.power = expected.beforeHold.power;
    else { expected.away.focused = true; expected.away.visibility = 'visible'; }
    a(c.sameCopyRestored === true && c.featureGreenCredit === false && c.beforeSHA256 === c.restoredSHA256
      && c.changedSHA256 !== c.beforeSHA256 && sha(good) === c.restoredSHA256 && sha(bad) === c.changedSHA256, 'NATIVE_OLD_CONTROLS');
    a.deepEqual(JSON.parse(good), r.contexts[0], 'NATIVE_OLD_CONTROLS');
    a.deepEqual(JSON.parse(bad), expected, 'NATIVE_OLD_CONTROLS');
    a(c.refusal.name === 'AssertionError' && c.refusal.message === oldCauses[i], 'NATIVE_OLD_CONTROLS');
  }
  return { contexts: 3, originalImages: 9, originalPreconditionControls: 3 };
}
const actual = { raw: fs.readFileSync(rawFile, 'utf8').trim(), report: parse('BASELINE-REPORT.json') };
for (const row of actual.report.contexts) a.deepEqual(parse(row.spec.id + '.json'), row, 'NATIVE_PHYSICAL_CONTEXT_ASSOCIATION');
const inputFiles = [rawFile, path.join(C, 'BASELINE-REPORT.json'), collector];
const inputPins = inputFiles.map(file => ({ file, sha256: sha(fs.readFileSync(file)) }));
const result = inspect(actual); // No passing foundation is manufactured or repaired.
fs.mkdirSync(J); const foundation = encode(actual), controls = [];
fs.writeFileSync(path.join(J, 'actual-foundation.json'), foundation, { flag: 'wx' });
function control(id, mutate, marker) {
  const working = path.join(J, id + '.control.json'), changedFile = path.join(J, id + '.changed.json');
  fs.writeFileSync(working, foundation, { flag: 'wx' }); const value = JSON.parse(fs.readFileSync(working));
  mutate(value); const changed = encode(value); a.notEqual(sha(changed), sha(foundation), 'NATIVE_COPIED_CONTROL_CHANGED');
  fs.writeFileSync(working, changed); fs.writeFileSync(changedFile, changed, { flag: 'wx' }); let refusal;
  try { inspect(JSON.parse(fs.readFileSync(working))); } catch (error) { refusal = error; }
  finally { fs.writeFileSync(working, foundation); }
  a(refusal instanceof a.AssertionError && refusal.message.includes(marker), 'NATIVE_COPIED_CONTROL_OWNED:' + id);
  a.equal(sha(fs.readFileSync(working)), sha(foundation)); inspect(JSON.parse(fs.readFileSync(working)));
  controls.push({ id, marker, working: path.basename(working), changed: path.basename(changedFile), beforeSHA256: sha(foundation),
    changedSHA256: sha(changed), restoredSHA256: sha(fs.readFileSync(working)), sameCopyRestored: true,
    refusal: { name: refusal.name, message: refusal.message }, physicalProductFaultCredit: false });
}
control('raw-nonzero', v => { v.raw = '1'; }, 'NATIVE_HEALTHY_ENVELOPE');
control('persistent-charge', v => { v.report.contexts[0].beforeRelease.charging = true; }, 'NATIVE_CANCELLED_CHARGE');
control('power-drift', v => { const s = v.report.contexts[0].beforeRelease; s.power += s.power === 100 ? -1 : 1; }, 'NATIVE_STOPPED_POWER');
control('untrusted-keyup', v => { const r = v.report.contexts[0]; r.afterRelease.trace.find(e => e.seq >= r.mark && e.type === 'keyup' && e.key === r.spec.key).trusted = false; }, 'NATIVE_SINGLE_TRUSTED_KEYUP');
control('stale-points', v => { v.report.contexts[0].afterRelease.points++; }, 'NATIVE_STALE_RELEASE_STATE');
control('stale-storage', v => { const s = v.report.contexts[0].afterRelease.storage; a(!s.some(([key]) => key === '__buzzerJudgeCopy__')); s.push(['__buzzerJudgeCopy__', '1']); }, 'NATIVE_STALE_RELEASE_STATE');
control('fresh-slot', v => { v.report.contexts[0].fresh.after.shot++; }, 'NATIVE_FRESH_SAME_SHOT_CYCLE');
control('image-sha', v => { const im = v.report.contexts[0].images[0]; im.sha256 = (im.sha256[0] === '0' ? '1' : '0') + im.sha256.slice(1); }, 'NATIVE_ORIGINAL_IMAGES');
control('prior-restore', v => { v.report.controls[0].restoredSHA256 = v.report.controls[0].changedSHA256; }, 'NATIVE_OLD_CONTROLS');
a.deepEqual(inputFiles.map(file => ({ file, sha256: sha(fs.readFileSync(file)) })), inputPins, 'NATIVE_INPUTS_HELD');
fs.writeFileSync(path.join(J, 'NATIVE-FIXED-ADMISSION.json'), encode({ status: 'ACTUAL_NATIVE_INTERRUPTION_FIXED_CONTRACT', qualified: true,
  source: process.env.GITHUB_SHA, parent: process.env.EXPECTED_PARENT, parentTree: process.env.EXPECTED_TREE,
  correctedCollectorSHA256: collectorSHA, correctedSamplerReference: '9fabaacef5603b3eabf0850c6186669323a0dbf37bfc22359fc4da2ac8f09739',
  ...result, copiedObservationControls: controls, inputPins, nativeHiddenCredit: false, broaderModeOrVisualCredit: false,
  internalEngineCallCountCredit: false, physicalProductFaultCredit: false, featureOrReleaseReady: false }), { flag: 'wx' });
console.log('BUZZER_NATIVE_FIXED:3 actual journeys unarmed after one stale keyup; fresh same-shot cycles,9 original images,3 original guards and9 copied judge refusals/restores passed.');
