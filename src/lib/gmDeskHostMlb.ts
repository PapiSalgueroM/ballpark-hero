/**
 * Round 1223: the MLB front office, as the GM desk host reads it. Reads only:
 * the engine is imported and never edited, and nothing here changes the
 * league it is handed (scripts/simGmDeskHost.mjs compares the league before
 * and after every read). Nothing imports this file yet; the MLB bind will.
 *
 * What is baseball in here and nowhere else: the line the payroll is read
 * against is the game's tax line (league.cap holds it), which this game
 * treats exactly as hard as a cap.
 */
import { mlbCapUsed, mlbStandings, mlbStrength, type MlbLeague } from '@/lib/mlbFrontOffice';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';
import type { GmDeskHost, HostClub } from '@/lib/gmDeskHost';

export const mlbDeskHost: GmDeskHost<MlbLeague> = {
  sport: 'mlb',
  pack: GM_SEAT_PACKS.mlb,
  clubs: league => {
    /* mlbStandings sorts an array of its own, never the league's. */
    const table = mlbStandings(league);
    return Object.values(league.teams).map((t): HostClub => ({
      id: t.abbr,
      wins: t.wins,
      losses: t.losses,
      strength: mlbStrength(t),
      games: t.wins + t.losses,
      record: `${t.wins}-${t.losses}`,
      place: table.findIndex(x => x.abbr === t.abbr) + 1,
      payroll: mlbCapUsed(t),
    }));
  },
  season: league => league.season,
  cap: league => league.cap,
  champion: (league, season) => league.champions.find(c => c.season === season)?.team ?? null,
};
