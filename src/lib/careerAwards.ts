/* ─── Round 123: an award you have to beat somebody to win ───

   All four US career sims handed out hardware the same way, and it was the
   same mistake four times: an award was a THRESHOLD on your own numbers.

     if (statScore > 105 && games >= 15) line.awards.push('All-Pro');

   Nothing in that line knows that only one player is first team All-Pro at
   your position, that one man wins MVP, that there are twenty nine other
   teams full of people having seasons of their own. So the moment a player
   cleared the bar he cleared it again every year until he retired, and the
   awards that were gated too high never fired at all. Measured over 300 full
   careers per sport in August 2026, before this file existed:

     NFL   median career: 10 first team All-Pro seasons. Max 18.
     NHL   median career: 8 All-Star selections. Max 21.
     NBA   MVP: gated at ovr >= 92, highest peak in 300 careers was 91.
           Fired zero times in 300 careers. Not once.
     MLB   MVP and Cy Young: gated at ovr >= 90. Also zero in 300 careers.

   Jerry Rice and Jim Otto share the real record with ten first team All-Pro
   selections each, across twenty and fifteen seasons. The sim was handing a
   median player the all-time record and then some, while a genuinely great
   NBA career could not win a single MVP because the gate was set above the
   highest overall the engine could produce.

   There is no simulated league of individual players here and there is not
   going to be one, so the honest model is the one this file implements: for
   each award, DRAW the best rival season in the league that year out of a
   distribution, and you win only if your season beat that draw. That buys
   three things a threshold cannot.

     Scarcity. Most years somebody else was better, because somebody else
     usually is.
     Variance. A monster season can still lose MVP to a bigger one. Dan
     Marino threw 48 touchdowns in 1984 and won MVP; Peyton Manning threw 49
     in 2004 and won MVP; Tom Brady threw 50 in 2007 and won MVP. Patrick
     Mahomes threw 50 in 2018 and won MVP. Every one of those was somebody
     else's best year too and only one of them could have it.
     Reachability. A great season wins. No hard ovr >= 92 gate that a real
     career in this engine can never satisfy.

   What is NOT here on purpose: the award names, where they are stored, or
   what the rest of the game reads. line.awards is still string[], c.mvps is
   still a number, c.allPros still counts All-Pro nods. This round changes
   how OFTEN they fire and nothing else. */

export type UsAwardSport = 'mlb' | 'nba' | 'nfl' | 'nhl';

/**
 * Only the columns the scoring reads. Structural on purpose: each engine has
 * its own SeasonLine interface with its own extra fields, and each of them
 * satisfies this without importing anything, which keeps the dependency
 * arrow pointing one way (engines depend on awards, never the reverse).
 */
export interface AwardSeasonLine {
  games: number;
  // basketball
  ppg?: number; rpg?: number; apg?: number;
  // football
  passYds?: number; passTd?: number; ints?: number;
  rushYds?: number; rushTd?: number;
  rec?: number; recYds?: number; recTd?: number;
  tackles?: number; sacks?: number; picks?: number; passDef?: number; forcedFum?: number;
  fgMade?: number; longFg?: number;
  // baseball
  avg?: number; hr?: number; rbi?: number; sb?: number;
  era?: number; so?: number; saves?: number; holds?: number;
  // hockey and baseball both use wins
  wins?: number;
  goals?: number; assists?: number; points?: number; svpct?: number;
}

/* ================================================================== */
/* What a season was worth                                            */
/* ================================================================== */

/* These four formulas are lifted VERBATIM out of the four engines, where
   each one was a local const called statScore sitting in the middle of
   simSeason. They moved here rather than staying put because the award
   model and the harness both have to score a season on exactly the same
   scale the engine does, and two copies of a formula is two formulas.

   They are not comparable ACROSS sports and are not meant to be. Each one
   is calibrated inside its own engine, which is why the league baselines
   further down are measured per sport. */

