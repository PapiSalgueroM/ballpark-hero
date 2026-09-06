/* ─── Round 469: badges for career peaks. Round 470: in four sports ─────────

   His list for the flagship (docs/TWEAKS-2026-08-28.md): "badges for career
   peaks (Ballon d'Or, first billion)". Neither career had them. The trophy
   case counts awards and rings, and the legacy verdict sums them, but the
   moments in between (the first 10,000 yards, the season you did not miss a
   game, the first million actually banked) went by with nothing to show.

   A badge is a pure test on the facts of a career, evaluated every time the
   case is opened, so it can never go stale and never needs a save field: if
   the facts hold, it is earned. The evaluator is one function for every
   sport; the table is the sport.

   THRESHOLDS, AND WHAT THEY CLAIM. Every number here is either a round
   milestone the game hands out (10,000 yards, 100 sacks, a decade) or a
   record the engine already sources inline in nflMyCareer.ts: Peyton
   Manning's 5,477 passing yards in 2013 and Eric Dickerson's 2,105 rushing
   yards in 1984, both per Pro Football Reference's single season leaders,
   Myles Garrett's 23.0 sacks in 2025 per the same table, and the ten first
   team All-Pro selections Jerry Rice and Jim Otto share per the note in
   careerAwards.ts. No badge blurb states how many real players have reached
   a mark, because that is a number that moves every season and this file
   cannot keep it true.

   ROUND 470 ADDS THE OTHER THREE, and the same rule governs their numbers.
   Where the engine's own ceiling sits below the real record, the badge sits at
   the highest real milestone the engine can actually reach and the record is
   named beside it rather than used as the bar: baseball caps a season at 58
   home runs and a .365 average, so the badges are 50 and .330, and the copy
   says what the record is. Every record named below was checked against two
   sources on 2026-09-06:

     Wilt Chamberlain's 50.4 points a game in 1961-62, the single season
       scoring average record, per NBA.com's season recap and Britannica.
     Barry Bonds' 73 home runs in 2001, the single season record, per ESPN
       and the Washington Post.
     Rickey Henderson's 130 stolen bases in 1982, the single season record,
       per the Baseball Hall of Fame and MLB.com.
     Ted Williams' .406 in 1941, the last .400 season, per the Baseball Hall
       of Fame and HISTORY.
     Nolan Ryan's 5,714 career strikeouts, the record, per Baseball Reference
       and MLB.com.
     Wayne Gretzky's 92 goals in 1981-82 and 215 points in 1985-86, both
       single season records, per NHL.com and The Hockey Writers.
     The 48 win season shared by Martin Brodeur in 2006-07 and Braden Holtby
       in 2015-16, per The Hockey News and Sports Illustrated.

   Every badge must be reachable. scripts/simCareerParity.mjs drives seeded
   careers, ordinary and forced elite across every position and archetype, and
   fails if any badge in any table is never earned, because a badge nobody can
   earn is dead words in a case. */

export interface BadgeDef<F> {
  id: string;
  emoji: string;
  label: string;
  /** One line, plain, saying what the badge is for. */
  blurb: string;
  test: (f: F) => boolean;
}

/** The badges from a table that the facts satisfy, in table order. */
export function earnedBadges<F>(defs: BadgeDef<F>[], f: F): BadgeDef<F>[] {
  return defs.filter(d => d.test(f));
}

/* ─── the parts every sport's table needs ────────────────────────────────────
   Written once here rather than four times below, because Round 426 is what
   happens when the same idea gets written twice. */

/** The bits of a career every table reads the same way: a rival you finished
 *  ahead of, the money, the seasons played, and the verdict. */
export interface CareerPeakFacts {
  /** Cash, savings and holdings together, in millions. */
  wealth: number;
  /** Seasons where the schedule was played in full for this position. */
  fullSeasons: number;
  retired: boolean;
  hof: boolean;
  rival: { retired: boolean; myYears: number; hisYears: number } | null;
}

