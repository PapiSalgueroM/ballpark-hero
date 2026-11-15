import type { DraftablePlayer, GameMode, SimResult } from '@/lib/perfectSeason';
import { NBA_GAMES, NBA_SLOTS } from '@/lib/perfectSeasonNba';
import { PLAYOFF_THRESHOLD, type NbaPlayoffRotation, type PlayoffRun } from '@/lib/perfectSeasonExpansion';

const NBA_PLAYOFF_SAVE = 'perfect-season-nba-playoffs';

export interface NbaPlayoffSave {
  v: 1;
  mode: Exclude<GameMode, 'daily'>;
  sim: SimResult;
  spins: number;
  picks: Record<string, DraftablePlayer | null>;
  decadeId: string | null;
  seed: number;
  postseason: { rotation: NbaPlayoffRotation; run: PlayoffRun } | null;
}

export function loadNbaPlayoffs(): NbaPlayoffSave | null {
  try {
    const save = JSON.parse(localStorage.getItem(NBA_PLAYOFF_SAVE) ?? 'null') as NbaPlayoffSave | null;
    if (save?.v !== 1 || (save.mode !== 'classic' && save.mode !== 'hard')) return null;
    const { sim, picks, postseason } = save;
    if (!Array.isArray(sim?.games) || sim.games.length !== NBA_GAMES || sim.games.some(game => typeof game !== 'boolean')
      || sim.wins !== sim.games.filter(Boolean).length || sim.wins < PLAYOFF_THRESHOLD.nba
      || sim.losses !== NBA_GAMES - sim.wins || !Number.isFinite(sim.overall)) return null;
    if (!Number.isInteger(save.seed) || !Number.isInteger(save.spins) || NBA_SLOTS.some(slot => {
      const pick = picks?.[slot.key];
      return !pick || typeof pick.name !== 'string' || !Number.isFinite(pick.rating);
    })) return null;
    if (postseason !== null && (
      (postseason?.rotation !== 'standard' && postseason?.rotation !== 'starters')
      || !Array.isArray(postseason.run?.rounds) || postseason.run.rounds.length === 0
      || postseason.run.rounds.some(round => !round || typeof round.score !== 'string')
    )) return null;
    return save;
  } catch {
    return null;
  }
}

export function saveNbaPlayoffs(save: NbaPlayoffSave): void {
  try {
    localStorage.setItem(NBA_PLAYOFF_SAVE, JSON.stringify(save));
  } catch {
    // The current bracket is still available when storage is unavailable.
  }
}
