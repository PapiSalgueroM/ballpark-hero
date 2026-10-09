/* Round 1104: what an NFL rookie is paid by his draft slot, for NFL My Career.
   Dollars, as the sources print them. This file imports nothing; the one
   reader is src/lib/usCareerRookieDeal.ts, which turns a slot into millions a
   year. Nothing here is a claim about a player: it is the scale.

   THE GAME'S RULE, which is not the league's: every rookie in this game signs
   for four seasons and is paid the deal's average a year. (A real first round
   pick's deal also carries a fifth year option, and before 2011 first round
   picks signed for five and six years. The game keeps four.)

   HOW A ROW IS VERIFIED. Two independent sources agree on the years and agree
   on the total within 2 percent. The LOWER total is the one stored in `total`
   and the other is kept beside it in `second`, so the harness
   (scripts/simNflTruth.mjs, section 2) can hold every row to the 2 percent
   rule instead of trusting this comment. A value with one source, or with
   two that are more than 2 percent apart, is HELD: marked, counted and
   printed by the harness, and never quoted in the game's copy. Since the
   lead's ruling of 2026-10-09 a held later round end is also THIN: it
   carries NO figure in this file's data (null), and the game pays it by
   the rule written under the seven thin picks below. The harness fails on
   a figure that has no second source beside it and is not marked.

   ── 2026 (`now`), all read 2026-10-07 ──
   Round one, all 32 picks, four years each:
   1. CBS Sports, "2026 NFL Draft first-round pick contract tracker" (every
      pick marked signed). This is `total`. What it prints is the slot's
      scale value: its column is headed "Projected rookie contract (4 years)"
      and it credits Spotrac's scale, so it is the figure a first round pick
      signs for under the slotted system, not a per player signing report.
      Its figure for the first pick, 57,271,500, is also the signed deal as
      ESPN reported it ("Raiders sign No. 1 pick ... to rookie contract", 23
      July 2026: four years, 57.27M).
   2. Over The Cap, "NFL Draft" slot values. This is `second`: an estimate
      built on the final salary cap, between 1.2 and 1.7 percent above the
      CBS figure on every pick.
   Rounds two to seven, the first and last pick of each real round:
   - pick 33: Pro Football Rumors, May 2026, "49ers Sign 33rd Overall Pick ...
     To Fully Guaranteed Deal" (13,376,740 over four years); Over The Cap
     13,526,344. Verified.
   - pick 64: Pro Football Rumors, May 2026, "Seahawks Agree To Terms With
     2nd-Round Pick ..." (7.88M over four years); Over The Cap 7,931,136.
     Verified.
   - pick 65: Arizona Sports, July 2026, "... signs rookie contract" (7.4M
     over four years, as first reported by NFL Network); Over The Cap
     7,450,622. Verified.
   - pick 257: The Denver Gazette, 5 May 2026, "'Mr. Irrelevant' ... becomes
     first Broncos draft pick to agree to terms" (four years, 4.5M, with a
     122,600 signing bonus); Over The Cap 4,502,600 with the same 122,600
     bonus. Verified.
   - WHERE EACH ROUND ENDS (corrected 2026-10-08): round three 65 to 100,
     round four 101 to 140, round five 141 to 181, round six 182 to 216, round
     seven 217 to 257. Two sources: NFL.com, "2026 NFL Draft order for all
     seven rounds"; Pro Football Rumors, "2026 NFL Draft Results" (pick 181 is
     the last selection under its Round 5 heading, pick 182 the first under
     Round 6). This file first had round five ending at 180, copied from Over
     The Cap's page, which labels pick 181 "Round 6": that label is wrong (a
     compensatory pick makes round five 41 selections long).
   - pick 140 (found 2026-10-08, read the same day): AtoZ Sports, 7 July 2026,
     "Bengals Player Profile: ..." (signed: four years, 5,169,036, of which
     789,036 is the signing bonus); Over The Cap 5,182,896 (read again
     2026-10-08). 0.27 percent apart. Verified, and the signed figure is the
     one stored, as on picks 33, 64, 65 and 257.
   - picks 100, 101, 141, 181, 182, 216 and 217: THIN, all seven. No figure
     for any of them is stored in this file's data. What was found, kept here
     as the record (looked for on 2026-10-07, 2026-10-08 and 2026-10-09):
       Over The Cap, "NFL Draft" slot values, read again 2026-10-09: pick 100
       6,726,012; 101 5,707,632; 141 4,955,668; 181 4,724,112; 182 4,714,212;
       216 4,590,172; 217 4,564,644. An estimate, and the only print there is
       for picks 182 and 216.
       The other prints, none of them a signed deal: DraftKings Network's
       round by round pieces of 25 April 2026 (pick 101 5,482,354; pick 217
       4,417,085; fetched 2026-10-09); Spotrac's slot for pick 101, 5,549,727
       over four years, as credited by Raiders On SI on 22 July 2026 and
       carried by NFL Trade Rumors the same day; Crescent City Sports, 4 June
       2026, a first year figure for pick 100 (1,199,932: if each later year
       steps up by the 25 percent the rules allow, 6,599,626 over four years,
       a total worked out here and not printed there).
       They run 1.9 to 4 percent under Over The Cap, and the two that are
       totals as printed for the same pick are 2.8 and 4.0 percent under, so
       by this file's own 2 percent rule the sources DISAGREE. That lower
       scale is no better: it is as far under both deals that were reported
       signed with their figures (pick 140: 4,993,306 against the signed
       5,169,036; pick 257: 4,359,258 against the signed 4,502,600).
       No report of a signed total was found for any of the seven: the clubs
       announced four year deals with no figures, and the beat reports that
       print one credit Over The Cap, which is the same source twice.
     THE LEAD'S RULING, 2026-10-09: this site never ships a one sourced figure
     as fact, and when two sources disagree it ships neither. So a thin end
     is paid by THE RULE FOR A PICK BETWEEN TWO VERIFIED PICKS, the one this
     round's ladder already had for an unverified first round pick: the
     straight line between the nearest two sourced picks above and below it,
     by real pick number. Picks 100 and 101 sit on the line from pick 65
     (7,400,000) to pick 140 (5,169,036). Picks 141, 181, 182, 216 and 217
     sit on the line from pick 140 to pick 257 (4,502,600). Every dollar the
     game pays in rounds two to seven is therefore a point on a straight
     line between two figures that each have two sources, and
     scripts/simNflTruth.mjs (section 2: check 2a for the sources, check 2d
     for the pay) proves it slot by slot, to the dollar, and proves that no
     slot is paid one of the seven estimates above.
     WHAT THE RULE COSTS, said plainly (worked out 2026-10-09). The real
     scale steps down between rounds three and four, and nothing two sourced
     marks that step, so the line runs straight through it: against the one
     estimate there is, the last pick of round three is paid 0.09M a year
     less (1.59M against 1.68M) and the first pick of round four 0.16M a year
     more (1.58M against 1.43M), the widest gap anywhere. From pick 141 on
     the line is 0.04M to 0.05M a year over the estimate. At the 0.1M the
     game prints, 81 of the 192 slots in rounds two to seven read a different
     figure from the one the estimate paid: one tenth off on 77 of them, and
     two tenths over on the first four slots of round four (1.6M where it
     paid 1.4M). In the 2005 throwback, 23 slots move by one tenth. A report
     of the signed deal for pick 100 or pick 101, agreeing with a second
     source inside 2 percent, lifts most of that: put the figure and its
     second on the row and take the hold off.
     Why rounds four to seven cannot be far out: a deal there is four minimum
     salaries and a signing bonus, and both signed deals reported with their
     bonus leave exactly 4,380,000 of salary (pick 140: 5,169,036 less
     789,036; pick 257: 4,502,600 less 122,600), so only the bonus is ever
     in doubt.
   The 2026 rookie minimum salary, 885,000: DraftKings Network, 25 April 2026,
   "How much money do seventh round picks in the NFL Draft make?"; Legion
   Report, 14 July 2026, "NFL Rookie Contract Scale: What Every 2026 Draft
   Pick Makes". Verified.

   ── 2005 (`y2005`), all read 2026-10-07 ──
   There was no slotted scale before 2011: deals were negotiated, and reports
   of one deal disagree. The round's ladder: the anchors 1, 8, 16, 24 and 32
   must each be two sourced, or the WHOLE era is held and every slot is paid
   the 2026 slot times the era's money scale, the rule every other 2005
   contract in this engine already uses. What was found:
   - pick 1: six years, 49.5M (Associated Press, 27 July 2005, as carried by
     the Deseret News and the Las Vegas Sun; a second wire, carried by Arab
     News, gave "worth 50 million"). Two sources agree.
   - pick 24: five years, 7.7M (Spotrac's contract table; The Kent Stater).
     Two sources agree.
   - pick 32: five years, 6.4M (Spotrac; Over The Cap). Two sources agree.
   - pick 8: six years, with 43M in one report and 28,225,000 on Spotrac. They
     do not agree. NOT verified.
   - pick 16: five years, 10.2M on Spotrac alone. NOT verified.
   Two anchors of five failed, so by the ladder the whole 2005 era is HELD and
   paid 2026 times 0.32. That is close to the real deals at the bottom of the
   round (pick 24 comes out near 1.6M a year against a real 1.5M, pick 32
   near 1.3M against 1.3M) and well under at the very top, where a 2005 first
   pick really averaged 8.25M a year and the held rule pays about 4.6M. A
   later round that two sources picks 8 and 16 can lift the hold. */

