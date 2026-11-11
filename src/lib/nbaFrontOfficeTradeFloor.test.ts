import { describe, expect, it } from 'vitest';
import { mulberry32 } from './leagueCore';
import {
  initNbaLeague, nbaExecuteTalksTrade, nbaRelease, nbaTrade, nbaTradeValue, NBA_ROSTER_MIN,
} from './nbaFrontOffice';

function clubsAtMinimum() {
  const league = initNbaLeague(mulberry32(82));
  const mine = league.teams.DEN;
  const theirs = league.teams.UTA;
  const outgoing = [...mine.players].sort((a, b) => nbaTradeValue(b) - nbaTradeValue(a))[0];
  const incoming = [...theirs.players].sort((a, b) => nbaTradeValue(a) - nbaTradeValue(b))[0];

  for (const [team, kept] of [[mine, outgoing], [theirs, incoming]] as const) {
    for (const player of team.players.filter(player => player.id !== kept.id)) {
      if (team.players.length <= NBA_ROSTER_MIN) break;
      expect(nbaRelease(team, league.freeAgents, player.id)).toBe(true);
    }
  }
  // Leave enough cap space to isolate the roster rule.
  return { league, mine, theirs, outgoing, incoming, cap: 1000 };
}

describe.each([
  { path: 'Trade Finder', trade: nbaTrade, result: 'accepted' },
  { path: 'Talks', trade: nbaExecuteTalksTrade, result: 'done' },
])('NBA $path roster floor', ({ trade, result }) => {
  it('allows a straight swap at the minimum for both clubs', () => {
    const { league, mine, theirs, outgoing, incoming, cap } = clubsAtMinimum();
    expect(mine.players).toHaveLength(NBA_ROSTER_MIN);
    expect(theirs.players).toHaveLength(NBA_ROSTER_MIN);
    expect(nbaRelease(mine, league.freeAgents, outgoing.id)).toBe(false);
    const before = structuredClone([mine, theirs]);

    expect(trade(mine, theirs, outgoing.id, incoming.id, false, cap)).toBe(result);

    expect(mine.players.map(player => player.id)).toEqual([
      ...before[0].players.filter(player => player.id !== outgoing.id).map(player => player.id), incoming.id,
    ]);
    expect(theirs.players.map(player => player.id)).toEqual([
      ...before[1].players.filter(player => player.id !== incoming.id).map(player => player.id), outgoing.id,
    ]);
    expect([mine.picks, theirs.picks]).toEqual(before.map(team => team.picks));
    expect([mine.deadCap, theirs.deadCap]).toEqual(before.map(team => team.deadCap));
  });

  it.each(['mine', 'theirs'] as const)('refuses a swap with the %s roster already short', side => {
    const { mine, theirs, outgoing, incoming, cap } = clubsAtMinimum();
    const short = side === 'mine' ? mine : theirs;
    const held = side === 'mine' ? outgoing : incoming;
    short.players.splice(short.players.findIndex(player => player.id !== held.id), 1);
    const before = structuredClone([mine, theirs]);

    expect(trade(mine, theirs, outgoing.id, incoming.id, false, cap)).toBe('invalid');
    expect([mine, theirs]).toEqual(before);
  });
});
