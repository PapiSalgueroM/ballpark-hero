import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.join(ROOT, 'src/lib/grandPrixBoss.ts');
const TEST = 'src/test/grandPrixBoss.test.ts';
const SHA = bytes => createHash('sha256').update(bytes).digest('hex');
const original = fs.readFileSync(ENGINE);
const source = original.toString('utf8');
const heldFiles = new Map([ENGINE, TEST, 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'].map(file => {
  const absolute = path.resolve(ROOT, file); return [absolute, SHA(fs.readFileSync(absolute))];
}));
const base = process.env.GP_BOSS_OUT || path.join(ROOT, 'tmp');
fs.mkdirSync(base, { recursive: true });
const OUT = fs.mkdtempSync(path.join(base, 'dukb-grand-prix-boss-'));
fs.writeFileSync(path.join(OUT, 'original-grandPrixBoss.ts'), original);
const IDS = ['GP_ENGINE_AVAILABLE:', 'GP_WORLD:', 'GP_SEED:', 'GP_UPGRADE:', 'GP_RESERVE:', 'GP_GRID:', 'GP_SETUPS:', 'GP_CLASSIFICATION:', 'GP_SETTLEMENT:', 'GP_DUPLICATE:', 'GP_RESUME:', 'GP_INVALID_SAVE:', 'GP_SCORE:'];
const controls = [
  ['world', 'GP_WORLD:', 'Array.from({ length: 26 }, (_, index): GrandPrixDriver => {', 'Array.from({ length: 25 }, (_, index): GrandPrixDriver => {'],
  ['seed', 'GP_SEED:', 'const random = keyedRng(`grand-prix-world|${seed}`);', 'const random = Math.random;'],
  ['quote', 'GP_UPGRADE:', '  state.reserved = reserve(state);\n  state.upgradeCosts = quotes(state);\n  return state;', '  state.reserved = reserve(state);\n  state.upgradeCosts = { power: null, aero: null, reliability: null };\n  return state;'],
  ['reserve', 'GP_RESERVE:', 'if (cost > state.cash - reserve(state))', 'if (cost > state.cash)'],
  ['grid', 'GP_GRID:', 'const grid = state.drivers.filter(driver => driver.contract).map(driver => {', 'const grid = state.drivers.filter(driver => driver.contract).slice(0, -1).map(driver => {'],
  ['setups', 'GP_SETUPS:', '  if (!unique(value.map(row => row.driverId))) return null;\n', ''],
  ['points', 'GP_CLASSIFICATION:', '      standing.points += row.points;', '      standing.points += 0;'],
  ['payment', 'GP_SETTLEMENT:', '  state.cash += teamPrize - operatingCost;', '  state.cash += teamPrize;'],
  ['revision', 'GP_DUPLICATE:', 'if (action.expectedRevision !== state.revision)', 'if (false && action.expectedRevision !== state.revision)'],
  ['resume', 'GP_RESUME:', 'const roll = (state: Pick<GrandPrixCareer, \'seed\' | \'season\' | \'round\'>, key: string) => keyedRng(`grand-prix|${state.seed}|${state.season}|${state.round}|${key}`)();', 'const roll = (_state: Pick<GrandPrixCareer, \'seed\' | \'season\' | \'round\'>, _key: string) => Math.random();'],
  ['entrant', 'GP_INVALID_SAVE:', '          : s.drivers.find(driver => driver.id === row.driverId)?.contract?.teamId === row.teamId)', '          : true)'],
  ['lifecycle', 'GP_INVALID_SAVE:', "        && (race.lap === 0 ? entry.status === 'running' && entry.completedLaps === 0 && entry.stops === 0\n          : entry.status === 'retired' ? entry.completedLaps < race.lap : entry.completedLaps === race.lap)\n", ''],
  ['future', 'GP_INVALID_SAVE:', 'if (integer(raw.version, 2))', 'if (false && integer(raw.version, 2))'],
  ['score', 'GP_SCORE:', 'const raceMaximum = POINTS[0] + POINTS[1];', 'const raceMaximum = POINTS[0];'],
];
let complete = false;
function requireThat(ok, why) { if (!ok) throw new Error(why); }
function run(name, redId = null, engineFile = null) {
  const reportPath = path.join(OUT, name + '.json');
  const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + reportPath];
  if (redId && name !== 'absence') args.push('--testNamePattern=' + redId);
  const env = { ...process.env };
  delete env.GP_BOSS_ENGINE_FILE;
  delete env.NO_DOUBLE_SWAP;
  if (engineFile) env.GP_BOSS_ENGINE_FILE = engineFile;
  const child = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 180_000 });
  fs.writeFileSync(path.join(OUT, name + '.stdout'), child.stdout || '');
  fs.writeFileSync(path.join(OUT, name + '.stderr'), child.stderr || '');
  requireThat(!child.error && !child.signal && child.status === (redId ? 1 : 0), name + ': wrong child exit or infrastructure error');
  requireThat(!/(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test((child.stdout || '') + '\n' + (child.stderr || '')), name + ': unhandled child error');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  requireThat(Array.isArray(report.testResults) && report.testResults.length === 1, name + ': expected one actual test file');
  const rows = report.testResults[0].assertionResults;
  requireThat(Array.isArray(rows) && rows.length === 13 && report.numTotalTests === 13, name + ': incomplete cases');
  requireThat(report.numPassedTests === (redId ? 0 : 13) && report.numFailedTests === (redId ? 1 : 0)
    && report.numPendingTests === (redId ? 12 : 0) && report.numTodoTests === 0, name + ': wrong outcome counters');
  if (report.numRuntimeErrorTestSuites !== undefined) requireThat(report.numRuntimeErrorTestSuites === 0, name + ': runtime suite error');
  if (report.numUnhandledErrors !== undefined) requireThat(report.numUnhandledErrors === 0, name + ': unhandled report error');
  const seen = new Set();
  for (const row of rows) {
    const matches = IDS.filter(id => row.title.startsWith(id));
    requireThat(matches.length === 1 && !seen.has(matches[0]), name + ': duplicate or unknown case ' + row.title);
    const id = matches[0]; seen.add(id);
    const status = !redId ? 'passed' : id === redId ? 'failed' : 'skipped';
    requireThat(row.status === status, name + ': unexpected status for ' + id);
    if (status === 'failed') {
      requireThat(row.failureMessages.length > 0 && row.failureMessages.every(message => message.includes('AssertionError:')), name + ': non-assertion failure');
      if (name === 'absence') requireThat(row.failureMessages.every(message => message.includes('GP_ENGINE_MODULE_MISSING')), name + ': wrong missing-module failure');
    }
  }
  console.log(`  ${name}: ${report.numPassedTests} passed, ${report.numFailedTests} owned assertion failures, ${report.numPendingTests} declared skips; runtime/unhandled ${JSON.stringify([report.numRuntimeErrorTestSuites ?? null, report.numUnhandledErrors ?? null])}`);
}
try {
  run('current');
  const candidate = path.join(OUT, 'candidate-grandPrixBoss.ts');
  fs.writeFileSync(candidate, original);
  requireThat(SHA(fs.readFileSync(candidate)) === SHA(original), 'healthy source copy differs');
  run('healthy-copy', null, candidate);
  for (const [name, id, before, after] of controls) {
    requireThat(source.split(before).length === 2, name + ': source anchor is not unique');
    const fault = source.replace(before, after);
    requireThat(fault !== source, name + ': source control changed nothing');
    fs.writeFileSync(path.join(OUT, name + '-grandPrixBoss.ts'), fault);
    try { fs.writeFileSync(candidate, fault); run(name, id, candidate); }
    finally {
      fs.writeFileSync(candidate, original);
      requireThat(SHA(fs.readFileSync(candidate)) === SHA(original), name + ': whole physical copy restore failed');
      requireThat(SHA(fs.readFileSync(ENGINE)) === SHA(original), name + ': actual engine bytes moved');
      fs.writeFileSync(path.join(OUT, name + '-restore.json'), JSON.stringify({ copySha256: SHA(fs.readFileSync(candidate)), actualSha256: SHA(fs.readFileSync(ENGINE)) }) + '\n');
    }
  }
  const missingCopy = path.join(OUT, 'missing-grandPrixBoss.ts');
  requireThat(!fs.existsSync(missingCopy), 'absence copy must actually be missing');
  run('absence', 'GP_ENGINE_AVAILABLE:', missingCopy);
  requireThat(SHA(fs.readFileSync(candidate)) === SHA(original), 'restored source copy differs');
  run('restored-copy', null, candidate);
  complete = true;
  console.log('simGrandPrixBoss: current/healthy-copy/restored-copy 13 cases and all 15 effective copied-source controls passed');
} finally {
  for (const [file, hash] of heldFiles) requireThat(SHA(fs.readFileSync(file)) === hash, 'actual source/helper/test/package hold failed: ' + file);
  console.log('  Grand Prix Boss evidence: ' + OUT);
  if (complete && !process.env.GP_BOSS_OUT) fs.rmSync(OUT, { recursive: true, force: true });
}