/** One first round slot. `second` is the other source's total for the same
 *  deal. It is not optional: this table has no rule for a thin first round
 *  pick, so a row cannot be typed without its second source. */
export interface RookieSlotRow { pick: number; total: number; years: number; second: number }

/** The first and last pick of one real round. A two sourced end carries its
 *  deal's total and, beside it, the other source's total for the same deal
 *  (`firstSecond`, `lastSecond`). A THIN end carries no figure at all: its
 *  total is null, it has no second, and `held` names it. The one reader,
 *  src/lib/usCareerRookieDeal.ts, puts a thin end on the straight line
 *  between the nearest two sourced ends above and below it. */
export interface RookieRoundRow {
  round: 2 | 3 | 4 | 5 | 6 | 7;
  firstPick: number; firstTotal: number | null; firstSecond?: number;
  lastPick: number; lastTotal: number | null; lastSecond?: number;
  years: number;
  held?: 'first' | 'last' | 'both';
}

/** An era with a table of its own. */
export interface NflRookieTable {
  /** The draft class the rows are from. */
  season: number;
  firstRound: RookieSlotRow[];
  laterRounds: RookieRoundRow[];
  /** The rookie minimum salary, a year. */
  undrafted: number;
}

/** An era with no verified table of its own: every slot is paid the same slot
 *  of `of`, times `scale`. No number of its own is typed here. */
