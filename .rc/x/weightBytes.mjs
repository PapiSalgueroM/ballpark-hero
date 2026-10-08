/* Round 1046 probe (never committed): sweepWeight's own measurement, printed in exact bytes.
   Run from the repo root with dist served on BASE. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium, devices } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const gz = f => { try { return zlib.gzipSync(fs.readFileSync(f)).length; } catch { return 0; } };

const browser = await chromium.launch();
for (const route of ['/soccer-career', '/club-manager']) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  let total = 0;
  for (const f of files) total += gz(path.join(ROOT, 'dist/assets', f));
  console.log(`${route} total=${total} bytes (${(total / 1024).toFixed(2)}K, rounds to ${Math.round(total / 1024)}K) over ${files.size} files`);
  await ctx.close();
}
await browser.close();
const names = fs.readdirSync(path.join(ROOT, 'dist/assets'));
for (const want of ['SoccerSeasonCentre', 'MiniPitch', 'LiveSimMotion', 'LiveSimScreen', 'SeasonPicker', 'PitchMotion', 'SoccerCareer']) {
  for (const n of names.filter(x => x.startsWith(want) && /\.(js|css)$/.test(x))) console.log(`chunk ${n} gz=${gz(path.join(ROOT, 'dist/assets', n))} bytes`);
}
console.log('weightBytes done');
