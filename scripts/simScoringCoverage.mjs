/* Every game on the registry earns credit, mechanically proven.

   Round 299, off the owner's 2026-08-26 tweaks document: "make sure streaks
   and played today and points all work and are accurate and u can get points
   from any game." The audit that built this found exactly one real gap in
   127 registry paths: the World Cup bracket crowned champions and recorded
   nothing, so it fed no streak and no played-today count. The fix went in
   with this file; this file keeps the next game honest.

   THE RULE: every registry path resolves through App.tsx to a page whose
   import graph reaches recordCompletion or useGameCompletion within four
   hops. A path routed to a Navigate redirect is a retired address and is
   exempt BY SHAPE (read from App.tsx, never a hand list here, so a new
   redirect exempts itself and a new game cannot hide behind the list).

   Negative control: SIM_SCORING_CONTROL=unwire deletes the completion
   imports from WorldCupPredictor's in-memory copy and the run must fail.

   Negative control: SIM_SCORING_CONTROL=nosave (Round 569) makes the stub's
   local session come back empty, so a signed in play is never handed to the
   atomic save. Section 2's signed in points, daily marks, best scores and
   save call count must all go red. It reproduces the one way Round 569's
   switch from getUser to getSession could fail silently: the recorder asking
   for a session the client does not hand back.

   Run: node scripts/simScoringCoverage.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_SCORING_CONTROL === 'unwire';
const NOSAVE = process.env.SIM_SCORING_CONTROL === 'nosave';
let controlBit = false;

const read = p => {
  for (const e of ['', '.tsx', '.ts']) {
    try {
      let s = fs.readFileSync(p + e, 'utf8');
      /* Round 569: the separators are folded before matching. path.join gives
         backslashes on Windows, so this control compared "...\pages\..." to
         "pages/WorldCupPredictor.tsx", never matched, and reported itself
         dead on every run on the owner's machine: section 1 was never proven
         there. Checked against the committed version before this round, which
         was dead too, so it predates the save change it was found beside. The
         same trap was fixed in simEarlyReturnScope. */
      if (CONTROL && (p + e).replaceAll('\\', '/').endsWith('pages/WorldCupPredictor.tsx')) {
        const before = s;
        /* Sever the call names AND the import specifier: the walk follows
           imports into the completions module, whose own source contains
           the needle, so leaving the specifier standing lets the walk reach
           coverage through the very import being unwired. The first draft
           of this control did exactly that and reported itself dead. */
        s = s.replace(/recordCompletion|useGameCompletion/g, 'nothingAtAll').replace(/@\/lib\/completions/g, '@/lib/nothingAtAll');
        if (s !== before) controlBit = true;
      }
      return s;
    } catch { /* try next extension */ }
  }
  return '';
};