/** Won the title in two seasons running. */
export function wentBackToBack(seasons: { teamResult: string }[], title: string): boolean {
  for (let i = 1; i < seasons.length; i += 1) {
    if (seasons[i].teamResult === title && seasons[i - 1].teamResult === title) return true;
  }
  return false;
}

/** Took a named award in any season. */
export const tookAward = (seasons: { awards: string[] }[], award: string): boolean =>
  seasons.some(s => s.awards.includes(award));

/** The five closing badges every sport ends its case with, so a player moving
 *  between them finds the same last row. Only two sentences change: what a
 *  full season is in that sport, and where the jacket is handed out. */
function closingBadges<F extends CareerPeakFacts>(ironBlurb: string, hofBlurb: string): BadgeDef<F>[] {
  return [
    { id: 'iron_man', emoji: '🩺', label: 'Iron man', blurb: ironBlurb, test: f => f.fullSeasons >= 5 },
    { id: 'first_million', emoji: '🪙', label: 'First million', blurb: 'A million dollars to your name, cash, savings and holdings together.', test: f => f.wealth >= 1 },
    { id: 'hundred_million', emoji: '💰', label: '$100M to your name', blurb: 'A hundred million dollars, cash, savings and holdings together.', test: f => f.wealth >= 100 },
    { id: 'rivalry', emoji: '🪞', label: 'Won the rivalry', blurb: 'Your draft class rival retired behind you in the head to head.', test: f => !!f.rival && f.rival.retired && f.rival.myYears > f.rival.hisYears },
    { id: 'hall', emoji: '🏛️', label: 'Hall of Famer', blurb: hofBlurb, test: f => f.retired && f.hof },
  ];
}

/* ─── NFL ────────────────────────────────────────────────────────────────── */

/** Only what the tests read. Built by nflBadgeFacts from a CareerState. */
export interface NflBadgeFacts extends CareerPeakFacts {
  pos: string;
  seasons: {
    games: number;
    awards: string[];
    teamResult: string;
    passYds?: number; rushYds?: number; sacks?: number;
  }[];
  rings: number;
  mvps: number;
  allPros: number;
  totals: {
    passYds: number; rushYds: number; recYds: number; recTd: number;
    sacks: number; picks: number; tackles: number; fgMade: number;
  };
}

