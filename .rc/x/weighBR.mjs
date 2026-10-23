// Release BR join: weigh the routes brief-BRG names that sweepWeight has no row for (and the three rows it has,
// /stadium-tycoon, /front-office and /nba-front-office), in sweepWeight's window (iPhone 13, load plus 1.5 s, gzipped JS of dist/assets asked for). Every host off
// BASE is aborted (the database included). Never committed. Usage: node .rc/x/weighBR.mjs <label> (cwd = the
// checkout whose dist is served on BASE).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium, devices } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE ?? 'http://localhost:4173';
const LABEL = process.argv[2] ?? 'head';
const gz = (f) => { try { return zlib.gzipSync(fs.readFileSync(path.join(ROOT, 'dist/assets', f))).length; } catch { return 0; } };
const ROUTES = ['/sports-millionaire', '/face-off', '/cfb-dynasty', '/cbb-dynasty', '/nfl-higher-lower', '/nba-higher-lower',
  '/f1-higher-lower', '/tennis-higher-lower', '/f1-driver', '/nba-starting-5', '/baseball-connections', '/nfl-connections',
  '/nhl-connections', '/whats-new', '/stadium-tycoon', '/front-office', '/nba-front-office'];
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
console.log(bad ? `weighBR ${LABEL}: ${bad} routes asked for a file not in dist` : `weighBR ${LABEL}: done, ${ROUTES.length} routes`);
process.exit(bad ? 1 : 0);
