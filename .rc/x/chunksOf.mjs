/* Round 1305, a runner side probe (never committed): the JavaScript files a route asks for, each with its gzipped
   size, measured the way scripts/sweepWeight.mjs measures a route (an iPhone 13, load plus 1.5 seconds, the database
   host blocked). Usage: node chunksOf.mjs <base url> <dist dir> <route> [<route> ...] */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [base, dist, ...routes] = process.argv.slice(2);
const gz = f => zlib.gzipSync(fs.readFileSync(f)).length;
/* a chunk's name without its content hash, so two builds can be laid side by side */
const stem = f => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '.js');
const browser = await chromium.launch();
for (const route of routes) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  const rows = [...files].map(f => ({ f, stem: stem(f), bytes: gz(path.join(dist, 'assets', f)) })).sort((a, b) => b.bytes - a.bytes);
  const total = rows.reduce((n, r) => n + r.bytes, 0);
  console.log(`ROUTE ${route}: ${(total / 1024).toFixed(1)}K gz over ${rows.length} files`);
  for (const r of rows) console.log(`  ${route} ${r.stem} ${r.bytes}`);
  await ctx.close();
}
await browser.close();
