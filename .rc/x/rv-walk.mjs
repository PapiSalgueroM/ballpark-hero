/* Reviewer walk (never committed): NFL My Career's Season Center on a built site.
   BASE: the served build. RC_OUT: where screenshots and walk.json go. supabase.co is blocked. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? path.join(process.cwd(), '.tmp-fx', 'rv-shots');
fs.mkdirSync(OUT, { recursive: true });
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAVES = JSON.parse(fs.readFileSync(path.join(HERE, 'rv-saves-base.json'), 'utf8'));
const KEY = 'nfl-my-career-save-v1';
const log = [];
const say = (...a) => { const line = a.join(' '); log.push(line); console.log(line); };
const browser = await chromium.launch();
let aborted = 0;

async function open(value, cfg, { helpSeen = true, seed = 1147 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, reducedMotion: cfg.reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([k, v, seen, s]) => {
    let t = s >>> 0;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('rv-walk')) {
        sessionStorage.setItem('rv-walk', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem(k, v);
        if (seen) localStorage.setItem('seasonCentre:help:nfl', '1');
      }
    } catch { /* private mode */ }
  }, [KEY, value, helpSeen, seed]);
  await ctx.route(/supabase\.co/, r => { aborted += 1; return r.abort(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play the \d+ season|Continue/.test(b.textContent ?? '')), { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(800);
  /* a save between seasons can hold a card (a rivalry beat, a decision): a player presses through it to the hub */
  const trail = [];
  for (let i = 0; i < 30; i += 1) {
    const st = await page.evaluate(() => {
      const skip = /^(Back|Track stats|\?|Show all changes|Hide|Report a bug|Home)$/;
      const btns = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent !== null && !b.closest('header, nav, footer'));
      if (btns.some(b => /Play the \d+ season/.test(b.textContent ?? ''))) return 'hub';
      const dlg = [...document.querySelectorAll('[role="dialog"] button, [role="alertdialog"] button')].filter(b => !b.disabled);
      const lets = dlg.find(x => /Let's Play/.test(x.textContent ?? ''));
      if (lets) { lets.click(); return 'closed the how to play sheet'; }
      const cont = btns.find(b => /^(Continue|Next|On to|Got it|OK|Done)/.test((b.textContent ?? '').trim()));
      if (cont) { cont.click(); return `pressed "${(cont.textContent ?? '').trim().slice(0, 30)}"`; }
      const pick = btns.find(b => !skip.test((b.textContent ?? '').trim()));
      if (pick) { pick.click(); return `picked "${(pick.textContent ?? '').trim().slice(0, 40)}"`; }
      return 'stuck';
    });
    if (st === 'hub') break;
    trail.push(st);
    if (st === 'stuck') break;
    await page.waitForTimeout(450);
  }
  if (trail.length) say(`   on the way to the hub: ${trail.join(' > ').slice(0, 500)}`);
  for (let i = 0; i < 3; i += 1) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let's Play/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
    if (!had) break;
    await page.waitForTimeout(350);
  }
  return { ctx, page, errors };
}
const tag = cfg => `${cfg.w}${cfg.reduced ? 'r' : ''}`;
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82 }); };
const clickSel = (page, sel) => page.evaluate(s => { const b = document.querySelector(s); if (!b || b.disabled) return false; b.click(); return true; }, sel);
const clickText = (page, text, root = 'body') => page.evaluate(([t, r]) => {
  const b = [...document.querySelectorAll(`${r} button`)].find(x => !x.disabled && (x.textContent ?? '').includes(t));
  if (!b) return false;
  b.click();
  return true;
}, [text, root]);
const has = (page, sel) => page.evaluate(s => !!document.querySelector(s), sel);
const textOf = (page, sel) => page.evaluate(s => (document.querySelector(s)?.innerText ?? '').replace(/\s+/g, ' ').trim(), sel);
const until = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return Date.now() - t0; await new Promise(r => setTimeout(r, 80)); } return -1; };

