// BASE must be a loopback build. Answer only local fixture prompts.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const base = new URL(process.env.BASE ?? 'http://127.0.0.1:4271');
assert.equal(base.hostname, '127.0.0.1');
assert.equal(base.protocol, 'http:');
const data = buildSync({entryPoints: ['src/data/sportChallengePilot.ts'], write: false, format: 'esm', bundle: true});
const { finals } = await import('data:text/javascript;base64,' + Buffer.from(data.outputFiles[0].text).toString('base64'));
const browser = await chromium.launch({args: ['--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
try {
  for (const [width, sport] of [[320, 'soccer'], [390, 'nba'], [1366, 'soccer'], [1366, 'nba']]) {
    const context = await browser.newContext({viewport: {width, height: 844}, reducedMotion: 'reduce', serviceWorkers: 'block'});
    await context.addInitScript(() => localStorage.setItem('cookie-consent-v2', JSON.stringify({
      version: 2, advertising: false, analytics: false, updatedAt: Date.now(),
    })));
    await context.routeWebSocket('**/*', ws => ws.close());
    await context.route('**/*', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin !== base.origin || req.method() !== 'GET') return route.abort();
      const response = await fetch(url, {redirect: 'manual'});
      if (response.status >= 300 && response.status < 400) return route.abort();
      return route.fulfill({status: response.status, contentType: response.headers.get('content-type') ?? undefined,
        body: Buffer.from(await response.arrayBuffer())});
    });
    const page = await context.newPage();
    await page.clock.install({time: new Date('2026-11-26T16:00:00Z')});
    await page.goto(base.origin + '/alphabet-sprint');
    await page.getByRole('link', {name: /try the soccer and nba finals sprint preview/i}).click();
    await page.getByRole('button', {name: 'How to play Finals Sprint'}).click();
    await page.keyboard.press('Escape');
    if (sport === 'nba') await page.getByRole('button', {name: 'NBA', exact: true}).click();
    await page.getByRole('button', {name: 'Start daily preview'}).click();
    const current = page.getByRole('region', {name: 'Current round'});
    const clue = current.getByRole('heading');
    const first = await clue.innerText();
    await page.getByRole('button', {name: 'Defer clue'}).click();
    await page.waitForFunction(previous => document.querySelector('[aria-label="Current round"] h2')?.textContent !== previous, first);
    const used = new Set();
    for (let i = 0; i < 6; i++) {
      const question = await clue.innerText();
      const year = Number(question.match(/\d{4}/)?.[0]);
      const [, , ...teams] = finals[sport].find(row => row[0] === year);
      const answer = teams.find(team => !used.has(team));
      assert(answer, 'no unused finalist');
      if (i === 5) assert.equal(question, first);
      const input = page.getByRole('textbox', {name: 'Team name'});
      await input.fill(answer);
      await input.press('Enter');
      used.add(answer);
      await page.waitForFunction(previous => document.querySelector('[aria-label="Current round"] h2')?.textContent !== previous, question);
      if (i === 1) {
        const next = await clue.innerText();
        await page.reload();
        assert.equal(await clue.innerText(), next);
      }
    }
    const results = page.getByRole('region', {name: 'Round results'});
    assert.equal(await results.getByRole('heading').innerText(), '100 points');
    await page.reload();
    assert.equal(await results.getByRole('heading').innerText(), '100 points');
    await results.getByText('Show recap and sources').click();
    assert.equal(await results.getByRole('link', {name: /^Source for/}).count(), 6);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    await results.getByRole('button', {name: 'Switch to practice'}).click();
    await page.getByRole('button', {name: 'Start practice'}).click();
    await clue.waitFor();
    await page.clock.fastForward(61000);
    assert.equal(await results.getByRole('heading').innerText(), '0 points');
    await page.getByRole('button', {name: 'Play again'}).click();
    await clue.waitFor();
    await context.close();
    console.log(sport, width, 'passed daily, defer, keyboard, reload, sources, timeout and replay');
  }
} finally {
  await browser.close();
}
