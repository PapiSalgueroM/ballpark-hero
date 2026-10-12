/* Round 1308: the NFL front office's bind to the postseason a board plays a
   round at a time. No React; nothing mounts it yet (Round 1309 puts it on the
   board).

   THE BRACKET PATH IS THE ONE PRESS PATH. `runPlayoffs` (src/lib/frontOffice.ts,
   not edited) plays every playoff game with `simGame` at week 0 and takes the
   win and the loss back off the two records, and the board then tells each
   game by the law under its round's name (FrontOfficeBoard.tsx, the one press
   branch of playWeek). `nflPlayTie` does exactly that to one game at a time:
   the engine's game, the take back, then `nflTell` with the round's name and
   the same edges, so the same game gets the same key, the same final and the
   same story on both paths. The data names its rounds as the engine does
   (src/data/gmBrackets/nfl.ts), and scripts/simGmGameDay.mjs sections 11 to 13
   hold the two paths equal over the fleet, game for game, draw for draw and
   key for key.

   THE SINK. A bracket keeps three numbers a game (`BracketGame`) and a log
   entry needs the key, which is built from the ENGINE'S own score for the
   game, a number the bracket never holds. So every told game is pushed into
   the caller's list, in play order, as the `GmLastGame` the log keeps; a board
   keeps his and nobody rebuilds a key from a told score.

   Nothing here draws but the engine's own game through the caller's
   generator; no clock, no storage. The words of the bracket's "?"
   (src/data/gmBrackets/nflHelp.ts) are never imported here: only a drawn card
   reads them. */
import { REGULAR_WEEKS, conferenceOf, conferenceSeeds, simGame, type GmTeamState, type LeagueState, type PlayoffRound } from './frontOffice';
import { nflTell } from './frontOfficeGameDay';
import { bracketRounds, type BracketFormat, type GmBracketSave, type PlayTie } from './gmBracket';
import type { GmLastGame } from './gmGameScore';
import type { GmPostseasonSport } from './gmPostseason';
import { nflBracketFor } from '../data/gmBrackets/nfl';

const hasClub = (lg: LeagueState) => (id: string): boolean => typeof id === 'string' && Object.prototype.hasOwnProperty.call(lg.teams, id);

/** The NFL's postseason: the data's bracket from 2020 on, the engine's own seeding (the AFC's seven, then
 *  the NFC's), and Week 18 as the bracket's period (src/lib/frontOffice.ts: "18 = playoffs"). */
export const NFL_POSTSEASON: GmPostseasonSport<LeagueState> = {
  formatFor: nflBracketFor,
  seeds: lg => [...conferenceSeeds(lg.teams, 'AFC'), ...conferenceSeeds(lg.teams, 'NFC')],
  seedsOk: (seeds, lg) => {
    try {
      const isClub = hasClub(lg);
      if (!Array.isArray(seeds) || seeds.length !== 14 || new Set(seeds).size !== 14 || !seeds.every(isClub)) return false;
      return seeds.every((id, i) => conferenceOf(id) === (i < 7 ? 'AFC' : 'NFC'));
    } catch {
      return false;
    }
  },
  isClub: hasClub,
  bracketPeriod: REGULAR_WEEKS + 1,
};

/** One playoff game as `runPlayoffs` plays it, told by the law. `told` is the sink: every game is pushed
 *  into it in play order as the log entry the one press path makes for it. `edges`: the desk's strength
 *  points, exactly as the one press path hands them to `runPlayoffs` and to the telling. */
export function nflPlayTie(
  teams: Record<string, GmTeamState>, rng: () => number, season: number,
  edges: Record<string, number> | undefined, told: GmLastGame[],
): PlayTie {
  return (home, away, tie) => {
    const g = simGame({ week: 0, home, away, homeScore: 0, awayScore: 0, winner: '' }, teams, rng, edges);
    /* playoff games do not count toward regular season records */
    teams[g.winner].wins -= 1;
    teams[g.winner === g.home ? g.away : g.home].losses -= 1;
    const t = nflTell(g, teams, season, tie.round, edges);
    if (t.last) told.push(t.last);
    return { homeScore: t.game.homeScore, awayScore: t.game.awayScore, winner: t.game.winner };
  };
}

/** The bracket as the rounds the recap and the owner's mandate read: `runPlayoffs`' own shape, its seven
 *  round names in its order (a round with no game yet is left out), every game at week 0. */
export function nflRoundsOf(format: BracketFormat, save: GmBracketSave): PlayoffRound[] {
  return bracketRounds(format, save).map(r => ({
    name: r.name,
    games: r.games.map(g => ({ week: 0, home: g.home, away: g.away, homeScore: g.homeScore, awayScore: g.awayScore, winner: g.winner })),
  }));
}
