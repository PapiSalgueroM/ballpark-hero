import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { SOCCER_IMPERIALISM as sport } from '@/data/soccerConquest';
import { dailyConquestRng } from '@/lib/conquestDaily';
import { continueRun, featuredPairing, playRound, runScore, startRun } from '@/lib/conquestRun';
import { homeWinProb, matchupMomentum, resolveGame } from '@/lib/imperialismEngine';

function freePlayRng() {
  let seed = 17;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const seasons = [
  { mode: 'Daily', source: () => dailyConquestRng('soccer', '2026-11-26'), odds: [85, 28], champion: 'ARS', score: 797, hash: '721b7b5e78f66b299110e0d723719e2c6a8638c110b8e6fc5ea2579d149771f9' },
  { mode: 'Free Play', source: freePlayRng, odds: [12, 95], champion: 'PFC', score: 175, hash: 'd6cbf7c88ddcb00d50b9018649a9939c741b632a07c0f33a245da0f68ad11345' },
];

it.each(seasons)('$mode uses the simulated match odds and preserves the seeded season', ({ source, odds, champion, score, hash }) => {
  const next = source();
  let draws = 0;
  const rng = () => { draws += 1; return next(); };
  let run = startRun(sport, 'ARS', rng);
  const seen: number[] = [];
  while (run.phase !== 'done') {
    const [home, away] = featuredPairing(sport, run)!;
    if (!run.bracket && (run.round === 7 || run.round === 9)) {
      const context = matchupMomentum(home, away, run.owners, run.records);
      const forecast = homeWinProb(sport, home, away, context);
      const base = homeWinProb(sport, home, away);
      seen.push(Math.round(forecast * 100));
      expect(Math.round(base * 100)).not.toBe(Math.round(forecast * 100));
      const between = (forecast + base) / 2;
      const result = resolveGame(sport, home, away, { ...run.owners }, () => between, run.records);
      expect(result.winner).toBe(between < forecast ? home : away);
    }
    run = continueRun(sport, playRound(sport, run, home, rng), rng);
  }
  expect(seen).toEqual(odds);
  expect(draws).toBe(2411);
  expect(run.champion).toBe(champion);
  expect(runScore(run)).toBe(score);
  const outcome = { rounds: run.rounds, owners: run.owners, picks: run.picks, score: runScore(run) };
  expect(createHash('sha256').update(JSON.stringify(outcome)).digest('hex')).toBe(hash);
});