/** Round 56 football scoring: every position on its own currency. */
export function nflSeasonScore(pos: string, line: AwardSeasonLine): number {
  return pos === 'QB'
    ? (line.passYds ?? 0) / 48 + (line.passTd ?? 0) * 2.4 - (line.ints ?? 0)
    : pos === 'RB'
      ? ((line.rushYds ?? 0) + (line.recYds ?? 0)) / 16 + (line.rushTd ?? 0) * 3
      : pos === 'WR' || pos === 'TE'
        ? (line.recYds ?? 0) / 14 + (line.recTd ?? 0) * 3 + (pos === 'TE' ? 12 : 0)
        : pos === 'LB'
          ? (line.tackles ?? 0) / 1.15 + (line.sacks ?? 0) * 5 + (line.picks ?? 0) * 9 + (line.forcedFum ?? 0) * 5
          : pos === 'CB'
            ? (line.picks ?? 0) * 15 + (line.passDef ?? 0) * 3.2 + (line.tackles ?? 0) / 2 + (line.forcedFum ?? 0) * 6
            : pos === 'EDGE'
              ? (line.sacks ?? 0) * 8.5 + (line.tackles ?? 0) / 1.6 + (line.forcedFum ?? 0) * 6
              : ((line.fgMade ?? 0) * 3.4 + ((line.longFg ?? 0) - 45) * 1.6);
}

export function nbaSeasonScore(line: AwardSeasonLine): number {
  return (line.ppg ?? 0) * 1.6 + (line.rpg ?? 0) * 1.4 + (line.apg ?? 0) * 1.7;
}

export function mlbSeasonScore(pos: string, line: AwardSeasonLine): number {
  return pos === 'SP'
    ? (line.so ?? 0) / 5 + (line.wins ?? 0) * 2.2 + Math.max(0, (3.8 - (line.era ?? 5)) * 22)
    : pos === 'RP'
      ? (line.saves ?? 0) * 1.5 + (line.holds ?? 0) * 1.1 + (line.so ?? 0) / 4 + Math.max(0, (3.6 - (line.era ?? 5)) * 26)
      : (line.hr ?? 0) * 1.6 + (line.rbi ?? 0) / 3 + Math.max(0, ((line.avg ?? 0.2) - 0.24) * 320) + (line.sb ?? 0) / 3;
}

export function nhlSeasonScore(pos: string, line: AwardSeasonLine): number {
  return pos === 'G'
    ? (line.wins ?? 0) * 1.8 + Math.max(0, ((line.svpct ?? 0.9) - 0.9) * 2400)
    : (line.points ?? 0) * (pos === 'D' ? 1.35 : 1);
}

/* ================================================================== */
/* The field                                                          */
/* ================================================================== */

/**
 * What a full season looks like at each position, in that sport's own units.
 *
 * MEASURED, not guessed. 2200 careers per position per sport run end to end
 * through the real engines in August 2026, every season with a real workload
 * kept (eight games in football, half a schedule elsewhere, fifteen starts
 * for a starting pitcher), scored with the four functions above.
 *
 * The first draft of this file had ONE mean and sd per sport, on the strength
 * of the Round 56 comment in the football engine saying the position scores
 * were "normalised so a dominant corner and a dominant quarterback land in
 * the same range". Measured, they are not, and it is not close:
 *
 *   NFL   TE median season 79.4    LB median season 140.6
 *   MLB   catcher 56.8             designated hitter 86.3
 *   NHL   left wing 68.0           goalie 104.4
 *
 * A single per sport baseline would have handed every All-Pro to linebackers
 * and left tight ends with nothing forever, which is the same shape of bug
 * this round exists to kill. So every position is scored against its OWN
 * field, and the comparison the model makes is a z score: how far past the
 * normal season for your job did you get. That also happens to be the right
 * way round for a cross position award, because "most outstanding relative
 * to what that job normally produces" is what an MVP ballot is actually
 * measuring when it weighs 5000 passing yards against 2000 rushing yards.
 *
 * One honest caveat, because these numbers do a lot of work below. This is
 * the distribution of MY OWN engine's players, and the engine only ever
 * builds one kind of person: somebody good enough to be drafted and to hold
 * a job. That is a stronger population than a real league, which is also
 * full of third catchers and fourth line wingers. So the baselines sit a
 * little high and every award is a little harder than the pool arithmetic
 * alone would say. That is the safe direction to be wrong in.
 *
 * The measured tails are also slightly THINNER than a normal curve: the 99th
 * percentile season sits about 2.1 standard deviations out where a normal
 * would put it at 2.33. That is why several of the one-a-year awards below
 * carry a negative grade. Without it the theory bar sits past where the
 * engine can actually reach, which is exactly the ovr >= 92 bug again in a
 * more sophisticated costume.
 */
