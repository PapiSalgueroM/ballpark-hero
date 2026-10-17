// Round 1504 (copied from Round 1334's weight1334.mjs), never committed: sweepWeight's whole table (its BUDGETS rows, read from its source) by its own
// method (iPhone 13, load plus 1.5 s, every /assets/*.js asked for, gzipped from the build that served it), on the base
// build (dist-base on 4174) and the head build (dist on 4173). Then the chunk(s) holding the soccer deck, their modules
// (found by a string each module alone holds), their gzipped size, and every chunk the deck's first load fetches that
// /soccer-career's first download did not; and the CSS. Round 1332's weight1332.mjs is the model.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const src = fs.readFileSync('scripts/sweepWeight.mjs', 'utf8');
const from = src.indexOf('const BUDGETS = [');
const table = src.slice(from, src.indexOf('\n];', from));
const ROUTES = [...table.matchAll(/^ {2}\['(\/[^']*)', (\d+)\]/gm)].map(m => [m[1], Number(m[2])]);
const SIDES = { base: ['http://localhost:4174', 'dist-base'], head: ['http://localhost:4173', 'dist'] };
const gz = file => zlib.gzipSync(fs.readFileSync(file)).length;
const browser = await chromium.launch();
const got = {};
for (const [side, [base, dir]] of Object.entries(SIDES)) {
  for (const [route] of ROUTES) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await ctx.route(/supabase\.co/, r => r.abort());
    const page = await ctx.newPage();
    const files = new Set();
    page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
    await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
    let total = 0;
    for (const f of files) total += gz(path.join(dir, 'assets', f));
    got[`${side}${route}`] = { bytes: total, files: [...files] };
    await ctx.close();
  }
}
await browser.close();
console.log(`sweepWeight's table, ${ROUTES.length} routes, base against head (gzipped JS, K to one decimal and bytes):`);
let moved = [];
for (const [route, budget] of ROUTES) {
  const b = got[`base${route}`].bytes, h = got[`head${route}`].bytes;
  console.log(`  ${route.padEnd(20)} base ${(b / 1024).toFixed(1)}K (${b} B)  head ${(h / 1024).toFixed(1)}K (${h} B)  ${h - b >= 0 ? '+' : ''}${h - b} B  budget ${budget}K`);
  if (Math.abs(h - b) > 102) moved.push(`${route} ${h - b >= 0 ? '+' : ''}${((h - b) / 1024).toFixed(1)}K`);
}
console.log(`routes moving over 0.1K: ${moved.length ? moved.join(', ') : 'none'}`);
/* Round 1504: /soccer-career file by file (matched by the name before the hash), so the entry's growth has an owner */
{
  const stem = f => f.replace(/-[\w-]{8}\.js$/, '');
  const b = Object.fromEntries(got['base/soccer-career'].files.map(f => [stem(f), gz(path.join('dist-base', 'assets', f))]));
  const h = Object.fromEntries(got['head/soccer-career'].files.map(f => [stem(f), gz(path.join('dist', 'assets', f))]));
  for (const k of [...new Set([...Object.keys(b), ...Object.keys(h)])].sort()) {
    const d = (h[k] ?? 0) - (b[k] ?? 0);
    if (d !== 0) console.log(`  /soccer-career ${k}: base ${b[k] ?? '-'} B, head ${h[k] ?? '-'} B, ${d >= 0 ? '+' : ''}${d} B`);
  }
}
const sc = got['head/soccer-career'].bytes;
/* The deck's modules, each by a string only it holds. */
const MARKERS = {
  'src/lib/soccerDeck.ts': 'the soccer deck freezes its words',
  'src/data/soccerDeck/starter.ts': 'Crosses into a crowded box',
  'src/data/soccerDeck/words.ts': 'Aerial Command next season',
  'src/lib/gmInbox.ts': 'which the seat has not registered',
  'src/lib/soccerDeckGate.ts': 'the chunk loaded without the deck in it',
  'the gate help line': 'Summer cards: most summers',
  'src/lib/season/soccerMoments.ts': 'moments are yours to play this season',
};
const assets = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js'));
const text = Object.fromEntries(assets.map(f => [f, fs.readFileSync(path.join('dist/assets', f), 'utf8')]));
const holding = Object.fromEntries(Object.entries(MARKERS).map(([m, s]) => [m, assets.filter(f => text[f].includes(s))]));
for (const [m, fs2] of Object.entries(holding)) console.log(`  ${m}: ${fs2.length ? fs2.join(', ') : 'in no chunk'}`);
const deck = holding['src/lib/soccerDeck.ts'];
const first = new Set(got['head/soccer-career'].files);
const importsOf = f => [...new Set([...text[f].matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)].map(m => m[1]))];
const seen = new Set(), queue = [...deck];
while (queue.length) { const f = queue.pop(); if (seen.has(f) || !text[f]) continue; seen.add(f); queue.push(...importsOf(f)); }
const extra = [...seen].filter(f => !first.has(f));
let extraGz = 0;
for (const f of extra) {
  const mods = Object.entries(MARKERS).filter(([, s]) => text[f].includes(s)).map(([m]) => path.posix.basename(m));
  extraGz += gz(path.join('dist/assets', f));
  console.log(`  the deck's first load fetches ${f}: ${(gz(path.join('dist/assets', f)) / 1024).toFixed(1)}K gzipped${mods.length ? ` (${mods.join(', ')})` : ''}`);
}
console.log(`  in all, the deck's first load on /soccer-career fetches ${extra.length} chunks, ${(extraGz / 1024).toFixed(1)}K gzipped, none of them in the route's first download: ${deck.every(f => !first.has(f)) ? 'yes' : 'NO, the deck rides the first download'}`);
const css = dir => fs.readdirSync(path.join(dir, 'assets')).filter(f => f.endsWith('.css')).reduce((n, f) => n + gz(path.join(dir, 'assets', f)), 0);
console.log(`  CSS, every file gzipped: base ${css('dist-base')} B, head ${css('dist')} B`);
if (sc > 834 * 1024) { console.log(`STOP: /soccer-career is ${(sc / 1024).toFixed(1)}K, past 834K`); process.exit(1); }
if (!deck.length || deck.some(f => first.has(f))) process.exit(1);
console.log('weight1504: done');
