/**
 * Round 827: the career rows audit, from its record to its migration.
 *
 * WHAT IT DOES. scripts/data/careerRowsVerified2026-10.json is the record: every
 * corrected value with the sources that give it, every added season, the path
 * order the touched players end up with, the rows kept as they are and why,
 * and the duplicate Alisson. This reads the live career tables through the
 * public REST endpoint (the URL and publishable key read from
 * src/integrations/supabase/client.ts by the bake's own helper, never the
 * VITE env vars), applies the record in memory, and from the difference
 * writes:
 *
 *   1. supabase/migrations/20261002120000_career_rows_verified.sql, one fail
 *      closed transaction: every career row it touches is matched by id AND
 *      by every value it holds today, every insert first proves the row is
 *      absent, and an after state guard checks each touched player's whole
 *      path row for row before the counts close it. The Transfer Path entries
 *      the new links shorten are rewritten in the same transaction, each over
 *      the exact value it replaces (Round 784's shape), so the hints never
 *      disagree with the careers.
 *   2. src/data/careerPlayers.ts as it will be AFTER the migration, rendered
 *      with the bake's own renderer, so a re-bake after the apply changes only
 *      the date stamp.
 *
 * Nothing is applied. Without --write it prints the plan and writes nothing.
 * It refuses to run unless the tables are exactly in the state the record
 * starts from (every "from" value present, every added row absent).
 *
 * The pure parts are exported for scripts/simCareerRowsVerified.mjs.
 *
 * Run: node scripts/genCareerRowsVerified.mjs [--write]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECORD_FILE = 'scripts/data/careerRowsVerified2026-10.json';
export const MIGRATION_FILE = 'supabase/migrations/20261002120000_career_rows_verified.sql';
/* the applied active restore and the pending Round 531 refresh, see the active note in main */
export const APPLIED_ACTIVE_RESTORE = 'supabase/migrations/20260907190000_restore_verified_active_transfer_path_hints.sql';
export const PENDING_ACTIVE_REFRESH = 'supabase/migrations/20260911190000_refresh_verified_active_transfer_path_hints.sql';
const FIELDS = ['season', 'club', 'goals', 'assists', 'appearances', 'marketValue'];

export function loadRecord(root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, RECORD_FILE), 'utf8'));
}

const pathKey = s => `${s.season} ${s.club}`;

/**
 * The pool after the record: every change applied to the row it names, every
 * added row placed, and the touched players' rows put in the record's path
 * order. Throws when the pool is not the state the record starts from.
 * players: CareerPlayer[] (careers in table order). Returns a new array.
 */
export function applyRecord(players, record) {
  const out = players.map(p => ({ ...p, career: p.career.map(s => ({ ...s })) }));
  const byName = new Map(out.map(p => [p.name, p]));
  const groups = new Map();
  for (const c of record.changed) {
    const key = `${c.player}|${c.season}|${c.club}`;
    (groups.get(key) ?? groups.set(key, []).get(key)).push(c);
  }
  for (const changes of groups.values()) {
    const { player, season, club } = changes[0];
    const p = byName.get(player);
    if (!p) throw new Error(`${player} is not in the pool`);
    const seasonChange = changes.find(c => c.field === 'season');
    const clubChange = changes.find(c => c.field === 'club');
    const beforeSeason = seasonChange ? seasonChange.from : season;
    const beforeClub = clubChange ? clubChange.from : club;
    const rows = p.career.filter(s => s.season === beforeSeason && s.club === beforeClub);
    if (rows.length !== 1) throw new Error(`${player}: ${rows.length} rows at ${beforeSeason} ${beforeClub}, the record changes exactly one`);
    for (const c of changes) {
      if (!FIELDS.includes(c.field)) throw new Error(`${player} ${season} ${club}: unknown field ${c.field}`);
      if (rows[0][c.field] !== c.from) throw new Error(`${player} ${season} ${club}: ${c.field} reads ${rows[0][c.field]}, the record changes it from ${c.from}`);
    }
    for (const c of changes) rows[0][c.field] = c.to;
  }
  for (const a of record.added) {
    const p = byName.get(a.player);
    if (!p) throw new Error(`${a.player} is not in the pool`);
    if (p.career.some(s => s.season === a.season && s.club === a.club)) throw new Error(`${a.player} already has ${a.season} ${a.club}`);
    p.career.push({ season: a.season, club: a.club, goals: a.goals, assists: a.assists, appearances: a.appearances, marketValue: a.marketValue });
  }
  const touched = new Set([...record.changed.map(c => c.player), ...record.added.map(a => a.player)]);
  for (const name of touched) {
    const order = record.paths[name];
    const p = byName.get(name);
    if (!order) {
      if (record.added.some(a => a.player === name)) throw new Error(`${name} gains a row, so the record must give the path order`);
      continue;
    }
    const at = new Map(p.career.map(s => [pathKey(s), s]));
    if (order.length !== p.career.length || new Set(order).size !== order.length || order.some(k => !at.has(k))) {
      throw new Error(`${name}: the record's path (${order.length} rows) is not the ${p.career.length} rows the pool carries after the record`);
    }
    p.career = order.map(k => at.get(k));
  }
  return out;
}

