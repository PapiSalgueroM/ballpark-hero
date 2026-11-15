import { shuffled, type DerivedGame, type Rng } from './core';
import { splitTotal, type UsRow } from './us';
import { mlbPitchingDecisionsFit } from '../mlbSeasonHeld';

export const PITCHING_KEYS = ['wins', 'lossesP', 'so', 'saves', 'holds'] as const;
const DECISIONS = [['wins', 'W'], ['lossesP', 'L'], ['saves', 'SV'], ['holds', 'HLD']] as const;

export const mlbPitcher = (pos?: string) => pos === 'SP' || pos === 'RP';

/** The save has totals, so reconstruct appearances using the existing scores. */
export function placeMlbPitching(games: DerivedGame[], row: UsRow, pos: string, rng: Rng): boolean {
  if (!Number.isInteger(row.games) || row.games <= 0 || row.games > games.length) return false;
  const values = PITCHING_KEYS.map(key => row[key]);
  if (values.every(value => value === undefined)) return false;
  if (values.some(value => value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 0))) return false;
  const [wins, losses, strikeouts, saves, holds] = values.map(value => Number(value ?? 0));
  const winning = shuffled(games.filter(g => g.us > g.them), rng);
  const losing = shuffled(games.filter(g => g.us < g.them), rng);
  const canPlace = mlbPitchingDecisionsFit(row, pos, winning.length, losing.length);

  /* Prefer tight wins for saves. Final scores alone cannot describe the
   * simulated mound changes or the state of the bases. */
  const saveGames = new Set([...winning].sort((a, b) => (a.us - a.them) - (b.us - b.them)).slice(0, canPlace ? saves : 0));
  const winGames = new Set(winning.filter(g => !saveGames.has(g)).slice(0, canPlace ? wins : 0));
  const lossGames = new Set(losing.slice(0, canPlace ? losses : 0));
  const decisions = new Set([...winGames, ...saveGames, ...lossGames]);
  const remaining = shuffled(games.filter(g => !decisions.has(g)), rng).slice(0, row.games - decisions.size);
  const on = [...decisions, ...remaining];
  /* A hold can accompany a loss, but never a save or win. Prefer using a
   * separate game when the appearance count leaves room. */
  const holdGames = new Set([...remaining, ...lossGames].slice(0, canPlace ? holds : 0));
  const ks = splitTotal(strikeouts, on.map(() => 0.45 + 1.1 * rng()), on.map(() => pos === 'SP' ? 20 : 9));
  if (!ks) return false;

  for (const game of games) {
    game.played = false;
    game.started = false;
    game.why = 'rested';
  }
  on.forEach((game, i) => {
    game.played = true;
    game.started = pos === 'SP';
    delete game.why;
    if (canPlace && row.wins !== undefined) game.line.wins = Number(winGames.has(game));
    if (canPlace && row.lossesP !== undefined) game.line.lossesP = Number(lossGames.has(game));
    if (canPlace && row.saves !== undefined) game.line.saves = Number(saveGames.has(game));
    if (canPlace && row.holds !== undefined) game.line.holds = Number(holdGames.has(game));
    if (row.so !== undefined) game.line.so = ks[i];
  });
  return true;
}

export function pitchingBits(game: DerivedGame): string[] {
  const decisions: string[] = DECISIONS.filter(([key]) => game.line[key] === 1).map(([, label]) => label);
  if (!decisions.length && game.line.wins !== undefined && game.line.lossesP !== undefined) decisions.push('No decision');
  if (DECISIONS.every(([key]) => game.line[key] === undefined)) decisions.push('Pitching decisions unavailable by game');
  return decisions;
}

export function pitchingSoFar(so: Record<string, number>, pos: string): [string, string][] {
  const totals = [[pos === 'SP' ? 'Starts' : 'Appearances', String(so.apps)]] as [string, string][];
  for (const [key, label] of pos === 'SP' ? [['wins', 'W'], ['lossesP', 'L'], ['so', 'K']] : [['so', 'K'], ['saves', 'SV'], ['holds', 'HLD']]) {
    totals.push([label, so[key] === undefined ? '-' : String(so[key])]);
  }
  return totals;
}
