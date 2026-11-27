import { hexDistance, SOCCER_ADJACENCY, SOCCER_CLUB_MAP, SOCCER_IMPERIALISM, SOCCER_REGIONS } from '@/data/soccerConquest';
import { applyRecords, emptyRecords, homeWinProb, matchupMomentum, resolveGame, seedEmpires, statesOf, type ImpGame } from '@/lib/imperialismEngine';
import { mulberry32 } from '@/lib/leagueCore';

export const FRONTIER_KEY = 'dukb-soccer-frontier-v1';
export const MATCH_LIMIT = 3;
export const LAND_GOAL = 4;
export interface FrontierRun {
  club: string;
  seed: number;
  games: ImpGame[];
}

function bordering(owners: Record<string, string>, club: string) {
  const rivals = new Set<string>();
  for (const r of statesOf(owners, club)) {
    for (const adjacent of SOCCER_ADJACENCY[r]) if (owners[adjacent] !== club) rivals.add(owners[adjacent]);
  }
  return rivals;
}

function landings(owners: Record<string, string>, club: string) {
  const bases = SOCCER_REGIONS.filter(r => owners[r.id] === club);
  const distances = new Map<string, number>();
  for (const region of SOCCER_REGIONS) {
    const rival = owners[region.id];
    if (rival === club) continue;
    const distance = Math.min(...bases.map(base => hexDistance([base.col, base.row], [region.col, region.row])));
    distances.set(rival, Math.min(distance, distances.get(rival) ?? Infinity));
  }
  return [...distances].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([id]) => id);
}

export function frontierBoard(run: FrontierRun) {
  const owners = seedEmpires(SOCCER_IMPERIALISM);
  const opening = statesOf(owners, run.club).length;
  for (const g of run.games) for (const region of g.flipped) owners[region] = g.winner;
  const regions = statesOf(owners, run.club);
  const gained = regions.length - opening;
  const won = gained >= LAND_GOAL;
  const finished = won || regions.length === 0 || run.games.length >= MATCH_LIMIT;
  const borders = bordering(owners, run.club);
  const ferry = !finished && borders.size === 0;
  const rivals = finished ? [] : ferry ? landings(owners, run.club) : [...borders];
  const records = applyRecords(emptyRecords(SOCCER_IMPERIALISM), run.games);
  const options = rivals.map(id => ({
    id,
    regions: statesOf(owners, id).length,
    opens: [...bordering(owners, id)].filter(other => other !== run.club && !borders.has(other)).length,
    chance: 1 - homeWinProb(SOCCER_IMPERIALISM, id, run.club, matchupMomentum(id, run.club, owners, records)),
  })).sort((a, b) => a.id.localeCompare(b.id));
  // Offer a path for land, one for safer odds and one for future opponents.
  const fronts = new Set<typeof options[number]>();
  if (options.length) {
    for (const measure of ['regions', 'chance', 'opens'] as const) {
      fronts.add(options.reduce((best, option) => option[measure] > best[measure] ? option : best));
    }
    for (const option of options) if (fronts.size < 3) fronts.add(option);
  }
  return { owners, opening, regions, gained, won, finished, ferry, rivals, fronts: [...fronts], records };
}

export function contestFront(run: FrontierRun, rival: string): FrontierRun | null {
  const board = frontierBoard(run);
  if (!board.fronts.some(f => f.id === rival)) return null;
  const rng = mulberry32(run.seed + Math.imul(run.games.length, 0x9e3779b9));
  const game = resolveGame(SOCCER_IMPERIALISM, rival, run.club, board.owners, rng, board.records);
  return { ...run, games: [...run.games, game] };
}

export function readFrontier(raw: string | null): FrontierRun | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || !SOCCER_CLUB_MAP.has(value.club) || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff ||
      !Array.isArray(value.games) || value.games.length > MATCH_LIMIT) return null;
    const run: FrontierRun = { club: value.club, seed: value.seed, games: [] };
    for (const game of value.games) {
      const before = frontierBoard(run);
      if (!game || game.away !== run.club || !before.rivals.includes(game.home) ||
        (game.winner !== game.home && game.winner !== game.away) ||
        ![game.homeScore, game.awayScore].every(n => Number.isInteger(n) && n >= 0 && n <= 4) ||
        (game.homeScore === 0 && game.awayScore === 0) ||
        typeof game.overtime !== 'boolean' || game.overtime !== (game.homeScore === game.awayScore) ||
        (!game.overtime && (game.homeScore > game.awayScore) !== (game.winner === game.home))) return null;
      const lost = statesOf(before.owners, game.winner === run.club ? game.home : run.club);
      if (!Array.isArray(game.flipped) || game.swing !== lost.length || game.flipped.length !== lost.length ||
        !lost.every(id => game.flipped.includes(id))) return null;
      run.games.push(game);
    }
    return run;
  } catch { return null; }
}
