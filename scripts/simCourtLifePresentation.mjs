/* Actual mounted career screens and canvas paths. Every copied fault must
   reject its named outcome while the unchanged engine replay stays green. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '..');
const board = 'src/components/court-life/CourtLifeBoard.tsx', hub = 'src/components/court-life/CourtLifeHub.tsx';
const match = 'src/components/court-life/CourtLifeMatch.tsx', canvas = 'src/components/court-life/CourtLifeCanvas.tsx';
const renderer = 'src/lib/courtLifeRender.ts', testFile = 'src/test/courtLifePresentation.test.tsx';
const cases = {
  create: 'requires a name and read rules then creates the selected real player and crew',
  prepare: 'shows exact preparation and life tradeoffs before allowing entry to the actual match',
  season: 'renders the actual completed season table stats score and archived choices after restore',
  recovery: 'keeps corrupt raw bytes until the player confirms replacement in the actual dialog',
  meter: 'shows the engine pass target and real charged release window through the mounted court',
  box: 'shows all six earned box score rows and returns actual match consequences to the hub',
  close: 'shows the finishing release window for an actual close range finisher possession',
  geometry: 'draws actual player ball rim and three point coordinates and redraws the latest engine frame',
  motion: 'removes stride animation under reduced motion while preserving the same court geometry and state',
  independent: 'retains the independent seeded engine baseline without presentation code',
};
const controls = {
  rules: { file: board, from: 'disabled={!name.trim() || !rulesRead}', to: 'disabled={!name.trim()}', test: cases.create },
  crew: { file: board, from: 'game.create({ name, crewId, archetypeId })', to: 'game.create({ name, crewId: world.crews[0].id, archetypeId })', test: cases.create },
  preview: { file: hub, from: '<CourtEffect effect={effect} />', to: '<CourtEffect effect={{ ...effect, credits: 0 }} />', test: cases.prepare },
  resources: { file: hub, from: '>{career.resources[key]}{key', to: '>{career.resources[key] + 1}{key', test: cases.prepare },
  entry: { file: hub, from: 'career.blocksLeft === 0 && Boolean(career.decision)', to: 'career.blocksLeft === 0', test: cases.prepare },
  table: { file: hub, from: 'row.scored - row.conceded].map', to: 'row.scored - row.conceded + 1].map', test: cases.season },
  stats: { file: hub, from: '{stats[key]}</strong>', to: '{stats[key] + 1}</strong>', test: cases.season },
  score: { file: hub, from: 'Season score: {score.total}/100', to: 'Season score: {score.total + 1}/100', test: cases.season },
  breakdown: { file: hub, from: '{value.toFixed(1)}/{cap}', to: '{(value + 1).toFixed(1)}/{cap}', test: cases.season },
  history: { file: hub, from: 'chapter.weeks.map(week =>', to: 'chapter.weeks.slice(1).map(week =>', test: cases.season },
  recovery: { file: board, from: 'onClick={() => setReplaceOpen(true)}', to: 'onClick={() => { game.replaceRecovery(); setReplaceOpen(true); }}', test: cases.recovery },
  meter: { file: match, from: 'aria-valuenow={meter.charge}', to: 'aria-valuenow={0}', test: cases.meter },
  window: { file: match, from: 'meter.window * 200', to: 'meter.window * 100', test: cases.meter },
  close: { file: match, from: 'const meter = courtShotMeter(match, player.id), target =', to: 'const meter = { ...courtShotMeter(match, player.id), window: (1.3 + player.attrs.shooting * .025) / 30 }, target =', test: cases.close },
  target: { file: match, from: 'Pass target: ${target.name}, marked by the dashed ring.', to: 'Pass target: ${player.name}, marked by the dashed ring.', test: cases.meter },
  box: { file: match, from: '<td>{row.stats.points}</td>', to: '<td>{row.stats.points + 1}</td>', test: cases.box },
  consequences: { file: hub, from: 'lastWeek.afterMatch[key] - lastWeek.beforeMatch.resources[key]', to: 'lastWeek.afterMatch[key] - lastWeek.beforeMatch.resources[key] + 1', test: cases.box },
  player: { file: renderer, from: 'ctx.translate(Math.round(spot.x), Math.round(spot.y))', to: 'ctx.translate(Math.round(spot.x) + 5, Math.round(spot.y))', test: cases.geometry },
  ball: { file: renderer, from: 'projection.point(match.ball.x, match.ball.y, match.ball.z)', to: 'projection.point(match.ball.x, match.ball.y, 0)', test: cases.geometry },
  rim: { file: renderer, from: 'const rim = point(basket.x, basket.y, COURT_RIM_HEIGHT);', to: 'const rim = point(basket.x, basket.y, 0);', test: cases.geometry },
  arc: { file: renderer, from: 'worldCircle(basket.x, basket.y, COURT_THREE_POINT_DISTANCE)', to: 'worldCircle(basket.x, basket.y, COURT_THREE_POINT_DISTANCE * .8)', test: cases.geometry },
  targetRing: { file: renderer, from: 'ctx.setLineDash(player.id === targetId ? [3, 3] : []);', to: 'ctx.setLineDash([]);', test: cases.meter },
  redraw: { file: canvas, from: 'const draw = () => {\n      const match = matchRef.current;', to: 'const frozen = matchRef.current;\n    const draw = () => {\n      const match = frozen;', test: cases.geometry },
  motion: { file: renderer, from: 'moving && !reducedMotion ? Math.sin(stride * 5) * 1.4 : 0', to: 'moving ? Math.sin(stride * 5) * 1.4 : 0', test: cases.motion },
};
const control = process.env.COURT_LIFE_PRESENTATION_CONTROL || '', count = Object.keys(cases).length;
assert(!control || control === 'all' || control in controls, 'Known Court Life presentation fault');
const out = path.resolve(process.env.COURT_LIFE_PRESENTATION_ARTIFACTS || path.join(root, 'court-life-artifacts/presentation'));
await mkdir(out, { recursive: true });
if (control === 'all') {
  const results = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, COURT_LIFE_PRESENTATION_CONTROL: name, COURT_LIFE_PRESENTATION_ARTIFACTS: out }, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(out, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} Court Life presentation ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCourtLifePresentation')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(out, 'summary.json'), JSON.stringify(results, null, 2));
  assert(results.every(row => row.passed), 'All presentation outcome and effective fault gates pass');
  console.log(`simCourtLifePresentation all: ${count} actual outcomes and ${Object.keys(controls).length} effective faults passed.`);
  process.exit(0);
}
const digest = value => createHash('sha256').update(value).digest('hex');
const siblings = [board, hub, match, canvas, 'src/components/court-life/CourtLifeControls.tsx', renderer];
const held = [...siblings, 'src/hooks/useCourtLife.ts', 'src/lib/courtLife.ts', 'src/lib/courtLifeCareer.ts', 'src/data/courtLifeWorld.ts', testFile, 'scripts/simCourtLifePresentation.mjs'];
async function hashes() {
  const result = {};
  for (const file of held) {
    const bytes = await readFile(path.join(root, file));
    result[file] = digest(bytes);
  }
  return result;
}
const before = await hashes(), env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(out, `${control || 'normal'}-report.json`);
let folder;
const copies = [];
try {
  if (control) {
    const spec = controls[control];
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/court-life-presentation-'));
    const aliases = {}, receipts = [];
    for (const file of siblings) {
      const original = (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
      let changed = original;
      if (file === spec.file) {
        assert.equal(original.split(spec.from).length - 1, 1, 'Fault binds exactly one executable source anchor');
        changed = original.replace(spec.from, spec.to); assert.notEqual(changed, original, 'The copied fault changes real source');
        await writeFile(path.join(out, `${control}-mutation.json`), JSON.stringify({ control, file, from: spec.from, to: spec.to, anchorCount: 1, originalSha256: digest(original), changedSha256: digest(changed), test: spec.test }, null, 2));
      }
      const copy = path.join(folder, path.basename(file)); copies.push(copy); await writeFile(copy, changed);
      await writeFile(path.join(out, `${control}-${path.basename(file)}.txt`), changed);
      aliases['@/' + file.slice(4).replace(/\.tsx?$/, '')] = copy;
      receipts.push({ file, changed: changed !== original, originalSha256: digest(original), copiedSha256: digest(changed) });
    }
    assert.equal(receipts.filter(row => row.changed).length, 1, 'Only the named copied source is changed');
    await writeFile(path.join(out, `${control}-copies.json`), JSON.stringify(receipts, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, cases.independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); await writeFile(path.join(out, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Actual mounted presentation runner completed');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runtime failures earn no fault credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, count); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, count - 2);
    const intended = rows.find(row => row.title === controls[control].test); assert.equal(intended?.status, 'failed');
    const failure = intended.failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, '');
    assert.match(failure, /AssertionError:|Error: expect\(element\)/);
    assert.equal(rows.find(row => row.title === cases.independent)?.status, 'passed');
    console.log(`simCourtLifePresentation ${control}: mapped outcome rejected changed source; independent engine replay passed.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, count); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log(`simCourtLifePresentation: ${count} actual outcomes passed.`);
  }
} finally {
  for (const copy of copies) await rm(copy, { force: true }); if (folder) await rmdir(folder);
  const after = await hashes(); await writeFile(path.join(out, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before, `All ${held.length} source files remain unchanged`);
}
