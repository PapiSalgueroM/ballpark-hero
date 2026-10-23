/**
 * Round 1223: the NFL front office, as the GM desk host reads it. Reads only:
 * the engine is imported and never edited, and nothing here changes the
 * league it is handed (scripts/simGmDeskHost.mjs compares the league before
 * and after every read). Nothing imports this file yet; the NFL bind will.
 *
 * What is football in here and nowhere else: the engine's standings take the
 * teams record, not the league, and a club keeps wins and losses only (the
 * engine has no ties field), so games played is wins plus losses.
 */
import { capUsed, standings, teamStrength, type LeagueState } from '@/lib/frontOffice';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';
import type { GmDeskHost, HostClub } from '@/lib/gmDeskHost';

export const nflDeskHost: GmDeskHost<LeagueState> = {
  sport: 'nfl',
  pack: GM_SEAT_PACKS.nfl,
  clubs: league => {
    /* standings sorts the array Object.values builds, never the league's record. */
    const table = standings(league.teams);
    return Object.values(league.teams).map((t): HostClub => ({
      id: t.abbr,
      wins: t.wins,
      losses: t.losses,
      strength: teamStrength(t),
      games: t.wins + t.losses,
      record: `${t.wins}-${t.losses}`,
      place: table.findIndex(x => x.abbr === t.abbr) + 1,
      payroll: capUsed(t),
    }));
  },
  season: league => league.season,
  cap: league => league.cap,
  champion: (league, season) => league.champions.find(c => c.season === season)?.team ?? null,
};
