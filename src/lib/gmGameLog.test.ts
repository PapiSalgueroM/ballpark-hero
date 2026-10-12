/**
 * Round 1305: the season's told games as a save field (src/lib/gmGameLog.ts).
 * The rules held here: the key is absent wherever there is nothing to hold,
 * the reader is all or nothing and never throws, and the record of the log
 * is counted by winner. scripts/simGmGameDay.mjs section 9 holds the same
 * rules over whole seasons of the real engine.
 */
import { describe, it, expect } from 'vitest';
import { GM_GAME_LOG_CAP, addToGmGameLog, gmLogRecord, lastGmGame, readGmGameLog, type GmGameLog } from '@/lib/gmGameLog';
import type { GmLastGame } from '@/lib/gmGameScore';

const CLUBS = new Set(['BUF', 'MIA', 'NE', 'NYJ']);
const isClub = (id: string) => CLUBS.has(id);
const game = (n: number, home: string, away: string, hs: number, as: number, extra: Partial<GmLastGame> = {}): GmLastGame =>
  ({ v: 1, key: `2026|w${n}|${home}|${away}|20-17`, where: `w${n}`, home, away, homeScore: hs, awayScore: as, winner: hs > as ? home : away, ...extra });
const G1 = game(1, 'BUF', 'MIA', 27, 20);
const G2 = game(2, 'NE', 'BUF', 24, 13);
const G3 = game(3, 'BUF', 'NYJ', 31, 3);
const through = <T,>(x: T): unknown => JSON.parse(JSON.stringify(x));

describe('addToGmGameLog', () => {
  it('holds nothing until a game is told: no empty log, ever', () => {
    expect(addToGmGameLog(null, 2026, [])).toBeNull();
    /* a bye in a season with nothing told yet, and the first press of a new season on a bye */
    expect(addToGmGameLog({ v: 1, season: 2025, games: [G1] }, 2026, [])).toBeNull();
  });

  it('starts a log, appends in order, and keeps a bye week as it was', () => {
    const a = addToGmGameLog(null, 2026, [G1])!;
    expect(a).toEqual({ v: 1, season: 2026, games: [G1] });
    const b = addToGmGameLog(a, 2026, [G2])!;
    expect(b.games).toEqual([G1, G2]);
    expect(addToGmGameLog(b, 2026, [])).toEqual(b);
    expect(addToGmGameLog(b, 2026, [G3])!.games.map(g => g.where)).toEqual(['w1', 'w2', 'w3']);
  });

  it('starts over in another season', () => {
    const old: GmGameLog = { v: 1, season: 2026, games: [G1, G2] };
    const next = addToGmGameLog(old, 2027, [{ ...G3, key: '2027|w1|BUF|NYJ|20-17', where: 'w1' }])!;
    expect(next.season).toBe(2027);
    expect(next.games).toHaveLength(1);
  });

  it('never mutates what it is handed', () => {
    const games = Object.freeze([Object.freeze({ ...G1 })]) as readonly GmLastGame[];
    const log = Object.freeze({ v: 1 as const, season: 2026, games: Object.freeze([Object.freeze({ ...G2 })]) as unknown as GmLastGame[] });
    const out = addToGmGameLog(log, 2026, games)!;
    expect(out).not.toBe(log);
    expect(out.games).not.toBe(log.games);
    expect(log.games).toHaveLength(1);
    expect(out.games).toHaveLength(2);
  });

  it('adds nothing past the cap', () => {
    const many = Array.from({ length: GM_GAME_LOG_CAP }, (_, i) => ({ ...G1, key: `k${i}` }));
    const full = addToGmGameLog(null, 2026, many)!;
    expect(full.games).toHaveLength(GM_GAME_LOG_CAP);
    expect(addToGmGameLog(full, 2026, [G2])).toEqual(full);
    expect(addToGmGameLog(null, 2026, [...many, G2])).toBeNull();
  });
});

