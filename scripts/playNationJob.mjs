/**
 * Round 202 browser harness: taking the national team job.
 *
 * simNationJob proves the engine. This proves the screen: a save doctored
 * to a decorated record (the same state a long successful career produces,
 * reached in one step) has the country calling on the Manager tile, the
 * offer names the right nation, taking it replaces the offer with the job
 * card, and it survives a reload because it is part of the save.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playNationJob.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from './lib/pwLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
let page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

console.log('1) Take a job and build a record worth a country');
await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const fresh = page.locator('text=Start Fresh');
if (await fresh.count()) { await fresh.click(); await page.waitForTimeout(800); }
await page.locator('button:has-text("2026-27")').first().click();
await page.waitForTimeout(700);
await page.locator('text=England').first().click();
await page.waitForTimeout(700);
await page.locator('text=Premier League').first().click();
await page.waitForTimeout(700);
await page.locator('button:has-text("Manchester City")').first().click();
await page.waitForTimeout(500);
const essential = page.locator('button:has-text("Essential only")');
if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
await page.locator('text=Take the job').click();
await page.waitForTimeout(2000);
say(await page.locator('button:has-text("Manager")').count() > 0, 'the career is running');

/* A record a federation would call about, written the way a long career
   would leave it: trophies in the cabinet, seasons behind him, a win rate. */
await page.close();
const helper = await ctx.newPage();
await helper.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
const patched = await helper.evaluate(() => {
  const raw = localStorage.getItem('dukb-club-manager-save');
  if (!raw) return false;
  const c = JSON.parse(raw);
  c.trophies = [1, 2, 3].map(i => ({ season: 2026 + i, name: 'Premier League', emoji: '🏆' }));
  c.history = [1, 2, 3, 4, 5].map(i => ({ season: 2026 + i, club: c.clubName, position: 1, points: 90, trophies: ['Premier League'] }));
  c.careerStats = { ...(c.careerStats ?? {}), played: 200, wins: 130, draws: 30, losses: 40 };
  localStorage.setItem('dukb-club-manager-save', JSON.stringify(c));
  return true;
});
await helper.close();
say(patched, 'the save was given a record worth an international job');

page = await ctx.newPage();
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const resume = page.locator('button:has-text("Resume Career")');
if (await resume.count()) { await resume.first().click(); await page.waitForTimeout(1200); }

console.log('2) The country calls on the Manager tile');
const tile = page.locator('button').filter({ hasText: 'MANAGER' }).first();
say(await tile.count() > 0, 'the manager tile is on the hub');
const tileText = await tile.innerText();
say(/country is calling/i.test(tileText), `the tile says the country is calling (${tileText.replace(/\n/g, ' ').slice(0, 60)})`);
await tile.click();
await page.waitForTimeout(800);
const offer = page.locator('[data-nation-offer]');
say(await offer.count() === 1, 'the offer card is on the manager panel');
const offerText = await offer.innerText();
say(/England/.test(offerText), `an English club's manager is offered England (${offerText.split('\n')[1] ?? ''})`);
say(/summer/i.test(offerText), 'the offer is honest that it is a summer job');

console.log('3) Taking it holds both jobs');
await offer.locator('button').click();
await page.waitForTimeout(900);
say(await page.locator('[data-nation-offer]').count() === 0, 'the offer is gone once accepted');
const job = page.locator('[data-nation-job]');
say(await job.count() === 1, 'the job card replaced it');
const jobText = await job.innerText();
say(/England manager/i.test(jobText), 'the card names the country');
say(/tournament/i.test(jobText), 'the card explains when the country actually plays');
const body = await page.locator('body').innerText();
say(/Manchester City/.test(body), 'the club job is still his');

console.log('4) It is part of the save');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const resume2 = page.locator('button:has-text("Resume Career")');
if (await resume2.count()) { await resume2.first().click(); await page.waitForTimeout(1200); }
await page.locator('button').filter({ hasText: 'MANAGER' }).first().click();
await page.waitForTimeout(800);
say(await page.locator('[data-nation-job]').count() === 1, 'the international job survived a reload');

const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
say(pageErrors.length === 0, `no real page errors on the walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
await page.close();
await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playNationJob: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playNationJob: green. Win enough and your country calls, and the club job carries on underneath it.');
