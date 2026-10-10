// Reviewer sc-screens, Release AT. A PLAYED walk of Soccer Career's new screens. RUNNER ONLY, never committed.
// usage: node scWalk.mjs <saves.json> [more saves.json]    env BASE (head build), BASE_MAIN (optional main build), RC_OUT
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const BASE_MAIN = process.env.BASE_MAIN || '';
const OUT = process.env.RC_OUT || '.tmp-fx/sc-walk-out';
const ONLY = (process.env.SC_ONLY || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const saves = {};
for (const file of process.argv.slice(2)) Object.assign(saves, JSON.parse(fs.readFileSync(file, 'utf8')));
const raw1100 = JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json', 'utf8')).saves.find(s => s.kind === 'player')?.state;
if (raw1100) saves['old-1100'] = raw1100;
console.log(`saves: ${Object.keys(saves).join(', ')}`);

const VIEWPORTS = { p320: { width: 320, height: 640 }, p390: { width: 390, height: 844 }, d1280: { width: 1280, height: 900 }, t768: { width: 768, height: 1024 } };
const measures = {};
let checks = 0, failed = 0, shots = 0;
const note = (key, value) => { measures[key] = value; };
const check = (ok, label, detail) => { checks++; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 600) : ''}`); return ok; };
const info = (label, detail) => console.log(`info ${label}${detail !== undefined ? ' :: ' + JSON.stringify(detail).slice(0, 900) : ''}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();

let keep = null, bytes = 0;      // keep: which shots a shallow scene saves; bytes: stay under the runner's 25 MB
async function shot(page, name, full = false) {
  if ((keep && !keep.test(name)) || bytes > 21e6) return;
  shots++;
  const file = path.join(OUT, `${name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: full ? 52 : 64, fullPage: full }).catch(e => info(`shot ${name} failed`, String(e)));
  try { bytes += fs.statSync(file).size; } catch { /* not written */ }
}
async function open(tag, vpName, { reduce = false, base = BASE } = {}) {
  const context = await browser.newContext({ viewport: VIEWPORTS[vpName], reducedMotion: reduce ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
  await context.route(/supabase\.co/, route => route.abort());
  await context.addInitScript(save => {
    if (!sessionStorage.getItem('rev-seeded')) {
      sessionStorage.setItem('rev-seeded', '1');
      localStorage.setItem('cookie-consent', 'essential');
      if (save) localStorage.setItem('soccerCareerSave', save);
    }
  }, saves[tag] ? JSON.stringify(saves[tag]) : null);
  const page = await context.newPage();
  page.setDefaultTimeout(9000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|ERR_FAILED|supabase|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(`${base}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!document.querySelector('#dukb-main') && document.querySelector('#dukb-main').textContent.length > 200, null, { timeout: 45000 }).catch(() => {});
  await sleep(1800);
  return { context, page, errors };
}
const geo = page => page.evaluate(() => {
  const a = document.activeElement;
  return { y: Math.round(scrollY), h: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight,
    bodyOverflow: document.body.style.overflow, bodyPadRight: document.body.style.paddingRight,
    active: a ? `${a.tagName.toLowerCase()}${[...a.attributes].filter(x => x.name.startsWith('data-')).map(x => `[${x.name}${x.value ? '=' + x.value : ''}]`).join('')}|${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 40)}` : null };
});
// what a dialog looks like to a thumb: where it sits, what is cut, what is small
const dialogFacts = async (page, selector) => await page.locator(selector).count() === 0 ? null : page.locator(selector).first().evaluate(root => {
  const panel = root.matches('[role="dialog"]') ? root : (root.querySelector('[role="dialog"]') || root);
  const r = panel.getBoundingClientRect();
  const vis = el => { const b = el.getBoundingClientRect(), cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const small = [...panel.querySelectorAll('button, select, a[href], [role="button"]')].filter(vis).map(el => { const b = el.getBoundingClientRect(); return { t: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height) }; }).filter(x => x.w < 44 || x.h < 44);
  const clipped = [...panel.querySelectorAll('*')].filter(vis).filter(el => el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && ['hidden', 'clip'].includes(getComputedStyle(el).overflowX)).map(el => (el.textContent || '').trim().slice(0, 40));
  const outside = [...panel.querySelectorAll('button, p, h2, h3, h4, li, dd, dt, select, span')].filter(vis).filter(el => { const b = el.getBoundingClientRect(); return b.right > r.right + 1 || b.left < r.left - 1; }).map(el => (el.textContent || '').trim().slice(0, 40)).slice(0, 6);
  const scroller = [...panel.querySelectorAll('*'), panel].find(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 2);
  const help = [...panel.querySelectorAll('button')].filter(vis).some(el => /help/i.test(el.getAttribute('aria-label') || '') || (el.textContent || '').trim() === '?');
  return { rect: { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }, vw: innerWidth, vh: innerHeight,
    offscreen: r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1, hScroll: panel.scrollWidth > panel.clientWidth + 1,
    small, clipped: clipped.slice(0, 6), outside, innerScroll: scroller ? { sh: scroller.scrollHeight, ch: scroller.clientHeight } : null, help,
    text: (panel.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700) };
});

