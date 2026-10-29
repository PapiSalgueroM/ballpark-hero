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

const VIEWS = [[390, 844, 'reduce'], [390, 844, 'no-preference'], [1280, 900, 'reduce'], [1280, 900, 'no-preference'], [1318, 647, 'banner']];
for (const sport of ['nba', 'nfl', 'mlb', 'nhl']) for (const v of VIEWS) {
  if (sport !== 'nba' && v[1] !== 844) continue; // all four sports at 390; NBA (report A and B) at every view
  const motion = v[2] === 'banner' ? 'no-preference' : v[2];
  const tag = `${sport}-${v[0]}x${v[1]}-${v[2]}`;
  const { ctx, page } = await open(BASE, sport, v, motion, v[2] === 'banner');
  await enter(page);
  await shot(page, `${tag}-hub`); await cover(page, `${tag} hub`);
  /* B on the season length path: one season under the cap. */
  const anim = await seedB(page, sport);
  const ext = await text(page, '[data-extension-talk]'), why = await text(page, '[data-extension-why]');
  const offer = await has(page, '[data-ext-sign]');
  log({ tag, state: 'B', offer, anim, why, ext: ext.slice(0, 420) });
  if (!offer && !/whatever happens, so no market opens after it/.test(ext)) problem(`${tag}: no offer before the capped season, and the card does not say it is the last`);
  if (!offer && /reach free agency/.test(ext)) problem(`${tag}: the capped season still promises free agency`);
  if (motion === 'reduce' && anim && anim.name !== 'none' && Number(anim.opacity) < 1) problem(`${tag}: the reason card animates under reduced motion ${JSON.stringify(anim)}`);
  await shot(page, `${tag}-B-extension`); await full(page, `${tag}-B-extension`); await cover(page, `${tag} B-extension`);
  if (!offer && await clickBtn(page, /^Retire now$/)) {
    await shot(page, `${tag}-B-retire-dialog`);
    await confirmIn(page, 'Retire this player?', 'Retire this player');
    const restarts = await page.evaluate(() => [...document.querySelectorAll('main button')].filter(b => /^(New career|Start over)$/.test((b.textContent || '').trim())).length);
    const saved = await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k) || 'null'); return s && { retired: s.c.retired, phase: s.phase, talk: !!s.contractTalk, seasons: s.c.seasons.length }; }, KEY(sport));
    log({ tag, state: 'B-retired', restarts, saved });
    if (!saved?.retired || saved.phase !== 'retired' || saved.talk) problem(`${tag}: Retire now left ${JSON.stringify(saved)}`);
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
    await shot(page, `${tag}-B-retired`); await full(page, `${tag}-B-retired`); await cover(page, `${tag} B-retired`);
  }
  await ctx.close();
}

/* Free agency for a veteran, Retire instead, at 390 and 1280 in NBA. */
for (const v of [[390, 844, 'reduce'], [1280, 900, 'no-preference']]) {
  const tag = `nba-${v[0]}x${v[1]}-${v[2]}`;
  const { ctx, page } = await open(BASE, 'nba', v, v[2], false);
  await enter(page);
  await edit(page, 'nba', 'const L = s.c.seasons[s.c.seasons.length - 1]; while (s.c.seasons.length < 8) s.c.seasons.push({ ...L }); s.c.contractYears = 0; delete s.contractTalk; s.phase = "season";');
  await clickBtn(page, /^Play the \d+ season$/); await page.waitForTimeout(1200);
  const fa = await has(page, '[data-fa-window]');
  const pos = await page.evaluate(() => { const r = document.querySelector('[data-career-market-retire]')?.getBoundingClientRect(); return r ? { top: Math.round(r.top + scrollY), docH: document.documentElement.scrollHeight } : null; });
  log({ tag, state: 'FA', fa, retireInstead: pos });
  if (!fa || !pos) problem(`${tag}: no market or no Retire instead for an eight season veteran`);
  await shot(page, `${tag}-FA`); await full(page, `${tag}-FA`); await cover(page, `${tag} FA`);
  if (await clickBtn(page, /^Retire instead$/)) {
    await confirmIn(page, 'Retire this player?', 'Retire this player');
    const saved = await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k) || 'null'); return s && { retired: s.c.retired, phase: s.phase, talk: !!s.contractTalk }; }, 'nba-my-career-save-v1');
    log({ tag, state: 'FA-retired', saved });
    if (!saved?.retired || saved.talk) problem(`${tag}: Retire instead left ${JSON.stringify(saved)}`);
    await shot(page, `${tag}-FA-retired`);
  }
  await ctx.close();
}

