// Round BJG (Release BJ), never committed: the brief's nine routes by sweepWeight's own method (iPhone 13, load plus
// 1.5 s, every /assets/*.js the page asked for, gzipped from the build that served it), on the base build (main as
// published, dist-base on 4174) and the head build (dist on 4173). Prints K to one decimal and bytes, and the move.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const ROUTES = ['/club-manager', '/soccer-career', '/'];
const BASE_DIR = process.env.BASE_DIST || '/tmp/wt-4174/dist';
const SIDES = { base: ['http://localhost:4174', BASE_DIR], head: ['http://localhost:4173', 'dist'] };
const gz = file => zlib.gzipSync(fs.readFileSync(file)).length;
const browser = await chromium.launch();
const got = {};
for (const [side, [origin, dir]] of Object.entries(SIDES)) {
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await ctx.route(/supabase\.co/, r => r.abort());
    const page = await ctx.newPage();
    const files = new Set();
    page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
    await page.goto(`${origin}${route}`, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
    let total = 0;
    for (const f of files) total += gz(path.join(dir, 'assets', f));
    got[`${side}${route}`] = total;
    await ctx.close();
  }
}
await browser.close();
console.log('The routes, base (e86f0fe2) against head (gzipped JS):');
for (const route of ROUTES) {
  const b = got[`base${route}`], h = got[`head${route}`];
  console.log(`  ${route.padEnd(34)} base ${(b / 1024).toFixed(1)}K (${b} B)  head ${(h / 1024).toFixed(1)}K (${h} B)  ${h - b >= 0 ? '+' : ''}${h - b} B (${h - b >= 0 ? '+' : ''}${((h - b) / 1024).toFixed(2)}K)`);
}
console.log('weightBJ: done');
