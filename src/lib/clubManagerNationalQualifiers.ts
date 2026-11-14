import { nationLift, worldSeedOf, type CareerState } from '@/lib/clubManager';
import { nationalSummerOf, selectedNationalXI } from '@/lib/clubManagerNationalXI';
import { keyedRng } from '@/lib/keyedRng';
import { managerQualifierDraw, managerQualifierScore, managerQualifierTable, type ManagerSummerMatch } from '@/lib/soccerInternational';

export interface NationalQualifiers {
  year: number;
  group: string[];
  through: number;
  played: ManagerSummerMatch[];
}

export function nationalQualifierView(career: CareerState) {
  const summer = nationalSummerOf(career);
  const job = career.nationJob;
  if (!job || !summer) return null;
  const seed = `national-qualifying|${worldSeedOf(career) ?? 'legacy'}|${summer.year}|${job.nation}`;
  const draw = managerQualifierDraw(job.nation, summer.year, keyedRng(seed));
  if (!draw) return null;
  const rotation = [...draw.group];
  if (rotation.length % 2) rotation.push('');
  const firstHalf = Array.from({ length: rotation.length - 1 }, () => {
    const pairs = rotation.slice(0, rotation.length / 2).map((home, i) => ({ home, away: rotation[rotation.length - 1 - i] }));
    rotation.splice(1, 0, rotation.pop()!);
    return pairs.filter(({ home, away }) => home && away);
  });
  const rounds = [...firstHalf, ...firstHalf.map(round => round.map(({ home, away }) => ({ home: away, away: home })))];
  const own = rounds.flatMap((round, i) => round.filter(match => match.home === job.nation || match.away === job.nation)
    .map(match => ({ ...match, id: `${summer.year}-${i}`, matchday: i })));
  const stored = job.qualifiers;
  const valid = stored?.year === summer.year && stored.through === draw.through
    && JSON.stringify(stored.group) === JSON.stringify(draw.group) && Array.isArray(stored.played)
    && stored.played.length <= own.length && stored.played.every((match, i) => match?.home === own[i].home && match?.away === own[i].away
      && match.round === 'Qualifying' && !match.pens && Number.isSafeInteger(match.homeGoals) && match.homeGoals >= 0
      && Number.isSafeInteger(match.awayGoals) && match.awayGoals >= 0);
  const played = valid ? stored.played : [];
  const activeRound = own[played.length - 1]?.matchday ?? -1;
  const completedRounds = played.length === own.length ? rounds : rounds.slice(0, activeRound + 1);
  const ai = completedRounds.flat().filter(match => match.home !== job.nation && match.away !== job.nation).map(({ home, away }) => managerQualifierScore(
    home, away, job.nation, 0, 'balanced', keyedRng(`${seed}|${home}|${away}`),
  ));
  const table = managerQualifierTable(job.nation, draw.group, draw.through, [...played, ...ai]);
  return {
    year: summer.year, tournament: summer.name, group: draw.group, through: draw.through, played, table,
    fixtureCount: own.length, next: own[played.length] ?? null, seed,
  };
}

export function playNationalQualifier(career: CareerState, fixtureId: string): CareerState | null {
  const job = career.nationJob;
  if (!job || !career.pendingSummary || career.live || career.retired || career.sacked || career.wilderness) return null;
  const view = nationalQualifierView(career);
  if (!view?.next || view.next.id !== fixtureId) return null;
  const xi = selectedNationalXI(career, view.year);
  const adjustment = nationLift(career) + (xi?.adjustment ?? 0);
  const match = managerQualifierScore(view.next.home, view.next.away, job.nation, adjustment, job.mentality ?? 'balanced',
    keyedRng(`${view.seed}|${fixtureId}`));
  return { ...career, nationJob: { ...job, qualifiers: { year: view.year, group: view.group, through: view.through,
    played: [...view.played, match] } } };
}
