import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { advanceProSeason, calcOverall, FALLBACK_CLUBS, repairCareer, type CareerState } from '@/lib/soccerCareerEngine';
import { parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

const saves = JSON.parse(readFileSync(resolve('scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')) as {
  saves: { id: string; state: CareerState }[];
};
const source = saves.saves.find(save => save.id === 'ere')!.state;
const club = FALLBACK_CLUBS.find(entry => entry.name === 'Arsenal')!;

function playSeason(seed: number) {
  const draft: CareerState = {
    ...structuredClone(source), playerName: 'Shield annual witness', phase: 'playing',
    currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
    currentClubColor: club.color, currentLeague: club.league,
    pace: 85, shooting: 85, passing: 85, dribbling: 85, defending: 85, physical: 85, reflexes: 85,
  };
  draft.overall = calcOverall(draft, draft.position);
  let lcg = seed;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    lcg = (Math.imul(lcg, 1664525) + 1013904223) >>> 0;
    return lcg / 4294967296;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1793448000000);
  try {
    const career = advanceProSeason(repairCareer(draft), FALLBACK_CLUBS);
    const season = career.seasons[career.seasons.length - 1];
    expect(season).toMatchObject({ year: 2029, club: 'Arsenal', type: 'playing' });
    expect(career.phone?.world?.year).toBe(season.year);
    expect(career.phone?.seed).toBe(4272396692);
    expect(career.extraCupQualification?.status).toBe('ready');
    expect(career.germanSupercupQualification?.status).toBe('ready');
    return { career, season, calls: random.mock.calls.length, lcg };
  } finally {
    random.mockRestore();
    clock.mockRestore();
  }
}

describe('Soccer Career European champion', () => {
  it('credits the recorded shootout winner in the same simulated world', () => {
    const { career, season, calls, lcg } = playSeason(23);
    const run = season.clubCupRun!;
    const final = run.matches[run.matches.length - 1];
    expect(run).toMatchObject({ cup: 'ucl', result: 'Final', seasonYear: season.year, club: season.club });
    expect(final).toMatchObject({ round: 'Final', opponent: 'Chelsea', won: false, decidedBy: 'penalties',
      goalsFor: 3, goalsAgainst: 3, pensFor: 2, pensAgainst: 3 });
    expect(season.championsLeague).toBe(false);
    expect([calls, lcg]).toEqual([1023, 792862104]);
    expect(career.phone?.world).toMatchObject({ leagues: { 'Premier League': 'Man City' }, cups: { 'Premier League': 'Arsenal' } });
    expect(career.phone?.world?.ucl).toBe(final.opponent);
    expect(career.phone?.feed).toContain('⭐ Chelsea are champions of Europe.');
    expect(career.phone?.feed).not.toContain('⭐ PSG are champions of Europe.');
    const saved = parseSoccerCareerSave(serializeSoccerCareerSave(career)) as CareerState;
    expect(saved.phone?.world?.ucl).toBe(final.opponent);
    expect(saved.seasons[saved.seasons.length - 1].clubCupRun).toEqual(run);
  });

  it('uses the same winning club in the award shortlist and phone world', () => {
    const { career, season } = playSeason(33);
    const run = season.clubCupRun!;
    const final = run.matches[run.matches.length - 1];
    expect(run).toMatchObject({ result: 'Final', cup: 'ucl' });
    expect(final).toMatchObject({ round: 'Final', opponent: 'Real Madrid', won: false, goalsFor: 0, goalsAgainst: 1 });
    const realMadrid = career.pendingBallonDor?.nominees.filter(nominee => nominee.club === final.opponent) ?? [];
    expect(realMadrid.length).toBeGreaterThan(0);
    expect(realMadrid.every(nominee => nominee.trophies.includes('UCL'))).toBe(true);
    expect(career.phone?.world?.ucl).toBe(final.opponent);
    expect(career.pendingBallonDor?.nominees.some(nominee => nominee.club !== final.opponent && nominee.trophies.includes('UCL'))).toBe(false);
  });

  it('preserves the player club champion when it wins the saved final', () => {
    const { career, season, calls, lcg } = playSeason(10);
    expect(season.clubCupRun).toMatchObject({ result: 'Winner', cup: 'ucl' });
    expect(season.championsLeague).toBe(true);
    expect(career.phone?.world?.ucl).toBe(season.club);
    expect([calls, lcg]).toEqual([1016, 3946041378]);
  });

  it('preserves the existing seeded winner when the player club drops out before the final', () => {
    const { career, season, calls, lcg } = playSeason(0);
    expect(season.clubCupRun).toMatchObject({ result: 'R16', cup: 'ucl' });
    expect(career.phone?.world?.ucl).toBe('PSG');
    expect(career.phone?.feed).toContain('⭐ PSG are champions of Europe.');
    expect([calls, lcg]).toEqual([959, 3677050277]);
  });
});
