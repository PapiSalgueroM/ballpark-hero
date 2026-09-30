/**
 * simAuthSave: a signed in player's completion is saved in one atomic call,
 * and nothing can quietly put the old point-losing shape back.
 *
 * THE DEFECT THIS EXISTS FOR, found in the live database logs on 2026-09-14.
 * src/lib/completions.ts saveAuthCompletion made six sequential round trips,
 * and the fourth READ user_scores.total_points so the fifth could WRITE back
 * the value it read plus the new score. 34 of 488 signed in accounts held
 * fewer total points than their own recorded plays add up to, 19,857 points
 * in all, the worst account short by 3,170. That function was the only writer
 * of both tables (no trigger, no database function touches them), so the two
 * could only disagree two ways, and the data carried both fingerprints:
 *
 *   INTERRUPTED SAVE. Many accounts are short by exactly their final play's
 *   score (1,000 short with a last play of 1,000; 600 and 600; 400 and 400),
 *   with no two plays near each other: the score row landed, the player
 *   closed the tab, the total never updated.
 *
 *   LOST UPDATE. The heaviest accounts carry hundreds of plays within five
 *   seconds of the previous one and shortfalls matching no single score:
 *   two saves read the same total and one of the two additions vanished.
 *
 * The same function also produced 177 duplicate key violations a day (the
 * daily mark was de-duplicated by letting its insert FAIL) and 57 PostgREST
 * 406s a day (.single() against a player's first ever row), which buried the
 * 32 statement timeouts that are a real fault in the same logs.
 *
 * WHAT IT HOLDS.
 *   1. The save is ONE call to record_auth_completion, and the function
 *      writes none of the four tables itself and uses no .single().
 *   2. No network auth round trip sits in front of the save: the recorder
 *      reads the local session (getSession) rather than asking the auth
 *      server (getUser), because every hop in front of the write widens the
 *      interrupted save window, and the server authenticates the save anyway.
 *   3. The committed migrations keep the properties that make the save both
 *      correct and safe: an in place increment of total_points, the daily
 *      mark as ON CONFLICT DO NOTHING, the player from auth.uid() and never a
 *      parameter, a pinned search_path, fixed SQL (no execute, no format( in
 *      the body), EXECUTE for authenticated only, and, since Round 673,
 *      SECURITY DEFINER with the direct write grants and the client write
 *      policies on the four account tables taken away (economy step L1,
 *      supabase/migrations/20260928_econ_l1_lock_the_doors.sql). The effective
 *      security is read across the whole chain in order, so a later migration
 *      that sets it back to INVOKER fails here. L1 also replaces the body, and
 *      only in front: four refusals (a slug over 64 characters or off the
 *      game_score_caps allowlist, a score outside 0 to the game's hard
 *      maximum in private.game_hard_max, a correct count outside 0 to 1000,
 *      each SQLSTATE 22023), then the Round 569 body from its first insert to
 *      its end, byte for byte against 20260914120000_record_auth_completion.sql.
 *      simEconomyMigrations runs both in PGlite and proves the arithmetic
 *      lands identically; this section holds the text.
 *
 *      WHY THIS RULE INVERTED IN ROUND 673. Until then this section required
 *      SECURITY INVOKER and failed on DEFINER, citing the exec_sql incident in
 *      CLAUDE.md. That incident is about a definer that runs ARBITRARY SQL.
 *      An INVOKER save only works while the player holds write grants on the
 *      tables it writes, and on 2026-09-28 those grants were the hole: any
 *      signed in player could PATCH their own total_points through the API
 *      (row level security said only auth.uid() = user_id, over every
 *      column). A definer with fixed SQL, auth.uid() only, an empty
 *      search_path and EXECUTE for authenticated only lets the grants go, so
 *      the save becomes the only door (docs/design/POINTS-ECONOMY-V2.md on the
 *      points-economy branch, section 4, conflict 1). scripts/simPlayDoor.mjs
 *      holds the live catalog side of the same rule.
 *   4. LIVE: the deployed function refuses an anonymous caller with a
 *      permission error. If anon could execute it, the function would answer
 *      with its own "needs a signed in user" instead, and that is a failure
 *      even though no row is written either way.
 *
 * A GUARD THAT READS SOURCE READS THE CODE, NOT THE COMMENTS. The comments
 * explaining this fix literally contain ".single()", "getUser" and
 * "from('user_scores')", so every source check here strips comments first.
 * That trap has fired four times in this repo.
 *
 * CONTROLS, each rewriting text in memory and refusing to run if its rewrite
 * changed nothing:
 *   AUTH_SAVE_CONTROL=readwrite  puts a direct user_scores update back into
 *                                the save; section 1 must fire.
 *   AUTH_SAVE_CONTROL=getuser    puts the auth server round trip back in
 *                                front of it; section 2 must fire.
 *   AUTH_SAVE_CONTROL=invoker    sets the save back to SECURITY INVOKER in
 *                                L1 (the migration back to INVOKER);
 *                                section 3 must fire. It replaces the old
 *                                definer control, which retired with the
 *                                rule it tested.
 *   AUTH_SAVE_CONTROL=norefuse   L1's save loses its score check; section 3
 *                                must fire.
 *   AUTH_SAVE_CONTROL=arith      L1's save adds one point more than the
 *                                Round 569 body; section 3 must fire.
 *   AUTH_SAVE_CONTROL=norevoke   L1 keeps INSERT, UPDATE, DELETE and TRUNCATE
 *                                for the client roles; section 3 must fire.
 *   AUTH_SAVE_CONTROL=bodyexec   the save's body runs an execute; section 3
 *                                must fire.
 *
 * Run: node scripts/simAuthSave.mjs   (section 4 needs the network, and fails
 * closed without it)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.AUTH_SAVE_CONTROL || '';
const KNOWN = ['readwrite', 'getuser', 'invoker', 'norevoke', 'bodyexec', 'norefuse', 'arith'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`AUTH_SAVE_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fired = new Set();
const fail = (n, m) => { fired.add(n); failures += 1; console.error('  FAIL: ' + m); };

const rewrite = (text, from, to, what) => {
  if (!text.includes(from)) {
    console.error(`CONTROL ${CONTROL} cannot run: ${what} is not in the source, so the rewrite would change nothing and a green run would prove nothing.`);
    process.exit(2);
  }
  return text.replace(from, to);
};

/* Strip block and line comments. The lookbehind keeps a URL's // intact: a
   stripper without it deleted every URL in simLiveScores and neutered the
   check it was guarding. */
