/* Reviewer walk for Round 1571 (lens: runs things). Needs #!serve and #!playwright: BASE is the served build.
   Answers the page's Supabase reads from the committed fixture, aborts every other host (production unreachable).
   At 390x844 and 1280x900, reduced motion on and off: the "?" before play (Club squares section, overflow, shot),
   Let's Play by a real click, skip until Tyler Morton, a REAL click on Played for 4+ clubs (no strike, locks, no jump),
   the "?" reopened in play. At 390 reduce: Ryan Gravenberch on 4+ (now 3 clubs: must strike) and Raul Asencio on
   One-club man (now one club: must lock). What's New at both widths. A best score seeded in localStorage shows. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || '/tmp/walk-out';
fs.mkdirSync(OUT, { recursive: true });
const rows = JSON.parse(fs.readFileSync('scripts/data/bingoPoolHistory-2026-10-29.json', 'utf8')).rows;
let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const origin = new URL(BASE).origin;
const cors = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-expose-headers': 'content-range' };

function marketRead(url) {
  const q = url.searchParams;
  let list = [...rows];
  const pn = q.get('player_name');
  if (pn) {
    const m = /^in\.\((.*)\)$/.exec(pn);
    if (!m) throw new Error('unexpected player_name filter ' + pn);
    const names = new Set([...m[1].matchAll(/"((?:[^"\\]|\\.)*)"|([^,]+)/g)].map(x => (x[1] ?? x[2]).replace(/\\(.)/g, '$1')));
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
    else throw new Error(`unexpected filter ${key}=${v}`);
  }
  const orders = (q.get('order') || '').split(',').filter(Boolean).map(o => o.split('.'));
  list.sort((a, b) => { for (const [f, d] of orders) { const x = (d === 'desc' ? -1 : 1) * (Number(a[f]) - Number(b[f])); if (x) return x; } return a.id - b.id; });
  const offset = Number(q.get('offset') || 0);
  list = list.slice(offset, offset + Math.min(Number(q.get('limit') || 1000), 1000));
  const cols = (q.get('select') || '').split(',');
  return list.map(r => Object.fromEntries(cols.map(c => [c, r[c] ?? null])));
}

const browser = await pw.chromium.launch();
async function open({ width, height, motion, seed, best, url = '/player-bingo' }) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
  await context.addInitScript(([s, b]) => {
    let state = s >>> 0;
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    if (b) try { localStorage.setItem('player_bingo_best_lines_v2', String(b)); } catch {}
  }, [seed, best ?? 0]);
  await context.route('**/*', async route => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.origin === origin) return route.fallback();
    const table = u.pathname.match(/^\/rest\/v1\/(player_market_values|world_cup_players|ballon_dor)$/)?.[1];
    if (/supabase\.co$/.test(u.hostname) && table && ['GET', 'OPTIONS'].includes(req.method())) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(table === 'player_market_values' ? marketRead(u) : []) });
    }
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
  await answerConsent(page);
  return { context, page, errors };
}
const overflowX = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const clubSection = page => page.locator('[role="dialog"] section', { has: page.locator('h3', { hasText: 'Club squares' }) });

async function checkGate(page, tag) {
  const sec = clubSection(page);
  if (!(await sec.count())) { fail(`${tag}: no Club squares section in the ?`); return; }
  await sec.scrollIntoViewIfNeeded();
  const box = await sec.boundingBox();
  const dlg = await page.locator('[role="dialog"]').first().boundingBox();
  const vw = page.viewportSize().width;
  const ox = await overflowX(page);
  console.log(`   ${tag}: section x ${Math.round(box.x)} to ${Math.round(box.x + box.width)} (dialog ${Math.round(dlg.x)} to ${Math.round(dlg.x + dlg.width)}, viewport ${vw}), page overflow ${ox}`);
  if (box.x < dlg.x - 1 || box.x + box.width > dlg.x + dlg.width + 1 || box.x + box.width > vw) fail(`${tag}: the section spills out of the dialog or the viewport`);
  if (ox > 0) fail(`${tag}: the page scrolls sideways by ${ox}`);
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
}

async function findBoard({ width, height, motion, tile, best, gateTag }) {
  for (let seed = 1; seed <= 60; seed++) {
    const s = await open({ width, height, motion, seed, best });
    const play = s.page.getByRole('button', { name: "Let's Play!", exact: true });
    await play.waitFor({ timeout: 30000 });
    if (gateTag && seed === 1) await checkGate(s.page, gateTag);
    await play.click();
    const tiles = s.page.locator('div.grid-cols-5 > button[title]');
    await tiles.first().waitFor({ timeout: 30000 });
    const titles = await tiles.evaluateAll(l => l.map(b => b.getAttribute('title')));
    if (titles.includes(tile)) return { ...s, seed };
    await s.context.close();
  }
  return null;
}

