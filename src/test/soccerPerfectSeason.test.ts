import { describe, expect, it } from 'vitest';
import {
  SOCCER_PS_GAMES, SOCCER_PS_MAX_REROLLS, SOCCER_PS_SLOTS,
  applySoccerAction, createSoccerRun, deriveSoccerRun, restoreSoccerRun, scoreSoccerMatches,
  type SoccerPSRun,
} from '@/lib/soccerPerfectSeason';

function finishDraft(run: SoccerPSRun, choose: 'best' | 'worst') {
  let next = run;
  for (let turn = 0; turn < SOCCER_PS_SLOTS.length; turn++) {
    const view = deriveSoccerRun(next);
    const offer = view[choose];
    expect(offer).toBeTruthy();
    next = applySoccerAction(next, { type: 'pick', ...offer! })!;
    expect(next).toBeTruthy();
  }
  return deriveSoccerRun(next);
}

describe('Soccer Perfect Season', () => {
  it('freezes a Daily club order across reloads and keeps Unlimited independent', () => {
    const daily = createSoccerRun('daily', '2026-11-12');
    const sequence = deriveSoccerRun(daily).clubOrder;
    expect(sequence).toEqual([
      'los angeles fc', 'rb leipzig', 'parma calcio 1913', 'inter milan', 'brighton & hove albion',
      'celtic fc', 'eintracht frankfurt', 'birmingham city', 'al-nassr fc', 'manchester city', 'al-ahli sfc',
    ]);
    expect(new Set(sequence).size).toBe(11);
    expect(deriveSoccerRun(createSoccerRun('daily', '2026-11-12', 99)).clubOrder).toEqual(sequence);
    expect(deriveSoccerRun(restoreSoccerRun(JSON.stringify(daily))!).clubOrder).toEqual(sequence);
    expect(deriveSoccerRun(createSoccerRun('daily', '2026-11-13')).clubOrder).not.toEqual(sequence);
    expect(deriveSoccerRun(createSoccerRun('unlimited', null, 99)).clubOrder).not.toEqual(sequence);
  });

  it('rerolls only the current club twice, never repeats a club and restores its exact offers', () => {
    const daily = createSoccerRun('daily', '2026-11-12');
    const start = deriveSoccerRun(daily);
    const once = applySoccerAction(daily, { type: 'reroll' })!;
    const twice = applySoccerAction(once, { type: 'reroll' })!;
    const first = deriveSoccerRun(once);
    const second = deriveSoccerRun(twice);
    expect(SOCCER_PS_MAX_REROLLS).toBe(2);
    expect(new Set([start.clubOrder[0], first.clubOrder[0], second.clubOrder[0]]).size).toBe(3);
    expect(second.clubOrder.slice(1)).toEqual(start.clubOrder.slice(1));
    expect(new Set(second.clubOrder).size).toBe(11);
    expect(second.rerollsLeft).toBe(0);
    expect(applySoccerAction(twice, { type: 'reroll' })).toBeNull();
    expect(restoreSoccerRun({ ...twice, actions: [...twice.actions, { type: 'reroll' }] })).toBeNull();
    expect(deriveSoccerRun(restoreSoccerRun(JSON.stringify(twice))!)).toEqual(second);
    expect(finishDraft(twice, 'best').season?.wins).toBe(38);
  });

  it('rejects wrong players or slots and restores picked players by identity', () => {
    const start = createSoccerRun('daily', '2026-11-12');
    const first = deriveSoccerRun(start);
    const best = first.best!;
    expect(applySoccerAction(start, { type: 'pick', playerId: 'fictional', slot: best.slot })).toBeNull();
    const unsupported = SOCCER_PS_SLOTS.find(slot => !first.offers.find(card => card.playerId === best.playerId)?.eligible.includes(slot.key))!;
    expect(applySoccerAction(start, { type: 'pick', playerId: best.playerId, slot: unsupported.key })).toBeNull();
    const picked = applySoccerAction(start, { type: 'pick', ...best })!;
    expect(deriveSoccerRun(picked).picks[best.slot]?.playerId).toBe(best.playerId);
    expect(deriveSoccerRun(restoreSoccerRun(JSON.stringify(picked))!)).toEqual(deriveSoccerRun(picked));
    expect(restoreSoccerRun({ ...picked, revealed: 1 })).toBeNull();
  });

  it('keeps an attainable 38-0 and meaningful choices on the frozen real-club pool', () => {
    let weakPoints = 0;
    let weakerDrafts = 0;
    for (let nonce = 1; nonce <= 64; nonce++) {
      const run = createSoccerRun('unlimited', null, nonce);
      const best = finishDraft(run, 'best');
      const weak = finishDraft(run, 'worst');
      expect(new Set(Object.values(best.picks).map(card => card?.playerId)).size).toBe(11);
      expect(best.season?.wins).toBe(38);
      expect(best.season?.points).toBe(114);
      expect(best.season?.score).toBe(100);
      expect(best.season?.perfect).toBe(true);
      expect(best.odds?.perfect).toBe(1);
      if (weak.weightedStrength < best.weightedStrength) weakerDrafts++;
      weakPoints += weak.season!.points;
    }
    expect(weakerDrafts).toBeGreaterThanOrEqual(60);
    expect(114 - weakPoints / 64).toBeGreaterThan(40);
  }, 20_000);

  it('distinguishes unbeaten from perfect after 38 games and retains partial scoring', () => {
    const unbeaten = scoreSoccerMatches([...Array<"W">(37).fill('W'), 'D']);
    expect(unbeaten).toMatchObject({ played: 38, wins: 37, draws: 1, points: 112, score: 98, perfect: false, unbeaten: true });
    expect(scoreSoccerMatches(['W', 'D', 'L'])).toMatchObject({ played: 3, points: 4, perfect: false, unbeaten: false });
    expect(scoreSoccerMatches(Array<"W">(SOCCER_PS_GAMES - 1).fill('W')).perfect).toBe(false);
  });
});
