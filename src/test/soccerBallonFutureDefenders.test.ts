import { beforeAll, expect, it } from 'vitest';
import { isGeneratedBallonPool, type CareerState } from '@/lib/soccerCareerEngine';
import { decodeSoccerCareerSave, isSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { copy, nextNight, poolNight, type Saved } from '@/test/helpers/ballonPoolDrive';

let before: Saved;
let first: Saved;

beforeAll(() => {
  before = poolNight(1);
  for (const seed of [119, 120, 121]) before = nextNight(before, seed).value;
  first = nextNight(before, 122).value;
  expect([before.pendingBallonDor.year, first.pendingBallonDor.year]).toEqual([2031, 2032]);
});

it('adds a named goalkeeper and two fullbacks without changing the original registrations', () => {
  expect(before.generatedBallonPool.defensiveEntries).toBeUndefined();
  const pool = first.generatedBallonPool;
  expect(isGeneratedBallonPool(pool, 2032)).toBe(true);
  expect(pool.entries.slice(0, before.generatedBallonPool.entries.length)).toEqual(before.generatedBallonPool.entries);
  expect(pool.defensiveEntries.map((e: Saved) => e.position)).toEqual(['GK', 'LB', 'RB']);
  const names = [...pool.entries, ...pool.defensiveEntries].map(e => e.name);
  expect(new Set(names).size).toBe(names.length);
  for (const version of [0, 1] as const) {
    const bytes = serializeSoccerCareerSave(first as CareerState, version);
    const parsed = decodeSoccerCareerSave(bytes);
    expect(parsed.version).toBe(version);
    expect(isSoccerCareerSave(parsed.value)).toBe(true);
    expect(parsed.value).toEqual(copy(first));
  }

  const next = nextNight(first, 123).value;
  expect(next.generatedBallonPool.defensiveEntries).toEqual(pool.defensiveEntries);
  const peers = [...first.pendingBallonDor.nominees, ...next.pendingBallonDor.nominees].filter(n => n.generatedDefenderSeed !== undefined);
  expect(peers.length).toBeGreaterThan(0);
  for (const n of peers) {
    const registered = pool.defensiveEntries.find((e: Saved) => e.seed === n.generatedDefenderSeed);
    expect(n).toMatchObject({ name: registered.name, club: registered.club, position: registered.position });
    expect(n.performance.apps).toBeGreaterThanOrEqual(28);
    expect(n.performance.cleanSheets).toBeLessThanOrEqual(n.performance.apps);
    expect(n.performance.rating).toBeGreaterThanOrEqual(3);
    if (n.position === 'GK') expect(n.goals).toBe(0);
  }
});

it('a used name keeps the primary record and gives the supplemental slot a new player', () => {
  const clash = copy(first);
  const keeper = clash.generatedBallonPool.defensiveEntries[0];
  clash.playerName = keeper.name;
  const next = nextNight(clash, 123).value.generatedBallonPool;
  expect(next.defensiveEntries.slice(0, 3)).toEqual(first.generatedBallonPool.defensiveEntries);
  expect(next.defensiveEntries).toHaveLength(4);
  expect(next.defensiveEntries[3]).toMatchObject({ position: 'GK', firstYear: 2033 });
  expect(next.defensiveEntries[3].name).not.toBe(keeper.name);
  expect(isGeneratedBallonPool(next, 2033)).toBe(true);
});

it('replaces an invalid defensive collection exactly as an absent collection', () => {
  const broken = copy(first), absent = copy(first);
  broken.generatedBallonPool.defensiveEntries[0].seed = -1;
  delete absent.generatedBallonPool.defensiveEntries;
  const repair = nextNight(broken, 123);
  expect(repair).toEqual(nextNight(absent, 123));
  expect(repair.value.generatedBallonPool.entries.length).toBeGreaterThanOrEqual(first.generatedBallonPool.entries.length);
  expect(repair.value.generatedBallonPool.defensiveEntries).toHaveLength(3);
  expect(isGeneratedBallonPool(repair.value.generatedBallonPool, 2033)).toBe(true);
});
