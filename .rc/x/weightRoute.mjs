/* weightRoute.mjs (fixer scratch, Round 1103, never committed). Measures one route the way scripts/sweepWeight.mjs
   section 1 does (an iPhone 13 context, every /assets/*.js the page asks for until load plus 1.5 s, gzipped and
   summed), for a route that has no row in its budget table.
     usage: node weightRoute.mjs <dist dir> <base url> <route> [label] */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium, devices } from 'playwright';

const [DIST, BASE, ROUTE, LABEL = ''] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
await ctx.route(/supabase\.co/, r => r.abort());
const page = await ctx.newPage();
const files = new Set();
page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'load', timeout: 40000 });
await page.waitForTimeout(1500);
const rows = [...files].map(f => { let n = 0; try { n = zlib.gzipSync(fs.readFileSync(path.join(DIST, 'assets', f))).length; } catch { n = -1; } return { f, n }; });
const missing = rows.filter(r => r.n < 0);
const total = rows.reduce((t, r) => t + Math.max(0, r.n), 0);
console.log(`${LABEL} ${ROUTE}: ${(total / 1024).toFixed(1)}K of gzipped JavaScript in ${rows.length} files${missing.length ? ` (${missing.length} not found in ${DIST})` : ''}`);
for (const r of rows.sort((a, b) => b.n - a.n).slice(0, 10)) console.log(`   ${(r.n / 1024).toFixed(1).padStart(7)}K  ${r.f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '-*.js')}`);
await browser.close();
if (missing.length || rows.length === 0) process.exit(1);
