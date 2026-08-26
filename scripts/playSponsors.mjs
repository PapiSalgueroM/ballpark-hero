/**
 * Round 200 browser harness: the commercial desk, used like a manager.
 *
 * simSponsors proves the money. This proves the screen: take a real job,
 * open Finances, find three offers of three different shapes, sign one,
 * and watch the kitty rise by exactly the number on the card while the
 * offers are replaced by the signed deal.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playSponsors.mjs
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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

console.log('1) Take a job and open the finance desk');
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
await page.locator('button:has-text("Newcastle")').first().click();
await page.waitForTimeout(500);
const essential = page.locator('button:has-text("Essential only")');
if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
await page.locator('text=Take the job').click();
await page.waitForTimeout(2000);
await page.locator('button:has-text("Finances")').first().click();
await page.waitForTimeout(900);
const desk = page.locator('[data-sponsor-desk]');
say(await desk.count() === 1, 'the shirt sponsor card is on the finance desk');

console.log('2) Three offers, three shapes, with their numbers on show');
const offers = page.locator('[data-sponsor-offer]');
const count = await offers.count();
say(count === 3, `three offers are on the table (${count})`);
const deskText = await desk.innerText();
say(/season/.test(deskText), 'the offers quote money per season');
say(/4 seasons/.test(deskText), 'one of them is the four season deal');
say(/Bonus/.test(deskText), 'at least one carries a bonus');

console.log('3) Signing pays the club, on the spot');
/* The kitty is printed in the header; read it before and after. */
const budgetText = async () => {
  const t = await page.locator('body').innerText();
  const m = t.match(/£([\d.]+)m/);
  return m ? Number(m[1]) : null;
};
const before = await budgetText();
say(before !== null, `the kitty reads ${before}m before signing`);
/* Read the first offer's fee off its own card, then sign it. */
const firstText = await offers.first().innerText();
const fee = Number((firstText.match(/£([\d.]+)m\/season/) ?? [])[1]);
say(Number.isFinite(fee) && fee > 0, `the first offer pays ${fee}m a season`);
await offers.first().locator('button').click();
await page.waitForTimeout(900);
const after = await budgetText();
say(after !== null && Math.abs((after - before) - fee) < 0.06, `the kitty rose by the fee (${before}m to ${after}m, fee ${fee}m)`);

console.log('4) The table is gone, the deal is on the wall');
say(await page.locator('[data-sponsor-offer]').count() === 0, 'the offers are off the table once one is signed');
const signedText = await page.locator('[data-sponsor-desk]').innerText();
say(/a season/.test(signedText), 'the signed deal states its yearly money');
say(/seasons left|Final season/.test(signedText), 'the signed deal states its remaining term');
say(/Paid so far/.test(signedText), 'the desk tracks what the deal has paid');

console.log('5) It survives a reload, because it is the club\'s deal');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
/* A reload lands on the club home, and the resume button stands between it
   and the hub whenever a save exists. */
const resume = page.locator('button:has-text("Resume Career")');
if (await resume.count()) { await resume.first().click(); await page.waitForTimeout(1200); }
await page.locator('button:has-text("Finances")').first().click();
await page.waitForTimeout(900);
const afterReload = await page.locator('[data-sponsor-desk]').innerText();
say(/Paid so far/.test(afterReload), 'the deal is still there after a reload');
say(await page.locator('[data-sponsor-offer]').count() === 0, 'and the offers did not come back');

const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
say(pageErrors.length === 0, `no real page errors on the walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
await page.close();
await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playSponsors: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playSponsors: green. The desk offers three real deals and pays for the one you take.');
