/**
 * Round 722: the NBA luxury tax, the two aprons and the roster limits, as
 * data with sources. The engine (src/lib/nbaFrontOffice.ts) imports from
 * here the way it imports its cap from leagueCaps.ts, so no rate or line is
 * a bare literal inside the loop, and scripts/simNbaLuxuryTax.mjs carries its
 * own copy of the published table and fails if these numbers drift from it.
 *
 * Every figure below was read on NBA_TAX_AS_OF from two independent
 * publishers. Where the game needs a number no publisher prints (the lines
 * in a future season after the game's own 7% cap rise), it is derived from
 * the published 2026-27 ratio to the cap and says so beside the function.
 *
 * THE LINES, 2026-27 ($M). The league announced the cap and tax level on
 * 2026-06-30, the two aprons with them:
 *   cap 164.961, tax level 200.428, first apron 209.015, second apron 221.686
 *   https://www.nba.com/news/nba-salary-cap-2026-27-season
 *   https://www.hoopsrumors.com/2026/06/salary-cap-tax-line-set-for-2026-27-nba-season.html
 * The cap and the tax level already live in leagueCaps.ts (Round 531) and
 * are imported, not retyped. The aprons are new here.
 *
 * THE RATES, 2025-26 onward, per bracket of team salary over the tax level.
 * Standard: 1.00, 1.25, 3.50, 4.75, then 0.50 more per bracket. Repeater:
 * 3.00, 3.25, 5.50, 6.75, then 0.50 more per bracket. A team is a repeater
 * when it paid tax in at least three of the previous four seasons. Both
 * publishers print the same schedule; the second lists ten brackets out,
 * which agrees with the "0.50 more" rule (5.25, 5.75 ... and 7.25, 7.75 ...).
 *   https://hoopsrumors.com/2024/11/hoops-rumors-glossary-luxury-tax-penalties-4.html
 *   https://www.salaryswish.com/luxury-tax/2027
 *
 * THE BRACKET WIDTH. The brackets were 5.000 wide in 2023-24 and grow at the
 * cap's rate each season since (the first publisher above gives the rule and
 * 5.168 for 2024-25, 5.685 for 2025-26). For 2026-27 the second publisher
 * prints the brackets at 6.064 wide, which is 5.685 grown by the published
 * cap rise (164.961 / 154.647), so the two agree and 6.064 is pinned here.
 *
 * THE ROSTER. During the regular season a team carries at most 15 players on
 * standard contracts and at least 14, two-way players not counted either
 * way; it may dip under 14 for at most two weeks at a time. This game has no
 * two-way contracts, and its rounds are stretches of four games, so the
 * floor is applied once, at tip off: the league fills a short roster on
 * minimum deals, and a long one has to be cut before the season starts.
 *   https://hoopsrumors.com/2023/08/hoops-rumors-glossary-nba-roster-limits-2.html
 *   https://www.slamonline.com/?p=540859
 *
 * THE APRONS AND TRADES. From 2024-25 a team whose salary after a trade sits
 * above the first apron may take back no more salary than it sends out. The
 * second apron adds a ban on aggregating two contracts in one trade and on
 * the taxpayer mid level exception. This engine trades one man for one man
 * and has no exceptions at all, so the aggregation ban and the taxpayer MLE
 * have nothing to bite on here; only the 100% matching rule is enforced, in
 * nbaSalaryFits. If exceptions or multi player trades are ever built, the
 * second apron is where those two rules go.
 *   https://www.blazersedge.com/2023/6/28/23777931/nba-cba-2023-new-rules-nbpa-luxury-tax-apron-second-draft-picks-salary-cap
 *   https://www.sportsbusinessclassroom.com/understanding-trade-matching-in-the-new-collective-bargaining-agreement/
 *
 * WHAT THE GAME ASSUMES, not a published number: the tax level, the aprons
 * and the bracket width keep their 2026-27 ratio to the cap as the cap rises
 * 7% a season (the game's own escalator, see leagueCaps.ts). The real ratios
 * have been near constant since the 2023 agreement because all four numbers
 * are set off the same revenue figure, so the ratio is the honest way to
 * carry them forward without inventing a dollar figure.
 *
 * THE GAME'S OWN SALARIES, and why the lines are scaled (Round 722 review).
 * The rosters are real but their salaries are the game's (nbaSalaryFor, a
 * function of rating), and they run richer at the top than the real league:
 * at the real 200.4 line a new league opened with 14 of 30 clubs over it and
 * the top club facing a 416.5 bill, more than twice anything ever paid. So
 * every league carries a scale (NbaLeague.taxScale) that multiplies the tax
 * line, both aprons AND the bracket width together, which keeps each of them
 * in its real 2026-27 proportion to the line (the width stays 6.064 / 200.428,
 * about 3.0% of the line) and keeps the real rates untouched. The scale is
 * set once, from the league's own payrolls (nbaCalibrateTaxScale), and the
 * lines then rise with the cap as before. What a real season looks like, the
 * two numbers the scale aims at:
 *   2023-24, final: eight clubs paid, the largest bill 176.9 (Golden State,
 *   repeater), then 142.4, 68.2, 52.5, 43.8, 20.2, 15.7 and 6.9.
 *   https://hoopsrumors.com/2024/06/warriors-top-list-of-nbas-2023-24-taxpayers.html
 *   2023-24, projected before the season: eight clubs, the largest 188.2
 *   (Golden State), median 44.9.
 *   https://ca.sports.yahoo.com/news/luxury-tax-2023-24-much-094006005.html
 *   Golden State's 2021-22 bill, the record before that, was 170.
 *   https://nbcsports.com/nba/news/joe-lacob-warriors-in-trouble-with-rest-of-nba-for-spending
 */
