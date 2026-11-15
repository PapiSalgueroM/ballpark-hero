import { shuffled, type DerivedGame, type Rng } from './core';
import { splitTotal, type UsRow } from './us';
import { mlbPitchingDecisionsFit } from '../mlbSeasonHeld';

export const PITCHING_KEYS = ['wins', 'lossesP', 'so', 'saves', 'holds'] as const;
const DECISIONS = [['wins', 'W'], ['lossesP', 'L'], ['saves', 'SV'], ['holds', 'HLD']] as const;

export const mlbPitcher = (pos?: string) => pos === 'SP' || pos === 'RP';

/** A linescore can establish a possible lead for a reliever without inventing
 * a pitching change or a baserunner. Order the half innings by home and away. */
export function pitchingOpportunities(game: DerivedGame) {
  const length = game.events.some(event => event.min === 10) ? 10 : 9;
  const inningRuns = Array.from({ length }, () => ({ us: 0, them: 0 }));
  for (const event of game.events) {
    if (event.kind === 'inning') inningRuns[event.min - 1][event.side] += event.pts ?? 0;
  }
  let lead = 0;
  const defending = inningRuns.map(inning => {
    if (!game.home) lead += inning.us;
    const before = lead;
    lead -= inning.them;
    const after = lead;
    if (game.home) lead += inning.us;
    return { before, after };
  });
  let save = false;
  let hold = false;
  let holdLoss = false;
  let keptLead = game.us > game.them;
  let stayedBehind = game.us < game.them;
  for (let i = length - 1; i >= 0; i--) {
    const { before, after } = defending[i];
    const close = before > 0 && before <= 3;
    keptLead = keptLead && before > 0 && after > 0;
    if (keptLead && (close || length - i >= 3)) save = true;
    if (close && after > 0 && i < length - 1) hold = true;
    /* A hold and a loss can coincide if the next pitcher lets the inherited
       tying and go-ahead runners score, after this pitcher recorded an out. */
    if (stayedBehind && before > 0 && before <= 2 && after < 0) holdLoss = true;
    stayedBehind = stayedBehind && before < 0 && after < 0;
  }
  return { save, hold: hold || holdLoss, holdLoss };
}

export function pitchingDecisions(games: readonly DerivedGame[], row: UsRow, pos: string) {
  const [wins, losses, saves, holds] = DECISIONS.map(([key]) => Number(row[key] ?? 0));
  const winning = games.filter(g => g.us > g.them);
  const losing = games.filter(g => g.us < g.them);
  if (!mlbPitchingDecisionsFit(row, pos, winning.length, losing.length)) return null;
  const options = new Map(games.map(game => [game, pitchingOpportunities(game)]));
  const hasHold = (game: DerivedGame) => options.get(game)!.hold;
  const preserveHolds = (a: DerivedGame, b: DerivedGame) => Number(hasHold(a)) - Number(hasHold(b));
  const saveGames = new Set(winning.filter(game => options.get(game)!.save)
    .sort((a, b) => preserveHolds(a, b) || (a.us - a.them) - (b.us - b.them)).slice(0, saves));
  if (saveGames.size < saves) return null;
  const winGames = new Set(winning.filter(game => !saveGames.has(game)).sort(preserveHolds).slice(0, wins));
  const free = row.games - wins - losses - saves;
  const holdLosses = losing.filter(game => options.get(game)!.holdLoss);
  const overlap = Math.max(0, holds - free);
  if (overlap > holdLosses.length || overlap > losses) return null;
  const firstLosses = holdLosses.slice(0, overlap);
  const lossGames = new Set([...firstLosses, ...losing.filter(game => !firstLosses.includes(game)).sort(preserveHolds)].slice(0, losses));
  const used = new Set([...winGames, ...saveGames, ...lossGames]);
  const holdGames = new Set([
    ...games.filter(game => !used.has(game) && hasHold(game)).slice(0, free),
    ...[...lossGames].filter(game => options.get(game)!.holdLoss),
  ].slice(0, holds));
  if (holdGames.size < holds) return null;
  return { winGames, lossGames, saveGames, holdGames };
}

/** The save has totals, so reconstruct appearances using the existing scores. */
export function placeMlbPitching(games: DerivedGame[], row: UsRow, pos: string, rng: Rng): boolean {
  if (!Number.isInteger(row.games) || row.games <= 0 || row.games > games.length) return false;
  const values = PITCHING_KEYS.map(key => row[key]);
  if (values.every(value => value === undefined)) return false;
  if (values.some(value => value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 0))) return false;
  const strikeouts = Number(row.so ?? 0);
  const shuffledGames = shuffled(games, rng);
  const credits = pitchingDecisions(shuffledGames, row, pos);
  const decisions = credits ? new Set([...credits.winGames, ...credits.saveGames, ...credits.lossGames, ...credits.holdGames]) : new Set<DerivedGame>();
  const remaining = shuffledGames.filter(g => !decisions.has(g)).slice(0, row.games - decisions.size);
  const on = [...decisions, ...remaining];
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
    if (credits && row.wins !== undefined) game.line.wins = Number(credits.winGames.has(game));
    if (credits && row.lossesP !== undefined) game.line.lossesP = Number(credits.lossGames.has(game));
    if (credits && row.saves !== undefined) game.line.saves = Number(credits.saveGames.has(game));
    if (credits && row.holds !== undefined) game.line.holds = Number(credits.holdGames.has(game));
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
