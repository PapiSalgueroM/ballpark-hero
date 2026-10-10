/**
 * Round 1223: the NBA front office, as the GM desk host reads it. Reads only:
 * the engine is imported and never edited, and nothing here changes the
 * league it is handed (scripts/simGmDeskHost.mjs compares the league before
 * and after every read). Nothing imports this file yet; the NBA bind will.
 *
 * What is basketball in here and nowhere else: the payroll is the engine's
 * own count against its room (nbaCapUsed, dead money and the last tax cheque
 * in), read against the cap, the line that stops signings, not the tax line.
 */
import { nbaCapUsed, nbaStandings, nbaStrength, type NbaLeague } from '@/lib/nbaFrontOffice';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';
import type { GmDeskHost, HostClub } from '@/lib/gmDeskHost';

export const nbaDeskHost: GmDeskHost<NbaLeague> = {
  sport: 'nba',
  pack: GM_SEAT_PACKS.nba,
  clubs: league => {
    /* nbaStandings sorts an array of its own, never the league's. */
    const table = nbaStandings(league);
    return Object.values(league.teams).map((t): HostClub => ({
      id: t.abbr,
      wins: t.wins,
      losses: t.losses,
      strength: nbaStrength(t),
      games: t.wins + t.losses,
      record: `${t.wins}-${t.losses}`,
      place: table.findIndex(x => x.abbr === t.abbr) + 1,
      payroll: nbaCapUsed(t),
    }));
  },
  season: league => league.season,
  cap: league => league.cap,
  champion: (league, season) => league.champions.find(c => c.season === season)?.team ?? null,
};
