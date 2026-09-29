/**
 * simEconomyMigrations: the points economy's SQL is proved by running it, in
 * PGlite, on a snapshot of production. Never on production. Round 673.
 *
 * WHY IT EXISTS. Round 673's first build checked economy step L1 by running it
 * on production inside BEGIN ... ROLLBACK, three times, and its review ran it
 * once more. Every run held ACCESS EXCLUSIVE on game_completions and the four
 * account tables until the rollback, so live saves and board inserts queued
 * behind a rehearsal. A rollback undoes the rows, not the locks. So the
 * rehearsal moved here: scripts/data/economySchema.sql is the production
 * objects L1 touches, read with SELECTs only, and this loads it into PGlite
 * (Postgres compiled to WebAssembly, in process, no server) and runs the
 * migrations against it as many times as it likes.
 *
 * WHAT IT HOLDS (docs/design/POINTS-ECONOMY-V2.md section 14 on the
 * points-economy branch, the L1 cases):
 *   0. THE SNAPSHOT IS PRODUCTION. md5(pg_get_functiondef) of the save, of the
 *      four older SECURITY DEFINER functions and of auth.uid() after loading
 *      equal what production gave on 2026-09-29; 151 cap rows, 13 policies,
 *      the read policies' md5. Nothing else here means anything unless this
 *      holds.
 *   1. L1 REFUSES BEFORE ANY WRITE when production is not what it read: the
 *      save drifted, an overload, a Round 644 object, a game added to the
 *      caps, a write policy changed, the file sent with CRLF line endings.
 *      Each attempt must raise with its own message and leave every table
 *      and the whole catalog as it was.
 *   2. L1 APPLIES over the snapshot, its own proofs pass, the save's body is
 *      the md5 the file pins, and from its first insert to its end it is the
 *      Round 569 migration's body byte for byte, read from that file here,
 *      not from the database.
 *   3. THE ROUND 569 ARITHMETIC, BYTE FOR BYTE. The same saves (three
 *      players, repeat plays, bests that improve and that do not, null score
 *      and count, scores exactly at a hard maximum, streaks across a day and
 *      across a gap) run on the snapshot before L1 (the INVOKER save, as the
 *      player) and after it (the DEFINER save). The four account tables and
 *      every return value must be identical, with ids dropped and each
 *      timestamp replaced by the save that stamped it.
 *   4. EVERY REFUSAL. After L1 the save refuses, with SQLSTATE 22023 and a
 *      message naming the value, a slug of 65 and of 5000 characters, a game
 *      off the allowlist, a negative score, a score one above the hard
 *      maximum, two billion, a correct count of -1 and of 1001; keeps its
 *      two old refusals (no user, no slug); and anon cannot call it at all.
 *      Every refusal writes nothing. The boundaries (score at the hard
 *      maximum, a correct count of 1000, null score, null count) are
 *      accepted.
 *   5. DIRECT WRITES ARE SHUT, executed as anon and as authenticated: every
 *      insert, update, delete and truncate on the six tables and through the
 *      view over them is refused 42501, while the client's own board insert
 *      lands and the length bounds refuse a 41 character name and a 65
 *      character game. The baseline first: before L1 the same PATCH of a
 *      player's own total_points is ACCEPTED, so the refusal is L1's doing.
 *   6. A SECOND APPLY REFUSES with "already applied", changing nothing.
 *   7. THE UNDO RESTORES THE CATALOG object for object (only the ledger
 *      table remains, with L1 marked undone), the save's definition md5s to
 *      5ae76ef7 again, a second undo refuses, and L1 reapplies to exactly the
 *      catalog of its first apply.
 *   8. THE HARD MAXIMUM. L1's table covers exactly the snapshot's caps, every
 *      value is the arithmetic its stated basis claims, the rows L1 writes
 *      are the rows the file carries, and no migration after L1 adds a cap
 *      row without a hard maximum for it (that game's signed in saves would
 *      all be refused).
 *   9. simPlayDoor's FIXTURE is the catalog L1 produces here: the committed
 *      scripts/data/playDoorCatalog.json must equal scripts/data/
 *      playDoorCatalog.sql run on the snapshot after L1. When the fixture
 *      says production (refreshed after the apply), this is the check that
 *      the rehearsal was the truth.
 *
 * CONTROLS, ECON_MIG_CONTROL=<name>. Each plants its fault in memory (never in
 * a file), refuses to run if the plant changes nothing, runs only its own
 * section, and must turn it red:
 *   snapshot    a byte of the save's body changes in the loaded snapshot    0
 *   noprecheck  L1's md5 precondition removed, so a drifted save applies    1
 *   tail        a byte of the Round 569 file's arithmetic changes           2
 *   arith       after L1 the save adds one point more than Round 569        3
 *   norefuse    after L1 the save's score check is gone                     4
 *   nosetrole   the probes run as the superuser, not as the client roles    5
 *   regrant     after L1 authenticated gets UPDATE on user_scores back      5
 *   rerun       L1's "already applied" guard only warns                     6
 *   undoleak    after the undo a grant L1 took away is still missing       7
 *   nohardmax   a migration after L1 adds a cap row with no hard maximum     8
 *   fixture     one value of the committed fixture changes                  9
 *
 * Run: node scripts/simEconomyMigrations.mjs
 *      node scripts/simEconomyMigrations.mjs --write-fixture   recapture
 *        scripts/data/playDoorCatalog.json from the rehearsal (source
 *        "rehearsal"); commit it with the migration or query that moved it
 *      node scripts/simEconomyMigrations.mjs --held-query   print the read
 *        only SELECT of L1's APPLY step 1 (every game whose stored scores
 *        exceed its hard maximum; expect no row)
 * Offline: no network, no temp files, nothing touches production.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');
const L1_NAME = '20260928_econ_l1_lock_the_doors.sql';
const SCHEMA_FILE = path.join(ROOT, 'scripts', 'data', 'economySchema.sql');
const CATALOG_SQL_FILE = path.join(ROOT, 'scripts', 'data', 'playDoorCatalog.sql');
const FIXTURE_FILE = path.join(ROOT, 'scripts', 'data', 'playDoorCatalog.json');
const SAVE_569_FILE = path.join(MIGRATIONS, '20260914120000_record_auth_completion.sql');

let SCHEMA = readLF(SCHEMA_FILE);
let L1 = readLF(path.join(MIGRATIONS, L1_NAME));
const UNDO = readLF(path.join(MIGRATIONS, 'ROLLBACK_' + L1_NAME));
let SAVE_569 = readLF(SAVE_569_FILE);
const CATALOG_SQL = readLF(CATALOG_SQL_FILE);

/* What production answered on 2026-09-29, read only. */
const PROD = {
  saveDef: '5ae76ef7cbf874d58d65ee9050e2023c',
  saveSrc: 'd4044c9c19fc6d9e68ca70236b36c853',
  authUid: 'ea3b41bf29e2ad573067939329aa088e',
  legacy: {
    'admin_exists(text)': '6098953677c963a40e218d99776c8023',
    'app_secret(text)': '9a79b3787c93fcb3f9ed306db3511ece',
    'handle_new_user()': '966c4daebe578e3a71d762e7f804e096',
    'has_role(uuid,app_role)': '964712856503e0a31d73451d32629426',
  },
  capsRows: 151,
  policies: 13,
  /* the md5 L1 records of the six tables' read policies; this value was
     first read inside Round 673's production dry run on 2026-09-28 */
  readPoliciesMd5: 'b5d85512d8f4a17cde4620051971dfd5',
};
const SIX = ['daily_completions', 'game_completions', 'game_score_caps', 'user_best_scores', 'user_game_scores', 'user_scores'];
const ACCOUNT = ['user_game_scores', 'daily_completions', 'user_scores', 'user_best_scores'];
const TAIL_AT = '  insert into public.user_game_scores (';

