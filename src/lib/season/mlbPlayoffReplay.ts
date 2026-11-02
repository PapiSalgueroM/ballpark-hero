import { usPlayoffLay, type UsRow, type UsSeasonBind, type UsSeasonCtx } from '@/lib/season/us';
import { usSeriesOrder } from '@/lib/season/usPlayoffs';
import { keyedRng } from '@/lib/keyedRng';

export interface MlbPlayoffReplayGame {
  round: string;
  series: number;
  no: number;
  won: boolean;
  mine: number;
  theirs: number;
  need: number;
}

export interface MlbPlayoffReplayData {
  games: MlbPlayoffReplayGame[];
  finish: string;
  line: string | null;
}

/** A W/L replay of the saved finish and team game count, never saved game scores. */
export function buildMlbPlayoffReplay(bind: UsSeasonBind, row: UsRow, ctx: UsSeasonCtx, key: string): MlbPlayoffReplayData | null {
  if (bind.slug !== 'mlb') return null;
  const lay = usPlayoffLay(bind, row, ctx, key);
  if (!lay || lay.series.some(series => series.games === null)) return null;
  const games: MlbPlayoffReplayGame[] = [];
  for (const [series, round] of lay.series.entries()) {
    const order = usSeriesOrder(round.need, round.games!, round.won, keyedRng(`${key}|mlb-po-view|${series}`));
    if (order.length !== round.games) return null;
    let mine = 0; let theirs = 0;
    for (const [at, won] of order.entries()) {
      if (won) mine += 1; else theirs += 1;
      games.push({ round: round.round, series, no: at + 1, won, mine, theirs, need: round.need });
    }
  }
  if (games.length !== row.poGames || games.length === 0) return null;
  return { games, finish: row.teamResult, line: typeof row.poLine === 'string' ? row.poLine : null };
}
