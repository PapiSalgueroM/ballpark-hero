import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from './playwrightLoader.mjs';
import { build } from 'esbuild';

const exec = promisify(execFile);
const memo = new Map();
const waiting = [];
let active = 0;

export async function soccerCareerReplaySave() {
  const bundle = await build({ stdin: { resolveDir: process.cwd(), contents:
    "export { initCareer, FALLBACK_CLUBS } from './src/lib/soccerCareerEngine'; export { serializeSoccerCareerSave } from './src/lib/soccerCareerSave';" },
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
  const { initCareer, FALLBACK_CLUBS, serializeSoccerCareerSave } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const attrs = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };
  return serializeSoccerCareerSave(initCareer('Career Reader', 'England', 'ST', '2020s', attrs, 62, 2020, FALLBACK_CLUBS, null), 1);
}

// A browser request that misses interception reaches a closed local socket.
export async function guardedAdBrowser() {
  const proxy = createServer(socket => socket.destroy());
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  try {
    const browser = await chromium.launch({ proxy: { server: 'http://127.0.0.1:' + proxy.address().port },
      args: ['--disable-quic', '--disable-background-networking', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'] });
    return { browser, async close() { try { await browser.close(); } finally { await new Promise(resolve => proxy.close(resolve)); } } };
  } catch (error) { proxy.close(); throw error; }
}

export function isSiteAsset(url) {
  return !url.search && /^\/(?:assets\/[\w./-]+\.(?:js|css|woff2?|png|svg|webp|jpe?g|json)|home-art\/pitch-(?:small|wide)\.webp|(?:favicon|apple-touch-icon)[\w.-]*\.(?:png|svg|ico))$/i.test(url.pathname);
}

// Callers allowlist the exact document or asset first. No cookies, referrer,
// body, redirects or browser request headers are forwarded.
export async function staticReply(target) {
  if (!memo.has(target)) memo.set(target, (async () => {
    if (active >= 8) await new Promise(resolve => waiting.push(resolve));
    else active++;
    try { return await getStatic(target); }
    finally { if (waiting.length) waiting.shift()(); else active--; }
  })());
  try { return await memo.get(target); } catch (error) { memo.delete(target); throw error; }
}

async function getStatic(target) {
  let response;
  try {
    response = await fetch(target, { credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(12000) });
  } catch {
    const { stdout } = await exec(process.platform === 'win32' ? 'curl.exe' : 'curl',
      ['--silent', '--show-error', '--fail', '--include', '--compressed', '--connect-timeout', '6', '--max-time', '20', target],
      { encoding: 'buffer', maxBuffer: 12_000_000 });
    let bytes = stdout, split = bytes.indexOf('\r\n\r\n'), headers = bytes.subarray(0, split).toString();
    if (/^HTTP\/\S+ 200 Connection established/i.test(headers)) {
      bytes = bytes.subarray(split + 4); split = bytes.indexOf('\r\n\r\n'); headers = bytes.subarray(0, split).toString();
    }
    assert(split >= 0 && /^HTTP\/\S+ 200\b/.test(headers), 'Static GET failed');
    return { status: 200, contentType: headers.match(/^content-type:\s*([^\r\n]+)/im)?.[1] ?? 'application/octet-stream', body: bytes.subarray(split + 4) };
  }
  assert.equal(response.status, 200, 'Static GET failed for ' + new URL(target).pathname);
  return { status: 200, contentType: response.headers.get('content-type') ?? 'application/octet-stream', body: Buffer.from(await response.arrayBuffer()) };
}
