// Release AM front reviewer, never committed. Fight Promoter (Round 1086) edge states on the built tree:
// a show that takes the cash below zero, and a room that locks behind the promoter.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4383';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = process.env.RC_OUT || 'C:/Users/antho/dukb-handoff/2026-10-08/review-shots/am-front';
const OUT = path.join(process.env.RC_OUT || HERE, 'walk-boxing-lock.json');
fs.mkdirSync(SHOTS, { recursive: true });
const SAVE = 'fight-promoter-save-v1';
const report = { cases: {}, notes: [] };
const flush = () => fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
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
const hubReady = page => page.waitForFunction(() => /Tonight's card/i.test(document.body.innerText), null, { timeout: 60000 });
async function fresh(page, name) {
  await page.goto(`${BASE}/fight-promoter`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('button[aria-label="Boxing"], #fight-promoter-name', { timeout: 60000 });
  if (await page.$('button[aria-label="Boxing"]')) await page.click('button[aria-label="Boxing"]');
  await page.waitForSelector('#fight-promoter-name', { timeout: 30000 });
  await page.fill('#fight-promoter-name', name);
  await page.click('text=Book your first room');
  await hubReady(page);
  await page.waitForTimeout(400);
}
async function seed(page, patch) {
  await page.evaluate(([k, p]) => { const s = JSON.parse(localStorage.getItem(k)); Object.assign(s.st, p); localStorage.setItem(k, JSON.stringify(s)); }, [SAVE, patch]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await hubReady(page);
  await page.waitForTimeout(500);
}
const saved = async page => JSON.parse((await page.evaluate(k => localStorage.getItem(k), SAVE)) || '{}').st;
const rawSave = page => page.evaluate(k => localStorage.getItem(k), SAVE);
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
const setPrice = (page, v) => page.$eval('#fight-promoter-price', (el, val) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(el, String(val));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, v);
const hub = page => page.evaluate(() => {
  const cardOf = label => [...document.querySelectorAll('div.rounded-lg.border.bg-card')].find(d => (d.querySelector('p')?.innerText || '').trim().toLowerCase().startsWith(label));
  const room = cardOf('the room');
  const f = document.querySelector('[data-boxing-forecast]');
  const val = sel => { const el = f?.querySelector(sel); return el ? { v: Number(el.getAttribute('data-value')), t: el.innerText.trim() } : null; };
  const run = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Put the show on');
  return {
    venues: room ? [...room.querySelectorAll('button')].map(b => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), disabled: b.disabled, selected: b.className.includes('border-primary') })) : [],
    runDisabled: run ? run.disabled : null,
    forecast: f ? {
      attendance: val('[data-boxing-attendance]'), gate: val('[data-boxing-gate]'), purses: val('[data-boxing-purses]'), rent: val('[data-boxing-rent]'),
      profit: val('[data-boxing-profit]'), cashAfter: val('[data-boxing-cash-after]'),
      status: [...f.querySelectorAll('[role="status"]')].map(x => x.innerText.trim()), text: f.innerText.replace(/\s+/g, ' ').trim(),
    } : null,
  };
});
const pickVenue = (page, name) => page.evaluate(n => {
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes(n));
  if (!b || b.disabled) return false; b.click(); return true;
}, name);
/* one bout: try each free fighter until somebody at his weight is free */
async function buildOne(page, preferOneSided) {
  for (let k = 0; k < 10; k += 1) {
    const ok = await page.evaluate(i => {
      const list = [...document.querySelectorAll('button')].filter(b => !b.disabled && /draw \d+/.test(b.innerText));
      if (!list[i]) return false; list[i].click(); return true;
    }, k);
    if (!ok) return false;
    await page.waitForTimeout(150);
    const foe = await page.evaluate(one => {
      const foes = [...document.querySelectorAll('button')].filter(b => /appeal \d+/.test(b.innerText));
      if (!foes.length) return null;
      const pick = (one && foes.find(b => b.innerText.includes('cannot live'))) || foes[0];
      const t = pick.innerText.replace(/\s+/g, ' ').trim(); pick.click(); return t;
    }, preferOneSided);
    if (foe) { await page.waitForTimeout(200); return foe; }
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Pick somebody else')); if (b) b.click(); });
    await page.waitForTimeout(150);
  }
  return false;
}
const clickText = (page, text) => page.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => !x.disabled && x.innerText.trim().startsWith(t)); if (!b) return false; b.click(); return true; }, text);
const resultScreen = page => page.evaluate(() => {
  const t = document.body.innerText;
  const num = s => Number(String(s).replace(/,/g, ''));
  const m1 = (document.querySelector('p.animate-count-pop')?.innerText || '').match(/([\d,]+) in\b/);
  const m3 = t.match(/(Profit|Loss) ([\d.,]+)m/);
  const head = document.querySelector('h2.truncate.text-lg')?.parentElement?.parentElement?.innerText.replace(/\s+/g, ' ') ?? '';
  const hm = head.match(/(-?[\d.,]+)m/);
  return { attendance: m1 ? num(m1[1]) : null, profit: m3 ? (m3[1] === 'Loss' ? -1 : 1) * num(m3[2]) : null, headerMoney: hm ? num(hm[1]) : null, closedButton: /See how you are remembered/.test(t), planNext: /Plan the next show/.test(t) };
});
const centerForecast = async page => { await page.evaluate(() => document.querySelector('[data-boxing-forecast]')?.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); };

