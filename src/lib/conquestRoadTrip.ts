import { homeWinProb, type ImperialismSport } from '@/lib/imperialismEngine';
import type { ConquestMapSport } from '@/lib/conquestMapLook';
import { mulberry32 } from '@/lib/leagueCore';

export const TRIP_DATES = 5;
export const TRIP_TARGET = 3;
export type TripLeague = 'nfl' | 'mlb' | 'nhl';
export const tripRules = {
  nfl: { play: 'Use the scripted drive', normal: 'Keep the base playbook', resource: 'script', capacity: 1, boost: 0.26,
    hint: 'Your scripted drive adds 26 percentage points. A travel day gives you a new script.' },
  mlb: { play: 'Bring in the closer', normal: 'Stay with the regular pen', resource: 'bullpen use', capacity: 2, boost: 0.19,
    hint: 'Using the closer adds 19 percentage points. Pitch a game with the regular pen to recover one use.' },
  nhl: { play: 'Double-shift the top line', normal: 'Roll four lines', resource: 'extra shift', capacity: 2, boost: 0.22,
    hint: 'A double shift adds 22 percentage points. Win with four lines to earn one extra shift back.' },
};

export type TripAction = { to: string; call: 'regular' | 'boost' | 'travel' };
export interface TripRun { team: string; seed: number; turns: TripAction[] }
export interface TripBoard {
  at: string;
  supply: number;
  wins: number;
  stops: string[];
  log: { action: TripAction; won?: boolean; score?: string }[];
}
export function tripNetwork(sport: ImperialismSport, map: ConquestMapSport) {
  const owners = sport.seed();
  const neighbors = new Map<string, Set<string>>();
  for (const [region, team] of Object.entries(owners)) {
    if (!neighbors.has(team)) neighbors.set(team, new Set());
    for (const other of map.adjacency[region] ?? []) {
      const rival = owners[other];
      if (rival && team !== rival) neighbors.get(team)!.add(rival);
    }
  }
  return neighbors;
}
type Network = ReturnType<typeof tripNetwork>;

export function tripChoices(graph: Network, board: TripBoard) {
  return [...(graph.get(board.at) ?? [])].filter(id => !board.stops.includes(id)).sort();
}
export function tripOdds(sport: ImperialismSport, league: TripLeague, team: string, rival: string, boosted: boolean) {
  return Math.min(0.97, 1 - homeWinProb(sport, rival, team) + (boosted ? tripRules[league].boost : 0));
}

export function tripBoard(sport: ImperialismSport, league: TripLeague, graph: Network, run: TripRun): TripBoard | null {
  if (!graph.get(run.team)?.size || !Number.isInteger(run.seed) || run.seed < 0 || run.seed > 0xffffffff
    || !Array.isArray(run.turns) || run.turns.length > TRIP_DATES) return null;
  const rules = tripRules[league];
  const board: TripBoard = { at: run.team, supply: rules.capacity, wins: 0, stops: [run.team], log: [] };
  for (const [date, action] of run.turns.entries()) {
    if (!action || board.wins === TRIP_TARGET) return null;
    const { to, call } = action;
    if (call === 'travel') {
      if (to === board.at || !board.stops.includes(to)) return null;
      board.supply = rules.capacity;
      board.log.push({ action });
    } else {
      if ((call !== 'boost' && call !== 'regular') || (call === 'boost' && !board.supply) || !tripChoices(graph, board).includes(to)) return null;
      const rng = mulberry32(run.seed + Math.imul(date, 0x9e3779b9));
      const won = rng() < tripOdds(sport, league, run.team, to, call === 'boost');
      const [high, low] = sport.score.pair(rng);
      board.log.push({ action, won, score: won ? high + ' to ' + low : low + ' to ' + high });
      board.wins += Number(won);
      board.stops.push(to);
      if (call === 'boost') board.supply--;
      else if (league === 'mlb' || (league === 'nhl' && won)) board.supply = Math.min(rules.capacity, board.supply + 1);
    }
    board.at = to;
  }
  return board;
}

export function readTrip(sport: ImperialismSport, league: TripLeague, graph: Network, raw: string | null) {
  try {
    const run: TripRun = JSON.parse(raw ?? 'null');
    const board = run && tripBoard(sport, league, graph, run);
    return board ? { run, board } : null;
  } catch { return null; }
}
