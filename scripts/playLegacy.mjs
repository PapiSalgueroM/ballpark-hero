/**
 * Round 196 browser harness: the legacy boardroom, used like a person.
 *
 * simStadiumTycoon section 13 proves the math; this proves the screen: a
 * fresh club shows the Legacy drawer with all eight perks locked and
 * nothing affordable, a doctored balance renders on the button and buys a
 * real perk through the real UI (points fall by the exact cost, the level
 * chip moves), the sell-up button quotes its legacy points, selling up
 * through the UI banks them, and the badges drawer still says 47 because
 * the boardroom invented no badges.
 *
 * Doctoring the save is a dance this game forces: the tycoon writes its
 * in-memory state to localStorage on EVERY pagehide, so editing storage
 * on the live page and reloading would be overwritten mid-navigation.
 * The walk uses one browser CONTEXT (shared storage), closes the game
 * page (its farewell save lands), edits the save from a helper page on a
 * static route where the app does not run, then opens the game fresh, so
 * deserialization is on trial by the same road a real save takes.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playLegacy.mjs
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
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const errors = [];

async function openGame() {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  /* The away-pay modal can greet a reopened save; clear it if so. */
  const back = page.locator('button:has-text("Back to work")');
  if (await back.count()) { await back.click(); await page.waitForTimeout(400); }
  return page;
}

/** Edit the save from a route where the app does not run, so no game
 *  loop can overwrite the edit before the next open reads it. */
async function doctorSave(mutate) {
  const helper = await ctx.newPage();
  await helper.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  const ok = await helper.evaluate(src => {
    const raw = localStorage.getItem('stadiumTycoonSaveV1');
    if (!raw) return false;
    const s = JSON.parse(raw);
    // eslint-disable-next-line no-new-func
    new Function('s', src)(s);
    localStorage.setItem('stadiumTycoonSaveV1', JSON.stringify(s));
    return true;
  }, mutate);
  await helper.close();
  return ok;
}

console.log('1) A fresh club: the boardroom is there, locked, honest');
{
  const page = await openGame();
  const drawerBtn = page.locator('[data-legacy-drawer]');
  say(await drawerBtn.count() === 1, 'the Legacy drawer button is on the page');
  say(!/pts/.test(await drawerBtn.innerText()), 'no point balance is shown when there is nothing to spend');
  await drawerBtn.click();
  await page.waitForTimeout(500);
  const board = page.locator('[data-legacy-board]');
  say(await board.count() === 1, 'the boardroom opens');
  const boardText = await board.innerText();
  say(boardText.includes('Boardroom Sway'), 'Boardroom Sway is on the board');
  say(boardText.includes('Steady Dressing Room'), 'the streak shield is on the board');
  say((boardText.match(/Lv 0\//g) ?? []).length === 8, 'all eight perks sit at level 0');
  const buyButtons = board.locator('button');
  const buyCount = await buyButtons.count();
  let disabled = 0;
  for (let i = 0; i < buyCount; i++) if (await buyButtons.nth(i).isDisabled()) disabled += 1;
  say(buyCount === 8 && disabled === 8, `every price button is disabled at zero points (${disabled}/${buyCount})`);
  await page.close(); /* the farewell save writes the state we now doctor */
}

console.log('2) A banked balance buys a perk through the real screen');
{
  say(await doctorSave('s.legacyPoints = 10;'), 'the farewell save existed to doctor');
  const page = await openGame();
  say(/10 pts/.test(await page.locator('[data-legacy-drawer]').innerText()), 'the drawer button carries the 10 point balance');
  await page.locator('[data-legacy-drawer]').click();
  await page.waitForTimeout(500);
  const swayCard = page.locator('[data-legacy-board] [data-perk="sway"]');
  say(await swayCard.count() === 1, 'the Sway card is addressable');
  await swayCard.locator('button').click();
  await page.waitForTimeout(600);
  const after = await page.locator('[data-legacy-board]').innerText();
  say(/7 points to spend/.test(after), 'the balance fell by exactly the 3 point cost');
  say(after.includes('Lv 1/5'), 'Boardroom Sway sits at level 1 of 5');
  await page.close();
}

console.log('3) The sell-up button quotes its legacy, and selling banks it');
{
  say(await doctorSave('s.lifetime = 5000000;'), 'the post-purchase save existed to doctor');
  const page = await openGame();
  const sell = page.locator('[data-sell-up]');
  say(await sell.count() === 1, 'the sell-up button is lit');
  const sellText = await sell.innerText();
  say(/\+1 legacy point/.test(sellText), `a bottom-league sale quotes +1 legacy point (${sellText.trim().slice(0, 60)})`);
  await sell.click();
  await page.waitForTimeout(800);
  await page.locator('[data-legacy-drawer]').click();
  await page.waitForTimeout(500);
  const banked = await page.locator('[data-legacy-board]').innerText();
  say(/8 points to spend/.test(banked), 'the sale banked its point (7 held + 1 for the sale = 8)');
  say(banked.includes('Lv 1/5'), 'the bought perk survived the sale');

  console.log('4) The boardroom invented no badges');
  const badges = await page.locator('button:has-text("Badges")').innerText();
  say(/\/47/.test(badges), `the badge wall still counts 47 (${badges.trim()})`);
  await page.close();
}

await browser.close();
const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
say(pageErrors.length === 0, `no real page errors across the walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
console.log('');
if (failures > 0) {
  console.error(`playLegacy: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playLegacy: green. The boardroom sells permanence and the screen tells the truth about it.');
