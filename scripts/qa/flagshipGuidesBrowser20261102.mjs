import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const OUT = path.join(process.env.QA_OUT, 'browser');
await fs.mkdir(OUT, { recursive: true });
const report = { status: 'incomplete', sameCompletedDist: true, fontRendering: 'Fallback fonts only; no actual-font pixel claim', contexts: [] };
const browser = await pw.chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 320, height: 800 }, { width: 1280, height: 900 }]) {
    const result = { viewport, status: 'incomplete', blockedRequests: [], pageErrors: [], panels: [] };
    report.contexts.push(result);
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (/^https?:$/.test(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return route.continue();
      result.blockedRequests.push({ origin: url.origin, method: route.request().method(), resourceType: route.request().resourceType() });
      await route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    try {
      await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
      result.consent = await answerConsent(page);
      for (let n = 0; n < 3 && await page.locator('[role="dialog"]:visible').count(); n++) {
        const dialog = page.locator('[role="dialog"]:visible').first();
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
      }
      assert.equal(await page.locator('[role="dialog"]:visible').count(), 0, 'Opening help did not close');
      for (const name of [/2026-27/i, /England/i, /Premier League/i, /Brentford/i, /Take the job/i, /Skip: just manage/i]) {
        await page.getByRole('button', { name }).first().click();
      }
      await page.getByRole('tab', { name: 'Market', exact: true }).click();
      await page.getByRole('button', { name: /^Free agents \(/ }).click();
      let disabledIndex = null;
      let playerName = null;
      let blockReason = null;
      for (const panel of ['market', 'contracts']) {
        if (panel === 'contracts') await page.getByRole('tab', { name: 'Squad', exact: true }).click();
        const section = page.locator('section[aria-label="Free agents"]');
        await section.waitFor({ state: 'visible' });
        const disabled = disabledIndex === null
          ? section.locator('button[data-sign-index]:disabled[aria-describedby]').first()
          : section.locator('button[data-sign-index="' + disabledIndex + '"]');
        assert.ok(await disabled.count(), 'INCOMPLETE: natural initial pool has no disabled row with an associated reason');
        assert.equal(await disabled.isDisabled(), true);
        const index = await disabled.getAttribute('data-sign-index');
        const id = await disabled.getAttribute('aria-describedby');
        assert.ok(id && !/\s/.test(id), 'Expected the one actual reason ID');
        const reason = section.locator('[id=' + JSON.stringify(id) + ']');
        assert.equal(await reason.count(), 1);
        const row = disabled.locator('..');
        await row.scrollIntoViewIfNeeded();
        await reason.scrollIntoViewIfNeeded();
        assert.equal(await reason.isVisible(), true, 'Reason must be visible text');
        const text = (await reason.innerText()).trim();
        assert.ok(text.length > 0);
        const name = await row.locator('span[title]').first().getAttribute('title');
        assert.ok(name);
        if (disabledIndex === null) { disabledIndex = index; playerName = name; blockReason = text; }
        assert.equal(name, playerName);
        assert.equal(text, blockReason, 'Both desks must show the same actual reason');
        const bounds = await row.boundingBox();
        assert.ok(bounds && bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y >= -1 && bounds.y + bounds.height <= viewport.height + 1, 'Row must fit the viewport');
        const reasonBounds = await reason.boundingBox();
        assert.ok(reasonBounds && reasonBounds.width > 0 && reasonBounds.height > 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Page has horizontal overflow');
        const enabled = section.locator('button[data-sign-index]:not(:disabled)').first();
        assert.ok(await enabled.count(), 'INCOMPLETE: natural initial pool has no eligible signing action');
        assert.equal(await enabled.isEnabled(), true);
        const screenshot = viewport.width + '-' + panel + '.png';
        await page.screenshot({ path: path.join(OUT, screenshot) });
        result.panels.push({ panel, playerName, reason: text, disabledIndex, bounds, screenshot, eligibleActionEnabled: true, boughtAnyone: false });
      }
      assert.deepEqual(result.pageErrors, []);
      assert.equal(result.panels.length, 2);
      result.status = 'passed';
    } catch (error) {
      result.status = String(error).includes('INCOMPLETE:') ? 'incomplete' : 'failed';
      result.error = String(error.stack || error);
      process.exitCode = 1;
    } finally {
      await context.close();
    }
  }
  assert.equal(report.contexts.length, 2);
  report.status = report.contexts.every(r => r.status === 'passed' && r.panels.length === 2) ? 'passed' : 'incomplete';
} finally {
  await browser.close();
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
assert.equal(report.status, 'passed', 'Both real App contexts and both desks must complete');
