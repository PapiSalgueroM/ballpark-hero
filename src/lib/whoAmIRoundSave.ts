import type { GuessResult, WhoAmIPlayer } from './whoAmI';

export const WHO_AM_I_ROUND_KEY = 'who-am-i-round-v1';

export interface WhoAmIRound {
  phase: 'playing' | 'won' | 'lost';
  budget: 10 | 25;
  secret: WhoAmIPlayer;
  guesses: GuessResult[];
}

export function readWhoAmIRoundBytes(): string | null | undefined {
  try { return localStorage.getItem(WHO_AM_I_ROUND_KEY); }
  catch { return undefined; }
}

function isSavedPlayer(value: unknown): value is WhoAmIPlayer {
  if (!value || typeof value !== 'object') return false;
  const p = value as WhoAmIPlayer;
  return typeof p.personKey === 'string' && p.personKey.length > 0 && typeof p.name === 'string' && p.name.length > 0
    && typeof p.nationality === 'string' && typeof p.position === 'string' && typeof p.club === 'string'
    && Number.isFinite(p.age) && Number.isFinite(p.year) && Number.isFinite(p.value);
}

function isSavedGuess(value: unknown, secret: WhoAmIPlayer): value is GuessResult {
  if (!value || typeof value !== 'object') return false;
  const { player, breakdown } = value as GuessResult;
  if (!isSavedPlayer(player) || !breakdown || typeof breakdown !== 'object') return false;
  const { isExact, score, ageDiff, valueLogDiff, natMatch, posGroupMatch, posExactMatch, sameClub, sharedClubPast } = breakdown;
  return isExact === (player.personKey === secret.personKey)
    && Number.isInteger(score) && score >= 0 && score <= 100 && (score === 100) === isExact
    && Number.isFinite(ageDiff) && Number.isFinite(valueLogDiff)
    && [natMatch, posGroupMatch, posExactMatch, sameClub, sharedClubPast].every(flag => typeof flag === 'boolean');
}

export function readWhoAmIRound(raw: string | null | undefined): WhoAmIRound | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const { version, phase, budget, secret, guesses } = value as WhoAmIRound & { version: number };
    if (version !== 1 || (phase !== 'playing' && phase !== 'won' && phase !== 'lost')
      || (budget !== 10 && budget !== 25) || !isSavedPlayer(secret) || !Array.isArray(guesses) || guesses.length > budget
      || !guesses.every(guess => isSavedGuess(guess, secret))) return null;
    const exact = guesses.findIndex(guess => guess.breakdown.isExact);
    if (phase === 'won' ? exact < 0 || exact !== guesses.length - 1 : exact !== -1) return null;
    if (phase === 'playing' && guesses.length >= budget) return null;
    return { phase, budget, secret, guesses };
  } catch {
    return null;
  }
}