const LEAGUE: Record<UsAwardSport, Record<string, { mean: number; sd: number }>> = {
  nfl: {
    QB: { mean: 116.9, sd: 30.4 },
    RB: { mean: 104.3, sd: 30.4 },
    WR: { mean: 85.2, sd: 21.8 },
    TE: { mean: 79.8, sd: 17.2 },
    LB: { mean: 139.0, sd: 30.1 },
    CB: { mean: 131.3, sd: 31.5 },
    EDGE: { mean: 124.0, sd: 37.0 },
    K: { mean: 116.2, sd: 15.9 },
  },
  nba: {
    PG: { mean: 46.4, sd: 11.4 },
    SG: { mean: 46.3, sd: 11.2 },
    SF: { mean: 48.4, sd: 12.7 },
    PF: { mean: 46.6, sd: 10.5 },
    C: { mean: 44.1, sd: 10.3 },
  },
  mlb: {
    SP: { mean: 63.2, sd: 11.3 },
    RP: { mean: 62.5, sd: 21.3 },
    C: { mean: 56.3, sd: 16.2 },
    '1B': { mean: 77.2, sd: 20.5 },
    '2B': { mean: 56.6, sd: 15.4 },
    '3B': { mean: 72.9, sd: 20.6 },
    SS: { mean: 69.8, sd: 18.2 },
    LF: { mean: 74.3, sd: 19.9 },
    CF: { mean: 69.5, sd: 18.3 },
    RF: { mean: 72.2, sd: 19.8 },
    DH: { mean: 84.3, sd: 22.0 },
  },
  nhl: {
    C: { mean: 68.2, sd: 20.9 },
    LW: { mean: 66.4, sd: 20.5 },
    RW: { mean: 68.3, sd: 20.7 },
    D: { mean: 73.5, sd: 21.0 },
    G: { mean: 102.2, sd: 25.0 },
  },
};

/** Fallback for a position the table has never heard of. Never hit in practice. */
function fieldFor(sport: UsAwardSport, pos: string): { mean: number; sd: number } {
  const table = LEAGUE[sport];
  return table[pos] ?? Object.values(table)[0];
}

/**
 * How hard one award is to win.
 *
 * pool is how many players are genuinely in the conversation, slots is how
 * many of them get it. Both are real counts wherever a real count exists,
 * and every one of them is sourced in the tables below. The model treats you
 * as needing to beat the best of pool/slots rivals, which is the standard
 * order statistic shortcut: the k-th best of n draws sits at about the same
 * place as the best of n/k draws. It slightly overstates the year to year
 * wobble on a many-slot award like All-NBA, and that is the direction I
 * wanted the error in, because wobble is what stops one player owning an
 * award for a decade.
 *
 * grade is the thumb on the scale, in standard deviations, for the part of
 * an award that is not about the numbers. It is positive when voters do not
 * give the award to your kind of player and negative when they do. No AP
 * MVP has ever gone to a wide receiver; fifty of the first fifty four
 * undisputed winners were quarterbacks. That is not something a stat line
 * knows and it is not something I am going to pretend away.
 */
export interface FieldConfig {
  pool: number;
  slots: number;
  grade?: number;
}

/** A standard Gumbel draw, G = -ln(-ln u). Mean is Euler's constant, 0.5772. */
function gumbel(rng: () => number): number {
  const u = Math.min(1 - 1e-12, Math.max(1e-12, rng()));
  return -Math.log(-Math.log(u));
}

/**
 * Where the best of n seasons lands, in standard deviations above the mean.
 *
 * This is the textbook extreme value result for the maximum of n normal
 * draws: it converges to a Gumbel with location sqrt(2 ln n) minus a small
 * correction and scale 1 / sqrt(2 ln n). It matters that the SCALE shrinks
 * as n grows, because that is the bit that makes intuition wrong. The best
 * of 150 players is further out than the best of 15, but it is also STEADIER
 * year to year, which is exactly why MVP goes to a small handful of names
 * over a decade while the fifteenth best player in the league changes
 * constantly.
 *
 * A flat normal draw was tried first and thrown away. Modelling the field as
 * mean + sd * normal(bar, 0.7) gave an NBA MVP rate of 61 percent per season
 * for a 95 ceiling player, because a symmetric bell has far too much mass
 * below the bar. Real superstars win it about a third of their prime years.
 * Kareem Abdul-Jabbar holds the record at six, in twenty seasons.
 */
