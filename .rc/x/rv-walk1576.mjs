/* Reviewer walk, Round 1576 (runner only). Plays /player-bingo on the served build the way a player does:
   four moved verdicts (three locks, one Ferguson strike), at 390x844 and 1280x900, reduced motion on and off;
   an old best-run save seeded from the base key; /whats-new; screenshots into RC_OUT. Supabase is answered
   from the committed fixture and every other host is aborted. */
import '../../scripts/lib/offlineTransport.cjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || '.tmp-walk';
mkdirSync(OUT, { recursive: true });
const rows = JSON.parse(readFileSync('scripts/data/bingoPoolHistory-2026-10-29.json', 'utf8')).rows;
const origin = new URL(BASE).origin;
let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const log = [];
const note = m => { console.log(m); log.push(m); };

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
const cors = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-expose-headers': 'content-range' };
let supabaseHits = 0;
const route = async r => {
  const req = r.request();
  const url = new URL(req.url());
  if (url.origin === origin) return r.fallback();
  if (/supabase\.co$/.test(url.hostname)) {
    supabaseHits += 1;
    const table = url.pathname.match(/^\/rest\/v1\/(player_market_values|world_cup_players|ballon_dor)$/)?.[1];
    if (table && req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors, body: '' });
    if (table && req.method() === 'GET') return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(table === 'player_market_values' ? marketRead(url) : []) });
  }
  return r.abort();
};

const CASES = [
  { key: 'rashford', man: 'Marcus Rashford', tile: 'Played for Barcelona', expect: 'lock' },
  { key: 'reijnders', man: 'Tijjani Reijnders', tile: 'Played for Manchester City', expect: 'lock' },
  { key: 'kolomuani', man: 'Randal Kolo Muani', tile: 'Played for Tottenham', expect: 'lock' },
  { key: 'ferguson', man: 'Evan Ferguson', tile: 'One-club man', expect: 'strike' },
];
const CONFIGS = [[390, 844, 'reduce'], [390, 844, 'no-preference'], [1280, 900, 'reduce'], [1280, 900, 'no-preference']];

