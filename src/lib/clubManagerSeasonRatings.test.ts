import { afterEach, describe, expect, it, vi } from 'vitest';
import { finishSeason, playNextEntry, startCareer, startNextSeason, type CareerState } from './clubManager';

function setup(active: boolean): CareerState {
  const state = startCareer('Everton', undefined, undefined, undefined, undefined, undefined,
    active ? { inSeasonRatings: true } : undefined);
  state.squad = state.squad.map((player, index) => ({
    ...player, name: `Generated test player ${index}`, age: index % 2 === 0 ? 18 : 35,
    rating: 74, potential: 90, contractYears: 4,
  }));
  return state;
}

function playSeason(initial: CareerState) {
  let state = initial;
  let grew = false;
  let declined = false;
  let sawReport = false;
  for (let i = 0; i < 90; i += 1) {
    const before = new Map(state.squad.map(p => [p.id, p.rating]));
    const result = playNextEntry(state, { skipHalftime: true });
    state = result.state;
    if (result.kind === 'seasonOver') return { state: finishSeason(state).state, grew, declined, sawReport };
    for (const p of state.squad) {
      const old = before.get(p.id);
      if (old === undefined || old === p.rating) continue;
      expect(Math.abs(p.rating - old)).toBe(1);
      if (p.age === 18 && p.rating > old) grew = true;
      if (p.age === 35 && p.rating < old) declined = true;
    }
    if (result.kind === 'match' && state.week < state.calendar.length / 2
      && result.report.events.some(event => event.startsWith('Squad OVR:'))) sawReport = true;
  }
  throw new Error('Season did not finish');
}

afterEach(() => vi.restoreAllMocks());

describe('Club Manager in-season ratings', () => {
  it('moves youth and veteran OVR during play and carries it through summer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.62);
    const { state, grew, declined, sawReport } = playSeason(setup(true));
    expect({ grew, declined, sawReport }).toEqual({ grew: true, declined: true, sawReport: true });
    const next = startNextSeason(state);
    expect(next.season).toBe(state.season + 1);
    const returners = next.squad.filter(p => state.squad.some(old => old.id === p.id));
    expect(returners.length).toBeGreaterThan(0);
    for (const p of returners) {
      const old = state.squad.find(previous => previous.id === p.id)!;
      expect(p.age).toBe(old.age + 1);
      expect(p.rating).toBe(old.rating);
    }
  });

  it('keeps unflagged seeded modes on their existing rating schedule', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.62);
    const { state, grew, declined } = playSeason(setup(false));
    expect(grew || declined).toBe(false);
    const next = startNextSeason(state);
    expect(next.squad.some(p => state.squad.some(old => old.id === p.id && old.rating !== p.rating))).toBe(true);
  });
});