// open a dialog from its trigger, look at it, close it one way, and say whether the page and the focus came back
async function trip(page, label, triggerSel, dialogSel, { closeBy = 'Escape', snap = true, inside } = {}) {
  const trigger = page.locator(triggerSel).first();
  if (!await trigger.count()) { check(false, `${label}: trigger ${triggerSel} exists`); return null; }
  await trigger.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await sleep(250);
  const before = await geo(page);
  const clicked = await trigger.click({ timeout: 8000 }).then(() => true, e => String(e).slice(0, 300));
  if (!check(clicked === true, `${label}: its trigger can be pressed`, clicked)) { await shot(page, `${label}-blocked`); return null; }
  const shown = await page.waitForSelector(dialogSel, { state: 'visible', timeout: 8000 }).then(() => true, () => false);
  if (!check(shown, `${label}: opens`)) return null;
  await sleep(450);
  const opened = await geo(page);
  const facts = await dialogFacts(page, dialogSel);
  if (snap) await shot(page, label);
  check(opened.y === before.y, `${label}: the page did not move when it opened`, { before: before.y, opened: opened.y });
  check(!!facts && !facts.offscreen, `${label}: the dialog is inside the viewport`, facts?.rect);
  check(!!facts && !facts.hScroll && !facts.clipped.length && !facts.outside.length, `${label}: nothing cut off sideways`, facts && { hScroll: facts.hScroll, clipped: facts.clipped, outside: facts.outside });
  if (facts?.small.length) info(`${label}: targets under 44px`, facts.small);
  info(`${label}: help button inside`, facts?.help);
  note(label, { facts, before, opened });
  if (inside) { try { await inside(facts); } catch (e) { check(false, `${label}: inner walk`, String(e).slice(0, 300)); } }
  if (closeBy === 'Escape') await page.keyboard.press('Escape');
  else {
    const closer = page.locator(closeBy).first();
    if (!await closer.count()) { check(false, `${label}: has the closer ${closeBy}`); await page.keyboard.press('Escape'); }
    else await closer.click();
  }
  let gone = await page.waitForSelector(dialogSel, { state: 'detached', timeout: 4000 }).then(() => true, () => false);
  if (!gone && closeBy === 'Escape') { await page.keyboard.press('Escape'); gone = await page.waitForSelector(dialogSel, { state: 'detached', timeout: 4000 }).then(() => true, () => false); info(`${label}: needed a second Escape`); }
  check(gone, `${label}: closes with ${closeBy}`);
  await sleep(400);
  const closed = await geo(page);
  check(closed.y === before.y, `${label}: the page is where it was after ${closeBy}`, { before: before.y, closed: closed.y });
  const focusBack = await trigger.evaluate(el => el === document.activeElement || el.contains(document.activeElement)).catch(() => false);
  check(focusBack, `${label}: focus is back on its trigger after ${closeBy}`, closed.active);
  check(closed.bodyOverflow === before.bodyOverflow && closed.bodyPadRight === before.bodyPadRight, `${label}: body lock released after ${closeBy}`, { before: [before.bodyOverflow, before.bodyPadRight], closed: [closed.bodyOverflow, closed.bodyPadRight] });
  return facts;
}
// is a thing covered by something floating when it sits in the middle of the screen?
const hit = (page, selector) => page.evaluate(sel => {
  const say = el => el ? `${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? '[' + el.getAttribute('aria-label') + ']' : ''}:${(el.textContent || '').trim().slice(0, 24)}` : 'nothing';
  return [...document.querySelectorAll(sel)].filter(el => el.getBoundingClientRect().width > 0).map(el => {
    el.scrollIntoView({ block: 'center' });
    const b = el.getBoundingClientRect();
    const pts = [[b.left + b.width / 2, b.top + b.height / 2], [b.left + 6, b.top + 6], [b.right - 6, b.top + 6], [b.left + 6, b.bottom - 6], [b.right - 6, b.bottom - 6]];
    const blockers = pts.map(([x, y]) => { const top = document.elementFromPoint(x, y); return top && (el.contains(top) || top.contains(el)) ? null : say(top); }).filter(Boolean);
    return { what: say(el), rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], blockers };
  });
}, selector);
const texts = (page, selector) => page.evaluate(sel => [...document.querySelectorAll(sel)].map(el => (el.innerText || '').replace(/\s+/g, ' ').trim()), selector);
const savedState = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('soccerCareerSave')); } catch { return null; } });
const TILES = '[data-season-ambition], [data-preseason-plan], [data-career-mentor-tile], [data-career-records-tile], [data-reduced-role-plan], [data-career-recorded-stats], [data-career-utilities]';
const X = '[role="dialog"] button:has(span.sr-only)';
const tap = async (page, selector, wait = 350) => { const l = page.locator(selector).first(); if (!await l.count()) return false; await l.click(); await sleep(wait); return true; };

