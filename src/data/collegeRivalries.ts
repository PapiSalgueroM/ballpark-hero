/**
 * Round 1554: the real rivalry series both college dynasties pair first.
 *
 * Rivalry week (football) and rivalry night (hoops) used to pair schools by
 * state, then by prestige, so Ohio State never met Michigan on rivalry week:
 * Michigan drew Michigan State as the in-state game. src/lib/collegeProgram.ts
 * (buildRivalries) now takes this table first, then the in-state pairs, and
 * only then a pairing the game makes, which it still says it made.
 *
 * WHAT A ROW CLAIMS, AND NOTHING MORE: the two schools have a real rivalry
 * series. It never claims the series is played every year or in the last
 * week, and the game shows it only as "a real rivalry series". `name` is
 * shown beside it, and it is filled only where BOTH sources use that name;
 * where a name is new, disputed or not on both, it is left out (Baylor and
 * TCU formalised a new name in 2023, and the Kansas State and Iowa State
 * nickname is one the schools have pushed back on, so neither carries one).
 *
 * Every row was checked on 2026-10-22 on two publishers that are not a wiki
 * (the schools' own athletics sites, the NCAA, ESPN, CBS, SI, local news).
 * In the comment above every row are its two sources. Each school appears in at most one row per sport, since every school has
 * exactly one rival for the week. Rows whose schools are not both in a game
 * are not here: Georgia and Georgia Tech, Louisville and Kentucky in
 * football, Arizona State and Arizona, and so on fall to the in-state or
 * generated pairing. A row that cannot be checked twice is never added.
 *
 * School ids are each engine's own (src/lib/cfbDynasty.ts CFB_SCHOOLS,
 * src/lib/cbbDynasty.ts CBB_SCHOOLS); scripts/simCfbSlate.mjs fails on an id
 * that is not a school, a school in two rows, or a row without two sources.
 */

export interface RivalrySeries {
  a: string;
  b: string;
  /** The series' own name, only where both sources give it. */
  name?: string;
}

