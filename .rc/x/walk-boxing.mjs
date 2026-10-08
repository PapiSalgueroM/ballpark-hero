// Release AM front reviewer, never committed. Plays Fight Promoter (Round 1086) on the merged build and
// compares every forecast figure with what the show then pays. usage: node walk-boxing.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4383';
const SHOTS = process.env.RC_OUT || 'C:/Users/antho/dukb-handoff/2026-10-08/review-shots/am-front';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(process.env.RC_OUT || HERE, 'walk-boxing.json');
fs.mkdirSync(SHOTS, { recursive: true });
const SAVE = 'fight-promoter-save-v1';
const report = { seeds: [], mismatches: [], shows: 0, notes: [] };
const flush = () => fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
const log = (...a) => console.log(...a);
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });

async function open(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 700 });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* private */ } });
  const page = await ctx.newPage();
  const errors = [];
  await page.route('**/*', r => (new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort()));
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  return { ctx, page, errors };
}
const gotoGame = async page => {
  await page.goto(`${BASE}/fight-promoter`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!document.querySelector('button[aria-label="Boxing"]') || !!document.querySelector('#fight-promoter-name') || /Tonight's card/i.test(document.body.innerText), null, { timeout: 60000 });
  if (await page.$('button[aria-label="Boxing"]')) {
    if (process.env.MODE_SHOT && !gotoGame.shot) { gotoGame.shot = true; await page.screenshot({ path: path.join(SHOTS, 'boxing-mode-choice.png') }); }
    await page.click('button[aria-label="Boxing"]');
    await page.waitForFunction(() => !!document.querySelector('#fight-promoter-name') || /Tonight's card/i.test(document.body.innerText), null, { timeout: 30000 });
  }
  await page.waitForTimeout(800);
};
const shot = (page, name, full = false) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: full });
const saved = page => page.evaluate(k => localStorage.getItem(k), SAVE);
const setPrice = (page, v) => page.$eval('#fight-promoter-price', (el, val) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(el, String(val));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, v);

/* The hub, read the way a player reads it. */
const hub = page => page.evaluate(() => {
  const cardOf = label => [...document.querySelectorAll('div.rounded-lg.border.bg-card')].find(d => (d.querySelector('p')?.innerText || '').trim().toLowerCase().startsWith(label));
  const room = cardOf('the room');
  const tonight = cardOf("tonight's card");
  const pool = cardOf('who will work for you');
  const f = document.querySelector('[data-boxing-forecast]');
  const val = sel => { const el = f?.querySelector(sel); return el ? { v: Number(el.getAttribute('data-value')), t: el.innerText.trim() } : null; };
  return {
    venues: room ? [...room.querySelectorAll('button')].map(b => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), disabled: b.disabled, selected: b.className.includes('border-primary') })) : [],
    price: Number(document.querySelector('#fight-promoter-price')?.value ?? NaN),
    cardRows: tonight ? tonight.querySelectorAll('div.space-y-1\\.5 > div').length : 0,
    poolFree: pool ? [...pool.querySelectorAll('button')].filter(b => !b.disabled && /draw \d+/.test(b.innerText)).length : 0,
    foes: pool ? [...pool.querySelectorAll('button')].filter(b => /appeal \d+/.test(b.innerText)).map(b => b.innerText.replace(/\s+/g, ' ').trim()) : [],
    runDisabled: [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Put the show on')?.disabled ?? null,
    header: document.querySelector('h2.truncate.text-lg')?.parentElement?.parentElement?.innerText.replace(/\s+/g, ' ').trim() ?? '',
    forecast: f ? {
      attendance: val('[data-boxing-attendance]'), gate: val('[data-boxing-gate]'), purses: val('[data-boxing-purses]'), rent: val('[data-boxing-rent]'),
      profit: val('[data-boxing-profit]'), cashAfter: val('[data-boxing-cash-after]'), guarantees: val('[data-boxing-guarantees]'), share: val('[data-boxing-share]'),
      status: [...f.querySelectorAll('[role="status"]')].map(x => x.innerText.trim()), text: f.innerText.replace(/\s+/g, ' ').trim(),
    } : null,
  };
});
const clickIn = (page, label, pick) => page.evaluate(([lab, which]) => {
  const card = [...document.querySelectorAll('div.rounded-lg.border.bg-card')].find(d => (d.querySelector('p')?.innerText || '').trim().toLowerCase().startsWith(lab));
  if (!card) return false;
  const all = [...card.querySelectorAll('button')].filter(b => !b.disabled);
  const list = which.kind === 'free' ? all.filter(b => /draw \d+/.test(b.innerText)) : which.kind === 'foe' ? all.filter(b => /appeal \d+/.test(b.innerText)) : all;
  if (!list.length) return false;
  const b = list[((which.i % list.length) + list.length) % list.length];
  b.click();
  return b.innerText.replace(/\s+/g, ' ').trim().slice(0, 60);
}, [label, pick]);
const clickText = (page, text) => page.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => !x.disabled && x.innerText.trim().startsWith(t)); if (!b) return false; b.click(); return true; }, text);

