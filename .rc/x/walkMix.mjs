// rBTG-mix reviewer walk (never committed): What's New and Soccer Connections on the served gate head.
// Blocks every host but the served one (supabase.co included), so Connections deals from the shipped file.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/walkmix';
fs.mkdirSync(OUT, { recursive: true });
const origin = new URL(BASE).origin;
const BOARDS = JSON.parse(fs.readFileSync(process.env.BOARDS_JSON || '.rc/x/boards-head.json', 'utf8'));
const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); };

const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const motion of ['reduce', 'no-preference']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
    await ctx.route(/supabase\.co/, r => r.abort());
    await ctx.route(u => !u.href.startsWith(origin), r => r.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    /* What's New: the nine new entries on top, readable, no page side scroll */
    await page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h2:has-text("October 2026")', { timeout: 20000 });
    const wn = await page.evaluate(() => {
      const lis = [...document.querySelectorAll('h2 + ul li, ul li')].filter(li => li.querySelector('strong'));
      return {
        titles: lis.slice(0, 10).map(li => li.querySelector('strong').textContent.trim()),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        dash: [8211, 8212].some(c => document.body.innerText.includes(String.fromCharCode(c))),
      };
    });
    ok(wn.titles[0] === 'Build Your XI: a Club year draft.' && wn.titles[2] === 'Soccer Connections: 65 more boards rebuilt.' && wn.titles[3].startsWith('Front Office season card'), `whats-new ${w} ${motion}: newest first (${wn.titles.slice(0, 5).join(' / ')})`);
    ok(wn.overflow <= 0, `whats-new ${w} ${motion}: no side scroll (${wn.overflow})`);
    ok(!wn.dash, `whats-new ${w} ${motion}: no en or em dash in the page text`);
    if (motion === 'reduce') await page.screenshot({ path: path.join(OUT, `wn-${w}.png`) });

    /* Soccer Connections from the shipped file (the table is blocked): sixteen tiles, a board of the file */
    await page.goto(`${BASE}/connections`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const how = page.locator('button:has-text("Play"), button:has-text("Got it"), button:has-text("Start")').first();
    if (await how.count()) { await how.click().catch(() => {}); await page.waitForTimeout(500); }
    const conn = await page.evaluate(() => ({
      body: document.body.innerText,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }));
    const hits = BOARDS.filter(b => b.names.every(n => conn.body.includes(n)));
    ok(conn.overflow <= 0, `connections ${w} ${motion}: no side scroll (${conn.overflow})`);
    ok(hits.length === 1, `connections ${w} ${motion}: all sixteen names of exactly one shipped board on screen (${hits.map(b => b.id).join(', ') || 'none'})`);
    if (motion === 'reduce') await page.screenshot({ path: path.join(OUT, `conn-${w}.png`) });
    ok(errors.length === 0, `${w} ${motion}: no page error (${errors.slice(0, 2).join(' | ')})`);
    await ctx.close();
  }
}
await browser.close();
console.log(fails.length ? `walkMix: ${fails.length} failures of ${checks} checks` : `walkMix: green, ${checks} checks`);
process.exit(fails.length ? 1 : 0);