/** 'before' when the pool carries every from value and no added row, 'after' when it carries every to value and every added row, else 'mixed'. */
export function recordState(players, record) {
  try {
    applyRecord(players, record);
    return 'before';
  } catch { /* not the starting state; is it the finished one? */ }
  return afterProblems(players, record).length ? 'mixed' : 'after';
}

/** Every way the pool falls short of the state the record ends in. Empty when it is there. */
export function afterProblems(players, record) {
  const out = [];
  const byName = new Map(players.map(p => [p.name, p]));
  for (const c of record.changed) {
    const p = byName.get(c.player);
    const row = p?.career.find(s => s.season === c.season && s.club === c.club);
    if (!row || row[c.field] !== c.to) out.push(`${c.player} ${c.season} ${c.club}: ${c.field} reads ${row ? row[c.field] : '(no row)'}, the record corrects it to ${c.to}`);
    if (c.field === 'season' && p?.career.some(s => s.season === c.from && s.club === c.club)) out.push(`${c.player} still carries ${c.from} ${c.club}`);
  }
  for (const a of record.added) {
    const row = byName.get(a.player)?.career.find(s => s.season === a.season && s.club === a.club);
    if (!row || FIELDS.some(f => row[f] !== a[f])) out.push(`${a.player} ${a.season} ${a.club} (${a.appearances} apps, ${a.goals} goals) is recorded as added and is not in the pool as recorded`);
  }
  for (const [name, order] of Object.entries(record.paths)) {
    const got = byName.get(name)?.career.map(pathKey) ?? [];
    if (got.join('|') !== order.join('|')) out.push(`${name}: the path runs ${got.join(', ')}; the record says ${order.join(', ')}`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* SQL                                                                */
/* ------------------------------------------------------------------ */
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const tx = s => (s === null || s === undefined ? 'null::text' : `${q(s)}::text`);
const int = n => (n === null || n === undefined ? 'null::integer' : `${n}::integer`);
const small = n => (n === null || n === undefined ? 'null::smallint' : `${n}::smallint`);
const uuid = s => (s === null || s === undefined ? 'null::uuid' : `${q(s)}::uuid`);

/**
 * The writes, one per career row that moves: { rowId, playerId, player, old, now }
 * where old and now are { season, club, goals, assists, appearances, marketValue, sortOrder }
 * (old is null for an insert). liveRows: the touched players' table rows with id and sort_order.
 */
export function careerWrites(liveRows, postPlayers, record, idByName) {
  const writes = [];
  const touched = [...new Set([...record.changed.map(c => c.player), ...record.added.map(a => a.player)])].sort();
  for (const name of touched) {
    const playerId = idByName.get(name);
    const rows = liveRows.filter(r => r.player_id === playerId).sort((x, y) => x.sort_order - y.sort_order);
    const post = postPlayers.find(p => p.name === name).career;
    const used = new Set();
    post.forEach((s, i) => {
      const changes = record.changed.filter(c => c.player === name && c.season === s.season && c.club === s.club);
      const seasonChange = changes.find(c => c.field === 'season');
      const beforeSeason = seasonChange ? seasonChange.from : s.season;
      const live = rows.find(r => r.season === beforeSeason && r.club === s.club && !used.has(r.id));
      const now = { season: s.season, club: s.club, goals: s.goals, assists: s.assists, appearances: s.appearances, marketValue: s.marketValue, sortOrder: i };
      if (!live) { writes.push({ rowId: null, playerId, player: name, old: null, now }); return; }
      used.add(live.id);
      const old = { season: live.season, club: live.club, goals: live.goals, assists: live.assists, appearances: live.appearances, marketValue: live.market_value, sortOrder: live.sort_order };
      if (JSON.stringify(old) !== JSON.stringify(now)) writes.push({ rowId: live.id, playerId, player: name, old, now });
    });
    if (used.size !== rows.length) throw new Error(`${name}: ${rows.length - used.size} table rows have no place in the record's path`);
  }
  return writes;
}

const WRITE_COLS = 'row_id, player_id, player_name, old_season, old_club, old_goals, old_assists, old_appearances, old_market_value, old_sort_order, season, club, goals, assists, appearances, market_value, sort_order';
const AFTER_COLS = 'player_id, player_name, sort_order, season, club, goals, assists, appearances, market_value';
const RULE_COLS = 'puzzle_id, player_a, player_b, rule, old_min_steps, old_hint, min_steps, hint';
const ACTIVE_COLS = 'puzzle_id, player_a, player_b, applied_min_steps, applied_hint, pending_min_steps, pending_hint, min_steps, hint';

/** the active rewrites, read back out of the migration text */
export function parseActiveRewrites(sql) {
  const text = String(sql).replaceAll('\r\n', '\n');
  const end = text.indexOf(`    ) as rows(${ACTIVE_COLS})`);
  if (end < 0) return [];
  const start = text.lastIndexOf('select * from (values', end);
  const s = "'((?:[^']|'')*)'";
  const rowRe = new RegExp(String.raw`^\s*\(${s}, ${s}, ${s}, (\d+), ${s}, (\d+), ${s}, (\d+), ${s}\),?$`, 'gm');
  const u = v => v.replace(/''/g, "'");
  return [...text.slice(start, end).matchAll(rowRe)].map(m => ({
    id: u(m[1]), a: u(m[2]), b: u(m[3]),
    appliedMinSteps: Number(m[4]), appliedHint: u(m[5]), pendingMinSteps: Number(m[6]), pendingHint: u(m[7]),
    minSteps: Number(m[8]), hint: u(m[9]),
  }));
}

function writeRow(w) {
  const o = w.old ?? {};
  return `    (${uuid(w.rowId)}, ${uuid(w.playerId)}, ${tx(w.player)}, ${tx(o.season)}, ${tx(o.club)}, ${int(o.goals)}, ${int(o.assists)}, ${int(o.appearances)}, ${int(o.marketValue)}, ${small(o.sortOrder)}, ${tx(w.now.season)}, ${tx(w.now.club)}, ${int(w.now.goals)}, ${int(w.now.assists)}, ${int(w.now.appearances)}, ${int(w.now.marketValue)}, ${small(w.now.sortOrder)})`;
}

/** parse the writes back out of the migration text (the fence reads the file, not this script's memory) */
export function parseCareerWrites(sql) {
  const text = String(sql).replaceAll('\r\n', '\n');
  const end = text.indexOf(`    ) as rows(${WRITE_COLS})`);
  if (end < 0) return null;
  const start = text.lastIndexOf('select * from (values', end);
  const body = text.slice(start, end);
  const lit = String.raw`(?:null::(?:uuid|text|integer|smallint)|'(?:[^']|'')*'::(?:uuid|text)|-?\d+::(?:integer|smallint))`;
  const rowRe = new RegExp(String.raw`^\s*\((${lit}(?:, ${lit}){16})\),?$`, 'gm');
  const cell = new RegExp(lit, 'g');
  const value = v => {
    if (v.startsWith('null::')) return null;
    if (v.startsWith("'")) return v.slice(1, v.lastIndexOf("'")).replace(/''/g, "'");
    return Number(v.slice(0, v.indexOf('::')));
  };
  return [...body.matchAll(rowRe)].map(m => {
    const v = m[1].match(cell).map(value);
    const old = v[3] === null && v[0] === null ? null : { season: v[3], club: v[4], goals: v[5], assists: v[6], appearances: v[7], marketValue: v[8], sortOrder: v[9] };
    return { rowId: v[0], playerId: v[1], player: v[2], old, now: { season: v[10], club: v[11], goals: v[12], assists: v[13], appearances: v[14], marketValue: v[15], sortOrder: v[16] } };
  });
}

/** the after state the migration asserts, player by player */
export function parseAfterRows(sql) {
  const text = String(sql).replaceAll('\r\n', '\n');
  const end = text.indexOf(`    ) as rows(${AFTER_COLS})`);
  if (end < 0) return null;
  const start = text.lastIndexOf('select * from (values', end);
  const lit = String.raw`(?:null::(?:uuid|text|integer|smallint)|'(?:[^']|'')*'::(?:uuid|text)|-?\d+::(?:integer|smallint))`;
  const rowRe = new RegExp(String.raw`^\s*\((${lit}(?:, ${lit}){8})\),?$`, 'gm');
  const cell = new RegExp(lit, 'g');
  const value = v => (v.startsWith('null::') ? null : v.startsWith("'") ? v.slice(1, v.lastIndexOf("'")).replace(/''/g, "'") : Number(v.slice(0, v.indexOf('::'))));
  return [...text.slice(start, end).matchAll(rowRe)].map(m => {
    const v = m[1].match(cell).map(value);
    return { playerId: v[0], player: v[1], sortOrder: v[2], season: v[3], club: v[4], goals: v[5], assists: v[6], appearances: v[7], marketValue: v[8] };
  });
}

/** the guarded counts the migration closes on: { seasonsBefore, seasonsAfter, players } */
export function parseCountGuards(sql) {
  const text = String(sql).replaceAll('\r\n', '\n').replace(/^\s*--.*$/gm, '');
  const num = re => { const m = re.exec(text); return m ? Number(m[1]) : null; };
  return {
    seasonsBefore: num(/if total <> (\d+) then raise exception 'expected \d+ career_seasons rows before/),
    seasonsAfter: num(/if n <> (\d+) then raise exception 'expected \d+ career_seasons rows after/),
    players: num(/if n <> (\d+) then raise exception 'expected \d+ career_players rows/),
  };
}

export function renderMigration({ record, writes, afterRows, playersCount, seasonsBefore, seasonsAfter, perPlayer, rewrites, activeRewrites }) {
  const inserts = writes.filter(w => !w.rowId).length;
  const lines = [];
  lines.push(`-- Round 827: the career rows Round 784 saw and left, corrected from two sources.`);
  lines.push(`--`);
  lines.push(`-- GENERATED by scripts/genCareerRowsVerified.mjs from ${RECORD_FILE}, which carries`);
  lines.push(`-- every value below with its sources. Do not edit by hand: change the record and`);
  lines.push(`-- re-run the generator. scripts/simCareerRowsVerified.mjs fails when a value written`);
  lines.push(`-- here does not trace to a record row with two sources, or a record row is missing.`);
  lines.push(`--`);
  lines.push(`--   changed: ${record.changed.length} values on ${new Set(record.changed.map(c => `${c.player}|${c.season}|${c.club}`)).size} rows (${[...new Set(record.changed.map(c => c.player))].join(', ')})`);
  lines.push(`--   added: ${record.added.length} seasons (${record.added.map(a => `${a.player} ${a.season} ${a.club}`).join('; ')})`);
  lines.push(`--   kept as they are, two sources apart and no third readable: ${record.keptAsIs.length} rows`);
  lines.push(`--   the duplicate Alisson stays (both ids are referenced); see the record`);
  lines.push(`--`);
  lines.push(`-- Fail closed: every row is written only over the exact row it replaces (matched by`);
  lines.push(`-- id and by every value it holds today), every insert first proves its row is absent,`);
  lines.push(`-- and the after state is checked row for row before the counts close it. The whole`);
  lines.push(`-- block rolls back on the first mismatch.`);
  lines.push(`--`);
  lines.push(`-- Transfer Path plays on the same tables. The new seasons are new links (Kane and`);
  lines.push(`-- Vardy at Leicester City in 2012-2013, Haaland and Szoboszlai at RB Salzburg in`);
  lines.push(`-- 2019-2020, De Bruyne's Chelsea season moving to 2013-2014), so the same transaction`);
  lines.push(`-- rewrites the ${rewrites.length} entries they shorten, each over the value it replaces. Every`);
  lines.push(`-- new value is deriveHint on the pool after this migration; simTransferPathHints`);
  lines.push(`-- section 7 re-derives them all.`);
  lines.push(`--`);
  lines.push(`-- After applying: node scripts/bakeCareerPlayers.mjs must leave src/data/careerPlayers.ts`);
  lines.push(`-- unchanged except its date stamp.`);
  lines.push('');
  lines.push('do $migration$');
  lines.push('declare');
  lines.push('  n integer;');
  lines.push('  total integer;');
  lines.push('  desired record;');
  lines.push('  updated_this_row integer;');
  lines.push('  written integer := 0;');
  lines.push('  checked integer := 0;');
  lines.push('  updated_rows integer := 0;');
  lines.push('begin');
  lines.push('  select count(*) into total from public.career_seasons;');
  lines.push(`  if total <> ${seasonsBefore} then raise exception 'expected ${seasonsBefore} career_seasons rows before this migration, found %', total; end if;`);
  lines.push('  select count(*) into n from public.career_players;');
  lines.push(`  if n <> ${playersCount} then raise exception 'expected ${playersCount} career_players rows, found %', n; end if;`);
  lines.push('');
  lines.push('  -- the players this touches, each at its id, each with the rows it has today');
  lines.push('  for desired in');
  lines.push('    select * from (values');
  lines.push(perPlayer.map(p => `      (${uuid(p.playerId)}, ${tx(p.player)}, ${int(p.before)}, ${int(p.after)})`).join(',\n'));
  lines.push('    ) as rows(player_id, player_name, rows_before, rows_after)');
  lines.push('  loop');
  lines.push('    select count(*) into n from public.career_players where id = desired.player_id and player_name = desired.player_name;');
  lines.push(`    if n <> 1 then raise exception '%: expected one career_players row at %, found %', desired.player_name, desired.player_id, n; end if;`);
  lines.push('    select count(*) into n from public.career_seasons where player_id = desired.player_id;');
  lines.push(`    if n <> desired.rows_before then raise exception '%: expected % season rows, found %', desired.player_name, desired.rows_before, n; end if;`);
  lines.push('  end loop;');
  lines.push('');
  lines.push('  -- the career rows: an update names the row by id and by every value it holds today;');
  lines.push('  -- an insert (row_id null) first proves the season is not there');
  lines.push('  for desired in');
  lines.push('    select * from (values');
  lines.push(writes.map(writeRow).join(',\n'));
  lines.push(`    ) as rows(${WRITE_COLS})`);
  lines.push('  loop');
  lines.push('    if desired.row_id is null then');
  lines.push('      select count(*) into n from public.career_seasons where player_id = desired.player_id and season = desired.season and club = desired.club;');
  lines.push(`      if n <> 0 then raise exception '% % %: the row to add is already there', desired.player_name, desired.season, desired.club; end if;`);
  lines.push('      insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order)');
  lines.push('      values (desired.player_id, desired.season, desired.club, desired.goals, desired.assists, desired.appearances, desired.market_value, desired.sort_order);');
  lines.push('    else');
  lines.push('      update public.career_seasons s');
  lines.push('      set season = desired.season, club = desired.club, goals = desired.goals, assists = desired.assists,');
  lines.push('          appearances = desired.appearances, market_value = desired.market_value, sort_order = desired.sort_order');
  lines.push('      where s.id = desired.row_id and s.player_id = desired.player_id');
  lines.push('        and s.season = desired.old_season and s.club = desired.old_club and s.goals = desired.old_goals');
  lines.push('        and s.assists is not distinct from desired.old_assists and s.appearances = desired.old_appearances');
  lines.push('        and s.market_value = desired.old_market_value and s.sort_order = desired.old_sort_order;');
  lines.push('      get diagnostics updated_this_row = row_count;');
  lines.push(`      if updated_this_row <> 1 then raise exception '% % % (row %): expected one row carrying the values read on ${record.checked}, updated %', desired.player_name, desired.old_season, desired.old_club, desired.row_id, updated_this_row; end if;`);
  lines.push('    end if;');
  lines.push('    written := written + 1;');
  lines.push('  end loop;');
  lines.push(`  if written <> ${writes.length} then raise exception 'expected ${writes.length} career row writes (${inserts} inserts), made %', written; end if;`);
  lines.push('');
  lines.push('  -- the after state: every touched player\'s path, row for row');
  lines.push('  for desired in');
  lines.push('    select * from (values');
  lines.push(afterRows.map(r => `      (${uuid(r.playerId)}, ${tx(r.player)}, ${small(r.sortOrder)}, ${tx(r.season)}, ${tx(r.club)}, ${int(r.goals)}, ${int(r.assists)}, ${int(r.appearances)}, ${int(r.marketValue)})`).join(',\n'));
  lines.push(`    ) as rows(${AFTER_COLS})`);
  lines.push('  loop');
  lines.push('    select count(*) into n from public.career_seasons s');
  lines.push('    where s.player_id = desired.player_id and s.sort_order = desired.sort_order and s.season = desired.season and s.club = desired.club');
  lines.push('      and s.goals = desired.goals and s.assists is not distinct from desired.assists and s.appearances = desired.appearances and s.market_value = desired.market_value;');
  lines.push(`    if n <> 1 then raise exception '% after: expected one row % % at sort_order %, found %', desired.player_name, desired.season, desired.club, desired.sort_order, n; end if;`);
  lines.push('    checked := checked + 1;');
  lines.push('  end loop;');
  lines.push(`  if checked <> ${afterRows.length} then raise exception 'expected to check ${afterRows.length} rows after, checked %', checked; end if;`);
  for (const p of perPlayer) {
    lines.push(`  select count(*) into n from public.career_seasons where player_id = ${q(p.playerId)};`);
    lines.push(`  if n <> ${p.after} then raise exception '${p.player.replace(/'/g, "''")}: expected ${p.after} season rows after, found %', n; end if;`);
  }
  lines.push('  select count(*) into n from public.career_seasons;');
  lines.push(`  if n <> ${seasonsAfter} then raise exception 'expected ${seasonsAfter} career_seasons rows after this migration, found %', n; end if;`);
  lines.push('  select count(*) into n from public.career_players;');
  lines.push(`  if n <> ${playersCount} then raise exception 'expected ${playersCount} career_players rows after this migration, found %', n; end if;`);
  lines.push('');
  lines.push('  -- Transfer Path: the rule entries the new links shorten, each written only over');
  lines.push('  -- the exact value it replaces.');
  lines.push('  select count(*) into n from public.transfer_path_puzzles;');
  lines.push(`  if n <> 885 then raise exception 'expected 885 Transfer Path puzzles, found %', n; end if;`);
  if (rewrites.length) {
    lines.push('  for desired in');
    lines.push('    select * from (values');
    lines.push(rewrites.map(r => `      (${q(r.id)}, ${q(r.a)}, ${q(r.b)}, ${q(r.rule)}, ${r.oldMinSteps}, ${q(r.oldHint)}, ${r.minSteps}, ${q(r.hint)})`).join(',\n'));
    lines.push(`    ) as rows(${RULE_COLS})`);
    lines.push('  loop');
    lines.push(`    if desired.rule = 'classic' then`);
    lines.push('      update public.transfer_path_puzzles p');
    lines.push('      set min_steps = desired.min_steps,');
    lines.push('          hint = desired.hint');
    lines.push('      where p.puzzle_id = desired.puzzle_id');
    lines.push('        and p.player_a = desired.player_a');
    lines.push('        and p.player_b = desired.player_b');
    lines.push('        and p.min_steps = desired.old_min_steps');
    lines.push('        and p.hint = desired.old_hint;');
    lines.push(`    elsif desired.rule = 'europe' then`);
    lines.push('      update public.transfer_path_puzzles p');
    lines.push('      set europe_min_steps = desired.min_steps::smallint,');
    lines.push('          europe_hint = desired.hint');
    lines.push('      where p.puzzle_id = desired.puzzle_id');
    lines.push('        and p.player_a = desired.player_a');
    lines.push('        and p.player_b = desired.player_b');
    lines.push('        and p.europe_min_steps = desired.old_min_steps');
    lines.push('        and p.europe_hint = desired.old_hint;');
    lines.push('    else');
    lines.push(`      raise exception 'unknown Transfer Path rule %', desired.rule;`);
    lines.push('    end if;');
    lines.push('    get diagnostics updated_this_row = row_count;');
    lines.push('    if updated_this_row <> 1 then');
    lines.push(`      raise exception 'Transfer Path % under %: expected one row carrying %, updated %', desired.puzzle_id, desired.rule, desired.old_min_steps, updated_this_row;`);
    lines.push('    end if;');
    lines.push('    updated_rows := updated_rows + 1;');
    lines.push('  end loop;');
  }
  lines.push(`  if updated_rows <> ${rewrites.length} then raise exception 'expected to rewrite ${rewrites.length} Transfer Path entries, rewrote %', updated_rows; end if;`);
  if (activeRewrites.length) {
    lines.push('');
    lines.push('  -- Active players only: written over the applied 2026-09-07 value or over the value');
    lines.push('  -- the pending Round 531 refresh writes, whichever the table carries, and nothing else.');
    lines.push('  updated_rows := 0;');
    lines.push('  for desired in');
    lines.push('    select * from (values');
    lines.push(activeRewrites.map(r => `      (${q(r.id)}, ${q(r.a)}, ${q(r.b)}, ${r.appliedMinSteps}, ${q(r.appliedHint)}, ${r.pendingMinSteps}, ${q(r.pendingHint)}, ${r.minSteps}, ${q(r.hint)})`).join(',\n'));
    lines.push(`    ) as rows(${ACTIVE_COLS})`);
    lines.push('  loop');
    lines.push('    update public.transfer_path_puzzles p');
    lines.push('    set active_min_steps = desired.min_steps::smallint,');
    lines.push('        active_hint = desired.hint');
    lines.push('    where p.puzzle_id = desired.puzzle_id');
    lines.push('      and p.player_a = desired.player_a');
    lines.push('      and p.player_b = desired.player_b');
    lines.push('      and ((p.active_min_steps = desired.applied_min_steps and p.active_hint = desired.applied_hint)');
    lines.push('        or (p.active_min_steps = desired.pending_min_steps and p.active_hint = desired.pending_hint));');
    lines.push('    get diagnostics updated_this_row = row_count;');
    lines.push('    if updated_this_row <> 1 then');
    lines.push(`      raise exception 'Transfer Path % under active: expected one row carrying the applied or the pending refresh value, updated %', desired.puzzle_id, updated_this_row;`);
    lines.push('    end if;');
    lines.push('    updated_rows := updated_rows + 1;');
    lines.push('  end loop;');
    lines.push(`  if updated_rows <> ${activeRewrites.length} then raise exception 'expected to rewrite ${activeRewrites.length} active entries, rewrote %', updated_rows; end if;`);
  }
  lines.push('end');
  lines.push('$migration$;');
  lines.push('');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */
const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const WRITE = process.argv.includes('--write');
  const { build } = await import('esbuild');
  const { OUT_FILE, fetchLiveCareerPlayers, poolProblems, renderCareerPlayersModule, supabaseFromClientTs } = await import('./bakeCareerPlayers.mjs');
  const { buildGraph, deriveHint, parseActiveRefreshMigration, parseActiveRestoreMigration, ruleProblems } = await import('./lib/transferPathHints.mjs');
  const record = loadRecord();
  const supabase = supabaseFromClientTs(ROOT);
  const live = await fetchLiveCareerPlayers(supabase);
  const state = recordState(live.players, record);
  if (state !== 'before') { console.error(`the tables are ${state} against the record, not in the state it starts from; nothing written`); process.exit(1); }
  const idByName = new Map(live.playerRows.map(p => [p.player_name, p.id]));
  const touched = [...new Set([...record.changed.map(c => c.player), ...record.added.map(a => a.player)])].sort();
  for (const name of touched) if (!idByName.has(name)) { console.error(`${name} is not in career_players`); process.exit(1); }
  for (const c of [...record.changed, ...record.added]) if (idByName.get(c.player) !== c.playerId) { console.error(`${c.player}: the record says ${c.playerId}, the table ${idByName.get(c.player)}`); process.exit(1); }
  const ids = touched.map(n => idByName.get(n));
  const own = await supabase.from('career_seasons').select('id, player_id, season, club, goals, assists, appearances, market_value, sort_order').in('player_id', ids);
  if (own.error) { console.error(own.error.message); process.exit(1); }
  const post = applyRecord(live.players, record);
  const problems = poolProblems(post);
  if (problems.length) { console.error('the pool after the record would not bake:\n  ' + problems.join('\n  ')); process.exit(1); }
  const writes = careerWrites(own.data, post, record, idByName);
  const perPlayer = touched.map(name => ({
    player: name,
    playerId: idByName.get(name),
    before: own.data.filter(r => r.player_id === idByName.get(name)).length,
    after: post.find(p => p.name === name).career.length,
  }));
  const afterRows = touched.flatMap(name => post.find(p => p.name === name).career.map((s, i) => ({ playerId: idByName.get(name), player: name, sortOrder: i, ...s })));
  const seasonsBefore = live.seasonRows.length;
  const seasonsAfter = seasonsBefore + record.added.length;

  /* Transfer Path: every applied classic and Europe entry the pool after the
     record beats, with the search's own value. Read live, so the value each
     rewrite replaces is the one on the table today. */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-career-rows-'));
  const entry = path.join(tmp, 'entry.mjs');
  const bundle = path.join(tmp, 'bundle.mjs');
  fs.writeFileSync(entry, `export { playersUnderRule } from '${ROOT.replaceAll('\\', '/')}/src/lib/transferPathModes.ts';\n`);
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const { playersUnderRule } = await import(pathToFileURL(bundle).href);
  const puzzles = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('transfer_path_puzzles').select('puzzle_id, player_a, player_b, min_steps, hint, europe_min_steps, europe_hint, active_min_steps, active_hint').order('puzzle_id', { ascending: true }).range(from, from + 999);
    if (error) { console.error(error.message); process.exit(1); }
    puzzles.push(...data);
    if (data.length < 1000) break;
  }
  const graphs = { classic: buildGraph(post), europe: buildGraph(playersUnderRule(post, 'europe')), active: buildGraph(playersUnderRule(post, 'active')) };
  /* Active players only. The table carries the applied 2026-09-07 restore and
     the Round 531 refresh is still pending, so some applied entries are already
     beaten on today's pool: those are the refresh's business, not this
     migration's. An entry that holds today and that the record beats is
     rewritten here, accepting either the applied value or the value the
     pending refresh writes, so the two migrations can land in either order
     (the refresh fails closed on that entry if it comes second, and has to be
     regenerated, because its own value is beaten too). */
  const activeToday = buildGraph(playersUnderRule(live.players, 'active'));
  const appliedActive = parseActiveRestoreMigration(fs.readFileSync(path.join(ROOT, APPLIED_ACTIVE_RESTORE), 'utf8'));
  const pendingActive = parseActiveRefreshMigration(fs.readFileSync(path.join(ROOT, PENDING_ACTIVE_REFRESH), 'utf8'));
  const rewrites = [];
  const activeRewrites = [];
  let activeAlready = 0;
  for (const p of puzzles) {
    const activeNow = p.active_min_steps === null ? null : { minSteps: p.active_min_steps, hint: p.active_hint };
    if (ruleProblems(activeToday, p.player_a, p.player_b, activeNow).length) activeAlready += 1;
    else if (ruleProblems(graphs.active, p.player_a, p.player_b, activeNow).length) {
      const d = deriveHint(graphs.active, p.player_a, p.player_b);
      const applied = appliedActive.get(p.puzzle_id);
      const pending = pendingActive.get(p.puzzle_id) ?? applied;
      if (!activeNow || !d || !applied || applied.minSteps !== activeNow.minSteps || applied.hint !== activeNow.hint) {
        console.error(`${p.puzzle_id} under active: the table does not carry the applied restore's value, or the record turns a path into none; this migration cannot write that`);
        process.exit(1);
      }
      activeRewrites.push({ id: p.puzzle_id, a: p.player_a, b: p.player_b, appliedMinSteps: applied.minSteps, appliedHint: applied.hint, pendingMinSteps: pending.minSteps, pendingHint: pending.hint, minSteps: d.minSteps, hint: d.hint });
    }
    for (const rule of ['classic', 'europe']) {
      const stored = rule === 'classic' ? { minSteps: p.min_steps, hint: p.hint } : (p.europe_min_steps === null ? null : { minSteps: p.europe_min_steps, hint: p.europe_hint });
      if (!ruleProblems(graphs[rule], p.player_a, p.player_b, stored).length) continue;
      const d = deriveHint(graphs[rule], p.player_a, p.player_b);
      if (!stored || !d) { console.error(`${p.puzzle_id} under ${rule}: the pool after the record turns a path into none or none into a path; this migration cannot write that`); process.exit(1); }
      rewrites.push({ id: p.puzzle_id, a: p.player_a, b: p.player_b, rule, oldMinSteps: stored.minSteps, oldHint: stored.hint, minSteps: d.minSteps, hint: d.hint });
    }
  }
  console.log(`active: ${activeAlready} live entries are already beaten on today's pool (the pending Round 531 refresh's business); the record beats ${activeRewrites.length} more`);
  const byId = (x, y) => x.id.localeCompare(y.id, 'en', { numeric: true });
  rewrites.sort((x, y) => byId(x, y) || x.rule.localeCompare(y.rule));
  activeRewrites.sort(byId);

  const sql = renderMigration({ record, writes, afterRows, playersCount: live.players.length, seasonsBefore, seasonsAfter, perPlayer, rewrites, activeRewrites });
  console.log(`state: before. ${writes.length} career row writes (${writes.filter(w => !w.rowId).length} inserts) on ${touched.length} players; seasons ${seasonsBefore} -> ${seasonsAfter}`);
  console.log(`Transfer Path: ${rewrites.length} entries rewritten (${rewrites.filter(r => r.rule === 'classic').length} classic, ${rewrites.filter(r => r.rule === 'europe').length} Europe), ${activeRewrites.length} active`);
  for (const r of rewrites) console.log(`  ${r.id} ${r.rule} ${r.a} to ${r.b}: ${r.oldMinSteps} -> ${r.minSteps}`);
  for (const r of activeRewrites) console.log(`  ${r.id} active ${r.a} to ${r.b}: ${r.appliedMinSteps} (pending refresh ${r.pendingMinSteps}) -> ${r.minSteps}`);
  if (WRITE) {
    fs.writeFileSync(path.join(ROOT, MIGRATION_FILE), sql);
    const stamp = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(path.join(ROOT, OUT_FILE), renderCareerPlayersModule(post, stamp));
    console.log(`wrote ${MIGRATION_FILE} and ${OUT_FILE} (the pool after the migration, stamped ${stamp})`);
  } else console.log('dry run, nothing written (pass --write)');
}
