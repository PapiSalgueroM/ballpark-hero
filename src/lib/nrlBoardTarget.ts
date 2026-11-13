import { nrlSeasonPlan, NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import type { NrlCareerPlayer, NrlCareerState } from '@/lib/nrlCareer';
import { nrlLadder, type NrlManagerState } from '@/lib/nrlManager';
import { nrlSquadSeasonStats } from '@/lib/nrlPlayerScoring';

export const NRL_BOARD_PATHWAYS = { maxAge: 23, players: 3, appearances: 4, bonus: 200_000 } as const;

export function nrlBoardPathwaysEligible(season: NrlManagerState, players: NrlCareerPlayer[]) {
  const squadIds = new Set(season.squad.map(player => player.id));
  return players.filter(player => player.age <= NRL_BOARD_PATHWAYS.maxAge && squadIds.has(player.id));
}

export function nrlBoardPathwaysProgress(season: NrlManagerState, players: NrlCareerPlayer[]) {
  const ages = new Map(nrlBoardPathwaysEligible(season, players).map(player => [player.id, player.age]));
  return nrlSquadSeasonStats(season, 'regular').rows.flatMap(({ id, name, apps }) => {
    const age = ages.get(id);
    return age === undefined ? [] : [{ id, name, apps, age }];
  });
}

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

export type NrlBoardChallengeStatus = 'warning' | 'review' | 'must-move' | 'cleared' | null;

export function nrlBoardChallengeStatus(career: Pick<NrlCareerState, 'boardChallenge' | 'season' | 'history'>): NrlBoardChallengeStatus {
  const { boardChallenge, season, history } = career;
  const { year, clubId, phase } = season;
  if (!boardChallenge || year === NRL_LAST_YEAR) return null;

  const previous = history.find(row => row.year === year - 1 && row.clubId === clubId);
  const earlier = previous && history.find(row => row.year === year - 2 && row.clubId === clubId);
  const previousTarget = previous && nrlBoardBenchmark(previous.year, clubId, earlier?.rank);
  const previousMiss = previousTarget && previous.rank > previousTarget.targetRank && previous.championId !== clubId;
  if (phase === 'regular') return previousMiss ? 'warning' : null;
  if (nrlBoardTarget(career)?.result !== 'missed') return null;
  if (season.championId === clubId) return 'cleared';
  if (!previousMiss) return 'warning';
  return phase === 'complete' ? 'must-move' : 'review';
}
