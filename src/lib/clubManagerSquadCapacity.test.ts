import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buyPlayer, doorRefusal, freeAgentBlock, loadCareer, promoteProspect, releasedByYou,
  recallLoanedPlayer, SAVE_KEY, saveCareer, signFreeAgent, startCareer, startNextSeason,
  type CareerState, type CMPlayer, type FreeAgent, type MarketPlayer, type Prospect,
} from '@/lib/clubManager';
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
});
