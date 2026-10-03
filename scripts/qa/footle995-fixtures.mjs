/* Fictional network fixtures only. No claims about actual players or totals. */
export const FIXED_TIME = '2026-10-03T16:00:00.000Z';
export const FIXED_DAY = '2026-10-03';
export const RUN_KEY = 'footle-practice-run-v1';
export function frozenMarketRows() {
  const famous = Array.from({ length: 100 }, (_, index) => ({
    player_name: `Practice Fixture Famous ${String(index + 1).padStart(3, '0')}`,
    position: 'Central Midfield', age: 20 + index % 12, nationality: 'France',
    club: 'Arsenal FC', market_value_usd: (200 - index) * 1_000_000,
    goals: index === 0 ? null : index % 14, assists: index === 1 ? null : index % 9,
  }));
  const obscure = Array.from({ length: 12 }, (_, index) => ({
    player_name: `Practice Fixture Obscure ${String(index + 1).padStart(3, '0')}`,
    position: 'Centre-Back', age: 21 + index % 10, nationality: 'Brazil',
    club: 'Udinese Calcio', market_value_usd: (7 - index / 10) * 1_000_000,
    goals: index === 0 ? null : index % 3, assists: index === 1 ? null : index % 4,
  }));
  return { famous, obscure };
}

export function marketResponse(url, changed = false) {
  const { famous, obscure } = frozenMarketRows();
  const rows = url.searchParams.has('club')
    ? (url.searchParams.get('club').includes('Udinese Calcio') ? obscure : [])
    : famous;
  // Same player membership and sorting, new clue values after a reload.
  // A running session must keep its own original comparison snapshot.
  return changed ? rows.map(row => ({ ...row, goals: row.goals + 30, assists: row.assists + 20, age: row.age + 1 })) : rows;
}
