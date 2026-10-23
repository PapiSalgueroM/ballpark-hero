/* Round 1544 probe (sent to a runner as an extra file, never committed): sweepWeight's own method for one
   route it has no row for. An iPhone 13 (390 by 844), the database host aborted, every /assets/*.js the page
   asks for until load plus 1.5 s, gzipped from the dist that served it. Usage:
   node weightNba.mjs <base url> <dist dir> <tag> [route...]   (prints one line a route and the file list) */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const [BASE, DIST, TAG, ...routes] = process.argv.slice(2);
const ROUTES = routes.length ? routes : ['/nba-my-career', '/nfl-my-career'];
const gz = f => { try { return zlib.gzipSync(fs.readFileSync(path.join(DIST, 'assets', f))).length; } catch { return -1; } };
const browser = await chromium.launch();
let bad = 0;
for (const route of ROUTES) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co|googlesyndication|doubleclick|googletagmanager|google-analytics/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  const list = [...files].sort().map(f => [f, gz(f)]);
  const missing = list.filter(([, n]) => n < 0).length;
  if (missing) bad += 1;
  const total = list.reduce((s, [, n]) => s + Math.max(0, n), 0);
  console.log(`${TAG} ${route}: ${(total / 1024).toFixed(1)}K gz over ${list.length} files${missing ? ` (${missing} NOT FOUND in ${DIST})` : ''}`);
  console.log(`  ${list.map(([f, n]) => `${f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '')}:${(n / 1024).toFixed(1)}`).join(' ')}`);
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
