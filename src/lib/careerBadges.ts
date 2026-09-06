/* ─── Round 469: badges for career peaks ─────────────────────────────────────

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

   Every badge must be reachable. scripts/simCareerParity.mjs drives seeded
   careers, ordinary and forced elite, and fails if any badge in the table is
   never earned, because a badge nobody can earn is dead words in a case. */

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

/* ─── NFL ────────────────────────────────────────────────────────────────── */

/** Only what the tests read. Built by nflBadgeFacts from a CareerState. */
export interface NflBadgeFacts {
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
  /** Cash, savings and holdings together, in millions. */
  wealth: number;
  retired: boolean;
  hof: boolean;
  rival: { retired: boolean; myYears: number; hisYears: number } | null;
}

const consecutiveTitles = (f: NflBadgeFacts): boolean => {
  for (let i = 1; i < f.seasons.length; i += 1) {
    if (f.seasons[i].teamResult === 'WON THE SUPER BOWL' && f.seasons[i - 1].teamResult === 'WON THE SUPER BOWL') return true;
  }
  return false;
};

export const NFL_BADGES: BadgeDef<NflBadgeFacts>[] = [
  { id: 'ring', emoji: '💍', label: 'Super Bowl champion', blurb: 'A ring. The one everything else is measured against.', test: f => f.rings >= 1 },
  { id: 'back_to_back', emoji: '👑', label: 'Back to back', blurb: 'Two Super Bowls in two seasons.', test: consecutiveTitles },
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
  { id: 'iron_man', emoji: '🩺', label: 'Iron man', blurb: 'Five full seasons without missing a game.', test: f => f.seasons.filter(s => s.games >= 17).length >= 5 },
  { id: 'first_million', emoji: '🪙', label: 'First million', blurb: 'A million dollars to your name, cash, savings and holdings together.', test: f => f.wealth >= 1 },
  { id: 'hundred_million', emoji: '💰', label: '$100M to your name', blurb: 'A hundred million dollars, cash, savings and holdings together.', test: f => f.wealth >= 100 },
  { id: 'rivalry', emoji: '🪞', label: 'Won the rivalry', blurb: 'Your draft class rival retired behind you in the head to head.', test: f => !!f.rival && f.rival.retired && f.rival.myYears > f.rival.hisYears },
  { id: 'canton', emoji: '🏛️', label: 'Hall of Famer', blurb: 'The legacy verdict says Canton.', test: f => f.retired && f.hof },
];

/* ─── Soccer ─────────────────────────────────────────────────────────────
   Round 473. The flagship had no badge case at all: the cabinet counts
   trophies and the legacy screen sums them at the end, and everything in
   between (the hundredth goal, the first serious injury you came back from,
   the season you were the best player on earth) went by with nothing to show.
   His list asks for exactly this, and names two of them: "badges for career
   peaks (Ballon d'Or, first billion)".

   SAME RULE AS THE NFL TABLE ABOVE, and it is worth restating because it is
   what keeps the words true: every threshold here is either a round milestone
   the game itself hands out, or a number read straight off the engine's own
   table and passed in as a fact, so it can never drift away from the code. No
   blurb quotes a real player's record or says how many people have reached a
   mark, because both move and this file cannot keep them true.

   THE BILLION, HONESTLY. He asked for a first billion badge. Measured over
   120 seeded careers (60 ordinary, 60 forced elite) with cash, holdings and
   the market added together, the richest career this engine produced was 252
   and the ordinary p90 was 93, all in millions of euros. A billion is not a
   peak in this game, it is a number nobody can reach, and a badge nobody can
   earn is dead words in a case. So the top money rung is a hundred million,
   which an ordinary career clears about one time in ten and a great one
   clears comfortably, and scripts/simCareerLife.mjs prints the distribution
   that set it. */

export interface SoccerSeasonFact {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;
  club: string;
  intApps: number;
  leagueTitle: boolean;
  domesticCup: boolean;
  championsLeague: boolean;
  worldCup: boolean;
  continentalCup: boolean;
  ballonDor: boolean;
}

/** Only what the tests read. Built by soccerBadgeFacts from a CareerState. */
export interface SoccerBadgeFacts {
  pos: string;
  /** Playing seasons only, oldest first. Youth years are not a career yet. */
  seasons: SoccerSeasonFact[];
  totals: {
    apps: number; goals: number; assists: number; cleanSheets: number;
    leagueTitles: number; domesticCups: number; championsLeagues: number;
    worldCups: number; continentalCups: number; ballonDors: number;
    intCaps: number;
  };
  /** Cash, what he owns and the market, together, in millions of euros. */
  wealth: number;
  /** Followers, in millions. */
  followers: number;
  /** The two follower marks the engine's own sponsorship table sets, so these
   *  badges move with that table instead of repeating numbers at it. */
  bootDealAt: number;
  merchLineAt: number;
  /** Serious injuries come back from, and games played after the first one. */
  seriousInjuries: number;
  appsAfterFirstSerious: number;
}