function bestOfN(n: number, rng: () => number): number {
  const nn = Math.max(2, n);
  const L = Math.log(nn);
  const root = Math.sqrt(2 * L);
  const loc = root - (Math.log(L) + Math.log(4 * Math.PI)) / (2 * root);
  return loc + gumbel(rng) / root;
}

/**
 * Did your season beat the field?
 *
 * One draw, one answer. Called once per award per season with the engine's
 * own rng, so a seeded career replays identically, which is the whole reason
 * this takes an rng instead of reaching for Math.random.
 */
export function beatsField(
  rng: () => number, sport: UsAwardSport, pos: string, score: number, cfg: FieldConfig,
): boolean {
  const base = fieldFor(sport, pos);
  const z = base.sd > 0 ? (score - base.mean) / base.sd : 0;
  const rivals = Math.max(1.2, cfg.pool / Math.max(1, cfg.slots));
  return z > bestOfN(rivals, rng) + (cfg.grade ?? 0);
}

/* ================================================================== */
/* Who you are actually up against, sport by sport                    */
/* ================================================================== */

/* Every pool and slot count below was web searched and checked in August
   2026 rather than typed from memory, and the source is named on the line
   that uses it. Where a real count does not exist (how many players are
   "genuinely in the conversation" for MVP) the number is an estimate and
   says so. */

/**
 * Football. The AP first team All-Pro roster for 2025, per NFL.com, was 22
 * players: eleven on offence including one quarterback, one running back,
 * three wide receivers and one tight end, then the defensive front and
 * secondary, then a kicker, a punter and the return men. Position pools are
 * starters in a 32 team league.
 *
 * The career record is ten first team selections, held jointly by Jerry Rice
 * and Jim Otto (Pro Football Reference career leaders). Ten. The engine was
 * handing a MEDIAN career ten and a good one eighteen.
 */
const NFL_ALL_PRO: Record<string, FieldConfig> = {
  QB: { pool: 32, slots: 1, grade: 0.25 },
  RB: { pool: 32, slots: 1, grade: 0.25 },
  WR: { pool: 96, slots: 3, grade: 0.25 },   // three wide receiver slots since 2020
  TE: { pool: 32, slots: 1, grade: 0.25 },
  LB: { pool: 64, slots: 2, grade: 0.25 },
  EDGE: { pool: 64, slots: 3, grade: 0.25 }, // 2025 first team named three edge rushers
  CB: { pool: 96, slots: 3, grade: 0.25 },   // two outside plus a slot corner since 2016
  K: { pool: 32, slots: 1, grade: 0.25 },
};

/**
 * AP NFL MVP. One a year. Peyton Manning holds the record with five.
 *
 * The pool is an estimate: roughly the 180 offensive starters who could in
 * principle get a vote. The grades are not an estimate. Of the first fifty
 * four undisputed winners, fifty were quarterbacks; the only running backs
 * to win are a short list; no wide receiver or tight end has ever won it.
 * A kicker HAS won it once, Mark Moseley in the strike shortened 1982
 * season, and a defender twice, Alan Page in 1971 and Lawrence Taylor in
 * 1986. The engine has sent defenders to Defensive Player of the Year since
 * Round 56 and that stays: two winners in fifty years is not a career path.
 */
const NFL_MVP: Record<string, FieldConfig | null> = {
  QB: { pool: 180, slots: 1 },
  RB: { pool: 180, slots: 1, grade: 0.35 },
  WR: { pool: 180, slots: 1, grade: 1.1 },
  TE: { pool: 180, slots: 1, grade: 1.1 },
  LB: null, EDGE: null, CB: null, K: null,
};

/**
 * AP Defensive Player of the Year. One a year, and the record is three,
 * shared by Lawrence Taylor, J.J. Watt and Aaron Donald.
 *
 * Pool is an estimate of the defensive starters in the conversation. Edge
 * rushers get the negative grade because the award follows sacks: Watt and
 * Donald are both linemen, and the list of winners is mostly pass rushers.
 */
const NFL_DPOY: Record<string, FieldConfig | null> = {
  EDGE: { pool: 150, slots: 1, grade: -0.1 },
  LB: { pool: 150, slots: 1, grade: 0.15 },
  CB: { pool: 150, slots: 1, grade: 0.4 },
  QB: null, RB: null, WR: null, TE: null, K: null,
};

