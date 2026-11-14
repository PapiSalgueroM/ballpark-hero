import { nationLift, worldSeedOf, type CareerState } from '@/lib/clubManager';
import { nationalSummerOf, selectedNationalXI } from '@/lib/clubManagerNationalXI';
import { nationalQualifierView } from '@/lib/clubManagerNationalQualifiers';
import { keyedRng } from '@/lib/keyedRng';
import { NATION_CONFED, nationStrength, runManagerSummer, simInternationalMatch, type ManagerSummerMatch, type NationalMentality } from '@/lib/soccerInternational';

export interface NationalFinals {
  year: number;
  played: ManagerSummerMatch[];
}

export function nationalFinalsView(career: CareerState) {
  const job = career.nationJob;
  const summer = nationalSummerOf(career);
  if (!job || !summer || !NATION_CONFED[job.nation]) return null;
  const qualifiers = nationalQualifierView(career);
  if (qualifiers && (qualifiers.next || !qualifiers.table.qualified)) return null;
  const seed = `national-finals|${worldSeedOf(career) ?? 'legacy'}|${summer.year}|${job.nation}`;
  const automatic = { confederation: NATION_CONFED[job.nation], table: [], myPosition: 0, through: 0,
    qualified: true, automatic: true };
  const qualifying = qualifiers?.table ?? automatic;
  const xi = selectedNationalXI(career, summer.year);
  const adjustment = nationLift(career) + (xi?.adjustment ?? 0);
  const stored = job.finals?.year === summer.year && Array.isArray(job.finals.played) ? job.finals.played : [];
  const build = (played: ManagerSummerMatch[]) => runManagerSummer(job.nation, summer.year, nationLift(career),
    job.mentality, xi?.adjustment, qualifying, { random: keyedRng(seed), played });
  const replay = build(stored);
  if (!replay) return null;
  const played = stored.every((value, i) => value === replay.managerFixtures[i]) ? stored : [];
  const tournament = played === stored ? replay : build(played);
  if (!tournament) return null;
  const upcoming = tournament.managerFixtures[played.length];
  if (!upcoming && !played.length) return null;
  const next = upcoming ? { id: `${summer.year}-${played.length}`, round: upcoming.round,
    home: upcoming.home, away: upcoming.away } : null;
  return { year: summer.year, tournament: summer.name, played, next, seed, adjustment,
    result: next ? null : tournament.myResult, completed: next ? null : tournament };
}

export function playNationalFinal(career: CareerState, fixtureId: string, mentality?: NationalMentality): CareerState | null {
  const job = career.nationJob;
  if (!job || !career.pendingSummary || career.live || career.retired || career.sacked || career.wilderness) return null;
  const view = nationalFinalsView(career);
  if (!view?.next || view.next.id !== fixtureId) return null;
  const { home, away, round } = view.next;
  const strength = (team: string) => nationStrength(team) + (team === job.nation ? view.adjustment : 0);
  const tactics = mentality ?? job.mentality ?? 'balanced';
  const tempo = tactics === 'defensive' ? -0.25 : tactics === 'attacking' ? 0.25 : 0;
  const knockout = !round.startsWith('Group ');
  const { a, b, pens, aWins } = simInternationalMatch(strength(home), strength(away), knockout, tempo, tempo, keyedRng(`${view.seed}|${fixtureId}`));
  const match: ManagerSummerMatch = { round, home, away, homeGoals: a, awayGoals: b, pens, mentality: tactics,
    ...(knockout ? { winner: aWins ? home : away } : {}) };
  return { ...career, nationJob: { ...job, finals: { year: view.year, played: [...view.played, match] } } };
}
