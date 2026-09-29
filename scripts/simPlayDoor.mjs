/**
 * simPlayDoor: only the save writes the account tables (rule 7 of
 * docs/design/POINTS-ECONOMY-V2.md on the points-economy branch). Round 673.
 *
 * THE HOLE THIS EXISTS FOR, read only on production 2026-09-28. anon and
 * authenticated held INSERT, UPDATE, DELETE and TRUNCATE on user_scores,
 * user_game_scores, user_best_scores, daily_completions, game_completions and
 * game_score_caps, with row level security the only barrier. A signed in
 * player could PATCH their own total_points through the API, insert an
 * unbounded score row, and anyone could post a backdated board row under any
 * name. Economy step L1 (supabase/migrations/20260928_econ_l1_lock_the_doors.sql)
 * closes it: the save becomes SECURITY DEFINER with fixed SQL, direct write
 * grants and the client write policies go, and the board insert is three
 * columns with length bounds. This harness keeps it closed.
 *
 * WHAT IT READS. Two things, because the anon key cannot read the catalog:
 *   the SNAPSHOT, scripts/data/playDoorCatalog.json, the output of the read
 *     only query scripts/data/playDoorCatalog.sql run through the Supabase
 *     MCP. Its "source" says where it came from: "dry-run" (captured inside a
 *     rolled back transaction right after L1 ran on production, so it is the
 *     catalog L1 produces) or "production" (captured after the apply).
 *   the LIVE database, probed as anon over the REST API with requests that
 *     cannot write whatever the grants are: an UPDATE or DELETE filtered to an
 *     id that does not exist, or an INSERT whose body fails to parse. The
 *     privilege check runs before the parse, so a revoked grant answers 42501
 *     and an open one answers the parse error, and no row is ever written.
 *
 * WHAT IT HOLDS.
 *   1. GRANTS. anon and authenticated hold SELECT and nothing else at table
 *      level on the six tables; no column UPDATE or REFERENCES anywhere; column
 *      INSERT only on game_completions and only game, player_name, score. The
 *      client's own board insert (src/lib/completions.ts, read as code) sends
 *      exactly those columns, and no module in src or supabase/functions
 *      writes any of the six tables except that one insert.
 *   2. POLICIES. No INSERT, UPDATE, DELETE or ALL policy on the four account
 *      tables or game_score_caps; one write policy on game_completions, the
 *      bounded insert (game 1 to 64, player_name 1 to 40); every table keeps a
 *      public read.
 *   3. THE DEFINER ALLOWLIST. Every SECURITY DEFINER function in public is
 *      admin_exists, app_secret, handle_new_user, has_role,
 *      record_auth_completion (while it lives), record_play, name_is_owned or
 *      claim_daily_badge. app_secret is not in the spec's list; it was found
 *      live on 2026-09-28 and is the scores-poll secret reader, which no
 *      client role may execute.
 *   4. THE BODIES. No definer body holds execute or format(. A door (a
 *      definer the economy chain installed) pins search_path empty, is not
 *      executable by anon or PUBLIC, and its md5 is in a live row of
 *      private.economy_steps. The four definers that predate the chain are
 *      pinned by md5 and by who may execute them, so any change to one is a
 *      decision somebody re-pins here. record_auth_completion's body stays the
 *      Round 569 arithmetic byte for byte until T0 (Round 691).
 *   5. OVERLOADS. Exactly one pg_proc row per door name that exists, and
 *      exactly one record_auth_completion: a second signature with a default
 *      makes every 3 argument call ambiguous (PGRST203), which would fail
 *      every signed in save.
 *   6. THE LEDGER. L1 is live in private.economy_steps, the save's md5 is the
 *      one L1 recorded, RLS is on and no client role can read it.
 *   7. LIVE, read only, anon. The six write probes agree with each other
 *      (all shut or all open; a mix is a partial apply and fails), and the
 *      client's board insert still passes the privilege check. While the
 *      snapshot says dry-run, an open door is reported as PENDING (L1 not
 *      applied yet) and a shut one fails until the snapshot is refreshed from
 *      production; once it says production, the door must be shut.
 *   8. MIGRATIONS AFTER L1. No committed migration after L1 grants a table
 *      level write, or any column UPDATE, on the six tables to a client role,
 *      or creates a write policy on the account tables or game_score_caps.
 *      ROLLBACK_ files are skipped: an undo is the way back, not a migration.
 *
 * WHY THE SAVE IS DEFINER NOW. Until Round 673 the house rule was "never
 * SECURITY DEFINER" (the exec_sql incident of 2026-08-25). That rule is about
 * functions that run arbitrary SQL. An INVOKER save needs the player to hold
 * write grants on the tables it writes, and that grant IS the hole. A definer
 * with fixed SQL, auth.uid() only, a pinned empty search_path and EXECUTE for
 * authenticated only is the narrower door. simAuthSave section 3 holds the
 * source side of the same rule.
 *
 * CONTROLS, PLAY_DOOR_CONTROL=<name>, each planted into the loaded snapshot
 * (never into the file), refusing to run if its plant changes nothing, and
 * required to turn its own section red and no other:
 *   grant     authenticated gets UPDATE on user_scores back      section 1
 *   policy    user_scores_upd comes back                          section 2
 *   definer   a definer exec_sql(text) appears                     section 3
 *   body      record_auth_completion's body gains an execute       section 4
 *   overload  a second record_auth_completion signature            section 5
 *   regrant   a migration after L1 grants UPDATE on user_scores    section 8
 *   livesource the snapshot's source flipped (dry-run and production
 *              swapped), so the live door no longer matches what the
 *              snapshot says: red whether L1 is pending or applied  section 7
 * Section 7 runs only under livesource; every other control is judged on its
 * own section.
 *
 * Run: node scripts/simPlayDoor.mjs            (section 7 needs the network)
 *      node scripts/simPlayDoor.mjs --query    prints the catalog query
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fetchWithTransportRetry } from './lib/fetchWithTransportRetry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUERY_FILE = path.join(ROOT, 'scripts', 'data', 'playDoorCatalog.sql');
const FIXTURE_FILE = path.join(ROOT, 'scripts', 'data', 'playDoorCatalog.json');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');
const L1_FILE = '20260928_econ_l1_lock_the_doors.sql';

const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');

if (process.argv.includes('--query')) {
  process.stdout.write(readLF(QUERY_FILE));
  process.exit(0);
}

const CONTROL = process.env.PLAY_DOOR_CONTROL || '';
const EXPECT = { grant: 1, policy: 2, definer: 3, body: 4, overload: 5, livesource: 7, regrant: 8 };
if (CONTROL && !EXPECT[CONTROL]) {
  console.error(`PLAY_DOOR_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}

const SIX = ['daily_completions', 'game_completions', 'game_score_caps', 'user_best_scores', 'user_game_scores', 'user_scores'];
const NO_WRITE_POLICY = ['daily_completions', 'game_score_caps', 'user_best_scores', 'user_game_scores', 'user_scores'];
const CLIENT_ROLES = ['anon', 'authenticated'];
const BOARD_INSERT_COLUMNS = ['game', 'player_name', 'score'];
const DOOR_NAMES = ['record_auth_completion', 'record_play', 'name_is_owned', 'claim_daily_badge'];
const ALLOWLIST = new Set(['admin_exists', 'app_secret', 'handle_new_user', 'has_role', ...DOOR_NAMES]);
/* The definers that predate the chain, as read on production 2026-09-28. A
   change to any of these is not wrong by itself, but it is a change to a
   function that runs as the table owner, so it fails here until somebody
   reads it and re-pins it. */
