/* Real practice feedback with bounded copied-source faults and an independent engine baseline. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), self = fileURLToPath(import.meta.url);
const feedback = 'src/components/cage-clash/CagePracticeFeedback.tsx', board = 'src/components/cage-clash/CageClashBoard.tsx';
const hook = 'src/hooks/useCageClash.ts';
const siblings = [feedback, board, 'src/components/cage-clash/CageClashCanvas.tsx', 'src/components/cage-clash/CageFightStats.tsx', hook];
const testFile = 'src/test/cagePracticeFeedback.test.tsx';
const titles = {
  striking: 'shows actual three shot progress and requires 90 gas after releasing controls',
  takedown: 'distinguishes a real clinch and defended attempt from an earned top takedown',
  submission: 'shows the players actual pressure and only accepts their finished submission',
  escape: 'requires full earned guard and actual standing rather than half guard or a flag alone',
  readonly: 'renders actual defended and resisted messages without changing input RNG scores or storage',
  mounted: 'updates feedback through actual mounted practice inputs while Quick and Circuit remain isolated',
  pause: 'flushes the same actual practice tick into feedback and HUD when pause or help interrupts repaint',
  baseline: 'holds actual practice combat and a strict saved promotion independently of feedback',
};
const integration = '{practice ? <CagePracticeFeedback practice={practice} />';
const controls = {
  pause: { file: hook, from: 'setFight(fightRef.current);\n    setPractice(practiceRef.current);\n    setPaused(true);', to: 'setFight(fightRef.current);\n    setPaused(true);', test: titles.pause },
  shots: { file: feedback, from: 'Math.min(3, player.hits)', to: 'Math.min(3, fight.cpu.hits)', test: titles.striking },
  gas: { file: feedback, from: 'Math.floor(player.stamina)', to: 'Math.round(player.stamina)', test: titles.striking },
  gasTarget: { file: feedback, from: 'earned = player.hits >= 3 && player.stamina >= 90;', to: 'earned = player.hits >= 3 && player.stamina >= 89;', test: titles.striking },
  clinch: { file: feedback, from: 'earned = player.takedowns > 0 && onTop;', to: "earned = fight.position === 'clinch' || onTop;", test: titles.takedown },
  pressure: { file: feedback, from: 'Math.floor(player.submission)', to: 'Math.floor(fight.cpu.submission)', test: titles.submission },
  finish: { file: feedback, from: "&& fight.result.method === 'Submission';", to: ';', test: titles.submission },
  guardFlag: { file: feedback, from: "const onFeet = recoveredGuard && fight.position === 'standing';", to: "const onFeet = fight.position === 'standing';", test: titles.escape },
  halfGuard: { file: feedback, from: 'Guard ${recoveredGuard ? 1 : 0}/1', to: 'Guard ${fight.groundLevel <= 1 ? 1 : 0}/1', test: titles.escape },
  standing: { file: feedback, from: "const onFeet = recoveredGuard && fight.position === 'standing';", to: "const onFeet = recoveredGuard && fight.position === 'ground';", test: titles.escape },
  message: { file: feedback, from: 'message: fight.message, complete', to: "message: 'No previous action.', complete", test: titles.readonly },
  mutate: { file: feedback, from: 'export function cagePracticeFeedback(practice: CagePractice) {', to: 'export function cagePracticeFeedback(practice: CagePractice) { practice.fight.seed += 1;', test: titles.readonly },
  missing: { file: board, from: integration, to: '{false ? <CagePracticeFeedback practice={practice} />', test: titles.mounted },
  leak: { file: board, from: integration, to: "{fight ? <CagePracticeFeedback practice={practice ?? { drill: 'striking', fight, complete: false, recoveredGuard: false }} />", test: titles.mounted },
};
const mode = process.env.CAGE_PRACTICE_FEEDBACK_CONTROL || '';
assert(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known practice feedback control');
const evidence = path.resolve(process.env.CAGE_PRACTICE_FEEDBACK_ARTIFACTS || path.join(root, 'cage-practice-feedback-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (mode === 'all') {
  const results = [];
  for (const control of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CAGE_PRACTICE_FEEDBACK_CONTROL: control, CAGE_PRACTICE_FEEDBACK_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`;
    await writeFile(path.join(evidence, `${control || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: control || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} Cage Practice feedback ${control || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => /simCagePracticeFeedback/.test(line)).join('\n') + '\n' : output.slice(-12000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(result => result.passed), 'Every actual outcome and effective feedback fault ran');
  console.log(`simCagePracticeFeedback: ${Object.keys(titles).length} actual outcomes and ${Object.keys(controls).length} effective controls passed.`);
  process.exit(0);
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBefore = {}, held = [];
const sources = [...siblings, 'src/lib/cageClash.ts', 'src/lib/cagePractice.ts', 'src/lib/cageCircuit.ts', testFile];
for (const relative of sources) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  sourceBefore[relative] = sha(bytes);
  held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} source bytes held`)));
}
const controlRoot = path.join(root, '.sim-control'); await mkdir(controlRoot, { recursive: true });
const folder = await mkdtemp(path.join(controlRoot, 'cage-practice-feedback-'));
try {
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
  if (mode) {
    const spec = controls[mode], source = (await readFile(path.join(root, spec.file), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(source.split(spec.from).length - 1, 1, 'Fault binds one exact executable anchor');
    const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source, 'Copied executable source actually changes');
    const aliases = {};
    for (const relative of siblings) {
      const target = path.join(folder, path.basename(relative));
      await writeFile(target, relative === spec.file ? changed : (await readFile(path.join(root, relative), 'utf8')).replaceAll('\r\n', '\n'));
      aliases['@/' + relative.slice(4).replace(/\.tsx?$/, '')] = target;
    }
    env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
    await writeFile(path.join(evidence, `${mode}-changed-source.txt`), changed);
    await writeFile(path.join(evidence, `${mode}-mutation.json`), JSON.stringify({ file: spec.file, anchor: spec.from, replacement: spec.to, test: spec.test,
      anchorCount: 1, original: sourceBefore[spec.file], normalizedOriginal: sha(source), changed: sha(changed) }, null, 2));
  }
  const reportFile = path.join(evidence, `${mode || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (mode) args.push('--testNamePattern', [controls[mode].test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 150000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(evidence, `${mode || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'The bounded real mounted run finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|Transform failed|Failed to (?:resolve import|load)|Cannot find module|not wrapped in act/);
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(result => result.assertionResults);
  assert.equal(rows.length, Object.keys(titles).length); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const failed = rows.filter(row => row.status === 'failed'), passed = rows.filter(row => row.status === 'passed');
  if (mode) {
    assert.equal(run.status, 1); assert.deepEqual(failed.map(row => row.title), [controls[mode].test]);
    assert.deepEqual(passed.map(row => row.title), [titles.baseline]);
    assert.equal(rows.filter(row => ['pending', 'skipped'].includes(row.status)).length, Object.keys(titles).length - 2);
    const failure = failed.flatMap(row => row.failureMessages).join('\n'); assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else {
    assert.equal(run.status, 0); assert.equal(failed.length, 0);
    assert.deepEqual(new Set(passed.map(row => row.title)), new Set(Object.values(titles)));
  }
  console.log(`simCagePracticeFeedback ${mode || 'normal'}: exact actual outcomes and independent engine baseline passed.`);
} finally {
  assert.equal(path.dirname(folder), controlRoot); assert(path.basename(folder).startsWith('cage-practice-feedback-'));
  await rm(folder, { recursive: true, force: true });
  for (const verify of held) await verify();
  const sourceAfter = {};
  for (const relative of sources) {
    const bytes = await readFile(path.join(root, relative));
    sourceAfter[relative] = sha(bytes);
  }
  assert.deepEqual(sourceAfter, sourceBefore, 'Original source SHA values remain held');
  await writeFile(path.join(evidence, `${mode || 'normal'}-integrity.json`), JSON.stringify({ sourceBefore, sourceAfter }, null, 2));
}
