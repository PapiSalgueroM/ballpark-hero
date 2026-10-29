/* Review run lens, Round 1567: play Baseball, NFL and NHL Connections on the served branch build the way a player
   does, at 390x844 and 1280x900, reduced motion on and off, with supabase.co (and every other host) blocked so the
   shipped file is the pool. Then load a save shaped as the base code wrote it (the solved club group under its OLD,
   undated label) and see what the branch shows: lost, playing, then won. Screenshots and walk.json go to RC_OUT. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'rvw-out-'));
const ROOT = process.cwd().split(path.sep).join('/');
const DATE = '2026-10-29';
const NOON_ET = Date.parse(`${DATE}T16:00:00Z`);

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk-'));
fs.writeFileSync(path.join(TMP, 'e.mjs'), ['baseball', 'nfl', 'nhl'].map(s =>
  `export { ${s}ConnectionsPuzzles } from '${ROOT}/src/data/${s}ConnectionsPuzzles.ts';`).join('\n'));
await build({ entryPoints: [path.join(TMP, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'b.mjs'), logLevel: 'error', alias: { '@': `${ROOT}/src` } });
const D = await import(pathToFileURL(path.join(TMP, 'b.mjs')).href);

const SPORTS = [
  { key: 'baseball', route: '/baseball-connections', slug: 'baseball-connections', pool: D.baseballConnectionsPuzzles },
  { key: 'nfl', route: '/nfl-connections', slug: 'nfl-connections', pool: D.nflConnectionsPuzzles },
  { key: 'nhl', route: '/nhl-connections', slug: 'nhl-connections', pool: D.nhlConnectionsPuzzles },
];
const CONFIGS = [
  { tag: '390-reduce', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', oldSave: true },
  { tag: '390-motion', viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' },
  { tag: '1280-reduce', viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' },
  { tag: '1280-motion', viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference', oldSave: true },
];
const undated = t => t.replace(/ \(as of [^)]+\)$/, '');
const results = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();

async function shot(page, name) {
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}
/* leaf elements whose text is exactly one of these labels: how many group headers the page shows */
async function headers(page, labels) {
  return page.evaluate(ls => {
    const out = {};
    for (const l of ls) out[l] = 0;
    for (const el of document.querySelectorAll('p, summary, h3, span, div')) {
      if (el.childElementCount) continue;
      const t = (el.textContent || '').trim();
      if (t in out) out[t] += 1;
    }
    return out;
  }, labels);
}
async function nameCount(page, name) {
  return page.evaluate(n => [...document.querySelectorAll('span, p, button')].filter(e => !e.childElementCount && (e.textContent || '').trim() === n).length
    + [...document.querySelectorAll('p')].filter(e => (e.textContent || '').split(', ').includes(n) && (e.textContent || '').includes(', ')).length, name);
}
async function overflow(page, label) {
  return page.evaluate(l => {
    const el = [...document.querySelectorAll('p, summary')].find(e => (e.textContent || '').trim() === l);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { right: Math.round(r.right), width: Math.round(r.width), vw: innerWidth, overflow: el.scrollWidth > el.clientWidth + 1, docScroll: document.documentElement.scrollWidth > innerWidth };
  }, label);
}
async function clickName(page, n) { await page.getByRole('button', { name: n, exact: true }).first().click(); }
async function submit(page) { await page.getByRole('button', { name: /^Submit/ }).first().click(); await sleep(250); }
async function clear(page) {
  const b = page.getByRole('button', { name: /^(Deselect All|Clear draft)$/ }).first();
  if (await b.count() && await b.isEnabled()) await b.click();
}
async function waitComplete(page) {
  await page.waitForFunction(() => /Found\s*\d\s*\/4 groups|All Groups Found|Out of Lives/i.test(document.body.innerText), null, { timeout: 15000 });
}

