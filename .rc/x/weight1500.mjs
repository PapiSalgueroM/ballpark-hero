// Round 1500, never committed (weight1334.mjs is the model): the four US My Career routes by sweepWeight's own
// method (iPhone 13, load plus 1.5 s, every /assets/*.js asked for, gzipped from the build that served it), on the
// base build (dist-base on 4174) and the head build (dist on 4173); then the desk's lazy chunk, found by a string
// only it holds, and whether a first load fetches it (it must not: it loads when Deal with it is pressed).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from './lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const ROUTES = ['/nba-my-career', '/nfl-my-career', '/mlb-my-career', '/nhl-my-career'];
const SIDES = { base: ['http://localhost:4174', 'dist-base'], head: ['http://localhost:4173', 'dist'] };
const gz = file => zlib.gzipSync(fs.readFileSync(file)).length;
const browser = await chromium.launch();
const got = {};
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
    for (const f of files) total += gz(path.join(dir, 'assets', f));
    got[`${side}${route}`] = { bytes: total, files: [...files] };
    await ctx.close();
  }
}
await browser.close();
console.log('the four US My Career routes, base against head (gzipped JS on a first load):');
for (const route of ROUTES) {
  const b = got[`base${route}`].bytes, h = got[`head${route}`].bytes;
  console.log(`  ${route.padEnd(16)} base ${(b / 1024).toFixed(1)}K (${b} B)  head ${(h / 1024).toFixed(1)}K (${h} B)  ${h - b >= 0 ? '+' : ''}${h - b} B`);
}
const assets = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js'));
const desk = assets.filter(f => fs.readFileSync(path.join('dist/assets', f), 'utf8').includes('Every way shows exactly what it does'));
const rule = assets.filter(f => fs.readFileSync(path.join('dist/assets', f), 'utf8').includes('Nothing in the Shady aisle can move it now'));
console.log(`  the desk chunk: ${desk.map(f => `${f} ${gz(path.join('dist/assets', f))} B gz`).join(', ') || 'not found'}`);
console.log(`  the rule (careerDirtyMoney) sits in: ${rule.map(f => `${f} ${gz(path.join('dist/assets', f))} B gz`).join(', ') || 'not found'}`);
for (const route of ROUTES) {
  const first = got[`head${route}`].files;
  console.log(`  ${route}: first load fetches the desk chunk: ${desk.some(f => first.includes(f)) ? 'YES (wrong)' : 'no'}`);
}
