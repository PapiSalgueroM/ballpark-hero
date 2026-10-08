// Reviewer walk for Round 1142 (runs on the runner: BASE, RC_OUT). Not part of the round.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT ?? '.';
const PART = (process.env.WALK_PART ?? 'shots,native,full,double,deep').split(',');
const PHONE = { width: 390, height: 844 };
const DESK = { width: 1280, height: 900 };
const report = { base: BASE, shots: [], native: [], full: [], double: [], deep: [] };
const log = (...a) => console.log(...a);

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

async function wire(page, seen) {
  const origin = new URL(BASE).origin;
  await page.route('**/*', r => {
    const req = r.request();
    const url = req.url();
    const m = /supabase\.co\/(rest\/v1|functions\/v1|auth\/v1)\/([A-Za-z0-9_\/-]+)/.exec(url);
    if (m) seen.backend.push(`${req.method()} ${m[1]}/${m[2]}`);
    if (/googletagmanager|google-analytics|googlesyndication|doubleclick/.test(url)) seen.vendor.push(url.slice(0, 60));
    let same = true;
    try { same = new URL(url).origin === origin; } catch { same = true; }
    return same ? r.continue() : r.abort();
  });
  page.on('pageerror', e => seen.pageErrors.push(String(e && e.message ? e.message : e).split('\n')[0].slice(0, 180)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text().split('\n')[0].slice(0, 180);
    if (/Failed to load resource|net::ERR_/.test(t)) return;
    seen.consoleErrors.push(t);
  });
  page.on('framenavigated', f => { if (f === page.mainFrame()) seen.navs += 1; });
}
const newSeen = () => ({ pageErrors: [], consoleErrors: [], backend: [], vendor: [], navs: 0 });

async function settle(page, capMs = 9000) {
  const started = Date.now();
  let last = '';
  let same = 0;
  while (Date.now() - started < capMs) {
    const sig = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return 'noroot';
      const spinner = !!root.querySelector('[aria-label="Loading"]');
      const boot = !!document.getElementById('dukb-boot');
      return `${root.querySelectorAll('button').length}/${root.querySelectorAll('a[href]').length}/${spinner}/${boot}/${(root.innerText || '').length}`;
    }).catch(() => 'gone');
    if (sig === last && !/true/.test(sig)) same += 1; else same = 0;
    if (same >= 3) return;
    last = sig;
    await page.waitForTimeout(250);
  }
}

function readState() {
  const root = document.getElementById('root');
  const notice = document.querySelector('[data-dukb-storage-notice]');
  const rect = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const header = document.querySelector('header');
  let noticeInfo = null;
  if (notice) {
    const cs = getComputedStyle(notice);
    let bg = 'none';
    for (let el = notice; el; el = el.parentElement) {
      const b = getComputedStyle(el).backgroundColor;
      if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') { bg = b; break; }
    }
    noticeInfo = { kind: notice.getAttribute('data-dukb-storage-notice'), rect: rect(notice), text: (notice.innerText || '').trim(), color: cs.color, bg, font: cs.fontSize, scrollW: notice.scrollWidth, clientW: notice.clientWidth };
  }
  return {
    buttons: root ? root.querySelectorAll('button').length : 0,
    links: root ? root.querySelectorAll('a[href]').length : 0,
    snapshot: !!document.getElementById('dukb-snapshot'),
    boundary: [...document.querySelectorAll('h1, h2')].some(h => /This page broke/i.test(h.textContent || '')),
    notice: noticeInfo,
    header: header ? rect(header) : null,
    banner: !!document.querySelector('[role="region"][aria-label="Cookie choices"]'),
    dialogs: [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].length,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 0),
  };
}

