import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.BASE || 'http://127.0.0.1:4173');
assert.ok(base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
try {
  for (const width of [390, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base.origin && route.request().method() === 'GET' ? route.continue() : route.abort());
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base.origin + '/fight-career');
    const button = name => page.getByRole('button', { name }).first();
    await button(/^Turn professional$/).waitFor();
    for (const label of [/^Got it!?$/i, /^Let.s play!?$/i, /^Reject all$/i]) {
      if (await button(label).isVisible()) await button(label).click();
    }
    await page.getByPlaceholder('Leave it blank and we will name you').fill('Review Fighter');
    await button(/^Turn professional$/).click();
    await button(/Tune up/i).click();
    await button(/^Finish camp$/).click();
    await page.getByRole('checkbox', { name: 'Play the fight out round by round' }).uncheck();
    await button(/^Fight$/).click();
    const key = 'fight-career-save-v1';
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.st.history.length === 1, key);
    const bytes = await page.evaluate(key => localStorage.getItem(key), key);
    const fight = JSON.parse(bytes).st.history[0];
    const cards = page.getByText(/^Cards \d+ to \d+/);
    await cards.waitFor();
    const totals = fight.scorecard.reduce((sum, round) => [sum[0] + round.playerScore, sum[1] + round.oppScore], [0, 0]);
    assert.ok((await cards.innerText()).includes('Cards ' + totals.join(' to ')));
    await page.reload();
    await page.getByText('Fight record (1)', { exact: true }).click();
    await page.getByLabel('Scorecard for bout 1 against ' + fight.opponent).click();
    const table = page.getByRole('table').filter({ hasText: 'Punches landed' });
    const rows = await table.locator('tbody tr').evaluateAll(nodes => nodes.map(node => [...node.children].map(cell => cell.textContent)));
    assert.deepEqual(rows, fight.scorecard.map(r => [String(r.round), r.playerScore + '-' + r.oppScore, r.playerLanded + '-' + r.oppLanded]));
    const column = await table.boundingBox();
    assert.ok(column && column.x >= 0 && column.x + column.width <= width + 1);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), bytes);
    assert.deepEqual(errors, []);
    if (process.env.OUTPUT) {
      await mkdir(process.env.OUTPUT, { recursive: true });
      await table.screenshot({ path: path.join(process.env.OUTPUT, 'fight-scorecard-' + width + '.png') });
      await writeFile(path.join(process.env.OUTPUT, 'fight-scorecard-' + width + '.json'), JSON.stringify({ width, fight, totals, errors }, null, 2));
    }
    console.log(width + 'px: fresh bout ' + fight.result + ' by ' + fight.method + ', ' + rows.length + ' rounds, card ' + totals.join('-') + ' reopened with an unchanged save.');
    await context.close();
  }
} finally {
  await browser.close();
}
