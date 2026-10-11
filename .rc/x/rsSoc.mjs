/* Reviewer walk (screens, Release AX): the Soccer Press room tile and dialog and the playing screen's stack,
   on the built site at 320x568, 390x844 and 1280x900. Sent as .rc/x/rsSoc.mjs. Reads BASE, RC_OUT. Blocks supabase.co.
   Saves: the recorded old save "ere" of scripts/data/careerLeagueWorldSaves1100.json (written by Round 1100's code,
   no pressRoom part), the same aged to 31, and that save answered then damaged (an unreadable part). */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/rs-out';
fs.mkdirSync(OUT, { recursive: true });
const recorded = JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json', 'utf8')).saves.find(v => v.id === 'ere' && v.kind === 'player').state;
const KEY = 'soccerCareerSave';
const VIEWS = [[320, 568], [390, 844], [1280, 900]];
const log = [];
const say = (tag, obj) => { const line = `${tag} ${typeof obj === 'string' ? obj : JSON.stringify(obj)}`; console.log(line.slice(0, 2200)); log.push({ tag, obj }); };
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });

async function open(w, h, state, reduced = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('rs-seeded')) {
      sessionStorage.setItem('rs-seeded', '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(k, v);
      localStorage.setItem('rules-gate-seen:/soccer-career', '1');
      localStorage.setItem('seasonCentre:help', '1');
    }
  }, [KEY, JSON.stringify(state)]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_CONNECTION|Failed to load resource|supabase/i.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page, errors };
}
const shot = async (page, name, full = false) => { if (full && page.viewportSize().width !== 390) return; try { await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 55, fullPage: full }); } catch (e) { say('SHOTFAIL', name + ' ' + String(e).slice(0, 100)); } };
const saved = async page => JSON.parse(await page.evaluate(k => localStorage.getItem(k), KEY) || 'null');
const press = (page, sel) => page.evaluate(q => { const el = document.querySelector(q); if (!el) return false; el.focus({ preventScroll: true }); el.click(); return true; }, sel);
const waitFor = (page, sel, ms = 20000) => page.locator(sel).first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const gone = (page, sel, ms = 8000) => page.locator(sel).first().waitFor({ state: 'detached', timeout: ms }).then(() => true, () => false);
const text = (page, sel) => page.evaluate(q => [...document.querySelectorAll(q)].map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()), sel);

const facts = (page, sel) => page.evaluate(q => {
  const root = document.querySelector(q);
  const box = el => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const a = document.activeElement;
  const active = a ? `${a.tagName} ${[...a.attributes].filter(x => x.name.startsWith('data-') || x.name === 'id').map(x => x.name + (x.value ? '=' + x.value : '')).join(' ')} "${(a.textContent || '').trim().slice(0, 30)}"` : null;
  const base = { scrollY: Math.round(scrollY), innerW: innerWidth, innerH: innerHeight, docH: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth - innerWidth, bodyOverflow: document.body.style.overflow || '', active };
  if (!root) return { missing: q, ...base };
  const small = [], seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue;
    const p = n.parentElement; if (seen.has(p)) continue; seen.add(p);
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < 12) small.push(`${fs}px "${t.slice(0, 36)}"`);
  }
  const taps = [...root.querySelectorAll('button, a[href]')].map(b => ({ t: (b.textContent || '').trim().slice(0, 28) || b.getAttribute('aria-label'), r: box(b), dis: b.disabled ? 1 : undefined })).filter(x => x.r[2] > 0);
  const r = box(root);
  return { rect: r, inView: r[1] >= 0 && r[1] + r[3] <= innerHeight, ...base, small, under44: taps.filter(x => x.r[3] < 44 || x.r[2] < 44), taps: taps.map(x => `${x.t} ${x.r.join(',')}`) };
}, sel);

