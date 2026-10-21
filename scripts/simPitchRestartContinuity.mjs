// Remote proof of React commit continuity. This does not observe browser paint.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Release BE join (Round BEG): PITCH_RESTART_PARENT_REF names the tree without this packet on a newer core (the BE join passes the first parent of its m7 merge, since Release BD changed LiveSimScreen.tsx); 082fc277 on the packet branch. */
const PARENT = process.env.PITCH_RESTART_PARENT_REF || '082fc2774c8aa9f919c14efa33bfc3fbfc599597';
const MOTION = 'src/components/pitch-motion/motion.tsx';
const TEST = 'src/test/pitchRestartContinuity.test.tsx';
const OWNED = ['goal to kickoff', 'shot to goalkick', 'save to keeper'].map(label => `restart continuity missing: ${label} keeps its last committed coordinates`);
const PRESERVED = [
  'a held caller clock freezes the frame and resumed clock advances it',
  'reduced motion reaches the actual action and restart without a tween',
  'a new committed action replaces the previous goal',
  'a withdrawn action stays withdrawn after clock rewind',
  'a substitution cancels the old action and a new action uses the new figure',
  'an own goal retains its intentional defender touch and rue pose',
].map(label => 'restart preserves: ' + label);
const OLD = '  const base = reduced ? scene : between(travel.from, travel.to, smooth((clock - travel.at) / .3));';
const FIXED = '  const travelForFrame = scene !== travel.to ? { from: current.current, to: scene, at: clock } : travel;\n  const base = reduced ? scene : between(travelForFrame.from, travelForFrame.to, smooth((clock - travelForFrame.at) / .3));';
const files = [MOTION, 'src/components/pitch-motion/scene.ts', 'src/components/pitch-motion/contract.ts', 'src/components/pitch-motion/pitchMotion.css', 'src/components/pitch-motion/PitchMotion.tsx', 'src/components/club-manager/LiveSimScreen.tsx', 'src/lib/keyedRng.ts', 'src/test/setup.ts', 'src/test/liveSimMotion.test.tsx', 'src/test/pitchOwnGoal.test.tsx', 'scripts/simLiveSimMotion.mjs', 'scripts/simOwnGoalMotion.mjs', 'scripts/lib/offlineTransport.cjs', 'vitest.config.ts', 'package.json', 'package-lock.json', 'tsconfig.app.json', TEST, 'scripts/simPitchRestartContinuity.mjs', '.github/workflows/pitch-restart-continuity.yml'];
const hash = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.toString().replace(/\r\n/g, '\n');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const phase = process.env.PITCH_RESTART_PHASE ?? 'fixed';
const red = process.env.SC_PITCH_RESTART_EXPECT_RED === '1';
const control = process.env.SC_PITCH_RESTART_CONTROL ?? '';
assert.equal(process.env.CI, '1', 'This qualification runs only on the remote CI runner');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Proof transport must remain offline');
assert.ok(['baseline', 'fixed'].includes(phase));
assert.ok(['', 'oldrender'].includes(control));
assert.ok(!red || (phase === 'baseline' && !control));
assert.ok(!control || phase === 'fixed');
const OUT = process.env.PITCH_RESTART_OUT ? path.resolve(process.env.PITCH_RESTART_OUT) : await mkdtemp(path.join(tmpdir(), 'pitch-restart-receipts-'));
const arm = red ? 'baseline-red' : control || 'normal';
const DIR = path.join(OUT, 'units', arm);
await mkdir(DIR, { recursive: true });
await mkdir(path.join(ROOT, 'tmp'), { recursive: true });
const scratch = await mkdtemp(path.join(ROOT, 'tmp/pitch-restart-'));
const receipt = { head: git(['rev-parse', 'HEAD']), parent: PARENT, phase, arm, before: [], parentBindings: [], mutations: [], compiled: [], success: false };
try {
  const sources = new Map();
  for (const file of files) {
    let rawSha256; { const raw = await readFile(path.join(ROOT, file)); rawSha256 = hash(raw); }
    const body = lf(await readFile(path.join(ROOT, file))); sources.set(file, body);
    const beforePath = path.join('units', arm, 'before', file + '.before');
    await mkdir(path.dirname(path.join(OUT, beforePath)), { recursive: true });
    await writeFile(path.join(OUT, beforePath), body);
    receipt.before.push({ file, rawSha256, sha256: hash(body), beforePath });
    if (![TEST, 'scripts/simPitchRestartContinuity.mjs', '.github/workflows/pitch-restart-continuity.yml'].includes(file)) {
      const parent = lf(execFileSync('git', ['show', PARENT + ':' + file], { cwd: ROOT }));
      if (file === MOTION && phase === 'fixed') {
        assert.equal(body.split(FIXED).length - 1, 1, 'One executable derived-travel span required');
        assert.equal(body.replace(FIXED, OLD), parent, 'The complete motion inverse must equal the parent');
      } else assert.equal(body, parent, file + ' whole-parent source hold');
      receipt.parentBindings.push({ file, sha256: hash(parent) });
    }
  }
  let motion = sources.get(MOTION);
  if (control) {
    assert.equal(motion.split(FIXED).length - 1, 1);
    const changed = motion.replace(FIXED, OLD); assert.notEqual(changed, motion);
    assert.equal(changed, lf(execFileSync('git', ['show', PARENT + ':' + MOTION], { cwd: ROOT })));
    await writeFile(path.join(DIR, 'motion.control.tsx'), changed);
    receipt.mutations.push({ file: MOTION, anchor: FIXED, replacement: OLD, offset: motion.indexOf(FIXED), beforeSha256: hash(motion), afterSha256: hash(changed), controlPath: path.join('units', arm, 'motion.control.tsx') });
    motion = changed;
  }
  const copyPath = path.join(scratch, 'motion.tsx');
  await writeFile(copyPath, motion); await writeFile(path.join(DIR, 'motion.loaded.tsx'), motion);
  await writeFile(path.join(scratch, 'pitchMotion.css'), sources.get('src/components/pitch-motion/pitchMotion.css'));
  const aliases = { name: 'actual-shared-pitch', setup(builder) {
    builder.onResolve({ filter: /^@\// }, args => args.path === '@/components/pitch-motion/motion'
      ? { path: copyPath }
      : builder.resolve('./' + args.path.slice(2), { resolveDir: path.join(ROOT, 'src'), kind: args.kind }));
  } };
  const compiledDir = path.join(scratch, 'compiled');
  const retainedCompiled = path.join(DIR, 'compiled'); await mkdir(retainedCompiled, { recursive: true });
  const result = await build({ entryPoints: { motion: copyPath, scene: path.join(ROOT, 'src/components/pitch-motion/scene.ts'), contract: path.join(ROOT, 'src/components/pitch-motion/contract.ts') }, outdir: compiledDir, outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'browser', jsx: 'automatic', external: ['react', 'react-dom', 'react/jsx-runtime'], loader: { '.css': 'empty' }, plugins: [aliases], metafile: true, logLevel: 'silent' });
  assert.ok(Object.keys(result.metafile.inputs).every(file => !/clubManager|soccerCareerEngine|LiveSimScreen/.test(file)), 'Shared compile must not import a game engine or binder');
  await writeFile(path.join(DIR, 'metafile.json'), JSON.stringify(result.metafile, null, 2));
  for (const name of ['motion', 'scene', 'contract']) {
    const body = await readFile(path.join(compiledDir, name + '.mjs'));
    const retained = path.join(retainedCompiled, name + '.mjs'); await writeFile(retained, body);
    receipt.compiled.push({ name, path: path.relative(OUT, retained).replaceAll('\\', '/'), sha256: hash(body) });
  }
  await writeFile(path.join(DIR, 'source.json'), JSON.stringify(receipt, null, 2));
  const reportPath = path.join(DIR, 'unit.json'); const tapesPath = path.join(DIR, 'commits.jsonl');
  await writeFile(tapesPath, '');
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', PITCH_RESTART_TAPES: tapesPath, PITCH_RESTART_MOTION: '/@fs/' + path.join(compiledDir, 'motion.mjs').replaceAll('\\', '/'), PITCH_RESTART_SCENE: '/@fs/' + path.join(compiledDir, 'scene.mjs').replaceAll('\\', '/'), PITCH_RESTART_CONTRACT: '/@fs/' + path.join(compiledDir, 'contract.mjs').replaceAll('\\', '/') };
  const child = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=60000', '--reporter=default', '--reporter=json', '--outputFile.json=' + reportPath], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (child.stdout ?? '') + (child.stderr ?? '');
  await writeFile(path.join(DIR, 'output.log'), output);
  await writeFile(path.join(DIR, 'process.json'), JSON.stringify({ status: child.status, signal: child.signal, error: child.error?.message ?? null }, null, 2));
  assert.equal(child.error, undefined); assert.equal(child.signal, null);
  assert.ok(!/Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|ReferenceError|TypeError|Transform failed/.test(output), 'No setup/import/unhandled faults may earn credit');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(report.testResults.length, 1); assert.equal(report.testResults[0].message ?? '', '');
  const rows = report.testResults[0].assertionResults;
  assert.deepEqual(rows.map(row => row.title).sort(), [...OWNED, ...PRESERVED].sort());
  assert.equal(rows.length, 9); assert.ok(rows.every(row => ['passed', 'failed'].includes(row.status)));
  const faults = rows.filter(row => row.status === 'failed');
  const expected = red || control ? OWNED : [];
  assert.equal(report.numTotalTests, 9); assert.equal(report.numPendingTests, 0);
  assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 9 - expected.length);
  assert.deepEqual(faults.map(row => row.title).sort(), [...expected].sort());
  assert.equal(child.status, expected.length ? 1 : 0);
  for (const row of faults) {
    assert.ok(row.failureMessages.length > 0);
    for (const message of row.failureMessages) assert.match(message, /^AssertionError: first post-action frame lost the committed terminal coordinates: expected false to be true/);
  }
  const tapes = (await readFile(tapesPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(tapes.map(row => row.title).sort(), [...OWNED, ...PRESERVED].sort());
  assert.ok(tapes.every(row => row.commits.length > 0 && row.inputsHeld && row.randomDraws === 0));
  for (const item of receipt.before) assert.equal(hash(lf(await readFile(path.join(ROOT, item.file)))), item.sha256, item.file + ' final source hold');
  receipt.success = true; receipt.tests = { total: rows.length, failed: faults.length, passed: rows.length - faults.length, expectedFaults: expected }; receipt.commitRows = tapes.reduce((n, row) => n + row.commits.length, 0);
  await writeFile(path.join(DIR, 'source.json'), JSON.stringify(receipt, null, 2));
  console.log(`Actual shared hook: ${rows.length} cases, ${rows.length - faults.length} passed, ${faults.length} exact continuity faults`);
  console.log(`Committed layout tapes: ${tapes.length} cases, ${receipt.commitRows} retained frames, zero match RNG draws`);
  console.log(`Source holds: ${receipt.before.length} before bodies, ${receipt.parentBindings.length} parent bindings, ${receipt.compiled.length} compiled modules`);
  console.log(`Child outcome: exit ${child.status}, zero pending/file/setup faults; ${expected.length ? 'three owned Boolean causes' : 'all nine outcomes green'}`);
  console.log(`simPitchRestartContinuity: ${arm} qualified (${control ? 'one effective copied old-render fault' : 'actual committed coordinates'}); browser paint unmeasured`);
} finally {
  assert.equal(path.dirname(scratch), path.join(ROOT, 'tmp')); assert.ok(path.basename(scratch).startsWith('pitch-restart-'));
  await rm(scratch, { recursive: true, force: true });
}
