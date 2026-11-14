import {
  NRL_WORLD_CUP_2026_FORMAT, NRL_WORLD_CUP_2026_KNOCKOUT_VENUES, NRL_WORLD_CUP_2026_OPENER,
  NRL_WORLD_CUP_2026_OPENING_SQUADS, NRL_WORLD_CUP_2026_POOL_FIXTURES, NRL_WORLD_CUP_2026_POOLS,
  type NrlWorldCupNation, type NrlWorldCupOpenerSide,
} from '@/data/nrlWorldCup2026';
import { hashLabel, rngFrom } from '@/lib/careerEngine';
import { nrlBenchRotation, nrlCanPlayRole, NRL_ROLES, scoreNrlRepresentativeMatch, type NrlRole, type NrlTactic } from '@/lib/nrlManager';
import {
  isNrlWorldCupLineup, isNrlWorldCupRun, isNrlWorldCupTactic, NRL_WORLD_CUP_NATIONS, NRL_WORLD_CUP_SAVE_MAX_CHARS, NRL_WORLD_CUP_STAGES,
  type NrlWorldCupLineup, type NrlWorldCupRun,
} from '@/lib/nrlWorldCupSave';

export { createNrlWorldCup, type NrlWorldCupLineup, type NrlWorldCupRun } from '@/lib/nrlWorldCupSave';

const GAME_RATINGS: Record<NrlWorldCupNation, number> = {
  australia: 82, 'new-zealand': 82, tonga: 80, samoa: 79, england: 79, fiji: 72,
  'papua-new-guinea': 71, 'cook-islands': 66, france: 64, lebanon: 64,
};

interface CupFixture {
  id: string;
  home: NrlWorldCupNation;
  away: NrlWorldCupNation;
  venue: string;
}
interface CupScore extends Pick<CupFixture, 'home' | 'away'> { homeScore: number; awayScore: number }
interface CupResult extends CupScore {
  id: string;
  winner: NrlWorldCupNation;
  goldenPoint: boolean;
  simulated: true;
}
interface CupTableRow {
  nation: NrlWorldCupNation;
  played: number;
  points: number;
  scored: number;
  conceded: number;
}

export function nrlWorldCupMatchday(nation: NrlWorldCupNation, { swap, target, firstReserve }: NrlWorldCupLineup = {}) {
  const sheet = NRL_WORLD_CUP_2026_OPENING_SQUADS[nation];
  const starters = sheet.slice(0, NRL_ROLES.length);
  const bench = sheet.slice(NRL_ROLES.length);
  const reserve = swap === undefined ? undefined : bench[swap];
  const starter = target === undefined
    ? reserve && starters.find(player => nrlCanPlayRole(reserve, player.role))
    : starters[target];
  const change = swap !== undefined && reserve && starter ? { reserve, starter } : undefined;
  if (change && swap !== undefined) {
    starters[starters.indexOf(change.starter)] = change.reserve;
    bench[swap] = change.starter;
  }
  if (firstReserve !== undefined && firstReserve > 0 && firstReserve < bench.length) {
    bench.unshift(...bench.splice(firstReserve, 1));
  }
  return { starters, bench, change };
}

function tournamentTeam(nation: NrlWorldCupNation, tactic: NrlTactic, change?: NrlWorldCupLineup) {
  // Reuse the opening selections as a fixed game roster in later rounds. Ratings are simulated.
  const opening = NRL_WORLD_CUP_2026_OPENING_SQUADS[nation];
  const squad = opening.map(({ id, name, role }, index) => ({
    id, name, role,
    rating: GAME_RATINGS[nation] - (index < NRL_ROLES.length ? 0 : 4), fitness: 100,
  }));
  const { starters, bench } = nrlWorldCupMatchday(nation, change);
  return {
    squad,
    lineup: Object.fromEntries(starters.map(({ id }, index) => [opening[index].role, id])) as Record<NrlRole, string>,
    bench: bench.map(({ id }) => id),
    preparation: null,
    tactic,
  };
}

export function nrlWorldCupRotation(nation: NrlWorldCupNation, change: NrlWorldCupLineup) {
  return [...nrlBenchRotation(tournamentTeam(nation, 'balanced', change)).values()];
}

function homeGround(fixture: CupFixture): NrlWorldCupNation {
  if (fixture.venue.endsWith('Christchurch')) return 'new-zealand';
  if (fixture.venue.endsWith('Port Moresby')) return 'papua-new-guinea';
  return 'australia';
}

