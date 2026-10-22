/* Round 1540, decision 13: the gzipped JavaScript /nba-front-office requests on load (sweepWeight's way: every .js
   the page asks for, each dist file gzipped at the default level), its chunk list, and the lazy lottery card chunk
   apart. Usage: node weight.mjs <base url> <dist dir> <label>. Prints one summary line and the chunk list. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from 'playwright';

const [base, dist, label] = process.argv.slice(2);
const gz = f => zlib.gzipSync(fs.readFileSync(path.join(dist, 'assets', f))).length;
const browser = await chromium.launch();
const runs = [];
for (let i = 0; i < 2; i += 1) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const files = new Set();
  page.on('request', req => { const m = /\/assets\/([^/?#]+\.js)/.exec(req.url()); if (m) files.add(m[1]); });
  await page.goto(`${base}/nba-front-office`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  runs.push([...files].sort());
  await ctx.close();
}
await browser.close();
const files = runs[0];
const rows = files.map(f => ({ f, k: gz(f) / 1024 })).sort((a, b) => b.k - a.k);
const total = rows.reduce((a, r) => a + r.k, 0);
const lazy = fs.readdirSync(path.join(dist, 'assets')).filter(f => /^GmLotteryCard/.test(f) && f.endsWith('.js'));
const board = rows.filter(r => /NbaFrontOffice/i.test(r.f));
console.log(`WEIGHT ${label}: /nba-front-office ${total.toFixed(1)}K gzipped in ${files.length} files (second load ${runs[1].length} files${runs[1].join() === files.join() ? ', the same list' : ', A DIFFERENT LIST'})`);
console.log(`WEIGHT ${label}: board chunk(s) ${board.map(r => `${r.f} ${r.k.toFixed(1)}K`).join(', ') || 'none named NbaFrontOffice'}`);
console.log(`WEIGHT ${label}: lazy card chunk(s) ${lazy.map(f => `${f} ${(gz(f) / 1024).toFixed(1)}K`).join(', ') || 'none'} (not in the load list: ${lazy.every(f => !files.includes(f))})`);
for (const r of rows) console.log(`  ${label} ${r.k.toFixed(1)}K ${r.f}`);
