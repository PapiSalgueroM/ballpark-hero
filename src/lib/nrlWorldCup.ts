import {
  NRL_WORLD_CUP_2026_FORMAT, NRL_WORLD_CUP_2026_KNOCKOUT_VENUES, NRL_WORLD_CUP_2026_OPENER,
  NRL_WORLD_CUP_2026_OPENING_SQUADS, NRL_WORLD_CUP_2026_POOL_FIXTURES, NRL_WORLD_CUP_2026_POOLS,
  type NrlWorldCupNation, type NrlWorldCupOpenerSide,
} from '@/data/nrlWorldCup2026';
import { hashLabel, rngFrom } from '@/lib/careerEngine';
import { NRL_ROLES, NRL_TACTICS, scoreNrlRepresentativeMatch, type NrlRole, type NrlTactic } from '@/lib/nrlManager';

const NATIONS = Object.values(NRL_WORLD_CUP_2026_POOLS).flat();
const MAX_STEPS = 5;
const MAX_SAVE_CHARS = 512;
const GAME_RATINGS: Record<NrlWorldCupNation, number> = {
  australia: 82, 'new-zealand': 82, tonga: 80, samoa: 79, england: 79, fiji: 72,
  'papua-new-guinea': 71, 'cook-islands': 66, france: 64, lebanon: 64,
};

export interface NrlWorldCupRun {
  version: 1;
  year: 2026;
  seed: number;
  nation: NrlWorldCupNation;
  tactics: NrlTactic[];
}

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

const isNation = (nation: unknown): nation is NrlWorldCupNation => NATIONS.includes(nation as NrlWorldCupNation);
const isTactic = (tactic: unknown): tactic is NrlTactic => NRL_TACTICS.includes(tactic as NrlTactic);

function tournamentTeam(nation: NrlWorldCupNation, tactic: NrlTactic) {
  // Reuse the opening selections as a fixed game roster in later rounds. Ratings are simulated.
  const squad = NRL_WORLD_CUP_2026_OPENING_SQUADS[nation].map(({ id, name, role }, index) => ({
    id, name, role,
    rating: GAME_RATINGS[nation] - (index < NRL_ROLES.length ? 0 : 4), fitness: 100,
  }));
  return {
    squad,
    lineup: Object.fromEntries(squad.slice(0, NRL_ROLES.length).map(({ role, id }) => [role, id])) as Record<NrlRole, string>,
    bench: squad.slice(NRL_ROLES.length).map(({ id }) => id),
    preparation: null,
    tactic,
  };
}

function homeGround(fixture: CupFixture): NrlWorldCupNation {
  if (fixture.venue.endsWith('Christchurch')) return 'new-zealand';
  if (fixture.venue.endsWith('Port Moresby')) return 'papua-new-guinea';
  return 'australia';
}

function simulateCupMatch(seed: number, nation: NrlWorldCupNation, tactic: NrlTactic, fixture: CupFixture): CupResult {
  const { id, home, away } = fixture;
  const homeTeam = tournamentTeam(home, nation === home ? tactic : 'balanced');
  const awayTeam = tournamentTeam(away, nation === away ? tactic : 'balanced');
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
const drawOrder = (a: NrlWorldCupNation, b: NrlWorldCupNation) => NATIONS.indexOf(a) - NATIONS.indexOf(b);
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
  const rows = new Map<NrlWorldCupNation, CupTableRow>(NATIONS.map(nation => [nation, { nation, played: 0, points: 0, scored: 0, conceded: 0 }]));
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

export function createNrlWorldCup(seed: number, nation: NrlWorldCupNation): NrlWorldCupRun {
  return { version: 1, year: 2026, seed: seed >>> 0, nation, tactics: [] };
}

export function advanceNrlWorldCup(run: NrlWorldCupRun, step: number, tactic: NrlTactic): NrlWorldCupRun {
  if (step !== run.tactics.length + 1 || step > MAX_STEPS || !isTactic(tactic)) return run;
  return { ...run, tactics: [...run.tactics, tactic] };
}

export function readNrlWorldCupSave(raw: string | null): NrlWorldCupRun | null {
  if (!raw || raw.length > MAX_SAVE_CHARS) return null;
  try {
    const run: NrlWorldCupRun = JSON.parse(raw);
    if (!run || typeof run !== 'object' || Object.keys(run).length !== 5 || run.version !== 1 || run.year !== 2026
      || !Number.isSafeInteger(run.seed) || run.seed !== (run.seed >>> 0) || !isNation(run.nation)
      || !Array.isArray(run.tactics) || run.tactics.length > MAX_STEPS || !run.tactics.every(isTactic)) return null;
    return run;
  } catch {
    return null;
  }
}

export function nrlWorldCupResults({ seed, nation, tactics }: NrlWorldCupRun) {
  const poolMatches = NRL_WORLD_CUP_2026_POOL_FIXTURES.filter(fixture => tactics[fixture.round - 1])
    .map(fixture => simulateCupMatch(seed, nation, tactics[fixture.round - 1], fixture));
  const tables = rankNrlWorldCupPools(poolMatches);
  const semifinals: CupResult[] = [];
  let final: CupResult | null = null;
  if (tactics[3]) {
    const { A, BC } = tables;
    // These cross-table pairings match the real draw outcome. Their venue order is a simulator convention.
    const [newcastle, sydney, brisbane] = NRL_WORLD_CUP_2026_KNOCKOUT_VENUES;
    semifinals.push(
      simulateCupMatch(seed, nation, tactics[3], { id: '2026-semifinal-1', home: A[1].nation, away: BC[0].nation, venue: newcastle.venue }),
      simulateCupMatch(seed, nation, tactics[3], { id: '2026-semifinal-2', home: A[0].nation, away: BC[1].nation, venue: sydney.venue }),
    );
    if (tactics[4]) {
      final = simulateCupMatch(seed, nation, tactics[4], { id: '2026-final', home: semifinals[1].winner, away: semifinals[0].winner, venue: brisbane.venue });
    }
  }
  return { poolMatches, tables, semifinals, final, champion: final?.winner ?? null };
}
