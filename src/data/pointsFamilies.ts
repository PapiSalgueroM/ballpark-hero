/**
 * Round 678: every completion key the site can send, filed once, with how it
 * scores. docs/design/POINTS-ECONOMY-V2.md sections 7 and 8.
 *
 * EACH GAME CARRIES
 *   family    how its knowledge line is measured, and which naive policies it
 *             is measured on (the family's list, or its own):
 *               choice   fixed items, fixed options (section 7.2)
 *               typed    name the answer: typed answers, clue ladders, grids,
 *                        connections, chains (7.3)
 *               draft    pick the players (7.4)
 *               numbers  work the numbers, where using what is shown well is
 *                        the skill (7.5)
 *               arcade   a shot or a tap on the day's deal
 *               season   the four front offices and the two dynasties (7.6)
 *               sim      Club Manager, the careers and the fight games (7.6)
 *   pays      true only once the game's own round has put it on the line and
 *             scripts/simKnowledgeLine.mjs section 2 measures it. A game that
 *             does not pay records plays with no points ("for fun") and says
 *             why in `forFun`, in words a player reads on What's New.
 *   scale     what a paying game records: 'dp' (day points, 0 to 100) or 'g'
 *             (its raw result, valued at its engine ceiling). null when it
 *             does not pay.
 *   claim     when the day's one ranked go is spent (section 8):
 *               first-action  the first scored action on today's board
 *               deal          the deal of the first run of the Eastern day
 *               week-one      the first sim of a season
 *               finish        the first finish of the day (careers)
 *   round     for a paying game, the round that put it on the line; for one
 *             that does not pay, the round that brings it (back), or 'none'
 *             when nothing is planned (it records no score by design, or its
 *             page is gone).
 *
 * WHY NOTHING PAYS YET. Every game here waits on its own round (681 to 688,
 * 695 to 697). A game flips to `paid(...)` in the round that lands its
 * pointsFor and its section 2 row, never before, so the seed this file
 * generates is honest on every tree: if a game round has not landed by the
 * release, its games are for fun, with no one having to remember to flip
 * them (the release floor in section 10).
 *
 * scripts/genGameRules.mjs writes public.game_rules from this file
 * (scripts/data/gameRulesSeed.sql); scripts/simKnowledgeLine.mjs section 1
 * holds every sendable key here exactly once and the seed to this file.
 * src/lib/pointsHowTo.ts reads it for the card and the how to play.
 */
import type { NaivePolicyName } from '@/lib/naivePolicies';

export type PointsFamily = 'choice' | 'typed' | 'draft' | 'numbers' | 'arcade' | 'season' | 'sim';
export type PointsScale = 'dp' | 'g';
export type PointsClaim = 'first-action' | 'deal' | 'week-one' | 'finish';
export type PointsRound = `${number}`;

interface RuleBase {
  readonly claim: PointsClaim;
  /** This game's own naive policies, when the family's list does not fit it. */
  readonly policies?: readonly NaivePolicyName[];
}
export type PointsRule =
  | (RuleBase & { readonly pays: true; readonly scale: PointsScale; readonly round: PointsRound })
  | (RuleBase & { readonly pays: false; readonly scale: null; readonly round: PointsRound | 'none'; readonly forFun: string });

export interface FamilyGroup {
  readonly family: PointsFamily;
  /** The naive policies every game of the family is measured on, unless it lists its own. */
  readonly policies: readonly NaivePolicyName[];
  readonly games: Readonly<Record<string, PointsRule>>;
}

/** A game waiting on the round that puts it on the line, or on nothing. */
function waits(claim: PointsClaim, round: PointsRound | 'none', forFun: string, policies?: readonly NaivePolicyName[]): PointsRule {
  return policies ? { pays: false, scale: null, claim, round, forFun, policies } : { pays: false, scale: null, claim, round, forFun };
}

/**
 * A game on the line. Only the round that lands its pointsFor and its
 * section 2 row writes one of these.
 */
function paid(scale: PointsScale, claim: PointsClaim, round: PointsRound, policies?: readonly NaivePolicyName[]): PointsRule {
  return policies ? { pays: true, scale, claim, round, policies } : { pays: true, scale, claim, round };
}