async function topFacts(page, label) {
  const f = await page.evaluate(() => {
    const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), pos: getComputedStyle(el).position }; };
    const cut = (a, b) => !!a && !!b && a.l < b.l + b.w && b.l < a.l + a.w && a.t < b.t + b.h && b.t < a.t + a.h;
    const help = box(document.querySelector('button[aria-label="How to play"]'));
    const training = box(document.querySelector('[data-career-utility="training"]'));
    const phone = box(document.querySelector('[data-career-utility="phone"]'));
    const nav = box(document.querySelector('nav, header'));
    const bar = [...document.querySelectorAll('button')].find(b => /^Next Season/.test((b.textContent || '').trim()));
    const next = box(bar);
    const floaters = [...document.querySelectorAll('body *')].filter(el => getComputedStyle(el).position === 'fixed' && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().width < innerWidth * 0.6)
      .map(el => ({ what: `${el.tagName.toLowerCase()}:${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}`, box: box(el) })).slice(0, 12);
    return { help, training, phone, nav, next, floaters, helpCutsTraining: cut(help, training), helpCutsPhone: cut(help, phone), phoneCutsNext: cut(phone, next), trainingCutsNext: cut(training, next) };
  });
  note(`${label}:top`, f);
  info(`${label}: top facts`, f);
  return f;
}

