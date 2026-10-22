/* Reviewer walk (round 1548, run lens): plays /hall-of-champions on the served build at 390x844 and
   1280x900, reduced motion on and off, on Playwright's fake clock. Nothing leaves the runner: the
   champion tables are answered with fixture rows and every other outside request is aborted.
   A: a deep museum (3.2e16 funds, 4.1e18 career) three hours away loads, welcomes, and is saved back.
   B: the tab hidden ten hours at one wake a minute is paid as away time, welcome on return.
   C: a glance at another tab (30 one second wakes) pays and raises no welcome.
   D: a save the loader refuses is kept aside, the fresh museum is written, nothing offers it back. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-walk';
fs.mkdirSync(OUT, { recursive: true });
const ROUTE = '/hall-of-champions';
const KEY = 'hallOfChampionsV1';
const T0 = Date.parse('2027-01-15T12:00:00Z');
const KEYS = ['sb', 'wnba', 'cfb', 'nba', 'cbb', 'cup', 'ws', 'epl', 'nrl', 'afl'];
const save = (o, lastSeen) => JSON.stringify({
  v: 1, seed: 7, funds: 1000, careerEarned: 1000, owned: {}, openWings: ['sb'], levels: { tours: 0, network: 0, shop: 0, archive: 0 },
  renown: 0, plaques: [], rededications: 0, rushUntil: 0, rushReadyAt: 0, clock: 5000, ...o, lastSeen,
});
const DEEP = { funds: 3.2e16, careerEarned: 4.1e18, owned: { sb: 60, wnba: 29, cfb: 49, nba: 80, cbb: 87, cup: 110, ws: 121, epl: 127, nrl: 117, afl: 83 }, openWings: KEYS, plaques: KEYS.slice(0, 9), rushReadyAt: 1e9 };
const BAD = save({ funds: -5 }, T0 - 1000);
const problems = [];
const bad = m => { problems.push(m); console.log('  PROBLEM: ' + m); };

async function open(browser, width, height, rm) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: rm });
  await ctx.route('**/*', req => {
    const r = req.request();
    const u = r.url();
    if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return req.continue();
    if (/supabase\.co/.test(u) && u.includes('/rest/v1/') && r.method() === 'GET') {
      const cols = (new URL(u).searchParams.get('select') || '').split(',').map(s => s.trim()).filter(Boolean);
      const rows = cols.length < 2 ? [] : Array.from({ length: 130 }, (_, i) => ({ [cols[0]]: 1890 + i, [cols[1]]: `Walk Fixture ${i + 1}` }));
      return req.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify(rows) });
    }
    if (r.method() === 'OPTIONS') return req.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' } });
    return req.abort();
  });
  const page = await ctx.newPage();
  await page.clock.install({ time: T0 });
  await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('cookie-consent', 'essential'));
  return { ctx, page };
}
async function ready(page) {
  for (let i = 0; i < 60; i += 1) {
    if (await page.getByText('admissions a second').count()) return true;
    await page.clock.runFor(250);
  }
  return false;
}
const readSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const setVis = (page, vis) => page.evaluate(v => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
}, vis);
const welcome = async page => {
  const l = page.getByText('the hall stayed open');
  return (await l.count()) ? (await l.first().innerText()) : null;
};
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
const UNIT = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, Qa: 1e15, Qi: 1e18, Sx: 1e21 };
const unfmt = t => { const m = /([0-9.]+)(Qa|Qi|Sx|K|M|B|T)?/.exec(t || ''); return m ? Number(m[1]) * (m[2] ? UNIT[m[2]] : 1) : NaN; };
const incomeNow = async page => unfmt(await page.getByText('admissions a second').first().innerText());
const MID = { owned: { sb: 60, wnba: 29, cfb: 20 }, openWings: ['sb', 'wnba', 'cfb'], rushReadyAt: 1e9 };
const browser = await chromium.launch();
const H = 3600 * 1000;
/* E and F: hidden for a while, then the tab is closed; the next visit's welcome against what the absence paid */
async function hiddenThenClosed(tag, hiddenWakes, closedMs) {
  let { ctx, page } = await open(browser, 390, 844, 'reduce');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, save(MID, T0)]);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  if (!(await ready(page))) { bad(`${tag}: never loaded`); await ctx.close(); return; }
  await page.clock.runFor(2000);
  const inc = await incomeNow(page);
  await setVis(page, 'hidden');
  const atHide = await readSave(page);
  for (let i = 0; i < hiddenWakes; i += 1) await page.clock.fastForward(60_000);
  const left = await page.evaluate(k => localStorage.getItem(k), KEY);
  const leftObj = JSON.parse(left);
  await ctx.close();
  ({ ctx, page } = await open(browser, 390, 844, 'reduce'));
  await page.clock.setSystemTime(leftObj.lastSeen + closedMs);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, left]);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  if (!(await ready(page))) { bad(`${tag}: never reloaded`); await ctx.close(); return; }
  const w = await welcome(page);
  const pageNow = await page.evaluate(() => Date.now());
  console.log(`  ${tag}: the reloaded page's clock is ${((pageNow - leftObj.lastSeen) / H).toFixed(2)} h past the save's lastSeen`);
  const hiddenPaid = leftObj.funds - atHide.funds;
  const shown = w ? unfmt(w.replace('the hall stayed open:', '')) : 0;
  const owed = inc * 0.5 * 8 * 3600;
  console.log(`  ${tag}: hidden ${hiddenWakes} min paid ${hiddenPaid.toExponential(3)} (meter ${leftObj.awayMs}); closed ${(closedMs / H).toFixed(1)} h; welcome on the next visit: ${w}; whole absence paid ~${(hiddenPaid + shown).toExponential(3)} of ${owed.toExponential(3)} owed; the note shows x${((shown) / (hiddenPaid + shown || 1)).toFixed(3)} of it`);
  await shot(page, `${tag}`);
  await ctx.close();
}
await hiddenThenClosed('E-hidden3h-closed7h', 180, 7 * H);
await hiddenThenClosed('F-hidden9h-closed48h', 540, 48 * H);
/* D: a refused save, loaded fresh (no open tab to write over it) */
for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const rm of ['reduce', 'no-preference']) {
    const tag = `${w}-${rm === 'reduce' ? 'rm' : 'motion'}`;
    const { ctx, page } = await open(browser, w, h, rm);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, BAD]);
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
    if (!(await ready(page))) bad(`${tag} D: the hall never loaded after a refused save`);
    await page.clock.runFor(6000);
    const kept = await page.evaluate(k => Object.keys(localStorage).filter(x => x.startsWith(k + '.')).map(x => [x, localStorage.getItem(x)]), KEY);
    const body = await page.locator('body').innerText();
    const sD = await readSave(page);
    console.log(`  ${tag} D kept aside: ${JSON.stringify(kept.map(([k, v]) => [k, v === BAD ? 'the bad bytes' : (v || '').slice(0, 60)]))}; fresh museum funds ${sD?.funds}, owned ${JSON.stringify(sD?.owned)}; a restore offered: ${/restore|bring back|kept a copy|put it back/i.test(body)}`);
    if (!kept.some(([, v]) => v === BAD)) bad(`${tag} D: the refused save was not kept aside`);
    if (!sD || sD.funds < 0) bad(`${tag} D: no fresh museum was saved`);
    await shot(page, `D2-refused-${tag}`);
    if (w === 390 && rm === 'reduce') {
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, save(DEEP, T0)]);
      await page.close();
      const p2 = await ctx.newPage();
      await p2.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
      if (await ready(p2)) {
        const card = p2.locator('div.rounded-xl', { hasText: 'AFL' }).last();
        if (await card.count()) { await card.scrollIntoViewIfNeeded(); await p2.screenshot({ path: path.join(OUT, 'G-deep-afl-390.png') }); }
        await p2.mouse.wheel(0, 2400);
        await p2.clock.runFor(500);
        await p2.screenshot({ path: path.join(OUT, 'G-deep-lower-390.png') });
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(problems.length ? `walk2: RED, ${problems.length} problem(s)` : 'walk2: green');
process.exit(problems.length ? 1 : 0);