/* The dialog: its box, the scrolling body, and where each control sits against the body's visible window. */
const dialogFacts = page => page.evaluate(() => {
  const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const d = document.querySelector('[data-press-room] [role="dialog"]'), body = document.querySelector('[data-press-room-body]');
  if (!d || !body) return null;
  const bb = body.getBoundingClientRect();
  const start = document.querySelector('[data-press-start]'), sb = start && start.getBoundingClientRect();
  return { dialog: box(d), screen: body.getAttribute('data-press-screen'), bodyBox: box(body), bodyScrollH: body.scrollHeight, bodyClientH: body.clientHeight, bodyScrollTop: Math.round(body.scrollTop),
    scrollNeeded: body.scrollHeight - body.clientHeight, start: box(start), startVisible: sb ? sb.top >= bb.top && sb.bottom <= bb.bottom : null,
    help: box(d.querySelector('[aria-label="Press room help"]')), close: box(d.querySelector('[data-press-close]')),
    buttons: [...d.querySelectorAll('button')].map(b => `${(b.textContent || '').trim().slice(0, 34)} ${box(b).join(',')}${b.disabled ? ' dis' : ''}`),
    heading: (d.querySelector('h3') || {}).textContent, credibility: (body.querySelector('p') || {}).textContent, pageScrollY: Math.round(scrollY), bodyOverflow: document.body.style.overflow };
});

/* The playing screen's stack: every direct child of the tile column that holds the Press room tile, and the action bar. */
const stackFacts = page => page.evaluate(() => {
  const box = el => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top + scrollY), Math.round(b.width), Math.round(b.height)]; };
  const tile = document.querySelector('[data-press-room-open]');
  const next = [...document.querySelectorAll('button')].find(b => /^Next Season/.test((b.textContent || '').trim()));
  let bar = next; while (bar && getComputedStyle(bar).position !== 'fixed' && getComputedStyle(bar).position !== 'sticky') bar = bar.parentElement;
  const col = tile ? tile.parentElement : null;
  const rows = col ? [...col.children].map(c => ({ what: (c.getAttribute('data-press-room-open') !== null ? 'PRESS ROOM TILE: ' : '') + (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 46), y: box(c)[1], h: box(c)[3] })).filter(r => r.h > 0) : [];
  const nb = next ? next.getBoundingClientRect() : null, bb = bar ? bar.getBoundingClientRect() : null;
  return { innerW: innerWidth, innerH: innerHeight, docH: document.documentElement.scrollHeight, scrollY: Math.round(scrollY), tile: tile ? box(tile) : null, tileText: tile ? tile.textContent : null,
    nextSeason: nb ? [Math.round(nb.left), Math.round(nb.top), Math.round(nb.width), Math.round(nb.height)] : null, bar: bb ? [Math.round(bb.left), Math.round(bb.top), Math.round(bb.width), Math.round(bb.height)] : null,
    barPosition: bar ? getComputedStyle(bar).position : 'none', rows, columnHeight: col ? box(col)[3] : null };
});

