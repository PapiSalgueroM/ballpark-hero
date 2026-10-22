/* Fixer walk (round 1548): plays /hall-of-champions on the served build on Playwright's fake clock.
   Nothing leaves the runner: the champion tables get fixture rows, every other outside request is aborted.
   E: hidden 3 h, then closed 7 h: the next visit's note must equal what the whole absence paid.
   F: hidden 9 h, then closed 48 h: the next visit must show a note, equal to what the absence paid.
   B2: hidden 2 h, then back to the page: the return note equals the hidden pay; the shift of the money
       header when the note appears is measured (read review minor 8), not graded.
   G: a reload two hours away: the load's note is still the same words after the first watched seconds.
   Adapted from the run reviewer's walk2 (open, ready, setVis, fixture rows). */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-walk';
fs.mkdirSync(OUT, { recursive: true });
const ROUTE = '/hall-of-champions';
const KEY = 'hallOfChampionsV1';
const T0 = Date.parse('2027-01-15T12:00:00Z');
const H = 3600 * 1000;
const save = (o, lastSeen) => JSON.stringify({
  v: 1, seed: 7, funds: 1000, careerEarned: 1000, owned: {}, openWings: ['sb'], levels: { tours: 0, network: 0, shop: 0, archive: 0 },
  renown: 0, plaques: [], rededications: 0, rushUntil: 0, rushReadyAt: 0, clock: 5000, ...o, lastSeen,
});
const MID = { owned: { sb: 60, wnba: 29, cfb: 20 }, openWings: ['sb', 'wnba', 'cfb'], rushReadyAt: 1e9 };
const problems = [];
const bad = m => { problems.push(m); console.log('  PROBLEM: ' + m); };

async function open(browser, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
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
const UNIT = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, Qa: 1e15, Qi: 1e18, Sx: 1e21 };
const unfmt = t => { const m = /([0-9.]+)(Qa|Qi|Sx|K|M|B|T)?/.exec(t || ''); return m ? Number(m[1]) * (m[2] ? UNIT[m[2]] : 1) : NaN; };
const shownOf = w => (w ? unfmt(w.replace('the hall stayed open:', '')) : 0);
/* the note prints two significant figures, so it can be off by up to about 2.5 percent */
const close = (a, b) => b > 0 && Math.abs(a / b - 1) <= 0.03;
const browser = await chromium.launch();

async function hiddenThenClosed(tag, wakes, closedMs) {
  let { ctx, page } = await open(browser, 390, 844);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, save(MID, T0)]);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  if (!(await ready(page))) { bad(`${tag}: never loaded`); await ctx.close(); return; }
  await page.clock.runFor(2000);
  await setVis(page, 'hidden');
  const atHide = await readSave(page);
  for (let i = 0; i < wakes; i += 1) await page.clock.fastForward(60_000);
  const left = await page.evaluate(k => localStorage.getItem(k), KEY);
  const leftObj = JSON.parse(left);
  await ctx.close();
  ({ ctx, page } = await open(browser, 390, 844));
  await page.clock.setSystemTime(leftObj.lastSeen + closedMs);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, left]);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  if (!(await ready(page))) { bad(`${tag}: never reloaded`); await ctx.close(); return; }
  const w = await welcome(page);
  await setVis(page, 'hidden');
  const after = await readSave(page);
  const whole = after.funds - atHide.funds;
  const hidden = leftObj.funds - atHide.funds;
  console.log(`  ${tag}: hidden part paid ${hidden.toExponential(3)} (takings in the save ${leftObj.awayPaid?.toExponential(3)}, meter ${leftObj.awayMs}); the whole absence paid ${whole.toExponential(3)}; note: ${w}; the note shows x${(shownOf(w) / whole).toFixed(3)} of the whole absence`);
  if (!w) bad(`${tag}: the next visit showed no note`);
  else if (!close(shownOf(w), whole)) bad(`${tag}: the note shows x${(shownOf(w) / whole).toFixed(3)} of what the absence paid`);
  if (!(Math.abs(leftObj.awayPaid / hidden - 1) < 1e-9)) bad(`${tag}: the save's takings ${leftObj.awayPaid} are not the hidden pay ${hidden}`);
  await page.screenshot({ path: path.join(OUT, `fix-${tag}.png`) });
  await ctx.close();
}
await hiddenThenClosed('E-hidden3h-closed7h', 180, 7 * H);
await hiddenThenClosed('F-hidden9h-closed48h', 540, 48 * H);

/* B2: back to the page after two hidden hours, at both widths */
for (const [wd, ht] of [[390, 844], [1280, 900]]) {
  const tag = `B2-${wd}`;
  const { ctx, page } = await open(browser, wd, ht);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, save(MID, T0)]);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  if (!(await ready(page))) { bad(`${tag}: never loaded`); await ctx.close(); continue; }
  await page.clock.runFor(2000);
  const money = page.getByText('admissions a second').first();
  const yBefore = (await money.boundingBox())?.y;
  await setVis(page, 'hidden');
  const atHide = await readSave(page);
  for (let i = 0; i < 120; i += 1) await page.clock.fastForward(60_000);
  await setVis(page, 'visible');
  const atReturn = await readSave(page);
  const hiddenPaid = atReturn.funds - atHide.funds;
  const wNow = await welcome(page);
  await page.clock.runFor(300);
  const w = await welcome(page);
  const yAfter = (await money.boundingBox())?.y;
  console.log(`  ${tag}: two hidden hours paid ${hiddenPaid.toExponential(3)}; note at the visibility event: ${wNow}; 300 ms later: ${w} (x${(shownOf(w) / hiddenPaid).toFixed(3)} of the hidden pay); the money header moved ${yAfter - yBefore} px when the note appeared`);
  if (!w) bad(`${tag}: no note on return from two hidden hours`);
  else if (!close(shownOf(w), hiddenPaid)) bad(`${tag}: the return note shows x${(shownOf(w) / hiddenPaid).toFixed(3)} of the hidden pay`);
  await page.screenshot({ path: path.join(OUT, `fix-${tag}.png`) });
  await ctx.close();
}

/* G: a reload two hours after the save; the first watched seconds must not change the load's note */
{
  const { ctx, page } = await open(browser, 390, 844);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, save(MID, T0 - 2 * H)]);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  if (!(await ready(page))) bad('G: never loaded');
  else {
    const w1 = await welcome(page);
    await page.clock.runFor(2000);
    const w2 = await welcome(page);
    await setVis(page, 'hidden');
    const s = await readSave(page);
    if (s?.awayMs !== 0 || s?.awayPaid !== 0) bad(`G: watching did not close the absence (meter ${s?.awayMs}, takings ${s?.awayPaid})`);
    console.log(`  G: note at load: ${w1}; after two watched seconds: ${w2}; meter in the save ${s?.awayMs}, takings ${s?.awayPaid}`);
    if (!w1) bad('G: a reload two hours away showed no note');
    else if (w1 !== w2) bad(`G: the note changed from "${w1}" to "${w2}" in the first watched seconds`);
  }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? `walk3: RED, ${problems.length} problem(s)` : 'walk3: green');
process.exit(problems.length ? 1 : 0);
