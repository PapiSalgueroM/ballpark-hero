import assert from 'node:assert/strict';
import { guardedAdBrowser, isSiteAsset, staticReply } from './lib/playwrightAdReplay.mjs';

const baseline = process.argv.includes('--baseline');
const origin = new URL(process.argv.includes('--published') ? 'https://douknowball.com' : process.env.BASE ?? 'http://127.0.0.1:4173');
assert(['127.0.0.1', 'douknowball.com'].includes(origin.hostname));
const entry = process.env.TRIP_ENTRY;
assert.match(entry ?? '', /^index-[\w-]+\.js$/);
const guard = await guardedAdBrowser();
try {
  for (const [league, route] of [['nfl', '/conquest'], ['mlb', '/conquest-mlb'], ['nhl', '/conquest-nhl']]) for (const width of [390,1366]) {
    const ctx = await guard.browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    try {
      await ctx.addInitScript(({route, league}) => {
        localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, updatedAt: Date.now(), advertising: false, analytics: false }));
        localStorage.setItem('rules-gate-seen:' + route, '1');
        localStorage.setItem('conquest-' + league + '-imperialism-how-to-play-seen', 'true');
      }, { route, league });
      const errors = [];
      await ctx.routeWebSocket('**/*', socket => socket.close());
      await ctx.route('**/*', async r => {
        const req = r.request(), url = new URL(req.url()), doc = req.resourceType() === 'document' && url.pathname === route && !url.search;
        if (req.method() !== 'GET' || url.origin !== origin.origin || !(doc || isSiteAsset(url))) return r.abort();
        try {
          const reply = await staticReply(url.href);
          if (doc) assert(reply.body.toString().includes('src="/assets/' + entry + '"'), 'Wrong document entry on ' + route);
          return await r.fulfill(reply);
        } catch (e) { errors.push(e.message); return r.abort(); }
      });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(e.message));
      const btn = name => p.getByRole('button', { name });
      const dialog = p.getByRole('dialog', {name: league.toUpperCase() + ' Road Trip'});
      const standings = dialog.getByRole('region', {name: 'Trip standings'});
      const results = dialog.getByRole('list', {name: 'Trip scorecard'});
      const rival = dialog.getByRole('button', {name:/base win chance/});
      const normal = dialog.getByRole('button', {name:/Keep the base playbook|Stay with the regular pen|Roll four lines/});
      const boost = dialog.getByRole('button', {name:/Use the scripted drive|Bring in the closer|Double-shift the top line/});
      await p.goto(new URL(route, origin).href);
      await p.getByRole('heading', {name: league.toUpperCase() + ' Conquest', exact:true}).waitFor();
      if (baseline) {
        assert.equal(await btn(/Play road trip/).count(), 0);
        assert.deepEqual(errors, []);
        console.log(route, width, 'baseline confirmed');
        continue;
      }
      await btn(/Play road trip/).click();
      await dialog.getByText(/For example, win twice/).waitFor();
      await btn('Start road trip').click();
      await rival.first().click();
      await boost.click();
      await results.getByRole('listitem').nth(0).waitFor();
      const first = await results.innerText();
      await p.reload();
      await btn(/Resume road trip/).click();
      assert.equal(await results.innerText(), first);
      await dialog.getByText('Take a travel day', {exact:true}).click();
      await btn(/Return to /).first().click();
      await results.getByRole('listitem').nth(1).getByText(/Travel day/).waitFor();
      await btn('View territory map').click();
      await dialog.locator('svg path').first().waitFor({state:'attached'});
      await btn('Hide territory map').click();
      for (let i = 2; i < 5; i++) {
        if (await btn('Replay the same draw').count()) break;
        if (await rival.count()) { await rival.first().click(); await normal.click(); }
        else {
          const detail = dialog.locator('details').filter({hasText:'Take a travel day'});
          if (!(await detail.evaluate(e => e.open))) await detail.locator('summary').click();
          await btn(/Return to /).first().click();
        }
        await results.getByRole('listitem').nth(i).waitFor();
      }
      await btn('Replay the same draw').waitFor();
      const ending = await standings.innerText();
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await btn('Replay the same draw').click();
      await rival.first().click(); await boost.click();
      await results.getByRole('listitem').first().waitFor();
      assert.equal(await results.innerText(), first);
      await btn('Back to Conquest').click();
      await p.waitForFunction(() => document.activeElement?.textContent.includes('Resume road trip'));
      assert.deepEqual(errors, []);
      console.log(route, width, 'resume, map, travel, full schedule, matched replay, keyboard return passed.', ending.replaceAll('\n', ' '));
    } finally { await ctx.close(); }
  }
} finally { await guard.close(); }