/**
 * Basketball. Fifteen players are All-NBA every season, three teams of five,
 * out of roughly 150 starters. The career record is twenty one, LeBron
 * James, per NBA.com.
 *
 * MVP is one a year from the same pool. Kareem Abdul-Jabbar holds the record
 * with six. Defensive Player of the Year is one a year and the record is
 * four, shared by Dikembe Mutombo, Ben Wallace and Rudy Gobert; the engine
 * already restricts it to rim protecting archetypes, which stays.
 */
/* The 0.15 on All-NBA is the second soft number in this file, alongside the
   MLB All-Star line, and for the same reason. Fifteen slots out of a hundred
   and fifty starters is the ninetieth percentile, and an NBA career here runs
   eighteen or nineteen seasons, so the plain arithmetic gave the MEDIAN
   career one All-NBA selection and half of all careers at least one. A pool
   of 150 counts starters, and the league is 30 clubs of 15 men; counting all
   450 would be worse, because most of a bench is never in the conversation.
   The nudge is the cheapest honest way to put the median back on zero. */
const NBA_ALL_NBA: FieldConfig = { pool: 150, slots: 15, grade: 0.15 };
const NBA_MVP: FieldConfig = { pool: 150, slots: 1 };
const NBA_DPOY: FieldConfig = { pool: 150, slots: 1, grade: -0.2 };
/** Rookie of the Year, one a year out of the rookies who actually play. */
const NBA_ROY: FieldConfig = { pool: 45, slots: 1, grade: -1.6 };
/**
 * Finals MVP. You have already won the title to get here, so the field is
 * the handful of people on your own team who could take it off you. Michael
 * Jordan holds the record with six.
 */
const NBA_FINALS_MVP: FieldConfig = { pool: 7, slots: 1, grade: 0.3 };
/** The three league leader awards. One winner each, from the starters. */
const NBA_SCORING: FieldConfig = { pool: 150, slots: 1, grade: -0.35 };
const NBA_ASSISTS: FieldConfig = { pool: 150, slots: 1, grade: -0.35 };
const NBA_REBOUNDS: FieldConfig = { pool: 150, slots: 1, grade: -0.35 };
/** All-Defensive is two teams of five, so ten a year rather than one. */
const NBA_ALL_DEF: FieldConfig = { pool: 150, slots: 10, grade: 0.2 };
/** All-Rookie is two teams of five out of the rookie class. */
const NBA_ALL_ROOKIE: FieldConfig = { pool: 45, slots: 10, grade: -1.6 };
/** Sixth Man and Most Improved: one a year, and both have their own gates. */
const NBA_SIXTH_MAN: FieldConfig = { pool: 60, slots: 1, grade: -1.3 };
const NBA_MIP: FieldConfig = { pool: 150, slots: 1, grade: -0.5 };

/**
 * Baseball. Both All-Star rosters are 32 players, so 64 a season, per the
 * MLB.com roster rules FAQ. The pool is the 26 man active roster times 30
 * clubs, which is 780, and 26 is the real number since 2021 per Wikipedia's
 * roster page. Hank Aaron holds the appearance record with 25 across 21
 * seasons, because there were two All-Star Games a year from 1959 to 1962;
 * Willie Mays and Stan Musial are next on 24 (Fox Sports).
 *
 * The 0.15 on All-Star is the one number in this file I want to flag as soft.
 * An active roster is a snapshot: clubs cycle a lot more than 26 men through
 * a season on injured list moves and the September expansion to 28, so the
 * field an All-Star is actually picked out of is bigger than 780. I could not
 * verify how much bigger, so rather than invent a roster count I nudged the
 * bar by a sixth of a standard deviation, which is what it took to stop a
 * median career from collecting an All-Star nod.
 *
 * MVP and Cy Young are two a season each, one per league. The MVP pool is
 * thirty clubs times ten everyday spots; the Cy Young pool is thirty clubs
 * times a five man rotation. Barry Bonds holds the MVP record with seven and
 * Roger Clemens the Cy Young record with seven, both per MLB.com. A reliever
 * winning a Cy Young is a once a decade event, hence the grade on that line.
 */
