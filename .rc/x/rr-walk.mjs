/* Reviewer's walk for Round 1144 (runner lens). Runs on the remote check runner against the served build.
   BASE is the served site, RC_OUT takes the screenshots and walk.json. Nothing leaves the origin. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'nba-my-career-save-v1';
const WORDS = 'could not be saved. Stay on this page and use Retry save.';
const out = { base: BASE, journeys: {} };
const origin = new URL(BASE).origin;
let aborted = 0;

/* REAL quota: fill the browser's own localStorage until nothing more fits, once per tab. */
function fillReal() {
  try {
    if (sessionStorage.getItem('__rr_filled')) return;
    sessionStorage.setItem('__rr_filled', '1');
    let n = 0;
    for (const size of [1048576, 65536, 4096, 256, 16, 1]) {
      const s = 'x'.repeat(size);
      for (;;) { try { localStorage.setItem(`__f${size}_${n}`, s); n += 1; } catch { break; } }
    }
    window.__rrFilled = n;
  } catch (e) { window.__rrFillError = String(e); }
}
/* SIMULATED full, the harness's own shape: every write throws until the walk hands the real setItem back. */
function breakWrites() {
  const set = Storage.prototype.setItem;
  Object.defineProperty(window, '__rrRealSet', { value: set, enumerable: false, configurable: true });
  Storage.prototype.setItem = function setItem() { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); };
}

const read = page => page.evaluate(([k, words]) => {
  const rect = el => { if (!el) return null; const q = el.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom), l: Math.round(q.left), r: Math.round(q.right), w: Math.round(q.width), h: Math.round(q.height) }; };
  const onTop = el => { if (!el) return false; const q = el.getBoundingClientRect(); if (q.height <= 0) return false; const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!top && el.contains(top); };
  const line = document.querySelector('[data-dukb-storage-notice]');
  const left = document.querySelector('[data-dukb-storage-notice-left]');
  const notice = document.querySelector('[data-us-career-save-error]');
  const toast = [...document.querySelectorAll('[data-sonner-toast]')].find(t => (t.textContent ?? '').includes(words)) ?? null;
  const tbtn = toast ? toast.querySelector('[data-button]') : null;
  const banner = document.querySelector('[aria-label="Cookie choices"]');
  const game = document.getElementById('dukb-main') ?? document.querySelector('main');
  let disk = null; try { disk = localStorage.getItem(k); } catch { disk = 'THROWS'; }
  let consent = null; try { consent = localStorage.getItem('cookie-consent'); } catch { consent = 'THROWS'; }
  let free = null;
  return {
    line: line ? { says: line.getAttribute('data-dukb-storage-notice'), box: rect(line), text: (line.textContent ?? '').trim().slice(0, 90) } : null,
    left: left ? { box: rect(left), vis: getComputedStyle(left).visibility, ariaHidden: left.getAttribute('aria-hidden'), role: left.getAttribute('role') } : null,
    notice: notice ? { box: rect(notice), onTop: onTop(notice), text: (notice.textContent ?? '').trim().slice(0, 140) } : null,
    toast: toast ? { box: rect(toast), onTop: onTop(toast), text: (toast.textContent ?? '').trim().slice(0, 140) } : null,
    toastButton: tbtn ? { box: rect(tbtn), onTop: onTop(tbtn), text: (tbtn.textContent ?? '').trim() } : null,
    toasts: document.querySelectorAll('[data-sonner-toast]').length,
    banner: banner ? { box: rect(banner), pos: getComputedStyle(banner).position } : null,
    gameTop: game ? Math.round(game.getBoundingClientRect().top + window.scrollY) : null,
    careerOnDisk: disk === null ? null : disk === 'THROWS' ? 'THROWS' : disk.length,
    consentOnDisk: consent,
    retryButtons: [...document.querySelectorAll('button')].filter(b => /^retry/i.test((b.textContent ?? '').trim())).map(b => (b.textContent ?? '').trim()),
    broke: (document.body.textContent ?? '').includes('This page broke'),
    sideways: document.documentElement.scrollWidth > window.innerWidth,
    scrollY: Math.round(window.scrollY), free,
  };
}, [KEY, WORDS]);
const overlap = (a, b) => (a && b) ? Math.max(0, Math.min(Math.min(a.b, b.b) - Math.max(a.t, b.t), Math.min(a.r, b.r) - Math.max(a.l, b.l))) : null;
const clickText = (page, source) => page.evaluate(src => { const rx = new RegExp(src, 'i'); const b = [...document.querySelectorAll('button')].find(x => !x.disabled && rx.test((x.textContent ?? '').trim())); if (b) b.click(); return !!b; }, source);
const waitButton = (page, source, timeout) => page.waitForFunction(src => { const rx = new RegExp(src, 'i'); return [...document.querySelectorAll('button')].some(b => rx.test((b.textContent ?? '').trim())); }, source, { timeout });

