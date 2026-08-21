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
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

console.log('1) A struggling career meets the scrum');
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
for (let step = 0; step < 14 && !sawScrum; step++) {
  const body = await page.locator('body').innerText();
  if (body.includes('The accountability scrum')) { sawScrum = true; break; }
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
say(sawScrum, 'the accountability scrum arrived within the losing stretch');

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
say(errors.length === 0, `no page errors on the walk (${errors.length ? errors[0] : 'clean'})`);

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} CAREER PRESS WALK CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL CAREER PRESS WALK CHECKS PASSED');
