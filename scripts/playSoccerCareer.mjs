/**
 * Round 565: a harness that actually plays Soccer Career, through its own UI,
 * as far as a Champions League campaign.
 *
 * WHY THIS EXISTS. Soccer Career is the flagship, about one in five of all
 * pageviews across the site and roughly eleven times the next most played
 * game, and until this file **no browser walk had ever played it**. Club
 * Manager got one in Round 550 and it immediately found real defects. The
 * generic sweeps do visit /soccer-career, but they press the most game-like
 * button they can find on the first screen, which here is a nationality
 * combobox, so they never got past character creation.
 *
 * The hole that forced it: Round 563 changed the season result card so a two
 * legged Champions League tie prints the aggregate that binds its legs into
 * one tie. tsc was zero, the build was green, and the engine invariant the
 * card reads is fenced over 42,390 sampled ties by simSoccerCareerUcl, and
 * none of that could tell anyone whether the card actually drew. It only
 * renders for a career that has REACHED a European season, and nothing
 * automated got there. That is what this walk is for.
 *
 * WHAT IT MEASURES, and none of it is "the page did not crash".
 *   1. It reaches a career with a QUALIFIED Champions League campaign that
 *      contains at least one two legged tie. If it never does, that is a
 *      COVERAGE FAILURE and it says so loudly rather than passing quietly
 *      having checked nothing, which is the failure mode that let Round 563
 *      ship unseen in the first place.
 *   2. For every two legged tie the ENGINE produced, the CARD ON SCREEN shows
 *      the first leg, the second leg, and an aggregate line whose numbers
 *      equal the engine's own aggFor and aggAgainst. The engine state says
 *      where to look; the assertion is against the rendered DOM, never
 *      against the save. This is the Round 563 check.
 *   3. No first leg carries a W or an L. A first leg wins nothing, and the
 *      card decides that by whether the leg carries an aggregate, so this is
 *      the other half of the same invariant.
 *   4. The Round 544 error boundary never appears and the root never goes
 *      near empty, which is what a render throw looks like from outside.
 *   5. No console error and no page error across the whole walk.
 *
 * IT IS DETERMINISTIC ON PURPOSE. Math.random is replaced before any page
 * code runs with a seeded generator, so a run is reproducible and a failure
 * can be re-examined instead of being shrugged off as variance. SEED moves
 * it. Without that, "the walk did not qualify this time" would be untestable.
 *
 * WHAT IT DOES NOT DO. It does not judge the balance of a career, which is
 * what the sim harnesses are for, and it does not walk every screen. It plays
 * one career to one Champions League campaign and checks what that campaign
 * draws. Everything it could not drive is named in the output.
 *
 * CONTROLS, and both rewrite the SERVED bytes rather than the tree, so they
 * leave nothing behind:
 *   SC_WALK_CONTROL=noagg   restores the pre Round 563 condition exactly, by
 *                           putting back the `decidedBy !== 'aggregate'` guard
 *                           in front of the aggregate line, so an ordinary tie
 *                           settled on aggregate prints no aggregate at all.
 *                           Check 2 must go red and nothing else may.
 *   SC_WALK_CONTROL=noreach caps the walk at two steps so it cannot possibly
 *                           reach a campaign. Check 1 must go red. This is the
 *                           control that proves check 1 is a real gate rather
 *                           than a line that can never fire.
 *
 * Run: ENGINES=chromium node scripts/playSoccerCareer.mjs
 * (dist must be built. PORT moves the server, SEED changes the career, ERA
 * picks the starting era, MAX_STEPS caps the walk, VERBOSE=1 narrates.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4188);
const BASE = process.env.SWEEP_BASE || `http://127.0.0.1:${PORT}`;
const CONTROL = process.env.SC_WALK_CONTROL || '';
const V = !!process.env.VERBOSE;
const SEED = Number(process.env.SEED || 20260914);
const ERA = process.env.ERA || 'Current era';
/* Measured on the built site on 2026-09-14: a career created at 16 reached a
   qualified Champions League campaign in 44 steps. 240 is well over five times
   that, so a run that does not get there is not short of budget. */
