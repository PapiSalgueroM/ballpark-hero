/* Review of Round 1509 (the run lens): the save the carry probe wrote (Liverpool, season one, moved mid season to
 * Venezia) planted on a served build, the Cups panel and the Europa League screen as the player sees them.
 * Supabase and the ad hosts aborted. Never committed. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-walk2');
fs.mkdirSync(OUT, { recursive: true });
const BASE_URL = process.env.BASE || 'http://localhost:4173';
const save = JSON.parse(fs.readFileSync(path.join(ROOT, '.rc/x/carryLiv11.json'), 'utf8'));
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
const browser = await chromium.launch();
const out = [];
async function press(page, loc, ms = 6000) {
  try { await loc.first().waitFor({ state: 'visible', timeout: ms }); await loc.first().evaluate(el => el.click()); await page.waitForTimeout(600); return true; } catch { return false; }
}
for (const [w, h, tag] of [[390, 844, '390'], [1280, 900, '1280']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(BLOCK, r => r.abort());
  await page.goto(`${BASE_URL}/robots.txt`);
  await page.evaluate(entries => { localStorage.clear(); for (const [k, v] of entries) localStorage.setItem(k, v); }, save);
  await page.goto(`${BASE_URL}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await press(page, page.getByRole('button', { name: /^Essential only$/i }), 1500);
  await press(page, page.getByRole('button', { name: 'Resume Career', exact: true }));
  await page.screenshot({ path: path.join(OUT, `carry-hub-${tag}.png`) });
  await press(page, page.getByRole('button').filter({ has: page.getByText('Cups', { exact: true }) }), 20000);
  const tile = ((await page.locator('[data-cm-world-tile="uel"]').first().innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ');
  out.push(`${tag} uel tile: ${tile}`);
  await page.screenshot({ path: path.join(OUT, `carry-tiles-${tag}.png`) });
  await press(page, page.locator('[data-cm-world-tile="uel"]'));
  const screen = ((await page.locator('[data-cm-cups-view="uel"]').first().innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ');
  out.push(`${tag} uel screen: ${screen.slice(0, 600)}`);
  await page.screenshot({ path: path.join(OUT, `carry-screen-${tag}.png`), fullPage: true });
  if (errors.length) out.push(`${tag} page errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-carry.txt'), out.join('\n'));
console.log(out.join('\n'));
console.log('WALK CARRY DONE');
