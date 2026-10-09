import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SOCCER_PS_VERSION, SOCCER_PS_BUDGET, SOCCER_PS_GAMES, SOCCER_PS_ALPHA, SOCCER_PS_SLOTS,
  dailySoccerSeed, unlimitedSoccerSeed, dealSoccerXI, canDraftSoccerCard, draftSoccerCost,
  weightedSoccerStrength, soccerTeamOverall, bestAffordableSoccerXI, soccerSeasonOdds,
  soccerMatchOutcome, scoreSoccerMatches, simulateSoccerSeason, createSoccerRun,
  restoreSoccerRun, deriveSoccerRun, type SoccerPSCard, type SoccerPSDeal,
} from '@/lib/soccerPerfectSeason';

const weights = [2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1];
const dates = Array.from({ length: 128 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
const cheapest = Array(11).fill(0);
// First remote 128-day mean gap was 56.734375 points, leaving 16.734375 above this gate.
const requiredMeanPointsGap = 40;
const observations: Record<string, unknown> = {};
function retain(name: string, value: unknown) {
  observations[name] = value;
  if (process.env.SOCCER_SEASON_OUTCOME_OUT) {
    const file = process.env.SOCCER_SEASON_OUTCOME_OUT;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(observations, null, 2) + '\n');
  }
}
const fixture = (): SoccerPSCard[][] => weights.map((_, slot) => [3, 5, 7].map(cost => ({
  playerId: `fixture-${slot}-${cost}`, name: `Fictional role ${slot}-${cost}`, rating: 56 + 5 * cost,
  eligible: [SOCCER_PS_SLOTS[slot].key], detail: 'Fictional game input', cost: cost as 3 | 5 | 7,
})));
const rawStrength = (deal: SoccerPSDeal, choices: number[]) => choices.reduce((sum, pick, slot) => sum + deal[slot][pick].rating * weights[slot], 0);

// Enumerates actual affordable complete XIs independently of the engine solver.
function exhaustive(deal: SoccerPSDeal) {
  let leaves = 0, bestStrength = -1, bestChoices: number[] = [];
  const visit = (choices: number[], spent: number, strength: number) => {
    if (choices.length === 11) {
      leaves += 1;
      if (strength > bestStrength) { bestStrength = strength; bestChoices = choices; }
      return;
    }
    const slot = choices.length;
    for (let pick = 0; pick < 3; pick += 1) {
      const card = deal[slot][pick];
      if (spent + card.cost <= 55) visit([...choices, pick], spent + card.cost, strength + card.rating * weights[slot]);
    }
  };
  visit([], 0, 0);
  return { leaves, bestStrength, bestChoices };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Soccer Perfect Season pure outcomes', () => {
  it('keeps an independent win and loss points ledger', () => {
    const record = scoreSoccerMatches([...Array(20).fill('W'), ...Array(18).fill('L')]);
    retain('independentLedger', record);
    expect([record.played, record.wins, record.draws, record.losses, record.points, record.score]).toEqual([38, 20, 0, 18, 60, 53]);
  });

  it('deals eleven fixed weighted slots with three fixed price offers', () => {
    expect([SOCCER_PS_BUDGET, SOCCER_PS_GAMES, SOCCER_PS_ALPHA]).toEqual([55, 38, 5]);
    expect(SOCCER_PS_SLOTS.map(slot => slot.key)).toEqual(['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'LW', 'ST', 'RW']);
    expect(SOCCER_PS_SLOTS.map(slot => slot.weight)).toEqual(weights);
    for (const seed of [0, 1, 17, 0xffffffff]) {
      const deal = dealSoccerXI(seed);
      expect(deal).toHaveLength(11);
      expect(deal.map(cards => cards.map(card => card.cost))).toEqual(Array.from({ length: 11 }, () => [3, 5, 7]));
      expect(new Set(deal.flat().map(card => card.playerId)).size).toBe(33);
      expect(deal.flat().every(card => Number.isFinite(card.rating) && card.rating >= 40 && card.rating <= 99)).toBe(true);
    }
    const deal = fixture();
    const picks = [2, 1, 1, 1, 1, 1, 1, 1, 0, 2, 0];
    expect(weightedSoccerStrength(deal, picks)).toBe(rawStrength(deal, picks));
    expect(soccerTeamOverall(deal, picks)).toBeCloseTo(1073 / 13, 12);
  });

  it('reserves a basic card for every remaining slot on every reachable draft', () => {
    const deal = dealSoccerXI(20261008);
    const mismatches: unknown[] = [];
    let prefixes = 0, leaves = 0, legalEdges = 0;
    const visit = (choices: number[], spent: number) => {
      prefixes += 1;
      if (draftSoccerCost(deal, choices) !== spent) mismatches.push({ choices, spent, actualCost: draftSoccerCost(deal, choices) });
      if (choices.length === 11) { leaves += 1; return; }
      for (let pick = 0; pick < 3; pick += 1) {
        const expected = spent + [3, 5, 7][pick] + 3 * (10 - choices.length) <= 55;
        const actual = canDraftSoccerCard(deal, choices, pick);
        if (actual !== expected && mismatches.length < 20) mismatches.push({ choices, pick, spent, expected, actual });
        if (expected) { legalEdges += 1; visit([...choices, pick], spent + [3, 5, 7][pick]); }
      }
    };
    visit([], 0);
    retain('reserveEnumeration', { seed: 20261008, prefixes, leaves, legalEdges, mismatches });
    expect(mismatches).toEqual([]);
    expect(leaves).toBe(exhaustive(deal).leaves);
    expect(legalEdges).toBe(prefixes - 1);
    expect(canDraftSoccerCard(deal, [2, 2, 2, 2, 2], 2)).toBe(false);
    expect(canDraftSoccerCard(deal, [2, 2, 2, 2, 2], 0)).toBe(true);
    expect(canDraftSoccerCard(deal, cheapest, 0)).toBe(false);
  }, 30000);

  it('matches an exhaustive affordable ceiling and keeps its legal witness', () => {
    const grids = [fixture(), ...[1, 17, 20261008].map(seed => dealSoccerXI(seed))];
    const ceilings: unknown[] = [];
    for (const deal of grids) {
      const oracle = exhaustive(deal), best = bestAffordableSoccerXI(deal);
      ceilings.push({ deal, oracle, best, actualWitnessStrength: rawStrength(deal, best.choices) });
      retain('exhaustiveCeilings', ceilings);
      expect(best.choices).toHaveLength(11);
      expect(best.weightedStrength).toBe(oracle.bestStrength);
      expect(rawStrength(deal, best.choices)).toBe(oracle.bestStrength);
      expect(best.spent).toBe(draftSoccerCost(deal, best.choices));
      expect(best.spent).toBeLessThanOrEqual(55);
      best.choices.forEach((pick, slot) => expect(canDraftSoccerCard(deal, best.choices.slice(0, slot), pick)).toBe(true));
      expect(soccerSeasonOdds(best.weightedStrength, best.weightedStrength)).toEqual({ win: 1, draw: 0, loss: 0, perfect: 1, unbeaten: 1 });
    }
    const deal = fixture(), best = bestAffordableSoccerXI(deal);
    const earlyWing = [2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 2];
    const lateStriker = [2, 1, 1, 1, 1, 1, 1, 1, 0, 2, 0];
    expect([draftSoccerCost(deal, earlyWing), draftSoccerCost(deal, lateStriker)]).toEqual([55, 55]);
    expect([rawStrength(deal, earlyWing), rawStrength(deal, lateStriker), best.weightedStrength]).toEqual([1053, 1073, 1073]);
    expect([best.choices[0], best.choices[9]]).toEqual([2, 2]);
  }, 30000);

  it('scores the worked draw fixture as 112 points and 98', () => {
    const record = scoreSoccerMatches([...Array(37).fill('W'), 'D']);
    retain('workedDraw', record);
    expect([record.played, record.wins, record.draws, record.losses, record.points, record.score]).toEqual([38, 37, 1, 0, 112, 98]);
    expect(soccerMatchOutcome(0.4, 0)).toBe('W');
    expect(soccerMatchOutcome(0.4, 0.4)).toBe('D');
    expect(soccerMatchOutcome(0.4, 0.699999)).toBe('D');
    expect(soccerMatchOutcome(0.4, 0.7)).toBe('L');
    expect(soccerMatchOutcome(0, 0.499999)).toBe('D');
    expect(soccerMatchOutcome(0, 0.5)).toBe('L');
  });

  it('requires 38 wins for perfect and no losses for unbeaten', () => {
    retain('verdicts', [Array(38).fill('W'), [...Array(37).fill('W'), 'D'], [...Array(37).fill('W'), 'L'], Array(37).fill('W')].map(games => scoreSoccerMatches(games)));
    expect(scoreSoccerMatches(Array(38).fill('W'))).toMatchObject({ played: 38, wins: 38, points: 114, score: 100, perfect: true, unbeaten: true });
    expect(scoreSoccerMatches([...Array(37).fill('W'), 'D'])).toMatchObject({ perfect: false, unbeaten: true });
    expect(scoreSoccerMatches([...Array(37).fill('W'), 'L'])).toMatchObject({ perfect: false, unbeaten: false });
    expect(scoreSoccerMatches(Array(37).fill('W'))).toMatchObject({ played: 37, perfect: false, unbeaten: true });
  });

  it('plays exactly 38 deterministic outcomes with counts equal to its games', () => {
    for (const chance of [0, 0.4, 0.75, 1]) {
      const a = simulateSoccerSeason(chance, 20261008), b = simulateSoccerSeason(chance, 20261008);
      retain(`seasonChance${chance}`, { a, b });
      expect(a).toEqual(b);
      expect(a.games).toHaveLength(38);
      expect(a).toMatchObject(scoreSoccerMatches(a.games));
      expect([a.wins, a.draws, a.losses]).toEqual(['W', 'D', 'L'].map(result => a.games.filter(game => game === result).length));
      if (chance === 0) expect(a.wins).toBe(0);
      if (chance === 1) expect(a.games).toEqual(Array(38).fill('W'));
    }
  });

  it('changes actual deal and season streams across dates modes and versions', () => {
    const otherVersion = SOCCER_PS_VERSION + '-future';
    const seed = dailySoccerSeed('2026-10-08');
    const offers = (version: string) => dealSoccerXI(seed, version).map(cards => cards.map(card => card.rating));
    retain('streamIsolation', { seed, nextDaySeed: dailySoccerSeed('2026-10-09'), otherVersionSeed: dailySoccerSeed('2026-10-08', otherVersion), unlimitedSeed: unlimitedSoccerSeed(seed), offers: offers(SOCCER_PS_VERSION), otherVersionOffers: offers(otherVersion), season: simulateSoccerSeason(0.4, seed), otherVersionSeason: simulateSoccerSeason(0.4, seed, otherVersion) });
    expect(dailySoccerSeed('2026-10-08')).toBe(seed);
    expect(seed).not.toBe(dailySoccerSeed('2026-10-09'));
    expect(seed).not.toBe(unlimitedSoccerSeed(seed));
    expect(seed).not.toBe(dailySoccerSeed('2026-10-08', otherVersion));
    expect(unlimitedSoccerSeed(17)).not.toBe(unlimitedSoccerSeed(17, otherVersion));
    expect(offers(SOCCER_PS_VERSION)).not.toEqual(offers(otherVersion));
    expect(simulateSoccerSeason(0.4, seed).games).not.toEqual(simulateSoccerSeason(0.4, seed, otherVersion).games);
    expect(simulateSoccerSeason(0.4, seed).games).not.toEqual(simulateSoccerSeason(0.4, dailySoccerSeed('2026-10-09')).games);
    expect(new Set(dates.map(date => dailySoccerSeed(date))).size).toBe(128);
  });

  it('replays offers independently of choices and restores minimal valid saves', () => {
    const run = createSoccerRun('daily', '2026-10-08', 17);
    expect(run).toEqual(createSoccerRun('daily', '2026-10-08', 99));
    expect(Object.keys(run).sort()).toEqual(['choices', 'completionRecorded', 'date', 'mode', 'revealed', 'seed', 'version']);
    const a = deriveSoccerRun({ ...run, choices: [0] }), b = deriveSoccerRun({ ...run, choices: [1] });
    expect(a.deal).toEqual(b.deal);
    expect(a.deal).toEqual(dealSoccerXI(run.seed, run.version));
    const best = bestAffordableSoccerXI(a.deal);
    for (const revealed of [0, 1, 17, 38]) {
      const saved = { ...run, choices: best.choices, revealed, completionRecorded: revealed === 38 };
      const raw = JSON.stringify(saved), restored = restoreSoccerRun(raw);
      expect(restored).toEqual(saved);
      expect(deriveSoccerRun(restored!)).toEqual(deriveSoccerRun(saved));
      expect(deriveSoccerRun(saved).record.played).toBe(revealed);
      expect(deriveSoccerRun(saved).finished).toBe(revealed === 38);
    }
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T04:01:00Z'));
    expect(deriveSoccerRun(run).deal).toEqual(a.deal);
    expect(run.date).toBe('2026-10-08');
    expect(createSoccerRun('unlimited', null, 17)).toEqual(createSoccerRun('unlimited', null, 17));
    expect(createSoccerRun('unlimited', null, 17).seed).not.toBe(createSoccerRun('unlimited', null, 18).seed);
  });

  it('rejects malformed or impossible saves without changing raw input', () => {
    const run = createSoccerRun('daily', '2026-10-08');
    const invalid = [null, '', '{', 'null', '[]', ...[
      { ...run, version: 'unknown' }, { ...run, mode: 'unknown' }, { ...run, date: null },
      { ...run, date: '2026-10-09' }, { ...run, seed: -1 }, { ...run, seed: 1.5 },
      { ...run, choices: [3] }, { ...run, choices: [-1] }, { ...run, choices: [0.5] },
      { ...run, choices: Array(11).fill(2) }, { ...run, choices: Array(12).fill(0) },
      { ...run, revealed: 1 }, { ...run, revealed: -1 }, { ...run, revealed: 39 },
      { ...run, completionRecorded: true }, { ...run, completionRecorded: 'yes' },
    ].map(value => JSON.stringify(value))];
    for (const raw of invalid) {
      if (raw !== null) localStorage.setItem('soccer-ps-fixture', raw);
      const before = localStorage.getItem('soccer-ps-fixture');
      const write = vi.spyOn(Storage.prototype, 'setItem'), remove = vi.spyOn(Storage.prototype, 'removeItem');
      expect(restoreSoccerRun(raw)).toBeNull();
      expect(write).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expect(localStorage.getItem('soccer-ps-fixture')).toBe(before);
      write.mockRestore(); remove.mockRestore();
    }
  });

  it('guarantees a legal perfect 38 witness for every measured daily deal', () => {
    for (const date of dates) {
      const run = createSoccerRun('daily', date), deal = dealSoccerXI(run.seed), best = bestAffordableSoccerXI(deal);
      expect(best.choices).toHaveLength(11);
      expect(best.spent).toBeLessThanOrEqual(55);
      expect(best.spent).toBe(draftSoccerCost(deal, best.choices));
      best.choices.forEach((pick, slot) => expect(canDraftSoccerCard(deal, best.choices.slice(0, slot), pick)).toBe(true));
      const view = deriveSoccerRun({ ...run, choices: best.choices, revealed: 38 });
      expect(view.odds).toEqual({ win: 1, draw: 0, loss: 0, perfect: 1, unbeaten: 1 });
      expect(view.season!.games).toEqual(Array(38).fill('W'));
      expect(view.record).toMatchObject({ played: 38, wins: 38, draws: 0, losses: 0, points: 114, score: 100, perfect: true, unbeaten: true });
    }
  });

  it('measures paired strongest versus cheapest daily outcomes', () => {
    const pairs = dates.map(date => {
      const run = createSoccerRun('daily', date), deal = dealSoccerXI(run.seed), best = bestAffordableSoccerXI(deal);
      const cheapStrength = weightedSoccerStrength(deal, cheapest);
      const strongOdds = soccerSeasonOdds(best.weightedStrength, best.weightedStrength), cheapOdds = soccerSeasonOdds(cheapStrength, best.weightedStrength);
      const strongest = simulateSoccerSeason(strongOdds.win, run.seed), basic = simulateSoccerSeason(cheapOdds.win, run.seed);
      return { date, seed: run.seed, version: run.version, deal, witness: best, cheapestChoices: cheapest,
        cheapestSpent: draftSoccerCost(deal, cheapest), cheapStrength, strongOdds, cheapOdds,
        strongest, cheapest: basic, pointsGap: strongest.points - basic.points, winsGap: strongest.wins - basic.wins };
    });
    const meanPointsGap = pairs.reduce((sum, pair) => sum + pair.pointsGap, 0) / pairs.length;
    const meanWinsGap = pairs.reduce((sum, pair) => sum + pair.winsGap, 0) / pairs.length;
    const measurement = { version: SOCCER_PS_VERSION, alpha: SOCCER_PS_ALPHA, seedCount: pairs.length,
      acceptance: 'Permanent mean points margin set below measured paired daily headroom',
      meanPointsGap, meanWinsGap, requiredMeanPointsGap, pairs };
    if (process.env.SOCCER_SEASON_MEASURE_OUT) {
      const file = process.env.SOCCER_SEASON_MEASURE_OUT;
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(measurement, null, 2) + '\n');
    }
    console.log('SOCCER_SEASON_MEASUREMENT: ' + JSON.stringify({ seedCount: pairs.length, meanPointsGap, meanWinsGap, requiredMeanPointsGap, alpha: SOCCER_PS_ALPHA }));
    expect(pairs.every(pair => pair.strongest.wins === 38 && pair.strongest.points === 114 && pair.cheapestSpent === 33)).toBe(true);
    expect(pairs.every(pair => pair.cheapOdds.win < pair.strongOdds.win)).toBe(true);
    expect(meanPointsGap).toBeGreaterThan(0);
    expect(meanWinsGap).toBeGreaterThan(0);
    expect(meanPointsGap).toBeGreaterThan(requiredMeanPointsGap);
  });
});
