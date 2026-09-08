// Synthetic names and nations only. Never imported by the app or sent to a backend.
export function worldXiPoolFixture() {
  const roles = ['GK', 'GK', 'CB', 'CB', 'LB', 'CM', 'CM', 'RM', 'ST', 'ST'];
  const current = Array.from({ length: 2160 }, (_, i) => ({
    id: i + 1,
    player_name: `Fixture Player ${String(i).padStart(4, '0')}`,
    nationality: `Fixture Nation ${String(i % 12).padStart(2, '0')}`,
    position: roles[Math.floor(i / 12) % roles.length],
    club: 'Fixture Current Club', market_value_usd: 2_000_000 + i,
    year: 2026, age: 25,
  }));
  const previous = [
    { ...current[1000], id: 3000, club: 'Fixture Previous Club', market_value_usd: 9_000_000, year: 2025 },
    { ...current[0], id: 3001, player_name: 'Fixture Previous Extra', year: 2025 },
  ];
  const verified = [{ player_name: current[60].player_name, primary_position: 'CM', secondary_positions: ['RW'] }];
  return { current, previous, verified };
}
