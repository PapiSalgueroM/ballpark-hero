import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlOppositionReport, readNrlCareerSave, reduceNrlCareer, type NrlCareerAction, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlHalftimeInterchanges } from '@/lib/nrlManager';

const doAction = (state: NrlCareerState, action: NrlCareerAction) => reduceNrlCareer(state, action);
const advance = (state: NrlCareerState) => doAction(state, { type: 'advance' });
const raw = JSON.stringify;
const read = (state: NrlCareerState) => readNrlCareerSave(raw(state));
const captain = (state: NrlCareerState, playerId: string | null) => {
  const { year, clubId, round } = state.season;
  return doAction(state, { type: 'setCaptain', year, clubId, round, playerId });
};
const resultFor = (state: NrlCareerState, round: number) => state.season.results.find(match =>
  match.round === round && (match.homeId === state.season.clubId || match.awayId === state.season.clubId))!;

describe('NRL match captain', () => {
  it.each([[2026, 'broncos'], [2027, 'bears']] as const)('adds one defence point with a selected starter in %s', (year, clubId) => {
    const original = createNrlCareer(clubId, 1, year);
    const playerId = original.season.lineup.Hooker;
    const planned = captain(original, playerId);
    expect(planned?.season.captainId).toBe(playerId);
    const base = nrlOppositionReport(original)!;
    const preview = nrlOppositionReport(planned)!;
    expect(preview.attackEdge).toBe(base.attackEdge);
    expect(preview.defenseEdge).toBeCloseTo(base.defenseEdge + 1);
    expect(planned.season.lineup).toBe(original.season.lineup);
    expect(planned.season.bench).toBe(original.season.bench);
    expect(raw(read(planned))).toBe(raw(planned));
    expect(raw(captain(planned, null))).toBe(raw(original));
    expect(captain(planned, original.season.lineup.Lock).season.captainId).toBe(original.season.lineup.Lock);
    expect(captain(planned, 'rival')).toBe(planned);
    expect(captain(planned, original.season.bench![0])).toBe(planned);
    expect(doAction(planned, { type: 'setCaptain', year, clubId, round: 2, playerId: null })).toBe(planned);
    const settled = advance(planned);
    expect(resultFor(settled, 1).captainId).toBe(playerId);
    expect(raw(read(settled))).toBe(raw(settled));
  });

  it('keeps a rested captain’s appointment without changing a match in which they never start a segment', () => {
    const original = createNrlCareer('broncos', 1);
    const playerId = original.season.lineup.Hooker;
    const reserve = original.season.squad.find(p => p.role === 'Hooker' && p.id !== playerId)!;
    const benchCaptain = (state: NrlCareerState) => doAction(state, { type: 'selectStarter', role: 'Hooker', playerId: reserve.id });
    const named = benchCaptain(captain(original, playerId));
    const ordinary = benchCaptain(original);
    expect(named.season.captainId).toBe(playerId);
    expect(nrlOppositionReport(named)).toEqual(nrlOppositionReport(ordinary));
    expect(resultFor(advance(named), 1)).toEqual(resultFor(advance(ordinary), 1));
    expect(raw(read(named))).toBe(raw(named));
  });

  it('locks the appointment while a live match is paused and recognises a captain who comes on at half time', () => {
    const original = createNrlCareer('broncos', 11);
    const starter = original.season.lineup.Hooker;
    const replacement = original.season.squad.find(p => p.role === 'Hooker' && p.id !== starter)!;
    const managed = doAction(captain(original, starter), { type: 'selectStarter', role: 'Hooker', playerId: replacement.id });
    const benched = doAction(managed, { type: 'selectBench', slot: 0, playerId: starter });
    const half = doAction(benched, { type: 'startLive' });
    const interchange = nrlHalftimeInterchanges(half.season).find(option => option.reserveId === starter)!;
    expect(interchange?.starterId).toBe(replacement.id);
    expect(captain(half, null)).toBe(half);
    const action = { year: 2026, round: 1, tactic: 'balanced', interchange } as const;
    const mid = doAction(read(half)!, { type: 'reachMinute60', ...action });
    expect(captain(mid, replacement.id)).toBe(mid);
    expect(raw(read(mid))).toBe(raw(mid));
    const next = doAction(read(mid)!, { type: 'finishMinute60', year: 2026, round: 1, tactic: 'balanced' });
    expect(resultFor(next, 1).captainId).toBe(starter);
    expect(resultFor(next, 1).halftimeInterchange?.reserveId).toBe(starter);
    expect(raw(read(next))).toBe(raw(next));
    const score = (state: NrlCareerState) => {
      const result = resultFor(state, 1);
      return [result.homeScore, result.awayScore];
    };
    const plainHalf = doAction(captain(benched, null), { type: 'startLive' });
    expect(half.season.live).toEqual(plainHalf.season.live);
    expect(score(next)).toEqual([14, 10]);
    expect(score(doAction(plainHalf, { type: 'finishLive', ...action }))).toEqual([14, 15]);
    const opening = doAction(captain(original, starter), { type: 'startLive' });
    const outgoing = nrlHalftimeInterchanges(opening.season).find(option => option.starterId === starter)!;
    expect(score(doAction(opening, { type: 'finishLive', year: 2026, round: 1, tactic: 'balanced' }))).toEqual([14, 10]);
    expect(score(doAction(opening, { type: 'finishLive', ...action, interchange: outgoing }))).toEqual([14, 15]);
    const forged = { ...next, season: { ...next.season, results: next.season.results.map(match =>
      match === resultFor(next, 1) ? { ...match, captainId: 'rival' } : match) } };
    expect(read(forged)).toBeNull();
  });

  it('carries the appointment with a retained player at the same club and clears it on a club move', () => {
    const original = createNrlCareer('broncos', 1);
    const retained = original.players.find(player => Object.values(original.season.lineup).includes(player.id) && player.age < 29
      && (player.contract?.endYear ?? 0) >= 2027)!;
    const departed = original.players.find(player => Object.values(original.season.lineup).includes(player.id)
      && player.contract?.endYear === 2026)!;
    for (const selected of [retained, departed]) {
      let state = captain(original, selected.id);
      expect(state.season.captainId).toBe(selected.id);
      while (state.season.phase !== 'complete') state = advance(state);
      expect(captain(state, null)).toBe(state);
      const stay = doAction(state, { type: 'startNextSeason' });
      expect(stay.season.year).toBe(2027);
      expect(stay.season.captainId).toBe(selected.id === retained.id ? retained.id : undefined);
      expect(raw(read(stay))).toBe(raw(stay));
      const move = doAction(state, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
      expect(move.season.clubId).toBe('bears');
      expect(move.season.captainId).toBeUndefined();
      expect(raw(read(move))).toBe(raw(move));
    }
    const legacy = readNrlCareerSave(raw(createNrlSeason('broncos', 1)))!;
    expect(captain(legacy, legacy.season.lineup.Hooker)).toBe(legacy);
    expect(read({ ...legacy, season: { ...legacy.season, captainId: legacy.season.lineup.Hooker } })).toBeNull();
  });
});
