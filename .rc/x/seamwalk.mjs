// AN2 integrator's seam probe (never committed). Where Round 1084 (a refused US career save is said, with Retry
// save) meets Round 1142 (the storage seam and its one line notice), on the served build, in a real browser.
//   open     ordinary storage: neither notice, the save reaches the browser's store
//   blocked  reading storage throws: 1142's line only, the page plays, NO Retry notice (the seam's store takes the write)
//   full     every write throws: 1142's line AND 1084's notice; storage comes back, Retry save writes the save
// Reads BASE and RC_OUT. Blocks the database host. Exit 1 on any PROBLEM line.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/seamwalk-out');
fs.mkdirSync(OUT, { recursive: true });
const SPORTS = [['nba', 'nba-my-career-save-v1'], ['nfl', 'nfl-my-career-save-v1'], ['mlb', 'mlb-my-career-save-v1'], ['nhl', 'nhl-my-career-save-v1']];
const MODES = ['open', 'blocked', 'full'];
let problems = 0;
const note = (...a) => console.log(a.join(' '));
const bad = (...a) => { problems += 1; note('PROBLEM', ...a); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function breakStorage({ mode }) {
  let real = null;
  try { real = window.localStorage; } catch (e) { /* none */ }
  Object.defineProperty(window, '__probeReal', { value: real, enumerable: false, configurable: true });
  Object.defineProperty(window, '__probeRefused', { value: { total: 0 }, enumerable: false, configurable: true });
  if (mode === 'blocked') {
    for (const name of ['localStorage', 'sessionStorage']) {
      const boom = () => { throw new DOMException(`Failed to read the '${name}' property from 'Window': Access is denied for this document.`, 'SecurityError'); };
      const own = Object.getOwnPropertyDescriptor(window, name);
      Object.defineProperty(window, name, { configurable: own ? own.configurable : true, enumerable: true, get: boom });
    }
    if (window.LockManager && window.LockManager.prototype) {
      window.LockManager.prototype.request = function request() { return Promise.reject(new DOMException('The request was denied.', 'SecurityError')); };
    }
  } else if (mode === 'full') {
    const set = Storage.prototype.setItem;
    Object.defineProperty(window, '__probeRealSet', { value: set, enumerable: false, configurable: true });
    Storage.prototype.setItem = function setItem() { window.__probeRefused.total += 1; throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); };
  }
}

const state = (page, key) => page.evaluate(k => {
  const r = el => { if (!el) return null; const q = el.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right) }; };
  const retry = document.querySelector('[data-us-career-save-error]');
  const line = document.querySelector('[data-dukb-storage-notice]');
  const header = document.querySelector('header');
  let onDisk = null;
  try { onDisk = window.__probeReal ? window.__probeReal.getItem(k) : null; } catch (e) { onDisk = 'THROWS'; }
  let phase = null;
  try { phase = onDisk ? JSON.parse(onDisk).phase : null; } catch (e) { phase = 'UNREADABLE'; }
  return {
    retry: retry ? { op: retry.getAttribute('data-save-operation'), rect: r(retry), words: retry.querySelector('p')?.textContent ?? '' } : null,
    line: line ? { trouble: line.getAttribute('data-dukb-storage-notice'), rect: r(line), words: (line.textContent ?? '').trim().slice(0, 60) } : null,
    header: r(header),
    toasts: [...document.querySelectorAll('[data-sonner-toast]')].map(t => (t.textContent ?? '').trim().slice(0, 90)),
    prospect: /road to the draft|Draft stock|Combine|Pro day|Scout/i.test(document.querySelector('#root')?.textContent ?? ''),
    broke: /This page broke/.test(document.body.textContent ?? ''),
    diskPhase: phase, refused: window.__probeRefused.total, sideways: document.documentElement.scrollWidth > window.innerWidth,
  };
}, key);

const clickText = (page, re) => page.evaluate(src => {
  const rx = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && rx.test((x.textContent ?? '').trim()));
  if (b) b.click();
  return !!b;
}, re.source);

