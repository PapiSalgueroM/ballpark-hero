/* Run against a completed local build:
 * node scripts/lib/hostLikeServer.mjs dist 4173
 * node scripts/playHomeAds.mjs
 * All external browser requests are intercepted. No advertising vendor runs.
 */
import assert from 'node:assert/strict';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.BASE ?? 'http://127.0.0.1:4173');
assert.equal(base.protocol, 'http:', 'Use the local HTTP preview');
assert.equal(base.hostname, '127.0.0.1', 'This replay only accepts a loopback preview');
const loader = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const placement = '[data-public-footer-ad]';
const manualSlot = '[data-dukb-manual-ad] ins.adsbygoogle';
const browser = await chromium.launch();

async function withHome(width, advertising, run) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  try {
    if (advertising !== null) {
      await context.addInitScript(value => {
        const now = Date.now();
        localStorage.setItem('cookie-consent-v2', JSON.stringify({
          version: 2, advertising: value, analytics: false, updatedAt: now, ...(value ? { advertisingConfirmedAt: now } : {}),
        }));
      }, advertising);
    }

    const requestedAds = [];
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === base.origin && ['GET', 'HEAD'].includes(request.method())) return route.continue();
      if (url.origin + url.pathname === loader) {
        requestedAds.push(request.url());
        return route.fulfill({
          status: 200, contentType: 'application/javascript', body: 'window.__homeAdFixtureLoaded = true;',
        });
      }
      return route.abort();
    });

    const page = await context.newPage();
    const response = await page.goto(base.origin, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.ok(), true, 'Local homepage did not load');
    await page.locator('[data-home-about]').waitFor({ state: 'visible' });
    await run(page, requestedAds);
  } finally {
    await context.close();
  }
}

async function pendingSlot(page, requestedAds) {
  const ad = page.locator(placement);
  const slot = ad.locator(manualSlot);
  await slot.waitFor({ state: 'attached', timeout: 6000 });
  await page.waitForFunction(() => window.__homeAdFixtureLoaded && (window.adsbygoogle?.length ?? 0) >= 1);
  assert.equal(await slot.count(), 1, 'Expected one shared footer slot');
  assert.equal(await slot.getAttribute('data-ad-slot'), '7540487748');
  assert.equal(await slot.getAttribute('data-full-width-responsive'), null);
  assert.equal(await slot.getAttribute('data-ad-format'), null);
  assert.equal(await ad.getByText('Advertisement', { exact: true }).count(), 0, 'A pending slot claimed to have filled');
  assert.equal(requestedAds.length, 1, 'Expected exactly one intercepted loader');
  return { ad, slot };
}