const LEGACY = {
  'admin_exists(text)': { md5: '6098953677c963a40e218d99776c8023', anon: true, authenticated: true },
  'app_secret(text)': { md5: '9a79b3787c93fcb3f9ed306db3511ece', anon: false, authenticated: false },
  'handle_new_user()': { md5: '966c4daebe578e3a71d762e7f804e096', anon: false, authenticated: false },
  'has_role(uuid,app_role)': { md5: '964712856503e0a31d73451d32629426', anon: false, authenticated: true },
};
/* md5(prosrc) of the Round 569 save body, read inside L1's dry run: L1 keeps
   it byte for byte, and only T0 (Round 691) may change it. */
const SAVE_569_SRC_MD5 = 'd4044c9c19fc6d9e68ca70236b36c853';

let failures = 0;
const fired = new Set();
const fail = (n, m) => { fired.add(n); failures += 1; console.error('  FAIL: ' + m); };

const plantFail = m => {
  console.error(`CONTROL ${CONTROL} cannot run: ${m}, so the plant would change nothing and a green run would prove nothing.`);
  process.exit(2);
};

// ---------------------------------------------------------------------------
console.log('0) the snapshot is the output of the committed query');
const fixture = JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf8'));
const queryMd5 = crypto.createHash('md5').update(readLF(QUERY_FILE)).digest('hex');
if (fixture.query_md5 !== queryMd5) {
  fail(0, `playDoorCatalog.json was captured with a different query (query_md5 ${fixture.query_md5}, the file is ${queryMd5}). Rerun the query and refresh the snapshot`);
}
if (!['dry-run', 'production'].includes(fixture.source)) fail(0, `snapshot source "${fixture.source}" is neither dry-run nor production`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fixture.captured || ''))) fail(0, 'snapshot has no captured date');
const cat = structuredClone(fixture.catalog || {});
if (!fired.has(0)) console.log(`   ${fixture.source} snapshot of ${fixture.captured}, query ${queryMd5.slice(0, 8)}`);

