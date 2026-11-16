import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERA2010_ROSTERS } from '@/data/clubManagerEra2010';
import {
  finishSeason, freeAgentBlock, loadCareer, playNextEntry, renewContract, SAVE_KEY, saveCareer, signFreeAgent,
  startCareer, startNextSeason, worldRosterFor, worldSeasonLabel, type CareerState, type CMPlayer,
} from '@/lib/clubManager';
import { ensureEraRosters, projectedRoster } from '@/lib/clubManagerEras';
import { saveFence } from '@/lib/saveFence';

const CAREER_RULES = {
  championshipPlayoffs: true, bundesligaPlayoff: true, frenchPlayoffs: true,
  inSeasonRatings: true, worldRatingTiming: true,
} as const;

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
  beforeAll(async () => {
    await Promise.all([ensureEraRosters('era2010'), ensureEraRosters('era2015')]);
  });
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

  it('keeps the historical Messi in the projected world after two seasons and into his mid-thirties', () => {
    for (const seed of [undefined, 42]) {
      for (const [years, age] of [[0, 27], [2, 29], [8, 35]]) {
        const messi = projectedRoster('Barcelona', years, 'era2015', seed).filter(p => p.n === 'Lionel Messi');
        expect(messi).toEqual([expect.objectContaining({ a: age })]);
      }
    }
  });

  it('plays two Barcelona seasons and carries Messi into 2017-18 on his opening deal', () => {
    const initial = startCareer('Barcelona', 'era2015', undefined, undefined, undefined, undefined, CAREER_RULES);
    const messi = initial.squad.find(p => p.name === 'Lionel Messi')!;
    expect(messi).toMatchObject({ age: 27, contractYears: 3 });
    const second = roundTrip(startNextSeason(completeSeason(initial)));
    expect(second.squad.find(p => p.id === messi.id)).toMatchObject({ age: 28, contractYears: 2 });
    const third = roundTrip(startNextSeason(completeSeason(second)));
    expect(worldSeasonLabel(third)).toBe('2017-18');
    expect(third.squad.find(p => p.id === messi.id)).toMatchObject({ age: 29, contractYears: 1 });
    expect(third.retiredNames).not.toContain(messi.name);
  }, 30000);

  it('lets Barcelona re-sign the same Messi after his old one-year deal expires', () => {
    const initial = startCareer('Barcelona', 'era2015', undefined, undefined, undefined, undefined, CAREER_RULES);
    const messi = initial.squad.find(p => p.name === 'Lionel Messi')!;
    const oldSave = roundTrip({
      ...initial,
      squad: initial.squad.map(p => p.id === messi.id ? { ...p, contractYears: 1 } : p),
    });
    expect(oldSave.squad.find(p => p.id === messi.id)?.contractYears).toBe(1);
    const second = roundTrip(startNextSeason(completeSeason(oldSave)));
    const expired = second.freeAgents?.find(p => p.name === messi.name)!;
    expect(expired).toMatchObject({ age: 28, reason: 'expired', fromMyClub: true });
    expect(freeAgentBlock(second, expired)).toBeNull();
    expect(freeAgentBlock({ ...second, budget: 0 }, expired)).toBe('cantAfford');
    expect(freeAgentBlock({ ...second, clubName: 'Real Madrid' }, expired)).toBe('notInterested');
    const signed = signFreeAgent(second, messi.name)!;
    expect(signed.squad.filter(p => p.name === messi.name)).toEqual([
      expect.objectContaining({ id: messi.id, age: 28, worldRosterKey: expired.worldRosterKey }),
    ]);
    expect(signed.freeAgents?.some(p => p.name === messi.name)).toBe(false);
  }, 30000);

  it('honors a retirement already recorded in an older save after the roster ledger pruned it', () => {
    const initial = startCareer('Real Madrid', 'era2015', undefined, undefined, undefined, undefined, CAREER_RULES);
    const name = 'Lionel Messi';
    const oldSave = roundTrip({ ...initial, season: 9, retiredNames: [name] });
    expect(projectedRoster('Barcelona', 8, 'era2015').some(player => player.n === name)).toBe(true);
    expect(worldRosterFor(oldSave, 'Barcelona').some(player => player.n === name)).toBe(false);
    const moved = startNextSeason(oldSave, 'Barcelona');
    expect(moved.clubName).toBe('Barcelona');
    expect(moved.squad.some(player => player.name === name)).toBe(false);
  });

  it.each([{ age: 34, retires: false }, { age: 35, retires: true }])(
    'allows retirement for a signed 2015 Messi starting the summer at age $age only when eligible',
    ({ age, retires }) => {
      vi.mocked(Math.random).mockReturnValue(0.001);
      const initial = startCareer('Barcelona', 'era2015', undefined, undefined, undefined, undefined, CAREER_RULES);
      const name = 'Lionel Messi';
      const state = roundTrip({
        ...initial, season: age - 26,
        squad: initial.squad.map(p => p.name === name ? { ...p, age, contractYears: 4 } : p),
      });
      const summer = roundTrip(startNextSeason(state));
      expect(summer.retiredNames?.includes(name)).toBe(retires);
      expect(summer.retiredLastSummer?.filter(p => p.name === name)).toEqual(
        retires ? [{ name, age: 36, rating: expect.any(Number) }] : [],
      );
      expect(summer.squad.filter(p => p.name === name)).toEqual(
        retires ? [] : [expect.objectContaining({ age: 35, contractYears: 3 })],
      );
    },
  );

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
