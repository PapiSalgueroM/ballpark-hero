/* Release AP closing fix, a probe that is never committed.
   What /stadium-tycoon asks for inside sweepWeight's own window (load plus 1.5 seconds, an
   iPhone 13 context, the database host blocked), to the byte, on any built tree.
   Run from the repo root:  node .rc/x/fx3-weigh.mjs <label> <base url> <dist folder>
   Three visits, because a busy runner can close the window early and say less. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const [label, base, dist] = process.argv.slice(2);
if (!label || !base || !dist) { console.error('usage: fx3-weigh.mjs <label> <base> <dist>'); process.exit(2); }
const pw = (await import(pathToFileURL(path.join(process.cwd(), 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium, devices } = pw;
const ROUTE = '/stadium-tycoon';
const gz = f => zlib.gzipSync(fs.readFileSync(path.join(dist, 'assets', f))).length;
const bare = f => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');

const browser = await chromium.launch();
const visits = [];
for (let i = 0; i < 3; i += 1) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => {
    const m = req.url().match(/\/assets\/([^?]+\.js)$/);
    if (m) files.add(m[1]);
  });
  await page.goto(`${base}${ROUTE}`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  const weighed = [...files].sort();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const late = [...files].filter(f => !weighed.includes(f)).sort();
  const text = await page.evaluate(() => (document.getElementById('root')?.innerText ?? '').length);
  visits.push({ weighed, late, text });
  await ctx.close();
}
await browser.close();

const rows = visits.map(v => {
  const bytes = v.weighed.reduce((n, f) => n + gz(f), 0);
  return { bytes, k: (bytes / 1024).toFixed(2), rounded: Math.round(bytes / 1024), files: v.weighed.length, late: v.late, text: v.text };
});
const sizes = Object.fromEntries(visits[0].weighed.map(f => [bare(f), gz(f)]));
/* The page's own chunk, found by what it holds rather than by its name. */
const holders = fs.readdirSync(path.join(dist, 'assets')).filter(f => f.endsWith('.js')).filter(f => {
  const s = fs.readFileSync(path.join(dist, 'assets', f), 'utf-8');
  return s.includes('Review this visit') || s.includes('data-club-name-pick');
}).map(f => ({ file: f, gz: gz(f), raw: fs.statSync(path.join(dist, 'assets', f)).size, review: fs.readFileSync(path.join(dist, 'assets', f), 'utf-8').includes('Review this visit'), weighed: visits[0].weighed.includes(f) }));

for (const r of rows) console.log(`${label}: ${r.bytes} bytes, ${r.k}K, sweep would print ${r.rounded}K over ${r.files} files; late ${r.late.length}${r.late.length ? ' (' + r.late.map(bare).join(', ') + ')' : ''}; page text ${r.text}`);
for (const h of holders) console.log(`${label}: chunk ${h.file} gz ${h.gz} raw ${h.raw} holds the review ${h.review} inside the window ${h.weighed}`);
const out = process.env.RC_OUT;
if (out) fs.writeFileSync(path.join(out, `weigh-${label}.json`), JSON.stringify({ label, rows, sizes, holders }, null, 1));
const same = rows.every(r => r.bytes === rows[0].bytes);
console.log(`${label}: three visits ${same ? 'agree' : 'DISAGREE'}; ${rows[0].bytes} bytes = ${rows[0].k}K`);
process.exit(same ? 0 : 3);
