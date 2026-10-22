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

const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const rm of ['reduce', 'no-preference']) {
    const tag = `${w}-${rm === 'reduce' ? 'rm' : 'motion'}`;
    console.log(`\n${tag}`);
    const { ctx, page } = await open(browser, w, h, rm);
    /* A: the deep museum */
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, save(DEEP, T0 - 3 * 3600 * 1000)]);
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
    if (!(await ready(page))) { bad(`${tag} A: the hall never loaded`); await shot(page, `A-noload-${tag}`); await ctx.close(); continue; }
    const wA = await welcome(page);
    const fundsLabel = await page.locator('.text-gold.tabular-nums').first().innerText().catch(() => '?');
    const acquire = await page.getByText(/^Acquire /).allInnerTexts().catch(() => []);
    console.log(`  A welcome: ${wA}; funds label ${fundsLabel}; acquire buttons: ${acquire.slice(0, 12).join(' | ')}`);
    if (!wA) bad(`${tag} A: three hours away showed no welcome`);
    if (!/Qa|Qi/.test(fundsLabel)) bad(`${tag} A: the funds label reads ${fundsLabel}, not Qa or Qi`);
    if (acquire.some(t => /[0-9]{5,}/.test(t.replace(/^Acquire \d{4}/, '')))) bad(`${tag} A: a price is a wall of digits`);
    const ov = await overflow(page);
    if (ov > 0) bad(`${tag} A: the page scrolls sideways by ${ov}px`);
    await shot(page, `A-deep-${tag}`);
    await shot(page, `A-deep-full-${tag}`, true);
    await page.clock.runFor(6000);
    const sA = await readSave(page);
    if (!sA || !(sA.funds >= 3.2e16) || sA.owned?.afl !== 83) bad(`${tag} A: the deep museum was not saved back (${JSON.stringify(sA)?.slice(0, 120)})`);
    else console.log(`  A saved back: funds ${sA.funds.toExponential(3)}, career ${sA.careerEarned.toExponential(3)}, afl ${sA.owned.afl}, awayMs ${sA.awayMs}`);
    const dismiss = page.getByLabel('Dismiss the offline earnings notice');
    if (await dismiss.count()) { await dismiss.first().click(); await page.clock.runFor(500); }
    /* B: ten hidden hours, one wake a minute */
    const inc = await incomeNow(page);
    await setVis(page, 'hidden');
    const s0 = await readSave(page);
    for (let i = 0; i < 600; i += 1) await page.clock.fastForward(60_000);
    const s1 = await readSave(page);
    await setVis(page, 'visible');
    await page.clock.runFor(1000);
    const wB = await welcome(page);
    const owed = inc * 0.5 * 8 * 3600;
    const paid = s1.funds - s0.funds;
    console.log(`  B hidden ten hours: paid ${paid.toExponential(4)}, income label ${inc.toExponential(3)}/s so eight away hours ~ ${owed.toExponential(4)} (x${(paid / owed).toFixed(3)}); meter ${s1.awayMs}; welcome: ${wB}`);
    if (!(paid / owed > 0.9 && paid / owed < 1.1)) bad(`${tag} B: ten hidden hours paid x${(paid / owed).toFixed(3)} of eight away hours`);
    if (s1.awayMs !== 28_800_000) bad(`${tag} B: the meter read ${s1.awayMs} after ten hidden hours`);
    if (!wB) bad(`${tag} B: no welcome on return from ten hidden hours`);
    else if (Math.abs(unfmt(wB.replace('the hall stayed open:', '')) / paid - 1) > 0.06) bad(`${tag} B: the welcome says ${wB} but the hall was paid ${paid.toExponential(3)}`);
    await shot(page, `B-return-${tag}`);
    if (await dismiss.count()) { await dismiss.first().click(); await page.clock.runFor(500); }
    /* C: a glance at another tab */
    const f0 = (await readSave(page)).funds;
    await setVis(page, 'hidden');
    for (let i = 0; i < 30; i += 1) await page.clock.fastForward(1000);
    const c1 = await readSave(page);
    await setVis(page, 'visible');
    await page.clock.runFor(1000);
    const wC = await welcome(page);
    console.log(`  C glance: paid ${(c1.funds - f0).toExponential(3)} in 30 hidden seconds (watched rate would be ${(inc * 30).toExponential(3)}, away rate ${(inc * 15).toExponential(3)}); welcome: ${wC}`);
    if (wC) bad(`${tag} C: a 30 second glance raised the welcome`);
    await shot(page, `C-glance-${tag}`);
    /* D: a refused save */
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, BAD]);
    await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
    if (!(await ready(page))) bad(`${tag} D: the hall never loaded after a refused save`);
    await page.clock.runFor(6000);
    const kept = await page.evaluate(k => Object.keys(localStorage).filter(x => x.startsWith(k + '.')).map(x => [x, localStorage.getItem(x)]), KEY);
    const body = await page.locator('body').innerText();
    const sD = await readSave(page);
    console.log(`  D kept aside: ${JSON.stringify(kept.map(([k, v]) => [k, v === BAD ? 'the bad bytes' : (v || '').slice(0, 40)]))}; fresh museum funds ${sD?.funds}; restore offered: ${/restore|bring back|kept a copy/i.test(body)}`);
    if (!kept.some(([, v]) => v === BAD)) bad(`${tag} D: the refused save was not kept aside`);
    if (!sD || sD.funds < 0) bad(`${tag} D: no fresh museum was saved`);
    await shot(page, `D-refused-${tag}`);
    await ctx.close();
  }
}
await browser.close();
console.log(problems.length ? `walk: RED, ${problems.length} problem(s)` : 'walk: green');
process.exit(problems.length ? 1 : 0);
