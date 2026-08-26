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

   Run: node scripts/simScoringCoverage.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_SCORING_CONTROL === 'unwire';
let controlBit = false;

const read = p => {
  for (const e of ['', '.tsx', '.ts']) {
    try {
      let s = fs.readFileSync(p + e, 'utf8');
      if (CONTROL && (p + e).endsWith('pages/WorldCupPredictor.tsx')) {
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

if (CONTROL) {
  if (!controlBit) { console.error('\ncontrol run: nothing was unwired, the control is dead'); process.exit(1); }
  if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error('\ncontrol run: unwiring the bracket changed NOTHING, the walk is dead');
  process.exit(1);
}
console.log('   teeth: four hop import walk, redirects derived from App.tsx, floors on both reads');
if (failures > 0) { console.error(`\nsimScoringCoverage: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimScoringCoverage: all green');
