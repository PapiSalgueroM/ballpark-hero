import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import type { NrlCareerState } from '@/lib/nrlCareer';
import { nrlLadder } from '@/lib/nrlManager';

export function nrlBoardBenchmark(year: number, clubId: string, previousPlace?: number) {
  const { clubs } = nrlSeasonPlan(year);
  const club = clubs.find(candidate => candidate.id === clubId);
  if (!club) return null;
  const ratingPlace = 1 + clubs.filter(candidate => candidate.strength > club.strength).length;
  const expectedPlace = previousPlace === undefined ? ratingPlace : Math.round((2 * ratingPlace + previousPlace) / 3);
  if (expectedPlace <= 4) return { targetRank: 4, label: 'Finish in the top four' };
  if (expectedPlace <= 8) return { targetRank: 8, label: 'Reach the finals' };
  if (expectedPlace <= 12) return { targetRank: 12, label: 'Finish in the top twelve' };
  return { targetRank: clubs.length - 2, label: 'Finish above the bottom two' };
}

export function nrlBoardTarget({ season, history }: Pick<NrlCareerState, 'season' | 'history'>) {
  const previous = history.find(row => row.year === season.year - 1 && row.clubId === season.clubId);
  const benchmark = nrlBoardBenchmark(season.year, season.clubId, previous?.rank);
  if (!benchmark) return null;
  const ladder = nrlLadder(season);
  const index = ladder.findIndex(row => row.clubId === season.clubId);
  const place = ladder[index]?.played ? index + 1 : null;
  const result = season.phase === 'regular' || place === null ? null : place <= benchmark.targetRank ? 'met' : 'missed';
  return { ...benchmark, place, result };
}