// the home screen of one save at one size: look, then open every new thing the way a thumb would
async function home(tag, vp, { deep = true, reduce = false, base = BASE, suffix = '' } = {}) {
  const L = `home-${tag}-${vp}${suffix}`;
  if (!saves[tag]) { info(`${L}: no such save, skipped`); return; }
  const { context, page, errors } = await open(tag, vp, { reduce, base });
  try {
    await shot(page, `${L}-top`);
    const top = await topFacts(page, L);
    const g = await geo(page);
    note(`${L}:page`, g);
    info(`${L}: page height ${g.h}px = ${(g.h / g.vh).toFixed(1)} screens, sideways scroll ${g.sw > g.vw}`);
    check(g.sw <= g.vw, `${L}: the page has no sideways scroll`, { sw: g.sw, vw: g.vw });
    await shot(page, `${L}-full`, true);
    const tilesBefore = await texts(page, TILES);
    info(`${L}: tiles`, tilesBefore);
    if (base !== BASE) { info(`${L}: errors on main`, errors); await context.close(); return null; }   // a baseline look at main only
    if (VIEWPORTS[vp].width < 640) {
      check(!!top.help && top.help.w >= 44 && top.help.h >= 44, `${L}: Help is at least 44 by 44 on a phone`, top.help);
      check(!top.helpCutsTraining && !top.helpCutsPhone, `${L}: Help does not sit on Phone or Training`, top);
      check(!!top.phone && top.phone.pos !== 'fixed', `${L}: Phone is in the page on a phone, not floating`, top.phone);
    }
    const covered = (await hit(page, `${TILES}, [data-open-derby-history], [data-open-season-ratings], [data-open-career-story], [data-trophy-category]`)).filter(x => x.blockers.length);
    check(covered.length === 0, `${L}: no new tile or opener is covered by something floating`, covered);
    await page.evaluate(() => scrollTo(0, 0));

    if (await page.locator('[data-season-ambition]').count()) {
      await trip(page, `${L}-target`, '[data-season-ambition]', '[role="dialog"]:has-text("Your season target")');
      await trip(page, `${L}-target-x`, '[data-season-ambition]', '[role="dialog"]:has-text("Your season target")', { closeBy: X, snap: false });
      // choose one, the way a player would, and see that the tile and the save agree, before and after a reload
      await page.locator('[data-season-ambition]').first().click(); await sleep(400);
      const optionText = await page.locator('[data-ambition-option]').first().innerText().catch(() => null);
      if (optionText) {
        await page.locator('[data-ambition-option]').first().click(); await sleep(500);
        const tile = (await texts(page, '[data-season-ambition]'))[0], st = await savedState(page);
        check(!!st?.seasonAmbition && tile.includes(st.seasonAmbition.label), `${L}-target: the tile shows the saved target`, { tile, saved: st?.seasonAmbition });
        await shot(page, `${L}-target-held`);
      } else { info(`${L}-target: no option offered`, (await dialogFacts(page, '[role="dialog"]'))?.text); await page.keyboard.press('Escape'); await sleep(300); }
    } else info(`${L}: no season target tile`);

    if (await page.locator('[data-preseason-plan]').count()) {
      await trip(page, `${L}-preseason`, '[data-preseason-plan]', '[data-preseason-dialog]');
      await trip(page, `${L}-preseason-x`, '[data-preseason-plan]', '[data-preseason-dialog]', { closeBy: X, snap: false });
      await page.locator('[data-preseason-plan]').first().click(); await sleep(400);
      await tap(page, '[data-preparation-option="push"]', 500);
      const tile = (await texts(page, '[data-preseason-plan]'))[0], st = await savedState(page);
      check(!!st?.seasonPreparation && /Development push/.test(tile), `${L}-preseason: the tile shows the saved plan`, { tile, saved: st?.seasonPreparation });
    } else info(`${L}: no preseason tile`);

    if (await page.locator('[data-career-mentor-tile]').count()) {
      await trip(page, `${L}-mentor`, '[data-career-mentor-tile]', '[data-career-mentor-dialog]', { inside: async () => {
        await tap(page, '[data-career-mentor-help]'); if (deep) await shot(page, `${L}-mentor-help`);
        check(await page.locator('[data-career-mentor-rules]').count() === 1, `${L}-mentor: the ? shows the rules and an example`);
        await tap(page, '[data-career-mentor-help]');
      } });
      await trip(page, `${L}-mentor-back`, '[data-career-mentor-tile]', '[data-career-mentor-dialog]', { closeBy: '[data-career-mentor-back]', snap: false });
    } else info(`${L}: no mentor tile`);

    if (await page.locator('[data-career-records-tile]').count()) {
      await trip(page, `${L}-records`, '[data-career-records-tile]', '[data-career-records]', { closeBy: '[data-career-records] button:has-text("Close")', inside: async () => {
        if (await tap(page, '[data-career-best]')) { if (deep) await shot(page, `${L}-records-best`); await page.keyboard.press('Escape'); await sleep(300);
          check(await page.locator('[data-career-records]').count() === 1, `${L}-records: Escape on a season goes back one step, not out`); }
        await tap(page, '[data-career-records] button:has-text("Club history")'); await shot(page, `${L}-records-clubs`);
        if (await tap(page, '[data-record-stint]')) { if (deep) await shot(page, `${L}-records-stint`); await tap(page, '[data-career-records] button:has-text("Back")'); }
        await tap(page, '[data-career-records] button[aria-label="Record book help"]'); if (deep) await shot(page, `${L}-records-help`);
        note(`${L}-records:helpText`, (await dialogFacts(page, '[data-career-records]'))?.text);
        await tap(page, '[data-career-records] button:has-text("Personal bests")');
      } });
      await trip(page, `${L}-records-esc`, '[data-career-records-tile]', '[data-career-records]', { snap: false });
    } else info(`${L}: no record book tile`);
    return { context, page, errors, L, tilesBefore, deep };
  } catch (e) { check(false, `${L}: walk`, String(e && e.stack || e).slice(0, 500)); return { context, page, errors, L, deep, broken: true }; }
}