const stripTs = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
const stripSql = t => t.replace(/--[^\n]*/g, ' ');

/* The body of an exported function, from its declaration to the next
   top level export, so a check cannot wander into a neighbour. */
function bodyOf(code, declaration) {
  const start = code.indexOf(declaration);
  if (start < 0) return null;
  const next = code.indexOf('\nexport ', start + declaration.length);
  return code.slice(start, next < 0 ? code.length : next);
}

const COMPLETIONS = path.join(ROOT, 'src/lib/completions.ts');
let completions = fs.readFileSync(COMPLETIONS, 'utf8');

if (CONTROL === 'readwrite') {
  completions = rewrite(completions,
    "const { error } = await (supabase.rpc as any)('record_auth_completion', {",
    "await supabase.from('user_scores').update({ total_points: 0 }).eq('user_id', userId);\n  const { error } = await (supabase.rpc as any)('record_auth_completion', {",
    'the record_auth_completion call');
  console.log('   NEGATIVE CONTROL ON: a direct user_scores write put back into the save');
}
if (CONTROL === 'getuser') {
  completions = rewrite(completions, 'supabase.auth.getSession()', 'supabase.auth.getUser()', 'the getSession call');
  console.log('   NEGATIVE CONTROL ON: the auth server round trip put back in front of the save');
}

const code = stripTs(completions);

