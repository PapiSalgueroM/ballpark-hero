/* Mounted player outcomes and effective controls on copied executable source. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), self = fileURLToPath(import.meta.url);
const engine = 'src/lib/mmaPromotion.ts', hook = 'src/hooks/useMmaPromotion.ts', board = 'src/components/fight-promoter/MmaPromotionBoard.tsx';
const testFile = 'src/test/mmaPromotion.test.tsx';
const titles = {
  world: 'creates the same fictional world from the same seed with four contracts per division',
  fighters: 'rejects self cross division free and recovering fighters without changing the world',
  card: 'rejects empty repeated and oversized cards before any payout',
  budget: 'rejects invalid venues prices and unaffordable guarantees',
  receipt: 'reconciles attendance gate purses rent profit and actual cash in the saved receipt',
  records: 'applies each actual winner record contract ranking and recovery exactly once',
  title: 'allows eligible title fights and transfers the occupied belt to the actual winner',
  renew: 'vacates expired champions and renews eligible contracts for the stated signing bonus',
  rest: 'rests a month for overhead and clears recovery without changing records or contracts',
  load: 'loads only structurally valid worlds and receipts without sanitizing forged outcomes',
  balance: 'gives stronger attributes more wins across paired seeds and reaches real submissions',
  score: 'scores reputation profitable events and filled belts in bounded legacy units',
  booking: 'books and removes actual fighters through the card controls before spending cash',
  reload: 'runs a mounted event once and reloads its exact financial receipt without another record',
  panels: 'opens rules rankings and contracts and returns focus to each dashboard opener',
  notice: 'explains malformed and blocked saves while allowing a fresh playable world',
  finish: 'records the twelfth event legacy once and never pays again when restored closed',
  paid: 'rejects unpaid contracts and free recovery months while replaying real paid actions',
  early: 'ends earned MMA progress once preserves a later boxing finish and awards no zero event completion',
  baseline: 'keeps boxing save bytes when opening either promotion mode',
};
const controls = {
  seed: { file: engine, from: 'const seed = hashLabel(seedLabel ?? `mma|${cleanName}`);', to: 'const seed = hashLabel("every-world");', test: titles.world },
  division: { file: engine, from: "if (a.division !== b.division) return 'Both fighters must be in the same division.';", to: "if (false) return 'Both fighters must be in the same division.';", test: titles.fighters },
  duplicate: { file: engine, from: "if (used.has(bout.aId) || used.has(bout.bId)) return 'A fighter can only appear once on a card.';", to: "if (false) return 'A fighter can only appear once on a card.';", test: titles.card },
  budget: { file: engine, from: "if (projection.guarantees > state.cash) return 'You need enough cash to cover the rent and guaranteed purses.';", to: "if (false) return 'You need enough cash to cover the rent and guaranteed purses.';", test: titles.budget },
  price: { file: engine, from: 'Math.pow(25 / plan.ticketPrice, 1.3)', to: '1', test: titles.budget },
  grand: { file: engine, from: 'capacity: 10000, rent: 45000, needs: 60', to: 'capacity: 10000, rent: 65000, needs: 60', test: titles.budget },
  cash: { file: engine, from: 'cashAfter: state.cash + projection.profit', to: 'cashAfter: state.cash + projection.profit * 2', test: titles.receipt },
  record: { file: engine, from: 'wins: f.wins + (won ? 1 : 0)', to: 'wins: f.wins + (won ? 2 : 0)', test: titles.records },
  belt: { file: engine, from: 'if (b.title) champions[b.division] = b.winnerId;', to: 'if (b.title) champions[b.division] = b.loserId;', test: titles.title },
  contract: { file: engine, from: 'contract: f.contract - 1', to: 'contract: f.contract', test: titles.renew },
  rest: { file: engine, from: 'cash: state.cash - MMA_REST_COST', to: 'cash: state.cash', test: titles.rest },
  forgedReceipt: { file: engine, from: 'return same(value, state) ? state : null;', to: 'return same({ ...value, history: state.history }, state) ? state : null;', test: titles.load },
  unpaid: { file: engine, from: 'return same(value, state) ? state : null;', to: 'return same({ ...value, fighters: state.fighters, month: state.month }, state) ? state : null;', test: titles.paid },
  submission: { file: engine, from: "winnerId = attacker.id; method = 'Submission';", to: "winnerId = attacker.id; method = 'Decision';", test: titles.balance },
  attributes: { file: engine, from: 'const attacker = attackerA ? a : b; const defender = attackerA ? b : a;', to: 'const invert = (f: MmaFighter) => ({ ...f, striking: 100 - f.striking, grappling: 100 - f.grappling, cardio: 100 - f.cardio }); const attacker = invert(attackerA ? a : b); const defender = invert(attackerA ? b : a);', test: titles.balance },
  score: { file: engine, from: 'state.reputation * 0.5 + profitable / 12 * 30 + belts / 3 * 20', to: 'state.reputation * 0 + profitable / 12 * 30 + belts / 3 * 20', test: titles.score },
  stateRef: { file: hook, from: 'current.current = visible;', to: 'void visible;', test: titles.booking },
  doubleCash: { file: hook, from: 'change({ state: next.state, plan: { ...s.plan, bookings: [] }, view:', to: 'change({ state: { ...next.state, cash: next.state.cash + next.result.profit }, plan: { ...s.plan, bookings: [] }, view:', test: titles.reload },
  malformedNotice: { file: hook, from: 'catch { return { ...emptySession(), notice: MALFORMED }; }', to: 'catch { return { ...emptySession(), notice: null }; }', test: titles.notice },
  returnFocus: { file: board, from: "if (active === 'dashboard') tiles.current[opener.current]?.focus({ preventScroll: true });", to: "if (active === 'dashboard') void tiles.current;", test: titles.panels },
  restoredMark: { file: hook, changes: [
    { from: "import { useCallback, useRef, useState } from 'react';", to: "import { useCallback, useRef, useState } from 'react';\nimport { markRestoredFinish } from '@/lib/restoredFinish';" },
    { from: 'return { state, plan: { ...s.plan, bookings:', to: "if (state.closed) markRestoredFinish('fight-promoter');\n    return { state, plan: { ...s.plan, bookings:" },
  ], test: titles.early },
  zeroEventXp: { file: board, from: "!!state?.closed && state.history.length > 0", to: '!!state?.closed', test: titles.early },
  ending: { file: engine, from: 'closed: state.event === 12', to: 'closed: false', test: titles.finish },
};
const control = process.env.MMA_PROMOTION_CONTROL || '';
assert(!control || control === 'all' || control in controls, 'Known MMA promotion control');
const evidence = path.resolve(process.env.MMA_PROMOTION_ARTIFACTS || path.join(root, 'mma-promotion-artifacts/mounted'));
await mkdir(evidence, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const mode of ['', ...Object.keys(controls)]) {
    const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, MMA_PROMOTION_CONTROL: mode, MMA_PROMOTION_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
    const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(evidence, `${mode || 'normal'}-runner.log`), output);
    const passed = run.status === 0 && !run.error && !run.signal; outcomes.push({ control: mode || 'normal', passed, exit: run.status, error: String(run.error || '') });
    console.log(`${passed ? 'PASS' : 'FAIL'} MMA promotion ${mode || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simMmaPromotion')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(outcomes, null, 2));
  assert(outcomes.every(row => row.passed), 'Every normal and control outcome passed; all modes were attempted');
  console.log(`simMmaPromotion: ${Object.keys(titles).length} outcomes, real bundled strategy distributions and ${Object.keys(controls).length} effective controls passed.`); process.exit(0);
}
const held = [];
for (const relative of [engine, hook, board, 'src/components/fight-promoter/FightPromoterModes.tsx', testFile]) {
  const file = path.join(root, relative), bytes = await readFile(file); held.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} raw bytes held`)));
}
const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
let folder;
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/mma-promotion-'));
  if (control) {
    const spec = controls[control], source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    let changed = source;
    for (const mutation of spec.changes || [spec]) {
      assert.equal(changed.split(mutation.from).length - 1, 1, `${control} binds exactly one executable anchor`);
      const next = changed.replace(mutation.from, mutation.to); assert.notEqual(next, changed, `${control} changes executable source`); changed = next;
    }
    const target = path.join(folder, path.basename(spec.file)); await writeFile(target, changed); await writeFile(path.join(evidence, `${control}-${path.basename(spec.file)}.txt`), changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx?$/, '')]: target });
  } else {
    const outfile = path.join(folder, 'engine.mjs');
    await build({ entryPoints: [path.join(root, engine)], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
    const mma = await import(pathToFileURL(outfile).href), rows = [];
    for (const price of mma.MMA_PRICES) {
      let profit = 0, quality = 0, cash = 0, legacy = 0, rests = 0;
      for (let seed = 0; seed < 24; seed++) {
        let state = mma.newMmaPromotion('Bundled strategy', `strategy-${seed}`); const ids = state.fighters.filter(f => f.division === 'light' && f.contract > 0).map(f => f.id);
        while (!state.closed) {
          for (const id of ids) if (state.fighters.find(f => f.id === id).contract <= 1) state = mma.signMmaFighter(state, id);
          assert(state, 'The measured strategy can afford its renewals');
          let available = mma.mmaRankings(state, 'light').filter(f => f.recoveryUntil <= state.month);
          while (available.length < 2) { const next = mma.advanceMmaMonth(state); assert.notEqual(next, state, 'Recovery strategy can afford its month off'); state = next; rests++; available = mma.mmaRankings(state, 'light').filter(f => f.recoveryUntil <= state.month); }
          const plan = { venueId: mma.MMA_VENUES[0].id, ticketPrice: price, bookings: [{ aId: available[0].id, bId: available[1].id, title: false }] };
          const event = mma.runMmaEvent(state, plan); assert(event, 'Bundled strategy card is affordable and legal');
          profit += event.result.profit; quality += event.result.bouts[0].quality; state = event.state;
        }
        assert.equal(state.history.length, 12); assert.equal(state.event, 13); assert.deepEqual(mma.loadMmaPromotion(state), state, 'Actual bundled campaigns reload'); cash += state.cash; legacy += mma.mmaPromotionScore(state);
      }
      rows.push({ price, seeds: 24, events: 288, meanProfit: profit / 288, meanQuality: quality / 288, meanFinalCash: cash / 24, meanLegacy: legacy / 24, rests });
    }
    await writeFile(path.join(evidence, 'strategies.json'), JSON.stringify(rows, null, 2));
    assert(new Set(rows.map(row => row.meanProfit)).size > 1, 'Ticket policy changes actual average event profit');
    console.log(`simMmaPromotion bundled strategies: ${JSON.stringify(rows)}`);
  }
  const reportFile = path.join(evidence, `${control || 'normal'}-report.json`);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
  if (control) args.push('--testNamePattern', [controls[control].test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; await writeFile(path.join(evidence, `${control || 'normal'}-vitest.log`), output); process.stdout.write(output);
  assert(!run.error && !run.signal, 'Runner completes without interruption');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|Transform failed|Failed to (?:resolve import|load)|Cannot find module/, 'Runtime failures do not earn control credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(result => result.assertionResults), count = Object.keys(titles).length;
  assert.equal(rows.length, count); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const failed = rows.filter(row => row.status === 'failed'), passed = rows.filter(row => row.status === 'passed');
  if (control) {
    assert.equal(run.status, 1); assert.deepEqual(failed.map(row => row.title), [controls[control].test]); assert.deepEqual(passed.map(row => row.title), [titles.baseline]);
    assert.equal(rows.filter(row => ['pending', 'skipped'].includes(row.status)).length, count - 2);
    const failure = failed.flatMap(row => row.failureMessages).join('\n'); assert.match(failure, /AssertionError/); assert.doesNotMatch(failure, /TypeError|ReferenceError|TestingLibraryElementError|Timed out/);
  } else {
    assert.equal(run.status, 0); assert.equal(failed.length, 0); assert.equal(passed.length, count); assert.deepEqual(new Set(passed.map(row => row.title)), new Set(Object.values(titles)));
  }
  console.log(`simMmaPromotion ${control || 'normal'}: intended outcome assertions and independent boxing baseline passed.`);
} finally {
  if (folder) { assert(path.resolve(folder).startsWith(path.join(root, '.sim-control') + path.sep), 'Control cleanup stays in its workspace'); await rm(folder, { recursive: true, force: true }); await rmdir(path.join(root, '.sim-control')).catch(() => {}); }
  for (const verify of held) await verify();
}