export interface NflRookieHeld {
  season: number;
  heldAs: { of: 'now'; scale: number };
}

export type NflRookieScale = NflRookieTable | NflRookieHeld;

const row = (pick: number, total: number, second: number): RookieSlotRow => ({ pick, total, years: 4, second });

export const NFL_ROOKIE_SCALE: { now: NflRookieTable; y2005: NflRookieScale } = {
  now: {
    season: 2026,
    firstRound: [
      row(1, 57_271_500, 58_191_906), row(2, 54_675_584, 55_550_396), row(3, 53_023_666, 53_869_434), row(4, 51_135_704, 51_948_350),
      row(5, 47_831_802, 48_586_402), row(6, 41_931_992, 42_582_984), row(7, 37_212_138, 37_780_230), row(8, 32_492_288, 32_977_486),
      row(9, 32_256_026, 32_737_346), row(10, 30_958_330, 31_416_590), row(11, 28_952_410, 29_375_426), row(12, 26_120_482, 26_493_742),
      row(13, 25_412_508, 25_773_352), row(14, 24_232_552, 24_572_676), row(15, 23_760_590, 24_092_398), row(16, 22_344_604, 22_651_556),
      row(17, 21_872_616, 22_171_292), row(18, 21_282_642, 21_570_956), row(19, 20_928_640, 21_210_742), row(20, 20_810_658, 21_090_674),
      row(21, 20_692_654, 20_970_598), row(22, 20_456_656, 20_730_460), row(23, 20_220_666, 20_490_330), row(24, 19_748_678, 20_010_048),
      row(25, 19_512_698, 19_769_926), row(26, 19_276_668, 19_529_766), row(27, 19_040_710, 19_289_644), row(28, 18_922_710, 19_169_568),
      row(29, 17_975_848, 18_206_074), row(30, 17_474_424, 17_695_836), row(31, 17_054_400, 17_268_452), row(32, 16_783_950, 16_993_244),
    ],
    /* The stored total is the deal as reported signed; the second is Over The Cap's estimate for the same pick.
       Pick 257 is the one row where the report printed a rounded total (4.5M) and the exact bonus (122,600):
       the estimate's 4,502,600 carries that same bonus to the dollar, so it is the figure stored and the
       report's rounded print is the second. A null total is a THIN end (see the header): no figure ships. */
    laterRounds: [
      { round: 2, firstPick: 33, firstTotal: 13_376_740, firstSecond: 13_526_344, lastPick: 64, lastTotal: 7_880_000, lastSecond: 7_931_136, years: 4 },
      { round: 3, firstPick: 65, firstTotal: 7_400_000, firstSecond: 7_450_622, lastPick: 100, lastTotal: null, years: 4, held: 'last' },
      { round: 4, firstPick: 101, firstTotal: null, lastPick: 140, lastTotal: 5_169_036, lastSecond: 5_182_896, years: 4, held: 'first' },
      { round: 5, firstPick: 141, firstTotal: null, lastPick: 181, lastTotal: null, years: 4, held: 'both' },
      { round: 6, firstPick: 182, firstTotal: null, lastPick: 216, lastTotal: null, years: 4, held: 'both' },
      { round: 7, firstPick: 217, firstTotal: null, lastPick: 257, lastTotal: 4_502_600, lastSecond: 4_500_000, years: 4, held: 'first' },
    ],
    undrafted: 885_000,
  },
  y2005: {
    season: 2005,
    /* 0.32 is the 2005 era's money scale in src/lib/nflMyCareer.ts (NFL_ERAS);
       src/test/usCareerRookieDeal.test.ts holds the two together. */
    heldAs: { of: 'now', scale: 0.32 },
  },
};
