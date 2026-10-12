/* Round 1312 weight probe (never committed): loads each route on the served
   build with the database host blocked, sums the gzipped JavaScript it asked
   for, and names the chunk that holds the NHL ledger (its alignment key
   six-2006) and the chunk that holds the MLB ledger. Prints one line a route. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const ROUTES = ['/nhl-my-career', '/mlb-my-career'];
const PROBES = (process.env.PROBES ?? 'six-2006|Conference Quarterfinals|Conference Quarter-Finals').split('|');
const gz = f => { try { return zlib.gzipSync(fs.readFileSync(f)).length; } catch { return 0; } };
const browser = await chromium.launch();
const out = [];
for (const route of ROUTES) {
  const page = await browser.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const files = new Set();
  page.on('request', req => {
    const u = new URL(req.url());
    if (u.pathname.startsWith('/assets/') && u.pathname.endsWith('.js')) files.add(u.pathname.slice(1));
  });
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  let total = 0; const hits = {};
  for (const f of files) {
    const abs = path.join(ROOT, 'dist', f);
    total += gz(abs);
    let text = '';
    try { text = fs.readFileSync(abs, 'utf8'); } catch { text = ''; }
    for (const p of PROBES) if (text.includes(p)) (hits[p] ??= []).push(`${f} ${(gz(abs) / 1024).toFixed(1)}K`);
  }
  const line = `${route}: ${(total / 1024).toFixed(1)}K gz in ${files.size} files; ` + PROBES.map(p => `"${p}" in ${(hits[p] ?? ['none']).join(', ')}`).join('; ');
  console.log(line); out.push(line);
  await page.close();
}
/* The same probes over the whole of dist/assets: a block kept anywhere shows here. */
const all = fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(f => f.endsWith('.js'));
for (const p of PROBES) {
  const where = all.filter(f => fs.readFileSync(path.join(ROOT, 'dist/assets', f), 'utf8').includes(p));
  const line = `dist: "${p}" in ${where.length ? where.join(', ') : 'no file'}`;
  console.log(line); out.push(line);
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'weight1312.txt'), out.join('\n') + '\n');
await browser.close();
console.log('weight1312 done');
