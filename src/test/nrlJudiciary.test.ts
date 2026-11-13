import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlBench, nrlNextRound, nrlStarterOptions } from '@/lib/nrlManager';
import { nrlJudiciaryBans, nrlJudiciaryCase, nrlJudiciaryPenalty, type NrlJudiciaryDecision } from '@/lib/nrlJudiciary';

const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const raw = (career: NrlCareerState) => JSON.stringify(career);
const create = (club: string, seed: number, year: 2026 | 2027, enabled = true) =>
  createNrlCareer(club, seed, year, false, enabled);

function respond(career: NrlCareerState, decision: NrlJudiciaryDecision) {
  const { year, clubId } = career.season;
  return reduceNrlCareer(career, { type: 'resolveJudiciary', year, clubId, caseRound: nrlJudiciaryCase(career.season)!.round, decision });
}

function firstCase(year: 2026 | 2027, seed = 1) {
  let career = create(year === 2026 ? 'storm' : 'bears', seed, year);
  while (career.season.phase !== 'complete') {
    const next = advance(career);
    if (nrlJudiciaryCase(next.season)) return { career, next };
    career = next;
  }
  throw new Error('No deterministic judiciary fixture');
}

function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = advance(career);
  return career;
}

describe('NRL Judiciary challenge', () => {
  it.each([2026, 2027] as const)('opens the same post-match case in Quick Sim and Play Live in %i', year => {
    const { career, next } = firstCase(year);
    const live = reduceNrlCareer(career, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    const finished = reduceNrlCareer(live, { type: 'finishLive', year, round: career.season.round, tactic: career.season.tactic });
    expect(raw(finished)).toBe(raw(next));
    const { judiciary, ...season } = next.season;
    const { judiciary: _challenge, ...ordinarySeason } = career.season;
    expect(raw({ ...next, season })).toBe(raw(advance({ ...career, season: ordinarySeason })));
    expect(judiciary?.case?.playerId).not.toMatch(/^nrl-real-/);
    expect(readNrlCareerSave(raw(next))).toEqual(next);
    expect(nrlJudiciaryBans(next.season).size).toBe(0);
  });

  it('blocks a pending case at the next club match and serves the early plea over a played match, not a bye', () => {
    const { next } = firstCase(2027, 33);
    const review = nrlJudiciaryCase(next.season)!;
    expect(nrlNextRound(next.season).clubStatus).toBe('bye');
    const afterBye = advance(next);
    expect(nrlJudiciaryCase(afterBye.season)).toEqual(review);
    expect(advance(afterBye)).toBe(afterBye);
    expect(reduceNrlCareer(afterBye, { type: 'startLive' })).toBe(afterBye);
    const agreed = respond(next, 'plea');
    expect(nrlJudiciaryPenalty(agreed.season, nrlJudiciaryCase(agreed.season)!)).toBe(1);
    expect(nrlJudiciaryBans(agreed.season).get(review.playerId)).toBe(1);
    expect(Object.values(agreed.season.lineup)).not.toContain(review.playerId);
    expect(nrlBench(agreed.season)).not.toContain(review.playerId);
    expect(nrlStarterOptions(agreed.season, agreed.season.squad.find(player => player.id === review.playerId)!.role)
      .map(player => player.id)).not.toContain(review.playerId);
    const rested = advance(agreed);
    expect(nrlJudiciaryBans(rested.season).get(review.playerId)).toBe(1);
    const served = advance(rested);
    expect(nrlJudiciaryBans(served.season).has(review.playerId)).toBe(false);
    expect(readNrlCareerSave(raw(served))).toEqual(served);
  });

  it('validates case provenance, stops calendar runs and settles only one response', () => {
    const { career, next } = firstCase(2026);
    const { year, clubId, round } = career.season;
    const review = nrlJudiciaryCase(next.season)!;
    expect(runNrlFastForward(career, { year, clubId, round, through: round + 1 })).toEqual({ state: next, stop: 'judiciary' });
    const stale = reduceNrlCareer(next, { type: 'resolveJudiciary', year, clubId, caseRound: review.round + 1, decision: 'contest' });
    expect(stale).toBe(next);
    const challenged = respond(next, 'contest');
    expect(raw(challenged)).toBe(raw(respond(next, 'contest')));
    expect(nrlJudiciaryPenalty(challenged.season, nrlJudiciaryCase(challenged.season)!)).toBe(2);
    expect(respond(challenged, 'plea')).toBe(challenged);
    expect(readNrlCareerSave(raw(challenged))).toEqual(challenged);
    const forged = { ...next, season: { ...next.season, judiciary: { case: { ...review, playerId: 'nrl-real-001' } } } };
    expect(readNrlCareerSave(raw(forged))).toBeNull();
    expect(create('storm', 1, 2026, false).season.judiciary).toBeUndefined();
  });

  it('keeps a cleared player eligible and accepts a reproducible hearing result', () => {
    const { next } = firstCase(2027, 2);
    const cleared = respond(next, 'contest');
    expect(nrlJudiciaryPenalty(cleared.season, nrlJudiciaryCase(cleared.season)!)).toBe(0);
    expect(nrlJudiciaryBans(cleared.season).size).toBe(0);
    expect(cleared.season.lineup).toEqual(next.season.lineup);
    expect(readNrlCareerSave(raw(cleared))).toEqual(cleared);
  });

  it.each([[2026, 11, 'bears', 1], [2027, 282, 'chiefs', 2]] as const)(
    'archives the %i outcome and carries only the remaining ban when staying with a contracted player',
    (year, seed, destination, matches) => {
      const { next } = firstCase(year, seed);
      const complete = finish(respond(next, 'contest'));
      const review = nrlJudiciaryCase(complete.season)!;
      const same = reduceNrlCareer(complete, { type: 'startNextSeason' });
      expect(same.season.judiciary).toEqual({ carried: { playerId: review.playerId, matches } });
      expect(same.history.at(-1)?.judiciary?.case).toEqual(review);
      expect(nrlJudiciaryBans(same.season).get(review.playerId)).toBe(matches);
      expect(readNrlCareerSave(raw(same))).toEqual(same);
      const missing = { ...same, season: { ...same.season, judiciary: {} } };
      expect(readNrlCareerSave(raw(missing))).toBeNull();
      const moved = reduceNrlCareer(complete, { type: 'startNextSeason', move: { fromYear: year, clubId: destination } });
      expect(moved.season.judiciary).toEqual({});
      expect(moved.history.at(-1)?.judiciary?.case).toEqual(review);
      expect(readNrlCareerSave(raw(moved))).toEqual(moved);
    },
  );

  it('requires a decision on a Grand Final charge before rollover or retirement', () => {
    const { next } = firstCase(2026, 336);
    expect(next.season.phase).toBe('complete');
    expect(nrlJudiciaryCase(next.season)?.round).toBe(next.season.round);
    expect(readNrlCareerSave(raw(next))).toEqual(next);
    expect(reduceNrlCareer(next, { type: 'startNextSeason' })).toBe(next);
    expect(reduceNrlCareer(next, { type: 'retireCareer', year: 2026, clubId: 'storm' })).toBe(next);
    const accepted = respond(next, 'plea');
    expect(nrlJudiciaryCase(accepted.season)).toMatchObject({ decidedRound: next.season.round, settledAfterMatch: true });
    expect(readNrlCareerSave(raw(accepted))).toEqual(accepted);
  });

  it('keeps the case receipt when the player’s deal expires and they leave the club', () => {
    const { next } = firstCase(2026, 185);
    const complete = finish(respond(next, 'contest'));
    const review = nrlJudiciaryCase(complete.season)!;
    expect(nrlJudiciaryBans(complete.season).get(review.playerId)).toBeGreaterThan(0);
    expect(complete.players.find(player => player.id === review.playerId)?.contract?.endYear).toBe(2026);
    const rolled = reduceNrlCareer(complete, { type: 'startNextSeason' });
    expect(rolled.season.judiciary).toEqual({});
    expect(rolled.history.at(-1)?.judiciary?.case).toEqual(review);
    expect(readNrlCareerSave(raw(rolled))).toEqual(rolled);
  });
});
