// In-memory stand-in for the supabase-js query builder, enough for src/lib/playerBingo.ts.
class Query {
  constructor(table) { this.table = table; this.filters = []; this.orders = []; this.lim = null; this.rng = null; }
  select() { return this; }
  gte(c, v) { this.filters.push(r => r[c] != null && r[c] >= v); return this; }
  gt(c, v) { this.filters.push(r => r[c] != null && r[c] > v); return this; }
  not(c, op, v) { if (op === 'is' && v === null) this.filters.push(r => r[c] != null); return this; }
  in(c, list) { const s = new Set(list); this.filters.push(r => s.has(r[c])); return this; }
  eq(c, v) { this.filters.push(r => r[c] === v); return this; }
  order(c, o) { this.orders.push([c, o?.ascending !== false]); return this; }
  limit(n) { this.lim = n; return this; }
  range(a, b) { this.rng = [a, b]; return this; }
  abortSignal() { return this; }
  run() {
    let rows = (globalThis.__FAKE_TABLES[this.table] || []).filter(r => this.filters.every(f => f(r)));
    rows = [...rows].sort((x, y) => {
      for (const [c, asc] of this.orders) { if (x[c] === y[c]) continue; return (x[c] < y[c] ? -1 : 1) * (asc ? 1 : -1); }
      return 0;
    });
    if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
    if (this.lim != null) rows = rows.slice(0, this.lim);
    return { data: rows, error: null };
  }
  then(res, rej) { return Promise.resolve(this.run()).then(res, rej); }
}
export const supabase = { from: t => new Query(t) };
export const SUPABASE_URL = '';
export const SUPABASE_PUBLISHABLE_KEY = '';
