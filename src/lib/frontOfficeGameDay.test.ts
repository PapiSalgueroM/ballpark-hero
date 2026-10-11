/**
 * Round 1305: the NFL front office's bind to Game Day's quick path
 * (src/lib/frontOfficeGameDay.ts). The engine decides, the law tells: the
 * winner never moves, the key is a pure function of what the engine drew,
 * the chance is the engine's own with the edges the game was played with,
 * and a game the law refuses keeps the engine's final and is still logged.
 * scripts/simGmGameDay.mjs sections 7 to 9 hold the same over the fleet.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { initLeague, simGame, winProb, type GmGame, type LeagueState } from '@/lib/frontOffice';
import { nflGameKey, nflIsRegular, nflTell, nflWhere } from '@/lib/frontOfficeGameDay';
import { quickGame, readGmLastGame } from '@/lib/gmGameScore';
import { NFL_SCORE_LAW } from '@/lib/gameLaws/nflScore';

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Three weeks of a seeded league, every game as the engine made it. */
function played(): { lg: LeagueState; games: { g: GmGame; week: number }[] } {
  const rng = lehmer(1305);
  const lg = initLeague(rng);
  const games: { g: GmGame; week: number }[] = [];
  for (let w = 1; w <= 3; w += 1) { for (const g of lg.schedule[w - 1]) games.push({ g: simGame(g, lg.teams, rng), week: w }); lg.week += 1; }
  return { lg, games };
}

afterEach(() => { vi.doUnmock('@/lib/gameLaws/nflScore'); vi.resetModules(); });

describe('nflWhere, nflIsRegular and nflGameKey', () => {
  it('a week is "w6", and only a week is the regular season', () => {
    expect(nflWhere(6)).toBe('w6');
    expect(nflIsRegular({ where: 'w17' })).toBe(true);
    expect(nflIsRegular({ where: 'AFC Wild Card' })).toBe(false);
    expect(nflIsRegular({ where: 'Super Bowl' })).toBe(false);
  });

  it('the key is the season, where, the two clubs and the engine\'s own score, and nothing else', () => {
    const g = { week: 6, home: 'BUF', away: 'MIA', homeScore: 27, awayScore: 20, winner: 'BUF' };
    expect(nflGameKey(2026, 'w6', g)).toBe('2026|w6|BUF|MIA|27-20');
    expect(nflGameKey(2026, 'w6', { ...g, week: 99, winner: 'x' } as GmGame)).toBe('2026|w6|BUF|MIA|27-20');
    expect(nflGameKey(2027, 'w6', g)).not.toBe(nflGameKey(2026, 'w6', g));
    expect(nflGameKey(2026, 'AFC Wild Card', g)).not.toBe(nflGameKey(2026, 'w6', g));
    expect(nflGameKey(2026, 'w6', { ...g, homeScore: 28 })).not.toBe(nflGameKey(2026, 'w6', g));
  });
});

