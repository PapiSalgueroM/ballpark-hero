import { beforeAll, describe, expect, it } from 'vitest';
import {
  REGULAR_WEEKS, aiWeeklyMoves, capUsed, consumeDraftPick, executeTalksTrade, generateDraftClass, initLeague,
  injuryPass, prospectToPlayer, releasePlayer, reviewNflWeekRatings, runOffseason, runPlayoffs,
  simGame, tagRefusal, withPracticeElevations,
} from '@/lib/frontOffice';
import { deadMoneyFor } from '@/lib/frontOfficeCuts';
import { leagueNames } from '@/lib/foNames';
import { deskCases, useOption } from '@/lib/gmContracts';
import { nflContractHost } from '@/lib/gmContractsHostNfl';
import { nflAwayHost } from '@/lib/nflGmCareer';
import {
  nflApplyTradeDeadMoney, nflContractsOf, nflDecideFifthYearOption, nflDeskAfterWeek, nflDeskEdges, nflDeskOffseason,
  nflDeskWeekOptions, nflFifthYearCases, nflNoteArrivals, nflSignDraftee, openNflDesk,
} from '@/lib/nflGmDesk';
import { nflMarkRookies } from '@/lib/nflSeasonStats';

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const teamId = 'SEA';

function fenwickRecap() {
  const rng = seeded(904);
  const league = initLeague(rng);
  let desk = openNflDesk(league, teamId);
  const club = league.teams[teamId];
  const prospect = generateDraftClass(seeded(22), 40, leagueNames(league))[0];
  const round = club.picks[0];
  expect(round).toBe(1);
  expect(consumeDraftPick(club)).toBe(true);
  const player = prospectToPlayer(prospect, seeded(412))!;
  nflSignDraftee(player);
  club.players.push(player);
  nflMarkRookies(league, [{ team: teamId, playerName: player.name }], league.season + 1);
  desk = nflNoteArrivals(desk, league, teamId, [player.id], 'draft', round);
  expect(player).toMatchObject({ name: 'DeShawn Fenwick', years: 4, salary: 8.8 });

  for (let year = 1; year <= 3; year++) {
    const summer = nflDeskOffseason(league, desk, teamId, rng);
    expect(summer.ok).toBe(true);
    desk = summer.desk;
    expect(player.years).toBe(5 - year);
    for (let week = 1; week <= REGULAR_WEEKS; week++) {
      league.week = week;
      const options = nflDeskWeekOptions(desk, league, teamId);
      withPracticeElevations(league, teamId, () => {
        injuryPass(league.teams, rng, options.weeksFor);
        aiWeeklyMoves(league, teamId, rng);
        league.schedule[week - 1] = league.schedule[week - 1].map(game => simGame(game, league.teams, rng, options.edges));
      });
      reviewNflWeekRatings(league, teamId);
      desk = nflDeskAfterWeek(desk, league, teamId).desk;
    }
    const { champion } = runPlayoffs(league.teams, rng, nflDeskEdges(desk, league, teamId));
    league.champions.push({ season: league.season, team: champion });
  }
  return { league, desk, playerId: player.id };
}

