/**
 * Round 531: the four front office cap lines, with their sources.
 *
 * Every contract in the NFL, NBA, NHL and MLB front offices is priced
 * against one number, the league's cap (or, for baseball, the luxury tax
 * line the game treats as a hard payroll ceiling). Until this round each of
 * those four numbers was a bare literal in its own engine file with no
 * publisher and no read date, and two of them were wrong: the NFL figure
 * was $260M against a published $301.2M, and the NBA figure was $155M
 * against a published $164.961M.
 *
 * This file is the soccerCurrency.ts shape applied to caps. Each figure
 * below was read on CAPS_AS_OF from the league's own announcement (or, for
 * baseball, where the league's page refused the read, two independent
 * outlets) and cross checked against an independent publisher, and every
 * screen that prints a cap also prints the read date, so a figure labelled
 * with its date is honest at any distance from that date.
 *
 * THE ENGINES ARE UNTOUCHED apart from where their base figure comes from.
 * Each engine still raises its own cap by its own fixed rate at the end of a
 * season (NFL 5%, NBA 7%, NHL 9%, MLB 3%). Those rates are the game's own
 * assumption, not a published number: the leagues do not publish a multi
 * year escalator, and where one has published a next season figure it is
 * recorded here beside the current one so a future round can compare.
 *
 * Evidence, with every URL read: docs/audits/league-caps-2026-09-11.md
 *
 * Updating: replace every figure in one go, move CAPS_AS_OF with them, and
 * keep the two sources per figure in the comment above it. A file half from
 * one read and half from another is a file nobody can check.
 */

/** The day every figure in this file was read. */
export const CAPS_AS_OF = '2026-09-11';
/** Human readable, for the line the cap screens print. */
export const CAPS_AS_OF_LABEL = 'September 2026';

/**
 * NFL, 2026 league year, salary cap per club, $M.
 * Announced 2026-02-27. Published as $301.2 million, up $22 million on the
 * 2025 cap of $279.2 million. No 2027 figure has been published.
 *   https://www.nfl.com/news/nfl-announces-2026-salary-cap-set-at-301-2-million-per-team
 *   https://www.espn.com/nfl/story/_/id/48055711/nfl-salary-cap-hits-new-milestone-3012-million-2026
 */
export const NFL_SALARY_CAP_2026 = 301.2;

/**
 * NBA, 2026-27 season, salary cap, $M. Announced 2026-06-30, in effect from
 * 2026-07-01. Published as $164.961 million; the tax level for the same
 * season is $200.428 million (recorded here, the sim runs on the cap alone).
 *   https://www.nba.com/news/nba-salary-cap-2026-27-season
 *   https://www.hoopsrumors.com/2026/06/salary-cap-tax-line-set-for-2026-27-nba-season.html
 * The second outlet also reports a league projection of about $174 million
 * for 2027-28 (roughly 5.5% up). One publisher, a projection, so it is noted
 * and not used.
 */
export const NBA_SALARY_CAP_2026_27 = 164.961;
export const NBA_TAX_LEVEL_2026_27 = 200.428;

/**
 * NHL, 2026-27 season, upper limit, $M. Announced 2025-01-31 by the NHL and
 * NHLPA together as a three season range: $95.5M for 2025-26, $104M for
 * 2026-27 and $113.5M for 2027-28. ESPN reported the $104M figure on
 * 2026-05-06 as an $8.5M increase.
 *   https://www.nhl.com/news/nhl-nhlpa-announce-team-payroll-ranges-for-next-3-seasons
 *   https://www.espn.com/nhl/story/_/id/48697122/nhl-salary-cap-increase-104-million-next-season
 * The 2027-28 figure is the one published next season value among the four
 * leagues, so it is recorded. It works out to a 9.1% rise on 2026-27, close
 * to the engine's own 9% assumption, which stays as it is.
 */
export const NHL_UPPER_LIMIT_2026_27 = 104;
export const NHL_UPPER_LIMIT_2027_28 = 113.5;

/**
 * MLB, 2026 season, competitive balance tax base threshold, $M. The final
 * year of the 2022-26 basic agreement, $244 million, with surcharge tiers at
 * $264M, $284M and $304M. The league's own glossary page refused the read
 * on the read date (HTTP 406) and the players' association CBA page was not
 * found, so the figure rests on two independent outlets that agree:
 *   https://www.espn.com/mlb/story/_/id/48502875/dodgers-smashed-mlb-spending-record-515m-2025
 *   https://www.cbssports.com/mlb/news/mlb-proposes-salary-cap-floor-cba-negotiations-mlbpa/
 * No 2027 figure exists: the agreement expires after 2026 and the number is
 * under negotiation.
 */
export const MLB_CBT_THRESHOLD_2026 = 244;

/**
 * The one line every cap screen prints beside the cap, so nobody mistakes
 * these figures for a live feed.
 */
export function capNote(): string {
  return `Cap figures as of ${CAPS_AS_OF_LABEL}`;
}
