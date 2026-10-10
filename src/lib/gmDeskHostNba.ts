/**
 * Round 1223: the NBA front office, as the GM desk host reads it. Reads only:
 * the engine is imported and never edited, and nothing here changes the
 * league it is handed (scripts/simGmDeskHost.mjs compares the league before
 * and after every read). Nothing imports this file yet; the NBA bind will.
 *
 * What is basketball in here and nowhere else: the payroll is everything the
 * engine counts against its room, read against the cap (the line that stops
 * signings, not the tax line). That is nbaCapUsed (the salaries and this
 * season's dead money) PLUS the tax cheque ownership wrote at the last close
 * (taxDue), which nbaCapRoom holds back from the room and nbaCapUsed does not
 * carry. The cheque is written at the season's close, exactly when the job
 * market is read, so without it the room printed under an offer from a taxed
 * club is too big by the cheque and does not match the cap panel he meets
 * after taking the job. scripts/simGmDeskHost.mjs holds the room under every
 * club to nbaCapRoom itself (control `notax`).
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
      payroll: nbaCapUsed(t) + (t.taxDue ?? 0),
    }));
  },
  season: league => league.season,
  cap: league => league.cap,
  champion: (league, season) => league.champions.find(c => c.season === season)?.team ?? null,
};