const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
async function open(name, { width, height, reduce, init }) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  if (init) await ctx.addInitScript(init);
  await ctx.route('**/*', r => {
    const url = r.request().url(); let same = true;
    try { same = new URL(url).origin === origin; } catch { same = true; }
    if (!same) { if (url.includes('supabase.co')) aborted += 1; return r.abort(); }
    return r.continue();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e).split('\n')[0].slice(0, 200)));
  const J = { name, width, height, reduce, errors, steps: {} };
  out.journeys[name] = J;
  return { ctx, page, J };
}
async function toDraft(page) {
  await page.goto(`${BASE}/nba-my-career`, { waitUntil: 'load', timeout: 45000 });
  await waitButton(page, '^Play your road to the draft$', 30000);
  await waitButton(page, "Let.s Play", 8000).catch(() => {});
  for (let i = 0; i < 3 && await clickText(page, "Let.s Play"); i += 1) await page.waitForTimeout(350);
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});

/* J1: REAL quota, the store is full to the last characters. A little room is freed (not enough for
   the career), Retry is pressed and refused again. Does the line still say the storage is full? */
async function realQuota() {
  const { ctx, page, J } = await open('j1-real-quota-390', { width: 390, height: 844, reduce: false, init: fillReal });
  try {
    await toDraft(page);
    J.filled = await page.evaluate(() => ({ keys: window.__rrFilled ?? null, err: window.__rrFillError ?? null, len: localStorage.length }));
    J.steps.loaded = await read(page);
    await clickText(page, '^Play your road to the draft$');
    await page.waitForTimeout(900);
    J.steps.refused = await read(page);
    await shot(page, 'j1-1-full-refused');
    /* free about 260 characters: one of the 256 character fillers goes */
    J.freedKey = await page.evaluate(() => { for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); if (k && k.startsWith('__f256_')) { localStorage.removeItem(k); return k; } } return null; });
    const btn = page.locator('[data-sonner-toast] [data-button]').first();
    J.toastRetryPressed = await btn.click({ timeout: 3000 }).then(() => true, e => String(e).split('\n')[0].slice(0, 160));
    await page.waitForTimeout(900);
    J.steps.afterRefusedRetry = await read(page);
    await shot(page, 'j1-2-after-refused-retry');
    /* is it the same after a press on something inert, or does only time pass? */
    await page.waitForTimeout(1200);
    J.steps.later = await read(page);
    /* now make real room and use the notice's own Retry save */
    J.freedAll = await page.evaluate(() => { const ks = []; for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); if (k && k.startsWith('__f')) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); return ks.length; });
    J.retrySavePressed = await clickText(page, '^Retry save$');
    await page.waitForTimeout(900);
    J.steps.afterRealRetry = await read(page);
    await shot(page, 'j1-3-after-real-retry');
  } catch (e) { J.stopped = String(e).split('\n')[0].slice(0, 240); await shot(page, 'j1-stopped'); }
  await ctx.close();
}