const LUCK = "Points are paused here while we make sure a lucky guess can't earn them.";
const RANDOM_ANSWER = "Points are paused here while we check that a random answer can't earn them.";
const RATINGS = 'Points are paused here while we hide ratings during the picks, so points come from knowing players.';
const BEST_RUN = 'Points are paused here while we work out the best run on every deal, so 100 means a perfect run.';
const BEST_SHOT = "Points are paused here while we pin 100 to the best run each day's deal allows.";
const ONE_SEASON = 'Points are paused here until one ranked season a day is in.';
const UNTOUCHED = 'Points are paused here while we measure what a run left alone scores.';
const ENDLESS = "It's an endless run, so there's no top score to measure against yet.";
const NO_SCORE = 'This one records plays, not scores.';
const GONE = 'This page sends you home now, so nothing records here.';

const HL: readonly NaivePolicyName[] = ['topListed', 'constant', 'random', 'counter', 'medianCall'];
const ESTIMATE: readonly NaivePolicyName[] = ['constant', 'random'];
const ORDERING: readonly NaivePolicyName[] = ['topListed', 'random'];

export const POINTS_FAMILIES: readonly FamilyGroup[] = [
  {
    family: 'choice',
    policies: ['topListed', 'constant', 'random', 'counter'],
    games: {
      'afl-higher-lower': waits('first-action', '681', LUCK, HL),
      'cfb-higher-lower': waits('first-action', '681', LUCK, HL),
      'f1-higher-lower': waits('first-action', '681', LUCK, HL),
      'golf-higher-lower': waits('first-action', '681', LUCK, HL),
      'hockey-higher-lower': waits('first-action', '681', LUCK, HL),
      'mlb-higher-lower': waits('first-action', '681', LUCK, HL),
      'nba-higher-lower': waits('first-action', '681', LUCK, HL),
      'nfl-higher-lower': waits('first-action', '681', LUCK, HL),
      'tennis-higher-lower': waits('first-action', '681', LUCK, HL),
      'face-off': waits('first-action', '681', LUCK, ['topListed', 'constant', 'random', 'counter', 'speedTapper']),
      'champ-or-not': waits('first-action', '681', LUCK),
      'whod-they-beat': waits('first-action', '681', LUCK),
      'ball-iq': waits('first-action', '681', LUCK),
      'sports-millionaire': waits('first-action', '682', LUCK, ['random', 'topListed', 'lifelineReader']),
      'pack-battle': waits('first-action', '682', LUCK, HL),
      'silverware-sort': waits('first-action', '686', LUCK, ORDERING),
      'football-timeline': waits('first-action', '686', LUCK, ORDERING),
      'teammates': waits('deal', '687', LUCK),
      'higher-lower': waits('deal', '687', ENDLESS, HL),
      'higher-lower-transfers': waits('deal', '687', ENDLESS, HL),
      'hof-or-bust': waits('first-action', '695', "One call a day can't show what you know. An 8 player ballot is on the way."),
      'score-predictor': waits('first-action', '696', 'One match a day is mostly luck. Five finals a day are on the way.', ESTIMATE),
      'rank-em': waits('first-action', '697', 'Its rounds repeat, so answers can leak. A fresh ranking every day is on the way.', ORDERING),
      'world-cup-bracket': waits('finish', 'none', NO_SCORE),
      'guess-transfer-value': waits('first-action', 'none', GONE, ESTIMATE),
      'grade-transfer': waits('first-action', 'none', GONE, ESTIMATE),
    },
  },
  {
    family: 'typed',
    policies: ['random', 'suggestionBox'],
    games: {
      'footle': waits('first-action', '687', RANDOM_ANSWER),
      'career': waits('first-action', '687', RANDOM_ANSWER),
      'career-ladder': waits('first-action', '687', RANDOM_ANSWER),
      'baseball-career': waits('first-action', '687', RANDOM_ANSWER),
      'hockey-career': waits('first-action', '687', RANDOM_ANSWER),
      'nba-career': waits('first-action', '687', RANDOM_ANSWER),
      'nfl-career': waits('first-action', '687', RANDOM_ANSWER),
      'olympics': waits('first-action', '687', RANDOM_ANSWER),
      'guess-the-college': waits('first-action', '687', RANDOM_ANSWER),
      'guess-the-nation': waits('first-action', '687', RANDOM_ANSWER),
      'guess-nfl-team': waits('first-action', '687', RANDOM_ANSWER),
      'guess-cbb-team': waits('first-action', '687', RANDOM_ANSWER),
      'guess-nascar-driver': waits('first-action', '687', RANDOM_ANSWER),
      'guess-tennis-player': waits('first-action', '687', RANDOM_ANSWER),
      'guess-the-golfer': waits('first-action', '687', RANDOM_ANSWER),
      'guess-the-year': waits('first-action', '687', RANDOM_ANSWER),
      'f1-driver': waits('first-action', '687', RANDOM_ANSWER),
      'f1-constructor': waits('first-action', '687', RANDOM_ANSWER),
      'transfer-path': waits('first-action', '687', RANDOM_ANSWER),
      'emoji-guess': waits('first-action', '687', RANDOM_ANSWER),
      'shirt-number': waits('first-action', '687', RANDOM_ANSWER),
      'ufc': waits('first-action', '687', RANDOM_ANSWER),
      'puck-detective': waits('first-action', '687', RANDOM_ANSWER),
      'nba-stat-line': waits('first-action', '687', RANDOM_ANSWER),
      'world-xi': waits('deal', '687', RANDOM_ANSWER),
      'missing-xi': waits('first-action', '687', RANDOM_ANSWER),
      'missing-eleven': waits('first-action', '687', RANDOM_ANSWER),
      'missing-five': waits('first-action', '687', RANDOM_ANSWER),
      'missing-nine': waits('first-action', '687', RANDOM_ANSWER),
      'soccer-grid': waits('first-action', '687', RANDOM_ANSWER),
      'football-grid': waits('first-action', '687', RANDOM_ANSWER),
      'college-grid': waits('first-action', '687', RANDOM_ANSWER),
      'nba-grid': waits('first-action', '687', RANDOM_ANSWER),
      'mlb-grid': waits('first-action', '687', RANDOM_ANSWER),
      'hockey-grid': waits('first-action', '687', RANDOM_ANSWER),
      'cbb-grid': waits('first-action', '687', RANDOM_ANSWER),
      'connections': waits('first-action', '687', RANDOM_ANSWER),
      'baseball-connections': waits('first-action', '687', RANDOM_ANSWER),
      'nba-connections': waits('first-action', '687', RANDOM_ANSWER),
      'nfl-connections': waits('first-action', '687', RANDOM_ANSWER),
      'nhl-connections': waits('first-action', '687', RANDOM_ANSWER),
      'football-connect-4': waits('first-action', '687', RANDOM_ANSWER),
      'mlb-connect-4': waits('deal', '687', RANDOM_ANSWER),
      'nba-connect-4': waits('deal', '687', RANDOM_ANSWER),
      'nfl-connect-4': waits('deal', '687', RANDOM_ANSWER),
      'nhl-connect-4': waits('deal', '687', RANDOM_ANSWER),
      'jeopardy': waits('first-action', '687', RANDOM_ANSWER),
      'clue-auction': waits('deal', '687', RANDOM_ANSWER),
      'player-bingo': waits('deal', '687', RANDOM_ANSWER),
      'sports-bingo': waits('first-action', '687', RANDOM_ANSWER),
      'rarity-round': waits('first-action', '687', RANDOM_ANSWER),
      'list-quiz': waits('deal', '687', ENDLESS),
      'alphabet-sprint': waits('deal', '687', ENDLESS),
      'nascar-chain': waits('first-action', '687', ENDLESS),
      'tennis-chain': waits('first-action', '687', ENDLESS),
      'ufc-chain': waits('first-action', '687', ENDLESS),
      'nba-chain': waits('deal', '687', ENDLESS),
      'who-am-i': waits('finish', 'none', NO_SCORE),
      'stat-detective': waits('finish', 'none', NO_SCORE),
      'world-cup': waits('deal', 'none', GONE),
      'guess-soccer-club': waits('first-action', 'none', GONE),
      'guess-soccer-club-questions': waits('deal', 'none', GONE),
    },
  },
  {
    family: 'draft',
    policies: ['topListed', 'random', 'structureStacker', 'biggestNumber'],
    games: {
      'perfect-lineup-nba': waits('first-action', '683', RATINGS),
      'perfect-lineup-nhl': waits('first-action', '683', RATINGS),
      'perfect-lineup-f1': waits('first-action', '683', RATINGS),
      'gauntlet-draft': waits('first-action', '683', RATINGS),
      'nba-gauntlet-draft': waits('first-action', '683', RATINGS),
      'nfl-gauntlet-draft': waits('first-action', '683', RATINGS),
      'mlb-gauntlet-draft': waits('first-action', '683', RATINGS),
      'perfect-season-nba': waits('first-action', '684', RATINGS),
      'perfect-season-nfl': waits('first-action', '684', RATINGS),
      'perfect-season-mlb': waits('first-action', '684', RATINGS),
      'perfect-season-nhl': waits('first-action', '684', RATINGS),
      'search-and-discard': waits('deal', '685', BEST_RUN),
      'fantasy-draft': waits('deal', '685', BEST_RUN),
      'build-your-xi': waits('deal', '685', BEST_RUN),
      'nba-starting-5': waits('deal', '685', BEST_RUN),
      'football-draft': waits('first-action', 'none', GONE),
      'perfect-lineup': waits('first-action', 'none', GONE),
    },
  },
  {
    family: 'numbers',
    policies: ['biggestNumber', 'firstSlot', 'random'],
    games: {
      'budget-builder': waits('deal', '685', BEST_RUN),
      'sign-the-player': waits('deal', '685', BEST_RUN),
      'mystery-box': waits('first-action', '685', BEST_RUN),
      'squad-deal': waits('deal', '685', BEST_RUN),
      'rebuild': waits('deal', '687', BEST_RUN),
      'player-stock-market': waits('first-action', '687', BEST_RUN),
      'conquest-imperialism': waits('first-action', '687', BEST_RUN),
      'conquest-nba-imperialism': waits('first-action', '687', BEST_RUN),
      'conquest-mlb-imperialism': waits('first-action', '687', BEST_RUN),
      'conquest-nhl-imperialism': waits('first-action', '687', BEST_RUN),
      'conquest-soccer-imperialism': waits('first-action', '687', BEST_RUN),
      'dart-draft': waits('deal', '687', BEST_RUN),
      'minefield': waits('first-action', '687', BEST_RUN),
    },
  },
  {
    family: 'arcade',
    policies: ['speedTapper', 'random'],
    games: {
      'buzzer-beater': waits('first-action', '687', BEST_SHOT),
      'free-kick': waits('first-action', '687', BEST_SHOT),
    },
  },
  {
    family: 'season',
    policies: ['idle'],
    games: {
      'front-office': waits('week-one', '688', ONE_SEASON),
      'nba-front-office': waits('week-one', '688', ONE_SEASON),
      'mlb-front-office': waits('week-one', '688', ONE_SEASON),
      'nhl-front-office': waits('week-one', '688', ONE_SEASON),
      'cfb-dynasty': waits('week-one', '688', ONE_SEASON),
      'cbb-dynasty': waits('week-one', '688', ONE_SEASON),
    },
  },
  {
    family: 'sim',
    policies: ['idle'],
    games: {
      'club-manager': waits('week-one', '688', ONE_SEASON),
      'soccer-career': waits('finish', '687', UNTOUCHED),
      'nfl-my-career': waits('finish', '687', UNTOUCHED),
      'nba-my-career': waits('finish', '687', UNTOUCHED),
      'mlb-my-career': waits('finish', '687', UNTOUCHED),
      'nhl-my-career': waits('finish', '687', UNTOUCHED),
      'fight-career': waits('finish', '687', UNTOUCHED),
      'fight-gym': waits('finish', '687', UNTOUCHED),
      'fight-promoter': waits('finish', '687', UNTOUCHED),
      'hall-of-champions': waits('finish', 'none', NO_SCORE),
      'idle-arena': waits('finish', 'none', NO_SCORE),
      'stadium-tycoon': waits('finish', 'none', NO_SCORE),
      'wonderkid-factory': waits('finish', 'none', NO_SCORE),
    },
  },
];

/** A game's rule with its family and the naive policies it is measured on. */
export type ResolvedPointsRule = PointsRule & {
  readonly family: PointsFamily;
  readonly naive: readonly NaivePolicyName[];
};

/** The rule for a completion key, or null for a key filed nowhere. */
export function pointsRuleFor(slug: string): ResolvedPointsRule | null {
  for (const group of POINTS_FAMILIES) {
    const rule = Object.prototype.hasOwnProperty.call(group.games, slug) ? group.games[slug] : undefined;
    if (rule) return { ...rule, family: group.family, naive: rule.policies ?? group.policies };
  }
  return null;
}
