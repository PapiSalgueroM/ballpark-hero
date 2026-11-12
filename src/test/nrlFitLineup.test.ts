import { describe, expect, it, vi } from 'vitest';
import * as random from '@/lib/careerEngine';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_ROLES, nrlFitLineup, nrlInjuries, type NrlPlayer } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const apply = (state: NrlCareerState, previewKey: string) => reduceNrlCareer(state, { type: 'applyFitLineup', previewKey });

function rated(state: NrlCareerState, changes: Record<string, Partial<NrlPlayer>>): NrlCareerState {
  const current = new Set(Object.values(state.season.lineup));
  const squad = state.season.squad.map(player => ({
    ...player, rating: current.has(player.id) ? 90 : 70, fitness: 100, ...changes[player.id],
  }));
  const byId = new Map(squad.map(player => [player.id, player]));
  return {
    ...state, season: { ...state.season, squad },
    players: state.players.map(player => {
      const next = byId.get(player.id);
      return next ? { ...player, ...next, potential: Math.max(player.potential, next.rating) } : player;
    }),
  };
}

function tiredHalfback() {
  const started = createNrlCareer('storm', 4);
  const fromId = started.season.lineup.Halfback;
  const toId = started.season.squad.find(player => player.role === 'Halfback' && player.id !== fromId)!.id;
  const named = reduceNrlCareer(started, { type: 'selectBench', slot: 0, playerId: toId });
  return { state: rated(named, { [fromId]: { rating: 85, fitness: 0 }, [toId]: { rating: 83 } }), fromId, toId };
}

describe('NRL Manager fit lineup preview', () => {
  it('uses match readiness, previews without a write and applies with a legal bench and kicker', () => {
    const { state, fromId, toId } = tiredHalfback();
    const bytes = JSON.stringify(state);
    const rng = vi.spyOn(random, 'rngFrom');
    try {
      const proposal = nrlFitLineup(state.season)!;
      expect(proposal.changes).toEqual([{ role: 'Halfback', fromId, toId }]);
      expect(JSON.stringify(state)).toBe(bytes);
      const next = apply(state, proposal.key);
      expect(next.season.lineup.Halfback).toBe(toId);
      expect(next.season.kickerId).toBe(toId);
      expect(next.season.bench).toHaveLength(6);
      expect(next.season.bench!.slice(0, 5)).toEqual(state.season.bench!.filter(id => id !== toId));
      expect(new Set([...Object.values(next.season.lineup), ...next.season.bench!]).size).toBe(19);
      expect(next.season.results).toBe(state.season.results);
      expect(next.players).toBe(state.players);
      expect(next.finance).toBe(state.finance);
      expect(apply(next, proposal.key) === next).toBe(true);
      expect(rng).not.toHaveBeenCalled();
      expect(JSON.stringify(readNrlCareerSave(JSON.stringify(next))) === JSON.stringify(next)).toBe(true);
    } finally {
      rng.mockRestore();
    }
  });

  it('keeps a starter on an exact tie and keeps a selected kicker who still starts', () => {
    const { state, fromId, toId } = tiredHalfback();
    const current = reduceNrlCareer(state, { type: 'selectStarter', role: 'Halfback', playerId: toId });
    const tied = rated(current, { [fromId]: { rating: 90 }, [toId]: { rating: 90 } });
    const empty = nrlFitLineup(tied.season)!;
    expect(empty.changes).toHaveLength(0);
    expect(apply(tied, empty.key) === tied).toBe(true);

    const kicker = state.season.lineup.Fullback;
    const designated = reduceNrlCareer(state, { type: 'setKicker', playerId: kicker });
    expect(apply(designated, nrlFitLineup(designated.season)!.key).season.kickerId).toBe(kicker);
  });

  it('assigns natural positions first, uses unique utility cover, and excludes injuries', () => {
    const state = createNrlCareer('storm', 4);
    const fromId = state.season.lineup.Fullback;
    const fullbacks = state.season.squad.filter(player => player.role === 'Fullback');
    const reserveId = fullbacks.find(player => player.id !== fromId)!.id;
    const wing = state.season.lineup['Left Wing'];
    const oneNatural = rated(state, {
      ...Object.fromEntries(fullbacks.filter(player => player.id !== fromId)
        .map(player => [player.id, { role: 'Left Wing', rating: player.id === reserveId ? 95 : 70 }])),
      [wing]: { rating: 98 },
    });
    const played = advance(oneNatural);
    const withoutNatural = {
      ...played, season: { ...played.season, results: played.season.results.map(result =>
        [result.homeId, result.awayId].includes('storm') ? { ...result, injury: { playerId: fromId, rounds: 4 } } : result) },
    };
    const next = apply(withoutNatural, nrlFitLineup(withoutNatural.season)!.key);
    expect(next.season.lineup.Fullback).toBe(reserveId);
    expect(next.season.lineup['Left Wing']).toBe(wing);
    expect(new Set(NRL_ROLES.map(role => next.season.lineup[role])).size).toBe(NRL_ROLES.length);
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(next))) === JSON.stringify(next)).toBe(true);

    const bruised = advance(createNrlCareer('broncos', 16));
    const injuredId = [...nrlInjuries(bruised.season).keys()][0];
    expect(injuredId).toBeTruthy();
    const strongInjured = rated(bruised, { [injuredId]: { rating: 98 } });
    const fit = nrlFitLineup(strongInjured.season)!;
    expect(Object.values(fit.next.lineup)).not.toContain(injuredId);
    expect(fit.next.bench).not.toContain(injuredId);
  });

  it('rejects stale ownership and does not offer changes while live, on a bye or after the season', () => {
    const { state } = tiredHalfback();
    const { key } = nrlFitLineup(state.season)!;
    const changed = reduceNrlCareer(state, { type: 'prepare', choice: 'recover' });
    const manual = reduceNrlCareer(state, { type: 'setKicker', playerId: state.season.lineup.Fullback });
    const restarted = createNrlCareer('storm', 5);
    const pending = reduceNrlCareer(state, { type: 'startLive' });
    expect(pending.season.live).toBeDefined();
    const bye = createNrlCareer('panthers', 16);
    let complete = state;
    while (complete.season.phase !== 'complete') complete = advance(complete);
    for (const unavailable of [pending, bye, complete]) expect(nrlFitLineup(unavailable.season)).toBeNull();
    for (const wrong of [changed, manual, restarted, advance(state), pending, bye, complete]) expect(apply(wrong, key) === wrong).toBe(true);
  });
});
