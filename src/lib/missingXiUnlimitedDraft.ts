import { guessKey, HELD_LINEUP_IDS, isCorrectGuess, LINEUPS, MAX_GUESSES, type ActivePuzzle } from '@/lib/missingXi';
import { safeLocalStorage } from '@/lib/safeStorage';

const KEY = 'dukb-missing-xi-unlimited-v1';

type Draft = {
  puzzle: ActivePuzzle;
  misses: string[];
  active: boolean;
};

export function loadMissingXiUnlimitedDraft(): { raw: string | null; draft: Draft | null } {
  const raw = safeLocalStorage.getItem(KEY);
  if (raw === null) return { raw, draft: null };
  try {
    const value: unknown = JSON.parse(raw);
    if (value === null || typeof value !== 'object') return { raw, draft: null };
    const { lineupId, slotIndex, misses, active } = value as Record<string, unknown>;
    if (typeof lineupId !== 'string' || HELD_LINEUP_IDS.has(lineupId) || typeof active !== 'boolean'
      || !Array.isArray(misses) || misses.length >= MAX_GUESSES) return { raw, draft: null };
    const lineup = LINEUPS.find(row => row.id === lineupId);
    const candidate = lineup?.blankCandidates.find(blank => blank.slotIndex === slotIndex);
    if (!lineup || !candidate || !misses.every((name): name is string =>
      typeof name === 'string' && !!name.trim() && !isCorrectGuess(name, candidate))) return { raw, draft: null };
    if (new Set(misses.map(name => guessKey(name, lineup))).size !== misses.length) return { raw, draft: null };
    return { raw, draft: { puzzle: { lineup, candidate }, misses, active } };
  } catch {
    return { raw, draft: null };
  }
}

export function encodeMissingXiUnlimitedDraft({ puzzle, misses, active }: Draft): string {
  return JSON.stringify({ lineupId: puzzle.lineup.id, slotIndex: puzzle.candidate.slotIndex, misses, active });
}

export function writeMissingXiUnlimitedDraft(previous: string | null, next: string | null): boolean {
  if (safeLocalStorage.getItem(KEY) !== previous) return false;
  if (next === null) safeLocalStorage.removeItem(KEY);
  else safeLocalStorage.setItem(KEY, next);
  return true;
}