// ---------------------------------------------------------------------------
console.log('1) the signed in save is one atomic call');
{
  const body = bodyOf(code, 'export async function saveAuthCompletion(');
  if (!body) {
    fail(1, 'saveAuthCompletion is gone from src/lib/completions.ts, so this check needs re-anchoring');
  } else {
    const calls = (body.match(/['"]record_auth_completion['"]/g) || []).length;
    if (calls !== 1) fail(1, `saveAuthCompletion names record_auth_completion ${calls} times, expected exactly once`);
    for (const table of ['user_scores', 'user_best_scores', 'daily_completions', 'user_game_scores']) {
      if (new RegExp(`from\\(\\s*['"]${table}['"]\\s*\\)`).test(body)) {
        fail(1, `saveAuthCompletion writes ${table} directly again, which is the read then write shape that lost 19,857 points`);
      }
    }
    if (/\.single\(\s*\)/.test(body)) fail(1, 'saveAuthCompletion calls .single() again, the source of 57 PostgREST 406s a day');
    if (!fired.has(1)) console.log(`   one call to record_auth_completion, no direct write to any of the four tables, ${body.length} characters of code`);
  }
}

// ---------------------------------------------------------------------------
console.log('2) no auth server round trip in front of the save');
{
  const body = bodyOf(code, 'export function recordCompletion(') || bodyOf(code, 'export async function recordCompletion(');
  if (!body) {
    fail(2, 'recordCompletion is gone from src/lib/completions.ts, so this check needs re-anchoring');
  } else {
    if (/auth\.getUser\(\s*\)/.test(body)) fail(2, 'recordCompletion asks the auth server (getUser) before saving, which widens the window in which a closing tab loses the points');
    if (!/auth\.getSession\(\s*\)/.test(body)) fail(2, 'recordCompletion no longer reads the local session before saving, so a signed in player may not be saved at all');
    if (!/saveAuthCompletion\(/.test(body)) fail(2, 'recordCompletion no longer calls saveAuthCompletion, so signed in players stop being saved');
    if (!fired.has(2)) console.log('   the recorder reads the local session and hands straight to the save');
  }
}

// ---------------------------------------------------------------------------
console.log('3) the migrations keep what makes the save correct and safe, and make it the only door');
{
  const dir = path.join(ROOT, 'supabase/migrations');
  const L1 = '20260928_econ_l1_lock_the_doors.sql';
  /* The chain is the dated files in name order. ROLLBACK_ and _DO_NOT_APPLY
     files are never part of it: an undo sets the save back to INVOKER on
     purpose, and reading it as the chain would fail this on every run. */
  const chain = fs.readdirSync(dir).filter(f => /^\d{8}.*\.sql$/.test(f)).sort();
  /* LF throughout: a Windows checkout carries CRLF, and the byte for byte
     comparison of the arithmetic below is about the SQL, not the checkout. */
  const texts = new Map(chain.map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8').split('\r\n').join('\n')]));
  const SAVE_569 = '20260914120000_record_auth_completion.sql';
  if (CONTROL === 'invoker') {
    if (!texts.has(L1)) {
      console.error(`CONTROL invoker cannot run: ${L1} is not in supabase/migrations, so the rewrite would change nothing and a green run would prove nothing.`);
      process.exit(2);
    }
    texts.set(L1, rewrite(texts.get(L1),
      "  language plpgsql\n  security definer\n  set search_path = ''",
      "  language plpgsql\n  security invoker\n  set search_path = ''",
      "L1's security definer clause on the save"));
    console.log('   NEGATIVE CONTROL ON: L1 sets the save back to SECURITY INVOKER');
  }
  if (CONTROL === 'norefuse') {
    texts.set(L1, rewrite(texts.get(L1), 'if coalesce(p_score, 0) < 0 or coalesce(p_score, 0) > v_hard_max then', 'if false then', "L1's score check"));
    console.log('   NEGATIVE CONTROL ON: L1\'s save has no score check');
  }
  if (CONTROL === 'arith') {
    texts.set(L1, rewrite(texts.get(L1), 'total_points = s.total_points + excluded.total_points,', 'total_points = s.total_points + excluded.total_points + 1,', "L1's increment"));
    console.log('   NEGATIVE CONTROL ON: L1\'s save adds one point more than Round 569');
  }
  if (CONTROL === 'norevoke') {
    if (!texts.has(L1)) {
      console.error(`CONTROL norevoke cannot run: ${L1} is not in supabase/migrations.`);
      process.exit(2);
    }
    texts.set(L1, rewrite(texts.get(L1),
      'revoke insert, update, delete, truncate, references, trigger',
      'revoke references, trigger',
      "L1's revoke of the direct writes"));
    console.log('   NEGATIVE CONTROL ON: L1 leaves INSERT, UPDATE, DELETE and TRUNCATE with the client roles');
  }
  const norm = t => stripSql(t).toLowerCase().replace(/\s+/g, ' ');
  const CREATE = 'create or replace function public.record_auth_completion(';
  if (CONTROL === 'bodyexec') {
    const f = [...chain].reverse().find(x => norm(texts.get(x)).includes(CREATE));
    if (!f) {
      console.error('CONTROL bodyexec cannot run: no migration defines record_auth_completion.');
      process.exit(2);
    }
    texts.set(f, rewrite(texts.get(f),
      '  insert into public.user_game_scores (user_id, game_type, score, correct_answers, puzzle_date)',
      "  execute 'select 1';\n  insert into public.user_game_scores (user_id, game_type, score, correct_answers, puzzle_date)",
      "the save body's first insert"));
    console.log('   NEGATIVE CONTROL ON: the save body runs an execute');
  }
  const file = [...chain].reverse().find(f => norm(texts.get(f)).includes(CREATE));
  if (!file) {
    fail(3, 'no migration in supabase/migrations defines record_auth_completion, so the repo cannot rebuild the function the app now depends on');
  } else if (!texts.has(L1)) {
    fail(3, `${L1} is gone, so nothing takes the direct write grants away and the save is not the only door`);
  } else {
    const s = norm(texts.get(file));
    const must = [
      ['auth.uid()', 'it no longer takes the player from auth.uid()'],
      ["set search_path = ''", 'its search_path is not pinned'],
      ['total_points = s.total_points + excluded.total_points', 'total_points is no longer incremented in place, so racing saves can lose points again'],
      ['on conflict (user_id, game_slug, date) do nothing', 'the daily mark no longer uses ON CONFLICT DO NOTHING, so every same day replay is a duplicate key error again'],
      ['revoke all on function public.record_auth_completion(text, integer, integer) from anon', 'anon is not explicitly revoked'],
      ['revoke all on function public.record_auth_completion(text, integer, integer) from public', 'public is not explicitly revoked, and postgres grants execute to public by default'],
      ['grant execute on function public.record_auth_completion(text, integer, integer) to authenticated', 'authenticated is not granted execute, so signed in saves would all be refused'],
    ];
    for (const [needle, why] of must) if (!s.includes(needle)) fail(3, `${file}: ${why}`);
    const sig = s.match(/create or replace function public\.record_auth_completion\(([^)]*)\)/);
    if (!sig) fail(3, `${file}: the function signature could not be read`);
    else if (/uuid|user/.test(sig[1])) fail(3, `${file}: the function takes a user parameter (${sig[1].trim()}), which would let a caller credit another account`);
    /* Fixed SQL: a definer that builds a statement at run time is the
       exec_sql hole, whatever else it does. */
    const at = s.indexOf(CREATE);
    const open = s.indexOf(' as $$', at);
    const close = s.indexOf('$$;', open + 6);
    const body = open > 0 && close > open ? s.slice(open + 6, close) : '';
    if (!body) fail(3, `${file}: the function body could not be read`);
    else {
      if (/\bexecute\b/.test(body)) fail(3, `${file}: the body runs execute, and as a definer that is arbitrary SQL as the table owner`);
      if (/\bformat\s*\(/.test(body)) fail(3, `${file}: the body calls format(, the first half of building SQL at run time`);
    }

    /* The effective security, statement by statement across the chain. */
    let security = null;
    let setIn = null;
    for (const f of chain) {
      const t = norm(texts.get(f));
      const re = /create or replace function public\.record_auth_completion\([^)]*\)[^;]*?\bsecurity (invoker|definer)\b|alter function public\.record_auth_completion\([^)]*\) security (invoker|definer)\b/g;
      for (const m of t.matchAll(re)) { security = m[1] || m[2]; setIn = f; }
    }
    if (security !== 'definer') {
      fail(3, `the save ends the chain SECURITY ${String(security).toUpperCase()} (last set in ${setIn}). With the direct grants revoked an INVOKER save refuses every signed in play, and with them restored any player can write their own total`);
    }

    /* L1 takes the direct writes away from the four account tables. */
    const l1 = norm(texts.get(L1));
    for (const t of ['user_scores', 'user_game_scores', 'user_best_scores', 'daily_completions']) {
      const revoke = new RegExp(`revoke insert, update, delete, truncate, references, trigger on table [^;]*\\bpublic\\.${t}\\b[^;]*from anon, authenticated`);
      if (!revoke.test(l1)) fail(3, `${L1} does not revoke the direct writes on ${t} from anon and authenticated`);
    }
    for (const [t, p] of [['user_scores', 'user_scores_ins'], ['user_scores', 'user_scores_upd'], ['user_game_scores', 'user_game_scores_ins'],
                          ['user_best_scores', 'user_best_scores_ins'], ['user_best_scores', 'user_best_scores_upd'], ['daily_completions', 'daily_completions_ins']]) {
      if (!l1.includes(`drop policy ${p} on public.${t}`)) fail(3, `${L1} does not drop the client write policy ${p} on ${t}`);
    }
    /* L1 replaces the body only in front: from the first insert to the end it
       is the Round 569 body, byte for byte (comments and all, since a comment
       inside a body is part of it), and in front of that sit the refusals. */
    const TAIL_AT = '  insert into public.user_game_scores (';
    const rawBody = t => {
      const a = t.indexOf('as $$\n', t.indexOf('create or replace function public.record_auth_completion('));
      const b = a < 0 ? -1 : t.indexOf('\n$$;', a);
      return a < 0 || b < 0 ? '' : t.slice(a + 'as $$'.length, b + 1);
    };
    const b569 = texts.has(SAVE_569) ? rawBody(texts.get(SAVE_569)) : '';
    const bL1 = rawBody(texts.get(L1));
    if (!b569 || !bL1) fail(3, `the save's body could not be read out of ${b569 ? L1 : SAVE_569}`);
    else if (b569.indexOf(TAIL_AT) < 0 || bL1.indexOf(TAIL_AT) < 0) fail(3, `no "${TAIL_AT.trim()}" line in one of the two bodies, so the comparison needs re-anchoring`);
    else {
      if (bL1.slice(bL1.indexOf(TAIL_AT)) !== b569.slice(b569.indexOf(TAIL_AT))) {
        fail(3, `${L1}: from its first insert to its end the save is not the Round 569 body byte for byte, so an accepted save no longer lands exactly as before`);
      }
      const head = stripSql(bL1.slice(0, bL1.indexOf(TAIL_AT))).toLowerCase().replace(/\s+/g, ' ');
      for (const [needle, why] of [
        ['length(p_game_slug) > 64', 'a slug over 64 characters is not refused'],
        ['join private.game_hard_max h on h.game = c.game', 'the game is not looked up in game_score_caps and its hard maximum'],
        ['if not found then', 'a game off the allowlist is not refused'],
        ['if coalesce(p_score, 0) < 0 or coalesce(p_score, 0) > v_hard_max then', 'a score outside 0 to the hard maximum is not refused'],
        ['if p_correct < 0 or p_correct > 1000 then', 'a correct count outside 0 to 1000 is not refused'],
        ["using errcode = '22023'", 'the refusals do not raise 22023, which the client log names'],
      ]) if (!head.includes(needle)) fail(3, `${L1}: ${why} (no "${needle}" before the first insert)`);
    }
    if (!fired.has(3)) console.log(`   ${file} body: auth.uid(), pinned search_path, fixed SQL, in place increment, conflict safe daily mark, authenticated only; the Round 569 arithmetic byte for byte behind four refusals; SECURITY DEFINER as of ${setIn}, which takes the direct writes and six client write policies away`);
  }
}

// ---------------------------------------------------------------------------
console.log('4) live: the deployed function refuses an anonymous caller');
if (CONTROL) {
  console.log('   skipped under a control, which is judged on its own section only');
} else {
  const client = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
  const url = (client.match(/https:\/\/[a-z0-9]+\.supabase\.co/) || [])[0];
  const key = (client.match(/eyJ[A-Za-z0-9_.-]+/) || [])[0];
  if (!url || !key) {
    fail(4, 'could not read the Supabase URL and public key from client.ts');
  } else {
    let status = 0, body = '';
    try {
      const r = await fetch(`${url}/rest/v1/rpc/record_auth_completion`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_game_slug: 'sim-auth-save-probe', p_score: 0, p_correct: 0 }),
      });
      status = r.status;
      body = await r.text();
    } catch (e) {
      fail(4, `could not reach the database (${String(e).slice(0, 120)}). This fails closed: an unreachable function is not a verified one`);
    }
    if (status) {
      if (/needs a signed in user/i.test(body)) {
        fail(4, 'an anonymous caller REACHED the function body (it answered "needs a signed in user"), so anon holds EXECUTE. No row was written, but the grant is wrong');
      } else if (/could not find the function|PGRST202/i.test(body)) {
        fail(4, 'the function is not deployed, so every signed in save is being refused right now');
      } else if (status === 401 || status === 403 || /42501|permission denied/i.test(body)) {
        console.log(`   refused with ${status}: ${body.slice(0, 90).replace(/\s+/g, ' ')}`);
      } else {
        fail(4, `unexpected answer ${status}: ${body.slice(0, 160)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
const EXPECT = { readwrite: 1, getuser: 2, invoker: 3, norevoke: 3, bodyexec: 3, norefuse: 3, arith: 3 };
if (CONTROL) {
  const want = EXPECT[CONTROL];
  if (fired.has(want)) { console.log(`\nCONTROL ${CONTROL}: section ${want} fired, as it must.`); process.exit(0); }
  console.error(`\nCONTROL ${CONTROL}: section ${want} did NOT fire. The check is not measuring what it claims to.`);
  process.exit(1);
}
if (failures) { console.error(`\nsimAuthSave: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimAuthSave: one atomic signed in save, safe grants, and no way back to the shape that lost points.');
