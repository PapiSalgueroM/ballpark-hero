/**
 * Round 908: the NFL front office, as the re-sign desk sees it. The engine is
 * imported and never edited: this is the three answers gmContracts.ts cannot
 * work out for itself, and nothing else.
 */
import { runOffseason, salaryFor, type GmPlayer, type LeagueState, type OffseasonNews } from '@/lib/frontOffice';
import type { GmContractHost } from '@/lib/gmContracts';

/** The engine raises its cap by 5 percent inside runOffseason. scripts/simGmContracts.mjs checks this still matches. */
export const NFL_DESK_CAP_RISE = 1.05;

export const nflContractHost: GmContractHost<LeagueState, OffseasonNews> = {
  sport: 'nfl',
  /* The engine prices a new deal by position and rating, on a fixed scale. */
  marketSalary: (_league, man) => salaryFor(man.pos as GmPlayer['pos'], man.ovr),
  nextCap: league => Math.round(league.cap * NFL_DESK_CAP_RISE),
  runOffseason: (league, rng, team) => runOffseason(league, rng, team),
  /* A man tagged for the coming season is under contract already. The engine
     keeps him and the desk never sees him. */
  held: (league, man) => (man as GmPlayer).tagSeason === league.season + 1,
  minSalary: () => 1,
  /* The engine's own clearTag (frontOffice.ts, not exported): when a deal
     ends the tag and its guarantee end with it. The engine runs it on every
     expiring man it re-signs or lets walk; the desk settles the GM's men
     before the engine reaches them, so it runs the same three lines here.
     scripts/simGmContracts.mjs checks a kept man comes out without them. */
  endDeal: man => {
    const p = man as GmPlayer;
    delete p.tagSeason;
    delete p.tagCount;
    delete p.guaranteed;
  },
};
