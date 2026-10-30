// Release BU join: weigh the routes without a sweepWeight row that the BU heads touch, in sweepWeight's window (iPhone 13, load plus 1.5 s,
// JS of dist/assets the page asked for; every host but BASE is aborted, the database included). Copied from
// rBSg/.tmp-fx/weighBS.mjs, routes changed only: the four US My Careers (/nfl-my-career repeats its sweepWeight row
// as a cross check), the two Front Offices (rows, cross check), Soccer Connections, Build Your XI and What's New.
// Never committed. Usage: node .rc/x/weighBU.mjs <label> (cwd = the checkout whose dist is served on BASE).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium, devices } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE ?? 'http://localhost:4173';
const LABEL = process.argv[2] ?? 'head';
const gz = (f) => { try { return zlib.gzipSync(fs.readFileSync(path.join(ROOT, 'dist/assets', f))).length; } catch { return 0; } };
const ROUTES = ['/nhl-front-office', '/front-office', '/nfl-my-career', '/aussie-rules-manager', '/player-bingo', '/sports-millionaire',
  '/whats-new'];
const browser = await chromium.launch();
let bad = 0;
for (const route of ROUTES) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', (req) => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1500);
  const list = [...files].map((f) => gz(f));
  if (list.some((n) => n === 0)) bad++;
  const total = list.reduce((a, n) => a + n, 0);
  console.log(`${LABEL} ${route}: ${(total / 1024).toFixed(1)}K over ${list.length} files`);
  await ctx.close();
}
await browser.close();
console.log(bad ? `weighBU ${LABEL}: ${bad} routes asked for a file not in dist` : `weighBU ${LABEL}: done, ${ROUTES.length} routes`);
process.exit(bad ? 1 : 0);
