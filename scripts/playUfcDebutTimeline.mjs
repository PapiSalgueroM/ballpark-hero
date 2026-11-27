/* BASE points to a built loopback site. Use --published for the public site.
 * UFC_TIMELINE_ENTRY pins the requested HTML to its exact index bundle.
 * --baseline proves the old Daily and Division games lack the new challenge. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { guardedAdBrowser, isSiteAsset, staticReply } from './lib/playwrightAdReplay.mjs';

const entry = process.env.UFC_TIMELINE_ENTRY;
assert.match(entry ?? '', /^index-[\w-]+\.js$/);
const published = process.argv.includes('--published');
const origin = new URL(published ? 'https://douknowball.com' : process.env.BASE ?? 'http://127.0.0.1:4173');
if (!published) assert.equal(origin.hostname, '127.0.0.1');
const bundle = await build({ entryPoints: ['src/data/ufcFighters.ts'], bundle: true, write: false, format: 'esm' });
const { uniqueUfcFighters } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const years = new Map(uniqueUfcFighters.map(f => [f.name, Number(f.yearsActive.split('-')[0])]));
const key = 'ufc-debut-timeline-v1';
const guard = await guardedAdBrowser();
try {
  for (const width of [390, 1366]) {
    const ctx = await guard.browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390, hasTouch: width === 390, reducedMotion: 'reduce', serviceWorkers: 'block' });
    try {
      const errors = [];
      await ctx.addInitScript(() => {
        localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, updatedAt: Date.now(), advertising: false, analytics: false }));
        localStorage.setItem('ufc-rules-seen', '1');
      });
      await ctx.routeWebSocket('**/*', socket => socket.close());
      await ctx.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        const doc = url.pathname === '/ufc' && req.resourceType() === 'document' && !url.search;
        if (req.method() !== 'GET' || url.origin !== origin.origin || !(doc || isSiteAsset(url))) return route.abort();
        try {
          const reply = await staticReply(url.href);
          if (doc) assert(reply.body.toString().includes('src="/assets/' + entry + '"'), 'Unexpected /ufc document bundle');
          return await route.fulfill(reply);
        } catch (error) { errors.push(error.message); return route.abort(); }
      });
      const page = await ctx.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const button = name => page.getByRole('button', { name, exact: typeof name === 'string' });
      const raw = () => page.evaluate(key => localStorage.getItem(key), key);
      const legacy = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k =>
        k.startsWith('ufc-game-daily-') || k === 'ufc-division-run-v1').map(k => [k, localStorage.getItem(k)])));
      await page.goto(new URL('/ufc', origin).href);
      const search = page.getByRole('textbox', { name: 'Search for a fighter' });
      await search.fill('Georges St-Pierre');
      await button(/Georges St-Pierre/).click();
      await button('Division run').click();
      await button(/Heavyweight/).last().click();
      await button(/Daily$/).click();
      const prior = await legacy();
      assert.equal(Object.keys(prior).length, 2, 'Daily guess and active division must both be saved');
      if (process.argv.includes('--baseline')) {
        assert.equal(await button('UFC Debut Timeline').count(), 0);
        console.log(JSON.stringify({ entry, width, originalSaves: 2, timelineAvailable: false }));
        continue;
      }

      await button('UFC Debut Timeline').click();
      const dialog = page.getByRole('dialog', { name: 'UFC Debut Timeline' });
      await dialog.getByText(/Example:/).waitFor();
      await button('Start timeline').click();
      const names = JSON.parse(await raw()).names;
      assert.equal(new Set(names.map(name => years.get(name))).size, 7);
      for (const [style, expected] of [['win', 100], ['miss', 0], ['scout', 80]]) {
        if (style !== 'win') await button('Replay this timeline').click();
        assert.deepEqual(JSON.parse(await raw()).names, names);
        for (let i = 0; i < 5; i++) {
          const known = names.slice(0, i + 2).map(name => years.get(name)).sort((a, b) => a-b);
          const actualYear = years.get(names[i + 2]);
          const slot = known.filter(y => y < actualYear).length;
          const right = slot === 0 ? 'Before ' + known[0] : slot === known.length ? 'After ' + known.at(-1) : 'Between ' + known[slot - 1] + ' and ' + known[slot];
          if (style === 'scout' && i < 2) {
            await button(/Use a scout/).click();
            await dialog.getByRole('status').waitFor();
            assert(await dialog.getByRole('group', { name: 'Choose a debut gap' }).locator('button:disabled').count() > 0);
          }
          if (style === 'scout' && i === 1) {
            const saved = await raw();
            await page.reload();
            await button('Resume debut timeline').click();
            assert.equal(await raw(), saved);
            await dialog.getByRole('status').waitFor();
          }
          const labels = await dialog.getByRole('group', { name: 'Choose a debut gap' }).getByRole('button').allTextContents();
          const choice = style === 'miss' ? labels.find(label => label !== right) : right;
          assert(choice, 'A real alternative must exist');
          const target = button(choice), rect = await target.boundingBox();
          assert(rect.height >= 44 && rect.x >= 0 && rect.x + rect.width <= width + 1);
          await target.click();
          await dialog.getByText(new RegExp('debuted in ' + actualYear + '\\.')).waitFor();
          assert.equal(JSON.parse(await raw()).placements.length, i + 1);
        }
        await dialog.getByRole('heading', { name: new RegExp(expected + '/100$') }).waitFor();
        assert.deepEqual(await legacy(), prior);
      }
      await button('Back to UFC Guesser').click();
      await page.waitForFunction(() => document.activeElement?.textContent === 'Review debut timeline');
      await page.keyboard.press('Enter');
      await button('New timeline').click();
      assert.notDeepEqual(JSON.parse(await raw()).names, names);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement?.textContent === 'Resume debut timeline');
      assert.deepEqual(await legacy(), prior);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ entry, width, cards: 15, scores: [100, 0, 80], resumed: true, newDraw: true, originalSaves: 2 }));
    } finally { await ctx.close(); }
  }
} finally { await guard.close(); }
