/* Review walk for Round 1569 (never committed; sent as .rc/x/walkR.mjs). supabase.co blocked.
   Measures what the builder's walk did not: what the sticky Start over pill covers at every scroll
   position, the no offer card on the season length path in all four sports, Retire now and Retire
   instead to the retired card, the playoff credit line on screen, reduced motion on and off, and
   (with OLD_BASE set) saves written by the base build loaded into this build. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OLD_BASE = process.env.OLD_BASE || '';
const OUT = process.env.RC_OUT || path.resolve('.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const ROUTE = s => `/${s}-my-career`, KEY = s => `${s}-my-career-save-v1`;
/* One season under each sport's season cap, at an age under its age cap: the season length path. */
const LASTB = { nba: [20, 38], nfl: [18, 35], mlb: [20, 38], nhl: [21, 37] };
let problems = 0;
const log = o => console.log(JSON.stringify(o));
const problem = m => { problems++; console.log(`PROBLEM ${m}`); };
const browser = await chromium.launch();

async function open(base, sport, view, motion, banner) {
  const ctx = await browser.newContext({ viewport: { width: view[0], height: view[1] }, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(p => { try { localStorage.setItem(`rules-gate-seen:${p}`, '1'); } catch { /* */ } }, ROUTE(sport));
  const page = await ctx.newPage();
  await page.goto(base + ROUTE(sport)); await page.waitForTimeout(1500);
  if (!banner) {
    const reg = page.getByRole('region', { name: 'Cookie choices' });
    const btn = reg.getByRole('button', { name: /Reject|Decline|Necessary|Essential/i }).first();
    if (await btn.count()) await btn.click(); else if (await reg.getByRole('button').count()) await reg.getByRole('button').first().click();
  }
  return { ctx, page };
}
async function clickBtn(page, re) {
  const loc = page.locator('main').getByRole('button', { name: re }).first();
  if (await loc.count() && await loc.isVisible() && await loc.isEnabled()) { await loc.click(); await page.waitForTimeout(400); return true; }
  return false;
}
async function edit(page, sport, fn) {
  await page.evaluate(([k, f]) => { const s = JSON.parse(localStorage.getItem(k)); new Function('s', f)(s); delete s.c.summer; delete s.c.pendingRivalryEvent; delete s.c.pendingRivalryChoice; localStorage.setItem(k, JSON.stringify(s)); }, [KEY(sport), fn]);
  await page.reload(); await page.waitForTimeout(1300);
}
/* Everything the pill sits on, at every scroll position of this screen. */
async function cover(page, tag) {
  const hits = new Map();
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => innerHeight);
  const start = await page.evaluate(() => scrollY);
  for (let y = 0, i = 0; i < 14; i++, y += Math.round(vh * 0.4)) {
    await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(120);
    const found = await page.evaluate(() => {
      const pill = document.querySelector('[data-career-start-over] button');
      if (!pill) return { none: true };
      const r = pill.getBoundingClientRect();
      const bar = [...document.querySelectorAll('header, nav')].map(e => e.getBoundingClientRect()).filter(b => b.top <= 1 && b.height < 120 && b.width > innerWidth / 2).reduce((m, b) => Math.max(m, b.bottom), 0);
      const out = [];
      for (const el of document.querySelectorAll('main *')) {
        if (el === pill || pill.contains(el) || el.contains(pill) || el.closest('[data-career-start-over]')) continue;
        const interactive = el.matches('button, a, input, select, [role="button"], [role="tab"]');
        const leafText = !el.children.length && (el.textContent || '').trim().length > 0;
        if (!interactive && !leafText) continue;
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        const ix = Math.min(r.right, b.right) - Math.max(r.left, b.left), iy = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
        if (ix <= 2 || iy <= 2) continue;
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const atC = document.elementFromPoint(cx, cy);
        out.push({ interactive, text: (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40), area: Math.round(ix * iy), blockedCentre: !!atC && !!atC.closest('[data-career-start-over] button') });
      }
      return { pill: { top: Math.round(r.top), right: Math.round(r.right), h: Math.round(r.height) }, bar: Math.round(bar), out };
    });
    if (found.none) return { none: true };
    if (found.pill.top < found.bar - 1) problem(`${tag}: the pill top ${found.pill.top} sits under the bar ending ${found.bar}`);
    for (const o of found.out) { const k = `${o.interactive ? 'I' : 'T'}:${o.text}`; if (!hits.has(k) || hits.get(k).area < o.area) hits.set(k, { ...o, y }); }
    if (y + vh >= h) break;
  }
  await page.evaluate(v => scrollTo(0, v), start); await page.waitForTimeout(150);
  const list = [...hits.values()];
  for (const o of list) if (o.interactive && o.blockedCentre) problem(`${tag}: the pill blocks the centre of "${o.text}" at scroll ${o.y}`);
  log({ tag, covers: list.slice(0, 12) });
  return { list };
}
async function shot(page, name) { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); }
async function full(page, name) { await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true }); }
async function enter(page) { await page.locator('main button', { hasText: /^Enter the draft$/ }).click(); await page.waitForTimeout(900); }
async function advance(page) {
  if (await clickBtn(page, /^Continue$/)) return true;
  for (const sel of ['[data-rivalry-option="0"]', '[data-rivalry-event] button', '[data-ext-sign]', '[data-fa-sign="0"]', '[data-career-decision-option="0"]']) {
    const l = page.locator(sel).first();
    if (await l.count() && await l.isVisible() && await l.isEnabled()) { await l.click(); await page.waitForTimeout(350); return true; }
  }
  for (const re of [/^Play the year out$/, /One more year/, /^Play the \d+ season$/]) if (await clickBtn(page, re)) return true;
  return false;
}
const text = async (page, sel) => page.evaluate(s => (document.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim(), sel);
const has = async (page, sel) => page.evaluate(s => !!document.querySelector(s), sel);
async function confirmIn(page, name, button) {
  await page.getByRole('alertdialog', { name }).getByRole('button', { name: button }).click(); await page.waitForTimeout(900);
}
async function seedB(page, sport) {
  const [n, age] = LASTB[sport];
  await edit(page, sport, `const L = s.c.seasons[s.c.seasons.length - 1]; while (s.c.seasons.length < ${n}) s.c.seasons.push({ ...L }); s.c.seasons.length = ${n}; s.c.seasons.forEach((x, i) => { x.year = s.c.year - ${n} + i; x.age = ${age} - ${n} + 1 + i; }); s.c.age = ${age}; s.c.ovr = 70; s.c.contractYears = 1; delete s.contractTalk; s.phase = "season";`);
  await clickBtn(page, /One more year/);
  const play = page.locator('main').getByRole('button', { name: /^Play the \d+ season$/ }).first();
  await play.click();
  /* Straight after the tap, before any wait: is the reason card still animating? */
  const anim = await page.evaluate(() => { const w = document.querySelector('[data-extension-why]'); if (!w) return null; const cs = getComputedStyle(w); return { name: cs.animationName, opacity: cs.opacity, dur: cs.animationDuration }; });
  await page.waitForTimeout(1200);
  return anim;
}


/* walkR2: isolate the "This page broke" seen after Retire now and Retire instead in walkR. */
const errs = page => { const list = []; page.on('pageerror', e => list.push(`pageerror: ${String(e.stack || e).slice(0, 700)}`)); page.on('console', m => { if (m.type() === 'error') list.push(`console: ${m.text().slice(0, 400)}`); }); return list; };
const broke = async page => page.evaluate(() => /This page broke/.test(document.body.innerText));
const V = [390, 844, 'reduce'];
async function scenario(base, name, prepare, act) {
  const { ctx, page } = await open(base, 'nba', V, 'reduce', false);
  const list = errs(page);
  await enter(page);
  await prepare(page);
  const before = await broke(page);
  const acted = await act(page);
  await page.waitForTimeout(1500);
  const after = await broke(page);
  const saved = await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k) || 'null'); return s && { retired: s.c.retired, phase: s.phase, seasons: s.c.seasons.length }; }, KEY('nba'));
  const buttons = await page.evaluate(() => [...document.querySelectorAll('main button')].map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 8));
  log({ scenario: name, base, acted, before, after, saved, buttons, errors: list.slice(0, 6) });
  if (after) problem(`${name}: the page broke`);
  await shot(page, `R2-${name}`);
  await ctx.close();
  return list;
}
const SEED20 = 'const L = s.c.seasons[s.c.seasons.length - 1]; while (s.c.seasons.length < 20) s.c.seasons.push({ ...L }); s.c.seasons.forEach((x, i) => { x.year = s.c.year - 20 + i; x.age = 19 + i; }); s.c.age = 38; s.c.ovr = 70; s.c.contractYears = 1; delete s.contractTalk; s.phase = "season";';
const toExt = async page => { await clickBtn(page, /One more year/); await clickBtn(page, /^Play the \d+ season$/); await page.waitForTimeout(1200); };
const retireVia = re => async page => { if (!await clickBtn(page, re)) return false; await confirmIn(page, 'Retire this player?', 'Retire this player'); return true; };
/* A natural career: six real seasons through the board, no edits. */
let natural = null;
{
  const { ctx, page } = await open(BASE, 'nba', V, 'reduce', false);
  const list = errs(page);
  await enter(page);
  for (let i = 0; i < 200 && (await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}')?.c?.seasons?.length ?? 0, KEY('nba'))) < 6; i++) if (!await advance(page)) break;
  for (let i = 0; i < 12 && !(await page.locator('main').getByRole('button', { name: /^Play the \d+ season$/ }).count()); i++) if (!await advance(page)) break;
  natural = await page.evaluate(k => localStorage.getItem(k), KEY('nba'));
  const n = JSON.parse(natural || 'null');
  log({ scenario: 'natural-dump', seasons: n?.c?.seasons?.length, phase: n?.phase, broke: await broke(page), errors: list.slice(0, 4) });
  await ctx.close();
}
const load = (save, fn) => async page => {
  await page.evaluate(([k, s]) => localStorage.setItem(k, s), [KEY('nba'), save]);
  await page.reload(); await page.waitForTimeout(1200);
  if (fn) await edit(page, 'nba', fn);
};
await scenario(BASE, 'head-seed20-retire-now', async page => { await edit(page, 'nba', SEED20); await toExt(page); }, retireVia(/^Retire now$/));
await scenario(BASE, 'head-seed20-hang-up', async page => { await edit(page, 'nba', SEED20); await clickBtn(page, /One more year/); }, retireVia(/Hang them up now/));
if (natural) {
  await scenario(BASE, 'head-natural-retire-now', load(natural, 's.c.contractYears = 1; s.c.age = 40; s.c.ovr = 70; delete s.contractTalk; s.phase = "season";'), async page => { await toExt(page); return retireVia(/^Retire now$/)(page); });
  await scenario(BASE, 'head-natural-retire-instead', load(natural, 's.c.contractYears = 0; delete s.contractTalk; s.phase = "season";'), async page => { await clickBtn(page, /^Play the \d+ season$/); await page.waitForTimeout(1200); return retireVia(/^Retire instead$/)(page); });
  await scenario(BASE, 'head-natural-hang-up', load(natural, null), retireVia(/Hang them up now/));
}
if (OLD_BASE) {
  await scenario(OLD_BASE, 'base-seed20-hang-up', async page => { await edit(page, 'nba', SEED20); await clickBtn(page, /One more year/); }, retireVia(/Hang them up now/));
  if (natural) await scenario(OLD_BASE, 'base-natural-hang-up', load(natural, null), retireVia(/Hang them up now/));
}
await browser.close();
console.log(`walkR2 ${problems ? 'FAIL' : 'DONE'}: ${problems} problems`);
process.exit(problems ? 1 : 0);