/* The result screen, read off the page. */
const resultScreen = page => page.evaluate(() => {
  const t = document.body.innerText;
  const num = s => Number(String(s).replace(/,/g, ''));
  const m1 = (document.querySelector('p.animate-count-pop')?.innerText || '').match(/([\d,]+) in\b/);
  const m2 = t.match(/gate ([\d.,]+)m, purses ([\d.,]+)m, room ([\d.,]+)m/);
  const m3 = t.match(/(Profit|Loss) ([\d.,]+)m/);
  const head = document.querySelector('h2.truncate.text-lg')?.parentElement?.parentElement?.innerText.replace(/\s+/g, ' ') ?? '';
  const hm = head.match(/(-?[\d.,]+)m/);
  return { attendance: m1 ? num(m1[1]) : null, gate: m2 ? num(m2[1]) : null, purses: m2 ? num(m2[2]) : null, rent: m2 ? num(m2[3]) : null, profit: m3 ? (m3[1] === 'Loss' ? -1 : 1) * num(m3[2]) : null, headerMoney: hm ? num(hm[1]) : null, closedButton: /See how you are remembered/.test(t), planNext: /Plan the next show/.test(t) };
});

const near = (a, b) => Math.abs(a - b) < 0.0005;
async function buildCard(page, bouts, salt) {
  let made = 0;
  for (let k = 0; k < bouts; k += 1) {
    const picked = await clickIn(page, 'who will work for you', { kind: 'free', i: salt + k * 3 });
    if (!picked) break;
    await page.waitForTimeout(150);
    const foe = await clickIn(page, 'who will work for you', { kind: 'foe', i: (salt + k) % 2 === 0 ? 0 : -1 });
    if (!foe) { await clickText(page, 'Pick somebody else'); await page.waitForTimeout(120); continue; }
    made += 1;
    await page.waitForTimeout(150);
  }
  return made;
}
const PRICES = [60, 120, 220, 350, 600, 90, 180, 480];

