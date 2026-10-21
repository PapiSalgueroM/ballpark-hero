import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '../lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
assert.equal(new URL(BASE).origin, 'http://127.0.0.1:4173');
const out = process.env.ANALYTICS_STATUS_OUT || 'analytics-browser-artifacts';
fs.mkdirSync(out, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['src/components/CookieConsent.tsx', 'src/pages/PrivacyPolicy.tsx', 'src/lib/consentPreferences.ts', 'src/lib/consentedScripts.ts', 'scripts/qa/playAnalyticsStatus1445.mjs', 'package.json', 'package-lock.json'];
const before = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'), 'utf8')).map(row => {
  const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, row.file));
  assert.equal(hash(body), row.sha256);
  return [row.url, { body, contentType: row.contentType }];
}));
const report = { source: process.env.SOURCE_SHA, profiles: [], actualOutbound: 0, complete: false, before };
assert.match(report.source || '', /^[a-f0-9]{40}$/);
const key = 'cookie-consent-v2';
const region = page => page.getByRole('region', { name: 'Cookie choices', exact: true });
const vendors = requests => requests.filter(row => /googletagmanager|google-analytics|googlesyndication/.test(row.url));
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [[360, 800], [432, 900], [1280, 900]]) {
    const row = { width, height, status: 'RUNNING', requests: [], fulfilledExternal: 0, submissions: [], targetSizes: [], screenshots: [] };
    report.profiles.push(row);
    const ctx = await browser.newContext({ viewport: { width, height } });
    try {
      await ctx.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) return route.continue();
        const observation = { url: url.href, method: request.method() };
        row.requests.push(observation);
        if (!['GET', 'HEAD'].includes(request.method())) row.submissions.push(observation);
        row.fulfilledExternal++;
        if (fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
        return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
      });
      const page = await ctx.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(BASE + '/privacy'); await region(page).waitFor();
      const assertStatus = async () => {
        const status = region(page).locator('[data-analytics-paused-status]');
        assert.equal(await status.count(), 1); assert.equal(await status.isVisible(), true);
        assert.equal(await status.evaluate(el => el.tagName), 'P');
        assert.match(await status.innerText(), /Analytics is paused\.\s+Google Analytics is off while we check its privacy settings\./);
        assert.equal(await status.getAttribute('role'), null); assert.equal(await status.getAttribute('tabindex'), null);
        assert.equal(await status.locator('input, button, [role="checkbox"], [role="button"], [tabindex]').count(), 0);
        assert.equal(await region(page).getByRole('checkbox', { name: /Analytics/i }).count(), 0);
        assert.equal(await page.locator('script[src*="googletagmanager.com"],script[src*="google-analytics.com"]').count(), 0);
        assert.equal(vendors(row.requests).length, 0);
        assert(await region(page).evaluate(el => el.contains(document.activeElement)), 'Cookie region keeps focus');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      };
      await assertStatus();
      const advertising = region(page).getByRole('checkbox', { name: 'Advertising', exact: true });
      assert.equal(await advertising.isChecked(), false); assert.equal(await advertising.isDisabled(), false);
      for (const [name, target] of [['Advertising', advertising.locator('..')], ...['Reject all', 'Accept all', 'Save choices'].map(name => [name, region(page).getByRole('button', { name, exact: true })])]) {
        const box = await target.boundingBox(); assert(box && box.width >= 44 && box.height >= 44, name + ' target is at least44px');
        row.targetSizes.push({ name, width: box.width, height: box.height });
      }
      await advertising.check(); assert.equal(await advertising.isChecked(), true);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
      await region(page).getByRole('button', { name: 'Save choices', exact: true }).click();
      await region(page).waitFor({ state: 'hidden' });
      row.saved = JSON.parse(await page.evaluate(key => localStorage.getItem(key), key));
      assert.equal(row.saved.advertising, true); assert.equal(row.saved.analytics, false);
      const footer = page.getByRole('button', { name: 'Cookie choices', exact: true });
      await footer.click(); await region(page).waitFor(); await assertStatus();
      assert.equal(await advertising.isChecked(), true);
      const saved = await page.evaluate(key => localStorage.getItem(key), key);
      const cancelBox = await region(page).getByRole('button', { name: 'Cancel', exact: true }).boundingBox();
      assert(cancelBox && cancelBox.width >= 44 && cancelBox.height >= 44);
      row.targetSizes.push({ name: 'Cancel', width: cancelBox.width, height: cancelBox.height });
      await page.screenshot({ path: path.join(out, `analytics-status-${width}.png`), fullPage: true });
      row.screenshots.push(`analytics-status-${width}.png`);
      await region(page).getByRole('button', { name: 'Cancel', exact: true }).click(); await region(page).waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Cookie choices');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key), saved);
      assert.equal(row.submissions.length, 0); assert.equal(errors.length, 0); row.errors = errors;
      assert.equal(vendors(row.requests).length, 0);
      row.status = 'PASS';
    } catch (error) {
      row.status = 'FAIL'; row.error = { name: error.name, message: error.message, stack: error.stack };
      throw error;
    } finally { await ctx.close(); }
  }
  report.after = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
  assert.deepEqual(report.after, before); report.complete = true;
  console.log('Analytics status1445: PASS,3 actual profiles, tracking paused, local external fixtures only.');
} catch (error) {
  report.error = { name: error.name, message: error.message, stack: error.stack }; throw error;
} finally {
  await browser.close(); fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
