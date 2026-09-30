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
 *   9. simPlayDoor's FIXTURE is the catalog the rehearsed chain produces
 *      here: the committed scripts/data/playDoorCatalog.json must equal
 *      scripts/data/playDoorCatalog.sql run on the snapshot after L1, the
 *      E1 and E2 stand-in, E3 and E3c (Round 677). A fixture refreshed from
 *      production is compared with the rehearsal at the stage its own ledger
 *      names (L1 alone, or through E3c), so it is the check that the
 *      rehearsal was the truth at every stage the lead applies.
 *
 * ROUND 677, economy step E3 (the door, supabase/migrations/
 * 20260930_econ_e3_the_door.sql) and E3c (the one ranked day index). E3 goes
 * on top of E1 and E2, which Rounds 675 and 676 build in parallel, so the
 * rehearsal stands them in with the shapes the spec's section 5 defines
 * (scripts/data/economyE2StandIn.sql, labelled stand_in in the ledger), and
 * loads the production objects E3 reads beyond L1's (profiles and the default
 * privileges, scripts/data/economySchemaE3.sql). PGlite takes its clock from
 * Date.now, so the door is run at the instants it must hold at.
 *  10. E3 REFUSES BEFORE ANY WRITE: no E2, the save drifted from what L1
 *      recorded, an overload, an E1 shape missing, anon unable to read
 *      score_scales, an E3 object already there, the insert policy or a
 *      column grant changed since L1, a later step live, CRLF line endings.
 *      Tables and catalog unchanged after each.
 *  11. E3 APPLIES and is what it proves (the door and name_is_owned as
 *      definers with their grants, the internals shut to every client role,
 *      the tables, the board insert's five columns and policy clauses); a
 *      second apply refuses; E3c runs statement by statement to a valid
 *      index and refuses twice; E3's undo refuses while E3c is live; both
 *      undos restore the catalog object for object; E3 reapplies to its first
 *      catalog; E3's undo refuses once the door has recorded a claim.
 *  12. THE DOOR'S CASES (spec section 12): a start claims and a finish settles
 *      one ranked result, points read back AFTER the writes; a retry is
 *      idempotent; a second run the same day is practice with one unscored
 *      board row; a clamp is counted, not refused; a name owned by another
 *      account is never used for the board row; the deal, career and for fun
 *      families; an unknown game; no open cap; a season forfeit, one open
 *      season a day, and a save scummed close refused at start and at
 *      finish; another account's rows untouchable through any parameter;
 *      malformed calls refused without a write; total_points never moves.
 *  13. THE EASTERN DAY: the door's day at 23:30 and 00:30 Eastern, through
 *      the 2026-11-01 clock change (both 01:30s), a run across midnight
 *      keeps the day it was dealt, a claim older than 24 hours expires, a
 *      season keeps the day it began.
 *  14. THE NAME RULE, as the client roles: a guest is refused another
 *      account's display name or username, case folded; an account's own
 *      tab inserts under its own name; a name two accounts share works for
 *      both; the tagged columns are bounded; anon cannot call the door.
 *  15. THE T0 SHIM (supabase/held/econ_t0_shim.sql, NOT applied anywhere
 *      but here): a claim at finish through the door's settle, untagged, no
 *      add to total_points, the best written, no board row; a second shim
 *      finish is practice; shim and door share the day; the 3 argument call
 *      is not ambiguous.
 *
 * CONTROLS, ECON_MIG_CONTROL=<name>. Each plants its fault in memory (never in
 * a file), refuses to run if the plant changes nothing, runs only its own
 * section, and must turn it red:
 *   snapshot    a byte of the save's body changes in the loaded snapshot    0
 *   noprecheck  L1's md5 precondition removed, so a drifted save applies    1
 *   tail        a byte of the Round 569 file's arithmetic changes           2
 *   arith       after L1 the save adds one point more than Round 569        3
 *   norefuse    after L1 the save's score check is gone                     4
 *   nosetrole   the probes run as the superuser, not as the client roles    5, 14
 *   regrant     after L1 authenticated gets UPDATE on user_scores back      5
 *   rerun       L1's "already applied" guard only warns                     6
 *   undoleak    after the undo a grant L1 took away is still missing       7
 *   nohardmax   a migration after L1 adds a cap row with no hard maximum     8
 *   fixture     one value of the committed fixture changes                  9
 *   e3precheck  E3's check of the save against L1's record removed          10
 *   e3undo      after E3's undo a column grant E3 made is still there      11
 *   readafter   the door reads the day's points before it writes them      12
 *   noclaim     the door's check of today's slot is gone, and its claim
 *               takes the slot over                                        12
 *   scum        a season a save already closed is not refused at finish    12
 *   midnight    a ranked row goes on the finish's day, not the claim's      13
 *   sharedname  name_is_owned loses the caller's own name exemption         14
 *   overload    a 4 argument record_auth_completion with a default          15
 * nosetrole must turn both 5 and 14 red and nothing else; every other control
 * exactly its own section.
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
/* Round 677: E3, E3c, their undos, the held T0 shim, and what E3 reads
   beyond L1's snapshot. */
const E3_NAME = '20260930_econ_e3_the_door.sql';
const E3C_NAME = '20260930_econ_e3c_one_ranked_day.sql';
const SCHEMA_E3 = readLF(path.join(ROOT, 'scripts', 'data', 'economySchemaE3.sql'));
const STANDIN = readLF(path.join(ROOT, 'scripts', 'data', 'economyE2StandIn.sql'));
let E3 = readLF(path.join(MIGRATIONS, E3_NAME));
const E3_UNDO = readLF(path.join(MIGRATIONS, 'ROLLBACK_' + E3_NAME));
const E3C = readLF(path.join(MIGRATIONS, E3C_NAME));
const E3C_UNDO = readLF(path.join(MIGRATIONS, 'ROLLBACK_' + E3C_NAME));
const SHIM = readLF(path.join(ROOT, 'supabase', 'held', 'econ_t0_shim.sql'));

/* PGlite reads its clock through Date.now (proved before this was written:
   now() follows it, and holds still inside a transaction exactly as Postgres
   does), so a section can run the door at 23:30 Eastern. null is the real
   clock; sections 1 to 9 never set it. */
const realNow = Date.now.bind(Date);
let CLOCK = null;
Date.now = () => (CLOCK === null ? realNow() : CLOCK);
const at = iso => { CLOCK = Date.parse(iso); };
const tick = (ms = 1000) => { CLOCK += ms; };

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
const EXPECT = { snapshot: 0, noprecheck: 1, tail: 2, arith: 3, norefuse: 4, nosetrole: [5, 14], regrant: 5, rerun: 6, undoleak: 7, nohardmax: 8, fixture: 9,
                 e3precheck: 10, e3undo: 11, readafter: 12, noclaim: 12, scum: 12, midnight: 13, sharedname: 14, overload: 15 };
const WANT = CONTROL ? [].concat(EXPECT[CONTROL]) : [];
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
  for (const p of ['private.economy_steps', 'private.game_hard_max', 'public.profiles', 'public.score_scales', 'public.game_scale_caps',
                   'public.game_rules', 'private.ranked_claims', 'private.season_closes', 'private.play_refusals']) {
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
const U4 = '44444444-4444-4444-8444-444444444444';
const U5 = '55555555-5555-4555-8555-555555555555';
const RUN = n => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`;

// --- Round 677: E3 helpers ------------------------------------------------------
/** E3c and its undo are three statements each, run one at a time. */
function statementsOf(text, name) {
  const parts = text.split(/^-- STATEMENT \d of 3\n/m);
  if (parts.length !== 4) throw new Error(`${name} does not carry exactly three "-- STATEMENT n of 3" blocks`);
  return parts.slice(1).map(s => s.trim() + '\n');
}
/** Production's objects, L1 applied, E1 and E2 stood in: what E3 finds. */
async function e3Base() {
  const db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(SCHEMA_E3);
  await applyL1(db);
  await db.exec(STANDIN);
  return db;
}
async function applyE3(db, text = E3) {
  const r = await attempt(db, text);
  if (!r.ok) throw new Error(`E3 did not apply: ${r.code} ${r.message}`);
}
async function runStatements(db, text, name) {
  for (const [i, s] of statementsOf(text, name).entries()) {
    const r = await attempt(db, s);
    if (!r.ok) return { ok: false, at: i + 1, code: r.code, message: r.message };
  }
  return { ok: true };
}
async function chainDb({ e3 = true, e3c = true, e3Text = E3 } = {}) {
  const db = await e3Base();
  if (e3) await applyE3(db, e3Text);
  if (e3 && e3c) {
    const r = await runStatements(db, E3C, E3C_NAME);
    if (!r.ok) throw new Error(`E3c statement ${r.at} did not apply: ${r.code} ${r.message}`);
  }
  return db;
}
/* The rules and dp periods E3b will seed (Round 691), as test data for the
   door: one game of each claim family, a for fun game, and a paying game with
   no open period. Five accounts: Alice (display name), Bob (display name and
   username), Carol (neither), and Dave and Erin, who share a display name. */
const SEED = `
insert into public.game_scale_caps (game, scale, cap, note) values
  ('footle', 'dp', 100, 'test'), ('budget-builder', 'dp', 100, 'test'),
  ('nba-front-office', 'dp', 100, 'test'), ('soccer-career', 'dp', 100, 'test');
insert into public.game_rules (game, family, scale, pays, claim, round) values
  ('footle', 'typed', 'dp', true, 'first-action', 'test'),
  ('budget-builder', 'numbers', 'dp', true, 'deal', 'test'),
  ('nba-front-office', 'season', 'dp', true, 'week-one', 'test'),
  ('soccer-career', 'career', 'dp', true, 'finish', 'test'),
  ('hof-or-bust', 'fun', null, false, 'first-action', 'test'),
  ('ball-iq', 'choice', 'dp', true, 'first-action', 'test');
insert into public.profiles (user_id, display_name, username) values
  ('${U1}', 'Alice', null), ('${U2}', 'Bob', 'bob_the_builder'), ('${U3}', null, null),
  ('${U4}', 'Shared', null), ('${U5}', 'shared', 'erin5');
`;
/** One door call as a signed in player; the answer parsed. */
async function door(db, uid, game, phase, run, step = 0, score = null, correct = null, name = null) {
  const r = await asRole(db, 'authenticated', uid, `select public.record_play($1, $2, $3, $4, $5, $6, $7)::text as r`,
                         [game, phase, run, step, score, correct, name]);
  return r.ok ? { ok: true, a: JSON.parse(r.rows[0].r) } : { ok: false, code: r.code, message: r.message, a: {} };
}
const show = r => (r.ok ? JSON.stringify(r.a) : `ERROR ${r.code} ${String(r.message).slice(0, 120)}`);
const count = async (db, sql, params = []) => Number((await one(db, `select count(*)::int as n from (${sql}) q`, params)).n);

const runs = CONTROL ? WANT : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
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
  console.log('9) simPlayDoor\'s fixture is the catalog the rehearsed chain produces');
  /* The committed rehearsal is always the whole chain this branch carries:
     L1, the E1 and E2 stand-in, E3 and E3c. A fixture refreshed from
     production is compared at the stage its own ledger says production is
     at, so a production fixture taken between L1 and E3 is judged against
     L1 alone. A stage the rehearsal cannot build (E1 or E2 applied for real
     without E3) fails: that needs Rounds 675 and 676's migrations in place of
     the stand-in. */
  const current = WRITE_FIXTURE ? null : JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf8'));
  const liveSteps = c => (c?.ledger || []).filter(r => r.live).map(r => r.step);
  let stage = 'through E3c';
  if (current?.source === 'production') {
    const s = liveSteps(current.catalog);
    stage = s.includes('E3c') ? 'through E3c' : (s.length === 1 && s[0] === 'L1') ? 'L1 alone' : null;
  }
  if (stage === null) {
    fail(9, `the production fixture's live ledger (${liveSteps(current.catalog).join(', ')}) is no stage this rehearsal builds (L1 alone, or through E3c); with Rounds 675 and 676 applied, load their migrations in place of scripts/data/economyE2StandIn.sql`);
    stage = 'through E3c';
  }
  let db;
  if (stage === 'L1 alone') {
    db = await fresh();
    await applyL1(db);
  } else {
    db = await chainDb();
  }
  const produced = (await one(db, CATALOG_SQL)).catalog;
  const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
  const queryMd5 = md5(CATALOG_SQL);
  if (WRITE_FIXTURE) {
    const today = new Date().toISOString().slice(0, 10);
    const out = {
      _comment: "Rounds 673 and 677. simPlayDoor's snapshot of the catalog: the output of scripts/data/playDoorCatalog.sql. source 'rehearsal' means node scripts/simEconomyMigrations.mjs --write-fixture captured it in PGlite, on scripts/data/economySchema.sql and economySchemaE3.sql (production's objects, read only) after the chain this branch carries ran there: L1, the E1 and E2 stand-in (scripts/data/economyE2StandIn.sql), E3 and E3c; nothing ran on production. After the lead applies a step (L1's header step 6, E3's header step 6), rerun the query read only through the Supabase MCP, replace catalog with its output, set source to 'production' and captured to that date. From then on simPlayDoor also requires the live door to be shut, and simEconomyMigrations section 9 requires production to equal the rehearsal at the stage its ledger names.",
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
      : `the committed fixture differs from what the chain produces in ${keysDiff.join(', ')}; if a migration or the query changed on purpose, rerun with --write-fixture and commit it`);
  }
  if (!fired.has(9)) console.log(`   the ${fixture.source} fixture of ${fixture.captured} equals the rehearsal's catalog ${stage}, ${Object.keys(produced).length} keys`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(10)) {
  console.log('10) E3 refuses before any write when what it stands on is not what it read');
  let e3 = E3;
  if (CONTROL === 'e3precheck') {
    e3 = plant(e3, "  if md5(pg_get_functiondef(v_save)) is distinct from v_l1.installed->>'save_def_md5' then", '  if false then', "E3's check of the save against L1's record");
    console.log('   NEGATIVE CONTROL ON: E3 without its check of the save against what L1 recorded');
  }
  const cases = [
    { what: 'E2 is not live', setup: `update private.economy_steps set undone_at = now() where step = 'E2'`, expect: /E2 is not live/ },
    { what: 'the save drifted from what L1 recorded', setup: `alter function public.record_auth_completion(text, integer, integer) set work_mem = '1MB'`, expect: /not the save L1 recorded/ },
    { what: 'an overload of the save', setup: `create function public.record_auth_completion(p_game_slug text, p_score integer, p_correct integer, p_extra integer default 0) returns jsonb language sql as $$ select null::jsonb $$`, expect: /more than one signature/ },
    { what: 'an E1 column is missing', setup: `alter table public.score_scales rename column scale to scale_key`, expect: /columns E1 installs/ },
    { what: 'anon cannot read score_scales', setup: `revoke select on table public.score_scales from anon`, expect: /cannot read score_scales/ },
    { what: 'an E3 object already exists', setup: `create table public.game_rules (game text)`, expect: /already exists, but no live E3/ },
    { what: 'the insert policy changed since L1', setup: `alter policy "Anyone can log a completion" on public.game_completions with check (true)`, expect: /not what L1 recorded/ },
    { what: 'a client may already insert score_scale', setup: `grant insert (score_scale) on table public.game_completions to anon`, expect: /may already insert score_scale/ },
    { what: 'a step after E2 is live', setup: `insert into private.economy_steps (step, seq, installed, prior) values ('E9', 9, '{}', '{}')`, expect: /a step after E2 is live/ },
    { what: 'the file arrived with CRLF line endings', crlf: true, expect: /carriage return/ },
  ];
  for (const c of cases) {
    const db = await e3Base();
    if (c.setup) await db.exec(c.setup);
    const before = { s: JSON.stringify(await sums(db)), c: await catalog(db) };
    const r = await attempt(db, c.crlf ? e3.split('\n').join('\r\n') : e3);
    const after = { s: JSON.stringify(await sums(db)), c: await catalog(db) };
    if (r.ok) fail(10, `${c.what}: E3 APPLIED, which it must refuse`);
    else if (!c.expect.test(r.message)) fail(10, `${c.what}: E3 refused, but not for this reason (${r.message.slice(0, 160)})`);
    if (before.s !== after.s || before.c !== after.c) fail(10, `${c.what}: the refused E3 left the tables or the catalog changed (${diffCatalog(before.c, after.c).slice(0, 3).join('; ')})`);
    if (!fired.has(10)) console.log(`   ${c.what}: refused, nothing changed`);
    await db.close();
  }
}

// ---------------------------------------------------------------------------
if (on(11)) {
  console.log('11) E3 applies and is what it proves; E3c; a second apply; both undos; the reapply');
  const db = await e3Base();
  const c0 = await catalog(db);
  const r = await attempt(db, E3);
  if (!r.ok) fail(11, `E3 did not apply over L1 and the stand-in: ${r.code} ${r.message.slice(0, 200)}`);
  else {
    /* the catalog, read here rather than trusted from E3's own proofs */
    const fn = sig => one(db, `select prosecdef as d, proconfig as c, provolatile as v, pg_get_userbyid(proowner) as o,
                                      has_function_privilege('anon', oid, 'EXECUTE') as anon,
                                      has_function_privilege('authenticated', oid, 'EXECUTE') as auth,
                                      exists (select 1 from aclexplode(coalesce(proacl, acldefault('f', proowner))) x where x.grantee = 0) as pub
                                 from pg_proc where oid = to_regprocedure($1)`, [sig]);
    const emptyPath = f => Array.isArray(f?.c) && f.c.length === 1 && f.c[0] === 'search_path=""';
    const rp = await fn('public.record_play(text,text,uuid,integer,integer,integer,text)');
    if (!rp || !rp.d || !emptyPath(rp) || rp.anon || !rp.auth || rp.pub || rp.o !== 'postgres') fail(11, `record_play is not a postgres owned definer, search_path empty, executable by authenticated only: ${JSON.stringify(rp)}`);
    const no = await fn('public.name_is_owned(text,uuid)');
    if (!no || !no.d || no.v !== 's' || !emptyPath(no) || !no.anon || !no.auth || no.pub) fail(11, `name_is_owned is not a STABLE definer, search_path empty, executable by anon and authenticated and not PUBLIC: ${JSON.stringify(no)}`);
    const internals = (await db.query(`select p.oid::regprocedure::text as fn, p.prosecdef as d, p.proconfig as c,
                                              has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
                                              has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth,
                                              exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where x.grantee = 0) as pub
                                         from pg_proc p where p.pronamespace = 'private'::regnamespace and p.proname like 'play\\_%'`)).rows;
    const open = internals.filter(i => i.d || i.anon || i.auth || i.pub || !emptyPath(i));
    if (internals.length !== 5 || open.length) fail(11, `the internals are not five invoker functions no client role may call: ${internals.length} found, open ${open.map(i => i.fn).join(', ') || 'none'}`);
    const sigs = await one(db, `select (select count(*) from pg_proc where proname = 'record_play')::int as rp, (select count(*) from pg_proc where proname = 'name_is_owned')::int as no`);
    if (sigs.rp !== 1 || sigs.no !== 1) fail(11, `record_play has ${sigs.rp} signatures and name_is_owned ${sigs.no}, each must have exactly one`);
    for (const role of ['anon', 'authenticated']) {
      const cols = (await one(db, `select string_agg(a.attname::text, ',' order by a.attname::text collate "C") as c from pg_attribute a
                                    where a.attrelid = 'public.game_completions'::regclass and a.attnum > 0 and not a.attisdropped
                                      and has_column_privilege($1, a.attrelid, a.attnum, 'INSERT')`, [role])).c;
      if (cols !== 'game,player_name,ranked_day,score,score_scale') fail(11, `${role} may insert game_completions columns ${cols}`);
    }
    const chk = (await one(db, `select with_check as w from pg_policies where tablename = 'game_completions' and cmd = 'INSERT'`)).w || '';
    for (const need of ['(length(game) >= 1)', '(length(game) <= 64)', '(length(player_name) <= 40)', '(score_scale IS NULL)', 'score_scales',
                        '(ranked_day IS NULL)', 'et_day(now())', '(NOT name_is_owned(player_name, auth.uid()))']) {
      if (!chk.includes(need)) fail(11, `the board insert policy lacks ${need}: ${chk}`);
    }
    const t = await one(db, `select (select count(*) from public.game_rules)::int as rules,
                                    (select bool_and(relrowsecurity) from pg_class where oid in ('public.game_rules'::regclass, 'private.ranked_claims'::regclass,
                                                                                               'private.season_closes'::regclass, 'private.play_refusals'::regclass)) as rls,
                                    has_table_privilege('anon', 'public.game_rules', 'SELECT') as anon_read,
                                    has_table_privilege('anon', 'public.game_rules', 'INSERT') or has_table_privilege('authenticated', 'public.game_rules', 'UPDATE') as rules_write,
                                    has_table_privilege('authenticated', 'private.ranked_claims', 'SELECT') as claims_read`);
    if (t.rules !== 0 || !t.rls || !t.anon_read || t.rules_write || t.claims_read) fail(11, `the door's tables are not as written (game_rules empty and public read only, RLS on everywhere, claims private): ${JSON.stringify(t)}`);
    const led = await one(db, `select e.seq, e.undone_at is null as live, e.installed->>'record_play_def_md5' as m,
                                      (select seq from private.economy_steps where step = 'E2') as e2,
                                      md5(pg_get_functiondef(to_regprocedure('public.record_play(text,text,uuid,integer,integer,integer,text)'))) as now_m
                                 from private.economy_steps e where e.step = 'E3'`);
    if (!led?.live || led.seq !== led.e2 + 1 || led.m !== led.now_m) fail(11, `the ledger does not hold a live E3 right after E2 recording the door it installed: ${JSON.stringify(led)}`);
    const c1 = await catalog(db);

    const s1 = JSON.stringify(await sums(db));
    const again = await attempt(db, E3);
    if (again.ok || !/already applied/.test(again.message)) fail(11, `a second E3 was not refused by the ledger: ${again.ok ? 'it ran' : again.message.slice(0, 140)}`);
    if (JSON.stringify(await sums(db)) !== s1 || (await catalog(db)) !== c1) fail(11, 'the refused second E3 changed something');

    const x = await runStatements(db, E3C, E3C_NAME);
    if (!x.ok) fail(11, `E3c statement ${x.at} failed: ${x.code} ${String(x.message).slice(0, 160)}`);
    else {
      const idx = await one(db, `select i.indisvalid and i.indisready as ok, i.indisunique as u from pg_index i where i.indexrelid = to_regclass('public.ugs_one_ranked_day')`);
      if (!idx?.ok || !idx.u) fail(11, 'E3c did not leave a valid unique index');
      const x2 = await attempt(db, statementsOf(E3C, E3C_NAME)[0]);
      if (x2.ok || !/already applied/.test(x2.message)) fail(11, 'a second E3c was not refused by its first statement');
    }
    const c2 = await catalog(db);
    const u0 = await attempt(db, E3_UNDO);
    if (u0.ok || !/later economy step is live/.test(u0.message)) fail(11, `E3's undo ran while E3c was live: ${u0.ok ? 'it ran' : u0.message.slice(0, 140)}`);
    if ((await catalog(db)) !== c2) fail(11, "E3's refused undo changed the catalog");
    const y = await runStatements(db, E3C_UNDO, 'ROLLBACK_' + E3C_NAME);
    if (!y.ok) fail(11, `E3c's undo statement ${y.at} failed: ${y.code} ${String(y.message).slice(0, 160)}`);
    const dy = diffCatalog(c1, await catalog(db));
    if (dy.length) fail(11, `after E3c's undo the catalog is not E3's alone: ${dy.slice(0, 3).join('; ')}`);
    const u1 = await attempt(db, E3_UNDO);
    if (!u1.ok) fail(11, `E3's undo raised: ${u1.code} ${u1.message.slice(0, 160)}`);
    if (CONTROL === 'e3undo') {
      await db.exec('grant insert (score_scale) on table public.game_completions to anon;');
      console.log('   NEGATIVE CONTROL ON: after E3\'s undo anon still holds INSERT on score_scale');
    }
    const d = diffCatalog(c0, await catalog(db));
    if (d.length) fail(11, `after E3's undo the catalog is not what it was before E3 (${d.length} difference(s)): ${d.slice(0, 3).join('; ')}`);
    const u2 = await attempt(db, E3_UNDO);
    if (u2.ok || !/not live/.test(u2.message)) fail(11, `a second E3 undo was not refused as not live (${u2.ok ? 'it ran' : u2.message.slice(0, 120)})`);
    const re = await attempt(db, E3);
    if (!re.ok) fail(11, `E3 did not reapply after its undo: ${re.message.slice(0, 160)}`);
    else {
      const d2 = diffCatalog(c1, await catalog(db));
      if (d2.length) fail(11, `the reapplied E3 is not the first apply (${d2.length} difference(s)): ${d2.slice(0, 3).join('; ')}`);
      await db.exec(SEED);
      at('2026-10-12T16:00:00Z');
      const s = await door(db, U1, 'footle', 'start', RUN(900));
      CLOCK = null;
      if (!s.ok || s.a.claimed !== true) fail(11, `the door did not claim, so the in use undo check proves nothing: ${show(s)}`);
      const b = { s: JSON.stringify(await sums(db)), c: await catalog(db) };
      const u3 = await attempt(db, E3_UNDO);
      if (u3.ok || !/recorded claims/.test(u3.message)) fail(11, `E3's undo ran with a claim recorded: ${u3.ok ? 'it ran' : u3.message.slice(0, 140)}`);
      if (JSON.stringify(await sums(db)) !== b.s || (await catalog(db)) !== b.c) fail(11, 'the refused in use undo changed something');
    }
    if (!fired.has(11)) console.log(`   applied: record_play and name_is_owned definers as proved, 5 internals shut, the board insert on 5 columns under the name rule, game_rules empty, E3 live at seq ${led.seq}; a second E3 refused; E3c valid and refused twice; E3's undo refused under E3c; both undos back to the catalog before E3 across ${JSON.parse(c0).relations.length} relations; the reapply equals the first; the undo refused once a claim exists`);
  }
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(12)) {
  console.log('12) the door\'s cases');
  let e3 = E3;
  if (CONTROL === 'readafter') {
    e3 = plant(e3, '  v_points := private.play_points(p_game, v_claim.et_day);\n', '', "the door's read of the day's points");
    e3 = plant(e3, '  -- 4. the ranked settle, one transaction, one now()\n',
               '  -- 4. the ranked settle, one transaction, one now()\n  v_points := private.play_points(p_game, v_claim.et_day);\n', 'the ranked settle');
    console.log('   NEGATIVE CONTROL ON: the door reads the day\'s points before it writes them');
  }
  if (CONTROL === 'noclaim') {
    e3 = plant(e3, '  elsif exists (select 1 from private.ranked_claims c where c.user_id = v_user and c.game = p_game and c.et_day = v_today) then',
               '  elsif false then', "the finish's check of today's slot");
    e3 = plant(e3, "    values (v_user, p_game, v_today, p_run, v_step, 'open', v_now)\n    returning * into v_claim;",
               "    values (v_user, p_game, v_today, p_run, v_step, 'open', v_now)\n    on conflict (user_id, game, et_day) do update set run_id = excluded.run_id, state = 'open'\n    returning * into v_claim;",
               "the finish's claim");
    console.log('   NEGATIVE CONTROL ON: the door does not check today\'s slot at finish, and its claim takes the slot over');
  }
  if (CONTROL === 'scum') {
    e3 = plant(e3, '    if v_n = 0 then', '    if false then', "the finish's check of season_closes");
    console.log('   NEGATIVE CONTROL ON: a season the save already closed is not refused at finish');
  }
  const db = await chainDb({ e3Text: e3 });
  await db.exec(SEED);
  const expect = (cond, m) => { if (!cond) fail(12, m); };
  const scoresOf = async (uid, game) => (await db.query(`select score, score_scale as s, ranked_day::text as rd, puzzle_date::text as pd, correct_answers as c
                                                           from public.user_game_scores where user_id = $1 and game_type = $2 order by created_at`, [uid, game])).rows;
  const boardRows = (name, game, scored) => count(db, `select 1 from public.game_completions where player_name = $1 and game = $2 and score is ${scored ? 'not ' : ''}null`, [name, game]);
  const refusals = (game, reason) => one(db, `select coalesce(sum(n), 0)::int as n from private.play_refusals where game = $1 and reason = $2`, [game, reason]).then(r => r.n);
  const claimOf = (uid, game, day) => one(db, `select state, score, run_id from private.ranked_claims where user_id = $1 and game = $2 and et_day = $3`, [uid, game, day]);
  const viewPoints = (uid, game, day) => one(db, `select points from public.scored_days where surface = 'account' and who = $1 and game = $2 and day = $3`, [uid, game, day]).then(r => (r ? Number(r.points) : null));

  const D = '2026-10-12';
  at('2026-10-12T16:00:00Z');
  // a. a start claims, a finish settles one ranked result, read back after the writes
  const a1 = await door(db, U1, 'footle', 'start', RUN(1));
  expect(a1.ok && a1.a.claimed === true && a1.a.owner === 'this run' && a1.a.day === D, `a start on a free day did not claim it: ${show(a1)}`);
  tick();
  const a2 = await door(db, U1, 'footle', 'finish', RUN(1), 0, 62, 5, 'NotUsed');
  const v2 = await viewPoints(U1, 'footle', D);
  expect(a2.ok && a2.a.ranked === true && a2.a.day === D, `the claimed run's finish was not ranked on ${D}: ${show(a2)}`);
  expect(v2 === 62 && Number(a2.a.points) === v2, `the finish answered ${a2.a.points} points and scored_days holds ${v2} (62 expected): the answer must be read after the writes`);
  const s2 = await scoresOf(U1, 'footle');
  expect(s2.length === 1 && s2[0].score === 62 && s2[0].s === 'dp' && s2[0].rd === D && s2[0].pd === D && s2[0].c === 5, `user_game_scores after the ranked finish: ${JSON.stringify(s2)}`);
  expect(await boardRows('Alice', 'footle', true) === 1, 'no scored board row under the account\'s display name');
  expect(await count(db, `select 1 from public.game_completions where player_name = 'NotUsed'`) === 0, 'the board row took p_player_name although the account has a display name');
  const br = await one(db, `select score_scale as s, ranked_day::text as d from public.game_completions where player_name = 'Alice' and game = 'footle' and score is not null`);
  expect(br?.s === 'dp' && br?.d === D, `the board row is not tagged like the ranked row: ${JSON.stringify(br)}`);
  expect(await count(db, `select 1 from public.daily_completions where user_id = $1 and game_slug = 'footle' and date = $2`, [U1, D]) === 1, 'no daily tick on the claim day');
  const us1 = await one(db, `select total_points as t, current_streak as c, longest_streak as l, games_played_today as g from public.user_scores where user_id = $1`, [U1]);
  expect(us1?.t === 0 && us1.c === 1 && us1.l === 1 && us1.g === 1, `user_scores after the first ranked day: ${JSON.stringify(us1)}`);

  // b. a retry is idempotent
  tick();
  const sb = JSON.stringify(await sums(db));
  const b1 = await door(db, U1, 'footle', 'finish', RUN(1), 0, 9000, 9, null);
  expect(b1.ok && b1.a.ranked === true && b1.a.day === D && Number(b1.a.points) === 62 && b1.a.repeat === true, `a retry of a settled finish did not answer what it stored: ${show(b1)}`);
  expect(JSON.stringify(await sums(db)) === sb, 'a retry of a settled finish wrote something');

  // c. a second run the same day is practice, one unscored board row
  tick();
  const c1 = await door(db, U1, 'footle', 'start', RUN(2));
  expect(c1.ok && c1.a.claimed === false && c1.a.owner === 'another run' && c1.a.settled === true && c1.a.reason === 'already played', `a second run's start on a settled day: ${show(c1)}`);
  const unscored = await boardRows('Alice', 'footle', false);
  tick();
  const c2 = await door(db, U1, 'footle', 'finish', RUN(2), 0, 100, 10, null);
  expect(c2.ok && c2.a.ranked === false && c2.a.reason === 'already played', `a second run's finish the same day was not practice: ${show(c2)}`);
  expect((await scoresOf(U1, 'footle')).length === 1, 'the practice finish wrote a user_game_scores row');
  expect(await boardRows('Alice', 'footle', false) === unscored + 1, 'the practice finish did not write exactly one unscored board row');

  // d. a clamp is counted, not refused
  tick();
  const d1 = await door(db, U2, 'footle', 'finish', RUN(3), 0, 5000, 3, null);
  expect(d1.ok && d1.a.ranked === true && Number(d1.a.points) === 100 && (await scoresOf(U2, 'footle'))[0]?.score === 100, `a score over the cap was not ranked at the cap: ${show(d1)}`);
  expect(await refusals('footle', 'clamped') === 1, 'the clamp was not counted once');
  expect(await boardRows('Bob', 'footle', true) === 1, "no board row under Bob's display name");

  // e. a negative score and count clamp to 0; a name another account owns is never used
  tick();
  const alice0 = await count(db, `select 1 from public.game_completions where lower(player_name) = 'alice'`);
  const e1 = await door(db, U3, 'footle', 'finish', RUN(4), 0, -5, -1, 'ALICE');
  const s4 = await scoresOf(U3, 'footle');
  expect(e1.ok && e1.a.ranked === true && Number(e1.a.points) === 0 && s4.length === 1 && s4[0].score === 0 && s4[0].c === 0, `a negative score or count was not clamped to 0: ${show(e1)} ${JSON.stringify(s4)}`);
  expect(await refusals('footle', 'clamped') === 2, 'the negative clamp was not counted');
  expect(await count(db, `select 1 from public.game_completions where lower(player_name) = 'alice'`) === alice0, "the door wrote a board row under another account's name");
  expect(await refusals('footle', 'name taken') === 1, 'the refused name was not counted as name taken');
  tick();
  const e2 = await door(db, U3, 'budget-builder', 'finish', RUN(5), 0, 40, 0, 'CarolGuest');
  expect(e2.ok && e2.a.ranked === true && await boardRows('CarolGuest', 'budget-builder', true) === 1, `an account with no name did not file under its free handle: ${show(e2)}`);

  // f. the deal family: the first deal holds the day
  tick();
  const f1 = await door(db, U1, 'budget-builder', 'start', RUN(6));
  tick();
  const f2 = await door(db, U1, 'budget-builder', 'start', RUN(7));
  tick();
  const f3 = await door(db, U1, 'budget-builder', 'finish', RUN(7), 0, 80, 0, null);
  tick();
  const f4 = await door(db, U1, 'budget-builder', 'finish', RUN(6), 0, 30, 0, null);
  expect(f1.a.claimed === true && f2.a.claimed === false && f2.a.reason === 'another run' && f3.a.ranked === false && f3.a.reason === 'another run'
         && f4.a.ranked === true && Number(f4.a.points) === 30,
         `the deal family: first deal ${show(f1)}, second deal ${show(f2)}, second finish ${show(f3)}, first finish ${show(f4)}`);

  // g. an unknown game, a for fun game, a paying game with no open period
  tick();
  const g0 = await boardRows('Alice', 'who-am-i', false);
  const g1 = await door(db, U1, 'who-am-i', 'finish', RUN(8), 0, 50, 0, null);
  expect(g1.ok && g1.a.ranked === false && g1.a.reason === 'old client' && await boardRows('Alice', 'who-am-i', false) === g0 + 1 && await refusals('who-am-i', 'unknown game') === 1,
         `an unknown game: ${show(g1)}`);
  tick();
  const g2 = await door(db, U1, 'hof-or-bust', 'start', RUN(9));
  tick();
  const g3 = await door(db, U1, 'hof-or-bust', 'finish', RUN(9), 0, 800, 1, null);
  expect(g2.a.claimed === false && g2.a.reason === 'fun' && g3.a.ranked === false && g3.a.reason === 'fun' && await boardRows('Alice', 'hof-or-bust', false) === 1
         && (await scoresOf(U1, 'hof-or-bust')).length === 0 && !(await claimOf(U1, 'hof-or-bust', D)),
         `a for fun game: ${show(g2)} ${show(g3)}`);
  tick();
  const g4 = await door(db, U1, 'ball-iq', 'finish', RUN(10), 0, 1200, 9, null);
  expect(g4.a.ranked === false && g4.a.reason === 'no open cap' && await refusals('ball-iq', 'no open cap') === 1 && (await scoresOf(U1, 'ball-iq')).length === 0,
         `a paying game with no open period: ${show(g4)}`);

  // h. the career family claims at the first finish of the day
  tick();
  const h1 = await door(db, U1, 'soccer-career', 'start', RUN(11));
  tick();
  const h2 = await door(db, U1, 'soccer-career', 'finish', RUN(11), 0, 55, 0, null);
  tick();
  const h3 = await door(db, U1, 'soccer-career', 'finish', RUN(12), 0, 70, 0, null);
  expect(h1.a.claimed === false && h1.a.reason === 'claims at finish' && h2.a.ranked === true && Number(h2.a.points) === 55 && h3.a.ranked === false && h3.a.reason === 'already played',
         `the career family: ${show(h1)} ${show(h2)} ${show(h3)}`);

  // i. seasons: a new save forfeits the open season, one ranked season a day
  tick();
  const i1 = await door(db, U1, 'nba-front-office', 'start', RUN(21), 1);
  expect(i1.a.claimed === true && i1.a.day === D, `a season's week one did not claim: ${show(i1)}`);
  const D1 = '2026-10-13';
  at('2026-10-13T16:00:00Z');
  const i2 = await door(db, U1, 'nba-front-office', 'start', RUN(22), 1);
  const i2c = await claimOf(U1, 'nba-front-office', D);
  expect(i2.a.claimed === true && i2.a.day === D1 && i2c?.state === 'forfeit' && i2c.score === 0, `a new save the next day did not forfeit the open season at 0 and claim: ${show(i2)} ${JSON.stringify(i2c)}`);
  tick();
  const i3 = await door(db, U1, 'nba-front-office', 'finish', RUN(21), 1, 90, 0, null);
  tick();
  const i4 = await door(db, U1, 'nba-front-office', 'finish', RUN(22), 1, 45, 0, null);
  expect(i3.a.ranked === false && i3.a.reason === 'forfeit' && i4.a.ranked === true && i4.a.day === D1 && Number(i4.a.points) === 45,
         `the forfeited season's close and the new save's: ${show(i3)} ${show(i4)}`);
  expect(await count(db, `select 1 from private.season_closes where user_id = $1 and save_id = $2 and season = 1`, [U1, RUN(22)]) === 1, 'the ranked season close was not recorded in season_closes');
  tick();
  const i5 = await door(db, U1, 'nba-front-office', 'start', RUN(23), 1);
  tick();
  const i6 = await door(db, U1, 'nba-front-office', 'finish', RUN(23), 1, 99, 0, null);
  expect(i5.a.claimed === false && i6.a.ranked === false, `a second season the same day was not practice: ${show(i5)} ${show(i6)}`);
  tick();
  const i7 = await door(db, U2, 'nba-front-office', 'start', RUN(24), 1);
  tick();
  const i8 = await door(db, U2, 'nba-front-office', 'start', RUN(25), 1);
  tick();
  const i9 = await door(db, U2, 'nba-front-office', 'finish', RUN(24), 1, 50, 0, null);
  tick();
  const i10 = await door(db, U2, 'nba-front-office', 'finish', RUN(25), 1, 50, 0, null);
  expect(i7.a.claimed === true && i8.a.claimed === false && i8.a.reason === 'forfeit' && i9.a.reason === 'forfeit' && i10.a.ranked === false && i10.a.reason === 'forfeit'
         && (await scoresOf(U2, 'nba-front-office')).length === 0,
         `a new save the same day forfeits the open season and plays practice: ${show(i7)} ${show(i8)} ${show(i9)} ${show(i10)}`);
  const i11 = await door(db, U2, 'nba-front-office', 'start', RUN(26), 0);
  expect(!i11.ok && i11.code === '22023', `a season start with no season number was not refused 22023: ${show(i11)}`);
  const us2 = await one(db, `select current_streak as c, total_points as t from public.user_scores where user_id = $1`, [U1]);
  expect(us2?.c === 2 && us2.t === 0, `after ranked days on ${D} and ${D1} the streak is ${us2?.c} (2 expected) and total_points ${us2?.t} (0 expected)`);

  // j. a save scummed close: refused at start, and at finish if a claim got through
  const D2 = '2026-10-14';
  at('2026-10-14T16:00:00Z');
  const j1 = await door(db, U1, 'nba-front-office', 'start', RUN(22), 1);
  expect(j1.a.claimed === false && j1.a.owner === 'closed', `a restored save's closed season was claimed again at start: ${show(j1)}`);
  tick();
  const sj = JSON.stringify(await sums(db));
  const j2 = await door(db, U1, 'nba-front-office', 'finish', RUN(22), 1, 99, 0, null);
  expect(j2.a.repeat === true && j2.a.day === D1 && Number(j2.a.points) === 45 && JSON.stringify(await sums(db)) === sj,
         `a restored save's close of a closed season did not answer the stored result without writing: ${show(j2)}`);
  await db.exec(`insert into private.ranked_claims (user_id, game, et_day, run_id, step, state) values ('${U1}', 'nba-front-office', '${D2}', '${RUN(22)}', 1, 'open')`);
  tick();
  const j3 = await door(db, U1, 'nba-front-office', 'finish', RUN(22), 1, 99, 0, null);
  const j3c = await claimOf(U1, 'nba-front-office', D2);
  expect(j3.a.ranked === false && j3.a.reason === 'season closed' && j3c?.state === 'forfeit' && (await scoresOf(U1, 'nba-front-office')).length === 1,
         `a claim past the start for a season the save already closed was not refused at finish: ${show(j3)} ${JSON.stringify(j3c)}`);

  // k. another account's rows are untouchable through any parameter
  const snap = async () => JSON.stringify(await one(db, `select
      (select md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from public.user_game_scores x where user_id = $1) as ugs,
      (select md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from public.daily_completions x where user_id = $1) as daily,
      (select md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from public.user_scores x where user_id = $1) as us,
      (select md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from private.ranked_claims x where user_id = $1) as claims,
      (select md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from private.season_closes x where user_id = $1) as closes,
      (select md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from public.game_completions x where lower(player_name) = 'alice') as board`, [U1]));
  const k0 = await snap();
  const PROBES = [
    ['footle', 'start', RUN(1), 0, null, 'Alice'], ['footle', 'finish', RUN(1), 0, 100, 'Alice'],
    ['budget-builder', 'start', RUN(6), 0, null, 'alice'], ['budget-builder', 'finish', RUN(6), 0, 100, 'Alice'],
    ['soccer-career', 'finish', RUN(11), 0, 100, 'ALICE'],
    ['nba-front-office', 'start', RUN(22), 1, null, 'Alice'], ['nba-front-office', 'finish', RUN(22), 1, 100, 'Alice'],
  ];
  let dave = 0;
  for (const [g, ph, run, st, sc, nm] of PROBES) {
    tick();
    const k = await door(db, U4, g, ph, run, st, sc, 0, nm);
    if (k.ok) dave += 1;
  }
  expect((await snap()) === k0, "a call by another account, passing this account's run ids and name, changed this account's rows");
  expect(dave === PROBES.length && await count(db, `select 1 from private.ranked_claims where user_id = $1`, [U4]) >= 1
         && await count(db, `select 1 from public.game_completions where player_name = 'Shared' and score is not null`) >= 1,
         "the other account's own calls did not land on its own rows under its own name");

  // l. malformed calls are refused before any write
  const sl = JSON.stringify(await sums(db));
  for (const [g, ph, run] of [['g'.repeat(65), 'finish', RUN(30)], ['footle', 'bogus', RUN(30)], ['footle', 'finish', null]]) {
    const l = await door(db, U2, g, ph, run, 0, 10, 0, null);
    expect(!l.ok && l.code === '22023', `a malformed call (${g.slice(0, 12)}, ${ph}, ${run}) was not refused 22023: ${show(l)}`);
  }
  const nouser = await asRole(db, 'authenticated', null, `select public.record_play('footle', 'finish', $1, 0, 10, 0, null)`, [RUN(31)]);
  expect(!nouser.ok && /needs a signed in user/.test(nouser.message), `a call with no signed in user: ${nouser.ok ? 'ACCEPTED' : nouser.message}`);
  expect(JSON.stringify(await sums(db)) === sl, 'a refused call wrote something');

  // m. the door never touches total_points and never writes a best score
  const tp = await one(db, `select (select count(*) from public.user_scores where total_points <> 0)::int as moved, (select count(*) from public.user_best_scores)::int as bests`);
  expect(tp.moved === 0 && tp.bests === 0, `the door moved total_points on ${tp.moved} accounts or wrote ${tp.bests} best scores`);
  CLOCK = null;
  if (!fired.has(12)) console.log('   start and finish, read after the writes; retry idempotent; a second run practice with one unscored row; clamps counted; an owned name never used; deal, career and for fun families; unknown game; no open cap; season forfeit, one season a day, a scummed close refused at start and at finish; another account untouchable; malformed calls refused; total_points never moved');
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(13)) {
  console.log('13) the Eastern day: 23:30 and 00:30, the 2026-11-01 clock change, a run across midnight, the 24 hour expiry, a season\'s day');
  let e3 = E3;
  if (CONTROL === 'midnight') {
    e3 = plant(e3, '  values (v_user, p_game, v_score, v_correct, v_claim.et_day, v_tag, v_claim.et_day);',
               '  values (v_user, p_game, v_score, v_correct, v_today, v_tag, v_today);', "the ranked row's day");
    console.log('   NEGATIVE CONTROL ON: the ranked row goes on the finish\'s day, not the claim\'s');
  }
  const db = await chainDb({ e3Text: e3 });
  await db.exec(SEED);
  const expect = (cond, m) => { if (!cond) fail(13, m); };
  const dayOf = (uid, game) => db.query(`select ranked_day::text as rd, puzzle_date::text as pd from public.user_game_scores where user_id = $1 and game_type = $2 order by created_at`, [uid, game]).then(r => r.rows);
  const INSTANTS = [
    ['2026-10-21T03:30:00Z', '2026-10-20', '23:30 EDT', U1],
    ['2026-10-21T04:30:00Z', '2026-10-21', '00:30 EDT', U1],
    ['2026-11-01T04:30:00Z', '2026-11-01', '00:30 EDT on the day the clocks go back', U2],
    ['2026-11-01T05:30:00Z', '2026-11-01', 'the first 01:30 (EDT)', U3],
    ['2026-11-01T06:30:00Z', '2026-11-01', 'the second 01:30 (EST)', U4],
    ['2026-11-02T04:30:00Z', '2026-11-01', '23:30 EST', U5],
    ['2026-11-02T05:30:00Z', '2026-11-02', '00:30 EST the next day', U2],
  ];
  /* in clock order: the cases of 2026-10-05 to 2026-10-11 first, then the
     instants of 2026-10-20 to 2026-11-02, on a game those cases do not touch */
  at('2026-10-05T03:30:00Z');
  const m1 = await door(db, U1, 'footle', 'start', RUN(200));
  at('2026-10-05T04:30:00Z');
  const m2 = await door(db, U1, 'footle', 'finish', RUN(200), 0, 70, 7, null);
  const md = await dayOf(U1, 'footle');
  const mb = await one(db, `select ranked_day::text as d from public.game_completions where player_name = 'Alice' and game = 'footle' and score is not null`);
  const mt = await count(db, `select 1 from public.daily_completions where user_id = $1 and game_slug = 'footle' and date = '2026-10-04'`, [U1]);
  expect(m1.a.claimed === true && m1.a.day === '2026-10-04' && m2.a.ranked === true && m2.a.day === '2026-10-04' && Number(m2.a.points) === 70
         && md.length === 1 && md[0].rd === '2026-10-04' && md[0].pd === '2026-10-04' && mb?.d === '2026-10-04' && mt === 1,
         `a run dealt at 23:30 and finished at 00:30 did not keep its day: ${show(m1)} ${show(m2)} rows ${JSON.stringify(md)} board ${mb?.d} tick ${mt}`);
  tick(60000);
  const m3 = await door(db, U1, 'footle', 'start', RUN(201));
  expect(m3.a.claimed === true && m3.a.day === '2026-10-05', `a new run after midnight did not get the new day's slot: ${show(m3)}`);
  at('2026-10-06T12:00:00Z');
  const x1 = await door(db, U2, 'footle', 'start', RUN(210));
  at('2026-10-07T13:00:00Z');
  const x2 = await door(db, U2, 'footle', 'finish', RUN(210), 0, 70, 7, null);
  const xc = await one(db, `select state from private.ranked_claims where user_id = $1 and game = 'footle' and et_day = '2026-10-06'`, [U2]);
  expect(x1.a.claimed === true && x2.a.ranked === false && x2.a.reason === 'expired' && xc?.state === 'forfeit' && (await dayOf(U2, 'footle')).length === 0,
         `a claim 25 hours old was not expired: ${show(x1)} ${show(x2)} ${JSON.stringify(xc)}`);
  at('2026-10-08T16:00:00Z');
  const y1 = await door(db, U3, 'nba-front-office', 'start', RUN(220), 1);
  at('2026-10-11T16:00:00Z');
  const y2 = await door(db, U3, 'nba-front-office', 'finish', RUN(220), 1, 60, 0, null);
  const yd = await dayOf(U3, 'nba-front-office');
  expect(y1.a.claimed === true && y2.a.ranked === true && y2.a.day === '2026-10-08' && yd.length === 1 && yd[0].rd === '2026-10-08',
         `a season begun on 2026-10-08 and closed on 2026-10-11 did not keep its day: ${show(y2)} ${JSON.stringify(yd)}`);
  for (const [i, [iso, day, what, uid]] of INSTANTS.entries()) {
    at(iso);
    const f = await door(db, uid, 'soccer-career', 'finish', RUN(100 + i), 0, 40, 0, null);
    const rows = (await dayOf(uid, 'soccer-career')).filter(r => r.rd === day);
    const tickd = await count(db, `select 1 from public.daily_completions where user_id = $1 and game_slug = 'soccer-career' and date = $2`, [uid, day]);
    expect(f.ok && f.a.ranked === true && f.a.day === day && rows.length === 1 && rows[0].pd === day && tickd === 1,
           `${what} (${iso}): the door put the play on ${f.a.day} (expected ${day}), ${rows.length} row(s) on that day, ${tickd} tick(s): ${show(f)}`);
  }
  CLOCK = null;
  if (!fired.has(13)) console.log(`   ${INSTANTS.length} instants on their Eastern days (both 01:30s of 2026-11-01 on 11-01); 23:30 to 00:30 keeps the dealt day; a 25 hour old claim expires; a season keeps its week one day`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(14)) {
  console.log('14) the name rule and the tagged columns, as the client roles');
  if (CONTROL === 'nosetrole') console.log('   NEGATIVE CONTROL ON: the probes run as the superuser instead of the client roles');
  let e3 = E3;
  if (CONTROL === 'sharedname') {
    e3 = plant(e3, '     and not exists (select 1 from public.profiles p\n                      where p.user_id = p_caller',
               '     and not exists (select 1 from public.profiles p\n                      where false', "name_is_owned's own name exemption");
    console.log('   NEGATIVE CONTROL ON: name_is_owned has no exemption for the caller\'s own name');
  }
  const db = await chainDb({ e3Text: e3 });
  await db.exec(SEED);
  at('2026-10-15T16:00:00Z');
  const TAG = { cols: ', score_scale, ranked_day', vals: ', $2, $3::date' };
  const CASES = [
    ['a guest under an account\'s display name', 'anon', null, 'Alice', null, false],
    ['a guest under a display name in other case', 'anon', null, 'aLiCe', null, false],
    ['a guest under an account\'s username, case folded', 'anon', null, 'BOB_THE_BUILDER', null, false],
    ['a guest under a name two accounts share', 'anon', null, 'SHARED', null, false],
    ['a guest under a fresh handle', 'anon', null, 'FreshGuest123', null, true],
    ['an account\'s own tab under its own display name', 'authenticated', U1, 'Alice', null, true],
    ['an account\'s own tab under its own username', 'authenticated', U2, 'bob_the_builder', null, true],
    ['an account under another account\'s display name', 'authenticated', U1, 'Bob', null, false],
    ['one owner of a shared name, under it', 'authenticated', U4, 'Shared', null, true],
    ['the other owner of a shared name, under it', 'authenticated', U5, 'SHARED', null, true],
    ['an account with no name, under a fresh handle', 'authenticated', U3, 'CarolGuest', null, true],
    ['a guest row tagged dp for today', 'anon', null, 'FreshGuest123', ['dp', '2026-10-15'], true],
    ['a guest row tagged dp for yesterday', 'anon', null, 'FreshGuest123', ['dp', '2026-10-14'], true],
    ['a guest row with a forged scale', 'anon', null, 'FreshGuest123', ['forged', '2026-10-15'], false],
    ['a guest row two days back', 'anon', null, 'FreshGuest123', ['dp', '2026-10-13'], false],
    ['a guest row for tomorrow', 'anon', null, 'FreshGuest123', ['dp', '2026-10-16'], false],
  ];
  let checked = 0;
  for (const [what, role, uid, name, tag, ok] of CASES) {
    const sql = `insert into public.game_completions (game, score, player_name${tag ? TAG.cols : ''}) values ('footle', 10, $1${tag ? TAG.vals : ''})`;
    const r = await asRole(db, role, uid, sql, tag ? [name, ...tag] : [name]);
    if (ok && !r.ok) fail(14, `${what}: REFUSED (${r.code} ${String(r.message).slice(0, 100)})`);
    else if (!ok && r.ok) fail(14, `${what}: ACCEPTED`);
    else if (!ok && r.code !== '42501') fail(14, `${what}: refused with ${r.code} (${String(r.message).slice(0, 80)}), not by the policy`);
    else checked += 1;
  }
  const backdate = await asRole(db, 'anon', null, `insert into public.game_completions (game, score, player_name, created_at) values ('footle', 10, 'FreshGuest123', now() - interval '3 days')`);
  if (backdate.ok || backdate.code !== '42501') fail(14, `a guest set created_at after E3: ${backdate.ok ? 'ACCEPTED' : backdate.code}`);
  const anonDoor = await asRole(db, 'anon', U1, `select public.record_play('footle', 'start', $1, 0, null, null, null)`, [RUN(300)]);
  if (anonDoor.ok || anonDoor.code !== '42501') fail(14, `anon calling record_play: ${anonDoor.ok ? 'ACCEPTED' : anonDoor.code + ' ' + anonDoor.message}, expected 42501`);
  CLOCK = null;
  if (!fired.has(14)) console.log(`   ${checked} board inserts as the client roles each landed or were refused 42501 as the rule says (owned names case folded, own and shared names kept, tags bounded); a backdated row refused; anon cannot call the door`);
  await db.close();
}

// ---------------------------------------------------------------------------
if (on(15)) {
  console.log('15) the held T0 shim: a claim at finish through the door\'s settle');
  const db = await chainDb();
  await db.exec(SEED);
  const expect = (cond, m) => { if (!cond) fail(15, m); };
  const r = await attempt(db, SHIM);
  if (!r.ok) fail(15, `the held shim did not apply over E3: ${r.code} ${r.message.slice(0, 160)}`);
  else {
    if (CONTROL === 'overload') {
      await db.exec(`create function public.record_auth_completion(p_game_slug text, p_score integer, p_correct integer, p_extra integer default 0)
                     returns jsonb language sql security definer set search_path = '' as $$ select null::jsonb $$;`);
      console.log('   NEGATIVE CONTROL ON: a 4 argument record_auth_completion with a default beside the shim');
    }
    const f = await one(db, `select prosecdef as d, proconfig as c, has_function_privilege('anon', oid, 'EXECUTE') as anon,
                                    has_function_privilege('authenticated', oid, 'EXECUTE') as auth, prosrc ~* '\\mexecute\\M|\\mformat\\s*\\(' as dyn
                               from pg_proc where oid = to_regprocedure('public.record_auth_completion(text,integer,integer)')`);
    expect(f?.d && f.c?.[0] === 'search_path=""' && !f.anon && f.auth && !f.dyn, `the shim is not a fixed SQL definer, search_path empty, authenticated only: ${JSON.stringify(f)}`);
    const D = '2026-10-20';
    at('2026-10-20T16:00:00Z');
    const shim = (uid, game, score, correct) => asRole(db, 'authenticated', uid, `select public.record_auth_completion($1, $2, $3)::text as r`, [game, score, correct]);
    const rowsOf = (uid, game) => db.query(`select score, score_scale as s, ranked_day::text as rd from public.user_game_scores where user_id = $1 and game_type = $2`, [uid, game]).then(x => x.rows);
    const b0 = await count(db, 'select 1 from public.game_completions');
    const s1 = await shim(U2, 'footle', 70, 3);
    if (!s1.ok) fail(15, `the 3 argument call failed: ${s1.code} ${String(s1.message).slice(0, 140)}`);
    else {
      const a = JSON.parse(s1.rows[0].r);
      const rows = await rowsOf(U2, 'footle');
      const best = await one(db, `select best_score as b from public.user_best_scores where user_id = $1 and game_type = 'footle'`, [U2]);
      const us = await one(db, `select total_points as t from public.user_scores where user_id = $1`, [U2]);
      const view = await one(db, `select points from public.scored_days where surface = 'account' and who = $1 and game = 'footle' and day = $2`, [U2, D]);
      expect(a.ranked === true && a.day === D && a.total_points === 0 && 'current_streak' in a && 'games_played_today' in a, `the shim's answer: ${s1.rows[0].r}`);
      expect(rows.length === 1 && rows[0].score === 70 && rows[0].s === null && rows[0].rd === D, `the shim's row is not untagged on the claim day: ${JSON.stringify(rows)}`);
      expect(best?.b === 70 && us?.t === 0, `the shim did not write the best (${best?.b}) or moved total_points (${us?.t})`);
      expect(await count(db, 'select 1 from public.game_completions') === b0, 'the shim wrote a board row, which the old client already writes');
      expect(view && Number(view.points) === Number(a.points), `the shim answered ${a.points} points, scored_days holds ${view?.points}`);
      tick();
      const s2 = await shim(U2, 'footle', 90, 1);
      const a2 = s2.ok ? JSON.parse(s2.rows[0].r) : {};
      expect(s2.ok && a2.ranked === false && a2.reason === 'already played' && (await rowsOf(U2, 'footle')).length === 1
             && (await one(db, `select best_score as b from public.user_best_scores where user_id = $1 and game_type = 'footle'`, [U2])).b === 70,
             `a second shim finish the same day was not practice: ${s2.ok ? s2.rows[0].r : s2.message}`);
      tick();
      const d1 = await door(db, U2, 'footle', 'finish', RUN(400), 0, 99, 0, null);
      expect(d1.a.ranked === false && d1.a.reason === 'already played', `the door after a shim finish the same day: ${show(d1)}`);
      tick();
      const s3 = await shim(U3, 'footle', 999999, 1);
      expect(s3.ok && (await rowsOf(U3, 'footle'))[0]?.score === 1400 && await count(db, `select 1 from private.play_refusals where game = 'footle' and reason = 'clamped'`) === 1,
             `the shim did not clamp to the hard maximum and count it: ${s3.ok ? s3.rows[0].r : s3.message}`);
      tick();
      const s4 = await shim(U3, 'not-a-game', 5, 0);
      const a4 = s4.ok ? JSON.parse(s4.rows[0].r) : {};
      expect(s4.ok && a4.ranked === false && a4.reason === 'old client' && (await rowsOf(U3, 'not-a-game')).length === 0, `an unknown game through the shim: ${s4.ok ? s4.rows[0].r : s4.message}`);
      const an = await asRole(db, 'anon', U2, `select public.record_auth_completion('footle', 1, 0)`);
      expect(!an.ok && an.code === '42501', `anon calling the shim: ${an.ok ? 'ACCEPTED' : an.code}`);
    }
  }
  CLOCK = null;
  if (!fired.has(15)) console.log('   one definer signature; a claim at finish, untagged on the Eastern day, best written, total_points untouched, no board row; a second finish practice; door and shim share the day; clamped to the hard maximum and counted; unknown game answered; anon refused');
  await db.close();
}

// ---------------------------------------------------------------------------
if (CONTROL) {
  const missing = WANT.filter(n => !fired.has(n));
  const leaked = [...fired].filter(n => !WANT.includes(n));
  if (missing.length) { console.error(`\nsimEconomyMigrations: CONTROL ${CONTROL}: section ${missing.join(' and ')} did NOT fire. The check is not measuring what it claims to.`); process.exit(1); }
  if (leaked.length) { console.error(`\nsimEconomyMigrations: CONTROL ${CONTROL} fired section ${WANT.join(' and ')} but also ${leaked.join(', ')}.`); process.exit(1); }
  console.log(`\nsimEconomyMigrations: CONTROL ${CONTROL}: section ${WANT.join(' and ')} fired, as it must.`);
  process.exit(0);
}
if (failures) { console.error(`\nsimEconomyMigrations: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimEconomyMigrations: green. L1 refuses a drifted production, applies once, keeps the Round 569 arithmetic byte for byte, refuses every abuse without writing, shuts every direct write, undoes to the catalog it found and reapplies to the same place. E3 refuses what it does not stand on, applies once, undoes and reapplies with E3c; the door keeps one ranked result a day through every case, on the Eastern day; the name rule holds as the client roles; the held shim claims at finish.');