// the second half of a home screen: the history screens under Career Stats, Latest Events and Trophies
async function history(handle) {
  if (!handle) return;
  const { context, page, errors, L, deep } = handle;
  try {
    await page.keyboard.press('Escape').catch(() => {});
    if (await page.locator('[data-open-derby-history]').count()) {
      await trip(page, `${L}-derby`, '[data-open-derby-history]', '[data-derby-history]', { closeBy: '[data-derby-close]', inside: async () => {
        const saved = page.locator('[data-derby-season][data-derby-season-status="saved"]').first();
        if (await saved.count()) { await saved.click(); await sleep(350); await shot(page, `${L}-derby-season`);
          note(`${L}-derby:season`, (await dialogFacts(page, '[data-derby-history]'))?.text);
          await tap(page, '[data-derby-back]');
          check(await saved.evaluate(el => el === document.activeElement), `${L}-derby: Back puts focus on the season tile it came from`); }
        const other = page.locator('[data-derby-season]:not([data-derby-season-status="saved"])').first();
        if (await other.count()) { await other.click(); await sleep(300); if (deep) await shot(page, `${L}-derby-missing`); note(`${L}-derby:missing`, await texts(page, '[data-derby-missing]')); await tap(page, '[data-derby-back]'); }
        await tap(page, '[data-derby-list-tab="rivals"]'); await shot(page, `${L}-derby-rivals`);
        if (await tap(page, '[data-derby-rival]')) { await shot(page, `${L}-derby-rival`);
          note(`${L}-derby:rival`, (await dialogFacts(page, '[data-derby-history]'))?.text);
          await page.locator('[data-derby-history-body]').evaluate(el => { el.scrollTop = el.scrollHeight; }); await sleep(200); if (deep) await shot(page, `${L}-derby-rival-end`);
          await tap(page, '[data-derby-back]'); }
        await tap(page, '[data-derby-history-help]'); if (deep) await shot(page, `${L}-derby-help`);
        check(await page.locator('[data-derby-help]').count() === 1, `${L}-derby: the ? shows the rules and an example`);
        await tap(page, '[data-derby-back="help"]');
      } });
      await trip(page, `${L}-derby-esc`, '[data-open-derby-history]', '[data-derby-history]', { snap: false });
    } else info(`${L}: no derby history opener`);

    if (await page.locator('[data-open-season-ratings]').count()) {
      await trip(page, `${L}-ratings`, '[data-open-season-ratings]', '[data-season-ratings="dialog"]', { closeBy: '[data-season-history-close]', inside: async () => {
        const can = await page.locator('[data-season-history-open="compare"]:not([disabled])').count();
        info(`${L}-ratings: compare enabled`, can);
        if (can) { await tap(page, '[data-season-history-open="compare"]'); await shot(page, `${L}-compare`);
          note(`${L}-compare:text`, (await dialogFacts(page, '[data-season-ratings="dialog"]'))?.text);
          const before = await texts(page, '[data-season-history-side]');
          await tap(page, '[data-season-history-swap]'); const after = await texts(page, '[data-season-history-side]');
          check(before.length === 2 && before[0] === after[1] && before[1] === after[0], `${L}-compare: Swap seasons swaps the two sides`, { before, after });
          const options = await page.locator('[data-season-history-select="first"] option').count();
          if (options > 1) { await page.locator('[data-season-history-select="first"]').selectOption({ index: options - 1 }); await sleep(250); if (deep) await shot(page, `${L}-compare-oldest`); }
          await page.locator('[data-season-history-scroll]').evaluate(el => { el.scrollTop = el.scrollHeight; }); await sleep(200); if (deep) await shot(page, `${L}-compare-end`);
          await tap(page, '[data-season-history-back="ratings"]'); }
        await tap(page, '[data-season-history-open="availability"]'); await shot(page, `${L}-availability`);
        note(`${L}-availability:text`, (await dialogFacts(page, '[data-season-ratings="dialog"]'))?.text);
        await page.locator('[data-season-history-scroll]').evaluate(el => { el.scrollTop = el.scrollHeight; }); await sleep(200); if (deep) await shot(page, `${L}-availability-end`);
        await tap(page, '[data-season-history-help]'); if (deep) await shot(page, `${L}-history-help`);
        check(await page.locator('[data-season-history-help-body]').count() === 1, `${L}-ratings: the ? shows the rules and an example`);
        await tap(page, '[data-season-history-back="help"]'); await tap(page, '[data-season-history-back="ratings"]');
      } });
      await trip(page, `${L}-ratings-esc`, '[data-open-season-ratings]', '[data-season-ratings="dialog"]', { snap: false });
    } else info(`${L}: no ratings opener`);

    if (await page.locator('[data-open-career-story]').count()) {
      await trip(page, `${L}-story`, '[data-open-career-story]', '[data-career-story="dialog"]', { closeBy: '[data-story-close]', inside: async () => {
        const n = await page.locator('[data-story-tile]').count();
        info(`${L}-story: chapters`, n);
        if (n) { const at = Math.min(n - 1, Math.max(0, Math.floor(n / 2)));
          await page.locator('[data-story-tile]').nth(at).click(); await sleep(350); await shot(page, `${L}-story-chapter`);
          const a = (await texts(page, '[data-story-heading]'))[0];
          const nextOn = await page.locator('[data-story-next]:not([disabled])').count();
          if (nextOn) { await tap(page, '[data-story-next]'); const b = (await texts(page, '[data-story-heading]'))[0]; if (deep) await shot(page, `${L}-story-next`);
            await tap(page, '[data-story-previous]'); const c = (await texts(page, '[data-story-heading]'))[0];
            check(a !== b && a === c, `${L}-story: Next then Previous lands on the chapter it left`, { a, b, c }); }
          await tap(page, '[data-story-back]');
          check(await page.locator('[data-story-tile]').nth(at).evaluate(el => el === document.activeElement), `${L}-story: All seasons puts focus on the tile it opened`); }
      } });
      await trip(page, `${L}-story-esc`, '[data-open-career-story]', '[data-career-story="dialog"]', { snap: false });
    } else info(`${L}: no story opener`);

    const cats = await page.evaluate(() => [...document.querySelectorAll('[data-trophy-category]')].map(b => ({ c: b.getAttribute('data-trophy-category'), label: b.getAttribute('aria-label') })));
    info(`${L}: trophy categories`, cats);
    const ORDER = ['ucl', 'club', 'domestic', 'league'];
    for (const cat of cats.filter(c => !/: 0\./.test(c.label || '') && ORDER.includes(c.c)).sort((a, b) => ORDER.indexOf(a.c) - ORDER.indexOf(b.c)).slice(0, 3)) {
      await trip(page, `${L}-trophy-${cat.c}`, `[data-trophy-category="${cat.c}"]`, '[data-trophy-cabinet]', { closeBy: '[data-trophy-back="career"]', inside: async () => {
        if (await tap(page, '[data-trophy-win]')) { await shot(page, `${L}-trophy-${cat.c}-win`);
          note(`${L}-trophy-${cat.c}:campaign`, await texts(page, '[data-trophy-campaign]'));
          const sc = page.locator('[data-trophy-scroll]');
          for (let i = 1; i <= (deep ? 3 : 1); i++) { await sc.evaluate((el, k) => { el.scrollTop = k * (el.clientHeight - 40); }, i); await sleep(200); await shot(page, `${L}-trophy-${cat.c}-win-${i}`); }
          await tap(page, '[data-trophy-back="wins"]'); }
        await tap(page, '[data-trophy-cabinet] button[aria-label="Trophy cabinet help"]'); if (deep && cat.c !== 'league') await shot(page, `${L}-trophy-${cat.c}-help`);
        await tap(page, '[data-trophy-help-back]');
      } });
      await trip(page, `${L}-trophy-${cat.c}-esc`, `[data-trophy-category="${cat.c}"]`, '[data-trophy-cabinet]', { snap: false });
    }

    // every number and name is the saved one: the same tiles, word for word, after a reload
    const before = await texts(page, TILES);
    await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500);
    const after = await texts(page, TILES);
    check(JSON.stringify(before) === JSON.stringify(after), `${L}: the tiles read the same after a reload`, { before, after });
    await shot(page, `${L}-reloaded-top`);
  } catch (e) { check(false, `${L}: history walk`, String(e && e.stack || e).slice(0, 500)); }
  check(errors.length === 0, `${L}: no page or console error`, errors.slice(0, 5));
  await context.close();
}

