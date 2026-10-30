// Round 1571: the club additions reach Player Bingo through fetchBingoData.
// Tyler Morton's two rows are the lead's read C of player_market_values
// (2026-10-29, ids 167582 and 177631; stats left null, they are not under test).
// His additions are read from the real derived file, so this proves the bind,
// not the module. Every other man is a constructed fixture ("Qzx ...").
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCriteria, fetchBingoData, type BingoData } from '@/lib/playerBingo';
import derived from '@/data/bingoClubAdditions.json';

type Row = {
  id: number; player_name: string; nationality: string | null; position: string | null; club: string;
  age: number; year: number; market_value_usd: number;
  goals: number | null; assists: number | null; matches: number | null; yellow_cards: number | null; red_cards: number | null;
};
type Operation = [string, unknown[]];
const fixture = vi.hoisted(() => ({ latest: [] as Row[], history: [] as Row[] }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: { from: (table: string) => {
    const operations: Operation[] = [];
    const query = new Proxy({}, { get: (_target, method: string) => {
      if (method === 'then') return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        if (table !== 'player_market_values') return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        let result: Record<string, unknown>[] = [...(operations.some(([key]) => key === 'range') ? fixture.history : fixture.latest)];
        for (const [key, args] of operations) {
          const column = String(args[0]);
          if (key === 'in') result = result.filter(row => (args[1] as unknown[]).includes(row[column]));
          if (key === 'gte') result = result.filter(row => Number(row[column]) >= Number(args[1]));
          if (key === 'gt') result = result.filter(row => Number(row[column]) > Number(args[1]));
          if (key === 'not') result = result.filter(row => row[column] !== args[2]);
          if (key === 'order') {
            const direction = (args[1] as { ascending: boolean }).ascending ? 1 : -1;
            result.sort((a, b) => direction * (Number(a[column]) - Number(b[column])));
          }
          if (key === 'limit') result = result.slice(0, Number(args[0]));
          if (key === 'range') result = result.slice(Number(args[0]), Number(args[1]) + 1);
        }
        const columns = String(operations.find(([key]) => key === 'select')![1][0]).split(',').map(value => value.trim());
        return Promise.resolve({ data: result.map(row => Object.fromEntries(columns.map(column => [column, row[column]]))), error: null }).then(resolve, reject);
      };
      return (...args: unknown[]) => { operations.push([method, args]); return query; };
    } });
    return query;
  } },
}));

const nulls = { goals: null, assists: null, matches: null, yellow_cards: null, red_cards: null };
const morton: Row[] = [
  { id: 167582, player_name: 'Tyler Morton', nationality: 'England', position: 'Defensive Midfield', club: 'Liverpool FC', age: 19, year: 2022, market_value_usd: 5_000_000, ...nulls },
  { id: 177631, player_name: 'Tyler Morton', nationality: 'England', position: 'Defensive Midfield', club: 'Olympique Lyon', age: 23, year: 2026, market_value_usd: 32_400_000, ...nulls },
];
const fillers: Row[] = Array.from({ length: 100 }, (_, i) => ({
  id: 900000 + i, player_name: `Qzx Bingo Fixture ${i}`, nationality: 'Fixture', position: 'Central Midfield',
  club: `Qzx Fixture Club ${i % 7}`, age: 25, year: 2026, market_value_usd: 1_000_000, ...nulls,
}));
async function load(rows: Row[]): Promise<BingoData> {
  fixture.latest = [...rows, ...fillers];
  fixture.history = [...rows, ...fillers];
  const data = await fetchBingoData();
  expect(data).not.toBeNull();
  return data!;
}
const verdicts = (data: BingoData, name: string) => {
  const p = data.pool.find(row => row.name === name)!;
  const criteria = buildCriteria(data);
  return {
    fourPlus: criteria.find(c => c.id === 'journeyman-4-clubs')!.test(p, data),
    oneClub: criteria.find(c => c.id === 'one-club-man')!.test(p, data),
    liverpool: criteria.find(c => c.id === 'club-liverpool-fc')!.test(p, data),
  };
};
beforeEach(() => { fixture.latest = []; fixture.history = []; });

describe('Player Bingo club additions, through fetchBingoData', () => {
  it('the derived file carries Morton with Blackburn Rovers and Hull City', () => {
    const entry = derived.add.find(a => a.n === 'Tyler Morton');
    expect(entry).toEqual({ n: 'Tyler Morton', nat: 'England', by: 2002, pos: 'Defensive Midfield', clubs: ['Blackburn Rovers', 'Hull City'] });
  });

  it('counts Morton at four clubs: he fits Played for 4+ clubs and is not a One-club man', async () => {
    const data = await load(morton);
    expect(data.clubHistory.get('Tyler Morton')).toEqual(new Set(['liverpool fc', 'olympique lyon', 'blackburn rovers', 'hull city']));
    expect(verdicts(data, 'Tyler Morton')).toEqual({ fourPlus: true, oneClub: false, liverpool: true });
    // The honour tiles' input is untouched: no season row is invented for a loan.
    expect(data.clubYears.get('Tyler Morton')).toEqual([{ key: 'liverpool fc', year: 2022 }, { key: 'olympique lyon', year: 2026 }]);
  });

  it('never gives his clubs to a namesake in another role or of another nationality', async () => {
    for (const change of [{ position: 'Centre-Forward' }, { nationality: 'Wales' }, { age: 30 }]) {
      const data = await load(morton.map(row => ({ ...row, ...change })));
      const history = data.clubHistory.get('Tyler Morton') ?? new Set();
      expect(history.has('blackburn rovers'), JSON.stringify(change)).toBe(false);
      expect(history.has('hull city'), JSON.stringify(change)).toBe(false);
    }
  });

  it('leaves a man with no addition exactly as the table has him', async () => {
    const data = await load(morton);
    expect(data.clubHistory.get('Qzx Bingo Fixture 3')).toEqual(new Set(['qzx fixture club 3']));
  });
});
