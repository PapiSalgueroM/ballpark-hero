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
      return { pill: { top: Math.round(r.top), right: Math.round(r.right), h: Math.round(r.height) }, bar: Math.round(bar), out, sticky: getComputedStyle(pill.closest('[data-career-start-over]')).position === 'sticky' };
    });
    if (found.none) return { none: true };
    if (found.sticky && found.pill.top < found.bar - 1) problem(`${tag}: the pill top ${found.pill.top} sits under the bar ending ${found.bar}`);
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

/* walkFix (Round 1569 fix run): where Start over sits now, measured, at the reviewers' scrolls. */
async function where(page) {
  return page.evaluate(() => {
    const p = document.querySelector('[data-career-start-over] button'); if (!p) return null;
    const r = p.getBoundingClientRect(), row = p.closest('[data-career-start-over]'), board = row.parentElement;
    const main = document.querySelector('main'), mr = main.getBoundingClientRect(), br = board.getBoundingClientRect();
    const col = main.querySelector('h1')?.parentElement?.getBoundingClientRect() ?? mr;
    return { pill: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], parent: board.tagName, parentIsMain: board === main,
      position: getComputedStyle(row).position, boardBottom: Math.round(br.bottom), colRight: Math.round(col.right), vh: innerHeight };
  });
}
for (const v of [[1280, 900], [1318, 647], [390, 844]]) {
  const tag = `nba-${v[0]}x${v[1]}`, wide = v[0] >= 1024;
  const { ctx, page } = await open(BASE, 'nba', v, 'reduce', v[0] === 1318);
  await enter(page);
  const top = await where(page);
  log({ tag, at: 'hub from the top', top });
  if (!top) problem(`${tag}: no Start over on the hub`);
  else {
    if (top.parentIsMain) problem(`${tag}: the pill's parent is the page main`);
    if (top.pill[1] < 44 || top.pill[3] > top.vh) problem(`${tag}: the pill is not on screen from the top (${top.pill})`);
    if (wide && top.pill[0] < top.colRight) problem(`${tag}: the pill sits over the column (left ${top.pill[0]}, column right ${top.colRight})`);
    if (!wide && top.position === 'sticky') problem(`${tag}: the pill is sticky on a phone`);
  }
  await shot(page, `F-${tag}-hub-top`);
  await seedB(page, 'nba');
  const covers = await cover(page, `${tag}-B`);
  if (covers.list?.length) problem(`${tag}: the pill overlaps ${covers.list.length} things in main (${covers.list.slice(0, 3).map(o => o.text).join(' | ')})`);
  for (const y of [360, 720, 1352]) { await page.evaluate(s => scrollTo(0, s), y); await page.waitForTimeout(250); const w = await where(page); log({ tag, y, w }); await shot(page, `F-${tag}-B-y${y}`);
    if (wide && w && (w.pill[1] < 44 || w.pill[0] < w.colRight)) problem(`${tag}: at scroll ${y} the pill is at ${w.pill}`); }
  await page.evaluate(() => scrollTo(0, 720)); await page.waitForTimeout(250);
  const inbox = await page.evaluate(() => { const b = [...document.querySelectorAll('main button')].find(x => /Inbox/.test(x.textContent || '')); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (inbox && inbox.y > 0 && inbox.y < v[1]) {
    await page.mouse.click(inbox.x, inbox.y); await page.waitForTimeout(500);
    const dialog = await page.getByRole('alertdialog', { name: 'Start a new career?' }).isVisible().catch(() => false);
    log({ tag, tapInboxCentre: inbox, restartDialog: dialog });
    if (dialog) problem(`${tag}: a tap on the Inbox tile centre at scroll 720 opened Start a new career?`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  } else log({ tag, inbox: 'not on screen at 720', inboxAt: inbox });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const guideY = Math.min(6000, h - v[1]);
  await page.evaluate(s => scrollTo(0, s), guideY); await page.waitForTimeout(250);
  const g = await where(page); log({ tag, at: `guide ${guideY}`, g }); await shot(page, `F-${tag}-guide-y${guideY}`);
  if (g && g.pill[3] > 44 && g.boardBottom < 0) problem(`${tag}: the pill is on screen over the guide (${g.pill}) with the board ended at ${g.boardBottom}`);
  await ctx.close();
}
/* 390 and 1280: free agency for a veteran, scrolled through the offers (the reviewer's screens). */
for (const v of [[390, 844], [1280, 900]]) {
  const tag = `nba-${v[0]}x${v[1]}-FA`;
  const { ctx, page } = await open(BASE, 'nba', v, 'reduce', false);
  await enter(page);
  await edit(page, 'nba', 'const L = s.c.seasons[s.c.seasons.length - 1]; while (s.c.seasons.length < 8) s.c.seasons.push({ ...L }); s.c.contractYears = 0; delete s.contractTalk; s.phase = "season";');
  await clickBtn(page, /^Play the \d+ season$/); await page.waitForTimeout(1200);
  const covers = await cover(page, tag);
  if (covers.list?.length) problem(`${tag}: the pill overlaps ${covers.list.length} things in main (${covers.list.slice(0, 3).map(o => o.text).join(' | ')})`);
  for (const y of [676, 1352]) { await page.evaluate(s => scrollTo(0, s), y); await page.waitForTimeout(250); await shot(page, `F-${tag}-y${y}`); }
  await ctx.close();
}
await browser.close();
console.log(`walkFix ${problems ? 'FAIL' : 'DONE'}: ${problems} problems`);
process.exit(problems ? 1 : 0);

