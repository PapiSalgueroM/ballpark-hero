import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlAcademyCrossTrainingQuote, nrlAcademyOffer, nrlAcademyReports, nrlCareerCap, nrlCareerFinance,
  readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlNextRound, nrlRegularRounds, nrlStarterOptions } from '@/lib/nrlManager';

const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const ready = (state: NrlCareerState) => advance(reduceNrlCareer(state, { type: 'scoutAcademy', role: 'Fullback', priority: 'ceiling' }));
const graduate = (state: NrlCareerState) => nrlAcademyReports(state)[0].player!;
const promote = (state: NrlCareerState, playerId: string) => reduceNrlCareer(state, { type: 'promoteAcademy', playerId });
const finish = (state: NrlCareerState) => {
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
};
const book = ({ season }: NrlCareerState, playerId: string) => ({ type: 'startAcademyCrossTraining', year: season.year,
  clubId: season.clubId, round: season.round, playerId, role: 'Left Wing' } as const);

describe('NRL academy cross-training', () => {
  it.each([[2026, 'panthers'], [2027, 'bears']] as const)('trains one unsigned %i prospect across two rounds without changing wages or ratings', (year, clubId) => {
    const origin = createNrlCareer(clubId, 41, year);
    const scouted = reduceNrlCareer(origin, { type: 'scoutAcademy', role: 'Fullback', priority: 'ceiling' });
    const initial = advance(scouted);
    const player = graduate(initial);
    const action = book(initial, player.id);
    expect(reduceNrlCareer(scouted, { ...action, round: 1 })).toBe(scouted);
    expect(nrlAcademyCrossTrainingQuote(initial, player.id)).toEqual({ cost: 75_000, roles: ['Left Wing', 'Right Wing'], reason: null });
    expect(reduceNrlCareer(initial, { ...action, role: 'Hooker' })).toBe(initial);
    expect(reduceNrlCareer(initial, { ...action, round: action.round + 1 })).toBe(initial);
    const lowCash = { ...initial, finance: { ...initial.finance, openingCash: -100_000 } };
    expect(nrlAcademyCrossTrainingQuote(lowCash, player.id)?.reason).toContain('more cash');
    expect(reduceNrlCareer(lowCash, action)).toBe(lowCash);
    expect(reduceNrlCareer(promote(initial, player.id), action).finance.academyCrossTraining).toBeUndefined();
    const booked = reduceNrlCareer(initial, action);
    expect(booked.season).toBe(initial.season);
    expect(booked.players).toBe(initial.players);
    expect(nrlCareerCap(booked, year + 1)).toEqual(nrlCareerCap(initial, year + 1));
    expect(nrlCareerFinance(initial).cash - nrlCareerFinance(booked).cash).toBe(75_000);
    expect(reduceNrlCareer(booked, action)).toBe(booked);
    expect(nrlAcademyReports(booked)[0].crossTraining).toEqual({ role: 'Left Wing', remaining: 2 });
    expect(nrlAcademyOffer(booked, player.id).ok).toBe(false);
    expect(promote(booked, player.id)).toBe(booked);
    const half = advance(read(booked)!);
    expect(nrlAcademyReports(half)[0].crossTraining?.remaining).toBe(1);
    expect(promote(half, player.id)).toBe(half);
    const trained = advance(read(half)!);
    const control = advance(advance(initial));
    expect(trained.season).toEqual(control.season);
    expect(graduate(trained)).toEqual({ ...player, secondaryRole: 'Left Wing' });
    expect(nrlAcademyOffer(trained, player.id)).toEqual(nrlAcademyOffer(control, player.id));
    expect(read(trained)).toEqual(trained);
    const signed = promote(trained, player.id);
    expect(read(signed)).toEqual(signed);
    const next = reduceNrlCareer(finish(signed), { type: 'startNextSeason' });
    expect(next.finance.academyCrossTraining).toBeUndefined();
    expect(next.history[0].finance?.academyCrossTraining).toEqual(booked.finance.academyCrossTraining);
    expect(next.season.squad.find(row => row.id === player.id)?.secondaryRole).toBe('Left Wing');
    expect(nrlStarterOptions(next.season, 'Left Wing').some(row => row.id === player.id)).toBe(true);
    const selected = reduceNrlCareer(next, { type: 'selectStarter', role: 'Left Wing', playerId: player.id });
    expect(selected.season.lineup['Left Wing']).toBe(player.id);
    expect(read(selected)).toEqual(selected);
  });

  it('carries cross-training to a released prospect and rejects an inconsistent save', () => {
    const initial = ready(createNrlCareer('panthers', 1));
    const player = graduate(initial);
    const booked = reduceNrlCareer(initial, book(initial, player.id));
    const finished = finish(booked);
    expect(read(finished)).toEqual(finished);
    const malformed = { ...booked, finance: { ...booked.finance, academyCrossTraining: { ...booked.finance.academyCrossTraining!, role: 'Hooker' as const } } };
    expect(read(malformed)).toBeNull();
    const released = reduceNrlCareer(finished, { type: 'releaseAcademyProspect', year: 2026, clubId: 'panthers', playerId: player.id });
    expect(nrlAcademyReports(released)[0].status).toBe('released');
    const next = reduceNrlCareer(read(released)!, { type: 'startNextSeason' });
    expect(next.players.find(row => row.id === player.id)).toMatchObject({ ...player, age: player.age + 1, secondaryRole: 'Left Wing' });
    expect(read(next)).toEqual(next);
  });

  it('counts a bye toward the course and pauses fast-forward when the prospect is ready', () => {
    let state = ready(createNrlCareer('panthers', 41));
    const bye = Array.from({ length: nrlRegularRounds(2026) - 3 }, (_, offset) => offset + 3)
      .find(round => nrlNextRound({ ...state.season, round }).clubStatus === 'bye')!;
    expect(bye).toBeGreaterThan(3);
    while (state.season.round < bye - 1) state = advance(state);
    const booked = reduceNrlCareer(state, book(state, graduate(state).id));
    const beforeBye = advance(booked);
    expect(nrlNextRound(beforeBye.season).clubStatus).toBe('bye');
    expect(nrlAcademyReports(beforeBye)[0].crossTraining?.remaining).toBe(1);
    const result = runNrlFastForward(read(beforeBye)!, { year: 2026, clubId: 'panthers', round: bye, through: bye + 1 });
    expect(result.stop).toBe('development');
    expect(result.state.season.round).toBe(bye + 1);
    expect(graduate(result.state).secondaryRole).toBe('Left Wing');
    expect(read(result.state)).toEqual(result.state);
  });

  it('preserves normal unsigned saves and closes new courses without two regular rounds left', () => {
    const initial = ready(createNrlCareer('panthers', 12));
    expect(read(initial)).toEqual(initial);
    let state = initial;
    while (state.season.round < nrlRegularRounds(state.season.year)) state = advance(state);
    const playerId = graduate(state).id;
    expect(nrlAcademyCrossTrainingQuote(state, playerId)).toBeNull();
    expect(reduceNrlCareer(state, book(state, playerId))).toBe(state);
  });
});
