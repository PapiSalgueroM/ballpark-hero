import { keyedRng } from './keyedRng';
import { annualUsRatingBoost } from './usCareerAnnualBenefits';
import { raiseWithinPotential } from './careerHeadroom';
import type { UsCareerCore } from './usCareerSport';
import type { UsSport } from './usCareerToCoach';

export interface UsSeasonRating {
  opening: number;
  checkpoints: [number, number][];
  average: number;
  finish: number;
  support: number;
}

/** The season model works with aggregate stats. Give each game its share of
 * the rating in force during that stage, with the last update at season end. */
export function stageUsSeasonRating<C extends UsCareerCore>(
  sport: UsSport,
  career: C,
  games: number,
  nextRating: (career: C, rng: () => number) => number,
): UsSeasonRating {
  const opening = career.ovr;
  const rng = keyedRng(`${sport}|season-rating|${career.summerSalt ?? career.name}|${career.pos}|${career.year}`);
  const natural = nextRating(career, rng);
  const finish = raiseWithinPotential(natural, career.pot, annualUsRatingBoost(career, sport, career.age));
  const delta = finish - opening;
  const checkpoints: UsSeasonRating['checkpoints'] = [1, 2, 3, 4].map((quarter): [number, number] => [
    Math.round(games * quarter / 4),
    opening + Math.sign(delta) * Math.round(Math.abs(delta) * quarter / 4),
  ]);
  let lastGame = 0;
  let rating = opening;
  let ratingGames = 0;
  for (const [game, next] of checkpoints) {
    ratingGames += (game - lastGame) * rating;
    lastGame = game;
    rating = next;
  }
  return { opening, checkpoints, average: ratingGames / games, finish, support: finish - natural };
}

export function readUsSeasonRating(value: UsSeasonRating | undefined): UsSeasonRating | null {
  return value && Number.isFinite(value.opening) && Number.isFinite(value.finish) && Number.isFinite(value.support)
    && Number.isFinite(value.average) && Array.isArray(value.checkpoints) && value.checkpoints.length === 4
    && value.checkpoints.every((point, i) => Array.isArray(point) && point.length === 2
      && Number.isInteger(point[0]) && point[0] > (i ? value.checkpoints[i - 1][0] : 0) && Number.isFinite(point[1]))
    && value.checkpoints[3][1] === value.finish
    ? value : null;
}
