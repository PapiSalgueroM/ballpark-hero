// Round 1541 weight probe (sent to a runner as an extra file, never committed).
// Opens each US My Career route on BASE at 390 by 844 with the database and ad
// hosts blocked, collects every JavaScript file the page requests and prints
// the gzipped total and the biggest files, the way sweepWeight.mjs counts.
import { chromium } from 'playwright';
import zlib from 'node:zlib';

const BASE = process.env.BASE || 'http://localhost:4173';
const label = process.argv[2] || 'head';
const routes = ['/nba-my-career', '/nfl-my-career', '/mlb-my-career', '/nhl-my-career'];
const browser = await chromium.launch();
for (const r of routes) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/supabase\.co/, x => x.abort());
  await ctx.route(/googlesyndication|google-analytics|googletagmanager|doubleclick|fonts\.googleapis|fonts\.gstatic/, x => x.abort());
  const page = await ctx.newPage();
  const js = new Map();
  const pending = [];
  page.on('response', resp => {
    const u = resp.url();
    if (!u.startsWith(BASE) || !/\.m?js(\?|$)/.test(u)) return;
    pending.push(resp.body().then(b => { js.set(u, zlib.gzipSync(b).length); }).catch(() => {}));
  });
  await page.goto(BASE + r, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await Promise.all(pending);
  const total = [...js.values()].reduce((a, b) => a + b, 0);
  console.log(`${label} ${r}: ${(total / 1024).toFixed(1)}K gzipped JS in ${js.size} files`);
  for (const [u, n] of [...js].sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`   ${(n / 1024).toFixed(1)}K ${u.replace(BASE, '')}`);
  await ctx.close();
}
await browser.close();
console.log(`weigh ${label}: done`);
