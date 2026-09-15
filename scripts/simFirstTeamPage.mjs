/** Round 586: real page saves, returning roster clocks and match effects.
 * Broken copies are private test inputs; the shipped sources stay untouched. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(root, 'node_modules', '.first-team-control-'));
const test = 'src/test/firstTeam.test.tsx';
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replaceAll('\r\n', '\n');
const hook = 'src/hooks/useWonderkidFactory.ts';
const page = 'src/pages/StadiumTycoon.tsx';
const lib = 'src/lib/wonderkidFactory.ts';
const controls = [
  { name: 'nosave', file: hook, env: 'TYCOON_LOADS_ACADEMY_HOOK',
    from: 'try { localStorage.setItem(SAVE_KEY, serialize(next)); } catch {\n      setAcademySaveBlocked(true);',
    to: 'try { void next; } catch {\n      setAcademySaveBlocked(true);', red: [1, 2, 3] },
  { name: 'failopen', file: hook, env: 'TYCOON_LOADS_ACADEMY_HOOK',
    from: 'setAcademySaveBlocked(true);\n      return false;',
    to: 'setAcademySaveBlocked(true);', red: [2] },
  { name: 'dropteam', file: lib, env: 'TYCOON_LOADS_ACADEMY_LIB',
    from: 'firstTeam: s.firstTeam,', to: 'firstTeam: undefined,', red: [3] },
  { name: 'stoppedclock', file: page, env: 'TYCOON_ROOMS_PAGE',
    from: 'useState(() => Boolean(savedAcademy?.firstTeam?.length))', to: 'useState(false)', red: [4, 7] },
  { name: 'noedge', file: page, env: 'TYCOON_ROOMS_PAGE',
    from: 'const getEdge = useCallback(() => academyRef.current ? squadEdge(academyRef.current, loadLedger().gearLevel) : 0, []);',
    to: 'const getEdge = useCallback(() => 0, []);', red: [5, 6, 7] },
  { name: 'untrained', file: page, env: 'TYCOON_ROOMS_PAGE',
    from: 'if (snapshot) applyAcademyOffline(snapshot, now);', to: 'void snapshot;', red: [7] },
];

function run(name, env = {}) {
  const reportPath = path.join(dir, `${name}.json`);
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test,
    '--maxWorkers=1', '--reporter=json', `--outputFile=${reportPath}`], {
    cwd: root, env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 180000,
  });
  assert(fs.existsSync(reportPath), `${name}: no test report\n${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 7, `${name}: expected all seven page cases`);
  assert(!/Failed to resolve import|Cannot find module|SyntaxError|Transform failed/.test(result.stderr), `${name}: invalid control import`);
  const red = rows.filter(row => row.status === 'failed').map(row => Number(row.title.match(/^\d+/)[0]));
  console.log(`${name}: ${7 - red.length}/7 passed; failed sections ${red.join(',') || 'none'}`);
  return { result, rows, red };
}

try {
  const healthy = run('healthy');
  if (healthy.red.length) console.error(healthy.rows.filter(row => row.status === 'failed'));
  assert.equal(healthy.result.status, 0, 'Healthy first-team page must pass');
  assert.deepEqual(healthy.red, []);
  for (const control of controls) {
    const source = read(control.file);
    assert.equal(source.split(control.from).length, 2, `${control.name}: mutation must match exactly once`);
    const changed = source.replace(control.from, control.to);
    assert.notEqual(changed, source, `${control.name}: mutation did not change code`);
    const destination = path.join(dir, `${control.name}${path.extname(control.file)}`);
    fs.writeFileSync(destination, changed);
    const broken = run(control.name, { [control.env]: destination });
    assert.equal(broken.result.status, 1, `${control.name}: must fail through assertions`);
    assert.deepEqual(broken.red, control.red, `${control.name}: only intended page cases may fail`);
  }
  console.log('PASS: seven real-page cases and all six effective negative controls.');
} finally {
  assert(dir.startsWith(path.join(root, 'node_modules', '.first-team-control-')));
  fs.rmSync(dir, { recursive: true, force: true });
}
