// These 11 unchanged rows were read from player_market_values on 2026-10-11.
// Their identity and club fields reproduce the report; existing database stats
// are retained inputs, not newly verified statistical claims.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCriteria, fetchBingoData, type BingoData } from '@/lib/playerBingo';

type Row = {
  id: number; player_name: string; person_key: null; nationality: string | null;
  position: string | null; club: string; age: number; year: number; market_value_usd: number;
  goals: number | null; assists: number | null; matches: number | null;
  yellow_cards: number | null; red_cards: number | null;
};
type Operation = [string, unknown[]];
const fixture = vi.hoisted(() => ({ latest: [] as Row[], history: [] as Row[], queries: [] as { table: string; operations: Operation[] }[] }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: { from: (table: string) => {
    const operations: Operation[] = [];
    const query = new Proxy({}, { get: (_target, method: string) => {
      if (method === 'then') return (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        fixture.queries.push({ table, operations });
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

const retainedRows: Row[] = [
  {
    "id": 164379,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Centre-Forward",
    "club": "Genoa CFC",
    "age": 25,
    "year": 2026,
    "market_value_usd": 9000000,
    "goals": 3,
    "assists": 1,
    "matches": 19,
    "yellow_cards": 3,
    "red_cards": 0
  },
  {
    "id": 177617,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Defensive Midfield",
    "club": "Paris Saint-Germain",
    "age": 25,
    "year": 2026,
    "market_value_usd": 151200000,
    "goals": 0,
    "assists": 0,
    "matches": null,
    "yellow_cards": 0,
    "red_cards": 0
  },
  {
    "id": 166481,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Centre-Forward",
    "club": "Genoa CFC",
    "age": 24,
    "year": 2025,
    "market_value_usd": 11000000,
    "goals": 4,
    "assists": 2,
    "matches": 29,
    "yellow_cards": 3,
    "red_cards": 0
  },
  {
    "id": 166895,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Centre-Forward",
    "club": "Olympique Marseille",
    "age": 23,
    "year": 2024,
    "market_value_usd": 15000000,
    "goals": 2,
    "assists": 3,
    "matches": 28,
    "yellow_cards": 5,
    "red_cards": 0
  },
  {
    "id": 157985,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Centre-Forward",
    "club": "Olympique Marseille",
    "age": 22,
    "year": 2023,
    "market_value_usd": 24000000,
    "goals": 9,
    "assists": 3,
    "matches": 43,
    "yellow_cards": 5,
    "red_cards": 0
  },
  {
    "id": 158525,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Centre-Forward",
    "club": "SC Braga",
    "age": 21,
    "year": 2022,
    "market_value_usd": 16000000,
    "goals": 14,
    "assists": 6,
    "matches": 45,
    "yellow_cards": 2,
    "red_cards": 1
  },
  {
    "id": 167401,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Defensive Midfield",
    "club": "FC Porto",
    "age": 21,
    "year": 2022,
    "market_value_usd": 49000000,
    "goals": 0,
    "assists": 2,
    "matches": 47,
    "yellow_cards": 5,
    "red_cards": 0
  },
  {
    "id": 168011,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Defensive Midfield",
    "club": "Wolverhampton Wanderers",
    "age": 20,
    "year": 2021,
    "market_value_usd": 13000000,
    "goals": 3,
    "assists": 3,
    "matches": 34,
    "yellow_cards": 3,
    "red_cards": 0
  },
  {
    "id": 168662,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Defensive Midfield",
    "club": "FC Porto",
    "age": 19,
    "year": 2020,
    "market_value_usd": 5000000,
    "goals": 1,
    "assists": 2,
    "matches": 23,
    "yellow_cards": 0,
    "red_cards": 0
  },
  {
    "id": 161473,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Portugal",
    "position": "Defensive Midfield",
    "club": "FC Porto Youth League",
    "age": 18,
    "year": 2019,
    "market_value_usd": 2000000,
    "goals": 9,
    "assists": 5,
    "matches": 22,
    "yellow_cards": 1,
    "red_cards": 0
  },
  {
    "id": 92104,
    "player_name": "Vitinha",
    "person_key": null,
    "nationality": "Brazil",
    "position": "Left Winger",
    "club": "CD Feirense",
    "age": 30,
    "year": 2008,
    "market_value_usd": 1000000,
    "goals": 3,
    "assists": 0,
    "matches": 16,
    "yellow_cards": 5,
    "red_cards": 0
  }
];
const fillers: Row[] = Array.from({ length: 100 }, (_, i) => ({
  id: 900000 + i, player_name: `Qzx Bingo Fixture ${i}`, person_key: null,
  nationality: 'Fixture', position: 'Central Midfield', club: 'Qzx Fixture Club',
  age: 25, year: 2026, market_value_usd: 1_000_000,
  goals: null, assists: null, matches: null, yellow_cards: null, red_cards: null,
}));
const midfielderIds = [177617, 167401, 168011, 168662, 161473];
const forwardIds = [164379, 166481, 166895, 157985, 158525];
const stat = (row: Row) => ({ goals: row.goals, assists: row.assists, matches: row.matches, yellowCards: row.yellow_cards, redCards: row.red_cards });
const ucl = (data: BingoData) => buildCriteria(data).find(criterion => criterion.id === 'ucl-winner')!;
async function load(latest = retainedRows, history = retainedRows) {
  fixture.latest = [...latest, ...fillers];
  fixture.history = [...history, ...fillers];
  const data = await fetchBingoData();
  expect(data).not.toBeNull();
  expect(data!.pool).toHaveLength(101);
  return data!;
}
beforeEach(() => { fixture.queries = []; fixture.latest = []; fixture.history = []; });

describe('Player Bingo retained Vitinha identities and title seasons', () => {
  it('accepts the current PSG midfielder in 2026 without borrowing forward history', async () => {
    const data = await load();
    const player = data.pool.find(row => row.name === 'Vitinha')!;
    expect(player).toEqual({ name: 'Vitinha', nationality: 'Portugal', position: 'Defensive Midfield', club: 'Paris Saint-Germain', value: 151200000, age: 25, year: 2026 });
    expect(ucl(data).test(player, data)).toBe(true);
    expect(data.clubHistory.get('Vitinha')).toEqual(new Set(['paris saint-germain', 'fc porto', 'wolverhampton wanderers']));
    expect(data.clubYears.get('Vitinha')).toEqual([
      { key: 'fc porto', year: 2022 }, { key: 'wolverhampton wanderers', year: 2021 },
      { key: 'fc porto', year: 2020 }, { key: 'paris saint-germain', year: 2026 },
    ]);
    expect(data.seasonStats.get('Vitinha')).toEqual(retainedRows.filter(row => midfielderIds.includes(row.id)).sort((a, b) => a.id - b.id).map(stat));
    const histories = fixture.queries.filter(query => query.table === 'player_market_values' && query.operations.some(([key]) => key === 'range'));
    expect(histories).toHaveLength(2);
    for (const query of histories) expect(query.operations.find(([key]) => key === 'select')![1]).toEqual(['player_name, nationality, position, club, year, age, market_value_usd, goals, assists, matches, yellow_cards, red_cards']);
  });

  it('keeps the Genoa forward unmerged and rejects a borrowed PSG title', async () => {
    // A separately labelled pool selection of the existing forward rows.
    // The complete history still contains every one of the 11 retained rows.
    const data = await load(retainedRows.filter(row => forwardIds.includes(row.id)));
    const player = data.pool.find(row => row.name === 'Vitinha')!;
    expect(player.club).toBe('Genoa CFC');
    expect(player.position).toBe('Centre-Forward');
    expect(ucl(data).test(player, data)).toBe(false);
    expect(data.clubHistory.get('Vitinha')).toEqual(new Set(['olympique marseille', 'sc braga', 'genoa cfc']));
    expect(data.clubYears.get('Vitinha')).toEqual([
      { key: 'olympique marseille', year: 2023 }, { key: 'sc braga', year: 2022 },
      { key: 'genoa cfc', year: 2026 }, { key: 'genoa cfc', year: 2025 },
      { key: 'olympique marseille', year: 2024 },
    ]);
    expect(data.seasonStats.get('Vitinha')).toEqual(retainedRows.filter(row => forwardIds.includes(row.id)).sort((a, b) => a.id - b.id).map(stat));
  });

  it('preserves the verified 2025 pair and rejects non-winning PSG years', async () => {
    const data = await load();
    const player = data.pool.find(row => row.name === 'Vitinha')!;
    // Criterion boundaries, not invented historical database rows.
    for (const [year, expected] of [[2024, false], [2025, true], [2026, true], [2027, false]] as const) {
      const boundary = { ...data, clubYears: new Map(data.clubYears).set('Vitinha', [{ key: 'paris saint-germain', year }]) };
      expect(ucl(boundary).test(player, boundary), String(year)).toBe(expected);
    }
    const wrongClub = { ...data, clubYears: new Map(data.clubYears).set('Vitinha', [{ key: 'genoa cfc', year: 2026 }]) };
    expect(ucl(wrongClub).test(player, wrongClub)).toBe(false);
  });

  it.each([
    ['missing nationality', { nationality: null }],
    ['different nationality', { nationality: 'Brazil' }],
    ['missing position', { position: null }],
    ['unknown position', { position: 'Unknown' }],
    ['forward position', { position: 'Centre-Forward' }],
  ] as const)('rejects a namesake history row with %s', async (_name, change) => {
    const current = retainedRows.find(row => row.id === 177617)!;
    const data = await load(retainedRows, [{ ...current, ...change }]);
    const player = data.pool.find(row => row.name === 'Vitinha')!;
    expect(data.clubYears.has('Vitinha')).toBe(false);
    expect(data.seasonStats.has('Vitinha')).toBe(false);
    expect(ucl(data).test(player, data)).toBe(false);
    // The old current-club fallback remains a club tile, not a title-season row.
    expect(data.clubHistory.get('Vitinha')).toEqual(new Set(['paris saint-germain']));
  });

  it('retains position transitions and the age guard for unrelated fixture players', async () => {
    const current = fillers[0];
    const valid = { ...current, id: 910001, position: 'Centre-Forward', nationality: 'Other Fixture', club: 'Qzx Previous Club', age: 24, year: 2025 };
    const namesake = { ...current, id: 910002, club: 'Qzx Wrong Person Club', age: 40, year: 2025 };
    const data = await load(retainedRows, [valid, namesake]);
    expect(data.clubYears.get(current.player_name)).toEqual([{ key: 'qzx fixture club', year: 2026 }, { key: 'qzx previous club', year: 2025 }]);
    expect(data.seasonStats.get(current.player_name)).toEqual([stat(current), stat(valid)]);
  });

  it('gives a summer 2026 PSG arrival no 2026 title and keeps any earlier winning season', async () => {
    // Constructed input, not a database row: club and year are what Round 450's migration
    // (20260905_round_450_transfer_windows_2026_summer.sql) wrote to Ferran Torres's 2026 row;
    // the other fields are fixture values. He joined PSG on 15 August 2026, after the final.
    const arrival: Row = { ...fillers[0], id: 920001, player_name: 'Ferran Torres', nationality: 'Spain', position: 'Centre-Forward', club: 'Paris Saint-Germain', age: 26, year: 2026, market_value_usd: 54_000_000 };
    const data = await load([arrival], [arrival]);
    const player = data.pool.find(row => row.name === 'Ferran Torres')!;
    expect(data.clubYears.get('Ferran Torres')).toEqual([{ key: 'paris saint-germain', year: 2026 }]);
    expect(ucl(data).test(player, data)).toBe(false);
    // Criterion boundary, not a historical row: an earlier winning season still counts.
    const earlier = { ...data, clubYears: new Map(data.clubYears).set('Ferran Torres', [{ key: 'paris saint-germain', year: 2026 }, { key: 'fc barcelona', year: 2015 }]) };
    expect(ucl(earlier).test(player, earlier)).toBe(true);
  });
});
