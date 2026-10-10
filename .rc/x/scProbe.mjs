// Reviewer sc-screens, Release AT. Probe: does the page stay put when a new dialog closes, from where a thumb finds its tile?
// RUNNER ONLY, never committed. usage: node scProbe.mjs <saves.json>   env BASE, RC_OUT
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/sc-probe-out';
fs.mkdirSync(OUT, { recursive: true });
const saves = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const TAG = process.env.SC_TAG || 'new-home';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = (label, value) => console.log(`${label} :: ${JSON.stringify(value)}`);
const browser = await chromium.launch();
const TRIGGERS = ['[data-season-ambition]', '[data-preseason-plan]', '[data-career-mentor-tile]', '[data-career-records-tile]',
  '[data-open-derby-history]', '[data-open-season-ratings]', '[data-open-career-story]', '[data-trophy-category]'];

async function open({ width = 390, height = 844, touch = true, reduce = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  await context.route(/supabase\.co/, route => route.abort());
  await context.addInitScript(save => {
    if (!sessionStorage.getItem('rev-seeded')) { sessionStorage.setItem('rev-seeded', '1'); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerCareerSave', save); }
  }, JSON.stringify(saves[TAG]));
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!document.querySelector('[data-season-ambition]'), null, { timeout: 45000 }).catch(() => {});
  await sleep(1500);
  return { context, page };
}
// where the page is, where the trigger is, and what a thumb would hit at the trigger's middle
const state = (page, sel) => page.evaluate(sel => {
  const el = document.querySelector(sel); if (!el) return null;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, Math.min(Math.max(cy, 1), innerHeight - 1));
  const a = document.activeElement;
  return { y: Math.round(scrollY), top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight,
    midHit: top ? (el.contains(top) ? 'trigger' : `${top.tagName.toLowerCase()}:${(top.textContent || '').trim().slice(0, 24)}`) : 'nothing',
    focusOnTrigger: a === el || el.contains(a), bodyOverflow: document.body.style.overflow };
}, sel);
const dialogUp = page => page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 6000 }).then(() => true, () => false);
const dialogGone = page => page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 6000 }).then(() => true, () => false);

// A. the tile where focus() leaves it, opened the way the train's own walk opens it (tap), closed with Escape
for (const sel of TRIGGERS) {
  const { context, page } = await open();
  try {
    const t = page.locator(sel).first();
    if (!await t.count()) { say(`A ${sel}`, 'no such trigger on this save'); continue; }
    await t.focus(); await sleep(300); const s0 = await state(page, sel);
    await t.tap(); const up = await dialogUp(page); await sleep(400); const s1 = await state(page, sel);
    await page.keyboard.press('Escape'); const gone = await dialogGone(page); await sleep(400); const s2 = await state(page, sel);
    say(`A ${sel}`, { up, gone, afterFocus: s0, afterTap: s1 && { y: s1.y }, afterEscape: s2, movedByTap: s1.y - s0.y, movedOverall: s2.y - s0.y });
  } catch (e) { say(`A ${sel} ERROR`, String(e).slice(0, 300)); }
  await context.close();
}

// B. the train's own mentor sequence, step by step
{
  const { context, page } = await open();
  try {
    const sel = '[data-career-mentor-tile]', t = page.locator(sel), d = page.locator('[data-career-mentor-dialog]');
    const ys = {}; const mark = async name => { ys[name] = await page.evaluate(() => Math.round(scrollY)); };
    await t.focus(); await sleep(300); await mark('focus'); const s0 = await state(page, sel);
    await page.screenshot({ path: path.join(OUT, 'probe-B-before-tap.png') });
    await t.tap(); await d.waitFor(); await sleep(300); await mark('tap');
    await d.locator('[data-career-mentor-help]').tap(); await sleep(200); await mark('help');
    for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) await page.keyboard.press(key);
    await mark('tabs'); await d.screenshot({ path: path.join(OUT, 'probe-B-dialog.png') }); await mark('dialogShot');
    await d.locator('[data-career-mentor-help]').tap(); await sleep(200); await mark('helpOff');
    await page.keyboard.press('Escape'); await d.waitFor({ state: 'hidden' }); await sleep(400); await mark('escape');
    await page.screenshot({ path: path.join(OUT, 'probe-B-after-escape.png') });
    say('B mentor sequence', { before: s0, ys, after: await state(page, sel) });
  } catch (e) { say('B ERROR', String(e).slice(0, 300)); }
  await context.close();
}

