// Round 1328 probe: which JS and CSS files each engine route loads on a base build and a head build, and
// which differ (a changed chunk gets a new hashed name). Usage: node chunkDiff.mjs <baseUrl> <headUrl>
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const [BASE, HEAD] = process.argv.slice(2);
const ROUTES = ['/club-manager', '/manager-hot-seat', '/deadline-day'];
const browser = await pw.chromium.launch();
async function files(origin, route) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === new URL(origin).origin ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const got = new Map();
  page.on('response', async res => {
    const u = new URL(res.url());
    if (!/\.(js|css)$/.test(u.pathname)) return;
    try { const b = await res.body(); got.set(u.pathname.split('/').pop(), zlib.gzipSync(b).length); } catch { /* aborted */ }
  });
  await page.goto(origin + route, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  await ctx.close();
  return got;
}
for (const route of ROUTES) {
  const b = await files(BASE, route);
  const h = await files(HEAD, route);
  const onlyB = [...b.keys()].filter(k => !h.has(k));
  const onlyH = [...h.keys()].filter(k => !b.has(k));
  const kb = (m, ks) => ks.map(k => `${k} ${(m.get(k) / 1024).toFixed(2)}K`).join(', ') || 'none';
  console.log(`${route}: ${b.size} files on base, ${h.size} on head`);
  console.log(`  only on base: ${kb(b, onlyB)}`);
  console.log(`  only on head: ${kb(h, onlyH)}`);
}
await browser.close();