const trebleSeason = (f: SoccerBadgeFacts): boolean =>
  f.seasons.some(s => s.leagueTitle && s.domesticCup && s.championsLeague);

/** Ten playing seasons and never anybody else's player. */
const oneClubMan = (f: SoccerBadgeFacts): boolean =>
  f.seasons.length >= 10 && f.seasons.every(s => s.club === f.seasons[0].club);

export const SOCCER_BADGES: BadgeDef<SoccerBadgeFacts>[] = [
  { id: 'league', emoji: '🏆', label: 'League champion', blurb: 'You won your league. The first one is the one you remember.', test: f => f.totals.leagueTitles >= 1 },
  { id: 'league_5', emoji: '🏵️', label: 'Five league titles', blurb: 'Five leagues. Nobody wins that many by luck.', test: f => f.totals.leagueTitles >= 5 },
  { id: 'cup', emoji: '🥇', label: 'Cup winner', blurb: 'A domestic cup, and a day out for the whole town.', test: f => f.totals.domesticCups >= 1 },
  { id: 'ucl', emoji: '🌟', label: 'European champion', blurb: 'You won the Champions League.', test: f => f.totals.championsLeagues >= 1 },
  { id: 'continental', emoji: '🌐', label: 'Continental champion', blurb: 'You won your continent with your country.', test: f => f.totals.continentalCups >= 1 },
  { id: 'world_cup', emoji: '🌍', label: 'World Cup winner', blurb: 'The one they put on your gravestone.', test: f => f.totals.worldCups >= 1 },
  { id: 'treble', emoji: '🎩', label: 'The treble', blurb: 'League, cup and Champions League in the same season.', test: trebleSeason },
  { id: 'ballon_dor', emoji: '🏅', label: "Ballon d'Or", blurb: 'Voted the best player in the world for a year.', test: f => f.totals.ballonDors >= 1 },
  { id: 'ballon_dor_3', emoji: '👑', label: "Three Ballon d'Ors", blurb: 'Three of them. That is not a season, that is an era.', test: f => f.totals.ballonDors >= 3 },
  { id: 'goals_100', emoji: '⚽', label: '100 career goals', blurb: 'A hundred goals in senior football.', test: f => f.totals.goals >= 100 },
  { id: 'goals_300', emoji: '🎯', label: '300 career goals', blurb: 'Three hundred. The club museum wants a word.', test: f => f.totals.goals >= 300 },
  { id: 'assists_100', emoji: '🅰️', label: '100 career assists', blurb: 'A hundred goals you made for somebody else.', test: f => f.totals.assists >= 100 },
  { id: 'season_30', emoji: '🔥', label: 'A 30 goal season', blurb: 'Thirty in one season, across everything you played in.', test: f => f.seasons.some(s => s.goals >= 30) },
  { id: 'clean_100', emoji: '🧤', label: '100 clean sheets', blurb: 'A hundred nights nobody got past you.', test: f => f.totals.cleanSheets >= 100 },
  { id: 'apps_500', emoji: '🧱', label: '500 appearances', blurb: 'Five hundred games. Turning up is the hard part.', test: f => f.totals.apps >= 500 },
  { id: 'rating_9', emoji: '📈', label: 'A 9.0 season', blurb: 'A season that averaged nine out of ten.', test: f => f.seasons.some(s => s.rating >= 9) },
  { id: 'caps_100', emoji: '🎽', label: '100 caps', blurb: 'A century of games for your country.', test: f => f.totals.intCaps >= 100 },
  { id: 'one_club', emoji: '🏠', label: 'One club man', blurb: 'Ten seasons, one badge, no arguments.', test: oneClubMan },
  { id: 'decade', emoji: '📆', label: 'A decade in the game', blurb: 'Ten seasons of senior football.', test: f => f.seasons.length >= 10 },
  { id: 'comeback', emoji: '🩹', label: 'Came back', blurb: 'A hundred games after the injury that was meant to finish you.', test: f => f.seriousInjuries >= 1 && f.appsAfterFirstSerious >= 100 },
  { id: 'first_million', emoji: '🪙', label: 'First million', blurb: 'A million to your name: cash, what you own and the market together.', test: f => f.wealth >= 1 },
  { id: 'hundred_million', emoji: '💰', label: 'A hundred million', blurb: 'A hundred million to your name, everything added up.', test: f => f.wealth >= 100 },
  { id: 'boot_deal', emoji: '👟', label: 'Global boot deal', blurb: 'Enough people follow you that a boot company came calling.', test: f => f.followers >= f.bootDealAt },
  { id: 'merch_line', emoji: '👕', label: 'Your own merch line', blurb: 'Your name on the shirt, and none of it is the club shop.', test: f => f.followers >= f.merchLineAt },
];