// ---------------------------------------------------------------------------
if (process.argv.includes('--held-query')) {
  const seed = hardMaxSeed(L1);
  const values = Object.entries(seed).map(([g, [hm]]) => `('${g}', ${hm})`).join(',\n    ');
  process.stdout.write(`-- Round 673, L1 APPLY step 1, READ ONLY: every game whose stored scores exceed the hard
-- maximum L1 carries, and every cap row L1 has no hard maximum for. Expect no row.
with hard_max(game, hard_max) as (values
    ${values}),
 u as (select game_type g, max(score) m from public.user_game_scores group by 1),
 b as (select game_type g, max(best_score) m from public.user_best_scores group by 1),
 gc as (select game g, max(score) m from public.game_completions where score > 0 group by 1)
select h.game, h.hard_max, greatest(u.m, b.m) as held_account, gc.m as held_board
  from hard_max h left join u on u.g = h.game left join b on b.g = h.game left join gc on gc.g = h.game
 where greatest(u.m, b.m, gc.m) > h.hard_max
union all
select c.game, null, null, null from public.game_score_caps c where c.game not in (select game from hard_max)
order by 1;
`);
  process.exit(0);
}

const WRITE_FIXTURE = process.argv.includes('--write-fixture');
const CONTROL = process.env.ECON_MIG_CONTROL || '';
const EXPECT = { snapshot: 0, noprecheck: 1, tail: 2, arith: 3, norefuse: 4, nosetrole: 5, regrant: 5, rerun: 6, undoleak: 7, nohardmax: 8, fixture: 9 };
if (CONTROL && !(CONTROL in EXPECT)) {
  console.error(`ECON_MIG_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}
if (CONTROL && WRITE_FIXTURE) {
  console.error('--write-fixture under a control would write a planted catalog. Refusing.');
  process.exit(1);
}

let failures = 0;
const fired = new Set();
const fail = (n, m) => { fired.add(n); failures += 1; console.error('  FAIL: ' + m); };
const plant = (text, from, to, what) => {
  if (!text.includes(from)) {
    console.error(`CONTROL ${CONTROL} cannot run: ${what} is not in the text, so the plant would change nothing and a green run would prove nothing.`);
    process.exit(2);
  }
  return text.replace(from, to);
};
const md5 = s => crypto.createHash('md5').update(s).digest('hex');

// --- the parts of L1 this harness reads as text ------------------------------
function hardMaxSeed(l1Text) {
  const m = l1Text.match(/v_hard_max constant jsonb := \(select jsonb_object_agg\(s\.game, jsonb_build_array\(s\.hard_max, s\.basis\)\) from \(values\n([\s\S]*?)\n {2}\) as s\(game, hard_max, basis\)\);/);
  if (!m) throw new Error(`${L1_NAME} no longer declares v_hard_max from a VALUES list, so this harness needs re-anchoring`);
  const out = {};
  for (const line of m[1].split('\n')) {
    const r = line.match(/^\s*\('([a-z0-9-]+)',\s*(\d+),\s*'([^']*)'\),?\s*$/);
    if (!r) throw new Error(`${L1_NAME}: a hard maximum row this harness cannot read: ${line.trim()}`);
    if (r[1] in out) throw new Error(`${L1_NAME}: ${r[1]} has two hard maximum rows`);
    out[r[1]] = [Number(r[2]), r[3]];
  }
  return out;
}
/** The save's CREATE statement in L1, from "create or replace function" to its closing $$;. */
function l1SaveCreate(l1Text) {
  const start = l1Text.indexOf('  create or replace function public.record_auth_completion(');
  const end = l1Text.indexOf('\n$$;\n', start);
  if (start < 0 || end < 0) throw new Error(`${L1_NAME} no longer creates the save where this harness reads it`);
  return l1Text.slice(start, end + 4) + '\n';
}
function bodyOf569(text) {
  const a = text.indexOf('as $$\n');
  const b = text.indexOf('\n$$;', a);
  if (a < 0 || b < 0) throw new Error('the Round 569 migration no longer carries its body between as $$ and $$;');
  return text.slice(a + 'as $$'.length, b + 1);
}

// --- PGlite helpers ------------------------------------------------------------
async function fresh(schema = SCHEMA) {
  const db = new PGlite();
  await db.exec(schema);
  return db;
}
async function attempt(db, sql) {
  try { await db.exec(sql); return { ok: true }; } catch (e) { return { ok: false, code: e.code, message: String(e.message) }; }
}
async function one(db, sql, params = []) { return (await db.query(sql, params)).rows[0]; }
/** md5 of every row of the six tables and of the private tables, in a stable order. */
async function sums(db) {
  const out = {};
  const rels = [...SIX.map(t => 'public.' + t)];
  for (const p of ['private.economy_steps', 'private.game_hard_max']) {
    if ((await one(db, `select to_regclass($1) is not null as e`, [p])).e) rels.push(p);
  }
  for (const r of rels) {
    out[r] = (await one(db, `select md5(coalesce(string_agg(x::text, E'\\n' order by x::text), '')) as m from ${r} x`)).m;
  }
  return out;
}
/** The catalog the migrations touch, as one comparable string. */
async function catalog(db, { dropLedger = false } = {}) {
  const r = await one(db, `select jsonb_build_object(
    'relations', (select jsonb_agg(jsonb_build_object('rel', n.nspname || '.' || c.relname, 'kind', c.relkind::text, 'acl', c.relacl::text,
                                                      'rls', c.relrowsecurity, 'force', c.relforcerowsecurity, 'owner', pg_get_userbyid(c.relowner),
                                                      'options', c.reloptions)
                                   order by n.nspname || '.' || c.relname)
                    from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname in ('public', 'private')),
    'columns', (select jsonb_agg(jsonb_build_object('col', c.relname || '.' || a.attname, 'acl', a.attacl::text) order by c.relname || '.' || a.attname)
                  from pg_attribute a join pg_class c on c.oid = a.attrelid
                 where c.relnamespace = 'public'::regnamespace and a.attnum > 0 and cardinality(a.attacl) > 0),
    'policies', (select jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'permissive', permissive, 'roles', roles::text,
                                                     'cmd', cmd, 'using', qual, 'check', with_check)
                                  order by tablename::text collate "C", policyname::text collate "C")
                   from pg_policies where schemaname in ('public', 'private')),
    'functions', (select jsonb_agg(jsonb_build_object('fn', n.nspname || '.' || f.oid::regprocedure::text, 'md5', md5(pg_get_functiondef(f.oid)),
                                                      'definer', f.prosecdef, 'acl', f.proacl::text, 'owner', pg_get_userbyid(f.proowner),
                                                      'config', f.proconfig)
                                   order by n.nspname || '.' || f.oid::regprocedure::text)
                    from pg_proc f join pg_namespace n on n.oid = f.pronamespace
                   where n.nspname in ('public', 'private', 'auth', 'graphql', 'graphql_public', 'pgbouncer', 'vault'))) as c`);
  const c = r.c;
  if (dropLedger) c.relations = c.relations.filter(x => !/^private\.economy_steps/.test(x.rel));
  return JSON.stringify(c);
}
const diffCatalog = (a, b) => {
  const A = JSON.parse(a), B = JSON.parse(b), out = [];
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const as = (A[k] || []).map(x => JSON.stringify(x)), bs = (B[k] || []).map(x => JSON.stringify(x));
    for (const x of as) if (!bs.includes(x)) out.push(`${k}: only before ${x.slice(0, 160)}`);
    for (const x of bs) if (!as.includes(x)) out.push(`${k}: only after ${x.slice(0, 160)}`);
  }
  return out;
};
/** Run one statement as a client role (with a player id when given), in its own transaction. */
async function asRole(db, role, uid, sql, params = []) {
  await db.exec('begin');
  try {
    if (uid) await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    if (CONTROL !== 'nosetrole') await db.exec(`set local role ${role}`);
    const r = await db.query(sql, params);
    await db.exec('commit');
    return { ok: true, rows: r.rows, affected: r.affectedRows };
  } catch (e) {
    await db.exec('rollback');
    return { ok: false, code: e.code, message: String(e.message) };
  }
}
/** One save as a signed in player; returns the transaction's now() as JSON and the answer. */
async function save(db, uid, game, score, correct) {
  await db.exec('begin');
  const t = (await one(db, `select to_json(now())::text as t`)).t;
  await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
  await db.exec('set local role authenticated');
  try {
    const r = await one(db, `select public.record_auth_completion($1, $2, $3)::text as r`, [game, score, correct]);
    await db.exec('commit');
    return { t, out: r.r };
  } catch (e) {
    await db.exec('rollback');
    return { t, out: `ERR ${e.code} ${e.message}`, code: e.code, message: String(e.message) };
  }
}
const pause = ms => new Promise(r => setTimeout(r, ms));
async function applyL1(db, text = L1) {
  const r = await attempt(db, text);
  if (!r.ok) throw new Error(`L1 did not apply over the snapshot: ${r.code} ${r.message}`);
}
const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const U3 = '33333333-3333-4333-8333-333333333333';

const runs = CONTROL ? [EXPECT[CONTROL]] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const on = n => runs.includes(n);

// ---------------------------------------------------------------------------
if (on(0)) {
  console.log('0) the snapshot is production');
  if (CONTROL === 'snapshot') {
    SCHEMA = plant(SCHEMA, "raise exception 'record_auth_completion needs a signed in user';", "raise exception 'record_auth_completion needs a user signed in';", "the snapshot save's first refusal");
    console.log('   NEGATIVE CONTROL ON: one line of the save in the loaded snapshot differs from production');
  }
  const db = await fresh();
  const fns = (await db.query(`select f.oid::regprocedure::text as fn, md5(pg_get_functiondef(f.oid)) as md5, md5(f.prosrc) as src
                                 from pg_proc f join pg_namespace n on n.oid = f.pronamespace where n.nspname in ('public', 'auth')`)).rows;
  const by = Object.fromEntries(fns.map(f => [f.fn, f]));
  const save0 = by['record_auth_completion(text,integer,integer)'];
  if (!save0 || save0.md5 !== PROD.saveDef) fail(0, `the snapshot's save md5s to ${save0?.md5}, production's is ${PROD.saveDef}: economySchema.sql is not production's Round 569 save`);
  if (!save0 || save0.src !== PROD.saveSrc) fail(0, `the snapshot's save body md5s to ${save0?.src}, production's is ${PROD.saveSrc}`);
  if (by['auth.uid()']?.md5 !== PROD.authUid) fail(0, `auth.uid() md5s to ${by['auth.uid()']?.md5}, production's is ${PROD.authUid}`);
  for (const [fn, m] of Object.entries(PROD.legacy)) if (by[fn]?.md5 !== m) fail(0, `${fn} md5s to ${by[fn]?.md5}, production's is ${m}`);
  const caps = Number((await one(db, 'select count(*)::int as n from public.game_score_caps')).n);
  if (caps !== PROD.capsRows) fail(0, `${caps} cap rows, production held ${PROD.capsRows}`);
  const pols = Number((await one(db, `select count(*)::int as n from pg_policies where schemaname = 'public'`)).n);
  if (pols !== PROD.policies) fail(0, `${pols} policies, production's six tables carry ${PROD.policies}`);
  const reads = (await one(db, `select md5(coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual)
                                  order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)::text) as m
                                  from pg_policies where schemaname = 'public' and cmd = 'SELECT'`)).m;
  if (reads !== PROD.readPoliciesMd5) fail(0, `the read policies md5 to ${reads}, production's to ${PROD.readPoliciesMd5}`);
  if (!fired.has(0)) console.log(`   save ${PROD.saveDef.slice(0, 8)}, auth.uid() and four older definers at production's md5s; ${caps} caps, ${pols} policies`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(1)) {
  console.log('1) L1 refuses before any write when production is not what it read');
  let l1 = L1;
  if (CONTROL === 'noprecheck') {
    l1 = plant(l1, "if md5(pg_get_functiondef(v_save)) <> '5ae76ef7cbf874d58d65ee9050e2023c' then", 'if false then', "L1's md5 precondition");
    console.log('   NEGATIVE CONTROL ON: L1 without its check of the save\'s md5');
  }
  /* The drift is the Round 569 save with one message reworded: everything L1
     reads still lines up except the md5, so only that check can stop it. */
  const s569 = SAVE_569.slice(SAVE_569.indexOf('create or replace function public.record_auth_completion('), SAVE_569.indexOf('\n$$;', SAVE_569.indexOf('as $$')) + 4);
  const drifted = s569.replace("'record_auth_completion needs a signed in user'", "'record_auth_completion needs a user signed in'");
  if (drifted === s569) { console.error('section 1 cannot build its drifted save: the Round 569 file changed shape'); process.exit(2); }
  const cases = [
    { what: 'the save drifted', setup: drifted, expect: /is not the Round 569 body/ },
    { what: 'an overload', setup: `create function public.record_auth_completion(p_game_slug text, p_score integer, p_correct integer, p_extra integer default 0) returns jsonb language sql as $$ select null::jsonb $$;`, expect: /more than one signature/ },
    { what: 'a Round 644 object exists', setup: 'create table private.r644_state (x int);', expect: /Round 644, 646 or 648 object/ },
    { what: 'a game was added to the caps', setup: `insert into public.game_score_caps (game, max_score) values ('a-game-since-l1-was-written', 100);`, expect: /not the 151 games/ },
    { what: 'a write policy changed', setup: 'alter policy user_scores_upd on public.user_scores using (true);', expect: /not the seven read/ },
    { what: 'the file arrived with CRLF line endings', setup: '', crlf: true, expect: /CRLF line endings/ },
  ];
  for (const c of cases) {
    const db = await fresh();
    if (c.setup) await db.exec(c.setup);
    const before = { s: JSON.stringify(await sums(db)), c: await catalog(db) };
    const r = await attempt(db, c.crlf ? l1.split('\n').join('\r\n') : l1);
    const after = { s: JSON.stringify(await sums(db)), c: await catalog(db) };
    if (r.ok) fail(1, `${c.what}: L1 APPLIED, which it must refuse`);
    else if (!c.expect.test(r.message)) fail(1, `${c.what}: L1 refused, but not for this reason (${r.message.slice(0, 160)})`);
    if (before.s !== after.s || before.c !== after.c) fail(1, `${c.what}: the refused L1 left the tables or the catalog changed (${diffCatalog(before.c, after.c).slice(0, 3).join('; ')})`);
    if (!fired.has(1)) console.log(`   ${c.what}: refused, nothing changed`);
    await db.close();
  }
}

