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
 */
import pw from './lib/pwLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
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
await page.locator('text=Premier League').first().click();
await page.waitForTimeout(700);
await page.locator('button:has-text("Newcastle")').first().click();
await page.waitForTimeout(500);
const essential = page.locator('button:has-text("Essential only")');
if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
await page.locator('text=Take the job').click();
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
for (let i = 0; i < 120 && !sacked; i++) {
  if (await page.locator('[data-wilderness]').count()) { sacked = true; break; }
  if (i > 0 && i % 40 === 0) {
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
    continue;
  }
  if (await clickExact('⚡ Quick Sim')) { await page.waitForTimeout(600); continue; }
  const onward = page.locator('button:visible').filter({ hasText: /^(Continue|Next|Play on|Back to the club|Go to)/ });
  if (await onward.count()) { await onward.first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(500); continue; }
  await clickExact('Home');
  await page.waitForTimeout(400);
}
say(sacked, 'the board ran out of patience and the wilderness opened');

if (sacked) {
  console.log('2) The wilderness has a way onward');
  const panel = page.locator('[data-wilderness]');
  const text = await panel.innerText();
  say(/Out of work/i.test(text), 'the screen says he is out of work');
  say(await page.locator('[data-wait-week]').count() === 1, 'there is a way to wait for the phone');
  say(/Start New Career/i.test(await page.locator('body').innerText()), 'starting over is still offered, it is just no longer the only door');

  console.log('3) Waiting brings jobs in');
  let offers = 0;
  for (let i = 0; i < 14 && offers === 0; i++) {
    await page.locator('[data-wait-week]').click();
    await page.waitForTimeout(450);
    offers = await page.locator('[data-wilderness-offer]').count();
  }
  say(offers > 0, `a club called after waiting (${offers} on the table)`);

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
await page.close();
await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playWilderness: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playWilderness: green. Getting sacked is a chapter now, not the last page.');
