/**
 * Round 400 browser harness: AdSense starts only for a deliberate game slot.
 *
 * The publisher verification meta belongs on every document. The executable
 * AdSense loader does not. A stored Accept must start exactly one request on a
 * game that renders AdBanner, while legal, private, retired, redirect and 404
 * screens must make none. The fresh-consent case waits longer than AdBanner's
 * eight second no-answer timeout before clicking Accept so a slot that vanished
 * while the visitor read the banner cannot escape this harness.
 *
 * NEGATIVE CONTROLS: ADROUTES_CONTROL=global-loader intercepts only the served
 * reset-password document. It proves that document contains exactly one closing
 * head tag and no AdSense loader, then injects one exact copy of the old global,
 * consent-gated loader before that tag. The control is green only when the
 * mutation fires, makes exactly one AdSense request, and the normal zero-request
 * assertion reports exactly one owned failure.
 *
 * Run after npm run build:
 *   node scripts/playAdRoutes.mjs
 *   ADROUTES_CONTROL=global-loader node scripts/playAdRoutes.mjs
 *   ADROUTES_CONTROL=zero-width node scripts/playAdRoutes.mjs
 *   ADROUTES_CONTROL=fallback-noindex node scripts/playAdRoutes.mjs
 *   ADROUTES_CONTROL=accept-reload node scripts/playAdRoutes.mjs
 *   ADROUTES_CONTROL=stale-noindex node scripts/playAdRoutes.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.ADROUTES_CONTROL || '';
if (CONTROL && !['global-loader', 'zero-width', 'fallback-noindex', 'accept-reload', 'stale-noindex'].includes(CONTROL)) {
  console.error(`ADROUTES_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const suppliedBase = process.env.BASE ?? process.env.SWEEP_BASE ?? '';
const PORT = Number(process.env.ADROUTES_PORT || 4196);
const BASE = (suppliedBase || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');
const ADSENSE_URL = 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

const ZERO_REQUEST_ROUTES = [
  { path: '/about', kind: 'trust page' },
  { path: '/privacy', kind: 'legal' },
  { path: '/terms', kind: 'legal' },
  { path: '/accessibility', kind: 'legal' },
  { path: '/contact', kind: 'legal' },
  { path: '/reset-password', kind: 'private reset' },
  { path: '/admin/login', kind: 'private admin' },
  { path: '/admin/reports', kind: 'private admin' },
  { path: '/profile/test-user', kind: 'private account' },
  { path: '/football-timeline', kind: 'retired game' },
  { path: '/guess-nfl-team', kind: 'retired game' },
  { path: '/higher-lower-transfers', kind: 'retired game' },
  { path: '/pack-battle', kind: 'retired game' },
  { path: '/shirt-number', kind: 'retired game' },
  { path: '/world-cup', kind: 'redirect stub' },
  { path: '/this-address-does-not-exist-ad-routes', kind: 'fallback 404' },
];

const OLD_GLOBAL_LOADER = `<script>
  (function () {
    try {
      if (localStorage.getItem('cookie-consent') === 'accepted') {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.requestNonPersonalizedAds = 1;
        var s = document.createElement('script');
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2929318086316376';
        document.head.appendChild(s);
      }
    } catch (e) { /* storage blocked: ads stay off */ }
  })();