// ---------------------------------------------------------------------------
if (on(2)) {
  console.log('2) L1 applies over the snapshot, and its save is the Round 569 arithmetic behind the refusals');
  if (CONTROL === 'tail') {
    SAVE_569 = plant(SAVE_569, 'total_points = s.total_points + excluded.total_points,', 'total_points = s.total_points + excluded.total_points + 0,', "the Round 569 file's increment");
    console.log('   NEGATIVE CONTROL ON: the Round 569 file\'s arithmetic differs by a byte');
  }
  const db = await fresh();
  const r = await attempt(db, L1);
  if (!r.ok) fail(2, `L1 did not apply over the snapshot: ${r.code} ${r.message.slice(0, 200)}`);
  else {
    const f = await one(db, `select prosrc, prosecdef, proconfig, md5(pg_get_functiondef(oid)) as def from pg_proc where oid = 'public.record_auth_completion(text,integer,integer)'::regprocedure`);
    const pinned = (L1.match(/v_new_src_md5 constant text := '([0-9a-f]{32})'/) || [])[1];
    if (!pinned) fail(2, `${L1_NAME} no longer pins v_new_src_md5, so this check needs re-anchoring`);
    else if (md5(f.prosrc) !== pinned) fail(2, `the installed save's body md5s to ${md5(f.prosrc)}, L1 pins ${pinned}`);
    if (!f.prosecdef) fail(2, 'the save is not SECURITY DEFINER after L1');
    const body569 = bodyOf569(SAVE_569);
    const tail569 = body569.slice(body569.indexOf(TAIL_AT));
    const at = f.prosrc.indexOf(TAIL_AT);
    if (body569.indexOf(TAIL_AT) < 0 || at < 0) fail(2, `no "${TAIL_AT.trim()}" line in one of the two bodies, so the comparison needs re-anchoring`);
    else if (f.prosrc.slice(at) !== tail569) fail(2, 'from its first insert to its end the save after L1 is not the body in 20260914120000_record_auth_completion.sql, byte for byte');
    const head = f.prosrc.slice(0, at);
    for (const need of ["raise exception 'record_auth_completion needs a signed in user';", "raise exception 'record_auth_completion needs a game slug';",
                        'length(p_game_slug) > 64', 'join private.game_hard_max', 'coalesce(p_score, 0) > v_hard_max', 'p_correct > 1000', "errcode = '22023'"]) {
      if (!head.includes(need)) fail(2, `the save's refusals no longer include ${need}`);
    }
    if (/\bexecute\b|\bformat\s*\(/i.test(f.prosrc.replace(/--[^\n]*/g, ''))) fail(2, 'the save builds SQL at run time (execute or format(), which as a definer is the exec_sql hole');
    const ledger = await one(db, `select installed from private.economy_steps where step = 'L1' and undone_at is null`);
    if (!ledger) fail(2, 'no live L1 row in private.economy_steps');
    else if (ledger.installed.save_def_md5 !== f.def || ledger.installed.save_src_md5 !== md5(f.prosrc)) fail(2, 'the ledger does not record the save L1 installed');
    if (!fired.has(2)) console.log(`   applied; save ${md5(f.prosrc).slice(0, 8)} as pinned, DEFINER, ${tail569.length} bytes of Round 569 arithmetic verbatim behind its refusals; ledger row live`);
  }
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(3)) {
  console.log('3) the Round 569 arithmetic, byte for byte, on the same saves before and after L1');
  const A = await fresh();
  const B = await fresh();
  await applyL1(B);
  if (CONTROL === 'arith') {
    const planted = plant(l1SaveCreate(L1), 'total_points = s.total_points + excluded.total_points,', 'total_points = s.total_points + excluded.total_points + 1,', "the L1 save's increment");
    await B.exec(planted);
    console.log('   NEGATIVE CONTROL ON: after L1 the save adds one point more than Round 569 did');
  }
  const STEPS = [
    { u: U1, g: 'soccer-grid', s: 600, c: 3 },
    { u: U1, g: 'soccer-grid', s: 900, c: 5 },
    { u: U1, g: 'soccer-grid', s: 300, c: null },
    { u: U1, g: 'footle', s: 0, c: 0 },
    { u: U2, g: 'higher-lower', s: 7000, c: 70 },
    { u: U2, g: 'nfl-career', s: 12, c: 1 },
    { shift: U1, days: 1 },
    { u: U1, g: 'footle', s: 700, c: 1 },
    { shift: U1, days: 1 },
    { u: U1, g: 'world-xi', s: 22, c: 11 },
    { shift: U2, days: 3 },
    { u: U2, g: 'higher-lower', s: 100, c: 1000 },
    { u: U3, g: 'club-manager', s: null, c: null },
    { u: U3, g: 'club-manager', s: 130, c: 0 },
    { u: U3, g: 'club-manager', s: 130, c: 0 },
    { u: U3, g: 'pack-battle', s: 54000000, c: 2 },
  ];
  const T = { A: [], B: [] };
  const answers = { A: [], B: [] };
  for (const st of STEPS) {
    if (st.shift) {
      for (const db of [A, B]) await db.query(`update public.user_scores set last_played_at = last_played_at - make_interval(days => $2) where user_id = $1`, [st.shift, st.days]);
      continue;
    }
    for (const [k, db] of [['A', A], ['B', B]]) {
      const r = await save(db, st.u, st.g, st.s, st.c);
      T[k].push(r.t);
      answers[k].push(r.out);
    }
    await pause(3);
  }
  const saves = STEPS.filter(s => !s.shift).length;
  for (const k of ['A', 'B']) {
    if (new Set(T[k]).size !== T[k].length) fail(3, `two saves on ${k} share one timestamp, so the comparison cannot tell them apart; rerun`);
    const errs = answers[k].filter(a => a.startsWith('ERR'));
    if (errs.length) fail(3, `${errs.length} of the ${saves} sample saves were refused on ${k === 'A' ? 'the snapshot' : 'L1'}: ${errs[0].slice(0, 160)}`);
  }
  if (T.A.some((t, i) => t.slice(1, 11) !== T.B[i].slice(1, 11))) fail(3, 'the run crossed midnight UTC between the two databases, so the days differ; rerun');
  /* A timestamp becomes the save that stamped it, or that save less whole
     days where a step moved it back. Microseconds are kept by comparing the
     text PGlite itself shifted. */
  const labels = async (db, ts) => {
    const map = new Map();
    for (let i = 0; i < ts.length; i++) {
      for (let d = 0; d <= 7; d++) {
        const s = (await one(db, `select to_json($1::timestamptz - make_interval(days => $2))::text as s`, [JSON.parse(ts[i]), d])).s;
        map.set(JSON.parse(s), d ? `save ${i} less ${d} day(s)` : `save ${i}`);
      }
    }
    return map;
  };
  const dump = async (db, map) => {
    const out = {};
    for (const t of ACCOUNT) {
      const rows = (await db.query(`select row_to_json(x) as j from public.${t} x`)).rows.map(r => {
        const o = { ...r.j };
        delete o.id;
        for (const [key, v] of Object.entries(o)) {
          if (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v)) o[key] = map.get(v) || `UNMAPPED ${v}`;
        }
        return JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b))));
      }).sort();
      out[t] = rows;
    }
    return out;
  };
  const dA = await dump(A, await labels(A, T.A));
  const dB = await dump(B, await labels(B, T.B));
  let rows = 0;
  for (const t of ACCOUNT) {
    rows += dA[t].length;
    const un = [...dA[t], ...dB[t]].filter(x => x.includes('UNMAPPED'));
    if (un.length) fail(3, `${t}: a timestamp matches no save (${un[0].slice(0, 140)})`);
    if (JSON.stringify(dA[t]) !== JSON.stringify(dB[t])) {
      const onlyA = dA[t].filter(x => !dB[t].includes(x)), onlyB = dB[t].filter(x => !dA[t].includes(x));
      fail(3, `${t} differs after the same saves: before L1 ${onlyA[0] || '(nothing extra)'}; after L1 ${onlyB[0] || '(nothing extra)'}`);
    }
  }
  for (let i = 0; i < answers.A.length; i++) {
    if (answers.A[i] !== answers.B[i]) { fail(3, `save ${i} answered ${answers.A[i]} before L1 and ${answers.B[i]} after`); break; }
  }
  /* The samples must reach every streak branch, or equal streaks prove nothing:
     a play on the same day, on the next day (U1 builds to 3) and after a gap
     (U2 falls back to 1 with a longest of 1). */
  if (!answers.A.some(a => /"current_streak": 3, "longest_streak": 3/.test(a))) fail(3, 'no sample save built a three day streak, so the next day branch went untested');
  if (answers.A.filter(a => /"current_streak": 1, "longest_streak": 1/.test(a)).length < 3) fail(3, 'too few samples on a first day or after a gap');
  if (!fired.has(3)) console.log(`   ${saves} saves by 3 players, ${rows} rows in the four account tables and ${saves} answers identical before and after L1; last answer ${answers.B.at(-1)}`);
  await A.close();
  await B.close();
}

