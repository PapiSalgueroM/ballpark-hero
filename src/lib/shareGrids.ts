// Emoji-grid builders for share cards, so posted results look like the game.

interface GridCellLike {
  status: string; // 'correct' | 'wrong' | 'empty' | ...
  rarity?: number | null;
}

/** 3x3 grid. Correct cells are colored by rarity tier (rarer = cooler); others are ⬛. */
export function gridCellsToEmoji(cells: GridCellLike[]): string {
  const sq = (c: GridCellLike): string => {
    if (c.status !== 'correct') return '⬛';
    const r = c.rarity;
    if (r == null) return '🟩';
    if (r < 2) return '🟪';
    if (r < 5) return '🟦';
    if (r < 10) return '🟩';
    if (r < 20) return '🟥';
    if (r < 35) return '🟨';
    return '🟫';
  };
  const e = cells.map(sq);
  return [e.slice(0, 3).join(''), e.slice(3, 6).join(''), e.slice(6, 9).join('')].join('\n');
}

const CONNECTIONS_COLOR: Record<string, string> = {
  easy: '🟨',
  medium: '🟩',
  hard: '🟦',
  insane: '🟪',
};

/** One row of 4 squares per solved group, colored by the group's difficulty. */
export function connectionsGroupsToEmoji(groups: { difficulty: string }[]): string {
  return groups.map((g) => (CONNECTIONS_COLOR[g.difficulty] ?? '⬛').repeat(4)).join('\n');
}