async function playSeed(view, name, salt, maxShows, shots) {
  const { ctx, page, errors } = await open(view.width, view.height);
  const seedRec = { view: view.width, name, shows: [], errors };
  report.seeds.push(seedRec);
  await gotoGame(page);
  await page.fill('#fight-promoter-name', name);
  await clickText(page, 'Book your first room');
  await page.waitForTimeout(500);
  const empty = await hub(page);
  seedRec.empty = { forecast: empty.forecast, runDisabled: empty.runDisabled };
  if (shots) await shot(page, `boxing-${view.width}-hub-empty`);
  for (let i = 0; i < maxShows; i += 1) {
    const h0 = await hub(page);
    /* venue: the dearest room that is open on odd shows, the first on even ones */
    const open = h0.venues.map((v, j) => ({ ...v, j })).filter(v => !v.disabled);
    const want = (i + salt) % 2 === 1 ? open[open.length - 1] : open[0];
    if (want) await page.evaluate(j => { const card = [...document.querySelectorAll('div.rounded-lg.border.bg-card')].find(d => (d.querySelector('p')?.innerText || '').trim().toLowerCase().startsWith('the room')); card.querySelectorAll('button')[j].click(); }, want.j);
    await setPrice(page, PRICES[(i + salt) % PRICES.length]);
    const made = await buildCard(page, 1 + ((i + salt) % 3), salt + i);
    await page.waitForTimeout(200);
    const before = await hub(page);
    const saveBefore = await saved(page);
    if (!made || !before.forecast) { seedRec.shows.push({ i, skipped: 'no card could be made', poolFree: before.poolFree }); break; }
    if (shots && i === 0) {
      await page.evaluate(() => document.querySelector('[data-boxing-forecast]').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      await shot(page, `boxing-${view.width}-forecast`);
      const y0 = await page.evaluate(() => window.scrollY);
      await page.click('[data-boxing-forecast] button[aria-label="Show cash rules"]');
      await page.waitForTimeout(500);
      const help = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); const r = d?.getBoundingClientRect(); return d ? { text: d.innerText.replace(/\s+/g, ' ').trim(), example: d.querySelector('[data-boxing-cash-example]')?.innerText, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, vw: innerWidth, vh: innerHeight, focusIn: d.contains(document.activeElement) } : null; });
      await shot(page, `boxing-${view.width}-help`);
      await clickText(page, 'Back to card');
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => ({ y: window.scrollY, dialog: !!document.querySelector('[role="dialog"]'), focusLabel: document.activeElement?.getAttribute('aria-label') }));
      seedRec.help = { help, y0, after, saveUnchanged: (await saved(page)) === saveBefore, cardStill: (await hub(page)).cardRows === before.cardRows };
    }
    await clickText(page, 'Put the show on');
    await page.waitForTimeout(700);
    const res = await resultScreen(page);
    const st = JSON.parse((await saved(page)) || '{}').st;
    const f = before.forecast;
    const row = { i, venue: before.venues.find(v => v.selected)?.t, price: before.price, bouts: before.cardRows, forecast: { att: f.attendance?.v, gate: f.gate?.v, purses: f.purses?.v, rent: f.rent?.v, profit: f.profit?.v, cashAfter: f.cashAfter?.v, texts: [f.attendance?.t, f.gate?.t, f.purses?.t, f.rent?.t, f.profit?.t, f.cashAfter?.t], status: f.status }, result: res, saved: st ? { money: st.money, closed: st.closed, exit: st.exit, lastProfit: st.history.at(-1)?.profit, lastAtt: st.history.at(-1)?.attendance, rep: st.reputation } : null };
    const bad = [];
    if (res.attendance === null) bad.push('no result screen');
    else {
      if (f.attendance.v !== res.attendance) bad.push(`attendance ${f.attendance.v} vs ${res.attendance}`);
      if (!near(f.gate.v, res.gate)) bad.push(`gate ${f.gate.v} vs ${res.gate}`);
      if (!near(f.purses.v, res.purses)) bad.push(`purses ${f.purses.v} vs ${res.purses}`);
      if (!near(f.rent.v, res.rent)) bad.push(`rent ${f.rent.v} vs ${res.rent}`);
      if (!near(f.profit.v, res.profit)) bad.push(`profit ${f.profit.v} vs ${res.profit}`);
      if (!near(f.cashAfter.v, st.money)) bad.push(`cash after ${f.cashAfter.v} vs saved ${st.money}`);
      if (!near(f.cashAfter.v, res.headerMoney)) bad.push(`cash after ${f.cashAfter.v} vs header ${res.headerMoney}`);
      if ((f.cashAfter.v < 0) !== !!st.closed) bad.push(`forecast below zero ${f.cashAfter.v < 0} vs closed ${st.closed}`);
      if ((f.status.join(' ').includes('end the promotion')) !== !!st.closed) bad.push(`ending warning ${JSON.stringify(f.status)} vs closed ${st.closed}`);
    }
    row.bad = bad;
    seedRec.shows.push(row);
    report.shows += 1;
    if (bad.length) report.mismatches.push({ view: view.width, name, i, bad });
    log(`${view.width} ${name} show ${i}: ${JSON.stringify(row).slice(0, 420)}`);
    flush();
    if (shots && i === 0) await shot(page, `boxing-${view.width}-result`);
    if (res.attendance === null || st.closed) break;
    await clickText(page, 'Plan the next show');
    await page.waitForTimeout(400);
  }
  flush();
  await ctx.close();
}

