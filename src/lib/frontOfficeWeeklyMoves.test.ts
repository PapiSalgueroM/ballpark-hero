import { expect, it } from 'vitest';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import {
  aiWeeklyMoves, capRoom, DEEP_ROSTER_MAX, depthOrder, initLeague, releasePlayer, signPlayer, STARTER_SLOTS,
  type GmPlayer, type LeagueState,
} from './frontOffice';
import { mulberry32 } from './leagueCore';

const USER = 'DAL';
const RIVAL = 'BAL';

function fixture(full = true) {
  const league = initLeague(mulberry32(1), full ? { depth: FO_DEPTH, userTeam: USER } : undefined);
  const club = league.teams[RIVAL];
  const [top] = [...league.freeAgents].sort((a, b) => b.ovr - a.ovr);
  const [receiver] = league.freeAgents.filter(p => p.pos === 'WR').sort((a, b) => b.ovr - a.ovr);
  return { league, club, top, receiver };
}

function playMoves(league: LeagueState) {
  const clubs = Object.keys(league.teams).filter(abbr => abbr !== USER);
  let draws = 0;
  const news = aiWeeklyMoves(league, USER, () => clubs[draws++] === RIVAL ? 0 : 0.99);
  expect(draws).toBe(clubs.length);
  return news;
}

const joined = (club: LeagueState['teams'][string], player: GmPlayer) => club.players.some(p => p.id === player.id);

it('uses the best legal starter upgrade when the top affordable player is not one', () => {
  const { league, club, top, receiver } = fixture();
  const starter = (pos: GmPlayer['pos']) => depthOrder(club, pos)[STARTER_SLOTS[pos] - 1];
  expect(club.players).toHaveLength(50);
  expect([top.pos, top.ovr, starter(top.pos).ovr]).toEqual(['OL', 81, 82]);
  expect([receiver.ovr, starter('WR').ovr]).toEqual([79, 75]);
  expect(capRoom(club, league.cap)).toBeGreaterThan(top.salary);

  expect(playMoves(league)).toEqual([`${RIVAL} sign ${receiver.name} (WR 79)`]);
  expect(club.players).toHaveLength(51);
  expect(joined(club, receiver)).toBe(true);
  expect(league.freeAgents).toContain(top);
  expect(league.freeAgents).not.toContain(receiver);
});

it('skips higher cap and cut refusals, then signs only the highest-rated eligible player', () => {
  const { league, club, receiver } = fixture();
  const [cut, expensive, lower] = league.freeAgents.filter(p => p.id !== receiver.id);
  Object.assign(cut, { pos: 'WR', ovr: 95, salary: 1 });
  expect(signPlayer(club, league.freeAgents, cut.id, league.cap)).toBe(true);
  expect(releasePlayer(club, league.freeAgents, cut.id)).toBe(true);
  Object.assign(expensive, { pos: 'WR', ovr: 99, salary: league.cap + 1 });
  Object.assign(lower, { pos: 'RB', ovr: 84, salary: 1 });
  Object.assign(receiver, { ovr: 90, salary: 2 });
  const rb = depthOrder(club, 'RB')[STARTER_SLOTS.RB - 1];
  expect(rb.ovr + 2).toBeLessThan(lower.ovr);

  expect(playMoves(league)).toEqual([`${RIVAL} sign ${receiver.name} (WR 90)`]);
  expect(club.players).toHaveLength(51);
  expect(joined(club, receiver)).toBe(true);
  for (const player of [cut, expensive, lower]) {
    expect(joined(club, player)).toBe(false);
    expect(league.freeAgents.some(p => p.id === player.id)).toBe(true);
  }
});

it('keeps a club at 53 and leaves the upgrade on the market', () => {
  const { league, club, receiver } = fixture();
  const extras = league.freeAgents.filter(p => p.id !== receiver.id && p.pos !== 'WR').slice(0, 3);
  for (const extra of extras) expect(signPlayer(club, league.freeAgents, extra.id, league.cap)).toBe(true);
  expect(club.players).toHaveLength(DEEP_ROSTER_MAX);

  expect(playMoves(league)).toEqual([]);
  expect(club.players).toHaveLength(DEEP_ROSTER_MAX);
  expect(league.freeAgents).toContain(receiver);
});

it.each([false, true])('keeps the old-size league on its single original candidate (blocked=%s)', blocked => {
  const { league, club, top, receiver } = fixture(false);
  if (blocked) top.pos = 'QB';
  const expected: LeagueState = JSON.parse(JSON.stringify(league));
  if (!blocked) expect(signPlayer(expected.teams[RIVAL], expected.freeAgents, top.id, expected.cap)).toBe(true);
  expect(club.players).toHaveLength(15);
  expect(playMoves(league)).toEqual(blocked ? [] : [`${RIVAL} sign ${top.name} (OL 81)`]);
  expect(league).toEqual(expected);
  expect(league.freeAgents).toContain(receiver);
});
