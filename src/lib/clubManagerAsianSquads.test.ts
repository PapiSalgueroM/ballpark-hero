import { beforeEach, describe, expect, it } from 'vitest';
import {
  acceptBid, buildMarket, buyPlayer, canLeaveSquad, doorRefusal, finishSeason, foreignRosterSlots, freeAgentBlock,
  loadCareer, loanIn, loanOutPlayer, objectiveStatuses, recallLoanedPlayer, registerCustomClub, registerLeagueOverrides,
  releasePlayer, startCareer, startNextSeason, worldRosterFor,
} from './clubManager';
import { joinClubNow } from './clubManagerCalendar';
import { asianSquadRoster } from './clubManagerEras';
import { emptyJobHunt } from './clubManagerJobHunt';
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

  it.each([
    ['Ulsan HD', 'kleague1', 'FC Seoul'],
    ['Kashima Antlers', 'j1', 'Vissel Kobe'],
    ['Shanghai Port', 'csl', 'Shanghai Shenhua'],
  ])('recovers the %s market in a legacy save that already moved away', (club, leagueId, rival) => {
    const first = startCareer(club);
    const finished = finishSeason({ ...first, week: first.calendar.length }).state;
    const moved = startNextSeason(finished, 'Arsenal');
    const originalMarket = buildMarket(moved).filter(p => p.club === rival && p.generated);
    expect(originalMarket).toHaveLength(21);

    const legacy = { ...moved, asianSquadLeague: undefined, careerStats: { ...moved.careerStats, clubsManaged: ['Arsenal'] },
      history: leagueId === 'kleague1' ? moved.history : [] };
    const loaded = loadCareer(JSON.stringify(legacy))!;
    expect(loaded.asianSquadLeague).toBe(leagueId);
    expect(loaded.squad).toEqual(moved.squad);
    expect(loaded.worldRoster).toEqual(moved.worldRoster);
    expect(loaded.clubStrengths).toEqual(moved.clubStrengths);
    expect(loaded.leagueBook).toEqual(moved.leagueBook);
    expect(buildMarket(loadCareer(JSON.stringify(loaded))!).filter(p => p.club === rival && p.generated)).toEqual(originalMarket);
  });

  it('recovers Korea after a legacy midseason move without a completed season', () => {
    const first = startCareer('Ulsan HD');
    const moved = joinClubNow({ ...first, week: 10, jobHunt: {
      ...emptyJobHunt(first.season),
      open: { club: 'Arsenal', league: 'premier', tier: 1, season: first.season, week: 4, matchesLeft: 0, roll: 0, status: 'accepted' },
    } })!;
    expect(moved.history).toHaveLength(0);
    const loaded = loadCareer(JSON.stringify({ ...moved, asianSquadLeague: undefined }))!;
    expect(loaded.asianSquadLeague).toBe('kleague1');
    expect(buildMarket(loaded).filter(p => p.club === 'FC Seoul' && p.generated)).toHaveLength(21);
  });

  it.each([
    ['Kashima Antlers', 'j1', 'Vissel Kobe'],
    ['Shanghai Port', 'csl', 'Shanghai Shenhua'],
  ])('keeps the legacy %s market after moving to a Korean club', (club, leagueId, rival) => {
    const first = startCareer(club);
    const finished = finishSeason({ ...first, week: first.calendar.length }).state;
    const moved = startNextSeason(finished, 'Ulsan HD');
    expect(moved.clubName).toBe('Ulsan HD');
    const loaded = loadCareer(JSON.stringify({ ...moved, asianSquadLeague: undefined }))!;
    const market = buildMarket(loaded);
    expect(loaded.asianSquadLeague).toBe(leagueId);
    expect(market.filter(p => p.club === rival && p.generated)).toHaveLength(21);
    expect(market.filter(p => p.club === 'FC Seoul' && p.generated)).toHaveLength(21);
  });

  it('keeps a legacy England-only career out of the generated Korean market', () => {
    const moved = startNextSeason(startCareer('Arsenal'), 'Liverpool');
    expect(moved.world?.kleague1).toBeDefined();
    const loaded = loadCareer(JSON.stringify(moved))!;
    expect(loaded.asianSquadLeague).toBeUndefined();
    expect(buildMarket(loaded).some(p => p.club === 'FC Seoul' && p.generated)).toBe(false);
  });

  it('keeps academy credit through a loan, sale or release and settles the objective', () => {
    const first = startCareer('Kashima Antlers');
    const title = { club: first.clubName, leagueId: 'j1', position: 1, points: 76, trophies: ['League Title'] };
    const third = startNextSeason({ ...first, season: 2, history: [{ ...title, season: 1 }, { ...title, season: 2 }] });
    const academy = (career: typeof third) => objectiveStatuses(career).find(row => row.objective.id === 'academyRegulars')!;
    const selected = third.squad.filter(p => p.position !== 'GK' && canLeaveSquad(third, p)).slice(0, 2);
    expect(selected).toHaveLength(2);
    const [departing, staying] = selected;
    const target = academy(third).objective.target;
    const stats = { apps: target, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum: 0 };
    const ready = { ...third, week: Math.floor(third.calendar.length / 2), transferWindow: 'january' as const,
      squad: third.squad.map(p => selected.includes(p) ? { ...p, academyGrad: true, comp: { ...p.comp, league: stats } } : p) };
    expect(academy(ready).status).toBe('done');
    const rival = 'Vissel Kobe';
    const loan = loanOutPlayer(structuredClone(ready), departing.id, rival, 0)!;
    const sale = acceptBid({ ...structuredClone(ready), incomingBids: [
      { playerId: departing.id, playerName: departing.name, club: rival, offer: 5, status: 'open' },
    ] }, departing.id)!;
    const release = releasePlayer(structuredClone(ready), departing.id)!;
    for (const moved of [loan, sale, release]) {
      const loaded = loadCareer(JSON.stringify(moved))!;
      expect(loaded.squad.some(p => p.id === departing.id)).toBe(false);
      const line = loaded.departedLeagueLines!.find(p => p.id === departing.id)!;
      expect(line).toMatchObject({ academyGrad: true, apps: target, club: ready.clubName, leagueId: 'j1' });
      expect(academy(loaded).status).toBe('done');
      const settled = finishSeason({ ...loaded, week: loaded.calendar.length }).summary.objectives;
      expect(settled.find(row => row.label === academy(loaded).objective.label)?.hit).toBe(true);
      for (const held of [{ ...line, club: rival }, { ...line, leagueId: 'csl' }, { ...line, apps: target - 1 }, { ...line, id: staying.id }]) {
        expect(academy({ ...loaded, departedLeagueLines: [held] }).why).toBe('1/2 graduates reached the target');
      }
    }
    const recalled = recallLoanedPlayer(loan, departing.id)!;
    expect(recalled.departedLeagueLines?.some(p => p.id === departing.id)).toBe(false);
    expect(recalled.squad.find(p => p.id === departing.id)?.comp?.league?.apps).toBe(target);
    expect(academy(recalled).status).toBe('done');
    expect(startNextSeason({ ...loan, week: loan.calendar.length }).departedLeagueLines).toBeUndefined();
  });
});
