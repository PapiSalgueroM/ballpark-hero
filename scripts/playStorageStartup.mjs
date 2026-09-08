/**
 * Round 515 browser harness: storage failures cannot block the real app.
 *
 * Run against the host-like dist server on port 4185:
 *   node scripts/playStorageStartup.mjs
 *   STORAGE_STARTUP_CONTROL=vendor-request node scripts/playStorageStartup.mjs
 *
 * Every case gets a fresh browser context. All external requests are aborted,
 * and this harness never submits a form, vote or login.
 */
import { chromium } from './lib/playwrightLoader.mjs';

const BASE = (process.env.STORAGE_STARTUP_BASE || process.env.SWEEP_BASE || 'http://127.0.0.1:4185').replace(/\/$/, '');
const BASE_ORIGIN = new URL(BASE).origin;
const CONTROL = process.env.STORAGE_STARTUP_CONTROL || '';
const SCREENSHOT = process.env.STORAGE_STARTUP_SCREENSHOT || '';
if (CONTROL && CONTROL !== 'vendor-request') {
  console.error(`STORAGE_STARTUP_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const VENDOR_HOST = /(?:^|\.)(?:googletagmanager\.com|google-analytics\.com|googlesyndication\.com|doubleclick\.net|googleadservices\.com)$/i;
const expectedControlFailures = new Set(['failed-accept-vendor-requests', 'failed-accept-vendor-scripts']);
const failures = [];

function check(ok, message, key = message) {
  console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${message}`);
  if (!ok) failures.push(key);
}

function injectionScript(config) {
  window.__storageStartupProbe = {
    kind: config.kind,
    installed: false,
    getter: 0,
    length: 0,
    key: 0,
    getItem: 0,
    setItem: 0,
    writes: [],
    healthySeeded: 0,
    controlFired: false,
    firstTarget: '',
    firstStack: '',
    calls: [],
  };
  const probe = window.__storageStartupProbe;
  const denied = () => new DOMException('Storage access denied by browser harness', 'SecurityError');
  const recordStorageCall = (name, storage) => {
    probe[name] += 1;
    const target = storage === window.localStorage
      ? 'localStorage'
      : storage === window.sessionStorage
        ? 'sessionStorage'
        : 'unknown Storage';
    const stack = new Error(`denied ${name} on ${target}`).stack || '';
    if (probe.calls.length < 8) probe.calls.push({ name, target, stack });
    if (probe.firstStack) return;
    probe.firstTarget = target;
    probe.firstStack = stack;
  };

  if (config.kind === 'healthy') {
    localStorage.setItem('cookie-consent', 'essential');
    localStorage.setItem(config.sessionKey, config.sessionValue);
    localStorage.setItem(config.saveKey, config.saveValue);
    probe.healthySeeded = 3;
    probe.installed = true;
    return;
  }

  if (config.kind === 'getter') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        probe.getter += 1;
        if (!probe.firstStack) probe.firstStack = new Error('first denied localStorage getter').stack || '';
        throw denied();
      },
    });
  } else if (config.kind === 'length') {
    const storage = window.localStorage;
    Object.defineProperty(storage, 'length', {
      configurable: true,
      get() {
        recordStorageCall('length', this);
        throw denied();
      },
    });
  } else if (config.kind === 'key') {
    const storage = window.localStorage;
    storage.setItem('storage-startup-key-probe', '1');
    Object.defineProperty(storage, 'key', {
      configurable: true,
      value() {
        recordStorageCall('key', this);
        throw denied();
      },
    });
  } else if (config.kind === 'getItem') {
    const storage = window.localStorage;
    Object.defineProperty(storage, 'getItem', {
      configurable: true,
      value() {
        recordStorageCall('getItem', this);
        throw denied();
      },
    });
  } else if (config.kind === 'setItem') {
    const storage = window.localStorage;
    Object.defineProperty(storage, 'setItem', {
      configurable: true,
      value(key, value) {
        recordStorageCall('setItem', this);
        probe.writes.push([String(key), String(value)]);
        throw new DOMException('Storage quota full in browser harness', 'QuotaExceededError');
      },
    });
  }
  probe.installed = true;
}

async function isolatedPage(browser, config) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const external = [];
  const vendor = [];
  const pageErrors = [];
  const consoleErrors = [];

  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === BASE_ORIGIN) {
      await route.continue();
      return;
    }
    external.push(url.href);
    if (VENDOR_HOST.test(url.hostname)) vendor.push(url.href);
    await route.abort('blockedbyclient');
  });
  await context.addInitScript(injectionScript, config);
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { context, page, external, vendor, pageErrors, consoleErrors };
}

