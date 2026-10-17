// Remote-only actual NFL page outcomes with original and independently removed retry behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '8293c758f4284d21baaa2320383cfd5cb5bd4944';
const PAGE = 'src/pages/PerfectSeasonNfl.tsx', TEST = 'src/test/perfectSeasonNflRetry.test.tsx';
const SELF = 'scripts/qa/nflPerfectSeasonRetryProof.mjs', WF = '.github/workflows/nfl-perfect-season-retry.yml';
const mode = process.argv[2], OUT = path.resolve(process.env.NFL_RETRY_PROOF_OUT || '');
assert(['baseline', 'fixed'].includes(mode));
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.NFL_RETRY_PROOF_OUT && !fs.existsSync(OUT), 'Use a fresh explicit proof directory');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Inherit the actual offline preload');
fs.mkdirSync(OUT, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
const put = (name, value) => { const b = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
  const file = path.join(OUT, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, b, { flag: 'wx' }); return { path: name, bytes: b.length, sha256: hash(b) }; };
const git = args => { const r = spawnSync('git', args, { cwd: ROOT, maxBuffer: 300000000 }); assert.equal(r.status, 0, r.stderr?.toString()); return r.stdout; };
const read = file => fs.readFileSync(path.join(ROOT, file));
const titles = [
  'retries the initial archive in the chosen mode and refuses a stale prior-mode wheel',
  'keeps an earlier pick through a failed next spin and finishes one complete 17-game season',
  'does not spend rerolls on repeated unusable or failed fetches and charges one usable recovery',
  'allows exactly two successful rerolls and refuses a third squad request',
  'keeps an ordinary healthy draft and restart unchanged with one completion per run',
];
const guards = ['NFL_RETRY_GUARD_initial_mode_retry', 'NFL_RETRY_GUARD_prior_pick_recovery', 'NFL_RETRY_GUARD_repeat_failure_requests'];
const report = { status: 'running', mode, base: BASE, expectedTitles: titles, scope: 'Five actual page outcomes, fictional fetch IO only, unchanged NFL eligibility and actual season simulation. jsdom does not prove a browser reload.', arms: [], controls: [], errors: [] };
const pageFolder = path.join(ROOT, 'src/pages/.nfl-retry-proof-1408'), testFolder = path.join(ROOT, 'src/test/.nfl-retry-proof-1408');
let owned = false, declared;
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const inventory = label => { const rows = declared.map(row => ({ file: row.file, bytes: read(row.file).length, sha256: hash(read(row.file)) }));
  put(`source-${label}.json`, rows); assert.deepEqual(rows, declared, 'Every committed body remains independently bound to HEAD'); return rows; };
const replace = (source, from, to) => { assert.equal(source.split(from).length - 1, 1, 'Unique real source operand');
  const changed = source.replace(from, to); assert.notEqual(changed, source); assert.equal(changed.split(to).length - 1, 1); assert.equal(changed.replace(to, from), source); return changed; };
const productEdits = [
  { from: '  const dailySaved = useRef(false);\n', to: '  const dailySaved = useRef(false);\n  const retryReroll = useRef(false);\n' },
  { from: "    setPhase('boot');\n  };\n\n  useEffect", to: "    setIndex([]);\n    setPhase('boot');\n  };\n\n  useEffect" },
  { from: '      setRerolls(r => r - 1);\n    }\n    const spinStart', to: '    }\n    retryReroll.current = isReroll;\n    const spinStart' },
  { from: "      return;\n    }\n    setWheelText(`${found.squad.year}", to: "      return;\n    }\n    if (isReroll) setRerolls(r => r - 1);\n    setWheelText(`${found.squad.year}" },
  { from: 'onClick={() => window.location.reload()}', to: "onClick={() => index.length > 0 ? void spin(retryReroll.current) : setPhase('boot')}" },
];
const apply = (source, edits) => edits.reduce((body, e) => replace(body, e.from, e.to), source);
const undo = (source, edits) => [...edits].reverse().reduce((body, e) => replace(body, e.to, e.from), source);
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']).toString(), '', 'Clean committed source');
  assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), process.env.GITHUB_SHA);
  const allowed = [TEST, SELF, WF, 'scripts/qa/nflPerfectSeasonRetryBrowser.mjs', ...(mode === 'fixed' ? [PAGE] : [])];
  const changed = git(['diff', '--name-only', '-z', BASE, 'HEAD']).toString().split('\0').filter(Boolean);
  assert(changed.every(file => file.startsWith('docs/') || allowed.includes(file)), 'Only the declared packet paths may change');
  put('source-scope.json', { base: BASE, allowed, changed });
  const files = git(['ls-files', '-z']).toString().split('\0').filter(Boolean);
  declared = files.map(file => { const b = git(['show', `HEAD:${file}`]); return { file, bytes: b.length, sha256: hash(b) }; });
  report.sourceBefore = inventory('before');
  const original = git(['show', `${BASE}:${PAGE}`]).toString('utf8'), current = read(PAGE).toString('utf8'), frozenTest = read(TEST).toString('utf8');
  assert.equal(hash(original), 'bdf7e36d1cad5a9c6d51d5e3678f1bd61a9acc223519d92f8429af24ff2c48fd');
  assert.equal(hash(frozenTest), '1b64de94de167de615553973340255e4da31b616a93d427808bb43b2e0fb11f9');
  const candidate = apply(original, productEdits); assert.equal(undo(candidate, productEdits), original);
  assert.equal(current, mode === 'baseline' ? original : candidate, 'Exactly five retry hunks, every other application byte held');
  report.sourceBindings = { original: put('source/original-page.tsx', original), current: put('source/current-page.tsx', current), test: put('source/frozen-test.tsx', frozenTest), edits: put('source/product-edits.json', productEdits) };
  for (const f of [SELF, WF, 'src/lib/perfectSeasonNfl.ts', 'src/lib/perfectSeason.ts', 'src/lib/perfectSeasonExpansion.ts', 'src/lib/fetchAllRows.ts', 'src/data/nflCoaches.ts', 'src/hooks/usePerfectSeasonBest.ts']) put(`source/${f}`, read(f));
  assert(!fs.existsSync(pageFolder) && !fs.existsSync(testFolder), 'Do not overwrite another proof');
  fs.mkdirSync(pageFolder); fs.mkdirSync(testFolder); owned = true;
  const run = arm => {
    const row = { id: arm.id, status: 'running', expectedFailures: arm.failures, source: put(`arms/${arm.id}/page.tsx`, arm.source), edits: put(`arms/${arm.id}/edits.json`, arm.edits || []), observations: [] };
    report.arms.push(row); save(); inventory(`${arm.id}-before`);
    const sourceFile = path.join(pageFolder, `${arm.id}.tsx`), testFile = path.join(testFolder, `${arm.id}.test.tsx`);
    fs.writeFileSync(sourceFile, arm.source, { flag: 'wx' });
    const from = '@/pages/PerfectSeasonNfl', to = `@/pages/.nfl-retry-proof-1408/${arm.id}`;
    const served = replace(frozenTest, from, to); fs.writeFileSync(testFile, served, { flag: 'wx' }); row.test = put(`arms/${arm.id}/served.test.tsx`, served);
    const observationOut = path.join(OUT, 'arms', arm.id, 'observations'), resultFile = path.join(OUT, 'arms', arm.id, 'vitest.json');
    const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', path.relative(ROOT, testFile), '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile=${resultFile}`];
    row.command = { executable: process.execPath, args, cwd: ROOT, observationOut };
    const child = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, NFL_RETRY_COMPONENT_OUT: observationOut }, maxBuffer: 100000000, timeout: 180000 });
    row.process = { status: child.status, signal: child.signal, error: child.error ? String(child.error.stack || child.error) : null, stdout: put(`arms/${arm.id}/stdout.log`, child.stdout || Buffer.alloc(0)), stderr: put(`arms/${arm.id}/stderr.log`, child.stderr || Buffer.alloc(0)) };
    if (fs.existsSync(resultFile)) { const b = fs.readFileSync(resultFile); row.vitest = { path: path.relative(OUT, resultFile).split(path.sep).join('/'), bytes: b.length, sha256: hash(b) }; }
    inventory(`${arm.id}-after`); save(); assert(row.vitest, 'Retain the complete actual reporter result');
    const result = JSON.parse(fs.readFileSync(resultFile)), assertions = result.testResults.flatMap(r => r.assertionResults);
    row.assertions = put(`arms/${arm.id}/assertions.json`, assertions);
    const raw = titles.map(title => { const file = path.join(observationOut, `${title.replace(/[^a-zA-Z0-9]+/g, '-')}.json`), b = fs.readFileSync(file);
      row.observations.push({ title, path: path.relative(OUT, file).split(path.sep).join('/'), bytes: b.length, sha256: hash(b) }); return JSON.parse(b); });
    row.raw = put(`arms/${arm.id}/all-observations.json`, raw); save();
    assert.equal(result.numTotalTests, 5); assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0); assert.equal(result.testResults.length, 1);
    assert.deepEqual(assertions.map(r => r.title).sort(), [...titles].sort()); assert(assertions.every(r => ['passed', 'failed'].includes(r.status)));
    row.actualFailures = assertions.filter(r => r.status === 'failed').map(r => r.title).sort(); assert.deepEqual(row.actualFailures, [...arm.failures].sort());
    assert.equal(result.numFailedTests, arm.failures.length); assert.equal(result.numPassedTests, 5 - arm.failures.length);
    assert.equal(child.signal, null); assert.equal(row.process.error, null); assert.equal(child.status, arm.failures.length ? 1 : 0);
    const log = (child.stdout || '').toString() + (child.stderr || '').toString(); assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Cannot find module|No test files found|SIM_OFFLINE_BLOCK/i.test(log));
    row.expectedGuards = Object.fromEntries(arm.failures.map((title, i) => [title, arm.guards[i]]));
    for (const failure of assertions.filter(r => r.status === 'failed')) assert(failure.failureMessages.join('\n').includes(row.expectedGuards[failure.title]), 'Only the precise intended assertion may fail');
    row.status = 'pass'; save(); return { row, raw };
  };
  const originalRun = run({ id: 'original', source: original, failures: titles.slice(0, 3), guards });
  report.originalRaw = originalRun.row.raw;
  if (mode === 'fixed') {
    assert(/^[0-9a-f]{64}$/.test(process.env.NFL_RETRY_BASELINE_RAW_SHA || ''), 'Bind the independently qualified baseline raw');
    assert.equal(originalRun.row.raw.sha256, process.env.NFL_RETRY_BASELINE_RAW_SHA, 'Whole actual original observations equal the qualified baseline');
    const removals = [
      { id: 'eager-debit', failures: [titles[2]], guards: ['NFL_RETRY_GUARD_usable_recovery_request'], edits: [
        { from: '      if (rerolls <= 0) return;\n    }\n    retryReroll.current', to: '      if (rerolls <= 0) return;\n      setRerolls(r => r - 1);\n    }\n    retryReroll.current' },
        { from: '    if (isReroll) setRerolls(r => r - 1);\n    setWheelText', to: '    setWheelText' },
      ] },
      { id: 'forgotten-reroll', failures: [titles[2]], guards: ['NFL_RETRY_GUARD_retry_reroll_debit'], edits: [{ from: 'void spin(retryReroll.current)', to: 'void spin(false)' }] },
      { id: 'stale-wheel', failures: [titles[0]], guards: ['NFL_RETRY_GUARD_stale_wheel_boot'], edits: [{ from: "    setIndex([]);\n    setPhase('boot');\n  };", to: "    setPhase('boot');\n  };" }] },
    ];
    for (const arm of removals) {
      const source = apply(current, arm.edits); assert.equal(undo(source, arm.edits), current);
      const result = run({ ...arm, source }), observed = result.raw[arm.id === 'stale-wheel' ? 0 : 2];
      const boundary = arm.id === 'eager-debit' ? { index: 1, squads: 15, sims: 0 } : arm.id === 'forgotten-reroll' ? { index: 1, squads: 16, sims: 0 } : { index: 3, squads: 9, sims: 1 };
      assert.deepEqual({ index: observed.indexCalls.length, squads: observed.squadCalls.length, sims: observed.simulations.length }, boundary);
      report.controls.push({ id: arm.id, changed: source !== current, measuredBoundary: boundary, wholeUndo: put(`arms/${arm.id}/undo.tsx`, undo(source, arm.edits)), status: 'pass' }); save();
    }
    const candidateRun = run({ id: 'current', source: current, failures: [], guards: [] });
    const restored = run({ id: 'whole-undo', source: undo(apply(current, removals[0].edits), removals[0].edits), failures: [], guards: [] });
    const outcome = raw => ({ fixture: raw.fixture, indexCalls: raw.indexCalls, squadCalls: raw.squadCalls, simulations: raw.simulations, completions: raw.completions, daily: raw.daily });
    for (const i of [3, 4]) assert.deepEqual(outcome(candidateRun.raw[i]), outcome(originalRun.raw[i]), 'Complete unchanged healthy outcomes equal original');
    assert.deepEqual(restored.raw.map(outcome), candidateRun.raw.map(outcome), 'Whole source undo preserves all actual IO and game outcomes');
    report.runtimeEqualityScope = 'Whole original observations equal the qualified baseline. Candidate/restored and the two healthy original cases compare complete fixture/fetch/simulation/completion/daily values; all DOM and unfiltered draw callers remain retained.';
  }
  report.status = 'pass';
} catch (error) { report.status = 'fail'; report.errors.push(String(error.stack || error)); }
finally {
  if (owned) for (const [folder, parent] of [[pageFolder, 'src/pages'], [testFolder, 'src/test']]) {
    try { assert.equal(path.dirname(folder), path.join(ROOT, parent)); assert.equal(path.basename(folder), '.nfl-retry-proof-1408'); fs.rmSync(folder, { recursive: true }); }
    catch (e) { report.status = 'fail'; report.errors.push(`Owned-copy cleanup: ${e.stack || e}`); }
  }
  try { if (declared) report.sourceAfter = inventory('after'); } catch (e) { report.status = 'fail'; report.errors.push(`Source hold: ${e.stack || e}`); }
  save();
}
console.log(`NFL retry ${mode}: ${report.arms.length}/${mode === 'baseline' ? 1 : 6} complete source arms, five actual cases each.`);
console.log(`NFL retry controls: ${report.controls.length}/${mode === 'baseline' ? 0 : 3} independently removed behaviors.`);
console.log(`NFL retry raw source, fixtures, requests, DOM, draws and process records: ${OUT}`);
console.log(`${report.status === 'pass' ? 'PASS' : 'FAIL'} NFL Perfect Season retry ${mode}`);
if (report.status !== 'pass') process.exitCode = 1;
