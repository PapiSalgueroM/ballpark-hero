/**
 * Round 190 browser harness: trade talks, walked like a person.
 *
 * simTradeTalks proves the engine; this proves the phone: opening talks
 * raises the shared card, a lopsided offer in your favor gets the
 * handshake and the man actually arrives on your roster, a push spends
 * its one shot in the UI (the button dies), walking away hangs up, and
 * a reload mid-call ends the call because talks are transient.
 *
 * All assertions scope to [data-trade-talks] where the card is the
 * subject, the Round 179 ticker lesson.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playTradeTalks.mjs
 */
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

/* Round 204: the front office hub is boxes now, and opening a box replaces
   the grid. Any hop from one box to another goes back through the hub
   first, which is exactly what a player does with their thumb. */
const toHub = async p => {
  const back = p.locator('button:has-text("Hub")');
  if (await back.count()) { await back.first().click(); await p.waitForTimeout(350); }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

console.log('1) A lopsided offer in your favor gets the handshake');
await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.locator('.grid button').first().click();
await page.waitForTimeout(900);
await page.locator('button:has-text("Trades")').first().click();
await page.waitForTimeout(500);
/* Partner: the first abbreviation chip under "build your own deal". */
await page.locator('p:has-text("Or build your own deal") ~ div button').first().click();
await page.waitForTimeout(400);
/* Send my BEST man (first in the You send list), ask for their WEAKEST
   listed (8th): the value gap lands in my favor, a straight handshake. */
await page.locator('div:has(> p:text-is("You send")) button').first().click();
await page.waitForTimeout(250);
const targets = page.locator('div:has(> p:has-text("You get")) button:has-text("Open talks")');
const nTargets = await targets.count();
say(nTargets >= 4, `their roster lists targets (saw ${nTargets})`);
await targets.nth(nTargets - 1).click();
await page.waitForTimeout(500);
const card = page.locator('[data-trade-talks]');
say(await card.count() === 1, 'the talks card is up');
const firstText = await card.innerText();
say(/Talks with/.test(firstText), 'the card names the partner');
const shake = card.locator('button:has-text("Shake on it")');
say(await shake.count() === 1, `the lopsided offer got the straight handshake (card says: ${firstText.split('\n').slice(-2)[0]?.slice(0, 60)})`);
/* The arriving man's name, from the package chip. */
const arriving = (firstText.match(/On the table: (.+?)(?: \+|$)/m) || [])[1]?.trim();
await shake.click();
await page.waitForTimeout(600);
say(await page.locator('[data-trade-talks]').count() === 0, 'the call ended with the deal');
const feedText = await page.locator('body').innerText();
say(/Deal done with/.test(feedText), 'the feed carries the deal');
await toHub(page);
await page.locator('button:has-text("Roster")').first().click();
await page.waitForTimeout(400);
const roster = await page.locator('body').innerText();
say(!!arriving && roster.includes(arriving), `${arriving ?? '(unread)'} actually arrived on the roster`);

console.log('2) The push spends its one shot in the UI');
await toHub(page);
await page.locator('button:has-text("Trades")').first().click();
await page.waitForTimeout(400);
await page.locator('p:has-text("Or build your own deal") ~ div button').first().click();
await page.waitForTimeout(300);
/* Send my WEAKEST listed man for their BEST: a counter or a dial tone. */
await page.locator('div:has(> p:text-is("You send")) button').last().click();
await page.waitForTimeout(250);
await page.locator('div:has(> p:has-text("You get")) button:has-text("Open talks")').first().click();
await page.waitForTimeout(500);
const card2 = page.locator('[data-trade-talks]');
say(await card2.count() === 1, 'the second call raised the card');
const firm = card2.locator('button:has-text("Stand firm")');
if (await firm.count()) {
  await firm.click();
  await page.waitForTimeout(500);
  const after = await page.locator('[data-trade-talks]').innerText();
  const spent = await page.locator('[data-trade-talks] button:has-text("You already pushed")').count();
  say(spent === 1 || !/Stand firm/.test(after), 'the push button died after one use');
} else {
  say(true, 'the call opened on a dial tone, nothing to push against (a real outcome)');
}
const out = page.locator('[data-trade-talks] button:has-text("Walk away"), [data-trade-talks] button:has-text("Put the phone down")');
say(await out.count() >= 1, 'there is always a way off the phone');
await out.first().click();
await page.waitForTimeout(400);
say(await page.locator('[data-trade-talks]').count() === 0, 'walking away hung up');

console.log('3) A reload ends the call, talks are transient');
await page.locator('div:has(> p:text-is("You send")) button').first().click();
await page.waitForTimeout(250);
await page.locator('div:has(> p:has-text("You get")) button:has-text("Open talks")').first().click();
await page.waitForTimeout(500);
say(await page.locator('[data-trade-talks]').count() === 1, 'a third call opened');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
say(await page.locator('[data-trade-talks]').count() === 0, 'the reload ended the call');
say(errors.length === 0, `no page errors on the walk (${errors.length ? errors[0] : 'clean'})`);

console.log('4) The shared card serves the NBA desk too');
{
  const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors2 = [];
  page2.on('pageerror', e => errors2.push(String(e)));
  await page2.goto(`${BASE}/nba-front-office`, { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1200);
  await page2.locator('.grid button').first().click();
  await page2.waitForTimeout(900);
  await page2.locator('button:has-text("Trades")').first().click();
  await page2.waitForTimeout(500);
  await page2.locator('p:has-text("Or build your own deal") ~ div button').first().click();
  await page2.waitForTimeout(400);
  await page2.locator('div:has(> p:text-is("You send")) button').first().click();
  await page2.waitForTimeout(250);
  const t2 = page2.locator('div:has(> p:has-text("You get")) button:has-text("Open talks")');
  await t2.nth((await t2.count()) - 1).click();
  await page2.waitForTimeout(500);
  say(await page2.locator('[data-trade-talks]').count() === 1, 'the NBA call raised the shared card');
  const text2 = await page2.locator('[data-trade-talks]').innerText();
  say(/Talks with/.test(text2), 'the NBA card names the partner');
  await page2.locator('[data-trade-talks] button:has-text("Walk away"), [data-trade-talks] button:has-text("Put the phone down")').first().click();
  await page2.waitForTimeout(400);
  say(await page2.locator('[data-trade-talks]').count() === 0, 'the NBA walk-away hung up');
  say(errors2.length === 0, `no page errors on the NBA leg (${errors2.length ? errors2[0] : 'clean'})`);
  await page2.close();
}

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} TRADE TALKS WALK CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL TRADE TALKS WALK CHECKS PASSED');