async function proveHomeAndSearch(page, label, followResult = true, verifyAuthLoaded = false) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const heading = page.locator('#dukb-main h1').filter({ hasText: 'DoUKnowBall' }).first();
  await heading.waitFor({ state: 'visible', timeout: 20000 });
  check((await heading.textContent())?.trim() === 'DoUKnowBall', `${label}: the real home screen renders`);

  const search = page.getByRole('textbox', { name: 'Search games' });
  await search.fill('Footle');
  const result = page.locator('a.home-tile[href="/footle"]').first();
  await result.waitFor({ state: 'visible', timeout: 10000 });
  check(await result.isVisible(), `${label}: game search returns the matching playable link`);
  if (verifyAuthLoaded) {
    const login = page.locator('header').getByRole('button', { name: 'Log In', exact: true });
    const signup = page.locator('header').getByRole('button', { name: 'Sign Up', exact: true });
    await login.waitFor({ state: 'visible', timeout: 10000 });
    check(await login.isVisible() && await signup.isVisible(), `${label}: Header leaves auth-loading and shows guest controls`);
  }
  if (followResult) {
    await result.click();
    await page.waitForURL(url => url.pathname === '/footle', { timeout: 10000 });
    check(new URL(page.url()).pathname === '/footle', `${label}: the search result opens its game`);
  }
}

async function runDeniedRead(browser, kind, counter) {
  console.log(`\n${kind}: blocked ${kind === 'getter' ? 'window.localStorage getter' : `localStorage.${kind}`} before app boot`);
  const state = await isolatedPage(browser, { kind });
  try {
    await proveHomeAndSearch(state.page, kind, true, kind === 'getItem');
    const probe = await state.page.evaluate(() => window.__storageStartupProbe);
    check(probe?.installed === true, `${kind}: the preboot injection installed`);
    check((probe?.[counter] || 0) > 0, `${kind}: the injected ${counter} failure actually fired`);
    check(state.pageErrors.length === 0, `${kind}: no uncaught page error (${state.pageErrors.join('; ') || 'none'})`);
  } catch (error) {
    const evidence = await state.page.evaluate(() => ({
      url: location.href,
      readyState: document.readyState,
      body: document.body?.innerText.replace(/\s+/g, ' ').trim().slice(0, 240) || '',
      rootChildren: document.querySelector('#root')?.childElementCount ?? -1,
      probe: window.__storageStartupProbe,
    })).catch(() => null);
    check(false, `${kind}: home/search flow threw ${error.message.split('\n')[0]}`, `${kind}-home-flow`);
    check(evidence?.probe?.installed === true, `${kind}: the preboot injection installed despite the boot failure`);
    check((evidence?.probe?.[counter] || 0) > 0, `${kind}: the injected ${counter} failure actually fired before the boot failure`);
    console.log(`  INFO  ${kind}: browser evidence ${JSON.stringify({
      ...evidence,
      probe: evidence?.probe ? {
        firstTarget: evidence.probe.firstTarget,
        firstStack: evidence.probe.firstStack,
        calls: evidence.probe.calls,
        [counter]: evidence.probe[counter],
      } : null,
      pageErrors: state.pageErrors,
      consoleErrors: state.consoleErrors,
    })}`);
  } finally {
    await state.context.close();
  }
}

