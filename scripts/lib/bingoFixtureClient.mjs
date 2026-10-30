/* Round 1571: a stand in for '@/integrations/supabase/client' that answers
   Player Bingo's own reads from a committed fixture, so a harness can run the
   real fetchBingoData without reaching the live database.

   A harness bundles the lib with esbuild and points that import here
   (scripts/lib/bingoFixtureBundle.mjs does both). The rows come from globalThis.__bingoFixture,
   which the harness fills before it calls fetchBingoData:
     { rows: [...], ignorePaging: false }
   rows: the fixture's rows (scripts/data/bingoPoolHistory-2026-10-29.json).

   from('player_market_values') answers select, in, gte, gt, not (column is
   null), order (ties broken by id ascending, as a stable stand in for the
   server's undefined tie order), limit, range and abortSignal the way
   PostgREST would, with the server's 1,000 row cap on every response. Every
   other table answers with no rows, so the World Cup and Ballon d'Or sets are
   empty on every run: the fleet's boards are fixture boards, not live ones.

   ignorePaging (the FIXTURE_CONTROL=cap control) drops the range and the
   1,000 row cap, so the lib sees every matching row on every page. */

export const SUPABASE_URL = 'https://fixture.invalid';
export const SUPABASE_PUBLISHABLE_KEY = 'fixture-anon-key';

const ROW_CAP = 1000;

function compare(column, ascending) {
  const dir = ascending ? 1 : -1;
  return (a, b) => {
    const x = a[column];
    const y = b[column];
    if (x !== y) {
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === 'number' && typeof y === 'number') return dir * (x - y);
      return dir * String(x).localeCompare(String(y));
    }
    return a.id - b.id;
  };
}

function answer(table, operations) {
  const state = globalThis.__bingoFixture;
  if (!state || !Array.isArray(state.rows)) throw new Error('bingoFixtureClient: globalThis.__bingoFixture.rows is not set');
  state.requests = (state.requests ?? 0) + 1;
  if (table !== 'player_market_values') return { data: [], error: null };
  let rows = [...state.rows];
  let order = null;
  let limit = null;
  let range = null;
  let columns = null;
  for (const [method, args] of operations) {
    if (method === 'select') columns = String(args[0]).split(',').map(c => c.trim());
    else if (method === 'in') rows = rows.filter(r => args[1].includes(r[args[0]]));
    else if (method === 'gte') rows = rows.filter(r => r[args[0]] != null && Number(r[args[0]]) >= Number(args[1]));
    else if (method === 'gt') rows = rows.filter(r => r[args[0]] != null && Number(r[args[0]]) > Number(args[1]));
    else if (method === 'not') {
      if (args[1] !== 'is' || args[2] !== null) throw new Error(`bingoFixtureClient: unsupported not(${args.join(', ')})`);
      rows = rows.filter(r => r[args[0]] != null);
    } else if (method === 'order') order = compare(args[0], args[1]?.ascending !== false);
    else if (method === 'limit') limit = Number(args[0]);
    else if (method === 'range') range = [Number(args[0]), Number(args[1])];
    else if (method === 'abortSignal') {
      if (args[0]?.aborted) return { data: null, error: new Error('aborted') };
    } else throw new Error(`bingoFixtureClient: unsupported method ${method}`);
  }
  if (order) rows.sort(order);
  if (state.ignorePaging) {
    if (limit != null) rows = rows.slice(0, limit);
  } else {
    if (range) rows = rows.slice(range[0], range[1] + 1);
    if (limit != null) rows = rows.slice(0, limit);
    rows = rows.slice(0, ROW_CAP);
  }
  if (!columns) throw new Error('bingoFixtureClient: a query with no select');
  state.maxRows = Math.max(state.maxRows ?? 0, rows.length);
  if (range) state.maxPageRows = Math.max(state.maxPageRows ?? 0, rows.length);
  return { data: rows.map(r => Object.fromEntries(columns.map(c => [c, r[c] ?? null]))), error: null };
}

function query(table) {
  const operations = [];
  const builder = new Proxy({}, {
    get(_target, method) {
      if (method === 'then') {
        return (resolve, reject) => {
          let result;
          try {
            result = answer(table, operations);
          } catch (error) {
            return Promise.reject(error).then(resolve, reject);
          }
          return Promise.resolve(result).then(resolve, reject);
        };
      }
      return (...args) => {
        operations.push([String(method), args]);
        return builder;
      };
    },
  });
  return builder;
}

export const supabase = { from: table => query(table) };