// one screen a save is stopped on (a summary, a newspaper, an event): look at it, then press what a player presses
async function screen(tag, vp, { press = [], reduce = false, base = BASE, suffix = '', then } = {}) {
  const L = `screen-${tag}-${vp}${suffix}`;
  if (!saves[tag]) { info(`${L}: no such save, skipped`); return; }
  const { context, page, errors } = await open(tag, vp, { reduce, base });
  try {
    await shot(page, `${L}-top`); await shot(page, `${L}-full`, true);
    const g = await geo(page);
    note(`${L}:page`, g);
    check(g.sw <= g.vw, `${L}: no sideways scroll`, { sw: g.sw, vw: g.vw });
    const lines = await texts(page, '[data-season-ambition-result], [data-preseason-result], [data-reduced-role-result], [data-career-goal-milestone], [data-reduced-role-plan]');
    info(`${L}: result lines`, lines); note(`${L}:lines`, lines);
    await topFacts(page, L);
    const cont = (await hit(page, 'button')).filter(x => /Continue|Next Season|Take them|Accept reduced|Prove yourself/.test(x.what));
    const covered = cont.filter(x => x.blockers.length);
    info(`${L}: buttons a player needs`, cont.map(x => x.what + ' ' + JSON.stringify(x.rect)));
    check(covered.length === 0, `${L}: nothing floats over the button a player needs`, covered);
    if (covered.length) await shot(page, `${L}-covered`);
    let step = 0;
    for (const label of press) {
      const button = page.locator(`button:has-text("${label}")`).first();
      if (!await button.count()) { info(`${L}: no button "${label}" to press`); break; }
      await button.scrollIntoViewIfNeeded(); await button.click(); await sleep(1400);
      step++; await shot(page, `${L}-after-${step}`);
      const st = await savedState(page);
      info(`${L}: after "${label}" the save is on phase ${st?.phase}, mentor ${st?.mentor ? st.mentor.name : 'none'}, role plan ${JSON.stringify(st?.reducedRole ?? null)}`);
    }
    if (then) await then(page, L);
  } catch (e) { check(false, `${L}: walk`, String(e && e.stack || e).slice(0, 500)); }
  check(errors.length === 0, `${L}: no page or console error`, errors.slice(0, 5));
  await context.close();
}

