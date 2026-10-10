/* nbaCareerAwards.ts (Round 1103). One season's NBA awards in NBA My Career, decided together.

   Before this file the season's awards were twelve separate draws on one number, each blind to the others
   and to how the club did. So an MVP could miss the playoffs (one in four did), or be left off All-NBA, or
   be Most Improved the same night; no Rookie of the Year ever made All-Rookie; scorers took All-Defensive.

   Now there is one pass. It knows the club's record, it draws ONE league a family of awards (so the awards in
   a family are judged against the same year), and it writes the gates out:
     All-Star, All-NBA and MVP share the year's league. MVP needs the All-NBA First Team and a playoff club,
     and an All-NBA First Team season starts the All-Star Game.
     All-Defensive and Defensive Player share the year's defenders, and read a defence score.
     All-Rookie and Rookie of the Year share the rookie class. The Rookie of the Year is on the first team.
     Most Improved never goes to a man who has been All-NBA, or to that season's MVP.
   The gates carry the nesting, not the shared draw: the bar a draw sets grows steeper as the field per slot
   shrinks, so in a rare year the first team's bar can dip under the second's. Never delete a gate.

   The scores are the ones NBA Front Office ranks its league by (awardDecision.ts). Every z reads the line with
   the era's level divided out (a 2004 season is judged against 2004's league); only the three stat titles
   compare the raw average, against that era's own league leaders.

   Only nbaMyCareer.ts imports this file. careerAwards.ts serves four sports and stays free of the NBA norms. */
import { NBA_AWARD_RULES, nbaEraNeutral, nbaLeaderBar } from '@/data/nbaLeagueNorms';
import { nbaAwardGamesBar, nbaDefenseValue, nbaMvpValue, nbaProduction, nbaQualifiesForStatTitle } from './awardDecision';
import { bestOfNAt, gumbel } from './careerAwards';

/** What the MVP score adds per unit of the club's winning share. NBA Front Office declares the same number
 *  (NBA_MVP_WIN_WEIGHT in nbaSeasonStats.ts). It is a second declaration on purpose: importing that file would
 *  pull its rotation and box score code into the career's chunk, and its constant is a harness anchor. Section
 *  D of scripts/simNbaAwardsSense.mjs fails when the two differ. */
export const NBA_CAREER_MVP_WIN_WEIGHT = 20;

type Row = readonly [mean: number, sd: number];
type FieldByPos = Record<string, Row>;
/** What a season is judged against: mean and sd of each score over the simNbaAwardsSense fleet (every season
 *  of half a schedule or more, bench years included, on the era neutral line). `bench` is the points of bench
 *  seasons, `jump` this season's production minus last season's (last season of 40 games or more), `fans` the
 *  fanbase at tip off. Measured 2026-10-08, 6,000 careers a seed, seeds 1 to 5; section E of the harness fails
 *  when the fleet drifts off these rows. */
export const NBA_FIELD: { mvp: FieldByPos; defense: FieldByPos; production: FieldByPos; bench: Row; jump: Row; fans: Row } = {
  mvp: { PG: [32.92, 11.23], SG: [31.95, 10.85], SF: [33.67, 11.54], PF: [31.75, 10.35], C: [32.93, 10.95] },
  defense: { PG: [3.02, 1.06], SG: [3.34, 1.28], SF: [4.08, 1.38], PF: [4.05, 1.41], C: [5.59, 2.08] },
  production: { PG: [23.1, 10.29], SG: [22.15, 9.87], SF: [23.8, 10.59], PF: [21.9, 9.39], C: [23.15, 10.01] },
  bench: [7.71, 3.3],
  jump: [-0.01, 7.09],
  fans: [61.81, 24.35],
};

