import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERA2010_ROSTERS } from '@/data/clubManagerEra2010';
import {
  finishSeason, loadCareer, playNextEntry, renewContract, SAVE_KEY, saveCareer,
  startCareer, startNextSeason, worldSeasonLabel, type CareerState, type CMPlayer,
} from '@/lib/clubManager';
import { ensureEraRosters } from '@/lib/clubManagerEras';
import { saveFence } from '@/lib/saveFence';

function completeSeason(initial: CareerState): CareerState {
  let state = initial;
  for (let step = 0; step < 80; step += 1) {
    const result = playNextEntry(state, { skipHalftime: true });
    state = result.state;
    if (result.kind === 'seasonOver') {
      expect(state.week).toBe(state.calendar.length);
      return finishSeason(state).state;
    }
  }
  throw new Error('The simulated historical season did not finish');
}

function ageFields(state: CareerState) {
  return {
    eraId: state.eraId, startYear: state.startYear, season: state.season,
    squad: state.squad, freeAgents: state.freeAgents,
    retiredNames: state.retiredNames, retiredLastSummer: state.retiredLastSummer,
  };
}

function roundTrip(state: CareerState): CareerState {
  expect(saveCareer(state)).toBe(true);
  const written = JSON.parse(localStorage.getItem(SAVE_KEY)!) as CareerState;
  const loaded = loadCareer();
  expect(loaded).not.toBeNull();
  expect(ageFields(loaded!)).toEqual(ageFields(written));
  return loaded!;
}

// Generated players isolate the age boundary without assigning new facts to real players.
function generatedPlayer(age: number): CMPlayer {
  return {
    id: 'report-age-fixture', name: 'Report Age Fixture', position: 'ST',
    rating: 78, age, fitness: 100, morale: 70, injuryWeeks: 0,
    suspendedMatches: 0, isYouth: false, seasonGoals: 0, seasonAssists: 0,
    potential: 85, value: 20, wage: 80, contractYears: 4, generated: true,
  };
}

describe('reported historical Club Manager retirement', () => {
  beforeAll(async () => { await ensureEraRosters('era2010'); });
  beforeEach(() => {
    saveFence.release(SAVE_KEY);
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
  });
  afterEach(() => { vi.restoreAllMocks(); saveFence.release(SAVE_KEY); });

  it('classifies the first simulated Messi contract expiry separately from retirement and renewal', () => {
    const baked = ERA2010_ROSTERS.Barcelona.find(p => p.n === 'Lionel Messi')!;
    expect(baked.a).toBe(22);
    const initial = startCareer('Barcelona', 'era2010');
    const initialMessi = initial.squad.find(p => p.name === baked.n)!;
    expect(initial.startYear).toBe(2010);
    expect(initialMessi.age).toBe(baked.a);
    // Initial contract lengths are generated simulation terms, not historical contracts.
    expect(initialMessi.contractYears).toBe(1);
    const completed = completeSeason(initial);
    const expiring = completed.squad.find(p => p.id === initialMessi.id)!;
    expect(expiring.age).toBe(22);
    expect(expiring.contractYears).toBe(1);
    const renewed = renewContract(completed, expiring.id);
    expect(renewed).not.toBeNull();
    expect(renewed!.squad.find(p => p.id === expiring.id)?.contractYears).toBe(4);
    expect(completed.squad.find(p => p.id === expiring.id)?.contractYears).toBe(1);

    const expiredSummer = roundTrip(startNextSeason(completed));
    const renewedSummer = roundTrip(startNextSeason(renewed!));
    for (const summer of [expiredSummer, renewedSummer]) {
      expect(worldSeasonLabel(summer)).toBe('2011-12');
      expect(summer.retiredNames).not.toContain(baked.n);
      expect(summer.retiredLastSummer?.some(p => p.name === baked.n)).toBe(false);
    }
    expect(expiredSummer.squad.some(p => p.name === baked.n)).toBe(false);
    expect(expiredSummer.freeAgents?.filter(p => p.name === baked.n)).toHaveLength(1);
    expect(expiredSummer.freeAgents?.find(p => p.name === baked.n)).toMatchObject({
      name: baked.n, position: baked.p, age: 23,
      reason: 'expired', since: 2, fromMyClub: true,
    });
    expect(renewedSummer.squad.filter(p => p.name === baked.n)).toHaveLength(1);
    expect(renewedSummer.squad.find(p => p.name === baked.n)).toMatchObject({ age: 23, contractYears: 3 });
    expect(renewedSummer.freeAgents?.some(p => p.name === baked.n)).toBe(false);
  }, 30000);

  it.each([{ age: 30, retires: false }, { age: 41, retires: true }])(
    'uses the actual summer retirement branch for a generated player aged $age',
    ({ age, retires }) => {
      const initial = startCareer('Barcelona', 'era2010');
      const probe = generatedPlayer(age);
      const state = { ...initial, squad: [...initial.squad.slice(1), probe] };
      const summer = roundTrip(startNextSeason(state));
      expect(summer.retiredNames?.includes(probe.name)).toBe(retires);
      expect(summer.retiredLastSummer?.filter(p => p.name === probe.name)).toEqual(
        retires ? [{ name: probe.name, age: 42, rating: expect.any(Number) }] : [],
      );
      expect(summer.freeAgents?.some(p => p.name === probe.name)).toBe(false);
      expect(summer.squad.filter(p => p.id === probe.id)).toEqual(
        retires ? [] : [expect.objectContaining({ age: 31, contractYears: 3, generated: true })],
      );
    },
  );
});
