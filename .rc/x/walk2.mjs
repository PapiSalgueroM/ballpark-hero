// Reviewer walk 2: the consent card answered first (Reject all), one reveal per page at 390x844 with reduced motion
// on and off, the reveal's real animation duration, whether the through line sits inside the first screen, and how far
// the card grid grows when the number replaces "Higher?". Supabase blocked. Shots to RC_OUT.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || './walk2-out';
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ['/nfl-higher-lower', '/nba-higher-lower', '/f1-higher-lower', '/tennis-higher-lower', '/hockey-higher-lower'];
const rows = []; const problems = [];
const browser = await chromium.launch();
for (const route of ROUTES) for (const motion of ['reduce', 'no-preference']) {
  const tag = `${route.slice(1)}-390-${motion === 'reduce' ? 'rm' : 'mo'}-clean`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: motion, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, (r) => r.abort());
  await page.route(/googlesyndication|googletagmanager|google-analytics|doubleclick/, (r) => r.abort());
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^reject all$/i }).first().click({ timeout: 2000 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    const open = page.locator('[role="dialog"][data-state="open"]');
    if ((await open.count()) === 0) break;
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
  const gridBefore = await page.evaluate(() => { const g = document.querySelector('div.grid.grid-cols-2'); return g ? Math.round(g.getBoundingClientRect().height) : null; });
  await page.locator('div.grid.grid-cols-2 > button').first().click({ timeout: 4000 });
  await page.waitForTimeout(120);
  const m = await page.evaluate(() => {
    const g = document.querySelector('div.grid.grid-cols-2');
    const spans = [...g.querySelectorAll('span')].filter((s) => /^(through |season not confirmed)/.test(s.textContent.trim()) && s.children.length === 0);
    const cs = spans[0] ? getComputedStyle(spans[0].parentElement) : null;
    const scrollY = window.scrollY;
    return { grid: Math.round(g.getBoundingClientRect().height), lines: spans.map((s) => s.textContent.trim()), lineBottoms: spans.map((s) => Math.round(s.getBoundingClientRect().bottom)), lineHeights: spans.map((s) => Math.round(s.getBoundingClientRect().height)), anim: cs && cs.animationName, dur: cs && cs.animationDuration, opacity: cs && cs.opacity, scrollY, banner: !!document.querySelector('[aria-label*="cookie" i], [data-consent]') };
  });
  rows.push({ tag, gridBefore, ...m });
  if (motion === 'reduce' && m.dur && parseFloat(m.dur) > 0.01) problems.push(`${tag}: reveal lasts ${m.dur} under reduced motion`);
  if (m.lineBottoms.some((b) => b > 844)) problems.push(`${tag}: a through line sits below the first screen (${m.lineBottoms.join(', ')})`);
  if (m.scrollY !== 0) problems.push(`${tag}: the page scrolled to ${m.scrollY} on reveal`);
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  await ctx.close();
}
await browser.close();
for (const r of rows) console.log(JSON.stringify(r));
for (const p of problems) console.log('PROBLEM ' + p);
fs.writeFileSync(path.join(OUT, 'walk2.json'), JSON.stringify({ rows, problems }, null, 1));
console.log(`walk2: ${rows.length} reveals measured, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
