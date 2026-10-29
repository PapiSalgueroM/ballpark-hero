/* Round 1570 probe: the gzipped JS each of the four US My Career routes asks for, measured the
   sweepWeight way (iPhone 13, load plus 1.5 s, every /assets/*.js request, gzipped). Not committed.
   Usage: BASE=http://localhost:4173 node .rc/x/weight4.mjs */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const ROUTES = ['/nba-my-career', '/nfl-my-career', '/mlb-my-career', '/nhl-my-career'];
const gz = f => { try { return zlib.gzipSync(fs.readFileSync(path.join(ROOT, 'dist/assets', f))).length; } catch { return 0; } };
const browser = await chromium.launch();
const out = [];
for (let pass = 1; pass <= 2; pass++) {
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await ctx.route(/supabase\.co/, r => r.abort());
    const page = await ctx.newPage();
    const files = new Set();
    page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
    await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
    let total = 0;
    const rows = [...files].sort().map(f => { const n = gz(f); total += n; return [f, n]; });
    console.log(`pass ${pass} ${route} ${(total / 1024).toFixed(2)}K files=${files.size}`);
    if (pass === 1) for (const [f, n] of rows) if (n > 4096 || /UsCareer|usCareer|Hall|hall/i.test(f)) console.log(`   ${f} ${(n / 1024).toFixed(2)}K`);
    out.push({ pass, route, kb: +(total / 1024).toFixed(2), files: rows });
    await ctx.close();
  }
}
await browser.close();
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weight4.json'), JSON.stringify(out, null, 1));
console.log('weight4 done');
