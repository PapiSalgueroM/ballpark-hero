/* Round 1224: the quick path of Game Day (src/lib/gmGameScore.ts).

   The NFL's law never returns a level game, so the fail closed branches can
   only be reached with a law written for the test: one that is level on its
   first try, one that never gives the engine's winner, one that gives it on
   its fourth try, and ones that hand back something that is not a score. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GM_SCORE_CEILING, SCORE_TRIES, decidedScore, isGmScore, quickGame, toldWinner } from '@/lib/gmGameScore';
import { NFL_SCORE_LAW } from '@/lib/gameLaws/nflScore';
import type { DecidedGame, ScoreLaw } from '@/lib/gameLaws/types';

/** A law that answers from a list, one entry a call (the last entry repeats). */
const scripted = (answers: unknown[]): ScoreLaw & { calls: number; seen: (DecidedGame | undefined)[] } => {
  const law = {
    id: 'scripted', calls: 0, seen: [] as (DecidedGame | undefined)[],
    score: (_p: number, rng: () => number, d?: DecidedGame) => {
      rng();
      law.seen.push(d);
      const a = answers[Math.min(law.calls, answers.length - 1)];
      law.calls += 1;
      return a as [number, number];
    },
  };
  return law;
};
const home: DecidedGame = { homeWon: true, pHome: 0.5 };
const away: DecidedGame = { homeWon: false, pHome: 0.5 };

afterEach(() => { vi.restoreAllMocks(); });

describe('decidedScore, with laws written for the test', () => {
  it('keeps the first try that is not level and has the winner ahead', () => {
    const law = scripted([[10, 20], [10, 20], [10, 20], [27, 20]]);
    expect(decidedScore(law, home, 'k')).toEqual({ home: 27, away: 20, tries: 4, swapped: false });
    expect(law.calls).toBe(4);
  });

  it('walks past a level first try to a later one', () => {
    const law = scripted([[14, 14], [14, 14], [17, 21]]);
    expect(decidedScore(law, away, 'k')).toEqual({ home: 17, away: 21, tries: 3, swapped: false });
  });

  it('hands the first try to the winner after every try has missed, and says so', () => {
    const law = scripted([[31, 13], [24, 10]]);
    expect(decidedScore(law, away, 'k')).toEqual({ home: 13, away: 31, tries: SCORE_TRIES, swapped: true });
    expect(law.calls).toBe(SCORE_TRIES);
  });

  it('refuses a law that is level on its first try and never gives the winner', () => {
    expect(decidedScore(scripted([[14, 14]]), home, 'k')).toBeNull();
    expect(decidedScore(scripted([[14, 14], [3, 20]]), home, 'k')).toBeNull();
  });

  it('refuses whatever is not two whole scores, one damaged answer at a time', () => {
    /* the last three: a score above the ceiling is not a score */
    for (const bad of [null, undefined, 7, 'x', [], [7], [7.5, 3], [-1, 3], [Number.NaN, 3], [Number.POSITIVE_INFINITY, 3], ['7', 3], { 0: 7, 1: 3 }, [GM_SCORE_CEILING + 1, 3], [250000, 3], [3, 1e21]]) {
      expect(decidedScore(scripted([bad]), home, 'k'), JSON.stringify(bad) ?? String(bad)).toBeNull();
      /* a damaged first try does not stop a sound later one from being kept */
      expect(decidedScore(scripted([bad, [21, 20]]), home, 'k')).toEqual({ home: 21, away: 20, tries: 2, swapped: false });
      /* and a damaged LATER try is only a miss */
      expect(decidedScore(scripted([[3, 20], bad]), home, 'k')).toEqual({ home: 20, away: 3, tries: SCORE_TRIES, swapped: true });
    }
  });

  it('calls a whole number from 0 to the ceiling a score, and nothing else', () => {
    for (const ok of [0, 1, 69, GM_SCORE_CEILING]) expect(isGmScore(ok), String(ok)).toBe(true);
    for (const bad of [-1, 0.5, GM_SCORE_CEILING + 1, 250000, 1e21, Number.MAX_VALUE, Number.NaN, Number.POSITIVE_INFINITY, '7', null, undefined, [7]]) expect(isGmScore(bad), String(bad)).toBe(false);
    expect(decidedScore(scripted([[GM_SCORE_CEILING, 3]]), home, 'k')).toEqual({ home: GM_SCORE_CEILING, away: 3, tries: 1, swapped: false });
  });

  it('refuses a decided game that does not read as one, without asking the law', () => {
    for (const d of [null, undefined, {}, { homeWon: true }, { homeWon: true, pHome: Number.NaN }, { homeWon: 'yes', pHome: 0.5 }, { homeWon: true, pHome: '0.5' }]) {
      const law = scripted([[21, 20]]);
      expect(decidedScore(law, d as unknown as DecidedGame, 'k')).toBeNull();
      expect(law.calls).toBe(0);
    }
  });

  it('hands the law the decided game itself, so an engine that draws overtime can say so', () => {
    const law = scripted([[3, 2]]);
    const d: DecidedGame = { homeWon: true, pHome: 0.6, beyond: true };
    decidedScore(law, d, 'k');
    expect(law.seen[0]).toBe(d);
  });
});

