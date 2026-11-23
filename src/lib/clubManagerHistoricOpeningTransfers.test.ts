import { afterEach, expect, it } from 'vitest';
import {
  loadCareer, saveCareer, shownNation, startCareer, worldRosterFor,
  type CMPlayer, type TransferNews,
} from '@/lib/clubManager';
import { ensureEraRosters, projectedRoster } from '@/lib/clubManagerEras';
import { serializeParkedCareer } from '@/lib/clubManagerParkedSave';
import { SAVE_KEY } from '@/lib/clubManagerSaveKeys';
import { readWorldRoster, recordWorldRosterTransfer, worldRosterOwner } from '@/lib/clubManagerWorldRoster';
import { saveFence } from '@/lib/saveFence';

afterEach(() => {
  localStorage.clear();
  saveFence.release(SAVE_KEY);
});

const openingTransfers = [
  { name: 'Dani García', slug: 'dani-garcia', from: 'Espanyol', position: 'ST', age: 30, rating: 68, value: 1.5, nation: 'Spain' },
  { name: 'Barry Ferguson', slug: 'barry-ferguson', from: 'Blackburn Rovers', position: 'CDM', age: 26, rating: 76, value: 6.8, nation: 'Scotland' },
] as const;

const careerCases = openingTransfers.flatMap(transfer => ['Real Madrid', 'Sevilla'].map(club => ({ ...transfer, club })));

it.each(careerCases)('preserves $name in a 2005 save managed by $club', async ({ name, slug, from, position, age, rating, value, nation, club }) => {
  await ensureEraRosters('era2005');
  const owner = 'Real Madrid';
  const base = startCareer(club, 'era2005');
  const managed = club === owner;
  const player: CMPlayer = {
    id: managed ? `sign-${slug}-s1` : `p-${slug}`,
    name,
    position,
    rating,
    age,
    value,
    fitness: 100,
    morale: 70,
    injuryWeeks: 0,
    suspendedMatches: 0,
    isYouth: false,
    seasonGoals: 0,
    seasonAssists: 0,
  };
  const transfer: TransferNews = {
    name, from, to: owner, fee: value, season: 1, week: base.week,
  };
  const legacy = recordWorldRosterTransfer({
    ...base,
    squad: managed ? [...base.squad, player] : base.squad,
    goneNames: [...base.goneNames, name],
    transferLog: [...(base.transferLog ?? []), transfer],
  }, { player, from: transfer.from, to: transfer.to, kind: 'permanent', since: 0 });
  const key = JSON.stringify(['era2005', from, name, position, 2005 - age, 0]);

  expect(worldRosterOwner(legacy, key)).toBe(owner);
  expect(saveCareer(legacy)).toBe(true);

  for (const loaded of [loadCareer(), loadCareer(serializeParkedCareer(legacy))]) {
    expect(loaded).not.toBeNull();
    const reloaded = loaded!;
    const savedPlayer = readWorldRoster(reloaded)?.records.find(record => record.key === key)?.player;
    expect(savedPlayer).toMatchObject({ id: player.id, name, position, age, worldRosterKey: key });
    expect(shownNation(reloaded.eraId, savedPlayer!)).toBe(nation);
    expect(worldRosterOwner(reloaded, key)).toBe(owner);
    expect(reloaded.squad.filter(row => row.id === player.id).map(row => row.worldRosterKey))
      .toEqual(managed ? [key] : []);
    expect(reloaded.transferLog).toContainEqual(transfer);
    expect(reloaded.goneNames).toContain(name);
    expect(worldRosterFor(reloaded, owner).filter(row => row.n === name).map(row => row.worldRosterKey))
      .toEqual([key]);
    expect(worldRosterFor(reloaded, from).some(row => row.n === name)).toBe(false);
  }
  expect(projectedRoster(from, 0, 'era2005').some(row => row.n === name)).toBe(false);
});
