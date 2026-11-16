import { describe, expect, it } from 'vitest';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import {
  activateFromInjuredReserve, capRoom, capUsed, deepOverLimit, deepRosterRefusal, executeTalksTrade,
  initLeague, injuredReserveActivationRefusal, injuredReserveEntry, injuredReserveMissedGames, injuryPass,
  nflActiveRoster, placeOnInjuredReserve, practicePromotionRefusal, promoteFromPractice, proposeTrade,
  releasePlayer, runOffseason, setDepthOrder, simGame, starterIds, unitStarters, validNflInjuredReserve, type LeagueState,
} from '@/lib/frontOffice';
import { keyedRng } from '@/lib/keyedRng';
import { nflPackageCapCheck } from '@/lib/nflGmDesk';
import type { TradePackage } from '@/lib/gmTradePackage';

const teamId = 'DET';

function play(league: LeagueState, rng: () => number, club = teamId) {
  const games = league.schedule[league.week - 1];
  const index = games.findIndex(game => game.home === club || game.away === club);
  expect(index).toBeGreaterThanOrEqual(0);
  games[index] = simGame(games[index], league.teams, rng);
  league.week++;
}

function injuredDetroit() {
  const league = initLeague(keyedRng('nfl-ir-stage-1'), { depth: FO_DEPTH });
  const team = league.teams[teamId];
  const goff = unitStarters(team, ['QB'], 1)[0];
  const replacement = team.practice!.find(player => player.name === 'Luke Altmyer')!;
  const rng = keyedRng('nfl-ir-week-pair');
  const injuredDraw = team.players.slice(0, team.players.indexOf(goff)).filter(player => player.out === 0).length;
  let draws = 0;
  const news = injuryPass({ DET: team }, () => {
    const draw = draws++;
    return draw === injuredDraw ? 0.001 : draw === injuredDraw + 1 ? 0.99 : 0.5;
  });
  expect(goff.name).toBe('Jared Goff');
  expect(news).toEqual([{ team: teamId, player: goff.name, weeks: 4 }]);
  expect(team.players).toHaveLength(53);
  expect(capUsed(team)).toBe(237.9);
  expect(capRoom(team, league.cap)).toBe(63.3);
  play(league, rng);
  return { league, team, goff, replacement, rng };
}

