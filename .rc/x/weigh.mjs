/* Round 1320 weight probe: gzipped JavaScript a phone downloads for three routes, measured the way
   scripts/sweepWeight.mjs section 1 measures (iPhone 13, load plus 1.5 seconds, every /assets/*.js asked for),
   with the chunk list. The database host is blocked. Usage on a served build: node weigh.mjs */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium, devices } from 'playwright';

const ROOT = process.cwd();
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const ROUTES = ['/cfb-dynasty', '/cbb-dynasty', '/front-office'];
const gz = f => zlib.gzipSync(fs.readFileSync(path.join(ROOT, 'dist/assets', f))).length;
const browser = await chromium.launch();
const out = {};
for (const route of ROUTES) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  const list = [...files].sort().map(f => ({ f, gz: gz(f) }));
  const total = list.reduce((n, x) => n + x.gz, 0);
  out[route] = { k: +(total / 1024).toFixed(1), files: list.length, list };
  console.log(`${route} ${(total / 1024).toFixed(1)}K gz over ${list.length} files`);
  for (const x of list.sort((a, b) => b.gz - a.gz)) console.log(`   ${(x.gz / 1024).toFixed(1).padStart(7)}K ${x.f}`);
  await ctx.close();
}
await browser.close();
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weigh.json'), JSON.stringify(out, null, 1));
console.log('weigh done');
