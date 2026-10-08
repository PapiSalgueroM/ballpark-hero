/* Reviewer scratch (Round 1051, runner lens). Travels as .rc/x/weight4.mjs. The download weight of the four US My
   Career routes, measured the way scripts/sweepWeight.mjs measures: open the page as a phone, collect every
   JavaScript file it requests, add up the gzipped sizes off the build folder.
   node .rc/x/weight4.mjs <base url> <dist dir> <label> */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium, devices } from 'playwright';

const [BASE, DIST, LABEL] = process.argv.slice(2);
const ROUTES = ['/nfl-my-career', '/nba-my-career', '/mlb-my-career', '/nhl-my-career'];
const gz = f => { try { return zlib.gzipSync(fs.readFileSync(f)).length; } catch { return 0; } };
const browser = await chromium.launch();
const out = [];
for (const route of ROUTES) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  let err = '';
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(3000);
  } catch (e) { err = String(e).split('\n')[0].slice(0, 100); }
  let total = 0, missing = 0;
  const big = [];
  for (const f of files) { const n = gz(path.join(DIST, 'assets', f)); if (!n) missing += 1; total += n; big.push([f, n]); }
  big.sort((a, b) => b[1] - a[1]);
  const row = { label: LABEL, route, bytes: total, kb: Math.round(total / 1024), files: files.size, missing, err, top: big.slice(0, 6).map(([f, n]) => `${f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '')}:${n}`) };
  out.push(row);
  console.log(`${LABEL} ${route} ${row.bytes} bytes gz (${row.kb}K) over ${row.files} files, ${missing} unreadable ${err}`);
  console.log(`   top: ${row.top.join(' ')}`);
  await ctx.close();
}
await browser.close();
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `weight-${LABEL}.json`), JSON.stringify(out, null, 1));
console.log(`WEIGHT ${LABEL}: ${out.map(r => `${r.route} ${r.bytes}`).join(', ')}`);