export const NFL_BADGES: BadgeDef<NflBadgeFacts>[] = [
  { id: 'ring', emoji: '💍', label: 'Super Bowl champion', blurb: 'A ring. The one everything else is measured against.', test: f => f.rings >= 1 },
  { id: 'back_to_back', emoji: '👑', label: 'Back to back', blurb: 'Two Super Bowls in two seasons.', test: f => wentBackToBack(f.seasons, 'WON THE SUPER BOWL') },
  { id: 'mvp', emoji: '🏆', label: 'League MVP', blurb: 'The best player in the league for one year.', test: f => f.seasons.some(s => s.awards.includes('MVP')) },
  { id: 'dpoy', emoji: '🛡️', label: 'Defensive Player of the Year', blurb: 'The best defender in the league for one year.', test: f => f.seasons.some(s => s.awards.includes('Defensive Player of the Year')) },
  { id: 'roy', emoji: '🌱', label: 'Rookie of the Year', blurb: 'The best first year player on your side of the ball.', test: f => f.seasons.some(s => s.awards.some(a => a.endsWith('Rookie of the Year'))) },
  { id: 'all_pro_3', emoji: '⭐', label: 'Three All-Pros', blurb: 'First team All-Pro three times.', test: f => f.allPros >= 3 },
  { id: 'all_pro_10', emoji: '🌟', label: 'Ten All-Pros', blurb: 'Ten first team All-Pro selections, the mark Jerry Rice and Jim Otto share.', test: f => f.allPros >= 10 },
  { id: 'pass_10k', emoji: '🎯', label: '10,000 passing yards', blurb: 'Ten thousand career yards through the air.', test: f => f.totals.passYds >= 10000 },
  { id: 'pass_50k', emoji: '🚀', label: '50,000 passing yards', blurb: 'Fifty thousand career passing yards.', test: f => f.totals.passYds >= 50000 },
  { id: 'pass_5k_season', emoji: '💥', label: 'A 5,000 yard season', blurb: 'Five thousand passing yards in one year. The record is 5,477.', test: f => f.seasons.some(s => (s.passYds ?? 0) >= 5000) },
  { id: 'rush_10k', emoji: '🏃', label: '10,000 rushing yards', blurb: 'Ten thousand career yards on the ground.', test: f => f.totals.rushYds >= 10000 },
  { id: 'rush_2k_season', emoji: '🌪️', label: 'A 2,000 yard season', blurb: 'Two thousand rushing yards in one year. The record is 2,105.', test: f => f.seasons.some(s => (s.rushYds ?? 0) >= 2000) },
  { id: 'rec_10k', emoji: '🙌', label: '10,000 receiving yards', blurb: 'Ten thousand career receiving yards.', test: f => f.totals.recYds >= 10000 },
  { id: 'rec_td_75', emoji: '🔥', label: '75 receiving touchdowns', blurb: 'Seventy five career catches in the end zone.', test: f => f.totals.recTd >= 75 },
  { id: 'sacks_100', emoji: '💣', label: '100 sacks', blurb: 'A hundred career sacks.', test: f => f.totals.sacks >= 100 },
  { id: 'sack_20_season', emoji: '🧨', label: 'A 20 sack season', blurb: 'Twenty sacks in one year. The record is 23.', test: f => f.seasons.some(s => (s.sacks ?? 0) >= 20) },
  { id: 'picks_30', emoji: '🧤', label: '30 interceptions', blurb: 'Thirty career interceptions.', test: f => f.totals.picks >= 30 },
  { id: 'tackles_1000', emoji: '🧱', label: '1,000 tackles', blurb: 'A thousand career tackles.', test: f => f.totals.tackles >= 1000 },
  { id: 'fg_300', emoji: '🦵', label: '300 field goals', blurb: 'Three hundred career field goals.', test: f => f.totals.fgMade >= 300 },
  { id: 'decade', emoji: '📅', label: 'A decade in the league', blurb: 'Ten seasons played.', test: f => f.seasons.length >= 10 },
  ...closingBadges<NflBadgeFacts>('Five full seasons without missing a game.', 'The legacy verdict says Canton.'),
];

/* ─── NBA ────────────────────────────────────────────────────────────────────
   Points, rebounds and assists are the whole season line, so they are the
   whole counting half of the case. The scoring average badge sits at 30, a
   number a real all time scorer lives at, with Chamberlain's 50.4 named
   beside it as the ceiling nobody has been near since. */

export interface NbaBadgeFacts extends CareerPeakFacts {
  pos: string;
  seasons: {
    games: number; awards: string[]; teamResult: string;
    ppg: number; rpg: number; apg: number;
  }[];
  rings: number;
  finalsMvps: number;
  allNbas: number;
  totals: { pts: number; reb: number; ast: number };
}