/* Report C on screen: a strong player's playoff seasons, NFL and NBA at 390, until a credit or tough line shows. */
for (const sport of ['nfl', 'nba']) {
  const v = [390, 844, 'reduce'], tag = `${sport}-390x844-C`;
  const { ctx, page } = await open(BASE, sport, v, 'reduce', false);
  await enter(page);
  const seen = {};
  for (let season = 0; season < 9 && Object.keys(seen).length < 2; season++) {
    await edit(page, sport, 's.c.ovr = 90; s.c.age = 27; s.c.contractYears = 4; s.teamQuality = 99; delete s.contractTalk; s.phase = "season";');
    await clickBtn(page, /One more year/);
    await clickBtn(page, /^Play the \d+ season$/); await page.waitForTimeout(900);
    const rv = await text(page, '[data-season-reveal]');
    const kind = /held up your end/.test(rv) ? 'credit' : /A tough/.test(rv) ? 'tough' : /January football suited|Ice in October|Clutch|Playoff performer|different/.test(rv) ? 'riser' : null;
    log({ tag, season, kind, reveal: rv.slice(0, 360) });
    if (kind && !seen[kind]) { seen[kind] = 1; await shot(page, `${tag}-${kind}`); await full(page, `${tag}-${kind}`); await cover(page, `${tag} reveal-${kind}`); }
    for (let i = 0; i < 12 && !(await has(page, 'main button')) === false; i++) {
      if (await page.locator('main').getByRole('button', { name: /^Play the \d+ season$/ }).count()) break;
      if (!await advance(page)) break;
    }
  }
  await ctx.close();
}

/* Old saves: written by the BASE build (main f957b34ea) in four states, loaded into this build. */
if (OLD_BASE) {
  const v = [390, 844, 'reduce'];
  const dumps = {};
  const { ctx, page } = await open(OLD_BASE, 'nba', v, 'reduce', false);
  await enter(page);
  for (let i = 0; i < 60 && (await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}')?.c?.seasons?.length ?? 0, KEY('nba'))) < 2; i++) if (!await advance(page)) break;
  for (let i = 0; i < 12 && !(await page.locator('main').getByRole('button', { name: /^Play the \d+ season$/ }).count()); i++) if (!await advance(page)) break;
  const dump = async name => { dumps[name] = await page.evaluate(k => localStorage.getItem(k), KEY('nba')); };
  await dump('mid');
  await edit(page, 'nba', 's.c.contractYears = 0; delete s.contractTalk; s.phase = "season";');
  await clickBtn(page, /^Play the \d+ season$/); await page.waitForTimeout(1200);
  await dump('fa');
  await seedB(page, 'nba');
  await dump('ext');
  await clickBtn(page, /^Play the year out$/); await page.waitForTimeout(1500);
  for (let i = 0; i < 8 && await has(page, '[data-season-reveal]'); i++) await clickBtn(page, /^Continue$/);
  await page.waitForTimeout(800);
  await dump('retired');
  await ctx.close();
  log({ state: 'old-dumps', phases: Object.fromEntries(Object.entries(dumps).map(([k, s]) => { const j = JSON.parse(s || 'null'); return [k, j && { phase: j.phase, seasons: j.c.seasons.length, talk: j.contractTalk?.kind ?? null, retired: !!j.c.retired }]; })) });
  for (const [name, save] of Object.entries(dumps)) {
    const o = await open(BASE, 'nba', v, 'reduce', false);
    const errors = [];
    o.page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
    await o.page.evaluate(([k, s]) => localStorage.setItem(k, s), [KEY('nba'), save]);
    await o.page.reload(); await o.page.waitForTimeout(1500);
    const st = await o.page.evaluate(() => ({
      startOver: !!document.querySelector('[data-career-start-over] button'), fa: !!document.querySelector('[data-fa-window]'),
      ext: !!document.querySelector('[data-extension-talk]'), why: (document.querySelector('[data-extension-why]')?.textContent || '').slice(0, 160),
      broken: /Something went wrong|could not be read/i.test(document.body.innerText), create: !!document.querySelector('input[aria-label="Your player name"]'),
      buttons: [...document.querySelectorAll('main button')].map(b => (b.textContent || '').trim()).filter(Boolean).slice(0, 10),
    }));
    log({ state: `old-${name}`, ...st, errors });
    if (st.broken || st.create || errors.length || !st.startOver) problem(`old save ${name}: ${JSON.stringify({ ...st, errors })}`);
    await shot(o.page, `old-${name}`);
    await o.ctx.close();
  }
}
await browser.close();
console.log(`walkR ${problems ? 'FAIL' : 'DONE'}: ${problems} problems`);
process.exit(problems ? 1 : 0);
