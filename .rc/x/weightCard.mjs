// Round 1562 weight probe (sent to a runner as .rc/x/weightCard.mjs): /front-office and /nba-front-office, every JavaScript
// and CSS file the page load fetches, gzipped, with the database and ad hosts blocked; then, read off the build's own
// files, every asset that carries the season card (the string data-stats-leaders) and the site's CSS.
// Usage: BASE=http://localhost:4173 DIST=dist LABEL=head node .rc/x/weightCard.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const DIST = process.env.DIST || 'dist';
const LABEL = process.env.LABEL || 'build';
const k = n => (n / 1024).toFixed(2);
const out = [];
const browser = await chromium.launch();
for (const route of ['/front-office', '/nba-front-office']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(/googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
  const seen = new Map();
  page.on('response', async r => {
    const url = r.url();
    if (!/\.(js|css)(\?|$)/.test(url) || seen.has(url)) return;
    seen.set(url, null);
    try { const body = await r.body(); seen.set(url, { file: path.basename(url.split('?')[0]), gz: zlib.gzipSync(body).length }); } catch { /* aborted */ }
  });
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await ctx.close();
  const rows = [...seen.values()].filter(Boolean);
  const js = rows.filter(r => r.file.endsWith('.js')).reduce((a, r) => a + r.gz, 0);
  const css = rows.filter(r => r.file.endsWith('.css')).reduce((a, r) => a + r.gz, 0);
  out.push(`weightCard ${LABEL}: ${route} load ${k(js + css)}K gz (js ${k(js)}K, css ${k(css)}K) over ${rows.length} files`);
}
await browser.close();
const assets = path.join(DIST, 'assets');
for (const f of fs.readdirSync(assets).sort()) {
  const body = fs.readFileSync(path.join(assets, f));
  const carries = f.endsWith('.js') && body.includes('data-stats-leaders');
  if (carries || f.endsWith('.css')) out.push(`weightCard ${LABEL}: ${carries ? 'card chunk' : 'css'} ${f.replace(/-[A-Za-z0-9_-]{8}\./, '.')} ${k(zlib.gzipSync(body).length)}K gz (${k(body.length)}K raw)`);
}
console.log(out.join('\n'));