// --- the controls, planted into the loaded snapshot -------------------------
let extraMigration = null;
if (CONTROL === 'grant') {
  const k = 'authenticated user_scores';
  if (!Array.isArray(cat.table_privileges?.[k]) || cat.table_privileges[k].includes('UPDATE')) plantFail(`table_privileges["${k}"] is missing or already holds UPDATE`);
  cat.table_privileges[k] = [...cat.table_privileges[k], 'UPDATE'];
  console.log('   NEGATIVE CONTROL ON: authenticated holds UPDATE on user_scores again');
}
if (CONTROL === 'policy') {
  if (!Array.isArray(cat.policies) || cat.policies.some(p => p.n === 'user_scores_upd')) plantFail('the snapshot has no policy list, or user_scores_upd is already in it');
  cat.policies.push({ n: 'user_scores_upd', t: 'user_scores', cmd: 'UPDATE', check: '(auth.uid() = user_id)', roles: '{public}', using: '(auth.uid() = user_id)' });
  console.log('   NEGATIVE CONTROL ON: the user_scores UPDATE policy is back');
}
if (CONTROL === 'definer') {
  if (!Array.isArray(cat.definers) || cat.definers.some(d => d.name === 'exec_sql')) plantFail('the snapshot has no definer list, or exec_sql is already in it');
  cat.definers.push({ fn: 'exec_sql(text)', md5: '0'.repeat(32), name: 'exec_sql', owner: 'postgres', config: ['search_path=""'], anon_exec: false, public_exec: false, format_in_body: false, execute_in_body: false, authenticated_exec: false });
  console.log('   NEGATIVE CONTROL ON: a definer the allowlist does not name');
}
if (CONTROL === 'body') {
  const hits = (cat.definers || []).filter(d => d.name === 'record_auth_completion');
  if (hits.length !== 1 || hits[0].execute_in_body !== false) plantFail('record_auth_completion is not in the definer list exactly once with a clean body');
  hits[0].execute_in_body = true;
  console.log('   NEGATIVE CONTROL ON: record_auth_completion\'s body runs execute');
}
if (CONTROL === 'overload') {
  if (cat.door_signatures?.record_auth_completion !== 1) plantFail('door_signatures.record_auth_completion is not 1');
  cat.door_signatures.record_auth_completion = 2;
  console.log('   NEGATIVE CONTROL ON: a second record_auth_completion signature');
}
if (CONTROL === 'regrant') {
  extraMigration = { file: '29991231_control_regrant.sql', sql: 'grant update on table public.user_scores to authenticated;' };
  console.log('   NEGATIVE CONTROL ON: a migration after L1 grants UPDATE on user_scores back');
}
let source = fixture.source;
if (CONTROL === 'livesource') {
  if (!['dry-run', 'production'].includes(source)) plantFail(`the snapshot source "${source}" is not one the flip knows`);
  source = source === 'dry-run' ? 'production' : 'dry-run';
  console.log(`   NEGATIVE CONTROL ON: the snapshot read as ${source}, the opposite of what it says`);
}