function simulateCupMatch(seed: number, nation: NrlWorldCupNation, tactic: NrlTactic, fixture: CupFixture,
  change?: NrlWorldCupLineup): CupResult {
  const { id, home, away } = fixture;
  const homeTeam = nation === home ? tournamentTeam(home, tactic, change) : tournamentTeam(home, 'balanced');
  const awayTeam = nation === away ? tournamentTeam(away, tactic, change) : tournamentTeam(away, 'balanced');
  const ground = homeGround(fixture);
  const rng = rngFrom(hashLabel(`nrl-world-cup-v1|${seed}|${id}`));
  const score = scoreNrlRepresentativeMatch(homeTeam, awayTeam, rng, ground !== home);
  return { id, home, away, ...score, winner: score.homeScore > score.awayScore ? home : away, simulated: true };
}

export function simulateNrlWorldCupOpener(seed: number, side: NrlWorldCupOpenerSide, tactic: NrlTactic) {
  const { homeScore, awayScore, goldenPoint, winner, simulated } = simulateCupMatch(seed, side, tactic, NRL_WORLD_CUP_2026_OPENER);
  return { homeScore, awayScore, goldenPoint, winner, simulated };
}

const poolOf = new Map(Object.entries(NRL_WORLD_CUP_2026_POOLS).flatMap(([pool, nations]) => nations.map(nation => [nation, pool] as const)));
const drawOrder = (a: NrlWorldCupNation, b: NrlWorldCupNation) => NRL_WORLD_CUP_NATIONS.indexOf(a) - NRL_WORLD_CUP_NATIONS.indexOf(b);
const scoreDifference = (row: CupTableRow) => row.scored - row.conceded;
const fallback = (a: CupTableRow, b: CupTableRow) => scoreDifference(b) - scoreDifference(a) || b.scored - a.scored || drawOrder(a.nation, b.nation);
const matchupKey = (a: NrlWorldCupNation, b: NrlWorldCupNation) => [a, b].sort().join(':');

function rankTiedRows(rows: CupTableRow[], winners: ReadonlyMap<string, NrlWorldCupNation>): CupTableRow[] {
  // Pairwise official rules become ordering constraints. Resolve cycles with the disclosed game tiebreak.
  const preceding = new Map(rows.map(row => [row.nation, new Set<NrlWorldCupNation>()]));
  for (const [index, a] of rows.entries()) {
    for (const b of rows.slice(index + 1)) {
      const samePool = poolOf.get(a.nation) === poolOf.get(b.nation);
      const difference = scoreDifference(a) - scoreDifference(b);
      const winner = samePool ? difference > 0 ? a.nation : difference < 0 ? b.nation : undefined
        : winners.get(matchupKey(a.nation, b.nation));
      if (winner) preceding.get(winner === a.nation ? b.nation : a.nation)!.add(winner);
    }
  }
  const ranked: CupTableRow[] = [];
  const remaining = [...rows].sort(fallback);
  const reaches = (from: NrlWorldCupNation, target: NrlWorldCupNation, visited: Set<NrlWorldCupNation>): boolean => {
    if (from === target) return true;
    if (visited.has(from)) return false;
    visited.add(from);
    return [...preceding.get(from)!].some(next => reaches(next, target, visited));
  };
  while (remaining.length) {
    // Take a block with no incoming edge from the rest of the tie. A cyclic block keeps fallback order.
    const block = remaining.map(({ nation }) => remaining.filter(row => reaches(row.nation, nation, new Set())
      && reaches(nation, row.nation, new Set())))
      .find(component => component.every(row => [...preceding.get(row.nation)!]
        .every(parent => component.some(member => member.nation === parent))))!;
    ranked.push(...block);
    for (const row of block) {
      remaining.splice(remaining.indexOf(row), 1);
      for (const prior of preceding.values()) prior.delete(row.nation);
    }
  }
  return ranked;
}