const VIEWS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const NAMES = ['Seed Alpha', 'Corner Men', 'Tuesday Fights', '', 'Northside Boxing', 'Glove Up'];
for (const [vi, view] of VIEWS.entries()) {
  for (const [ni, name] of NAMES.entries()) {
    try { await playSeed(view, name, ni + vi * 2, 9, ni === 0); } catch (e) { report.notes.push(`${view.width} ${name}: ${String(e).slice(0, 300)}`); flush(); }
  }
}
log(`walk-boxing part 1: ${report.shows} shows, ${report.mismatches.length} mismatches`);

/* Part 2: a room that locks behind you. Town Hall needs a name of 12. The save is the game's own, with the
   name set to 12 and cash to rent the room; a one sided card then costs the promoter some of that name. */
try {
  const { ctx, page } = await open(390, 844);
  await gotoGame(page);
  await page.fill('#fight-promoter-name', 'Lock Test');
  await clickText(page, 'Book your first room');
  await page.waitForTimeout(400);
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.st.reputation = 12; s.st.money = 0.3; localStorage.setItem(k, JSON.stringify(s)); }, SAVE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /Tonight's card/i.test(document.body.innerText), null, { timeout: 60000 });
  await page.waitForTimeout(600);
  const pickTown = () => page.evaluate(() => { const card = [...document.querySelectorAll('div.rounded-lg.border.bg-card')].find(d => (d.querySelector('p')?.innerText || '').trim().toLowerCase().startsWith('the room')); const b = [...card.querySelectorAll('button')].find(x => x.innerText.includes('Town Hall')); if (!b || b.disabled) return false; b.click(); return true; });
  const town = async () => (await hub(page)).venues.find(v => v.t.startsWith('Town Hall'));
  const oneSided = async () => {
    for (let k = 0; k < 10; k += 1) {
      if (!(await clickIn(page, 'who will work for you', { kind: 'free', i: k }))) return false;
      await page.waitForTimeout(120);
      const ok = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /appeal \d+/.test(x.innerText) && x.innerText.includes('cannot live')); if (!b) return false; b.click(); return true; });
      if (ok) return true;
      await clickText(page, 'Pick somebody else');
      await page.waitForTimeout(120);
    }
    return false;
  };
  const trail = [];
  let outcome = null;
  for (let attempt = 0; attempt < 6 && !outcome; attempt += 1) {
    if (!(await pickTown())) { trail.push({ attempt, note: 'Town Hall could not be picked', town: await town() }); break; }
    await setPrice(page, 600);
    const made = await oneSided();
    await page.waitForTimeout(200);
    if (!made) { trail.push({ attempt, note: 'no one sided fight on offer' }); break; }
    await clickText(page, 'Put the show on');
    await page.waitForTimeout(700);
    const st = JSON.parse(await saved(page)).st;
    trail.push({ attempt, rep: st.reputation, money: st.money, closed: st.closed });
    if (st.closed) break;
    await clickText(page, 'Plan the next show');
    await page.waitForTimeout(400);
    const t = await town();
    if (t && t.selected && t.disabled) {
      await buildCard(page, 1, attempt);
      await page.waitForTimeout(200);
      const hb = await hub(page);
      const saveB = await saved(page);
      await page.evaluate(() => document.querySelector('[data-boxing-forecast]')?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(250);
      await shot(page, 'boxing-390-locked-room-forecast');
      await clickText(page, 'Put the show on');
      await page.waitForTimeout(900);
      const res = await resultScreen(page);
      outcome = { lockedRoom: t.t, cardRows: hb.cardRows, forecastShown: !!hb.forecast, forecastText: hb.forecast?.text, runDisabled: hb.runDisabled, resultAppeared: res.planNext || res.closedButton, saveChanged: (await saved(page)) !== saveB };
    }
  }
  report.lockedRoom = { trail, outcome };
  log(`locked room: ${JSON.stringify(report.lockedRoom).slice(0, 900)}`);
  flush();
  await ctx.close();
} catch (e) { report.notes.push(`locked room: ${String(e).slice(0, 300)}`); flush(); }
await browser.close();
log(`walk-boxing done: ${report.shows} shows, ${report.mismatches.length} mismatches, notes ${report.notes.length}`);
