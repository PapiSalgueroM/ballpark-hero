// Reviewer probe: with storage FULL, does moving between pages inside the app still draw the next page?
import path from 'node:path';
import { chromium } from 'playwright';

const BUILDS = [['branch', process.env.NEW ?? 'http://localhost:4173']];
if (process.env.OLD) BUILDS.push(['base', process.env.OLD]);
const OUT = process.env.RC_OUT ?? '.';
const PHONE = { width: 390, height: 844 };

function breakStorage({ mode }) {
  if (mode === 'blocked') {
    for (const name of ['localStorage', 'sessionStorage']) {
      const boom = () => { throw new DOMException(`Failed to read the '${name}' property from 'Window': Access is denied for this document.`, 'SecurityError'); };
      Object.defineProperty(window, name, { configurable: true, enumerable: true, get: boom });
    }
    if (window.LockManager && window.LockManager.prototype) {
      window.LockManager.prototype.request = function request() { return Promise.reject(new DOMException('The request was denied.', 'SecurityError')); };
    }
  } else if (mode === 'full' || mode === 'full-local-only') {
    const real = Storage.prototype.setItem;
    const session = mode === 'full-local-only' ? window.sessionStorage : null;
    Storage.prototype.setItem = function setItem(k, v) {
      if (session && this === session) return real.call(this, k, v);
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
  }
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
const closeDialogs = async page => {
  for (let i = 0; i < 3; i += 1) {
    const open = await page.evaluate(() => document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length);
    if (!open) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }
};
const where = page => page.evaluate(() => ({
  path: location.pathname,
  h1: ((document.querySelector('#root h1') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 40),
  notice: !!document.querySelector('[data-dukb-storage-notice]'),
  boundary: [...document.querySelectorAll('h1, h2')].some(h => /This page broke/i.test(h.textContent || '')),
  buttons: document.querySelectorAll('#root button').length,
}));

/* Click a real link of the app to `href`, then wait until the page drawn is no longer the one we left. */
async function go(page, href, capMs = 7000) {
  const before = await where(page);
  const clicked = await page.evaluate(h => {
    const a = document.querySelector(`footer a[href="${h}"]`) || document.querySelector(`#root a[href="${h}"]`);
    if (!a) return false;
    a.click();
    return true;
  }, href);
  if (!clicked) return { clicked: false, before };
  const started = Date.now();
  let now = before;
  while (Date.now() - started < capMs) {
    await page.waitForTimeout(200);
    now = await where(page).catch(() => before);
    if (now.path === href && now.h1 !== before.h1) break;
  }
  return { clicked: true, ms: Date.now() - started, drew: now.h1 !== before.h1, from: before.h1, to: now.h1, path: now.path, notice: now.notice, boundary: now.boundary };
}

const browser = await chromium.launch();
for (const [tagName, base] of BUILDS) {
  const modes = tagName === 'branch' ? ['open', 'blocked', 'full', 'full-local-only'] : ['open', 'full'];
  for (const mode of modes) {
    const run = async (name, fn) => {
      const ctx = await browser.newContext({ viewport: PHONE });
      await ctx.addInitScript(breakStorage, { mode });
      const page = await ctx.newPage();
      const origin = new URL(base).origin;
      await page.route('**/*', r => { let same = true; try { same = new URL(r.request().url()).origin === origin; } catch { same = true; } return same ? r.continue() : r.abort(); });
      const notes = [];
      page.on('pageerror', e => notes.push('pageerror: ' + String(e.message || e).split('\n')[0].slice(0, 150)));
      page.on('console', m => { const t = m.text().split('\n')[0].slice(0, 150); if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|net::ERR_/.test(t)) notes.push(`${m.type()}: ${t}`); });
      page.on('dialog', d => { notes.push(`dialog ${d.type()}: ${d.message().slice(0, 80)}`); d.accept().catch(() => {}); });
      let out;
      try { out = await fn(page); } catch (e) { out = { crash: String(e).split('\n')[0].slice(0, 160) }; }
      console.log(`${tagName} ${mode} ${name}: ${JSON.stringify(out)} notes ${JSON.stringify([...new Set(notes)].slice(0, 5))}`);
      if (out && out.shot) await page.screenshot({ path: path.join(OUT, `nav-${tagName}-${mode}-${name}.jpg`), type: 'jpeg', quality: 55 });
      await ctx.close();
    };
    const boot = async (page, route) => {
      await page.goto(base + route, { waitUntil: 'load' });
      await settle(page);
      const banner = page.locator('[role="region"][aria-label="Cookie choices"]');
      if (await banner.count()) await banner.getByRole('button', { name: 'Essential only', exact: true }).click().catch(() => {});
      await closeDialogs(page);
    };
    await run('A-home-to-whatsnew', async page => { await boot(page, '/'); return go(page, '/whats-new'); });
    await run('B-hof-unplayed-to-whatsnew', async page => { await boot(page, '/hof-or-bust'); return go(page, '/whats-new'); });
    await run('C-hof-voted-to-whatsnew', async page => {
      await boot(page, '/hof-or-bust');
      await page.locator('#root button', { hasText: /^\s*(🏆)?\s*Hall of Fame\s*$/ }).first().click({ timeout: 5000 });
      await page.waitForTimeout(1200);
      const voted = await page.evaluate(() => /You voted/.test(document.body.innerText));
      const r = await go(page, '/whats-new');
      return { voted, ...r, shot: !r.drew };
    });
    await run('D-career-to-whatsnew-and-home', async page => {
      await boot(page, '/soccer-career');
      const a = await go(page, '/whats-new');
      const b = await go(page, '/');
      return { toWhatsNew: a, thenHome: b, shot: !a.drew || !b.drew };
    });
    await run('E-home-to-game-tile', async page => { await boot(page, '/'); return go(page, '/soccer-career'); });
  }
}
await browser.close();
console.log('nav done');
