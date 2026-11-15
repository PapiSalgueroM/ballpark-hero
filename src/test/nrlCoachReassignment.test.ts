import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlCoachQuote, nrlCoachReassignmentQuote, nrlCoachSpend, nrlCoachTactics, nrlOppositionReport,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlLadder, nrlNextRound } from '@/lib/nrlManager';

const year = 2026, clubId = 'broncos', round = 7;
const frame = { year, clubId, round };
const action = { type: 'reassignCoach', ...frame } as const;
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const restore = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const score = (state: NrlCareerState) => {
  const match = state.season.results.find(row => row.round === round && row.playerScoring)!;
  return [match.homeScore, match.awayScore];
};
const starting = () => reduceNrlCareer(createNrlCareer(clubId, 5, year), { type: 'hireCoach', role: 'attack', year, round: 1 });
const fixture = (state = starting()) => {
  while (state.season.round < round) state = advance(state);
  return reduceNrlCareer(state, { type: 'setTactic', tactic: 'defense' });
};

describe('NRL tactical assistant reassignment', () => {
  it('changes the same coach’s active focus and the seeded Round 7 result once', () => {
    const initial = fixture();
    expect(nrlCoachQuote(initial).current).toEqual({ role: 'attack', name: 'Quill Redfern' });
    expect(nrlCareerFinance(initial).cash).toBe(2_961_132);
    expect(score(advance(initial))).toEqual([18, 22]);
    const reassigned = reduceNrlCareer(initial, action);
    expect(reassigned?.finance?.coachReassignmentRound).toBe(round);
    expect(nrlCoachQuote(reassigned).current).toEqual(nrlCoachQuote(initial).current);
    expect(nrlCoachQuote(reassigned).remainingWages).toBe(nrlCoachQuote(initial).remainingWages);
    expect(nrlCoachTactics(reassigned.finance)).toEqual({ coachRole: 'defense', coachBonus: 2 });
    expect(nrlCareerFinance(initial).cash - nrlCareerFinance(reassigned).cash).toBe(60_000);
    expect(nrlCoachSpend(reassigned.finance)).toEqual(nrlCoachSpend(initial.finance));
    expect(nrlCareerCap(reassigned)).toEqual(nrlCareerCap(initial));
    expect(reassigned.season).toBe(initial.season);
    expect(nrlOppositionReport(reassigned)!.defenseEdge - nrlOppositionReport(initial)!.defenseEdge).toBeCloseTo(2);
    expect(restore(reassigned)).toEqual(reassigned);
    expect(reduceNrlCareer(reassigned, action)).toBe(reassigned);
    const played = advance(reassigned);
    expect(score(played)).toEqual([18, 16]);
    expect(nrlLadder(played.season).find(row => row.clubId === clubId)?.points).toBe(10);
    const live = reduceNrlCareer(reassigned, { type: 'startLive' });
    expect(restore(live)).toEqual(live);
    expect(reduceNrlCareer(restore(live)!, { type: 'finishLive', year, round, tactic: 'defense' })).toEqual(played);
    expect(restore(played)).toEqual(played);
  });

  it('reserves original wages and refuses stale, live, bye and invalid book changes', () => {
    const initial = fixture();
    for (const invalid of [{ ...action, clubId: 'raiders' }, { ...action, year: 2027 }, { ...action, round: 6 }]) {
      expect(reduceNrlCareer(initial, invalid)).toBe(initial);
    }
    const live = reduceNrlCareer(initial, { type: 'startLive' });
    expect(reduceNrlCareer(live, action)).toBe(live);
    const funds = nrlCoachQuote(initial).remainingWages + 59_999;
    const short = { ...initial, finance: { ...initial.finance,
      openingCash: initial.finance.openingCash + funds - nrlCareerFinance(initial).cash } };
    expect(nrlCoachReassignmentQuote(short)?.reason).toMatch(/assistant’s wages/);
    expect(reduceNrlCareer(short, action)).toBe(short);
    const forged = { ...initial, finance: { ...initial.finance, coachReassignmentRound: 8 } };
    expect(restore(forged)).toBeNull();
    let bye = starting();
    while (bye.season.round < 5) bye = advance(bye);
    expect(reduceNrlCareer(bye, { ...action, round: 5 })).toBe(bye);
    const development = reduceNrlCareer(createNrlCareer(clubId, 5, year), { type: 'hireCoach', role: 'development', year, clubId, round: 1 });
    expect(reduceNrlCareer(development, { ...action, round: 1 })).toBe(development);
    expect(restore({ ...development, finance: { ...development.finance, coachReassignmentRound: 1 } })).toBeNull();
  });

  it('archives the fee and restores the retained coach’s original qualification at rollover', () => {
    const enrolled = reduceNrlCareer(starting(), { type: 'startCoachCourse', year, clubId, round: 1 });
    let state = reduceNrlCareer(fixture(enrolled), action);
    while (state.season.phase !== 'complete') state = advance(state);
    const final = restore(state)!;
    expect(final.history.at(-1)?.finance?.coachReassignmentRound).toBe(round);
    expect(final.history.at(-1)?.finance?.coachCourseRound).toBe(1);
    expect(nrlCoachTactics(final.finance)).toEqual({ coachRole: 'defense', coachBonus: 2 });
    const kept = reduceNrlCareer(final, { type: 'setCoachRetention', year, clubId, enabled: true });
    const next = reduceNrlCareer(kept, { type: 'startNextSeason' });
    expect(next.season.year).toBe(2027);
    expect(next.finance.coachReassignmentRound).toBeUndefined();
    expect(nrlCoachTactics(next.finance)).toEqual({ coachRole: 'attack', coachBonus: 3 });
    expect(nrlCoachQuote(next).current?.name).toBe('Quill Redfern');
    expect(restore(next)).toEqual(next);
    let eligible = next;
    while (!nrlNextRound(eligible.season).clubMatch) eligible = advance(eligible);
    const temporary = reduceNrlCareer(eligible, { type: 'reassignCoach', year: 2027, clubId, round: eligible.season.round });
    expect(temporary.finance.coachHire).toEqual(eligible.finance.coachHire);
    expect(temporary.finance.coachHire?.qualified).toBe(true);
    expect(nrlCoachTactics(temporary.finance)).toEqual({ coachRole: 'defense', coachBonus: 2 });
    expect(restore(temporary)).toEqual(temporary);
  });
});