/** How hard each award is. Pools and slots are real counts (150 starters, 24 All-Stars, 15 All-NBA, 10
 *  All-Defensive, 45 rookies who play, 10 All-Rookie, about 60 sixth men). The grade is the one number tuned,
 *  each only to put its own rate where the harness holds it (section B), worked out from every season of
 *  30,000 careers and then played. Measured 2026-10-08, awards a career on five full size seeds (main, the
 *  game before Round 1103, in brackets):
 *    All-NBA 1.96 to 2.00 (1.97 to 2.01) and MVP 0.30 to 0.32 (0.31 to 0.32), held at main's rate.
 *    All-Defensive 1.30 to 1.38 (1.34 to 1.38), held; it now goes to defenders, not to whoever scored most.
 *    All-Star 3.15 to 3.19, set at 1.6 times All-NBA because 24 are picked against 15.
 *    Rookie of the Year 0.044 to 0.049 (0.018 to 0.026), set at twice main's; All-Rookie follows at 0.51
 *      (0.09, none of it in a first season: the old gate asked for a 22 year old).
 *    Defensive Player 0.07 to 0.08 (0.08), Sixth Man 0.32 to 0.35 (0.32 to 0.36) and Most Improved 0.17 to
 *      0.18 (0.19), each set at main's rate for want of a better one. */
const G_ALL_STAR = -0.18;
const G_ALL_NBA = -0.13;
const G_MVP = -0.33;
const G_ALL_DEF = 0.2;
const G_DPOY = 0.24;
const G_ROOKIE = -2.39;
/** The two All-Rookie teams, on their own grade. One grade for the whole rookie class put more than half of
 *  all first seasons on a team (the Rookie of the Year's grade is that low because a rookie is judged against
 *  the field of EVERY season, where he sits about one sd under an average year), bench rookies at 5 points a
 *  game among them. This one is set so the share of first seasons on a team is the real class's, 10 picks of
 *  about 45 rookies who play (section B2 of the harness holds it). */
const G_ALL_ROOKIE = -1.8;
const G_SIXTH = -0.64;
const G_MIP = -0.17;
/** Defensive Player goes to big men far more often than to wings and guards. An estimate, and named as one. */
const DPOY_POS_EXTRA: Record<string, number> = { C: 0, PF: 0, SF: 0.3, SG: 0.6, PG: 0.6 };
/** The grades as the pass applies them, for the harness that fits and fences them. */
export const NBA_AWARD_GRADES = { allStar: G_ALL_STAR, allNba: G_ALL_NBA, mvp: G_MVP, allDef: G_ALL_DEF, dpoy: G_DPOY, rookie: G_ROOKIE, allRookie: G_ALL_ROOKIE, sixth: G_SIXTH, mip: G_MIP } as const;

export interface NbaAwardInput {
  pos: string;
  /** NBA_ARCH_DEFENSE[archetype.id].rep: negative means voters rate his defence. */
  defenceRep: number;
  bench: boolean;
  rookie: boolean;
  year: number;
  seasonLength: number;
  games: number;
  /** The raw saved averages. The pass divides the era's level out itself. */
  ppg: number; rpg: number; apg: number; spg: number; bpg: number;
  /** The club's wins over its games, 0 to 1. */
  winShare: number;
  madePlayoffs: boolean;
  /** 0 to 100 at tip off: the fan vote. */
  fanbase: number;
  /** Last season's raw line and ITS year (a suspended year can sit between two seasons). */
  prev: { year: number; games: number; ppg: number; rpg: number; apg: number } | null;
  /** Any All-NBA selection before this season. */
  everAllNba: boolean;
}
export interface NbaAwardResult {
  awards: string[];
  allStar?: 'starter' | 'reserve';
  allNbaTeam?: 1 | 2 | 3;
  allDefensiveTeam?: 1 | 2;
  allRookieTeam?: 1 | 2;
}
/** Always exactly nine draws, in this order, used or not: the league, its defenders, the rookie class, the
 *  benches, the improvers (a gumbel each), then the scoring, rebounding and assists leaders' bars and the fan
 *  vote's wobble (a flat draw each). */
