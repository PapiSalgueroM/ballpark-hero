/**
 * Round 1597 closing check: a mid season job move (joinClubNow) keeps free agency the way a summer move does. Before
 * the fix the joined save took the new club's list whole and dropped releasedNames and freeAgencyV2, so every man I
 * had let walk was gone from the game, and the next summer's recoverPooledReleases (run again for want of the flag)
 * could put a man I released back from the ledger as a signable 'expired' record. The join is the real one, set up
 * the way clubManagerHandoverDesk.test.ts sets it up (a saved accepted application).
 */
import { describe, expect, it } from 'vitest';
import { freeAgentBlock, startCareer, type CareerState, type FreeAgent } from '@/lib/clubManager';
import { joinClubNow } from '@/lib/clubManagerCalendar';

const man = (name: string, extra: Partial<FreeAgent>): FreeAgent => ({
  name, position: 'CB', age: 29, rating: 60, value: 1, generated: true, since: 3, reason: 'expired', fromMyClub: true, ...extra,
});

function pendingJoin(): CareerState {
  const input = startCareer('Arsenal');
  input.week = Math.max(2, Math.floor(input.calendar.length * 0.28));
  input.season = 3;
  input.jobHunt = { open: {
    club: 'Everton', league: 'premier', tier: 3, season: input.season, week: input.week,
    matchesLeft: 0, roll: 0, status: 'accepted',
  }, cooldowns: [], sentSeason: input.season, sent: 1, summerMove: null } as unknown as CareerState['jobHunt'];
  return input;
}

describe('Round 1597: a mid season job move loses nobody off the free agent list', () => {
  it('carries the men who left me, my released names and the once only pass, and leaves the old journeymen', () => {
    const input = pendingJoin();
    const oldJourneymen = (input.freeAgents ?? []).filter(f => f.reason === 'unattached' && f.generated).map(f => f.name);
    expect(oldJourneymen.length).toBeGreaterThan(0);
    const walked = man('Walked Test Man', {});
    const released = man('Released Test Man', { reason: 'released', since: 2 });
    const trimmed = man('Trimmed Test Man', { reason: 'released', trimmed: true, since: 2 });
    input.freeAgents = [...(input.freeAgents ?? []), walked, released, trimmed];
    input.releasedNames = ['Released Test Man', 'Long Gone Test Man'];
    input.freeAgencyV2 = true;
    const joined = joinClubNow(input);
    expect(joined?.clubName).toBe('Everton');
    const pool = joined!.freeAgents ?? [];
    for (const m of [walked, released, trimmed]) expect(pool.filter(f => f.name === m.name)).toEqual([m]);
    expect(joined!.releasedNames).toEqual(['Released Test Man', 'Long Gone Test Man']);
    expect(joined!.freeAgencyV2).toBe(true);
    /* The man I released is still barred at the new club; the trimmed man is mine, not barred. */
    expect(freeAgentBlock(joined!, pool.find(f => f.name === released.name)!)).toBe('releasedByYou');
    expect(freeAgentBlock(joined!, pool.find(f => f.name === trimmed.name)!)).not.toBe('releasedByYou');
    /* The old club's journeymen stay behind; the new club's own come with the joined save. */
    expect(pool.some(f => oldJourneymen.includes(f.name))).toBe(false);
    expect(pool.some(f => f.reason === 'unattached' && f.generated)).toBe(true);
    expect(new Set(pool.map(f => f.name)).size).toBe(pool.length);
    expect(pool.some(f => joined!.squad.some(p => p.name === f.name))).toBe(false);
  }, 120000);

  it('a save with nothing of the kind joins exactly as before', () => {
    const input = pendingJoin();
    input.freeAgents = (input.freeAgents ?? []).filter(f => f.reason === 'unattached');
    delete input.releasedNames;
    delete input.freeAgencyV2;
    const joined = joinClubNow(input)!;
    expect(joined.clubName).toBe('Everton');
    expect('releasedNames' in joined).toBe(false);
    expect('freeAgencyV2' in joined).toBe(false);
    expect((joined.freeAgents ?? []).every(f => f.reason === 'unattached')).toBe(true);
  }, 120000);
});
