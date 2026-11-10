/* Original-only Player Bingo proof with fictional pool and World Cup rows. */
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { expect, it, vi } from 'vitest';
import { buildCriteria, fetchBingoData } from '@/lib/playerBingo';

type Call = [method: string, args: unknown[]];
type Phase = 'seed' | 'latest' | 'history' | 'worldCup' | 'ballonDor';
type Query = { table: string; calls: Call[]; signal?: AbortSignal; phase?: Phase };
type Plan = { phase: Phase; table: string; calls: Call[]; rows: unknown[] };
type Reply = { data: unknown[] | null; error: Error | null };

const transport = vi.hoisted(() => ({ queries: [] as Query[], pending: [] as Plan[], faults: [] as string[] }));
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

const name = 'Arden Vale Lumen';
const reverse = 'Lumen Arden Vale';
const unrelated = 'Ivo Fen Corin';
const country = 'Fixture North';
const birthDate = '2000-06-12';
const names = [name, ...Array.from({ length: 100 }, (_, i) => 'Fictional Pool ' + String(i + 1).padStart(3, '0'))];
const market = new Map(names.map((player_name, i) => [player_name, {
  player_name, nationality: i === 0 ? country : 'Fixture Other', position: 'Forward', club: 'Fictional Vale Club',
  market_value_usd: 101 - i, age: 26, year: 2026,
}]));
const cases = [
  { id: 'alternate-order-2022', player_name: reverse, nationality: country, world_cup_year: 2022 },
  { id: 'exact-order-2022', player_name: name, nationality: country, world_cup_year: 2022 },
  { id: 'reverse-wrong-country', player_name: reverse, nationality: 'Fixture South', world_cup_year: 2022 },
  { id: 'reverse-absent-country', player_name: reverse, nationality: '', world_cup_year: 2022 },
  { id: 'exact-order-2026', player_name: name, nationality: country, world_cup_year: 2026 },
  { id: 'unrelated-2022', player_name: unrelated, nationality: country, world_cup_year: 2022 },
];

const worldCupTable = 'world_cup_players';
const marketTable = 'player_market_values';
const countryProjection = 'player_name, world_cup_year, nationality, date_of_birth';
const historyProjection = 'player_name, nationality, position, club, year, age, market_value_usd, goals, assists, matches, yellow_cards, red_cards';
const poolProjection = 'player_name, nationality, position, club, market_value_usd, age, year';
const poolFilters: Call[] = [['gte', ['year', 2024]], ['gt', ['market_value_usd', 0]], ['not', ['age', 'is', null]]];
const worldCupCalls: Call[] = [['select', [countryProjection]], ['gte', ['world_cup_year', 2010]],
  ['order', ['id', { ascending: true }]], ['range', [0, 999]]];
const callsWithoutSignal = (query: Query) => query.calls.filter(([method]) => method !== 'abortSignal');

function plan(squad: unknown): Plan[] {
  const expected: Plan[] = [
    { phase: 'seed', table: marketTable, calls: [['select', ['player_name']], ...poolFilters,
      ['order', ['market_value_usd', { ascending: false }]], ['limit', [1000]]],
      rows: names.map(player_name => ({ player_name })) },
    { phase: 'worldCup', table: worldCupTable, calls: worldCupCalls, rows: [squad] },
    { phase: 'ballonDor', table: 'ballon_dor', calls: [['select', ['player_name, rank, award_type']]], rows: [] },
  ];
  for (let i = 0; i < names.length; i += 40) {
    const chunk = names.slice(i, i + 40);
    expected.push({ phase: 'latest', table: marketTable, calls: [['select', [poolProjection]], ['in', ['player_name', chunk]],
      ...poolFilters, ['order', ['year', { ascending: false }]], ['limit', [1000]]],
      rows: chunk.map(player => market.get(player)) });
  }
  for (let i = 0; i < names.length; i += 80) {
    const chunk = names.slice(i, i + 80);
    expected.push({ phase: 'history', table: marketTable, calls: [['select', [historyProjection]], ['in', ['player_name', chunk]],
      ['order', ['id', { ascending: true }]], ['range', [0, 999]]], rows: [] });
  }
  return expected;
}

function answer(query: Query): Reply {
  const at = transport.pending.findIndex(item => item.table === query.table && isDeepStrictEqual(item.calls, callsWithoutSignal(query)));
  if (at < 0 || !query.signal || query.signal.aborted || query.calls.filter(([method]) => method === 'abortSignal').length !== 1
      || query.calls.at(-1)?.[0] !== 'abortSignal') {
    const reason = 'Unexpected fictional query: ' + query.table + ' ' + JSON.stringify(callsWithoutSignal(query));
    transport.faults.push(reason);
    return { data: null, error: new Error(reason) };
  }
  const [selected] = transport.pending.splice(at, 1);
  query.phase = selected.phase;
  return { data: selected.rows, error: null };
}

function exactSource(root: string, file: string, expectedBlob: string, expectedSHA: string, expectedBytes: number) {
  const bytes = readFileSync(path.join(root, file));
  const blob = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  expect([blob, sha256, bytes.length], file + ' held bytes').toEqual([expectedBlob, expectedSHA, expectedBytes]);
  return { path: file, blob, sha256, bytes: bytes.length };
}