</script>`;

let failures = 0;
function check(ok, message) {
  console.log(`${ok ? '  PASS  ' : '  FAIL  '}${message}`);
  if (!ok) failures += 1;
}

function occurrences(source, needle) {
  let count = 0;
  let from = 0;
  while (true) {
    const at = source.indexOf(needle, from);
    if (at < 0) return count;
    count += 1;
    from = at + needle.length;
  }
}

let server = null;
async function startServer() {
  if (suppliedBase) {
    const live = await fetch(`${BASE}/`).then(response => response.ok).catch(() => false);
    if (!live) throw new Error(`nothing answered at supplied BASE ${BASE}`);
    return;
  }

  const distIndex = path.join(ROOT, 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    throw new Error('dist/index.html is missing. Run npm run build before this browser harness.');
  }
  const occupied = await fetch(`${BASE}/`).then(response => response.ok).catch(() => false);
  if (occupied) throw new Error(`port ${PORT} already answers, refusing to test an unknown server`);

  server = spawn(
    process.execPath,
    [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)],
    { stdio: 'ignore' },
  );
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const live = await fetch(`${BASE}/`).then(response => response.ok).catch(() => false);
    if (live) return;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`the dist server never came up on port ${PORT}`);
}

let controlMutationFired = false;
let controlMutationError = '';

async function instrumentedContext(browser, consent, injectGlobalLoader = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  if (consent) {
    await context.addInitScript(choice => {
      try {
        // Seed a returning visitor once per tab. A reload after withdrawal
        // must not recreate the answer the test just removed.
        const seedKey = 'dukb-ad-routes-consent-seeded';
        if (!sessionStorage.getItem(seedKey)) {
          if (localStorage.getItem('cookie-consent') === null) {
            localStorage.setItem('cookie-consent', choice);
          }
          sessionStorage.setItem(seedKey, '1');
        }
      } catch { /* storage unavailable */ }
    }, consent);
  }

  if (CONTROL === 'accept-reload') {
    await context.addInitScript(() => {
      window.addEventListener('storage', event => {
        if (
          event.key === 'cookie-consent'
          && event.newValue === 'accepted'
          && !sessionStorage.getItem('dukb-accept-reload-control')
        ) {
          sessionStorage.setItem('dukb-accept-reload-control', '1');
          window.location.reload();
        }
      });
    });
  }

  const adRequests = [];
  await context.route('**://*.supabase.co/**', route => route.abort());
  await context.route('https://www.googletagmanager.com/**', route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: '',
  }));
  await context.route('**/pagead/js/adsbygoogle.js*', route => {
    adRequests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  });

  if (CONTROL === 'fallback-noindex') {
    await context.route(`${BASE}/this-address-does-not-exist-ad-routes`, async route => {
      if (route.request().resourceType() !== 'document') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const original = await response.text();
      const marker = "robots.setAttribute('data-dukb-fallback', '');";
      const before = occurrences(original, marker);
      if (before !== 1) {
        controlMutationError = `fallback precondition failed: marker count=${before}`;
        await route.fulfill({ response, body: original });
        return;
      }
      const mutated = original.replace(marker, '');
      if (mutated === original || occurrences(mutated, marker) !== 0) {
        controlMutationError = 'fallback marker mutation did not fire exactly once';
        await route.fulfill({ response, body: original });
        return;
      }
      controlMutationFired = true;
      await route.fulfill({ response, body: mutated });
    });
  }

  if (CONTROL === 'stale-noindex') {
    await context.addInitScript(() => {
      window.addEventListener('popstate', () => {
        if (location.pathname !== '/footle') return;
        const originalRemoveChild = Node.prototype.removeChild;
        Node.prototype.removeChild = function removeChild(child) {
          if (child instanceof HTMLMetaElement && child.hasAttribute('data-dukb-stale-control')) return child;
          return originalRemoveChild.call(this, child);
        };
        const originalRemove = Element.prototype.remove;
        Element.prototype.remove = function remove() {
          if (this instanceof HTMLMetaElement && this.hasAttribute('data-dukb-stale-control')) return;
          originalRemove.call(this);
        };
        const robots = document.createElement('meta');
        robots.name = 'robots';
        robots.content = 'noindex, follow';
        robots.dataset.dukbStaleControl = '';
        document.head.appendChild(robots);
        window.__DUKB_STALE_NOINDEX_CONTROL__ = true;
      }, { once: true });
    });
  }

  if (injectGlobalLoader) {
    await context.route(`${BASE}/reset-password`, async route => {
      if (route.request().resourceType() !== 'document') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const original = await response.text();
      const closeHead = '</head>';
      const heads = occurrences(original, closeHead);
      const beforeUrls = occurrences(original, ADSENSE_URL);
      if (heads !== 1 || beforeUrls !== 0) {
        controlMutationError = `reset-password precondition failed: closing heads=${heads}, existing loaders=${beforeUrls}`;
        await route.fulfill({ response, body: original });
        return;
      }
      const mutated = original.replace(closeHead, `${OLD_GLOBAL_LOADER}\n${closeHead}`);
      const afterUrls = occurrences(mutated, ADSENSE_URL);
      if (mutated === original || afterUrls !== 1) {
        controlMutationError = `reset-password mutation changed=${mutated !== original}, loader count=${afterUrls}`;
        await route.fulfill({ response, body: original });
        return;
      }
      controlMutationFired = true;
      await route.fulfill({ response, body: mutated });
    });
  }

  return { context, adRequests };
}

async function waitForApp(page, pathname) {
  let loaded = false;
  let lastError = null;
  for (let attempt = 0; attempt < 2 && !loaded; attempt += 1) {
    try {
      await page.goto(`${BASE}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      loaded = true;
    } catch (error) {
      lastError = error;
      if (attempt === 0) console.log(`  RETRY ${pathname} after a navigation timeout`);
    }
  }
  if (!loaded) throw lastError;
  await page.locator('footer').waitFor({ state: 'attached', timeout: 30000 });
}

