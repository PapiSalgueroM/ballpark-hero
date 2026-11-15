import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buyPlayer, doorRefusal, finishSeason, freeAgentBlock, loadCareer, promoteProspect, releasedByYou,
  recallLoanedPlayer, SAVE_KEY, saveCareer, signFreeAgent, startCareer, startNextSeason,
  type CareerState, type CMPlayer, type FreeAgent, type MarketPlayer, type Prospect,
} from '@/lib/clubManager';
import { readWorldRoster, recordWorldRosterTransfer } from '@/lib/clubManagerWorldRoster';
import { saveFence } from '@/lib/saveFence';

const market: MarketPlayer = {
  name: 'Fixture Transfer', club: 'Ajax', position: 'CM', age: 25, rating: 74, price: 2,
};
const freeAgent: FreeAgent = {
  name: 'Fixture Free Agent', position: 'CM', age: 25, rating: 74, value: 2, since: 1,
  reason: 'unattached', generated: true,
};
const prospect: Prospect = {
  id: 'fixture-prospect', name: 'Fixture Prospect', position: 'CM', age: 17,
  rating: 61, potential: 81, lowGuess: 75, highGuess: 85, source: 'Academy', flag: '', fee: 0, season: 1,
};

function fixture(): CareerState {
  const career = startCareer('Everton');
  const player = (index: number): CMPlayer => ({
    id: `capacity-${index}`, name: `Capacity Fixture ${index}`,
    position: career.squad[index % career.squad.length].position, age: 25,
    rating: index === 0 ? 55 : 78, potential: index === 0 ? 55 : 78,
    value: 4, wage: 1, contractYears: 3, generated: true, isYouth: false,
    fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0,
    seasonGoals: 0, seasonAssists: 0,
  });
  return {
    ...career, budget: 500, wageCap: 5000, transferWindow: 'summer',
    squad: Array.from({ length: 30 }, (_, i) => player(i)),
    loanedOut: [30, 31, 32].map(i => ({ player: player(i), club: 'Ajax', fee: 0, recallFee: 0, season: 1 })),
    freeAgents: [freeAgent], academy: { ...career.academy!, prospects: [prospect] },
  };
}

function legacyTrim(): { career: CareerState; fallen: CMPlayer; trimmed: FreeAgent } {
  const before = { ...fixture(), worldSeed: 73 };
  const next = startNextSeason(finishSeason(before).state);
  const fallen = next.squad.find(player => player.id === 'capacity-0')!;
  const career = recordWorldRosterTransfer({ ...next, squad: next.squad.filter(p => p.id !== fallen.id) }, {
    player: fallen, from: next.clubName, to: null, kind: 'release',
  });
  const record = readWorldRoster(career)!.records.find(r => r.player.id === fallen.id)!;
  const trimmed: FreeAgent = {
    name: fallen.name, position: fallen.position, age: fallen.age, rating: fallen.rating,
    since: next.season, reason: 'released', fromMyClub: true, trimmed: true, worldRosterKey: record.key,
  };
  career.freeAgents = [...(career.freeAgents ?? []), trimmed];
  return { career, fallen, trimmed };
}

beforeEach(() => {
  saveFence.release(SAVE_KEY);
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0.6);
});
afterEach(() => { vi.restoreAllMocks(); saveFence.release(SAVE_KEY); });

