/**
 * Round 186 browser harness: the season curtain, walked like a person.
 *
 * simSeasonReveal proves the engine; this proves the card: clicking Play
 * now opens the staged reveal (year, result, story lines, Continue), the
 * crossroads only shows after Continue, a reload mid-curtain lands on the
 * save's real screen because the reveal is transient by design, and a
 * suspended season gets the muted card through the real UI.
 *
 * Every assertion is scoped to [data-season-reveal], the Round 179
 * lesson: the sitewide ticker legitimately talks about seasons and
 * signings, so whole-body text checks lie.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playSeasonReveal.mjs
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

/* ---------- Walk one: the NFL curtain, end to end ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('1) Play opens the curtain, not the crossroads');
  await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill('Curtain Probe');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  const reveal = page.locator('[data-season-reveal]');
  say(await reveal.count() === 1, 'the season reveal card is up');
  const rText = await reveal.innerText();
  say(/The \d{4} season/i.test(rText), 'the header names the year (CSS uppercases it, so match case-blind)');
  say(/age \d+/.test(rText), 'the sub header carries the age line');
  say(/yds|TD|rec/.test(rText), 'the true stat line is on the card from frame one');
  say(await reveal.locator('button:has-text("Continue")').count() === 1, 'the Continue button is on the card');

  console.log('2) Continue hands over to the crossroads');
  await reveal.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(700);
  say(await page.locator('[data-season-reveal]').count() === 0, 'the curtain came down');
  const afterBody = await page.locator('body').innerText();
  say(/Play the \d{4} season/.test(afterBody) || await page.locator('div.grid.gap-1\\.5 > button').count() > 0,
    'the crossroads or the hub is on screen behind it');

  console.log('3) A reload mid-curtain lands on the real screen');
  /* Answer whatever crossroads is up, then play the next season. */
  const opt = page.locator('div.grid.gap-1\\.5 > button').first();
  if (await opt.count()) { await opt.click(); await page.waitForTimeout(700); }
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  say(await page.locator('[data-season-reveal]').count() === 1, 'the second season raised the curtain');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  say(await page.locator('[data-season-reveal]').count() === 0, 'the reveal did not survive the reload, transient by design');
  const reloaded = await page.locator('body').innerText();
  say(/Play the \d{4} season/.test(reloaded) || await page.locator('div.grid.gap-1\\.5 > button').count() > 0,
    'the save reopened on a real screen');

  console.log('4) A suspended season gets the muted card');
  await page.evaluate(() => {
    const raw = localStorage.getItem('nfl-my-career-save-v1');
    if (!raw) return;
    const s = JSON.parse(raw);
    s.c.suspendedSeasons = 1;
    localStorage.setItem('nfl-my-career-save-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  const banned = page.locator('[data-season-reveal]');
  say(await banned.count() === 1, 'the banned year still gets its card');
  const bText = await banned.innerText();
  say(/suspended list/i.test(bText), 'the muted card says what the year was');
  say(errors.length === 0, `no page errors on the NFL walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: the NBA curtain renders too ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('5) The shared card serves the NBA');
  await page.goto(`${BASE}/nba-my-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill('Curtain Probe');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  const reveal = page.locator('[data-season-reveal]');
  say(await reveal.count() === 1, 'the NBA season reveal card is up');
  const rText = await reveal.innerText();
  say(/The \d{4} season/i.test(rText) && /ppg/.test(rText), 'the NBA card carries the year and the true stat line');
  await reveal.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(700);
  say(await page.locator('[data-season-reveal]').count() === 0, 'Continue works in the NBA too');
  say(errors.length === 0, `no page errors on the NBA walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} SEASON REVEAL WALK CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL SEASON REVEAL WALK CHECKS PASSED');