export const NBA_BADGES: BadgeDef<NbaBadgeFacts>[] = [
  { id: 'ring', emoji: '💍', label: 'NBA champion', blurb: 'A ring. The one everything else is measured against.', test: f => f.rings >= 1 },
  { id: 'back_to_back', emoji: '👑', label: 'Back to back', blurb: 'Two titles in two seasons.', test: f => wentBackToBack(f.seasons, 'WON THE NBA FINALS') },
  { id: 'mvp', emoji: '🏆', label: 'League MVP', blurb: 'The best player in the league for one year.', test: f => tookAward(f.seasons, 'MVP') },
  { id: 'finals_mvp', emoji: '🏅', label: 'Finals MVP', blurb: 'The best player in the series that decided it.', test: f => f.finalsMvps >= 1 },
  { id: 'dpoy', emoji: '🛡️', label: 'Defensive Player of the Year', blurb: 'The best defender in the league for one year.', test: f => tookAward(f.seasons, 'Defensive Player of the Year') },
  { id: 'roy', emoji: '🌱', label: 'Rookie of the Year', blurb: 'The best first year player in the league.', test: f => tookAward(f.seasons, 'Rookie of the Year') },
  { id: 'scoring_title', emoji: '🔥', label: 'Scoring champion', blurb: 'Led the league in scoring across a season.', test: f => tookAward(f.seasons, 'Scoring Champion') },
  { id: 'all_nba_3', emoji: '⭐', label: 'Three All-NBAs', blurb: 'All-NBA three times.', test: f => f.allNbas >= 3 },
  { id: 'all_nba_10', emoji: '🌟', label: 'Ten All-NBAs', blurb: 'Ten All-NBA selections.', test: f => f.allNbas >= 10 },
  { id: 'ppg_30', emoji: '💥', label: 'A 30 point season', blurb: 'Thirty a night across a whole season. The record average is 50.4.', test: f => f.seasons.some(s => s.ppg >= 30 && s.games >= 58) },
  { id: 'triple_double', emoji: '📊', label: 'Triple double season', blurb: 'Points, rebounds and assists all in double figures for a season.', test: f => f.seasons.some(s => s.ppg >= 10 && s.rpg >= 10 && s.apg >= 10 && s.games >= 58) },
  { id: 'pts_20k', emoji: '🎯', label: '20,000 points', blurb: 'Twenty thousand career points.', test: f => f.totals.pts >= 20000 },
  { id: 'pts_30k', emoji: '🚀', label: '30,000 points', blurb: 'Thirty thousand career points.', test: f => f.totals.pts >= 30000 },
  { id: 'reb_10k', emoji: '🧲', label: '10,000 rebounds', blurb: 'Ten thousand career rebounds.', test: f => f.totals.reb >= 10000 },
  { id: 'ast_10k', emoji: '🤝', label: '10,000 assists', blurb: 'Ten thousand career assists.', test: f => f.totals.ast >= 10000 },
  { id: 'decade', emoji: '📅', label: 'A decade in the league', blurb: 'Ten seasons played.', test: f => f.seasons.length >= 10 },
  ...closingBadges<NbaBadgeFacts>('Five seasons with all 82 games played.', 'The legacy verdict says Springfield.'),
];

/* ─── MLB ────────────────────────────────────────────────────────────────────
   Two careers in one clubhouse: a pitcher's badges are the ERA, the wins and
   the strikeouts, a hitter's are the bat and the legs, and the closing five
   are the same as everywhere. The single season badges sit below the real
   records because simMlbSeason caps a year at 58 home runs, a .365 average
   and roughly 70 steals, and the copy names the record rather than pretending
   the badge is one. */

export interface MlbBadgeFacts extends CareerPeakFacts {
  pos: string;
  seasons: {
    games: number; awards: string[]; teamResult: string;
    avg?: number; hr?: number; sb?: number; era?: number;
  }[];
  rings: number;
  mvpCys: number;
  allStars: number;
  totals: { hr: number; rbi: number; sb: number; wins: number; so: number; saves: number };
}

