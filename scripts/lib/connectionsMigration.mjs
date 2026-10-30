/* Round 1574: the Connections migration writers, lifted from Round 1567's two scripts so every later round binds
   one engine (scripts/qa/usConnections1567Migration.mjs and usConnections1567Checksummed.mjs stay exactly as
   1567 closed them; a probe proves this file writes their SQL byte for byte from 1567's plan).

   The table and the board shape are parameters, never assumed: a round names its tables ({ key: table }) and,
   where a stored row is not a plain array of groups, how to read one (groupsOf). Nothing here reads the
   network, the clock or a file.

     lit(value)                    a jsonb literal; a stored dash is written as its JSON escape (the repo carries
                                   no dash character)
     same(a, b)                    jsonb equality: objects by content, not key order
     guardedBlockSql({ round, table, tmp, rows })
                                   one guarded block: each row [{ id, olds, next }] is rewritten in place only
                                   while it holds one of its known old values; NOTICE with rewritten, already
                                   current, drifted and missing
     checksummedSql({ round, writer, tables, payloadRows })
                                   the all or nothing form: the payload's own md5 first, each row only while
                                   md5(groups_json::text) equals its exported hash, raise unless N of N
     classify({ plan, exports, acceptDrifted, groupsOf })
                                   an export against a plan, row by row: rows (to rewrite, with the exported
                                   hash), already (current), drifted, missing; the one classification the
                                   checksummed writers and the table drift check share */
import crypto from 'node:crypto';

/* jsonb compares objects by content, not key order; so does this */
export const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x));
export const same = (a, b) => canon(a) === canon(b);
/* the repo carries no dash character: one in a stored value is written as its JSON escape */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`, 'g');
export const escapeDashes = s => s.replace(DASHES, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
export const lit = v => `'${escapeDashes(JSON.stringify(v)).replace(/'/g, "''")}'`;

/** A stored row's groups: an array of groups, or an object holding one under `groups`, or its JSON text. */
export const plainGroups = raw => { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : (v?.groups ?? []); };

/** One guarded block for one table. rows: [{ id, olds: [groups], next: groups }]. */
export function guardedBlockSql({ round, table, tmp, rows }) {
  const values = rows.flatMap(r => r.olds.map(o => `    ('${r.id}', ${lit(o)}, ${lit(r.next)})`));
  return `
-- ${table}: ${rows.length} boards (${values.length} known old values)
do $$
declare
  rewritten int := 0;
  already int := 0;
  drifted text[] := '{}';
  missing text[] := '{}';
  r record;
begin
  create temp table ${tmp} (puzzle_id text, old_groups jsonb, new_groups jsonb) on commit drop;
  insert into ${tmp} (puzzle_id, old_groups, new_groups) values
${values.join(',\n')}
  ;
  for r in select distinct puzzle_id, new_groups from ${tmp} loop
    if not exists (select 1 from public.${table} c where c.puzzle_id = r.puzzle_id) then
      missing := missing || r.puzzle_id;
    elsif exists (select 1 from public.${table} c where c.puzzle_id = r.puzzle_id and c.groups_json = r.new_groups) then
      already := already + 1;
    else
      update public.${table} c
         set groups_json = r.new_groups
       where c.puzzle_id = r.puzzle_id
         and c.groups_json in (select o.old_groups from ${tmp} o where o.puzzle_id = r.puzzle_id);
      if found then
        rewritten := rewritten + 1;
      else
        drifted := drifted || r.puzzle_id;
      end if;
    end if;
  end loop;
  drop table ${tmp};
  raise notice 'Round ${round} ${table}: % boards rewritten, % already current, % drifted from every known old board (left alone): %, % not in the table: %',
    rewritten, already, coalesce(array_length(drifted, 1), 0), drifted, coalesce(array_length(missing, 1), 0), missing;
end
$$;
`;
}

/** The checksummed, all or nothing SQL for a payload of { t, id, h, n } rows; tables is { t: table } in order. */
export function checksummedSql({ round, writer, tables, payloadRows }) {
  const payload = `[\n${payloadRows.map(r => escapeDashes(JSON.stringify(r))).join(',\n')}\n]`;
  const md5 = crypto.createHash('md5').update(payload, 'utf8').digest('hex');
  const n = payloadRows.length;
  const keys = Object.keys(tables);
  const branch = (kw, t) => `      ${kw} rec.t = '${t}' then
      update public.${tables[t]} c set groups_json = rec.n where c.puzzle_id = rec.id and md5(c.groups_json::text) = rec.h;`;
  const current = keys.map(t => `(rec.t = '${t}' and exists (select 1 from public.${tables[t]} c where c.puzzle_id = rec.id and c.groups_json = rec.n))`).join(' or ');
  return `-- Round ${round}, checksummed and all or nothing (written by ${writer} from the
-- read only exports): ${n} rows. Each is rewritten only while md5(groups_json::text) equals the hash exported just
-- before; the payload's own md5 is checked first; anything but ${n} of ${n} raises and rolls back.
do $$
declare
  payload text := $pl$${payload}$pl$;
  rec record;
  rewritten int := 0;
  already int := 0;
  drifted text[] := '{}';
  cnt int;
begin
  if md5(payload) <> '${md5}' then
    raise exception 'Round ${round}: payload checksum mismatch, nothing applied';
  end if;
  for rec in select * from jsonb_to_recordset(payload::jsonb) as x(t text, id text, h text, n jsonb) loop
    if ${current} then
      already := already + 1;
    else
${keys.map((t, i) => branch(i === 0 ? 'if' : 'elsif', t)).join('\n')}
      else
        raise exception 'Round ${round}: unknown table %', rec.t;
      end if;
      get diagnostics cnt = row_count;
      if cnt > 0 then rewritten := rewritten + 1; else drifted := drifted || (rec.t || ':' || rec.id); end if;
    end if;
  end loop;
  if rewritten + already <> ${n} then
    raise exception 'Round ${round}: % rewritten, % already current, drifted %: nothing applied', rewritten, already, drifted;
  end if;
  raise notice 'Round ${round}: % rewritten, % already current, 0 drifted', rewritten, already;
end
$$;
`;
}

/**
 * An export against a plan: { rows, already, drifted, missing }, each id written "<t>:<id>".
 * plan: { t: [{ id, olds, next }] }; exports: { t: [{ puzzle_id, groups_json, h }] }. A row holding the new board
 * is already current; one holding a known old board goes in with its exported hash; anything else is drifted and
 * goes in only when acceptDrifted names it. A row the export lacks is missing.
 */
export function classify({ plan, exports, acceptDrifted = [], groupsOf = plainGroups }) {
  const out = { rows: [], already: [], drifted: [], missing: [] };
  for (const t of Object.keys(plan)) {
    const live = new Map((exports[t] ?? []).map(r => [r.puzzle_id, r]));
    for (const r of plan[t]) {
      const row = live.get(r.id);
      if (!row) { out.missing.push(`${t}:${r.id}`); continue; }
      const g = groupsOf(row.groups_json);
      if (same(g, r.next)) { out.already.push(`${t}:${r.id}`); continue; }
      if (!r.olds.some(o => same(o, g))) {
        out.drifted.push(`${t}:${r.id}`);
        if (!acceptDrifted.includes(r.id)) continue;
      }
      if (!/^[0-9a-f]{32}$/.test(String(row.h ?? ''))) throw new Error(`${t} ${r.id}: the export has no md5 column h; export with md5(groups_json::text) as h`);
      out.rows.push({ t, id: r.id, h: row.h, n: r.next });
    }
  }
  return out;
}