async function assertPlacement(slot, width) {
  const geometry = await slot.evaluate(element => {
    const ad = element.closest('[data-public-footer-ad]');
    const wrapper = ad.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    const about = document.querySelector('[data-home-about]').getBoundingClientRect();
    const catalogue = document.querySelector('[data-home-sport-catalogue]');
    const footer = document.querySelector('footer[data-site-chrome]').getBoundingClientRect();
    const protectedContent = document.querySelector('[data-game-desktop-rails]');
    const controls = [...document.querySelectorAll('main :is(a[href], button, input, select, summary), footer :is(a[href], button, summary)')]
      .filter(control => !ad.contains(control) && control.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }))
      .map(control => control.getBoundingClientRect())
      .filter(rect => rect.right > box.left && rect.left < box.right);
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      wrapperWidth: wrapper.width,
      slotWidth: box.width,
      slotHeight: box.height,
      slotLeft: box.left,
      slotRight: box.right,
      protectedGames: Boolean(protectedContent?.contains(catalogue) && protectedContent.contains(document.querySelector('[data-stage-card]'))),
      afterContent: wrapper.top >= Math.max(about.bottom, catalogue.getBoundingClientRect().bottom) - 1,
      afterFooter: box.top >= footer.bottom + 149,
      aboveGap: Math.min(...controls.filter(rect => rect.bottom <= box.top).map(rect => box.top - rect.bottom)),
      overlapsControl: controls.some(rect => rect.bottom > box.top + 1 && rect.top < box.bottom - 1),
    };
  });

  assert(geometry.protectedGames, 'Desktop rails must keep clear of the featured games and catalogue');
  if (width <= 430) {
    assert(geometry.afterContent && geometry.afterFooter, 'The phone ad goes below the shared footer');
    assert.equal(geometry.slotWidth, width <= 335 ? 300 : 320);
    assert.equal(geometry.slotHeight, 100);
  } else {
    assert(geometry.afterContent && geometry.afterFooter, 'The desktop ad goes below the shared footer');
  }
  assert(geometry.pageWidth <= geometry.viewport + 1, 'The home ad caused horizontal scrolling');
  assert(geometry.slotLeft >= -1 && geometry.slotRight <= geometry.viewport + 1, 'The ad extends outside the viewport');
  assert(geometry.slotWidth >= 250 && geometry.slotWidth <= geometry.wrapperWidth + 1, 'The ad needs usable responsive width');
  assert(geometry.slotWidth <= 729, 'The ad exceeds its desktop cap');
  assert(Number.isFinite(geometry.aboveGap) && geometry.aboveGap >= 149, 'The ad needs 150px of space from controls above it');
  assert.equal(geometry.overlapsControl, false, 'The ad overlaps an interactive control');
  console.log(width + 'px: filled at ' + Math.round(geometry.slotWidth) + '×' + Math.round(geometry.slotHeight) + 'px with ' + Math.round(geometry.aboveGap) + 'px clearance');
}

try {
  await withHome(320, false, async (page, requestedAds) => {
    assert.equal(await page.locator(manualSlot).count(), 0, 'Rejected advertising must not mount a manual slot');
    assert.equal(requestedAds.length, 0, 'Rejected advertising made a vendor request');
  });

  await withHome(390, null, async (page, requestedAds) => {
    const choices = page.getByRole('region', { name: 'Cookie choices', exact: true });
    await choices.waitFor({ state: 'visible' });
    assert.equal(await page.locator(manualSlot).count(), 0, 'Unanswered consent must not mount a manual slot');
    assert.equal(requestedAds.length, 0, 'Unanswered consent made a vendor request');
    await choices.getByRole('button', { name: 'Accept all', exact: true }).click();
    const { ad, slot } = await pendingSlot(page, requestedAds);
    await slot.evaluate(element => element.setAttribute('data-ad-status', 'unfilled'));
    await slot.waitFor({ state: 'detached' });
    assert.equal(await ad.getByText('Advertisement', { exact: true }).count(), 0);
    const box = await ad.boundingBox();
    assert((box?.height ?? 0) <= 1, 'An unfilled ad left a visible reservation');
    console.log('Fresh consent: no request before consent; mocked no-fill collapsed');
  });

  for (const width of [320, 390, 430, 1440]) {
    await withHome(width, true, async (page, requestedAds) => {
      const { ad, slot } = await pendingSlot(page, requestedAds);
      await slot.evaluate(element => {
        const creative = document.createElement('div');
        creative.style.cssText = 'width:100%;height:90px';
        element.append(creative);
        element.setAttribute('data-ad-status', 'filled');
      });
      await ad.getByText('Advertisement', { exact: true }).waitFor({ state: 'visible' });
      await assertPlacement(slot, width);

      if (width === 1440) {
        await page.locator('[data-home-about] summary').click();
        await assertPlacement(slot, width);
      }

      if (width === 390) {
        await page.getByLabel('Search games', { exact: true }).fill('soccer');
        await ad.waitFor({ state: 'detached' });
        assert.equal(await page.locator(manualSlot).count(), 0, 'Active game search must unmount the ad');
        assert.equal(requestedAds.length, 1, 'Searching requested another ad');
      }
    });
  }
  console.log('Home ads: PASS. Every vendor call was mocked or blocked.');
} finally {
  await browser.close();
}