// C. a tile half scrolled off the top, tapped on the strip a thumb can still see, closed with Escape
for (const sel of TRIGGERS) {
  const { context, page } = await open();
  try {
    if (!await page.locator(sel).count()) continue;
    await page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); scrollBy(0, r.bottom - 22); }, sel);
    await sleep(350); const s0 = await state(page, sel);
    const x = await page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return r.left + r.width / 2; }, sel);
    await page.touchscreen.tap(x, Math.max(4, s0.bottom - 10)); const up = await dialogUp(page); await sleep(400);
    await page.keyboard.press('Escape'); const gone = await dialogGone(page); await sleep(400); const s2 = await state(page, sel);
    say(`C ${sel}`, { up, gone, before: { y: s0.y, top: s0.top, bottom: s0.bottom }, after: { y: s2.y, top: s2.top, bottom: s2.bottom, focusOnTrigger: s2.focusOnTrigger }, moved: s2.y - s0.y });
  } catch (e) { say(`C ${sel} ERROR`, String(e).slice(0, 300)); }
  await context.close();
}

// D. what moves when a new dialog opens, with and without reduced motion
for (const reduce of [false, true]) {
  const { context, page } = await open({ reduce });
  try {
    for (const sel of ['[data-season-ambition]', '[data-career-records-tile]', '[data-open-derby-history]']) {
      await page.locator(sel).first().evaluate(el => el.scrollIntoView({ block: 'center' })); await sleep(200);
      await page.locator(sel).first().evaluate(el => el.click());
      await page.waitForSelector('[role="dialog"]', { state: 'attached' });
      const moving = await page.evaluate(() => document.getAnimations().map(a => ({ name: a.animationName || a.transitionProperty || 'anim', ms: Math.round(Number(a.effect?.getComputedTiming().duration) || 0), state: a.playState })).filter(a => a.ms > 1).slice(0, 8));
      say(`D reduce=${reduce} ${sel}`, moving);
      await page.keyboard.press('Escape'); await dialogGone(page); await sleep(300);
    }
  } catch (e) { say('D ERROR', String(e).slice(0, 300)); }
  await context.close();
}

// E. between 640 and 1170 wide the Phone and Training buttons float: do they sit on the new tiles?
for (const width of [640, 768, 1024, 1170, 1280]) {
  const { context, page } = await open({ width, height: 900, touch: false });
  try {
    const rows = await page.evaluate(() => {
      const dock = [...document.querySelectorAll('button')].filter(b => getComputedStyle(b).position === 'fixed' && /🏋|📱/.test(b.textContent || '')).map(b => b.getBoundingClientRect());
      const out = { dock: dock.map(r => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]), tiles: {} };
      for (const sel of ['[data-season-ambition]', '[data-preseason-plan]', '[data-career-mentor-tile]', '[data-career-records-tile]', '[data-open-derby-history]']) {
        const el = document.querySelector(sel); if (!el || !dock.length) continue;
        const r = el.getBoundingClientRect();
        out.tiles[sel] = { left: Math.round(r.left), right: Math.round(r.right), underDockPx: Math.max(0, Math.round(r.right - Math.min(...dock.map(d => d.left)))) };
      }
      return out;
    });
    say(`E width ${width}`, rows);
  } catch (e) { say(`E ${width} ERROR`, String(e).slice(0, 300)); }
  await context.close();
}
await browser.close();
console.log('scProbe: done');
