import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { historyRowsFor, loadStockData } from './lib/stockMarketData.mjs';
import pw from './lib/playwrightLoader.mjs';

const slug = 'player-stock-market';
const date = '2026-11-11';
const port = process.env.PORT ?? '4587';
const origin = 'http://127.0.0.1:' + port;
const host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', process.env.STOCK_DIST ?? 'dist', port], { windowsHide: true });
let browser;
try {
  await Promise.race([once(host.stdout, 'data'), once(host, 'exit').then(([code]) => { throw Error('Host exited ' + code); })]);
  browser = await pw.chromium.launch();
  const data = await loadStockData();
  async function play(failures) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date(date + 'T17:00:00Z'));
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    const historyQueries = [];
    const completions = [];
    let poolRequests = 0;
    let rows;
    await context.route('**/*', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin === origin) return route.continue();
      if (url.pathname === '/rest/v1/player_market_tracked') {
        poolRequests++;
        rows = data.pools[url.searchParams.get('year').slice(3)];
        assert(rows?.length >= 100, 'Daily has a fixture pool');
        const offset = Number(url.searchParams.get('offset') ?? 0);
        return route.fulfill({ json: rows.slice(offset, offset + 1000) });
      }
      if (url.pathname === '/rest/v1/player_market_values_dedup') {
        const query = url.searchParams.get('player_name');
        historyQueries.push(query);
        if (historyQueries.length <= failures) return route.fulfill({ status: 503, json: { message: 'fixture outage' } });
        return route.fulfill({ json: historyRowsFor(data, [...new Set(rows.map(row => row.player_name))].filter(name => query.includes(name))) });
      }
      if (url.pathname === '/rest/v1/game_completions' && req.method() === 'POST') {
        const completion = req.postDataJSON();
        if (completion.game === slug) completions.push(completion.score);
        return route.fulfill({ status: 201 });
      }
      return route.abort();
    });
    await page.goto(origin + '/' + slug, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Daily market/ }).click();
    for (let pick = 1; pick <= 11; pick++) {
      await page.getByText(new RegExp('Buy ' + pick + ' of 11')).waitFor();
      await page.locator('button:enabled').filter({ hasText: /· age / }).first().click();
    }
    for (let attempt = 0; attempt < failures; attempt++) {
      await page.getByText(/Couldn.t fetch the seasons after your buys/).waitFor();
      assert.equal(completions.length, 0);
      await page.getByRole('button', { name: 'Retry', exact: true }).click({ timeout: 2500 });
    }
    const next = page.getByRole('button', { name: /^(On to |Turn the cards over)/ });
    const recorded = page.waitForResponse(response => response.url().endsWith('/game_completions') && response.request().method() === 'POST');
    await next.waitFor();
    for (let year = 0; year < 12 && await next.isVisible(); year++) await next.click();
    await page.getByText('The reveal', { exact: true }).waitFor();
    const read = () => page.evaluate(key => localStorage.getItem(key), slug + '-daily-' + date);
    const save = await read();
    assert.equal(JSON.parse(save).holdings.length, 11);
    await recorded;
    assert.deepEqual(completions, [JSON.parse(save).score]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('The reveal', { exact: true }).waitFor();
    assert.equal(await read(), save);
    assert.equal(completions.length, 1);
    assert.equal(historyQueries.length, failures + 1);
    assert(historyQueries.every(query => query === historyQueries[0]));
    await context.close();
    return { save, query: historyQueries[0], poolRequests };
  }
  const healthy = await play(0);
  const recovered = await play(2);
  assert.deepEqual(recovered, healthy);
  console.log('Daily at 390px: two outages, identical 11 picks, one completion and exact save through reload.');
} finally {
  await browser?.close();
  host.kill();
}