// play one season in the browser from a home screen with a target and a plan chosen, and photograph what comes back
async function playOne(tag, vp) {
  const L = `play-${tag}-${vp}`;
  if (!saves[tag]) return;
  const { context, page, errors } = await open(tag, vp);
  try {
    for (const [tile, option] of [['[data-season-ambition]', '[data-ambition-option]'], ['[data-preseason-plan]', '[data-preparation-option="push"]']]) {
      if (await tap(page, tile, 450)) await tap(page, option, 450);
    }
    const start = await savedState(page);
    info(`${L}: chosen`, { ambition: start?.seasonAmbition, preparation: start?.seasonPreparation });
    await page.locator('button:has-text("Next Season")').first().click();
    await page.waitForFunction(n => { try { return JSON.parse(localStorage.getItem('soccerCareerSave')).seasons.length > n; } catch { return false; } }, start.seasons.length, { timeout: 60000 });
    for (let i = 0; i < 14; i++) {
      await sleep(1500);
      const st = await savedState(page);
      const lines = await texts(page, '[data-season-ambition-result], [data-preseason-result], [data-reduced-role-result], [data-career-goal-milestone]');
      info(`${L}: step ${i} phase ${st?.phase}`, lines);
      if (st?.phase === 'season_summary') {
        await shot(page, `${L}-summary-top`); await shot(page, `${L}-summary-full`, true);
        const row = st.seasons[st.seasons.length - 1];
        note(`${L}:summary`, { lines, ambition: row.ambition, preparation: row.preparation, reducedRole: row.reducedRole, goals: row.goals, apps: row.apps });
        check(!row.ambition || lines.some(t => t.includes(row.ambition.label)), `${L}: the summary prints the saved target result`, { lines, saved: row.ambition });
        check(!row.preparation || lines.some(t => /Development push|Recovery focus/.test(t)), `${L}: the summary prints the saved preseason result`, { lines, saved: row.preparation });
        const cont = (await hit(page, 'button')).filter(x => /^button:Continue/.test(x.what));
        check(cont.every(x => !x.blockers.length), `${L}: Continue is not covered`, cont);
        break;
      }
      if (st?.phase === 'playing' || st?.phase === 'retired') { await shot(page, `${L}-ended-${st.phase}`); break; }
      const pressed = await page.evaluate(() => {
        const wanted = [/^Continue to Season Summary/, /^Continue/, /^Read/, /^Next$/, /^OK/, /^Skip/, /^Close$/, /^Dismiss/, /^Stay/];
        const all = [...document.querySelectorAll('#dukb-main button, [role="dialog"] button')].filter(b => b.getBoundingClientRect().width > 0 && !b.disabled);
        for (const w of wanted) { const b = all.find(x => w.test((x.textContent || '').trim())); if (b) { b.click(); return (b.textContent || '').trim().slice(0, 40); } }
        return null;
      });
      info(`${L}: pressed`, pressed);
      if (!pressed) { await shot(page, `${L}-stuck-${i}`); const any = page.locator('#dukb-main button.bg-emerald-600:not([data-career-utility])').first();
        if (!await any.count()) { info(`${L}: nothing to press, stopping`); break; }
        info(`${L}: first green button there`, await any.innerText().catch(() => null)); await any.click().catch(() => {}); }
    }
  } catch (e) { check(false, `${L}: walk`, String(e && e.stack || e).slice(0, 500)); await shot(page, `${L}-error`); }
  check(errors.length === 0, `${L}: no page or console error`, errors.slice(0, 5));
  await context.close();
}

const scene = async (name, filter, fn) => {
  if (ONLY.length && !ONLY.some(o => name.includes(o))) return;
  keep = filter; const t = Date.now();
  try { await fn(); } catch (e) { check(false, `${name}: scene`, String(e && e.stack || e).slice(0, 500)); }
  console.log(`scene ${name} done in ${Math.round((Date.now() - t) / 1000)}s, ${shots} shots, ${(bytes / 1e6).toFixed(1)} MB so far`);
};
const end = async h => { if (!h) return; check(h.errors.length === 0, `${h.L}: no page or console error`, h.errors.slice(0, 5)); await h.context.close(); };

