/* Actual-App World XI evidence verifier. Detached controls never change the game. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const sha = value => createHash('sha256').update(value).digest('hex');
const same = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
const check = (value, owner, detail) => assert(value, owner + ': ' + detail);
const identity = player => JSON.stringify([player.name, player.club, player.position, player.country, player.value, player.age ?? null, player.positionsPlayed ?? null]);
const ordered = values => [...values].sort();
const finite = value => typeof value === 'number' && Number.isFinite(value);
const countryRows = (reference, country) => reference.byCountry.find(([key]) => key === country)?.[1] ?? [];
const selectedPart = snap => snap.pitch.filter(slot => slot.filled);
const permittedLocalKeys = new Set(['cookie-consent-v2', 'dukb-guest-handle', 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1']);
export const OWNERS = ['WX_APP_BOOT', 'WX_APP_MODE', 'WX_APP_EXHAUSTION', 'WX_APP_PICKS', 'WX_APP_RECOVERY', 'WX_APP_BOUNDARY', 'WX_APP_COMPLETION', 'WX_APP_GEOMETRY'];

function validateSnapshots(row, reference) {
  check(row.complete === true, 'WX_APP_BOOT', 'context completed its actual collection');
  check(row.boot.batches.length === (row.lab ? 2 : 1), 'WX_APP_BOOT', 'declared attempt count');
  for (const [index, batch] of row.boot.batches.entries()) {
    check(batch.length === 17, 'WX_APP_BOOT', 'exactly17 GETs per explicit loader attempt');
    check(same(ordered(batch.map(q => q.key)), ordered(reference.schedule.map(q => q.key))), 'WX_APP_BOOT', 'exact unique roster read multiset');
    for (const query of batch) {
      const record = reference.schedule.find(value => value.key === query.key);
      const fault = row.lab && index === 0 && query.key === reference.faultKey;
      const expected = fault ? reference.fault : record;
      check(query.method === 'GET' && query.status === expected.status && query.sha256 === expected.sha256 && query.bytes === expected.bytes && query.count === expected.count, 'WX_APP_BOOT', 'held actual supplied response bytes/status/count');
      check(finite(query.startMs) && finite(query.endMs) && query.endMs >= query.startMs, 'WX_APP_BOOT', 'raw native response timing');
    }
  }
  if (row.lab) {
    check(row.boot.fault.errorText === "Couldn't load the player database right now." && row.boot.fault.retryVisible && row.boot.fault.drawAbsent, 'WX_APP_BOOT', 'real required-market failure surface');
    check(row.boot.fault.completions === 0 && row.boot.retry.trusted && row.boot.retry.beforeBatch === 1, 'WX_APP_BOOT', 'real Retry authorizes only the second loader batch');
  }
  check(finite(row.boot.setupMs) && row.boot.setupMs >= 0, 'WX_APP_BOOT', 'offline setup timing retained');
  check(same(row.setupModes.map(value => [value.mode, value.count]), ['expanded', 'classic', '2026'].map(mode => [mode, reference.pools[mode].countries.length])), 'WX_APP_MODE', 'all three actual setup counts match this input pool');
  check(row.mode === reference.mode && row.draw.mode === reference.mode && reference.pools[row.mode].countries.includes(row.draw.first.country), 'WX_APP_MODE', 'actual selected mode and first revealed nation');
  check(row.draw.first.slotNumber === 1 && row.draw.first.filled === 0, 'WX_APP_PICKS', 'first actual playing foundation');
  check(row.help.before && row.help.reopened && row.help.closed, 'WX_APP_GEOMETRY', 'real preplay guide and reopening');
  for (const section of ['The steps', 'The rules', 'A worked example']) check(row.help.text.includes(section), 'WX_APP_GEOMETRY', 'loaded guide section ' + section);
  check(row.help.text.includes('2026') && row.help.text.includes('2025'), 'WX_APP_GEOMETRY', 'real stored-roster disclosure');
  check(row.draw.beforeY === row.draw.afterY, 'WX_APP_GEOMETRY', 'draw input focus does not move the viewport');
}

function validatePicks(row, reference) {
  const expectedCount = row.lab ? 11 : 2;
  check(row.selections.length === expectedCount, 'WX_APP_PICKS', 'actual native selection count');
  const used = new Set();
  for (const [index, pick] of row.selections.entries()) {
    const slot = reference.slots.find(value => value.label === pick.slot);
    const players = countryRows(reference.pools[row.mode], pick.country);
    check(slot && players.some(player => identity(player) === identity(pick.player)), 'WX_APP_PICKS', 'exact input player record and canonical country bucket');
    check(reference.eligible[pick.slot].includes(identity(pick.player)), 'WX_APP_PICKS', 'actual compiled slot-fit rules');
    check(!used.has(pick.player.name), 'WX_APP_PICKS', 'exact used-name exclusion');
    used.add(pick.player.name);
    check(pick.before.filled === index && pick.before.slotNumber === index + 1 && pick.after.filled === index + 1, 'WX_APP_PICKS', 'one actual filled advance');
    check(pick.after.slotNumber === (index === 10 ? null : index + 2), 'WX_APP_PICKS', 'actual next slot or completed phase');
    const placed = pick.after.pitch.find(value => value.x === pick.point.x && value.y === pick.point.y);
    check(placed?.filled && placed.name === reference.shortNames[pick.player.name], 'WX_APP_PICKS', 'actual pitch placement');
    check(pick.input.trusted && pick.click.trusted, 'WX_APP_PICKS', 'actual trusted input and suggestion activation');
    if (index < 10) check(pick.click.beforeY === pick.click.afterY, 'WX_APP_GEOMETRY', 'next-input focus does not scroll');
    if (row.lab && index !== 9) check(pick.country === reference.labDraw[index], 'WX_APP_MODE', 'declared lab draw revealed through actual turns');
  }
  if (row.wrongPosition?.reached) {
    const trial = row.wrongPosition;
    check(!reference.eligible[trial.slot].includes(identity(trial.player)), 'WX_APP_PICKS', 'wrong-position trial is actually illegal');
    check(trial.before.filled === trial.after.filled && trial.before.slotNumber === trial.after.slotNumber && trial.feedback.includes(trial.player.name) && trial.feedback.includes('Try a different player.'), 'WX_APP_PICKS', 'actual rejection preserves the turn');
  } else check(row.wrongPosition?.status === 'UNREACHED', 'WX_APP_PICKS', 'unreached optional rejection branch is explicit');
  check(row.final.filled === expectedCount && row.pathname === '/world-xi', 'WX_APP_PICKS', 'final actual route progress');
}

function validateRecovery(row, reference) {
  if (!row.lab) return;
  const recovery = row.recovery, before = recovery.before, after = recovery.after;
  check(before.filled === 9 && before.slotNumber === 10 && before.slot === 'ST' && before.unusedCount === 0, 'WX_APP_EXHAUSTION', 'actual shared-name exhausted ST foundation');
  const used = new Set(row.selections.slice(0, 9).map(value => value.player.name));
  const fits = reference.eligible.ST;
  const available = countryRows(reference.pools.expanded, before.country).filter(p => !used.has(p.name) && fits.includes(identity(p)));
  check(new Set(available.map(p => p.name)).size === 0 && recovery.freeVisible && recovery.paidDisabled, 'WX_APP_EXHAUSTION', 'real free control and disabled paid alternative');
  check(before.timer <= 87 && before.timer > 0, 'WX_APP_EXHAUSTION', 'native90second clock actually elapsed before recovery');
  check(after.country !== before.country && reference.pools.expanded.countries.includes(after.country), 'WX_APP_RECOVERY', 'native free action changes active nation');
  check(countryRows(reference.pools.expanded, after.country).some(p => !used.has(p.name) && fits.includes(identity(p))), 'WX_APP_RECOVERY', 'replacement has an unused fitting exact name');
  check(before.paid === 0 && after.paid === 0 && before.filled === after.filled && before.slotNumber === after.slotNumber, 'WX_APP_RECOVERY', 'paid budget and turn/picks held');
  check(same(selectedPart(before), selectedPart(after)), 'WX_APP_RECOVERY', 'all nine actual picked pitch records held');
  check(same(before.pitch.filter(p => !p.active), after.pitch.filter(p => !p.active)), 'WX_APP_RECOVERY', 'nonactive rendered pitch held');
  check(finite(before.now) && finite(after.now) && after.now >= before.now && after.timer <= before.timer && before.timer - after.timer <= Math.ceil((after.now - before.now) / 1000) + 2, 'WX_APP_RECOVERY', 'native timer continues without reset');
  check(recovery.click.trusted, 'WX_APP_RECOVERY', 'actual free button activation');
  check(row.final.phase === 'won' && row.resultRows.length === 11, 'WX_APP_COMPLETION', 'real completed XI and eleven result rows');
  for (const pick of row.selections) check(row.resultRows.some(result => result.name === pick.player.name && result.club === pick.player.club && result.country === pick.player.country), 'WX_APP_PICKS', 'actual result name/club/rawcountry');
}

function validateBoundary(row) {
  for (const key of ['unexpected', 'writes', 'pageErrors', 'consoleErrors', 'failed', 'routeErrors', 'responseErrors']) check(Array.isArray(row.transport[key]) && row.transport[key].length === 0, 'WX_APP_BOUNDARY', 'no unexpected ' + key);
  check(same(row.native, row.nativeFinal), 'WX_APP_BOUNDARY', 'native clock/RNG identities held through actual play');
  check(row.native.date && row.native.performance && row.native.timers && row.native.raf && row.native.random === !row.lab && row.native.labConstant === row.lab, 'WX_APP_BOUNDARY', 'native clocks and honestly scoped RNG');
  check(row.supplied.length > 0 && row.supplied.length === row.assets.length && new Set(row.assets.map(value => value.index)).size === row.assets.length, 'WX_APP_BOUNDARY', 'every fulfilled Buffer has one actual response');
  for (const supplied of row.supplied) { const actual = row.assets.find(value => value.index === supplied.index); check(actual && actual.url === supplied.url && actual.status === supplied.status && actual.bytes === supplied.bytes && actual.sha256 === supplied.sha256, 'WX_APP_BOUNDARY', 'actual browser response equals the owned Buffer'); }
  check(row.document.characterSet === 'UTF-8', 'WX_APP_BOUNDARY', 'actual document uses UTF8');
  check(row.serviceWorkers === 'block' && row.actualApp === true && row.authRequests === 0, 'WX_APP_BOUNDARY', 'real guest App/no auth writes');
  for (const stage of Object.values(row.stores)) {
    check(stage && typeof stage.local === 'object' && typeof stage.session === 'object' && Object.keys(stage.session).length === 0, 'WX_APP_BOUNDARY', 'complete guest storage snapshots');
    check(Object.keys(stage.local).every(key => permittedLocalKeys.has(key)), 'WX_APP_BOUNDARY', 'only declared source-derived local keys');
  }
  const consent = JSON.parse(row.stores.setup.local['cookie-consent-v2'] ?? 'null');
  check(consent?.version === 2 && consent.advertising === false && consent.analytics === false && finite(consent.updatedAt), 'WX_APP_BOUNDARY', 'actual canonical denied consent');
  check(row.stores.setup.local['dukb-guest-handle'] && row.stores.final.local['dukb-guest-handle'] === row.stores.setup.local['dukb-guest-handle'], 'WX_APP_BOUNDARY', 'real boot guest identity held');
  for (const key of ['numRuntimeErrors', 'numUnhandledErrors', 'numUnhandledRejections']) if (row.runtime[key] != null) check(typeof row.runtime[key] === 'number' && row.runtime[key] === 0, 'WX_APP_BOUNDARY', 'numeric optional runtime counter');
}

function validateCompletion(row) {
  check(same(row.lab ? row.stores.preCompletion : row.stores.final, row.stores.setup), 'WX_APP_COMPLETION', 'complete stores held before completion and throughout partial archival play');
  check(row.completionAttempts.length === (row.lab ? 1 : 0), 'WX_APP_COMPLETION', 'once-only lab completion and none in partial archival games');
  if (!row.lab) return;
  const attempt = row.completionAttempts[0], handle = row.stores.setup.local['dukb-guest-handle'];
  check(attempt.method === 'POST' && attempt.status === 201 && attempt.virtual === true && attempt.urlPath === '/rest/v1/game_completions', 'WX_APP_COMPLETION', 'local-only virtual completion boundary');
  check(same(attempt.body, { game: 'world-xi', score: 11, player_name: handle }), 'WX_APP_COMPLETION', 'exact actual guest payload');
  const today = JSON.parse(row.stores.final.local['dukb-local-completions'] ?? 'null');
  check(today && typeof today.date === 'string' && same(today.slugs, ['world-xi']), 'WX_APP_COMPLETION', 'native local distinct completion');
  check(row.stores.final.local['dukb-streaks-v1'] && row.stores.final.local['dukb-play-diary-v1'], 'WX_APP_COMPLETION', 'native streak and diary retained');
}

function validateGeometry(row, evidenceRoot) {
  check(row.widths.length >= 3 && row.widths.every(value => value.clientWidth === row.size.width && value.scrollWidth <= value.clientWidth), 'WX_APP_GEOMETRY', 'no horizontal page overflow in observed states');
  check(row.targets.length > 0 && row.targets.every(target => target.hit && target.width > 0 && target.height > 0 && (!target.isNew || target.height >= 44)), 'WX_APP_GEOMETRY', 'reachable controls and new44px height');
  const stages = row.lab ? ['setup', 'exhausted', 'recovered', 'complete'] : ['setup', 'two-picks'];
  check(same(row.shots.map(value => value.stage), stages), 'WX_APP_GEOMETRY', 'original scoped screenshots');
  for (const shot of row.shots) {
    check(shot.file === row.id + '-' + shot.stage + '.png', 'WX_APP_GEOMETRY', 'owned PNG filename');
    const body = fs.readFileSync(path.join(evidenceRoot, shot.file));
    check(body.length === shot.bytes && sha(body) === shot.sha256 && Math.abs(body.readUInt32BE(16) - row.size.width * row.size.dpr) < 1 && Math.abs(body.readUInt32BE(20) - row.size.height * row.size.dpr) < 1, 'WX_APP_GEOMETRY', 'actual original PNG bytes and viewport dimensions');
  }
}

export function validateContext(row, reference, evidenceRoot) {
  validateSnapshots(row, reference);
  validatePicks(row, reference);
  validateRecovery(row, reference);
  validateBoundary(row);
  validateCompletion(row);
  validateGeometry(row, evidenceRoot);
}

export const faults = [
  ['roster-body', 'WX_APP_BOOT', value => { value.boot.batches[0][0].sha256 = 'changed'; }],
  ['mode-country', 'WX_APP_MODE', value => { value.draw.first.country = 'Not an archived or fictional nation'; }],
  ['unused-count', 'WX_APP_EXHAUSTION', value => { value.recovery.before.unusedCount = 1; }],
  ['picked-record', 'WX_APP_PICKS', value => { value.selections[0].player.club = 'Changed copied club'; }],
  ['nonactive-pitch', 'WX_APP_RECOVERY', value => { value.recovery.after.pitch.find(p => p.filled && !p.active).name += ' changed'; }],
  ['paid-budget', 'WX_APP_RECOVERY', value => { value.recovery.after.paid = 1; }],
  ['unexpected-write', 'WX_APP_BOUNDARY', value => { value.transport.writes.push({ method: 'POST', path: '/unrelated' }); }],
  ['completion-count', 'WX_APP_COMPLETION', value => { value.completionAttempts.push(structuredClone(value.completionAttempts[0])); }],
  ['geometry-overflow', 'WX_APP_GEOMETRY', value => { value.widths[0].scrollWidth = value.widths[0].clientWidth + 1; }],
];

export function verifyRun(evidenceRoot) {
  const run = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'run.json')));
  const reference = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'reference.json')));
  check(run.complete === true && same(run.contexts.map(value => value.id), ['mini', 'phone', 'desktop']), 'WX_APP_BOOT', 'three complete contexts');
  for (const row of run.contexts) validateContext(row, reference.contexts[row.id], evidenceRoot);
  check(run.contexts.flatMap(row => row.boot.batches.flat()).length === 68, 'WX_APP_BOOT', 'actual four attempts/68GET total');
  check(run.controls.length === 9, 'WX_APP_BOUNDARY', 'nine declared detached observation controls');
  const healthy = run.contexts.find(row => row.id === 'mini');
  for (const [index, [name, owner, mutate]] of faults.entries()) {
    const receipt = run.controls[index];
    check(receipt.beforeFile === 'control-' + name + '.before.json' && receipt.changedFile === 'control-' + name + '.changed.json' && receipt.restoredFile === 'control-' + name + '.restored.json', 'WX_APP_BOUNDARY', 'exact owned control evidence paths');
    const original = fs.readFileSync(path.join(evidenceRoot, receipt.beforeFile));
    const changed = fs.readFileSync(path.join(evidenceRoot, receipt.changedFile)), restored = fs.readFileSync(path.join(evidenceRoot, receipt.restoredFile));
    check(receipt.name === name && receipt.owner === owner && receipt.kind === 'detached-observation' && !original.equals(changed) && original.equals(restored), 'WX_APP_BOUNDARY', 'physical changed copy and exact restore');
    check(sha(original) === receipt.beforeSha256 && sha(changed) === receipt.changedSha256 && sha(restored) === receipt.restoredSha256, 'WX_APP_BOUNDARY', 'retained control hashes');
    check(same(JSON.parse(original), healthy), 'WX_APP_BOUNDARY', 'control starts from actual healthy lab');
    const expected = structuredClone(healthy); mutate(expected);
    check(same(JSON.parse(changed), expected), 'WX_APP_BOUNDARY', 'exact declared copy mutation');
    assert.throws(() => validateContext(JSON.parse(changed), reference.contexts.mini, evidenceRoot), error => error.name === 'AssertionError' && error.message.startsWith(owner + ':'), name + ': native owned assertion');
    validateContext(JSON.parse(restored), reference.contexts.mini, evidenceRoot);
    check(receipt.changed && receipt.owned && receipt.restoredHealthy && receipt.primary.startsWith(owner + ':'), 'WX_APP_BOUNDARY', 'changed/owned/restored actual receipt');
  }
  return { schema: 1, status: 'passed', contexts: 3, loaderGETs: 68, selections: run.contexts.reduce((sum, row) => sum + row.selections.length, 0), originalPNGs: 8, controls: 9, restored: 9, scope: 'held actual-App fixture/archive proof, no production/live-roster or physical-device claim', runtimeCounters: 'UNKNOWN when absent/null' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = path.resolve(process.argv[2] ?? '');
  try { const summary = verifyRun(output); fs.writeFileSync(path.join(output, 'raw-verifier-summary.json'), JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary)); }
  catch (error) { console.error(error); process.exitCode = 1; }
}