describe('decidedScore, with the NFL law', () => {
  it('never names another winner, is never level, and takes no draw from Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    let swapped = 0;
    for (const pHome of [0.05, 0.2, 0.5, 0.8, 0.95]) {
      for (let i = 0; i < 400; i += 1) {
        const homeWon = i % 2 === 0;
        const s = decidedScore(NFL_SCORE_LAW, { homeWon, pHome }, `2026|w${1 + (i % 17)}|AAA|BBB|${i}-${pHome}`);
        expect(s).not.toBeNull();
        expect(s!.home).not.toBe(s!.away);
        expect(s!.home > s!.away).toBe(homeWon);
        if (s!.swapped) swapped += 1;
      }
    }
    expect(spy).not.toHaveBeenCalled();
    /* a swap needs 24 misses in a row: it is the rare way out, not the usual one */
    expect(swapped).toBeLessThan(400);
  });

  it('tells the same final for the same key, and another for another key', () => {
    const d: DecidedGame = { homeWon: true, pHome: 0.55 };
    const finals = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const a = decidedScore(NFL_SCORE_LAW, d, `2026|w3|AAA|BBB|${i}`);
      expect(decidedScore(NFL_SCORE_LAW, d, `2026|w3|AAA|BBB|${i}`)).toEqual(a);
      finals.add(`${a!.home}-${a!.away}`);
    }
    expect(finals.size).toBeGreaterThan(20);
  });
});

describe('quickGame and toldWinner', () => {
  it('carries the key and the clubs with the told final', () => {
    const g = quickGame(scripted([[20, 17]]), { key: 'k', home: 'AAA', away: 'BBB', decided: home });
    expect(g).toEqual({ key: 'k', home: 'AAA', away: 'BBB', homeScore: 20, awayScore: 17 });
    expect(toldWinner(g!)).toBe('AAA');
    expect(toldWinner({ ...g!, homeScore: 3, awayScore: 9 })).toBe('BBB');
    expect(toldWinner({ ...g!, homeScore: 9, awayScore: 9 })).toBeNull();
  });

  it('carries the mark of a game past regulation when the engine drew one, and no such key otherwise', () => {
    const sound = { key: 'k', home: 'AAA', away: 'BBB' };
    expect(quickGame(scripted([[3, 2]]), { ...sound, decided: { ...home, beyond: true } })).toEqual({ ...sound, homeScore: 3, awayScore: 2, beyond: true });
    expect('beyond' in quickGame(scripted([[3, 2]]), { ...sound, decided: { ...home, beyond: false } })!).toBe(false);
    expect('beyond' in quickGame(scripted([[3, 2]]), { ...sound, decided: home })!).toBe(false);
    expect('beyond' in quickGame(scripted([[3, 2]]), { ...sound, decided: { ...home, beyond: 'yes' as never } })!).toBe(false);
  });

  it('refuses a fixture that does not read as one, one damaged field at a time', () => {
    const sound = { key: 'k', home: 'AAA', away: 'BBB', decided: home };
    const law = scripted([[20, 17]]);
    for (const bad of [null, { ...sound, key: '' }, { ...sound, key: 7 }, { ...sound, home: 3 }, { ...sound, away: null }, { ...sound, away: 'AAA' }, { ...sound, decided: null }, { ...sound, decided: { homeWon: true } }]) {
      expect(quickGame(law, bad as never)).toBeNull();
    }
    expect(quickGame(scripted([[14, 14]]), sound)).toBeNull();
  });
});
