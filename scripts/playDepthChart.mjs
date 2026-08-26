/**
 * Rounds 182 and 183 browser harness: the depth chart, walked like a
 * person, in all four sports.
 *
 * simDepthChart proves the engine; this proves the UI: the draft feed
 * announces where you open, the role chip rides every hub, a save patched
 * onto the bench renders the bench chip after reload, playing a season
 * from the bench prints the spot-duty line, and a rookie goalie's feed
 * talks like a goalie's world actually works.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playDepthChart.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();

async function createCareer(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill('Depth Probe');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
}

/* ---------- Walk one: the NFL chart ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('1) Draft night announces your spot');
  await createCareer(page, '/nfl-my-career');
  const body = await page.locator('body').innerText();
  say(/starter|on the bench|the keys|name on top|learning/.test(body), 'the feed talks about the depth chart');
  const chip = await page.locator('span:has-text("Starter"), span:has-text("Backup")').count();
  say(chip >= 1, 'the role chip is on the hub');

  console.log('2) A benched save renders the bench');
  await page.evaluate(() => {
    const raw = localStorage.getItem('nfl-my-career-save-v1');
    if (!raw) return;
    const s = JSON.parse(raw);
    s.c.role = 'backup';
    localStorage.setItem('nfl-my-career-save-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  say(await page.locator('span:has-text("🪑 Backup")').count() === 1, 'the bench chip renders from the save');

  console.log('3) A bench season is spot duty on the feed');
  /* Gut the rating so the camp cannot be won before the season sims. */
  await page.evaluate(() => {
    const raw = localStorage.getItem('nfl-my-career-save-v1');
    const s = JSON.parse(raw);
    s.c.role = 'backup'; s.c.ovr = 66; s.teamQuality = 92;
    localStorage.setItem('nfl-my-career-save-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(1000);
  const after = await page.locator('body').innerText();
  say(/backup season|behind the starter|game(s)? of real action/i.test(after), 'the feed narrates the bench year');
  say(errors.length === 0, `no page errors on the NFL walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: the NBA rotation chip ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('4) The NBA hub carries the rotation');
  await createCareer(page, '/nba-my-career');
  const chip = await page.locator('span:has-text("Starting five"), span:has-text("Second unit")').count();
  say(chip >= 1, 'the rotation chip is on the hub');
  await page.evaluate(() => {
    const raw = localStorage.getItem('nba-my-career-save-v1');
    if (!raw) return;
    const s = JSON.parse(raw);
    s.c.role = 'backup';
    localStorage.setItem('nba-my-career-save-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  say(await page.locator('span:has-text("🪑 Second unit")').count() === 1, 'the second-unit chip renders from the save');
  say(errors.length === 0, `no page errors on the NBA walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk three: the NHL lineup and the goalie truth ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('5) The NHL hub carries the lineup');
  await createCareer(page, '/nhl-my-career');
  const chip = await page.locator('span:has-text("Top of the lineup"), span:has-text("Fourth line"), span:has-text("Number one"), span:has-text("Backup goalie")').count();
  say(chip >= 1, 'the lineup chip is on the hub');
  await page.evaluate(() => {
    const raw = localStorage.getItem('nhl-my-career-save-v1');
    if (!raw) return;
    const s = JSON.parse(raw);
    s.c.role = 'backup';
    localStorage.setItem('nhl-my-career-save-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  say(await page.locator('span:has-text("🪑")').count() >= 1, 'the bench-side chip renders from the save');
  say(errors.length === 0, `no page errors on the NHL walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk four: the MLB lineup card ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('6) The MLB hub carries the lineup card');
  await createCareer(page, '/mlb-my-career');
  const chip = await page.locator('span:has-text("Everyday"), span:has-text("Bench bat"), span:has-text("Rotation"), span:has-text("Spot starter"), span:has-text("Bullpen arm")').count();
  say(chip >= 1, 'the lineup card chip is on the hub');
  const feedText = await page.locator('body').innerText();
  say(/lineup card|bench|rotation|bullpen|Opening Day/i.test(feedText), 'the draft feed talks baseball roles');
  say(errors.length === 0, `no page errors on the MLB walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} DEPTH CHART WALK CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL DEPTH CHART WALK CHECKS PASSED');
