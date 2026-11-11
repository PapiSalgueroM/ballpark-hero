import { describe, expect, it } from 'vitest';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { NHL_ARCHETYPES, nhlAssignRole, nhlCampBattle, nhlRollTeamQuality, simNhlSeason, startNhlCareer } from '@/lib/nhlMyCareer';
import { mulberry32 } from '@/lib/leagueCore';
import { driveCareer } from './helpers/usCareerDrive';

describe('NHL career Cups when the rival plays for the same club', () => {
  it.each([
    { eraId: 'now', seed: 1, prior: 2, result: 'Missed the playoffs', won: 0 },
    { eraId: 'y2006', seed: 40, prior: 0, result: 'WON THE STANLEY CUP', won: 1 },
  ])('awards the teammate the same Cup result in $eraId', ({ eraId, seed, prior, result, won }) => {
    const draftRng = mulberry32(19);
    const c = startNhlCareer('Cameron Test', 'C', NHL_ARCHETYPES.C[0], draftRng, null, eraId);
    const quality = nhlRollTeamQuality(null, draftRng);
    nhlAssignRole(c, quality, draftRng);
    const rival = c.rival!;
    expect(rival.team).toBe(c.team);
    rival.rings = prior;

    const rng = mulberry32(seed);
    nhlCampBattle(c, quality, rng);
    expect(simNhlSeason(c, quality, rng).line.teamResult).toBe(result);
    expect(c.cups).toBe(won);
    expect(rival.rings).toBe(prior + won);
  });

  it('retains the Cup drawn for a rival on another club', () => {
    const { json } = driveCareer(NHL_CAREER_SPORT, { key: 'rival-cup-control-8', pos: 'C', arch: 0, eraId: 'now', seasons: 6 });
    const c = JSON.parse(json) as ReturnType<typeof startNhlCareer>;
    const rival = c.rival!;
    expect(rival.team).not.toBe(c.team);
    const prior = rival.rings;

    const rng = mulberry32(14);
    nhlCampBattle(c, 80, rng);
    expect(simNhlSeason(c, 80, rng).line.teamResult).toBe('Missed the playoffs');
    expect(rival.rings).toBe(prior + 1);
  });
});
