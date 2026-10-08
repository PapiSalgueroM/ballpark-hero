// Round 1138, UNCOMMITTED measurement: gzipped JavaScript a phone downloads for a route, the way
// scripts/sweepWeight.mjs measures it (every /assets/*.js the page requests, gzipped, summed), for routes that
// harness holds no budget for. Usage: node .rc/x/weight.mjs <label>=<dist dir> [<label>=<dist dir> ...]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from 'playwright';

const { chromium, devices } = pw;
const ROOT = process.cwd();
const ROUTES = ['/build-your-xi', '/mlb-grid', '/soccer-grid', '/football-connect-4', '/missing-xi'];
const PORT = 4242;
const BASE = `http://127.0.0.1:${PORT}`;
const builds = process.argv.slice(2).map(arg => { const [label, dir] = arg.split('='); return { label, dir: path.resolve(ROOT, dir) }; });
const browser = await chromium.launch();
const table = {};
try {
  for (const build of builds) {
    if (!fs.existsSync(path.join(build.dir, 'index.html'))) { console.log(`WEIGHT ${build.label}: no build at ${build.dir}`); continue; }
    const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), build.dir, String(PORT)], { stdio: 'ignore' });
    let up = false;
    for (let i = 0; i < 50 && !up; i++) {
      up = await fetch(`${BASE}/`).then(r => r.ok).catch(() => false);
      if (!up) await new Promise(r => setTimeout(r, 200));
    }
    try {
      for (const route of ROUTES) {
        const ctx = await browser.newContext({ ...devices['iPhone 13'] });
        const page = await ctx.newPage();
        const files = new Set();
        page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
        await page.route('**/*', r => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
        await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
        await page.waitForTimeout(1500);
        let total = 0;
        for (const f of files) total += zlib.gzipSync(fs.readFileSync(path.join(build.dir, 'assets', f))).length;
        (table[route] ||= {})[build.label] = { bytes: total, files: files.size };
        console.log(`WEIGHT ${build.label} ${route} ${(total / 1024).toFixed(1)}K gz over ${files.size} files`);
        await ctx.close();
      }
    } finally {
      server.kill();
      await new Promise(r => setTimeout(r, 500));
    }
  }
} finally {
  await browser.close();
}
if (builds.length === 2) {
  const [a, b] = builds.map(x => x.label);
  for (const route of ROUTES) {
    const row = table[route] || {};
    if (row[a] && row[b]) console.log(`WEIGHT_DELTA ${route} ${a} ${(row[a].bytes / 1024).toFixed(1)}K -> ${b} ${(row[b].bytes / 1024).toFixed(1)}K (${row[b].bytes - row[a].bytes >= 0 ? '+' : ''}${row[b].bytes - row[a].bytes} bytes)`);
  }
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weight.json'), JSON.stringify(table, null, 2));
console.log('weight: measured.');
