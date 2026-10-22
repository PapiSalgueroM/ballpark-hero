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
import assert from 'node:assert/strict';
import { appendFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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

const ARM = process.env.MATRIX_ARM;
const CSS_PATH = process.env.MATRIX_CSS_PATH;
const GREEN_SHA = process.env.MATRIX_GREEN_CSS_SHA256;
const OLD_SHA = 'f3a73714c7f08ea22bf18e1d6264b86f241e9a836e3b02ba58625e1359837bff';
const OLD_FILE = path.resolve(process.env.MATRIX_OLD_CSS_FILE || '');
const LOG = path.resolve(process.env.MATRIX_SERVER_LOG || '');
const hash = body => createHash('sha256').update(body).digest('hex');
assert(['green', 'old', 'restored'].includes(ARM), 'MATRIX_SERVER_BINDING');
assert.match(CSS_PATH || '', /^\/assets\/[A-Za-z0-9_-]+\.css$/, 'MATRIX_SERVER_BINDING');
assert.match(GREEN_SHA || '', /^[a-f0-9]{64}$/, 'MATRIX_SERVER_BINDING');
assert(process.env.MATRIX_SERVER_LOG && process.env.MATRIX_OLD_CSS_FILE, 'MATRIX_SERVER_BINDING');
const GREEN_FILE = path.resolve(DIR, '.' + CSS_PATH);
assert(GREEN_FILE.startsWith(DIR + path.sep), 'MATRIX_SERVER_BINDING');
const oldBody = readFileSync(OLD_FILE), greenBody = readFileSync(GREEN_FILE);
assert.equal(hash(oldBody), OLD_SHA, 'MATRIX_SERVER_OLD_BODY');
assert.equal(hash(greenBody), GREEN_SHA, 'MATRIX_SERVER_GREEN_BODY');
assert.notEqual(OLD_SHA, GREEN_SHA, 'MATRIX_SERVER_CHANGED_BODY');
function verifyCssRead(shape) {
  assert(['GET', 'HEAD'].includes(shape.method) && shape.pathname === CSS_PATH
    && shape.rawURL === CSS_PATH && shape.file === GREEN_FILE && shape.sha256 === GREEN_SHA, 'MATRIX_CSS_REQUEST');
}
const base = { method: 'GET', pathname: CSS_PATH, rawURL: CSS_PATH, file: GREEN_FILE, sha256: GREEN_SHA };
verifyCssRead(base);
const controls = [];
for (const [name, change] of [
  ['method', { method: 'POST' }], ['path', { pathname: '/assets/unlisted.css' }],
  ['query', { rawURL: CSS_PATH + '?control=1' }], ['file', { file: GREEN_FILE + '.control' }],
  ['green-body', { sha256: '0'.repeat(64) }],
]) {
  const changed = { ...base, ...change };
  assert.notEqual(hash(JSON.stringify(base)), hash(JSON.stringify(changed)));
  let caught; try { verifyCssRead(changed); } catch (error) { caught = error; }
  assert(caught?.name === 'AssertionError' && caught.message.startsWith('MATRIX_CSS_REQUEST'));
  controls.push({ name, beforeSha256: hash(JSON.stringify(base)), afterSha256: hash(JSON.stringify(changed)), error: { name: caught.name, message: caught.message }, rejected: true, networkAttempted: false });
}
writeFileSync(LOG + '.controls.json', JSON.stringify({ complete: true, arm: ARM, controls, oldSha256: OLD_SHA, greenSha256: GREEN_SHA }, null, 2) + '\n');
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
  let override = false;
  if (p === CSS_PATH) {
    verifyCssRead({ method: req.method, pathname: p, rawURL: req.url, file: path.resolve(file), sha256: hash(body) });
    if (ARM === 'old') { body = oldBody; override = true; }
  }
  appendFileSync(LOG, JSON.stringify({ arm: ARM, method: req.method, path: p, rawURL: req.url, status,
    sourceFile: path.relative(DIR, file), bytes: body.length, sha256: hash(body), cssTarget: p === CSS_PATH,
    overridden: override, greenSha256: GREEN_SHA, oldSha256: OLD_SHA }) + '\n');
  res.writeHead(status, {
    'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(body);
});
server.listen(PORT, () => console.log(`host-like server: ${DIR} on http://127.0.0.1:${PORT}`));
