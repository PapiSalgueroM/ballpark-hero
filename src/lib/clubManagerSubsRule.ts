/* Round 1331: how many changes a Club Manager match allows, by league and
   season. Pure: no imports, no draws, no clock.

   The law, two sourced in scripts/data/cmSubsRuleSources.json (read
   2026-10-13): until May 2020 a top division side could use three
   substitutes, whenever it liked (IFAB Law 3 as quoted in circular 20;
   ESPN 37630254). From May 2020 a competition could allow five in at most
   three stoppages during play, with changes at half time, before extra time
   and at half time in extra time not counting as one (IFAB circular 20,
   FIFA 8 May 2020, STV), made permanent from 1 July 2022 (FIFA 13 June 2022,
   CBS Sports).

   The leagues: Spain, Italy, Germany and France from 2020-21 (Inside World
   Football 18 December 2020, ESPN 4 August 2022); England stayed at three
   in 2020-21 and 2021-22 and moved to five from 2022-23 (Inside World
   Football, NBC Sports, football365, the league's statement as carried by
   cpfc.co.uk, ESPN); the EFL from 2022-23 (Irish Examiner 10 June 2022,
   ESPN). A league the round could not two source keeps three and is listed
   in CM_SUBS_PARTIAL, the CM_PARTIAL shape. Seasons are ruled by their
   start year, so the 2019-20 restart plays three. */

export interface SubsRule {
  /** Changes a side may make in the match. */
  subs: number;
  /** Stoppages in play it may make them at; null means no limit. Breaks
   *  (half time, before extra time, extra time's half time) never count. */
  stops: number | null;
  /** True when the game could not confirm this league's rule for this
   *  season and plays three for want of a source. */
  partial: boolean;
}

/** League base id to the first season start year of five changes in three
 *  stoppages. Sourced rows only (the ledger names two sources for each). */
export const CM_SUBS_FIVE_FROM: Readonly<Record<string, number>> = {
  premier: 2022, championship: 2022, laliga: 2020, seriea: 2020, bundesliga: 2020, ligue1: 2020,
};

/** Leagues whose rule this round could not two source: they keep three. */
export const CM_SUBS_PARTIAL: string[] = [
  'eredivisie', 'saudi', 'mlsEast', 'mlsWest', 'primeira', 'scottish', 'superlig', 'bundesliga2', 'proleague', 'austria', 'greece', 'denmark',
  'switzerland', 'croatia', 'brasileirao', 'ligamx', 'aleague', 'serieb', 'ligue2', 'segunda', 'russia',
];

/** The first season start year five changes were allowed anywhere. */
export const CM_SUBS_LAW_FROM = 2020;

/** A league id with its era suffix taken off: premier2005 to premier,
 *  ligue12020 to ligue1. Real league ids carry no four digit tail. */
export function subsLeagueBase(leagueId: string): string {
  return leagueId.replace(/\d{4}$/, '');
}

/** The rule a match in this league and season plays. */
export function subsRuleFor(leagueBaseId: string, seasonStartYear: number): SubsRule {
  const from = Object.prototype.hasOwnProperty.call(CM_SUBS_FIVE_FROM, leagueBaseId) ? CM_SUBS_FIVE_FROM[leagueBaseId] : null;
  if (from !== null && seasonStartYear >= from) return { subs: 5, stops: 3, partial: false };
  return { subs: 3, stops: null, partial: from === null && seasonStartYear >= CM_SUBS_LAW_FROM };
}
