/** Round 1518: the real Fight board, a read-only ring, and effective faults.
 * FIGHT_RING_CONTROL=all runs normal plus each copied-source fault serially.
 * Only copied workspaces are changed; source and dependency inputs are held.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/fight-career/FightCareerBoard.tsx';
const ring = 'src/components/fight-career/FightRing.tsx';
const test = 'src/test/fightCareerRingPlayback.test.tsx';
const baseline = 'shows a boxing ring when the real saved-plan Fight action starts its recap';
const future = 'does not let later rounds change the first revealed recap';
const controls = {
  victim: {
    file: ring,
    from: "const victim = round?.knockdown === 'player' ? 'opp' : round?.knockdown === 'opp' ? 'player' : null;",
    to: "const victim = round?.knockdown === 'player' ? 'player' : round?.knockdown === 'opp' ? 'opp' : null;",
    test: 'puts only the actual knockdown victim down', message: 'The knockdown scorer stays upright',
  },
  future: {
    file: board, from: 'done ? result.rounds.length : offer.rounds', to: 'result.rounds.length',
    test: future, message: 'after 1 of 8',
  },
  scale: {
    file: board,
    from: 'const busiest = Math.max(1, ...visible.map(r => Math.max(r.playerLanded, r.oppLanded)));',
    to: 'const busiest = Math.max(1, ...result.rounds.map(r => Math.max(r.playerLanded, r.oppLanded)));',
    test: future, message: 'Future rounds must not change current counts, scale, ring or scheduled length',
  },
  pause: {
    file: board, from: 'if (paused || shown >= result.rounds.length) return;', to: 'if (shown >= result.rounds.length) return;',
    test: 'lets Pause hold the unrevealed round without changing the saved bout', message: 'Paused playback must not reveal the opening round',
  },
};
const requested = process.env.FIGHT_RING_CONTROL || '';
assert.ok(!requested || requested === 'all' || requested in controls, 'Known ring control');
const selected = requested === 'all' ? ['', ...Object.keys(controls)] : [requested];
const artifacts = path.resolve(process.env.FIGHT_RING_ARTIFACTS || path.join(root, 'fight-ring-artifacts'));
await mkdir(artifacts, { recursive: true });
const held = [board, ring, test, 'src/lib/fightCareer.ts', 'src/lib/fightCareerLife.ts',
  'src/lib/fightCareerLifeFlow.ts', 'src/lib/fightCareerMoney.ts', 'src/lib/fightCareerInbox.ts',
  'src/lib/fightCareerRivalry.ts', 'src/lib/careerEngine.ts', 'src/hooks/useRevealScroll.ts',
  'package.json', 'package-lock.json', 'vitest.config.ts'];
const pins = Object.fromEntries(await Promise.all(held.map(async file => [file, createHash('sha256').update(await readFile(path.join(root, file))).digest('hex')])));
const outcomes = [];
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const name of selected) {
  const label = name || 'normal';
  let copy;
  try {
    let cwd = root;
    const spec = controls[name];
    if (spec) {
      copy = await mkdtemp(path.join(tmpdir(), 'dukb-fight-ring-'));
      assert.equal(path.dirname(copy), tmpdir(), 'The temporary copy stays inside the system temp directory');
      await cp(path.join(root, 'src'), path.join(copy, 'src'), { recursive: true });
      for (const file of ['package.json', 'package-lock.json', 'vitest.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
        await cp(path.join(root, file), path.join(copy, file));
      }
      await symlink(path.join(root, 'node_modules'), path.join(copy, 'node_modules'), 'junction');
      const source = await readFile(path.join(copy, spec.file), 'utf8');
      assert.equal(source.split(spec.from).length - 1, 1, `${name} binds one executable anchor`);
      const changed = source.replace(spec.from, spec.to);
      assert.notEqual(changed, source, `${name} changes executable code`);
      await writeFile(path.join(copy, spec.file), changed);
      await writeFile(path.join(artifacts, `${label}-changed-source.txt`), changed);
      cwd = copy;
    }
    const reportPath = path.join(artifacts, `${label}-report.json`);
    const env = { ...process.env, FORCE_COLOR: '0' };
    delete env.NO_COLOR;
    delete env.NO_DOUBLE_SWAP;
    const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportPath}`];
    if (spec) args.push('--testNamePattern', [spec.test, baseline].map(escape).join('|'));
    const run = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`;
    await writeFile(path.join(artifacts, `${label}-vitest.log`), output);
    process.stdout.write(output);
    assert.ok(!run.error && !run.signal, `${label} runner finished`);
    assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|No test files found|No test suite found|SyntaxError|ReferenceError|TypeError|Transform failed/, 'Runner faults cannot earn control credit');
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const rows = report.testResults.flatMap(file => file.assertionResults);
    assert.equal(rows.length, 9, 'All nine real board and ring cases are discovered');
    assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
    assert.equal(Number(report.numTodoTests ?? 0), 0);
    if (spec) {
      assert.equal(run.status, 1, `${label} actually fails`);
      assert.equal(report.numFailedTests, 1);
      assert.equal(report.numPassedTests, 1);
      assert.equal(report.numPendingTests, 7);
      const failed = rows.filter(row => row.status === 'failed');
      assert.equal(failed.length, 1);
      assert.equal(failed[0].title, spec.test);
      const failure = failed[0].failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
      assert.match(failure, /AssertionError:|Error:\s*expect\(element\)/, 'A real outcome assertion rejects the fault');
      assert.ok(failure.includes(spec.message), `${label} fails at its intended assertion`);
      assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'The independent real Fight entry still works');
    } else {
      assert.equal(run.status, 0);
      assert.equal(report.numPassedTests, 9);
      assert.equal(report.numFailedTests, 0);
      assert.equal(report.numPendingTests, 0);
      assert.ok(rows.every(row => row.status === 'passed'));
    }
    outcomes.push({ name: label, passed: true, actualExit: run.status, total: rows.length,
      passedCases: report.numPassedTests, failedCases: report.numFailedTests, intentionalSkips: report.numPendingTests });
    console.log(`simFightRingPlayback ${label}: intended outcomes verified.`);
  } catch (error) {
    outcomes.push({ name: label, passed: false, error: String(error.stack || error) });
    console.error(error);
  } finally {
    if (copy) {
      assert.equal(path.dirname(copy), tmpdir());
      assert.ok(path.basename(copy).startsWith('dukb-fight-ring-'));
      await rm(copy, { recursive: true, force: true });
    }
    for (const [file, hash] of Object.entries(pins)) {
      assert.equal(createHash('sha256').update(await readFile(path.join(root, file))).digest('hex'), hash, `${file} source held`);
    }
  }
}
await writeFile(path.join(artifacts, 'summary.json'), JSON.stringify({ outcomes, held: pins }, null, 2));
assert.ok(outcomes.every(row => row.passed), 'Every selected actual/fault run must pass its intended checks');
console.log(`simFightRingPlayback: ${outcomes.length} actual/fault runs verified; ${held.length} source inputs held byte for byte.`);
