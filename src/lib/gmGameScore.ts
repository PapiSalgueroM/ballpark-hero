/* Round 1224: a score for a game an engine has already decided.

   The four front offices decide who won with one draw and then make a score
   up. This file is the QUICK PATH of Game Day: it asks a sport's score law
   (src/lib/gameLaws/types.ts, the NFL's is src/lib/gameLaws/nflScore.ts) for
   a final that agrees with the engine's winner, and nothing else. The story
   of that final (src/lib/gmGameDay.ts) is the TOLD PATH and is only needed by
   whoever draws a card, so it lives apart and this file can sit in a board's
   own chunk: it imports the keyed stream and types, nothing more. The one
   save field of Game Day (`GmLastGame`, at the foot of this file) is here
   for the same reason: the press writes it and the save validator reads it.

   THE ENGINE DECIDES, THE LAW TELLS. The winner is never moved. Every draw
   comes from a stream keyed to the game (src/lib/keyedRng.ts), so no engine
   generator and no Math.random moves, the same key always tells the same
   final, and nothing has to be stored to tell it again.

   FAILS CLOSED: a law that throws, that hands back something that is not
   two whole scores, or a level game on its first try and no winner in the
   tries after it, gets null, and the caller keeps the engine's own score.

   THE CEILING. A score is a whole number from 0 to GM_SCORE_CEILING, here
   and in everything that reads one off a save (src/lib/gmGameDay.ts,
   src/lib/gmBracket.ts). A story law's work grows with the score it is
   handed, so one damaged number in a save must never reach a law: with no
   ceiling a saved 250000 threw out of the NFL's story law and a saved 1e21
   never came back at all. */
import { keyedRng } from './keyedRng';
import type { DecidedGame, ScoreLaw } from './gameLaws/types';

/** How many times the law is asked for a final the engine's winner wins. */
export const SCORE_TRIES = 24;

/** THIS SIM'S OWN: no side of a front office game is ever on four figures (see THE CEILING above). */
export const GM_SCORE_CEILING = 999;

/** A score a game can have: a whole number from 0 to the ceiling. */
export const isGmScore = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= GM_SCORE_CEILING;

/** A final told by a law. `tries`: how many it took; `swapped`: no try gave
 *  the winner, so the first try's two scores were handed to the winner's side. */
export interface ToldScore { home: number; away: number; tries: number; swapped: boolean }

/** A game an engine has decided, as Game Day is handed it. `key` names the
 *  game for good (the season, where in it, the two clubs and whatever else
 *  the caller has that two saves would not share). */
export interface GameDayFixture { key: string; home: string; away: string; decided: DecidedGame }

/** A final that has been told: the fixture's key and clubs with the law's
 *  score. `beyond`: the engine said this game went past regulation
 *  (`DecidedGame.beyond`). It is carried here, and into the save field, so
 *  the story of the game can be told that way after a reload too: the final
 *  alone cannot say it (a one goal game ends in sixty minutes or in the
 *  extra period). Absent on every other game, so a sport whose engine draws
 *  no such thing saves what it saved before. */
export interface ToldGame { key: string; home: string; away: string; homeScore: number; awayScore: number; beyond?: boolean }

/** The law's score for a game whose winner is already known: the law's own
 *  score GIVEN that this side won, which is what makes an upset read like an
 *  upset and not like the favourite's score with the names swapped. Try t
 *  draws from the stream `${key}|score|${t}` and is kept when it is not level
 *  and its higher side is the engine's winner. Null: the law refused. */
