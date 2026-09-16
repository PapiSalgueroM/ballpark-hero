/**
 * Round 587: real tycoon minutes, one durable attempt, and one normal goal.
 * Controls patch one asserted executable anchor in an OS temp copy only.
 * Ignored offers are compared with the committed pre-round 586 histories.
 * The perfect kicker changes one goal, never the match's seeded roll stream.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoon-set-piece-'));
const CONTROL = process.env.SETPIECE_CONTROL || '';
const NOW = 1767225600000;
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/allPlayersValueBaseline.json'), 'utf8'));
const mutations = {
  twice: ['if (s.setPieceUsedMatch === current.match) return null;', 'if (false) return null;'],
  retry: ['s.setPieceAttemptedMatch === offer.match || ', ''],
  away: ['if (!watched) return null;', 'if (false) return null;'],
  window: ['export const SET_PIECE_WINDOW_SEC = 12;', 'export const SET_PIECE_WINDOW_SEC = 24;'],
  nogain: ['goalsFor: s.goalsFor + 1, totalGoals: s.totalGoals + 1, setPieceUsedMatch:', 'goalsFor: s.goalsFor, totalGoals: s.totalGoals, setPieceUsedMatch:'],
  bonus: ['const amount = goalBonus(s);', 'const amount = goalBonus(s) * 2;'],
  forget: ['...(s.setPieceAttemptedMatch !== undefined ? { setPieceAttemptedMatch: s.setPieceAttemptedMatch } : {}),', ''],
  loader: ['Number.isSafeInteger(value) && value >= 0 && value <= (s.totalMatches ?? 0)', 'true'],
  ignored: ['const earned = incomePerSec(st) * dt;', 'const earned = incomePerSec(st) * dt + 1;'],
  random: ['seed: hash32(match, 587, 1),', 'seed: Math.random(),'],
};
assert(!CONTROL || CONTROL === 'daily' || CONTROL in mutations, `unknown SETPIECE_CONTROL=${CONTROL}`);
const target = {
  twice: ['one goal and normal bonus in 10,000 matches'],
  retry: ['one goal and normal bonus in 10,000 matches'],
  away: ['deterministic offers and away exclusion'],
  window: ['offer window and expired match guards'],
  nogain: ['perfect-kicker measured win uplift'],
  bonus: ['one goal and normal bonus in 10,000 matches'],
  forget: ['reload, malformed latches and prestige'],
  loader: ['reload, malformed latches and prestige'],
  ignored: ['ignored offers preserve frozen watched and away histories'],
  random: ['deterministic offers and away exclusion'],
  daily: ['board import graph has no daily or completion dependency', 'board runtime has no daily, completion or storage side effect'],
};
const failures = [];
let sections = 0;
const hash = value => createHash('sha256').update(value).digest('hex');
function check(name, work) {
  if (CONTROL && !target[CONTROL].includes(name)) return;
  sections += 1;
  try { console.log(`PASS ${name}: ${work()}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}
function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, 'control must match one executable anchor');
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, 'control must change the source');
  console.log(`CONTROL ${CONTROL}: one unique executable mutation applied`);
  return changed;
}

try {
  let entry = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
  if (CONTROL && CONTROL !== 'daily') {
    const source = fs.readFileSync(entry, 'utf8');
    entry = path.join(TEMP, `stadium-${CONTROL}.ts`);
    fs.writeFileSync(entry, replaceOnce(source, ...mutations[CONTROL]));
  }
  const bundle = path.join(TEMP, 'engine.mjs');
  await build({ stdin: { contents: [
    `export * as T from ${JSON.stringify(entry.replaceAll('\\', '/'))};`,
    `export * as L from ${JSON.stringify(path.join(ROOT, 'src/lib/leagueCore.ts').replaceAll('\\', '/'))};`,
    `export * as F from ${JSON.stringify(path.join(ROOT, 'src/lib/freeKick.ts').replaceAll('\\', '/'))};`,
  ].join('\n'), resolveDir: ROOT, loader: 'ts' }, outfile: bundle, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const { T, L, F } = await import(pathToFileURL(bundle).href);
  const fresh = T.newTycoon(NOW);
  const offeredState = (match = 0) => ({ ...fresh, totalMatches: match, minute: 20 + L.hash32(match) % 61, matchSec: 0 });

  check('deterministic offers and away exclusion', () => {
    const minutes = new Set(), freeKicks = new Set();
    let penalties = 0;
    for (let match = 0; match < 10000; match += 1) {
      const s = offeredState(match), before = JSON.stringify(s);
      const a = T.setPieceOffer(s, true), b = T.setPieceOffer(s, true);
      assert(a, `missing offer in match ${match}`);
      assert.deepEqual(a, b, `offer rerolled in match ${match}`);
      assert.equal(JSON.stringify(s), before, 'reading an offer mutated the save');
      assert.equal(T.setPieceOffer(s, false), null, 'away play exposed an offer');
      assert(a.minute >= 20 && a.minute <= 80);
      assert.equal(a.remainingSec, 12);
      const kick = F.buildRun(a.seed)[a.kickIndex];
      assert(kick, 'offer did not map to a real kick');
      if (a.kind === 'penalty') { penalties += 1; assert.equal(a.kickIndex, 0); assert.equal(kick.wallSize, 0); }
      else { assert(a.kickIndex >= 2 && a.kickIndex <= 6); assert(kick.wallSize > 0); freeKicks.add(a.kickIndex); }
      minutes.add(a.minute);
    }
    assert.equal(penalties, 3334);
    assert.equal(minutes.size, 61);
    assert.equal(freeKicks.size, 5);
    return '10,000 unchanged repeat offers; 3,334 penalties; all 61 minutes and five free-kick indices; zero away offers';
  });

  check('offer window and expired match guards', () => {
    const s = offeredState(1), offer = T.setPieceOffer(s, true);
    assert(offer);
    assert.equal(T.setPieceOffer({ ...s, minute: s.minute - 1, matchSec: 1.399 }, true), null);
    assert(T.setPieceOffer({ ...s, minute: s.minute + 8, matchSec: 0.799 }, true));
    const ended = { ...s, minute: s.minute + 8, matchSec: 0.8 };
    assert.equal(T.setPieceOffer(ended, true), null, 'offer survives its twelve-second window');
    assert.equal(T.beginSetPiece(ended, offer), ended, 'expired opening changes the state');
    const started = T.beginSetPiece(s, offer);
    assert(T.awardSetPieceGoal({ ...started, minute: 89, matchSec: 1.3 }, offer), 'opened kick incorrectly expires with its offer');
    for (const altered of [
      { ...started, minute: 90 }, { ...started, minute: offer.minute - 1 },
      { ...started, totalMatches: offer.match + 1 }, { ...started, rep: offer.rep + 1 },
    ]) assert.equal(T.awardSetPieceGoal(altered, offer), null, 'expired or premature shot was awarded');
    assert.equal(T.awardSetPieceGoal(s, offer), null, 'unopened shot was awarded');
    assert.equal(T.beginSetPiece(s, { ...offer, seed: offer.seed + 1 }), s, 'a changed kick was opened');
    return 'exact window boundaries; an opened kick can finish before full time; stale match and ground tokens rejected';
  });

  check('one goal and normal bonus in 10,000 matches', () => {
    let paid = 0;
    for (let match = 0; match < 10000; match += 1) {
      const s = offeredState(match), offer = T.setPieceOffer(s, true);
      assert(offer);
      const before = JSON.stringify(s);
      const started = T.beginSetPiece(s, offer);
      assert.notEqual(started, s);
      assert.equal(JSON.stringify(s), before, 'opening mutates the old ref before storage can succeed');
      assert.equal(T.setPieceOffer(started, true), null, 'failed or closed kick can reopen');
      assert.equal(T.beginSetPiece(started, offer), started, 'a second opening changes state');
      const begun = JSON.stringify(started);
      const goal = T.awardSetPieceGoal(started, offer);
      assert(goal);
      assert.equal(JSON.stringify(started), begun, 'awarding mutates the old ref before storage can succeed');
      assert.equal(goal.state.goalsFor - started.goalsFor, 1);
      assert.equal(goal.state.totalGoals - started.totalGoals, 1);
      assert.equal(goal.state.money - started.money, T.goalBonus(started));
      assert.equal(goal.state.lifetime - started.lifetime, T.goalBonus(started));
      assert.deepEqual(goal.event, { kind: 'goal', amount: T.goalBonus(started), minute: started.minute });
      assert.equal(goal.state.totalWins, started.totalWins, 'the kick itself settled a match');
      assert.equal(goal.state.totalMatches, started.totalMatches);
      for (let repeat = 0; repeat < 4; repeat += 1) assert.equal(T.awardSetPieceGoal(goal.state, offer), null, 'duplicate set-piece goal');
      paid += 1;
    }
    return `${paid} single normal bonuses; 40,000 duplicate awards rejected; no mutation before save acceptance`;
  });

  check('reload, malformed latches and prestige', () => {
    const absent = T.deserializeTycoon(T.serializeTycoon(fresh, NOW), NOW);
    assert(absent);
    assert(!Object.hasOwn(absent, 'setPieceAttemptedMatch'));
    assert(!Object.hasOwn(absent, 'setPieceUsedMatch'));
    const s = offeredState(17), offer = T.setPieceOffer(s, true);
    const started = T.beginSetPiece(s, offer);
    const reloaded = T.deserializeTycoon(T.serializeTycoon(started, NOW), NOW);
    assert(reloaded);
    assert.equal(T.setPieceOffer(reloaded, true), null, 'reload reopens a missed or closed attempt');
    const paid = T.awardSetPieceGoal(started, offer).state;
    const paidReloaded = T.deserializeTycoon(T.serializeTycoon(paid, NOW), NOW);
    assert.equal(T.awardSetPieceGoal(paidReloaded, offer), null, 'reload duplicates a paid goal');
    for (const input of [started, paid]) {
      const moved = T.prestige({ ...input, lifetime: T.prestigeThreshold(input) }, NOW);
      assert.equal(moved.setPieceAttemptedMatch, input.setPieceAttemptedMatch, 'selling up loses the attempted latch');
      assert.equal(moved.setPieceUsedMatch, input.setPieceUsedMatch, 'selling up loses the paid latch');
      assert.equal(T.awardSetPieceGoal({ ...moved, minute: offer.minute }, offer), null, 'old board pays after selling up');
      assert.equal(T.setPieceOffer({ ...moved, minute: offer.minute }, true), null, 'selling up reopens the same career match');
    }
    let malformed = 0;
    for (const key of ['setPieceAttemptedMatch', 'setPieceUsedMatch']) for (const value of [-1, 0.5, 18, null, '17', {}, [], 1e100]) {
      const loaded = T.deserializeTycoon(JSON.stringify({ ...s, [key]: value }), NOW);
      assert(loaded, 'one bad latch rejects the entire save');
      assert.equal(loaded[key], 17, `malformed ${key} did not consume the current match`);
      assert.equal(T.setPieceOffer(loaded, true), null);
      malformed += 1;
    }
    for (const totalMatches of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(T.setPieceOffer({ ...s, totalMatches }, true), null, 'unsafe career counter creates an offer');
    }
    return `absent fields stay absent; failed, closed and paid shots survive reload and prestige; ${malformed} malformed latches fail closed`;
  });

  check('ignored offers preserve frozen watched and away histories', () => {
    assert.equal(BASE.cases.length, 12);
    for (const row of BASE.cases) {
      let s = structuredClone(row.initial);
      const roll = L.mulberry32(row.seed), digest = createHash('sha256');
      for (let i = 0; i < BASE.steps; i += 1) {
        T.setPieceOffer(s, true);
        const result = T.tick(s, BASE.dt[i % BASE.dt.length], roll, 0);
        s = result.state;
        digest.update(JSON.stringify(result));
      }
      assert.equal(digest.digest('hex'), row.watchedHash, `ignored-offer watched baseline seed ${row.seed}`);
      assert.equal(hash(JSON.stringify(T.playAwayMatchdays(structuredClone(row.initial), 40, L.mulberry32(row.seed), 0))), row.awayHash, `away baseline seed ${row.seed}`);
    }
    return `${BASE.cases.length} committed pre-round watched and away histories are byte identical, including rolls and money`;
  });

  const competition = T.newLeague(0, 3, 0, undefined, 70);
  function policy(seedStart, count) {
    let ignoredWins = 0, kickerWins = 0, goals = 0;
    for (let i = 0; i < count; i += 1) {
      const match = seedStart + i;
      const initial = { ...fresh, levels: { ...fresh.levels, squad: 40 }, league: competition, matchNo: 70, totalMatches: match };
      const arms = [structuredClone(initial), structuredClone(initial)];
      const rolls = [L.mulberry32(match * 101), L.mulberry32(match * 101)];
      const wins = [false, false];
      for (let side = 0; side < 2; side += 1) {
        let s = arms[side];
        for (let minute = 0; minute < 90; minute += 1) {
          const offer = T.setPieceOffer(s, true);
          if (offer && side === 1) {
            s = T.beginSetPiece(s, offer);
            const awarded = T.awardSetPieceGoal(s, offer);
            assert(awarded, 'perfect kicker could not commit its one goal');
            goals += awarded.state.goalsFor - s.goalsFor;
            s = awarded.state;
          }
          const events = [];
          T.playMinute(s, rolls[side], events, { pay: true });
          if (events.some(e => e.kind === 'win')) wins[side] = true;
        }
        assert.equal(s.totalMatches, match + 1, 'policy did not finish exactly one real match');
      }
      ignoredWins += Number(wins[0]);
      kickerWins += Number(wins[1]);
      assert(!wins[0] || wins[1], 'adding one goal turned a win into a non-win');
    }
    return { matches: count, seedStart, ignoredWins, kickerWins, uplift: (kickerWins - ignoredWins) / count, goals };
  }

  check('perfect-kicker measured win uplift', () => {
    const calibration = CONTROL === 'nogain' ? [] : [policy(1, 2000), policy(2001, 2000)];
    const holdout = policy(4001, 2000);
    console.log(`MEASUREMENT ${JSON.stringify({ calibration, holdout })}`);
    for (const row of [...calibration, holdout]) {
      // Measured 2026-09-15 on the unmutated engine: 12.25 and 11.00 points
      // across two 2,000-match batches, mean 11.625. The fixed band gives 50%
      // headroom around that mean. It is never recalibrated by a control run.
      assert(row.uplift >= 0.058125 && row.uplift <= 0.174375, `win uplift ${row.uplift} is outside the frozen measured band`);
      assert.equal(row.goals, row.matches, 'perfect policy did not add exactly one goal per match');
    }
    return 'two 2,000-match calibration batches and one independent 2,000-match holdout; frozen uplift band 5.8125..17.4375 percentage points';
  });

  if (!CONTROL || CONTROL === 'daily') {
    let board = path.join(ROOT, 'src/components/tycoon/SetPieceBoard.tsx');
    const env = { ...process.env };
    const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/tycoonSetPieceBoard.test.tsx', '--reporter=verbose', '--reporter=json', `--outputFile.json=${path.join(TEMP, 'board-report.json')}`];
    if (CONTROL === 'daily') {
      let source = fs.readFileSync(board, 'utf8');
      source = replaceOnce(source, "import { useId, useMemo, useRef, useState } from 'react';", "import { useId, useMemo, useRef, useState } from 'react';\nimport { writeArcadeRun } from '@/lib/arcadeRecord';");
      source = replaceOnce(source, 'const shot = takeShot(aim, kick, lehmer(seed));', "const shot = takeShot(aim, kick, lehmer(seed));\n    writeArcadeRun('free-kick', 'control', 'goals', { score: shot.points, count: Number(shot.scored) });");
      board = path.join(TEMP, 'SetPieceBoard.tsx');
      fs.writeFileSync(board, source);
      env.SET_PIECE_BOARD = '/@fs/' + board.replaceAll('\\', '/');
      const config = {
        root: ROOT,
        test: { environment: 'jsdom', globals: true, setupFiles: [path.join(ROOT, 'src/test/setup.ts')], include: ['src/test/tycoonSetPieceBoard.test.tsx'] },
        esbuild: { jsx: 'automatic' },
        resolve: { alias: { '@': path.join(ROOT, 'src') }, dedupe: ['react', 'react-dom', 'lucide-react'] },
        server: { fs: { allow: [ROOT, TEMP, fs.realpathSync(path.join(ROOT, 'node_modules'))] } },
      };
      fs.writeFileSync(path.join(TEMP, 'vitest.config.mjs'), `export default ${JSON.stringify(config)};\n`);
      args.push('--config', path.join(TEMP, 'vitest.config.mjs'), '-t', 'uses the selected shot once, with no daily record or completion');
    }
    const graph = await build({ entryPoints: [board], bundle: true, write: false, metafile: true, packages: 'external', platform: 'browser', format: 'esm', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, loader: { '.css': 'empty' } });
    check('board import graph has no daily or completion dependency', () => {
      const inputs = Object.keys(graph.metafile.inputs);
      assert(inputs.some(file => /[/\\]freeKick\.ts$/.test(file)), 'graph did not reach the real shot engine');
      assert(!inputs.some(file => /[/\\](?:useGameCompletion|arcadeRecord|completions)\.[jt]sx?$/.test(file)), 'board imports a daily record or completion module');
      return `${inputs.length} actual source modules traversed, including the shot engine`;
    });
    check('board runtime has no daily, completion or storage side effect', () => {
      const result = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      if (result.error) throw result.error;
      console.log(result.stdout || '');
      if (result.stderr) console.error(result.stderr);
      const reportPath = path.join(TEMP, 'board-report.json');
      assert(fs.existsSync(reportPath), 'focused board runtime produced no report');
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      const rows = report.testResults.flatMap(file => file.assertionResults);
      const spy = rows.find(row => row.title === 'uses the selected shot once, with no daily record or completion');
      assert(spy, 'runtime spy did not execute');
      assert.equal(spy.status, 'passed', 'real board touched the daily, completion or storage spy');
      assert.equal(result.status, 0, 'another focused board interaction check failed');
      return `${rows.filter(row => row.status === 'passed').length} real board tests passed; selected aim, no records, same-shot save retry and expiry`;
    });
  }

  console.log(`Tycoon set pieces: ${sections - failures.length}/${sections} selected sections pass${CONTROL ? ` (${CONTROL} control)` : ''}`);
  if (CONTROL) {
    for (const name of target[CONTROL]) assert(failures.includes(name), `${CONTROL} control failed to break its intended check: ${name}`);
    console.log(`CONTROL PROVED ${CONTROL}: ${failures.join(', ')}`);
  }
  process.exitCode = failures.length ? 1 : 0;
} finally {
  assert.equal(path.dirname(path.resolve(TEMP)), path.resolve(os.tmpdir()), 'cleanup must stay in the OS temp directory');
  assert(path.basename(TEMP).startsWith('tycoon-set-piece-'));
  fs.rmSync(TEMP, { recursive: true, force: true });
}
