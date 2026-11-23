import { afterEach, expect, it } from 'vitest';
import {
  aiDealPlayer, buildMarket, buyPlayer, doorRefusal, engineRegistrations, loadCareer, marketForScreen,
  restoreEngineRegistrations, saveCareer, signingRefusal, startCareer, startNextSeason, worldRosterFor,
  type CareerState, type StartCareerOptions,
} from '@/lib/clubManager';
import { serializeParkedCareer } from '@/lib/clubManagerParkedSave';
import { SAVE_KEY } from '@/lib/clubManagerSaveKeys';
import { recordWorldRosterTransfer, worldRosterOwner } from '@/lib/clubManagerWorldRoster';
import { withSeed } from '@/lib/managerHotSeat';
import { saveFence } from '@/lib/saveFence';

const meichtry = 'Franz-Ethan Meichtry';
const vasic = 'Uros Vasic';
const thun = 'Thun';
const genoa = 'Genoa';
const biel = 'Biel-Bienne';
const meichtryKey = JSON.stringify(['now', thun, meichtry, 'CM', 2005, 0]);
const vasicKey = JSON.stringify(['now', thun, vasic, 'LM', 2003, 0]);
const rules = { inSeasonRatings: true, worldRatingTiming: true, opening2026Loans: true } as const;
const updatedRules = { ...rules, opening2026Transfers: true } as const;
const registrations = engineRegistrations();

afterEach(() => {
  restoreEngineRegistrations(registrations);
  localStorage.clear();
  saveFence.release(SAVE_KEY);
});

const start = (club: string, opts: StartCareerOptions = updatedRules) => withSeed(116137,
  () => startCareer(club, 'now', undefined, undefined, undefined, undefined, opts));
const named = (career: CareerState, club: string, name: string) => worldRosterFor(career, club).filter(row => row.n === name);

it('opens Thun and Genoa with the verified world ownership before picking their squads', () => {
  const atThun = start(thun);
  const atGenoa = start(genoa);
  const abroad = start('Real Madrid');
  expect(atThun.squad.filter(row => row.name === meichtry || row.name === vasic)).toEqual([]);
  expect(atGenoa.squad.filter(row => row.name === meichtry)).toEqual([expect.objectContaining({
    id: 'p-franz-ethan-meichtry', worldRosterKey: meichtryKey, position: 'CM', age: 21,
  })]);
  for (const career of [atThun, atGenoa, abroad]) {
    expect(worldRosterOwner(career, meichtryKey)).toBe(genoa);
    expect(worldRosterOwner(career, vasicKey)).toBe(biel);
    expect(named(career, thun, meichtry)).toEqual([]);
    expect(named(career, thun, vasic)).toEqual([]);
    expect(named(career, genoa, meichtry)).toEqual([expect.objectContaining({ worldRosterKey: meichtryKey })]);
    expect(named(career, biel, vasic)).toEqual([expect.objectContaining({ worldRosterKey: vasicKey })]);
    expect(career.transferLog?.filter(row => row.name === meichtry || row.name === vasic)).toEqual([]);
    expect(career.goneNames).not.toContain(meichtry);
    expect(career.goneNames).not.toContain(vasic);
    expect(career.freeAgents?.some(row => row.name === vasic)).toBe(false);
  }

  expect(saveCareer(atGenoa)).toBe(true);
  for (const loaded of [loadCareer()!, loadCareer(serializeParkedCareer(atGenoa))!]) {
    expect(loaded.squad.filter(row => row.name === meichtry)).toEqual(atGenoa.squad.filter(row => row.name === meichtry));
    expect(worldRosterOwner(loaded, vasicKey)).toBe(biel);
  }
});

it('offers Meichtry from Genoa and treats unmodeled Biel-Bienne as an existing owner', () => {
  const legacy = start('Real Madrid', rules);
  const oldMarket = buildMarket(legacy);
  const oldMeichtry = oldMarket.find(row => row.name === meichtry)!;
  const oldVasic = oldMarket.find(row => row.name === vasic)!;
  expect([oldMeichtry.club, oldVasic.club]).toEqual([thun, thun]);
  const current = start('Real Madrid');
  const genoan = buildMarket(current).filter(row => row.name === meichtry);
  expect(genoan).toEqual([expect.objectContaining({ club: genoa, worldRosterKey: meichtryKey })]);
  expect(marketForScreen(current).some(row => row.name === vasic || row.club === biel)).toBe(false);
  for (const earlier of [oldVasic, { ...oldVasic, club: biel, worldRosterKey: vasicKey }]) {
    expect(signingRefusal(current, earlier, earlier.price)).toContain(biel);
    expect(doorRefusal(current, earlier, 'talk')).toContain(biel);
    expect(aiDealPlayer(current, earlier)).toBeNull();
  }
  expect(signingRefusal(current, oldMeichtry, oldMeichtry.price)).toContain(genoa);
  expect(aiDealPlayer(current, oldMeichtry)).toBeNull();

  const bought = buyPlayer(current, genoan[0])!;
  expect(worldRosterOwner(bought, meichtryKey)).toBe('Real Madrid');
  expect(bought.squad.filter(row => row.name === meichtry)).toEqual([expect.objectContaining({ worldRosterKey: meichtryKey })]);
  expect(named(bought, genoa, meichtry)).toEqual([]);

  const next = withSeed(116138, () => startNextSeason(current));
  expect(worldRosterOwner(next, meichtryKey)).toBe(genoa);
  expect(worldRosterOwner(next, vasicKey)).toBe(biel);
  expect(named(next, thun, vasic)).toEqual([]);
  expect(buildMarket(next).some(row => row.name === vasic)).toBe(false);
});

it('reopens a Robert-era save with both prior transfers at Porto and preserves daily squads', () => {
  const shared = withSeed(116137, () => startCareer(thun, 'now', undefined, undefined, undefined, undefined,
    { ...updatedRules, noWorldComps: true }));
  const meichtryRow = shared.squad.find(row => row.name === meichtry)!;
  const vasicRow = shared.squad.find(row => row.name === vasic)!;
  expect([meichtryRow.id, vasicRow.id]).toEqual(['p-franz-ethan-meichtry', 'p-uros-vasic']);
  expect(shared.opening2026Loans).toBeUndefined();
  const prior = withSeed(116137, () => startCareer('Real Madrid', 'now', undefined, undefined, undefined, undefined, rules));
  const legacy = [meichtryRow, vasicRow].reduce((career, player) => recordWorldRosterTransfer(career, {
    player, from: thun, to: 'Porto', kind: 'permanent', since: 0,
  }), prior);
  expect(saveCareer(legacy)).toBe(true);
  for (const loaded of [loadCareer()!, loadCareer(serializeParkedCareer(legacy))!]) {
    expect(loaded.opening2026Loans).toBe(true);
    expect([worldRosterOwner(loaded, meichtryKey), worldRosterOwner(loaded, vasicKey)]).toEqual(['Porto', 'Porto']);
    expect(named(loaded, 'Porto', meichtry)).toEqual([expect.objectContaining({ worldRosterKey: meichtryKey })]);
    expect(named(loaded, 'Porto', vasic)).toEqual([expect.objectContaining({ worldRosterKey: vasicKey })]);
    expect(named(loaded, genoa, meichtry)).toEqual([]);
    expect(named(loaded, thun, vasic)).toEqual([]);
    expect(named(loaded, biel, vasic)).toEqual([]);
  }
});
