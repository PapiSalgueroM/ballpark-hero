/* Round 1567: the checksummed, all or nothing form of the round's migration, written from the lead's read only
   exports of the three tables (Round 1553 and 1558 applied theirs this way; scripts/qa/usConnections1558Applied.sql).

   Each export is the JSON of
     select puzzle_id, sort_order, groups_json, md5(groups_json::text) as h from public.<table> order by sort_order;
   (h is Postgres's own hash of the stored text, so nothing here has to guess how jsonb prints).

     node scripts/qa/usConnections1567Checksummed.mjs baseball=<b.json>,nfl=<f.json>,nhl=<h.json> <out.sql>

   For every row the migration (supabase/migrations/20261029120000_round_1567_us_connections_gray.sql) rewrites:
   a row already holding the new board is left out; a row holding a known old board goes in with its exported hash;
   a row holding anything else (drifted) STOPS the script (exit 1, named) unless the lead, having looked at it,
   lists it in ACCEPT_DRIFTED=<id,id>, in which case it goes in with its exported hash like the rest. A row missing
   from an export stops it too. The SQL it writes checks its own payload's md5 before anything, rewrites each row
   only while md5(groups_json::text) still equals the exported hash, and raises (so nothing is applied) unless every
   row was rewritten or already current. A second run is a no-op. Reads only the exports and the repo. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { plan, same, SPORTS } from './usConnections1567Migration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
void ROOT;
/** The SQL for a payload of { t, id, h, n } rows. Exported for the rehearsal. */
export function checksummedSql(payloadRows) {
  const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`, 'g');
  const payload = `[\n${payloadRows.map(r => JSON.stringify(r).replace(DASHES, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)).join(',\n')}\n]`;
  const md5 = crypto.createHash('md5').update(payload, 'utf8').digest('hex');
  const n = payloadRows.length;
  const branch = (kw, t) => `      ${kw} rec.t = '${t}' then
      update public.${SPORTS[t][1]} c set groups_json = rec.n where c.puzzle_id = rec.id and md5(c.groups_json::text) = rec.h;`;
  return `-- Round 1567, checksummed and all or nothing (written by scripts/qa/usConnections1567Checksummed.mjs from the
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
    raise exception 'Round 1567: payload checksum mismatch, nothing applied';
  end if;
  for rec in select * from jsonb_to_recordset(payload::jsonb) as x(t text, id text, h text, n jsonb) loop
    if (rec.t = 'baseball' and exists (select 1 from public.baseball_connections_puzzles c where c.puzzle_id = rec.id and c.groups_json = rec.n)) or (rec.t = 'nfl' and exists (select 1 from public.nfl_connections_puzzles c where c.puzzle_id = rec.id and c.groups_json = rec.n)) or (rec.t = 'nhl' and exists (select 1 from public.nhl_connections_puzzles c where c.puzzle_id = rec.id and c.groups_json = rec.n)) then
      already := already + 1;
    else
${branch('if', 'baseball')}
${branch('elsif', 'nfl')}
${branch('elsif', 'nhl')}
      else
        raise exception 'Round 1567: unknown table %', rec.t;
      end if;
      get diagnostics cnt = row_count;
      if cnt > 0 then rewritten := rewritten + 1; else drifted := drifted || (rec.t || ':' || rec.id); end if;
    end if;
  end loop;
  if rewritten + already <> ${n} then
    raise exception 'Round 1567: % rewritten, % already current, drifted %: nothing applied', rewritten, already, drifted;
  end if;
  raise notice 'Round 1567: % rewritten, % already current, 0 drifted', rewritten, already;
end
$$;
`;
}

/** The payload from exports: { rows, already, drifted, missing }. */
export async function payloadFrom(exports, acceptDrifted = []) {
  const p = await plan();
  const out = { rows: [], already: [], drifted: [], missing: [] };
  for (const s of Object.keys(SPORTS)) {
    const live = new Map((exports[s] ?? []).map(r => [r.puzzle_id, r]));
    for (const r of p[s]) {
      const row = live.get(r.id);
      if (!row) { out.missing.push(`${s}:${r.id}`); continue; }
      const g = typeof row.groups_json === 'string' ? JSON.parse(row.groups_json) : row.groups_json;
      if (same(g, r.next)) { out.already.push(`${s}:${r.id}`); continue; }
      if (!r.olds.some(o => same(o, g))) {
        out.drifted.push(`${s}:${r.id}`);
        if (!acceptDrifted.includes(r.id)) continue;
      }
      if (!/^[0-9a-f]{32}$/.test(String(row.h ?? ''))) throw new Error(`${s} ${r.id}: the export has no md5 column h; export with md5(groups_json::text) as h`);
      out.rows.push({ t: s, id: r.id, h: row.h, n: r.next });
    }
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [src, outFile] = process.argv.slice(2);
  if (!src || !outFile) { console.error('usage: node scripts/qa/usConnections1567Checksummed.mjs baseball=<b.json>,nfl=<f.json>,nhl=<h.json> <out.sql>'); process.exit(2); }
  const exports = {};
  for (const part of src.split(',')) { const [s, f] = part.split('='); exports[s] = JSON.parse(fs.readFileSync(f, 'utf8')); }
  const accept = (process.env.ACCEPT_DRIFTED ?? '').split(',').filter(Boolean);
  const r = await payloadFrom(exports, accept);
  console.log(`rows to rewrite ${r.rows.length}; already current ${r.already.length}; drifted ${r.drifted.length}${r.drifted.length ? ` (${r.drifted.join(', ')})` : ''}; missing ${r.missing.length}${r.missing.length ? ` (${r.missing.join(', ')})` : ''}`);
  const stop = r.missing.length || r.drifted.some(x => !accept.includes(x.split(':')[1]));
  if (stop) { console.error('STOP: a row is missing or drifted. Look at it in the export; list a drifted row in ACCEPT_DRIFTED only if overwriting it with the new board is right.'); process.exit(1); }
  fs.writeFileSync(outFile, checksummedSql(r.rows));
  console.log(`wrote ${outFile}`);
}
