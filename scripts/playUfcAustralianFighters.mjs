import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import pw from './lib/playwrightLoader.mjs';

const date = '2026-11-11';
const names = ['Jack Della Maddalena', 'Steve Erceg', 'Quillan Salkilld'];
const port = process.env.PORT ?? '4599';
const base = 'http://127.0.0.1:' + port;
const old = process.env.UFC_OLD === '1';
const host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', process.env.UFC_DIST ?? 'dist', port], { windowsHide: true });
let browser;
try {
  await Promise.race([once(host.stdout, 'data'), once(host, 'exit').then(([code]) => { throw Error('Host exited ' + code); })]);
  browser = await pw.chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await context.route(url => url.origin !== base, route => route.abort());
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'essential');
    localStorage.setItem('ufc-rules-seen', '1');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(new Date(date + 'T17:00:00Z'));
  await page.goto(base + '/ufc', { waitUntil: 'domcontentloaded' });
  const input = page.getByRole('textbox', { name: 'Search for a fighter' });
  const choose = name => page.locator('button').filter({ hasText: name });
  const reveal = async () => {
    await page.getByRole('button', { name: /Give up/i }).tap();
    await page.getByRole('button', { name: /Yes, reveal/i }).tap();
    await page.getByText('The fighter was', { exact: false }).waitFor();
  };
  const dailyRecord = () => page.evaluate(key => localStorage.getItem(key), 'ufc-game-daily-' + date);
  for (const name of names) {
    await input.fill(name);
    if (old) await page.getByText('No fighters found', { exact: true }).waitFor();
    else await choose(name).waitFor();
  }
  await input.clear();
  await reveal();
  const target = await page.getByText('The fighter was', { exact: false }).innerText();
  const record = await dailyRecord();
  assert.equal(target.trim(), 'The fighter was TJ Dillashaw');
  assert.equal(record, JSON.stringify({ v: 1, date, puzzleIndex: 22, guesses: [], gameStatus: 'lost' }));
  console.log(JSON.stringify({ dailyTarget: target.trim(), dailyRecord: record }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('The fighter was', { exact: false }).waitFor();
  assert.equal(await dailyRecord(), record);
  if (!old) {
    await page.getByRole('button', { name: /Unlimited/ }).tap();
    await reveal();
    // Replay the three new draws at the end of the 93-fighter Unlimited pool.
    for (const [index, name] of names.entries()) {
      await page.evaluate(value => { Math.random = () => value; }, (90.5 + index) / 93);
      await page.getByRole('button', { name: /Play again/i }).tap();
      await input.fill(name);
      await choose(name).tap();
      await page.getByRole('heading', { name: 'Correct!' }).waitFor();
      await page.getByText('You guessed', { exact: false }).filter({ hasText: name }).waitFor();
    }
    assert.equal(await dailyRecord(), record);
    assert.deepEqual(errors, []);
    console.log('390px: all three fighters are searchable, each is a valid Unlimited target, and Daily stays saved.');
  }
} finally {
  await browser?.close();
  host.kill();
}
