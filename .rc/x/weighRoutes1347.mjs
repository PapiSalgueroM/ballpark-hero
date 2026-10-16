// Round 1347 weight probe (never committed): the three engine routes on two builds, measured the way
// scripts/sweepWeight.mjs section 1 measures a row (iPhone 13, every /assets/*.js the page asks for until load
// plus 1.5 seconds, gzipped), and again once the page has drawn and gone quiet. Supabase is blocked.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import pw from 'playwright';
const [A, B] = process.argv.slice(2);
const ROUTES = ['/club-manager', '/manager-hot-seat', '/deadline-day'];
const servers = [[A, 4501], [B, 4502]].map(([dir, port]) => spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', dir, String(port)], { stdio: 'ignore' }));
await new Promise(r => setTimeout(r, 1500));
const gz = (dir, f) => { try { return zlib.gzipSync(fs.readFileSync(path.join(dir, 'assets', f))).length; } catch { return 0; } };
const browser = await pw.chromium.launch();
const lines = [];
async function weigh(dir, port, route) {
  const ctx = await browser.newContext({ ...pw.devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1500);
  const window = [...files];
  await page.waitForFunction(() => (document.getElementById('root')?.innerText ?? '').length > 200, null, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const all = [...files];
  await ctx.close();
  const sum = list => list.reduce((s, f) => s + gz(dir, f), 0) / 1024;
  return { window: sum(window), drawn: sum(all), n: window.length, nAll: all.length };
}
for (const route of ROUTES) {
  const a = await weigh(A, 4501, route);
  const b = await weigh(B, 4502, route);
  lines.push(`${route}: in the row's window ${a.window.toFixed(2)}K (${a.n} files) -> ${b.window.toFixed(2)}K (${b.n} files), growth ${(b.window - a.window).toFixed(2)}K; drawn ${a.drawn.toFixed(2)}K (${a.nAll}) -> ${b.drawn.toFixed(2)}K (${b.nAll}), growth ${(b.drawn - a.drawn).toFixed(2)}K`);
}
await browser.close();
for (const s of servers) s.kill();
console.log(lines.join('\n'));
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weighRoutes1347.txt'), `${lines.join('\n')}\n`);