console.log('1) every registry game reaches the scoring pipeline from its routed page');
{
  const reg = read(path.join(ROOT, 'src/data/gameRegistry.ts'));
  const paths = [...reg.matchAll(/path: '([^']+)'/g)].map(m => m[1]);
  const app = read(path.join(ROOT, 'src/App.tsx'));
  const lazies = Object.fromEntries(
    [...app.matchAll(/const (\w+) = lazy\(\(\) => import\("\.\/pages\/([^"]+)"\)\)/g)].map(m => [m[1], path.join(ROOT, 'src/pages', m[2])]),
  );
  const routes = [...app.matchAll(/path="([^"]+)"\s+element=\{<(\w+)/g)];
  if (paths.length < 100) fail(`only ${paths.length} registry paths, the read is broken`);
  if (routes.length < 100) fail(`only ${routes.length} routes in App.tsx, the read is broken`);

  let covered = 0, redirects = 0;
  for (const gp of paths) {
    const r = routes.find(x => x[1] === gp);
    if (!r) { fail(`${gp} has no route in App.tsx`); continue; }
    if (r[2] === 'Navigate') { redirects += 1; continue; }
    const file = lazies[r[2]];
    if (!file) { fail(`${gp} routes to ${r[2]}, which is not a lazy page import; route it the standard way or teach this harness the new shape`); continue; }
    const seen = new Set();
    let hit = false;
    const walk = (f, d) => {
      if (hit || d > 3 || seen.has(f)) return;
      seen.add(f);
      /* The definition files always contain the names; a hit must be a CALL
         somewhere else, or every page that transitively imports the module
         through shared chrome would count as wired. The first draft of this
         walk had exactly that hole, found by its own negative control. */
      /* Round 569: folded separators, for the same reason as the control
         above. On Windows f holds backslashes, so this exclusion never
         matched, the definition files counted as hits again, and every page
         importing AuthContext or the navbar (both reach the completions
         module) was "wired" whether or not its game records anything. The
         fix for the first draft's hole had silently reopened it on the
         owner's machine, and the dead control hid that. */
      if (/lib\/completions$|hooks\/useGameCompletion$/.test(f.replaceAll('\\', '/'))) return;
      const s = read(f);
      if (!s) return;
      /* Round 569: the CALL is matched in the code with comments stripped.
         src/data/completionSlugs.ts has no call at all, only a doc comment
         reading "each game's own `useGameCompletion(...)` call", and shared
         chrome imports it (DailyChecklist, useDailyLegend, useMostPlayed), so
         that sentence alone was counting pages as wired. The lookbehind keeps
         a URL's double slash from being read as a comment. */
      const code = s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
      if (/\b(recordCompletion|useGameCompletion)\s*\(/.test(code)) { hit = true; return; }
      for (const m of s.matchAll(/from ['"]@\/([^'"]+)['"]/g)) walk(path.join(ROOT, 'src', m[1]), d + 1);
    };
    walk(file, 0);
    if (hit) covered += 1;
    else fail(`${gp} never reaches recordCompletion or useGameCompletion, so playing it earns no streak day, no played-today credit and no points`);
  }
  console.log(`   ${paths.length} registry paths: ${covered} wired for credit, ${redirects} retired redirects exempt by shape`);
}

console.log('2) one recordCompletion call feeds all three pipelines, with the right numbers');
/* Round 300. Section 1 proves every game REACHES the recorder; this proves
   the recorder DELIVERS: the anonymous row, the local streak record, and the
   signed in save all move from one call, and none of them moves twice. The
   supabase client is swapped for a ledger stub at bundle time, so this runs
   the real completions and streaks code against a fake database and a fake
   session, deterministically. */
{
  const { execSync } = await import('node:child_process');
  const STUB = path.join(os.tmpdir(), 'scoringStub.ts').replaceAll('\\', '/');
  const ENTRY = path.join(os.tmpdir(), 'scoringEntry.mjs');
  const BUNDLE = path.join(os.tmpdir(), 'scoring.bundle.mjs');
  fs.writeFileSync(STUB, `
export const SUPABASE_URL = 'stub';
export const SUPABASE_PUBLISHABLE_KEY = 'stub';
export const ledger: Record<string, any[]> = {};
let sessionUser: { id: string } | null = null;
export function setSessionUser(u: { id: string } | null) { sessionUser = u; }
function table(name: string) {
  ledger[name] = ledger[name] || [];
  const rows = ledger[name];
  const q: any = {
    _filters: {} as Record<string, unknown>,
    insert(row: any) { rows.push(row); return Promise.resolve({ error: null }).then ? Object.assign(Promise.resolve({ error: null }), { then: Promise.prototype.then.bind(Promise.resolve({ error: null })) }) : { error: null }; },
    update(patch: any) { q._patch = patch; return q; },
    select(_cols?: string, opts?: any) { q._count = opts && opts.count; return q; },
    eq(col: string, val: unknown) {
      q._filters[col] = val;
      if (q._patch) {
        for (const r of rows) if (Object.entries(q._filters).every(([k, v]) => r[k] === v)) Object.assign(r, q._patch);
        return Promise.resolve({ error: null });
      }
      return q;
    },
    single() { const hit = rows.find(r => Object.entries(q._filters).every(([k, v]) => r[k] === v)) || null; return Promise.resolve({ data: hit, error: hit ? null : { code: 'PGRST116' } }); },
    then(res: any, rej: any) {
      if (q._count) { const n = rows.filter(r => Object.entries(q._filters).every(([k, v]) => r[k] === v)).length; return Promise.resolve({ count: n, error: null }).then(res, rej); }
      return Promise.resolve({ data: rows, error: null }).then(res, rej);
    },
  };
  return q;
}
/* Round 569: the signed in save is one call to the record_auth_completion
   database function now, not direct writes to four tables, and the recorder
   reads the local session (getSession) instead of asking the auth server.
   This stub models that function's CONTRACT so every outcome assertion below
   keeps meaning "a signed in play reaches the scoreboard with the right
   numbers": a score row per play, one daily mark per game per day, an in place
   increment of total_points, and a best score that only rises. It is NOT a test
   of the SQL itself. The SQL is pinned by simAuthSave section 3 and was
   exercised against the real database in a rolled back transaction, recorded
   in supabase/migrations/20260914120000_record_auth_completion.sql. */
function recordAuthCompletion(args: any) {
  if (!sessionUser) return { data: null, error: { code: '42501' } };
  const uid = sessionUser.id;
  const day = 'today';
  const slug = args.p_game_slug;
  const score = Number(args.p_score) || 0;
  table('user_game_scores');
  ledger['user_game_scores'].push({ user_id: uid, game_type: slug, score, correct_answers: args.p_correct || 0 });
  table('daily_completions');
  if (!ledger['daily_completions'].some(r => r.user_id === uid && r.game_slug === slug && r.date === day)) {
    ledger['daily_completions'].push({ user_id: uid, game_slug: slug, date: day });
  }
  table('user_scores');
  const mine = ledger['user_scores'].find(r => r.user_id === uid);
  if (mine) mine.total_points += score;
  else ledger['user_scores'].push({ user_id: uid, total_points: score });
  table('user_best_scores');
  const best = ledger['user_best_scores'].find(r => r.user_id === uid && r.game_type === slug);
  if (!best) ledger['user_best_scores'].push({ user_id: uid, game_type: slug, best_score: score });
  else if (score > best.best_score) best.best_score = score;
  return { data: { total_points: (ledger['user_scores'].find(r => r.user_id === uid) || {}).total_points }, error: null };
}
export const supabase: any = {
  from: (name: string) => table(name),
  rpc: async (name: string, args: any) => {
    ledger['__rpc__'] = ledger['__rpc__'] || [];
    ledger['__rpc__'].push({ name, args });
    if (name === 'record_auth_completion') return recordAuthCompletion(args);
    return { data: null, error: { code: 'PGRST202' } };
  },
  auth: {
    getUser: async () => ({ data: { user: sessionUser } }),
    getSession: async () => ({ data: { session: ${NOSAVE ? 'null' : '(sessionUser ? { user: sessionUser } : null)'} } }),
  },
};
`);
  fs.writeFileSync(ENTRY, `
export { recordCompletion, recordActivity } from '${ROOT.replaceAll('\\', '/')}/src/lib/completions.ts';
export { getStreakState } from '${ROOT.replaceAll('\\', '/')}/src/lib/streaks.ts';
export { ledger, setSessionUser } from '${STUB}';
`);
  execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@/integrations/supabase/client=${STUB}`, { stdio: 'inherit' });
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => { store.clear(); },
  };
  globalThis.window = { dispatchEvent: () => {} };
  const mod = await import(pathToFileURL(BUNDLE).href);

  mod.setSessionUser({ id: 'user-1' });
  mod.recordCompletion('/soccer-grid', 40, 'Tester', 3);
  await new Promise(r => setTimeout(r, 50));
  mod.recordCompletion('/missing-xi', 100, 'Tester');
  await new Promise(r => setTimeout(r, 50));

  const anon = mod.ledger['game_completions'] || [];
  if (anon.length !== 2) fail(`anonymous pipeline got ${anon.length} rows from 2 calls`);
  const streaks = mod.getStreakState();
  if ((streaks.totalPlays || 0) !== 2) fail(`streak pipeline counted ${streaks.totalPlays} plays from 2 calls`);
  if ((streaks.totalPoints || 0) !== 140) fail(`streak pipeline summed ${streaks.totalPoints} points, wanted 140`);
  const scores = (mod.ledger['user_scores'] || []);
  if (scores.length !== 1) fail(`user_scores has ${scores.length} rows, wanted the one upserted row`);
  else if (scores[0].total_points !== 140) fail(`signed in points landed at ${scores[0].total_points}, wanted 140`);
  const daily = mod.ledger['daily_completions'] || [];
  if (daily.length !== 2) fail(`daily_completions got ${daily.length} rows from 2 different games`);
  const best = mod.ledger['user_best_scores'] || [];
  if (best.length !== 2) fail(`user_best_scores got ${best.length} rows from 2 different games`);
  /* Round 569: the delivery itself. Two plays must be exactly two save calls
     carrying the right game and score, because a recorder that saved twice per
     play, or saved under the wrong slug, would still leave the totals above
     looking plausible. */
  const saves = (mod.ledger['__rpc__'] || []).filter(c => c.name === 'record_auth_completion');
  if (saves.length !== 2) fail(`2 plays made ${saves.length} record_auth_completion calls, wanted exactly 2`);
  else {
    const got = saves.map(c => `${c.args.p_game_slug}:${c.args.p_score}`).join(',');
    if (!/soccer-grid:40/.test(got) || !/missing-xi:100/.test(got)) fail(`the save calls carried ${got}, wanted soccer-grid:40 and missing-xi:100`);
  }
  console.log(`   2 calls: ${anon.length} anonymous rows, ${streaks.totalPlays} plays and ${streaks.totalPoints} points on the streak record, ${scores[0]?.total_points ?? 'no'} signed in points, ${saves.length} atomic save calls`);

  /* Round 301, audit finding 2: the activity ping must stay a ping. The sim
     boards fire it every simulated round, and Round 300's fan out briefly
     turned those pings into full plays (a fifteen season career counted as
     sixteen). An activity call adds an anonymous row and NOTHING else. */
  mod.recordActivity('/front-office');
  await new Promise(r => setTimeout(r, 50));
  const anonAfter = (mod.ledger['game_completions'] || []).length;
  const streaksAfter = mod.getStreakState();
  if (anonAfter !== 3) fail(`an activity ping should add exactly one anonymous row (${anonAfter} total, wanted 3)`);
  if ((streaksAfter.totalPlays || 0) !== 2) fail(`an activity ping advanced totalPlays to ${streaksAfter.totalPlays}, pings must never count as plays`);
  if ((mod.ledger['user_game_scores'] || []).length !== 2) fail('an activity ping wrote a ranked user_game_scores row');
  const savesAfter = (mod.ledger['__rpc__'] || []).filter(c => c.name === 'record_auth_completion').length;
  if (savesAfter !== 2) fail(`an activity ping made a signed in save call (${savesAfter} total, wanted still 2)`);
  console.log(`   1 activity ping: anonymous rows ${anonAfter}, plays still ${streaksAfter.totalPlays}, ranked rows still 2`);
}

if (NOSAVE) {
  if (failures > 0) { console.log(`\ncontrol run (nosave): ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error('\ncontrol run (nosave): an empty session changed NOTHING, so section 2 is not measuring the signed in save');
  process.exit(1);
}
if (CONTROL) {
  if (!controlBit) { console.error('\ncontrol run: nothing was unwired, the control is dead'); process.exit(1); }
  if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error('\ncontrol run: unwiring the bracket changed NOTHING, the walk is dead');
  process.exit(1);
}
console.log('   teeth: four hop import walk, redirects derived from App.tsx, floors on both reads');
if (failures > 0) { console.error(`\nsimScoringCoverage: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimScoringCoverage: all green');