export const MLB_BADGES: BadgeDef<MlbBadgeFacts>[] = [
  { id: 'ring', emoji: '💍', label: 'World Series champion', blurb: 'A ring, and a parade down the middle of the city.', test: f => f.rings >= 1 },
  { id: 'back_to_back', emoji: '👑', label: 'Back to back', blurb: 'Two World Series in two seasons.', test: f => wentBackToBack(f.seasons, 'WON THE WORLD SERIES') },
  { id: 'mvp_cy', emoji: '🏆', label: 'MVP or Cy Young', blurb: 'The biggest individual award your side of the ball has.', test: f => f.mvpCys >= 1 },
  { id: 'roy', emoji: '🌱', label: 'Rookie of the Year', blurb: 'The best first year player in the league.', test: f => tookAward(f.seasons, 'Rookie of the Year') },
  { id: 'all_star_5', emoji: '⭐', label: 'Five All-Star nods', blurb: 'Picked for the All-Star team five times.', test: f => f.allStars >= 5 },
  { id: 'all_star_10', emoji: '🌟', label: 'Ten All-Star nods', blurb: 'Picked for the All-Star team ten times.', test: f => f.allStars >= 10 },
  { id: 'gold_glove', emoji: '🧤', label: 'Gold Glove', blurb: 'The best fielder at your position for a year.', test: f => tookAward(f.seasons, 'Gold Glove') },
  { id: 'slugger', emoji: '🥈', label: 'Silver Slugger', blurb: 'The best bat at your position for a year.', test: f => tookAward(f.seasons, 'Silver Slugger') },
  { id: 'batting_title', emoji: '🏅', label: 'Batting title', blurb: 'The highest average in the league.', test: f => tookAward(f.seasons, 'Batting Title') },
  { id: 'hr_champ', emoji: '💣', label: 'Home run champion', blurb: 'Led the league in home runs.', test: f => tookAward(f.seasons, 'Home Run Champion') },
  { id: 'hr_50', emoji: '🚀', label: 'A 50 home run season', blurb: 'Fifty in one year. The single season record is 73.', test: f => f.seasons.some(s => (s.hr ?? 0) >= 50) },
  { id: 'avg_330', emoji: '🎯', label: 'A .330 season', blurb: 'A .330 average over a full year. Nobody has hit .400 since 1941.', test: f => f.seasons.some(s => (s.avg ?? 0) >= 0.33 && s.games >= 120) },
  { id: 'sb_50', emoji: '💨', label: 'A 50 steal season', blurb: 'Fifty bags in one year. The single season record is 130.', test: f => f.seasons.some(s => (s.sb ?? 0) >= 50) },
  { id: 'hr_500', emoji: '🧱', label: '500 home runs', blurb: 'Five hundred career home runs.', test: f => f.totals.hr >= 500 },
  { id: 'rbi_1500', emoji: '📈', label: '1,500 driven in', blurb: 'Fifteen hundred career runs batted in.', test: f => f.totals.rbi >= 1500 },
  { id: 'sb_400', emoji: '🏃', label: '400 stolen bases', blurb: 'Four hundred career steals.', test: f => f.totals.sb >= 400 },
  { id: 'era_200', emoji: '🧊', label: 'A sub 2.00 season', blurb: 'An ERA under 2.00 across a full year on the mound.', test: f => f.seasons.some(s => (s.era ?? 99) <= 2 && s.games >= 20) },
  { id: 'wins_300', emoji: '🥎', label: '300 wins', blurb: 'Three hundred career wins on the mound.', test: f => f.totals.wins >= 300 },
  { id: 'so_3000', emoji: '🔥', label: '3,000 strikeouts', blurb: 'Three thousand career strikeouts. The record is 5,714.', test: f => f.totals.so >= 3000 },
  { id: 'saves_300', emoji: '🚪', label: '300 saves', blurb: 'Three hundred career saves out of the bullpen.', test: f => f.totals.saves >= 300 },
  { id: 'decade', emoji: '📅', label: 'A decade in the league', blurb: 'Ten seasons played.', test: f => f.seasons.length >= 10 },
  ...closingBadges<MlbBadgeFacts>('Five seasons with the whole schedule worked, whatever your job is.', 'The legacy verdict says Cooperstown.'),
];

/* ─── NHL ────────────────────────────────────────────────────────────────────
   The goalie's half of this case is wins and a save percentage and nothing
   else, because that is the whole of his season line. The two single season
   skater badges sit at the round numbers hockey has always used, with
   Gretzky's 92 and 215 named beside them. */

