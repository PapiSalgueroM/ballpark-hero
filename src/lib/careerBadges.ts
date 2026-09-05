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