async function pressJourney(w, h, state, label, reduced = false) {
  const tag = `soc ${w}x${h} ${label}:`; const id = `soc-${w}-${label}`;
  const { ctx, page, errors } = await open(w, h, state, reduced);
  let answered = null;
  try {
    if (!await page.locator('[data-press-room-open]').first().waitFor({ state: 'attached', timeout: 30000 }).then(() => true, () => false)) {
      say(tag, { NO_TILE: true, body: (await page.evaluate(() => document.body.innerText.slice(0, 300))), errors }); await shot(page, id + '-no-tile'); await ctx.close(); return null;
    }
    await page.waitForTimeout(1200);
    const s0 = await saved(page);
    say(tag + ' start', { age: s0.age, phase: s0.phase, morale: s0.morale, popularity: s0.popularity, pressRoom: s0.pressRoom ? 'has part' : 'no part', stack: await stackFacts(page) });
    await shot(page, id + '-top'); await shot(page, id + '-page-full', true);
    await page.evaluate(() => document.querySelector('[data-press-room-open]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
    const st = await stackFacts(page); const tf = await facts(page, '[data-press-room-open]');
    say(tag + ' tile in view', { tile: tf.rect, small: tf.small, text: st.tileText, bar: st.bar, barPosition: st.barPosition, nextSeason: st.nextSeason, overlapWithBar: st.bar && tf.rect ? tf.rect[1] + tf.rect[3] > st.bar[1] : null });
    await shot(page, id + '-tile');
    const y0 = tf.scrollY;
    await press(page, '[data-press-room-open]');
    if (!await waitFor(page, '[data-press-room-body]')) { say(tag, 'DIALOG DID NOT OPEN'); await shot(page, id + '-no-dialog'); await ctx.close(); return null; }
    await page.waitForTimeout(400);
    say(tag + ' help', { y0, d: await dialogFacts(page), f: await facts(page, '[data-press-room] [role="dialog"]') });
    await shot(page, id + '-help');
    await page.evaluate(() => { const b = document.querySelector('[data-press-room-body]'); b.scrollTop = b.scrollHeight; }); await page.waitForTimeout(150);
    await shot(page, id + '-help-bottom');
    await page.keyboard.press('Escape');
    const closed = await gone(page, '[data-press-room]'); await page.waitForTimeout(200);
    const after = await facts(page, '[data-press-room-open]');
    say(tag + ' escape', { closed, y0, yAfter: after.scrollY, active: after.active, bodyOverflow: after.bodyOverflow, sameSave: JSON.stringify(await saved(page)) === JSON.stringify(s0) });
    await press(page, '[data-press-room-open]'); await waitFor(page, '[data-press-room-body]'); await page.waitForTimeout(300);
    await press(page, '[data-press-start]'); await page.waitForTimeout(300);
    const dq = await dialogFacts(page);
    say(tag + ' question', { d: dq, question: await text(page, '[data-press-question]'), stat: await text(page, '[data-press-stat-line]'), source: await text(page, '[data-press-source]'), options: await text(page, '[data-press-answer]'), f: await facts(page, '[data-press-room] [role="dialog"]') });
    await shot(page, id + '-question');
    await page.evaluate(() => { const b = document.querySelector('[data-press-room-body]'); b.scrollTop = b.scrollHeight; }); await page.waitForTimeout(150);
    await shot(page, id + '-question-bottom');
    await press(page, '[aria-label="Press room help"]'); await page.waitForTimeout(250);
    say(tag + ' help from the question', { screen: (await dialogFacts(page)).screen, startWords: await text(page, '[data-press-start]') });
    await press(page, '[data-press-start]'); await page.waitForTimeout(250);
    const canPromise = await page.locator('[data-press-answer="ambitious"]:not([disabled])').count();
    await press(page, canPromise ? '[data-press-answer="ambitious"]' : '[data-press-answer="accountable"]'); await page.waitForTimeout(400);
    const s1 = await saved(page); answered = s1;
    say(tag + ' receipt', { answeredWith: canPromise ? 'ambitious' : 'accountable', d: await dialogFacts(page), words: await text(page, '[data-press-receipt]'), moraleWas: s0.morale, moraleNow: s1.morale, popularityWas: s0.popularity, popularityNow: s1.popularity, part: s1.pressRoom ? { credibility: s1.pressRoom.credibility, rows: s1.pressRoom.history.length, promise: s1.pressRoom.history[0].promise } : null });
    await shot(page, id + '-receipt');
    await page.locator('[data-press-receipt] button').first().evaluate(b => { b.focus({ preventScroll: true }); b.click(); }); await page.waitForTimeout(250);
    say(tag + ' history', { d: await dialogFacts(page), rows: await text(page, '[data-press-history]') });
    await shot(page, id + '-history');
    await press(page, '[data-press-close]'); await gone(page, '[data-press-room]'); await page.waitForTimeout(200);
    const back = await facts(page, '[data-press-room-open]');
    say(tag + ' back button', { y0, yAfter: back.scrollY, active: back.active, tile: (await text(page, '[data-press-room-open]'))[0], bodyOverflow: back.bodyOverflow });
    await shot(page, id + '-tile-after');
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-press-room-open]').first().waitFor({ state: 'attached', timeout: 30000 }); await page.waitForTimeout(1000);
    const s2 = await saved(page);
    await press(page, '[data-press-room-open]'); await waitFor(page, '[data-press-room-body]'); await page.waitForTimeout(300);
    const startWords = await text(page, '[data-press-start]');
    await press(page, '[data-press-start]'); await page.waitForTimeout(250);
    say(tag + ' after reload', { tile: (await text(page, '[data-press-room-open]'))[0], samePart: JSON.stringify(s2.pressRoom) === JSON.stringify(s1.pressRoom), morale: s2.morale, popularity: s2.popularity, startWords, screen: (await dialogFacts(page)).screen, rows: await text(page, '[data-press-history]') });
    await shot(page, id + '-reload-history');
  } catch (e) { say(tag, 'CRASH ' + String(e.stack || e).slice(0, 500)); await shot(page, id + '-crash'); }
  say(tag + ' errors', errors); await ctx.close();
  return answered;
}

/* A part the reader refuses (the builder's finding: four goals written onto a settled row). Here the answered row's own
   source figure is moved, which the reader refuses the same way: the room must be offered again and nothing may throw. */
async function damagedJourney(w, h, answered) {
  const tag = `soc ${w}x${h} damaged part:`; const id = `soc-${w}-damaged`;
  const state = JSON.parse(JSON.stringify(answered));
  const row = state.seasons[state.pressRoom.history[0].source.index]; row.goals = (row.goals || 0) + 4; row.assists = (row.assists || 0) + 4;
  const { ctx, page, errors } = await open(w, h, state);
  try {
    const tile = await page.locator('[data-press-room-open]').first().waitFor({ state: 'attached', timeout: 30000 }).then(() => true, () => false);
    await page.waitForTimeout(1000);
    say(tag + ' tile', { tile, words: await text(page, '[data-press-room-open]') });
    if (tile) {
      await page.evaluate(() => document.querySelector('[data-press-room-open]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(200);
      await shot(page, id + '-tile');
      await press(page, '[data-press-room-open]'); await waitFor(page, '[data-press-room-body]'); await page.waitForTimeout(300);
      await press(page, '[data-press-start]'); await page.waitForTimeout(250);
      say(tag + ' room', { d: await dialogFacts(page), options: await text(page, '[data-press-answer]'), words: (await text(page, '[data-press-room-body]'))[0].slice(0, 500) });
      await shot(page, id + '-room');
      await press(page, '[data-press-answer="calm"]'); await page.waitForTimeout(300);
      const s = await saved(page); say(tag + ' answered again', { rows: s.pressRoom && s.pressRoom.history.length, credibility: s.pressRoom && s.pressRoom.credibility, words: await text(page, '[data-press-receipt]') });
    }
  } catch (e) { say(tag, 'CRASH ' + String(e.stack || e).slice(0, 400)); await shot(page, id + '-crash'); }
  say(tag + ' errors', errors); await ctx.close();
}

const aged = JSON.parse(JSON.stringify(recorded)); aged.age = 31;
let answered = null;
for (const [w, h] of VIEWS) {
  const a = await pressJourney(w, h, recorded, 'old');
  if (a && !answered) answered = a;
  if (w !== 1280) await pressJourney(w, h, aged, 'age31');
}
await pressJourney(390, 844, recorded, 'old-rm', true);
if (answered && answered.pressRoom) { await damagedJourney(390, 844, answered); await damagedJourney(320, 568, answered); } else say('soc damaged part:', 'SKIPPED, no answered save came back');
await browser.close();
fs.writeFileSync(path.join(OUT, 'soc-log.json'), JSON.stringify(log));
console.log(`rsSoc: done, ${log.length} lines`);
