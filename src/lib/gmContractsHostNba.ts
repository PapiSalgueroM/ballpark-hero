/**
 * Round 908: the NBA front office, as the re-sign desk sees it. The engine is
 * imported and never edited. Its tax and its aprons are untouched and still
 * bill whatever payroll the desk leaves behind.
 */
import { nbaMinContract, nbaNextCap, nbaOffseason, nbaSalaryFor, type NbaLeague } from '@/lib/nbaFrontOffice';
import type { GmContractHost } from '@/lib/gmContracts';

export const nbaContractHost: GmContractHost<NbaLeague, string[]> = {
  sport: 'nba',
  /* Since Round 824 the engine prices a new deal in next season's money. */
  marketSalary: (league, man) => nbaSalaryFor(man.ovr, nbaNextCap(league.cap)),
  nextCap: league => nbaNextCap(league.cap),
  runOffseason: (league, rng, team) => nbaOffseason(league, rng, team),
  minSalary: league => nbaMinContract(nbaNextCap(league.cap)),
};
