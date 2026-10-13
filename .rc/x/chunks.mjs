// Round 1330 probe: every JS file /soccer-career asks for (the sweepWeight window), with its gz size.
import { chromium, devices } from 'playwright';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const route = process.env.ROUTE ?? '/soccer-career';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
await ctx.route(/supabase\.co/, r => r.abort());
const page = await ctx.newPage();
const files = new Set();
page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
await page.waitForTimeout(1500);
let total = 0;
const rows = [];
for (const f of files) {
  const g = gzipSync(readFileSync(path.join("dist/assets", f))).length;
  total += g;
  rows.push([f, g]);
}
rows.sort((a, b) => b[1] - a[1]);
for (const [f, g] of rows) console.log(`${(g / 1024).toFixed(2).padStart(8)}K  ${f}`);
console.log(`TOTAL ${route} ${(total / 1024).toFixed(1)}K over ${rows.length} files`);
await browser.close();
