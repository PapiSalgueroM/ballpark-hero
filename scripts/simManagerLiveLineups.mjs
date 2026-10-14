/* Actual pure-reader outcomes and executable copied-source controls, remote CI only. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Live lineup proof requires remote offline CI.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Release BE join (Round BEG): CM_HT_PARENT_REF names the tree without this packet on a newer core (the BE join passes the first parent of its m6 merge); 082fc277 on the packet branch. */
const PARENT = process.env.CM_HT_PARENT_REF || '082fc2774c8aa9f919c14efa33bfc3fbfc599597', READER = 'src/lib/clubManagerLiveLineups.ts';
const CORE = 'src/lib/clubManager.ts', TEST = 'src/test/managerLiveLineups.test.ts';
const titles = [
  'actual starting sides keep slot identities and OVR',
  'a level played side starts at6.4 and a not-entered player has NR',
  'a recorded goal changes only its scorer and current team base',
  'an equalizer restores the draw base on both sides',
  'both own-goal representations change score without scorer credit',
  'future lines and assist metadata cannot change an earlier view',
  'explicit added-time cutoffs apply to every timed line',
  'an actual own substitution keeps its starter and entered row clocks',
  'opposition substitutions use only the saved entered bench snapshot',
  'played cards and injuries preserve their actual status clocks',
  'missing and ambiguous opponent history stays honestly unavailable',
  'JSON reload and reading preserve complete state and final settlement inputs',
].map(title => 'live lineup reader: ' + title);
const causes = [
  'actual live starting identities or OVR changed', 'neutral provisional grade or NR is false',
  'recorded live goal grade is false', 'live equalizer grade is false', 'live own goal was falsely credited to a player',
  'live lineup reader leaked future or assist information', 'live lineup reader crossed the added-time cutoff',
  'actual own substitution identity or time is false', 'opposition substitution lost its saved identity',
  'live card or injury status crossed its cutoff', 'missing or ambiguous live identity was fabricated',
  'live lineup display changed the saved match or final settlement',
];
const controls = [
  { name: 'future-goals', faults: [0, 1, 2, 3, 4, 5, 6], edits: [
    ["  const mine = [...(live.h1My ?? []), ...(live.h2My ?? [])].filter(by);", "  const mine = [...(live.h1My ?? []), ...(live.h2My ?? [])];"],
    ["  const theirs = [...(live.h1Opp ?? []), ...(live.h2Opp ?? [])].filter(by);", "  const theirs = [...(live.h1Opp ?? []), ...(live.h2Opp ?? [])];"],
  ] },
  { name: 'own-goals', faults: [4], edits: [
    ['mine.filter(goal => goal.id === id && !goal.og)', 'mine.filter(goal => goal.id === id)'],
    ['theirs.filter(goal => goal.name === row.name && !goal.og)', 'theirs.filter(goal => goal.name === row.name)'],
  ] },
  { name: 'ovr-grade', faults: [1, 2, 3, 4, 6], edits: [['base + goals * 0.9', 'row.ovr ?? 0']] },
  { name: 'future-identity', faults: [5, 8], edits: [['  for (const sub of theirSubs) {', '  for (const sub of live.oppSubs ?? []) {']] },
  { name: 'unknown-grade', faults: [10], edits: [
    ['  if (!identified || forGoals === undefined || againstGoals === undefined) return;',
      '  if (!identified || forGoals === undefined || againstGoals === undefined) { row.grade = 6.4; row.gradeReason = null; return; }'],
  ] },
  { name: 'reader-draw', faults: Array.from({ length: 12 }, (_, index) => index), cause: 'live lineup reader consumed match RNG',
    edits: [['  const live = career.live;', '  Math.random();\n  const live = career.live;']] },
  { name: 'reader-clock', faults: Array.from({ length: 12 }, (_, index) => index), cause: 'live lineup reader read an external clock',
    edits: [['  const live = career.live;', '  Date.now();\n  const live = career.live;']] },
  { name: 'reader-write', faults: Array.from({ length: 12 }, (_, index) => index), cause: 'live lineup reader changed its complete input',
    edits: [['  const live = career.live;', '  career.clubName += " [copied source control]";\n  const live = career.live;']] },
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const OUT = process.env.CM_HT_LINEUPS_OUT ? path.resolve(process.env.CM_HT_LINEUPS_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'manager-live-lineups-'));
assert(OUT !== ROOT && OUT !== path.join(ROOT, 'dist') && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep));
const DIR = path.join(OUT, 'semantic'); fs.mkdirSync(DIR, { recursive: true });
assert(!fs.existsSync(path.join(DIR, 'report.json')), 'Refuse to replace semantic proof.');
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const scratch = fs.mkdtempSync(path.join(ROOT, 'tmp/live-lineups-'));
const files = [CORE, 'src/lib/clubManagerClock.ts', READER, 'src/components/club-manager/HalftimeLineups.tsx',
  'src/components/club-manager/HalftimeScreen.tsx', TEST, 'scripts/simManagerLiveLineups.mjs',
  'src/test/managerHalftimeLineups.test.tsx', 'scripts/simManagerHalftimeLineups.mjs', '.github/workflows/manager-halftime-lineups.yml'];
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), parentRef: PARENT,
  sources: [], compiled: [], arms: [], sourceHeld: false, status: 'running' };
