import { describe, expect, it } from 'vitest';
import {
  SOCCER_PS_GAMES, SOCCER_PS_MAX_REROLLS, SOCCER_PS_SLOTS,
  applySoccerAction, createSoccerRun, deriveSoccerRun, restoreSoccerRun, scoreSoccerMatches,
  type SoccerPSRun,
} from '@/lib/soccerPerfectSeason';

function draftPicks(run: SoccerPSRun, choose: 'best' | 'worst', count: number = SOCCER_PS_SLOTS.length) {
  let next = run;
  for (let turn = 0; turn < count; turn++) {
    const view = deriveSoccerRun(next);
    const offer = view[choose];
    expect(offer).toBeTruthy();
    next = applySoccerAction(next, { type: 'pick', ...offer! })!;
    expect(next).toBeTruthy();
  }
  return next;
}

function finishDraft(run: SoccerPSRun, choose: 'best' | 'worst') {
  return deriveSoccerRun(draftPicks(run, choose));
}

function playFinalClub(run: SoccerPSRun, reroll: boolean) {
  const prefix = draftPicks(run, 'best', 10);
  const finalClub = reroll ? applySoccerAction(prefix, { type: 'reroll' })! : prefix;
  const drafted = draftPicks(finalClub, 'best', 1);
  const finished = { ...drafted, revealed: SOCCER_PS_GAMES, completionRecorded: true };
  const restored = restoreSoccerRun(JSON.stringify(finished));
  expect(restored).toEqual(finished);
  return deriveSoccerRun(restored!);
}

describe('Soccer Perfect Season', () => {
  it('keeps practice on its opening clubs, saves the restriction and counts only revealed streaks', () => {
    const normal = createSoccerRun('unlimited', null, 78);
    const practice = createSoccerRun('unlimited', null, 78, true);
    expect(deriveSoccerRun(practice).clubOrder).toEqual(deriveSoccerRun(normal).clubOrder);
    expect(deriveSoccerRun(practice).rerollsLeft).toBe(0);
    expect(applySoccerAction(practice, { type: 'reroll' })).toBeNull();
    const rerolled = applySoccerAction(normal, { type: 'reroll' })!;
    expect(restoreSoccerRun({ ...rerolled, noRerolls: true })).toBeNull();
    expect(restoreSoccerRun({ ...createSoccerRun('daily', '2026-11-12'), noRerolls: true })).toBeNull();
    const partial = { ...draftPicks(practice, 'best'), revealed: 3 };
    const restored = restoreSoccerRun(JSON.stringify(partial))!;
    expect(restored.noRerolls).toBe(true);
    expect(deriveSoccerRun(restored).record).toMatchObject({ longestWinRun: 3, longestUnbeatenRun: 3 });
    expect(scoreSoccerMatches(['W', 'W', 'D', 'W', 'L', 'D'])).toMatchObject({ longestWinRun: 2, longestUnbeatenRun: 4 });
  });

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


  it('keeps the opening target when the final reroll improves the XI on a new run', () => {
    const { seed } = createSoccerRun('daily', '2026-11-03');
    const run = { ...createSoccerRun('unlimited', null), seed };
    const original = playFinalClub(run, false);
    const stronger = playFinalClub(run, true);

    expect(original.picks.LCM).toMatchObject({ name: 'Christian Eriksen', rating: 74 });
    expect(stronger.picks).toEqual({ ...original.picks, LCM: expect.objectContaining({ name: 'Angelo Stiller', rating: 83 }) });
    expect(original.weightedStrength).toBe(1031);
    expect(stronger.weightedStrength).toBe(1040);
    expect(stronger.bestOverall).toBe(original.bestOverall);
    expect(stronger.odds?.perfect).toBe(1);
    expect(stronger.season?.games).toEqual(original.season?.games);
    expect(stronger.record).toMatchObject({ wins: 38, points: 114, score: 100 });
  });

  it('replays the original odds and result for archived Daily and pre-change Unlimited saves', () => {
    const daily = createSoccerRun('daily', '2026-11-03');
    const legacyUnlimited: SoccerPSRun = { ...daily, mode: 'unlimited', date: null };
    const original = playFinalClub(daily, false);
    const rerolled = playFinalClub(daily, true);

    expect(original.record).toMatchObject({ wins: 38, points: 114, score: 100 });
    expect(rerolled.odds?.perfect).toBeCloseTo(0.0082483, 6);
    expect(rerolled.record).toMatchObject({ wins: 35, losses: 3, points: 105, score: 92 });
    expect(playFinalClub(legacyUnlimited, true).season).toEqual(rerolled.season);
  });

  it('applies the new Daily rule starting with the November 17 Eastern board', () => {
    const previousDay = createSoccerRun('daily', '2026-11-16');
    const openingDay = createSoccerRun('daily', '2026-11-17');
    expect(playFinalClub(previousDay, true).openingDrawOdds).toBe(false);
    const rerolled = playFinalClub(openingDay, true);
    expect(rerolled.openingDrawOdds).toBe(true);
    expect(rerolled.bestOverall).toBe(playFinalClub(openingDay, false).bestOverall);
    expect(restoreSoccerRun({ ...openingDay, oddsRule: 'opening-draw' })).toBeNull();
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
