// Only the recorded World Cup name/country/year is a sports fact here.
// Other market attributes are transport sentinels, not Robertson's statistics.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCriteria, fetchBingoData, type BingoData } from '@/lib/playerBingo';

type WorldCupRow = { player_name: string; nationality: string; world_cup_year: number };
type Reply = { data: unknown[] | null; error: Error | null };
type Query = { table: string; calls: [string, unknown[]][]; signal?: AbortSignal };
const transport = vi.hoisted(() => ({ queries: [] as Query[], worldCupRows: [] as WorldCupRow[], failWorldCup: false }));
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

// Projection of the held Round 389 Scotland squad row, no caps/club/stat inference.
const recorded = { player_name: 'Andy Robertson', nationality: 'Scotland', world_cup_year: 2026 };
const names = ['Andrew Robertson', ...Array.from({ length: 100 }, (_, i) => `Fictional1352-${i}`)];
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
    player_name, nationality: player_name === 'Andrew Robertson' ? 'Scotland' : 'Fixture',
    position: '', club: '', market_value_usd: 1, age: 25, year: 2026,
  })), error: null };
}
async function loaded() {
  const data = await fetchBingoData();
  expect(data, 'the complete fixture should load before any identity assertion').not.toBeNull();
  const player = data!.pool.find(item => item.name === 'Andrew Robertson');
  expect(player, 'the drawn Andrew identity should survive the real pool loader').toBeDefined();
  return { data: data!, player: player! };
}
const criterion = (data: BingoData, id: string) => buildCriteria(data).find(item => item.id === id)!;
beforeEach(() => { transport.queries = []; transport.worldCupRows = [{ ...recorded }]; transport.failWorldCup = false; });

describe('Player Bingo World Cup identities', () => {
  it('world cup alias: accepts Andrew Robertson from the recorded Andy Scotland 2026 row', async () => {
    const { data, player } = await loaded();
    const any = criterion(data, 'wc-any');
    expect(any.test(player, data), 'the recorded Scotland World Cup row should match Andrew Robertson').toBe(true);
    expect(any.support).toContain('Andrew Robertson');
    expect(data.worldCupAll.has('andy robertson')).toBe(true);
    expect(any.test({ ...player, name: 'Andy Robertson' }, data)).toBe(true);
  });

  it('preserves canonical names and unrelated World Cup buckets', async () => {
    transport.worldCupRows = [
      { ...recorded, player_name: 'Andrew Robertson' },
      { player_name: names[1], nationality: 'Argentina', world_cup_year: 2022 },
      { player_name: names[2], nationality: 'Spain', world_cup_year: 2010 },
    ];
    const { data, player } = await loaded();
    expect(criterion(data, 'wc-any').test(player, data)).toBe(true);
    expect(data.worldCupAll).toEqual(new Set(['andrew robertson', 'fictional1352-0', 'fictional1352-1']));
    expect(data.worldCup2022).toEqual(new Set(['fictional1352-0']));
    expect(data.wcWinners).toEqual(new Set(['fictional1352-0', 'fictional1352-1']));
  });

  it('does not turn the 2026 Scotland row into a 2022 appearance', async () => {
    const { data, player } = await loaded();
    expect(criterion(data, 'wc-2022').test(player, data)).toBe(false);
    expect(criterion(data, 'wc-2022').support).not.toContain(player.name);
  });

  it('does not turn the Scotland row into a winning squad', async () => {
    const { data, player } = await loaded();
    expect(criterion(data, 'wc-winner').test(player, data)).toBe(false);
    expect(criterion(data, 'wc-winner').support).not.toContain(player.name);
  });

  it('refuses unknown similar names instead of matching a surname', async () => {
    transport.worldCupRows = ['Bob Robertson', 'Andy Roberson', 'Robertson'].map(player_name => ({ ...recorded, player_name }));
    const { data, player } = await loaded();
    expect(criterion(data, 'wc-any').test(player, data)).toBe(false);
    expect(criterion(data, 'wc-any').support).not.toContain(player.name);
  });

  it('refuses the Scottish alias for a wrong or absent squad country', async () => {
    for (const nationality of ['England', '', 'Scotland / France']) {
      transport.worldCupRows = [{ ...recorded, nationality }];
      const { data, player } = await loaded();
      expect(criterion(data, 'wc-any').test(player, data), 'an unverified country must not acquire the Scottish alias').toBe(false);
      expect(data.worldCupAll.has('andy robertson')).toBe(true);
    }
  });

  it('retains exact World Cup query predicates and a later canonical page', async () => {
    transport.worldCupRows = [
      ...Array.from({ length: 1000 }, (_, i) => ({ player_name: `Fictional page ${i}`, nationality: 'Fixture', world_cup_year: 2014 })),
      { ...recorded, player_name: 'Andrew Robertson' },
    ];
    const { data, player } = await loaded();
    expect(criterion(data, 'wc-any').test(player, data)).toBe(true);
    expect(data.worldCupAll.size).toBe(1001);
    const queries = transport.queries.filter(query => query.table === 'world_cup_players');
    expect(queries.map(query => query.calls.filter(([method]) => method !== 'abortSignal'))).toEqual([
      [['select', ['player_name, world_cup_year, nationality']], ['gte', ['world_cup_year', 2010]], ['order', ['id', { ascending: true }]], ['range', [0, 999]]],
      [['select', ['player_name, world_cup_year, nationality']], ['gte', ['world_cup_year', 2010]], ['order', ['id', { ascending: true }]], ['range', [1000, 1999]]],
    ]);
  });

  it('keeps a failed World Cup read closed and aborts its owned siblings', async () => {
    transport.failWorldCup = true;
    expect(await fetchBingoData()).toBeNull();
    expect(transport.queries.some(query => query.table === 'world_cup_players')).toBe(true);
    expect(transport.queries.every(query => query.signal?.aborted)).toBe(true);
    expect(transport.queries.some(query => query.calls.some(([method]) => method === 'range') && query.table === 'player_market_values')).toBe(false);
  });

  it('keeps an abandoned caller closed before issuing any reads', async () => {
    const caller = new AbortController(); caller.abort();
    expect(await fetchBingoData(caller.signal)).toBeNull();
    expect(transport.queries).toHaveLength(0);
  });
});
