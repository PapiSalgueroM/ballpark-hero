import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [origin, entry, mode = 'candidate'] = process.argv.slice(2);
assert.ok(origin && /^\/assets\/index-[\w-]+\.js$/.test(entry), 'Pass the site origin and exact entry asset');
assert.ok(['baseline', 'candidate'].includes(mode));
const { outputFiles } = await build({
  absWorkingDir: root, bundle: true, platform: 'node', format: 'esm', write: false,
  alias: { '@': path.join(root, 'src') }, logLevel: 'error',
  stdin: { resolveDir: root, contents: `
    export { createNrlSeason } from './src/lib/nrlManager';
    export { createNrlCareer, readNrlCareerSave } from './src/lib/nrlCareer';
  ` },
});
const { createNrlSeason, createNrlCareer, readNrlCareerSave } =
  await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));
const primary = 'nrl-manager-save-v1';
const alternate = primary + '-slot-2';
const saves = Object.fromEntries([
  [primary, JSON.stringify(createNrlSeason('storm', 17))],
  [alternate, JSON.stringify(createNrlCareer('bears', 19, 2027))],
]);
assert.equal(readNrlCareerSave(saves[primary]).season.clubId, 'storm');
assert.equal(readNrlCareerSave(saves[alternate]).season.clubId, 'bears');
const browser = await chromium.launch();
try {
  for (const [width, height] of [[320, 568], [390, 844]]) {
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: true, hasTouch: true,
      reducedMotion: 'reduce', serviceWorkers: 'block',
    });
    const errors = [];
    let writes = 0;
    try {
      await context.routeWebSocket('**/*', socket => socket.close());
      await context.route('**/*', route => {
        const r = route.request();
        return new URL(r.url()).origin === origin && ['GET', 'HEAD'].includes(r.method()) ? route.continue() : route.abort();
      });
      context.on('requestfinished', r => { if (!['GET', 'HEAD'].includes(r.method())) writes++; });
      await context.addInitScript(records => {
        if (sessionStorage.getItem('home-nrl-campaigns-fixture')) return;
        sessionStorage.setItem('home-nrl-campaigns-fixture', '1');
        for (const [key, bytes] of Object.entries(records)) localStorage.setItem(key, bytes);
        localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
      }, saves);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      const response = await page.goto(origin + '/?home_nrl_campaigns=' + Date.now(), { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      assert.equal((await response.text()).match(/<script[^>]+src=["'](\/assets\/index-[\w-]+\.js)/)?.[1], entry);
      const shelf = page.getByRole('region', { name: 'Continue playing' });
      const links = shelf.getByRole('link', { name: /NRL Team Manager/ });
      const hold = async () => assert.deepEqual(await page.evaluate(keys =>
        Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(saves)), saves);
      await links.first().waitFor();
      assert.equal(await links.count(), mode === 'candidate' ? 2 : 1);
      const paths = ['/nrl-team-manager', '/nrl-team-manager?slot=2'];
      const clubs = [/Storm · 2026 season/, /Bears · 2027 season/];
      for (const [index, linkPath] of paths.slice(0, mode === 'candidate' ? 2 : 1).entries()) {
        const card = links.nth(index);
        assert.equal(await card.getAttribute('href'), linkPath);
        assert.equal((await card.boundingBox()).height, 72);
        assert.match(await card.innerText(), mode === 'candidate'
          ? new RegExp(`Slot ${index + 1} · ${2026 + index} season`) : /2026 season/);
        const search = page.getByRole('textbox', { name: 'Search games' });
        await search.focus();
        for (let attempt = 0; attempt < 35; attempt++) {
          await page.keyboard.press('Tab');
          if (await card.evaluate(el => document.activeElement === el)) break;
        }
        assert.equal(await card.evaluate(el => document.activeElement === el), true);
        await page.keyboard.press('Enter');
        await page.waitForURL(url => url.pathname + url.search === linkPath);
        const team = page.locator('main > header').getByText(clubs[index]);
        await team.waitFor();
        await hold();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await team.waitFor();
        await hold();
        await page.getByRole('navigation', { name: 'Game navigation' })
          .getByRole('link', { name: 'DoUKnowBall' }).tap();
        await links.first().waitFor();
      }
      assert.equal(await links.count(), mode === 'candidate' ? 2 : 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await hold();
      assert.deepEqual(errors, []);
      assert.equal(writes, 0);
      console.log(JSON.stringify({ width, entry, mode, cards: await links.count(), restored: clubs.slice(0, await links.count()).map(club => club.source), writes }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
