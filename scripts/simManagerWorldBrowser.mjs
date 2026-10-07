/* Copied component faults must fail their mapped outcome while the original
   engine and table baseline pass in the same process. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), ROOT = path.resolve(path.dirname(self), '..');
const FILE = 'src/components/club-manager/WorldTablesCard.tsx';
const TEST = 'src/test/managerWorldBrowser.test.tsx';
const OUT = path.resolve(process.env.MANAGER_WORLD_BROWSER_ARTIFACTS || path.join(ROOT, 'manager-world-browser-artifacts/mounted'));
const COUNT = 13;
const names = {
  world: 'offers every current league once with its actual club count',
  search: 'finds countries clubs accents and every term without inventing results',
  select: 'keeps selection through empty searches Back and Escape and returns to My league',
  era: 'restricts era2020 to its actual five historical leagues',
  edited: 'finds swapped clubs in the actual edited memberships and keeps the save unchanged',
  custom: 'finds the actual custom club and excludes its displaced club',
  saved: 'searches saved world membership after a club changes leagues',
  table: 'preserves exact saved standings rounds tiebreaks and scout callbacks',
  fallback: 'falls back to the current career league when a different era replaces the save',
  independent: 'retains the independent actual engine and unchanged table baseline',
};
const faults = {
  missing: { from: 'worldLeagueDefs(career).filter(l => l.id !== myLeague.id)', to: 'worldLeagueDefs(career).filter(l => l.id === myLeague.id)', test: names.world },
  country: { from: "[league.name, LEAGUE_NATIONS[league.id] ?? '', ...league.clubs]", to: "[league.name, '', ...league.clubs]", test: names.search },
  accent: { from: "text.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase()", to: 'text.toLocaleLowerCase()', test: names.search },
  terms: { from: 'terms.every(term => text.includes(term))', to: 'terms.some(term => text.includes(term))', test: names.search },
  clubs: { from: '...league.clubs', to: '...[]', test: names.edited },
  selection: { from: 'if (id) setPick(id);', to: 'if (id) setPick(myLeague.id);', test: names.select },
  focus: { from: 'if (browsing) searchRef.current?.focus({ preventScroll: true });', to: 'if (browsing) void searchRef.current;', test: names.select },
  myfocus: { from: 'onClick={() => { browseRef.current?.focus({ preventScroll: true }); setPick(myLeague.id); }}', to: 'onClick={() => { setPick(myLeague.id); }}', test: names.select },
  custom: { from: '? career.leagueClubs :', to: '? undefined :', test: names.custom },
  saved: { from: 'career.world?.[league.id]?.table.map(row => row.club)', to: 'undefined', test: names.saved },
  era: { from: 'worldLeagueDefs(career).filter', to: 'worldLeagueDefs({}).filter', test: names.era },
  order: { from: 'sortedWorldTable(career, active.id, world.table)', to: 'sortedWorldTable(career, active.id, world.table).reverse()', test: names.table },
  round: { from: 'world?.round ?? 0', to: '0', test: names.table },
  scout: { from: 'onClubClick={onClubClick}', to: 'onClubClick={undefined}', test: names.table },
  fallback: { from: 'leagues.find(l => l.id === pick) ?? myLeague', to: 'leagues.find(l => l.id === pick) ?? leagues[1]', test: names.fallback },
};
const control = process.env.MANAGER_WORLD_BROWSER_CONTROL || '';
assert(!control || control === 'all' || control in faults, 'Known world browser fault');
fs.mkdirSync(OUT, { recursive: true });
if (control === 'all') {
  const summary = [];
  for (const name of ['', ...Object.keys(faults)]) {
    const run = spawnSync(process.execPath, [self], { cwd: ROOT, env: { ...process.env, MANAGER_WORLD_BROWSER_CONTROL: name, MANAGER_WORLD_BROWSER_ARTIFACTS: OUT }, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout || '') + '\n' + (run.stderr || ''); fs.writeFileSync(path.join(OUT, `${name || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal; summary.push({ control: name || 'normal', passed, exit: run.status });
    console.log(`${passed ? 'PASS' : 'FAIL'} manager world browser ${name || 'normal'}`);
    if (!passed) process.stdout.write(output.slice(-14000));
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  assert(summary.every(row => row.passed), 'All world browser outcomes and effective faults pass');
  console.log(`simManagerWorldBrowser all: ${COUNT} outcomes and ${Object.keys(faults).length} effective copied faults passed.`);
  process.exit(0);
}
const digest = value => createHash('sha256').update(value).digest('hex');
const held = [FILE, TEST, 'src/components/club-manager/LeagueTableCard.tsx', 'src/lib/clubManager.ts', 'src/lib/clubManagerEras.ts', 'src/lib/clubManagerWorldEdit.ts', 'scripts/simManagerWorldBrowser.mjs'];
const hashes = () => Object.fromEntries(held.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const before = hashes(), env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
let folder;
try {
  if (control) {
    const fault = faults[control], original = fs.readFileSync(path.join(ROOT, FILE), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(original.split(fault.from).length - 1, 1, 'One exact executable source anchor changes');
    const changed = original.replace(fault.from, fault.to); assert.notEqual(changed, original);
    fs.mkdirSync(path.join(ROOT, '.sim-control'), { recursive: true }); folder = fs.mkdtempSync(path.join(ROOT, '.sim-control/manager-world-browser-'));
    const copy = path.join(folder, 'WorldTablesCard.tsx'); fs.writeFileSync(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/club-manager/WorldTablesCard': copy });
    fs.writeFileSync(path.join(OUT, `${control}-mutation.json`), JSON.stringify({ control, ...fault, originalSha256: digest(original), changedSha256: digest(changed) }, null, 2));
    fs.writeFileSync(path.join(OUT, `${control}-WorldTablesCard.tsx.txt`), changed);
  }
  const reportFile = path.join(OUT, `${control || 'normal'}-report.json`);
  const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [faults[control].test, names.independent].map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); fs.writeFileSync(path.join(OUT, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Actual mounted runner completed');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, COUNT); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, COUNT - 2);
    const intended = rows.find(row => row.title === faults[control].test); assert.equal(intended?.status, 'failed');
    assert.match(intended.failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, ''), /AssertionError:|Error: expect\(element\)/);
    assert.equal(rows.find(row => row.title === names.independent)?.status, 'passed');
    console.log(`simManagerWorldBrowser ${control}: changed component rejected by mapped outcome; independent engine and table passed.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, COUNT); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log(`simManagerWorldBrowser: ${COUNT} actual world outcomes passed.`);
  }
} finally {
  if (folder) { assert(path.resolve(folder).startsWith(path.join(ROOT, '.sim-control') + path.sep)); fs.rmSync(folder, { recursive: true, force: true }); }
  const after = hashes(); fs.writeFileSync(path.join(OUT, `${control || 'normal'}-integrity.json`), JSON.stringify({ before, after, held: JSON.stringify(before) === JSON.stringify(after) }, null, 2));
  assert.deepEqual(after, before, 'Reviewed component, tests and independent engine/table remain unchanged');
}