/** What a careful eye would measure: sideways overflow, clipped text, and (reduced motion) anything still animating. */
const measure = (page, label) => page.evaluate(l => {
  const root = document.querySelector('[data-season-centre]') ?? document.body;
  const out = { label: l, vw: innerWidth, docOverflow: document.documentElement.scrollWidth - innerWidth, off: [], clipped: [], moving: [] };
  for (const el of root.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && (r.right > innerWidth + 1 || r.left < -1)) out.off.push(`${el.tagName} "${(el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.left)}..${Math.round(r.right)}`);
    if (own && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible') out.clipped.push(`${el.tagName} "${(el.textContent ?? '').trim().slice(0, 50)}" ${el.scrollWidth}>${el.clientWidth}`);
    if (cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0.011) out.moving.push(`${el.tagName}.${String(el.className).slice(0, 40)} ${cs.animationName} ${cs.animationDuration}`);
  }
  out.off = out.off.slice(0, 6); out.clipped = out.clipped.slice(0, 6); out.moving = [...new Set(out.moving)].slice(0, 8);
  return out;
}, label);
const report = async (page, label) => { const m = await measure(page, label); say(`MEASURE ${label}: docOverflow ${m.docOverflow}; off ${JSON.stringify(m.off)}; clipped ${JSON.stringify(m.clipped)}; moving ${JSON.stringify(m.moving)}`); return m; };
const stageBottom = page => page.evaluate(() => { const s = document.querySelector('[data-centre-stage]'); if (s) s.scrollTop = s.scrollHeight; });
const stageTop = page => page.evaluate(() => { const s = document.querySelector('[data-centre-stage]'); if (s) s.scrollTop = 0; });
const closeHelp = async page => { await clickText(page, 'Got it', '[data-season-centre]'); await page.waitForTimeout(250); };

