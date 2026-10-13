/**
 * Round 201 browser harness: getting sacked and getting back in.
 *
 * simWilderness proves the market. This proves the screen a sacked manager
 * actually sees: the save is doctored to zero board confidence (the same
 * state a bad run produces, reached in one step instead of twenty), the
 * next result triggers the sack, and the wilderness has to be there with a
 * way onward. Then a week is waited, a job is taken, and the career has to
 * be running again at the new club.
 *
 * Doctoring the save follows the Round 196 rule: edit from a page where the
 * app does not run, then open the game fresh, so the load path is on trial
 * too.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playWilderness.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 *
 * Round 672: red since Round 303 put the Dugout step (the manager picker)
 * behind the club card. The walk now skips it, like its siblings. Once past
 * it, a second red showed up in 2 of about 25 runs: a squad that kept
 * winning reached the January window, where the walk had no click, and its
 * every-40-steps re-doctor was being overwritten by the app. Both fixed in
 * the loop below, with the measurements.
 *
 * NEGATIVE CONTROL: WILDERNESS_CONTROL=nooffers rewrites the served
 * wilderness so the offers never reach the screen, the phone that never
 * rings. The "a club called" check must fail, which proves the walk still
 * gets sacked, still reaches the wilderness and still reads it.
 *
 * Round 1314: a coin toss at the AX join (rAXg-F-J5 red after 98 s, green on
 * its siblings), and nothing in its output said why. Three changes. The page
 * plays on a seeded stream (WILDERNESS_SEED, scripts/lib/pageSeed.mjs), printed
 * first. The loop prints, per 40 step block, the matches played and the board
 * confidence read from the save and how many presses changed nothing, the
 * step the sack came at, and on a miss the visible buttons and a 390
 * screenshot in $RC_OUT. And a second control, WILDERNESS_CONTROL=nosack:
 * the served sack sites never set the flag (.sacked=!0 turned into .sacked=!1,
 * counted against the source first), so "the board ran out of patience" must
 * fail, guarded for nosack only. Both controls exit 0 on "all N guarded checks
 * fired" and 1 otherwise. The walk also blocks the database host.
 * Measured on 2e288252 (runner result r1314-wild1, 2026-10-12): the default
 * seed 2899200577 was sacked at step 6 after 3 matches with 4042 page draws
 * and a club called after 3 waits, the same in three runs and under CPU
 * throttling at rate 4. Seeds 1 to 10 were sacked at steps 52, 2, 4, 38, 2, 4,
 * 16, 6, 2 and 2 (25, 1, 2, 19, 1, 2, 8, 3, 1 and 1 matches), and a club called
 * after 3, 2, 1, 2, 6, 1, 1, 8, 3 and 4 waits: all ten green, 17 to 54 s.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';
import { pageSeedOf, seedPages, pageDraws } from './lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Round 1314: the page plays on a seeded stream (scripts/lib/pageSeed.mjs), so a red can be played
   again. WILDERNESS_SEED is the one knob: unset, the walk's own seed from its file name; a whole
   number; or "fresh". Printed first, because it is how a red is replayed. */
let SEED = 0;
try { SEED = pageSeedOf(import.meta.url, process.env.WILDERNESS_SEED); }
catch (e) { console.error(`WILDERNESS_SEED: ${e.message}`); process.exit(2); }
console.log(`playWilderness: seed ${SEED}${process.env.WILDERNESS_SEED === undefined ? ' (the walk\'s own, from its file name)' : ''}. Replay with WILDERNESS_SEED=${SEED}`);

const CONTROL = process.env.WILDERNESS_CONTROL || '';
if (CONTROL && CONTROL !== 'nooffers' && CONTROL !== 'nosack') {
  console.error(`WILDERNESS_CONTROL=${CONTROL} is not a control this harness knows (nooffers, nosack)`);
  process.exit(1);
}
const { say, verdict } = controlledChecks(CONTROL);
const proof = {};
/* Round 1314: WILDERNESS_CONTROL=nosack, the board that never acts. Both engine sack sites set a
   PROPERTY, which minifying keeps (state.sacked = true is .sacked=!0 in the chunk), so the served
   chunk has it turned into .sacked=!1. The sites are counted in src and in dist/assets first, and the
   run refuses to start unless one built chunk holds exactly as many as the source has. */
