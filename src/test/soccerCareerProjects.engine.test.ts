import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { advanceProSeason, FALLBACK_CLUBS, repairCareer, type CareerState } from '@/lib/soccerCareerEngine';
import { chooseCareerProject, resolveCareerProject } from '@/lib/soccerCareerProjects';
import { parseSoccerCareerSave, serializeSoccerCareerSave, SOCCER_CAREER_SAVE_VERSION } from '@/lib/soccerCareerSave';

function playingCareer(): CareerState {
  const source = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const state = structuredClone(source.saves.find((save: { id: string }) => save.id === 'ere').state) as CareerState;
  const club = FALLBACK_CLUBS.find(item => item.name === 'Arsenal')!;
  return { ...state, currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
    currentClubColor: club.color, currentLeague: club.league, phase: 'playing', retired: false, age: 24,
    position: 'ST', overall: 85, loan: null, pendingLoanOffers: null };
}

function play(state: CareerState) {
  let seed = 1180;
  const draws: number[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    const value = ((t ^ t >>> 14) >>> 0) / 4294967296;
    draws.push(value);
    return value;
  });
  try { return { next: advanceProSeason(state, FALLBACK_CLUBS), draws }; }
  finally { random.mockRestore(); }
}

describe('Career Projects on the normal Soccer Career save and season path', () => {
  it('reloads a commitment, settles actual played stats once, and preserves the baseline season and random stream', () => {
    const start = playingCareer();
    const before = JSON.stringify(start);
    const optedIn = chooseCareerProject(start, 'street-league', 'open-signups');
    expect(JSON.stringify(start)).toBe(before);
    expect(optedIn.careerProjects?.pending).toMatchObject({ projectId: 'street-league', choiceId: 'open-signups' });
    expect(optedIn.morale).toBe(start.morale);

    const loaded = repairCareer(parseSoccerCareerSave(serializeSoccerCareerSave(optedIn, SOCCER_CAREER_SAVE_VERSION)) as CareerState);
    expect(loaded.careerProjects).toEqual(optedIn.careerProjects);
    expect(chooseCareerProject(loaded, 'match-lab', 'keep-notes')).toBe(loaded);

    const normal = play(structuredClone(start));
    const project = play(loaded);
    const season = project.next.seasons.at(-1)!;
    expect(season.apps).toBeGreaterThanOrEqual(8);
    expect(project.draws).toEqual(normal.draws);
    expect(season).toEqual(normal.next.seasons.at(-1));
    expect(project.next.careerProjects?.pending).toBeUndefined();
    expect(project.next.careerProjects?.progress['street-league']).toBe(1);
    expect(project.next.careerProjects?.receipts).toHaveLength(1);
    expect(project.next.careerProjects?.receipts?.[0]).toMatchObject({ year: season.year, evidence: { apps: season.apps } });
    expect(project.next.morale).toBe(Math.min(100, normal.next.morale + 2));

    const restored = repairCareer(parseSoccerCareerSave(serializeSoccerCareerSave(project.next, SOCCER_CAREER_SAVE_VERSION)) as CareerState);
    expect(restored.careerProjects).toEqual(project.next.careerProjects);
    expect(resolveCareerProject(restored, season)).toBe(restored);
  });

  it('keeps old saves free of extra project data and clears a malformed commitment', () => {
    const start = playingCareer();
    expect(repairCareer(start).careerProjects).toBeUndefined();
    const malformed = Object.assign(playingCareer(), { careerProjects: { pending: { projectId: 'missing' }, progress: { 'street-league': 999 } } });
    expect(repairCareer(malformed as unknown as CareerState).careerProjects).toBeUndefined();
  });
});
