/* Round 1212: why an MLB My Career season has no game by game view, in the
   words the hub shows BEFORE a press. Small and eager: the MLB binding reads
   it for the hub's muted line and the lazy number file (src/lib/season/mlb.ts)
   reads the same functions for the build, so the words exist once and the hub
   and the viewer cannot disagree.

   Everything about the real season comes from the two sourced ledger
   (src/data/usSeasonLedgerMlb.ts) through the reader Round 1226 gave the
   engine (src/lib/usSeasonShape.ts), never from a number typed here:
   - the season the view lays out is the schedule formula's (MLB_FORMULAS);
   - a year whose schedule was another length (2020) is held;
   - a club that did not play its schedule's length that year (a game never
     made up, a 163rd game) is held for that club only, in the ledger's own
     words for it;
   - a club the ledger says is outside the league, and a club that is not in
     the era's own team list, has no Major League schedule to lay out;
   - a year the ledger does not hold is held (fail closed).
   The sentences are true of the real season whatever the save holds: a line
   saved before the engine read the ledger was played on 162 in every year,
   and "the real 2020 season had 60 games" is still so.

   Pitchers are held for now. A pitcher's wins and losses are claims about
   the results of particular games, and the season core cannot yet make his
   team win the games his line says he won.

   No React, no Math.random, nothing evaluated at module scope from an
   import. */
import { MLB_FORMULAS, MLB_OUTSIDE_CLUBS, MLB_SEASONS } from '@/data/usSeasonLedgerMlb';
import { seasonLengthRow } from '../usSeasonShape';
import { MLB_PITCHERS, mlbEraTeamIds } from '../mlbMyCareer';

/** The season the game by game view is built for: the schedule formula's own length. */
export function mlbViewGames(): number {
  return MLB_FORMULAS[0].games;
}

/** Why a position has no game by game view yet, or null. */
export function mlbHeldPos(pos: string | undefined): string | null {
  return pos !== undefined && (MLB_PITCHERS as readonly string[]).includes(pos)
    ? '📺 No week by week for pitchers yet: this view cannot yet show which games were your wins.'
    : null;
}

/** Is that club a club of the league in that era's own team list (and not one the ledger puts outside it)? */
export function mlbClubInLeague(team: string, eraId: string | undefined): boolean {
  return !MLB_OUTSIDE_CLUBS.some(o => o.team === team) && mlbEraTeamIds(eraId).includes(team);
}

/** The games that club's real season held, or null: the ledger holds no such season for it. */
export function mlbRealGames(year: number, team: string | undefined, eraId?: string): number | null {
  if (team !== undefined && !mlbClubInLeague(team, eraId)) return null;
  const row = seasonLengthRow('mlb', year, team);
  return row.from === 'engine' ? null : row.games;
}

/** Why that season of that club has no game by game view, or null exactly when it has one. */
export function mlbHeldLine(year: number, team: string | undefined, eraId?: string): string | null {
  const full = mlbViewGames();
  if (team !== undefined && MLB_OUTSIDE_CLUBS.some(o => o.team === team)) {
    return '📺 No week by week this season: your club plays outside Major League Baseball, and this view lays out a Major League season.';
  }
  if (team !== undefined && !mlbEraTeamIds(eraId).includes(team)) {
    return '📺 No week by week this season: the game holds no league schedule for your club.';
  }
  const real = mlbRealGames(year, team, eraId);
  if (real === full) return null;
  if (real === null) return `📺 No week by week this season: the game has no verified length for the real ${year} season.`;
  const row = MLB_SEASONS.find(r => r.year === year);
  const group = row && team !== undefined ? row.clubs.find(g => g.ids.includes(team)) : undefined;
  if (group && group.games !== row!.games) {
    return `📺 No week by week this season: in the real ${year} season your club ${group.why}, and the week by week view is built for ${full}.`;
  }
  return `📺 No week by week this season: the real ${year} season had ${real} games and the week by week view is built for ${full}.`;
}

/** The hub's line for the coming season (or the last one, for Watch again): the position first, then the season. */
export function mlbSeasonHeld(year: number, eraId: string | undefined, who?: { pos: string; team: string }): string | null {
  return mlbHeldPos(who?.pos) ?? mlbHeldLine(year, who?.team, eraId);
}
