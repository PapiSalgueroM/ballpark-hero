/* Quota honesty harness: when the day's AI allowance is gone, the two AI grids say so and stop inviting retries.

   Round 407, Round 379's third option. The soccer and college grids validate
   through a free tier AI. Round 378 measured the daily quota running out
   after a few dozen new guesses, after which every guess came back
   "Couldn't verify, please try again", which is true for a blip and false
   for the rest of the day, and a player kept clicking into a wall. Now a
   refusal says which it was: the validator returns exhausted: true when the
   AI answered 429 twice, and the hook shows one honest message, remembers
   it for the session, and stops offering the search box.

   WHAT THIS HOLDS, all as code with comments stripped:
     1. THE VALIDATORS SAY WHICH. supabase/functions/soccer-grid-validate and
        college-grid-validate carry an unverified(exhausted) helper whose
        refusal names the allowance, retry a 429 once, and return
        unverified(true) on a second 429 before the generic refusal.
     2. THE HOOKS LISTEN. useSoccerGrid.ts and useCollegeGrid.ts read
        data.exhausted, set checkingDown, and show the allowance message
        rather than the retry one; the guess is never counted either way.
     3. THE PAGES STOP INVITING. SoccerGrid.tsx and CollegeGrid.tsx render
        the notice in place of the search box when checkingDown is set.
     4. THE NFL GRID IS NOT IN THIS. useFootballGrid.ts invokes no edge
        function at all (Round 406), so it needs none of the above.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_QUOTA_CONTROL=blind   removes the second 429 branch from the soccer
                               validator in memory; section 1 must go red.
     SIM_QUOTA_CONTROL=mute    removes the exhausted branch from the soccer
                               hook in memory; section 2 must go red.

   Run: node scripts/simQuotaHonesty.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_QUOTA_CONTROL || '';
const failures = { 1: 0, 2: 0, 3: 0, 4: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const VALIDATORS = ['supabase/functions/soccer-grid-validate/index.ts', 'supabase/functions/college-grid-validate/index.ts'];
const HOOKS = ['src/hooks/useSoccerGrid.ts', 'src/hooks/useCollegeGrid.ts'];
const PAGES = ['src/pages/SoccerGrid.tsx', 'src/pages/CollegeGrid.tsx'];

section = 1;
console.log('1) The validators say which: exhausted on a second 429, a blip otherwise');
for (const f of VALIDATORS) {
  let code = stripComments(read(f));
  if (CONTROL === 'blind' && f.includes('soccer')) {
    const cut = code.replace(/\s*if \(resp\.status === 429\) return unverified\(true\);/, '');
    if (cut === code) abort('control cannot run: the soccer validator has no second 429 branch to remove');
    code = cut;
    console.log('   NEGATIVE CONTROL ON: the second 429 branch removed from the soccer validator, in memory');
  }
  if (CONTROL === 'lenient' && f.includes('soccer')) {
    const cut = code.replace('result.valid && !sameName', 'false');
    if (cut === code) abort('control cannot run: the soccer validator has no name guard to remove');
    code = cut;
    console.log('   NEGATIVE CONTROL ON: the name guard removed from the soccer validator, in memory');
  }
  if (!/const unverified = \(exhausted = false\) =>/.test(code)) fail(`${f}: the refusal helper does not take an exhausted flag`);
  if (!/exhausted,/.test(code) || !/allowance for today/.test(code)) fail(`${f}: the refusal does not carry exhausted or name the allowance`);
  if (!/if \(resp\.status === 429\) \{/.test(code)) fail(`${f}: a 429 is not retried once`);
  if (!/if \(resp\.status === 429\) return unverified\(true\);/.test(code)) fail(`${f}: a second 429 does not return unverified(true)`);
  const secondAt = code.indexOf('if (resp.status === 429) return unverified(true);');
  const genericAt = code.indexOf('if (!resp.ok)');
  if (secondAt >= 0 && genericAt >= 0 && secondAt > genericAt) fail(`${f}: the generic refusal comes before the exhausted one, so exhausted can never fire`);
  /* Round 407, the two findings the logs handed back once refusals were
     logged: the model's own reasoning tokens ate a 150 token cap before
     the verdict (every AI judged guess refused as a blip), and a lenient
     prompt mapped a nonsense name onto a real player (a verdict handed to
     a stranger). The cap must leave room, and a verdict must share a name
     token with the guess. */
  const cap = code.match(/max_tokens: (\d+)/);
  if (!cap || Number(cap[1]) < 600) fail(`${f}: max_tokens is ${cap ? cap[1] : 'missing'}, below the 600 the model's reasoning needs before its verdict`);
  if (!/const sameName = nameTokens\.length === 0 \|\| nameTokens\.some\(\(t\) => guessTokens\.includes\(t\)\);/.test(code)) fail(`${f}: no name agreement guard on the AI verdict`);
  if (!/result\.valid && !sameName/.test(code)) fail(`${f}: a valid verdict is not gated on the name agreeing with the guess`);
}
console.log(`   ${VALIDATORS.length} validators read`);

section = 2;
console.log('2) The hooks listen: data.exhausted sets checkingDown and shows the allowance message');
for (const f of HOOKS) {
  let code = stripComments(read(f));
  if (CONTROL === 'mute' && f.includes('Soccer')) {
    const cut = code.replace(/if \(data\?\.exhausted\) \{[\s\S]*?\} else /, '');
    if (cut === code) abort('control cannot run: the soccer hook has no exhausted branch to remove');
    code = cut;
    console.log('   NEGATIVE CONTROL ON: the exhausted branch removed from the soccer hook, in memory');
  }
  if (!/const \[checkingDown, setCheckingDown\] = useState\(false\)/.test(code)) fail(`${f}: no checkingDown state`);
  if (!/if \(data\?\.exhausted\) \{/.test(code)) fail(`${f}: data.exhausted is not read`);
  if (!/setCheckingDown\(true\)/.test(code)) fail(`${f}: checkingDown is never set`);
  if (!/allowance for today/.test(code)) fail(`${f}: the allowance message is missing`);
  if (!/checkingDown,/.test(code.slice(code.lastIndexOf('return {')))) fail(`${f}: checkingDown is not returned to the page`);
}
console.log(`   ${HOOKS.length} hooks read`);

section = 3;
console.log('3) The pages stop inviting: the notice replaces the search box');
for (const f of PAGES) {
  const code = stripComments(read(f));
  if (!/checkingDown \? \(/.test(code)) fail(`${f}: the page does not branch on checkingDown around the search box`);
  if (!/allowance for today/.test(code)) fail(`${f}: the page carries no allowance notice`);
}
console.log(`   ${PAGES.length} pages read`);

section = 4;
console.log('4) The NFL grid is not in this: no edge function call at all');
{
  const code = stripComments(read('src/hooks/useFootballGrid.ts'));
  if (/functions\.invoke\(/.test(code)) fail('useFootballGrid invokes an edge function again');
  console.log('   useFootballGrid read');
}

const own = { blind: 1, lenient: 1, mute: 2 }[CONTROL];
const total = failures[1] + failures[2] + failures[3] + failures[4];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (blind, lenient, mute)`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimQuotaHonesty: ${total} failure(s)`); process.exit(1); }
console.log('\nsimQuotaHonesty: green. When the allowance is gone, both AI grids say so and stop asking for retries.');