// ---------------------------------------------------------------------------
if (on(4)) {
  console.log('4) every refusal, and nothing written by one');
  const db = await fresh();
  await applyL1(db);
  if (CONTROL === 'norefuse') {
    const planted = plant(l1SaveCreate(L1), 'if coalesce(p_score, 0) < 0 or coalesce(p_score, 0) > v_hard_max then', 'if false then', "the L1 save's score check");
    await db.exec(planted);
    console.log('   NEGATIVE CONTROL ON: after L1 the save has no score check');
  }
  const seed = hardMaxSeed(L1);
  const game = 'soccer-grid';
  const max = seed[game][0];
  await save(db, U1, game, 100, 1);
  const REFUSE = [
    { what: 'a 65 character slug', a: ['g'.repeat(65), 0, 0], code: '22023', msg: /at most 64 characters/ },
    { what: 'a 5000 character slug', a: ['g'.repeat(5000), 0, 0], code: '22023', msg: /at most 64 characters, this one is 5000/ },
    { what: 'a game off the allowlist', a: ['not-a-game-anyone-plays', 0, 0], code: '22023', msg: /is not a game this site records/ },
    { what: 'a negative score', a: [game, -1, 0], code: '22023', msg: /score -1 .* outside 0 to/ },
    { what: `a score one above ${game}'s hard maximum (${max})`, a: [game, max + 1, 0], code: '22023', msg: new RegExp(`outside 0 to ${max}`) },
    { what: 'a score of two billion', a: [game, 2000000000, 0], code: '22023', msg: /score 2000000000/ },
    { what: 'a correct count of -1', a: [game, 10, -1], code: '22023', msg: /correct count -1/ },
    { what: 'a correct count of 1001', a: [game, 10, 1001], code: '22023', msg: /correct count 1001/ },
    { what: 'no slug', a: [null, 10, 0], code: 'P0001', msg: /needs a game slug/ },
    { what: 'an empty slug', a: ['', 10, 0], code: 'P0001', msg: /needs a game slug/ },
  ];
  for (const c of REFUSE) {
    const before = JSON.stringify(await sums(db));
    const r = await save(db, U1, ...c.a);
    const after = JSON.stringify(await sums(db));
    if (!r.code) fail(4, `${c.what}: ACCEPTED (${r.out.slice(0, 100)})`);
    else if (r.code !== c.code || !c.msg.test(r.message)) fail(4, `${c.what}: refused as ${r.code} "${r.message.slice(0, 120)}", expected ${c.code} matching ${c.msg}`);
    else if (c.code === '22023' && !r.message.startsWith('record_auth_completion refused:')) fail(4, `${c.what}: the message does not start "record_auth_completion refused:", which the client log reads`);
    if (before !== after) fail(4, `${c.what}: the refused save wrote something`);
  }
  {
    const before = JSON.stringify(await sums(db));
    await db.exec('begin');
    await db.exec('set local role authenticated');
    let r;
    try { await db.query(`select public.record_auth_completion($1, 10, 0)`, [game]); r = { ok: true }; } catch (e) { r = { code: e.code, message: String(e.message) }; }
    await db.exec('rollback');
    if (r.ok || r.code !== 'P0001' || !/needs a signed in user/.test(r.message)) fail(4, `no signed in user: ${r.ok ? 'ACCEPTED' : r.code + ' ' + r.message}`);
    const a = await asRole(db, 'anon', U1, `select public.record_auth_completion($1, 10, 0)`, [game]);
    if (a.ok || a.code !== '42501') fail(4, `anon calling the save: ${a.ok ? 'ACCEPTED' : a.code + ' ' + a.message}, expected 42501`);
    if (before !== JSON.stringify(await sums(db))) fail(4, 'a refused caller wrote something');
  }
  const ACCEPT = [
    { what: `a score exactly at ${game}'s hard maximum`, a: [game, max, 0] },
    { what: 'a correct count of 1000', a: [game, 10, 1000] },
    { what: 'a null score (0, as Round 569)', a: [game, null, 0] },
    { what: 'a null correct count', a: [game, 10, null] },
    { what: 'a score of 0', a: ['who-am-i', 0, 0] },
  ];
  for (const c of ACCEPT) {
    const r = await save(db, U2, ...c.a);
    if (r.code) fail(4, `${c.what}: REFUSED (${r.code} ${r.message.slice(0, 120)}), a real play would be lost`);
  }
  if (!fired.has(4)) console.log(`   ${REFUSE.length} bad saves refused (22023 with the value named, or the two Round 569 refusals), no user and anon refused, none wrote a row; ${ACCEPT.length} boundaries accepted`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(5)) {
  console.log('5) direct writes are shut for anon and authenticated, the board insert is not');
  if (CONTROL === 'nosetrole') console.log('   NEGATIVE CONTROL ON: the probes run as the superuser instead of the client roles');
  const A = await fresh();
  await save(A, U1, 'soccer-grid', 100, 1);
  const base = await asRole(A, 'authenticated', U1, `update public.user_scores set total_points = 2000000000 where user_id = $1`, [U1]);
  if (!base.ok || base.affected !== 1) fail(5, `baseline: before L1 a player's PATCH of their own total_points should land and it did not (${base.code || base.affected}), so the probes below prove nothing`);
  await A.close();
  const db = await fresh();
  await applyL1(db);
  if (CONTROL === 'regrant') {
    await db.exec('grant update on table public.user_scores to authenticated;');
    console.log('   NEGATIVE CONTROL ON: authenticated holds UPDATE on user_scores again');
  }
  await save(db, U1, 'soccer-grid', 100, 1);
  const SHUT = [
    `update public.user_scores set total_points = 2000000000 where user_id = '${U1}'`,
    `insert into public.user_scores (user_id, total_points) values ('${U2}', 5)`,
    `delete from public.user_scores where user_id = '${U1}'`,
    `insert into public.user_game_scores (user_id, game_type, score) values ('${U1}', 'soccer-grid', 900)`,
    `update public.user_game_scores set score = 900 where user_id = '${U1}'`,
    `insert into public.user_best_scores (user_id, game_type, best_score) values ('${U1}', 'footle', 700)`,
    `update public.user_best_scores set best_score = 2000000000 where user_id = '${U1}'`,
    `insert into public.daily_completions (user_id, game_slug, date) values ('${U1}', 'footle', current_date)`,
    `delete from public.daily_completions where user_id = '${U1}'`,
    `insert into public.game_score_caps (game, max_score) values ('posted-game', 1)`,
    `update public.game_score_caps set max_score = 1`,
    `update public.game_completions set score = 1`,
    `delete from public.game_completions`,
    `insert into public.game_completions (game, score, player_name, created_at) values ('soccer-grid', 900, 'SimEconomy', now() - interval '3 days')`,
    `insert into public.game_completions (game, score, player_name, completed_on) values ('soccer-grid', 900, 'SimEconomy', current_date - 3)`,
    `insert into public.game_denominators (game) values ('posted-game')`,
    `update public.game_denominators set game = game`,
    `delete from public.game_denominators`,
    `truncate public.user_scores`,
    `insert into public.game_completions (game, score, player_name) values ('soccer-grid', 900, '${'x'.repeat(41)}')`,
    `insert into public.game_completions (game, score, player_name) values ('${'g'.repeat(65)}', 900, 'SimEconomy')`,
    `insert into public.game_completions (game, score, player_name) values ('', 900, 'SimEconomy')`,
  ];
  let shut = 0;
  for (const role of ['anon', 'authenticated']) {
    for (const sql of SHUT) {
      const before = JSON.stringify(await sums(db));
      const r = await asRole(db, role, U1, sql);
      if (r.ok) fail(5, `${role} may run: ${sql.slice(0, 110)}`);
      else if (r.code !== '42501') fail(5, `${role} was refused ${sql.slice(0, 80)} with ${r.code} (${r.message.slice(0, 80)}), not for want of privilege`);
      else shut += 1;
      if (before !== JSON.stringify(await sums(db))) fail(5, `${role}: a refused write changed a table: ${sql.slice(0, 80)}`);
    }
    const board = await asRole(db, role, U1, `insert into public.game_completions (game, score, player_name) values ('soccer-grid', 900, $1)`, [`SimEconomy ${role}`]);
    if (!board.ok) fail(5, `${role}'s board insert, the client's own shape, was refused (${board.code} ${board.message.slice(0, 100)}); every play's board row would be lost`);
    const row = await one(db, `select count(*)::int as n, bool_and(created_at > now() - interval '1 minute') as fresh from public.game_completions where player_name = $1`, [`SimEconomy ${role}`]);
    if (row.n !== 1 || !row.fresh) fail(5, `${role}'s board row did not land once with a server stamped time`);
    const reads = await asRole(db, role, null, `select (select count(*) from public.user_scores) + (select count(*) from public.game_completions) + (select count(*) from public.game_score_caps) as n`);
    if (!reads.ok) fail(5, `${role} can no longer read the tables (${reads.code})`);
  }
  if (!fired.has(5)) console.log(`   before L1 a player's own total_points PATCH landed; after it ${shut} direct writes refused 42501 (${SHUT.length} each for anon and authenticated), none changed a row; both roles' board inserts landed and every table still reads`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(6)) {
  console.log('6) a second apply refuses and changes nothing');
  let l1 = L1;
  if (CONTROL === 'rerun') {
    l1 = plant(l1, "raise exception 'Round 673 L1: already applied", "raise notice 'Round 673 L1: already applied", "L1's already applied guard");
    console.log('   NEGATIVE CONTROL ON: L1\'s already applied guard only warns');
  }
  const db = await fresh();
  await applyL1(db, l1);
  await save(db, U1, 'soccer-grid', 100, 1);
  const before = { s: JSON.stringify(await sums(db)), c: await catalog(db) };
  const r = await attempt(db, l1);
  const after = { s: JSON.stringify(await sums(db)), c: await catalog(db) };
  if (r.ok) fail(6, 'a second apply of L1 went through');
  else if (!/already applied/.test(r.message)) fail(6, `a second apply was refused, but not by the ledger (${r.message.slice(0, 140)}): the guard meant for this is not the one doing it`);
  if (before.s !== after.s || before.c !== after.c) fail(6, 'the refused second apply changed something');
  if (!fired.has(6)) console.log(`   refused: "${r.message.slice(0, 90)}"; tables and catalog unchanged`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(7)) {
  console.log('7) the undo restores the catalog, and L1 reapplies to the same place');
  const db = await fresh();
  const c0 = await catalog(db);
  await applyL1(db);
  const c1 = await catalog(db);
  await save(db, U1, 'soccer-grid', 100, 1);
  const u = await attempt(db, UNDO);
  if (!u.ok) fail(7, `the undo raised: ${u.code} ${u.message.slice(0, 160)}`);
  if (CONTROL === 'undoleak') {
    await db.exec('revoke update on table public.user_scores from authenticated;');
    console.log('   NEGATIVE CONTROL ON: after the undo authenticated is still missing UPDATE on user_scores');
  }
  const c2 = await catalog(db, { dropLedger: true });
  const d = diffCatalog(c0, c2);
  if (d.length) fail(7, `after the undo the catalog is not what it was before L1 (${d.length} difference(s)): ${d.slice(0, 3).join('; ')}`);
  const s = await one(db, `select md5(pg_get_functiondef(oid)) as d, prosecdef from pg_proc where oid = 'public.record_auth_completion(text,integer,integer)'::regprocedure`);
  if (s.d !== PROD.saveDef || s.prosecdef) fail(7, `after the undo the save md5s to ${s.d} (definer ${s.prosecdef}), not production's ${PROD.saveDef}`);
  const led = await one(db, `select undone_at is not null as undone from private.economy_steps where step = 'L1'`);
  if (!led?.undone) fail(7, 'the ledger does not mark L1 undone');
  const again = await attempt(db, UNDO);
  if (again.ok || !/not live/.test(again.message)) fail(7, `a second undo was not refused as "not live" (${again.ok ? 'it ran' : again.message.slice(0, 120)})`);
  const re = await attempt(db, L1);
  if (!re.ok) fail(7, `L1 did not reapply after the undo: ${re.message.slice(0, 160)}`);
  const c3 = await catalog(db);
  const d2 = diffCatalog(c1, c3);
  if (d2.length) fail(7, `the reapplied L1 is not the first apply (${d2.length} difference(s)): ${d2.slice(0, 3).join('; ')}`);
  if (!fired.has(7)) console.log(`   undo: catalog equal to before L1 across ${JSON.parse(c0).relations.length} relations and every function and policy, save back to ${PROD.saveDef.slice(0, 8)} INVOKER, L1 marked undone, a second undo refused; the reapply equals the first apply`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(8)) {
  console.log('8) the hard maximum covers every cap, and says what it claims');
  const seed = hardMaxSeed(L1);
  const db = await fresh();
  const caps = (await db.query('select game from public.game_score_caps order by game')).rows.map(r => r.game);
  const keys = Object.keys(seed).sort();
  const missing = caps.filter(g => !(g in seed)), extra = keys.filter(g => !caps.includes(g));
  if (missing.length || extra.length) fail(8, `the hard maximum and the caps differ: no hard maximum for ${missing.join(', ') || 'none'}; a hard maximum for a game not in the caps: ${extra.join(', ') || 'none'}`);
  let checked = 0;
  for (const [g, [hm, basis]] of Object.entries(seed)) {
    if (!Number.isInteger(hm) || hm < 1 || hm > 2147483647) { fail(8, `${g}: ${hm} is not an integer from 1 to 2147483647`); continue; }
    let m;
    if ((m = basis.match(/^2 x ceiling (\d+)$/))) { if (hm !== 2 * +m[1]) fail(8, `${g}: ${hm} is not 2 x ${m[1]}`); }
    else if ((m = basis.match(/^2 x held (\d+) \(ceiling (\d+)\)$/))) { if (hm !== 2 * +m[1] || +m[1] < +m[2]) fail(8, `${g}: ${hm} is not 2 x held ${m[1]}, or held is below the ceiling ${m[2]} it claims to beat`); }
    else if ((m = basis.match(/^(open|season|unscored|retired): 10 x held (\d+)$/))) { if (hm !== 10 * +m[2] || hm < 10000) fail(8, `${g}: ${hm} is not 10 x held ${m[2]} at or above the floor`); }
    else if ((m = basis.match(/^(open|season|unscored|retired): floor 10000 \(held (\d+)\)$/))) { if (hm !== 10000 || 10 * +m[2] > 10000) fail(8, `${g}: ${hm} is not the floor, or 10 x held ${m[2]} is above it`); }
    else { fail(8, `${g}: basis "${basis}" is none of the rule's four shapes (header, HARD MAXIMUM)`); continue; }
    checked += 1;
  }
  await applyL1(db);
  const rows = (await db.query('select game, hard_max, basis from private.game_hard_max order by game')).rows;
  const same = rows.length === keys.length && rows.every(r => seed[r.game] && seed[r.game][0] === r.hard_max && seed[r.game][1] === r.basis);
  if (!same) fail(8, `private.game_hard_max after L1 (${rows.length} rows) is not the ${keys.length} rows L1 carries`);
  /* After L1, any migration that adds a cap row must add its hard maximum. */
  const later = fs.readdirSync(MIGRATIONS).filter(f => /^\d{8}.*\.sql$/.test(f) && f > L1_NAME).sort()
    .map(f => ({ file: f, sql: readLF(path.join(MIGRATIONS, f)) }));
  if (CONTROL === 'nohardmax') {
    later.push({ file: '29991231_control_new_cap.sql', sql: "insert into public.game_score_caps (game, max_score, note) values ('control-new-game', 100, 'a new game');" });
    console.log('   NEGATIVE CONTROL ON: a later migration adds a cap row and no hard maximum');
  }
  const gamesIn = (sql, table) => {
    const out = new Set();
    const code = sql.replace(/--[^\n]*/g, ' ');
    const re = new RegExp(`insert\\s+into\\s+${table.replace('.', '\\.')}\\b[^;]*`, 'gi');
    for (const m of code.matchAll(re)) for (const g of m[0].matchAll(/\(\s*'([a-z0-9-]+)'/g)) out.add(g[1]);
    return out;
  };
  for (const m of later) {
    const capsAdded = gamesIn(m.sql, 'public.game_score_caps');
    const hmAdded = gamesIn(m.sql, 'private.game_hard_max');
    for (const g of capsAdded) if (!hmAdded.has(g)) fail(8, `${m.file} adds ${g} to game_score_caps with no row in private.game_hard_max, so every signed in save of it would be refused`);
  }
  if (!fired.has(8)) console.log(`   ${keys.length} games, the ${caps.length} caps exactly; ${checked} values match their basis; the table L1 writes is the file's; ${later.length} later migration(s), none adds a cap without a hard maximum`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(9)) {
  console.log('9) simPlayDoor\'s fixture is the catalog L1 produces');
  const db = await fresh();
  await applyL1(db);
  const produced = (await one(db, CATALOG_SQL)).catalog;
  const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
  const queryMd5 = md5(CATALOG_SQL);
  if (WRITE_FIXTURE) {
    const today = new Date().toISOString().slice(0, 10);
    const out = {
      _comment: "Round 673. simPlayDoor's snapshot of the catalog: the output of scripts/data/playDoorCatalog.sql. source 'rehearsal' means node scripts/simEconomyMigrations.mjs --write-fixture captured it in PGlite, on scripts/data/economySchema.sql (production's objects, read only) right after economy step L1 ran there; nothing ran on production. After the lead applies L1 (the header of supabase/migrations/20260928_econ_l1_lock_the_doors.sql, step 6), rerun the query read only through the Supabase MCP, replace catalog with its output, set source to 'production' and captured to that date. From then on simPlayDoor also requires the live door to be shut, and simEconomyMigrations section 9 requires production to equal the rehearsal.",
      source: 'rehearsal',
      captured: today,
      query_md5: queryMd5,
      catalog: canon(produced),
    };
    fs.writeFileSync(FIXTURE_FILE, JSON.stringify(out, null, 2) + '\n');
    console.log(`   WROTE ${path.relative(ROOT, FIXTURE_FILE)} (rehearsal, ${today}, query ${queryMd5.slice(0, 8)})`);
  }
  const fixture = JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf8'));
  if (CONTROL === 'fixture') {
    if (fixture.catalog?.save?.definer !== true) { console.error('CONTROL fixture cannot run: the fixture has no save.definer true to flip'); process.exit(2); }
    fixture.catalog.save.definer = false;
    console.log('   NEGATIVE CONTROL ON: the fixture says the save is not a definer');
  }
  if (fixture.query_md5 !== queryMd5) fail(9, `the fixture was captured with another query (${fixture.query_md5}, the file is ${queryMd5}); rerun with --write-fixture`);
  if (!['rehearsal', 'production'].includes(fixture.source)) fail(9, `the fixture's source is "${fixture.source}", neither rehearsal nor production`);
  const want = JSON.stringify(canon(produced)), have = JSON.stringify(canon(fixture.catalog));
  if (want !== have) {
    const keysDiff = Object.keys(produced).filter(k => JSON.stringify(canon(produced[k])) !== JSON.stringify(canon(fixture.catalog?.[k])));
    fail(9, fixture.source === 'production'
      ? `production's catalog differs from the rehearsal in ${keysDiff.join(', ')}: economySchema.sql no longer describes production, or the apply did something the rehearsal did not. Read both before going on`
      : `the committed fixture differs from what L1 produces in ${keysDiff.join(', ')}; if L1 or the query changed on purpose, rerun with --write-fixture and commit it`);
  }
  if (!fired.has(9)) console.log(`   the ${fixture.source} fixture of ${fixture.captured} equals the rehearsal's catalog, ${Object.keys(produced).length} keys`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const leaked = [...fired].filter(n => n !== want);
  if (!fired.has(want)) { console.error(`\nsimEconomyMigrations: CONTROL ${CONTROL}: section ${want} did NOT fire. The check is not measuring what it claims to.`); process.exit(1); }
  if (leaked.length) { console.error(`\nsimEconomyMigrations: CONTROL ${CONTROL} fired section ${want} but also ${leaked.join(', ')}.`); process.exit(1); }
  console.log(`\nsimEconomyMigrations: CONTROL ${CONTROL}: section ${want} fired, as it must.`);
  process.exit(0);
}
if (failures) { console.error(`\nsimEconomyMigrations: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimEconomyMigrations: green. L1 refuses a drifted production, applies once, keeps the Round 569 arithmetic byte for byte, refuses every abuse without writing, shuts every direct write, undoes to the catalog it found and reapplies to the same place.');