const MLB_ALL_STAR: FieldConfig = { pool: 780, slots: 64, grade: 0.15 };
const MLB_MVP: FieldConfig = { pool: 300, slots: 2, grade: 0.4 };
const MLB_CY_SP: FieldConfig = { pool: 150, slots: 2, grade: 0.1 };
const MLB_CY_RP: FieldConfig = { pool: 150, slots: 2, grade: 1.6 };
const MLB_ROY: FieldConfig = { pool: 70, slots: 2, grade: -1.1 };
/** One per position per league, so two winners from the 30 who play it. */
const MLB_GOLD_GLOVE: FieldConfig = { pool: 30, slots: 2, grade: 0.3 };
const MLB_SILVER_SLUGGER: FieldConfig = { pool: 30, slots: 2, grade: 0.3 };
/** League leader awards: two winners a year from the qualified field. */
const MLB_BATTING_TITLE: FieldConfig = { pool: 250, slots: 2, grade: 0.3 };
const MLB_HR_CROWN: FieldConfig = { pool: 250, slots: 2, grade: 0.3 };
const MLB_ERA_TITLE: FieldConfig = { pool: 120, slots: 2, grade: 0.3 };
const MLB_SAVES_LEADER: FieldConfig = { pool: 30, slots: 2, grade: 0.3 };
const MLB_COMEBACK: FieldConfig = { pool: 60, slots: 2, grade: -1.2 };

/**
 * Hockey. The postseason All-Star Team is six positions times two teams, so
 * twelve players a season. Gordie Howe holds the record with 21 selections,
 * twelve first team and nine second, and 23 All-Star Game appearances
 * (Wikipedia). Pools are the players a league of 32 teams actually plays at
 * each spot: one starting goalie, four defencemen and a first line.
 *
 * The majors are one a year each. Wayne Gretzky won nine Harts, Bobby Orr
 * eight Norrises and Jacques Plante seven Vezinas. Patrick Roy is the only
 * three time Conn Smythe winner.
 */
/**
 * The award the engine calls "All-Star" is the All-Star GAME, not the
 * postseason First and Second All-Star Team, and the difference is a factor
 * of nearly four. The 2024 game took 44 players, 32 league picks with one
 * per club plus 12 chosen by fan vote (Wikipedia). The postseason team is
 * twelve, six positions across two squads. I went with the game because that
 * is what a player reads when the season notes say All-Star, and because it
 * is the honour Gordie Howe's record belongs to: 23 All-Star Game
 * appearances, against 21 All-Star Team selections.
 *
 * The first draft used the twelve man team and it was measurably too mean.
 * Across 700 careers a MEDIAN NHL career went from eight selections to 0.21,
 * and only 15 percent of careers ever got one, in a sport where the sim runs
 * 21 season careers. Overcorrecting a broken award into a dead one is the
 * same bug with the sign flipped.
 */
const NHL_ALL_STAR: FieldConfig = { pool: 640, slots: 44 };
const NHL_MAJOR: Record<string, FieldConfig> = {
  G: { pool: 64, slots: 1, grade: 0.1 },       // Vezina
  D: { pool: 192, slots: 1 },                  // Norris
  C: { pool: 200, slots: 1, grade: -0.15 },    // Hart
  LW: { pool: 200, slots: 1, grade: -0.15 },
  RW: { pool: 200, slots: 1, grade: -0.15 },
};
const NHL_CALDER: FieldConfig = { pool: 55, slots: 1, grade: -1.5 };
const NHL_CONN_SMYTHE: FieldConfig = { pool: 7, slots: 1, grade: 0.3 };
const NHL_ROCKET: FieldConfig = { pool: 200, slots: 1, grade: -0.4 };
const NHL_ART_ROSS: FieldConfig = { pool: 200, slots: 1, grade: -0.4 };
const NHL_SELKE: FieldConfig = { pool: 128, slots: 1, grade: -0.7 };
const NHL_JENNINGS: FieldConfig = { pool: 64, slots: 2, grade: -0.3 };
/** Every club nominates one man for the Masterton, so 32 nominees a year. */
const NHL_MASTERTON: FieldConfig = { pool: 700, slots: 32 };
const NHL_COMEBACK: FieldConfig = { pool: 40, slots: 1, grade: -1.4 };

/* ================================================================== */
/* The one call the engines make                                      */
/* ================================================================== */

export type UsAward =
  | 'allPro' | 'nflMvp' | 'nflDpoy' | 'nflRoy'
  | 'allNba' | 'nbaMvp' | 'nbaDpoy' | 'nbaRoy' | 'finalsMvp'
  | 'scoringTitle' | 'assistsTitle' | 'reboundsTitle' | 'allDefensive'
  | 'allRookie' | 'sixthMan' | 'mostImproved'
  | 'mlbAllStar' | 'mlbMvp' | 'mlbCy' | 'mlbRoy' | 'goldGlove' | 'silverSlugger'
  | 'battingTitle' | 'hrCrown' | 'eraTitle' | 'savesLeader' | 'mlbComeback'
  | 'nhlAllStar' | 'nhlMajor' | 'calder' | 'connSmythe' | 'rocketRichard'
  | 'artRoss' | 'selke' | 'jennings' | 'masterton' | 'nhlComeback';

