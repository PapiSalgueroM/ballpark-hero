/**
 * Release BS fix BS-mix-1: Player Bingo's age tiles band on birth year, so they stay true as the year goes on.
 * The 2026 table rows hold a man's age on 1 January 2026, never moved on, so in October 2026 an age band
 * called Haaland 25 and took a strike off a true "26 to 28" tap.
 *
 * Real data, read from the repo: scripts/data/auctionMarketRows.json (the top 500 rows of 2026, the pool the
 * board deals from) and scripts/data/cmBirthDates2026.json (birth dates two publishers of two kinds print,
 * with the live table row's year and age). Every two-source man whose real or derived birth year is in
 * 1995 to 2005 must land in the band his real birth year puts him in, and the four men the review named
 * (Haaland, Vinicius Junior, Foden, Szoboszlai, all born in 2000) are dealt as born 2000 to 2003.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCriteria, type BingoData, type BingoPlayer } from '@/lib/playerBingo';

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key', supabase: {},
}));

const read = (file: string) => JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'));
const emptyData = (): BingoData => ({
  pool: [], clubHistory: new Map(), clubYears: new Map(), seasonStats: new Map(),
  worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set(),
});
const tiles = buildCriteria(emptyData());
const tile = (id: string) => { const c = tiles.find(row => row.id === id); if (!c) throw new Error('no tile ' + id); return c; };
const BANDS = [['age-21-under', 2004, 9999], ['born-2000-to-2003', 2000, 2003], ['born-1997-to-1999', 1997, 1999], ['age-29-plus', 0, 1996]] as const;
const shown = (p: BingoPlayer) => BANDS.filter(([id]) => tile(id).test(p, emptyData())).map(([id]) => id);
const real = (year: number) => BANDS.filter(([, low, high]) => year >= low && year <= high).map(([id]) => id);

describe('Player Bingo age tiles band on birth year', () => {
  it('the four named men are born 2000 to 2003 on their 2026 rows, as two publishers print', () => {
    const market = read('scripts/data/auctionMarketRows.json') as { player_name: string; age: number; nationality: string; position: string; club: string; market_value_usd: number }[];
    const born = read('scripts/data/cmBirthDates2026.json').rows as { name: string; born?: string }[];
    for (const name of ['Erling Haaland', 'Vinicius Junior', 'Phil Foden', 'Dominik Szoboszlai']) {
      const row = market.find(r => r.player_name === name)!;
      const p: BingoPlayer = { name, nationality: row.nationality, position: row.position, club: row.club, value: row.market_value_usd, age: row.age, year: 2026 };
      const year = Number(born.find(r => r.name === name)?.born?.slice(0, 4));
      expect({ name, year, shown: shown(p) }).toEqual({ name, year: 2000, shown: ['born-2000-to-2003'] });
    }
  });
  it('every two-source man near the bands lands in the band his real birth year gives', () => {
    const rows = read('scripts/data/cmBirthDates2026.json').rows as { name: string; born?: string; thin?: string; table?: { year: number; age: number } }[];
    let checked = 0;
    for (const r of rows) {
      if (!r.born || r.thin || !r.table) continue;
      const year = Number(r.born.slice(0, 4)), derived = r.table.year - r.table.age - 1;
      if (Math.min(year, derived) > 2005 || Math.max(year, derived) < 1995) continue;
      const p: BingoPlayer = { name: r.name, nationality: '', position: '', club: '', value: 1, age: r.table.age, year: r.table.year };
      expect({ name: r.name, shown: shown(p) }).toEqual({ name: r.name, shown: real(year) });
      checked += 1;
    }
    console.log(`bingo birth year: ${checked} two-source men near the bands checked`);
    expect(checked).toBeGreaterThanOrEqual(50);
  });
});