// 1. the richest new save, everything, on a phone; then the main states at desktop and at 320
await scene('new-home-p390', null, async () => history(await home('new-home', 'p390')));
await scene('new-home-d1280', /-(top|full|target|preseason|mentor|records|derby|derby-season|derby-rival|compare|availability|story-chapter|trophy-ucl-win|trophy-club-win|trophy-ucl-win-1|trophy-club-win-1)$/, async () => history(await home('new-home', 'd1280', { deep: false })));
await scene('new-home-p320', /-(top|full|target|preseason|records|records-clubs|derby|derby-season|derby-rival|compare|availability|story-chapter|trophy-ucl-win|trophy-club-win)$/, async () => history(await home('new-home', 'p320', { deep: false })));
// 2. the same phone screens with reduced motion asked for, on the goalkeeper (clean sheets in the record book)
await scene('new-gk-p390-reduce', /-(top|target|mentor|records|records-clubs|compare)$/, async () => history(await home('new-gk', 'p390', { deep: false, reduce: true, suffix: '-reduce' })));
// 3. the smaller role note, a retired career, and the honest empty states of a career with nothing recorded yet
await scene('new-role-plan-p390', /-(top|full)$/, async () => end(await home('new-role-plan', 'p390', { deep: false })));
await scene('new-retired-p390', /-(top|full|mentor|records|derby|story)$/, async () => history(await home('new-retired', 'p390', { deep: false })));
await scene('new-first-p390', /-(top|full|target|preseason|ratings|availability|story)$/, async () => history(await home('new-first', 'p390', { deep: false })));
await scene('new-one-season-p390', /-(top|target|ratings|availability|derby|records)$/, async () => history(await home('new-one-season', 'p390', { deep: false })));
// 4. saves made by Release AS's code, on this build: empty and unknown states, never a crash
await scene('old-home-p390', /-(top|full|target|preseason|records|records-clubs|derby|derby-season|derby-missing|derby-rivals|compare|availability|availability-end|story|story-chapter|trophy-[a-z]+-win|trophy-[a-z]+-win-1)$/, async () => history(await home('old-home', 'p390')));
await scene('old-home-d1280', /-(top|full)$/, async () => history(await home('old-home', 'd1280', { deep: false })));
await scene('old-1100-p390', /-(top|full|records|derby|derby-missing|availability|trophy-[a-z]+-win)$/, async () => history(await home('old-1100', 'p390', { deep: false })));
await scene('old-retired-p390', /-(top|records|derby)$/, async () => history(await home('old-retired', 'p390', { deep: false })));
// 5. what main shows for the same old saves (only when a main build is served beside this one)
if (BASE_MAIN) {
  await scene('main-old-home-p390', null, async () => { await home('old-home', 'p390', { base: BASE_MAIN, suffix: '-MAIN' }); });
  await scene('main-old-home-d1280', null, async () => { await home('old-home', 'd1280', { base: BASE_MAIN, suffix: '-MAIN' }); });
  await scene('main-old-summary-p390', null, async () => screen('old-summary', 'p390', { base: BASE_MAIN, suffix: '-MAIN' }));
}
// 6. the screens a season stops on
await scene('summary-p390', null, async () => screen('new-summary', 'p390', { press: ['Continue'] }));
await scene('summary-d1280', /-(top|full|covered)$/, async () => screen('new-summary', 'd1280'));
await scene('summary-t768', /-(top|covered)$/, async () => screen('new-summary', 't768'));
await scene('summary-milestone-p390', null, async () => screen('new-summary-milestone', 'p390'));
await scene('summary-milestone-p320', /-(full|covered)$/, async () => screen('new-summary-milestone', 'p320'));
await scene('summary-role-p390', null, async () => screen('new-summary-role', 'p390'));
await scene('news-milestone-p390', null, async () => screen('new-news-milestone', 'p390', { press: ['Continue to Season Summary'] }));
await scene('event-mentor-p390', null, async () => screen('new-event-mentor', 'p390', { press: ['Take them under your wing'] }));
await scene('event-manager-p390', null, async () => screen('new-event-manager', 'p390', { press: ['Accept reduced role'] }));
await scene('old-summary-p390', /-(top|full|covered)$/, async () => screen('old-summary', 'p390', { press: ['Continue'] }));
await scene('ceremony-p390', /-(top)$/, async () => screen('new-ceremony', 'p390'));
// 7. a season played in the browser with a target and a plan held
await scene('play-p390', null, async () => playOne('new-home', 'p390'));
await scene('play-d1280', null, async () => playOne('new-one-season', 'd1280'));

await browser.close();
fs.writeFileSync(path.join(OUT, 'sc-measures.json'), JSON.stringify(measures));
console.log(`sc-screens walk: ${checks} checks, ${failed} failed, ${shots} shots, ${(bytes / 1e6).toFixed(1)} MB`);
process.exit(failed ? 1 : 0);