const SACK = /\.sacked=!0/g;
let SACK_SITES = 0;
if (CONTROL === 'nosack') {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  SACK_SITES = (src.match(/\.sacked = true;/g) || []).length;
  const dir = path.join(ROOT, 'dist', 'assets');
  const hits = fs.readdirSync(dir).filter(f => f.endsWith('.js'))
    .map(f => ({ f, n: (fs.readFileSync(path.join(dir, f), 'utf8').match(SACK) || []).length }))
    .filter(h => h.n > 0);
  console.log(`  control  ${SACK_SITES} sack site(s) in clubManager.ts; in dist/assets: ${hits.map(h => `${h.f} ${h.n}`).join(', ') || 'none'}`);
  if (!SACK_SITES || hits.length !== 1 || hits[0].n !== SACK_SITES) {
    console.error(`playWilderness control nosack: refused, the built chunks must hold exactly the ${SACK_SITES} sack site(s) of the source in one chunk`);
    process.exit(1);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
/* Round 1314: no walk reaches the live database. */
await ctx.route(/supabase\.co/, r => r.abort());
await seedPages(ctx, SEED);
if (CONTROL === 'nooffers') {
  await installServedCodeControl(ctx, [
    { label: 'offerList', find: /\.offers\)\?\?\[\]\)\.map\(/g, replace: '.offers)??[]).slice(0,0).map(' },
  ], proof);
}
if (CONTROL === 'nosack') {
  await installServedCodeControl(ctx, [{ label: 'sack', find: SACK, replace: '.sacked=!1' }], proof);
}
let page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

console.log('1) Take a job, then lose it');
await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const fresh = page.locator('text=Start Fresh');
if (await fresh.count()) { await fresh.click(); await page.waitForTimeout(800); }
await page.locator('button:has-text("2026-27")').first().click();
await page.waitForTimeout(700);
await page.locator('text=England').first().click();
await page.waitForTimeout(700);
/* Round 1304: the league TILE, not any text. Since Round 1052 the line under the page title names the Russian
   Premier League, so 'text=Premier League' pressed that sentence and the league step never moved on. */
await page.locator('button:has-text("Premier League")').first().click();
await page.waitForTimeout(700);
await page.locator('button:has-text("Newcastle")').first().click();
await page.waitForTimeout(500);
const essential = page.locator('button:has-text("Essential only")');
if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
await page.locator('text=Take the job').click();
/* Round 672: Round 303 put the manager picker (the Dugout step) behind the
   club card, with its own "Take the job" and a skip. This walk never learned
   it, so it sat on the picker and every later check failed with it. Skip
   past it the way playSponsors and playReleaseClause already do. The picker
   is a lazy chunk, so wait for it rather than counting on a fixed pause: a
   count taken 800ms after the click missed it under load. If it never shows,
   the next check still fails on the missing hub. */
const skipManager = page.locator('button:has-text("Skip: just manage")').first();
await skipManager.waitFor({ timeout: 15000 }).then(() => skipManager.click()).catch(() => {});
await page.waitForTimeout(2000);
say(await page.locator('button:has-text("Finances")').count() > 0, 'the career is running');

/* Confidence to the floor, and a squad that cannot rescue it. */
await page.close();
const helper = await ctx.newPage();
await helper.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
const patched = await helper.evaluate(() => {
  /* The save key is 'dukb-club-manager-save', hyphenated, which a naive
     search for "clubmanager" misses: that is how this walk first failed. */
  const key = 'dukb-club-manager-save';
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  const c = JSON.parse(raw);
  c.boardConfidence = 0.4;
  for (const p of c.squad ?? []) p.ovr = 45;
  localStorage.setItem(key, JSON.stringify(c));
  return true;
});
await helper.close();
say(patched, 'the save was doctored to a board about to pull the trigger');

page = await ctx.newPage();
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const resume = page.locator('button:has-text("Resume Career")');
if (await resume.count()) { await resume.first().click(); await page.waitForTimeout(1200); }

/* Play until the board acts. A doctored 45 rated squad loses often.
   The loop clicks EXACT button names on purpose: an earlier version used a
   substring union and its "Continue" arm matched the transfer window
   banner, which navigated to the market and left the fixture unplayed for
   forty iterations. Quick Sim is the fastest of the three ways to play a
   match, and Home is the way back if a tile swallowed the click. */
const clickExact = async (name) => {
  const b = page.getByRole('button', { name, exact: true });
  if (!(await b.count())) return false;
  await b.first().click({ timeout: 4000 }).catch(() => {});
  return true;
};
/* Round 672: Home is a Radix tab, role "tab", so clickExact('Home') never
   matched it and the "way back" did nothing. */
const homeTab = async () => {
  const t = page.getByRole('tab', { name: 'Home', exact: true });
  if (!(await t.count())) return false;
  await t.first().click({ timeout: 4000 }).catch(() => {});
  return true;
};
let sacked = false;
/* Round 251: 60 iterations was measured headroom in a sandbox whose
   browser had no egress, where pages settled fast. With real egress the
   cycle is slower, and a doctored board still holds its nerve in some
   runs (the sack is the engine's stochastic call, and the live game
   SAVES ITS OWN recovering confidence over the doctored number). So the
   walk polices itself instead of hoping: every 40 iterations without a
   sack, the save is doctored back to the floor and the career resumed,
   which keeps the trigger inside the engine while making the outcome
   inevitable inside a bounded walk. */
/* Round 672: two holes in that policing, both measured on a run where the
   45 rated squad kept winning (board confidence climbed to 30 by week 26).
   The re-doctor edited the save from the RUNNING app and then navigated, and
   the app saved its own state over the edit on the way out: confidence read
   28.8 before it and 30.1 one match after. It now leaves for robots.txt
   first, the Round 196 rule the first doctoring already follows. And a career
   that survives to the mid-season break meets "Open the Window", which none
   of the clicks below matched, so the walk sat on the hub "pressing Home"
   (a button that does not exist, see homeTab) for the rest of its 120 steps.
   Opening the window lands on the Market tab, and the Home tab is the way
   back to the fixture list; that is how playClubManager gets past it too. */
/* Round 1314: the walk says where it stood. The AX join's red (rAXg-F-J5) printed only the failing
   line, so whether the loop played 120 steps against a board that held, or sat on a screen none of
   its presses matches, was a reading and not a fact. Now every 40 step block prints the matches
   played and the board confidence read from the save, and how many presses changed nothing (no new
   result and no new screen); a miss prints the visible buttons and leaves a 390 screenshot in
   $RC_OUT. The engine's sack is deterministic once confidence reaches zero, so a block that plays
   matches against a floored board and is not sacked is a DEFECT candidate, while a block of presses
   that change nothing is a screen the walk has no press for. */
const readSave = () => page.evaluate(() => {
  const raw = localStorage.getItem('dukb-club-manager-save');
  if (!raw) return null;
  const c = JSON.parse(raw);
  return { played: c.careerStats?.played ?? null, conf: c.boardConfidence, week: c.week, season: c.season, sacked: c.sacked };
}).catch(() => null);
const screenOf = async () => {
  const s = await readSave();
  const names = await page.locator('button:visible').allInnerTexts().catch(() => []);
  return { s, sig: `${s?.season}|${s?.week}|${s?.played}|${names.slice(0, 4).join('/')}`, names };
};
let sackStep = -1;
let kickoffDraws = null;
let blockNoop = 0;
let blockStart = await readSave();
for (let i = 0; i < 120 && !sacked; i++) {
  if (await page.locator('[data-wilderness]').count()) { sacked = true; sackStep = i; break; }
  if (i > 0 && i % 40 === 0) {
    const end = await readSave();
    console.log(`  block ${i / 40}: steps ${i - 40} to ${i - 1}, matches played ${blockStart?.played} to ${end?.played}, board confidence ${end?.conf}, presses that changed nothing ${blockNoop}`);
    blockNoop = 0;
    await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const key = 'dukb-club-manager-save';
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const c = JSON.parse(raw);
      c.boardConfidence = 0.05;
      for (const p of c.squad ?? []) p.ovr = 40;
      localStorage.setItem(key, JSON.stringify(c));
    });
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const again = page.locator('button:has-text("Resume Career")');
    if (await again.count()) { await again.first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1000); }
    blockStart = await readSave();
    continue;
  }
  const before = (await screenOf()).sig;
  let pressed = false;
  if (kickoffDraws === null && await page.getByRole('button', { name: '⚡ Quick Sim', exact: true }).count()) {
    kickoffDraws = await pageDraws(page);
    console.log(`  first kick off at step ${i}: the page had drawn ${kickoffDraws} times`);
  }
  if (await clickExact('⚡ Quick Sim')) { await page.waitForTimeout(600); pressed = true; }
  else if (await clickExact('Open the Window')) {
    await page.waitForTimeout(600);
    await homeTab();
    await page.waitForTimeout(400);
    pressed = true;
  }
  if (!pressed) {
    const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
    if (await onward.count()) { await onward.first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(500); pressed = true; }
  }
  if (!pressed) {
    await homeTab();
    await page.waitForTimeout(400);
  }
  if ((await screenOf()).sig === before) blockNoop += 1;
}
if (sacked) {
  const at = await readSave();
  console.log(`  sacked at step ${sackStep}: matches played ${at?.played}, season ${at?.season} week ${at?.week}, the page had drawn ${await pageDraws(page)} times since its last load`);
} else {
  const { s, names } = await screenOf();
  console.log(`  NOT sacked after 120 steps: matches played ${s?.played}, board confidence ${s?.conf}, season ${s?.season} week ${s?.week}, saved sacked flag ${s?.sacked}, presses that changed nothing in the last block ${blockNoop}`);
  console.log(`  visible buttons: ${names.map(n => n.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30).join(' | ')}`);
  /* The top of the screen the walk stood on: the loop's presses can leave it scrolled down into the guide. */
  if (process.env.RC_OUT) {
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await page.screenshot({ path: path.join(process.env.RC_OUT, 'wilderness-miss-390.png') }).catch(() => {});
  }
}
/* Round 1314: guarded for nosack only (the board that never acts must turn this red). */
say(sacked, 'the board ran out of patience and the wilderness opened', CONTROL === 'nosack');

