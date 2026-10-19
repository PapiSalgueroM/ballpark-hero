// Round 1513 fixer, runner only, never committed: which scripts /club-manager asks for on each side (base on 4174,
// head on 4173), gzipped, by name with the hash cut off, and the moves. Same method as weight1513.mjs.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const BASE_DIR = process.env.BASE_DIST || '/tmp/wt-4174/dist';
const SIDES = { base: ['http://localhost:4174', BASE_DIR], head: [process.env.HEAD_ORIGIN || 'http://localhost:4173', process.env.HEAD_DIST || 'dist'] };
const ROUTE = process.env.ROUTE || '/club-manager';
const gz = file => zlib.gzipSync(fs.readFileSync(file)).length;
const stem = name => name.replace(/-[A-Za-z0-9_]{6,}\.js$/, '.js');
const browser = await chromium.launch();
const got = {};
for (const [side, [origin, dir]] of Object.entries(SIDES)) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const urls = new Set();
  page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/assets/') && u.pathname.endsWith('.js')) urls.add(u.pathname); });
  await page.goto(origin + ROUTE, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const parts = {};
  for (const u of urls) {
    const name = path.basename(u);
    const key = stem(name);
    parts[key] = (parts[key] || 0) + gz(path.join(dir, u));
  }
  got[side] = parts;
  await ctx.close();
}
await browser.close();
const keys = [...new Set([...Object.keys(got.base), ...Object.keys(got.head)])].sort();
let tb = 0; let th = 0;
for (const k of keys) {
  const b = got.base[k] || 0; const h = got.head[k] || 0;
  tb += b; th += h;
  if (b !== h) console.log(`  ${k.padEnd(48)} base ${b}  head ${h}  ${h - b >= 0 ? '+' : ''}${h - b}`);
}
console.log(`weightParts1513: ${ROUTE} ${keys.length} scripts, base ${tb} B, head ${th} B, ${th - tb >= 0 ? '+' : ''}${th - tb} B`);