describe('NFL Front Office Reserve/Injured', () => {
  it('frees one active slot for a real call-up while preserving the original contract and full cap charge', () => {
    const { league, team, goff, replacement } = injuredDetroit();
    expect(practicePromotionRefusal(team, replacement.id, league.cap)).toMatch(/Roster full at 53/);
    const owned = team.players;
    const contract = { ...goff };
    expect(placeOnInjuredReserve(league, teamId, goff.id)).toBe(true);
    expect(team.players).toBe(owned);
    expect(team.players.find(player => player.id === goff.id)).toEqual(contract);
    expect(capUsed(team)).toBe(237.9);
    expect(team.deadCap).toBeUndefined();
    expect(team.releasedThisSeason).toBeUndefined();
    expect(nflActiveRoster(team)).toHaveLength(52);
    expect(deepOverLimit(team)).toBe(0);
    expect(deepRosterRefusal(team)).toBeNull();
    const tradeTarget = league.teams.CHI.players.find(player => player.salary < 5)!;
    const packageIn: TradePackage = { from: teamId, to: 'CHI', give: [], get: [{ kind: 'player', id: tradeTarget.id }] };
    expect(nflPackageCapCheck(league, packageIn)).toBeNull();
    const reserved = JSON.stringify(league);
    expect(placeOnInjuredReserve(league, teamId, goff.id)).toBe(false);
    expect(JSON.stringify(league)).toBe(reserved);
    expect(promoteFromPractice(team, replacement.id, league.cap)).toBe(true);
    expect(team.players).toHaveLength(54);
    expect(nflActiveRoster(team)).toHaveLength(53);
    expect(nflPackageCapCheck(league, packageIn)).toMatch(/no room/);
    expect(team.players.find(player => player.id === replacement.id)).toBe(replacement);
    expect(capUsed(team)).toBe(239.4);
    expect(validNflInjuredReserve(JSON.parse(JSON.stringify(league)))).toBe(true);
  });

  it('holds a healthy reserved starter until four settled club games, and returns him when a spot opens', () => {
    const { league, team, goff, replacement, rng } = injuredDetroit();
    expect(placeOnInjuredReserve(league, teamId, goff.id)).toBe(true);
    expect(promoteFromPractice(team, replacement.id, league.cap)).toBe(true);
    const backup = team.players.find(player => player.pos === 'QB' && player.id !== goff.id && player.id !== replacement.id)!;
    const depth = [goff.id, replacement.id, backup.id];
    expect(setDepthOrder(team, 'QB', depth)).toBe(true);
    const entry = injuredReserveEntry(team, goff.id)!;
    for (let count = 0; count < 3; count++) {
      injuryPass({ DET: team }, () => 0.5);
      play(league, rng);
    }
    injuryPass({ DET: team }, () => 0.5);
    expect(goff.out).toBe(0);
    expect(starterIds(team)).not.toContain(goff.id);
    expect(unitStarters(team, ['QB'], 1)[0]).toBe(replacement);
    expect(injuredReserveMissedGames(league, teamId, entry)).toBe(3);
    const advancedCalendar = { ...league, week: league.week + 1 };
    expect(injuredReserveActivationRefusal(advancedCalendar, team, goff.id)).toMatch(/four settled/);
    expect(activateFromInjuredReserve(advancedCalendar, teamId, goff.id)).toBe(false);
    play(league, rng);
    expect(injuredReserveMissedGames(league, teamId, entry)).toBe(4);
    expect(injuredReserveActivationRefusal(league, team, goff.id)).toMatch(/Roster full at 53/);
    expect(activateFromInjuredReserve(league, teamId, goff.id)).toBe(false);

    const restored = JSON.parse(JSON.stringify(league)) as LeagueState;
    expect(validNflInjuredReserve(restored)).toBe(true);
    const restoredTeam = restored.teams[teamId];
    const reserve = restoredTeam.players.find(player => player.id === goff.id)!;
    expect(restoredTeam.depth?.QB).toEqual(depth);
    const spare = restoredTeam.players.find(player => player.pos !== 'QB' && !starterIds(restoredTeam).has(player.id))!;
    expect(releasePlayer(restoredTeam, restored.freeAgents, spare.id)).toBe(true);
    const cap = capUsed(restoredTeam);
    expect(activateFromInjuredReserve(restored, teamId, reserve.id)).toBe(true);
    expect(capUsed(restoredTeam)).toBe(cap);
    expect(restoredTeam.players.find(player => player.id === reserve.id)).toBe(reserve);
    expect(unitStarters(restoredTeam, ['QB'], 1)[0]).toBe(reserve);
    expect(injuredReserveEntry(restoredTeam, goff.id)).toBeUndefined();
    expect(activateFromInjuredReserve(restored, teamId, goff.id)).toBe(false);
    expect(validNflInjuredReserve(restored)).toBe(true);
  });

  it('keeps reserve rights through refusals and clears placement when the next season actually starts', () => {
    const { league, team, goff } = injuredDetroit();
    const rival = league.teams.CHI;
    const healthy = team.players.find(player => player.out === 0)!;
    expect(placeOnInjuredReserve(league, teamId, healthy.id)).toBe(false);
    expect(placeOnInjuredReserve(league, teamId, rival.players[0].id)).toBe(false);
    expect(placeOnInjuredReserve(league, teamId, goff.id)).toBe(true);
    const saved = JSON.stringify(league);
    expect(releasePlayer(team, league.freeAgents, goff.id)).toBe(false);
    expect(proposeTrade(team, rival, goff.id, rival.players[0].id, false, league.cap)).toBe('invalid');
    expect(executeTalksTrade(team, rival, goff.id, rival.players[0].id, false, league.cap)).toBe('invalid');
    expect(nflPackageCapCheck(league, { from: teamId, to: 'CHI', give: [{ kind: 'player', id: goff.id }], get: [] }))
      .toMatch(/activate the player from injured reserve/);
    expect(JSON.stringify(league)).toBe(saved);
    const forged = JSON.parse(saved) as LeagueState;
    forged.teams[teamId].injuredReserve![0].playerId = rival.players[0].id;
    expect(validNflInjuredReserve(forged)).toBe(false);
    const nextContract = goff.years - 1;
    runOffseason(league, keyedRng('nfl-ir-rollover'), teamId);
    expect(team.injuredReserve).toBeUndefined();
    expect(team.players.find(player => player.id === goff.id)?.years).toBe(nextContract);
    expect(validNflInjuredReserve(league)).toBe(true);
  });

  it('spends at most eight club returns during a regular season', () => {
    const { league, team, goff, rng } = injuredDetroit();
    const players = [goff, ...team.players.filter(player => player.id !== goff.id).slice(0, 8)];
    for (const player of players) {
      player.out = 4;
      expect(placeOnInjuredReserve(league, teamId, player.id)).toBe(true);
    }
    for (let count = 0; count < 4; count++) {
      injuryPass({ DET: team }, () => 0.5);
      play(league, rng);
    }
    for (const player of players.slice(0, 8)) expect(activateFromInjuredReserve(league, teamId, player.id)).toBe(true);
    const last = players[8];
    expect(injuredReserveActivationRefusal(league, team, last.id)).toMatch(/eight injury returns/);
    expect(activateFromInjuredReserve(league, teamId, last.id)).toBe(false);
    expect(nflActiveRoster(team)).toHaveLength(52);
    expect(validNflInjuredReserve(league)).toBe(true);
  });

  it('limits a player to two regular-season returns after a trade to a different club', () => {
    const { league, team, goff, rng } = injuredDetroit();
    for (let designation = 0; designation < 2; designation++) {
      goff.out = 4;
      expect(placeOnInjuredReserve(league, teamId, goff.id)).toBe(true);
      for (let count = 0; count < 4; count++) {
        injuryPass({ DET: team }, () => 0.5);
        play(league, rng);
      }
      expect(activateFromInjuredReserve(league, teamId, goff.id)).toBe(true);
      play(league, rng);
    }
    const partner = Object.values(league.teams)
      .find(club => club.abbr !== teamId && capRoom(club, league.cap) >= goff.salary)!;
    const incoming = partner.players.find(player => player.salary <= capRoom(team, league.cap))!;
    expect(executeTalksTrade(team, partner, goff.id, incoming.id, false, league.cap)).toBe('done');
    expect(partner.players.find(player => player.id === goff.id)).toBe(goff);
    goff.out = 4;
    expect(placeOnInjuredReserve(league, partner.abbr, goff.id)).toBe(true);
    for (let count = 0; count < 4; count++) {
      injuryPass({ [partner.abbr]: partner }, () => 0.5);
      play(league, rng, partner.abbr);
    }
    expect(league.week).toBe(16);
    expect(injuredReserveActivationRefusal(league, partner, goff.id)).toMatch(/used both injury returns/);
    expect(activateFromInjuredReserve(league, partner.abbr, goff.id)).toBe(false);
    expect(validNflInjuredReserve(league)).toBe(true);
    const forged = JSON.parse(JSON.stringify(league)) as LeagueState;
    forged.teams[partner.abbr].injuredReserve![0].returnedWeek = league.week;
    expect(validNflInjuredReserve(forged)).toBe(false);
  });
});
