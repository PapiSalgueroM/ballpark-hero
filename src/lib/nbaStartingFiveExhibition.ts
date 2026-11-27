import { NBA_POSITIONS, type NbaPosition } from '@/types/nba';
import { NBA_FIVE_CHALLENGES, findPoolEntry, valueFor, type NbaFivePick, type NbaFiveTeamPool } from '@/lib/nbaStartingFiveScore';

export interface ExhibitionPlayer {
  role: NbaPosition;
  name: string;
  ppg: number;
  apg: number;
  rpg: number;
}

export interface ExhibitionCall {
  lead: NbaPosition;
  action: 'keep' | 'pass';
}

export interface ExhibitionSeries {
  five: ExhibitionPlayer[];
  seed: number;
  calls: ExhibitionCall[];
}

export function exhibitionFive(picks: NbaFivePick[], pools: NbaFiveTeamPool[]): ExhibitionPlayer[] | null {
  const five: ExhibitionPlayer[] = [];
  for (const { role, name, team } of picks) {
    const pool = pools.find(p => p.team === team);
    const entry = pool && findPoolEntry(pool, name);
    if (!entry) return null;
    const ratings = ['ppg', 'apg', 'rpg'].map(key => valueFor(entry, NBA_FIVE_CHALLENGES.find(c => c.key === key)!));
    const [points, assists, rebounds] = ratings;
    if (!points.ok || !assists.ok || !rebounds.ok) return null;
    five.push({ role, name: entry.name, ppg: points.value, apg: assists.value, rpg: rebounds.value });
  }
  return five.length === 5 ? five : null;
}

// Each game reuses its draws across coaching choices. The same saved calls always replay the same possessions.
function gameRandom(seed: number, game: number) {
  let state = (seed + Math.imul(game + 1, 0x9e3779b9)) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function exhibitionScout(series: ExhibitionSeries, game: number) {
  const random = gameRandom(series.seed, game);
  const previous = series.calls[game - 1];
  const trap = previous ? previous.action === 'keep' : random() < 0.5;
  return { trap, target: 11 + 2 * Math.floor(random() * 3), watched: previous?.lead };
}

export function exhibitionGame(series: ExhibitionSeries, game: number, call: ExhibitionCall) {
  const scout = exhibitionScout(series, game);
  const lead = series.five.find(player => player.role === call.lead)!;
  const teammates = series.five.filter(player => player.role !== call.lead);
  const shots = series.five.map(player => ({ role: player.role, attempts: 0, makes: 0 }));
  const random = gameRandom(series.seed ^ 0x76291afe, game);
  const keeping = call.action === 'keep';
  const leadTrips = keeping ? 8 : 4;
  const glass = series.five.reduce((sum, player) => sum + player.rpg, 0) / 5;
  let putback = false;
  let points = 0;
  for (let i = 0; i < 12; i++) {
    const player = i < leadTrips ? lead : teammates[(i - leadTrips) % 4];
    const line = shots.find(row => row.role === player.role)!;
    line.attempts++;
    const shotRoll = random();
    const reboundRoll = random();
    const pressure = scout.watched === lead.role ? 0.08 : 0;
    const base = 0.30 + Math.min(32, player.ppg) / 100;
    const chance = player.role === lead.role
      ? base + (scout.trap ? -0.15 : 0.15) - pressure
      : base + Math.min(12, lead.apg) / 55 + (scout.trap ? 0.12 : -0.05) - pressure / 2;
    if (shotRoll < chance) {
      line.makes++;
      points += 2;
    } else if (!putback && reboundRoll < Math.min(0.23, glass / 65)) {
      putback = true;
      points += 2;
    }
  }
  return { points, target: scout.target, won: points > scout.target, shots, putback };
}

export function exhibitionResults(series: ExhibitionSeries) {
  const games = series.calls.map((call, i) => exhibitionGame(series, i, call));
  const wins = games.filter(game => game.won).length;
  const losses = games.length - wins;
  return { games, wins, losses, complete: wins === 2 || losses === 2 };
}

export const SERIES_KEY = 'dukb-nba-starting-five-exhibition-v1';

export function readExhibition(raw: string | null): ExhibitionSeries | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || !Number.isSafeInteger(data.seed) || data.seed < 0 || data.seed > 0xffffffff ||
      !Array.isArray(data.five) || data.five.length !== 5 ||
      !NBA_POSITIONS.every(({ role }) => data.five.some((p: ExhibitionPlayer) => p?.role === role &&
        typeof p.name === 'string' && p.name.trim() &&
        [p.ppg, p.apg, p.rpg].every(n => Number.isFinite(n) && n >= 0))) ||
      !Array.isArray(data.calls) || data.calls.length > 3 ||
      !data.calls.every((c: ExhibitionCall) => c && NBA_POSITIONS.some(p => p.role === c.lead) &&
        (c.action === 'keep' || c.action === 'pass'))) return null;
    if (data.calls.length === 3 && exhibitionResults({ ...data, calls: data.calls.slice(0, 2) }).complete) return null;
    return data;
  } catch { return null; }
}
