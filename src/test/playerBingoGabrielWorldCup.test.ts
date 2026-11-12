// Only the reported Gabriel/Brazil/2026 name link is verified sports evidence.
// Market ages, values, empty clubs/positions and all Fixture rows are synthetic
// transport sentinels. Negative World Cup rows are counterfactual identity labs.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCriteria, fetchBingoData, type BingoData } from '@/lib/playerBingo';

type WorldCupRow = { player_name: string; nationality: string; world_cup_year: number };
type Reply = { data: unknown[] | null; error: Error | null };
type Query = { table: string; calls: [string, unknown[]][]; signal?: AbortSignal };
const transport = vi.hoisted(() => ({
  queries: [] as Query[], worldCupRows: [] as WorldCupRow[], failWorldCup: false,
}));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: { from: (table: string) => {
    const query: Query = { table, calls: [] };
    const chain = new Proxy({}, { get: (_target, method: string) => {
      if (method === 'then') return (ok: (reply: Reply) => unknown, bad: (error: unknown) => unknown) => {
        transport.queries.push(query);
        return Promise.resolve(answer(query)).then(ok, bad);
      };
      return (...args: unknown[]) => {
        query.calls.push([method, args]);
        if (method === 'abortSignal') query.signal = args[0] as AbortSignal;
        return chain;
      };
    } });
    return chain;
  } },
}));

const reported: WorldCupRow = { player_name: 'Gabriel Magalhães', nationality: 'Brazil', world_cup_year: 2026 };
const sentinels = Array.from({ length: 100 }, (_, i) => 'Fixture Gabriel Sentinel ' + i);
const names = ['Gabriel', 'Gabriel Jesus', 'Gabriel Martinelli', 'Andrew Robertson', ...sentinels];
function answer(query: Query): Reply {
  if (query.signal?.aborted) return { data: null, error: new Error('Fixture canceled') };
  if (query.table === 'world_cup_players') {
    if (transport.failWorldCup) return { data: null, error: new Error('Fixture World Cup read failed') };
    const [from, to] = query.calls.find(([method]) => method === 'range')![1] as number[];
    return { data: transport.worldCupRows.slice(from, to + 1), error: null };
  }
  if (query.table === 'ballon_dor') return { data: [], error: null };
  if (query.calls.some(([method]) => method === 'range')) return { data: [], error: null };
  const selected = query.calls.find(([method]) => method === 'in');
  if (!selected) return { data: names.map(player_name => ({ player_name })), error: null };
  return { data: (selected[1][1] as string[]).map(player_name => ({
    player_name, nationality: player_name === 'Gabriel' ? 'Brazil' : player_name === 'Andrew Robertson' ? 'Scotland' : 'Fixture',
    position: player_name === 'Gabriel' ? 'Centre-Back' : '', club: '', market_value_usd: 1, age: 25, year: 2026,
  })), error: null };
}
async function loaded() {
  const data = await fetchBingoData();
  expect(data, 'BINGO_GABRIEL_COMPLETE_FIXTURE').not.toBeNull();
  const player = data!.pool.find(item => item.name === 'Gabriel');
  expect(player, 'BINGO_GABRIEL_MARKET_IDENTITY').toBeDefined();
  expect(player!.nationality).toBe('Brazil');
  expect(data!.pool).toHaveLength(names.length);
  return { data: data!, player: player! };
}
function criterion(data: BingoData, id: string) {
  const found = buildCriteria(data).find(item => item.id === id);
  expect(found, 'BINGO_GABRIEL_EXISTING_CRITERION:' + id).toBeDefined();
  return found!;
}
beforeEach(() => {
  transport.queries = [];
  transport.worldCupRows = [{ ...reported }];
  transport.failWorldCup = false;
});

