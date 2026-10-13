/* Remote-only qualification of this pinned cold source's replay navigation.
   The original missing matchdays are not a permanent picker contract. Saved
   fixtures and assertions stay actual; the copied observer only reads DOM. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Replay proof requires remote offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEST = 'src/test/seasonCentreOwnGoals.test.tsx', PARENT = '42a7f7c999cb13bb24bf0992537e4ff84b112f6d';
const ACCEPTED = '8974536d80c1c461b1cddebb3fc3dfc487c410b7';
const ORIGINAL = '  /* a moment taken the other way can move a poster (the day the title is won) onto this matchday: step past it */\n'
  + '  const past = container.querySelector(`[data-matchday="${spot.md}"]`) ? null : container.querySelector<HTMLButtonElement>(\'[data-centre-bar] button\');\n'
  + '  if (past) await act(async () => { fireEvent.click(past); });\n';
const CURRENT = '  /* a moment taken the other way can move a poster (the day the title is won) onto this matchday: step past it.\n'
  + '     Round 1327: the keyed event deck moves the seeded stream this search walks, and the save it finds now puts more\n'
  + '     than one screen in front of the matchday, so step past up to three, stopping as soon as the matchday shows. */\n'
  + '  for (let n = 0; n < 3 && !container.querySelector(`[data-matchday="${spot.md}"]`); n += 1) {\n'
  + '    const past = container.querySelector<HTMLButtonElement>(\'[data-centre-bar] button\');\n'
  + '    if (!past) break;\n'
  + '    await act(async () => { fireEvent.click(past); });\n'
  + '  }\n';
const NAMES = [
  'found its three saves in the seeded careers',
  'prints an own goal for side "us" with who did it and the club that got it, the same live, held and replayed',
  'prints an own goal for side "them" with who did it and the club that got it, the same live, held and replayed',
  'leaves a return match alone in a replay exactly as it does live (the moments are planned, offered or not)',
  'hands back the same game for the same question, so the pitch does not take it for a changed match',
  'says whose own goal it was under the pitch, and rings him when it was his',
  'says nothing of the kind for an ordinary goal against',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const app = ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerRealismA.ts', 'src/components/soccer-career/SoccerSeasonCentre.tsx',
  'src/components/soccer-career/useSoccerMoments.tsx', 'src/components/season-centre/SeasonCentre.tsx', 'src/components/season-centre/MatchClock.tsx',
  'src/lib/season/core.ts', 'src/lib/season/soccer.ts', 'src/lib/season/soccerEvents.ts', 'src/lib/season/momentsSave.ts',
  'src/lib/season/soccerMoments.ts', 'src/lib/soccerSeasonCalendar.ts', 'src/lib/soccerSeasonCompetitions.ts',
  'src/lib/ownGoalRule.ts', 'src/lib/season/resume.ts', 'src/components/season-centre/resumeStore.ts'];
