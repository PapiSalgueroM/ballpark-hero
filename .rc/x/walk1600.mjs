// Round 1600 walk (sent as an extra file, never committed): a new 2026-27 Club Manager career at AC Milan shows
// Modric on the age read, and the market shows Messi and Ronaldo on it. Pictures at 390 and 1280 go to $RC_OUT.
// Run on a served build: BASE=http://localhost:4173. The database host is blocked.
import os from 'node:os';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? os.tmpdir();
let failures = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) failures += 1; };
const rowText = (page, name) => page.evaluate(n => {
  const hits = [...document.querySelectorAll('div, li, tr, button')].filter(el => (el.textContent ?? '').includes(n));
  hits.sort((a, b) => (a.textContent ?? '').length - (b.textContent ?? '').length);
  const small = hits.find(el => (el.textContent ?? '').length < 220 && /\b\d{2}\b/.test(el.textContent ?? ''));
  return small ? small.textContent.replace(/\s+/g, ' ').trim() : null;
}, name);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.route(/supabase\.co/, r => r.abort());
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
if (await page.locator('text=Start Fresh').count()) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }
await page.locator('button:has-text("2026-27")').first().click().catch(() => {});
await page.waitForTimeout(700);
await page.locator('text=Italy').first().click();
await page.waitForTimeout(700);
await page.locator('button:has-text("Serie A")').first().click();
await page.waitForTimeout(700);
await page.locator('button:has-text("AC Milan")').first().click();
await page.waitForTimeout(500);
/* The cookie banner: the least sharing choice it offers (its choices are unticked until the visitor ticks one). */
for (const label of ['Essential only', 'Reject all', 'Reject', 'Save choices']) {
  const b = page.locator(`button:has-text("${label}")`).first();
  if (await b.count() && await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(400); break; }
}
await page.locator('text=Take the job').click();
const skip = page.locator('button:has-text("Skip: just manage")').first();
await skip.waitFor({ timeout: 15000 }).then(() => skip.click()).catch(() => {});
await page.waitForTimeout(2000);
for (const tab of ['Squad', 'Team']) {
  const b = page.locator(`button:has-text("${tab}")`).first();
  if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(800); break; }
}
const modric = await rowText(page, 'Modri');
console.log(`   squad row: ${modric}`);
say(!!modric && /\b80\b/.test(modric), 'AC Milan squad: Modric shows 80');
await page.screenshot({ path: path.join(OUT, 'squad-milan-390.png'), fullPage: false });
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'squad-milan-1280.png'), fullPage: false });
await page.setViewportSize({ width: 390, height: 844 });
await page.locator('button:has-text("Market")').first().click();
await page.waitForTimeout(900);
const search = page.locator('input[aria-label="Search player or club"]');
for (const [name, want, shot] of [['Lionel Messi', 86, 'messi'], ['Cristiano Ronaldo', 86, 'ronaldo']]) {
  await search.fill(name);
  await page.waitForTimeout(400);
  const row = await rowText(page, name);
  console.log(`   market row: ${row}`);
  say(!!row && new RegExp(`\\b${want}\\b`).test(row), `market: ${name} shows ${want}`);
  await search.evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: path.join(OUT, `market-${shot}-390.png`) });
}
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'market-ronaldo-1280.png') });
const pe = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
say(pe.length === 0, `no real page errors (${pe.length ? pe[0] : 'clean'})`);
const scrollX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
say(scrollX <= 0, `no sideways scroll at 1280 (${scrollX})`);
await browser.close();
if (failures) { console.error(`walk1600: ${failures} failure(s)`); process.exit(1); }
console.log('walk1600: green. Modric 80 in his squad, Messi and Ronaldo 86 on the market.');
