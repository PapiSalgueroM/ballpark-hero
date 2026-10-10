/**
 * Round 1223: the NHL front office, as the GM desk host reads it. Reads only:
 * the engine is imported and never edited, and nothing here changes the
 * league it is handed (scripts/simGmDeskHost.mjs compares the league before
 * and after every read). Nothing imports this file yet; the NHL bind will.
 *
 * What is hockey in here and nowhere else: an overtime loss is a game played
 * and is printed third in the record, and the standings order is by points,
 * so the winning share handed to the shared systems is the points share.
 */
import { nhlCapUsed, nhlFoStandings, nhlStrength, type NhlLeague } from '@/lib/nhlFrontOffice';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';
import type { GmDeskHost, HostClub } from '@/lib/gmDeskHost';

export const nhlDeskHost: GmDeskHost<NhlLeague> = {
  sport: 'nhl',
  pack: GM_SEAT_PACKS.nhl,
  clubs: league => {
    /* nhlFoStandings sorts an array of its own, never the league's. */
    const table = nhlFoStandings(league);
    return Object.values(league.teams).map((t): HostClub => {
      const games = t.wins + t.losses + t.otLosses;
      return {
        id: t.abbr,
        wins: t.wins,
        losses: t.losses + t.otLosses,
        ...(games > 0 ? { pct: (t.wins * 2 + t.otLosses) / (games * 2) } : {}),
        strength: nhlStrength(t),
        games,
        record: `${t.wins}-${t.losses}-${t.otLosses}`,
        place: table.findIndex(x => x.abbr === t.abbr) + 1,
        payroll: nhlCapUsed(t),
      };
    });
  },
  season: league => league.season,
  cap: league => league.cap,
  champion: (league, season) => league.champions.find(c => c.season === season)?.team ?? null,
};