const files = [...app, TEST, 'src/test/setup.ts', 'vitest.config.ts', 'scripts/qa/compareSoccerCareerColdReplay.mjs', '.github/workflows/soccer-career-cold-context.yml'];
const sources = new Map(files.map(file => [file, fs.readFileSync(path.join(ROOT, file), 'utf8')]));
const OUT = process.env.CAREER_COLD_REPLAY_OUT ? path.resolve(process.env.CAREER_COLD_REPLAY_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-career-cold-replay-'));
assert(OUT !== ROOT && OUT !== path.join(ROOT, 'dist') && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep), 'Replay evidence must stay outside the actual build');
fs.mkdirSync(OUT, { recursive: true });
assert(!fs.existsSync(path.join(OUT, 'source.json')), 'Refuse to replace retained replay evidence');
fs.mkdirSync(path.join(OUT, 'before'), { recursive: true });
for (const [file, text] of sources) {
  const target = path.join(OUT, 'before', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text);
}
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/soccer-cold-replay-'));
let progress = { parentAppRef: PARENT, acceptedMethodRef: ACCEPTED, arms: [] };
function receipt(extra = {}) {
  progress = { ...progress, ...extra };
  const sourceReceipts = [...sources].map(([file, before]) => ({ file, beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
  fs.writeFileSync(path.join(OUT, 'source.json'), JSON.stringify({ ...progress, sourceReceipts }, null, 2) + '\n');
}
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Actual Git source receipt must finish'); return result.stdout;
}
function unique(source, anchor, replacement) {
  assert.equal(source.split(anchor).length - 1, 1, 'Every actual method or observer anchor must be unique');
  const after = source.replace(anchor, replacement); assert.notEqual(after, source);
  assert.equal(after.replace(replacement, anchor), source, 'One insertion inverse must restore every source byte'); return after;
}
function observe(source, arm) {
  const edits = [];
  function edit(anchor, replacement) { source = unique(source, anchor, replacement); edits.push({ anchor, replacement }); }
  const before = source;
  const imports = "import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';\n";
  edit(imports, imports + "import { appendFileSync as coldReplayAppend } from 'node:fs';\n");
  const ready = '  await act(async () => {});\n';
  edit(ready, ready + `  const coldReplayRecord = (at: string) => coldReplayAppend(process.env.SC_COLD_REPLAY_TAPE!, JSON.stringify({
    at, way, targetMd: spot.md, key: spot.key,
    role: spot === found.us ? 'us' : spot === found.them ? 'them' : spot === found.guarded ? 'guarded' : null,
    stageHtml: container.querySelector('[data-centre-stage]')?.outerHTML ?? null,
    barHtml: container.querySelector('[data-centre-bar]')?.outerHTML ?? null,
    kickoffHtml: container.querySelector('[data-kickoff]')?.outerHTML ?? null,
    matchdays: [...container.querySelectorAll('[data-matchday]')].map(el => el.getAttribute('data-matchday')),
    cups: [...container.querySelectorAll('[data-centre-calendar-cup]')].map(el => ({ id: el.getAttribute('data-centre-calendar-cup'), revealed: el.getAttribute('data-cup-revealed'), text: el.textContent })),
    poster: container.querySelector('[data-poster]')?.getAttribute('data-poster') ?? null,
    ...(at === 'ready' ? { fixture: { career, row: spot.row, marked: spot.marked, planned: spot.planned, names: spot.names, ledger } } : {}),
  }) + '\\n');
  coldReplayRecord('ready');
`);
  const kick = '  await act(async () => { fireEvent.click(kick); });\n';
  edit(kick, "  coldReplayRecord('before-kick');\n" + kick + "  coldReplayRecord('after-kick');\n");
  if (arm === 'original') {
    const step = '  if (past) await act(async () => { fireEvent.click(past); });\n';
    edit(step, "  if (past) {\n    coldReplayRecord('before-step-1');\n    await act(async () => { fireEvent.click(past); });\n    coldReplayRecord('after-step-1');\n  }\n");
  } else {
    const step = '    await act(async () => { fireEvent.click(past); });\n';
    edit(step, "    coldReplayRecord(`before-step-${n + 1}`);\n" + step + "    coldReplayRecord(`after-step-${n + 1}`);\n");
  }
  const day = '  const day = container.querySelector(`[data-matchday="${spot.md}"]`);\n';
  edit(day, day + "  coldReplayRecord('final');\n");
  let inverse = source;
  for (const { anchor, replacement } of [...edits].reverse()) inverse = unique(inverse, replacement, anchor);
  assert.equal(inverse, before, 'Removing only read-only recorder insertions must restore the whole actual test');
  return { source, edits, beforeSha256: sha(before), observedSha256: sha(source), inverseSha256: sha(inverse) };
}

try {
  const sourceHead = git(['rev-parse', 'HEAD']).trim(), parent = git(['show', `${PARENT}:${TEST}`]), accepted = git(['show', `${ACCEPTED}:${TEST}`]);
  fs.writeFileSync(path.join(OUT, 'seasonCentreOwnGoals.parent.tsx'), parent);
  fs.writeFileSync(path.join(OUT, 'seasonCentreOwnGoals.accepted-H1327.tsx'), accepted);
  const candidate = unique(parent, ORIGINAL, CURRENT);
  assert.equal(candidate, sources.get(TEST), 'Only the already accepted navigation hunk may change the current whole test');
  assert.equal(candidate, accepted, 'The whole current test must equal the accepted H1327 test');
  assert.equal(unique(candidate, CURRENT, ORIGINAL), parent, 'The method inverse restores the whole held parent test');
  const parentBindings = app.map(file => {
    const before = git(['show', `${PARENT}:${file}`]), current = sources.get(file);
    if (file === 'src/lib/soccerCareerRealismA.ts') {
      const gate = '  if (state.pendingEvents.some(event => event.id === 426)) {\n    push({ id: 426,';
      const originalGate = '  if (pro >= 1) {\n    push({ id: 426,';
      assert.equal(unique(current, gate, originalGate), before, 'Only the qualified cold gate may change the whole actual app source');
    } else assert.equal(current, before, 'Actual planner page and every held app binding must equal the parent');
    return { file, parentSha256: sha(before), candidateSha256: sha(current) };
  });
  receipt({ sourceHead, parentBindings, method: { original: ORIGINAL, current: CURRENT, parentSha256: sha(parent), acceptedSha256: sha(accepted), candidateSha256: sha(candidate) } });
  const esbuild = await import('esbuild'), runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs'); assert(fs.existsSync(runner));
  for (const [arm, plain] of [['original', parent], ['current', candidate]]) {
    const dir = path.join(OUT, arm); fs.mkdirSync(dir, { recursive: true });
    const observed = observe(plain, arm), testFile = path.join(tmp, `${arm}.test.tsx`), configFile = path.join(tmp, `${arm}.config.mjs`);
    const relativeTest = path.relative(ROOT, testFile).replaceAll('\\', '/');
    const config = `import base from '../../vitest.config.ts';\nexport default { ...base, test: { ...base.test, include: [${JSON.stringify(relativeTest)}] } };\n`;
    fs.writeFileSync(testFile, observed.source); fs.writeFileSync(configFile, config);
    fs.writeFileSync(path.join(dir, 'test.plain.tsx'), plain); fs.writeFileSync(path.join(dir, 'test.observed.tsx'), observed.source);
    fs.writeFileSync(path.join(dir, 'vitest.config.mjs'), config);
    const compiled = [];
    for (const [kind, text] of [['plain', plain], ['observed', observed.source]]) {
      const result = await esbuild.transform(text, { loader: 'tsx', format: 'esm', target: 'es2020' });
      const file = `test.${kind}.mjs`; fs.writeFileSync(path.join(dir, file), result.code); compiled.push({ file, sha256: sha(result.code) });
    }
    const tapeFile = path.join(dir, 'stages.jsonl'), reportFile = path.join(dir, 'unit.json'); fs.writeFileSync(tapeFile, '');
    const row = { arm, observed, configSha256: sha(config), compiled, tapePath: `${arm}/stages.jsonl` };
    progress.arms.push(row); receipt();
    const result = spawnSync(process.execPath, [runner, 'run', relativeTest, '--config', configFile, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
      { cwd: ROOT, env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', SC_COLD_REPLAY_TAPE: tapeFile }, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
    const output = (result.stdout || '') + (result.stderr || ''); fs.writeFileSync(path.join(dir, 'output.log'), output);
    Object.assign(row, { exitCode: result.status, processSignal: result.signal, processError: result.error?.message || null,
      tapeSha256: sha(fs.readFileSync(tapeFile)), outputSha256: sha(output), reportSha256: fs.existsSync(reportFile) ? sha(fs.readFileSync(reportFile)) : null }); receipt();
    assert(!result.error && result.status !== null && !result.signal, 'Actual runner must finish inside its disclosed bound');
    assert(!SETUP.test(output) && fs.existsSync(reportFile), 'No setup or missing-report credit');
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); assert.equal(report.testResults.length, 1);
    const file = report.testResults[0]; assert(file.name.replaceAll('\\', '/').endsWith('/' + relativeTest) && !file.message, 'Exactly the actual copied unit must load');
    const cases = file.assertionResults; assert.deepEqual(cases.map(test => test.title).sort(), [...NAMES].sort());
    assert.equal(report.numTotalTests, 7); assert.equal(report.numPendingTests, 0); assert(cases.every(test => ['passed', 'failed'].includes(test.status)));
    const faults = arm === 'original' ? [2, 3] : [], failed = cases.filter(test => test.status === 'failed');
    assert.deepEqual(failed.map(test => test.title).sort(), faults.map(index => NAMES[index]).sort());
    for (const test of failed) {
      const md = test.title === NAMES[2] ? 18 : 28;
      assert(test.failureMessages.length > 0 && test.failureMessages.every(message => message.startsWith(`Error: seasonCentreOwnGoals: matchday ${md} is not on the stage (live)`)), 'Original method must fail only at its exact missing stage');
    }
    assert.equal(report.numFailedTests, faults.length); assert.equal(report.numPassedTests, 7 - faults.length); assert.equal(result.status, faults.length ? 1 : 0);
    const tapes = fs.readFileSync(tapeFile, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    const journeys = [];
    for (const tape of tapes) { if (tape.at === 'ready') journeys.push([]); assert(journeys.length > 0); journeys[journeys.length - 1].push(tape); }
    fs.writeFileSync(path.join(dir, 'stages.json'), JSON.stringify(journeys, null, 2) + '\n');
    Object.assign(row, { passed: report.numPassedTests, failed: report.numFailedTests, journeys: journeys.length,
      finalStages: journeys.map(journey => { const last = journey[journey.length - 1]; return { key: last.key, targetMd: last.targetMd, way: last.way, role: last.role, matchdays: last.matchdays, cups: last.cups, poster: last.poster, records: journey.length }; }) }); receipt();
    assert.equal(journeys.length, arm === 'original' ? 6 : 11, 'Every existing live held and replay path must be recorded');
    for (const journey of journeys) {
      const ready = journey[0], last = journey[journey.length - 1]; assert.equal(last.at, 'final');
      assert(journey.every(tape => tape.key === ready.key && tape.targetMd === ready.targetMd && tape.way === ready.way && tape.role === ready.role));
      assert(ready.fixture.career && ready.fixture.row && ready.fixture.marked.games.length > ready.targetMd);
      assert.equal(ready.fixture.marked.key, ready.key);
      const missing = arm === 'original' && ready.way === 'live' && ['them', 'guarded'].includes(ready.role);
      if (missing) assert.equal(ready.targetMd, ready.role === 'them' ? 18 : 28, 'Pinned fixture must match the actual first failed packet');
      assert.equal(last.matchdays.includes(String(last.targetMd)), !missing, 'Read-only final DOM must match the exact causal outcome');
      assert(journey.filter(tape => tape.at.startsWith('after-step-')).length <= (arm === 'original' ? 1 : 3));
    }
    row.fixtureHashes = journeys.map(journey => ({ key: journey[0].key, way: journey[0].way, targetMd: journey[0].targetMd, sha256: sha(JSON.stringify(journey[0].fixture)) })); receipt();
  }
  const [original, current] = progress.arms;
  for (const fixture of original.fixtureHashes) assert(current.fixtureHashes.some(row => JSON.stringify(row) === JSON.stringify(fixture)), 'Both navigation arms must read the same complete actual selected fixture');
  for (const [file, before] of sources) assert.equal(fs.readFileSync(path.join(ROOT, file), 'utf8'), before, 'All actual source must stay held');
  receipt({ status: 'complete' });
  console.log('Actual existing unit: seven names and every original assertion held; seeded search stays 60 careers by 600 steps.');
  console.log('Original one-screen method: five passed; two exact missing-stage faults at live 18 and 28; pending 0; child exit 1.');
  console.log('Accepted H1327 three-screen method: seven passed; zero faults; pending 0; child exit 0.');
  console.log('Read-only stage tapes: six original and eleven current journeys; complete actual fixtures agree across arms.');
  console.log(`Actual source held: ${sources.size} before copies; ${parentBindings.length} whole parent app bindings; four physical test transforms.`);
  console.log('Whole method inverse restores the parent test; whole current test equals the accepted H1327 source.');
  console.log('Every raw source, child status, log, JSON and DOM tape retained before classification; no app or assertion edits.');
  console.log('compareSoccerCareerColdReplay pinned qualification: green.');
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