import { NBA_SALARY_CAP_2026_27, NBA_TAX_LEVEL_2026_27 } from './leagueCaps';

/** The day every figure in this file was read. */
export const NBA_TAX_AS_OF = '2026-10-01';

/** 2026-27 apron levels, $M, both sources above. */
export const NBA_FIRST_APRON_2026_27 = 209.015;
export const NBA_SECOND_APRON_2026_27 = 221.686;
/** 2026-27 width of one tax bracket, $M, see the header. */
export const NBA_TAX_BRACKET_2026_27 = 6.064;

/** Tax owed per dollar over the line, bracket by bracket, then NBA_TAX_RATE_STEP more per further bracket. */
export const NBA_TAX_RATES_STANDARD = [1.00, 1.25, 3.50, 4.75];
export const NBA_TAX_RATES_REPEATER = [3.00, 3.25, 5.50, 6.75];
export const NBA_TAX_RATE_STEP = 0.50;
/** A repeater paid tax in at least NBA_REPEATER_HITS of the previous NBA_REPEATER_WINDOW seasons. */
export const NBA_REPEATER_HITS = 3;
export const NBA_REPEATER_WINDOW = 4;

/** Standard contracts a team must carry at tip off. The ceiling of 15 is NBA_ROSTER_MAX in the engine. */
export const NBA_TIPOFF_MIN = 14;
/**
 * The minimum deal in this game's own money, $M a year. The engine's salary
 * scale (nbaSalaryFor) bottoms out at 2, so 2 is the floor a fill in man
 * signs for. The league's real minimum scale runs by years of service and is
 * not modelled.
 */
export const NBA_MIN_CONTRACT = 2;

/** Clubs over the line in a typical real season: the eight of 2023-24, both sources in the header. */
export const NBA_TAXPAYERS_TYPICAL = 8;
/**
 * No club opens a league facing a projected bill above this, $M: the top of
 * the real record, between the 176.9 Golden State paid in 2023-24 and the
 * 188.2 it was projected to pay before that season (sources in the header).
 */
export const NBA_TAX_BILL_CEILING = 190;

const round1 = (n: number): number => Math.round(n * 10) / 10;

/*
 * Every line below takes the league's scale (NbaLeague.taxScale). At scale 1
 * they are the real 2026-27 figures carried forward with the cap, which is
 * what scripts/simNbaLuxuryTax.mjs checks against the published table.
 */
