/**
 * Round 908: the NBA front office, as the re-sign desk sees it. The engine is
 * imported and never edited. Its tax and its aprons are untouched and still
 * bill whatever payroll the desk leaves behind.
 */
import { NBA_ROSTER_MAX, nbaMinContract, nbaNextCap, nbaOffseason, nbaSalaryFor, type NbaLeague } from '@/lib/nbaFrontOffice';
import { type CutLedger, deadCapUsed, rollDeadCap } from '@/lib/frontOfficeCuts';
import type { GmContractHost } from '@/lib/gmContracts';

export const nbaContractHost: GmContractHost<NbaLeague, string[]> = {
  sport: 'nba',
  /* Since Round 824 the engine prices a new deal in next season's money. */
  marketSalary: (league, man) => nbaSalaryFor(man.ovr, nbaNextCap(league.cap)),
  nextCap: league => nbaNextCap(league.cap),
  runOffseason: (league, rng, team) => nbaOffseason(league, rng, team),
  minSalary: league => nbaMinContract(nbaNextCap(league.cap)),
  /* Round 1018: the engine's roster ceiling. Read only for an offer sheet
     (restricted free agency): a rival with no spot cannot table one. */
  rosterMax: () => NBA_ROSTER_MAX,
  /* The engine's room is the cap less salaries, dead money and the tax cheque
     written at the last season close (nbaCapRoom). Next season's dead money is
     this season's rolled forward by the engine's own rollDeadCap, run on a
     copy so the club is not touched. The cheque is held back from next
     season's spending, so it counts here as it does in nbaCapRoom. */
  nextPayroll: (league, team, without) => {
    const t = league.teams[team];
    if (!t) return 0;
    const next: CutLedger = { deadCap: t.deadCap, releasedThisSeason: [] };
    rollDeadCap(next);
    return t.players.reduce((s, p) => s + (p.id === without ? 0 : p.salary), 0) + deadCapUsed(next) + (t.taxDue ?? 0);
  },
};
