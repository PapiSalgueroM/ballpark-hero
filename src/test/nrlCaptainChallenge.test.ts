import { expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_DOMESTIC_SCORING_MODEL, nrlCaptainChallengePreview, nrlHalftimeInterchanges, nrlLadder } from '@/lib/nrlManager';

const matchday = { year: 2026, clubId: 'broncos', round: 1 } as const;
const playTo60 = { type: 'reachMinute60', ...matchday, tactic: 'balanced' } as const;
const playTo80 = { ...playTo60, type: 'finishMinute60' } as const;
const startWithReview = { type: 'startLive', captainChallengeRules: true } as const;
const accept = { type: 'resolveCaptainChallenge', ...matchday, decision: 'accept' } as const;
const challenge = { ...accept, decision: 'challenge' } as const;

function opening(seed: number, clubId: string = matchday.clubId) {
  const initial = createNrlCareer(clubId, seed, matchday.year);
  return reduceNrlCareer({ ...initial, season: { ...initial.season, domesticScoringModel: NRL_DOMESTIC_SCORING_MODEL } }, {
    type: 'setCaptain', ...matchday, clubId, playerId: initial.season.lineup.Fullback,
  });
}

const at60 = (state: NrlCareerState, review: boolean) => reduceNrlCareer(
  reduceNrlCareer(state, review ? startWithReview : { type: 'startLive' }), playTo60,
);
const match = (state: NrlCareerState) => state.season.results.find(result => result.playerScoring)!;

it('holds a real late rival penalty for the on-field captain and accepts it without changing the match', () => {
  const initial = opening(1);
  const ordinary = reduceNrlCareer(at60(initial, false), playTo80);
  expect(match(ordinary).scorePeriods).toEqual({ halfTime: [4, 6], at60: [10, 12], regulation: [22, 20] });
  expect(match(ordinary).phaseScoring?.at60?.[1].penalties).toBe(0);
  expect(match(ordinary).phaseScoring?.regulation[1].penalties).toBe(1);

  const pending = reduceNrlCareer(at60(initial, true), playTo80);
  expect(pending.season.live?.captainChallenge).toMatchObject({ finish: playTo80 });
  expect(pending.season.results).toEqual([]);
  const saved = JSON.stringify(pending);
  const restored = readNrlCareerSave(saved)!;
  expect(JSON.stringify(restored)).toBe(saved);
  expect(nrlCaptainChallengePreview(restored.season)).toEqual({ captainId: initial.season.captainId, clue: 'ball-first' });
  expect(JSON.stringify(restored)).toBe(saved);
  const live = restored.season.live!;
  expect(readNrlCareerSave(JSON.stringify({ ...restored, season: { ...restored.season,
    live: { ...live, captainChallengeRules: 'strip-v2' },
  } }))).toBeNull();
  expect(readNrlCareerSave(JSON.stringify({ ...restored, season: { ...restored.season,
    live: { ...live, captainChallenge: { ...live.captainChallenge, captainId: initial.season.lineup['Prop 8'] } },
  } }))).toBeNull();
  expect(reduceNrlCareer(restored, { ...challenge, round: 2 })).toBe(restored);
  expect(reduceNrlCareer(restored, playTo80)).toBe(restored);
  expect(reduceNrlCareer(restored, { type: 'advance' })).toBe(restored);
  const settled = reduceNrlCareer(restored, accept);
  expect(JSON.stringify(settled)).toBe(JSON.stringify(ordinary));
  expect(reduceNrlCareer(settled, accept)).toBe(settled);
  expect(match(reduceNrlCareer(restored, challenge)).scorePeriods?.regulation).toEqual([22, 18]);
});

it.each([
  ['broncos', 1, 'overturned', 1],
  ['broncos', 35, 'upheld', 1],
  ['storm', 150, 'inconclusive', 1],
  ['tigers', 14, 'overturned', 0],
] as const)('settles %s seed %i as %s, preserving every other regulation score', (clubId, seed, outcome, rival) => {
  const initial = opening(seed, clubId);
  const ordinary = reduceNrlCareer(at60(initial, false), playTo80);
  const pending = reduceNrlCareer(at60(initial, true), playTo80);
  const attempted = reduceNrlCareer(readNrlCareerSave(JSON.stringify(pending))!, { ...challenge, clubId });
  const withoutReview = match(ordinary), withReview = match(attempted);
  expect(withReview.captainChallenge).toEqual({ rules: 'strip-v1', captainId: initial.season.captainId, outcome });
  const ordinaryPhases = withoutReview.phaseScoring!;
  const expectedRegulation = ordinaryPhases.regulation.map((side, index) => ({ ...side,
    penalties: side.penalties - Number(index === rival && outcome === 'overturned'),
  }));
  expect(withReview.phaseScoring).toEqual({ ...ordinaryPhases, regulation: expectedRegulation });
  expect(withReview.benchUsed).toEqual(withoutReview.benchUsed);
  expect(attempted.season.results.filter(row => row !== withReview)).toEqual(ordinary.season.results.filter(row => row !== withoutReview));
  expect(readNrlCareerSave(JSON.stringify(attempted))).toEqual(attempted);
  const forged = { ...withReview, captainChallenge: { ...withReview.captainChallenge, outcome: outcome === 'upheld' ? 'overturned' : 'upheld' } };
  expect(readNrlCareerSave(JSON.stringify({ ...attempted, season: { ...attempted.season,
    results: attempted.season.results.map(row => row === withReview ? forged : row),
  } }))).toBeNull();
  expect(reduceNrlCareer(attempted, { ...challenge, clubId })).toBe(attempted);
});

