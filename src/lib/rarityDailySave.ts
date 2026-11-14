import type { RarityCategory, RarityMode, RoundResult } from '@/lib/rarityRound';

export interface RarityDailyProgress {
  phase: 'next' | 'revealed' | 'done';
  results: RoundResult[];
}

const keyFor = (date: string, mode: RarityMode) => `rarity-round-daily-${date}-${mode}`;

export function readRarityDaily(date: string, mode: RarityMode, categories: RarityCategory[]): RarityDailyProgress | null {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(date, mode)) ?? 'null');
    if (!saved || saved.v !== 1 || saved.date !== date || saved.mode !== mode || !Array.isArray(saved.categories)
      || saved.categories.length !== categories.length || !categories.every((category, index) => category.id === saved.categories[index])) return null;
    const { phase, results } = saved;
    if (!Array.isArray(results) || results.length === 0 || results.length > categories.length) return null;
    if (phase === 'done' ? results.length !== categories.length
      : phase === 'next' ? results.length >= categories.length : phase !== 'revealed') return null;
    if (!results.every((row, index) => row && row.categoryId === categories[index].id
      && typeof row.prompt === 'string' && typeof row.answerName === 'string' && row.answerName.trim().length > 0
      && Number.isSafeInteger(row.rank) && Number.isSafeInteger(row.poolSize) && row.rank >= 1 && row.rank <= row.poolSize
      && Number.isInteger(row.points) && row.points >= 0 && row.points <= 100)) return null;
    return { phase, results };
  } catch {
    return null;
  }
}

export function writeRarityDaily(date: string, mode: RarityMode, categories: RarityCategory[], progress: RarityDailyProgress): void {
  try {
    const key = keyFor(date, mode);
    localStorage.setItem(key, JSON.stringify({ v: 1, date, mode, categories: categories.map(category => category.id), ...progress }));
    const olderKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const candidate = localStorage.key(index);
      if (candidate && /^rarity-round-daily-\d{4}-\d{2}-\d{2}-(rarity|crowd)$/.test(candidate)
        && candidate < `rarity-round-daily-${date}-`) olderKeys.push(candidate);
    }
    olderKeys.forEach(old => localStorage.removeItem(old));
  } catch { /* Play can continue when storage is unavailable. */ }
}