describe('NFL fifth-year option', () => {
  let recap: ReturnType<typeof fenwickRecap>;
  beforeAll(() => { recap = fenwickRecap(); });

  it('opens in the third-season recap and holds the original fourth-year salary before activating the locked fifth year', () => {
    const { league, desk, playerId } = structuredClone(recap);
    const club = league.teams[teamId];
    const player = club.players.find(p => p.id === playerId)!;
    const ledger = nflContractsOf(desk, league, teamId);
    expect(league.season - player.rookieSeason!).toBe(2);
    expect(nflFifthYearCases(league, ledger, false)).toHaveLength(0);
    expect(nflDecideFifthYearOption(league, ledger, playerId, true, false)).toBe(false);
    const option = nflFifthYearCases(league, ledger, true).find(c => c.player.id === playerId);
    expect(option?.salary).toBe(13.3);
    const used = capUsed(club);
    expect(nflDecideFifthYearOption(league, ledger, playerId, true, true)).toBe(true);
    expect(nflDecideFifthYearOption(league, ledger, playerId, false, true)).toBe(false);
    expect(player).toMatchObject({ salary: 8.8, years: 2, guaranteed: true });
    expect(capUsed(club)).toBe(used);

    const resumed: typeof league = JSON.parse(JSON.stringify(league));
    const away = nflAwayHost(teamId);
    const fourth = away.awaySummer(resumed, seeded(1), desk);
    if (!fourth) throw new Error('Expected the away summer to return the GM desk');
    const current = resumed.teams[teamId].players.find(p => p.id === playerId)!;
    expect(current).toMatchObject({ salary: 8.8, years: 1, guaranteed: true });
    expect(tagRefusal(resumed, resumed.teams[teamId], playerId)).toMatch(/under contract/);
    expect(deskCases(nflContractHost, resumed, nflContractsOf(fourth, resumed, teamId)).some(c => c.man.id === playerId)).toBe(false);
    current.ovr = 99;
    away.awaySummer(resumed, seeded(2), fourth);
    expect(current).toMatchObject({ salary: 13.3, years: 1, guaranteed: true });
    expect(tagRefusal(resumed, resumed.teams[teamId], playerId)).toBeNull();
  });

  it('remembers a decline while the fourth year plays and presents the usual expiring case', () => {
    const { league, desk, playerId } = structuredClone(recap);
    const ledger = nflContractsOf(desk, league, teamId);
    expect(nflDecideFifthYearOption(league, ledger, playerId, false, true)).toBe(true);
    expect(nflDecideFifthYearOption(league, ledger, playerId, true, true)).toBe(false);
    expect(nflDeskOffseason(league, desk, teamId, seeded(3)).ok).toBe(true);
    const yearFour = deskCases(nflContractHost, league, ledger).find(c => c.man.id === playerId);
    expect(yearFour?.man).toMatchObject({ salary: 8.8, years: 1 });
    expect(yearFour?.man.guaranteed).toBeUndefined();
    expect(yearFour?.option).toBeUndefined();
  });

  it('charges the original fourth year and locked fifth year to the releasing club', () => {
    const { league, desk, playerId } = structuredClone(recap);
    const club = league.teams[teamId];
    expect(nflDecideFifthYearOption(league, nflContractsOf(desk, league, teamId), playerId, true, true)).toBe(true);
    runOffseason(league, seeded(4), teamId);
    expect(deadMoneyFor(club.players.find(p => p.id === playerId)!)).toEqual({ now: 8.8, next: 13.3 });
    const used = capUsed(club);
    expect(releasePlayer(club, league.freeAgents, playerId)).toBe(true);
    expect(capUsed(club)).toBe(used);
    const freeAgent = league.freeAgents.find(p => p.id === playerId)!;
    expect(freeAgent.guaranteed).toBeUndefined();
    expect(freeAgent.fifthYearOption).toBeUndefined();
    runOffseason(league, seeded(5), teamId);
    expect(club.deadCap?.find(entry => entry.playerId === playerId)).toMatchObject({ amount: 13.3, seasonsLeft: 1 });
    runOffseason(league, seeded(6), teamId);
    expect(club.deadCap?.some(entry => entry.playerId === playerId)).toBe(false);
  });

  it('moves the remaining guarantees to the acquiring team and keeps the fourth salary in place', () => {
    const { league, desk, playerId } = structuredClone(recap);
    const club = league.teams[teamId];
    const acquiring = league.teams.MIA;
    expect(nflDecideFifthYearOption(league, nflContractsOf(desk, league, teamId), playerId, true, true)).toBe(true);
    expect(nflDeskOffseason(league, desk, teamId, seeded(9)).ok).toBe(true);
    expect(executeTalksTrade(club, acquiring, playerId, acquiring.players[0].id, false, league.cap)).toBe('done');
    expect(nflApplyTradeDeadMoney(league, [{ club: teamId, playerId }])).toEqual([]);
    expect(club.players.some(p => p.id === playerId)).toBe(false);
    const moved = acquiring.players.find(p => p.id === playerId)!;
    expect(moved).toMatchObject({ salary: 8.8, years: 1, guaranteed: true });
    runOffseason(league, seeded(10), 'MIA');
    expect(moved).toMatchObject({ salary: 13.3, years: 1, guaranteed: true });
  });

  it('keeps both future guaranteed charges when a player is released before the fourth year starts', () => {
    const { league, desk, playerId } = structuredClone(recap);
    const club = league.teams[teamId];
    expect(nflDecideFifthYearOption(league, nflContractsOf(desk, league, teamId), playerId, true, true)).toBe(true);
    expect(releasePlayer(club, league.freeAgents, playerId)).toBe(true);
    runOffseason(league, seeded(11), teamId);
    expect(club.deadCap?.find(entry => entry.playerId === playerId)).toMatchObject({ amount: 8.8, seasonsLeft: 2 });
    runOffseason(league, seeded(12), teamId);
    expect(club.deadCap?.find(entry => entry.playerId === playerId)).toMatchObject({ amount: 13.3, seasonsLeft: 1 });
  });

  it('honors the original late offer and its accepted salary in an older fourth-season save', () => {
    const { league, desk, playerId } = structuredClone(recap);
    // A #997 save already in the draft finishes that draft without revisiting the recap.
    const paused = nflDeskOffseason(league, desk, teamId, seeded(7));
    expect(paused.ok).toBe(true);
    const ledger = nflContractsOf(paused.desk, league, teamId);
    const legacy = deskCases(nflContractHost, league, ledger).find(c => c.man.id === playerId)!;
    expect(legacy.option?.salary).toBe(13.3);
    expect(useOption(ledger, league, legacy).ok).toBe(true);
    legacy.man.ovr = 99;
    expect(nflDeskOffseason(league, paused.desk, teamId, seeded(8)).ok).toBe(true);
    expect(legacy.man).toMatchObject({ salary: 13.3, years: 1, guaranteed: true });
  });
});
