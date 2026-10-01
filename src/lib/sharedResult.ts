import { ALL_GAMES } from '@/data/gameRegistry';

export const SHARED_RESULT_PARAM = 'shared-result';
export const MAX_SHARED_SCORE_LENGTH = 160;

function validScore(score: string) {
  try { encodeURIComponent(score); } catch { return false; }
  return score.trim().length > 0 && score.length <= MAX_SHARED_SCORE_LENGTH
    && !/[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/.test(score);
}

export function createChallengeLink(gamePath: string, score: string): string | null {
  const game = ALL_GAMES.find(game => game.path === gamePath);
  if (!game || !validScore(score)) return null;
  const query = new URLSearchParams({ [SHARED_RESULT_PARAM]: score });
  return `https://douknowball.com${game.path}?${query}`;
}

export function decodeSharedResult(gamePath: string, search: string): { gameName: string; score: string } | null {
  const game = ALL_GAMES.find(game => game.path === gamePath);
  if (!game) return null;
  const scores: string[] = [];
  for (const field of search.replace(/^\?/, '').split('&')) {
    const separator = field.indexOf('=');
    const name = separator < 0 ? field : field.slice(0, separator);
    let key: string;
    try { key = decodeURIComponent(name.replace(/\+/g, ' ')); } catch { continue; }
    if (key !== SHARED_RESULT_PARAM) continue;
    const value = separator < 0 ? '' : field.slice(separator + 1);
    if (value.length > MAX_SHARED_SCORE_LENGTH * 12) return null;
    try { scores.push(decodeURIComponent(value.replace(/\+/g, ' '))); } catch { return null; }
  }
  if (scores.length !== 1 || !validScore(scores[0])) return null;
  return { gameName: game.label, score: scores[0] };
}
