/* Round 1569 browser walk on the served build (never committed; sent to a runner as .rc/x/walk1569.mjs).
   supabase.co is blocked. Prints one JSON line per measured screen and writes screenshots into $RC_OUT.
   SPORTS (default nba) and STAGE (diag or proof) pick what is walked. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const SPORTS = (process.env.SPORTS || 'nba').split(',');
const ROUTE = { nba: '/nba-my-career', nfl: '/nfl-my-career', mlb: '/mlb-my-career', nhl: '/nhl-my-career' };
const KEY = { nba: 'nba-my-career-save-v1', nfl: 'nfl-my-career-save-v1', mlb: 'mlb-my-career-save-v1', nhl: 'nhl-my-career-save-v1' };
const VIEWS = [[1318, 647, 'up'], [1318, 647, 'dismissed'], [390, 844, 'dismissed'], [1280, 900, 'dismissed']];
const RESTART = /^(New career|Start over)$/;
let problems = 0;
const log = o => console.log(JSON.stringify(o));
const browser = await chromium.launch();

/* Where the screen can be read: below every fixed or sticky bar at the top, above the cookie banner. */
async function band(page) {
  return page.evaluate(() => {
    let top = 0;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.top <= 1 && r.bottom < innerHeight / 2 && r.width > innerWidth / 2) top = Math.max(top, r.bottom);
    }
    const cookie = document.querySelector('[aria-label="Cookie choices"]');
    const bottom = cookie && cookie.getBoundingClientRect().height > 0 ? cookie.getBoundingClientRect().top : innerHeight;
    return { top: Math.round(top), bottom: Math.round(bottom), h: innerHeight, scrollY: Math.round(scrollY) };
  });
}
async function restartControls(page) {
  const b = await band(page);
  const found = await page.evaluate(src => {
    const re = new RegExp(src);
    return [...document.querySelectorAll('main button')].filter(x => re.test((x.textContent || '').replace(/\s+/g, ' ').trim()))
      .map(x => { const r = x.getBoundingClientRect(); return { text: x.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
  }, RESTART.source);
  return { band: b, found, onScreen: found.some(f => f.top >= b.top && f.bottom <= b.bottom) };
}
async function screen(page) {
  return page.evaluate(() => {
    const t = s => !!document.querySelector(s);
    if (t('[data-season-reveal]')) return 'reveal';
    if (t('[data-fa-window]')) return 'freeagency';
    if (t('[data-extension-talk]')) return 'extension';
    if (t('[data-career-decision-event]')) return 'event';
    if (t('[data-rivalry-event]') || t('[data-rivalry-choice]')) return 'rivalry';
    if (t('[data-career-decision-outcome]')) return 'outcome';
    if ([...document.querySelectorAll('main button')].some(b => /Go after a coaching job|Resume coaching/.test(b.textContent))) return 'retired';
    if ([...document.querySelectorAll('main button')].some(b => /Back to retirement|Retire from coaching/.test(b.textContent))) return 'coach';
    const txt = document.querySelector('main')?.textContent || '';
    if ([...document.querySelectorAll('main button')].some(b => b.textContent.trim() === 'Review seasons')) return 'retired';
    if (t('input[aria-label="Your player name"]')) return 'create';
    if (/One more year/.test(txt) && /Retire now/.test(txt)) return 'talk';
    if ([...document.querySelectorAll('main button')].some(b => /^Play the \d+ season$/.test(b.textContent.trim()))) return 'hub';
    return 'other';
  });
}
async function clickFirst(page, patterns) {
  for (const p of patterns) {
    const loc = typeof p === 'string' ? page.locator(p).first() : page.locator('main').getByRole('button', { name: p }).first();
    if (await loc.count() && await loc.isVisible() && await loc.isEnabled()) { await loc.click(); await page.waitForTimeout(250); return true; }
  }
  return false;
}
const ADVANCE = [/^Continue$/, '[data-rivalry-option="0"]', '[data-rivalry-event] button', '[data-ext-sign]', '[data-fa-sign="0"]', '[data-career-decision-option="0"]', /^Play the year out$/, /One more year/, /^Play the \d+ season$/];
async function seasons(page, key) { return page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}')?.c?.seasons?.length ?? 0, key); }
async function edit(page, key, fn) {
  await page.evaluate(([k, f]) => { const s = JSON.parse(localStorage.getItem(k)); new Function('s', f)(s); delete s.c.summer; delete s.c.pendingRivalryEvent; delete s.c.pendingRivalryChoice; localStorage.setItem(k, JSON.stringify(s)); }, [key, fn]);
  await page.reload(); await page.waitForTimeout(1200);
}
const PROOF = process.env.STAGE === 'proof';
async function measure(page, sport, view, state) {
  await page.waitForTimeout(700);
  const r = await restartControls(page);
  const kind = await screen(page);
  const shot = `${sport}-${view[0]}x${view[1]}-${view[2]}-${state}.png`;
  await page.screenshot({ path: path.join(OUT, shot) });
  let tap1 = null;
  if (PROOF && kind !== 'create') {
    /* Tap one opens the confirmation; Keep this career closes it and changes nothing. */
    const so = page.locator('[data-career-start-over] button').first();
    if (await so.count()) {
      await so.click(); await page.waitForTimeout(300);
      tap1 = await page.getByRole('alertdialog', { name: 'Start a new career?' }).isVisible();
      await page.getByRole('button', { name: 'Keep this career' }).click(); await page.waitForTimeout(300);
    }
    if (!r.onScreen || !tap1) { problems++; console.log(`PROBLEM ${sport} ${view.join(' ')} ${state}: on screen ${r.onScreen}, dialog ${tap1}`); }
  }
  log({ sport, view: `${view[0]}x${view[1]}`, banner: view[2], state, screen: kind, restart: r.found.length, onScreen: r.onScreen, tap1, band: r.band, found: r.found, shot });
  return r;
}

for (const sport of SPORTS) for (const view of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: view[0], height: view[1] }, bypassCSP: true });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(p => { try { localStorage.setItem(`rules-gate-seen:${p}`, '1'); } catch { /* blocked */ } }, ROUTE[sport]);
  const page = await ctx.newPage();
  await page.goto(BASE + ROUTE[sport]); await page.waitForTimeout(1500);
  if (view[2] === 'dismissed') { const c = page.getByRole('region', { name: 'Cookie choices' }).getByRole('button').first(); if (await c.count()) await c.click(); }
  await page.locator('main button', { hasText: /^Enter the draft$/ }).click(); await page.waitForTimeout(800);
  await measure(page, sport, view, 'hub-new');
  const seen = new Set(['hub']);
  for (let i = 0; i < 160 && (await seasons(page, KEY[sport])) < 6; i++) {
    const kind = await screen(page);
    if (!seen.has(kind)) { seen.add(kind); await measure(page, sport, view, `midcareer-${kind}`); }
    if (!await clickFirst(page, ADVANCE)) break;
  }
  if (!PROOF) await page.evaluate(() => scrollTo(0, 0));
  await measure(page, sport, view, `midcareer-${await screen(page)}`);
  await edit(page, KEY[sport], 's.c.contractYears = 0; delete s.contractTalk; s.phase = "season";');
  await clickFirst(page, [/^Play the \d+ season$/]); await page.waitForTimeout(1200);
  await measure(page, sport, view, 'freeagency');
  await clickFirst(page, ['[data-fa-sign="0"]']);
  await edit(page, KEY[sport], 's.c.contractYears = 1; delete s.contractTalk;');
  await clickFirst(page, [/^Play the \d+ season$/]); await page.waitForTimeout(1200);
  await measure(page, sport, view, 'extension');
  /* B: a twentieth season ahead, age 39, a rating the market barely wants. */
  await edit(page, KEY[sport], `const L = s.c.seasons[s.c.seasons.length - 1]; while (s.c.seasons.length < 20) s.c.seasons.push({ ...L }); s.c.seasons.forEach((x, i) => { x.year = s.c.year - 20 + i; x.age = 19 + i; }); s.c.age = 39; s.c.ovr = 70; s.c.contractYears = 1; delete s.contractTalk; s.phase = "season";`);
  const talk = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  log({ sport, view: `${view[0]}x${view[1]}`, state: 'B-before-play', screen: await screen(page), talk: /One more year/.test(talk), text: talk.slice(0, 300) });
  await clickFirst(page, [/One more year/]); await page.waitForTimeout(600);
  await clickFirst(page, [/^Play the \d+ season$/]); await page.waitForTimeout(1200);
  const ext = await page.evaluate(() => ({ text: (document.querySelector('[data-extension-talk]')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500), buttons: [...document.querySelectorAll('[data-extension-talk] button, main button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 12) }));
  log({ sport, view: `${view[0]}x${view[1]}`, state: 'B-extension-season21', ...ext });
  await measure(page, sport, view, 'B-extension');
  await clickFirst(page, [/^Play the year out$/, /^Turn it down/]); await page.waitForTimeout(1500);
  for (let i = 0; i < 6 && (await screen(page)) === 'reveal'; i++) await clickFirst(page, [/^Continue$/]);
  await page.waitForTimeout(1500);
  const after = await screen(page);
  log({ sport, view: `${view[0]}x${view[1]}`, state: 'B-after-year-out', screen: after, text: (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300) });
  if (!PROOF) { await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300); }
  await measure(page, sport, view, `retired-${after}`);
  if (PROOF) {
    await clickFirst(page, [/Go after a coaching job/]); await page.waitForTimeout(800);
    await measure(page, sport, view, 'coach');
    /* The whole rule once: two taps from the coaching career to the draft screen, this save gone, the other kept. */
    await page.evaluate(() => localStorage.setItem('walk-1569-other', 'kept'));
    await page.locator('[data-career-start-over] button').first().click(); await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Start new career' }).click(); await page.waitForTimeout(800);
    const after2 = await page.evaluate(([k]) => ({ save: localStorage.getItem(k), other: localStorage.getItem('walk-1569-other'), draft: !!document.querySelector('input[aria-label="Your player name"]') }), [KEY[sport]]);
    if (after2.save !== null || after2.other !== 'kept' || !after2.draft) { problems++; console.log(`PROBLEM ${sport} ${view.join(' ')}: two taps left ${JSON.stringify(after2)}`); }
    log({ sport, view: `${view[0]}x${view[1]}`, state: 'two-taps-from-coach', ...after2 });
    await clickFirst(page, [/Play your road to the draft/]); await page.waitForTimeout(800);
    await measure(page, sport, view, 'prospect');
  }
  await page.evaluate(k => localStorage.setItem(k, '{not json'), KEY[sport]); await page.reload(); await page.waitForTimeout(1200);
  await measure(page, sport, view, 'unreadable');
  await ctx.close();
}
await browser.close();
console.log(`walk1569 ${problems ? 'FAIL' : 'DONE'}: ${problems} problems`);
process.exit(problems ? 1 : 0);
