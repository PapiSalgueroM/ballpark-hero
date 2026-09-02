import { describe, expect, it, vi, beforeEach } from 'vitest';

type QueryResult = { data: unknown[] | null; error: Error | null };

const queryState = vi.hoisted(() => ({
  responses: [] as QueryResult[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => {
      const result = queryState.responses.shift() ?? { data: [], error: null };
      const query: Record<string, unknown> & {
        then: (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) => Promise<unknown>;
      } = {
        select: () => query,
        eq: () => query,
        gt: () => query,
        lt: () => query,
        not: () => query,
        in: () => query,
        order: () => query,
        limit: () => query,
        then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
      };
      return query;
    }),
  },
}));

const fetchPath = process.env.FOOTLE_FETCH;
const { fetchFootlePlayerPool } = fetchPath
  ? await import(/* @vite-ignore */ fetchPath)
  : await import('@/lib/fetchFootlePlayerPool');

const famous = {
  player_name: 'Famous Star',
  position: 'Striker',
  age: 28,
  nationality: 'Testland',
  club: 'Pisa Sporting Club',
  market_value_usd: 100_000_000,
  goals: 12,
  assists: 4,
};

const obscure = {
  player_name: 'Obscure Pro',
  position: 'Centre-Forward',
  age: 24,
  nationality: 'Testland',
  club: 'Pisa Sporting Club',
  market_value_usd: 2_000_000,
  goals: 5,
  assists: 2,
};

function setResponses(...responses: QueryResult[]) {
  queryState.responses = responses;
}

describe('fetchFootlePlayerPool', () => {
  beforeEach(() => {
    setResponses();
  });

  it('returns an empty pool when either obscure query fails', async () => {
    setResponses(
      { data: [famous], error: null },
      { data: [obscure], error: null },
      { data: null, error: new Error('obscure query failed') },
    );

    const pool = await fetchFootlePlayerPool();

    expect(pool, `partial pool returned: ${pool.length} players: ${pool.map(player => player.name).join(', ')}`).toEqual([]);
  });

  it('keeps the famous and obscure tiers on a complete successful fetch', async () => {
    setResponses(
      { data: [famous], error: null },
      { data: [obscure], error: null },
      { data: [], error: null },
    );

    const pool = await fetchFootlePlayerPool();

    expect(pool.find(player => player.name === famous.player_name)?.difficulty).toBe('easy');
    expect(pool.find(player => player.name === obscure.player_name)?.difficulty).toBe('insane');
  });

  it('keeps the empty fallback behavior when the famous query fails', async () => {
    setResponses(
      { data: null, error: new Error('famous query failed') },
      { data: [obscure], error: null },
      { data: [], error: null },
    );

    const pool = await fetchFootlePlayerPool();

    expect(pool).toEqual([]);
  });
});