async function dealAndTap({ width, height, motion, man, tile, expect, tag, best, gateTag }) {
  const s = await findBoard({ width, height, motion, tile, best, gateTag });
  if (!s) { fail(`${tag}: no seed 1 to 60 deals ${tile}`); return; }
  const { page, context, errors, seed } = s;
  const name = page.locator('div.font-bold.text-2xl');
  let skips = 0;
  while ((await name.textContent())?.trim() !== man && skips < 480) { await page.getByRole('button', { name: 'Skip player' }).click(); skips += 1; }
  if ((await name.textContent())?.trim() !== man) { fail(`${tag}: ${man} never dealt on seed ${seed}`); await context.close(); return; }
  const strikes = () => page.locator('span[aria-label$="strikes used"]').getAttribute('aria-label');
  const t = page.locator(`div.grid-cols-5 > button[title="${tile}"]`);
  const inView = await t.evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; });
  const before = { s: await strikes(), y: await page.evaluate(() => window.scrollY) };
  await t.click();
  await page.waitForTimeout(900);
  const after = { s: await strikes(), y: await page.evaluate(() => window.scrollY) };
  const txt = ((await t.textContent()) ?? '').replace(/\s+/g, ' ').trim();
  console.log(`   ${tag}: seed ${seed}, ${man} after ${skips} skips; real click on ${tile} (in view ${inView}); strikes ${before.s} -> ${after.s}; tile "${txt}"; scrollY ${before.y} -> ${after.y}`);
  if (expect === 'lock' && (after.s !== before.s || !txt.includes(man))) fail(`${tag}: ${man} on ${tile} did not lock cleanly`);
  if (expect === 'strike' && (after.s === before.s || txt.includes(man))) fail(`${tag}: ${man} on ${tile} did not strike`);
  if (inView && after.y !== before.y) fail(`${tag}: the page moved on the tap`);
  if (errors.length) fail(`${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  if (expect === 'lock' && motion === 'reduce') {
    await page.getByRole('button', { name: 'How to play' }).first().click();
    await page.locator('[role="dialog"]').first().waitFor({ timeout: 5000 });
    await checkGate(page, `${tag}-reopen`);
  }
  await context.close();
}

for (const [width, height] of [[390, 844], [1280, 900]]) {
  for (const motion of ['reduce', 'no-preference']) {
    console.log(`viewport ${width}x${height}, reducedMotion ${motion}`);
    await dealAndTap({ width, height, motion, man: 'Tyler Morton', tile: 'Played for 4+ clubs', expect: 'lock', tag: `morton-${width}-${motion}`, gateTag: `gate-${width}-${motion}`, best: width === 390 && motion === 'reduce' ? 3 : 0 });
  }
}
console.log('negatives at 390, reduce');
await dealAndTap({ width: 390, height: 844, motion: 'reduce', man: 'Ryan Gravenberch', tile: 'Played for 4+ clubs', expect: 'strike', tag: 'gravenberch-390' });
await dealAndTap({ width: 390, height: 844, motion: 'reduce', man: 'Raúl Asencio', tile: 'One-club man', expect: 'lock', tag: 'asencio-390' });

const b = await open({ width: 390, height: 844, motion: 'reduce', seed: 1, best: 3 });
await b.page.getByRole('button', { name: "Let's Play!", exact: true }).waitFor({ timeout: 30000 });
await b.page.getByRole('button', { name: "Let's Play!", exact: true }).click();
const bestText = await b.page.getByText(/Best run/).first().textContent().catch(() => '');
console.log(`old save: best 3 seeded, page reads "${(bestText || '').replace(/\s+/g, ' ').trim()}"`);
if (!/3\/12/.test(bestText || '')) fail('a seeded best score did not show');
await b.context.close();

for (const [width, height] of [[390, 844], [1280, 900]]) {
  const s = await open({ width, height, motion: 'reduce', seed: 1, url: '/whats-new' });
  const li = s.page.locator('li', { hasText: 'Player Bingo: loans count.' }).first();
  await li.waitFor({ timeout: 30000 });
  await li.scrollIntoViewIfNeeded();
  const href = await li.locator('a').first().getAttribute('href');
  const ox = await overflowX(s.page);
  console.log(`whats-new ${width}: entry found, link ${href}, overflow ${ox}, text "${((await li.textContent()) ?? '').slice(0, 90)}..."`);
  if (href !== '/player-bingo' || ox > 0) fail(`whats-new ${width}: link ${href} or overflow ${ox}`);
  await s.page.screenshot({ path: path.join(OUT, `whatsnew-${width}.png`) });
  await s.context.close();
}
await browser.close();
console.log(failures ? `walk: RED, ${failures} failures` : 'walk: GREEN');
process.exit(failures ? 1 : 0);