const browser = await chromium.launch();
for (const [sport, key] of SPORTS) for (const mode of MODES) {
  const tag = `${sport} ${mode}`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(breakStorage, { mode });
  const page = await ctx.newPage();
  const errors = [];
  const origin = new URL(BASE).origin;
  await page.route(/supabase\.co/, r => r.abort());
  await page.route('**/*', r => { let same = true; try { same = new URL(r.request().url()).origin === origin; } catch { same = true; } return same ? r.continue() : r.abort(); });
  page.on('pageerror', e => errors.push(String(e?.message ?? e).split('\n')[0].slice(0, 160)));
  try {
    await page.goto(`${BASE}/${sport}-my-career`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play your road to the draft|Let's Play/i.test(b.textContent ?? '')), null, { timeout: 30000 });
    await clickText(page, /^Let's Play/);
    await sleep(400);
    const pressed = await clickText(page, /^Play your road to the draft$/);
    await sleep(900);
    const s = await state(page, key);
    await page.screenshot({ path: path.join(OUT, `seam-${sport}-${mode}.png`) });
    note(`${tag}: pressed ${pressed} | retry notice ${s.retry ? s.retry.op + ' ' + JSON.stringify(s.retry.rect) : 'none'} | storage line ${s.line ? s.line.trouble + ' ' + JSON.stringify(s.line.rect) : 'none'} | header ${JSON.stringify(s.header)} | toasts ${JSON.stringify(s.toasts)} | on the browser's store: ${s.diskPhase} | refused ${s.refused} | errors ${errors.length}`);
    if (!pressed) bad(tag, 'the road to the draft button was not there');
    if (s.broke || errors.length) bad(tag, `page error: ${errors.slice(0, 2).join(' | ') || 'This page broke'}`);
    if (s.sideways) bad(tag, 'the page scrolls sideways at 390');
    if (mode === 'open' && (s.retry || s.line || s.diskPhase !== 'prospect')) bad(tag, 'ordinary storage should show no notice and hold the prospect');
    if (mode === 'blocked' && (s.retry || s.line?.trouble !== 'blocked')) bad(tag, `blocked should show the storage line only (retry ${!!s.retry}, line ${s.line?.trouble})`);
    if (mode === 'full') {
      if (!s.retry || s.retry.op !== 'write') bad(tag, 'full storage should show the Retry save notice for a write');
      if (s.line?.trouble !== 'full') bad(tag, `full storage should show the storage line as full (${s.line?.trouble})`);
      if (s.diskPhase !== null) bad(tag, `nothing should have reached the browser's store yet (${s.diskPhase})`);
      if (s.retry && s.line && s.retry.rect.t < s.line.rect.b && s.line.rect.t < s.retry.rect.b) bad(tag, `the two notices overlap: ${JSON.stringify(s.retry.rect)} and ${JSON.stringify(s.line.rect)}`);
      /* the device takes writes again: Retry save must write the prospect and take the notice away */
      await page.evaluate(() => { Storage.prototype.setItem = window.__probeRealSet; });
      await clickText(page, /^Retry save$/);
      await sleep(500);
      const after = await state(page, key);
      note(`${tag}: after Retry save | retry notice ${after.retry ? 'STILL UP' : 'gone'} | on the browser's store: ${after.diskPhase} | storage line ${after.line ? after.line.trouble : 'none'}`);
      if (after.retry || after.diskPhase !== 'prospect') bad(tag, 'Retry save should have written the prospect and taken the notice away');
      await page.screenshot({ path: path.join(OUT, `seam-${sport}-${mode}-after-retry.png`) });
    }
  } catch (e) { bad(tag, `the walk threw: ${String(e).split('\n')[0].slice(0, 300)}`); }
  await ctx.close();
}
await browser.close();
console.log(`seamwalk: ${SPORTS.length * MODES.length} journeys, ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
