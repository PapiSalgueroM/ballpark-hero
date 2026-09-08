/**
 * Cookie-choice reset must fail honestly when browser storage cannot confirm
 * the stored answer was removed.
 *
 * Run against a host-like server after the final build:
 *   node scripts/playCookieChoices.mjs
 *   COOKIE_CHOICES_CONTROL=original-handler node scripts/playCookieChoices.mjs
 *
 * Every case gets a fresh context. External requests are observed and aborted.
 * The control replaces only the rendered button listener with the previous
 * handler inside that context, then requires its reload, missing alert and
 * repeated vendor request to reproduce without changing source or dist.
 */
import { chromium } from './lib/playwrightLoader.mjs';

const BASE = (process.env.COOKIE_CHOICES_BASE || process.env.SWEEP_BASE || 'http://127.0.0.1:4186').replace(/\/$/, '');
const BASE_ORIGIN = new URL(BASE).origin;
const CONTROL = process.env.COOKIE_CHOICES_CONTROL || '';
const SCREENSHOT = process.env.COOKIE_CHOICES_SCREENSHOT || '';
if (CONTROL && CONTROL !== 'original-handler') {
  console.error(`COOKIE_CHOICES_CONTROL=${CONTROL} is not supported`);
  process.exit(1);
}

const VENDOR_HOST = /(?:^|\.)(?:googletagmanager\.com|google-analytics\.com|googlesyndication\.com|doubleclick\.net|googleadservices\.com)$/i;
const ERROR_COPY = "We couldn't confirm that your cookie choice was cleared. Check this site's storage settings and try again.";
const failures = [];

