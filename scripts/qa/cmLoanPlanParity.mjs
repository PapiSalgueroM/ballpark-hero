/* Remote-only paired full-state and global-draw observations for Loan plan. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

assert(process.env.CI, 'Run the Loan plan proof only in remote CI');
const ROOT = process.cwd(), OUT = path.resolve(process.env.CM_LOAN_PLAN_OUT || '');
assert(process.env.CM_LOAN_PLAN_OUT, 'Set an outside observation directory');
fs.mkdirSync(OUT, { recursive: true });
const phase = process.env.CM_LOAN_PLAN_PHASE;
const clone = value => JSON.parse(JSON.stringify(value));
const sha = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
function projected(career) {
  const copy = clone(career);
  delete copy.loanPlanHistory;
  for (const loan of copy.loanedOut ?? []) delete loan.development;
  return copy;
}
function compare(baseline, fixed) {
  assert.deepEqual(fixed.moduleInitDraws, baseline.moduleInitDraws);
  assert.equal(fixed.cases.length, 12);
  assert.equal(baseline.cases.length, 12);
  let annual = 0;
  for (let index = 0; index < baseline.cases.length; index++) {
    const a = baseline.cases[index], b = fixed.cases[index];
    assert.equal(a.id, b.id); assert.equal(a.status, b.status);
    assert.deepEqual(a.frames.map(f => f.label), b.frames.map(f => f.label));
    for (let n = 0; n < a.frames.length; n++) {
      const old = a.frames[n], now = b.frames[n];
      assert.deepEqual(now.draws, old.draws, a.id + ':' + old.label + ': every global draw');
      assert.deepEqual(b.mode === 'default' ? now.career : projected(now.career), old.career,
        a.id + ':' + old.label + ': every other career field');
      if (old.label === 'loan' && b.mode !== 'default') {
        assert.equal(now.career.loanedOut?.length, 1);
        assert.equal(now.career.loanedOut[0].development?.version, 1, 'Actual opt-in record is present');
      }
      if (b.mode === 'recall' && old.label === 'recalled') assert.equal(now.career.loanPlanHistory?.length, 1);
      if (old.label === 'rollover') { assert.equal(now.career.loanPlanHistory?.length, 1); annual++; }
    }
  }
  assert(annual > 0, 'At least one actual completed annual loan is required');
  return annual;
}
if (phase === 'compare') {
  const baseline = JSON.parse(fs.readFileSync(process.env.CM_LOAN_PLAN_BASELINE, 'utf8'));
  const fixed = JSON.parse(fs.readFileSync(process.env.CM_LOAN_PLAN_FIXED, 'utf8'));
  const annual = compare(baseline, fixed), controls = [];
  for (const kind of ['budget', 'draw', 'record', 'history']) {
    const copy = clone(fixed), row = copy.cases.find(c => c.mode === (kind === 'history' ? 'recall' : 'annual'));
    const frame = row.frames.find(f => f.label === (kind === 'history' ? 'recalled' : 'loan'));
    const before = sha(copy);
    if (kind === 'budget') frame.career.budget += 1;
    if (kind === 'draw') frame.draws.push(0.25);
    if (kind === 'record') delete frame.career.loanedOut[0].development;
    if (kind === 'history') frame.career.loanPlanHistory = [];
    assert.notEqual(sha(copy), before, 'Copied control actually changes evidence');
    assert.throws(() => compare(baseline, copy), undefined, kind + ' control is detected');
    controls.push({ kind, before, changed: sha(copy), originalHeld: sha(fixed) });
  }
  fs.writeFileSync(path.join(OUT, 'comparison.json'), JSON.stringify({
    status: 'PASS', cases: fixed.cases.length, actualAnnualClosures: annual,
    baseline: sha(baseline), fixed: sha(fixed), controls,
    exception: 'Only opt-in loan.development and top-level loanPlanHistory; default cases have no exceptions',
  }, null, 2));
  console.log('Loan plan paired proof: 12 full-state/all-draw cases, ' + annual + ' actual annual closures, 4 changed copied controls.');
  process.exit(0);
}
assert(['baseline', 'fixed'].includes(phase), 'Choose baseline, fixed or compare');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-loan-plan-'));
const entry = path.join(tmp, 'entry.ts'), bundle = path.join(OUT, phase + '.cjs');
fs.writeFileSync(entry, "export * as cm from " + JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts')) + ";\n"
  + (phase === 'fixed' ? "export * as plan from " + JSON.stringify(path.join(ROOT, 'src/lib/clubManagerLoanPlan.ts')) + ";\n" : ''));
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs',
  alias: { '@': path.join(ROOT, 'src') }, jsx: 'automatic', outfile: bundle, logLevel: 'error' });
const sourceFiles = ['src/lib/clubManager.ts', 'src/hooks/useClubManager.ts', 'src/components/club-manager/TransferScreen.tsx',
  'src/lib/clubManagerLoanPlan.ts', 'src/lib/clubManagerLoanDevelopment.ts'];
const held = () => Object.fromEntries(sourceFiles.filter(f => fs.existsSync(path.join(ROOT, f)))
  .map(f => [f, sha(fs.readFileSync(path.join(ROOT, f)).toString('utf8'))]));
const sourceBefore = held(), normalRandom = Math.random, normalNow = Date.now;
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key), clear: () => storage.clear() };
let draws = [], seed = 17;
Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const value = seed / 4294967296; draws.push(value); return value; };
Date.now = () => 1791360000000;
const result = { phase, moduleInitDraws: [], sourceBefore, cases: [] };
try {
  const { cm, plan } = createRequire(import.meta.url)(bundle);
  result.moduleInitDraws = draws.slice();
  for (const club of ['Everton', 'Ajax']) for (const initial of [17, 311]) for (const mode of ['default', 'recall', 'annual']) {
    seed = initial; draws = [];
    let career = cm.startCareer(club);
    const row = { id: club + ':' + initial + ':' + mode, mode, frames: [], status: 'STARTED' };
    result.cases.push(row);
    const frame = label => row.frames.push({ label, career: clone(career), draws: draws.slice() });
    frame('start');
    const player = career.squad.find(p => p.position !== 'GK' && cm.loanOutRefusal(career, p.id) === null);
    assert(player, 'An actual legally loanable player is required');
    const hosts = cm.REAL_LEAGUES.flatMap(l => cm.playableClubs(l.id).slice(0, 8).map(c => c.name))
      .filter(name => name !== club && !cm.isPartialClub(name, career.eraId));
    const host = hosts.find(name => cm.oppRosterFor(career, name).length > 0);
    assert(host, 'An actual era-valid covered host is required');
    if (phase === 'fixed' && mode !== 'default') {
      const quote = plan.loanPlanPreview(career, player.id, host, 'standard');
      assert(quote, 'Actual standard terms can be previewed');
      career = plan.agreeLoanPlan(career, quote);
    } else career = cm.loanOutPlayer(career, player.id, host, cm.loanOutFee(player));
    assert(career); frame('loan');
    if (mode === 'recall') {
      career = phase === 'fixed'
        ? plan.recallPlannedLoanee(career, player.id, career.loanedOut[0].development.id)
        : cm.recallLoanedPlayer(career, player.id);
      assert(career); frame('recalled');
      const back = career.squad[career.squad.length - 1];
      assert.equal(cm.loanOutPlayer(career, back.id, host), null, 'Second loan in the same season remains refused');
      row.status = 'RECALLED';
    } else {
      let steps = 0;
      while (career.week < career.calendar.length && !career.sacked && !career.retired && steps++ < 180) {
        const next = cm.playNextEntry(career, { skipHalftime: true }); career = next.state;
        if (next.kind === 'seasonOver') break;
      }
      frame('season-end');
      if (mode === 'annual' && career.week >= career.calendar.length && !career.sacked && !career.retired) {
        career = cm.startNextSeason(career); frame('rollover'); row.status = 'ROLLED';
      } else row.status = career.week >= career.calendar.length ? 'COMPLETED' : 'NOT_REACHED';
    }
  }
} finally {
  Math.random = normalRandom; Date.now = normalNow;
  result.sourceAfter = held(); result.sourceHeld = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  fs.writeFileSync(path.join(OUT, phase + '.json'), JSON.stringify(result, null, 2));
  fs.rmSync(tmp, { recursive: true, force: true });
}
assert(result.sourceHeld, 'The paired observation never changes application source');
console.log('Loan plan ' + phase + ': ' + result.cases.length + ' actual cases retained; source held. Annual early endpoints remain NOT_REACHED.');
