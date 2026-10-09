/* Reviewer's second walk for Round 1144: a RETURNING player whose store is really full (real Chromium
   quota, not a patched setItem). A page that rewrites keys it already has (same size, so the browser
   takes them even when full) is visited first. What does the line say there, and on the next game? */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
fs.mkdirSync(OUT, { recursive: true });
const origin = new URL(BASE).origin;
const out = {};

/* seeds a returning player's keys, then fills the store to the last characters, once per tab */
function seedAndFill(seeds) {
  try {
    if (sessionStorage.getItem('__rr_filled')) return;
    sessionStorage.setItem('__rr_filled', '1');
    for (const [k, v] of seeds) localStorage.setItem(k, v);
    let n = 0;
    for (const size of [1048576, 65536, 4096, 256, 16, 1]) {
      const s = 'x'.repeat(size);
      for (;;) { try { localStorage.setItem(`__f${size}_${n}`, s); n += 1; } catch { break; } }
    }
    window.__rrFilled = n;
  } catch (e) { window.__rrFillError = String(e); }
}
/* every 40 ms: what the line says, so a line that shows and leaves inside a second is seen */
function sampleLine() {
  window.__rrLine = [];
  const t0 = performance.now();
  setInterval(() => {
    const on = document.querySelector('[data-dukb-storage-notice]');
    const left = document.querySelector('[data-dukb-storage-notice-left]');
    const s = on ? on.getAttribute('data-dukb-storage-notice') : left ? 'left' : 'none';
    const last = window.__rrLine[window.__rrLine.length - 1];
    if (!last || last[1] !== s) window.__rrLine.push([Math.round(performance.now() - t0), s]);
  }, 40);
}
const state = page => page.evaluate(() => {
  const on = document.querySelector('[data-dukb-storage-notice]');
  const left = document.querySelector('[data-dukb-storage-notice-left]');
  const tryWrite = (k, v) => { try { localStorage.setItem(k, v); localStorage.removeItem(k); return 'TAKEN'; } catch (e) { return `refused (${e.name})`; } };
  return {
    path: location.pathname,
    line: on ? on.getAttribute('data-dukb-storage-notice') : left ? 'LEFT (invisible spacer)' : 'none',
    lineHistory: window.__rrLine ?? null,
    probeKeyWrite: tryWrite('__dukb_storage_probe__', '1'),
    newKeyWrite: tryWrite('__rr_new_key', 'x'.repeat(40)),
    saveNotice: !!document.querySelector('[data-us-career-save-error]'),
    saveToast: [...document.querySelectorAll('[data-sonner-toast]')].some(t => (t.textContent ?? '').includes('could not be saved')),
    nbaOnDisk: localStorage.getItem('nba-my-career-save-v1') === null ? null : 'there',
    predictionsOnDisk: localStorage.getItem('wc2026-predictions'),
    broke: (document.body.textContent ?? '').includes('This page broke'),
    loads: performance.getEntriesByType('navigation').length,
  };
});
const clickText = (page, source) => page.evaluate(src => { const rx = new RegExp(src, 'i'); const b = [...document.querySelectorAll('button')].find(x => !x.disabled && rx.test((x.textContent ?? '').trim())); if (b) b.click(); return !!b; }, source);
const waitButton = (page, source, timeout) => page.waitForFunction(src => { const rx = new RegExp(src, 'i'); return [...document.querySelectorAll('button')].some(b => rx.test((b.textContent ?? '').trim())); }, source, { timeout });
const SEEDS = [['cookie-consent', 'essential'], ['wc2026-predictions', '{}'], ['wc2026-show-bracket', 'false'], ['wc2026-selected-thirds', '[]'], ['wc2026-playoff-picks', '{}']];

const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
async function journey(name, first) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(seedAndFill, SEEDS);
  await ctx.addInitScript(sampleLine);
  await ctx.route('**/*', r => { let same = true; try { same = new URL(r.request().url()).origin === origin; } catch { same = true; } return same ? r.continue() : r.abort(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e).split('\n')[0].slice(0, 200)));
  const J = { first, errors }; out[name] = J;
  try {
    await page.goto(`${BASE}${first}`, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3500);
    J.filled = await page.evaluate(() => ({ keys: window.__rrFilled ?? null, err: window.__rrFillError ?? null }));
    J.onFirstPage = await state(page);
    await page.screenshot({ path: path.join(OUT, `${name}-1-first-page.png`) });
    if (first !== '/nba-my-career') {
      /* on to another game without a page load, the way a link in the app does it */
      await page.evaluate(() => { history.pushState({}, '', '/nba-my-career'); window.dispatchEvent(new PopStateEvent('popstate')); });
    }
    await waitButton(page, '^Play your road to the draft$', 30000);
    await waitButton(page, "Let.s Play", 6000).catch(() => {});
    for (let i = 0; i < 3 && await clickText(page, "Let.s Play"); i += 1) await page.waitForTimeout(350);
    await page.waitForTimeout(600);
    J.onNba = await state(page);
    J.pressed = await clickText(page, '^Play your road to the draft$');
    await page.waitForTimeout(1000);
    J.afterRefusedSave = await state(page);
    await page.screenshot({ path: path.join(OUT, `${name}-2-nba-save-refused.png`) });
  } catch (e) { J.stopped = String(e).split('\n')[0].slice(0, 240); await page.screenshot({ path: path.join(OUT, `${name}-stopped.png`) }).catch(() => {}); }
  await ctx.close();
}
await journey('k1-bracket-first', '/world-cup-bracket');
await journey('k2-nba-direct', '/nba-my-career');
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk2.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
console.log(`rr-walk2: ${Object.keys(out).length} journeys walked`);