// --- source helpers ----------------------------------------------------------
/* Comments out, URLs kept: the lookbehind keeps a URL's // intact. */
const stripTs = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
const stripSql = t => t.replace(/--[^\n]*/g, ' ');
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'test') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}
const sameList = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ---------------------------------------------------------------------------
console.log('1) grants: a client role reads the six tables and inserts board rows on three columns, nothing else');
{
  for (const r of CLIENT_ROLES) {
    for (const t of SIX) {
      const held = cat.table_privileges?.[`${r} ${t}`];
      if (!Array.isArray(held)) { fail(1, `the snapshot has no table privileges for ${r} on ${t}`); continue; }
      const extra = held.filter(p => p !== 'SELECT');
      if (extra.length) fail(1, `${r} holds ${extra.join(', ')} on ${t}: a direct write the save is supposed to be the only door for`);
      if (!held.includes('SELECT')) fail(1, `${r} lost SELECT on ${t}, so every read of it in the site breaks`);
      const cols = cat.column_privileges?.[`${r} ${t}`] || [];
      for (const p of ['UPDATE', 'REFERENCES']) if (cols.includes(p)) fail(1, `${r} holds column level ${p} on ${t}`);
      if (t !== 'game_completions' && cols.includes('INSERT')) fail(1, `${r} holds column level INSERT on ${t}`);
    }
    const gc = cat.gc_insert_columns?.[r];
    if (!Array.isArray(gc) || !sameList(gc, BOARD_INSERT_COLUMNS)) {
      fail(1, `${r} may insert game_completions columns ${JSON.stringify(gc)}, expected exactly ${BOARD_INSERT_COLUMNS.join(', ')} (created_at and completed_on must come from the server)`);
    }
  }

  /* The client side of the same rule, read as code: the board insert sends
     exactly the granted columns, and nothing else in src or the edge
     functions writes the six tables. */
  const completions = stripTs(readLF(path.join(ROOT, 'src', 'lib', 'completions.ts')));
  const shapes = [...completions.matchAll(/const row:\s*\{([^}]*)\}/g)].map(m => [...m[1].matchAll(/(\w+)\??\s*:/g)].map(k => k[1]));
  if (shapes.length === 0) fail(1, 'src/lib/completions.ts no longer declares its board row shape (const row: { ... }), so this check needs re-anchoring');
  for (const s of shapes) {
    if (!sameList(s, BOARD_INSERT_COLUMNS)) fail(1, `src/lib/completions.ts builds a board row of ${s.join(', ')}, but a client role may insert only ${BOARD_INSERT_COLUMNS.join(', ')}; that insert would be refused`);
  }
  const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'supabase', 'functions'))];
  const FROM = /from(?:\s+as\s+any\))?\s*\(\s*['"](user_scores|user_game_scores|user_best_scores|daily_completions|game_completions|game_score_caps)['"](?:\s+as\s+\w+)?\s*\)/g;
  let boardInserts = 0;
  for (const f of files) {
    const code = stripTs(readLF(f));
    for (const m of code.matchAll(FROM)) {
      const end = code.indexOf(';', m.index);
      const chain = code.slice(m.index + m[0].length, end < 0 ? undefined : end);
      const w = chain.match(/\.(insert|update|upsert|delete)\s*\(/);
      if (!w) continue;
      const rel = path.relative(ROOT, f).split(path.sep).join('/');
      if (m[1] === 'game_completions' && w[1] === 'insert' && rel === 'src/lib/completions.ts') { boardInserts += 1; continue; }
      fail(1, `${rel} writes ${m[1]} directly (.${w[1]}), which the grants no longer allow; route it through the save`);
    }
  }
  if (boardInserts === 0) fail(1, 'no board insert found in src/lib/completions.ts, so this check needs re-anchoring');
  if (!fired.has(1)) console.log(`   SELECT only on all six for both roles, board insert on ${BOARD_INSERT_COLUMNS.join(', ')}; ${files.length} source files read, ${boardInserts} board insert(s), all in completions.ts, no other write`);
}

// ---------------------------------------------------------------------------
console.log('2) policies: no client write policy on the account tables, the board insert bounded');
{
  const pol = Array.isArray(cat.policies) ? cat.policies : [];
  if (!pol.length) fail(2, 'the snapshot has no policies');
  for (const p of pol) {
    if (NO_WRITE_POLICY.includes(p.t) && p.cmd !== 'SELECT') fail(2, `${p.t} carries a ${p.cmd} policy "${p.n}"; only the save may write it`);
  }
  const gcWrites = pol.filter(p => p.t === 'game_completions' && p.cmd !== 'SELECT');
  if (gcWrites.length !== 1) fail(2, `game_completions has ${gcWrites.length} write policies, expected exactly the bounded insert`);
  else {
    const g = gcWrites[0];
    const c = String(g.check || '');
    if (g.cmd !== 'INSERT') fail(2, `the game_completions write policy is ${g.cmd}, expected INSERT`);
    if (g.roles !== '{anon,authenticated}') fail(2, `the game_completions insert policy applies to ${g.roles}`);
    for (const need of ['(length(game) >= 1)', '(length(game) <= 64)', '(length(player_name) >= 1)', '(length(player_name) <= 40)']) {
      if (!c.includes(need)) fail(2, `the game_completions insert check is ${c}, missing ${need}`);
    }
  }
  for (const t of SIX) {
    if (!pol.some(p => p.t === t && p.cmd === 'SELECT' && p.using === 'true')) fail(2, `${t} lost its public read policy`);
  }
  if (!fired.has(2)) console.log(`   ${pol.length} policies: reads on all six, one write, the bounded board insert`);
}

// ---------------------------------------------------------------------------
console.log('3) every SECURITY DEFINER function in public is on the allowlist');
const definers = Array.isArray(cat.definers) ? cat.definers : [];
{
  if (!definers.length) fail(3, 'the snapshot lists no definer functions, which cannot be right while the save is one');
  for (const d of definers) {
    if (!ALLOWLIST.has(d.name)) fail(3, `${d.fn} is SECURITY DEFINER and not on the allowlist; a definer runs as the table owner and bypasses every policy`);
  }
  if (!fired.has(3)) console.log(`   ${definers.length} definers, all allowlisted: ${definers.map(d => d.name).join(', ')}`);
}

// ---------------------------------------------------------------------------
console.log('4) definer bodies: fixed SQL, doors pinned and in the ledger, the old ones pinned here');
{
  const ledgerMd5s = new Set();
  for (const row of cat.ledger || []) {
    if (!row.live) continue;
    for (const [k, v] of Object.entries(row.installed || {})) if (/_md5$/.test(k) && typeof v === 'string') ledgerMd5s.add(v);
  }
  for (const d of definers.filter(x => ALLOWLIST.has(x.name))) {
    if (d.execute_in_body) fail(4, `${d.fn} runs execute in its body: a definer that builds SQL at run time is the exec_sql hole`);
    if (d.format_in_body) fail(4, `${d.fn} calls format( in its body`);
    if (d.public_exec) fail(4, `${d.fn} is executable by PUBLIC`);
    const legacy = LEGACY[d.fn];
    if (legacy) {
      if (d.md5 !== legacy.md5) fail(4, `${d.fn} changed (md5 ${d.md5}, pinned ${legacy.md5}); read the new body and re-pin it here`);
      if (d.anon_exec !== legacy.anon || d.authenticated_exec !== legacy.authenticated) {
        fail(4, `${d.fn} execute grants changed (anon ${d.anon_exec}, authenticated ${d.authenticated_exec}; pinned ${legacy.anon}, ${legacy.authenticated})`);
      }
      continue;
    }
    if (JSON.stringify(d.config) !== JSON.stringify(['search_path=""'])) fail(4, `${d.fn} does not pin search_path empty (${JSON.stringify(d.config)})`);
    if (d.anon_exec) fail(4, `${d.fn} is executable by anon; a door is for signed in players only`);
    if (!ledgerMd5s.has(d.md5)) fail(4, `${d.fn} md5 ${d.md5} is in no live row of private.economy_steps, so it was installed or changed outside the chain`);
  }
  if (cat.save?.src_md5 !== SAVE_569_SRC_MD5) fail(4, `record_auth_completion's body is not the Round 569 arithmetic (src md5 ${cat.save?.src_md5}); only T0 may change it`);
  if (!fired.has(4)) console.log(`   no execute, no format(; ${Object.keys(LEGACY).length} pre-chain definers at their pins; the save's body is the 569 body`);
}

// ---------------------------------------------------------------------------
console.log('5) one signature per door name');
{
  const sig = cat.door_signatures || {};
  for (const n of DOOR_NAMES) {
    if (typeof sig[n] !== 'number') fail(5, `the snapshot does not count ${n}`);
    else if (sig[n] > 1) fail(5, `${n} has ${sig[n]} signatures; a second one with a default makes every call ambiguous (PGRST203)`);
  }
  if (sig.record_auth_completion !== 1) fail(5, `record_auth_completion has ${sig.record_auth_completion} signatures, expected exactly 1 while the shim lives`);
  if (!fired.has(5)) console.log(`   ${DOOR_NAMES.map(n => `${n} ${sig[n]}`).join(', ')}`);
}

// ---------------------------------------------------------------------------
console.log('6) the ledger');
{
  const l1 = (cat.ledger || []).filter(r => r.step === 'L1');
  if (l1.length !== 1 || !l1[0].live || l1[0].seq !== 1) fail(6, 'private.economy_steps does not hold one live L1 row at seq 1');
  else if (l1[0].installed?.save_def_md5 !== cat.save?.md5) fail(6, `the save's definition (md5 ${cat.save?.md5}) is not the one L1 recorded (${l1[0].installed?.save_def_md5})`);
  if (cat.save?.definer !== true) fail(6, 'record_auth_completion is not SECURITY DEFINER in the snapshot');
  const g = cat.ledger_guard || {};
  if (g.rls !== true || g.anon_select !== false || g.authenticated_select !== false) fail(6, `private.economy_steps is reachable by a client role or has RLS off (${JSON.stringify(g)})`);
  if (!fired.has(6)) console.log(`   L1 live, save md5 ${cat.save.md5.slice(0, 8)} as recorded, ledger private`);
}

// ---------------------------------------------------------------------------
console.log('7) live, read only, as anon');
if (CONTROL && CONTROL !== 'livesource') {
  console.log('   skipped under a control, which is judged on its own section only');
} else {
  const client = readLF(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'));
  const URL_ = (client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/) || [])[1];
  const KEY = (client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/) || [])[1];
  if (!URL_ || !KEY) {
    fail(7, 'could not read SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from client.ts');
  } else {
    const NOBODY = '00000000-0000-0000-0000-000000000000';
    /* Each probe can never write. "open" names the answer a probe gets while
       the grant is still there: a parse error before any row exists, or a
       filter that matches nothing. */
    const PROBES = [
      { what: 'PATCH user_scores.total_points', method: 'PATCH', path: `user_scores?user_id=eq.${NOBODY}`, body: { total_points: 0 }, open: ['2xx'] },
      { what: 'POST user_game_scores', method: 'POST', path: 'user_game_scores', body: { user_id: 'not-a-uuid', game_type: 'sim-play-door-probe', score: 0 }, open: ['22P02'] },
      { what: 'PATCH user_best_scores', method: 'PATCH', path: `user_best_scores?user_id=eq.${NOBODY}`, body: { best_score: 0 }, open: ['2xx'] },
      { what: 'DELETE daily_completions', method: 'DELETE', path: `daily_completions?id=eq.${NOBODY}`, body: null, open: ['2xx'] },
      { what: 'POST game_score_caps', method: 'POST', path: 'game_score_caps', body: { game: 'sim-play-door-probe', max_score: 'not-a-number' }, open: ['22P02'] },
      { what: 'POST game_completions.created_at (a backdated row)', method: 'POST', path: 'game_completions', body: { game: 'sim-play-door-probe', player_name: 'SimPlayDoor', created_at: 'not-a-time' }, open: ['22007', '22008'] },
    ];
    const BOARD = { what: 'POST game_completions (game, player_name, score), the client\'s own shape', method: 'POST', path: 'game_completions', body: { game: 'sim-play-door-probe', player_name: 'SimPlayDoor', score: 'not-a-number' } };
    /* A thrown transport error is retried (no probe can write, so a retry is
       safe); an HTTP answer is an answer. */
    const call = async p => {
      const { response: r, error } = await fetchWithTransportRetry(() => fetch(`${URL_}/rest/v1/${p.path}`, {
        method: p.method,
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: p.body ? JSON.stringify(p.body) : undefined,
        signal: AbortSignal.timeout(20000),
      }));
      if (!r) return { status: 0, code: 'NETWORK', text: String(error).slice(0, 120) };
      const text = await r.text();
      let code = '';
      try { code = (JSON.parse(text) || {}).code || ''; } catch { code = ''; }
      return { status: r.status, code, text: text.slice(0, 120).replace(/\s+/g, ' ') };
    };
    const states = [];
    for (const p of PROBES) {
      const a = await call(p);
      let state = 'unknown';
      if (a.code === '42501') state = 'shut';
      else if ((p.open.includes('2xx') && a.status >= 200 && a.status < 300) || p.open.includes(a.code)) state = 'open';
      states.push(state);
      console.log(`   ${p.what}: ${a.status} ${a.code || ''} ${state}`);
      if (state === 'unknown') fail(7, `${p.what} answered ${a.status} ${a.code} (${a.text}), neither a refusal nor the open shape, so the door's state is not verified. This fails closed`);
    }
    const b = await call(BOARD);
    console.log(`   ${BOARD.what}: ${b.status} ${b.code || ''}`);
    if (b.code !== '22P02') fail(7, `the client's board insert did not pass the privilege check (${b.status} ${b.code}: ${b.text}); every play's board row is being refused`);
    const shut = states.filter(s => s === 'shut').length;
    const open = states.filter(s => s === 'open').length;
    if (!states.includes('unknown')) {
      if (shut && open) fail(7, `${shut} probes refused and ${open} open: a partial apply, which no migration step produces`);
      else if (shut === states.length) {
        if (source === 'production') console.log('   the door is shut on production');
        else fail(7, 'L1 is live on production but the snapshot is still the dry run. Refresh scripts/data/playDoorCatalog.json from production (L1 header, APPLY step 5)');
      } else if (open === states.length) {
        if (source === 'production') fail(7, 'the snapshot says production, but every write probe is open: L1 has been undone or was never applied');
        else console.log('   PENDING: L1 is not applied on production yet, so the direct writes are still open there. The snapshot is the dry run of L1');
      }
    }
  }
}

// ---------------------------------------------------------------------------
console.log('8) no migration after L1 reopens a door');
{
  const files = fs.readdirSync(MIGRATIONS).filter(f => /^\d{8}.*\.sql$/.test(f)).sort();
  if (!files.includes(L1_FILE)) fail(8, `${L1_FILE} is not in supabase/migrations, so this check needs re-anchoring`);
  const after = files.filter(f => f > L1_FILE).map(f => ({ file: f, sql: readLF(path.join(MIGRATIONS, f)) }));
  if (extraMigration) after.push(extraMigration);
  const TBL = '(?:public\\.)?(?:user_scores|user_game_scores|user_best_scores|daily_completions|game_completions|game_score_caps)\\b';
  const tableGrant = new RegExp(`grant\\s+(?:[a-z ,]*\\b(?:insert|update|delete|truncate|all)\\b[a-z ,]*)\\s+on\\s+(?:table\\s+)?[^;]*${TBL}[^;]*\\bto\\s+[^;]*\\b(?:anon|authenticated|public)\\b`);
  const columnUpdate = new RegExp(`grant\\s+[^;]*\\bupdate\\s*\\([^;]*\\bon\\s+(?:table\\s+)?[^;]*${TBL}[^;]*\\bto\\s+[^;]*\\b(?:anon|authenticated|public)\\b`);
  const writePolicy = /create\s+policy\s[^;]*\bon\s+(?:public\.)?(?:user_scores|user_game_scores|user_best_scores|daily_completions|game_score_caps)\b[^;]*\bfor\s+(?:insert|update|delete|all)\b/;
  for (const m of after) {
    const stmts = stripSql(m.sql).toLowerCase().replace(/\s+/g, ' ').split(';');
    for (const s of stmts) {
      if (tableGrant.test(s)) fail(8, `${m.file} grants a table level write on an account or board table to a client role: ${s.trim().slice(0, 140)}`);
      if (columnUpdate.test(s)) fail(8, `${m.file} grants a column UPDATE on an account or board table to a client role: ${s.trim().slice(0, 140)}`);
      if (writePolicy.test(s)) fail(8, `${m.file} creates a write policy on an account table: ${s.trim().slice(0, 140)}`);
    }
  }
  if (!fired.has(8)) console.log(`   ${after.length} migration(s) after L1, none reopens a door`);
}

// ---------------------------------------------------------------------------
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const leaked = [...fired].filter(n => n !== want);
  if (!fired.has(want)) { console.error(`\nsimPlayDoor: CONTROL ${CONTROL}: section ${want} did NOT fire. The check is not measuring what it claims to.`); process.exit(1); }
  if (leaked.length) { console.error(`\nsimPlayDoor: CONTROL ${CONTROL} fired section ${want} but also ${leaked.join(', ')}, so the checks are not independent.`); process.exit(1); }
  console.log(`\nsimPlayDoor: CONTROL ${CONTROL}: section ${want} fired and nothing else, as it must.`);
  process.exit(0);
}
if (failures) { console.error(`\nsimPlayDoor: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimPlayDoor: green. Only the save writes the account tables, the board insert is three bounded columns, and every definer is accounted for.');