async function runFailedConsent(browser) {
  console.log('\nsetItem: quota-full consent choices');
  const state = await isolatedPage(browser, { kind: 'setItem' });
  try {
    await proveHomeAndSearch(state.page, 'quota-full setItem', false);

    await state.page.evaluate(() => {
      const slot = document.createElement('div');
      slot.dataset.dukbManualAd = 'storage-startup-probe';
      slot.innerHTML = '<ins class="adsbygoogle" data-ad-slot="storage-startup-probe"></ins>';
      document.body.appendChild(slot);
    });

    const accept = state.page.getByRole('button', { name: 'Accept', exact: true });
    await accept.click();
    const alert = state.page.getByRole('alert');
    await alert.waitFor({ state: 'visible', timeout: 5000 });
    const afterAccept = await state.page.evaluate(() => window.__storageStartupProbe);
    check(afterAccept?.installed === true, 'quota-full setItem: the preboot injection installed');
    check((afterAccept?.setItem || 0) > 0, 'quota-full setItem: the injected quota failure actually fired');
    check(
      afterAccept?.writes?.some(([key, value]) => key === 'cookie-consent' && value === 'accepted'),
      'failed Accept tried to persist the accepted choice',
    );
    check(await accept.isVisible(), 'failed Accept keeps the consent choice visible');
    check(/Ads and analytics stay off/i.test(await alert.textContent()), 'failed Accept explains that vendors stay off');
    if (SCREENSHOT) {
      await state.page.screenshot({ path: SCREENSHOT, fullPage: false });
      console.log(`  INFO  failed-Accept screenshot saved to ${SCREENSHOT}`);
    }

    if (CONTROL === 'vendor-request') {
      await state.page.evaluate(() => {
        window.__storageStartupProbe.controlFired = true;
        const script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtag/js?id=storage-startup-control';
        document.head.appendChild(script);
      });
      await state.page.waitForTimeout(150);
      const controlProbe = await state.page.evaluate(() => window.__storageStartupProbe);
      check(controlProbe?.controlFired === true, 'negative control injected its vendor request');
    }

    const vendorScripts = await state.page.locator(
      'script[src*="googletagmanager.com"], script[src*="google-analytics.com"], script[src*="googlesyndication.com"], script[src*="doubleclick.net"], script[src*="googleadservices.com"]',
    ).count();
    check(state.vendor.length === 0, `failed Accept made no analytics or ad request (${state.vendor.length})`, 'failed-accept-vendor-requests');
    check(vendorScripts === 0, `failed Accept added no analytics or ad script (${vendorScripts})`, 'failed-accept-vendor-scripts');

    const essential = state.page.getByRole('button', { name: 'Essential only', exact: true });
    await essential.click();
    await essential.waitFor({ state: 'hidden', timeout: 5000 });
    const afterEssential = await state.page.evaluate(() => window.__storageStartupProbe);
    check(
      afterEssential?.writes?.some(([key, value]) => key === 'cookie-consent' && value === 'essential'),
      'Essential only tried to persist its choice',
    );
    check(!(await accept.isVisible()), 'Essential only dismisses the banner for this visit');
    check(!(await state.page.locator('body').getAttribute('data-consent-pending')), 'Essential only releases the page for this visit');

    await state.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    const reloadedAccept = state.page.getByRole('button', { name: 'Accept', exact: true });
    await reloadedAccept.waitFor({ state: 'visible', timeout: 10000 });
    check(await reloadedAccept.isVisible(), 'failed Essential only returns after reload because nothing was saved');
    check(state.vendor.length === (CONTROL ? 1 : 0), 'no vendor request appeared after Essential only or reload');
    check(state.pageErrors.length === 0, `quota-full setItem: no uncaught page error (${state.pageErrors.join('; ') || 'none'})`);
  } finally {
    await state.context.close();
  }
}

async function runHealthyPreservation(browser) {
  console.log('\nhealthy storage: saved auth and game state survive startup');
  const sessionKey = 'sb-flawuiqbvjobmkfkauhw-auth-token';
  const saveKey = 'storage-test-game-save';
  const sessionValue = JSON.stringify({
    access_token: 'storage-startup-fixture-token',
    refresh_token: 'storage-startup-fixture-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'storage-startup-fixture', aud: 'authenticated', created_at: new Date().toISOString() },
  });
  const saveValue = JSON.stringify({ season: 8 });
  const state = await isolatedPage(browser, { kind: 'healthy', sessionKey, sessionValue, saveKey, saveValue });
  try {
    await proveHomeAndSearch(state.page, 'healthy stored state', false);
    const saved = await state.page.evaluate(({ authKey, gameKey }) => ({
      probe: window.__storageStartupProbe,
      session: localStorage.getItem(authKey),
      game: localStorage.getItem(gameKey),
    }), { authKey: sessionKey, gameKey: saveKey });
    check(saved.probe?.installed === true && saved.probe?.healthySeeded === 3, 'healthy control seeded real localStorage before app boot');
    check(saved.session === sessionValue, 'startup preserves the stored Supabase session fixture');
    check(saved.game === saveValue, 'startup preserves the stored game save');
    check(state.pageErrors.length === 0, `healthy stored state: no uncaught page error (${state.pageErrors.join('; ') || 'none'})`);
    console.log(`  INFO  healthy control aborted ${state.external.length} external request(s)`);
  } finally {
    await state.context.close();
  }
}

console.log(`playStorageStartup: real built app at ${BASE}${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);
const browser = await chromium.launch({ headless: true });
try {
  await runDeniedRead(browser, 'getter', 'getter');
  await runDeniedRead(browser, 'length', 'length');
  await runDeniedRead(browser, 'key', 'key');
  await runDeniedRead(browser, 'getItem', 'getItem');
  await runFailedConsent(browser);
  await runHealthyPreservation(browser);
} finally {
  await browser.close();
}

if (CONTROL === 'vendor-request') {
  const controlFailures = new Set(failures);
  const onlyOwnedFailures = controlFailures.size === expectedControlFailures.size
    && [...controlFailures].every(key => expectedControlFailures.has(key));
  if (!onlyOwnedFailures) {
    console.error(`\nCONTROL FAILED: expected only ${[...expectedControlFailures].join(', ')}, got ${[...controlFailures].join(', ') || 'none'}`);
    process.exit(1);
  }
  console.log('\nCONTROL PASSED: the injected vendor request fired and only both vendor guards went red');
} else if (failures.length) {
  console.error(`\nplayStorageStartup: ${failures.length} assertion(s) failed`);
  process.exit(1);
} else {
  console.log('\nplayStorageStartup: all storage-startup browser checks passed');
}