function pressNext(n) {
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const label = el => ((el.innerText || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim()).slice(0, 40);
  const CHROME = '[data-site-chrome], header, nav, footer, [role="region"][aria-label="Cookie choices"], section[aria-label="Live scores ticker"]';
  const AVOID = /sign ?(in|up)|log ?(in|out)|share|report|delete|reset|clear|erase|theme|install|export|import|leaderboard|copy|sound|mute|feedback|account|light mode|dark mode|how to|rules|help|give up|abandon|quit|skip|hint|reveal|settings|^back|^home|menu|pause/i;
  const GO = /play|start|begin|got it|let'?s|continue|new |create|next|kick|sim|roll|deal|spin|pick|choose|select|confirm|advance|ready|go\b|ok\b|done/i;
  const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(visible);
  const scope = dialogs.length ? dialogs[dialogs.length - 1] : document.getElementById('root');
  if (!scope) return null;
  const pool = [...scope.querySelectorAll('button:not([disabled])')]
    .filter(el => visible(el) && !el.closest(CHROME) && !el.hasAttribute('data-harness-pressed') && !AVOID.test(label(el)));
  if (!pool.length) return null;
  const pickd = pool.find(el => GO.test(label(el))) || pool[0];
  pickd.setAttribute('data-harness-pressed', String(n));
  const what = label(pickd) || '(no label)';
  pickd.click();
  return what;
}

const slug = r => (r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '_'));
const shot = async (page, name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 55 }).catch(e => log('shot failed', name, String(e).slice(0, 80)));
};
async function dismissBanner(page) {
  const banner = page.locator('[role="region"][aria-label="Cookie choices"]');
  if (await banner.count()) {
    await banner.getByRole('button', { name: 'Essential only', exact: true }).click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

/* PART A: what a player sees. Simulated blocked (motion on) and full (reduced motion), phone and desktop. */
async function partShots(browser) {
  const routes = ['/', '/soccer-career', '/club-manager', '/footle', '/stadium-tycoon', '/build-your-xi'];
  for (const mode of ['blocked', 'full']) {
    for (const [vname, view] of [['390', PHONE], ['1280', DESK]]) {
      for (const route of routes) {
        const ctx = await browser.newContext({ viewport: view, reducedMotion: mode === 'full' ? 'reduce' : 'no-preference' });
        await ctx.addInitScript(breakStorage, { mode });
        const page = await ctx.newPage();
        const seen = newSeen();
        await wire(page, seen);
        const name = `${mode}-${vname}-${slug(route)}`;
        try {
          await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
          await settle(page);
          await shot(page, `${name}-a`);
          const a = await page.evaluate(readState);
          await dismissBanner(page);
          for (let i = 0; i < 3; i += 1) {
            const open = await page.evaluate(() => document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length);
            if (!open) break;
            await page.keyboard.press('Escape');
            await page.waitForTimeout(350);
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(200);
          await shot(page, `${name}-b`);
          const b = await page.evaluate(readState);
          report.shots.push({ name, a, b, pageErrors: seen.pageErrors, consoleErrors: seen.consoleErrors.slice(0, 4), vendor: seen.vendor.length });
          log(`SHOT ${name}: buttons ${a.buttons}, notice ${b.notice ? JSON.stringify(b.notice.rect) + ' "' + b.notice.text + '" ' + b.notice.color + ' on ' + b.notice.bg + ' ' + b.notice.font : 'none'}, header ${JSON.stringify(b.header)}, overflowX ${b.overflowX}, errors ${seen.pageErrors.length}/${seen.consoleErrors.length}`);
        } catch (e) { log(`SHOT ${name} CRASH ${String(e).slice(0, 120)}`); }
        await ctx.close();
      }
    }
  }
}

function registryRoutes() {
  const text = fs.readFileSync('src/data/gameRegistry.ts', 'utf8');
  const found = [...text.matchAll(/path:\s*['"](\/[a-z0-9\/-]+)['"]/g)].map(m => m[1]);
  return [...new Set(found)];
}
const EXTRA = ['/', '/soccer', '/whats-new', '/login', '/signup', '/profile', '/leaderboard', '/search', '/records', '/about', '/privacy', '/reset-password'];

async function mountOnly(page, seen, route) {
  const out = { route };
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    await settle(page, 7000);
    const s = await page.evaluate(readState);
    Object.assign(out, { buttons: s.buttons, links: s.links, snapshot: s.snapshot, boundary: s.boundary, notice: s.notice ? s.notice.kind : null, noticeH: s.notice ? s.notice.rect.h : null });
  } catch (e) { out.crash = String(e && e.message ? e.message : e).split('\n')[0].slice(0, 120); }
  out.pageErrors = seen.pageErrors.splice(0);
  out.consoleErrors = seen.consoleErrors.splice(0);
  out.navs = seen.navs; seen.navs = 0;
  return out;
}

async function nativeContext(view = PHONE) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-native-'));
  fs.mkdirSync(path.join(dir, 'Default'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'Default', 'Preferences'), JSON.stringify({ profile: { default_content_setting_values: { cookies: 2 } } }));
  const ctx = await chromium.launchPersistentContext(dir, { headless: true, channel: 'chromium', viewport: view });
  await ctx.addInitScript(() => {
    let v = 'no throw';
    try { void window.localStorage; } catch (e) { v = `${e.name}`; }
    Object.defineProperty(window, '__rvProbe', { value: v, enumerable: false, configurable: true });
  });
  return ctx;
}

/* PART D: is a daily finish sent twice in ONE visit? Vote, leave by a link in the app, come back, try again. */
async function partDouble(browser) {
  for (const mode of ['open', 'blocked', 'full']) {
    const ctx = await browser.newContext({ viewport: PHONE });
    await ctx.addInitScript(breakStorage, { mode });
    const page = await ctx.newPage();
    const seen = newSeen();
    await wire(page, seen);
    const out = { mode };
    try {
      await page.goto(BASE + '/hof-or-bust', { waitUntil: 'load', timeout: 45000 });
      await settle(page);
      await dismissBanner(page);
      for (let i = 0; i < 3; i += 1) {
        const open = await page.evaluate(() => document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length);
        if (!open) break;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(350);
      }
      const voteBtn = label => page.locator('#root button', { hasText: label }).filter({ hasNotText: 'Unlimited' }).first();
      out.canVoteFirst = await voteBtn('Hall of Fame').isVisible().catch(() => false);
      await voteBtn('Hall of Fame').click({ timeout: 5000 });
      await page.waitForTimeout(900);
      out.votedShown1 = await page.evaluate(() => /You voted/.test(document.body.innerText));
      out.backendAfter1 = seen.backend.filter(b => /^POST/.test(b));
      await shot(page, `double-${mode}-1-voted`);
      const moved = await page.evaluate(() => { const a = document.querySelector('footer a[href="/whats-new"]'); if (!a) return false; a.click(); return true; });
      await page.waitForTimeout(600);
      await settle(page);
      out.movedTo = await page.evaluate(() => location.pathname) + (moved ? '' : ' (no link)');
      await page.goBack();
      await page.waitForTimeout(600);
      await settle(page);
      out.backAt = await page.evaluate(() => location.pathname);
      for (let i = 0; i < 3; i += 1) {
        const open = await page.evaluate(() => document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length);
        if (!open) break;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(350);
      }
      out.votedShownOnReturn = await page.evaluate(() => /You voted/.test(document.body.innerText));
      out.canVoteAgain = await voteBtn('Bust').isVisible().catch(() => false);
      await shot(page, `double-${mode}-2-returned`);
      if (out.canVoteAgain) { await voteBtn('Bust').click({ timeout: 5000 }); await page.waitForTimeout(900); }
      out.backendAfter2 = seen.backend.filter(b => /^POST/.test(b));
      out.navs = seen.navs;
      out.pageErrors = seen.pageErrors;
    } catch (e) { out.crash = String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160); }
    report.double.push(out);
    log(`DOUBLE ${mode}: ${JSON.stringify(out)}`);
    await ctx.close();
  }
}

/* PART E: play on in a REAL blocked browser: a dozen presses on the two big sims and a daily, with what the page says about saving. */
async function partDeep() {
  for (const [vname, view] of [['390', PHONE], ['1280', DESK]]) {
    const ctx = await nativeContext(view);
    for (const route of ['/soccer-career', '/club-manager', '/nba-my-career', '/stadium-tycoon']) {
      const page = await ctx.newPage();
      const seen = newSeen();
      await wire(page, seen);
      const out = { route, view: vname, presses: [] };
      try {
        await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
        await settle(page);
        await dismissBanner(page);
        await shot(page, `deep-${vname}-${slug(route)}-0`);
        for (let n = 0; n < 12; n += 1) {
          const what = await page.evaluate(pressNext, n).catch(e => `(threw ${String(e).slice(0, 40)})`);
          if (!what) break;
          out.presses.push(what);
          await page.waitForTimeout(500);
          await settle(page, 3000);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await shot(page, `deep-${vname}-${slug(route)}-1`);
        const s = await page.evaluate(readState);
        out.saveWords = await page.evaluate(() => {
          const t = document.body.innerText || '';
          return [...t.matchAll(/[^.\n]{0,50}\b(saved|autosave|auto-save|progress is saved|save slot|your save)\b[^.\n]{0,50}/gi)].map(m => m[0].trim()).slice(0, 6);
        });
        Object.assign(out, { buttons: s.buttons, boundary: s.boundary, notice: s.notice ? s.notice.text : null, noticeRect: s.notice ? s.notice.rect : null, overflowX: s.overflowX, navs: seen.navs, pageErrors: seen.pageErrors, consoleErrors: seen.consoleErrors.slice(0, 4), keysHeld: await page.evaluate(() => { try { return window.localStorage.length; } catch (e) { return 'threw'; } }) });
        /* a reload in the same tab: does anything loop, and is the game gone as the notice says */
        const before = seen.navs;
        await page.reload({ waitUntil: 'load' });
        await settle(page);
        await page.waitForTimeout(1500);
        out.navsAfterReload = seen.navs - before;
        out.keysAfterReload = await page.evaluate(() => { try { return window.localStorage.length; } catch (e) { return 'threw'; } });
        out.bannerAfterReload = await page.evaluate(() => !!document.querySelector('[role="region"][aria-label="Cookie choices"]'));
      } catch (e) { out.crash = String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160); }
      report.deep.push(out);
      log(`DEEP ${JSON.stringify(out)}`);
      await page.close().catch(() => {});
    }
    await ctx.close();
  }
}

const browser = await chromium.launch();
if (PART.includes('shots')) await partShots(browser);
if (PART.includes('double')) await partDouble(browser);
if (PART.includes('full')) await partFull(browser);
await browser.close();
if (PART.includes('native')) await partNative();
if (PART.includes('deep')) await partDeep();
fs.writeFileSync(path.join(OUT, 'walk-report.json'), JSON.stringify(report, null, 1));
log('walk done');

/* PART B: a REAL blocked Chromium on every registry route (mount, errors, notice), three pages at a time. */
async function partNative() {
  const routes = [...EXTRA, ...registryRoutes()];
  const ctx = await nativeContext();
  const probe = await ctx.newPage();
  await probe.goto(BASE + '/about', { waitUntil: 'load' });
  const threw = await probe.evaluate(() => window.__rvProbe);
  log(`NATIVE probe before page code: reading window.localStorage gave "${threw}"; ${routes.length} routes`);
  report.nativeProbe = threw;
  await probe.close();
  let next = 0;
  await Promise.all([0, 1, 2].map(async () => {
    const page = await ctx.newPage();
    const seen = newSeen();
    await wire(page, seen);
    while (next < routes.length) {
      const route = routes[next]; next += 1;
      report.native.push(await mountOnly(page, seen, route));
    }
    await page.close();
  }));
  await ctx.close();
  const games = new Set(registryRoutes());
  const bad = report.native.filter(r => r.crash || r.boundary || r.snapshot || !r.buttons || r.pageErrors.length || r.consoleErrors.length || (games.has(r.route) ? r.notice !== 'blocked' : !!r.notice));
  log(`NATIVE: ${report.native.length} routes walked, ${bad.length} with something to look at`);
  for (const r of bad) log(`  NATIVE ${r.route}: buttons ${r.buttons} boundary ${r.boundary} snapshot ${r.snapshot} notice ${r.notice} crash ${r.crash || ''} pageErrors ${JSON.stringify(r.pageErrors.slice(0, 2))} console ${JSON.stringify(r.consoleErrors.slice(0, 2))}`);
  const tall = report.native.filter(r => r.noticeH && r.noticeH > 30);
  log(`NATIVE: notice taller than 30px on ${tall.length} routes ${tall.map(r => r.route + ':' + r.noticeH).join(' ')}`);
}

/* PART C: storage FULL (simulated) on every registry route, and an OPEN rerun of any route that showed something. */
async function partFull(browser) {
  const routes = [...EXTRA, ...registryRoutes()];
  const run = async (mode, list) => {
    const ctx = await browser.newContext({ viewport: PHONE });
    await ctx.addInitScript(breakStorage, { mode });
    const outs = [];
    let next = 0;
    await Promise.all([0, 1, 2].map(async () => {
      const page = await ctx.newPage();
      const seen = newSeen();
      await wire(page, seen);
      while (next < list.length) { const route = list[next]; next += 1; outs.push(await mountOnly(page, seen, route)); }
      await page.close();
    }));
    await ctx.close();
    return outs;
  };
  report.full = await run('full', routes);
  const games = new Set(registryRoutes());
  const bad = report.full.filter(r => r.crash || r.boundary || r.snapshot || !r.buttons || r.pageErrors.length || r.consoleErrors.length || (games.has(r.route) ? r.notice !== 'full' : !!r.notice));
  log(`FULL: ${report.full.length} routes walked, ${bad.length} with something to look at`);
  const again = await run('open', bad.map(r => r.route));
  for (const r of bad) {
    const o = again.find(x => x.route === r.route) || {};
    log(`  FULL ${r.route}: buttons ${r.buttons} (open ${o.buttons}) boundary ${r.boundary} notice ${r.notice} crash ${r.crash || ''} pageErrors ${JSON.stringify(r.pageErrors.slice(0, 2))} (open ${JSON.stringify((o.pageErrors || []).slice(0, 2))}) console ${JSON.stringify(r.consoleErrors.slice(0, 2))} (open ${(o.consoleErrors || []).length})`);
  }
  report.fullOpenAgain = again;
}
