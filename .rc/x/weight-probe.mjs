/* Round 1147 scratch probe (never committed): what a route downloads, file by file, measured the
   way scripts/sweepWeight.mjs section 1 measures it (load plus 1.5 seconds, gzipped JavaScript).
   Run from a repo root with a served build:
     BASE=http://localhost:4173 DIST=dist TAG=head node .rc/x/weight-probe.mjs
   Prints "stem gz raw" per file (the hash cut off the name) and writes $RC_OUT/weight-<TAG>.json. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const loader = pathToFileURL(path.join(process.env.PW_ROOT ?? ROOT, 'scripts/lib/playwrightLoader.mjs')).href;
const pw = (await import(loader)).default;
const { chromium, devices } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const DIST = path.resolve(process.env.DIST ?? 'dist');
const TAG = process.env.TAG ?? 'head';
const ROUTES = (process.env.ROUTES ?? '/nfl-my-career,/nba-my-career').split(',');
const RUNS = Number(process.env.RUNS ?? 3);

const gz = f => zlib.gzipSync(fs.readFileSync(path.join(DIST, 'assets', f))).length;
const raw = f => fs.statSync(path.join(DIST, 'assets', f)).size;
/* 'usSeasonLengths-BxY12_ab.js' to 'usSeasonLengths' (the hash is the last dash part) */
const stem = f => f.replace(/\.js$/, '').replace(/-[A-Za-z0-9_-]{8}$/, '');

const browser = await chromium.launch();
const out = {};
for (const route of ROUTES) {
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) {
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
    runs.push([...files].sort());
    await ctx.close();
  }
  const files = runs[0];
  const same = runs.every(r => r.join('|') === files.join('|'));
  const rows = files.map(f => ({ stem: stem(f), file: f, gz: gz(f), raw: raw(f) })).sort((a, b) => b.gz - a.gz);
  const total = rows.reduce((n, r) => n + r.gz, 0);
  out[route] = { total, k: (total / 1024).toFixed(2), files: rows.length, same, rows };
  console.log(`${TAG} ${route}: ${total} bytes gz, ${(total / 1024).toFixed(2)}K over ${rows.length} files, ${RUNS} runs ${same ? 'the same list' : 'DIFFERENT LISTS: ' + runs.map(r => r.length).join(',')}`);
  for (const r of rows) console.log(`  ${String(r.gz).padStart(7)} gz ${String(r.raw).padStart(8)} raw  ${r.stem}  (${r.file})`);
}
await browser.close();

/* the small files, shown, so a new chunk says what it holds */
const SHOW = (process.env.SHOW ?? 'usSeasonLengths,NflMyCareer,NflMyCareerBoard,nflCareerSport').split(',');
for (const f of fs.readdirSync(path.join(DIST, 'assets')).filter(x => x.endsWith('.js'))) {
  if (!SHOW.includes(stem(f))) continue;
  const text = fs.readFileSync(path.join(DIST, 'assets', f), 'utf-8');
  console.log(`--- ${f}: ${text.length} chars, ${gz(f)} gz`);
  console.log(text.length > 2600 ? text.slice(0, 1300) + '\n ... \n' + text.slice(-1300) : text);
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `weight-${TAG}.json`), JSON.stringify(out, null, 1));
