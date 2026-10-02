/* Round 795: run any harness against the table AS THE ROUND 795 MIGRATION
   WILL LEAVE IT, before anyone applies it.

   supabase/migrations/20261001170000_round_795_window_2026.sql is written
   unapplied. The fences that read the two tables it writes (the league
   harnesses, simWindow2026Integration, simTransferOverlay, the stint fences)
   must stay green once the lead applies it, and that is only proven by
   running them on the after state. This preload patches globalThis.fetch in
   the process it is loaded into: every REST read of player_market_values and
   soccer_player_club_stints is answered as the table will be once the
   committed migration has run (its moves applied to the 2026 rows, its
   inserted market rows and its stint rows added, ids above the current
   maximum, the stint columns copied the way its WRITE 3 copies them). Every
   other request goes through untouched, and nothing is ever written.

   Run:  NODE_OPTIONS="--import=<absolute file URL of this file>" node scripts/simX.mjs
   NODE_OPTIONS (not a bare --import) carries it into the child processes a
   harness spawns, so simWindow2026Integration's simTransferOverlay child sees
   the same table.

   It is exact or it throws. A read it cannot answer exactly (a filter or
   order it does not know, an embedded select, a page whose rows it cannot
   place) throws an error naming the request, so the harness goes red rather
   than green on a guess. When the table already carries the after state
   (the migration has been applied) it says so and serves the table as it is;
   a table that is neither the before nor the after state stops the process.
   It prints one line when it starts serving and one at exit with the count
   of reads it answered, which is the proof it ran. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMigration, MIGRATION_REL } from '../buildWindow2026.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CAP = 1000; // PostgREST answers at most this many rows
const MARKET = 'player_market_values';
const STINTS = 'soccer_player_club_stints';

const realFetch = globalThis.fetch.bind(globalThis);
const served = { positional: 0, wide: 0, counted: 0, passedLive: 0 };
let mode = 'unknown';

function auth() {
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
  const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  if (!url || !key) throw new Error('window2026AsApplied: could not read the Supabase URL and key from client.ts');
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

async function realRows(pathAndQuery) {
  const { url, headers } = auth();
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let res = null;
    try { res = await realFetch(`${url}/rest/v1/${pathAndQuery}`, { headers }); }
    catch (err) { last = String(err).slice(0, 80); }
    if (res && res.ok) return res.json();
    if (res) last = `HTTP ${res.status}`;
    if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
  }
  throw new Error(`window2026AsApplied: ${last} for ${pathAndQuery.slice(0, 100)}`);
}
const inList = names => encodeURIComponent(names.map(n => `"${String(n).replace(/"/g, '\\"')}"`).join(','));
async function byNames(table, names, extra) {
  const out = [];
  for (let i = 0; i < names.length; i += 40) {
    const rows = await realRows(`${table}?select=*${extra}&player_name=in.(${inList(names.slice(i, i + 40))})&order=id.asc&limit=1000`);
    if (rows.length >= CAP) throw new Error('window2026AsApplied: a name chunk filled a page');
    out.push(...rows);
  }
  return out;
}
const fold = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ */
/* The after state, built once from the committed migration           */
/* ------------------------------------------------------------------ */
let statePromise = null;
function loadState() {
  if (statePromise) return statePromise;
  statePromise = (async () => {
    const mig = parseMigration(fs.readFileSync(path.join(ROOT, MIGRATION_REL), 'utf8'));
    if (!mig.moves.length || mig.expectedMoves !== mig.moves.length || mig.expectedInserts !== mig.inserts.length || mig.expectedStints !== mig.stints.length) {
      throw new Error('window2026AsApplied: the migration did not parse to its own expected counts');
    }
    const moverRows = await byNames(MARKET, mig.moves.map(m => m.name), '&year=eq.2026');
    const insRows = mig.inserts.length ? await byNames(MARKET, mig.inserts.map(i => i.name), '&year=eq.2026') : [];
    const by = new Map();
    for (const r of moverRows) (by.get(r.player_name) ?? by.set(r.player_name, []).get(r.player_name)).push(r);
    let atFrom = 0, atTo = 0;
    const odd = [];
    for (const m of mig.moves) {
      const list = by.get(m.name) || [];
      if (list.length === 1 && list[0].club === m.from) atFrom += 1;
      else if (list.length === 1 && list[0].club === m.to) atTo += 1;
      else odd.push(`${m.name}: ${list.map(r => r.club).join(' | ') || 'no 2026 row'}`);
    }
    if (!odd.length && atTo === mig.moves.length && insRows.length === mig.inserts.length) {
      mode = 'live';
      console.error(`window2026AsApplied: the table already carries the Round 795 after state (${atTo} moves applied, ${insRows.length} inserts present); serving it as it is`);
      return null;
    }
    if (odd.length || atFrom !== mig.moves.length || insRows.length !== 0) {
      throw new Error(`window2026AsApplied: the table is neither the Round 795 before state nor its after state (${atFrom} at from, ${atTo} at to, ${insRows.length} inserts present): ${odd.slice(0, 3).join('; ')}`);
    }

    const maxMarket = (await realRows(`${MARKET}?select=id&order=id.desc&limit=1`))[0].id;
    const maxStint = (await realRows(`${STINTS}?select=id&order=id.desc&limit=1`))[0].id;
    const marketTemplate = Object.keys((await realRows(`${MARKET}?select=*&limit=1`))[0]);
    const stintTemplate = Object.keys((await realRows(`${STINTS}?select=*&limit=1`))[0]);

    /* The market table: each mover's row keeps its id and takes the new
       club; each insert is a new row (WRITE 2 sets these columns, the rest
       take the table's defaults: the counting stats 0, the others null). */
    const toBy = new Map(mig.moves.map(m => [m.name, m]));
    const marketChanges = moverRows.map(r => ({ pre: r, post: { ...r, club: toBy.get(r.player_name).to } }));
    mig.inserts.forEach((i, k) => {
      const row = Object.fromEntries(marketTemplate.map(c => [c, null]));
      Object.assign(row, {
        id: maxMarket + 1 + k, player_name: i.name, position: i.position, age: i.age, nationality: i.nationality,
        club: i.club, market_value_usd: i.usd, year: 2026, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0,
      });
      if ('name_folded' in row) row.name_folded = fold(i.name);
      marketChanges.push({ pre: null, post: row });
    });

    /* The stint table: WRITE 3, row for row. nationality and position from
       the 2026 market row after WRITES 1 and 2, else the latest stint;
       debut_year, debut_age and name_folded from the latest stint (last_year
       desc, id desc); person_key null. */
    const stintChanges = [];
    if (mig.stints.length) {
      const names = [...new Set(mig.stints.map(s => s.name))];
      const history = await byNames(STINTS, names, '');
      const market26 = await byNames(MARKET, names, '&year=eq.2026');
      const insertedBy = new Map(marketChanges.filter(c => !c.pre).map(c => [c.post.player_name, c.post]));
      mig.stints.forEach((s, k) => {
        const own = history.filter(h => h.player_name === s.name).sort((a, b) => (b.last_year - a.last_year) || (b.id - a.id));
        if (!own.length) throw new Error(`window2026AsApplied: ${s.name} has no stint to copy from, the migration's guard would refuse`);
        const latest = own[0];
        const m = market26.filter(r => r.player_name === s.name);
        if (m.length > 1) throw new Error(`window2026AsApplied: ${s.name} has ${m.length} 2026 market rows, the migration's guard would refuse`);
        const mr = m[0] ?? insertedBy.get(s.name) ?? null;
        const row = Object.fromEntries(stintTemplate.map(c => [c, null]));
        Object.assign(row, {
          id: maxStint + 1 + k, player_name: s.name, club: s.club, first_year: 2026, last_year: 2026, seasons: 1,
          nationality: mr?.nationality ?? latest.nationality, position: mr?.position ?? latest.position,
          debut_year: latest.debut_year, debut_age: latest.debut_age, person_key: null,
        });
        if ('name_folded' in row) row.name_folded = latest.name_folded;
        stintChanges.push({ pre: null, post: row });
      });
    }
    mode = 'simulate';
    console.error(`window2026AsApplied: serving ${MARKET} and ${STINTS} as the Round 795 migration leaves them (${mig.moves.length} moves, ${mig.inserts.length} market rows above id ${maxMarket}, ${mig.stints.length} stints above id ${maxStint})`);
    return {
      [MARKET]: { changes: marketChanges, changedCols: new Set(['club']), preIds: new Set(moverRows.map(r => r.id)) },
      [STINTS]: { changes: stintChanges, changedCols: new Set(), preIds: new Set() },
    };
  })();
  return statePromise;
}

