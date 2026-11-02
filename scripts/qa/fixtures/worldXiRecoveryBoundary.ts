import { createWorldXiRecoveryMarketRows } from './worldXiRecovery938';

const MARKET = 'player_name,nationality,position,club,market_value_usd,year,age';
const HISTORY = 'player_name,secondary_positions,primary_position';
const reads: { table: string; params: Record<string, string>; count: number; body: string }[] = [];
const completions: unknown[][] = [];
const seen = new Set<string>();
let rows: ReturnType<typeof createWorldXiRecoveryMarketRows> | null = null;
let originalRows = '';
function requireFixture(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('WX_FICTIONAL_READ_BOUNDARY: ' + message);
}
export const SUPABASE_URL = 'http://127.0.0.1:4174';
export const SUPABASE_PUBLISHABLE_KEY = 'fictional-fixture-not-a-credential';
export const supabase = {
  from(table: string) {
    requireFixture(table === 'player_market_values' || table === 'player_verified_positions', 'Only the two declared read tables');
    const params: Record<string, string> = {};
    const request = {
      select(columns: string) {
        requireFixture(params.select === undefined, 'One projection');
        requireFixture(columns === (table === 'player_market_values' ? MARKET : HISTORY).replace(/,/g, ', '), 'Exact actual loader projection');
        params.select = columns.replace(/, /g, ','); return request;
      },
      eq(column: string, value: number) {
        requireFixture(table === 'player_market_values' && column === 'year' && (value === 2026 || value === 2025) && params.year === undefined, 'One declared market year');
        params.year = 'eq.' + value; return request;
      },
      gt(column: string, value: number) {
        requireFixture(table === 'player_market_values' && column === 'market_value_usd' && value === 0 && params.market_value_usd === undefined, 'Positive value filter');
        params.market_value_usd = 'gt.0'; return request;
      },
      order(column: string, options: { ascending: boolean }) {
        requireFixture(table === 'player_market_values' && column === 'id' && options.ascending === true && params.order === undefined, 'Ascending source order');
        params.order = 'id.asc'; return request;
      },
      range(from: number, to: number) {
        requireFixture(table === 'player_market_values' && Number.isInteger(from) && from >= 0 && from <= 7000 && from % 1000 === 0 && to === from + 999 && params.offset === undefined, 'One bounded page');
        params.offset = String(from); params.limit = '1000'; return request;
      },
      limit(value: number) {
        requireFixture(table === 'player_verified_positions' && value === 1000 && params.limit === undefined, 'One bounded fictional history read');
        params.limit = '1000'; return request;
      },
      then(ok: (value: unknown) => unknown, bad: (error: unknown) => unknown) {
        try {
          const market = table === 'player_market_values';
          requireFixture(params.select === (market ? MARKET : HISTORY) && params.limit === '1000', 'Complete projection and limit');
          requireFixture(market ? Object.keys(params).length === 6 && ['eq.2026', 'eq.2025'].includes(params.year)
            && params.market_value_usd === 'gt.0' && params.order === 'id.asc' && params.offset !== undefined : Object.keys(params).length === 2, 'Exact fictional read shape');
          const identity = JSON.stringify([table, Object.entries(params).sort(([a], [b]) => a.localeCompare(b))]);
          requireFixture(!seen.has(identity), 'Each declared loader read happens once'); seen.add(identity);
          if (rows === null) { rows = createWorldXiRecoveryMarketRows(); originalRows = JSON.stringify(rows); }
          const data = market && params.year === 'eq.2026' && params.offset === '0' ? rows : [];
          reads.push({ table, params: { ...params }, count: data.length, body: JSON.stringify(data) });
          return Promise.resolve({ data, error: null }).then(ok, bad);
        } catch (error) { return Promise.reject(error).then(ok, bad); }
      },
    };
    return request;
  },
};
export function recordCompletion(...args: unknown[]) { completions.push(args); }
export function getCurrentPlayerName() { return 'Fixture Recovery Tester'; }
export function recoveryObservations() {
  return JSON.parse(JSON.stringify({ scope: 'Fictional938 declared client and completion boundary only', reads, completions, originalRows, currentRows: rows === null ? '' : JSON.stringify(rows) }));
}