const write = () => fs.writeFileSync(path.join(DIR, 'report.json'), JSON.stringify(report, null, 2) + '\n');
try {
  const sources = new Map(files.map(file => [file, fs.readFileSync(path.join(ROOT, file), 'utf8')]));
  for (const [file, body] of sources) {
    const before = path.join(DIR, 'before', file); fs.mkdirSync(path.dirname(before), { recursive: true }); fs.writeFileSync(before, body);
    report.sources.push({ file, sha256: hash(body), before: path.relative(OUT, before).replaceAll('\\', '/') });
  }
  for (const file of [CORE, 'src/lib/clubManagerClock.ts']) assert.equal(sources.get(file),
    execFileSync('git', ['show', PARENT + ':' + file], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }), file + ': whole parent must stay held.');
  write();
  const esbuild = await import('esbuild'), engine = path.join(scratch, 'engine.mjs');
  await esbuild.build({ entryPoints: [path.join(ROOT, CORE)], outfile: engine, bundle: true, format: 'esm', platform: 'node',
    alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
  for (const file of ['engine.mjs', 'engine-a.mjs', 'engine-b.mjs']) {
    if (file !== 'engine.mjs') fs.copyFileSync(engine, path.join(scratch, file));
    fs.copyFileSync(engine, path.join(DIR, file));
    report.compiled.push({ file, sha256: hash(fs.readFileSync(path.join(DIR, file))), byteIdenticalEngine: true });
  }
  const original = sources.get(READER);
  for (const spec of [{ name: 'normal', faults: [], edits: [] }, ...controls]) {
    const arm = path.join(DIR, spec.name); fs.mkdirSync(arm);
    let adopted = original; const changes = [];
    for (const [anchor, replacement] of spec.edits) {
      assert.equal(adopted.split(anchor).length - 1, 1, spec.name + ': one executable fault anchor required.');
      const offset = adopted.indexOf(anchor); adopted = adopted.slice(0, offset) + replacement + adopted.slice(offset + anchor.length);
      changes.push({ anchor, replacement, offset });
    }
    let inverse = adopted;
    for (const item of [...changes].reverse()) {
      assert.equal(inverse.slice(item.offset, item.offset + item.replacement.length), item.replacement);
      inverse = inverse.slice(0, item.offset) + item.anchor + inverse.slice(item.offset + item.replacement.length);
    }
    assert.equal(inverse, original); if (spec.edits.length) assert.notEqual(adopted, original);
    fs.writeFileSync(path.join(arm, 'reader.loaded.ts'), adopted); fs.writeFileSync(path.join(arm, 'reader.inverse.ts'), inverse);
    const row = { name: spec.name, changes, adoptedSha256: hash(adopted), inverseSha256: hash(inverse), faults: spec.faults };
    report.arms.push(row); write();
    const result = await esbuild.build({ entryPoints: [path.join(ROOT, READER)], outfile: path.join(scratch, 'reader-' + spec.name + '.mjs'),
      bundle: true, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error', metafile: true,
      plugins: [{ name: 'actual-pure-reader', setup(build) { build.onLoad({ filter: /clubManagerLiveLineups\.ts$/ },
        args => path.resolve(args.path) === path.join(ROOT, READER) ? { contents: adopted, loader: 'ts', resolveDir: path.dirname(args.path) } : undefined); } }] });
    assert(Object.keys(result.metafile.inputs).every(file => !/clubManager\.ts$|soccerCareer|HalftimeScreen/.test(file)), 'Reader value graph must contain no game engine or screen.');
    fs.writeFileSync(path.join(arm, 'metafile.json'), JSON.stringify(result.metafile, null, 2));
    const compiled = path.join(scratch, 'reader-' + spec.name + '.mjs'); fs.copyFileSync(compiled, path.join(arm, 'reader.mjs'));
    row.compiledSha256 = hash(fs.readFileSync(compiled));
    const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--reporter=verbose',
      '--reporter=json', '--outputFile.json=' + path.join(arm, 'unit.json')], { cwd: ROOT, encoding: 'utf8', timeout: 240000,
      maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CM_HT_CORE: engine, CM_HT_READER: compiled,
        CM_HT_RESUME_A: path.join(scratch, 'engine-a.mjs'), CM_HT_RESUME_B: path.join(scratch, 'engine-b.mjs'), FORCE_COLOR: '0', NO_COLOR: '1' } });
    const output = (child.stdout || '') + (child.stderr || ''); fs.writeFileSync(path.join(arm, 'unit.log'), output);
    row.child = { status: child.status, signal: child.signal, error: child.error?.message || null }; write();
    assert(!child.error && !child.signal && child.status !== null);
    assert(!/Unhandled (?:Errors?|Rejection)|Test timed out|ERR_MODULE_NOT_FOUND|Cannot find module|SyntaxError:|ReferenceError:|TypeError:/.test(output), 'No setup or unrelated failure credit.');
    const raw = JSON.parse(fs.readFileSync(path.join(arm, 'unit.json'), 'utf8')), cases = raw.testResults.flatMap(file => file.assertionResults);
    assert.equal(raw.testResults.length, 1); assert(!raw.testResults[0].message); assert.equal(raw.numTotalTests, 12); assert.equal(raw.numPendingTests, 0);
    assert.deepEqual(cases.map(item => item.title).sort(), [...titles].sort()); assert(cases.every(item => ['passed', 'failed'].includes(item.status)));
    const failed = cases.filter(item => item.status === 'failed');
    assert.deepEqual(failed.map(item => item.title).sort(), spec.faults.map(index => titles[index]).sort());
    for (const item of failed) {
      const cause = spec.cause || causes[titles.indexOf(item.title)];
      assert(item.failureMessages.length && item.failureMessages.every(message => message.startsWith('AssertionError: ' + cause + ': expected false to be true')));
    }
    assert.equal(raw.numFailedTests, spec.faults.length); assert.equal(raw.numPassedTests, 12 - spec.faults.length);
    assert.equal(child.status, spec.faults.length ? 1 : 0); row.passed = raw.numPassedTests; row.failed = raw.numFailedTests; write();
    console.log('Actual live reader ' + spec.name + ': ' + row.passed + ' passes, ' + row.failed + ' exact owned faults; raw child/source/inverse retained.');
  }
  for (const [file, body] of sources) assert.equal(fs.readFileSync(path.join(ROOT, file), 'utf8'), body);
  report.sourceHeld = true; report.status = 'passed'; write();
  console.log('simManagerLiveLineups:12 normal semantic outcomes and eight effective copied-source controls qualified.');
  console.log('Three byte-identical actual engines retain complete final-state/id/input equality; pure reader graph imports no game engine.');
} catch (error) { report.status = 'failed'; report.error = error?.stack || String(error); write(); throw error;
} finally { fs.rmSync(scratch, { recursive: true, force: true }); }
