/* Round 1224: a score for a game an engine has already decided.

   The four front offices decide who won with one draw and then make a score
   up. This file is the QUICK PATH of Game Day: it asks a sport's score law
   (src/lib/gameLaws/types.ts, the NFL's is src/lib/gameLaws/nflScore.ts) for
   a final that agrees with the engine's winner, and nothing else. The story
   of that final (src/lib/gmGameDay.ts) is the TOLD PATH and is only needed by
   whoever draws a card, so it lives apart and this file can sit in a board's
   own chunk: it imports the keyed stream and types, nothing more.

   THE ENGINE DECIDES, THE LAW TELLS. The winner is never moved. Every draw
   comes from a stream keyed to the game (src/lib/keyedRng.ts), so no engine
   generator and no Math.random moves, the same key always tells the same
   final, and nothing has to be stored to tell it again.

   FAILS CLOSED: a law that hands back something that is not two whole
   scores, or a level game on its first try and no winner in the tries after
   it, gets null, and the caller keeps the engine's own score. */
import { keyedRng } from './keyedRng';
import type { DecidedGame, ScoreLaw } from './gameLaws/types';

/** How many times the law is asked for a final the engine's winner wins. */
export const SCORE_TRIES = 24;

/** A final told by a law. `tries`: how many it took; `swapped`: no try gave
 *  the winner, so the first try's two scores were handed to the winner's side. */
export interface ToldScore { home: number; away: number; tries: number; swapped: boolean }

/** A game an engine has decided, as Game Day is handed it. `key` names the
 *  game for good (the season, where in it, the two clubs and whatever else
 *  the caller has that two saves would not share). */
export interface GameDayFixture { key: string; home: string; away: string; decided: DecidedGame }

/** A final that has been told: the fixture's key and clubs with the law's score. */
export interface ToldGame { key: string; home: string; away: string; homeScore: number; awayScore: number }

const whole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

/** The law's score for a game whose winner is already known: the law's own
 *  score GIVEN that this side won, which is what makes an upset read like an
 *  upset and not like the favourite's score with the names swapped. Try t
 *  draws from the stream `${key}|score|${t}` and is kept when it is not level
 *  and its higher side is the engine's winner. Null: the law refused. */
export function decidedScore(law: ScoreLaw, d: DecidedGame, key: string): ToldScore | null {
  if (!d || typeof d.pHome !== 'number' || !Number.isFinite(d.pHome) || typeof d.homeWon !== 'boolean') return null;
  let first: [number, number] | null = null;
  for (let t = 0; t < SCORE_TRIES; t += 1) {
    const s = law.score(d.pHome, keyedRng(`${key}|score|${t}`), d);
    const ok = Array.isArray(s) && whole(s[0]) && whole(s[1]);
    if (t === 0) first = ok ? [s[0], s[1]] : null;
    if (!ok || s[0] === s[1]) continue;
    if ((s[0] > s[1]) === d.homeWon) return { home: s[0], away: s[1], tries: t + 1, swapped: false };
  }
  if (!first || first[0] === first[1]) return null;
  const hi = Math.max(first[0], first[1]);
  const lo = Math.min(first[0], first[1]);
  return { home: d.homeWon ? hi : lo, away: d.homeWon ? lo : hi, tries: SCORE_TRIES, swapped: true };
}

/** THE QUICK PATH: the final of a decided fixture and nothing else. Null when
 *  the law refuses or the fixture does not read as one. */
export function quickGame(law: ScoreLaw, f: GameDayFixture): ToldGame | null {
  if (!f || typeof f.key !== 'string' || f.key === '' || typeof f.home !== 'string' || typeof f.away !== 'string' || f.home === f.away) return null;
  const s = decidedScore(law, f.decided, f.key);
  return s ? { key: f.key, home: f.home, away: f.away, homeScore: s.home, awayScore: s.away } : null;
}

/** Who won a told final: the club on the higher score, or null for a level one. */
export function toldWinner(g: ToldGame): string | null {
  return g.homeScore === g.awayScore ? null : g.homeScore > g.awayScore ? g.home : g.away;
}
