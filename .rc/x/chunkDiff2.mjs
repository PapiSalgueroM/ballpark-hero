// Round 1328 probe, second form: hashed names cascade (a chunk that imports a renamed chunk is renamed too), so
// compare each route's JS and CSS by name stem (the part before the hash) and by exact bytes and gzip size.
// Usage: node chunkDiff2.mjs <baseUrl> <headUrl>
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const [BASE, HEAD] = process.argv.slice(2);
const ROUTES = ['/club-manager', '/manager-hot-seat', '/deadline-day'];
const browser = await pw.chromium.launch();
const stem = name => name.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, '.$1');
async function files(origin, route) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === new URL(origin).origin ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const got = new Map();
  page.on('response', async res => {
    const u = new URL(res.url());
    if (!/\.(js|css)$/.test(u.pathname)) return;
    try {
      const b = await res.body();
      /* Hashed names inside a chunk cascade, so bytes are compared with every hashed asset name blanked. */
      const text = b.toString('utf8').replace(/-[A-Za-z0-9_-]{8}\.(js|css)/g, '-HASH.$1');
      got.set(stem(u.pathname.split('/').pop()), { raw: b.length, gz: zlib.gzipSync(b).length, text });
    } catch { /* aborted */ }
  });
  await page.goto(origin + route, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  await ctx.close();
  return got;
}
for (const route of ROUTES) {
  const b = await files(BASE, route);
  const h = await files(HEAD, route);
  const changed = [];
  for (const k of new Set([...b.keys(), ...h.keys()])) {
    const x = b.get(k);
    const y = h.get(k);
    if (!x || !y) { changed.push(`${k} ${x ? 'only on base' : 'only on head'} ${((x ?? y).gz / 1024).toFixed(2)}K gz`); continue; }
    if (x.text !== y.text) changed.push(`${k} ${(x.gz / 1024).toFixed(2)}K to ${(y.gz / 1024).toFixed(2)}K gz (${y.gz - x.gz >= 0 ? '+' : ''}${y.gz - x.gz} bytes)`);
  }
  const sum = m => [...m.values()].reduce((n, v) => n + v.gz, 0);
  console.log(`${route}: ${b.size} files on base, ${h.size} on head; ${(sum(b) / 1024).toFixed(1)}K gz to ${(sum(h) / 1024).toFixed(1)}K gz`);
  console.log(`  differing beyond hashed names: ${changed.join('; ') || 'none'}`);
}
await browser.close();