export const NBA_AWARD_DRAWS = 9;

const zOf = (x: number, row: Row): number => (row[1] > 0 ? (x - row[0]) / row[1] : 0);
/** The bar `slots` picks out of `pool` set this year, in standard deviations, at the family's draw `g`. */
const bar = (pool: number, slots: number, grade: number, g: number): number => bestOfNAt(Math.max(1.2, pool / Math.max(1, slots)), g) + grade;

/** What the pass reads off a season before any draw: the scores on the era neutral line and the two games
 *  tests. Exported so the harness measures NBA_FIELD on exactly the numbers the awards are decided on. */
export interface NbaAwardValues {
  mvp: number; defense: number; production: number; benchPts: number;
  /** This season's production minus last season's, or null when there is no last season of 40 games. */
  jump: number | null;
  /** The game's own floor for every award here, in every era: nobody is honoured for 30 games. */
  half: boolean;
  /** The real games rule: 65 of 82 from 2023-24 for the five awards it names, nothing before. */
  overBar: boolean;
}
export function nbaAwardValues(x: NbaAwardInput): NbaAwardValues {
  const now = nbaEraNeutral({ ppg: x.ppg, rpg: x.rpg, apg: x.apg, spg: x.spg, bpg: x.bpg }, x.year);
  const production = nbaProduction(now.ppg, now.rpg, now.apg);
  let jump: number | null = null;
  if (x.prev && x.prev.games >= 40) {
    const was = nbaEraNeutral({ ppg: x.prev.ppg, rpg: x.prev.rpg, apg: x.prev.apg }, x.prev.year);
    jump = production - nbaProduction(was.ppg, was.rpg, was.apg);
  }
  return {
    mvp: nbaMvpValue(production, x.winShare, NBA_CAREER_MVP_WIN_WEIGHT),
    defense: nbaDefenseValue(now.spg ?? 0, now.bpg ?? 0, now.rpg),
    production, benchPts: now.ppg, jump,
    half: x.games * 2 >= x.seasonLength,
    overBar: x.games >= nbaAwardGamesBar(x.year, x.seasonLength, NBA_AWARD_RULES),
  };
}

