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
 *
 * Round 672: red since Round 303 put the Dugout step (the manager picker)
 * behind the club card. Both walks now skip it, like their siblings.
 *
 * NEGATIVE CONTROL: NATIONALITIES_CONTROL=nofilter rewrites the served market
 * so the nation dropdown filters nothing (its predicate always passes). The
 * flag check must fail, which proves the walk still reaches the market and
 * still reads the flags off the rows.
 */
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

const CONTROL = process.env.NATIONALITIES_CONTROL || '';
if (CONTROL && CONTROL !== 'nofilter') {
  console.error(`NATIONALITIES_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const { say, verdict } = controlledChecks(CONTROL);
const proof = {};

const browser = await chromium.launch();
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  if (CONTROL) {
    /* natPick === 'any' || nationalityOf(eraId, name) === natPick, with the
       first arm forced true. The backreference pins it to the same variable. */
    await installServedCodeControl(page, [{
      label: 'natPredicate',
      find: /([\w$]+)==="any"\|\|([\w$]+)\(([\w$]+)\.eraId,([\w$]+)\.name\)===\1(?![\w$])/g,
      replace: '!0||$2($3.eraId,$4.name)===$1',
    }], proof);
  }
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
  /* Round 672: Round 303 put the manager picker (the Dugout step) behind the
     club card, with its own "Take the job" and a skip, and this walk never
     learned it: it looked for the Market tab on the picker and timed out.
     Skip past it the way playSponsors and playReleaseClause already do. The
     picker is a lazy chunk, so wait for it rather than counting on a fixed
     pause: a count taken 800ms after the click missed it under load. */
  const skipManager = page.locator('button:has-text("Skip: just manage")').first();
  await skipManager.waitFor({ timeout: 15000 }).then(() => skipManager.click()).catch(() => {});
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
  say(wrongFlags === 0, `every visible flag is ${busiest}'s (${wrongFlags} strays)`, true);
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
  const skipManager2010 = page.locator('button:has-text("Skip: just manage")').first();
  await skipManager2010.waitFor({ timeout: 15000 }).then(() => skipManager2010.click()).catch(() => {});
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
const code = verdict('playNationalities', CONTROL ? proof : null, { minGuarded: 1 });
if (code || CONTROL) process.exit(code);
console.log('playNationalities: green. The filter narrows to real nations and every flag is the right man\'s.');