/* Case 3: a room that locks behind you, forced with a one sided fight at Town Hall on a name of exactly 12. */
const NAMES = ['Lock A', 'Lock B', 'Lock C', 'Lock D', 'Lock E', 'Lock F', 'Lock G', 'Lock H', 'Lock I', 'Lock J', 'Lock K', 'Lock L'];
const trail = [];
let outcome = null;
for (const name of NAMES) {
  if (outcome) break;
  try {
    const { ctx, page } = await open(390, 844);
    await fresh(page, name);
    await seed(page, { reputation: 12, money: 0.5 });
    if (!(await pickVenue(page, 'Town Hall'))) { trail.push({ name, note: 'Town Hall cannot be picked' }); await ctx.close(); continue; }
    await setPrice(page, 600);
    let bout = null;
    for (let k = 0; k < 10 && !bout; k += 1) {
      const ok = await page.evaluate(i => { const list = [...document.querySelectorAll('button')].filter(b => !b.disabled && /draw \d+/.test(b.innerText)); if (!list[i]) return false; list[i].click(); return true; }, k);
      if (!ok) break;
      await page.waitForTimeout(150);
      bout = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /appeal \d+/.test(x.innerText) && x.innerText.includes('cannot live')); if (!b) return null; const t = b.innerText.replace(/\s+/g, ' ').trim(); b.click(); return t; });
      if (!bout) { await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Pick somebody else')); if (b) b.click(); }); await page.waitForTimeout(150); }
    }
    if (!bout) { trail.push({ name, note: 'no one sided fight on offer' }); await ctx.close(); continue; }
    await page.waitForTimeout(200);
    await clickText(page, 'Put the show on');
    await page.waitForTimeout(800);
    const st = await saved(page);
    trail.push({ name, rep: st.reputation, bout: bout.slice(0, 70) });
    if (st.reputation < 12 && !st.closed) {
      await clickText(page, 'Plan the next show');
      await page.waitForTimeout(500);
      const h = await hub(page);
      const town = h.venues.find(v => v.t.startsWith('Town Hall'));
      const made = await buildOne(page, false);
      const hb = await hub(page);
      const before = await rawSave(page);
      await centerForecast(page);
      await shot(page, 'boxing-390-locked-room-forecast');
      const pressed = await clickText(page, 'Put the show on');
      await page.waitForTimeout(1200);
      const res = await resultScreen(page);
      await shot(page, 'boxing-390-locked-room-after-press');
      outcome = { name, town, made, forecast: hb.forecast, runDisabled: hb.runDisabled, pressed, resultAppeared: res.planNext || res.closedButton, saveChanged: (await rawSave(page)) !== before, bodyHasMessage: await page.evaluate(() => /will not have you|needs a bigger name|pick another room/i.test(document.body.innerText)) };
    }
    await ctx.close();
  } catch (e) { report.notes.push(`${name}: ${String(e).slice(0, 300)}`); }
}
report.cases.lockedRoom = { trail, outcome };
flush();
console.log('lockedRoom', JSON.stringify(report.cases.lockedRoom).slice(0, 2600));
await browser.close();
console.log(`walk-boxing-lock done: reproduced ${!!outcome}, notes ${report.notes.length}`);
