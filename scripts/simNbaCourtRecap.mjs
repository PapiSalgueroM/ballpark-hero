import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = process.cwd();
const source = 'src/components/us-career/season/MiniBasketballCourt.tsx';
const original = fs.readFileSync(source, 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
const heldFiles = [source, 'src/components/us-career/season/UsSeasonCentre.tsx', 'src/components/us-career/season/UsSeasonCentreEntry.tsx', 'src/components/season-centre/MatchClock.tsx', 'src/lib/season/nba.ts', 'src/lib/season/us.ts', 'src/lib/season/core.ts', 'src/lib/nbaMyCareer.ts', 'src/lib/keyedRng.ts'];
const held = Object.fromEntries(heldFiles.map(file => [file, sha(fs.readFileSync(file))]));
const out = path.resolve(process.env.CAREER_VISUALS_OUT || 'career-visual-artifacts', 'nba-court');
fs.mkdirSync(out, { recursive: true });
const temp = fs.mkdtempSync(path.join(tmpdir(), 'dukb-nba-court-'));
fs.symlinkSync(path.join(root, 'node_modules'), path.join(temp, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
const report = { held, cases: [], complete: false };
const tests = 'src/test/nbaCourtRecap1517.test.tsx';
const faults = [
  {
    name: 'sideflip',
    old: 'const home = game.home ?',
    replacement: 'const home = !game.home ?',
    test: 'keeps an away team on the same scoreboard side as the actual clock',
  },
  {
    name: 'future',
    old: 'const [us, them] = scoreAt(game.events, shown);',
    replacement: 'const [us, them] = scoreAt(game.events, 48);',
    test: 'draws the same revealed recap when only future quarters and final player stats differ',
  },
  {
    name: 'rest',
    old: 'const hot = game.played && game.events.some(',
    replacement: 'const hot = game.events.some(',
    test: 'never highlights participation in a rested game, even if a hot event is supplied',
  },
];
function run(name, fault) {
  const env = { ...process.env };
  delete env.NO_DOUBLE_SWAP;
  const jsonFile = path.join(out, name + '.json');
  let copyHash = null;
  if (fault) {
    assert.equal(original.split(fault.old).length - 1, 1, name + ' has one exact product target');
    const copy = original.replace(fault.old, fault.replacement);
    assert.notEqual(copy, original, name + ' changes the actual source');
    const copyFile = path.join(temp, name + '.tsx');
    fs.writeFileSync(copyFile, copy);
    fs.writeFileSync(path.join(out, name + '.tsx'), copy);
    copyHash = sha(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/us-career/season/MiniBasketballCourt': copyFile });
  }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', tests, '--maxWorkers=1', '--minWorkers=1', '--reporter=json', '--outputFile=' + jsonFile];
  if (fault) args.push('-t', fault.test);
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout.log'), child.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr.log'), child.stderr || '');
  assert(!child.error && !child.signal, name + ' completes normally');
  const result = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const cases = result.testResults.flatMap(suite => suite.assertionResults);
  const selected = fault ? cases.filter(test => test.title === fault.test) : cases;
  assert.equal(result.numRuntimeErrorTestSuites ?? 0, 0, name + ' has no runtime suite error');
  if (fault) {
    assert.equal(selected.length, 1, name + ' selects exactly its intended outcome');
    assert.equal(child.status, 1, name + ' exits with the intended failure');
    assert.equal(result.numFailedTests, 1, name + ' has exactly one failed outcome');
    assert.equal(selected[0].status, 'failed');
    assert(selected[0].failureMessages.some(message => /AssertionError|expected|expect\(element\)/i.test(message.replace(/\u001b\[[0-9;]*m/g, ''))), name + ' fails on its actual assertion');
  } else {
    assert.equal(child.status, 0, 'Actual NBA court outcomes pass');
    assert.equal(result.numFailedTests, 0);
    assert.equal(cases.length, 19, 'All intended NBA court outcomes collect');
    assert(cases.every(test => test.status === 'passed'), 'Every actual outcome passes');
  }
  report.cases.push({ name, sourceHash: sha(original), copyHash, exit: child.status, tests: result.numTotalTests, failed: result.numFailedTests, selectedTitles: selected.map(test => test.title) });
  console.log(`NBA court: ${name}, ${selected.length} selected outcomes, ${result.numFailedTests} failures, expected exit ${child.status}.`);
}
try {
  run('actual');
  for (const fault of faults) run(fault.name, fault);
  report.complete = true;
} finally {
  for (const [file, hash] of Object.entries(held)) assert.equal(sha(fs.readFileSync(file)), hash, 'Actual source held: ' + file);
  fs.rmSync(temp, { recursive: true, force: true });
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log('NBA court: PASS, 19 actual outcomes and three effective copied faults.');
