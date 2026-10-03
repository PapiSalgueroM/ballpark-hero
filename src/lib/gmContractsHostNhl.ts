/**
 * Round 908: the NHL front office, as the re-sign desk sees it. The engine is
 * imported and never edited.
 */
import { NHL_ROSTER_MAX, nhlOffseason, nhlSalaryFor, type NhlLeague } from '@/lib/nhlFrontOffice';
import type { GmContractHost } from '@/lib/gmContracts';

/** The engine raises its upper limit by 9 percent inside nhlOffseason. scripts/simGmContracts.mjs checks this still matches. */
export const NHL_DESK_CAP_RISE = 1.09;

export const nhlContractHost: GmContractHost<NhlLeague, string[]> = {
  sport: 'nhl',
  /* The engine prices by rating, on the scale the save's rating model uses. */
  marketSalary: (league, man) => nhlSalaryFor(man.ovr, league.ratingModelVersion),
  nextCap: league => Math.round(league.cap * NHL_DESK_CAP_RISE),
  /* Round 987: the user club goes in, so the engine trims every CPU club over
     its roster limit exactly as the board's own path does (Round 969). */
  runOffseason: (league, rng, team) => nhlOffseason(league, rng, team),
  /* The lowest figure the engine signs a draft pick for. */
  minSalary: () => 0.8,
  /* The engine's own roster ceiling: a rival with no spot cannot table a sheet. */
  rosterMax: () => NHL_ROSTER_MAX,
};