function check(ok, message, key = message) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${message}`);
  if (!ok) failures.push(key);
}

async function waitForObserved(predicate, label, timeout = 10000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started >= timeout) throw new Error(`Timed out waiting for ${label}`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

function installStorageCase(config) {
  const seedMarker = '__dukbCookieChoicesSeeded';
  const attemptsMarker = '__dukbCookieChoicesAttempts';
  const controlMarker = '__dukbCookieChoicesControlFired';
  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;

  if (originalGet.call(sessionStorage, seedMarker) !== '1') {
    originalSet.call(localStorage, 'cookie-consent', 'accepted');
    originalSet.call(sessionStorage, seedMarker, '1');
    originalSet.call(sessionStorage, attemptsMarker, '0');
    originalSet.call(sessionStorage, controlMarker, '0');
  }

  const countAttempt = () => {
    const next = Number(originalGet.call(sessionStorage, attemptsMarker) || '0') + 1;
    originalSet.call(sessionStorage, attemptsMarker, String(next));
    return next;
  };

  window.__cookieChoicesProbe = { originalGet, kind: config.kind };
  if (config.kind === 'remove-error') {
    Storage.prototype.removeItem = function removeItem(key) {
      if (this === window.localStorage && key === 'cookie-consent') {
        countAttempt();
        throw new DOMException('Cookie choice removal blocked by browser harness', 'SecurityError');
      }
      return originalRemove.call(this, key);
    };
  } else if (config.kind === 'remove-noop') {
    Storage.prototype.removeItem = function removeItem(key) {
      if (this === window.localStorage && key === 'cookie-consent') {
        countAttempt();
        return;
      }
      return originalRemove.call(this, key);
    };
  } else if (config.kind === 'read-error') {
    let removed = false;
    Storage.prototype.removeItem = function removeItem(key) {
      if (this === window.localStorage && key === 'cookie-consent') {
        countAttempt();
        originalRemove.call(this, key);
        removed = true;
        return;
      }
      return originalRemove.call(this, key);
    };
    Storage.prototype.getItem = function getItem(key) {
      if (this === window.localStorage && key === 'cookie-consent' && removed) {
        throw new DOMException('Cookie choice confirmation blocked by browser harness', 'SecurityError');
      }
      return originalGet.call(this, key);
    };
  } else if (config.kind === 'remove-once') {
    Storage.prototype.removeItem = function removeItem(key) {
      if (this === window.localStorage && key === 'cookie-consent') {
        if (countAttempt() === 1) {
          throw new DOMException('First cookie choice removal blocked by browser harness', 'SecurityError');
        }
      }
      return originalRemove.call(this, key);
    };
  }
}

async function openCase(browser, kind) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const external = [];
  const pageErrors = [];
  let phase = 'initial';

  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === BASE_ORIGIN) {
      await route.continue();
      return;
    }
    external.push({ phase, vendor: VENDOR_HOST.test(url.hostname), target: `${url.hostname}${url.pathname}` });
    await route.abort('blockedbyclient');
  });
  await context.addInitScript(installStorageCase, { kind });

  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#dukb-main').waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: 'Cookie choices', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await waitForObserved(
    () => external.some(request => request.vendor && request.phase === 'initial'),
    `${kind} accepted fixture vendor request`,
  );
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  const initialVendor = external.filter(request => request.vendor).length;
  const initialConsent = await readStoredConsent(page);
  check(initialConsent === 'accepted', `${kind}: starts with the accepted fixture`);
  check(initialVendor > 0, `${kind}: accepted fixture starts one or more intercepted vendor requests`);

  return {
    context,
    page,
    external,
    pageErrors,
    setPhase(value) { phase = value; },
  };
}

async function readStoredConsent(page) {
  return page.evaluate(() => window.__cookieChoicesProbe.originalGet.call(localStorage, 'cookie-consent'));
}

async function attemptCount(page) {
  return page.evaluate(() => Number(sessionStorage.getItem('__dukbCookieChoicesAttempts') || '0'));
}

async function installOriginalHandlerControl(page) {
  await page.evaluate(() => {
    const current = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Cookie choices');
    if (!current) throw new Error('Cookie choices button is missing before control installation');
    const replacement = current.cloneNode(true);
    if (!(replacement instanceof HTMLButtonElement)) throw new Error('Cookie choices control clone is not a button');
    replacement.dataset.cookieChoicesControl = 'original-handler';
    replacement.addEventListener('click', () => {
      sessionStorage.setItem('__dukbCookieChoicesControlFired', '1');
      try { localStorage.removeItem('cookie-consent'); } catch { /* previous handler ignored this failure */ }
      window.location.reload();
    });
    current.replaceWith(replacement);
  });
  const installed = await page.locator('button[data-cookie-choices-control="original-handler"]').count();
  check(installed === 1, 'negative control replaced exactly one rendered Cookie choices handler');
}

async function verifyFailedAttempt(state, label, expectedStored) {
  const { page, external, pageErrors } = state;
  const documentToken = `${label}-${Date.now()}-${Math.random()}`;
  await page.evaluate(token => { window.__cookieChoicesDocumentToken = token; }, documentToken);
  state.setPhase(label);
  const button = page.getByRole('button', { name: 'Cookie choices', exact: true });
  const alert = page.getByRole('alert');
  if (CONTROL) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
      button.click(),
    ]);
    await page.locator('#dukb-main').waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('button', { name: 'Cookie choices', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await waitForObserved(
      () => external.some(request => request.vendor && request.phase === label),
      'original-handler control vendor request after reload',
    );
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(250);
  } else {
    await button.click();
    await alert.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(
      expected => document.querySelector('[role="alert"]')?.textContent?.trim() === expected,
      ERROR_COPY,
      { timeout: 10000 },
    );
    if (SCREENSHOT && label === 'remove-error') {
      await alert.scrollIntoViewIfNeeded();
      await page.screenshot({ path: SCREENSHOT, fullPage: false });
      console.log(`  INFO  failure-alert screenshot saved to ${SCREENSHOT}`);
    }
    // The alert proves the failure branch settled. Keep a bounded window for
    // negative observations such as no reload, request or late page error.
    await page.waitForTimeout(500);
  }

  const sameDocument = await page.evaluate(token => window.__cookieChoicesDocumentToken === token, documentToken);
  const stored = await readStoredConsent(page);
  const vendorAfter = external.filter(request => request.vendor && request.phase === label).length;
  const alertVisible = await alert.isVisible().catch(() => false);
  const alertText = alertVisible ? (await alert.textContent())?.trim() : '';

  check(sameDocument, `${label}: failed reset stays on the current page`, 'failed-reset-stays-page');
  check(stored === expectedStored, `${label}: stored consent is ${String(expectedStored)}`);
  check(vendorAfter === 0, `${label}: failed reset starts no new vendor request`, 'failed-reset-no-vendor');
  check(alertVisible && alertText === ERROR_COPY, `${label}: exact storage error is visible`, 'failed-reset-alert');
  check(!/vendors? (?:are|stay) off/i.test(alertText || ''), `${label}: error makes no false vendors-off claim`);
  check(pageErrors.length === 0, `${label}: no uncaught page error (${pageErrors.join('; ') || 'none'})`);
}

async function runNormal(browser) {
  console.log('\nA) normal reset');
  const state = await openCase(browser, 'normal');
  try {
    state.setPhase('normal-success');
    await Promise.all([
      state.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
      state.page.getByRole('button', { name: 'Cookie choices', exact: true }).click(),
    ]);
    await state.page.locator('#dukb-main').waitFor({ state: 'visible', timeout: 20000 });
    const banner = state.page.getByRole('button', { name: 'Accept', exact: true });
    await banner.waitFor({ state: 'visible', timeout: 10000 });
    await state.page.waitForLoadState('networkidle', { timeout: 10000 });
    await state.page.waitForTimeout(500);
    const stored = await readStoredConsent(state.page);
    const vendorAfter = state.external.filter(request => request.vendor && request.phase === 'normal-success').length;
    check(stored === null, 'normal reset clears the stored answer');
    check(vendorAfter === 0, 'normal reset reload starts no vendor request');
    check(await banner.isVisible(), 'normal reset reload shows cookie choices');
    check(state.pageErrors.length === 0, `normal reset has no uncaught page error (${state.pageErrors.join('; ') || 'none'})`);
  } finally {
    await state.context.close();
  }
}

async function runFailure(browser, kind) {
  console.log(`\nB) ${kind}`);
  const state = await openCase(browser, kind);
  try {
    if (CONTROL) await installOriginalHandlerControl(state.page);
    await verifyFailedAttempt(state, kind, kind === 'read-error' ? null : 'accepted');
    check(await attemptCount(state.page) === 1, `${kind}: the injected storage failure fired exactly once`);
    if (CONTROL) {
      const fired = await state.page.evaluate(() => sessionStorage.getItem('__dukbCookieChoicesControlFired'));
      check(fired === '1', 'negative control listener actually fired');
    }
  } finally {
    await state.context.close();
  }
}

async function runRetry(browser) {
  console.log('\nC) failed attempt followed by successful retry');
  const state = await openCase(browser, 'remove-once');
  try {
    await verifyFailedAttempt(state, 'retry-first', 'accepted');
    check(await attemptCount(state.page) === 1, 'retry: first removal failed exactly once');

    state.setPhase('retry-success');
    await Promise.all([
      state.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
      state.page.getByRole('button', { name: 'Cookie choices', exact: true }).click(),
    ]);
    await state.page.locator('#dukb-main').waitFor({ state: 'visible', timeout: 20000 });
    const banner = state.page.getByRole('button', { name: 'Accept', exact: true });
    await banner.waitFor({ state: 'visible', timeout: 10000 });
    await state.page.waitForLoadState('networkidle', { timeout: 10000 });
    await state.page.waitForTimeout(500);
    const stored = await readStoredConsent(state.page);
    const vendorAfter = state.external.filter(request => request.vendor && request.phase === 'retry-success').length;
    check(await attemptCount(state.page) === 2, 'retry: second removal reached storage');
    check(stored === null, 'retry: successful second attempt clears the stored answer');
    check(vendorAfter === 0, 'retry: successful reload starts no vendor request');
    check(await banner.isVisible(), 'retry: successful reload shows cookie choices');
    check(state.pageErrors.length === 0, `retry has no uncaught page error (${state.pageErrors.join('; ') || 'none'})`);
  } finally {
    await state.context.close();
  }
}

console.log(`playCookieChoices: real built app at ${BASE}${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);
const browser = await chromium.launch({ headless: true });
try {
  if (CONTROL) {
    await runFailure(browser, 'remove-error');
  } else {
    await runNormal(browser);
    await runFailure(browser, 'remove-error');
    await runFailure(browser, 'remove-noop');
    await runFailure(browser, 'read-error');
    await runRetry(browser);
  }
} finally {
  await browser.close();
}

if (CONTROL) {
  const expected = new Set(['failed-reset-stays-page', 'failed-reset-no-vendor', 'failed-reset-alert']);
  const actual = new Set(failures);
  const exact = actual.size === expected.size && [...actual].every(key => expected.has(key));
  if (!exact) {
    console.error(`playCookieChoices control failed: expected only ${[...expected].join(', ')}, got ${[...actual].join(', ') || 'none'}`);
    process.exit(1);
  }
  console.log('playCookieChoices control green: the previous handler reproduced only reload, repeated-vendor and missing-alert failures.');
  process.exit(0);
}

if (failures.length) {
  console.error(`playCookieChoices: ${failures.length} failure(s): ${failures.join(', ')}`);
  process.exit(1);
}
console.log('playCookieChoices: green. Normal reset and retry cleared consent; remove error, no-op and read error stayed put with an honest alert and no new vendor request.');