export interface NhlBadgeFacts extends CareerPeakFacts {
  pos: string;
  seasons: {
    games: number; awards: string[]; teamResult: string;
    goals?: number; points?: number; wins?: number; svpct?: number;
  }[];
  cups: number;
  harts: number;
  connSmythes: number;
  allStars: number;
  totals: { goals: number; assists: number; points: number; wins: number };
}

export const NHL_BADGES: BadgeDef<NhlBadgeFacts>[] = [
  { id: 'cup', emoji: '💍', label: 'Stanley Cup champion', blurb: 'Your name goes on the Cup, and it stays there.', test: f => f.cups >= 1 },
  { id: 'back_to_back', emoji: '👑', label: 'Back to back', blurb: 'Two Cups in two seasons.', test: f => wentBackToBack(f.seasons, 'WON THE STANLEY CUP') },
  { id: 'major', emoji: '🏆', label: 'The major', blurb: 'The Hart, the Vezina or the Norris, whichever your position plays for.', test: f => f.harts >= 1 },
  { id: 'smythe', emoji: '🎖️', label: 'Conn Smythe', blurb: 'The best player in the run that won it.', test: f => f.connSmythes >= 1 },
  { id: 'calder', emoji: '🌱', label: 'Calder Trophy', blurb: 'The best first year player in the league.', test: f => tookAward(f.seasons, 'Calder Trophy') },
  { id: 'art_ross', emoji: '🎩', label: 'Art Ross', blurb: 'Most points in the league across a season.', test: f => tookAward(f.seasons, 'Art Ross') },
  { id: 'richard', emoji: '🚀', label: 'Rocket Richard', blurb: 'Most goals in the league across a season.', test: f => tookAward(f.seasons, 'Rocket Richard') },
  { id: 'all_star_5', emoji: '⭐', label: 'Five All-Star nods', blurb: 'Picked for the All-Star team five times.', test: f => f.allStars >= 5 },
  { id: 'all_star_10', emoji: '🌟', label: 'Ten All-Star nods', blurb: 'Picked for the All-Star team ten times.', test: f => f.allStars >= 10 },
  { id: 'goals_50', emoji: '💥', label: 'A 50 goal season', blurb: 'Fifty in one season. The single season record is 92.', test: f => f.seasons.some(s => (s.goals ?? 0) >= 50) },
  { id: 'points_100', emoji: '📈', label: 'A 100 point season', blurb: 'A hundred points in one season. The record is 215.', test: f => f.seasons.some(s => (s.points ?? 0) >= 100) },
  { id: 'goals_500', emoji: '🥅', label: '500 goals', blurb: 'Five hundred career goals.', test: f => f.totals.goals >= 500 },
  { id: 'points_1000', emoji: '🧮', label: '1,000 points', blurb: 'A thousand career points.', test: f => f.totals.points >= 1000 },
  { id: 'points_1500', emoji: '🌠', label: '1,500 points', blurb: 'Fifteen hundred career points.', test: f => f.totals.points >= 1500 },
  { id: 'wins_40', emoji: '🧤', label: 'A 40 win season', blurb: 'Forty wins in the crease in one season. The record is 48, shared.', test: f => f.seasons.some(s => (s.wins ?? 0) >= 40) },
  { id: 'svpct_930', emoji: '🧱', label: 'A .930 season', blurb: 'A .930 save percentage across a season in the crease.', test: f => f.seasons.some(s => (s.svpct ?? 0) >= 0.93 && s.games >= 40) },
  { id: 'wins_400', emoji: '🚪', label: '400 wins', blurb: 'Four hundred career wins in the crease.', test: f => f.totals.wins >= 400 },
  { id: 'decade', emoji: '📅', label: 'A decade in the league', blurb: 'Ten seasons played.', test: f => f.seasons.length >= 10 },
  ...closingBadges<NhlBadgeFacts>('Five seasons with the whole schedule played.', 'The legacy verdict says the Hall.'),
];
