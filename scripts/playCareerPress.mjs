/**
 * Round 184 browser harness: the press room, walked like a person.
 *
 * simCareerPress proves the engine; this proves the cards render through
 * the existing crossroads UI and the answers land: a doctored struggling
 * career (weak rating, cold fanbase, bad team) faces the accountability
 * scrum within a few seasons, the three answers are on screen, and
 * answering honestly prints the press line to the feed.
 *
 * The scrum is probabilistic through the real sim (the doctored career
 * misses the playoffs about 96 percent of seasons), so the walk plays up
 * to five seasons and expects at least one scrum, which fails less than
 * one run in ten thousand when the feature works.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playCareerPress.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 *
 * Round 672: red since Rounds 522 to 525 put the rivalry card between the
 * season curtain and the crossroads. About half of all seasons raise one,
 * and it has its own Continue outside [data-season-reveal], so this walk sat
 * on the first one it met for all eighteen steps and never saw a scrum. It
 * clicks through the rivalry card now, the way a player does.
 *
 * NEGATIVE CONTROL: CAREER_PRESS_CONTROL=noscrum rewrites the served press
 * engine so a cold fanbase no longer calls the scrum (fanbase < 45 becomes
 * fanbase < -1). Every scrum check must then fail, and the run refuses to
 * count if the rewrite matched nothing.
 */
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

const CONTROL = process.env.CAREER_PRESS_CONTROL || '';
if (CONTROL && CONTROL !== 'noscrum') {
  console.error(`CAREER_PRESS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const { say, verdict } = controlledChecks(CONTROL);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const proof = {};
if (CONTROL) {
  await installServedCodeControl(page, [
    { label: 'scrumTrigger', find: /\.missedPlayoffs&&([\w$]+)\.fanbase<45/g, replace: '.missedPlayoffs&&$1.fanbase<-1' },
  ], proof);
}
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

console.log('1) A struggling career meets the scrum');
await page.addInitScript(() => localStorage.setItem('rules-gate-seen:/nfl-my-career', '1'));
await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.locator('input[placeholder*="name"]').first().fill('Press Probe');
await page.locator('button:has-text("Enter the draft")').click();
await page.waitForTimeout(900);
await page.evaluate(() => {
  const raw = localStorage.getItem('nfl-my-career-save-v1');
  if (!raw) return;
  const s = JSON.parse(raw);
  /* 66 overall: terrible but safely above the forced-retirement line of 64
     (the first draft of this walk used 62 and retired instantly). Young
     enough that growth keeps him above it for the whole walk. */
  s.c.fanbase = 20; s.c.ovr = 66; s.c.pot = 70; s.c.contractYears = 9; s.c.role = 'starter';
  s.teamQuality = 62;
  localStorage.setItem('nfl-my-career-save-v1', JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

let sawScrum = false;
for (let step = 0; step < 18 && !sawScrum; step++) {
  const body = await page.locator('body').innerText();
  if (body.includes('The accountability scrum')) { sawScrum = true; break; }
  /* Round 186: every played season now opens with the season curtain, and
     the crossroads only shows after Continue. Without this click the walk
     stalls on the reveal forever, which is exactly how the round was
     caught: this file failed before the reveal shipped. */
  const cont = page.locator('[data-season-reveal] button:has-text("Continue")');
  if (await cont.count()) {
    await cont.click();
    await page.waitForTimeout(700);
    continue;
  }
  /* Round 672: the rivalry card (Rounds 522 to 525) sits between the curtain
     and the crossroads about half the time, with its own Continue. */
  const rivalry = page.locator('[data-rivalry-event] button:has-text("Continue")');
  if (await rivalry.count()) {
    await rivalry.click();
    await page.waitForTimeout(700);
    continue;
  }
  const play = page.locator('button:has-text("Play the")');
  if (await play.count()) {
    await play.first().click();
  } else {
    /* Some other crossroads is up: answer its first option and play on. */
    const opt = page.locator('div.grid.gap-1\\.5 > button').first();
    if (await opt.count()) await opt.click();
  }
  await page.waitForTimeout(900);
}
say(sawScrum, 'the accountability scrum arrived within the losing stretch', true);

/* Without a scrum on screen there is no card to read and no answer to click
   (the old walk died on a 30 second click timeout here). The miss above is
   already red, so sections 2 and 3 run only when there is a scrum to test. */
if (sawScrum) {
  console.log('2) The three registers are on the card');
  say(await page.locator('button:has-text("Say the right, empty things")').count() === 1, 'the diplomat answer renders');
  say(await page.locator('button:has-text("Own every bit of it yourself")').count() === 1, 'the honest answer renders');
  say(await page.locator('button:has-text("Point at the roster around you")').count() === 1, 'the firebrand answer renders');
  const scrumBody = await page.locator('body').innerText();
  say(scrumBody.includes('the playoffs'), 'the scrum names the postseason that was missed');

  console.log('3) Answering lands in the feed');
  await page.locator('button:has-text("Own every bit of it yourself")').click();
  await page.waitForTimeout(800);
  say(await page.locator('button:has-text("Play the")').count() >= 1, 'answering returns to the season hub');
  const after = await page.locator('body').innerText();
  say(after.includes('🎙️'), 'the press line reached the news feed');
}
say(errors.length === 0, `no page errors on the walk (${errors.length ? errors[0] : 'clean'})`);

await browser.close();
const code = verdict('playCareerPress', CONTROL ? proof : null, { minGuarded: 1 });
if (code || CONTROL) process.exit(code);
console.log('\nALL CAREER PRESS WALK CHECKS PASSED');
