/* Actual cup matches against immutable b20 source. No ancient outcome hash is
   treated as current truth. Baseline must fail only the absent-order detail
   requirement; infrastructure errors use exit 2 and never earn expected-red credit.
   Ordinary discovery defaults to fixed, reads immutable b20 from Git history,
   and writes a unique .sim-artifacts directory. Explicit phase, baseline and
   output inputs keep the same contract as the detached qualification.
   Round 1600 (2026-10-30): both engines are bundled on the world before the
   flip while this tree's world reads age (scripts/lib/cmCurve1World1600.mjs,
   the curve 1 files rebuilt from this tree's own). Immutable b20 knows no
   level beside a rating, no age read and no drop out shift, so on the curve 2
   files the walk to the first cup could never be equal (exit 2, "The actual
   walk before the first cup changed", on the round's head); on the curve 1
   world this tree's engine reads no age and every check below is as strict as
   before. CM_SHOOTOUT_RESULTS_CONTROL=keepcurve leaves the bridge out and must
   end on that same exit 2 line. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { worldReadsAge1600, curve1Plugin1600 } from './lib/cmCurve1World1600.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.env.CM_SHOOTOUT_RESULTS_PHASE ?? 'fixed';
const bridgeControl = process.env.CM_SHOOTOUT_RESULTS_CONTROL ?? '';
let baseline = process.env.CM_SHOOTOUT_RESULTS_BASELINE;
let output = process.env.CM_SHOOTOUT_RESULTS_OUT;
const candidate = process.env.CM_SHOOTOUT_RESULTS_CANDIDATE ?? path.join(ROOT, 'src/lib/clubManager.ts');
const originalBlob = 'a505743537b383bc7885bb81f5a72c11e154b566';
const realRandom = Math.random;
const realNow = Date.now;
const storageBefore = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let temporary;
let receipt;
let ownsOutput = false;

const copy = value => structuredClone(value);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const record = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n');
function seeded(seed, run) {
  let a = seed | 0;
  const draws = [];
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const n = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    draws.push(n);
    return n;
  };
  Date.now = () => Date.UTC(2026, 9, 1);
  try { return { value: run(), draws }; }
  finally { Math.random = realRandom; Date.now = realNow; }
}
function reachCup(engine, fixture) {
  return seeded(782002, () => {
    let state = engine.startCareer(fixture.club);
    const target = state.calendar.findIndex(entry => entry.type === 'cup');
    assert.ok(target >= 0, 'Actual career has no cup fixture');
    for (let guard = 0; state.week < target && guard < 60; guard += 1) {
      const out = engine.playNextEntry(state, { skipHalftime: true, untilWeek: target });
      state = out.state;
      if (out.kind === 'reached') break;
      assert.equal(out.kind, 'match', 'Actual fixture walk stopped early');
    }
    assert.equal(state.week, target, 'Actual fixture walk did not reach cup');
    return state;
  });
}
function play(engine, state, seed) {
  return seeded(seed, () => {
    const out = engine.playNextEntry(state, { skipHalftime: true });
    assert.equal(out.kind, 'match', 'Actual cup entry did not play a match');
    assert.equal(out.report?.competition, 'cup', 'Actual cup entry returned no cup report');
    return out;
  });
}
function preserveReport(actual, before) {
  if (!actual.shootout || before.shootout) return assert.deepEqual(actual, before);
  assert.equal(before.decidedBy, 'pens');
  const expected = copy(before);
  expected.shootout = actual.shootout;
  const stem = (before.shootoutWon ?? before.won)
    ? '🥅 Nerves of steel. You win the shootout.'
    : '🥅 Heartbreak from the spot: shootout defeat.';
  const indices = before.events.flatMap((event, i) => event === stem ? [i] : []);
  assert.equal(indices.length, 1, 'Only the exact existing penalty event may change');
  expected.events[indices[0]] = `${stem.slice(0, -1)} ${actual.shootout.mine}-${actual.shootout.theirs}.`;
  assert.deepEqual(actual, expected);
}
function checkKicks(report) {
  const detail = report.shootout;
  assert.ok(detail && detail.kicks.length, 'new shootout report has no kick details');
  assert.ok(report.detail && Array.isArray(report.detail.myRatings), 'Match report lacks its real played names');
  let mine = 0, theirs = 0, takenMine = 0, takenTheirs = 0;
  const over = () => takenMine < 5 || takenTheirs < 5
    ? mine + (5 - takenMine) < theirs || theirs + (5 - takenTheirs) < mine
    : takenMine === takenTheirs && mine !== theirs;
  const myNames = new Set(report.detail.myRatings.map(player => player.name));
  const off = new Set([
    ...report.detail.subs.map(sub => sub.off),
    ...report.detail.cards.filter(card => card.kind === 'red').map(card => card.name),
    ...report.detail.injuries.map(injury => injury.name),
  ]);
  let previous;
  for (const kick of detail.kicks) {
    assert.ok(!over(), 'A kick was taken after the shootout had ended');
    assert.ok(['me', 'opp'].includes(kick.side));
    assert.notEqual(kick.side, previous, 'The sides must alternate');
    previous = kick.side;
    assert.ok(['scored', 'saved', 'missed'].includes(kick.result));
    assert.ok(typeof kick.taker === 'string' && kick.taker.length > 0);
    if (kick.side === 'me') {
      assert.ok(myNames.has(kick.taker), 'My taker did not play this match');
      assert.ok(!off.has(kick.taker), 'My taker was off the pitch at the whistle');
      takenMine += 1;
      if (kick.result === 'scored') mine += 1;
    } else {
      if (/^Their (?:taker \d+|keeper)$/.test(kick.taker)) assert.equal(kick.gen, true);
      takenTheirs += 1;
      if (kick.result === 'scored') theirs += 1;
    }
    assert.equal(kick.mine, mine, 'Running own score does not match recorded kicks');
    assert.equal(kick.theirs, theirs, 'Running opponent score does not match recorded kicks');
  }
  assert.ok(over(), 'Recorded shootout did not reach a legal finish');
  assert.deepEqual([detail.mine, detail.theirs], [mine, theirs]);
  assert.equal(mine > theirs, report.shootoutWon);
}

try {
  assert.ok(['baseline', 'fixed'].includes(phase), 'Explicit baseline/fixed phase required');
  assert.ok(path.isAbsolute(candidate), 'Absolute candidate source required');
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-shootout-results-'));
  if (baseline === undefined) {
    baseline = path.join(temporary, 'immutable-b20.ts');
    const bytes = execFileSync('git', ['show', 'b20ec6664df9d4c58d63ea0596791d33b2a3b8fc:src/lib/clubManager.ts'],
      { cwd: ROOT, maxBuffer: 4 * 1024 * 1024, timeout: 15000 });
    fs.writeFileSync(baseline, bytes);
  }
  assert.ok(baseline && path.isAbsolute(baseline), 'Absolute immutable baseline source required');
  if (output === undefined) {
    const artifacts = path.join(ROOT, '.sim-artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    output = fs.mkdtempSync(path.join(artifacts, 'cm-shootout-results-'));
    ownsOutput = true;
  } else {
    assert.ok(output && path.isAbsolute(output), 'Absolute new output directory required');
    assert.ok(!fs.existsSync(output), 'Output directory must be new');
    fs.mkdirSync(output, { recursive: true });
    ownsOutput = true;
  }
  const baselineBytes = fs.readFileSync(baseline);
  const candidateBytes = fs.readFileSync(candidate);
  assert.equal(blob(baselineBytes), originalBlob, 'Baseline is not immutable b20 engine');
  if (phase === 'baseline') assert.equal(blob(candidateBytes), originalBlob, 'Baseline phase contains product changes');
  receipt = { phase, baselineBlob: originalBlob, candidateBlob: blob(candidateBytes),
    baselineSha256: hash(baselineBytes), candidateSha256: hash(candidateBytes), cases: [], failures: [], controls: [] };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => null, setItem: () => { throw new Error('Match proof unexpectedly wrote storage'); }, removeItem: () => {},
  } });
  assert.ok(['', 'keepcurve'].includes(bridgeControl), `Unknown CM_SHOOTOUT_RESULTS_CONTROL ${bridgeControl}`);
  /* Round 1600: the bridge, while this tree's world reads age and b20 cannot (see the header) */
  const bridgeNeeded = worldReadsAge1600(ROOT) && !baselineBytes.includes('cmWorldReadsAge');
  assert.ok(bridgeControl !== 'keepcurve' || bridgeNeeded, 'keepcurve control cannot run: there is no curve 1 bridge to leave out');
  const bridged = bridgeNeeded && bridgeControl !== 'keepcurve';
  receipt.bridge1600 = { needed: bridgeNeeded, used: bridged, served: {} };
  async function engine(source, name) {
    const file = path.join(temporary, `${name}.mjs`);
    const bridge = bridged ? curve1Plugin1600(ROOT) : null;
    await build({ stdin: { contents: `export * from ${JSON.stringify(source)};`, resolveDir: ROOT, loader: 'js' },
      bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'error',
      alias: { '@/lib/clubManager': source, '@': path.join(ROOT, 'src') }, plugins: bridge ? [bridge.plugin] : [] });
    if (bridge) {
      assert.ok(Object.values(bridge.served).every(n => n === 1), `Round 1600 bridge: ${name} did not take each curve 1 file exactly once (${JSON.stringify(bridge.served)})`);
      receipt.bridge1600.served[name] = bridge.served;
    }
    const loaded = await import(pathToFileURL(file).href);
    for (const name of ['startCareer', 'playNextEntry', 'setShootoutOrder', 'runShootout']) assert.equal(typeof loaded[name], 'function', `Missing real engine export ${name}`);
    return loaded;
  }
  const original = await engine(baseline, 'original');
  const current = await engine(candidate, 'candidate');
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/cmShootoutUnset782.json'), 'utf8'));
  assert.equal(fixture.club, 'Real Madrid');
  assert.equal(fixture.baseSeed, 782001);
  assert.equal(fixture.rows.length, 150);
  const oldCup = reachCup(original, fixture);
  const newCup = reachCup(current, fixture);
  assert.deepEqual(newCup, oldCup, 'The actual walk before the first cup changed');
  record('cup-start.json', oldCup);
  const witnesses = { win: null, loss: null, regular: null };
  let explicitWitness;
  let regularWitness;
  function check(mode, seed) {
    let oldState = copy(oldCup.value), newState = copy(newCup.value);
    if (mode === 'empty') { oldState.shootoutOrder = []; newState.shootoutOrder = []; }
    if (mode === 'departed') { oldState.shootoutOrder = ['proof-player-who-left']; newState.shootoutOrder = ['proof-player-who-left']; }
    if (mode === 'explicit') {
      const ids = oldState.squad.slice(0, 11).map(player => player.id);
      oldState = original.setShootoutOrder(oldState, ids);
      newState = current.setShootoutOrder(newState, ids);
      assert.ok(oldState && newState, 'Actual order setter refused its own squad');
    }
    const before = play(original, oldState, seed), actual = play(current, newState, seed);
    if (mode === 'explicit' && actual.value.report.shootout && !explicitWitness) explicitWitness = actual;
    if (before.value.report.decidedBy !== 'pens' && !regularWitness) regularWitness = actual;
    const item = { mode, seed, decidedBy: before.value.report.decidedBy, won: before.value.report.shootoutWon,
      baseline: before, candidate: actual, passed: [] };
    function judge(label, check) {
      try { check(); item.passed.push(label); }
      catch (error) {
        if (!(error instanceof assert.AssertionError)) throw error;
        const failure = { mode, seed, label, message: error.message };
        receipt.failures.push(failure);
        item.failure = failure;
      }
    }
    judge('whole-state', () => assert.deepEqual(actual.value.state, before.value.state));
    judge('global-draw-values-and-count', () => assert.deepEqual(actual.draws, before.draws));
    judge('all-other-report-content', () => preserveReport(actual.value.report, before.value.report));
    if (before.value.report.decidedBy === 'pens') {
      judge(mode === 'explicit' ? 'explicit-kicks' : 'new-detail', () => checkKicks(actual.value.report));
      const which = before.value.report.shootoutWon ? 'win' : 'loss';
      if (mode === 'absent' && witnesses[which] === null) witnesses[which] = seed;
    } else {
      judge('no-details-for-ordinary-match', () => assert.equal(actual.value.report.shootout, undefined));
      if (mode === 'absent' && witnesses.regular === null) witnesses.regular = seed;
    }
    receipt.cases.push({ mode, seed, decidedBy: item.decidedBy, won: item.won, passed: item.passed,
      baselineState: hash(JSON.stringify(before.value.state)), candidateState: hash(JSON.stringify(actual.value.state)),
      globalDraws: before.draws.length });
    record(`${mode}-${seed}.json`, item);
  }
  for (const row of fixture.rows) check('absent', row.seed);
  assert.ok(Object.values(witnesses).every(value => value !== null), 'Current cohort must include both shootout winners and an ordinary match');
  for (const seed of Object.values(witnesses)) for (const mode of ['empty', 'departed', 'explicit']) check(mode, seed);
  assert.ok(explicitWitness && regularWitness, 'Negative controls need actual explicit and ordinary witnesses');
  function control(label, input, mutate, judge) {
    const fault = copy(input);
    mutate(fault);
    assert.notDeepEqual(fault, input, `${label} control changed nothing`);
    assert.throws(() => judge(fault), assert.AssertionError, `${label} control was not rejected`);
    receipt.controls.push({ label, changed: true, rejected: true, original: hash(JSON.stringify(input)), fault: hash(JSON.stringify(fault)) });
  }
  control('whole-state', explicitWitness.value.state, state => { state.boardConfidence += 1; },
    state => assert.deepEqual(state, explicitWitness.value.state));
  control('global-draw-count', explicitWitness.draws, draws => { draws.push(0); },
    draws => assert.deepEqual(draws, explicitWitness.draws));
  control('global-draw-value', explicitWitness.draws, draws => { draws[0] = draws[0] === 0 ? 1 : 0; },
    draws => assert.deepEqual(draws, explicitWitness.draws));
  // Exercise the narrow allowance using a real recorded shootout, even on the
  // unchanged baseline where default-order reports do not yet carry details.
  const reportBeforeDetails = copy(explicitWitness.value.report);
  const count = reportBeforeDetails.shootout;
  delete reportBeforeDetails.shootout;
  const stem = reportBeforeDetails.shootoutWon
    ? '🥅 Nerves of steel. You win the shootout.'
    : '🥅 Heartbreak from the spot: shootout defeat.';
  const detailedEvent = `${stem.slice(0, -1)} ${count.mine}-${count.theirs}.`;
  const eventIndex = reportBeforeDetails.events.indexOf(detailedEvent);
  assert.ok(eventIndex >= 0, 'Actual explicit shootout has no exact count event');
  reportBeforeDetails.events[eventIndex] = stem;
  preserveReport(explicitWitness.value.report, reportBeforeDetails);
  control('report-preservation', explicitWitness.value.report, report => { report.confidenceDelta += 1; },
    report => preserveReport(report, reportBeforeDetails));
  control('penalty-event-allowance', explicitWitness.value.report, report => { report.events[eventIndex] += ' extra'; },
    report => preserveReport(report, reportBeforeDetails));
  control('recorded-running-count', explicitWitness.value.report, report => { report.shootout.kicks[0].mine += 1; }, checkKicks);
  control('recorded-final-count', explicitWitness.value.report, report => { report.shootout.mine += 1; }, checkKicks);
  control('recorded-winner', explicitWitness.value.report, report => { report.shootoutWon = !report.shootoutWon; }, checkKicks);
  control('eligible-taker', explicitWitness.value.report, report => {
    const own = report.shootout.kicks.find(kick => kick.side === 'me');
    assert.ok(own, 'Actual explicit witness has no own kick');
    own.taker = 'Proof taker who did not play';
  }, checkKicks);
  control('ordinary-report', regularWitness.value.report, report => { report.shootout = explicitWitness.value.report.shootout; },
    report => assert.equal(report.shootout, undefined));
  receipt.witnesses = witnesses;
  receipt.preservationPassed = receipt.cases.every(item => ['whole-state', 'global-draw-values-and-count', 'all-other-report-content'].every(label => item.passed.includes(label)));
  receipt.expectedBaselineRed = phase === 'baseline' && receipt.failures.length > 0
    && receipt.failures.every(failure => failure.label === 'new-detail' && failure.message.startsWith('new shootout report has no kick details'))
    && receipt.preservationPassed;
  receipt.status = receipt.failures.length ? 'assertion-failure' : 'passed';
  record('summary.json', receipt);
  if (receipt.bridge1600.used) console.log(`Round 1600 bridge: both engines on the world before the flip (curve 1 files served ${JSON.stringify(receipt.bridge1600.served)}).`);
  console.log(`Shootout results: ${receipt.cases.length} actual matches compared; ${receipt.failures.length} assertions failed; preservation ${receipt.preservationPassed ? 'passed' : 'FAILED'}.`);
  console.log(`Current witnesses: shootout win ${witnesses.win}, shootout loss ${witnesses.loss}, ordinary match ${witnesses.regular}.`);
  const passed = label => receipt.cases.filter(item => item.passed.includes(label)).length;
  console.log(`Preservation: whole state ${passed('whole-state')}/${receipt.cases.length}, global draw values/count ${passed('global-draw-values-and-count')}/${receipt.cases.length}, other report content ${passed('all-other-report-content')}/${receipt.cases.length}.`);
  console.log(`Negative controls: ${receipt.controls.filter(control => control.changed && control.rejected).length}/${receipt.controls.length} changed inputs rejected. Evidence: ${output}`);
  for (const failure of receipt.failures.slice(0, 5)) console.error(`${failure.mode}/${failure.seed} ${failure.label}: ${failure.message.split('\n')[0]}`);
  if (phase === 'baseline') console.log(`Cause-qualified baseline red: ${receipt.expectedBaselineRed ? 'YES' : 'NO'}.`);
  else console.log(receipt.failures.length ? 'SHOOTOUT RESULTS CHECKS FAILED' : 'ALL SHOOTOUT RESULTS CHECKS PASSED');
  process.exitCode = receipt.failures.length ? 1 : 0;
} catch (error) {
  const failure = { status: 'infrastructure-error', message: error.stack ?? String(error) };
  if (ownsOutput) record('error.json', failure);
  console.error(`Shootout results infrastructure error: ${failure.message}`);
  process.exitCode = 2;
} finally {
  Math.random = realRandom;
  Date.now = realNow;
  if (storageBefore) Object.defineProperty(globalThis, 'localStorage', storageBefore);
  else delete globalThis.localStorage;
  if (temporary && path.dirname(temporary) === path.resolve(os.tmpdir()) && path.basename(temporary).startsWith('cm-shootout-results-')) {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
