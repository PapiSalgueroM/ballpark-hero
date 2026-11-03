import { describe, expect, it, vi } from 'vitest';
import { buildCriteria, type BingoData, type BingoPlayer, type SeasonStat } from '@/lib/playerBingo';

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: { from: () => { throw new Error('This criterion proof must not request a database'); } },
}));

// These two rows are retained in bingoPoolHistory-2026-10-29.json, not current live statistics.
const palmer: BingoPlayer = { name: 'Cole Palmer', nationality: 'England', position: 'Attacking Midfield', club: 'Chelsea FC', value: 119_000_000, age: 23, year: 2026 };
const retained2026: SeasonStat = { goals: 6, assists: 3, matches: 23, yellowCards: 5, redCards: 0 };
const retained2025: SeasonStat = { goals: 10, assists: 8, matches: 41, yellowCards: 6, redCards: 0 };
function dataFor(player: BingoPlayer = palmer, stats: SeasonStat[] = [{ ...retained2026 }]): BingoData {
  return {
    pool: [player], clubHistory: new Map(), clubYears: new Map(), seasonStats: new Map([[player.name, stats]]),
    worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set(),
  };
}
const red = (data: BingoData) => buildCriteria(data).find(item => item.id === 'season-red-card')!;
function rejected(change: Partial<BingoPlayer>) {
  const player = { ...palmer, ...change };
  const data = dataFor(player);
  const criterion = red(data);
  expect(criterion.test(player, data), 'an unverified identity must not inherit the dismissal').toBe(false);
  expect(criterion.support).not.toContain(player.name);
}

describe('Player Bingo verified Palmer dismissal', () => {
  it('accepts verified Palmer and includes him in tile support despite stale zero-red rows', () => {
    // The age/year variants are constructed identity probes, not additional season data claims.
    for (const [year, age] of [[2026, 23], [2026, 24], [2025, 22], [2025, 23], [2027, 24], [2027, 25]]) {
      const player = { ...palmer, year, age };
      for (const rows of [[{ ...retained2026 }, { ...retained2025 }], []]) {
        const data = dataFor(player, rows);
        const criterion = red(data);
        expect(criterion.test(player, data), 'the verified 24 October 2026 dismissal must survive stale history').toBe(true);
        expect(criterion.support).toEqual(['Cole Palmer']);
      }
    }
  });

  it('refuses related or extended names', () => {
    for (const name of ['Palmer', 'Cole Palmer Jr', 'Carl Palmer', 'Cole Palmer Other']) rejected({ name });
  });

  it('refuses a wrong or missing nationality', () => {
    for (const nationality of ['', 'Ireland', 'Scotland', 'Unknown']) rejected({ nationality });
  });

  it('refuses an unknown or different role', () => {
    for (const position of ['', 'Unknown', 'Goalkeeper', 'Centre-Back', 'Centre-Forward', 'Defensive Midfield']) rejected({ position });
  });

  it('refuses other birth cohorts', () => {
    for (const [year, age] of [[2026, 22], [2026, 25], [2025, 21], [2027, 26]]) rejected({ year, age });
  });

  it('refuses missing or invalid listed age and year', () => {
    for (const age of [0, -1, 23.5, Number.NaN, Number.POSITIVE_INFINITY]) rejected({ age });
    for (const year of [0, -2026, 2026.5, Number.NaN, Number.POSITIVE_INFINITY]) rejected({ year });
  });

  it('keeps a historical dismissal available to an unrelated fictional player', () => {
    const player = { ...palmer, name: 'Qzx fixture dismissal', nationality: 'Fixture', position: '' };
    const data = dataFor(player, [{ ...retained2026 }, { ...retained2026, redCards: 1 }]);
    expect(red(data).test(player, data)).toBe(true);
    expect(red(data).support).toEqual([player.name]);
  });

  it('keeps zero and missing historical reds rejected for unrelated players', () => {
    const player = { ...palmer, name: 'Qzx fixture no dismissal', nationality: 'Fixture' };
    for (const stats of [[], [{ ...retained2026 }], [{ ...retained2026, redCards: null }]]) {
      const data = dataFor(player, stats);
      expect(red(data).test(player, data)).toBe(false);
      expect(red(data).support).toEqual([]);
    }
  });

  it('does not infer same-season disciplinary combinations or rewrite other season facts', () => {
    const data = dataFor(palmer, [{ ...retained2026 }, { ...retained2025 }]);
    const criteria = buildCriteria(data);
    const test = (id: string) => criteria.find(item => item.id === id)!.test(palmer, data);
    expect(test('season-yellows-10-red')).toBe(false);
    expect(test('season-yellows-10')).toBe(false);
    expect(test('season-matches-40-no-red')).toBe(true);
    expect(test('season-matches-40')).toBe(true);
    expect(test('season-matches-50')).toBe(false);
    expect(test('season-goals-20')).toBe(false);
    expect(test('season-assists-10')).toBe(false);
  });

  it('adds no fabricated season statistics, club history or player fields', () => {
    const beforePlayer = { ...palmer };
    const rows = [{ ...retained2026 }, { ...retained2025 }];
    const data = dataFor(palmer, rows);
    red(data).test(palmer, data);
    expect(data.seasonStats).toEqual(new Map([['Cole Palmer', [retained2026, retained2025]]]));
    expect(data.clubYears.size).toBe(0);
    expect(data.clubHistory.size).toBe(0);
    expect(data.pool).toEqual([beforePlayer]);
    expect(data.pool[0]).toBe(palmer);
    expect(data.seasonStats.get('Cole Palmer')).toBe(rows);
  });
});