function configFor(sport: UsAwardSport, award: UsAward, pos: string): FieldConfig | null {
  switch (award) {
    case 'allPro': return NFL_ALL_PRO[pos] ?? null;
    case 'nflMvp': return NFL_MVP[pos] ?? null;
    case 'nflDpoy': return NFL_DPOY[pos] ?? null;
    case 'nflRoy': return { pool: 45, slots: 1, grade: -1.5 };
    case 'allNba': return NBA_ALL_NBA;
    case 'nbaMvp': return NBA_MVP;
    case 'nbaDpoy': return NBA_DPOY;
    case 'nbaRoy': return NBA_ROY;
    case 'finalsMvp': return NBA_FINALS_MVP;
    case 'scoringTitle': return NBA_SCORING;
    case 'assistsTitle': return NBA_ASSISTS;
    case 'reboundsTitle': return NBA_REBOUNDS;
    case 'allDefensive': return NBA_ALL_DEF;
    case 'allRookie': return NBA_ALL_ROOKIE;
    case 'sixthMan': return NBA_SIXTH_MAN;
    case 'mostImproved': return NBA_MIP;
    case 'mlbAllStar': return MLB_ALL_STAR;
    case 'mlbMvp': return MLB_MVP;
    case 'mlbCy': return pos === 'RP' ? MLB_CY_RP : MLB_CY_SP;
    case 'mlbRoy': return MLB_ROY;
    case 'goldGlove': return MLB_GOLD_GLOVE;
    case 'silverSlugger': return MLB_SILVER_SLUGGER;
    case 'battingTitle': return MLB_BATTING_TITLE;
    case 'hrCrown': return MLB_HR_CROWN;
    case 'eraTitle': return MLB_ERA_TITLE;
    case 'savesLeader': return MLB_SAVES_LEADER;
    case 'mlbComeback': return MLB_COMEBACK;
    case 'nhlAllStar': return NHL_ALL_STAR;
    case 'nhlMajor': return NHL_MAJOR[pos] ?? null;
    case 'calder': return NHL_CALDER;
    case 'connSmythe': return NHL_CONN_SMYTHE;
    case 'rocketRichard': return NHL_ROCKET;
    case 'artRoss': return NHL_ART_ROSS;
    case 'selke': return NHL_SELKE;
    case 'jennings': return NHL_JENNINGS;
    case 'masterton': return NHL_MASTERTON;
    case 'nhlComeback': return NHL_COMEBACK;
    default: return null;
  }
}

/**
 * The only entry point the four engines use. Returns true when your season
 * beat whatever the rest of the league put up for that award this year.
 *
 * Position is not decoration. A kicker is not eligible for MVP and gets null
 * back; a defender is not either, because Round 56 sent him after Defensive
 * Player of the Year instead and that is still the right call.
 */
export function wonAward(
  rng: () => number, sport: UsAwardSport, award: UsAward, pos: string, score: number,
): boolean {
  const cfg = configFor(sport, award, pos);
  if (!cfg) return false;
  return beatsField(rng, sport, pos, score, cfg);
}

/**
 * The season score an average year's field will put up for this award, back
 * in the engine's own units. Exposed for the harness so it can print how
 * hard an award actually is without re-deriving any of this, and so a future
 * round can see at a glance that the bar is somewhere a season can reach.
 * Nothing in the app calls it.
 */
export function awardBar(sport: UsAwardSport, award: UsAward, pos: string): number | null {
  const cfg = configFor(sport, award, pos);
  if (!cfg) return null;
  const base = fieldFor(sport, pos);
  const rivals = Math.max(1.2, cfg.pool / Math.max(1, cfg.slots));
  const L = Math.log(Math.max(2, rivals));
  const root = Math.sqrt(2 * L);
  const loc = root - (Math.log(L) + Math.log(4 * Math.PI)) / (2 * root);
  // The mean of a Gumbel is its location plus Euler's constant times its scale.
  return base.mean + base.sd * (loc + 0.5772157 / root + (cfg.grade ?? 0));
}
