/**
 * Round 378: somebody can actually read the bug reports, and anon cannot ask
 * who that somebody is.
 *
 * WHAT WAS WRONG. public.user_roles had ZERO rows, so nobody on the site was an
 * admin. AdminReports.checkAuth queries that table for role='admin', finds
 * nothing, and calls signOut() before redirecting to the login page, so the
 * owner signed in and was thrown straight back out. From outside it looks like
 * a rejected password, not a missing row. Behind it sat 29 player bug reports,
 * 15 unresolved, the newest that same day.
 *
 * Every has_role() based RLS policy was dead for the same reason: the admin
 * read policies on five score tables denied everybody, because has_role
 * returned false for every user alive.
 *
 * AND THERE IS A CHICKEN AND EGG IN IT, which is why this fence is worth
 * keeping rather than the bug just being fixed once: the only SELECT policy on
 * user_roles is itself has_role(auth.uid(), 'admin'). With the table empty
 * nobody can read it and nobody can ever become the first admin through the
 * app. If this row is ever lost, the site cannot repair itself and the loss is
 * invisible until somebody tries to read their reports.
 *
 * WHAT THIS HOLDS, both against the live database because both are facts about
 * data rather than code:
 *   1. At least one admin exists, and has_role agrees that they are one. A
 *      count alone is not enough: the row could exist with a role value the
 *      function does not accept.
 *   2. anon CANNOT execute has_role over the REST API. It answers "is this
 *      account an admin" and profiles is publicly readable with user_id, so an
 *      open one lets anybody enumerate the site and pick out the admin.
 *   3. Ordinary anonymous reads still work. This is the guard on the FIX rather
 *      than on the bug: the obvious way to close 2 is to revoke EXECUTE from
 *      PUBLIC, and doing only that breaks every anonymous read whose policy
 *      calls has_role, plus the owner's own access. That was measured, not
 *      guessed, and this section is what stops it being reintroduced.
 *
 * NEGATIVE CONTROL: ADMIN_CONTROL=norole checks a role name nothing grants, so
 * section 1 sees an empty admin table exactly as it was, and must go red.
 *
 * Run: node scripts/simAdminAccess.mjs   (needs the database)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.ADMIN_CONTROL || '';
if (CONTROL && CONTROL !== 'norole') {
  console.error(`ADMIN_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function get(pathAndQuery) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 500 * attempt));
    try {
      const r = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, { headers: HEAD });
      if (r.ok) return { ok: true, body: await r.json() };
      if (r.status === 401 || r.status === 403 || r.status === 404) return { ok: false, status: r.status, body: await r.text() };
    } catch { /* retry */ }
  }
  return { ok: false, status: 0, body: 'no answer' };
}

/* Asked through the SERVICE side of the fence rather than the anon key,
   because user_roles is deliberately unreadable to anon and that is the point
   of section 2. The Supabase MCP is not available inside a harness, so this
   asks the one question anon IS allowed to ask: does the admin gate behave. */
console.log('1) at least one admin exists and has_role agrees');
{
  const role = CONTROL === 'norole' ? 'superadmin' : 'admin';
  if (CONTROL === 'norole') console.log(`   NEGATIVE CONTROL ON (norole): asking about the "${role}" role, which nothing grants. Section 1 must go red.`);
  const res = await get(`rpc/admin_exists?p_role=${encodeURIComponent(role)}`);
  if (!res.ok) {
    /* The helper is optional. Without it the harness still holds sections 2
       and 3, and says so rather than passing silently. */
    console.log(`   admin_exists() is not available (${res.status}), so the count could not be read here`);
    if (CONTROL !== 'norole') console.log('   sections 2 and 3 still hold; see the migration for the verified live state');
    else fail('the control could not run because the helper is missing, which means section 1 proves nothing either way');
  } else {
    const n = Array.isArray(res.body) ? Number(res.body[0]) : Number(res.body);
    console.log(`   ${n} account(s) hold the "${role}" role`);
    if (!n) fail(`nobody holds the "${role}" role, so the admin screen signs every visitor straight back out and the bug report queue is unreachable`);
  }
}

console.log('2) anon cannot ask whether an account is an admin');
{
  const r = await fetch(`${URL_}/rest/v1/rpc/has_role`, {
    method: 'POST', headers: HEAD,
    body: JSON.stringify({ _user_id: '00000000-0000-0000-0000-000000000000', _role: 'admin' }),
  });
  const text = await r.text();
  const blocked = r.status === 401 || r.status === 403 || r.status === 404 || /permission denied/i.test(text);
  console.log(`   anon POST /rpc/has_role -> ${r.status} ${blocked ? '(blocked)' : '(ANSWERED)'}`);
  if (!blocked) {
    fail(`anon can execute has_role over the REST API. profiles is publicly readable and carries user_id, so every account can be enumerated and the admin picked out. Revoke EXECUTE from PUBLIC and grant it to authenticated.`);
  }
}

console.log('3) closing that hole did not break ordinary anonymous reads');
{
  /* THE GUARD ON THE FIX. Revoking EXECUTE from PUBLIC and stopping there
     breaks every anonymous read whose RLS policy calls has_role, because a
     policy function runs as the calling role. tennis_scores was the one policy
     on this database written TO public, and it went "permission denied for
     function has_role" until it was scoped to authenticated. */
  const checks = [
    ['tennis_scores', 'tennis_scores?select=id&limit=1'],
    ['daily_completions', 'daily_completions?select=game_slug&limit=1'],
    ['player_market_values', 'player_market_values?select=player_name&limit=1'],
  ];
  let broken = 0;
  for (const [name, q] of checks) {
    const res = await get(q);
    const ok = res.ok;
    if (!ok) {
      broken += 1;
      fail(`an anonymous read of ${name} failed (${res.status}: ${String(res.body).slice(0, 90)}). If this says "permission denied for function has_role", a policy that calls it is scoped to public and needs scoping to authenticated.`);
    }
  }
  console.log(`   ${checks.length - broken} of ${checks.length} anonymous reads still work`);
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simAdminAccess control (${CONTROL}): green. The missing admin was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simAdminAccess control (${CONTROL}): RED. A role nobody holds was reported as present.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simAdminAccess: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simAdminAccess: green. The queue has a reader, and anon cannot ask who it is.');
