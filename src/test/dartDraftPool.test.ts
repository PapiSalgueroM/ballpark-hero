/* Round 1145: Dart Draft's pool is the top 2,000 of 2026 in two pages, both or nothing; the storm zone stops at
   what the old 900 row pool's last man was worth; the mystery zone draws its three from above that line and adds
   one long shot from below it; a country hit keeps its best four and draws the rest.
   scripts/simDartDraftPool.mjs measures the game over a saved copy of the table. This file holds the edges that
   copy never reaches: a page that fails, a pool too thin for a floor, and the tile draw itself. No network. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { player_name: string; position: string | null; age: number; nationality: string; club: string; market_value_usd: number; goals: number; assists: number };
const db: { rows: Row[]; failOffset: number | null; failOnce: Set<number>; asked: string[] } = { rows: [], failOffset: null, failOnce: new Set(), asked: [] };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const q = {
        select: () => q, eq: () => q, not: () => q, in: () => q, order: () => q, limit: () => q,
        range: (from: number, to: number) => {
          db.asked.push(`${from}-${to}`);
          if (db.failOffset === from) return Promise.resolve({ data: null, error: { message: 'fixture failure' } });
          if (db.failOnce.delete(from)) return Promise.resolve({ data: null, error: { message: 'fixture hiccup' } });
          return Promise.resolve({ data: db.rows.slice(from, to + 1), error: null });
        },
      };
      return q;
    },
  },
}));

import { OLD_POOL_ROWS, POOL_ROWS, fetchDartDraftPool } from '@/lib/dartDraft';
import { COUNTRY_KEEP_BEST, COUNTRY_TILES, DART_SLOTS, MYSTERY_TILES, countryTiles, mysteryChoices, stormChoices } from '@/lib/dartMap';
import { fetchAllRowsParallel } from '@/lib/fetchAllRows';
import { playerRating } from '@/lib/squadDeal';
import type { Player } from '@/types/game';

/* Already in the order the query asks for: dearest first. Row i is worth 3000 - i million. */
const table = (count: number): Row[] => Array.from({ length: count }, (_, i) => ({
  player_name: `Fixture Player ${String(i).padStart(4, '0')}`, position: i % 9 === 0 ? 'Goalkeeper' : 'Centre-Back', age: 25,
  nationality: 'Fixtureland', club: 'Fixture FC', market_value_usd: (3000 - i) * 1_000_000, goals: 0, assists: 0,
}));

beforeEach(() => { db.rows = table(2600); db.failOffset = null; db.failOnce = new Set(); db.asked = []; });

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

  it('asks again for a page that failed once, and still never asks past the 2,000th row', async () => {
    db.failOnce = new Set([1000]);
    const pool = await fetchDartDraftPool();
    expect(pool.current.length).toBe(POOL_ROWS);
    expect(db.asked).toEqual(['0-999', '1000-1999', '1000-1999']);
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

describe('the mystery zone', () => {
  const cb = DART_SLOTS.find(s => s.allowed.includes('CB'))!;

  it('draws its three from above the old pool line and adds one long shot from below it', async () => {
    const pool = await fetchDartDraftPool();
    const longShots = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const tiles = mysteryChoices(pool.current, cb, new Set(), pool.stormFloor).map(c => c.player);
      expect(tiles.length).toBe(MYSTERY_TILES + 1);
      expect(new Set(tiles.map(p => p.name)).size).toBe(tiles.length);
      expect(tiles.slice(0, MYSTERY_TILES).every(p => p.marketValue >= pool.stormFloor)).toBe(true);
      expect(tiles[MYSTERY_TILES].marketValue).toBeLessThan(pool.stormFloor);
      longShots.add(tiles[MYSTERY_TILES].name);
    }
    // The long shot is drawn, not fixed: sixty hits show many different men from the deeper pool.
    expect(longShots.size).toBeGreaterThanOrEqual(20);
  });

  it('is the three from anywhere it always was when the pool has no floor', async () => {
    db.rows = table(640);
    const pool = await fetchDartDraftPool();
    expect(pool.stormFloor).toBe(0);
    expect(mysteryChoices(pool.current, cb, new Set(), pool.stormFloor).length).toBe(MYSTERY_TILES);
    expect(mysteryChoices(pool.current, cb, new Set()).length).toBe(MYSTERY_TILES);
  });

  it('offers whoever is left when nobody above the line is', async () => {
    const pool = await fetchDartDraftPool();
    const used = new Set(pool.current.filter(p => p.marketValue >= pool.stormFloor).map(p => p.name));
    const tiles = mysteryChoices(pool.current, cb, used, pool.stormFloor).map(c => c.player);
    expect(tiles.length).toBe(MYSTERY_TILES);
    expect(tiles.every(p => p.marketValue < pool.stormFloor)).toBe(true);
  });
});

describe('the shared paged reader with a row limit', () => {
  const pageOf = (total: number, asked: number[]) => (from: number, to: number) => {
    asked.push(from);
    return Promise.resolve({ data: Array.from({ length: Math.max(0, Math.min(total, to + 1) - from) }, (_, i) => from + i), error: null });
  };

  it('stops at the limit and never asks for a page past it', async () => {
    const asked: number[] = [];
    const { data, error } = await fetchAllRowsParallel<number>(pageOf(5865, asked), 2, 2000);
    expect(error).toBeNull();
    expect(data.length).toBe(2000);
    expect(data[1999]).toBe(1999);
    expect(asked).toEqual([0, 1000]);
  });

  it('cuts a last page that runs past the limit, and reads on to the limit when it was not asked for at once', async () => {
    const asked: number[] = [];
    const { data } = await fetchAllRowsParallel<number>(pageOf(5865, asked), 1, 2500);
    expect(data.length).toBe(2500);
    expect(asked).toEqual([0, 1000, 2000]);
  });

  it('reads everything when no limit is given, as it always did', async () => {
    const asked: number[] = [];
    const { data } = await fetchAllRowsParallel<number>(pageOf(2300, asked), 2);
    expect(data.length).toBe(2300);
    expect(asked).toEqual([0, 1000, 2000]);
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