/* J2..J4: the harness's shape of full (every write throws), a first visit, looked at and measured. */
async function simFull(name, width, height, reduce) {
  const { ctx, page, J } = await open(name, { width, height, reduce, init: breakWrites });
  try {
    await toDraft(page);
    J.steps.loaded = await read(page);
    await clickText(page, '^Play your road to the draft$');
    await page.waitForTimeout(900);
    const s = await read(page); J.steps.refused = s;
    J.toastOverBanner = overlap(s.toast?.box, s.banner?.box);
    J.toastOverNotice = overlap(s.toast?.box, s.notice?.box);
    await shot(page, `${name}-1-refused`);
    /* Retry on the toast while the browser still refuses: the toast should stay, with its button */
    const btn = page.locator('[data-sonner-toast] [data-button]').first();
    J.pressWhileRefused = await btn.click({ timeout: 3000 }).then(() => true, e => String(e).split('\n')[0].slice(0, 160));
    await page.waitForTimeout(700);
    J.steps.stillRefused = await read(page);
    /* writes come back, Retry on the toast again */
    await page.evaluate(() => { if (window.__rrRealSet) Storage.prototype.setItem = window.__rrRealSet; });
    J.pressWhenOpen = await btn.click({ timeout: 3000 }).then(() => true, e => String(e).split('\n')[0].slice(0, 160));
    await page.waitForTimeout(900);
    const a = await read(page); J.steps.saved = a;
    J.gameMoved = s.gameTop !== null && a.gameTop !== null ? s.gameTop - a.gameTop : null;
    await shot(page, `${name}-2-saved`);
    /* the banner is answered: where does the next toast sit, and is the choice on the store */
    J.essentialPressed = await clickText(page, 'Essential only');
    await page.waitForTimeout(500);
    J.steps.answered = await read(page);
  } catch (e) { J.stopped = String(e).split('\n')[0].slice(0, 240); await shot(page, `${name}-stopped`); }
  await ctx.close();
}

/* J5: REAL quota. A cookie choice made while the line says full, then room is made and the line
   leaves. Is the choice on the store? What does the next page load show? */
async function keptNotFlushed() {
  const { ctx, page, J } = await open('j5-kept-390', { width: 390, height: 844, reduce: true, init: fillReal });
  try {
    await toDraft(page);
    J.steps.loaded = await read(page);
    J.essentialPressed = await clickText(page, 'Essential only');
    await page.waitForTimeout(500);
    J.steps.answered = await read(page);
    J.freedAll = await page.evaluate(() => { const ks = []; for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); if (k && k.startsWith('__f')) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); return ks.length; });
    const line = page.locator('[data-dukb-storage-notice]').first();
    J.inertPress = await line.click({ timeout: 3000, force: true }).then(() => true, e => String(e).split('\n')[0].slice(0, 160));
    await page.waitForTimeout(900);
    J.steps.lineLeft = await read(page);
    await shot(page, 'j5-1-line-left');
    await page.reload({ waitUntil: 'load' });
    await waitButton(page, '^Play your road to the draft$', 30000);
    await page.waitForTimeout(1200);
    J.steps.reloaded = await read(page);
    await shot(page, 'j5-2-reloaded');
  } catch (e) { J.stopped = String(e).split('\n')[0].slice(0, 240); await shot(page, 'j5-stopped'); }
  await ctx.close();
}

await realQuota();
await simFull('j2-sim-390-reduce', 390, 844, true);
await simFull('j3-sim-1280-motion', 1280, 900, false);
await simFull('j4-sim-390-motion', 390, 844, false);
await simFull('j6-sim-1280-reduce', 1280, 900, true);
await keptNotFlushed();
await browser.close();
out.aborted = aborted;
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(out, null, 1));
for (const [n, J] of Object.entries(out.journeys)) {
  const brief = Object.fromEntries(Object.entries(J.steps).map(([k, s]) => [k, `line=${s.line ? s.line.says : s.left ? 'LEFT(spacer)' : 'none'} notice=${s.notice ? 'up' : 'none'} toast=${s.toast ? `${s.toast.box.t}..${s.toast.box.b}` : 'none'} banner=${s.banner ? `${s.banner.box.t}..${s.banner.box.b}` : 'none'} career=${s.careerOnDisk} consent=${s.consentOnDisk} gameTop=${s.gameTop}`]));
  console.log(n, JSON.stringify({ ...J, steps: brief }, null, 1));
}
console.log(`rr-walk: ${Object.keys(out.journeys).length} journeys walked, supabase.co aborted ${aborted}`);
