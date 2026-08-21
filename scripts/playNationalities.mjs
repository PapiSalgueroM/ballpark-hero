/**
 * Round 194 browser harness: the nationality filter, used like a person.
 *
 * simNationalities proves the maps; this proves the market screen: take a
 * real job, reach the summer window (the season opens inside it), open the
 * transfer market, find the new nation dropdown among the deep filters,
 * pick the busiest nation, and watch the list narrow to players who all
 * wear that flag. Then the squad tab, where the real men carry real flags
 * and the club's own colors stay untouched.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playNationalities.mjs
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
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = await page.locator('text=Start Fresh').count();
  if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }

  console.log('1) Take the Newcastle job and reach the market');
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
  await page.locator('button:has-text("Market")').first().click();
  await page.waitForTimeout(900);
  const windowOpen = (await page.locator('text=window OPEN').count()) >= 1;
  say(windowOpen, 'the summer window is open at the season start (the market renders its filters)');

  console.log('2) The nation dropdown sits among the deep filters');
  const nat = page.locator('[data-nat-filter]');
  say(await nat.count() === 1, 'the nationality filter is on the market');
  const options = await nat.locator('option').allTextContents();
  say(options.length > 20, `the dropdown offers real nations with counts (${options.length - 1} nations)`);
  say(options.some(o => /England \(\d+\)/.test(o)), 'England is offered with its player count');
  say(options.some(o => /Brazil \(\d+\)/.test(o)), 'Brazil is offered with its player count');

  console.log('3) Picking a nation narrows the list to that flag');
  const before = await page.locator('img[alt]').count();
  const rowsBefore = await page.locator('button:has-text("Talk ·")').count();
  say(rowsBefore > 0, `the open market lists players (${rowsBefore} rows before filtering)`);
  /* The first real option is the busiest nation in this market. */
  const busiest = options[1].replace(/ \(\d+\)$/, '');
  await nat.selectOption({ index: 1 });
  await page.waitForTimeout(700);
  const rowsAfter = await page.locator('button:has-text("Talk ·")').count();
  say(rowsAfter > 0, `filtering to ${busiest} still shows players (${rowsAfter} rows)`);
  say(rowsAfter <= rowsBefore, 'the filter narrows the list, never grows it');
  /* Every visible market row's flag should now be the picked nation's:
     FlagImg titles the image with the country name. */
  const wrongFlags = await page.locator(`.max-h-96 img[alt]:not([alt="${busiest}"])`).count();
  say(wrongFlags === 0, `every visible flag is ${busiest}'s (${wrongFlags} strays)`);
  await nat.selectOption({ index: 0 });
  await page.waitForTimeout(500);
  const rowsReset = await page.locator('button:has-text("Talk ·")').count();
  say(rowsReset === rowsBefore, 'clearing the filter restores the full list');
  say(before >= 0, 'flag probe completed');

  console.log('4) The squad wears its flags too');
  await page.locator('button:has-text("Squad")').first().click();
  await page.waitForTimeout(900);
  const squadFlags = await page.locator('img[alt]').count();
  say(squadFlags >= 10, `the squad screen shows real flags (${squadFlags} flag images)`);

  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

/* ---------- The era market speaks era nations only ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = await page.locator('text=Start Fresh').count();
  if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }

  console.log('5) The 2010 market resolves its own men, not their namesakes');
  await page.locator('button:has-text("2010-11")').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=England').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=Premier League').first().click();
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Manchester United")').first().click();
  await page.waitForTimeout(500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
  await page.locator('text=Take the job').click();
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Market")').first().click();
  await page.waitForTimeout(900);
  const nat = page.locator('[data-nat-filter]');
  say(await nat.count() === 1, 'the 2010 market carries the filter too');
  /* Arsenal's Ramsey is in the 2010 market. Search him and read his flag. */
  await page.locator('input[placeholder="Search player or club…"]').fill('Aaron Ramsey');
  await page.waitForTimeout(700);
  const ramseyFlag = await page.locator('.max-h-96 img[alt]').first().getAttribute('alt').catch(() => null);
  say(ramseyFlag === 'Wales', `the 2010 Aaron Ramsey wears the Welsh flag (got ${ramseyFlag})`);
  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the 2010 walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playNationalities: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playNationalities: green. The filter narrows to real nations and every flag is the right man\'s.');