const browser = await pw.chromium.launch();
async function open(seed, [w, h, rm], best) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm });
  await context.addInitScript(([s, b]) => {
    let state = s >>> 0;
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    if (b) try { localStorage.setItem('player_bingo_best_lines_v2', b); } catch {}
  }, [seed, best ?? null]);
  await context.route('**/*', route);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '/player-bingo', { waitUntil: 'domcontentloaded' });
  await answerConsent(page);
  const play = page.getByRole('button', { name: "Let's Play!", exact: true });
  await play.waitFor({ timeout: 30000 });
  return { context, page, errors, play };
}
const tilesOf = page => page.locator('div.grid-cols-5 > button[title]');
try {
  /* An old save: the only key the page keeps (best run), written as the base wrote it. */
  {
    const { context, page, play, errors } = await open(1, CONFIGS[0], '5');
    const pre = (await page.locator('body').innerText()).includes('Best run 5/12');
    await page.screenshot({ path: path.join(OUT, 'old-save-best-390.png') });
    await play.click();
    await tilesOf(page).first().waitFor({ timeout: 30000 });
    const post = (await page.locator('body').innerText()).includes('Best run 5/12');
    note(`old save: best key "5" shows "Best run 5/12" before play ${pre}, after play ${post}; page errors ${errors.length}`);
    if (!pre && !post) fail('an old best-run save of 5 is not shown');
    await context.close();
  }
  for (const c of CASES) {
    let seed = 0;
    for (let s = 1; s <= 200 && !seed; s++) {
      const { context, page, play } = await open(s, CONFIGS[0]);
      await play.click();
      await tilesOf(page).first().waitFor({ timeout: 30000 });
      const titles = await tilesOf(page).evaluateAll(l => l.map(b => b.getAttribute('title')));
      if (titles.includes(c.tile)) seed = s;
      await context.close();
    }
    if (!seed) { fail(`${c.key}: no seed 1..200 deals ${c.tile}`); continue; }
    for (const cfg of CONFIGS) {
      const tag = `${c.key}-${cfg[0]}-${cfg[2] === 'reduce' ? 'rm' : 'motion'}`;
      let opened = null;
      for (let s = seed, tries = 0; tries < 200 && !opened; s = s === seed ? 1 : s + 1, tries++) {
        if (tries > 0 && s === seed) continue;
        const o = await open(s, cfg);
        await o.play.click();
        await tilesOf(o.page).first().waitFor({ timeout: 30000 });
        const titles = await tilesOf(o.page).evaluateAll(l => l.map(b => b.getAttribute('title')));
        if (titles.includes(c.tile)) { opened = o; if (s !== seed) note(`${tag}: seed ${seed} deals another board in this config; seed ${s} used`); }
        else await o.context.close();
      }
      if (!opened) { fail(`${tag}: no seed deals ${c.tile} in this config`); continue; }
      const { context, page, errors } = opened;
      const name = page.locator('div.text-2xl.font-bold');
      let skips = 0;
      while ((await name.textContent())?.trim() !== c.man && skips < 520) { await page.getByRole('button', { name: 'Skip player' }).click(); skips += 1; }
      if ((await name.textContent())?.trim() !== c.man) { fail(`${tag}: ${c.man} never dealt`); await context.close(); continue; }
      const strikes = () => page.locator('span[aria-label$="strikes used"]').getAttribute('aria-label');
      const st = async () => ({ s: await strikes(), y: await page.evaluate(() => window.scrollY), h: await page.evaluate(() => document.documentElement.scrollHeight) });
      const before = await st();
      const tile = page.locator(`div.grid-cols-5 > button[title="${c.tile}"]`);
      await tile.dispatchEvent('click');
      await page.waitForTimeout(120);
      await page.screenshot({ path: path.join(OUT, `${tag}-t120.png`) });
      await page.waitForTimeout(900);
      const after = await st();
      const locked = ((await tile.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      const clip = await tile.evaluate(el => [el, ...el.querySelectorAll('*')].filter(x => x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1).map(x => `${x.tagName}.${(x.className || '').toString().slice(0, 40)} ${x.scrollWidth}/${x.clientWidth}x${x.scrollHeight}/${x.clientHeight}`));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const feedback = (await page.locator('body').innerText()).split('\n').filter(l => l.includes(c.man.split(' ').pop()) || /fit|strike|doesn/i.test(l)).slice(0, 6).join(' / ');
      note(`${tag}: seed ${seed}, ${skips} skips; strikes "${before.s}" -> "${after.s}"; tile "${locked}"; scrollY ${before.y}->${after.y}, height ${before.h}->${after.h}; overflow ${overflow}; clipped [${clip.join('; ')}]; errors ${errors.length}; text: ${feedback.slice(0, 300)}`);
      if (c.expect === 'lock') {
        if (after.s !== before.s) fail(`${tag}: the tap cost a strike`);
        if (!locked.includes(c.man)) fail(`${tag}: ${c.tile} did not lock with ${c.man}`);
      } else {
        if (after.s === before.s) fail(`${tag}: ${c.man} on ${c.tile} did not cost a strike (he is no longer a one-club man)`);
        if (locked.includes(c.man)) fail(`${tag}: ${c.tile} locked with ${c.man}`);
      }
      if (after.y !== before.y || after.h !== before.h) fail(`${tag}: the page moved on the tap`);
      if (overflow > 0) fail(`${tag}: sideways overflow ${overflow}`);
      if (errors.length) fail(`${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
      await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
      await context.close();
    }
  }
  for (const cfg of CONFIGS) {
    const tag = `whatsnew-${cfg[0]}-${cfg[2] === 'reduce' ? 'rm' : 'motion'}`;
    const context = await browser.newContext({ viewport: { width: cfg[0], height: cfg[1] }, reducedMotion: cfg[2] });
    await context.route('**/*', route);
    const page = await context.newPage();
    await page.goto(BASE + '/whats-new', { waitUntil: 'domcontentloaded' });
    await answerConsent(page);
    const item = page.locator('li', { hasText: 'last season\'s clubs are back' });
    await item.first().waitFor({ timeout: 30000 }).catch(() => {});
    const n = await item.count();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const heading = n ? await item.first().evaluate(li => { let el = li; while (el && !/^H[1-4]$/.test(el.tagName)) { el = el.previousElementSibling ?? el.parentElement; } return el?.textContent?.trim() ?? null; }) : null;
    note(`${tag}: ${n} entry, overflow ${overflow}, nearest heading "${heading}"`);
    if (n !== 1) fail(`${tag}: ${n} entries`);
    if (overflow > 0) fail(`${tag}: overflow ${overflow}`);
    if (n) await item.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    await context.close();
  }
} finally {
  await browser.close();
}
note(`supabase requests answered or aborted: ${supabaseHits}`);
writeFileSync(path.join(OUT, 'walk-log.txt'), log.join('\n') + '\n');
console.log(failures ? `rv-walk1576: RED, ${failures} failures` : 'rv-walk1576: GREEN');
process.exit(failures ? 1 : 0);
