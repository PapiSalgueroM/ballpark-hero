// Round 1534 weight probe: the four US My Career routes, sweepWeight's own window (load plus 1.5 s,
// iPhone 13, gzipped JS asked for), plus a settled window (networkidle plus 1.5 s). Never committed.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium, devices } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? path.join(ROOT, '.tmp-fx');
const LABEL = process.argv[2] ?? 'head';
const gz = f => { try { return zlib.gzipSync(fs.readFileSync(path.join(ROOT, 'dist/assets', f))).length; } catch { return 0; } };
const browser = await chromium.launch();
const rows = [];
for (const route of ['/nfl-my-career', '/nba-my-career', '/mlb-my-career', '/nhl-my-career']) {
  for (const mode of ['window', 'settled']) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await ctx.route(/supabase\.co/, r => r.abort());
    const page = await ctx.newPage();
    const files = new Set();
    page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
    await page.goto(`${BASE}${route}`, { waitUntil: mode === 'window' ? 'load' : 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500);
    const list = [...files].sort().map(f => [f, gz(f)]);
    const total = list.reduce((a, [, n]) => a + n, 0);
    rows.push({ route, mode, kb: +(total / 1024).toFixed(1), files: list.length, list });
    console.log(`${LABEL} ${route} ${mode}: ${(total / 1024).toFixed(1)}K over ${list.length} files`);
    await ctx.close();
  }
}
await browser.close();
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, `weight-${LABEL}.json`), JSON.stringify(rows, null, 1));
console.log(`weight probe ${LABEL} done`);
