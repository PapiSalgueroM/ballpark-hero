// Round 1549 probe: gzipped JavaScript each touched route makes a phone download, from one built dist.
// node weigh.mjs <distDir> [port]
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from 'playwright';

const DIST = path.resolve(process.argv[2] || 'dist');
const PORT = Number(process.argv[3] || 4471);
const ROUTES = ['/nfl-higher-lower', '/nba-higher-lower', '/f1-higher-lower', '/tennis-higher-lower', '/hockey-higher-lower', '/face-off', '/whats-new'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const isFile = (f) => { try { return fs.statSync(f).isFile(); } catch { return false; } };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, p);
  if (!isFile(f)) f = path.join(DIST, p, 'index.html');
  if (!isFile(f)) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const browser = await pw.chromium.launch();
const gz = (rel) => { const f = path.join(DIST, rel); return isFile(f) ? zlib.gzipSync(fs.readFileSync(f)).length : 0; };
const out = [];
for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route(/supabase\.co|googletagmanager|googlesyndication|google-analytics|fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
  const js = new Set();
  page.on('request', (r) => { const u = new URL(r.url()); if (u.port === String(PORT) && u.pathname.endsWith('.js')) js.add(u.pathname); });
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const bytes = [...js].reduce((a, p) => a + gz(p), 0);
  out.push(`${route} ${(bytes / 1024).toFixed(1)}K gzipped JS in ${js.size} files`);
  await ctx.close();
}
await browser.close();
server.close();
console.log(out.join('\n'));