async function waitForRequestCount(adRequests, floor, timeoutMs = 5000) {
  const until = Date.now() + timeoutMs;
  while (adRequests.length < floor && Date.now() < until) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  await new Promise(resolve => setTimeout(resolve, 350));
}

async function storedConsentVisit(browser, pathname, injectGlobalLoader = false, forceZeroWidth = false) {
  const { context, adRequests } = await instrumentedContext(browser, 'accepted', injectGlobalLoader);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await waitForApp(page, pathname);
    if (forceZeroWidth) {
      await page.addStyleTag({ content: '[data-dukb-manual-ad] ins.adsbygoogle { width: 0 !important; }' });
    }
    await waitForRequestCount(adRequests, 1, 1200);
    if (pageErrors.length) throw new Error(`${pathname} raised page errors: ${pageErrors.join(' | ')}`);
    const state = await page.evaluate(() => ({
      scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
      queue: Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0,
      slotPresent: document.querySelector('[data-dukb-manual-ad] ins.adsbygoogle') !== null,
      mobileSlotWidth: document.querySelector('[data-dukb-manual-ad] ins.adsbygoogle')?.getBoundingClientRect().width ?? 0,
    }));
    let desktopSlotWidth = 0;
    if (state.slotPresent) {
      await page.setViewportSize({ width: 1280, height: 900 });
      desktopSlotWidth = await page.evaluate(
        () => document.querySelector('[data-dukb-manual-ad] ins.adsbygoogle')?.getBoundingClientRect().width ?? 0,
      );
    }
    return { requests: [...adRequests], state: { ...state, desktopSlotWidth } };
  } finally {
    await context.close();
  }
}

async function freshChoiceVisit(browser, choice, waitBeforeChoiceMs) {
  const { context, adRequests } = await instrumentedContext(browser, null, false);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await waitForApp(page, '/footle');
    await page.getByRole('button', { name: choice, exact: true }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(waitBeforeChoiceMs);
    const beforeChoice = {
      requests: [...adRequests],
      state: await page.evaluate(() => ({
        scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
        queue: Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0,
        slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
      })),
    };
    await page.getByRole('button', { name: choice, exact: true }).click();
    await waitForRequestCount(adRequests, choice === 'Accept' ? 1 : Number.POSITIVE_INFINITY, choice === 'Accept' ? 5000 : 750);
    if (pageErrors.length) throw new Error(`fresh /footle raised page errors: ${pageErrors.join(' | ')}`);
    const state = await page.evaluate(() => ({
      scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
      queue: Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0,
      stored: localStorage.getItem('cookie-consent'),
    }));
    return { beforeChoice, requests: [...adRequests], state };
  } finally {
    await context.close();
  }
}

