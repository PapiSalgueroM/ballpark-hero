// Reviewer probe for Round 1328: the calendar's month list (a second way to pick a day, under the strip).
// Does a tap there move what is under the thumb? Runs on HEAD_URL (or BASE) and, when given, on BASE_URL too.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const URLS = [['head', process.env.HEAD_URL ?? process.env.BASE ?? 'http://localhost:4173']];
if (process.env.BASE_URL) URLS.push(['base', process.env.BASE_URL]);
const OUT = process.env.RC_OUT ?? path.join('.tmp-fx', 'rvlist');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const out = [];
for (const [name, url] of URLS) for (const size of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
  const tag = `${name}-${size.width}`;
  const origin = new URL(url).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* blocked */ } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const click = async loc => { await loc.first().waitFor(); await loc.first().evaluate(b => b.click()); await page.waitForTimeout(600); };
  try {
    await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded' });
    await click(page.locator('button', { hasText: '2026-27' }));
    await click(page.locator('button', { hasText: 'England' }));
    await click(page.locator('button', { hasText: 'Premier League' }));
    await click(page.locator('button', { hasText: 'Board wants' }).filter({ hasText: 'Liverpool' }));
    await click(page.locator('div.fixed button', { hasText: 'Take the job' }));
    await click(page.getByRole('button', { name: /^Skip: just manage$/ }));
    await page.locator('[data-testid="cm-show-slots"]').waitFor({ timeout: 120000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => { const h = document.querySelector('[data-testid="cm-show-slots"]').closest('header'); scrollTo(0, scrollY + h.getBoundingClientRect().top - 12); });
    await click(page.locator('button').filter({ has: page.locator('div.uppercase:text-is("Calendar")') }));
    const rows = page.locator('[data-testid="cm-calendar-month-list"] > button');
    await rows.first().waitFor();
    const hadStrip = await page.locator('[data-testid="cm-calendar-day"]').count();
    const n = await rows.count();
    for (const idx of [Math.min(2, n - 1), n - 1]) {
      const row = rows.nth(idx);
      await row.evaluate(r => r.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(400);
      const before = await page.evaluate(i => ({ y: Math.round(scrollY), top: Math.round(document.querySelectorAll('[data-testid="cm-calendar-month-list"] > button')[i].getBoundingClientRect().top) }), idx);
      const b = await row.boundingBox();
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(700);
      const after = await page.evaluate(i => {
        const s = document.querySelector('[data-testid="cm-calendar-day"]')?.getBoundingClientRect();
        return { y: Math.round(scrollY), top: Math.round(document.querySelectorAll('[data-testid="cm-calendar-month-list"] > button')[i].getBoundingClientRect().top), strip: s ? [Math.round(s.top), Math.round(s.bottom)] : null, vh: innerHeight };
      }, idx);
      const line = `${tag} list row ${idx} of ${n} (strip before: ${hadStrip ? 'yes' : 'no'}): scrollY ${before.y} to ${after.y}, the row's top ${before.top} to ${after.top} (moved ${after.top - before.top} px under the thumb), strip ${JSON.stringify(after.strip)} of ${after.vh}`;
      out.push(line);
      console.log(`  NOTE  ${line}`);
      await page.screenshot({ path: path.join(OUT, `list-${tag}-${idx}.png`) });
    }
  } catch (e) { console.log(`  FLAG  ${tag}: broke ${String(e).split('\n')[0].slice(0, 200)}`); }
  await ctx.close();
}
await browser.close();
console.log(`rvlist: ${out.length} taps measured`);
