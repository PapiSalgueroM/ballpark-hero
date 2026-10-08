/* Round 1046 probe (never committed): every JS file /soccer-career requests on load, with its gzipped size. */
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
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
await page.route(/supabase/, r => r.abort());
const files = new Set();
page.on('request', req => { const m = req.url().match(/assets.([^?]+[.]js)$/); if (m) files.add(m[1]); });
await page.goto(BASE + '/soccer-career', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2500);
let total = 0;
const rows = [...files].map(f => [f.replace(/-[A-Za-z0-9_-]{8}[.]js$/, ''), gz(path.join(ROOT, 'dist/assets', f))]).sort((a, b) => a[0] < b[0] ? -1 : 1);
for (const [n, s] of rows) { total += s; console.log('file ' + n + ' ' + s); }
console.log(process.env.TAG + ' total=' + total + ' files=' + files.size);
await browser.close();
