/* Reviewer walk 2, Round 1576 (runner only): is the 9 px growth on a Played for Manchester City lock at 390
   the tile's (any man) or this round's (Reijnders only)? For each served build in URLS, at 390x844 reduced
   motion, every seed from 1 to 40 with that tile: skip until the first man who LOCKS it (tap only men on a list
   of Manchester City players, and Reijnders), and print the document height before and after the tap. */
import '../../scripts/lib/offlineTransport.cjs';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const URLS = (process.env.URLS || process.env.BASE || 'http://localhost:4173').split(',');
const OUT = process.env.RC_OUT || '.tmp-walk2';
mkdirSync(OUT, { recursive: true });
const rows = JSON.parse(readFileSync('scripts/data/bingoPoolHistory-2026-10-29.json', 'utf8')).rows;
const CITY = new Set(rows.filter(r => r.club === 'Manchester City').map(r => r.player_name));
CITY.add('Tijjani Reijnders');
function marketRead(url) {
  const q = url.searchParams;
  let list = [...rows];
  const inMatch = /^in\.\((.*)\)$/.exec(q.get('player_name') ?? '');
  if (q.has('player_name')) {
    const names = new Set([...inMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"|([^,]+)/g)].map(m => (m[1] ?? m[2]).replace(/\\(.)/g, '$1')));
    list = list.filter(r => names.has(r.player_name));
  }
  for (const key of ['year', 'market_value_usd', 'age']) {
    const v = q.get(key);
    if (v == null) continue;
    const [kind, ...rest] = v.split('.');
    const arg = rest.join('.');
    if (kind === 'gte') list = list.filter(r => r[key] != null && Number(r[key]) >= Number(arg));
    else if (kind === 'gt') list = list.filter(r => r[key] != null && Number(r[key]) > Number(arg));
    else if (kind === 'not' && arg === 'is.null') list = list.filter(r => r[key] != null);
  }
  const orders = (q.get('order') || '').split(',').filter(Boolean).map(o => o.split('.'));
  list.sort((a, b) => { for (const [f, d] of orders) { const x = (d === 'desc' ? -1 : 1) * (Number(a[f]) - Number(b[f])); if (x) return x; } return a.id - b.id; });
  const offset = Number(q.get('offset') || 0);
  list = list.slice(offset, offset + Math.min(Number(q.get('limit') || 1000), 1000));
  const cols = (q.get('select') || '').split(',');
  return list.map(r => Object.fromEntries(cols.map(c => [c, r[c] ?? null])));
}
const browser = await pw.chromium.launch();
for (const base of URLS) {
  const origin = new URL(base).origin;
  const cors = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-expose-headers': 'content-range' };
  const route = async r => {
    const req = r.request();
    const url = new URL(req.url());
    if (url.origin === origin) return r.fallback();
    const table = /supabase\.co$/.test(url.hostname) && url.pathname.match(/^\/rest\/v1\/(player_market_values|world_cup_players|ballon_dor)$/)?.[1];
    if (table && req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors, body: '' });
    if (table && req.method() === 'GET') return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(table === 'player_market_values' ? marketRead(url) : []) });
    return r.abort();
  };
  let shown = 0;
  for (let seed = 1; seed <= 40 && shown < 4; seed++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(s => { let st = s >>> 0; Math.random = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; }; }, seed);
    await context.route('**/*', route);
    const page = await context.newPage();
    await page.goto(base + '/player-bingo', { waitUntil: 'domcontentloaded' });
    await answerConsent(page);
    const play = page.getByRole('button', { name: "Let's Play!", exact: true });
    await play.waitFor({ timeout: 30000 });
    await play.click();
    const tiles = page.locator('div.grid-cols-5 > button[title]');
    await tiles.first().waitFor({ timeout: 30000 });
    const titles = await tiles.evaluateAll(l => l.map(b => b.getAttribute('title')));
    const col = titles.indexOf('Played for Manchester City');
    if (col < 0) { await context.close(); continue; }
    const name = page.locator('div.text-2xl.font-bold');
    const tile = page.locator('div.grid-cols-5 > button[title="Played for Manchester City"]');
    let skips = 0;
    let done = false;
    while (!done && skips < 520) {
      const who = (await name.textContent())?.trim();
      if (CITY.has(who)) {
        const h0 = await page.evaluate(() => document.documentElement.scrollHeight);
        const r0 = await tile.evaluate(el => Math.round(el.getBoundingClientRect().height));
        await tile.dispatchEvent('click');
        await page.waitForTimeout(700);
        const txt = ((await tile.textContent()) ?? '').replace(/\s+/g, ' ');
        if (txt.includes(who)) {
          const h1 = await page.evaluate(() => document.documentElement.scrollHeight);
          const r1 = await tile.evaluate(el => Math.round(el.getBoundingClientRect().height));
          console.log(`${base} seed ${seed} (tile index ${col}): ${who} locks Played for Manchester City after ${skips} skips; tile height ${r0}->${r1}; document height ${h0}->${h1}`);
          await page.screenshot({ path: path.join(OUT, `city-${new URL(base).port}-seed${seed}.png`) });
          shown += 1;
          done = true;
        } else break;
      } else { await page.getByRole('button', { name: 'Skip player' }).click(); skips += 1; }
    }
    await context.close();
  }
  console.log(`${base}: ${shown} Manchester City locks measured`);
}
await browser.close();
console.log('rv-walk2: DONE');
