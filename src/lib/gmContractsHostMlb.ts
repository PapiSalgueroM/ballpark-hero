/**
 * Round 908: the MLB front office, as the re-sign desk sees it. The engine is
 * imported and never edited.
 */
import { mlbOffseason, mlbSalaryFor, type MlbLeague } from '@/lib/mlbFrontOffice';
import type { GmContractHost } from '@/lib/gmContracts';

/** The engine raises its payroll line by 3 percent inside mlbOffseason. scripts/simGmContracts.mjs checks this still matches. */
export const MLB_DESK_CAP_RISE = 1.03;

export const mlbContractHost: GmContractHost<MlbLeague, string[]> = {
  sport: 'mlb',
  marketSalary: (_league, man) => mlbSalaryFor(man.ovr),
  nextCap: league => Math.round(league.cap * MLB_DESK_CAP_RISE),
  runOffseason: (league, rng, team) => mlbOffseason(league, rng, team),
  /* The lowest figure the engine signs a draft pick for. */
  minSalary: () => 0.8,
};
