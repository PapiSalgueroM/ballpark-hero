/* Round 1107, scratch (never committed): a route's first download, measured
   the way scripts/sweepWeight.mjs measures (iPhone 13, every /assets/*.js the
   page requests, summed gzipped), with supabase.co blocked, printed to one
   decimal. Unlike weight.mjs it takes the tree whose dist/ it serves, so the
   same command measures a build of the base and a build of the head.
     node weight2.mjs <tree that holds dist/> <port> <route> [route...]
   Run from the repo root (it borrows scripts/lib from the cwd). */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const HERE = process.cwd();
const pw = (await import(pathToFileURL(path.join(HERE, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium, devices } = pw;
const TREE = path.resolve(process.argv[2]);
const PORT = Number(process.argv[3] || 4391);
const ROUTES = process.argv.slice(4);
const DIST = path.join(TREE, 'dist');
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error(`no build in ${DIST}`); process.exit(1); }
const server = spawn(process.execPath, [path.join(HERE, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
let code = 0;
try {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    let blocked = 0;
    await ctx.route('**://*.supabase.co/**', r => { blocked += 1; return r.abort(); });
    const page = await ctx.newPage();
    const files = new Set();
    page.on('request', req => {
      const m = req.url().match(/\/assets\/([^?]+\.js)$/);
      if (m) files.add(m[1]);
    });
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500);
    let total = 0;
    for (const f of files) total += zlib.gzipSync(fs.readFileSync(path.join(DIST, 'assets', f))).length;
    console.log(`${route} ${(total / 1024).toFixed(1)}K gz over ${files.size} files (${total} bytes), supabase requests blocked: ${blocked}`);
    await ctx.close();
  }
  await browser.close();
} catch (e) {
  console.error('FAILED', String(e).split('\n')[0]);
  code = 1;
} finally {
  server.kill();
}
process.exit(code);
