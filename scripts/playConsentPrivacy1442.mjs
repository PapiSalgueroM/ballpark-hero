import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from './lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
assert.equal(new URL(BASE).hostname, '127.0.0.1', 'This suite uses the completed local build only');
const out = process.env.LEGAL_PRIVACY_OUT || 'legal-privacy-artifacts';
fs.mkdirSync(out, { recursive: true });
const report = { cases: [], externalRequests: [], actualOutbound: 0, complete: false };
const cache = new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'), 'utf8')).map(row => {
  const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, row.file));
  assert.equal(createHash('sha256').update(body).digest('hex'), row.sha256);
  return [row.url, { body, contentType: row.contentType }];
}));
const key = 'cookie-consent-v2';
const choice = (advertising, analytics) => JSON.stringify({ version: 2, advertising, analytics, updatedAt: Date.now() });
const vendors = rows => rows.filter(url => /googletagmanager|googlesyndication|google-analytics/.test(url));
const browser = await chromium.launch({ headless: true });
async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  const requests = [];
  await ctx.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(BASE).origin) return route.continue();
    requests.push(url.href); report.externalRequests.push(url.href);
    if (cache.has(url.href)) return route.fulfill({ status: 200, ...cache.get(url.href) });
    if (/googletagmanager\.com\/gtag\/js/.test(url.href)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.__privacyAnalyticsFixture=true;' });
    if (/googlesyndication\.com\/pagead\/js\/adsbygoogle/.test(url.href)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.__privacyAdsFixture=true;' });
    // Fixture responses prevent all database, report, AI and other external transport.
    return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
  });
  return { ctx, requests };
}
const region = page => page.getByRole('region', { name: 'Cookie choices', exact: true });
async function run(name, action) {
  console.log('Consent browser: ' + name);
  await action(); report.cases.push({ name, passed: true });
}