async function flow(sp, cf) {
  const tag = `${sp.key}-${cf.tag}`;
  const r = { tag, errors: [] };
  results.push(r);
  const ctx = await browser.newContext({ viewport: cf.viewport, reducedMotion: cf.reducedMotion, deviceScaleFactor: 1 });
  await ctx.route(u => !u.href.startsWith(BASE), route => route.abort());
  await ctx.route(/supabase\.co/, route => route.abort());
  await ctx.addInitScript(({ t }) => {
    const R = Date; const off = t - R.now();
    class FD extends R { constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); } static now() { return R.now() + off; } }
    globalThis.Date = FD;
  }, { t: NOON_ET });
  const page = await ctx.newPage();
  page.on('pageerror', e => r.errors.push(String(e.message).slice(0, 200)));
  try {
    await page.goto(BASE + sp.route, { waitUntil: 'domcontentloaded' });
    const all = sp.pool.flatMap(b => b.groups.flatMap(g => g.players));
    await page.waitForFunction(ns => [...document.querySelectorAll('button')].filter(b => ns.includes((b.getAttribute('aria-label') || b.textContent || '').trim())).length >= 20, all, { timeout: 25000 });
    await sleep(800);
    await shot(page, `${tag}-1-open`);
    const dlg = page.locator('[role=dialog]').first();
    r.dialogOpen = await dlg.isVisible().catch(() => false);
    if (r.dialogOpen) {
      const txt = await dlg.innerText();
      r.dialogAsOf = /as of 20/.test(txt);
      r.dialogDash = txt.includes(String.fromCharCode(0x2013)) || txt.includes(String.fromCharCode(0x2014));
      const m = txt.match(/A team group marked[^.]*\.[^.]*\./);
      r.dialogLine = m ? m[0] : null;
      await page.keyboard.press('Escape');
      await sleep(400);
    }
    const reject = page.getByRole('button', { name: 'Reject all' });
    if (await reject.count() && await reject.first().isVisible()) { await reject.first().click(); await sleep(300); }
    /* the dealt board: the one whose 20 names are all buttons on screen */
    const names = new Set(await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.textContent || '').trim())));
    const board = sp.pool.find(b => b.groups.every(g => g.players.every(p => names.has(p))));
    r.board = board?.id ?? null;
    if (!board) { r.note = 'dealt board not found among the file boards'; await shot(page, `${tag}-x-noboard`); return; }
    const club = board.groups.find(g => / \(as of [^)]+\)$/.test(g.theme));
    r.club = club?.theme ?? null;
    const first = club ?? board.groups[0];
    const others = board.groups.filter(g => g !== first);
    for (const p of first.players) await clickName(page, p);
    await submit(page);
    await page.waitForFunction(t => [...document.querySelectorAll('p, summary')].some(e => (e.textContent || '').trim() === t), first.theme, { timeout: 8000 });
    await shot(page, `${tag}-2-solved`);
    r.solvedHeader = await overflow(page, first.theme);
    for (let i = 0; i < 4; i += 1) {
      await clear(page);
      for (const p of [others[0].players[0], others[0].players[1], others[1].players[0], others[1].players[1], others[2].players[i]]) await clickName(page, p);
      await submit(page);
      await sleep(700);
    }
    await waitComplete(page);
    await shot(page, `${tag}-3-lost`);
    const labels = [...board.groups.map(g => g.theme), ...(club ? [undated(club.theme)] : [])];
    r.lostHeaders = await headers(page, labels);
    r.lostFirstName = await nameCount(page, first.players[0]);
    if (!cf.oldSave || !club) return;
    /* the base code's save: the same log, the solved club group under its old label */
    const key = `${sp.slug}-daily-${DATE}`;
    const raw = await page.evaluate(k => localStorage.getItem(k), key);
    r.saveKey = raw ? key : `MISSING ${key}`;
    if (!raw) return;
    const save = JSON.parse(raw);
    const ok = save.guesses.find(a => a.t === 'ok' && a.theme === club.theme);
    r.saveHadNewLabel = !!ok;
    if (!ok) return;
    ok.theme = undated(club.theme);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(save)]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitComplete(page);
    await sleep(800);
    await shot(page, `${tag}-4-oldsave-lost`);
    r.oldLostHeaders = await headers(page, labels);
    r.oldLostFirstName = await nameCount(page, first.players[0]);
    r.oldLostText = (await page.evaluate(() => document.body.innerText.match(/Found\s*\d\s*\/4 groups[^\n]*/)?.[0] ?? null));
    /* playing: only the old label solved, then finish the board */
    const playing = { ...save, guesses: [ok], gameStatus: 'playing' };
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(playing)]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('button').length > 15, null, { timeout: 15000 });
    await sleep(800);
    await shot(page, `${tag}-5-oldsave-playing`);
    r.playingTiles = await page.evaluate(ns => [...document.querySelectorAll('button')].filter(b => ns.includes((b.getAttribute('aria-label') || b.textContent || '').trim())).length, board.groups.flatMap(g => g.players));
    for (const g of others) { await clear(page); for (const p of g.players) await clickName(page, p); await submit(page); await sleep(500); }
    await waitComplete(page);
    await shot(page, `${tag}-6-oldsave-won`);
    r.oldWonHeaders = await headers(page, labels);
    r.oldWonText = (await page.evaluate(() => document.body.innerText.match(/(All Groups Found|Found\s*\d\s*\/4 groups)[^\n]*/)?.[0] ?? null));
  } catch (e) {
    r.errors.push(`WALK ${String(e.message).split('\n')[0].slice(0, 240)}`);
    await shot(page, `${tag}-x-error`).catch(() => {});
  } finally {
    await ctx.close();
  }
}

for (const sp of SPORTS) for (const cf of CONFIGS) await flow(sp, cf);
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(results, null, 1));
for (const r of results) console.log(JSON.stringify(r).slice(0, 900));
console.log(`WALK DONE ${results.length} flows, ${results.filter(r => r.errors.length).length} with errors`);
