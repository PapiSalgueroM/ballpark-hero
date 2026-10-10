/* Round 1212 scratch: the counting loop of scripts/sweepWeight.mjs section 1, for the four US career routes.
   Run on a served dist (BASE). Prints one line a route; never asserts. Not committed. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const ROUTES = ['/mlb-my-career', '/nhl-my-career', '/nba-my-career', '/nfl-my-career'];
const gz = f => { try { return zlib.gzipSync(fs.readFileSync(f)).length; } catch { return 0; } };
const browser = await chromium.launch();
const rows = [];
for (const route of ROUTES) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  let total = 0;
  for (const f of files) total += gz(path.join(ROOT, 'dist/assets', f));
  rows.push({ route, kb: (total / 1024).toFixed(1), files: files.size });
  console.log(`WEIGHT ${route.padEnd(16)} ${(total / 1024).toFixed(1)}K gz over ${files.size} files`);
  await ctx.close();
}
await browser.close();
/* the lazy chunks that carry a number file, by a word only that chunk holds */
const assets = fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(f => f.endsWith('.js'));
for (const [word, label] of [['Tip off', 'nba number file'], ['The kick after is no good.', 'nfl number file'], ['Play ball', 'mlb number file'], ['data-us-season-centre', 'viewer']]) {
  const hit = assets.filter(f => fs.readFileSync(path.join(ROOT, 'dist/assets', f), 'utf8').includes(word));
  console.log(`CHUNK ${label}: ${hit.map(f => `${f} ${(gz(path.join(ROOT, 'dist/assets', f)) / 1024).toFixed(1)}K`).join(', ') || 'none'}`);
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weights.json'), JSON.stringify(rows, null, 1));