export function decidedScore(law: ScoreLaw, d: DecidedGame, key: string): ToldScore | null {
  if (!d || typeof d.pHome !== 'number' || !Number.isFinite(d.pHome) || typeof d.homeWon !== 'boolean') return null;
  try {
    let first: [number, number] | null = null;
    for (let t = 0; t < SCORE_TRIES; t += 1) {
      const s = law.score(d.pHome, keyedRng(`${key}|score|${t}`), d);
      const ok = Array.isArray(s) && isGmScore(s[0]) && isGmScore(s[1]);
      if (t === 0) first = ok ? [s[0], s[1]] : null;
      if (!ok || s[0] === s[1]) continue;
      if ((s[0] > s[1]) === d.homeWon) return { home: s[0], away: s[1], tries: t + 1, swapped: false };
    }
    if (!first || first[0] === first[1]) return null;
    const hi = Math.max(first[0], first[1]);
    const lo = Math.min(first[0], first[1]);
    return { home: d.homeWon ? hi : lo, away: d.homeWon ? lo : hi, tries: SCORE_TRIES, swapped: true };
  } catch {
    /* a law that throws has refused: a press handler keeps the engine's score, it does not crash */
    return null;
  }
}

/** THE QUICK PATH: the final of a decided fixture and nothing else. Null when
 *  the law refuses or the fixture does not read as one. */
export function quickGame(law: ScoreLaw, f: GameDayFixture): ToldGame | null {
  if (!f || typeof f.key !== 'string' || f.key === '' || typeof f.home !== 'string' || typeof f.away !== 'string' || f.home === f.away) return null;
  const s = decidedScore(law, f.decided, f.key);
  return s ? { key: f.key, home: f.home, away: f.away, homeScore: s.home, awayScore: s.away, ...(f.decided.beyond === true ? { beyond: true } : {}) } : null;
}

/** Who won a told final: the club on the higher score, or null for a level one. */
export function toldWinner(g: ToldGame): string | null {
  return g.homeScore === g.awayScore ? null : g.homeScore > g.awayScore ? g.home : g.away;
}

/** THE SAVE FIELD: the one shape all four boards save for Game Day, the GM
 *  club's last told game. It is optional, absent on a bye and on every older
 *  save, and `readGmLastGame` answers null for anything that does not read
 *  as one (mark, never fill). It lives in this file and not beside the
 *  story because a press writes it and a save validator reads it, both in
 *  the board's own chunk, and a module is never split across chunks. */
export interface GmLastGame extends ToldGame { v: 1; where: string; winner: string }

/** What a board saves after a press. `where` says when it was played, in the bind's own words ("w6", a round's name). */
export function makeGmLastGame(told: ToldGame, where: string): GmLastGame | null {
  const winner = toldWinner(told);
  return winner === null ? null : { v: 1, key: told.key, where, home: told.home, away: told.away, homeScore: told.homeScore, awayScore: told.awayScore, winner, ...(told.beyond === true ? { beyond: true } : {}) };
}

/** A saved last game, or null for anything that does not read as one. Never
 *  throws; hands back a fresh object of the known fields only (`beyond` is
 *  one of them, kept when it is true). `isClub` must be a real membership
 *  test (a Set, or Object.hasOwn): a bare object lookup such as
 *  `id => !!teams[id]` says yes to `constructor`. */
export function readGmLastGame(value: unknown, isClub: (id: string) => boolean): GmLastGame | null {
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const o = value as Record<string, unknown>;
    const text = (x: unknown): x is string => typeof x === 'string' && x !== '';
    if (o.v !== 1 || !text(o.key) || !text(o.where) || !text(o.home) || !text(o.away) || !text(o.winner)) return null;
    if (o.home === o.away || isClub(o.home) !== true || isClub(o.away) !== true) return null;
    if (!isGmScore(o.homeScore) || !isGmScore(o.awayScore) || o.homeScore === o.awayScore) return null;
    if (o.winner !== (o.homeScore > o.awayScore ? o.home : o.away)) return null;
    if (o.beyond !== undefined && typeof o.beyond !== 'boolean') return null;
    return { v: 1, key: o.key, where: o.where, home: o.home, away: o.away, homeScore: o.homeScore, awayScore: o.awayScore, winner: o.winner, ...(o.beyond === true ? { beyond: true } : {}) };
  } catch {
    return null;
  }
}