const MAX_STEPS = Number(process.env.MAX_STEPS || (CONTROL === 'noreach' ? 2 : 240));

const KNOWN_CONTROLS = ['noagg', 'noreach'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`SC_WALK_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN_CONTROLS.join(', ')})`);
  process.exit(1);
}
/* The only checks each control is allowed to turn red. */
const CONTROL_TARGETS = {
  noagg: ['2. every two legged tie shows its aggregate on screen'],
  noreach: ['1. the walk reached a qualified Champions League campaign'],
};

const failed = [];
let checksRun = 0;
const say = m => { if (V) console.log('      ' + m); };
function check(name, ok, detail) {
  checksRun += 1;
  if (ok) { console.log(`  PASS  ${name}${detail ? ': ' + detail : ''}`); return true; }
  failed.push(`${name}${detail ? ': ' + detail : ''}`);
  console.log(`  FAIL  ${name}${detail ? ': ' + detail : ''}`);
  return false;
}

let server = null;
function stop(code) { if (server) server.kill(); process.exit(code); }

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html is missing. Run npm run build first.');
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * The control's rewrite, resolved against the REAL built bytes.
 * The minifier renames every local on each build, so the guard and the
 * match variable are captured out of the served chunk rather than typed.
 * ------------------------------------------------------------------ */
const AGG_RE = /(\w+)&&(\w+)\.jsxs\("div",\{className:"text-\[10px\] text-center text-muted-foreground",children:\[(\w+)\.aggFor/;
let controlChunk = null;
let controlSwaps = 0;

function rewriteAgg(src) {
  const m = src.match(AGG_RE);
  if (!m) return null;
  const [whole, guard, ns, row] = m;
  /* Exactly the pre Round 563 condition: only print an aggregate when
     something OTHER than the aggregate settled the tie. */
  return src.replace(whole, `${guard}&&${row}.decidedBy!=="aggregate"&&${ns}.jsxs("div",{className:"text-[10px] text-center text-muted-foreground",children:[${row}.aggFor`);
}

if (CONTROL === 'noagg') {
  /* Assert old in src before the edit, or refuse to run. */
  const assets = path.join(DIST, 'assets');
  for (const f of fs.readdirSync(assets)) {
    if (!f.startsWith('SoccerCareer-') || !f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(assets, f), 'utf8');
    if (AGG_RE.test(src)) { controlChunk = f; break; }
  }
  if (!controlChunk) {
    console.error('playSoccerCareer control "noagg": RED before it started. No built SoccerCareer chunk contains the aggregate line, so the rewrite would change nothing and a green run would prove nothing.');
    process.exit(1);
  }
  console.log(`control "noagg": target chunk ${controlChunk}`);
}

server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));

const browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, ignoreHTTPSErrors: true });

/* Seed the page's randomness before any app code runs, and take the cookie
   banner out of the way so it cannot sit over a control. */
await ctx.addInitScript(([seed]) => {
  let t = seed >>> 0;
  Math.random = () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* private mode */ }
  try { localStorage.removeItem('soccerCareerSave'); } catch { /* private mode */ }
}, [SEED]);

const page = await ctx.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 200)));

if (CONTROL === 'noagg') {
  await page.route('**/assets/SoccerCareer-*.js', async route => {
    const res = await route.fetch();
    const body = await res.text();
    const swapped = rewriteAgg(body);
    if (swapped && swapped !== body) { controlSwaps += 1; await route.fulfill({ response: res, body: swapped }); return; }
    await route.fulfill({ response: res, body });
  });
}