const bits = (test: boolean) => ({ test, support: test });
const vector = (any: boolean, y2022: boolean) => ({ 'wc-any': bits(any), 'wc-2022': bits(y2022) });

it('records original World Cup tile outcomes for one held fictional name-order boundary', async () => {
  expect(Boolean(process.env.CI && process.env.SIM_NETWORK === 'offline')).toBe(true);
  const rawPath = process.env.PLAYER_BINGO_WORLD_CUP_ORDER_RAW;
  const receipt = process.env.SIM_OFFLINE_RECEIPT;
  if (!rawPath || !receipt) throw new Error('Exact RAW and offline evidence destinations required');
  expect(statSync(receipt).size).toBe(0);
  const root = process.cwd();
  const output = path.resolve(root, rawPath);
  expect(output.startsWith(root + path.sep)).toBe(true);
  const source = {
    loader: exactSource(root, 'src/lib/playerBingo.ts', '885fab96ef9f463d5447245c6f1f4937ce68aafa',
      'dd87795e3079ace09572f6ca8e42d511721c60b3a655c7e770555d0d87c14855', 54755),
    transportExample: exactSource(root, 'src/test/playerBingoWorldCupAlias.test.ts', 'b6f57a7f4f1b14a95e90912f54cdbcc34cc3491c',
      '537008a3e07d747c7556cd404b15d31a58fe7ae2441a4735ae41e14b9d47baef', 7836),
  };
  let fetchCalls = 0;
  vi.stubGlobal('fetch', () => {
    fetchCalls++;
    throw new Error('Unexpected real fetch in fictional Player Bingo test');
  });
  try {
    const measured = [];
    const expected = [vector(false, false), vector(true, true), vector(false, false),
      vector(false, false), vector(true, false), vector(false, false)];
    for (const [index, { id, ...row }] of cases.entries()) {
      const squad = { ...row, date_of_birth: birthDate };
      transport.queries = [];
      transport.pending = plan(squad);
      transport.faults = [];
      const data = await fetchBingoData();
      if (!data) throw new Error(id + ' complete fictional load failed: ' + transport.faults.join('; '));
      const [player] = data.pool.filter(item => item.name === name);
      if (!player) throw new Error(id + ' selected fictional identity missing');
      expect(data.pool.length, id + ' exact loaded pool').toBe(101);
      expect(data.pool.filter(item => item.name === name), id + ' one selected identity').toHaveLength(1);
      expect([player.name, player.nationality, player.age, player.year, player.birthYear ?? null],
        id + ' actual draw and separate held birth-year behavior').toEqual([name, country, 26, 2026, index === 1 || index === 4 ? 2000 : null]);
      expect([transport.pending, transport.faults, fetchCalls], id + ' complete mocked transport').toEqual([[], [], 0]);
      const counts: Record<Phase, number> = { seed: 0, latest: 0, history: 0, worldCup: 0, ballonDor: 0 };
      for (const query of transport.queries) if (query.phase) counts[query.phase]++;
      expect(counts, id + ' exact transport count').toEqual({ seed: 1, latest: 3, history: 2, worldCup: 1, ballonDor: 1 });
      const signals = new Set(transport.queries.map(query => query.signal));
      const sharedLiveSignal = signals.size === 1 && transport.queries.every(query => !!query.signal && !query.signal.aborted);
      expect(sharedLiveSignal, id + ' actual shared live loader signal').toBe(true);
      const worldCupQueries = transport.queries.filter(query => query.phase === 'worldCup')
        .map(query => ({ table: query.table, calls: callsWithoutSignal(query) }));
      expect(worldCupQueries, id + ' exact held World Cup query').toEqual([{ table: worldCupTable, calls: worldCupCalls }]);
      const keys = { any: [...data.worldCupAll], y2022: [...data.worldCup2022], winner: [...data.wcWinners] };
      const key = row.player_name.toLowerCase();
      expect(keys, id + ' literal held set keys').toEqual({ any: [key], y2022: row.world_cup_year === 2022 ? [key] : [], winner: [] });
      const available = buildCriteria(data);
      const tile = (tileId: 'wc-any' | 'wc-2022') => {
        const matches = available.filter(item => item.id === tileId);
        expect(matches, id + ' one criterion ' + tileId).toHaveLength(1);
        const criterion = matches[0];
        return { test: criterion.test(player, data), support: criterion.support.includes(player.name) };
      };
      const criteria = { 'wc-any': tile('wc-any'), 'wc-2022': tile('wc-2022') };
      expect(criteria, id + ' exact original tile responses').toEqual(expected[index]);
      measured.push({ id, squad, poolSize: data.pool.length, selected: { name: player.name, nationality: player.nationality,
        age: player.age, year: player.year, birthYear: player.birthYear ?? null }, keys, criteria,
        transport: { counts, sharedLiveSignal, fetchCalls, worldCupQueries } });
    }
    writeFileSync(output, JSON.stringify({ schema: 'player-bingo-world-cup-name-order-v1', source, cases: measured }) + '\n', { flag: 'wx' });
    expect(statSync(receipt).size).toBe(0);
    expect(measured[0].criteria,
      'PLAYER_BINGO_WORLD_CUP_NAME_ORDER: both World Cup tiles support the same identity in alternate name order').toEqual(vector(true, true));
  } finally {
    vi.unstubAllGlobals();
  }
});
