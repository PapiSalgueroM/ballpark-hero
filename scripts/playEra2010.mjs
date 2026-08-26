/**
 * Round 153 browser harness: the 2010-11 era picker, played like a person.
 *
 * Born 2026-08-17, the day the era shipped: simEra2010 proves the engine and
 * the bake, but nothing walked the actual UI branch (historicPick filtering,
 * era nation cards, era club tiles, the board-want label, the era squad) in
 * a browser until this script did, and its first run immediately earned its
 * keep by finding a test-side pitfall (the page header also says "2010-11",
 * so the tile must be clicked as a button). Thirteen checks, every one a
 * thing a player would see wrong.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playEra2010.mjs
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

await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const fresh = await page.locator('text=Start Fresh').count();
if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }

console.log('1) The era step');
say(await page.locator('button:has-text("2010-11")').count() >= 1, 'the 2010-11 era tile is on the menu');
say((await page.locator('text=REAL DATA').count()) >= 2, 'both eras carry the REAL DATA badge');
await page.locator('button:has-text("2010-11")').first().click();
await page.waitForTimeout(700);

console.log('2) Nations shrink to the era');
say(await page.locator('text=England').count() >= 1 && await page.locator('text=Spain').count() >= 1, 'England and Spain offered in 2010');
say(await page.locator('text=Germany').count() === 0, 'Germany correctly absent from 2010');
await page.locator('text=England').first().click();
await page.waitForTimeout(700);

console.log('3) The 2010 league and clubs');
say(await page.locator('text=Premier League').count() >= 1, 'the 2010 Premier League is offered');
await page.locator('text=Premier League').first().click();
await page.waitForTimeout(700);
say(await page.locator('button:has-text("Blackpool")').count() === 1, '2010 Blackpool is a pickable club');
say(await page.locator('button:has-text("Barcelona")').count() === 0, 'Barcelona is not in the English league');
say(await page.locator('text=partial data').count() >= 1, 'the thin-squad marker shows');
const utd = await page.locator('button:has-text("Manchester United")').first().textContent();
say(/Win the Premier League/.test(utd ?? ''), 'the United tile demands the title');
say(!/Top \d+/i.test(utd ?? ''), 'no Top N phrasing on any part of the tile');

console.log('4) Into the 2010 dressing room');
await page.locator('button:has-text("Manchester United")').first().click();
await page.waitForTimeout(500);
const essential = page.locator('button:has-text("Essential only")');
if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
await page.locator('text=Take the job').click();
await page.waitForTimeout(2000);
const body = await page.locator('body').textContent();
say(/2010-11/.test(body ?? ''), 'the career header says 2010-11');
const squadTab = page.locator('text=Squad').first();
if (await squadTab.count()) { await squadTab.click(); await page.waitForTimeout(900); }
const body2 = await page.locator('body').textContent();
say(/Rooney/.test(body2 ?? ''), 'Wayne Rooney is in the 2010 United squad');
say(!/Bruno Fernandes/.test(body2 ?? ''), 'no 2026 player leaked into 2010');

const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
say(pageErrors.length === 0, `no real page errors (${pageErrors.length ? pageErrors[0] : 'clean'})`);

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playEra2010: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playEra2010: green. A person can walk into 2010 and find it real.');