describe('Club Manager squad capacity with loans', () => {
  it('keeps contracted players when loans return and the season rolls over the limit', () => {
    const before = fixture();
    before.squad[28].onLoan = true;
    before.squad[29].contractYears = 1;
    const next = startNextSeason(before);

    const retained = [...before.squad.slice(0, 28), ...before.loanedOut!.map(loan => loan.player)];
    expect(next.squad.map(p => p.id)).toEqual(expect.arrayContaining(retained.map(p => p.id)));
    expect(next.squad).toHaveLength(31);
    expect(next.loanedOut).toEqual([]);
    expect(next.squad.map(p => p.id)).not.toContain(before.squad[28].id);
    expect(next.freeAgents?.find(p => p.name === before.squad[29].name)?.reason).toBe('expired');
    expect(next.freeAgents?.some(p => retained.some(active => active.name === p.name))).toBe(false);
    expect(next.squad.find(p => p.id === 'capacity-30')?.contractYears).toBe(2);
    expect(saveCareer(next)).toBe(true);
    expect(loadCareer()?.squad.map(p => p.id)).toEqual(next.squad.map(p => p.id));
  });

  it.each([
    ['transfer', (career: CareerState) => buyPlayer(career, market)],
    ['free agent', (career: CareerState) => signFreeAgent(career, freeAgent.name)],
    ['academy', (career: CareerState) => promoteProspect(career, prospect.id)],
  ] as const)('keeps the active-squad limit for the %s path', (_label, add) => {
    const career = fixture();
    career.loanedOut = career.loanedOut!.slice(0, 1);
    const before = JSON.stringify(career);
    expect(add(career) === null).toBe(true);
    expect(JSON.stringify(career) === before).toBe(true);
    expect(add({ ...career, squad: career.squad.slice(0, 29) })?.squad).toHaveLength(30);
    const next = startNextSeason(career);
    expect(next.squad).toHaveLength(31);
    expect(add(next)).toBeNull();
  });

  it('blocks new talks at the active limit and can still recall a player into the 30th place', () => {
    const career = fixture();
    career.loanedOut = career.loanedOut!.slice(0, 1);
    expect(doorRefusal(career, market, 'talk')).toBe('Your squad is full at 30. Somebody has to leave first.');
    expect(freeAgentBlock(career, freeAgent)).toBe('squadFull');
    const recalled = recallLoanedPlayer({ ...career, squad: career.squad.slice(0, 29) }, career.loanedOut[0].player.id);
    expect(recalled?.squad).toHaveLength(30);
    expect(recalled?.loanedOut).toEqual([]);
  });

  it('loads legacy free agents from the old summer trim without a permanent release ban', () => {
    const career = fixture();
    career.squad = career.squad.slice(0, 29);
    career.freeAgents = [{ ...freeAgent, reason: 'released', fromMyClub: true, trimmed: true }];
    expect(saveCareer(career)).toBe(true);
    const loaded = loadCareer()!;
    const legacy = loaded.freeAgents?.find(player => player.name === freeAgent.name);
    expect(legacy?.trimmed).toBe(true);
    expect(releasedByYou(legacy!)).toBe(false);
    expect(freeAgentBlock(loaded, legacy!)).toBe('justLeft');
  });

  it('restores an old automatic release with its recorded unexpired contract above the signing limit', () => {
    const { career, fallen, trimmed } = legacyTrim();
    expect(career.squad.length).toBeGreaterThan(30);
    expect(fallen.contractYears).toBe(2);
    const loaded = loadCareer(JSON.stringify(career))!;
    expect(loaded.squad.find(p => p.id === fallen.id)).toMatchObject({
      name: fallen.name, age: fallen.age, contractYears: 2, wage: fallen.wage, rating: fallen.rating,
    });
    expect(loaded.freeAgents?.some(p => p.name === fallen.name)).toBe(false);
    expect(readWorldRoster(loaded)?.records.find(record => record.key === trimmed.worldRosterKey))
      .toMatchObject({ status: 'owned', owner: career.clubName });
    expect(loaded.budget).toBe(career.budget);
    expect(loaded.transferLog).toEqual(career.transferLog);
    const reloaded = loadCareer(JSON.stringify(loaded))!;
    expect(reloaded.squad.filter(p => p.id === fallen.id)).toHaveLength(1);
    expect(reloaded.squad.find(p => p.id === fallen.id)?.contractYears).toBe(2);
    expect(startNextSeason(loaded).squad.find(p => p.id === fallen.id)?.contractYears).toBe(1);
  });

  it.each([
    ['expiry', { reason: 'expired', trimmed: undefined }],
    ['missing identity', { worldRosterKey: undefined }],
    ['wrong identity', { worldRosterKey: 'other player' }],
    ['ordinary release', { trimmed: undefined }],
  ] as const)('leaves %s alone in free agency', (_label, change) => {
    const { career, fallen, trimmed } = legacyTrim();
    career.freeAgents = [{ ...trimmed, ...change }];
    const loaded = loadCareer(JSON.stringify(career))!;
    expect(loaded.squad.some(p => p.id === fallen.id)).toBe(false);
    expect(loaded.freeAgents?.some(p => p.name === fallen.name)).toBe(true);
    expect(readWorldRoster(loaded)?.records.find(record => record.key === trimmed.worldRosterKey)?.status).toBe('released');
  });

  it('requires the former club to match the current job', () => {
    const { career, fallen } = legacyTrim();
    career.history = career.history.map(season => ({ ...season, club: 'Ajax' }));
    const loaded = loadCareer(JSON.stringify(career))!;
    expect(loaded.squad.some(p => p.id === fallen.id)).toBe(false);
    expect(loaded.freeAgents?.some(p => p.name === fallen.name)).toBe(true);
  });

  it('recovers only original deals after the released ledger ages another summer', () => {
    const { career, fallen } = legacyTrim();
    const shortDeal = { ...fallen, id: 'short-contract', name: 'Short Deal Fixture', contractYears: 1 };
    const pad = { ...fallen, id: 'youth-unregistered', name: 'Unregistered Fixture (Youth)', age: 18,
      isYouth: true, role: undefined, contractYears: undefined };
    let before = career;
    for (const player of [shortDeal, pad]) {
      before = recordWorldRosterTransfer(before, { player, from: before.clubName, to: null, kind: 'release' });
      const record = readWorldRoster(before)!.records.find(r => r.player.id === player.id)!;
      before.freeAgents = [...(before.freeAgents ?? []), {
        name: player.name, position: player.position, age: player.age, rating: player.rating,
        since: before.season, reason: 'released', fromMyClub: true, trimmed: true, worldRosterKey: record.key,
      }];
    }
    const aged = startNextSeason(finishSeason(before).state);
    const records = readWorldRoster(aged)?.records;
    expect(records?.find(record => record.player.id === shortDeal.id)?.player.contractYears).toBe(0);
    expect(records?.find(record => record.player.id === pad.id)?.player.contractYears).toBe(2);
    const loaded = loadCareer(JSON.stringify(aged))!;
    expect(loaded.squad.find(p => p.id === fallen.id)?.contractYears).toBe(1);
    expect(loaded.squad.some(p => p.id === shortDeal.id || p.id === pad.id)).toBe(false);
    expect(loaded.freeAgents?.map(row => row.name)).toEqual(expect.arrayContaining([shortDeal.name, pad.name]));
  });
});