/* ------------------------------------------------------------------ */
/* PostgREST, the parts these harnesses use                           */
/* ------------------------------------------------------------------ */
function parseIn(v) {
  const inner = v.slice(v.indexOf('(') + 1, v.lastIndexOf(')'));
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (q && ch === '\\') { cur += inner[++i]; continue; }
    if (ch === '"') { q = !q; continue; }
    if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
function matcher(col, raw) {
  let v = raw, negate = false;
  if (v.startsWith('not.')) { negate = true; v = v.slice(4); }
  const m = v.match(/^(eq|neq|gt|gte|lt|lte|in|is|like|ilike)\.(.*)$/s);
  if (!m) throw new Error(`window2026AsApplied: cannot serve the filter ${col}=${raw}`);
  const [, op, arg] = m;
  let test;
  const cmp = (a, b) => {
    const na = Number(a), nb = Number(b);
    if (typeof a === 'number' && Number.isFinite(nb) && String(nb) === b.trim()) return na - nb;
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  };
  if (op === 'in') { const set = new Set(parseIn(v)); test = r => r[col] !== null && r[col] !== undefined && set.has(String(r[col])); }
  else if (op === 'is') {
    if (arg === 'null') test = r => r[col] === null || r[col] === undefined;
    else if (arg === 'true') test = r => r[col] === true;
    else if (arg === 'false') test = r => r[col] === false;
    else throw new Error(`window2026AsApplied: cannot serve the filter ${col}=${raw}`);
  } else if (op === 'like' || op === 'ilike') {
    const re = new RegExp(`^${arg.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[*%]/g, '.*').replace(/_/g, '.')}$`, op === 'ilike' ? 'is' : 's');
    test = r => r[col] !== null && r[col] !== undefined && re.test(String(r[col]));
  } else if (op === 'eq') test = r => r[col] !== null && r[col] !== undefined && String(r[col]) === arg;
  else if (op === 'neq') test = r => r[col] !== null && r[col] !== undefined && String(r[col]) !== arg;
  else {
    const f = { gt: c => c > 0, gte: c => c >= 0, lt: c => c < 0, lte: c => c <= 0 }[op];
    test = r => r[col] !== null && r[col] !== undefined && f(cmp(r[col], arg));
  }
  /* SQL three valued logic: a null column fails a test and its negation alike, except is. */
  if (!negate) return test;
  if (op === 'is') return r => !test(r);
  return r => r[col] !== null && r[col] !== undefined && !test(r);
}
function comparator(order) {
  if (!order) return null;
  const keys = order.split(',').map(k => {
    const [col, dir = 'asc', nulls] = k.split('.');
    const desc = dir === 'desc';
    return { col, desc, nullsFirst: nulls ? nulls === 'nullsfirst' : desc };
  });
  return (a, b) => {
    for (const { col, desc, nullsFirst } of keys) {
      const x = a[col], y = b[col];
      const xn = x === null || x === undefined, yn = y === null || y === undefined;
      if (xn && yn) continue;
      if (xn) return nullsFirst ? -1 : 1;
      if (yn) return nullsFirst ? 1 : -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : (String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0);
      if (c !== 0) return desc ? -c : c;
    }
    return 0;
  };
}
const project = (rows, select) => {
  if (select === '*') return rows;
  const cols = select.split(',').map(s => s.trim()).filter(Boolean);
  return rows.map(r => Object.fromEntries(cols.map(c => [c, r[c] ?? null])));
};

async function serve(table, T, url, method, headers) {
  const sp = url.searchParams;
  for (const k of sp.keys()) if (['or', 'and', 'not', 'on_conflict', 'columns'].includes(k)) throw new Error(`window2026AsApplied: cannot serve ${k}= on ${table}`);
  const select = (sp.get('select') || '*').replace(/\s+/g, '');
  if (/[():!]/.test(select)) throw new Error(`window2026AsApplied: cannot project ${select}`);
  if (/vnd\.pgrst\.object/.test(headers.get('accept') || '')) throw new Error('window2026AsApplied: cannot serve a single object read');
  const order = sp.get('order');
  let offset = sp.has('offset') ? Number(sp.get('offset')) : 0;
  let limit = sp.has('limit') ? Number(sp.get('limit')) : CAP;
  const range = headers.get('range');
  if (range) {
    if (sp.has('offset') || sp.has('limit')) throw new Error('window2026AsApplied: a Range header beside limit or offset');
    const m = range.match(/^(\d+)-(\d+)$/);
    if (!m) throw new Error(`window2026AsApplied: cannot serve Range ${range}`);
    offset = Number(m[1]); limit = Number(m[2]) - offset + 1;
  }
  limit = Math.min(limit, CAP);
  const filterPairs = [...sp].filter(([k]) => !['select', 'order', 'limit', 'offset'].includes(k));
  const filters = filterPairs.map(([k, v]) => ({ col: k, test: matcher(k, v) }));
  const matches = r => filters.every(f => f.test(r));
  const wantCount = /count=(exact|planned|estimated)/.test(headers.get('prefer') || '');
  const idOrder = !order || order === 'id.asc';
  const touches = filters.some(f => T.changedCols.has(f.col)) || (order || '').split(',').some(k => T.changedCols.has(k.split('.')[0]));
  const virtual = T.changes.filter(c => !c.pre).map(c => c.post).filter(matches).sort((a, b) => a.id - b.id);
  const postBy = new Map(T.changes.filter(c => c.pre).map(c => [c.pre.id, c.post]));
  const delta = T.changes.reduce((s, c) => s + (matches(c.post) ? 1 : 0) - (c.pre && matches(c.pre) ? 1 : 0), 0);

  const base = new URL(url);
  for (const k of ['select', 'limit', 'offset']) base.searchParams.delete(k);
  base.searchParams.set('select', '*');
  const reqHeaders = new Headers(headers);
  reqHeaders.delete('range');
  reqHeaders.delete('range-unit');
  const realPage = async (from, n, count) => {
    const u = new URL(base);
    u.searchParams.set('offset', String(from));
    u.searchParams.set('limit', String(n));
    const h = new Headers(reqHeaders);
    if (count) h.set('prefer', 'count=exact'); else h.delete('prefer');
    const res = await realFetch(u.toString(), { method: 'GET', headers: h });
    if (!res.ok && res.status !== 416) throw new Error(`window2026AsApplied: HTTP ${res.status} for ${u.pathname}${u.search.slice(0, 80)}`);
    const rows = res.status === 416 ? [] : await res.json();
    const total = (res.headers.get('content-range') || '').match(/\/(\d+)$/);
    return { rows, total: total ? Number(total[1]) : null };
  };

  let page;
  let realTotal = null;
  if (!touches && idOrder) {
    /* Positional: no filter or order reads a column the migration changes,
       so every real row keeps its place; the new rows have the highest ids
       and follow the last real one. */
    served.positional += 1;
    const first = await realPage(offset, limit, wantCount);
    realTotal = first.total;
    const rows = first.rows.map(r => (postBy.has(r.id) ? { ...postBy.get(r.id) } : r));
    page = rows;
    if (rows.length < limit && virtual.length) {
      let n = rows.length ? offset + rows.length : null;
      if (n === null) n = offset === 0 ? 0 : (realTotal ?? (await realPage(0, 1, true)).total);
      if (n === null) throw new Error('window2026AsApplied: no count to place the new rows by');
      const start = Math.max(0, offset - n);
      page = rows.concat(virtual.slice(start, start + (limit - rows.length)));
    }
  } else {
    /* Wide: read past the page by the number of changed rows, apply the
       changes, re-sort, merge the rows that now match, and answer only what
       is certain. */
    served.wide += 1;
    const slack = T.changes.length + 10;
    /* One real read, merged: changed rows take their new values, rows that
       no longer match go, rows that now match come in, and the list is
       sorted with a real row keeping its place among its ties and a new row
       going after them. Past the end of an incomplete read nothing is
       certain, so the answer stops at the last unchanged real row; null when
       that is short of the page. */
    const merge = (pre, complete, cmpFn) => {
      const lastUnchanged = [...pre].reverse().find(r => !postBy.has(r.id));
      const keyed = pre.map((r, i) => ({ r: postBy.has(r.id) ? { ...postBy.get(r.id) } : r, i })).filter(x => matches(x.r));
      const have = new Set(keyed.map(x => x.r.id));
      for (const c of T.changes) if (!have.has(c.post.id) && matches(c.post)) { keyed.push({ r: { ...c.post }, i: Infinity }); have.add(c.post.id); }
      if (cmpFn) keyed.sort((a, b) => cmpFn(a.r, b.r) || (a.i === b.i ? a.r.id - b.r.id : a.i < b.i ? -1 : 1));
      let rows = keyed.map(x => x.r);
      if (!complete) {
        if (!cmpFn || !lastUnchanged) return null;
        rows = rows.slice(0, rows.findIndex(r => r.id === lastUnchanged.id) + 1);
        if (rows.length < offset + limit) return null;
      }
      return rows.slice(offset, offset + limit);
    };
    let got = null;
    if (offset + limit <= CAP) {
      /* The read's own order, in one request, as the page itself asks. */
      const n = Math.min(CAP, offset + limit + slack);
      const r = await realPage(0, n, wantCount);
      realTotal = r.total;
      got = merge(r.rows, r.rows.length < n, comparator(order));
    }
    if (!got) {
      /* Past one request: id breaks every tie, in the real reads and in the
         merge alike, so two real pages cannot lose or repeat a row. */
      const wideOrder = !order ? 'id.asc' : /(^|,)id\./.test(order) ? order : `${order},id.asc`;
      base.searchParams.set('order', wideOrder);
      const need = offset + limit + slack;
      const pre = [];
      let complete = false;
      for (let from = 0; from < need; from += CAP) {
        const n = Math.min(CAP, need - from);
        const r = await realPage(from, n, from === 0 && wantCount);
        if (from === 0 && wantCount) realTotal = r.total;
        pre.push(...r.rows);
        if (r.rows.length < n) { complete = true; break; }
      }
      got = merge(pre, complete, comparator(wideOrder));
      if (!got) throw new Error(`window2026AsApplied: cannot answer rows ${offset} to ${offset + limit - 1} of ${table} exactly`);
    }
    page = got;
  }

  const out = project(page, select);
  const respHeaders = new Headers({ 'content-type': 'application/json; charset=utf-8' });
  let total = '*';
  if (wantCount) {
    served.counted += 1;
    if (realTotal === null) throw new Error(`window2026AsApplied: no exact count came back for ${table}`);
    total = String(realTotal + delta);
  }
  respHeaders.set('content-range', out.length ? `${offset}-${offset + out.length - 1}/${total}` : `*/${total}`);
  return new Response(method === 'HEAD' ? null : JSON.stringify(out), { status: 200, headers: respHeaders });
}

globalThis.fetch = async (input, init) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  let url;
  try { url = new URL(href); } catch { return realFetch(input, init); }
  const m = url.pathname.match(/\/rest\/v1\/([a-z_]+)$/);
  const table = m && (m[1] === MARKET || m[1] === STINTS) ? m[1] : null;
  if (!table) return realFetch(input, init);
  const method = (init?.method || (typeof input === 'object' && !(input instanceof URL) ? input.method : null) || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') throw new Error(`window2026AsApplied: a ${method} to ${table}; the simulation is read only`);
  const state = await loadState();
  if (!state) { served.passedLive += 1; return realFetch(input, init); }
  const headers = new Headers(init?.headers || (typeof input === 'object' && !(input instanceof URL) ? input.headers : undefined));
  return serve(table, state[table], url, method, headers);
};

process.on('exit', () => {
  console.error(`window2026AsApplied: ${mode}; answered ${served.positional} positional and ${served.wide} wide reads (${served.counted} with a count), ${served.passedLive} passed to a table that is already applied`);
});
