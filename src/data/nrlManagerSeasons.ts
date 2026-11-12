import { NRL_SEASONS, type NrlYear } from '@/data/nrlManager2026';
import { hashLabel, rngFrom } from '@/lib/careerEngine';

export interface NrlClub { id: string; name: string; shortName: string; strength: number }
export interface NrlSeasonPlan {
  clubs: readonly NrlClub[];
  draw: readonly (readonly (readonly [string, string])[])[];
  cap: number;
  minimumSalary: number;
  projected: boolean;
}

export const NRL_LAST_YEAR = 9999;
export const isNrlOpeningYear = (year: unknown): year is NrlYear => year === 2026 || year === 2027;

// The Chiefs' confirmed 2028 entry is real; the club strength, fixture pairings and financial rules are modeled.
// https://www.nrl.com/news/2026/10/21/png-chiefs-launch-inaugural-logo-and-supporter-jersey--ahead-of-nrl-entry-in-2028/
// https://www.pm.gov.au/media/scoring-tries-and-strengthening-ties-pacific
const LATER_CLUBS = [...NRL_SEASONS[2027].clubs, { id: 'chiefs', name: 'PNG Chiefs', shortName: 'Chiefs', strength: 68 }];

// Eight rounds of return fixtures, covering each club's three nearest opponents
// in each direction around the 19-club circle. The first meetings come from
// the single round robin below, with the venue reversed on the return.
const RETURN_ROUNDS: readonly (readonly (readonly [number, number])[])[] = [
  [[18, 15], [11, 9], [16, 14], [13, 12], [4, 2], [1, 17], [6, 3]],
  [[18, 17], [15, 12], [4, 3], [14, 13], [10, 8], [0, 16], [2, 1], [7, 6]],
  [[7, 5], [14, 12], [9, 8], [16, 15], [6, 4], [11, 10], [3, 2]],
  [[17, 16], [6, 5], [12, 9], [2, 0], [13, 10], [7, 4], [15, 14], [3, 1]],
  [[8, 7], [17, 14], [5, 2], [18, 16], [12, 11], [1, 0], [10, 9]],
  [[5, 3], [8, 6], [13, 11], [9, 7], [17, 15], [0, 18]],
  [[12, 10], [15, 13], [1, 18], [5, 4], [9, 6], [0, 17], [11, 8]],
  [[4, 1], [14, 11], [16, 13], [10, 7], [2, 18], [8, 5], [3, 0]],
];

function projectedDraw(year: number): NrlSeasonPlan['draw'] {
  const clubIds = LATER_CLUBS.map(club => club.id);
  const rng = rngFrom(hashLabel(`nrl-draw-v1|${year}`));
  for (let index = clubIds.length - 1; index > 0; index--) {
    const swap = Math.floor(rng() * (index + 1));
    [clubIds[index], clubIds[swap]] = [clubIds[swap], clubIds[index]];
  }
  const count = clubIds.length;
  const draw: [string, string][][] = [];
  for (let bye = 0; bye < count; bye++) {
    if (bye > 0 && bye % 2 === 0 && bye / 2 <= RETURN_ROUNDS.length) {
      draw.push(RETURN_ROUNDS[bye / 2 - 1].map(([home, away]) => [clubIds[home], clubIds[away]]));
    }
    const round: [string, string][] = [];
    for (let distance = 1; distance <= 9; distance++) {
      const a = (bye + distance) % count;
      const b = (bye - distance + count) % count;
      round.push((b - a + count) % count <= 9 ? [clubIds[a], clubIds[b]] : [clubIds[b], clubIds[a]]);
    }
    draw.push(round);
  }
  return draw;
}

// Top 30 base figures. The vehicle and veteran allowances have separate eligibility.
// https://www.nrl.com/operations/integrity/salary-cap/
// https://www.rlpa.com.au/news/a-lasting-legacy-rlpa-thanks-daly-cherry-evans/
const OPENING_PLANS: Record<NrlYear, NrlSeasonPlan> = {
  2026: { ...NRL_SEASONS[2026], cap: 11_550_000, minimumSalary: 140_000, projected: false },
  2027: { ...NRL_SEASONS[2027], cap: 11_700_000, minimumSalary: 145_000, projected: false },
};
const projectedPlans = new Map<number, NrlSeasonPlan>();

export function nrlSeasonPlan(year: number): NrlSeasonPlan {
  if (isNrlOpeningYear(year)) return OPENING_PLANS[year];
  if (!Number.isInteger(year) || year < 2028 || year > NRL_LAST_YEAR) throw new RangeError('Unsupported NRL season year.');
  const cached = projectedPlans.get(year);
  if (cached) return cached;
  const plan = { ...OPENING_PLANS[2027], clubs: LATER_CLUBS, draw: projectedDraw(year), projected: true };
  if (projectedPlans.size >= 20) projectedPlans.delete(projectedPlans.keys().next().value!);
  projectedPlans.set(year, plan);
  return plan;
}