if (sacked) {
  console.log('2) The wilderness has a way onward');
  const panel = page.locator('[data-wilderness]');
  const text = await panel.innerText();
  say(/Out of work/i.test(text), 'the screen says he is out of work');
  say(await page.locator('[data-wait-week]').count() === 1, 'there is a way to wait for the phone');
  say(/Start New Career/i.test(await page.locator('body').innerText()), 'starting over is still offered, it is just no longer the only door');

  console.log('3) Waiting brings jobs in');
  let offers = 0;
  let waits = 0;
  for (let i = 0; i < 14 && offers === 0; i++) {
    await page.locator('[data-wait-week]').click();
    waits += 1;
    await page.waitForTimeout(450);
    offers = await page.locator('[data-wilderness-offer]').count();
  }
  console.log(`  ${offers ? `a club called after ${waits} wait(s)` : 'no club called in 14 waits'}`);
  say(offers > 0, `a club called after waiting (${offers} on the table)`, true);

  if (offers > 0) {
    const first = page.locator('[data-wilderness-offer]').first();
    const club = await first.getAttribute('data-wilderness-offer');
    const offerText = await first.innerText();
    say(/The brief:/.test(offerText), 'the offer states what the board will expect');
    say(club !== 'Newcastle', `the club that sacked him did not call back (${club})`);

    console.log('4) Taking the job puts him back to work');
    await first.locator('button').click();
    await page.waitForTimeout(1800);
    const body = await page.locator('body').innerText();
    say(!/SACKED!/.test(body), 'the sacked screen is gone');
    say(body.includes(club), `the hub is showing the new club (${club})`);
    say(await page.locator('[data-wilderness]').count() === 0, 'the wilderness closed behind him');
  }
}

const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
say(pageErrors.length === 0, `no real page errors on the walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
if (CONTROL === 'nosack') {
  /* Every load of the chunk carries every sack site: the hits are a whole number of loads. */
  say(proof.sack > 0 && proof.sack % SACK_SITES === 0, `the sack rewrite landed on every site of every load (${proof.sack} hit(s), ${SACK_SITES} a load)`);
}
await page.close();
await browser.close();
const code = verdict('playWilderness', CONTROL ? proof : null, { minGuarded: 1 });
if (code || CONTROL) process.exit(code);
console.log('playWilderness: green. Getting sacked is a chapter now, not the last page.');