try {
  await run('fresh choice, paused analytics and footer opening preserve the current decision', async () => {
    const { ctx, requests } = await context();
    try {
      const page = await ctx.newPage();
      await page.goto(BASE + '/privacy');
      await region(page).waitFor();
      assert.equal(vendors(requests).length, 0);
      const advertising = region(page).getByRole('checkbox', { name: /Advertising/i });
      const analytics = region(page).getByRole('checkbox', { name: /Analytics/i });
      assert.equal(await advertising.isChecked(), false); assert.equal(await analytics.isChecked(), false);
      assert.equal(await analytics.isDisabled(), true);
      await advertising.check();
      await region(page).getByRole('button', { name: 'Save choices', exact: true }).click();
      await region(page).waitFor({ state: 'hidden' });
      assert.equal(vendors(requests).length, 0);
      assert.equal(requests.filter(url => /adsbygoogle/.test(url)).length, 0);
      const before = await page.evaluate(key => localStorage.getItem(key), key);
      assert.equal(JSON.parse(before).advertising, true); assert.equal(JSON.parse(before).analytics, false);
      await page.getByRole('button', { name: 'Cookie choices', exact: true }).click();
      await region(page).waitFor();
      assert.equal(await region(page).getByRole('checkbox', { name: /Advertising/i }).isChecked(), true);
      assert.equal(await region(page).getByRole('checkbox', { name: /Analytics/i }).isChecked(), false);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key), before);
      assert(await region(page).getByRole('button', { name: 'Reject all', exact: true }).isVisible());
      assert(await region(page).getByRole('button', { name: 'Accept all', exact: true }).isVisible());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(out, 'cookie-choices-phone.png') });
    } finally { await ctx.close(); }
  });

  await run('withdrawal reloads both tabs, removes optional cookies and preserves essential storage', async () => {
    const { ctx, requests } = await context();
    try {
      await ctx.addInitScript(({ key, value }) => {
        if (!localStorage.getItem('__privacy_fixture_initialized')) {
          localStorage.setItem(key, value); localStorage.setItem('__privacy_fixture_initialized', '1');
          localStorage.setItem('__privacy_fixture_game_save', 'kept');
        }
      }, { key, value: choice(true, true) });
      await ctx.addCookies([
        { name: '_ga_FIXTURE', value: 'optional', url: BASE },
        { name: '_gcl_au', value: 'optional', url: BASE },
        { name: 'dukb_fixture_essential', value: 'kept', url: BASE },
      ]);
      const a = await ctx.newPage(), b = await ctx.newPage();
      await a.goto(BASE + '/footle'); await b.goto(BASE + '/footle');
      for (const page of [a, b]) {
        const play = page.getByRole('button', { name: "Let's Play!", exact: true });
        if (await play.isVisible()) await play.click();
        await page.waitForFunction(() => window.__privacyAdsFixture === true);
      }
      await a.getByRole('button', { name: 'Cookie choices', exact: true }).click();
      const reloadedA = a.waitForEvent('framenavigated', { predicate: frame => frame === a.mainFrame(), timeout: 15000 });
      const reloadedB = b.waitForEvent('framenavigated', { predicate: frame => frame === b.mainFrame(), timeout: 15000 });
      const previous = vendors(requests).length;
      await region(a).getByRole('button', { name: 'Reject all', exact: true }).click();
      await Promise.all([reloadedA, reloadedB]);
      await Promise.all([a.waitForLoadState(), b.waitForLoadState()]);
      assert.equal(vendors(requests).length, previous);
      const saved = JSON.parse(await a.evaluate(key => localStorage.getItem(key), key));
      assert.equal(saved.advertising, false); assert.equal(saved.analytics, false);
      assert.equal(await a.evaluate(() => localStorage.getItem('__privacy_fixture_game_save')), 'kept');
      const cookies = await ctx.cookies();
      assert(!cookies.some(row => /^_ga|^_gcl_/.test(row.name)));
      assert(cookies.some(row => row.name === 'dukb_fixture_essential' && row.value === 'kept'));
    } finally { await ctx.close(); }
  });

  for (const legacy of ['accepted', 'essential']) await run('legacy ' + legacy + ' never grants optional scripts', async () => {
    const { ctx, requests } = await context();
    try {
      await ctx.addInitScript(value => localStorage.setItem('cookie-consent', value), legacy);
      const page = await ctx.newPage(); await page.goto(BASE + '/privacy');
      await page.getByRole('button', { name: 'Cookie choices', exact: true }).waitFor();
      if (legacy === 'accepted') await region(page).waitFor();
      else assert.equal(await region(page).count(), 0);
      assert.equal(vendors(requests).length, 0);
    } finally { await ctx.close(); }
  });

  for (const analytics of [false, true]) await run('saved head before app boot, analytics=' + analytics, async () => {
    const { ctx, requests } = await context();
    try {
      await ctx.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key, value: choice(false, analytics) });
      await ctx.route('**/assets/*.js', route => route.abort());
      const page = await ctx.newPage(); await page.goto(BASE + '/privacy');
      assert.equal(requests.filter(url => /googletagmanager/.test(url)).length, 0);
      assert.equal(requests.filter(url => /adsbygoogle/.test(url)).length, 0);
      assert.match(await page.locator('#dukb-snapshot').innerText(), /Privacy/i);
    } finally { await ctx.close(); }
  });

  await run('browser privacy signal keeps advertising off', async () => {
    const { ctx, requests } = await context();
    try {
      await ctx.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true }));
      const page = await ctx.newPage(); await page.goto(BASE + '/privacy'); await region(page).waitFor();
      const advertising = region(page).getByRole('checkbox', { name: /Advertising/i });
      assert.equal(await advertising.isDisabled(), true);
      await region(page).getByRole('button', { name: 'Accept all', exact: true }).click();
      await region(page).waitFor({ state: 'hidden' });
      assert.equal(requests.filter(url => /googletagmanager/.test(url)).length, 0);
      assert.equal(requests.filter(url => /adsbygoogle/.test(url)).length, 0);
      assert.equal(JSON.parse(await page.evaluate(key => localStorage.getItem(key), key)).advertising, false);
    } finally { await ctx.close(); }
  });
  await run('account form loads on request, keeps drafts and returns focus', async () => {
    const { ctx } = await context();
    let releaseBody = () => {};
    const bodyHeld = new Promise(resolve => { releaseBody = resolve; });
    try {
      const page = await ctx.newPage(), scripts = [];
      page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()); });
      await page.route('**/AuthModalBody-*.js', async route => { await bodyHeld; await route.continue(); });
      await page.goto(BASE + '/');
      await region(page).waitFor();
      await region(page).getByRole('button', { name: 'Reject all', exact: true }).click();
      await region(page).waitFor({ state: 'hidden' });
      const bodyRequests = () => scripts.filter(url => /\/AuthModalBody-[^/]+\.js$/.test(new URL(url).pathname));
      assert.equal(bodyRequests().length, 0, 'The unused account form is absent from the initial page download');
      const login = page.getByRole('button', { name: 'Log In', exact: true });
      await login.click();
      const loadingCancel = page.getByRole('region', { name: 'Account sign in', exact: true }).getByRole('button', { name: 'Cancel', exact: true });
      await loadingCancel.focus();
      assert.equal(await loadingCancel.evaluate(element => element === document.activeElement), true);
      releaseBody();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      assert.equal(bodyRequests().length, 1, 'The account action fetches the real form chunk');
      const email = dialog.getByRole('textbox', { name: 'Email', exact: true });
      await email.fill('draft@example.test');
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Log In');
      await login.click();
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('textbox', { name: 'Email', exact: true }).inputValue(), 'draft@example.test');
      assert.equal(bodyRequests().length, 1);
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
      await dialog.getByRole('heading', { name: 'Join DoUKnowBall', exact: true }).waitFor();
      assert.equal(await dialog.getByRole('checkbox', { name: /I am 13 or older/ }).isChecked(), false);
      assert.equal(await dialog.getByRole('link', { name: 'Terms', exact: true }).getAttribute('href'), '/terms');
      assert.equal(await dialog.getByRole('link', { name: 'Privacy Policy', exact: true }).getAttribute('href'), '/privacy');
      await page.screenshot({ path: path.join(out, 'account-form-phone.png') });
    } finally { releaseBody(); await ctx.close(); }
  });
  report.complete = true;
  console.log(`Consent browser: PASS, ${report.cases.length} cases. Every external request was fulfilled locally; no live provider requests.`);
} catch (error) {
  report.error = { name: error.name, message: error.message, stack: error.stack };
  throw error;
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, 'consent-browser.json'), JSON.stringify(report, null, 2) + '\n');
}
