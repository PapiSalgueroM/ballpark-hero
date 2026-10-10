/* Round 1210, second fix pass. A probe, never committed: sent to a runner as .rc/x/footleFiles.mjs.
   It opens one route the way section 1 of scripts/sweepWeight.mjs does (an iPhone 13, the database host
   blocked, every JavaScript file asked for inside load plus 1.5 seconds) and prints each file with its
   gzipped size, so two builds can be compared file by file instead of by one total.
   Usage: node .rc/x/footleFiles.mjs <label> [route]      writes $RC_OUT/<label>.txt as well */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const label = process.argv[2];
const route = process.argv[3] ?? '/footle';
if (!label) { console.error('usage: footleFiles.mjs <label> [route]'); process.exit(2); }
const ROOT = process.cwd();
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
await ctx.route(/supabase\.co/, r => r.abort());
const page = await ctx.newPage();
const files = new Set();
page.on('request', req => {
  const m = req.url().match(/\/assets\/([^?]+\.js)$/);
  if (m) files.add(m[1]);
});
await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
await page.waitForTimeout(1500);
const inWindow = [...files].sort();
/* What the page asks for afterwards is printed apart, so a file that only just missed the window shows. */
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
const late = [...files].filter(f => !inWindow.includes(f)).sort();
const drawn = await page.evaluate(() => (document.getElementById('root')?.innerText ?? '').length);
await browser.close();

const gz = f => zlib.gzipSync(fs.readFileSync(path.join(ROOT, 'dist/assets', f))).length;
const lines = [];
let total = 0;
for (const f of inWindow) { const n = gz(f); total += n; lines.push(`${f} ${n}`); }
const out = [
  `# ${label} ${route}: ${inWindow.length} files, ${total} bytes gzipped, ${(total / 1024).toFixed(1)}K, rounds to ${Math.round(total / 1024)}K; the page drew ${drawn} characters`,
  ...lines,
  ...late.map(f => `late ${f} ${gz(f)}`),
].join('\n') + '\n';
if (inWindow.length < 20) { console.error(out); console.error(`footleFiles: only ${inWindow.length} files, the page did not load`); process.exit(2); }
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `${label}.txt`), out);
fs.writeFileSync(`/tmp/${label}.txt`, out);
console.log(out.split('\n')[0].slice(2));
console.log(`footleFiles: ${label} written, ${inWindow.length} files in the window and ${late.length} after it`);