/** The tax level for a season whose cap is `cap`: the 2026-27 ratio, carried forward, times the league's scale. */
export function nbaTaxLine(cap: number, scale = 1): number {
  return round1(cap * scale * NBA_TAX_LEVEL_2026_27 / NBA_SALARY_CAP_2026_27);
}
export function nbaFirstApron(cap: number, scale = 1): number {
  return round1(cap * scale * NBA_FIRST_APRON_2026_27 / NBA_SALARY_CAP_2026_27);
}
export function nbaSecondApron(cap: number, scale = 1): number {
  return round1(cap * scale * NBA_SECOND_APRON_2026_27 / NBA_SALARY_CAP_2026_27);
}
/** One bracket's width at this cap and scale, unrounded so the bill is computed on the true width. */
export function nbaTaxBracket(cap: number, scale = 1): number {
  return cap * scale * NBA_TAX_BRACKET_2026_27 / NBA_SALARY_CAP_2026_27;
}

/** The rate in bracket `i` (0 based), standard or repeater. */
export function nbaTaxRate(i: number, repeater: boolean): number {
  const table = repeater ? NBA_TAX_RATES_REPEATER : NBA_TAX_RATES_STANDARD;
  if (i < table.length) return table[i];
  return table[table.length - 1] + NBA_TAX_RATE_STEP * (i - table.length + 1);
}

/**
 * The bill, $M, on a payroll (roster salaries plus dead money) for a season
 * whose cap is `cap`. Every dollar over the line is taxed at its bracket's
 * rate, so a team a dollar over pays a little and a team far over pays a
 * great deal. Rounded to 0.1 like every money figure in the four GM sims.
 */
export function nbaTaxBill(payroll: number, cap: number, repeater: boolean, scale = 1): number {
  let over = payroll - nbaTaxLine(cap, scale);
  if (over <= 0) return 0;
  const width = nbaTaxBracket(cap, scale);
  let bill = 0;
  for (let i = 0; over > 1e-9; i += 1) {
    const slice = Math.min(over, width);
    bill += slice * nbaTaxRate(i, repeater);
    over -= slice;
  }
  return round1(bill);
}

/** One season's assessment, kept on the team so the repeater rule can read it. */
export interface NbaTaxEntry {
  season: number;
  payroll: number;
  line: number;
  bill: number;
  repeater: boolean;
}

/** Paid tax in at least three of the four seasons before `season`. */
export function nbaIsRepeater(history: NbaTaxEntry[] | undefined, season: number): boolean {
  const hits = (history ?? []).filter(e => e.bill > 0 && e.season < season && e.season >= season - NBA_REPEATER_WINDOW).length;
  return hits >= NBA_REPEATER_HITS;
}

/**
 * The league's scale (see the header), from each club's payroll as it will
 * stand at tip off, at a cap of `cap`. Two aims, both from real seasons:
 * about NBA_TAXPAYERS_TYPICAL clubs over the line, and no club facing a
 * standard bill above NBA_TAX_BILL_CEILING. The line starts midway between
 * the eighth and ninth richest payrolls and rises a tenth at a time only as
 * far as the ceiling needs. Where the two aims disagree the ceiling wins, so a
 * league that is rich at the very top gets fewer taxpayers rather than a bill
 * nobody has ever paid. Returns the line over the real one at this cap.
 */
export function nbaCalibrateTaxScale(payrolls: number[], cap: number): number {
  const base = cap * NBA_TAX_LEVEL_2026_27 / NBA_SALARY_CAP_2026_27;
  if (!payrolls.length) return 1;
  const p = [...payrolls].sort((a, b) => b - a);
  const k = Math.min(NBA_TAXPAYERS_TYPICAL, p.length - 1);
  let line = Math.ceil(((p[k - 1] ?? p[0]) + p[k]) / 2 * 10) / 10;
  while (nbaTaxBill(p[0], cap, false, line / base) > NBA_TAX_BILL_CEILING) line = round1(line + 0.1);
  return line / base;
}
