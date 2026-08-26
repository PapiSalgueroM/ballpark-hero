/**
 * Round 284: serve dist/ the way the host does.
 *
 * The browser harnesses used to be served by `npx serve -s dist`, and the
 * `-s` in that command does not mean what the runner needed it to mean. In
 * serve-handler 6.1.7 a single page rewrite is applied BEFORE the filesystem
 * is consulted for any extension-less path, so /about answered with
 * index.html even though dist/about/index.html was sitting right there.
 * Every prerendered route looked like the fallback, which made
 * playSoftFourOhFour section 4 report that the 404 marker had fired on real
 * pages. It had not; the server had never handed the browser a real page.
 *
 * The live host does the opposite, and it was measured that way on
 * 2026-08-21: an address with its own document gets that document, and only
 * an address with nothing behind it gets index.html with a 200. That is the
 * behaviour the snapshots, the boot script, the 404 marker and every
 * harness in the browser group are written against, so this is what they
 * are served from now.
 *
 *   node scripts/lib/hostLikeServer.mjs <dir> <port>
 */
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(process.argv[2] || 'dist');
const PORT = Number(process.argv[3] || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.webmanifest': 'application/json', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.map': 'application/json',
};
const isFile = f => { try { return statSync(f).isFile(); } catch { return false; } };

const server = createServer((req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]);
  /* never escape the directory */
  const rel = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  const candidates = [
    path.join(DIR, rel),
    path.join(DIR, rel, 'index.html'),
  ];
  let file = candidates.find(isFile);
  let status = 200;
  if (!file) {
    /* the SPA fallback, with a 200, exactly as the host answers */
    file = path.join(DIR, 'index.html');
  }
  let body;
  try { body = readFileSync(file); } catch { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(status, {
    'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(body);
});
server.listen(PORT, () => console.log(`host-like server: ${DIR} on http://127.0.0.1:${PORT}`));
