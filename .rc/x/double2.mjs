// Reviewer probe: is a daily finish held for the visit, and is it sent twice? Instrumented.
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT ?? '.';
const PHONE = { width: 390, height: 844 };

function breakStorage({ mode }) {
  let realLocal = null;
  try { realLocal = window.localStorage; } catch (e) { /* none */ }
  Object.defineProperty(window, '__harnessRealLocal', { value: realLocal, enumerable: false, configurable: true });
  if (mode === 'blocked') {
    for (const name of ['localStorage', 'sessionStorage']) {
      const boom = () => { throw new DOMException(`Failed to read the '${name}' property from 'Window': Access is denied for this document.`, 'SecurityError'); };
      Object.defineProperty(window, name, { configurable: true, enumerable: true, get: boom });
    }
    if (window.LockManager && window.LockManager.prototype) {
      window.LockManager.prototype.request = function request() { return Promise.reject(new DOMException('The request was denied.', 'SecurityError')); };
    }
  } else if (mode === 'full') {
    Storage.prototype.setItem = function setItem() { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); };
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
const look = page => page.evaluate(() => {
  const keys = s => { const out = []; try { for (let i = 0; i < s.length; i += 1) out.push(s.key(i)); } catch (e) { out.push('threw'); } return out; };
  let win = [];
  try { win = keys(window.localStorage); } catch (e) { win = ['threw']; }
  const real = window.__harnessRealLocal ? keys(window.__harnessRealLocal) : ['none'];
  const buttons = [...document.querySelectorAll('#root button')].map(b => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  return {
    mark: window.__rvMark || null,
    path: location.pathname,
    voted: /You voted/.test(document.body.innerText),
    voteButtons: buttons.filter(t => /^(Hall of Fame|Bust)$/.test(t)),
    windowKeys: win.filter(k => /hof|daily|streak|completion|played/i.test(k)),
    realKeys: real.filter(k => /hof|daily|streak|completion|played/i.test(k)),
    notice: (document.querySelector('[data-dukb-storage-notice]') || {}).innerText || null,
  };
});

const browser = await chromium.launch();
for (const mode of ['open', 'blocked', 'full']) {
  const ctx = await browser.newContext({ viewport: PHONE });
  await ctx.addInitScript(breakStorage, { mode });
  const page = await ctx.newPage();
  const posts = [];
  const origin = new URL(BASE).origin;
  await page.route('**/*', r => {
    const req = r.request();
    const m = /supabase\.co\/rest\/v1\/([A-Za-z0-9_]+)/.exec(req.url());
    if (m && req.method() === 'POST') posts.push(m[1]);
    let same = true;
    try { same = new URL(req.url()).origin === origin; } catch { same = true; }
    return same ? r.continue() : r.abort();
  });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 120)));
  const step = async name => { const s = await look(page); console.log(`${mode} ${name}: ${JSON.stringify(s)} posts ${JSON.stringify(posts)}`); return s; };
  try {
    await page.goto(BASE + '/hof-or-bust', { waitUntil: 'load' });
    await settle(page);
    await page.evaluate(() => { window.__rvMark = 'doc-' + Math.round(performance.timeOrigin); });
    const banner = page.locator('[role="region"][aria-label="Cookie choices"]');
    if (await banner.count()) await banner.getByRole('button', { name: 'Essential only', exact: true }).click().catch(() => {});
    await closeDialogs(page);
    await step('1 loaded');
    await page.locator('#root button', { hasText: /^\s*(🏆)?\s*Hall of Fame\s*$/ }).first().click({ timeout: 5000 });
    await page.waitForTimeout(900);
    await step('2 voted');
    /* leave by the router, with no anchor involved, then come back the same way */
    await page.evaluate(() => { history.pushState({}, '', '/whats-new'); window.dispatchEvent(new PopStateEvent('popstate')); });
    await page.waitForTimeout(600); await settle(page);
    await step('3 away (router push)');
    await page.evaluate(() => { history.pushState({}, '', '/hof-or-bust'); window.dispatchEvent(new PopStateEvent('popstate')); });
    await page.waitForTimeout(600); await settle(page); await closeDialogs(page);
    const back = await step('4 back (router push)');
    await page.screenshot({ path: path.join(OUT, `double2-${mode}-back.jpg`), type: 'jpeg', quality: 55 });
    if (back.voteButtons.length) {
      await page.locator('#root button', { hasText: /^\s*(💀)?\s*Bust\s*$/ }).first().click({ timeout: 5000 });
      await page.waitForTimeout(900);
      await step('5 voted AGAIN in the same visit');
    }
    await page.reload({ waitUntil: 'load' });
    await settle(page); await closeDialogs(page);
    const re = await step('6 after a reload');
    if (re.voteButtons.length) {
      await page.locator('#root button', { hasText: /^\s*(💀)?\s*Bust\s*$/ }).first().click({ timeout: 5000 });
      await page.waitForTimeout(900);
      await step('7 voted again after the reload');
    }
    console.log(`${mode} RESULT: posts ${JSON.stringify(posts)} errors ${JSON.stringify(errors.slice(0, 3))}`);
  } catch (e) { console.log(`${mode} CRASH ${String(e).split('\n')[0].slice(0, 200)}`); }
  await ctx.close();
}
/* The notice on narrower phones: is it still one line, and how far does the game move? */
for (const width of [320, 344, 360, 375, 390]) {
  for (const mode of ['open', 'blocked', 'full']) {
    const ctx = await browser.newContext({ viewport: { width, height: 740 } });
    await ctx.addInitScript(breakStorage, { mode });
    const page = await ctx.newPage();
    const origin = new URL(BASE).origin;
    await page.route('**/*', r => { let same = true; try { same = new URL(r.request().url()).origin === origin; } catch { same = true; } return same ? r.continue() : r.abort(); });
    for (const route of ['/soccer-career', '/footle']) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      await settle(page);
      const m = await page.evaluate(() => {
        const n = document.querySelector('[data-dukb-storage-notice]');
        const main = document.getElementById('dukb-main') || document.querySelector('#root main');
        const h1 = document.querySelector('#root h1');
        return {
          noticeH: n ? Math.round(n.getBoundingClientRect().height) : 0,
          lines: n ? Math.round(n.getBoundingClientRect().height - 8) / 20 : 0,
          mainTop: main ? Math.round(main.getBoundingClientRect().top + scrollY) : null,
          h1Top: h1 ? Math.round(h1.getBoundingClientRect().top + scrollY) : null,
          overflowX: document.documentElement.scrollWidth - innerWidth,
        };
      });
      console.log(`WIDTH ${width} ${mode} ${route}: ${JSON.stringify(m)}`);
      if (mode !== 'open' && width <= 360 && route === '/soccer-career') await page.screenshot({ path: path.join(OUT, `narrow-${width}-${mode}.jpg`), type: 'jpeg', quality: 55 });
    }
    await ctx.close();
  }
}
await browser.close();
console.log('double2 done');