export function rankNrlWorldCupPools(scores: readonly CupScore[]) {
  const rows = new Map<NrlWorldCupNation, CupTableRow>(NRL_WORLD_CUP_NATIONS.map(nation => [nation, { nation, played: 0, points: 0, scored: 0, conceded: 0 }]));
  const winners = new Map<string, NrlWorldCupNation>();
  for (const { home, away, homeScore, awayScore } of scores) {
    const homeRow = rows.get(home)!;
    const awayRow = rows.get(away)!;
    for (const [row, scored, conceded] of [[homeRow, homeScore, awayScore], [awayRow, awayScore, homeScore]] as const) {
      row.played++;
      row.scored += scored;
      row.conceded += conceded;
      row.points += scored > conceded ? NRL_WORLD_CUP_2026_FORMAT.winPoints : NRL_WORLD_CUP_2026_FORMAT.lossPoints;
    }
    if (homeScore !== awayScore) {
      const winner = homeScore > awayScore ? home : away;
      winners.set(matchupKey(home, away), winner);
    }
  }
  const table = (nations: readonly NrlWorldCupNation[]) => {
    const groups = new Map<number, CupTableRow[]>();
    for (const nation of nations) {
      const row = rows.get(nation)!;
      const tied = groups.get(row.points) ?? [];
      tied.push(row);
      groups.set(row.points, tied);
    }
    return [...groups.entries()].sort(([a], [b]) => b - a).flatMap(([, tied]) => rankTiedRows(tied, winners));
  };
  const { A, B, C } = NRL_WORLD_CUP_2026_POOLS;
  return { A: table(A), BC: table([...B, ...C]) };
}

export function nrlWorldCupCanPickLineup(run: NrlWorldCupRun, step = run.tactics.length + 1,
  report?: ReturnType<typeof nrlWorldCupResults>): boolean {
  if (step <= 3) return true;
  if (step > NRL_WORLD_CUP_STAGES) return false;
  const { tables, semifinals } = report ?? nrlWorldCupResults({ ...run, tactics: run.tactics.slice(0, step - 1) });
  return step === 4 ? [...tables.A.slice(0, 2), ...tables.BC.slice(0, 2)].some(row => row.nation === run.nation)
    : semifinals.some(match => match.winner === run.nation);
}

function validLineup(nation: NrlWorldCupNation, value: unknown): value is NrlWorldCupLineup {
  return isNrlWorldCupLineup(value)
    && (value.swap === undefined || nrlWorldCupMatchday(nation, value).change !== undefined);
}

export function advanceNrlWorldCup(run: NrlWorldCupRun, step: number, tactic: NrlTactic, lineup?: NrlWorldCupLineup): NrlWorldCupRun {
  if (step !== run.tactics.length + 1 || step > NRL_WORLD_CUP_STAGES || !isNrlWorldCupTactic(tactic)) return run;
  if (lineup !== undefined) {
    if (!validLineup(run.nation, lineup) || !nrlWorldCupCanPickLineup(run)) return run;
    return { ...run, tactics: [...run.tactics, tactic], lineups: { ...run.lineups, [step]: { ...lineup } } };
  }
  return { ...run, tactics: [...run.tactics, tactic] };
}

export function readNrlWorldCupSave(raw: string | null): NrlWorldCupRun | null {
  if (!raw || raw.length > NRL_WORLD_CUP_SAVE_MAX_CHARS) return null;
  try {
    const run: unknown = JSON.parse(raw);
    return isNrlWorldCupRun(run) && Object.entries(run.lineups ?? {}).every(([stage, lineup]) =>
      validLineup(run.nation, lineup) && nrlWorldCupCanPickLineup(run, Number(stage))) ? run : null;
  } catch {
    return null;
  }
}

export function nrlWorldCupResults({ seed, nation, tactics, lineups }: NrlWorldCupRun) {
  const poolMatches = NRL_WORLD_CUP_2026_POOL_FIXTURES.filter(fixture => tactics[fixture.round - 1])
    .map(fixture => simulateCupMatch(seed, nation, tactics[fixture.round - 1], fixture, lineups?.[fixture.round]));
  const tables = rankNrlWorldCupPools(poolMatches);
  const semifinals: CupResult[] = [];
  let final: CupResult | null = null;
  if (tactics[3]) {
    const { A, BC } = tables;
    // These cross-table pairings match the real draw outcome. Their venue order is a simulator convention.
    const [newcastle, sydney, brisbane] = NRL_WORLD_CUP_2026_KNOCKOUT_VENUES;
    semifinals.push(
      simulateCupMatch(seed, nation, tactics[3], { id: '2026-semifinal-1', home: A[1].nation, away: BC[0].nation, venue: newcastle.venue }, lineups?.[4]),
      simulateCupMatch(seed, nation, tactics[3], { id: '2026-semifinal-2', home: A[0].nation, away: BC[1].nation, venue: sydney.venue }, lineups?.[4]),
    );
    if (tactics[4]) {
      final = simulateCupMatch(seed, nation, tactics[4], { id: '2026-final', home: semifinals[1].winner, away: semifinals[0].winner, venue: brisbane.venue }, lineups?.[5]);
    }
  }
  return { poolMatches, tables, semifinals, final, champion: final?.winner ?? null };
}