export const CFB_RIVALRY_SERIES: RivalrySeries[] = [
  // sources: https://www.ncaa.com/news/football/article/2021-11-27/ohio-state-vs-michigan-football-series-history-scores-notable-games
  //          https://www.si.com/fannation/college/cfb-hq/news/ohio-state-vs-michigan-football-the-game-scores
  { a: 'OSU', b: 'MICH', name: 'The Game' },
  // sources: https://encyclopediaofalabama.org/article/iron-bowl/
  //          https://www.ncaa.com/news/football/article/2018-02-22/alabama-auburn-football-teams-played-1st-iron-bowl-feb-22-1893
  { a: 'ALA', b: 'AUB', name: 'the Iron Bowl' },
  // sources: https://www.kbtx.com/2024/08/23/slocum-speaks-renewed-lonestar-showdown/
  //          https://www.si.com/college/tamu/football/texas-am-aggies-texas-longhorns-lone-star-showdown-return-2024-jimbo-fisher
  { a: 'TEX', b: 'A&M', name: 'the Lone Star Showdown' },
  // sources: https://www.espn.com/blog/sec/post/_/id/110980
  //          https://local10.com/sports/2019/11/28/10-most-memorable-games-in-history-of-florida-vs-florida-state-rivalry
  { a: 'FLA', b: 'FSU' },
  // sources: https://gamecocksonline.com/news/2024/11/29/palmetto-bowl-set-for-noon-saturday-nov-30/
  //          https://fbschedules.com/series-spotlight-a-brief-history-of-the-palmetto-bowl-clemson-vs-south-carolina/
  { a: 'CLEM', b: 'SCAR', name: 'the Palmetto Bowl' },
  // sources: https://abc7.com/15570925
  //          https://www.nbclosangeles.com/news/sports/usc-ucla-football-rivalry-game/3567219
  { a: 'USC', b: 'UCLA' },
  // sources: https://huskers.com/news/2016/11/21/huskers-hawkeyes-battle-for-heroes-trophy-on-abc
  //          https://lastwordonsports.com/collegefootball/2022/11/23/heroes-game-two-trophies-on-the-line-iowa/
  { a: 'IOWA', b: 'NEB', name: 'the Heroes Game' },
  // sources: https://gohuskies.com/news/2021/11/1/football-huskies-ready-for-113th-meeting-with-oregon
  //          https://fbschedules.com/series-spotlight-a-brief-history-of-the-oregon-washington-rivalry/
  { a: 'ORE', b: 'WASH' },
  // sources: https://lsusports.net/news/2008/11/17/1626915/
  //          https://olemisssports.com/news/2008/11/14/ole_miss_lsu_football_rivalry_now_the_magnolia_bowl
  { a: 'LSU', b: 'MISS', name: 'the Magnolia Bowl' },
  // sources: https://gopsusports.com/news/2020/12/07/game-notes-penn-state-vs-michigan-state
  //          https://www.psucollegian.com/football/history-of-penn-state-s-land-grant-trophy-rivalry-with-michigan-state-through-the-collegian/article_e59fe3f7-9ed5-4378-bc6b-cea64e5d6685.html
  { a: 'PSU', b: 'MSU', name: 'the Land Grant Trophy game' },
  // sources: https://www.espn.com/college-football/story/_/id/46038961/iowa-state-kansas-state-farmageddon
  //          https://www.kcrg.com/2025/08/22/farmageddon-more-like-farm-ogedden-no-22-iowa-state-no-17-kansas-state-clash-dublin/
  { a: 'KSU', b: 'ISU' },
  // sources: https://cubuffs.com/news/2011/11/22/205337728
  //          https://dailyutahchronicle.com/2020/12/11/utah-football-set-for-rumble-in-the-rockies/
  { a: 'UTAH', b: 'COL', name: 'the Rumble in the Rockies' },
  // sources: https://bn.web.baylor.edu/news/story/2022/baylor-and-tcu-meet-118th-time-gridiron
  //          https://www.si.com/college/tcu/football/2023-week-12-tcu-baylor-staff-predictions
  { a: 'TCU', b: 'BAY' },
];

export const CBB_RIVALRY_SERIES: RivalrySeries[] = [
  // sources: https://www.ncaa.com/news/basketball-men/article/2025-03-04/duke-vs-north-carolina-rivalry-wins-highlights-memorable-moments
  //          https://dukechronicle.com/article/2021/02/duke-basketball-north-carolina-tobacco-road-rivalry-history
  { a: 'DUKE', b: 'UNC' },
  // sources: https://www.si.com/college/louisville/basketball/recap-2025-26-game-3-kentucky
  //          https://spectrumnews1.com/ky/louisville/news/2025/05/07/louisville-kentucky-basketball.html
  { a: 'UK', b: 'LOU', name: 'the Battle of the Bluegrass' },
  // sources: https://www.hammerandrails.com/2016/2/17/11034554/the-rivalry-indiana-vs-purdue-best-moments
  //          https://1075thefan.com/706251/indiana-purdue-historic-rivalry/
  { a: 'IU', b: 'PUR' },
  // sources: https://msuspartans.com/news/2014/2/22/men_s_basketball_takes_on_rival_michigan.aspx
  //          https://www.si.com/college/michiganstate/basketball/spartans-michigan-wolverines-crisler-center-01jmg22n18v4
  { a: 'MICH', b: 'MSU' },
  // sources: https://gozags.com/sports/mens-basketball/opponent-history/saint-marys-college-of-california/43
  //          https://www.si.com/college/gonzaga/basketball/gonzaga-knows-what-s-at-stake-in-saint-mary-s-rivalry-game-01jjtdtxy8xw
  { a: 'ZAGA', b: 'SMC' },
];
