/* Round 1319 probe: the four US career routes measured the way scripts/sweepWeight.mjs section 1
   measures them (iPhone 13, load plus 1.5 s, gzipped size of every /assets/*.js asked for), with the
   chunk list. Never committed. Runs against the served dist on a runner. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const ROOT = process.cwd();
const gz = f => zlib.gzipSync(fs.readFileSync(path.join(ROOT, 'dist/assets', f))).length;
const browser = await chromium.launch();
const out = {};
for (const route of ['/nfl-my-career', '/nba-my-career', '/mlb-my-career', '/nhl-my-career']) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  const rows = [...files].sort().map(f => [f, gz(f)]);
  const total = rows.reduce((a, [, n]) => a + n, 0);
  out[route] = { kb: +(total / 1024).toFixed(1), files: rows.map(([f, n]) => `${f} ${(n / 1024).toFixed(1)}`) };
  console.log(`${route} ${(total / 1024).toFixed(1)}K over ${rows.length} files`);
  for (const [f, n] of rows.filter(([, n]) => n > 3000)) console.log(`   ${f} ${(n / 1024).toFixed(1)}K`);
  await ctx.close();
}
await browser.close();
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weight4.json'), JSON.stringify(out, null, 1));
console.log('WEIGHT4 done');
