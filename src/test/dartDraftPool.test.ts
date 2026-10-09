/* Round 1145: Dart Draft's pool is the top 2,000 of 2026 in two pages, both or nothing; the storm zone stops at
   what the old 900 row pool's last man was worth; a country hit keeps its best four and draws the rest.
   scripts/simDartDraftPool.mjs measures the game over a saved copy of the table. This file holds the edges that
   copy never reaches: a page that fails, a pool too thin for a floor, and the tile draw itself. No network. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { player_name: string; position: string | null; age: number; nationality: string; club: string; market_value_usd: number; goals: number; assists: number };
const db: { rows: Row[]; failOffset: number | null; asked: string[] } = { rows: [], failOffset: null, asked: [] };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const q = {
        select: () => q, eq: () => q, not: () => q, in: () => q, order: () => q, limit: () => q,
        range: (from: number, to: number) => {
          db.asked.push(`${from}-${to}`);
          if (db.failOffset === from) return Promise.resolve({ data: null, error: { message: 'fixture failure' } });
          return Promise.resolve({ data: db.rows.slice(from, to + 1), error: null });
        },
      };
      return q;
    },
  },
}));

import { OLD_POOL_ROWS, POOL_ROWS, fetchDartDraftPool } from '@/lib/dartDraft';
import { COUNTRY_KEEP_BEST, COUNTRY_TILES, DART_SLOTS, countryTiles, stormChoices } from '@/lib/dartMap';
import { playerRating } from '@/lib/squadDeal';
import type { Player } from '@/types/game';

/* Already in the order the query asks for: dearest first. Row i is worth 3000 - i million. */
const table = (count: number): Row[] => Array.from({ length: count }, (_, i) => ({
  player_name: `Fixture Player ${String(i).padStart(4, '0')}`, position: i % 9 === 0 ? 'Goalkeeper' : 'Centre-Back', age: 25,
  nationality: 'Fixtureland', club: 'Fixture FC', market_value_usd: (3000 - i) * 1_000_000, goals: 0, assists: 0,
}));

beforeEach(() => { db.rows = table(2600); db.failOffset = null; db.asked = []; });

describe('the Dart Draft pool', () => {
  it('reads the top 2,000 as two pages of 1000 and keeps the old 900 at its head', async () => {
    const pool = await fetchDartDraftPool();
    expect(db.asked).toEqual(['0-999', '1000-1999']);
    expect(pool.current.length).toBe(POOL_ROWS);
    expect(pool.current.slice(0, 3).map(p => p.name)).toEqual(['Fixture Player 0000', 'Fixture Player 0001', 'Fixture Player 0002']);
    expect(pool.current[OLD_POOL_ROWS - 1].name).toBe('Fixture Player 0899');
    // The floor is what row 900 is worth: 3000 - 899.
    expect(pool.stormFloor).toBe(2101);
    expect(pool.current[POOL_ROWS - 1].marketValue).toBe(1001);
  });

  it('is both pages or nothing', async () => {
    db.failOffset = 1000;
    const half = await fetchDartDraftPool();
    expect(half.current).toEqual([]);
    expect(half.stormFloor).toBe(0);
    db.failOffset = 0;
    expect((await fetchDartDraftPool()).current).toEqual([]);
  });

  it('claims no storm floor when the table is not 900 rows deep, and still loads', async () => {
    db.rows = table(640);
    const pool = await fetchDartDraftPool();
    expect(pool.current.length).toBe(640);
    expect(pool.stormFloor).toBe(0);
  });

  it('keeps the storm zone at or above the floor', async () => {
    const pool = await fetchDartDraftPool();
    const slot = DART_SLOTS.find(s => s.allowed.includes('CB'))!;
    const floored = stormChoices(pool.current, slot, new Set(), pool.stormFloor).map(c => c.player.marketValue);
    const unfloored = stormChoices(pool.current, slot, new Set()).map(c => c.player.marketValue);
    expect(floored.length).toBe(5);
    expect(Math.min(...floored)).toBeGreaterThanOrEqual(pool.stormFloor);
    // The fixture can tell the difference: with no floor the deeper pool hands out much cheaper men.
    expect(Math.max(...unfloored)).toBeLessThan(pool.stormFloor);
  });
});

describe('the tiles a country hit shows', () => {
  const man = (i: number): Player => ({ name: `Fixture Man ${i}`, club: 'Fixture FC', nationality: 'Fixtureland', league: 'Other', goals: 0, assists: 0, position: 'CB', kitNumber: 0, age: 25, marketValue: 200 - i * 6, difficulty: 'easy' });
  const ranked = Array.from({ length: 20 }, (_, i) => man(i));

  it('shows everyone when the country has eight or fewer', () => {
    expect(countryTiles(ranked.slice(0, 8))).toEqual(ranked.slice(0, 8));
    expect(countryTiles(ranked.slice(0, 3))).toEqual(ranked.slice(0, 3));
  });

  it('always keeps the best four, draws the rest from deeper, and hands them back best first', () => {
    const seenDeep = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      let n = seed;
      const tiles = countryTiles(ranked, COUNTRY_KEEP_BEST, () => { n = (n * 7 + 3) % 16; return n / 16; });
      expect(tiles.length).toBe(COUNTRY_TILES);
      expect(new Set(tiles.map(p => p.name)).size).toBe(COUNTRY_TILES);
      for (const best of ranked.slice(0, COUNTRY_KEEP_BEST)) expect(tiles).toContain(best);
      expect(tiles[0]).toBe(ranked[0]);
      const ratings = tiles.map(playerRating);
      expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
      tiles.filter(p => ranked.indexOf(p) >= COUNTRY_TILES).forEach(p => seenDeep.add(p.name));
    }
    // Men who were never on offer under the old best eight rule now turn up.
    expect(seenDeep.size).toBeGreaterThanOrEqual(6);
  });

  it('is the old best eight when asked to keep eight', () => {
    expect(countryTiles(ranked, COUNTRY_TILES)).toEqual(ranked.slice(0, COUNTRY_TILES));
  });
});
