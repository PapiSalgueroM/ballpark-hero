import type { UfcGuessResult } from '@/types/ufc';

export const clues = [
  { key: 'yearsActive', label: 'Years active', short: 'YRS', emoji: '📅' },
  { key: 'weightClass', label: 'Weight class', short: 'WEIGHT', emoji: '⚖️' },
  { key: 'nationality', label: 'Nationality', short: 'NAT', emoji: '🌍' },
  { key: 'age', label: 'Age', short: 'AGE', emoji: '🎂' },
  { key: 'wins', label: 'Wins', short: 'WINS', emoji: '✅' },
  { key: 'losses', label: 'Losses', short: 'LOSSES', emoji: '❌' },
  { key: 'draws', label: 'Draws', short: 'DRAWS', emoji: '🤝' },
  { key: 'koTko', label: 'KO/TKO', short: 'KO/TKO', emoji: '💥' },
  { key: 'submissions', label: 'Submissions', short: 'SUBS', emoji: '🔒' },
] as const;

export function ufcShareGrid(guesses: UfcGuessResult[]): string {
  if (!guesses.length) return 'No guesses made';
  const squares = { correct: '🟩', close: '🟨', incorrect: '⬜' };
  return guesses.map(guess => clues.map(({ key }) => squares[guess.cells[key].status] ?? '⬜').join('')).join('\n');
}
