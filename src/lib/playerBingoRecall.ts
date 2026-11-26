export type BingoEnd = 'deck' | 'strikes' | 'banked' | 'blackout';
export type BingoTile = { id: string; label: string; icon: string };
export interface FinishedBingo {
  id: string;
  phase: 'won' | 'lost';
  endReason: BingoEnd;
  tiles: BingoTile[];
  locked: Record<string, string>;
  strikes: number;
  seen: number;
  extended: boolean;
  gaveUp: boolean;
  answers: string[];
}
const key = 'player_bingo_finished_v1';

export function recallQuestions(tiles: BingoTile[], locked: Record<string, string>) {
  const placed = tiles.filter(tile => Object.prototype.hasOwnProperty.call(locked, tile.id));
  const names = [...new Set(placed.map(tile => locked[tile.id]))];
  if (names.length < 2) return [];
  const count = Math.min(3, placed.length);
  return Array.from({ length: count }, (_, i) => {
    const tile = placed[Math.round(i * (placed.length - 1) / (count - 1))];
    const player = locked[tile.id];
    const first = names.indexOf(player);
    const options = Array.from({ length: Math.min(3, names.length) }, (_, offset) => names[(first + offset) % names.length]).sort();
    return { id: tile.id, label: tile.label, player, options };
  });
}

export function readFinishedBingo(): FinishedBingo | null {
  try {
    const r = JSON.parse(localStorage.getItem(key) ?? 'null') as FinishedBingo | null;
    if (!r || typeof r.id !== 'string' || !r.id || !['won', 'lost'].includes(r.phase)
      || !['deck', 'strikes', 'banked', 'blackout'].includes(r.endReason) || typeof r.extended !== 'boolean' || typeof r.gaveUp !== 'boolean'
      || !Number.isInteger(r.strikes) || r.strikes < 0 || r.strikes > (r.extended ? 4 : 3)
      || !Number.isInteger(r.seen) || r.seen < 1 || !Array.isArray(r.tiles) || r.tiles.length !== 24
      || !r.locked || typeof r.locked !== 'object' || Array.isArray(r.locked)) return null;
    if (!r.tiles.every(t => t && typeof t.id === 'string' && t.id && typeof t.label === 'string' && t.label && typeof t.icon === 'string')) return null;
    const ids = new Set(r.tiles.map(t => t.id));
    if (ids.size !== 24 || !Object.entries(r.locked).every(([id, name]) => ids.has(id) && typeof name === 'string' && name)) return null;
    const questions = recallQuestions(r.tiles, r.locked);
    if (!Array.isArray(r.answers) || !r.answers.every((answer, i) => questions[i]?.options.includes(answer))) return null;
    return r;
  } catch { return null; }
}

export function saveFinishedBingo(result: FinishedBingo, firstSave: boolean) {
  try {
    const previous = readFinishedBingo();
    if (firstSave || (previous?.id === result.id && previous.answers.every((answer, i) => result.answers[i] === answer))) {
      localStorage.setItem(key, JSON.stringify(result));
    }
  } catch { /* The board is still available in memory. */ }
}

export function clearFinishedBingo(id: string) {
  try { if (readFinishedBingo()?.id === id) localStorage.removeItem(key); } catch { /* Storage unavailable. */ }
}