describe('readGmGameLog', () => {
  const LOG: GmGameLog = { v: 1, season: 2026, games: [G1, G2, G3] };

  it('reads its own log back through JSON, as fresh objects', () => {
    const back = readGmGameLog(through(LOG), isClub, 2026, 'BUF')!;
    expect(back).toEqual(LOG);
    expect(back.games[0]).not.toBe(G1);
  });

  it('keeps the past regulation mark of an entry', () => {
    const beyond: GmGameLog = { v: 1, season: 2026, games: [{ ...G2, beyond: true }] };
    expect(readGmGameLog(through(beyond), isClub, 2026, 'BUF')).toEqual(beyond);
  });

  it('is all or nothing: one damaged field of one entry and the whole log is absent', () => {
    const fields: [string, unknown][] = [
      ['v', 2], ['key', ''], ['where', 7], ['home', 'XXX'], ['away', 'XXX'], ['homeScore', 1000], ['awayScore', -1], ['winner', 'MIA'], ['beyond', 'yes'],
    ];
    let tried = 0;
    for (const at of [0, 1, 2]) {
      for (const [field, bad] of fields) {
        const hurt = through(LOG) as { games: Record<string, unknown>[] };
        hurt.games[at][field] = bad;
        /* the loser named as the winner: a real club of the game, and still not the final's */
        if (field === 'winner') hurt.games[at][field] = LOG.games[at].winner === LOG.games[at].home ? LOG.games[at].away : LOG.games[at].home;
        expect(readGmGameLog(hurt, isClub, 2026, 'BUF'), `entry ${at}, ${field} damaged`).toBeNull();
        tried += 1;
        if (field === 'beyond') continue;
        const gone = through(LOG) as { games: Record<string, unknown>[] };
        delete gone.games[at][field];
        expect(readGmGameLog(gone, isClub, 2026, 'BUF'), `entry ${at}, ${field} missing`).toBeNull();
        tried += 1;
      }
    }
    expect(tried).toBe(3 * (9 + 8));
  });

  it('is absent for another season, an empty log, a log over the cap and anything that is not a log', () => {
    expect(readGmGameLog(through(LOG), isClub, 2027, 'BUF')).toBeNull();
    expect(readGmGameLog({ v: 1, season: 2026, games: [] }, isClub, 2026, 'BUF')).toBeNull();
    expect(readGmGameLog({ v: 1, season: 2026, games: Array.from({ length: GM_GAME_LOG_CAP + 1 }, (_, i) => ({ ...G1, key: `k${i}` })) }, isClub, 2026, 'BUF')).toBeNull();
    expect(readGmGameLog({ v: 2, season: 2026, games: [G1] }, isClub, 2026, 'BUF')).toBeNull();
    expect(readGmGameLog({ v: 1, season: '2026', games: [G1] }, isClub, 2026, 'BUF')).toBeNull();
    for (const junk of [null, undefined, 7, 'log', [], [G1], { games: [G1] }, { v: 1, season: 2026 }, { v: 1, season: 2026, games: 'no' }]) {
      expect(readGmGameLog(junk, isClub, 2026, 'BUF')).toBeNull();
    }
  });

  it('is absent when a game is not his club\'s, when a game is listed twice, and when his club is not of this league', () => {
    const stranger = game(2, 'NE', 'NYJ', 20, 17);
    expect(readGmGameLog(through({ v: 1, season: 2026, games: [G1, stranger] }), isClub, 2026, 'BUF')).toBeNull();
    expect(readGmGameLog(through({ v: 1, season: 2026, games: [G1, G1] }), isClub, 2026, 'BUF')).toBeNull();
    /* the log of the club he ran before: every game is a real game, and none of them is the new club's */
    expect(readGmGameLog(through(LOG), isClub, 2026, 'NYJ')).toBeNull();
    expect(readGmGameLog(through(LOG), isClub, 2026, 'constructor')).toBeNull();
  });

  it('never throws, whatever it is handed', () => {
    const angry = () => { throw new Error('no'); };
    expect(readGmGameLog(through(LOG), angry, 2026, 'BUF')).toBeNull();
    const trap = new Proxy({}, { get: () => { throw new Error('no'); } });
    expect(readGmGameLog(trap, isClub, 2026, 'BUF')).toBeNull();
  });
});

describe('lastGmGame and gmLogRecord', () => {
  const LOG: GmGameLog = { v: 1, season: 2026, games: [G1, G2, G3, game(4, 'MIA', 'BUF', 30, 27, { beyond: true }), { ...game(18, 'BUF', 'NE', 17, 20), where: 'AFC Wild Card' }] };

  it('the last game is the last entry, and there is none without a log', () => {
    expect(lastGmGame(LOG)!.where).toBe('AFC Wild Card');
    expect(lastGmGame(null)).toBeNull();
  });

  it('counts by winner, marks the losses past regulation, and can be narrowed', () => {
    expect(gmLogRecord(LOG, 'BUF')).toEqual({ won: 2, lost: 3, lostBeyond: 1 });
    expect(gmLogRecord(LOG, 'BUF', g => /^w\d+$/.test(g.where))).toEqual({ won: 2, lost: 2, lostBeyond: 1 });
    expect(gmLogRecord(null, 'BUF')).toEqual({ won: 0, lost: 0, lostBeyond: 0 });
    /* a club the log holds a game of counts only its own games */
    expect(gmLogRecord(LOG, 'NE')).toEqual({ won: 2, lost: 0, lostBeyond: 0 });
  });
});