/* ── Flow A: a rookie quarterback presses Week by week, at four configurations ── */
async function flowA(cfg, first) {
  const T = `A-${tag(cfg)}`;
  const { ctx, page, errors } = await open(SAVES['now-QB-0'].value, cfg, { helpSeen: !first });
  try {
    await page.evaluate(() => document.querySelector('[data-week-by-week]')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot(page, `${T}-1-hub`);
    say(`${T} entry reads: "${await textOf(page, '[data-season-centre-entry]')}"`);
    const before = await page.evaluate(k => localStorage.getItem(k), KEY);
    await clickSel(page, '[data-week-by-week]');
    const opened = await until(() => has(page, '[data-season-centre]'), 25000);
    say(`${T} viewer opened after ${opened} ms`);
    await page.waitForTimeout(700);
    const pressed = await page.evaluate(k => localStorage.getItem(k), KEY);
    say(`${T} the press saved a season: ${before !== pressed}`);
    if (first) {
      const helpOpen = await page.evaluate(() => [...document.querySelectorAll('[data-season-centre] [role="dialog"]')].some(d => /How the Season Center works/.test(d.getAttribute('aria-label') ?? '')));
      say(`${T} first visit: the how to sheet opened by itself: ${helpOpen}`);
      await shot(page, `${T}-2-help-first`);
      say(`${T} HELP TEXT: ${(await page.evaluate(() => [...document.querySelectorAll('[data-season-centre] [role="dialog"]')].map(d => d.innerText).pop() ?? '')).replace(/\s+/g, ' ').slice(0, 2600)}`);
      await page.evaluate(() => { const d = [...document.querySelectorAll('[data-season-centre] [role="dialog"]')].pop(); if (d) d.scrollTop = d.scrollHeight; });
      await page.waitForTimeout(200);
      await shot(page, `${T}-2b-help-bottom`);
      await report(page, `${T} help`);
      await closeHelp(page);
    }
    await shot(page, `${T}-3-kickoff`);
    say(`${T} KICKOFF CARD: ${(await textOf(page, '[data-centre-stage]')).slice(0, 500)}`);
    say(`${T} HEADER: ${await textOf(page, '[data-centre-header]')}`);
    await report(page, `${T} kickoff`);
    const t0 = Date.now();
    await clickText(page, 'Kick off', '[data-season-centre]');
    await page.waitForTimeout(cfg.reduced ? 300 : 1500);
    await shot(page, `${T}-4-game1-early`);
    const earlyFt = await has(page, '[data-full-time]');
    say(`${T} ${Date.now() - t0} ms after kick off: full time shown ${earlyFt}; feed lines ${await page.evaluate(() => document.querySelectorAll('[data-clock-events] li').length)}`);
    if (cfg.reduced) await report(page, `${T} game1 reduced`);
    if (!earlyFt) await clickText(page, '3x', '[data-centre-bar]');
    const ftMs = await until(() => has(page, '[data-full-time]'), 120000);
    say(`${T} full time after ${ftMs} ms more`);
    await page.waitForTimeout(600);
    await shot(page, `${T}-5-game1-final`);
    say(`${T} GAME 1 STAGE: ${(await textOf(page, '[data-centre-stage]')).slice(0, 900)}`);
    say(`${T} GAME 1 FEED: ${await textOf(page, '[data-clock-events]')}`);
    say(`${T} HIS LINE: ${await textOf(page, '[data-his-line]')}`);
    await report(page, `${T} game1 final`);
    await stageBottom(page); await page.waitForTimeout(200);
    await shot(page, `${T}-5b-game1-final-bottom`);
    await stageTop(page);
    /* the next games at Results speed */
    await clickText(page, 'Results', '[data-centre-bar]');
    for (let g = 2; g <= 4; g += 1) { await clickText(page, `Game ${g}`, '[data-centre-bar]'); await until(() => has(page, '[data-full-time]'), 8000); await page.waitForTimeout(250); }
    await shot(page, `${T}-6-game4-results`);
    say(`${T} GAME 4 FEED: ${await textOf(page, '[data-clock-events]')}`);
    const big = await clickText(page, 'To the next big game', '[data-centre-bar]');
    await page.waitForTimeout(700);
    await shot(page, `${T}-7-next-big`);
    say(`${T} next big (${big}): ${(await textOf(page, '[data-centre-stage]')).slice(0, 400)}`);
    await report(page, `${T} poster`);
    if (cfg.w < 768) {
      const logOpen = await clickSel(page, '[data-game-log-open]');
      await page.waitForTimeout(300);
      if (logOpen) { await stageBottom(page); await page.waitForTimeout(200); await shot(page, `${T}-7b-log`); say(`${T} LOG: ${(await textOf(page, '[data-game-log]')).slice(0, 700)}`); await report(page, `${T} log`); }
      const fx = await clickSel(page, '[data-centre-fixtures]');
      await page.waitForTimeout(300);
      if (fx) { await shot(page, `${T}-7c-schedule`); say(`${T} SCHEDULE: ${(await textOf(page, '[data-centre-stage]')).slice(0, 900)}`); await report(page, `${T} schedule`); await clickText(page, 'Back', '[data-centre-stage]'); await page.waitForTimeout(200); }
    }
    await clickText(page, 'Sim the rest', '[data-centre-bar]');
    await until(() => has(page, '[data-review]'), 8000);
    await page.waitForTimeout(cfg.reduced ? 300 : 2200);
    await stageTop(page);
    await shot(page, `${T}-8-review`);
    say(`${T} REVIEW: ${(await textOf(page, '[data-centre-stage]')).slice(0, 1500)}`);
    await report(page, `${T} review`);
    await stageBottom(page); await page.waitForTimeout(250);
    await shot(page, `${T}-8b-review-bottom`);
    await page.evaluate(() => [...document.querySelectorAll('[data-season-centre] button')].find(b => b.textContent.trim() === '?')?.click());
    await page.waitForTimeout(350);
    await shot(page, `${T}-9-help`);
    await report(page, `${T} help again`);
    await closeHelp(page);
    await clickSel(page, '[data-centre-exit]');
    await page.waitForTimeout(900);
    const after = await page.evaluate(k => localStorage.getItem(k), KEY);
    say(`${T} after watching and closing the save is the bytes the press saved: ${after === pressed}`);
    await page.evaluate(() => (document.querySelector('[data-watch-last]') ?? document.querySelector('[data-week-by-week]'))?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot(page, `${T}-10-hub-after`);
    say(`${T} entry after: "${await textOf(page, '[data-season-centre-entry]')}"; watch again ${await has(page, '[data-watch-last]')}`);
  } catch (e) { say(`${T} WALK ERROR: ${String(e).slice(0, 300)}`); await shot(page, `${T}-ERROR`).catch(() => {}); }
  say(`${T} errors: ${JSON.stringify(errors)}`);
  await ctx.close();
}

/* ── Flow B: every position opens last season from the hub (Watch again), game one and the review ── */
async function watchLast(T, value, cfg, { games = 1 } = {}) {
  const { ctx, page, errors } = await open(value, cfg);
  const out = { opened: false, watch: false };
  try {
    out.watch = await has(page, '[data-watch-last]');
    out.week = await has(page, '[data-week-by-week]');
    out.held = await textOf(page, '[data-season-centre-held]');
    say(`${T} hub: watch again ${out.watch}, week by week ${out.week}, held line "${out.held}", entry "${await textOf(page, '[data-season-centre-entry]')}"`);
    await page.evaluate(() => (document.querySelector('[data-watch-last]') ?? document.querySelector('[data-season-centre-entry]'))?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(250);
    await shot(page, `${T}-1-hub`);
    if (!out.watch) { say(`${T} errors: ${JSON.stringify(errors)}`); await ctx.close(); return out; }
    await clickSel(page, '[data-watch-last]');
    out.opened = (await until(() => has(page, '[data-season-centre]'), 25000)) >= 0;
    await page.waitForTimeout(600);
    if (!out.opened) { say(`${T} DID NOT OPEN; failed tile ${await has(page, '[data-season-centre-failed]')}; page: ${(await textOf(page, 'body')).slice(0, 300)}`); await shot(page, `${T}-2-not-open`); }
    else {
      const tile = await has(page, '[data-centre-tile]');
      if (tile) { say(`${T} CENTRE TILE: ${await textOf(page, '[data-season-centre]')}`); await shot(page, `${T}-2-tile`); }
      else {
        say(`${T} KICKOFF: ${(await textOf(page, '[data-centre-stage]')).slice(0, 300)}`);
        await clickText(page, 'Kick off', '[data-season-centre]');
        await page.waitForTimeout(150);
        await clickText(page, 'Results', '[data-centre-bar]');
        await until(() => has(page, '[data-full-time]'), 10000);
        for (let g = 2; g <= games; g += 1) { await clickText(page, `Game ${g}`, '[data-centre-bar]'); await page.waitForTimeout(200); await until(() => has(page, '[data-full-time]'), 8000); }
        await page.waitForTimeout(300);
        await shot(page, `${T}-2-game`);
        say(`${T} GAME: ${(await textOf(page, '[data-centre-stage]')).slice(0, 700)}`);
        say(`${T} FEED: ${await textOf(page, '[data-clock-events]')}`);
        say(`${T} HIS LINE: ${await textOf(page, '[data-his-line]')}`);
        await report(page, `${T} game`);
        await clickText(page, 'Sim the rest', '[data-centre-bar]');
        await until(() => has(page, '[data-review]'), 8000);
        await page.waitForTimeout(2200);
        await stageTop(page);
        await shot(page, `${T}-3-review`);
        say(`${T} REVIEW: ${(await textOf(page, '[data-centre-stage]')).slice(0, 1600)}`);
        await report(page, `${T} review`);
        await stageBottom(page); await page.waitForTimeout(250);
        await shot(page, `${T}-3b-review-bottom`);
        if (cfg.w < 768 && await clickSel(page, '[data-game-log-open]')) { await page.waitForTimeout(300); await stageBottom(page); await page.waitForTimeout(200); await shot(page, `${T}-4-log`); say(`${T} LOG: ${(await textOf(page, '[data-game-log]')).slice(0, 900)}`); await report(page, `${T} log`); }
      }
    }
  } catch (e) { say(`${T} WALK ERROR: ${String(e).slice(0, 300)}`); await shot(page, `${T}-ERROR`).catch(() => {}); }
  say(`${T} errors: ${JSON.stringify(errors)}`);
  await ctx.close();
  return out;
}

/* ── Flow D: older shapes of the last saved line ── */
const edit = (value, fn) => { const s = JSON.parse(value); fn(s.c.seasons[s.c.seasons.length - 1], s.c); return JSON.stringify(s); };

const PHONE = { w: 390, h: 844, reduced: false };
const DESK = { w: 1280, h: 900, reduced: false };
const only = process.env.RV_ONLY ?? '';
const run = async (name, fn) => { if (only && !only.split(',').some(p => name.startsWith(p))) return; const t = Date.now(); await fn(); say(`-- ${name} took ${Date.now() - t} ms`); };

await run('A-390', () => flowA(PHONE, true));
await run('A-390r', () => flowA({ ...PHONE, reduced: true }, false));
await run('A-1280', () => flowA(DESK, false));
await run('A-1280r', () => flowA({ ...DESK, reduced: true }, false));
for (const pos of ['K', 'LB', 'WR', 'RB', 'TE', 'CB', 'EDGE', 'QB']) await run(`B-${pos}`, () => watchLast(`B-${pos}-390`, SAVES[`now-${pos}-3`].value, PHONE, { games: 2 }));
await run('B-K-1280', () => watchLast('B-K-1280', SAVES['now-K-3'].value, DESK, { games: 2 }));
await run('B-EDGE-1280', () => watchLast('B-EDGE-1280', SAVES['now-EDGE-3'].value, DESK, { games: 2 }));
await run('C-held-0', () => watchLast('C-held-rookie-390', SAVES['y2005-QB-0'].value, PHONE));
await run('C-held-2', () => watchLast('C-held-2seasons-390', SAVES['y2005-QB-2'].value, PHONE));
await run('C-held-1280', () => watchLast('C-held-rookie-1280', SAVES['y2005-QB-0'].value, DESK));
const QB3 = SAVES['now-QB-3'].value;
await run('D1', () => watchLast('D1-no-po-fields-390', edit(QB3, l => { delete l.poGames; delete l.poLine; l.teamResult = 'Lost in the Divisional round'; }), PHONE));
await run('D2', () => watchLast('D2-unknown-result-390', edit(QB3, l => { l.teamResult = 'Made the playoffs'; delete l.poGames; delete l.poLine; }), PHONE));
await run('D3', () => watchLast('D3-no-passYds-390', edit(QB3, l => { delete l.passYds; delete l.ints; }), PHONE));
await run('D4', () => watchLast('D4-suspended-390', edit(QB3, l => { l.teamResult = 'SUSPENDED'; l.games = 0; }), PHONE));
await run('D5', () => watchLast('D5-no-role-no-awards-390', edit(QB3, (l, c) => { delete c.role; delete l.awards; delete l.salary; }), PHONE));
await run('D6', () => watchLast('D6-kicker-no-long-390', edit(SAVES['now-K-3'].value, l => { delete l.longFg; delete l.fgAtt; }), PHONE));
await run('D7', () => watchLast('D7-champion-390', edit(QB3, l => { l.teamResult = 'WON THE SUPER BOWL'; l.poGames = 4; l.poLine = '1104 yds, 9 TD, 2 INT'; }), PHONE));
await run('D8', () => watchLast('D8-po-mismatch-390', edit(QB3, l => { l.teamResult = 'Lost the Super Bowl'; l.poGames = 2; l.poLine = '512 yds, 4 TD, 1 INT'; }), PHONE));

/* ── Flow E: saves the engine made whose last season shows what the probe counted ── */
const FOUND_FILE = path.join(HERE, 'rv-saves-found.json');
const FOUND = fs.existsSync(FOUND_FILE) ? JSON.parse(fs.readFileSync(FOUND_FILE, 'utf8')) : {};
for (const name of Object.keys(FOUND)) await run(`E-${name}`, () => watchLast(`E-${name}-390`, FOUND[name].value, PHONE, { games: 1 }));
if (FOUND['K-contra']) await run('E-K-contra-1280', () => watchLast('E-K-contra-1280', FOUND['K-contra'].value, DESK, { games: 1 }));
if (FOUND['QB-520']) await run('E-QB-520-1280', () => watchLast('E-QB-520-1280', FOUND['QB-520'].value, DESK, { games: 1 }));

say(`supabase requests aborted: ${aborted}`);
fs.writeFileSync(path.join(OUT, 'walk.txt'), log.join('\n'));
await browser.close();
