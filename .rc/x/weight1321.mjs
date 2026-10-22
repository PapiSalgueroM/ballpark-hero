/* Round 1321 probe: gzipped JavaScript a phone downloads for two routes on a served build, the way
   scripts/sweepWeight.mjs measures (iPhone 13, every /assets/*.js requested until load plus 1.5 s, then until the
   page has drawn and the network is quiet). The database host is blocked. Usage: node weight1321.mjs <base url>
   <dist dir> <label>. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium, devices } from 'playwright';

const [base, dist, label] = process.argv.slice(2);
const ROUTES = ['/nba-front-office', '/front-office'];
const gz = f => zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length;
const browser = await chromium.launch();
const out = {};
for (const route of ROUTES) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  const atWindow = new Set(files);
  await page.waitForFunction(() => (document.getElementById('root')?.innerText ?? '').length > 200, null, { timeout: 45000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const sum = set => [...set].reduce((s, f) => s + (fs.existsSync(path.join(dist, 'assets', f)) ? gz(path.join(dist, 'assets', f)) : 0), 0);
  const list = [...files].sort().map(f => `${f} ${(gz(path.join(dist, 'assets', f)) / 1024).toFixed(1)}K`);
  out[route] = { windowK: (sum(atWindow) / 1024).toFixed(1), settledK: (sum(files) / 1024).toFixed(1), files: files.size, list };
  console.log(`${label} ${route}: ${out[route].windowK}K in the sweep's window (${atWindow.size} files), ${out[route].settledK}K settled (${files.size} files)`);
  for (const l of list) console.log(`   ${l}`);
  await ctx.close();
}
await browser.close();
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `weight-${label}.json`), JSON.stringify(out, null, 2));
console.log(`weight1321 ${label}: done`);
