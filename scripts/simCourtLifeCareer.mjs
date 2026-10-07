/* Career outcomes use the actual court engine. Every copied control retains
   its executable change, source hashes, report and independent passing case.
   COURT_LIFE_CAREER_CONTROL=all runs every normal and copied gate serially. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '..');
const career = 'src/lib/courtLifeCareer.ts', world = 'src/data/courtLifeWorld.ts', testFile = 'src/test/courtLifeCareer.test.ts';
const schedule = 'creates balanced archetypes and six true home away rounds for every crew';
const actions = 'applies the exact visible action deltas and spends only two affordable time blocks';
const decisions = 'makes contextual life decisions once with honest costs and persistent consequences';
const effects = 'changes actual shot windows stamina and inbound decisions through preparation and earned roles';
const season = 'reconciles a complete season from twelve actual engine fixtures without duplicate progress';
const chapters = 'claims each completed season once and carries actual attributes resources and history forward';
const arithmetic = 'scores the stated season arithmetic with caps draws and turnovers';
const restore = 'restores an active match paused with its exact RNG and neutral continuation';
const corrupt = 'rejects corrupt unknown and inconsistent saves while leaving the supplied bytes untouched';
const independent = 'keeps separately created careers isolated with their own sealed world';
const controls = {
  balanced: { file: world, from: 'attrs: { finishing: 78, shooting: 54, passing: 54, defense: 54, conditioning: 60 }', to: 'attrs: { finishing: 79, shooting: 54, passing: 54, defense: 54, conditioning: 60 }', test: schedule, baseline: actions },
  schedule: { from: '[[3, 0], [2, 1]]', to: '[[0, 1], [2, 3]]', test: schedule },
  training: { from: 'attrs: { [action.attribute]: growth }', to: 'attrs: { [action.attribute]: 0 }', test: actions },
  growth: { from: 'attrs[action.attribute] >= 85 ? 1 : 2', to: 'attrs[action.attribute] >= 85 ? 2 : 2', test: actions },
  blocks: { from: 'next.blocksLeft -= 1;', to: 'next.blocksLeft = 0;', test: actions },
  affordability: { from: "(change.credits ?? 0) + career.resources.credits < 0 ? 'Not enough credits.' : null", to: 'null', test: actions },
  decisionOnce: { from: "career.decision ? 'You already made this choice.' : preview.reason", to: 'false ? "You already made this choice." : preview.reason', test: decisions },
  decisionCost: { file: world, from: 'change: { condition: -10, trust: 8, attrs: { passing: 1 } }', to: 'change: { condition: 0, trust: 8, attrs: { passing: 1 } }', test: decisions },
  condition: { from: 'player.condition = career.resources.condition;', to: 'player.condition = 100;', test: effects },
  role: { from: "name: 'Floor leader', config: { inboundPriority: 0.8, callPriority: 0.9 }", to: "name: 'Floor leader', config: { inboundPriority: 0.25, callPriority: 0.25 }", test: effects },
  chemistry: { from: '(career.resources.trust - 25) * 0.4', to: '(career.resources.trust - 25) * 0', test: effects },
  otherFixture: { from: 'simulateCourtMatch(careerMatchConfig(career, otherFixture))', to: 'simulateCourtMatch({ ...careerMatchConfig(career, otherFixture), seed: otherFixture.seed + 1 })', test: season },
  duplicate: { from: 'const results = [...career.results, compactResult(match), compactResult(otherMatch)];', to: 'const results = [...career.results, compactResult(match), compactResult(match), compactResult(otherMatch)];', test: season },
  history: { from: 'fixtureId: fixture.id, preparation: copy(career.preparation),', to: 'fixtureId: fixture.id, preparation: [],', test: season },
  claim: { from: 'career.chapters.find(row => !row.claimed)', to: 'career.chapters.find(row => true)', test: chapters },
  chapter: { from: 'next.results = []; next.weeks = [];', to: 'next.results = []; next.weeks = []; next.chapters = [];', test: chapters },
  wins: { from: 'const wins = 50 * (line.wins + line.draws * 0.5) / 6;', to: 'const wins = 0;', test: arithmetic },
  scoring: { from: 'const scoring = 20 * Math.min(stats.points, 60) / 60;', to: 'const scoring = 0;', test: arithmetic },
  teamwork: { from: 'const teamwork = 20 * Math.min(2 * stats.assists + stats.steals + stats.blocks + stats.rebounds, 36) / 36;', to: 'const teamwork = 0;', test: arithmetic },
  security: { from: 'const security = 10 * Math.max(0, 1 - stats.turnovers / 18);', to: 'const security = 10;', test: arithmetic },
  paused: { from: 'value.activeMatch = { ...value.activeMatch, paused: true, match:', to: 'value.activeMatch = { ...value.activeMatch, paused: false, match:', test: restore },
  rng: { from: 'match: neutralizeCourtMatch(value.activeMatch.match)', to: 'match: { ...neutralizeCourtMatch(value.activeMatch.match), rngState: 1 }', test: restore },
  validation: { from: 'if (!validCareer(value)) return', to: 'if (false) return', test: corrupt },
};
const control = process.env.COURT_LIFE_CAREER_CONTROL || '';
assert.ok(!control || control === 'all' || control in controls, 'Known Court Life career control');
const evidence = path.resolve(process.env.COURT_LIFE_CAREER_ARTIFACTS || path.join(root, 'court-life-artifacts/career'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const results = [];
  for (const name of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root,
      env: { ...process.env, COURT_LIFE_CAREER_CONTROL: name, COURT_LIFE_CAREER_ARTIFACTS: evidence },
      encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || '');
    await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal;
    results.push({ control: name || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} career ${name || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simCourtLifeCareer')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(results, null, 2));
  assert.ok(results.every(row => row.passed), 'All career outcomes and controls pass; every gate was attempted');
  console.log(`simCourtLifeCareer all: ten outcomes and ${Object.keys(controls).length} effective controls, each with an independent passing baseline.`);
  process.exit(0);
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const heldFiles = [career, world, 'src/lib/courtLife.ts', testFile, 'scripts/simCourtLifeCareer.mjs'];
const before = {};
for (const file of heldFiles) { const bytes = await readFile(path.join(root, file)); before[file] = hash(bytes); }
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
let folder, copyFile;
try {
  if (control) {
    const spec = controls[control], file = spec.file || career;
    const original = (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
    const count = original.split(spec.from).length - 1;
    assert.equal(count, 1, `${control} binds one executable anchor`);
    const changed = original.replace(spec.from, spec.to); assert.notEqual(changed, original);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/court-life-career-'));
    copyFile = path.join(folder, path.basename(file)); await writeFile(copyFile, changed);
    await writeFile(path.join(evidence, `${control}-${path.basename(file)}.txt`), changed);
    await writeFile(path.join(evidence, `${control}-mutation.json`), JSON.stringify({ control, source: file, from: spec.from, to: spec.to,
      anchorCount: count, originalSha256: hash(original), changedSha256: hash(changed), test: spec.test }, null, 2));
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + file.slice(4).replace(/\.ts$/, '')]: copyFile });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, controls[control].baseline || independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Actual runner completes without interruption');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, 'Runtime faults earn no credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 10); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    const spec = controls[control], failed = rows.filter(row => row.status === 'failed');
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 8);
    assert.equal(failed.length, 1); assert.equal(failed[0].title, spec.test);
    assert.match(failed[0].failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, ''), /AssertionError:|Error: expect\(element\)/, 'Mapped assertion rejects the executable fault');
    assert.equal(rows.find(row => row.title === (spec.baseline || independent))?.status, 'passed');
    console.log(`simCourtLifeCareer ${control}: one mapped assertion rejected the copied fault, one independent case passed, eight intentional skips.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 10); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simCourtLifeCareer: ten real career outcomes pass, including twelve actual engine fixtures, exact preparation effects, earned roles, chapter history, score claims and paused RNG continuation.');
  }
} finally {
  if (copyFile) await rm(copyFile, { force: true });
  if (folder) await rmdir(folder);
  const after = {};
  for (const file of heldFiles) { const bytes = await readFile(path.join(root, file)); after[file] = hash(bytes); }
  await writeFile(path.join(evidence, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before, 'All career, engine, world and harness sources held');
}
console.log('simCourtLifeCareer: five source hashes held; copied mutations, SHA receipts and runtime reports retained.');
