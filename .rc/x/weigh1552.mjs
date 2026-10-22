// Round 1552, never committed: the two touched routes by sweepWeight's method (iPhone 13, load plus 1.5 s,
// every /assets/*.js the page asked for, gzipped from the build that served it), base build on 4174
// (BASE_DIST) against head build on 4173 (dist). The database host is blocked.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const ROUTES = ['/sports-millionaire', '/face-off'];
const BASE_DIR = process.env.BASE_DIST || '/tmp/wb/dist';
const SIDES = { base: ['http://localhost:4174', BASE_DIR], head: ['http://localhost:4173', 'dist'] };
const gz = file => zlib.gzipSync(fs.readFileSync(file)).length;
const browser = await chromium.launch();
const got = {};
const names = {};
for (const [side, [origin, dir]] of Object.entries(SIDES)) {
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await ctx.route(/supabase\.co/, r => r.abort());
    await ctx.route(/googlesyndication|doubleclick|googletagmanager|google-analytics/, r => r.abort());
    const page = await ctx.newPage();
    const files = new Set();
    page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
    await page.goto(`${origin}${route}`, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
    let total = 0;
    for (const f of files) total += gz(path.join(dir, 'assets', f));
    got[`${side}${route}`] = total;
    names[`${side}${route}`] = [...files].filter(f => /Millionaire|FaceOff|trivia|clearWinner/i.test(f)).map(f => `${f} ${(gz(path.join(dir, 'assets', f)) / 1024).toFixed(1)}K`);
    await ctx.close();
  }
}
await browser.close();
console.log('The touched routes, base against head (gzipped JS):');
for (const route of ROUTES) {
  const b = got[`base${route}`], h = got[`head${route}`];
  console.log(`  ${route.padEnd(22)} base ${(b / 1024).toFixed(1)}K (${b} B)  head ${(h / 1024).toFixed(1)}K (${h} B)  ${h - b >= 0 ? '+' : ''}${h - b} B`);
  console.log(`     base chunks: ${names[`base${route}`].join(', ')}`);
  console.log(`     head chunks: ${names[`head${route}`].join(', ')}`);
}
console.log('weigh1552: done');
