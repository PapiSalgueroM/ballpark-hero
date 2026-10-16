import { describe, expect, it, vi } from 'vitest';
import { buildCriteria, type BingoData, type BingoPlayer, type ClubYear } from '@/lib/playerBingo';

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: { from: () => { throw new Error('This criterion proof must not request a database'); } },
}));

// The 2026 identity follows the retained Rodri card. Club and value are fixture sentinels.
// Empty histories and all altered identities below are constructed probes, not database claims.
const rodri: BingoPlayer = { name: 'Rodri', nationality: 'Spain', position: 'Defensive Midfield', club: 'Fixture United', value: 1, age: 29, year: 2026 };
function dataFor(player: BingoPlayer = rodri, years: ClubYear[] = []): BingoData {
  return {
    pool: [player], clubHistory: new Map(), clubYears: new Map([[player.name, years]]), seasonStats: new Map(),
    worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set(),
  };
}
const ucl = (data: BingoData) => buildCriteria(data).find(item => item.id === 'ucl-winner')!;
function rejected(change: Partial<BingoPlayer>) {
  const player = { ...rodri, ...change };
  const data = dataFor(player);
  const criterion = ucl(data);
  expect(criterion.test(player, data), 'an unverified identity must not inherit Rodri title').toBe(false);
  expect(criterion.support).not.toContain(player.name);
}

describe('Player Bingo verified Rodri honour', () => {
  it('accepts verified Rodri with sparse history and both listed age conventions', () => {
    for (const [year, age] of [[2026, 29], [2026, 30], [2025, 28], [2025, 29], [2027, 30], [2027, 31]]) {
      const player = { ...rodri, year, age };
      const data = dataFor(player);
      const criterion = ucl(data);
      expect(criterion.test(player, data), 'the verified Rodri title must survive sparse history').toBe(true);
      expect(criterion.support).toEqual(['Rodri']);
    }
  });

  it('refuses similar names instead of broad Rodrigo aliases', () => {
    for (const name of ['Rodrigo', 'Rodrygo', 'Rodrigo De Paul', 'Rodri Jr', 'Other Rodri']) rejected({ name });
  });

  it('refuses a wrong or missing nationality', () => {
    for (const nationality of ['', 'Argentina', 'Brazil', 'Unknown']) rejected({ nationality });
  });

  it('refuses unknown or different positions', () => {
    for (const position of ['', 'Unknown', 'Goalkeeper', 'Centre-Back', 'Centre-Forward', 'Right Winger']) rejected({ position });
  });

  it('refuses other birth cohorts including the retained Rodri namesakes', () => {
    for (const [year, age] of [[2026, 28], [2026, 31], [2025, 26], [2027, 33], [2006, 21], [2009, 32]]) rejected({ year, age });
  });

  it('refuses missing or invalid listed age and year', () => {
    for (const age of [0, -1, 29.5, Number.NaN, Number.POSITIVE_INFINITY]) rejected({ age });
    for (const year of [0, -2026, 2026.5, Number.NaN, Number.POSITIVE_INFINITY]) rejected({ year });
  });

  it('keeps historical title evidence available to an unrelated player', () => {
    const player = { ...rodri, name: 'Qzx fixture winner', nationality: 'Fixture', position: '' };
    const data = dataFor(player, [{ key: 'chelsea fc', year: 2021 }]);
    expect(ucl(data).test(player, data)).toBe(true);
    expect(ucl(data).support).toEqual(['Qzx fixture winner']);
  });

  it('keeps non-winning club seasons rejected for unrelated players', () => {
    const player = { ...rodri, name: 'Qzx fixture nonwinner', nationality: 'Fixture' };
    for (const [key, year] of [['manchester city', 2022], ['manchester city', 2024], ['liverpool fc', 2018]] as const) {
      const data = dataFor(player, [{ key, year }]);
      expect(ucl(data).test(player, data)).toBe(false);
    }
  });

  it('preserves PSG 2025 and 2026 titles and the late arrival exclusion', () => {
    const player = { ...rodri, name: 'Qzx fixture PSG winner', nationality: 'Fixture' };
    for (const year of [2025, 2026]) {
      const data = dataFor(player, [{ key: 'paris saint-germain', year }]);
      expect(ucl(data).test(player, data)).toBe(true);
    }
    const arrival = { ...player, name: 'Ferran Torres' };
    const data = dataFor(arrival, [{ key: 'paris saint-germain', year: 2026 }]);
    expect(ucl(data).test(arrival, data)).toBe(false);
  });

  it('adds no fabricated club season history or statistics', () => {
    const data = dataFor();
    ucl(data).test(rodri, data);
    expect(data.clubYears).toEqual(new Map([['Rodri', []]]));
    expect(data.clubHistory.size).toBe(0);
    expect(data.seasonStats.size).toBe(0);
    expect(data.pool).toEqual([rodri]);
  });

  it('does not turn the verified title into other honours or club matches', () => {
    const data = dataFor();
    const criteria = buildCriteria(data);
    for (const id of ['wc-any', 'wc-2022', 'wc-winner', 'ballon-dor', 'messi-teammate', 'club-manchester-city']) {
      expect(criteria.find(item => item.id === id)!.test(rodri, data), id).toBe(false);
    }
  });
});