it('keeps the current match flow when the review rule, eligible penalty, or on-field captain is absent', () => {
  const initial = opening(1);
  const { domesticScoringModel: _rules, ...originalSeason } = initial.season;
  const original = { ...initial, season: originalSeason };
  const { captainId: _captain, ...uncaptainedSeason } = initial.season;
  for (const noOffer of [original, opening(2), opening(8), { ...initial, season: uncaptainedSeason }]) {
    const usual = reduceNrlCareer(at60(noOffer, false), playTo80);
    expect(reduceNrlCareer(at60(noOffer, true), playTo80)).toEqual(usual);
  }
  const earlierPause = at60(initial, false);
  const saved = JSON.stringify(earlierPause);
  expect(JSON.stringify(readNrlCareerSave(saved))).toBe(saved);
  expect(reduceNrlCareer(readNrlCareerSave(saved)!, playTo80).season.live).toBeUndefined();
});

it('hands the review to the designated vice-captain when the captain is off the field', () => {
  let initial = opening(1);
  const startingHalf = reduceNrlCareer(initial, startWithReview);
  const option = nrlHalftimeInterchanges(startingHalf.season)[0];
  const vice = Object.values(initial.season.lineup).find(id => id !== option.starterId)!;
  initial = reduceNrlCareer(initial, { type: 'setCaptain', ...matchday, playerId: option.starterId });
  const at60WithCaptainOff = (state: NrlCareerState) => reduceNrlCareer(reduceNrlCareer(state, startWithReview), { ...playTo60,
    interchange: { starterId: option.starterId, reserveId: option.reserveId },
  });
  expect(reduceNrlCareer(at60WithCaptainOff(initial), playTo80).season.live).toBeUndefined();
  const designated = reduceNrlCareer(initial, { type: 'setViceCaptain', ...matchday, playerId: vice });
  const pending = reduceNrlCareer(at60WithCaptainOff(designated), { ...playTo80, attackPlan: 'middle' });
  expect(nrlCaptainChallengePreview(pending.season)?.captainId).toBe(vice);
  const reloaded = readNrlCareerSave(JSON.stringify(pending))!;
  expect(reloaded).toEqual(pending);
  const result = reduceNrlCareer(reloaded, challenge);
  expect(match(result)).toMatchObject({ captainChallenge: { captainId: vice }, minute60AttackPlan: 'middle' });
  expect(readNrlCareerSave(JSON.stringify(result))).toEqual(result);
});

it('turns a late loss into a draw and replays the corrected Golden Point checkpoint once', () => {
  const clubId = 'storm';
  const initial = opening(174, clubId);
  const ordinary = reduceNrlCareer(at60(initial, false), playTo80);
  expect(match(ordinary)).toMatchObject({ homeScore: 32, awayScore: 34 });
  const pending = reduceNrlCareer(at60(initial, true), { ...playTo80, pauseForGoldenPoint: true });
  const answer = { ...challenge, clubId };
  const corrected = reduceNrlCareer(readNrlCareerSave(JSON.stringify(pending))!, answer);
  expect(corrected.season.live?.captainChallenge).toBeUndefined();
  const goldenPoint = corrected.season.live?.goldenPoint;
  expect(goldenPoint).toMatchObject({ score: 32, captainChallenge: { outcome: 'overturned' } });
  expect(corrected.season.results).toEqual([]);
  const saved = JSON.stringify(corrected);
  const restored = readNrlCareerSave(saved)!;
  expect(JSON.stringify(restored)).toBe(saved);
  expect(reduceNrlCareer(restored, answer)).toBe(restored);
  const settle = { type: 'settleGoldenPoint', ...matchday, clubId, approach: 'standard' } as const;
  const final = reduceNrlCareer(restored, settle);
  expect(match(final)).toMatchObject({ homeScore: 32, awayScore: 32, goldenPoint: 'draw' });
  const ladderPoints = (career: NrlCareerState) => nrlLadder(career.season).find(row => row.clubId === clubId)?.points;
  expect(ladderPoints(ordinary)).toBe(0);
  expect(ladderPoints(final)).toBe(1);
  expect(readNrlCareerSave(JSON.stringify(final))).toEqual(final);
  expect(reduceNrlCareer(final, settle)).toBe(final);
});