describe('nflTell', () => {
  it('tells the law\'s final for the engine\'s winner, at the engine\'s own chance, and nothing else of the game moves', () => {
    const { lg, games } = played();
    const isClub = (id: string) => Object.hasOwn(lg.teams, id);
    const before = JSON.stringify(lg);
    let differ = 0;
    for (const { g, week } of games) {
      const t = nflTell(g, lg.teams, lg.season, nflWhere(week));
      const key = nflGameKey(lg.season, nflWhere(week), g);
      const want = quickGame(NFL_SCORE_LAW, { key, home: g.home, away: g.away, decided: { homeWon: g.winner === g.home, pHome: winProb(lg.teams[g.home], lg.teams[g.away]) } })!;
      expect(t.byLaw).toBe(true);
      expect(t.game).toEqual({ ...g, homeScore: want.homeScore, awayScore: want.awayScore });
      expect(t.game.winner).toBe(g.winner);
      expect(t.game.homeScore > t.game.awayScore).toBe(g.winner === g.home);
      expect(t.last).toEqual({ v: 1, key, where: `w${week}`, home: g.home, away: g.away, homeScore: want.homeScore, awayScore: want.awayScore, winner: g.winner });
      expect(readGmLastGame(JSON.parse(JSON.stringify(t.last)), isClub)).toEqual(t.last);
      /* the same game is told the same way again */
      expect(nflTell(g, lg.teams, lg.season, nflWhere(week))).toEqual(t);
      if (t.game.homeScore !== g.homeScore || t.game.awayScore !== g.awayScore) differ += 1;
    }
    expect(games).toHaveLength(48);
    expect(differ).toBeGreaterThan(40);
    /* the league, the records and the engine's own games are untouched */
    expect(JSON.stringify(lg)).toBe(before);
  });

  it('reads the chance with the edges the game was played with', () => {
    const { lg, games } = played();
    const { g, week } = games[0];
    const edges = { [g.home]: -9, [g.away]: 9 };
    const key = nflGameKey(lg.season, nflWhere(week), g);
    const want = quickGame(NFL_SCORE_LAW, { key, home: g.home, away: g.away, decided: { homeWon: g.winner === g.home, pHome: winProb(lg.teams[g.home], lg.teams[g.away], -9, 9) } })!;
    const t = nflTell(g, lg.teams, lg.season, nflWhere(week), edges);
    expect([t.game.homeScore, t.game.awayScore]).toEqual([want.homeScore, want.awayScore]);
    /* a club the edges do not name plays on none, as simGame reads them */
    const none = nflTell(g, lg.teams, lg.season, nflWhere(week), {});
    expect(none).toEqual(nflTell(g, lg.teams, lg.season, nflWhere(week)));
  });

  it('a playoff game is keyed by its round and is not a regular season entry', () => {
    const { lg, games } = played();
    const { g } = games[5];
    const t = nflTell(g, lg.teams, lg.season, 'AFC Divisional');
    expect(t.last!.where).toBe('AFC Divisional');
    expect(t.last!.key).toBe(`${lg.season}|AFC Divisional|${g.home}|${g.away}|${g.homeScore}-${g.awayScore}`);
    expect(nflIsRegular(t.last!)).toBe(false);
  });

  it('a game with no winner, or with a club that is not of this league, is told by nobody', () => {
    const { lg, games } = played();
    const { g } = games[0];
    const level = nflTell({ ...g, homeScore: 20, awayScore: 20, winner: '' }, lg.teams, lg.season, 'w1');
    expect(level.byLaw).toBe(false);
    expect(level.last).toBeNull();
    const stranger = nflTell({ ...g, home: 'constructor', winner: 'constructor', homeScore: 30, awayScore: 3 }, lg.teams, lg.season, 'w1');
    expect(stranger.byLaw).toBe(false);
    expect(stranger.game.homeScore).toBe(30);
  });

  it('a game the law refuses keeps the engine\'s own final and is still logged, under the same key', async () => {
    vi.resetModules();
    /* a law that is level on every try: the quick path refuses it */
    vi.doMock('@/lib/gameLaws/nflScore', () => ({ NFL_SCORE_LAW: { id: 'level', score: () => [17, 17] } }));
    const fresh = await import('@/lib/frontOfficeGameDay');
    const { lg, games } = played();
    const { g, week } = games[0];
    const t = fresh.nflTell(g, lg.teams, lg.season, fresh.nflWhere(week));
    expect(t.byLaw).toBe(false);
    expect(t.game).toBe(g);
    expect(t.last).toEqual({ v: 1, key: fresh.nflGameKey(lg.season, `w${week}`, g), where: `w${week}`, home: g.home, away: g.away, homeScore: g.homeScore, awayScore: g.awayScore, winner: g.winner });
    /* and a law that throws is a refusal too, never a crash in a press */
    vi.resetModules();
    vi.doMock('@/lib/gameLaws/nflScore', () => ({ NFL_SCORE_LAW: { id: 'angry', score: () => { throw new Error('no'); } } }));
    const angry = await import('@/lib/frontOfficeGameDay');
    expect(angry.nflTell(g, lg.teams, lg.season, 'w1').byLaw).toBe(false);
  });
});
