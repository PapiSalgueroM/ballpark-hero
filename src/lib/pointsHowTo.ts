/**
 * Round 678: the words for points, written once for every game.
 * docs/design/POINTS-ECONOMY-V2.md section 11.
 *
 * TWO PLACES SAY IT.
 *   The result card, after play: the game's own result, then
 *   "Points: 62 of 100", then one line from the game's family (cardLine).
 *   The line is shown only after play, never before: it is set on the day's
 *   own key, so showing it early would leak the answers.
 *   The how to play, before play and again from "?": a Points section with
 *   what 0 means, what 100 means, a worked example and when the day's ranked
 *   go is spent (guide).
 *
 * The worked examples are computed through src/lib/knowledgeLine.ts, the same
 * formula the card pays, so the copy cannot drift from the scoring.
 *
 * Every game's family, claim and whether it pays live in
 * src/data/pointsFamilies.ts. A game that does not pay says so, with its
 * reason, instead of a points line.
 */
import { pointsRuleFor, type PointsClaim, type PointsFamily, type PointsUnit } from '@/data/pointsFamilies';
import { dayPoints, pointsFromCeiling, type PointsAnswer } from '@/lib/knowledgeLine';
import { HIGHER_LOWER_DAILY_CEILING } from '@/lib/higherLowerScore';

export const FOR_FUN_LINE = "For fun: this one doesn't pay points yet.";
export const NO_SCORE_LINE = "Just for fun: this one doesn't keep a score.";

/** "Points: 62 of 100", the one way the card says it. */
export function pointsOf(points: number): string {
  return `Points: ${points} of 100`;
}

/** What the card knows after play. */
export interface CardFacts {
  answer: PointsAnswer;
  /** What the random policy averages on this board, in the game's own result. */
  guessing?: number;
}

export interface PointsGuide {
  zero: string;
  hundred: string;
  example: string;
  ranked: string;
}

export interface PointsHowTo {
  family: PointsFamily | null;
  pays: boolean;
  /** The line under "Points: N of 100", or the for fun line for a game that does not pay. */
  cardLine(facts?: CardFacts): string;
  /** The Points section of the how to play. */
  guide: PointsGuide;
}

const about = (n: number) => String(Math.round(n));

const CARD: Record<PointsFamily, (f: CardFacts) => string> = {
  choice: ({ answer, guessing }) => {
    /* Round 681: a score (the Higher or Lower streak score) moves in fives,
       so the card says where the line is rather than the first score past it. */
    const start = answer.unit === 'score'
      ? `Points started past a score of ${about(answer.line)} today.`
      : `Points started at ${Math.floor(answer.line) + 1} ${answer.unit} today.`;
    return guessing === undefined ? start : `Guessing gets about ${about(guessing)} of ${answer.perfect} here. ${start}`;
  },
  typed: () => 'Every right answer counts. A perfect board is 100.',
  draft: ({ answer, guessing }) => {
    const best = answer.unit === 'rating'
      ? `Today's best lineup rated ${answer.perfect}.`
      : `The best picks today get ${answer.perfect} ${answer.unit}.`;
    return guessing === undefined ? best : `Random picks get about ${about(guessing)} on this board. ${best}`;
  },
  numbers: ({ answer }) => `Points start past ${about(answer.line)}. Our best run on this deal got ${answer.perfect}.`,
  arcade: ({ answer }) => `Points start past ${about(answer.line)}. The best run on today's deal scores ${answer.perfect}.`,
  season: () => 'Points are rare here for now. A season scores only when it beats what this roster does 19 times in 20.',
  sim: ({ answer }) => `Points start past what a run left alone gets, about ${about(answer.line)}.`,
};

/* Worked examples, each read off the formula itself. */
const choiceExample = () =>
  `Say today's line is 7 of 10. Get 7 right and you score 0, 8 right scores ${dayPoints(8, 7, 10)}, 9 right scores ${dayPoints(9, 7, 10)}, and all 10 is ${dayPoints(10, 7, 10)}.`;