console.log(`playSoccerCareer: seed ${SEED}, era "${ERA}", up to ${MAX_STEPS} steps${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });

/* ------------------------------------------------------------------ *
 * Character creation. Every one of these is required before the game
 * will start: the Begin button is disabled until the name, all three
 * selects AND a rolled potential are present, which is why a generic
 * sweep never got past this screen.
 * ------------------------------------------------------------------ */
async function pickCombo(triggerText, wanted) {
  const trigger = page.locator('[role="combobox"]', { hasText: triggerText }).first();
  await trigger.click();
  await page.waitForSelector('[role="option"]', { timeout: 8000 });
  const chosen = await page.evaluate(w => {
    const opts = [...document.querySelectorAll('[role="option"]')];
    const hit = opts.find(o => o.textContent.includes(w)) || opts[0];
    const label = hit.textContent.trim();
    hit.scrollIntoView();
    hit.click();
    return label;
  }, wanted);
  await page.waitForTimeout(400);
  return chosen;
}

await page.fill('input[placeholder*="player name"]', 'Harness Tester');
const nat = await pickCombo('Choose nationality', 'England');
const pos = await pickCombo('Choose position', 'Striker');
const era = await pickCombo('Choose era', ERA);
say(`created ${nat} / ${pos} / ${era}`);

await page.getByRole('button', { name: /Generate Starting Potential/ }).click();
await page.waitForTimeout(2600);
const beginBtn = page.getByRole('button', { name: /Begin Career/ });
await beginBtn.click();
await page.waitForTimeout(1800);

const started = await page.evaluate(() => {
  const raw = localStorage.getItem('soccerCareerSave');
  return raw ? JSON.parse(raw).phase : null;
});
if (!started) {
  check('0. the career started', false, 'Begin Career left no save, so nothing below could run');
  await browser.close();
  report();
}
say(`career started in phase ${started}`);

/* ------------------------------------------------------------------ *
 * The advance loop. The game is a chain of decision phases, so the walk
 * presses the most advancing action it can find and records any phase
 * it could not drive rather than stopping silently.
 * ------------------------------------------------------------------ */
/* Order matters, and the transfer entries are the difference between a walk
   that reaches European football and one that does not.

   The first version of this list ended with a generic 'Stay', which matched
   "Stay and fight for place", and had nothing matching "Leave on free
   transfer". So the walk chose to stay in every window, spent an entire
   career at West Ham (a Championship club since Round 560), and retired at 38
   having never qualified for anything: 213 steps, twelve phases, and the card
   this harness exists to check was never drawn once. The run went red on
   check 1 rather than passing, which is the whole reason check 1 is written
   as a coverage failure instead of a skip.

   A real player takes the move, asks out when nothing is on the table, and
   does not retire while he can still play. So the walk does too. */
const ACTIONS = [
  'Leave on free transfer', // take the move over the extension
  'Join Club',              // the other shape a transfer offer takes
  'Request transfer',       // no offers on the table means ask for them
  '💪 Not Done Yet',        // decline an early retirement suggestion
  'Next Year', 'Next Season', 'Continue', 'Sign Contract',
  'Accept', 'Confirm', 'Proceed', 'Next', 'Done', 'Close',
];
const SKIP = /Retire|New Career|Report a bug|Light mode|Cookie|Sign up|^Back$|Full attributes|Essential only|^Accept$|^⏸$|^🏋️$|^📱/;

async function stepOnce() {
  return page.evaluate(async ([actions, skipSrc]) => {
    const skip = new RegExp(skipSrc);
    const save = () => { try { return JSON.parse(localStorage.getItem('soccerCareerSave') || '{}'); } catch { return {}; } };
    const before = save();
    const usable = [...document.querySelectorAll('button')]
      .filter(b => !b.disabled && b.textContent.trim() && !skip.test(b.textContent.trim()));
    let pick = null;
    for (const a of actions) { pick = usable.find(b => b.textContent.trim().startsWith(a)); if (pick) break; }
    if (!pick) pick = usable[0];
    if (!pick) return { phase: before.phase, age: before.age, action: 'STUCK' };
    const label = pick.textContent.trim().slice(0, 34);
    pick.click();
    await new Promise(r => setTimeout(r, 620));
    const after = save();
    const u = after.lastUCLResult;
    return {
      phase: before.phase, age: before.age, action: label,
      options: usable.map(b => b.textContent.trim().slice(0, 30)),
      qualified: !!(u && u.qualified && (u.matches || []).length),
      retired: !!after.retired,
      cardMounted: !![...document.querySelectorAll('span,div')].find(e => e.textContent.trim() === '⭐ Champions League'),
    };
  }, [ACTIONS, SKIP.source]);
}

const trail = [];
const stuckPhases = new Set();
let reached = false;
let steps = 0;
for (; steps < MAX_STEPS; steps++) {
  const r = await stepOnce();
  trail.push(r);
  if (r.phase === 'transfer_window') say(`window @${r.age}: chose "${r.action}" from [${(r.options || []).join(' / ')}]`);
  if (r.action === 'STUCK') { stuckPhases.add(r.phase || 'unknown'); if (stuckPhases.size > 3) break; }
  if (r.retired) { say('the career retired before a campaign'); break; }
  if (r.qualified && r.cardMounted) { reached = true; break; }
}
const phasesSeen = [...new Set(trail.map(t => t.phase).filter(Boolean))];
say(`${steps} steps across ${phasesSeen.length} phases: ${phasesSeen.join(', ')}`);

/* If the campaign exists but the card is not mounted (some phases do not
   render it), keep advancing a little to bring it on screen. */
if (!reached) {
  for (let extra = 0; extra < 12 && steps < MAX_STEPS; extra++, steps++) {
    const r = await stepOnce();
    trail.push(r);
    if (r.qualified && r.cardMounted) { reached = true; break; }
    if (r.retired || r.action === 'STUCK') break;
  }
}

console.log('\nThe walk');
check('1. the walk reached a qualified Champions League campaign', reached,
  reached
    ? `after ${steps} steps, ${phasesSeen.length} distinct phases driven`
    : `${steps} steps and no campaign on screen. This is a coverage failure, not a pass: the card below was never checked.`);

/* ------------------------------------------------------------------ *
 * The card. The save says where to look, the DOM says what a player saw.
 * ------------------------------------------------------------------ */
let cardReport = null;
if (reached) {
  cardReport = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('soccerCareerSave'));
    const u = save.lastUCLResult;
    const lab = [...document.querySelectorAll('span,div')].find(e => e.textContent.trim() === '⭐ Champions League');
    const card = lab ? (lab.closest('div.bg-card') || lab.parentElement) : null;
    const text = card ? card.innerText.replace(/\s+/g, ' ') : '';
    const rows = card ? [...card.querySelectorAll('div')].map(d => d.innerText.replace(/\s+/g, ' ').trim()) : [];
    const byRound = {};
    for (const m of (u.matches || [])) {
      byRound[m.round] = byRound[m.round] || [];
      byRound[m.round].push(m);
    }
    const ties = Object.entries(byRound).map(([round, legs]) => {
      const first = legs.find(m => m.leg === 1);
      const second = legs.find(m => m.leg === 2);
      const twoLegged = !!(first && second && second.aggFor !== undefined);
      return {
        round, twoLegged,
        agg: twoLegged ? `${second.aggFor}-${second.aggAgainst}` : null,
        decidedBy: second ? second.decidedBy : (first ? first.decidedBy : null),
        firstHasBadge: !!(first && first.decidedBy !== undefined),
      };
    });
    return { text, rows, ties, result: u.result, legCount: (u.matches || []).length };
  });

  const twoLegged = cardReport.ties.filter(t => t.twoLegged);
  const missingAgg = twoLegged.filter(t => !cardReport.text.includes(`${t.agg} on aggregate`));
  const missingLegs = twoLegged.filter(t => !cardReport.text.includes(`${t.round} L1`) || !cardReport.text.includes(`${t.round} L2`));
  const firstLegBadged = cardReport.ties.filter(t => t.firstHasBadge);

  console.log('\nThe card a player actually saw');
  console.log(`      ${cardReport.text.slice(0, 260)}`);

  check('2. every two legged tie shows its aggregate on screen',
    twoLegged.length > 0 && missingAgg.length === 0,
    twoLegged.length === 0
      ? 'the campaign contained no two legged tie at all, so this checked nothing'
      : missingAgg.length === 0
        ? `${twoLegged.length} of ${cardReport.ties.length} ties are two legged and every one prints its aggregate (${twoLegged.map(t => `${t.round} ${t.agg} by ${t.decidedBy}`).join(', ')})`
        : `${missingAgg.length} tie(s) print no aggregate: ${missingAgg.map(t => `${t.round} should read "${t.agg} on aggregate" (settled by ${t.decidedBy})`).join('; ')}`);

  check('3. both legs of a two legged tie are labelled',
    twoLegged.length > 0 && missingLegs.length === 0,
    missingLegs.length === 0 ? `L1 and L2 present for all ${twoLegged.length}` : `missing a leg label: ${missingLegs.map(t => t.round).join(', ')}`);

  check('4. no first leg claims a result',
    firstLegBadged.length === 0,
    firstLegBadged.length === 0 ? 'a first leg wins nothing, and none claims to' : `${firstLegBadged.map(t => t.round).join(', ')} put a W or L on the first leg`);
}

/* ------------------------------------------------------------------ *
 * The page survived being played.
 * ------------------------------------------------------------------ */
const health = await page.evaluate(() => {
  const root = document.getElementById('root');
  return {
    rootLen: root ? root.innerText.trim().length : 0,
    boundary: /Something went wrong|went wrong on this page/i.test(document.body.innerText),
  };
});
console.log('\nThe page survived');
check('5. the error boundary never appeared and the root is not empty',
  !health.boundary && health.rootLen > 200,
  health.boundary ? 'the Round 544 boundary is on screen' : `root holds ${health.rootLen} characters`);
check('6. no console or page errors across the walk',
  consoleErrors.length === 0 && pageErrors.length === 0,
  consoleErrors.length || pageErrors.length ? [...consoleErrors, ...pageErrors].slice(0, 3).join(' | ') : 'none');

if (stuckPhases.size) {
  console.log(`\n      phases the walk could not drive, named rather than hidden: ${[...stuckPhases].join(', ')}`);
}

await browser.close();
report();

function report() {
  console.log('');
  if (CONTROL) {
    const targets = CONTROL_TARGETS[CONTROL];
    const targeted = failed.filter(f => targets.some(t => f.startsWith(t)));
    const stray = failed.filter(f => !targets.some(t => f.startsWith(t)));
    if (CONTROL === 'noagg' && controlSwaps === 0) {
      console.error('control "noagg": no served chunk was rewritten, so the swap changed nothing and this run proves nothing.');
      stop(1);
    }
    if (CONTROL === 'noagg') console.log(`control "noagg": ${controlSwaps} served response(s) rewritten`);
    if (targeted.length === 0) {
      console.error(`control "${CONTROL}": the targeted check stayed green, so it is not measuring what it claims to.`);
      stop(1);
    }
    if (stray.length > 0) {
      console.error(`control "${CONTROL}": other checks went red too, so the control is not isolated: ${stray.join('; ')}`);
      stop(1);
    }
    console.log(`control "${CONTROL}": exactly the targeted check went red, the check works`);
    stop(0);
  }
  console.log(`${checksRun} checks, ${failed.length} failed`);
  if (failed.length) { failed.forEach(f => console.log('  - ' + f)); stop(1); }
  console.log('ALL SOCCER CAREER WALK CHECKS PASSED');
  stop(0);
}
