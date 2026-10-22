// Release BQ second step: weigh the routes the brief names that sweepWeight has no row for (and /nfl-my-career, which
// it has), in sweepWeight's window (iPhone 13, load plus 1.5 s, gzipped JS of dist/assets asked for). Every host off
// BASE is aborted (the database included). Never committed. Usage: node .rc/x/weighBQH.mjs <label> (cwd = the
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
const ROUTES = ['/nfl-my-career', '/nba-my-career', '/mlb-my-career', '/nhl-my-career', '/connections',
  '/silverware-sort', '/champ-or-not', '/whod-they-beat', '/rank-em'];
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
console.log(bad ? `weighBQH ${LABEL}: ${bad} routes asked for a file not in dist` : `weighBQH ${LABEL}: done, ${ROUTES.length} routes`);
process.exit(bad ? 1 : 0);
