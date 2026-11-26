/* BASE=http://localhost:4173 node scripts/playHomeDisclosures.mjs */
import assert from 'node:assert/strict';
import { chromium } from './lib/playwrightLoader.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

const base = new URL(process.env.BASE || 'http://localhost:4173');
const browser = await chromium.launch();
try {
  for (const width of [320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    await context.route(url => url.origin !== base.origin, route => route.abort());
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));

    const page = await context.newPage();
    await page.goto(base.href, { waitUntil: 'domcontentloaded' });
    const about = page.getByRole('region', { name: 'About DoUKnowBall' });
    await about.waitFor();
    assert(await about.getByRole('heading', { level: 2 }).isVisible(), width + 'px About heading is visible');
    assert(await about.locator(':scope > p').first().isVisible(), width + 'px About intro is visible');
    const moreAbout = about.getByText('Read more', { exact: true });
    assert.equal(await moreAbout.count(), 1, width + 'px About offers a Read more disclosure');
    const deeper = about.getByText('Free sports career sims and soccer management games', { exact: true });
    assert.equal(await deeper.count(), 1, width + 'px deeper copy stays in the DOM');
    assert(!(await deeper.isVisible()), width + 'px deeper copy starts folded');
    await moreAbout.press('Enter');
    assert(await deeper.isVisible(), width + 'px Enter opens the original About copy');
    assert(await about.getByRole('link', { name: 'Soccer Career', exact: true }).first().isVisible(), width + 'px the original About links are usable');
    await moreAbout.press('Space');
    assert(!(await deeper.isVisible()), width + 'px Space folds the About copy again');

    const footer = page.getByRole('contentinfo');
    for (const name of ['About', 'Contact', 'Privacy Policy', 'Terms of Service']) {
      assert(await footer.getByRole('link', { name, exact: true }).isVisible(), width + 'px footer shows ' + name);
    }
    const cookie = footer.getByRole('button', { name: 'Cookie choices', exact: true });
    const report = footer.getByRole('button', { name: 'Report a problem', exact: true });
    assert(await cookie.isVisible() && await report.isVisible(), width + 'px cookie choices and reporting stay visible');
    const moreLinks = footer.getByText('More links', { exact: true });
    const moved = ['/soccer', '/pro-basketball', '/search', '/records', '/cookie-policy', '/accessibility', '/whats-new', '/leaderboard'];
    const disclaimer = footer.getByText(/independent fan project/);
    for (const href of moved) {
      const link = footer.locator('a[href="' + href + '"]');
      assert.equal(await link.count(), 1, width + 'px retains ' + href);
      assert(!(await link.isVisible()), width + 'px folds ' + href);
    }
    assert(!(await disclaimer.isVisible()), width + 'px the disclaimer starts folded');
    await moreLinks.press('Enter');
    for (const href of moved) assert(await footer.locator('a[href="' + href + '"]').isVisible(), width + 'px More links opens ' + href);
    assert((await disclaimer.textContent()).includes('MLB, FIFA, UEFA') && await disclaimer.isVisible(), width + 'px the disclaimer is accessible');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + 'px expanded content fits horizontally');
    await moreLinks.press('Space');
    assert(!(await disclaimer.isVisible()), width + 'px the disclaimer folds again');

    await cookie.click();
    assert.equal(await answerConsent(page), 'rejected', width + 'px Cookie choices opens and saves');
    await report.click();
    await page.getByRole('dialog', { name: 'Report a problem' }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.textContent.trim() === 'Report a problem');
    console.log(width + 'px: compact disclosures preserve copy, policy links, cookie choices and reporting');
    if (width === 1440) {
      await context.addInitScript(() => { window.__DUKB_PRERENDER__ = true; });
      await page.goto(new URL('/about', base).href, { waitUntil: 'domcontentloaded' });
      const capture = page.locator('footer details[open]');
      await capture.waitFor();
      for (const href of moved) {
        assert((await capture.locator('a[href="' + href + '"]').innerText()).trim(), 'Snapshots still capture ' + href);
      }
      assert((await capture.getByText(/independent fan project/).innerText()).includes('identification and commentary only'),
        'Snapshots still capture the full footer disclaimer');
    }
    await context.close();
  }
} finally {
  await browser.close();
}