/* Round 681: the Higher or Lower dailies line their streak score. */
const scoreExample = () => {
  const top = HIGHER_LOWER_DAILY_CEILING;
  return `Say today's line is a score of 110 and all ten right scores ${top}. Score 110 or less and you get 0, a score of 200 gets ${dayPoints(200, 110, top)}, and all ten right gets ${dayPoints(top, 110, top)}.`;
};
const typedExample = () =>
  `Say a board is out of 9. Get 6 right and you score ${pointsFromCeiling(6, 9)}. Get all 9 and you score ${pointsFromCeiling(9, 9)}.`;
const draftExample = () =>
  `Say random picks rate about 74 on today's board and the best lineup rates 91. A lineup rated 85 scores ${dayPoints(85, 74, 91)}, and one rated 74 or less scores 0.`;
const numbersExample = () =>
  `Say taking the biggest number every time gets 400 and our best run gets 900. Finish on 650 and you score ${dayPoints(650, 400, 900)}.`;
const arcadeExample = () =>
  `Say tapping straight away gets 30 and today's best run gets 90. Score 60 and you get ${dayPoints(60, 30, 90)}.`;

const GUIDE: Record<PointsFamily, (unit: PointsUnit) => Omit<PointsGuide, 'ranked'>> = {
  choice: unit => ({
    zero: '0 means you did no better than guessing would on today\'s board.',
    hundred: '100 means every answer right.',
    example: unit === 'score' ? scoreExample() : choiceExample(),
  }),
  typed: () => ({
    zero: '0 means no right answers.',
    hundred: '100 means a perfect board.',
    example: typedExample(),
  }),
  draft: () => ({
    zero: '0 means your picks did no better than random picks on today\'s board.',
    hundred: '100 means the best squad the board allows.',
    example: draftExample(),
  }),
  numbers: () => ({
    zero: '0 means no better than grabbing the biggest number every time.',
    hundred: '100 means matching our best run on the same deal.',
    example: numbersExample(),
  }),
  arcade: () => ({
    zero: '0 means no better than tapping straight away.',
    hundred: '100 means the best run today\'s deal allows.',
    example: arcadeExample(),
  }),
  season: () => ({
    zero: '0 means the season went no better than this roster does 19 times in 20 anyway.',
    hundred: '100 means a season better than every one this roster was projected to have.',
    example: 'Say this roster wins 9 games or fewer in 19 projected seasons out of 20. Win 9 and the season scores 0. Beat every projected season and it scores 100.',
  }),
  sim: () => ({
    zero: '0 means no better than a run left alone.',
    hundred: '100 means the best run the game allows.',
    example: 'Say a run left alone ends on 30. Finish on 30 or less and you score 0. The further past it you get, the more you score.',
  }),
};

const RANKED: Record<PointsClaim, string> = {
  'first-action': 'Your first move on today\'s board starts your ranked go. Anything after that today is practice. A new day starts at midnight Eastern.',
  'deal': 'Your first deal of the day is the ranked one. Deals after it are practice until midnight Eastern.',
  'week-one': 'Your first simmed week of a season starts today\'s ranked season. One ranked season a day, and starting over ends it at 0.',
  'finish': 'Your first finished run of the day is the ranked one. Later ones that day are practice.',
};

/** The card line and the how to play Points section for a completion key. */
export function pointsHowTo(slug: string): PointsHowTo {
  const rule = pointsRuleFor(slug);
  if (!rule || rule.round === 'none') {
    const reason = rule && rule.pays === false ? rule.forFun : NO_SCORE_LINE;
    return {
      family: rule ? rule.family : null,
      pays: false,
      cardLine: () => NO_SCORE_LINE,
      guide: { zero: reason, hundred: '', example: '', ranked: '' },
    };
  }
  const ranked = RANKED[rule.claim];
  if (rule.pays === false) {
    return {
      family: rule.family,
      pays: false,
      cardLine: () => FOR_FUN_LINE,
      guide: { zero: rule.forFun, hundred: '', example: '', ranked },
    };
  }
  const family = rule.family;
  return {
    family,
    pays: true,
    cardLine: facts => (facts ? CARD[family](facts) : ''),
    guide: { ...GUIDE[family](rule.unit ?? 'right'), ranked },
  };
}
