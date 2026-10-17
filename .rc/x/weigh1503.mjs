/* Round 1503 weight probe (not committed): /club-manager measured the way scripts/sweepWeight.mjs section 1 does
 * (an iPhone 13 context, every /assets/*.js asked for until load plus 1.5 s, each file gzipped with zlib's default),
 * on the head's build and the base's, plus the new screen's own chunk. Run from the repo root:
 *   node .rc/x/weigh1503.mjs <head url> <head dist> <base url> <base dist> */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const [headUrl, headDist, baseUrl, baseDist] = process.argv.slice(2);
const gz = f => zlib.gzipSync(fs.readFileSync(f)).length;
const k = n => `${(n / 1024).toFixed(1)}K`;
async function weigh(url, dist, label) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => { const m = req.url().match(/\/assets\/([^?]+\.js)$/); if (m) files.add(m[1]); });
  await page.goto(`${url}/club-manager`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1500);
  let total = 0;
  for (const f of files) total += gz(path.join(dist, 'assets', f));
  const all = fs.readdirSync(path.join(dist, 'assets')).filter(f => f.endsWith('.js'));
  const pick = re => all.filter(f => re.test(f)).map(f => `${f} ${k(gz(path.join(dist, 'assets', f)))}`).join(', ') || 'none';
  const loadedNew = [...files].filter(f => /^WorldCompScreen-/.test(f));
  console.log(`${label}: /club-manager ${k(total)} over ${files.size} files (row 606K); ClubManager chunk ${pick(/^ClubManager-/)}; WorldCompScreen chunk ${pick(/^WorldCompScreen-/)}, loaded on the page's first draw: ${loadedNew.length ? 'yes' : 'no'}`);
  await browser.close();
  return total;
}
const head = await weigh(headUrl, headDist, 'head');
const base = await weigh(baseUrl, baseDist, 'base');
console.log(`weigh1503: /club-manager head ${k(head)}, base ${k(base)}, growth ${((head - base) / 1024).toFixed(2)}K`);
