// Reviewer probe 3: storage FULL with a guest handle ALREADY stored (a returning player), with a legacy one, and with none.
import { chromium } from 'playwright';

const BASE = process.env.NEW ?? process.env.BASE ?? 'http://localhost:4173';
const PHONE = { width: 390, height: 844 };

function fullStorage({ seed }) {
  window.__w = { keys: {}, total: 0, frames: 0 };
  const tick = () => { window.__w.frames += 1; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  if (seed) { try { window.localStorage.setItem('dukb-guest-handle', seed); } catch (e) { /* none */ } }
  Storage.prototype.setItem = function setItem(k) {
    window.__w.total += 1;
    window.__w.keys[k] = (window.__w.keys[k] || 0) + 1;
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  };
}
async function settle(page, capMs = 8000) {
  const started = Date.now();
  let last = ''; let same = 0;
  while (Date.now() - started < capMs) {
    const sig = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return 'noroot';
      return `${root.querySelectorAll('button').length}/${root.querySelectorAll('a[href]').length}/${!!root.querySelector('[aria-label="Loading"]')}/${!!document.getElementById('dukb-boot')}`;
    }).catch(() => 'gone');
    if (sig === last && !/true/.test(sig)) same += 1; else same = 0;
    if (same >= 3) return;
    last = sig;
    await page.waitForTimeout(250);
  }
}
const snap = page => page.evaluate(() => ({ total: window.__w.total, keys: { ...window.__w.keys }, frames: window.__w.frames, h1: ((document.querySelector('#root h1') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 30), path: location.pathname, handle: (() => { try { return localStorage.getItem('dukb-guest-handle'); } catch (e) { return 'threw'; } })(), notice: (document.querySelector('[data-dukb-storage-notice]') || {}).innerText || null }));

const browser = await chromium.launch();
for (const [name, seed] of [['no handle stored', ''], ['a current handle stored', 'ClinicalVolley-42'], ['a legacy handle stored', 'Baller-1234']]) {
  for (const route of ['/soccer-career', '/footle', '/club-manager']) {
    const ctx = await browser.newContext({ viewport: PHONE });
    await ctx.addInitScript(fullStorage, { seed });
    const page = await ctx.newPage();
    const origin = new URL(BASE).origin;
    await page.route('**/*', r => { let same = true; try { same = new URL(r.request().url()).origin === origin; } catch { same = true; } return same ? r.continue() : r.abort(); });
    try {
      await page.goto(BASE + route, { waitUntil: 'load' });
      await settle(page);
      const banner = page.locator('[role="region"][aria-label="Cookie choices"]');
      if (await banner.count()) await banner.getByRole('button', { name: 'Essential only', exact: true }).click().catch(() => {});
      await page.waitForTimeout(500);
      const a = await snap(page);
      await page.waitForTimeout(1000);
      const b = await snap(page);
      await page.evaluate(() => { const l = document.querySelector('footer a[href="/whats-new"]'); if (l) l.click(); });
      const started = Date.now();
      let drewAt = null;
      while (Date.now() - started < 12000) {
        await page.waitForTimeout(250);
        const now = await snap(page).catch(() => b);
        if (now.h1 !== b.h1) { drewAt = Date.now() - started; break; }
      }
      console.log(`FULL, ${name}, ${route}: stored handle "${b.handle}", notice "${b.notice}", idle second ${b.total - a.total} refused writes (${Object.entries(b.keys).map(([k, n]) => k + ' x' + n).slice(0, 3).join(', ')}), ${b.frames - a.frames} frames; link to /whats-new ${drewAt === null ? 'NEVER DREW in 12 s' : 'drew after ' + drewAt + ' ms'}`);
    } catch (e) { console.log(`FULL, ${name}, ${route}: CRASH ${String(e).split('\n')[0].slice(0, 160)}`); }
    await ctx.close();
  }
}
await browser.close();
console.log('nav3 done');
