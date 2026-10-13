// Reviewer probe for Round 1328: the day strip's foot offset after the cookie banner is answered.
// Banner up, a day tapped (the strip takes the banner's clearance), the banner answered, the grid's first row put
// near the top of the screen, then: where is the strip, and which day cells does it cover? Then one more tap.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const URLS = [['head', process.env.HEAD_URL ?? process.env.BASE ?? 'http://localhost:4173']];
if (process.env.BASE_URL) URLS.push(['base', process.env.BASE_URL]);
const OUT = process.env.RC_OUT ?? path.join('.tmp-fx', 'rvbanner');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let flags = 0;
const measure = page => page.evaluate(() => {
  const s = document.querySelector('[data-testid="cm-calendar-day"]');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  const covered = [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')].filter(b => {
    const c = b.getBoundingClientRect();
    return c.bottom > r.top + 4 && c.top < r.bottom - 4;
  }).map(b => (b.getAttribute('aria-label') ?? '').split(':')[0]);
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, inlineBottom: s.style.bottom, sticky: getComputedStyle(s).position, covered };
});
for (const [name, url] of URLS) for (const size of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
  const tag = `${name}-${size.width}`;
  const origin = new URL(url).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const click = async loc => { await loc.first().waitFor(); await loc.first().evaluate(b => b.click()); await page.waitForTimeout(600); };
  try {
    await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded' });
    await page.locator('[role="region"][aria-label="Cookie choices"]').waitFor();
    await click(page.locator('button', { hasText: '2026-27' }));
    await click(page.locator('button', { hasText: 'England' }));
    await click(page.locator('button', { hasText: 'Premier League' }));
    await click(page.locator('button', { hasText: 'Board wants' }).filter({ hasText: 'Liverpool' }));
    await click(page.locator('div.fixed button', { hasText: 'Take the job' }));
    await click(page.getByRole('button', { name: /^Skip: just manage$/ }));
    await page.locator('[data-testid="cm-show-slots"]').waitFor({ timeout: 120000 });
    await page.waitForTimeout(800);
    await click(page.locator('button').filter({ has: page.locator('div.uppercase:text-is("Calendar")') }));
    await page.locator('[data-testid="cm-calendar-grid"]').waitFor();
    await page.evaluate(() => { const c = [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')]; c[c.length - 1].click(); });
    await page.waitForTimeout(600);
    console.log(`  NOTE  ${tag} banner up, last day tapped: ${JSON.stringify(await measure(page))}`);
    await click(page.locator('button', { hasText: 'Essential only' }));
    const putFirstRow = () => page.evaluate(() => { const g = document.querySelector('[data-testid="cm-calendar-grid"]'); scrollTo(0, scrollY + g.getBoundingClientRect().top - 120); });
    await putFirstRow();
    await page.waitForTimeout(500);
    const m = await measure(page);
    console.log(`  NOTE  ${tag} banner answered, grid top at 120: ${JSON.stringify(m)}`);
    if (m && m.sticky === 'sticky' && m.vh - m.bottom > 40) { flags += 1; console.log(`  FLAG  ${tag}: the strip rides ${m.vh - m.bottom} px above the foot of the screen with no banner there, over ${m.covered.length} day cells (${m.covered.slice(0, 8).join(', ')})`); }
    await page.screenshot({ path: path.join(OUT, `banner-${tag}-answered.png`) });
    await page.evaluate(() => { const c = [...document.querySelectorAll('[data-testid="cm-calendar-grid"] > button')]; c[0].click(); });
    await page.waitForTimeout(500);
    await putFirstRow();
    await page.waitForTimeout(400);
    console.log(`  NOTE  ${tag} after one more tap: ${JSON.stringify(await measure(page))}`);
    await page.screenshot({ path: path.join(OUT, `banner-${tag}-retapped.png`) });
  } catch (e) { console.log(`  FLAG  ${tag}: broke ${String(e).split('\n')[0].slice(0, 200)}`); flags += 1; }
  await ctx.close();
}
await browser.close();
console.log(`rvbanner: ${flags} flag(s)`);
process.exit(flags ? 1 : 0);
