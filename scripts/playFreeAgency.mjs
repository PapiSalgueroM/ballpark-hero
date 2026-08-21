/**
 * Round 179 browser harness: the free agency window, played like a person.
 *
 * simFreeAgency proves the engine; this walks the UI: an expired deal
 * bounces Play Season into the market screen, the cards carry real money,
 * length and roster numbers, pushing spends the one negotiation and prints
 * the talk line, signing lands you back on the hub with the new deal, and
 * the era walk proves a 2006-07 NHL market never offers a franchise from
 * the future.
 *
 * The expired deal is reached honestly through the UI plus one save patch:
 * the walk creates a career through the real create screen, then sets
 * contractYears to 0 in the saved state and reloads, which is exactly the
 * state a four-season-old career reaches, without four minutes of clicking.
 *
 * Every market assertion is scoped to [data-fa-window]. The first version
 * of this file read the whole body and failed on phantom matches: the
 * sitewide ticker (Round 167) runs above every screen and legitimately
 * talks about Vegas, Seattle and the Sign the Player game. The market
 * being clean is a statement about the market, so the market is what gets
 * read.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playFreeAgency.mjs
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

/* Create a career through the real create screen, then expire the deal. */
async function reachFreeAgency(page, path, saveKey, eraTileText) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
  if (eraTileText) {
    await page.locator(`button:has-text("${eraTileText}")`).first().click();
    await page.waitForTimeout(300);
  }
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  const hub = await page.locator('button:has-text("Play the")').count();
  if (!hub) return false;
  await page.evaluate(key => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const s = JSON.parse(raw);
    s.c.contractYears = 0;
    localStorage.setItem(key, JSON.stringify(s));
  }, saveKey);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  return true;
}

/* ---------- Walk one: the NFL market, pushed and signed ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('1) An expired deal opens the market, not a season');
  const reached = await reachFreeAgency(page, '/nfl-my-career', 'nfl-my-career-save-v1', null);
  say(reached, 'created a career and reached the season hub');
  const fa = page.locator('[data-fa-window]');
  say(await fa.count() === 1, 'the free agency screen opened instead of a season');
  say(await fa.locator('span:text-is("Your team")').count() === 1, 'exactly one card is marked Your team');
  const cards = await fa.locator('button:has-text("Sign")').count();
  say(cards >= 2, `at least two live offers on the table (saw ${cards})`);
  const faText = await fa.innerText();
  say(/Roster \d{2}/.test(faText), 'the cards show the roster quality number');
  say(/\$\d+(\.\d+)?M x \d+ yr/.test(faText), 'the cards show money times length');

  console.log('2) The push spends once and talks back');
  const pushes = fa.locator('button:has-text("Push for more")');
  say(await pushes.count() >= 2, 'push buttons are on the live cards');
  await pushes.first().click();
  await page.waitForTimeout(500);
  say(await fa.locator('button:has-text("Talks done")').count() >= 1, 'the pushed offer spent its one negotiation');
  const talked = await fa.innerText();
  say(/came up|held firm|did not blink|pulled the offer/.test(talked), 'the talk line reports how it went');

  console.log('3) Signing puts the deal on the hub');
  await fa.locator('button:has-text("Sign")').first().click();
  await page.waitForTimeout(900);
  say(await page.locator('button:has-text("Play the")').count() >= 1, 'signing returns to the season hub');
  say(await page.locator('[data-fa-window]').count() === 0, 'the market screen closed');
  const hubText = await page.locator('body').innerText();
  say(/Signed with|Re-signed with/.test(hubText), 'the news feed carries the signing');
  say(errors.length === 0, `no page errors on the NFL walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: a 2006-07 NHL market stays in 2006-07 ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('4) The era market never calls from the future');
  const reached = await reachFreeAgency(page, '/nhl-my-career', 'nhl-my-career-save-v1', '2006-07 throwback');
  say(reached, 'created a 2006-07 career and reached its hub');
  const fa = page.locator('[data-fa-window]');
  say(await fa.count() === 1, 'the era career opened its market');
  const marketText = await fa.innerText();
  for (const ghost of ['Vegas', 'Kraken', 'Winnipeg', 'Utah', 'Mammoth', 'Seattle']) {
    say(!marketText.includes(ghost), `${ghost} is not on the 2006 market`);
  }

  console.log('5) Signing away moves the career to the new club');
  const signs = fa.locator('button:has-text("Sign")');
  const n = await signs.count();
  say(n >= 2, `the era window has an outside offer to take (saw ${n})`);
  /* The last card is an outside offer (incumbent renders first). */
  await signs.nth(n - 1).click();
  await page.waitForTimeout(900);
  say(await page.locator('button:has-text("Play the")').count() >= 1, 'the era signing returns to the hub');
  const eraHub = await page.locator('body').innerText();
  say(/Signed with|Re-signed with/.test(eraHub), 'the era news feed carries the signing');
  say(errors.length === 0, `no page errors on the NHL era walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} FREE AGENCY WALK CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL FREE AGENCY WALK CHECKS PASSED');
