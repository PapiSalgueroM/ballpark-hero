// Round 1332 decision 6: sweepWeight's own method (iPhone 13, load plus 1.5 s, every /assets/*.js asked for,
// gzipped from the build that served it) on the base build (dist-base on 4174) and the head build (dist on 4173),
// for the four US career routes, /front-office, /club-manager and /soccer-career. Never committed.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from './lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const ROUTES = ['/nfl-my-career', '/nba-my-career', '/mlb-my-career', '/nhl-my-career', '/front-office', '/club-manager', '/soccer-career'];
const SIDES = { base: ['http://localhost:4174', 'dist-base'], head: ['http://localhost:4173', 'dist'] };
const browser = await chromium.launch();
const out = {};
for (const [side, [base, dir]] of Object.entries(SIDES)) {
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await ctx.route(/supabase\.co/, r => r.abort());
    const page = await ctx.newPage();
    const files = new Set();
    page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
    await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
    let total = 0;
    for (const f of files) total += zlib.gzipSync(fs.readFileSync(path.join(dir, 'assets', f))).length;
    out[`${side}${route}`] = { kb: (total / 1024).toFixed(1), files: files.size };
    await ctx.close();
  }
}
await browser.close();
let differ = 0;
for (const route of ROUTES) {
  const b = out[`base${route}`];
  const h = out[`head${route}`];
  if (b.kb !== h.kb) differ++;
  console.log(`${route.padEnd(16)} base ${b.kb}K over ${b.files} files, head ${h.kb}K over ${h.files} files${b.kb === h.kb ? '' : '  DIFFERS'}`);
}
console.log(`weight1332: ${ROUTES.length} routes, ${differ ? `${differ} differ to one decimal` : 'every row equal to one decimal, head against base'}`);
process.exit(differ ? 1 : 0);