async function spaTransitionVisit(browser) {
  const { context, adRequests } = await instrumentedContext(browser, 'accepted', false);
  const page = await context.newPage();
  try {
    await waitForApp(page, '/footle');
    await waitForRequestCount(adRequests, 1, 5000);
    const initialQueue = await page.evaluate(() => Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0);

    // A first visit can keep the rules dialog open, which correctly hides the
    // footer from the accessibility tree. Drive the router directly so this
    // check measures ad cleanup during navigation instead of dialog state.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/privacy');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForURL(`${BASE}/privacy`, { timeout: 10000 });
    await page.getByRole('heading', { name: 'Privacy Policy', exact: true }).waitFor({ timeout: 10000 });
    await page.locator('footer').waitFor({ state: 'attached', timeout: 10000 });
    const legal = await page.evaluate(() => ({
      slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
      queue: Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0,
    }));

    await page.evaluate(() => {
      window.history.pushState({}, '', '/reset-password');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex'), null, { timeout: 10000 });
    const noindex = await page.evaluate(() => ({
      slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
      queue: Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0,
    }));
    return { requests: [...adRequests], initialQueue, legal, noindex };
  } finally {
    await context.close();
  }
}

async function crossTabWithdrawalVisit(browser) {
  const { context, adRequests } = await instrumentedContext(browser, 'accepted', false);
  const game = await context.newPage();
  const settings = await context.newPage();
  try {
    await waitForApp(game, '/footle');
    await waitForRequestCount(adRequests, 1, 5000);
    await waitForApp(settings, '/about');

    const gameReloaded = game.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
    await settings.getByRole('button', { name: 'Cookie choices', exact: true }).click();
    await gameReloaded;
    try {
      await game.waitForFunction(() => {
        const banner = document.querySelector('[role="region"][aria-label="Cookie choices"]');
        return localStorage.getItem('cookie-consent') === null
          && banner !== null
          && banner.getAttribute('aria-hidden') === null;
      }, null, { timeout: 10000 });
    } catch (error) {
      const diagnostic = await game.evaluate(() => {
        const banner = document.querySelector('[role="region"][aria-label="Cookie choices"]');
        return {
          url: window.location.href,
          readyState: document.readyState,
          stored: localStorage.getItem('cookie-consent'),
          banner: banner !== null,
          bannerHidden: banner?.getAttribute('aria-hidden') ?? null,
          scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
          slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
        };
      });
      throw new Error(`cross-tab withdrawal did not settle: ${JSON.stringify(diagnostic)}; ${error.message}`);
    }
    const state = await game.evaluate(() => ({
      stored: localStorage.getItem('cookie-consent'),
      scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
      queue: Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0,
      slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
      banner: document.querySelectorAll('[role="region"][aria-label="Cookie choices"]:not([aria-hidden])').length,
    }));
    return { requests: [...adRequests], state };
  } finally {
    await context.close();
  }
}

async function fallbackToGameVisit(browser) {
  const { context, adRequests } = await instrumentedContext(browser, 'accepted', false);
  const page = await context.newPage();
  try {
    await waitForApp(page, '/this-address-does-not-exist-ad-routes');
    const before = await page.evaluate(() => ({
      noindex: document.querySelectorAll('meta[name="robots"][content*="noindex"]').length,
      scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
      slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
    }));

    await page.locator('a[href="/footle"]').click();
    await page.waitForURL(`${BASE}/footle`, { timeout: 10000 });
    await page.locator('footer').waitFor({ state: 'attached', timeout: 10000 });
    await waitForRequestCount(adRequests, 1, 5000);
    const after = await page.evaluate(() => ({
      noindex: document.querySelectorAll('meta[name="robots"][content*="noindex"]').length,
      scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
      queue: Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0,
      slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
    }));
    return { before, after, requests: [...adRequests] };
  } finally {
    await context.close();
  }
}

async function crossTabAcceptanceVisit(browser) {
  const { context, adRequests } = await instrumentedContext(browser, null, false);
  const game = await context.newPage();
  const settings = await context.newPage();
  let gameLoads = 0;
  game.on('domcontentloaded', () => { gameLoads += 1; });
  try {
    await waitForApp(game, '/footle');
    await waitForApp(settings, '/about');
    const loadsBeforeAccept = gameLoads;

    await settings.getByRole('button', { name: 'Accept', exact: true }).click();
    await waitForRequestCount(adRequests, 1, 5000);
    await game.waitForFunction(() => (
      localStorage.getItem('cookie-consent') === 'accepted'
      && document.querySelectorAll('script[src*="adsbygoogle.js"]').length === 1
      && document.querySelectorAll('[data-dukb-manual-ad]').length === 1
    ), null, { timeout: 10000 });
    await game.waitForTimeout(500);

    const state = await game.evaluate(() => ({
      stored: localStorage.getItem('cookie-consent'),
      scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
      queue: Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0,
      slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
      banner: document.querySelectorAll('[role="region"][aria-label="Cookie choices"]:not([aria-hidden])').length,
      forcedReload: sessionStorage.getItem('dukb-accept-reload-control') === '1',
    }));
    return { requests: [...adRequests], loadsBeforeAccept, loadsAfterAccept: gameLoads, state };
  } finally {
    await context.close();
  }
}

async function noindexToGameVisit(browser) {
  const { context, adRequests } = await instrumentedContext(browser, 'accepted', false);
  const page = await context.newPage();
  try {
    await waitForApp(page, '/reset-password');
    const before = await page.evaluate(() => ({
      noindex: document.querySelectorAll('meta[name="robots"][content*="noindex"]').length,
      scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
      slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
    }));

    await page.evaluate(() => {
      window.history.pushState({}, '', '/footle');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForURL(`${BASE}/footle`, { timeout: 10000 });
    await page.locator('footer').waitFor({ state: 'attached', timeout: 10000 });
    await waitForRequestCount(adRequests, 1, 5000);
    const after = await page.evaluate(() => ({
      noindex: document.querySelectorAll('meta[name="robots"][content*="noindex"]').length,
      scripts: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
      queue: Array.isArray(window.adsbygoogle) ? window.adsbygoogle.length : 0,
      slots: document.querySelectorAll('[data-dukb-manual-ad]').length,
      staleControl: window.__DUKB_STALE_NOINDEX_CONTROL__ === true,
    }));
    return { before, after, requests: [...adRequests] };
  } finally {
    await context.close();
  }
}

let browser = null;
let runError = null;
try {
  await startServer();
  browser = await chromium.launch();

  if (CONTROL === 'global-loader') {
    console.log('negative control: the old global loader on reset-password');
    const reset = await storedConsentVisit(browser, '/reset-password', true);
    check(reset.requests.length === 0, `/reset-password made no AdSense request (${reset.requests.length})`);

    if (controlMutationError) throw new Error(controlMutationError);
    if (!controlMutationFired) throw new Error('the reset-password document was never mutated');
    if (reset.requests.length !== 1) throw new Error(`the injected old loader made ${reset.requests.length} requests rather than exactly 1`);
  } else if (CONTROL === 'zero-width') {
    console.log('negative control: a responsive manual slot with zero measurable width');
    const footle = await storedConsentVisit(browser, '/footle', false, true);
    check(footle.state.mobileSlotWidth >= 250, `/footle reserved a usable mobile slot width (${footle.state.mobileSlotWidth}px)`);
    check(footle.state.desktopSlotWidth >= 500, `/footle reserved a usable desktop slot width (${footle.state.desktopSlotWidth}px)`);
    if (!footle.state.slotPresent) throw new Error('the zero-width control found no manual slot to mutate');
    if (footle.state.mobileSlotWidth !== 0 || footle.state.desktopSlotWidth !== 0) {
      throw new Error(`the zero-width control measured mobile=${footle.state.mobileSlotWidth}, desktop=${footle.state.desktopSlotWidth}`);
    }
  } else if (CONTROL === 'fallback-noindex') {
    console.log('negative control: the fallback robots marker cannot be cleaned up');
    const fallback = await fallbackToGameVisit(browser);
    check(fallback.after.noindex === 0, `fallback to /footle cleared every noindex (${fallback.after.noindex})`);
    if (controlMutationError) throw new Error(controlMutationError);
    if (!controlMutationFired) throw new Error('the fallback document was never mutated');
    if (fallback.before.noindex < 1 || fallback.before.scripts !== 0 || fallback.before.slots !== 0) {
      throw new Error(`the fallback control began from the wrong state: ${JSON.stringify(fallback.before)}`);
    }
    if (fallback.after.noindex !== 1 || fallback.requests.length !== 0) {
      throw new Error(`the fallback control did not preserve exactly one poisoning noindex: ${JSON.stringify(fallback)}`);
    }
  } else if (CONTROL === 'accept-reload') {
    console.log('negative control: accepting in another tab reloads the active game');
    const accepted = await crossTabAcceptanceVisit(browser);
    check(accepted.loadsAfterAccept === accepted.loadsBeforeAccept, `cross-tab Accept preserved the active game document (${accepted.loadsBeforeAccept} to ${accepted.loadsAfterAccept} loads)`);
    if (!accepted.state.forcedReload) throw new Error('the forced acceptance reload never fired');
    if (accepted.loadsAfterAccept !== accepted.loadsBeforeAccept + 1) {
      throw new Error(`the forced acceptance reload changed the load count by ${accepted.loadsAfterAccept - accepted.loadsBeforeAccept}`);
    }
    if (accepted.requests.length !== 2 || accepted.state.scripts !== 1 || accepted.state.slots !== 1) {
      throw new Error(`the forced acceptance reload did not reproduce one wasted request before reload: ${JSON.stringify(accepted)}`);
    }
  } else if (CONTROL === 'stale-noindex') {
    console.log('negative control: a departing noindex survives onto the game');
    const transition = await noindexToGameVisit(browser);
    const safe = transition.after.noindex === 0
      && transition.requests.length === 1
      && transition.after.scripts === 1
      && transition.after.queue === 1
      && transition.after.slots === 1;
    check(safe, `noindex to /footle initialized one deliberate ad (${JSON.stringify(transition.after)})`);
    if (transition.before.noindex < 1 || transition.before.scripts !== 0 || transition.before.slots !== 0) {
      throw new Error(`the stale-noindex control began from the wrong state: ${JSON.stringify(transition.before)}`);
    }
    if (!transition.after.staleControl || transition.after.noindex < 1 || transition.requests.length !== 0) {
      throw new Error(`the stale-noindex mutation did not suppress the game ad: ${JSON.stringify(transition)}`);
    }
  } else {
    console.log('1) a stored Accept starts exactly one deliberate game ad');
    const footle = await storedConsentVisit(browser, '/footle');
    check(footle.requests.length === 1, `/footle made exactly one AdSense request (${footle.requests.length})`);
    check(footle.state.scripts === 1, `/footle kept exactly one AdSense script (${footle.state.scripts})`);
    check(footle.state.queue === 1, `/footle queued exactly one manual slot (${footle.state.queue})`);
    check(footle.state.mobileSlotWidth >= 250, `/footle reserved a usable mobile slot width (${footle.state.mobileSlotWidth}px)`);
    check(footle.state.desktopSlotWidth >= 500, `/footle reserved a usable desktop slot width (${footle.state.desktopSlotWidth}px)`);

    console.log('\n2) screens without deliberate inventory make no ad request');
    for (const route of ZERO_REQUEST_ROUTES) {
      const result = await storedConsentVisit(browser, route.path);
      check(result.requests.length === 0, `${route.path} (${route.kind}) made zero requests (${result.requests.length})`);
      check(result.state.scripts === 0, `${route.path} kept the AdSense script out (${result.state.scripts})`);
    }

    console.log('\n3) Accept still wakes the slot after more than eight seconds');
    const delayed = await freshChoiceVisit(browser, 'Accept', 8500);
    check(delayed.beforeChoice.requests.length === 0, `before delayed Accept made zero AdSense requests (${delayed.beforeChoice.requests.length})`);
    check(delayed.beforeChoice.state.scripts === 0, `before delayed Accept kept the AdSense script out (${delayed.beforeChoice.state.scripts})`);
    check(delayed.beforeChoice.state.queue === 0, `before delayed Accept queued no manual slot (${delayed.beforeChoice.state.queue})`);
    check(delayed.beforeChoice.state.slots === 0, `before delayed Accept rendered no manual slot (${delayed.beforeChoice.state.slots})`);
    check(delayed.state.stored === 'accepted', `fresh choice stored accepted (${delayed.state.stored})`);
    check(delayed.requests.length === 1, `delayed Accept made exactly one AdSense request (${delayed.requests.length})`);
    check(delayed.state.scripts === 1, `delayed Accept kept exactly one AdSense script (${delayed.state.scripts})`);
    check(delayed.state.queue === 1, `delayed Accept queued exactly one manual slot (${delayed.state.queue})`);

    console.log('\n4) Essential only never starts ads');
    const essential = await freshChoiceVisit(browser, 'Essential only', 0);
    check(essential.state.stored === 'essential', `fresh choice stored essential (${essential.state.stored})`);
    check(essential.requests.length === 0, `Essential only made zero AdSense requests (${essential.requests.length})`);
    check(essential.state.scripts === 0, `Essential only kept the AdSense script out (${essential.state.scripts})`);
    check(essential.state.queue === 0, `Essential only queued no manual slot (${essential.state.queue})`);

    console.log('\n5) SPA transitions create no new ad inventory');
    const spa = await spaTransitionVisit(browser);
    check(spa.requests.length === 1, `game to legal to noindex made no extra AdSense request (${spa.requests.length})`);
    check(spa.legal.slots === 0, `privacy rendered no manual slot (${spa.legal.slots})`);
    check(spa.legal.queue === spa.initialQueue, `privacy left the manual queue unchanged (${spa.legal.queue})`);
    check(spa.noindex.slots === 0, `reset-password rendered no manual slot (${spa.noindex.slots})`);
    check(spa.noindex.queue === spa.initialQueue, `reset-password left the manual queue unchanged (${spa.noindex.queue})`);

    console.log('\n6) withdrawing consent reloads another open tab clean');
    const withdrawn = await crossTabWithdrawalVisit(browser);
    check(withdrawn.requests.length === 1, `cross-tab withdrawal made no new AdSense request (${withdrawn.requests.length})`);
    check(withdrawn.state.stored === null, `cross-tab withdrawal cleared stored consent (${withdrawn.state.stored})`);
    check(withdrawn.state.scripts === 0, `cross-tab withdrawal removed the AdSense script (${withdrawn.state.scripts})`);
    check(withdrawn.state.queue === 0, `cross-tab withdrawal cleared the manual queue (${withdrawn.state.queue})`);
    check(withdrawn.state.slots === 0, `cross-tab withdrawal rendered no manual slot (${withdrawn.state.slots})`);
    check(withdrawn.state.banner === 1, `cross-tab withdrawal restored one accessible cookie banner (${withdrawn.state.banner})`);

    console.log('\n7) a fallback 404 cannot leave noindex on a game');
    const fallback = await fallbackToGameVisit(browser);
    check(fallback.before.noindex >= 1, `fallback began noindexed (${fallback.before.noindex})`);
    check(fallback.before.scripts === 0, `fallback kept the AdSense script out (${fallback.before.scripts})`);
    check(fallback.before.slots === 0, `fallback rendered no manual slot (${fallback.before.slots})`);
    check(fallback.after.noindex === 0, `fallback to /footle cleared every noindex (${fallback.after.noindex})`);
    check(fallback.requests.length === 1, `fallback to /footle made exactly one AdSense request (${fallback.requests.length})`);
    check(fallback.after.scripts === 1, `fallback to /footle kept exactly one AdSense script (${fallback.after.scripts})`);
    check(fallback.after.queue === 1, `fallback to /footle queued exactly one manual slot (${fallback.after.queue})`);
    check(fallback.after.slots === 1, `fallback to /footle rendered exactly one manual slot (${fallback.after.slots})`);

    console.log('\n8) accepting in another tab preserves an active game');
    const accepted = await crossTabAcceptanceVisit(browser);
    check(accepted.loadsAfterAccept === accepted.loadsBeforeAccept, `cross-tab Accept preserved the active game document (${accepted.loadsBeforeAccept} to ${accepted.loadsAfterAccept} loads)`);
    check(accepted.requests.length === 1, `cross-tab Accept made exactly one AdSense request (${accepted.requests.length})`);
    check(accepted.state.stored === 'accepted', `cross-tab Accept stored accepted (${accepted.state.stored})`);
    check(accepted.state.scripts === 1, `cross-tab Accept kept exactly one AdSense script (${accepted.state.scripts})`);
    check(accepted.state.queue === 1, `cross-tab Accept queued exactly one manual slot (${accepted.state.queue})`);
    check(accepted.state.slots === 1, `cross-tab Accept rendered exactly one manual slot (${accepted.state.slots})`);
    check(accepted.state.banner === 0, `cross-tab Accept hid the cookie banner (${accepted.state.banner})`);

    console.log('\n9) a private noindex route can safely lead into a game');
    const transition = await noindexToGameVisit(browser);
    check(transition.before.noindex >= 1, `private route began noindexed (${transition.before.noindex})`);
    check(transition.before.scripts === 0, `private route kept the AdSense script out (${transition.before.scripts})`);
    check(transition.before.slots === 0, `private route rendered no manual slot (${transition.before.slots})`);
    check(transition.after.noindex === 0, `private route to /footle cleared every noindex (${transition.after.noindex})`);
    check(transition.requests.length === 1, `private route to /footle made exactly one AdSense request (${transition.requests.length})`);
    check(transition.after.scripts === 1, `private route to /footle kept exactly one AdSense script (${transition.after.scripts})`);
    check(transition.after.queue === 1, `private route to /footle queued exactly one manual slot (${transition.after.queue})`);
    check(transition.after.slots === 1, `private route to /footle rendered exactly one manual slot (${transition.after.slots})`);
  }
} catch (error) {
  runError = error;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
}

console.log('');
if (runError) {
  console.error(`playAdRoutes: could not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  process.exit(1);
}

if (CONTROL === 'global-loader') {
  if (failures !== 1) {
    console.error(`playAdRoutes control: RED. Expected exactly one owned reset-password failure, got ${failures}.`);
    process.exit(1);
  }
  console.log('playAdRoutes control: green. The exact old-loader injection made one request and the reset-password assertion caught it.');
  process.exit(0);
}

if (CONTROL === 'zero-width') {
  if (failures !== 2) {
    console.error(`playAdRoutes control: RED. Expected exactly two owned slot-width failures, got ${failures}.`);
    process.exit(1);
  }
  console.log('playAdRoutes control: green. The exact zero-width mutation fired and both viewport assertions caught it.');
  process.exit(0);
}

if (CONTROL === 'fallback-noindex') {
  if (failures !== 1) {
    console.error(`playAdRoutes control: RED. Expected exactly one owned fallback-noindex failure, got ${failures}.`);
    process.exit(1);
  }
  console.log('playAdRoutes control: green. Removing the fallback marker left one poisoning noindex and the cleanup assertion caught it.');
  process.exit(0);
}

if (CONTROL === 'accept-reload') {
  if (failures !== 1) {
    console.error(`playAdRoutes control: RED. Expected exactly one owned cross-tab reload failure, got ${failures}.`);
    process.exit(1);
  }
  console.log('playAdRoutes control: green. The forced cross-tab reload fired once and the active-game assertion caught it.');
  process.exit(0);
}

if (CONTROL === 'stale-noindex') {
  if (failures !== 1) {
    console.error(`playAdRoutes control: RED. Expected exactly one owned stale-noindex failure, got ${failures}.`);
    process.exit(1);
  }
  console.log('playAdRoutes control: green. The injected stale noindex suppressed the game ad and the transition assertion caught it.');
  process.exit(0);
}

if (failures > 0) {
  console.error(`playAdRoutes: ${failures} failure${failures === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`playAdRoutes: green. One deliberate game route requested one ad, ${ZERO_REQUEST_ROUTES.length} policy-risk routes requested none, delayed Accept worked, and Essential only stayed off.`);
