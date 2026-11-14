import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlReserveCoachQuote, nrlReserveGradeCandidates, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlBench, nrlFitLineup, nrlNextRound, nrlStarterOptions, nrlRegularRounds, nrlSavedLineupPreview } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const player = (state: NrlCareerState, id: string) => state.players.find(candidate => candidate.id === id)!;
const start = (state: NrlCareerState, playerId: string) => reduceNrlCareer(state, {
  type: 'startReserveGrade', year: state.season.year, clubId: state.season.clubId, round: state.season.round, playerId,
});
const recall = (state: NrlCareerState, playerId: string) => reduceNrlCareer(state, {
  type: 'recallReserveGrade', year: state.season.year, clubId: state.season.clubId, round: state.season.round, playerId,
});
const save = (state: NrlCareerState) => JSON.stringify(state);
const exact = (state: NrlCareerState) => expect(save(readNrlCareerSave(save(state))!)).toBe(save(state));

describe('NRL reserve-grade development', () => {
  it('buys exactly one earlier round of selection and development, with the existing rating ceiling', () => {
    const initial = createNrlCareer('panthers', 16);
    const id = 'panthers-6-1';
    const spell = start(initial, id);
    const purchase = { type: 'bookReserveCoach', year: 2026, clubId: 'panthers', round: 1, playerId: id } as const;
    expect(nrlReserveCoachQuote(spell)).toMatchObject({ cost: 90_000, currentReturn: 5, fasterReturn: 4, reason: null });
    const accelerated = reduceNrlCareer(spell, purchase);
    expect(nrlCareerFinance(spell).cash - nrlCareerFinance(accelerated).cash).toBe(90_000);
    expect(nrlCareerCap(spell)).toEqual(nrlCareerCap(accelerated));
    expect(reduceNrlCareer(accelerated, purchase)).toBe(accelerated);
    const at2 = advance(accelerated);
    expect(reduceNrlCareer(at2, purchase)).toBe(at2);
    const at3 = advance(at2);
    expect(nrlStarterOptions(at3.season, player(initial, id).role).some(candidate => candidate.id === id)).toBe(false);
    const fast = advance(at3);
    const slow = [1, 2, 3].reduce(advance, spell);
    expect(player(fast, id).rating).toBe(player(initial, id).rating + 1);
    expect(player(fast, id).rating).toBe(player(initial, id).potential);
    expect(player(slow, id).rating).toBe(player(initial, id).rating);
    expect(nrlStarterOptions(fast.season, player(initial, id).role).some(candidate => candidate.id === id)).toBe(true);
    expect(nrlStarterOptions(slow.season, player(initial, id).role).some(candidate => candidate.id === id)).toBe(false);
    for (const state of [accelerated, at2, at3, fast]) exact(state);
    let ended = fast;
    while (ended.season.phase !== 'complete') ended = advance(ended);
    expect(ended.history.at(-1)?.reserveGrade).toMatchObject({ playerId: id, rounds: 3, ratingGain: 1 });
    exact(ended);
    exact(reduceNrlCareer(ended, { type: 'startNextSeason' }));
  });

  it('keeps a paid booking on recall, grants no gain and rejects a forged accelerated spell', () => {
    const initial = createNrlCareer('bears', 14, 2027);
    const id = 'bears-8-1';
    const spell = advance(start(initial, id));
    const action = { type: 'bookReserveCoach', year: 2027, clubId: 'bears', round: 2, playerId: id } as const;
    expect(reduceNrlCareer(spell, { ...action, playerId: 'wrong' })).toBe(spell);
    const staff = reduceNrlCareer(spell, { type: 'hireCoach', year: 2027, round: 2, role: 'attack' });
    expect(staff.finance.coachHire).toBeDefined();
    const limited = { ...staff, finance: { ...staff.finance, openingCash: staff.finance.openingCash - nrlCareerFinance(staff).cash + 90_000 } };
    expect(nrlReserveCoachQuote(limited)?.reason).toMatch(/reserved/);
    expect(reduceNrlCareer(limited, action)).toBe(limited);
    const purchased = reduceNrlCareer(spell, action);
    const recalled = recall(purchased, id);
    expect(nrlCareerFinance(spell).cash - nrlCareerFinance(recalled).cash).toBe(90_000);
    expect(player(recalled, id).rating).toBe(player(initial, id).rating);
    exact(recalled);
    const forged = { ...purchased, finance: spell.finance };
    expect(readNrlCareerSave(save(forged))).toBeNull();
    const earlyReceipt = { ...purchased, finance: { ...purchased.finance, reserveCoachRound: 1 } };
    expect(readNrlCareerSave(save(earlyReceipt))).toBeNull();
    const tooLate = advance(advance(spell));
    expect(reduceNrlCareer(tooLate, { ...action, round: 4 })).toBe(tooLate);
  });

  it('keeps the full club contract and records a capped point after four rounds including a bye', () => {
    const initial = createNrlCareer('panthers', 16);
    const id = 'panthers-6-1';
    const original = player(initial, id);
    expect(nrlNextRound(initial.season).clubStatus).toBe('bye');
    expect(nrlReserveGradeCandidates(initial).map(candidate => candidate.id)).toContain(id);
    let spell = start(initial, id);
    expect(spell.season.reserveGrade).toEqual({ playerId: id, startedRound: 1, startingRating: 75 });
    expect(spell.players).toBe(initial.players);
    expect(spell.season.squad).toBe(initial.season.squad);
    exact(spell);
    let baseline = initial;
    for (let elapsed = 1; elapsed <= 4; elapsed++) {
      spell = advance(spell);
      baseline = advance(baseline);
      expect(spell.season.results).toEqual(baseline.season.results);
      expect(spell.finance).toEqual(baseline.finance);
      expect(nrlCareerCap(spell)).toEqual(nrlCareerCap(baseline));
      expect(player(spell, id)).toEqual({ ...player(baseline, id), rating: original.rating + Number(elapsed === 4) });
      expect(spell.season.squad.find(candidate => candidate.id === id)?.rating).toBe(player(spell, id).rating);
      exact(spell);
    }
    expect(player(spell, id).rating).toBe(original.potential);
    expect(nrlStarterOptions(spell.season, original.role).map(candidate => candidate.id)).toContain(id);
    expect(start(spell, 'panthers-1-1')).toBe(spell);
    while (spell.season.phase !== 'complete') spell = advance(spell);
    expect(spell.history.at(-1)?.reserveGrade).toEqual({
      playerId: id, playerName: original.name, rounds: 4, ratingGain: 1,
    });
    exact(spell);
    const next = reduceNrlCareer(spell, { type: 'startNextSeason' });
    expect(next.season.reserveGrade).toBeUndefined();
    expect(next.history.at(-1)?.reserveGrade).toEqual(spell.history.at(-1)?.reserveGrade);
    exact(next);
  });

  it('excludes an assigned player from direct, automatic and saved selections without deleting the player', () => {
    const initial = createNrlCareer('broncos', 16);
    const id = 'nrl-broncos-2026-26';
    const selected = reduceNrlCareer(initial, { type: 'selectBench', slot: 0, playerId: id });
    expect(selected.season.bench?.[0]).toBe(id);
    expect(start(selected, id)).toBe(selected);
    const saved = reduceNrlCareer(selected, { type: 'saveLineup', year: 2026, clubId: 'broncos' }).savedLineup!;
    const spell = start({ ...initial, savedLineup: saved }, id);
    expect(spell.season.squad.some(candidate => candidate.id === id)).toBe(true);
    expect(nrlStarterOptions(spell.season, 'Fullback').map(candidate => candidate.id)).not.toContain(id);
    expect(nrlBench({ ...spell.season, bench: [id] })).not.toContain(id);
    expect(reduceNrlCareer(spell, { type: 'selectBench', slot: 0, playerId: id })).toBe(spell);
    expect(reduceNrlCareer(spell, { type: 'selectStarter', role: 'Fullback', playerId: id })).toBe(spell);
    expect(nrlFitLineup(spell.season)!.next.bench).not.toContain(id);
    expect(nrlSavedLineupPreview(spell.season, saved)!.next.bench).not.toContain(id);
    const live = reduceNrlCareer(spell, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(recall(live, id)).toBe(live);
    exact(live);
  });

  it('retains an earlier real first-grade appearance while the player is unavailable', () => {
    const initial = createNrlCareer('broncos', 16);
    const id = 'nrl-broncos-2026-26';
    const replacement = initial.season.lineup.Fullback;
    const selected = reduceNrlCareer(initial, { type: 'selectStarter', role: 'Fullback', playerId: id });
    const afterMatch = advance(selected);
    expect(afterMatch.season.results.find(match => match.playerScoring)?.playerScoring?.starters).toContain(id);
    const moved = reduceNrlCareer(afterMatch, { type: 'selectStarter', role: 'Fullback', playerId: replacement });
    const slot = moved.season.bench!.indexOf(id);
    const ordinary = slot < 0 ? moved : reduceNrlCareer(moved, { type: 'selectBench', slot, playerId: initial.season.bench![slot] });
    const spell = start(ordinary, id);
    expect(spell.season.reserveGrade?.playerId).toBe(id);
    expect(spell.season.results).toBe(ordinary.season.results);
    exact(spell);
    const forged = { ...spell, season: { ...spell.season, reserveGrade: { ...spell.season.reserveGrade!, startedRound: 1 } } };
    expect(readNrlCareerSave(save(forged))).toBeNull();
  });

  it('rejects stale actions, consumes a single spell on recall and grants no development', () => {
    const initial = createNrlCareer('bears', 14, 2027);
    const id = 'bears-8-1';
    const assignment = start(initial, id);
    const settled = advance(assignment);
    const stale = reduceNrlCareer(settled, {
      type: 'recallReserveGrade', year: 2027, clubId: 'bears', round: 1, playerId: id,
    });
    expect(stale).toBe(settled);
    const recalled = recall(settled, id);
    expect(recalled.season.reserveGrade).toEqual({ playerId: id, startedRound: 1, startingRating: 66, recalledRound: 2 });
    expect(player(recalled, id)).toBe(player(settled, id));
    expect(nrlStarterOptions(recalled.season, 'Prop 8').map(candidate => candidate.id)).toContain(id);
    expect(nrlReserveGradeCandidates(recalled)).toEqual([]);
    expect(start(recalled, 'nrl-bears-2027-28')).toBe(recalled);
    const corrupt = { ...recalled, season: { ...recalled.season, reserveGrade: { ...recalled.season.reserveGrade, recalledRound: 4 } } };
    expect(readNrlCareerSave(save(corrupt as NrlCareerState))).toBeNull();
    exact(recalled);
    let later = initial;
    while (later.season.round < nrlRegularRounds(2027) - 2) later = advance(later);
    expect(start(later, id)).toBe(later);
    expect(nrlReserveGradeCandidates(later)).toEqual([]);
  });

  it('rejects overlapping position training, injured players, legacy saves and a late start', () => {
    const initial = createNrlCareer('broncos', 16);
    const id = 'nrl-broncos-2026-26';
    const course = { type: 'startPositionTraining', year: 2026, clubId: 'broncos', round: 1, playerId: id, role: 'Left Wing' } as const;
    const training = reduceNrlCareer(initial, course);
    expect(training.positionTraining?.playerId).toBe(id);
    expect(start(training, id)).toBe(training);
    const spell = start(initial, id);
    expect(reduceNrlCareer(spell, course)).toBe(spell);
    const finished = [1, 2, 3, 4].reduce(state => advance(state), spell);
    const after = reduceNrlCareer(finished, { ...course, round: 5 });
    expect(after.positionTraining?.startedRound).toBe(5);
    exact(after);
    const overlap = { ...after, positionTraining: { ...after.positionTraining!, startedRound: 4 } };
    expect(readNrlCareerSave(save(overlap))).toBeNull();
    const played = advance(initial);
    const managed = played.season.results.find(match => match.playerScoring)!;
    const injury = { playerId: id, rounds: 4 };
    const injured = { ...played, season: { ...played.season, results: played.season.results.map(match =>
      match === managed ? { ...match, injury } : match) } };
    expect(start(injured, id)).toBe(injured);
    const legacy = readNrlCareerSave(JSON.stringify(createNrlSeason('broncos', 16)))!;
    expect(nrlReserveGradeCandidates(legacy)).toEqual([]);
    expect(start(legacy, id)).toBe(legacy);
    const live = reduceNrlCareer(initial, { type: 'startLive' });
    expect(start(live, id)).toBe(live);
  });
});
