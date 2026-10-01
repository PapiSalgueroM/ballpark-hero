/* Round792: real fictional-league engine and actual existing completion hook.
   AUSSIE_MANAGER_CONTROL selects an asserted copied binding, never live edits. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const enginePath = path.join(root, 'src/lib/aussieRulesManager.ts');
const hookPath = path.join(root, 'src/hooks/useAussieRulesManager.ts');
const control = process.env.AUSSIE_MANAGER_CONTROL || '';
const controls = {
  scoring: { anchor: 'total: goals * 6 + behinds', replacement: 'total: goals + behinds', test: 'derives every quarter and season score' },
  ladder: { anchor: 'row.wins += 1; row.points += 4;', replacement: 'row.wins += 1; row.points += 3;', test: 'derives every quarter and season score' },
  schedule: { anchor: '((round % 5 + index) % 2 === 1) !== (round >= 5)', replacement: '(round % 5 + index) % 2 === 1', test: 'schedules every pair twice' },
  squad: { anchor: "(order === 'best' ? 1 : -1)", replacement: '1', test: 'measures stronger squads' },
  tactics: { anchor: '? 9 : -9;', replacement: '? 0 : 0;', test: 'measures stronger squads' },
  readiness: { anchor: 'player.fatigue * 0.0045', replacement: 'player.fatigue * 0', test: 'measures stronger squads' },
  preparation: { anchor: "prep: choice === 'train' ? 8 : 0", replacement: 'prep: 0', test: 'applies exact training' },
  matchday: { anchor: 'automaticLineup({ ...other, players: other.players.filter(player => otherSquad.includes(player.id)) }).starters', replacement: 'automaticLineup(other).starters', test: 'keeps every opponent participant' },
  othermatchday: { anchor: 'automaticLineup({ ...home, players: home.players.filter(player => result.match.homeSquad.includes(player.id)) }).starters', replacement: 'automaticLineup(home).starters', test: 'keeps every opponent participant' },
  swaps: { anchor: 'state.swapsThisBreak >= 5', replacement: 'state.swapsThisBreak >= 50', test: 'swaps only nominated' },
  restore: { anchor: "!exactKeys(value, ['version', 'seed', 'clubId', 'actions'])", replacement: 'false', test: 'replays the strict versioned' },
  actionbound: { anchor: 'actions.length > MAX_ACTIONS', replacement: 'false', test: 'replays the strict versioned' },
  rawbound: { anchor: 'raw.length > 150000', replacement: 'false', test: 'replays the strict versioned' },
  coalesce: { hook: true, anchor: 'if (!isOriginal) actions.push', replacement: 'if (true) actions.push', test: 'coalesces repeated lineup' },
  invalidwrite: { hook: true, anchor: 'if (next === current) return false;', replacement: 'if (false) return false;', test: 'coalesces repeated lineup' },
  completion: { hook: true, anchor: "useGameCompletion(SLUG, state?.phase === 'complete', undefined);", replacement: "useGameCompletion(SLUG, state?.phase === 'complete', 100);", test: 'records the actual completed league' },
  storage: { hook: true, anchor: "setStorageNotice('Your season is running here, but this browser could not save it.');", replacement: 'setStorageNotice(null);', test: 'fails closed on invalid saves' },
};
assert.ok(!control || control in controls, 'Unknown Aussie Rules manager control');
const engine = await readFile(enginePath, 'utf8');
const hook = await readFile(hookPath, 'utf8');
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/aussieRulesManager.test.ts', '--reporter=verbose', '--testTimeout=60000'];
  if (control) {
    const spec = controls[control];
    const original = spec.hook ? hook : engine;
    assert.equal(original.split(spec.anchor).length - 1, 1, 'Control must change the exact unique live binding');
    const changed = original.replace(spec.anchor, spec.replacement);
    assert.notEqual(changed, original, 'Copied control must actually change code');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/aussie-manager-'));
    copy = path.join(folder, spec.hook ? 'useAussieRulesManager.ts' : 'aussieRulesManager.ts');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.hook ? '@/hooks/useAussieRulesManager' : '@/lib/aussieRulesManager']: copy });
    const independent = control === 'schedule' ? 'creates six deterministic' : 'schedules every pair twice';
    args.push('--testNamePattern', `${spec.test}|${independent}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /aussieRulesManager\.test\.ts/, 'Actual engine/hook tests must run');
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Resolver and timeout failures earn no credit');
  if (control) {
    assert.notEqual(run.status, 0, 'Mutated engine/hook behavior must fail an outcome');
    assert.match(output, /Tests\s+1 failed.*1 passed.*12 skipped/, 'One intended failure and one independent outcome must actually run');
    assert.match(output, new RegExp(`FAIL[^\\n]*${controls[control].test}`), 'Intended outcome must be in the actual failure report');
    assert.match(output, /AssertionError|expected .* to/i, 'A real assertion must fail');
    console.log(`simAussieRulesManager ${control}: copied binding changed and the intended actual outcome failed; independent baseline passed.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6500));
    assert.match(output, /14 passed/);
    console.log('simAussieRulesManager: fourteen actual engine/hook outcomes passed; paired policy means and block headroom printed above.');
  }
  assert.equal(await readFile(enginePath, 'utf8'), engine, 'Engine bytes must remain unchanged');
  assert.equal(await readFile(hookPath, 'utf8'), hook, 'Hook bytes must remain unchanged');
  console.log('simAussieRulesManager: strict action replay, actual matchday squads, event totals and existing undefined-score completion are exercised.');
  console.log('simAussieRulesManager: source-copy controls never change the shared repository, league data or existing games.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
