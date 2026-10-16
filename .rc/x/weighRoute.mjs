// sweepWeight's own measure (iPhone 13, load + 1.5 s, gz of every /assets/*.js asked for) for any route.
// usage: node weighRoute.mjs <baseUrl> <distDir> <route> [<route> ...]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const [base, dist, ...routes] = process.argv.slice(2);
const { chromium, devices } = pw;
const browser = await chromium.launch();
for (const route of routes) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  let total = 0;
  for (const f of files) total += zlib.gzipSync(fs.readFileSync(path.join(dist, 'assets', f))).length;
  console.log(`weigh ${route} ${(total / 1024).toFixed(1)}K gz over ${files.size} files at ${base}`);
  await ctx.close();
}
await browser.close();
