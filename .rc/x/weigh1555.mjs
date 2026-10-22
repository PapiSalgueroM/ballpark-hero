/* Round 1555 weight probe (not committed): each route measured the way scripts/sweepWeight.mjs section 1 does
 * (an iPhone 13 context, every /assets/*.js asked for until load plus 1.5 s, each file gzipped with zlib's default),
 * on the head's build and the base's. The database host is blocked. Run from the repo root:
 *   node .rc/x/weigh1555.mjs <head url> <head dist> <base url> <base dist> */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const [headUrl, headDist, baseUrl, baseDist] = process.argv.slice(2);
const gz = f => zlib.gzipSync(fs.readFileSync(f)).length;
const k = n => `${(n / 1024).toFixed(1)}K`;
const ROUTES = ['/nba-starting-5', '/whats-new', '/nba-stat-line'];
async function weigh(url, dist, label, route) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${url}${route}`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  let total = 0;
  for (const f of files) total += gz(path.join(dist, 'assets', f));
  const named = [...files].filter(f => /^(NbaLineup|WhatsNew|NbaStatLine|nbaStatLine|nbaStartingFiveScore)-/.test(f))
    .map(f => `${f} ${k(gz(path.join(dist, 'assets', f)))}`).join(', ') || 'none';
  console.log(`${label} ${route}: ${k(total)} over ${files.size} files; own chunks: ${named}`);
  await browser.close();
  return total;
}
for (const route of ROUTES) {
  const head = await weigh(headUrl, headDist, 'head', route);
  const base = await weigh(baseUrl, baseDist, 'base', route);
  console.log(`weigh1555 ${route}: head ${k(head)}, base ${k(base)}, growth ${((head - base) / 1024).toFixed(2)}K`);
}