export function decideNbaAwards(rng: () => number, x: NbaAwardInput): NbaAwardResult {
  const g1 = gumbel(rng); const g2 = gumbel(rng); const g3 = gumbel(rng); const g4 = gumbel(rng); const g5 = gumbel(rng);
  const u6 = rng(); const u7 = rng(); const u8 = rng(); const u9 = rng();
  const R = NBA_AWARD_RULES;
  const v = nbaAwardValues(x);
  const fieldRow = (t: Record<string, Row>): Row => t[x.pos] ?? t.PG;
  const zMvp = zOf(v.mvp, fieldRow(NBA_FIELD.mvp));
  const zDef = zOf(v.defense, fieldRow(NBA_FIELD.defense)) - x.defenceRep;
  const zProd = zOf(v.production, fieldRow(NBA_FIELD.production));
  const zBench = zOf(v.benchPts, NBA_FIELD.bench);
  const zFans = zOf(x.fanbase, NBA_FIELD.fans) + (u9 - 0.5);
  const { half, overBar } = v;
  const out: NbaAwardResult = { awards: [] };

  /* The year's league: All-NBA first, then MVP, then the All-Star Game. Teams in order, first to third. */
  if (half && overBar) {
    if (zMvp > bar(150, 5, G_ALL_NBA, g1)) out.allNbaTeam = 1;
    else if (zMvp > bar(150, 10, G_ALL_NBA, g1)) out.allNbaTeam = 2;
    else if (zMvp > bar(150, R.allNbaPicks, G_ALL_NBA, g1)) out.allNbaTeam = 3;
  }
  const mvp = out.allNbaTeam === 1 && x.madePlayoffs && zMvp > bar(150, 1, G_MVP, g1);
  if (half) {
    /* Starters by the weighted vote (the fans alone before the weights came in), reserves on the season. */
    const fanShare = x.year >= R.allStarFanShareFrom ? R.allStarFanShare : 1;
    /* One more gate, like "any All-NBA season is at least a reserve": an All-NBA First Team season starts.
       The fan vote here is the fanbase, which barely follows the season being had, so without this the
       League MVP read "All-Star reserve" in 43 percent of MVP seasons (84 percent before 2016-17) and only
       a quarter of All-Stars started, where the real game starts 10 of 24. */
    const firstTeam = out.allNbaTeam === 1;
    /* And nobody is voted a starter off his own club's bench, whatever his following: before this gate one
       All-Star starter in 30 had sat on the bench all season (one in 8 before 2016-17, backups at 6 points a
       game among them). A bench man can still be picked as a reserve on his season. */
    const voted = !x.bench && fanShare * zFans + (1 - fanShare) * zMvp > bar(150, R.allStarStarters, G_ALL_STAR, g1);
    if (firstTeam || voted) out.allStar = 'starter';
    else if (zMvp > bar(150, R.allStarPicks, G_ALL_STAR, g1) || out.allNbaTeam) out.allStar = 'reserve';
  }

  /* The year's defenders. */
  if (half && overBar) {
    if (zDef > bar(150, 5, G_ALL_DEF, g2)) out.allDefensiveTeam = 1;
    else if (zDef > bar(150, R.allDefensivePicks, G_ALL_DEF, g2)) out.allDefensiveTeam = 2;
  }
  const dpoy = out.allDefensiveTeam !== undefined && zDef > bar(150, 1, G_DPOY + (DPOY_POS_EXTRA[x.pos] ?? 0.6), g2);

  /* The rookie class: a first season only. The two teams have a grade of their own (see G_ALL_ROOKIE). */
  if (x.rookie && half) {
    if (zProd > bar(45, 5, G_ALL_ROOKIE, g3)) out.allRookieTeam = 1;
    else if (zProd > bar(45, R.allRookiePicks, G_ALL_ROOKIE, g3)) out.allRookieTeam = 2;
  }
  const roy = out.allRookieTeam === 1 && zProd > bar(45, 1, G_ROOKIE, g3);

  /* The benches. The real award carries no games rule. */
  const sixth = x.bench && half && zBench > bar(60, 1, G_SIXTH, g4);

  /* The improvers: a real jump on a real last season, by a man the league did not already know. */
  const mip = v.jump !== null && half && overBar && !x.everAllNba && !mvp
    && zOf(v.jump, NBA_FIELD.jump) > bar(150, 1, G_MIP, g5);

  /* The three stat titles: he qualifies by that season's real minimum, and his RAW average beats a bar drawn
     around that era's league leaders (their mean, give or take 1.73 of their standard deviations). */
  const title = (stat: 'pts' | 'reb' | 'ast', avg: number, u: number): boolean => {
    const b = nbaLeaderBar(stat, x.year);
    /* A short season of the old era carries its own minimum (2011-12: 56 games or its own totals). */
    const short = x.seasonLength < R.gamesBarOf ? R.statTitleShortBefore[x.year] : undefined;
    return half && nbaQualifiesForStatTitle(x.games, avg * x.games, R.statTitleTotalsBefore[stat], x.year, x.seasonLength, R,
      short ? { games: short.games, total: short.totals[stat] } : undefined)
      && avg >= b.mean + b.sd * (u - 0.5) * 3.46;
  };
  const scoring = title('pts', x.ppg, u6);
  const rebounding = title('reb', x.rpg, u7);
  const assists = title('ast', x.apg, u8);

  /* The saved strings, in the order the season card has always listed them, All-Star first. */
  if (out.allStar) out.awards.push('All-Star');
  if (roy) out.awards.push('Rookie of the Year');
  if (out.allNbaTeam) out.awards.push('All-NBA');
  if (mvp) out.awards.push('MVP');
  if (dpoy) out.awards.push('Defensive Player of the Year');
  if (out.allDefensiveTeam) out.awards.push('All-Defensive Team');
  if (scoring) out.awards.push('Scoring Champion');
  if (assists) out.awards.push('Assists Leader');
  if (rebounding) out.awards.push('Rebounding Champion');
  if (mip) out.awards.push('Most Improved Player');
  if (sixth) out.awards.push('Sixth Man of the Year');
  if (out.allRookieTeam) out.awards.push('All-Rookie Team');
  return out;
}

