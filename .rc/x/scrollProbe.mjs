// Round 1314 reviewer (run lens): where does a new career's hub open? My walk's hub shots all landed in the guide copy
// below the hub. This measures the scroll position before and after "Skip: just manage", by a click that does NOT
// scroll first (the button is scrolled to by the mouse wheel, the way a phone player reaches it), at 390 and 1280.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rcout';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = page.locator('text=Start Fresh');
  if (await fresh.count()) { await fresh.click(); await page.waitForTimeout(800); }
  await page.locator('button:has-text("2026-27")').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=England').first().click();
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Premier League")').first().click();
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Manchester City")').first().click();
  await page.waitForTimeout(500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
  const take = page.locator('text=Take the job');
  const takeBox = await take.boundingBox();
  console.log(`${w}: before Take the job, scrollY ${await page.evaluate(() => scrollY)}, button top ${Math.round(takeBox?.y ?? -1)} in a ${h} viewport`);
  await take.click();
  await page.waitForTimeout(1200);
  const skip = page.getByRole('button', { name: 'Skip: just manage', exact: true });
  await skip.waitFor({ timeout: 15000 });
  const y0 = await page.evaluate(() => scrollY);
  const box = await skip.boundingBox();
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`${w}: picker open, scrollY ${y0}, Skip button top ${Math.round(box?.y ?? -1)} (viewport ${h}, page ${docH} tall)`);
  await page.screenshot({ path: path.join(OUT, `probe-picker-${w}.png`) });
  if (box && (box.y < 0 || box.y + box.height > h)) {
    await page.mouse.wheel(0, box.y - h / 2);
    await page.waitForTimeout(600);
  }
  const box2 = await skip.boundingBox();
  const y1 = await page.evaluate(() => scrollY);
  console.log(`${w}: scrolled by wheel to scrollY ${y1}, Skip button top ${Math.round(box2?.y ?? -1)}`);
  await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await page.waitForTimeout(2500);
  const y2 = await page.evaluate(() => scrollY);
  const club = page.locator('h1, h2').filter({ hasText: 'Manchester City' }).first();
  const cb = await club.boundingBox().catch(() => null);
  const docH2 = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`${w}: hub open, scrollY ${y2}, page ${docH2} tall, the club heading top ${cb ? Math.round(cb.y) : 'not found'} (in view: ${cb ? cb.y >= 0 && cb.y < h : 'n/a'})`);
  await page.screenshot({ path: path.join(OUT, `probe-hub-${w}.png`) });
  await ctx.close();
}
await browser.close();
