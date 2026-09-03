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

   Negative control: SIM_SCORING_CONTROL=unwire replaces
   WorldCupPredictor's in-memory copy with an inert page and the run must fail.

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
let controlBit = false;

const read = p => {
  for (const e of ['', '.tsx', '.ts']) {
    try {
      let s = fs.readFileSync(p + e, 'utf8');
      if (CONTROL && path.basename(p + e) === 'WorldCupPredictor.tsx') {
        const before = s;
        /* An inert page removes both direct and transitive paths. This keeps
           the control independent of whatever shared chrome the real page
           imports later. */
        s = 'export default function WorldCupPredictor() { return null; }';
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
      if (/lib\/completions$|hooks\/useGameCompletion$/.test(f)) return;
      const s = read(f);
      if (!s) return;
      if (/\b(recordCompletion|useGameCompletion)\s*\(/.test(s)) { hit = true; return; }
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
   signed-in hydration, deterministically. */
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
export const supabase: any = {
  from: (name: string) => table(name),
  auth: { getUser: async () => ({ data: { user: sessionUser } }) },
};
`);
  fs.writeFileSync(ENTRY, `
export { cacheDisplayName, recordCompletion, recordActivity, setDisplayNameStorageIdentity } from '${ROOT.replaceAll('\\', '/')}/src/lib/completions.ts';
export { getStreakState } from '${ROOT.replaceAll('\\', '/')}/src/lib/streaks.ts';
export { ensureProgressHydration, resetProgressHydration } from '${ROOT.replaceAll('\\', '/')}/src/lib/progressHydration.ts';
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
  mod.setDisplayNameStorageIdentity('user-1');
  mod.resetProgressHydration('user-1');
  await mod.ensureProgressHydration('user-1', async () => true);
  mod.cacheDisplayName('Tester');
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
  console.log(`   2 calls: ${anon.length} anonymous rows, ${streaks.totalPlays} plays and ${streaks.totalPoints} points on the streak record, ${scores[0]?.total_points ?? 'no'} signed in points`);

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
  console.log(`   1 activity ping: anonymous rows ${anonAfter}, plays still ${streaksAfter.totalPlays}, ranked rows still 2`);
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
