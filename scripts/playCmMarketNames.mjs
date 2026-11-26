/* Replay a returning Club Manager save and check the visible Buy rows.
 * BASE=http://localhost:4173 node scripts/playCmMarketNames.mjs
 * The previous single-row layout is the negative control for 320 and 390px.
 */
import { readFile } from 'node:fs/promises';
import { chromium } from './lib/playwrightLoader.mjs';

const base = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const origin = new URL(base).origin;
const fixture = JSON.parse(await readFile(new URL('./data/cmPreAzMarketFixture.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
const failures = [];
let measurements;
const pageErrors = [];

try {
  const context = await browser.newContext({
    viewport: { width: 320, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  await context.route('**/*', route => (
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  ));
  await context.addInitScript(save => {
    localStorage.setItem('cookie-consent', 'essential');
    localStorage.setItem('dukb-club-manager-save', save);
  }, fixture.saves.A);

  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(base + '/club-manager', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Resume Career', exact: true }).first().click();
  await page.getByRole('tab', { name: 'Market', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Search player or club' });
  const list = search.locator('xpath=following-sibling::div[1]');
  await list.getByRole('button', { name: /^Save / }).first().waitFor();
  await page.evaluate(() => document.fonts.ready);

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    measurements = await list.evaluate(element => [...element.children].map(row => {
      const save = row.querySelector('button[aria-label^="Save "]');
      const name = save?.getAttribute('aria-label').slice(5);
      const label = [...row.querySelectorAll('span')].find(span => (
        span.children.length === 0 && span.textContent.trim() === name
      ));
      const buttons = [...row.querySelectorAll('button')];
      const talk = buttons.find(button => /^Talk\b/.test(button.textContent.trim()));
      const rowBounds = row.getBoundingClientRect();
      const insideRow = rect => rect.left >= rowBounds.left - 1 && rect.right <= rowBounds.right + 1;
      const range = document.createRange();
      if (label) range.selectNodeContents(label);
      const textRects = label ? [...range.getClientRects()] : [];
      const clipped = !label || !textRects.length
        || label.scrollWidth > label.clientWidth + 1
        || textRects.some(rect => !insideRow(rect));
      const saveSize = save?.getBoundingClientRect();
      const controlsFit = !!saveSize && saveSize.width >= 44 && saveSize.height >= 44
        && !save.disabled && !!talk && !talk.disabled
        && buttons.every(button => insideRow(button.getBoundingClientRect()));
      return { name, clipped, controlsFit };
    }));

    if (measurements.length !== 50) failures.push(width + 'px expected 50 Buy rows, found ' + measurements.length);
    const clipped = measurements.filter(row => row.clipped);
    const blocked = measurements.filter(row => !row.controlsFit);
    console.log(width + 'px: ' + clipped.length + '/' + measurements.length + ' names clipped, '
      + blocked.length + ' rows with missing or out-of-bounds controls');
    if (clipped.length) failures.push(width + 'px clips ' + clipped.slice(0, 3).map(row => row.name).join(', '));
    if (blocked.length) failures.push(width + 'px blocks controls for ' + blocked.slice(0, 3).map(row => row.name).join(', '));
  }

  await page.setViewportSize({ width: 320, height: 844 });
  const firstName = measurements?.[0]?.name;
  if (firstName) {
    const target = list.getByRole('button', { name: 'Save ' + firstName, exact: true }).first();
    await target.click();
    const shortlist = page.getByRole('region', { name: 'Recruitment shortlist', exact: true });
    await shortlist.getByRole('heading', { name: 'Recruitment shortlist', exact: true }).waitFor();
    await shortlist.getByRole('button', { name: 'Back', exact: true }).click();
    const focusReturned = await target.evaluate(button => new Promise(resolve => {
      requestAnimationFrame(() => resolve(document.activeElement === button));
    }));
    if (!focusReturned) failures.push('320px did not return focus to Save ' + firstName);
    const row = list.locator(':scope > div').filter({
      has: page.getByRole('button', { name: 'Save ' + firstName, exact: true }),
    }).first();
    await row.getByRole('button', { name: /^Talk\b/ }).click();
    await page.getByTestId('cm-deal-card').getByText(firstName, { exact: false }).first().waitFor();
    console.log('320px: Save opens the shortlist and Talk opens negotiations for ' + firstName);
  }
} finally {
  await browser.close();
}

failures.push(...pageErrors);
if (failures.length) {
  console.error('playCmMarketNames: FAIL\n' + failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('playCmMarketNames: PASS');
}
