/* Real Club Manager coaching outcomes. Each copied fault must fail only its
   named assertion while a separate untouched unmanaged match stays green. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url), engine = 'src/lib/clubManager.ts';
const clone = value => JSON.parse(JSON.stringify(value));
export function withQuickSubsSeed(seed, fn) {
  const previous = Math.random;
  const previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
function freshCareer(cm) {
  const pre = withQuickSubsSeed(4107, () => cm.startCareer('Everton'));
  pre.squad = pre.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
  return pre;
}
// Native QA imports only this helper and seeds the real UI before clicking Quick sim.
export function findQuickSubsFixture(cm, kind = 'injury') {
  const pre = freshCareer(cm);
  if (kind === 'fatigue') for (const [i, id] of pre.xiIds.filter(Boolean).slice(1, 3).entries()) {
    pre.squad.find(p => p.id === id).fitness = 40 + i * 10;
  }
  for (let seed = 1000; seed < 1256; seed++) {
    const stop = withQuickSubsSeed(seed, () => cm.playNextEntry(pre));
    if (stop.kind !== 'halftime') continue;
    const injury = (stop.state.live.h1Injuries ?? []).find(line => line.id && line.minute < 40
      && cm.benchFor(stop.state, line.id).length > 0);
    if (kind === 'fatigue' || injury) return { pre, seed, paused: stop.state, injury: injury ?? null };
  }
  throw new Error('The bounded actual engine fixture search found no early injury with a legal bench');
}
const cases = {
  early: 'replaces an early injury at its actual minute with real remaining playing minutes and no later participation',
  late: 'replaces a drawn late injury without changing already played events',
  extra: 'replaces an extra-time injury through the same legal match change',
  clock: 'uses the injury stoppage minute and respects an already saved forward clock',
  legal: 'uses only eligible unused bench players and never replaces a red card or permits a fourth sub',
  fatigue: 'puts injuries first and sends fitter legs on at the restart while reserving an injury change',
  paths: 'coaches a paused quick or calendar finish and settles its existing fixture once',
  manual: 'matches the whole result of equivalent legal manual coaching on the same random stream',
  immutable: 'keeps its input save unchanged and does not settle or credit appearances during coaching',
  baseline: 'holds an independent actual unmanaged live match and its player credits unchanged',
};
const controls = {
  early: { from: '.sort(clockOrder).find(line => line.id && line.minute <= to && live.onPitch.includes(line.id) && !handled.has(line.id));', to: '.sort(clockOrder).find(line => false);', test: 'early' },
  late: { from: '  injuriesThrough(90);', to: '  injuriesThrough(45);', test: 'late' },
  extra: { from: '  if (state.live!.et) injuriesThrough(state.live!.et.to);', to: '  if (false) injuriesThrough(state.live!.et.to);', test: 'extra' },
  clock: { from: "state = changeLive(state, minute, { kind: 'sub', outId: injury.id, inId: coming.id }, plus) ?? state;", to: "state = changeLive(state, minute, { kind: 'sub', outId: injury.id, inId: coming.id }) ?? state;", test: 'clock' },
  loan: { from: 'const coming = benchFor(state, injury.id)[0];', to: 'const coming = benchFor(state, injury.id).find(p => !p.onLoan);', test: 'legal' },
  fourth: { from: '    if (live.subsUsed >= MAX_HALFTIME_SUBS) return null;', to: '    if (live.subsUsed > MAX_HALFTIME_SUBS) return null;', test: 'legal' },
  red: { from: '    if (reds.length) return null;', to: '    if (false) return null;', test: 'legal' },
  unavailable: { from: '    if (!coming || !isAvailable(coming)) return null;', to: '    if (!coming) return null;', test: 'legal' },
  fresh: { from: 'for (const out of tiringAtHalftime(state)) {', to: 'for (const out of [] as CMPlayer[]) {', test: 'fatigue' },
  reserve: { from: 'if (state.live!.subsUsed >= MAX_SUBS - 1) break;', to: 'if (state.live!.subsUsed >= MAX_SUBS) break;', test: 'fatigue' },
  paused: { from: "      return resumeMatch(coachQuickMatch(state));", to: '      return resumeMatch(state);', test: 'paths' },
  entry: { from: '    state.live = live;\n    return resumeMatch(coachQuickMatch(state));', to: '    state.live = live;\n    return resumeMatch(state);', test: 'manual' },
  immutable: { from: '  let state: CareerState = JSON.parse(JSON.stringify(career));\n  const entry = state.calendar[state.live!.week];', to: '  let state: CareerState = career;\n  const entry = state.calendar[state.live!.week];', test: 'immutable' },
};

function forced(cm, phase, minute, clock = phase === 'early' ? 8 : 46) {
  const pre = freshCareer(cm);
  if (phase === 'extra') {
    pre.calendar[pre.week] = { type: 'uclKo', round: 0, uclRound: 'F' };
    pre.uclKoRound = 'F'; pre.uclDraw.F = 'Manchester City';
    pre.uclBracket = [{ round: 'F', slot: 0, home: pre.clubName, away: 'Manchester City', homeGoals: null, awayGoals: null, winner: null, mine: true }];
  }
  const stop = withQuickSubsSeed(2001, () => cm.playNextEntry(pre));
  assert.equal(stop.kind, 'halftime');
  let state = clone(stop.state);
  state.live.h1Injuries = []; state.live.h1Cards = [];
  if (phase === 'extra') {
    let drawn;
    for (let seed = 2002; seed < 2258; seed++) {
      const candidate = withQuickSubsSeed(seed, () => cm.startSecondHalf(state));
      if (cm.isExtraTimeDue(candidate)) { drawn = candidate; break; }
    }
    assert.ok(drawn, 'A bounded real regulation draw earns extra time');
    state = withQuickSubsSeed(2259, () => cm.startExtraTime(drawn));
    assert.ok(state?.live.et, 'The actual engine draws the extra-time period');
  } else if (phase !== 'early') state = withQuickSubsSeed(2002, () => cm.startSecondHalf(state));
  state.live.h2Injuries = []; state.live.h2Cards = [];
  state.live.minute = clock;
  const out = state.squad.find(p => p.id === state.live.onPitch[1]);
  const incoming = cm.benchFor(state, out.id)[0];
  assert.ok(incoming, 'A real legal bench player exists');
  const on = new Set(state.live.onPitch);
  for (const p of state.squad) if (!on.has(p.id) && p.id !== incoming.id) p.injuryWeeks = 1;
  const key = phase === 'early' ? 'h1Injuries' : 'h2Injuries';
  state.live[key] = [{ id: out.id, name: out.name, minute, weeks: 2 }];
  const playKey = phase === 'early' ? 'h1Play' : 'h2Play';
  const future = Math.min(phase === 'extra' ? 119 : phase === 'early' ? 44 : 89, minute + 8);
  state.live[playKey].push({ side: 'me', kind: 'corner', minute: future, who: out.name });
  state.live[playKey].sort((a, b) => a.minute - b.minute || (a.plus ?? 0) - (b.plus ?? 0));
  return { state, out, incoming };
}
const lists = ['h1My', 'h1Opp', 'h1Play', 'h1Cards', 'h1OppCards', 'h1Injuries', 'h2My', 'h2Opp', 'h2Play', 'h2Cards', 'h2OppCards', 'h2Injuries'];
const prefix = (live, minute, plus = Infinity) => Object.fromEntries(lists.map(key => [key,
  (live[key] ?? []).filter(line => line.minute < minute || (line.minute === minute && (line.plus ?? 0) <= plus))]));
function verifyReplacement(cm, fixture, result, minute) {
  const sub = result.live.subs.find(s => s.offId === fixture.out.id);
  assert.ok(sub, 'The injured starter is actually replaced');
  assert.equal(sub.minute, minute); assert.equal(sub.onId, fixture.incoming.id);
  assert.ok(cm.myOnPitchAt(result.live, minute + 1).includes(fixture.incoming.id));
  assert.ok(!cm.myOnPitchAt(result.live, minute + 1).includes(fixture.out.id));
  for (const key of ['h1Play', 'h2Play']) assert.ok(!(result.live[key] ?? []).some(e => e.side === 'me' && e.who === fixture.out.name && e.minute > minute), 'No play after the actual exit');
  for (const key of ['h1My', 'h2My']) assert.ok(!(result.live[key] ?? []).some(e => e.id === fixture.out.id && e.minute > minute), 'No scoring after the actual exit');
  return sub;
}
function manuallyReplay(cm, input, plan) {
  let state = clone(input);
  const sub = line => {
    state = cm.changeLive(state, line.minute, { kind: 'sub', outId: line.offId, inId: line.onId }, line.plus);
    assert.ok(state, 'The equivalent manual substitution is legal');
  };
  for (const line of plan.filter(s => s.minute <= 45)) sub(line);
  if (!state.live.h2Drawn) {
    for (const line of plan.filter(s => s.minute === 46)) sub(line);
    state = cm.startSecondHalf(state); assert.ok(state);
  } else for (const line of plan.filter(s => s.minute === 46)) sub(line);
  for (const line of plan.filter(s => s.minute > 46 && s.minute <= 90)) sub(line);
  if (cm.isExtraTimeDue(state)) { state = cm.startExtraTime(state); assert.ok(state); }
  for (const line of plan.filter(s => s.minute > 90)) sub(line);
  return cm.resumeMatch(state);
}

async function main() {
  const control = process.env.CM_QUICK_SUBS_CONTROL || '';
  assert.ok(!control || control === 'all' || Object.hasOwn(controls, control), 'Known Quick substitution control');
  const evidence = path.resolve(process.env.CM_QUICK_SUBS_ARTIFACTS || path.join(root, 'cm-quick-subs-artifacts/outcomes'));
  await mkdir(evidence, { recursive: true });
  if (control === 'all') {
    const summary = [];
    for (const name of ['', ...Object.keys(controls)]) {
      const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CM_QUICK_SUBS_CONTROL: name, CM_QUICK_SUBS_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
      const output = `${run.stdout || ''}\n${run.stderr || ''}`;
      await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
      summary.push({ control: name || 'normal', passed: run.status === 0 && !run.error && !run.signal, exit: run.status });
      console.log(`${summary.at(-1).passed ? 'PASS' : 'FAIL'} Quick substitutions ${name || 'normal'}`);
      process.stdout.write(summary.at(-1).passed ? output.split('\n').filter(line => line.startsWith('simCmQuickSubs')).join('\n') + '\n' : output.slice(-12000));
    }
    await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
    assert.ok(summary.every(row => row.passed), 'Every normal and effective control must execute');
    console.log(`simCmQuickSubs: ${Object.keys(cases).length} actual outcomes and ${Object.keys(controls).length} effective controls passed.`); return;
  }
  const verifyBytes = [];
  let originalHash;
  for (const relative of [engine]) {
    const file = path.join(root, relative);
    const bytes = await readFile(file);
    originalHash = createHash('sha256').update(bytes).digest('hex');
    verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, 'Original engine source bytes held')));
  }
  const source = (await readFile(path.join(root, engine), 'utf8')).replaceAll('\r\n', '\n');
  const controlRoot = path.join(root, '.sim-control'); await mkdir(controlRoot, { recursive: true });
  const folder = await mkdtemp(path.join(controlRoot, 'cm-quick-subs-'));
  const unhandled = [];
  const captureUnhandled = error => unhandled.push({ name: error?.name, message: String(error?.message ?? error) });
  process.on('unhandledRejection', captureUnhandled);
  process.on('uncaughtException', captureUnhandled);
  try {
    async function bundle(text, name) {
      const target = path.join(folder, `${name}.ts`), output = path.join(folder, `${name}.cjs`);
      await writeFile(target, text);
      await build({ entryPoints: [target], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', alias: { '@/lib/clubManager': target, '@': path.join(root, 'src') } });
      return createRequire(import.meta.url)(output);
    }
    let changed = source;
    if (control) {
      const spec = controls[control];
      assert.equal(source.split(spec.from).length - 1, 1, 'One exact executable control anchor');
      changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, 'The source control changes executable code');
      await writeFile(path.join(evidence, `${control}-changed-source.txt`), changed);
      await writeFile(path.join(evidence, `${control}-mutation.json`), JSON.stringify({ file: engine, anchor: spec.from, replacement: spec.to, test: cases[spec.test], original: originalHash, changed: createHash('sha256').update(changed).digest('hex') }, null, 2));
    }
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
    const original = await bundle(source, 'original');
    const cm = control ? await bundle(changed, 'candidate') : original;
    const outcomes = {
      early() {
        const f = forced(original, 'early', 17), was = prefix(f.state.live, 17);
        const after = withQuickSubsSeed(3101, () => cm.coachQuickMatch(f.state));
        verifyReplacement(cm, f, after, 17); assert.deepEqual(prefix(after.live, 17), was);
        assert.equal(Array.from({ length: 45 }, (_, i) => cm.myOnPitchAt(after.live, i + 1).includes(f.out.id)).filter(Boolean).length, 17);
        assert.equal(Array.from({ length: 45 }, (_, i) => cm.myOnPitchAt(after.live, i + 1).includes(f.incoming.id)).filter(Boolean).length, 28);
      },
      late() {
        const f = forced(original, 'late', 76), was = prefix(f.state.live, 76);
        const after = withQuickSubsSeed(3102, () => cm.coachQuickMatch(f.state));
        verifyReplacement(cm, f, after, 76); assert.deepEqual(prefix(after.live, 76), was);
      },
      extra() {
        const f = forced(original, 'extra', 104, 100), was = prefix(f.state.live, 104);
        const after = withQuickSubsSeed(3103, () => cm.coachQuickMatch(f.state));
        verifyReplacement(cm, f, after, 104); assert.deepEqual(prefix(after.live, 104), was);
        assert.equal(after.live.et.to, 120);
      },
      clock() {
        const f = forced(original, 'late', 90, 46);
        f.state.live.added.h2 = 4; f.state.live.h2Injuries[0].plus = 2;
        const before = prefix(f.state.live, 90, 2);
        const after = withQuickSubsSeed(3104, () => cm.coachQuickMatch(f.state));
        const sub = after.live.subs.find(s => s.offId === f.out.id);
        assert.ok(sub); assert.equal(sub.minute, 90); assert.equal(sub.plus, 2);
        assert.deepEqual(prefix(after.live, 90, 2), before);
        f.state.live.minute = 90;
        const savedBoard = prefix(f.state.live, 90, 4);
        const saved = withQuickSubsSeed(3104, () => cm.coachQuickMatch(f.state));
        assert.equal(saved.live.subs.find(s => s.offId === f.out.id).plus, 4);
        assert.deepEqual(prefix(saved.live, 90, 4), savedBoard);
        const paused = forced(original, 'late', 62, 74);
        assert.equal(withQuickSubsSeed(3105, () => cm.coachQuickMatch(paused.state)).live.subs[0].minute, 74);
      },
      legal() {
        const f = forced(original, 'early', 17);
        const on = new Set(f.state.live.onPitch);
        const loan = f.state.squad.find(p => !on.has(p.id) && p.id !== f.incoming.id);
        loan.injuryWeeks = 0; loan.onLoan = true; loan.fitness = 100; loan.rating = 99;
        loan.position = f.incoming.position; loan.positions = f.incoming.positions;
        f.incoming = f.state.squad.find(p => p.id === f.incoming.id); f.incoming.fitness = 95;
        f.incoming = loan;
        const after = withQuickSubsSeed(3106, () => cm.coachQuickMatch(f.state));
        verifyReplacement(cm, f, after, 17);
        const capped = clone(f.state); capped.live.subsUsed = 3;
        assert.equal(cm.changeLive(capped, 18, { kind: 'sub', outId: f.out.id, inId: f.incoming.id }), null);
        const red = clone(f.state); red.live.h1Cards = [{ id: f.out.id, name: f.out.name, minute: 10, kind: 'red' }];
        assert.equal(cm.changeLive(red, 17, { kind: 'sub', outId: f.out.id, inId: f.incoming.id }), null);
        assert.ok(!withQuickSubsSeed(3107, () => cm.coachQuickMatch(red)).live.subs.some(s => s.offId === f.out.id));
        assert.equal(cm.changeLive(f.state, 17, { kind: 'sub', outId: f.out.id, inId: f.state.live.onPitch[2] }), null);
        const unavailable = clone(f.state); unavailable.squad.find(p => p.id === loan.id).injuryWeeks = 2;
        assert.equal(cm.changeLive(unavailable, 17, { kind: 'sub', outId: f.out.id, inId: loan.id }), null);
      },
      fatigue() {
        const f = forced(original, 'early', 45), on = new Set(f.state.live.onPitch);
        f.state.live.added.h1 = 0;
        for (const p of f.state.squad) if (!on.has(p.id)) p.injuryWeeks = 0;
        for (const id of f.state.live.onPitch.slice(2, 5)) f.state.squad.find(p => p.id === id).fitness = 40;
        const after = withQuickSubsSeed(3108, () => cm.coachQuickMatch(f.state));
        assert.equal(after.live.subs[0].offId, f.out.id); assert.equal(after.live.subs[0].minute, 45);
        const restart = after.live.subs.filter(s => s.minute === 46);
        assert.equal(restart.length, 1, 'Only one normal change follows the forced injury, keeping the third slot');
        for (const s of restart) assert.ok(f.state.squad.find(p => p.id === s.onId).fitness > f.state.squad.find(p => p.id === s.offId).fitness);
        assert.ok(after.live.subsUsed <= 3);
      },
      paths() {
        const f = forced(original, 'early', 17), was = JSON.stringify(f.state);
        const quick = withQuickSubsSeed(3109, () => cm.playNextEntry(f.state, { skipHalftime: true }));
        const calendar = withQuickSubsSeed(3109, () => cm.playNextEntry(f.state, { skipHalftime: true, untilWeek: f.state.week + 1 }));
        assert.equal(quick.kind, 'match'); assert.deepEqual(calendar, quick);
        assert.ok(quick.report.detail.subs.some(s => s.off === f.out.name && s.on === f.incoming.name && s.minute === 17));
        assert.equal(quick.state.week, f.state.week + 1); assert.equal(quick.state.live, null); assert.equal(JSON.stringify(f.state), was);
        assert.equal(quick.state.resultLog.length, f.state.resultLog.length + 1);
        assert.equal(withQuickSubsSeed(3110, () => cm.playNextEntry(quick.state, { untilWeek: quick.state.week })).kind, 'reached');
      },
      manual() {
        const fixture = findQuickSubsFixture(original);
        const plan = withQuickSubsSeed(fixture.seed, () => {
          const stop = original.playNextEntry(fixture.pre);
          return original.coachQuickMatch(stop.state).live.subs;
        });
        assert.ok(plan.length > 0, 'The actual engine supplied coaching to replay');
        const manual = withQuickSubsSeed(fixture.seed, () => {
          const stop = original.playNextEntry(fixture.pre);
          return manuallyReplay(original, stop.state, plan);
        });
        const quick = withQuickSubsSeed(fixture.seed, () => cm.playNextEntry(fixture.pre, { skipHalftime: true }));
        assert.deepEqual(quick, manual, 'All report fields, credits, finances, calendar and events match actual manual changes');
      },
      immutable() {
        const f = forced(original, 'early', 17), before = clone(f.state);
        const after = withQuickSubsSeed(3111, () => cm.coachQuickMatch(f.state));
        assert.deepEqual(f.state, before); assert.equal(after.week, before.week); assert.ok(after.live);
        assert.equal(after.budget, before.budget); assert.deepEqual(after.resultLog, before.resultLog);
        assert.deepEqual(after.squad.map(p => [p.id, p.apps, p.goals, p.assists, p.ratingSum]), before.squad.map(p => [p.id, p.apps, p.goals, p.assists, p.ratingSum]));
      },
      baseline() {
        const pre = freshCareer(original), stop = withQuickSubsSeed(3112, () => original.playNextEntry(pre));
        const a = withQuickSubsSeed(3113, () => original.resumeMatch(stop.state));
        const b = withQuickSubsSeed(3113, () => original.resumeMatch(original.startSecondHalf(stop.state)));
        assert.equal(a.kind, 'match'); assert.deepEqual(a, b); assert.equal(a.report.detail.subs.length, 0);
        assert.equal(a.state.week, stop.state.week + 1); assert.ok(a.report.detail.play.length > 0);
        for (const id of stop.state.live.startXi) assert.equal(a.state.squad.find(p => p.id === id).apps, (stop.state.squad.find(p => p.id === id).apps ?? 0) + 1);
      },
    };
    const rows = [];
    for (const [name, title] of Object.entries(cases)) {
      if (control && name !== controls[control].test && name !== 'baseline') { rows.push({ title, status: 'skipped' }); continue; }
      try { outcomes[name](); rows.push({ title, status: 'passed' }); }
      catch (error) { rows.push({ title, status: 'failed', errorName: error.name, message: error.message, stack: error.stack }); }
    }
    await new Promise(resolve => setImmediate(resolve));
    await writeFile(path.join(evidence, `${control || 'normal'}-report.json`), JSON.stringify({ originalHash, numUnhandledErrors: unhandled.length, unhandled, cases: rows }, null, 2));
    assert.deepEqual(unhandled, [], 'No unhandled runtime errors receive control credit');
    if (control) {
      assert.deepEqual(rows.filter(r => r.status === 'failed').map(r => [r.title, r.errorName]), [[cases[controls[control].test], 'AssertionError']]);
      assert.deepEqual(rows.filter(r => r.status === 'passed').map(r => r.title), [cases.baseline]);
      assert.equal(rows.filter(r => r.status === 'skipped').length, Object.keys(cases).length - 2);
    } else {
      assert.deepEqual(rows.filter(r => r.status === 'failed'), []);
      assert.equal(rows.filter(r => r.status === 'passed').length, Object.keys(cases).length);
      await writeFile(path.join(evidence, 'native-fixtures.json'), JSON.stringify({ injury: findQuickSubsFixture(original), fatigue: findQuickSubsFixture(original, 'fatigue') }));
    }
    console.log(`simCmQuickSubs ${control || 'normal'}: real coaching outcomes and independent unmanaged baseline passed.`);
  } finally {
    process.off('unhandledRejection', captureUnhandled); process.off('uncaughtException', captureUnhandled);
    assert.equal(path.dirname(folder), controlRoot); assert.ok(path.basename(folder).startsWith('cm-quick-subs-'));
    await rm(folder, { recursive: true, force: true }); for (const verify of verifyBytes) await verify();
  }
}
if (process.env.CM_QUICK_SUBS_FIXTURE_ONLY !== '1') await main();
