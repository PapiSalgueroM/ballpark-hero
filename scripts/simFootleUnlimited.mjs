/* Actual Footle Unlimited outcomes with isolated copied-source controls.
   FOOTLE_UNLIMITED_CONTROL=all attempts every mode and preserves its report. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), '..');
const hook = 'src/hooks/useGame.ts', page = 'src/pages/Footle.tsx';
const helper = 'src/lib/footleUnlimitedSession.ts', testFile = 'src/test/footleUnlimitedSession.test.tsx';
const titles = {
  deck: 'draws fresh resolved-pool answers until explicit deck exhaustion',
  identity: 'deduplicates identities and handles one or zero eligible answers',
  frozen: 'restores exact unfinished clues after the fetched pool changes',
  rapid: 'ignores repeated guesses and repeated next inputs in one frame',
  tiers: 'preserves each tier puzzle across tier and mode switches',
  giveUp: 'reveals a given-up answer before advancing without touching protected records',
  pause: 'pauses a saved current Daily answer without exposing or replacing it',
  invalid: 'ignores invalid saved sessions and starts a clean deck',
  warning: 'reports blocked storage while keeping Unlimited playable',
  baseline: 'restores existing Daily and completed five-run records quietly',
};
const controls = {
  seen: { file: helper, from: 'new Set([...deck.seen, normalizeName(dailyName)])', to: 'new Set([normalizeName(dailyName)])', test: titles.deck, message: /expected \d+ to be \d+/ },
  daily: { file: helper, from: 'new Set([...deck.seen, normalizeName(dailyName)])', to: 'new Set(deck.seen)', test: titles.deck, message: /expected \d+ to be \d+/ },
  daily_identity: { file: helper, from: 'new Set([...deck.seen, normalizeName(dailyName)])', to: 'new Set([...deck.seen, dailyName])', test: titles.identity, message: /A case or accent alias cannot expose the Daily identity/ },
  tier: { file: helper, from: 'player.difficulty === tier && !used.has(normalizeName(player.name))', to: 'player.difficulty !== tier && !used.has(normalizeName(player.name))', test: titles.deck, message: /expected '(?:easy|hard|insane)' to be '(?:easy|hard|insane)'/ },
  identity: { file: helper, from: 'const name = normalizeName(player.name);', to: 'const name = player.name;', test: titles.identity, message: /expected .* to be |to have a length of 1/ },
  frozen: { file: hook, from: 'const savedUnlimitedTarget = unlimitedDeck?.pool.find(player => player.name === unlimitedDeck.current.target) ?? null;', to: 'const savedUnlimitedTarget = playerPool.find(player => player.name === unlimitedDeck?.current.target) ?? null;', test: titles.frozen, message: /to deeply equal/ },
  restore: { file: hook, from: 'parseUnlimitedSession(localStorage.getItem(FOOTLE_UNLIMITED_KEY)) ?? createUnlimitedSession()', to: 'createUnlimitedSession()', test: titles.frozen, message: /The saved Unlimited mode resumes after the pool resolves/ },
  duplicate: { file: helper, from: '|| deck.current.guesses.includes(name)', to: '|| false', test: titles.rapid, message: /to deeply equal/ },
  next: { file: helper, from: "if (!deck || deck.current.status === 'playing') return session;", to: 'if (!deck) return session;', test: titles.rapid, message: /to have a length of 2/ },
  limit: { file: helper, from: "guesses.length >= MAX_GUESSES ? 'lost'", to: "guesses.length > MAX_GUESSES ? 'lost'", test: titles.rapid, message: /expected 'won' to be 'lost'/ },
  tiers: { file: helper, from: 'if (session.decks[tier]) return session.tier === tier ? session : { ...session, tier };', to: 'if (session.decks[tier] && session.tier === tier) return session;', test: titles.tiers, message: /to deeply equal/ },
  giveup: { file: helper, from: "return replaceDeck(session, { ...deck, current: { ...deck.current, status: 'lost' } });", to: 'return session;', test: titles.giveUp, message: /expected null not to be null/ },
  pause: { file: hook, from: 'normalizeName(savedUnlimitedTarget.name) === normalizeName(dailyTarget.name)', to: 'false', test: titles.pause, message: /The saved Daily answer stays behind the pause screen/ },
  invalid_seen: { file: helper, from: '|| new Set(deck.seen).size !== deck.seen.length', to: '|| false', test: titles.invalid, message: /to be null/ },
  invalid_guess: { file: helper, from: "round.guesses.some(name => typeof name !== 'string' || !pool.has(name))", to: "round.guesses.some(name => typeof name !== 'string')", test: titles.invalid, message: /to be null/ },
  invalid_status: { file: helper, from: "(round.status === 'won') !== (correctAt >= 0) || ", to: '', test: titles.invalid, message: /to be null/ },
  warning: { file: hook, from: 'setUnlimitedSaveFailed(true);', to: 'setUnlimitedSaveFailed(false);', test: titles.warning, message: /Expected element to have text content:[\s\S]*could not save/ },
  reshuffle_playing: { file: helper, from: "if (!deck || deck.current.status === 'playing' || unlimitedRemaining(session, dailyName) > 0) return session;", to: 'if (!deck || unlimitedRemaining(session, dailyName) > 0) return session;', test: titles.deck, message: /An unfinished puzzle cannot be replaced by reshuffling/ },
  reshuffle_unseen: { file: helper, from: "if (!deck || deck.current.status === 'playing' || unlimitedRemaining(session, dailyName) > 0) return session;", to: "if (!deck || deck.current.status === 'playing') return session;", test: titles.deck, message: /A deck with unseen answers cannot be reshuffled/ },
  loading: { file: hook, mutations: [
    { from: "if (mode !== 'unlimited' || isLoadingPool || !dailyTarget) return;", to: "if (mode !== 'unlimited' || !dailyTarget) return;" },
    { from: 'const unlimitedTarget = isLoadingPool || unlimitedPaused ? null : savedUnlimitedTarget;', to: 'const unlimitedTarget = unlimitedPaused ? null : savedUnlimitedTarget;' },
  ], test: titles.deck, message: /to be null/ },
};
const control = process.env.FOOTLE_UNLIMITED_CONTROL || '';
assert.ok(!control || control === 'all' || Object.hasOwn(controls, control), 'Known Unlimited control');
const outputDir = path.resolve(process.env.FOOTLE_UNLIMITED_ARTIFACTS || path.join(root, 'footle-unlimited-artifacts/mounted'));
await mkdir(outputDir, { recursive: true });

if (control === 'all') {
  const outcomes = [];
  for (const mode of ['', ...Object.keys(controls)]) {
    const child = spawnSync(process.execPath, [self], {
      cwd: root, env: { ...process.env, FOOTLE_UNLIMITED_CONTROL: mode, FOOTLE_UNLIMITED_ARTIFACTS: outputDir },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
    });
    const output = `${child.stdout || ''}\n${child.stderr || ''}`;
    await writeFile(path.join(outputDir, `${mode || 'normal'}-runner.log`), output);
    const passed = child.status === 0 && !child.error && !child.signal;
    outcomes.push({ mode: mode || 'normal', passed, exit: child.status, error: String(child.error || ''), signal: child.signal });
    console.log(`${passed ? 'PASS' : 'FAIL'} Footle Unlimited ${mode || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simFootleUnlimited')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(outputDir, 'summary.json'), JSON.stringify({ outcomes, cases: Object.values(titles), controls: Object.keys(controls) }, null, 2));
  assert.ok(outcomes.every(row => row.passed), 'Every normal and control mode must pass; all modes were attempted');
  console.log(`simFootleUnlimited: ${Object.keys(titles).length} mounted outcomes and ${Object.keys(controls).length} effective controls passed.`);
} else {
  const held = new Map();
  for (const relative of [hook, page, helper, testFile, 'src/hooks/useDailyPuzzle.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/footlePracticeRun.ts', 'src/lib/gameLogic.ts', 'src/components/footle/FootleClueDesk.tsx', 'src/test/fixtures/footlePracticePlayers.ts']) {
    held.set(relative, await readFile(path.join(root, relative)));
  }
  const verifyHeld = async () => {
    for (const [relative, bytes] of held) assert.deepEqual(await readFile(path.join(root, relative)), bytes, `${relative}: raw source bytes held`);
  };
  const parent = path.join(root, '.sim-control');
  const label = control || 'normal';
  const spec = controls[control];
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
  let folder, copy;
  try {
    if (spec) {
      const source = held.get(spec.file).toString('utf8').replaceAll('\r\n', '\n');
      let changed = source;
      for (const mutation of spec.mutations ?? [spec]) {
        assert.equal(changed.split(mutation.from).length - 1, 1, `${label}: exactly one executable anchor`);
        const next = changed.replace(mutation.from, mutation.to);
        assert.notEqual(next, changed, `${label}: every mutation changes executable code`);
        changed = next;
      }
      assert.notEqual(changed, source, `${label}: copied product behavior changed`);
      await mkdir(parent, { recursive: true });
      folder = await mkdtemp(path.join(parent, 'footle-unlimited-'));
      copy = path.join(folder, path.basename(spec.file));
      await writeFile(copy, changed);
      await writeFile(path.join(outputDir, `${label}-source.txt`), changed);
      env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: copy });
    }
    const reportFile = path.join(outputDir, `${label}-report.json`);
    const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
    if (spec) args.push('--testNamePattern', [spec.test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
    const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${child.stdout || ''}\n${child.stderr || ''}`;
    await writeFile(path.join(outputDir, `${label}-vitest.log`), output);
    assert.ok(!child.error && !child.signal, `${label}: test runner completes normally`);
    assert.doesNotMatch(output, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|TypeError|ReferenceError|Transform failed|Failed to (?:resolve import|load)|Cannot find module|not wrapped in act/, `${label}: infrastructure failures earn no control credit`);
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    const rows = report.testResults.flatMap(file => file.assertionResults);
    assert.deepEqual(rows.map(row => row.title).sort(), Object.values(titles).sort(), `${label}: exact ten expected cases discovered`);
    assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
    const failed = rows.filter(row => row.status === 'failed');
    const passed = rows.filter(row => row.status === 'passed');
    const skipped = rows.filter(row => ['pending', 'skipped'].includes(row.status));
    assert.equal(rows.length, failed.length + passed.length + skipped.length, `${label}: all statuses accounted for`);
    if (spec) {
      assert.equal(child.status, 1);
      assert.deepEqual(failed.map(row => row.title), [spec.test], `${label}: only the intended outcome rejects`);
      assert.deepEqual(passed.map(row => row.title), [titles.baseline], `${label}: independent Daily and completed-run baseline passes`);
      assert.equal(skipped.length, Object.keys(titles).length - 2);
      const failure = failed[0].failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, '');
      assert.match(failure, /AssertionError|Error: expect\(/, `${label}: actual assertion failure required`);
      assert.match(failure, spec.message, `${label}: exact intended rejection reached`);
      assert.doesNotMatch(failure, /TypeError|ReferenceError|SyntaxError|TestingLibraryElementError|Timed out|timed out|Unable to find|Found multiple/, `${label}: query or runtime failures do not count`);
    } else {
      assert.equal(child.status, 0);
      assert.equal(failed.length, 0);
      assert.equal(passed.length, Object.keys(titles).length);
      assert.equal(skipped.length, 0);
    }
    await verifyHeld();
    await writeFile(path.join(outputDir, `${label}-verified.json`), JSON.stringify({
      mode: label, discovered: rows.length, passed: passed.map(row => row.title), rejected: failed.map(row => row.title), skipped: skipped.map(row => row.title),
      sourceSha256: Object.fromEntries([...held].map(([file, bytes]) => [file, createHash('sha256').update(bytes).digest('hex')])),
      scope: 'Actual mounted page and hook outcomes with fictional fixtures and offline transport. No native geometry or live player-data claim.',
    }, null, 2));
    console.log(`simFootleUnlimited ${label}: ${passed.length} passed, ${failed.length} intended failures, ${skipped.length} intentional skips; ${held.size} source inputs held.`);
  } finally {
    if (folder) {
      assert.equal(path.dirname(folder), parent);
      assert.ok(path.basename(folder).startsWith('footle-unlimited-'));
      await rm(copy, { force: true });
      await rmdir(folder);
    }
    await verifyHeld();
  }
}
