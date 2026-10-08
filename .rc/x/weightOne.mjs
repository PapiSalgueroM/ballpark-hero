// Reviewer probe, never committed: exact gzipped JavaScript the /stadium-tycoon page requests,
// measured the way scripts/sweepWeight.mjs measures (iPhone 13, load, 1.5 s), with bytes instead of rounded K.
// usage: node weightOne.mjs <base url> <tree root> <label>
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const [base, rootArg, label] = process.argv.slice(2);
const root = path.resolve(rootArg);
const pw = (await import(pathToFileURL(path.join(root, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium, devices } = pw;
const browser = await chromium.launch();
const out = { label, routes: {} };
for (const route of ['/stadium-tycoon']) {
  const runs = [];
  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    const files = new Set();
    page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
    await page.goto(base + route, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
    const rows = [...files].map(f => ({ f, gz: zlib.gzipSync(fs.readFileSync(path.join(root, 'dist/assets', f))).length }));
    const total = rows.reduce((s, r) => s + r.gz, 0);
    runs.push({ files: rows.length, bytes: total, kb: Math.round(total / 1024), rows });
    await ctx.close();
  }
  const r = runs[0];
  const names = r.rows.map(x => ({ name: x.f.replace(/-[A-Za-z0-9_-]{8}\.js$/, ''), gz: x.gz })).sort((a, b) => b.gz - a.gz);
  out.routes[route] = { bytes: r.bytes, kb: r.kb, files: r.files, secondRunBytes: runs[1].bytes, chunks: names };
  console.log(`WEIGHT ${label} ${route} bytes=${r.bytes} kb=${r.kb} files=${r.files} second=${runs[1].bytes}`);
}
await browser.close();
if (process.env.RC_OUT) { fs.mkdirSync(process.env.RC_OUT, { recursive: true }); fs.writeFileSync(path.join(process.env.RC_OUT, `weight-${label}.json`), JSON.stringify(out, null, 1)); }
