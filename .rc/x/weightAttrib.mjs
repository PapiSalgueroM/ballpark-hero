/* Release AT fix2 probe (never committed): what each of the four routes over budget downloads on
   Release AS (54e3820a) and on this head, measured the way scripts/sweepWeight.mjs section 1 measures
   (iPhone 13, load plus 1.5 seconds, the database host blocked), and which chunks and modules grew.
   Reads two builds made with vite.weight.config.mjs and served by scripts/lib/hostLikeServer.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const ROUTES = ['/club-manager', '/soccer-career', '/manager-hot-seat', '/deadline-day'];
const SIDES = [
  { tag: 'base', dir: '/tmp/bw', url: 'http://127.0.0.1:4302', mods: '/tmp/base-modules.json' },
  { tag: 'head', dir: '/tmp/hw', url: 'http://127.0.0.1:4301', mods: '/tmp/head-modules.json' },
];
const OUT = process.env.RC_OUT || '/tmp';
const lines = [];
const say = (s) => { lines.push(s); };
const gz = (f) => zlib.gzipSync(fs.readFileSync(f)).length;
const k1 = (n) => (n / 1024).toFixed(1);
const label = (file) => file.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');

const browser = await chromium.launch();
const got = {};
for (const side of SIDES) {
  const mods = JSON.parse(fs.readFileSync(side.mods, 'utf8'));
  got[side.tag] = {};
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await ctx.route(/supabase\.co/, (r) => r.abort());
    const page = await ctx.newPage();
    const files = new Set();
    page.on('request', (req) => {
      const m = req.url().match(/\/assets\/([^?]+\.js)$/);
      if (m) files.add(m[1]);
    });
    await page.goto(side.url + route, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
    const rec = { total: 0, files: files.size, chunks: {}, modules: {}, unknown: 0 };
    for (const f of files) {
      const size = gz(path.join(side.dir, 'assets', f));
      rec.total += size;
      const lab = label(f);
      rec.chunks[lab] = (rec.chunks[lab] || 0) + size;
      const info = mods[f];
      if (!info) { rec.unknown += 1; continue; }
      for (const [id, len] of Object.entries(info.modules)) rec.modules[id] = (rec.modules[id] || 0) + len;
    }
    got[side.tag][route] = rec;
    await ctx.close();
  }
}
await browser.close();

for (const route of ROUTES) {
  const b = got.base[route];
  const h = got.head[route];
  say(`== ${route}: ${k1(b.total)}K over ${b.files} files on 54e3820a, ${k1(h.total)}K over ${h.files} files on the head, ${k1(h.total - b.total)}K more (chunks with no module record: ${b.unknown} and ${h.unknown})`);
  const labs = [...new Set([...Object.keys(b.chunks), ...Object.keys(h.chunks)])];
  const cd = labs.map((l) => [l, (h.chunks[l] || 0) - (b.chunks[l] || 0), b.chunks[l] || 0, h.chunks[l] || 0]).filter((r) => r[1] !== 0).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
  say('   chunks that moved (gzipped bytes, base to head):');
  for (const [l, d, bb, hh] of cd.slice(0, 14)) say(`     ${d > 0 ? '+' : ''}${d}  ${l}  ${bb} to ${hh}`);
  const ids = [...new Set([...Object.keys(b.modules), ...Object.keys(h.modules)])];
  const md = ids.map((id) => [id, (h.modules[id] || 0) - (b.modules[id] || 0), id in b.modules, id in h.modules]).filter((r) => r[1] !== 0).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
  const sum = md.reduce((n, r) => n + r[1], 0);
  say(`   modules that moved (rendered bytes before minify, ${md.length} modules, ${sum} bytes net):`);
  for (const [id, d, inB, inH] of md.slice(0, 40)) say(`     ${d > 0 ? '+' : ''}${d}  ${id}${inB ? '' : '  (new on this route)'}${inH ? '' : '  (gone from this route)'}`);
}

fs.writeFileSync(path.join(OUT, 'weight-attrib.txt'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'weight-attrib.json'), JSON.stringify(got));
for (const l of lines.filter((s) => s.startsWith('=='))) console.log(l);
console.log('weightAttrib: done, ' + lines.length + ' lines in weight-attrib.txt');
