// Reviewer probe 2: storage FULL, on a game page. What is the page doing, and does a link ever draw the next page?
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.NEW ?? process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.';
const PHONE = { width: 390, height: 844 };

function fullStorage({ mode }) {
  window.__w = { keys: {}, total: 0, reads: 0, frames: 0 };
  const tick = () => { window.__w.frames += 1; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const realGet = Storage.prototype.getItem;
  Storage.prototype.getItem = function getItem(k) { window.__w.reads += 1; return realGet.call(this, k); };
  if (mode !== 'full') return;
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
const snap = page => page.evaluate(() => ({ ...window.__w, keys: { ...window.__w.keys }, h1: ((document.querySelector('#root h1') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 30), path: location.pathname, dialogs: document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length }));
const top = (a, b) => Object.entries(b.keys).map(([k, n]) => [k, n - (a.keys[k] || 0)]).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, n]) => `${k} x${n}`).join(', ');

const browser = await chromium.launch();
for (const mode of ['open', 'full']) {
  for (const route of ['/soccer-career', '/hof-or-bust', '/footle', '/club-manager', '/stadium-tycoon', '/about', '/soccer']) {
    const ctx = await browser.newContext({ viewport: PHONE });
    await ctx.addInitScript(fullStorage, { mode });
    const page = await ctx.newPage();
    const origin = new URL(BASE).origin;
    await page.route('**/*', r => { let same = true; try { same = new URL(r.request().url()).origin === origin; } catch { same = true; } return same ? r.continue() : r.abort(); });
    const notes = [];
    page.on('pageerror', e => notes.push('pageerror: ' + String(e.message || e).split('\n')[0].slice(0, 120)));
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text().split('\n')[0].slice(0, 120); if (!/Failed to load resource|net::ERR_/.test(t)) notes.push(`${m.type()}: ${t}`); } });
    try {
      await page.goto(BASE + route, { waitUntil: 'load' });
      await settle(page);
      const banner = page.locator('[role="region"][aria-label="Cookie choices"]');
      const hadBanner = await banner.count();
      if (hadBanner) await banner.getByRole('button', { name: 'Essential only', exact: true }).click().catch(() => {});
      await page.waitForTimeout(500);
      /* one quiet second on the page: how many writes are refused, how many frames drawn */
      const a = await snap(page);
      await page.waitForTimeout(1000);
      const b = await snap(page);
      const idle = `idle second: ${b.total - a.total} refused writes [${top(a, b)}], ${b.reads - a.reads} reads, ${b.frames - a.frames} frames, ${b.dialogs} dialogs`;
      /* leave by a real link of the app */
      const clicked = await page.evaluate(() => { const l = document.querySelector('footer a[href="/whats-new"]'); if (!l) return false; l.click(); return true; });
      const started = Date.now();
      let drewAt = null;
      let now = b;
      while (Date.now() - started < 25000) {
        await page.waitForTimeout(250);
        now = await snap(page).catch(() => now);
        if (now.h1 !== b.h1) { drewAt = Date.now() - started; break; }
      }
      const c = await snap(page);
      console.log(`${mode} ${route}: ${idle}; link ${clicked ? 'clicked' : 'NOT FOUND'}, address ${c.path}, next page ${drewAt === null ? 'NEVER DREW in 25 s' : 'drew after ' + drewAt + ' ms'} (h1 "${b.h1}" -> "${c.h1}"); while waiting ${c.total - b.total} refused writes [${top(b, c)}], ${c.reads - b.reads} reads, ${c.frames - b.frames} frames; banner was up ${!!hadBanner}; notes ${JSON.stringify([...new Set(notes)].slice(0, 4))}`);
      if (drewAt === null) {
        await page.screenshot({ path: path.join(OUT, `nav2-${mode}-${route.slice(1)}.jpg`), type: 'jpeg', quality: 55 });
        /* does the browser's own Back, or the logo, get out? */
        const before = await snap(page);
        await page.evaluate(() => history.back());
        await page.waitForTimeout(1500);
        const afterBack = await snap(page);
        const logo = await page.evaluate(() => { const l = document.querySelector('#root a[href="/"]'); if (!l) return false; l.click(); return true; });
        await page.waitForTimeout(3000);
        const afterLogo = await snap(page);
        console.log(`   stuck on ${route}: history.back -> address ${afterBack.path}, h1 "${afterBack.h1}"; logo link ${logo ? 'clicked' : 'not found'} -> address ${afterLogo.path}, h1 "${afterLogo.h1}" (was "${before.h1}")`);
      }
    } catch (e) { console.log(`${mode} ${route}: CRASH ${String(e).split('\n')[0].slice(0, 160)}`); }
    await ctx.close();
  }
}
await browser.close();
console.log('nav2 done');