/** The worked example the "?" prints, as numbers: a line, a club record, and the same line on a losing club.
 *  The sentence below is built from these, so the words cannot drift from the score. */
export const NBA_MVP_EXAMPLE = { ppg: 27.4, rpg: 6.1, apg: 5.3, wins: 54, losses: 28, losingWins: 34, losingLosses: 48 } as const;

/** The award rules the page's "?" adds, built from the rule numbers the pass applies. */
export function nbaAwardHelpRules(): string[] {
  const R = NBA_AWARD_RULES;
  const season = (startYear: number): string => `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
  const e = NBA_MVP_EXAMPLE;
  const production = nbaProduction(e.ppg, e.rpg, e.apg);
  const share = e.wins / (e.wins + e.losses);
  const total = nbaMvpValue(production, share, NBA_CAREER_MVP_WIN_WEIGHT);
  return [
    `MVP only goes to an All-NBA First Team player whose club made the playoffs. The score is your points plus rebounds plus assists a game, plus ${NBA_CAREER_MVP_WIN_WEIGHT} times your club's winning share, the same score NBA Front Office uses.`,
    `From the ${season(R.gamesBarFrom)} season on, All-NBA, MVP, Defensive Player of the Year, All-Defensive and Most Improved need ${R.gamesBar} games. Before that season there is no games rule, and Rookie of the Year, All-Rookie and Sixth Man never carry it. The real rule's exception for a season ending injury is not in the game. The game adds one floor of its own: nothing but a Finals MVP is won on less than half a season.`,
    `All-Star is ${R.allStarPicks} picks a season. Half of a starter's case is the fan vote, which here is your fanbase (in seasons before ${season(R.allStarFanShareFrom)} the fans pick the starters alone), and the reserves are picked on the season you are having. Every All-NBA season is an All-Star season, an All-NBA First Team season starts the game, and nobody is voted a starter in a season he spent on his own club's bench.`,
    'All-Defensive and Defensive Player of the Year read your defence: steals plus blocks plus half your rebounds a game, against your own position. The kind of player you built counts for a lot here: the defenders by trade (The Pest, Two-Way Menace, 3-and-D Wing, Defensive Anchor) take most of these, a big man who lives on the glass takes some, and a scorer by trade almost never does.',
    'All-Rookie is for your first season only, and the Rookie of the Year is always on the first team.',
    'Most Improved never goes to a player who has already made All-NBA, or to that season\'s MVP.',
    'To lead the league in points, rebounds or assists you need that season\'s real minimum of games and an average that beats the league leaders of the era you play in.',
    'A season card shows points, rebounds and assists on its line and your minutes, steals and blocks in a note. Seasons you played before this update keep the line they were saved with: whole number points and no minutes, steals or blocks.',
    `An MVP case by the numbers: you average ${e.ppg.toFixed(1)} points, ${e.rpg.toFixed(1)} rebounds and ${e.apg.toFixed(1)} assists and your club goes ${e.wins}-${e.losses}. That is ${production.toFixed(1)} for the production plus ${NBA_CAREER_MVP_WIN_WEIGHT} times ${share.toFixed(3).replace(/^0/, '')} for the winning: ${total.toFixed(1)}. Make the All-NBA First Team with that on a playoff club and you are in the MVP race. Put up the same line on a ${e.losingWins}-${e.losingLosses} club and you are not, whatever the numbers say.`,
  ];
}