describe('Player Bingo Gabriel World Cup identity', () => {
  it('BINGO_GABRIEL_ALIAS: accepts exact Brazil full-name rows on first and later pages', async () => {
    for (const player_name of ['Gabriel Magalhães', 'Gabriel Magalhaes']) {
      for (const laterPage of [false, true]) {
        transport.worldCupRows = [
          ...(laterPage ? Array.from({ length: 1000 }, (_, i) => ({
            player_name: 'Fixture Earlier Page ' + i, nationality: 'Fixture', world_cup_year: 2014,
          })) : []),
          { ...reported, player_name },
        ];
        const { data, player } = await loaded();
        const any = criterion(data, 'wc-any');
        expect(data.worldCupAll.has('gabriel magalhaes'), 'BINGO_GABRIEL_ORIGINAL_FULL_KEY').toBe(true);
        expect(any.test({ ...player, name: player_name }, data), 'BINGO_GABRIEL_FULL_NAME_STILL_MATCHES').toBe(true);
        expect(any.test(player, data), 'BINGO_GABRIEL_ALIAS_REQUIRED').toBe(true);
        expect(any.support, 'BINGO_GABRIEL_ALIAS_SUPPORT').toContain('Gabriel');
        expect(any.test({ ...player, nationality: 'Portugal' }, data)).toBe(false);
        expect(any.test({ ...player, position: 'Centre-Forward' }, data)).toBe(false);
        expect(data.worldCupAll.size).toBe(laterPage ? 1002 : 2);
      }
    }
  });

  it('BINGO_GABRIEL_KEYS: preserves canonical keys, Andy bridge and unrelated buckets', async () => {
    transport.worldCupRows = [
      { ...reported, player_name: 'Gabriel' },
      { player_name: 'Andy Robertson', nationality: 'Scotland', world_cup_year: 2026 },
      { player_name: sentinels[0], nationality: 'Argentina', world_cup_year: 2022 },
      { player_name: sentinels[1], nationality: 'Spain', world_cup_year: 2010 },
    ];
    const { data, player } = await loaded();
    const any = criterion(data, 'wc-any');
    expect(any.test(player, data)).toBe(true);
    expect(any.support).toContain('Gabriel');
    const andrew = data.pool.find(item => item.name === 'Andrew Robertson')!;
    expect(andrew).toBeDefined();
    expect(any.test(andrew, data)).toBe(true);
    expect(any.support).toContain('Andrew Robertson');
    expect(data.worldCupAll).toEqual(new Set([
      'gabriel', 'andy robertson', 'andrew robertson', 'fixture gabriel sentinel 0', 'fixture gabriel sentinel 1',
    ]));
    expect(data.worldCup2022).toEqual(new Set(['fixture gabriel sentinel 0']));
    expect(data.wcWinners).toEqual(new Set(['fixture gabriel sentinel 0', 'fixture gabriel sentinel 1']));
  });

  it('BINGO_GABRIEL_2022: does not turn the 2026 appearance into a 2022 appearance', async () => {
    const { data, player } = await loaded();
    expect(data.worldCupAll.has('gabriel magalhaes')).toBe(true);
    const y2022 = criterion(data, 'wc-2022');
    expect(y2022.test(player, data)).toBe(false);
    expect(y2022.support).not.toContain('Gabriel');
    expect(data.worldCup2022).toEqual(new Set());
  });

  it('BINGO_GABRIEL_WINNER: does not turn the Brazil appearance into a winning squad', async () => {
    const { data, player } = await loaded();
    expect(data.worldCupAll.has('gabriel magalhaes')).toBe(true);
    const winner = criterion(data, 'wc-winner');
    expect(winner.test(player, data)).toBe(false);
    expect(winner.support).not.toContain('Gabriel');
    expect(data.wcWinners).toEqual(new Set());
  });

  it('BINGO_GABRIEL_IDENTITIES: refuses other Gabriels and similar surnames', async () => {
    const { data, player } = await loaded();
    const any = criterion(data, 'wc-any');
    for (const name of ['Gabriel Jesus', 'Gabriel Martinelli']) {
      const other = data.pool.find(item => item.name === name)!;
      expect(other).toBeDefined();
      expect(any.test(other, data), 'BINGO_GABRIEL_NO_OTHER_IDENTITY').toBe(false);
      expect(any.support).not.toContain(name);
    }
    transport.worldCupRows = [
      'Gabriel Jesus', 'Gabriel Martinelli', 'Gabriel Magalhaes Jr',
      'Gabriel Magalhae', 'Gabriel Magalhaes Silva', 'Magalhaes',
    ].map(player_name => ({ ...reported, player_name }));
    const unrelated = await loaded();
    const unrelatedAny = criterion(unrelated.data, 'wc-any');
    expect(unrelatedAny.test(unrelated.player, unrelated.data), 'BINGO_GABRIEL_NO_SURNAME_FALLBACK').toBe(false);
    expect(unrelatedAny.support).not.toContain(player.name);
    expect(unrelated.data.worldCupAll.has('gabriel')).toBe(false);
  });

  it('BINGO_GABRIEL_COUNTRY: refuses wrong, absent and dual squad nationalities', async () => {
    for (const nationality of ['Portugal', '', 'Brazil / Portugal', 'Portugal / Brazil']) {
      transport.worldCupRows = [{ ...reported, nationality }];
      const { data, player } = await loaded();
      expect(data.worldCupAll.has('gabriel magalhaes'), 'BINGO_GABRIEL_WRONG_COUNTRY_RAW_KEY').toBe(true);
      const any = criterion(data, 'wc-any');
      expect(any.test(player, data), 'BINGO_GABRIEL_COUNTRY_GUARD').toBe(false);
      expect(any.support).not.toContain('Gabriel');
      expect(data.worldCupAll.has('gabriel')).toBe(false);
    }
  });

  it('BINGO_GABRIEL_PROTOCOL: preserves exact World Cup predicates and later canonical page', async () => {
    transport.worldCupRows = [
      ...Array.from({ length: 1000 }, (_, i) => ({
        player_name: 'Fixture Protocol Page ' + i, nationality: 'Fixture', world_cup_year: 2014,
      })),
      { ...reported, player_name: 'Gabriel' },
    ];
    const { data, player } = await loaded();
    expect(criterion(data, 'wc-any').test(player, data)).toBe(true);
    expect(data.worldCupAll.size).toBe(1001);
    const queries = transport.queries.filter(query => query.table === 'world_cup_players');
    expect(queries.map(query => query.calls.filter(([method]) => method !== 'abortSignal'))).toEqual([
      [['select', ['player_name, world_cup_year, nationality']], ['gte', ['world_cup_year', 2010]], ['order', ['id', { ascending: true }]], ['range', [0, 999]]],
      [['select', ['player_name, world_cup_year, nationality']], ['gte', ['world_cup_year', 2010]], ['order', ['id', { ascending: true }]], ['range', [1000, 1999]]],
    ]);
    expect(queries.every(query => query.signal instanceof AbortSignal && !query.signal.aborted)).toBe(true);
  });

  it('BINGO_GABRIEL_FAILED_READ: cancels its owned siblings after a World Cup failure', async () => {
    transport.failWorldCup = true;
    expect(await fetchBingoData()).toBeNull();
    expect(transport.queries.some(query => query.table === 'world_cup_players')).toBe(true);
    expect(transport.queries.every(query => query.signal?.aborted)).toBe(true);
    expect(transport.queries.some(query => query.table === 'player_market_values'
      && query.calls.some(([method]) => method === 'range'))).toBe(false);
  });

  it('BINGO_GABRIEL_ABANDONED: issues no reads for an already abandoned caller', async () => {
    const caller = new AbortController(); caller.abort();
    expect(await fetchBingoData(caller.signal)).toBeNull();
    expect(transport.queries).toHaveLength(0);
  });
});
