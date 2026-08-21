/**
 * Round 207 browser harness: the extension talk, played like a person.
 *
 * simExtension proves the engine and measures the economics. This proves
 * the fork exists on screen and that both prongs really do what they say:
 * signing puts years on your deal and sends you back to the hub, turning it
 * down plays the season out and leaves you heading for free agency.
 *
 * The final year is reached the same honest way playFreeAgency reaches an
 * expired deal: a career created through the real create screen, then one
 * save patch setting contractYears to 1, which is exactly the state a
 * three-season-old career reaches without three minutes of clicking. The
 * rating is patched up at the same time, because a club only offers an
 * extension to somebody it wants, and a freshly drafted rookie is not
 * reliably that somebody.
 *
 * Every assertion is scoped to [data-extension-talk]: the sitewide ticker
 * runs above every screen and talks about signings too.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playExtension.mjs
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const GAMES = [
  { path: '/nfl-my-career', key: 'nfl-my-career-save-v1', name: 'NFL' },
  { path: '/nba-my-career', key: 'nba-my-career-save-v1', name: 'NBA' },
  { path: '/mlb-my-career', key: 'mlb-my-career-save-v1', name: 'MLB' },
  { path: '/nhl-my-career', key: 'nhl-my-career-save-v1', name: 'NHL' },
];

const browser = await chromium.launch();

/** Create a career, put it in its final contract year, press Play. */
async function reachFinalYear(page, game) {
  await page.goto(`${BASE}${game.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  if (!(await page.locator('button:has-text("Play the")').count())) return false;
  await page.evaluate(key => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const s = JSON.parse(raw);
    s.c.contractYears = 1;
    /* Good enough to be worth keeping: the club only offers to a player it
       wants, which is the rule section 2 of simExtension pins down. */
    s.c.ovr = 90;
    s.c.age = 25;
    localStorage.setItem(key, JSON.stringify(s));
  }, game.key);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  return true;
}

const contractOf = (page, key) => page.evaluate(k => {
  const s = JSON.parse(localStorage.getItem(k));
  return { years: s.c.contractYears, salary: s.c.salary, seasons: s.c.seasons.length };
}, key);

/* ---------- Walk one: all four games raise the card ---------- */
console.log('1) The final year opens a decision, in all four games');
for (const game of GAMES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  const reached = await reachFinalYear(page, game);
  say(reached, `${game.name}: created a career and reached the hub`);
  const card = page.locator('[data-extension-talk]');
  say(await card.count() === 1, `${game.name}: the final year raised the extension card, not a season`);
  if (await card.count()) {
    const text = await card.innerText();
    say(/final year/i.test(text), `${game.name}: the card explains what year this is`);
    say(/\$\d/.test(text), `${game.name}: the card carries real money`);
    say(/vs market/i.test(text), `${game.name}: the card shows the offer against the market`);
    say(await card.locator('button:has-text("Sign it")').count() === 1, `${game.name}: there is a way to sign`);
    say(await card.locator('button:has-text("Ask for more")').count() === 1, `${game.name}: there is a way to push`);
    say(await card.locator('button:has-text("play the year out")').count() === 1, `${game.name}: there is a way to turn it down`);
  }
  const real = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${game.name}: no page errors (${real.length ? real[0] : 'clean'})`);
  await ctx.close();
}

/* ---------- Walk two: the push, then signing ---------- */
console.log('2) Pushing spends the one negotiation, and signing writes the deal');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const game = GAMES[0];
  await reachFinalYear(page, game);
  const card = page.locator('[data-extension-talk]');
  const before = await contractOf(page, game.key);
  say(before.years === 1, `the deal starts on its final year (${before.years})`);

  /* Read the OFFER, not the first dollar figure on the card: the header
     line quotes the market number, and after a push it quotes the improved
     number, so a text scrape compares two different fields and lies. */
  const offerNow = async () => Number(
    await page.locator('[data-extension-talk] [data-ext-salary]').first().getAttribute('data-ext-salary'));
  const firstOffer = await offerNow();
  say(firstOffer > 0, `the first offer is a real number ($${firstOffer}M)`);

  await card.locator('button:has-text("Ask for more")').click();
  await page.waitForTimeout(600);
  const pushedOffer = await offerNow();
  /* A 90 rated 25 year old has leverage, so they find money. The engine
     harness proves that at scale; here it only has to have MOVED and the
     button has to be spent. */
  say(pushedOffer >= firstOffer, `the push did not lower the offer ($${firstOffer}M then $${pushedOffer}M)`);
  const pushBtn = page.locator('[data-extension-talk] button:has-text("made your case")');
  say(await pushBtn.count() === 1, 'the push button is spent and says so');
  say(await pushBtn.isDisabled(), 'the spent push button cannot be pressed again');

  await page.locator('[data-extension-talk] button:has-text("Sign it")').click();
  await page.waitForTimeout(900);
  say(await page.locator('[data-extension-talk]').count() === 0, 'signing closed the card');
  const after = await contractOf(page, game.key);
  say(after.years > 1, `signing put years on the deal (${before.years} then ${after.years})`);
  say(after.salary === pushedOffer, `the salary on the save is the number that was on the card ($${after.salary}M vs $${pushedOffer}M)`);
  say(after.seasons === before.seasons, 'signing did not secretly play a season');
  const body = await page.locator('body').innerText();
  say(/Extension signed/i.test(body), 'the feed says the extension was signed');

  /* And the same season does not ask twice: pressing Play now plays it. */
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(1400);
  say(await page.locator('[data-extension-talk]').count() === 0, 'a signed extension is not offered again');
  await ctx.close();
}

/* ---------- Walk three: turning it down plays the year ---------- */
console.log('3) Turning it down plays the season out');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const game = GAMES[0];
  await reachFinalYear(page, game);
  const before = await contractOf(page, game.key);
  await page.locator('[data-extension-talk] button:has-text("play the year out")').click();
  await page.waitForTimeout(1600);
  say(await page.locator('[data-extension-talk]').count() === 0, 'turning it down closed the card');
  const after = await contractOf(page, game.key);
  say(after.seasons === before.seasons + 1, `the season was actually played (${before.seasons} then ${after.seasons})`);
  say(after.years === 0, `the deal is now up (${after.years} years left), which is what sends you to the market`);
  say(after.salary === before.salary, 'turning it down did not change the money');
  await ctx.close();
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playExtension: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playExtension: green. The last year of a deal is a real fork in all four games.');
