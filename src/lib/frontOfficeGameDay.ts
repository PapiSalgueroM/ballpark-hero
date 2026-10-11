/* Round 1305: the NFL front office's bind to Game Day's quick path.

   The engine (src/lib/frontOffice.ts, not edited) decides who wins a game
   with one draw and then makes a score up from two more: a base of 16 to
   30 and a margin of 1 to 17, so no side ever scored under 16 and nobody
   was ever shut out. This file asks the football score law
   (src/lib/gameLaws/nflScore.ts) for a final that agrees with the engine's
   winner, through src/lib/gmGameScore.ts.

   THE ENGINE DECIDES, THE LAW TELLS. `nflTell` never moves a winner, takes
   no draw from the engine's generator or from Math.random, reads no clock
   and touches no storage. The key of a game is the season, where in it,
   the two clubs and the ENGINE'S OWN score for it: a pure function of the
   draws the engine already spent, so the same game is told the same way
   for ever and two saves do not tell one fixture alike.

   THE CHANCE the law is given is the engine's own `winProb` with the same
   edges the game was played with. A game moves records, never strength
   (the injury pass and the computer clubs' moves run before a week's
   games), so the chance read after the game is the chance it was played at.

   FAILS CLOSED. A game the law refuses keeps the engine's own final and is
   still logged under the same key: it is a real result of this save.

   No React here and no story: the story of a final (src/lib/gmGameDay.ts,
   src/lib/gameLaws/nfl.ts) rides with whoever draws a card. */
import { winProb, type GmGame, type GmTeamState } from './frontOffice';
import { makeGmLastGame, quickGame, toldWinner, type GmLastGame, type ToldGame } from './gmGameScore';
import { NFL_SCORE_LAW } from './gameLaws/nflScore';

/** Where in a season a regular season game was played, in the words a key and a log entry use: "w6". */
export const nflWhere = (week: number): string => `w${week}`;

/** A log entry of the regular season (a playoff game's `where` is its round's name). */
export const nflIsRegular = (g: Pick<GmLastGame, 'where'>): boolean => /^w\d+$/.test(g.where);

/** The key of a game for good: the season, where, the two clubs and the engine's OWN score for it. */
export function nflGameKey(season: number, where: string, g: Pick<GmGame, 'home' | 'away' | 'homeScore' | 'awayScore'>): string {
  return `${season}|${where}|${g.home}|${g.away}|${g.homeScore}-${g.awayScore}`;
}

/** One finished game told by the law. `game` is g with the law's two scores
 *  (g itself when the law refuses); `last` is what the log keeps (null only
 *  for a game with no winner, which the engine never makes); `byLaw` says
 *  whether the law told it. `edges`: the strength points the game was
 *  played with, exactly as `simGame` was handed them. */
export function nflTell(
  g: GmGame, teams: Record<string, GmTeamState>, season: number, where: string, edges?: Record<string, number>,
): { game: GmGame; last: GmLastGame | null; byLaw: boolean } {
  const key = nflGameKey(season, where, g);
  let told: ToldGame | null = null;
  if (Object.hasOwn(teams, g.home) && Object.hasOwn(teams, g.away) && (g.winner === g.home || g.winner === g.away)) {
    const home = teams[g.home], away = teams[g.away];
    const pHome = edges ? winProb(home, away, edges[g.home] ?? 0, edges[g.away] ?? 0) : winProb(home, away);
    told = quickGame(NFL_SCORE_LAW, { key, home: g.home, away: g.away, decided: { homeWon: g.winner === g.home, pHome } });
    /* the winner is the engine's or the law has refused */
    if (told && toldWinner(told) !== g.winner) told = null;
  }
  if (told) return { game: { ...g, homeScore: told.homeScore, awayScore: told.awayScore }, last: makeGmLastGame(told, where), byLaw: true };
  return { game: g, last: makeGmLastGame({ key, home: g.home, away: g.away, homeScore: g.homeScore, awayScore: g.awayScore }, where), byLaw: false };
}
