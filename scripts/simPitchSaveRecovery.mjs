// Actual React/SVG commits only; this proof does not observe browser paint.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARENT = '8e70dcf0fcfe0d9554881d73cfcfa2fea9414faf';
const MOTION = 'src/components/pitch-motion/motion.tsx';
const TEST = 'src/test/pitchSaveRecovery.test.tsx';
const HELPER = 'scripts/simPitchSaveRecovery.mjs';
const WORKFLOW = '.github/workflows/pitch-save-recovery.yml';
const OWNED = ['me', 'opp'].map(side => 'save recovery missing: ' + side + ' save keeps the defending keeper pose');
const PRESERVED = [
  'reduced motion keeps the original still restart',
  'the actual paused pitch holds its SVG and callbacks',
  'an inactive hook cancels the original action',
  'withdrawal and rewind do not revive a saved pose',
  'a changed cast cancels the old keeper recovery',
  'a new action replaces the old save pose',
  'other actions and their actual moment callbacks stay identical',
].map(text => 'save recovery preserves: ' + text);
const SPANS = [
  {
    "before": "const bounded = (v: number) => Math.max(0, Math.min(1, v));",
    "after": "type CapturedScene<T extends MotionPlayer> = MotionScene<T> & Partial<Pick<MotionFrame<T>, 'poses' | 'action' | 'phase'>>;\n\nconst bounded = (v: number) => Math.max(0, Math.min(1, v));"
  },
  {
    "before": "  const [travel, setTravel] = useState({ from: scene, to: scene, at: clock });",
    "after": "  const [travel, setTravel] = useState<{ from: CapturedScene<T>; to: MotionScene<T>; at: number }>({ from: scene, to: scene, at: clock });"
  },
  {
    "before": "  const current = useRef<MotionScene<T>>(scene);",
    "after": "  const current = useRef<CapturedScene<T>>(scene);"
  },
  {
    "before": "  const base = reduced ? scene : between(travelForFrame.from, travelForFrame.to, smooth((clock - travelForFrame.at) / .3));\n  const frame: MotionFrame<T> = inAction\n    ? actionFrame(action.scene, action.event, reduced ? 1.05 : clock - action.event.at)\n    : { ...base, poses: {}, action: 'pass', net: null, netPulse: 0, phase: 'pass' };",
    "after": "  const progress = smooth((clock - travelForFrame.at) / .3);\n  const base = reduced ? scene : between(travelForFrame.from, travelForFrame.to, progress);\n  const keeper = action?.event.event.kind === 'save' && action.event.event.side !== 'none'\n    ? (action.event.event.side === 'me' ? travelForFrame.from.theirs : travelForFrame.from.mine).find(player => player.keeper)\n    : undefined;\n  const caughtPose = keeper && travelForFrame.from.poses?.[keeper.key];\n  /* A completed save's keeper gets up during the existing walk, from the pose actually shown. */\n  const recovering = !!(active && !reduced && action && !inAction && (!event || event === action.event)\n    && clock >= action.event.at + ACTION_SPAN && clock >= clockRef.current\n    && travelForFrame.at >= action.event.at + ACTION_SPAN\n    && travelForFrame.from.action === 'save' && travelForFrame.from.phase === 'caught'\n    && keeper && scene.holderKey === keeper.key && caughtPose && current.current.poses?.[keeper.key]\n    && samePlayers(travelForFrame.from.mine, scene.mine) && samePlayers(travelForFrame.from.theirs, scene.theirs)\n    && travelForFrame.from.mine.every(player => scene.mine.find(next => next.key === player.key)?.keeper === player.keeper)\n    && travelForFrame.from.theirs.every(player => scene.theirs.find(next => next.key === player.key)?.keeper === player.keeper));\n  const poses: Record<string, Pose> = recovering && keeper && caughtPose && progress < 1\n    ? { [keeper.key]: { ...caughtPose, dive: (caughtPose.dive ?? 0) * (1 - progress), catching: (caughtPose.catching ?? 0) * (1 - progress) } }\n    : {};\n  const frame: MotionFrame<T> = inAction\n    ? actionFrame(action.scene, action.event, reduced ? 1.05 : clock - action.event.at)\n    : { ...base, poses, action: 'pass', net: null, netPulse: 0, phase: 'pass' };"
  }
];
const files = [MOTION, 'src/components/pitch-motion/scene.ts', 'src/components/pitch-motion/contract.ts',
  'src/components/pitch-motion/PitchMotion.tsx', 'src/components/pitch-motion/PitchSurface.tsx',
  'src/components/pitch-motion/pitchMotion.css', 'src/components/club-manager/LiveSimScreen.tsx',
  'src/components/club-manager/LiveSimMotion.tsx', 'src/lib/keyedRng.ts', 'src/test/setup.ts',
  'src/test/pitchRestartContinuity.test.tsx', 'src/test/liveSimMotion.test.tsx', 'src/test/pitchOwnGoal.test.tsx',
  'scripts/simPitchRestartContinuity.mjs', 'scripts/simLiveSimMotion.mjs', 'scripts/simOwnGoalMotion.mjs',
  'scripts/lib/offlineTransport.cjs', 'vitest.config.ts', 'tsconfig.app.json',
  'package.json', 'package-lock.json', 'bun.lock', TEST, HELPER, WORKFLOW];
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.toString().replace(/\r\n/g, '\n');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const phase = process.env.PITCH_SAVE_PHASE ?? 'fixed';
const red = process.env.SC_PITCH_SAVE_EXPECT_RED === '1';
const control = process.env.SC_PITCH_SAVE_CONTROL ?? '';
assert.equal(process.env.CI, '1', 'This proof executes only on a remote CI runner');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert.ok(['baseline', 'fixed'].includes(phase));
assert.ok(['', 'original'].includes(control));
assert.ok(!red || (phase === 'baseline' && !control));
assert.ok(phase !== 'baseline' || red, 'Baseline must explicitly classify its two causal failures');
assert.ok(!control || phase === 'fixed');
const OUT = process.env.PITCH_SAVE_OUT ? path.resolve(process.env.PITCH_SAVE_OUT) : await mkdtemp(path.join(tmpdir(), 'pitch-save-artifacts-'));
assert.notEqual(OUT, ROOT); assert.ok(OUT !== path.join(ROOT, 'dist') && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep));
const arm = red ? 'baseline' : control || 'normal';
const DIR = path.join(OUT, arm); await mkdir(DIR, { recursive: true });
await mkdir(path.join(ROOT, 'tmp'), { recursive: true });
const scratch = await mkdtemp(path.join(ROOT, 'tmp/pitch-save-'));
const receipt = { head: git(['rev-parse', 'HEAD']).trim(), parent: PARENT, phase, arm, before: [], parentBindings: [], changes: [], graphs: [], child: null, complete: false };
const saveReceipt = () => writeFile(path.join(DIR, 'source.json'), JSON.stringify(receipt, null, 2) + '\n');
try {
  const sources = new Map(); let parentMotion;
  for (const file of files) {
    const raw = await readFile(path.join(ROOT, file)), body = lf(raw); sources.set(file, body);
    const beforePath = 'before/' + file + '.before'; await mkdir(path.dirname(path.join(DIR, beforePath)), { recursive: true });
    await writeFile(path.join(DIR, beforePath), body);
    receipt.before.push({ file, bytes: Buffer.byteLength(body), rawSha256: sha(raw), sha256: sha(body), path: beforePath });
    if ([TEST, HELPER, WORKFLOW].includes(file)) continue;
    const original = lf(git(['show', PARENT + ':' + file]));
    const parentPath = 'parent/' + file + '.parent'; await mkdir(path.dirname(path.join(DIR, parentPath)), { recursive: true });
    await writeFile(path.join(DIR, parentPath), original);
    if (file === MOTION) {
      parentMotion = original;
      let derived = original;
      for (const span of SPANS) { assert.equal(derived.split(span.before).length - 1, 1); derived = derived.replace(span.before, span.after); }
      if (phase === 'baseline') assert.equal(body, original, 'The whole baseline motion must be its qualified parent');
      else {
        assert.equal(body, derived, 'Only the four recorded recovery spans may change the whole motion');
        let inverse = body;
        for (const span of [...SPANS].reverse()) { assert.equal(inverse.split(span.after).length - 1, 1); inverse = inverse.replace(span.after, span.before); }
        assert.equal(inverse, original, 'The four complete recovery spans must restore the whole parent motion');
        await writeFile(path.join(DIR, 'motion.inverse.tsx'), inverse);
        receipt.changes = SPANS.map(span => ({ before: span.before, after: span.after, offset: body.indexOf(span.after) }));
      }
    } else assert.equal(body, original, file + ' whole parent hold');
    receipt.parentBindings.push({ file, path: parentPath, parentSha256: sha(original), candidateSha256: sha(body) });
  }
  assert(parentMotion); await saveReceipt();
  let loaded = sources.get(MOTION);
  if (control) {
    assert.notEqual(loaded, parentMotion, 'Copied original source control must change the fixed hook');
    await writeFile(path.join(DIR, 'motion.control.tsx'), parentMotion);
    receipt.control = { kind: 'whole-original', beforeSha256: sha(loaded), afterSha256: sha(parentMotion), path: 'motion.control.tsx' };
    loaded = parentMotion;
  }
  async function compile(name, motion) {
    const work = path.join(scratch, name); await mkdir(work, { recursive: true });
    const motionPath = path.join(work, 'motion.tsx'); await writeFile(motionPath, motion);
    await writeFile(path.join(work, 'pitchMotion.css'), sources.get('src/components/pitch-motion/pitchMotion.css'));
    const retained = path.join(DIR, name); await mkdir(retained, { recursive: true });
    await writeFile(path.join(retained, 'motion.loaded.tsx'), motion);
    const alias = { name: 'actual-pitch-graph', setup(builder) {
      builder.onResolve({ filter: /^@\// }, args => args.path === '@/components/pitch-motion/motion' ? { path: motionPath }
        : builder.resolve('./' + args.path.slice(2), { resolveDir: path.join(ROOT, 'src'), kind: args.kind }));
    } };
    const result = await build({ entryPoints: { motion: motionPath, shared: path.join(ROOT, 'src/components/pitch-motion/PitchMotion.tsx'),
      scene: path.join(ROOT, 'src/components/pitch-motion/scene.ts'), contract: path.join(ROOT, 'src/components/pitch-motion/contract.ts') },
      outdir: path.join(work, 'compiled'), outExtension: { '.js': '.mjs' }, bundle: true, splitting: true, format: 'esm', platform: 'browser',
      jsx: 'automatic', external: ['react', 'react-dom', 'react/jsx-runtime'], loader: { '.css': 'empty' }, plugins: [alias], metafile: true, logLevel: 'silent' });
    assert.ok(Object.keys(result.metafile.inputs).every(file => !/clubManager|soccerCareerEngine|LiveSimScreen/.test(file)), 'Actual shared graph must not import gameplay values');
    await writeFile(path.join(retained, 'metafile.json'), JSON.stringify(result.metafile, null, 2));
    const inputs = [];
    for (const file of Object.keys(result.metafile.inputs)) {
      const absolute = path.resolve(ROOT, file), bytes = await readFile(absolute);
      const destination = 'inputs/' + path.relative(ROOT, absolute).replaceAll('\\', '/');
      assert(!destination.includes('../'));
      await mkdir(path.dirname(path.join(retained, destination)), { recursive: true }); await writeFile(path.join(retained, destination), bytes);
      inputs.push({ file, bytes: bytes.length, sha256: sha(bytes), path: name + '/' + destination });
    }
    const compiled = [];
    await mkdir(path.join(retained, 'compiled'), { recursive: true });
    for (const file of (await readdir(path.join(work, 'compiled'))).filter(file => file.endsWith('.mjs')).sort()) {
      const bytes = await readFile(path.join(work, 'compiled', file)); await writeFile(path.join(retained, 'compiled', file), bytes);
      compiled.push({ file, bytes: bytes.length, sha256: sha(bytes), path: name + '/compiled/' + file });
    }
    for (const leaf of ['motion', 'shared', 'scene', 'contract']) assert(compiled.some(row => row.file === leaf + '.mjs'));
    const graph = { name, motionSha256: sha(motion), inputs, compiled }; receipt.graphs.push(graph); await saveReceipt();
    return path.join(work, 'compiled');
  }
  const actual = await compile('candidate', loaded), original = await compile('original', parentMotion);
  const modulePath = (dir, name) => '/@fs/' + path.join(dir, name + '.mjs').replaceAll('\\', '/');
  const reportPath = path.join(DIR, 'unit.json'), tapesPath = path.join(DIR, 'commits.jsonl'); await writeFile(tapesPath, '');
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', PITCH_SAVE_TAPES: tapesPath,
    PITCH_SAVE_MOTION: modulePath(actual, 'motion'), PITCH_SAVE_PARENT_MOTION: modulePath(original, 'motion'),
    PITCH_SAVE_SHARED: modulePath(actual, 'shared'), PITCH_SAVE_PARENT_SHARED: modulePath(original, 'shared'),
    PITCH_SAVE_SCENE: modulePath(actual, 'scene'), PITCH_SAVE_CONTRACT: modulePath(actual, 'contract') };
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=default', '--reporter=json', '--outputFile.json=' + reportPath], { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (child.stdout ?? '') + (child.stderr ?? '');
  await writeFile(path.join(DIR, 'output.log'), output);
  receipt.child = { status: child.status, signal: child.signal, error: child.error?.message ?? null }; await saveReceipt();
  assert.equal(child.error, undefined); assert.equal(child.signal, null);
  assert.ok(!/Unhandled (?:Errors?|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError|Transform failed/.test(output), 'No module, setup or unrelated fault may earn credit');
  const raw = JSON.parse(await readFile(reportPath, 'utf8')); assert.equal(raw.testResults.length, 1); assert.equal(raw.testResults[0].message ?? '', '');
  const rows = raw.testResults[0].assertionResults, failures = rows.filter(row => row.status === 'failed');
  const expected = red || control ? OWNED : [];
  assert.deepEqual(rows.map(row => row.title).sort(), [...OWNED, ...PRESERVED].sort());
  assert.equal(raw.numTotalTests, 9); assert.equal(raw.numPendingTests, 0);
  assert.equal(raw.numFailedTests, expected.length); assert.equal(raw.numPassedTests, 9 - expected.length);
  assert.ok(rows.every(row => ['passed', 'failed'].includes(row.status)));
  assert.deepEqual(failures.map(row => row.title).sort(), [...expected].sort()); assert.equal(child.status, expected.length ? 1 : 0);
  for (const row of failures) {
    assert(row.failureMessages.length);
    for (const message of row.failureMessages) assert.match(message, /^AssertionError: first save recovery frame lost the committed keeper pose: expected false to be true/);
  }
  const tapes = (await readFile(tapesPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(tapes.map(row => row.title).sort(), [...OWNED, ...PRESERVED].sort());
  assert(tapes.every(row => row.inputsHeld && row.inputs.length && row.randomDraws === 0 && (row.commits.length || row.sharedFrames.length)));
  for (const item of receipt.before) assert.equal(sha(lf(await readFile(path.join(ROOT, item.file)))), item.sha256, item.file + ' final source hold');
  for (const graph of receipt.graphs) for (const item of graph.inputs) assert.equal(sha(await readFile(path.resolve(ROOT, item.file))), item.sha256, 'Actual shared graph input hold');
  receipt.complete = true; receipt.tests = { total: 9, failed: failures.length, passed: 9 - failures.length, expected };
  receipt.layoutCommits = tapes.reduce((sum, row) => sum + row.commits.length, 0);
  receipt.sharedSnapshots = tapes.reduce((sum, row) => sum + row.sharedFrames.length, 0);
  await saveReceipt();
  console.log('Actual save recovery: nine named cases, ' + (9 - failures.length) + ' passes, ' + failures.length + ' exact owned Boolean faults, pending0.');
  console.log('Both real completion conventions and the complete original hook/scene/SVG graph are retained before assertions.');
  console.log('Actual shared callback/paused SVG tapes, complete input holds and zero match RNG draws qualified.');
  console.log('simPitchSaveRecovery: ' + arm + ' qualified; React/SVG commits only, browser paint unmeasured.');
} finally {
  await saveReceipt();
  assert.equal(path.dirname(scratch), path.join(ROOT, 'tmp')); assert(path.basename(scratch).startsWith('pitch-save-'));
  await rm(scratch, { recursive: true, force: true });
}

