import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildMarket, buyPlayer, doorRefusal, foreignRosterSlots, freeAgentBlock, loanIn, objectiveStatuses, registerCustomClub,
  registerLeagueOverrides, startCareer, startNextSeason, worldRosterFor,
} from './clubManager';
import { asianSquadRoster } from './clubManagerEras';
import { J1_LEAGUE_2026 } from '@/data/j1League2026';
import { CSL_LEAGUE_2026 } from '@/data/cslLeague2026';
import { K_LEAGUE_2026 } from '@/data/kLeague2026';

beforeEach(() => {
  registerCustomClub(null);
  registerLeagueOverrides(null);
});

describe('Club Manager generated Asian leagues', () => {
  it.each([
    ['Ulsan HD', 'FC Seoul', 'South Korea'],
    ['Kashima Antlers', 'Vissel Kobe', 'Japan'],
    ['Shanghai Port', 'Shanghai Shenhua', 'China'],
  ])('stocks %s and its market with varied local senior players', (club, rival, nation) => {
    const career = startCareer(club);
    const local = career.squad.filter(p => p.generated && !p.isYouth && p.nation === nation);
    expect(local.length).toBeGreaterThan(16);
    expect(new Set(local.map(p => p.rating)).size).toBeGreaterThan(6);
    expect(worldRosterFor(career, rival).every(p => p.g && p.nation === nation)).toBe(true);
    const available = buildMarket(career).filter(p => p.club === rival && p.generated && p.nation === nation);
    expect(available.length).toBeGreaterThan(16);
    const bought = buyPlayer({ ...career, budget: 100 }, available[0]);
    expect(bought?.squad.at(-1)).toMatchObject({ name: available[0].name, generated: true, nation });
    expect(buildMarket(bought!).some(p => p.name === available[0].name)).toBe(false);
    expect(worldRosterFor(bought!, rival).some(p => p.n === available[0].name)).toBe(false);
  });

  it('shares the foreign player limit across the market, loans and free agency', () => {
    const start = startCareer('Kashima Antlers');
    const market = buildMarket(start);
    const incoming = market.find(p => p.generated && p.nation === 'Japan')!;
    const foreign = { ...incoming, name: 'Test import', nation: 'Brazil', age: 21, worldRosterKey: undefined };
    const free = { ...foreign, since: 1, reason: 'unattached' as const };
    const career = {
      ...start,
      budget: 100,
      freeAgents: [free],
      squad: start.squad.map((p, i) => i < 5 ? { ...p, nation: 'Portugal' } : p),
    };
    const onLoan = { ...career, loanedOut: [{ player: career.squad[0], club: 'Paris SG', fee: 0, season: 1 }] };
    expect(doorRefusal(career, foreign, 'buy')).toContain('foreign');
    expect(doorRefusal(career, foreign, 'talk')).toContain('foreign');
    expect(buyPlayer(career, foreign)).toBeNull();
    expect(loanIn(career, foreign)).toBeNull();
    expect(freeAgentBlock(career, free)).toBe('foreignLimit');
    expect(buyPlayer(career, incoming)).not.toBeNull();
    expect(buyPlayer({ ...onLoan, squad: career.squad.slice(1) }, foreign)).toBeNull();
    expect(buyPlayer({ ...career, squad: career.squad.slice(1) }, foreign)).not.toBeNull();
  });

  it('opens a youth development objective after consecutive league titles at the same club', () => {
    const first = startCareer('Kashima Antlers');
    const title = { club: first.clubName, leagueId: 'j1', position: 1, points: 76, trophies: ['League Title'] };
    const history = [{ ...title, season: 1 }, { ...title, season: 2 }];
    const next = startNextSeason({ ...first, season: 2, history });
    const objective = next.boardObjectives?.find(o => o.id === 'academyRegulars')!;
    const stats = { apps: 19, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum: 0 };
    expect(objective.label).toContain('19 league appearances');
    const find = (c: typeof next) => objectiveStatuses(c).find(item => item.objective.id === 'academyRegulars')?.status;
    const seasonDone = { ...next, week: next.calendar.length };
    expect(find(seasonDone)).toBe('failed');
    const squad = next.squad.map((p, i) => i < 2 ? { ...p, academyGrad: true, comp: { league: stats } } : p);
    expect(find({ ...seasonDone, squad })).toBe('done');
    const oneTitle = startNextSeason({ ...first, season: 2, history: [history[1]] });
    expect(find(oneTitle)).toBeUndefined();
  });

  it('keeps generated clubs at different strengths and gives later recruits unique identities', () => {
    for (const clubs of [J1_LEAGUE_2026.clubs, CSL_LEAGUE_2026.clubs, K_LEAGUE_2026.clubs.map(club => club.name)]) {
      const level = (club: string) => asianSquadRoster(club, 0).slice(0, 11).reduce((sum, p) => sum + p.r, 0) / 11;
      expect(new Set(clubs.map(level)).size).toBeGreaterThan(5);
      for (const year of [0, 1, 5, 12, 20]) {
        const players = clubs.flatMap(club => asianSquadRoster(club, year, 211));
        expect(players).toHaveLength(clubs.length * 21);
        expect(new Set(players.map(p => p.n)).size).toBe(players.length);
        expect(new Set(players.map(p => p.worldRosterKey)).size).toBe(players.length);
      }
    }
  });

  it('keeps a scoped local market on a job move and restores it on return', () => {
    const career = startCareer('Kashima Antlers');
    const moved = startNextSeason(career, 'Arsenal');
    expect(moved.clubName).toBe('Arsenal');
    expect(foreignRosterSlots(moved)).toBeNull();
    expect(buildMarket(moved).some(p => p.club === 'Vissel Kobe' && p.generated && p.nation === 'Japan')).toBe(true);
    expect(buildMarket(moved).some(p => p.club === 'Shanghai Port')).toBe(false);
    const hired = startNextSeason(moved, 'Vissel Kobe');
    expect(hired.clubName).toBe('Vissel Kobe');
    expect(foreignRosterSlots(hired)).toMatchObject({ home: 'Japan', limit: 5 });
    const target = buildMarket(hired).find(p => p.club === 'Avispa Fukuoka' && p.generated && p.nation === 'Japan')!;
    const bought = buyPlayer({ ...hired, budget: 100 }, target);
    expect(bought?.squad.at(-1)).toMatchObject({ worldRosterKey: target.worldRosterKey });
    expect(worldRosterFor(bought!, target.club).some(p => p.n === target.name)).toBe(false);
  });
});
