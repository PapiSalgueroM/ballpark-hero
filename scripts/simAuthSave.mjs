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
 *   3. The committed migration keeps the properties that make it both
 *      correct and safe: an in place increment of total_points, the daily
 *      mark as ON CONFLICT DO NOTHING, SECURITY INVOKER (never DEFINER, see
 *      the exec_sql incident in CLAUDE.md), the player from auth.uid() and
 *      never a parameter, a pinned search_path, and EXECUTE for authenticated
 *      only.
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
 *   AUTH_SAVE_CONTROL=definer    turns the migration SECURITY DEFINER;
 *                                section 3 must fire.
 *
 * Run: node scripts/simAuthSave.mjs   (section 4 needs the network, and fails
 * closed without it)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.AUTH_SAVE_CONTROL || '';
const KNOWN = ['readwrite', 'getuser', 'definer'];
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
console.log('3) the migration keeps what makes it correct and safe');
{
  const dir = path.join(ROOT, 'supabase/migrations');
  const file = fs.readdirSync(dir).find(f => /record_auth_completion/.test(f) && f.endsWith('.sql'));
  if (!file) {
    fail(3, 'no migration in supabase/migrations defines record_auth_completion, so the repo cannot rebuild the function the app now depends on');
  } else {
    let sql = fs.readFileSync(path.join(dir, file), 'utf8');
    if (CONTROL === 'definer') {
      sql = rewrite(sql, 'security invoker', 'security definer', 'the security invoker clause');
      console.log('   NEGATIVE CONTROL ON: the function made SECURITY DEFINER');
    }
    const s = stripSql(sql).toLowerCase().replace(/\s+/g, ' ');
    const must = [
      ['security invoker', 'it is not SECURITY INVOKER, so it would bypass each table\'s row level security'],
      ['auth.uid()', 'it no longer takes the player from auth.uid()'],
      ["set search_path = ''", 'its search_path is not pinned'],
      ['total_points = s.total_points + excluded.total_points', 'total_points is no longer incremented in place, so racing saves can lose points again'],
      ['on conflict (user_id, game_slug, date) do nothing', 'the daily mark no longer uses ON CONFLICT DO NOTHING, so every same day replay is a duplicate key error again'],
      ['revoke all on function public.record_auth_completion(text, integer, integer) from anon', 'anon is not explicitly revoked'],
      ['revoke all on function public.record_auth_completion(text, integer, integer) from public', 'public is not explicitly revoked, and postgres grants execute to public by default'],
      ['grant execute on function public.record_auth_completion(text, integer, integer) to authenticated', 'authenticated is not granted execute, so signed in saves would all be refused'],
    ];
    for (const [needle, why] of must) if (!s.includes(needle)) fail(3, `${file}: ${why}`);
    if (s.includes('security definer')) fail(3, `${file}: it is SECURITY DEFINER. The anon key is public, and a definer function runs as the table owner`);
    const sig = s.match(/create or replace function public\.record_auth_completion\(([^)]*)\)/);
    if (!sig) fail(3, `${file}: the function signature could not be read`);
    else if (/uuid|user/.test(sig[1])) fail(3, `${file}: the function takes a user parameter (${sig[1].trim()}), which would let a caller credit another account`);
    if (!fired.has(3)) console.log(`   ${file}: invoker, auth.uid(), pinned search_path, in place increment, conflict safe daily mark, authenticated only`);
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
const EXPECT = { readwrite: 1, getuser: 2, definer: 3 };
if (CONTROL) {
  const want = EXPECT[CONTROL];
  if (fired.has(want)) { console.log(`\nCONTROL ${CONTROL}: section ${want} fired, as it must.`); process.exit(0); }
  console.error(`\nCONTROL ${CONTROL}: section ${want} did NOT fire. The check is not measuring what it claims to.`);
  process.exit(1);
}
if (failures) { console.error(`\nsimAuthSave: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimAuthSave: one atomic signed in save, safe grants, and no way back to the shape that lost points.');
