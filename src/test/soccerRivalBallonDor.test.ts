import { afterEach, describe, expect, it, vi } from 'vitest';
import { rivalryEventPool } from '@/lib/careerRivalryEvents';
import { careerBeforeBallonDorReveal, revealBallonDorResult } from '@/lib/soccerAwardReveal';
import {
  acceptOffer, advanceProSeason, advanceYouthYear, dismissBallonDor, dismissRivalryEvent,
  FALLBACK_CLUBS, initCareer, repairCareer, SOCCER_RIVALRY_EVENTS, type CareerState, type RivalPlayer,
} from '@/lib/soccerCareerEngine';

const clubs = FALLBACK_CLUBS;
const rival: RivalPlayer = {
  name: 'Santiago Velloren', nationality: 'Spain', position: 'ST', club: 'Real Madrid', clubTier: 1,
  overall: 95, careerGoals: 50, careerAssists: 30, careerApps: 80, leagueTitles: 1,
  championsLeagues: 0, worldCups: 0, ballonDors: 2, intCaps: 5, intGoals: 1,
  marketValue: 50, age: 23, retired: false,
};

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let bits = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    bits = (bits + Math.imul(bits ^ (bits >>> 7), 61 | bits)) ^ bits;
    return ((bits ^ (bits >>> 14)) >>> 0) / 4294967296;
  };
}

function signedCareer(year = 2005): CareerState {
  vi.spyOn(Math, 'random').mockImplementation(seeded(1));
  const attributes = { pace: 99, shooting: 99, passing: 99, dribbling: 99, defending: 99, physical: 99, reflexes: 99 };
  const youth = initCareer('Award test', 'Brazil', 'LW', '2005-09', attributes, 99, year, clubs, null, 99, null, null, 'Barcelona');
  const ready = advanceYouthYear(youth, clubs, true);
  const signed = acceptOffer(ready, ready.pendingOffers.find(offer => offer.isHomegrown)!);
  return { ...signed, rival, rivalCreated: true };
}

afterEach(() => vi.restoreAllMocks());

describe("Soccer Career rival Ballon d'Or", () => {
  it.each([
    { year: 2005, seed: 21, rank: 1, winner: 'player' },
    { year: 2005, seed: 6, rank: null, winner: 'other' },
    { year: 2035, seed: 45, rank: 2, winner: 'rival' },
    { year: 2035, seed: 121, rank: 11, winner: 'rival' },
  ])('credits only the $winner win at player rank $rank', ({ year, seed, rank, winner }) => {
    const signed = signedCareer(year);
    vi.mocked(Math.random).mockImplementation(seeded(seed));
    const settled = advanceProSeason({ ...signed, overall: 79, currentClubTier: 3 }, clubs, true);
    const night = settled.pendingBallonDor!;
    const leader = night.nominees[0];
    const tally = rival.ballonDors + Number(winner === 'rival');
    expect(night.playerRank).toBe(rank);
    expect(leader.isPlayer).toBe(winner === 'player');
    expect(leader.name === rival.name).toBe(winner === 'rival');
    expect(settled.rival?.ballonDors).toBe(tally);
    expect(signed.rival?.ballonDors).toBe(2);
    expect(careerBeforeBallonDorReveal(settled).rival?.ballonDors).toBe(rival.ballonDors);

    const ceremony = { ...settled, phase: 'ballon_dor' as const };
    const reloaded = repairCareer(JSON.parse(JSON.stringify(ceremony)) as CareerState);
    expect(careerBeforeBallonDorReveal(reloaded).rival?.ballonDors).toBe(rival.ballonDors);
    const revealed = revealBallonDorResult(reloaded);
    expect(revealed.rival).toBe(reloaded.rival);
    expect(careerBeforeBallonDorReveal(revealed).rival?.ballonDors).toBe(tally);
    expect(dismissBallonDor(revealed, clubs).rival?.ballonDors).toBe(tally);
  });

  it('repairs queued legacy copy and still pays its existing motivation once', () => {
    const career = signedCareer();
    const event = rivalryEventPool(career, rival, SOCCER_RIVALRY_EVENTS).find(row => row.id === 101)!;
    expect(event.description).toContain(rival.name);
    expect(event.description).not.toMatch(/won|3rd/i);

    const legacy = {
      ...career, phase: 'rivalry_event' as const, morale: 60, statBoostNextSeason: {},
      pendingRivalryEvent: {
        ...event, title: "Rival Wins Ballon d'Or", description: `${rival.name} won the Ballon d'Or. You finished 3rd.`,
      },
    };
    const repaired = repairCareer(JSON.parse(JSON.stringify(legacy)) as CareerState);
    expect(repaired.pendingRivalryEvent).toEqual(event);
    expect(repaired.rival?.ballonDors).toBe(2);

    const continued = dismissRivalryEvent(repaired, clubs);
    expect(continued.statBoostNextSeason).toMatchObject({ shooting: 1, dribbling: 1 });
    expect(continued.morale).toBe(55);
    expect(continued.events).toContain(`${event.emoji} ${event.title}`);
    expect(continued.pendingRivalryEvent).toBeNull();
    expect(continued.lastRivalryEventId).toBe(101);
    const repeated = dismissRivalryEvent(continued, clubs);
    expect(repeated.statBoostNextSeason).toEqual(continued.statBoostNextSeason);
    expect(repeated.morale).toBe(continued.morale);
    expect(repeated.rival?.ballonDors).toBe(2);
  });
});
