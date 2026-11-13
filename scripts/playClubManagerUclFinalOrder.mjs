import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const port = process.env.PORT ?? '4592';
const base = 'http://127.0.0.1:' + port;
const saveKey = 'dukb-club-manager-save';
const old = process.env.CM_FINAL_OLD === '1';
const fixture = await build({
  stdin: {
    contents: "import { startCareer } from './src/lib/clubManager'; export { startCareer };",
    resolveDir: process.cwd(),
  },
  alias: { '@': process.cwd() + '/src' },
  define: { 'import.meta.env': '{}' },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { startCareer } = await import('data:text/javascript;base64,' + Buffer.from(fixture.outputFiles[0].text).toString('base64'));
const state = startCareer('Arsenal');
state.uclKoRound = 'F';
state.uclDraw.F = 'Real Madrid';
state.transferWindow = null;
state.windowWeeksLeft = 0;
state.week = state.calendar.findIndex(entry => entry.type === 'league' && entry.round === 35);
assert(state.week >= 0);
if (old) {
  const finalIndex = state.calendar.findIndex(entry => entry.type === 'uclKo' && entry.uclRound === 'F');
  const [final] = state.calendar.splice(finalIndex, 1);
  state.calendar.splice(state.week + 1, 0, final);
}
const raw = JSON.stringify(state);
const host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', process.env.CM_FINAL_DIST ?? 'dist', port], { windowsHide: true });
let browser;
try {
  await Promise.race([once(host.stdout, 'data'), once(host, 'exit').then(([code]) => { throw Error('Host exited ' + code); })]);
  browser = await pw.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce',
    storageState: { cookies: [], origins: [{ origin: base, localStorage: [
      { name: saveKey, value: raw }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  await context.route(url => url.origin !== base, route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
  const resume = async () => {
    await page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }).tap();
    await page.locator('[data-cm-hub]').waitFor();
  };
  const quick = page.locator('[data-cm-way="quick"]');
  const next = page.locator('[data-cm-next-match]').locator('..');
  const review = page.getByRole('button', { name: 'See Season Review' });
  await page.goto(base + '/club-manager', { waitUntil: 'domcontentloaded' });
  await resume();
  const schedule = old ? [/Round 36/i, /Champions League.*Final/i, /Round 37/i, /Round 38/i]
    : [/Round 36/i, /Round 37/i, /Round 38/i, /Champions League.*Final/i];
  for (const [index, label] of schedule.entries()) {
    assert.match(await next.innerText(), label);
    assert.equal(await review.count(), 0);
    await quick.tap();
    await page.getByRole('button', { name: 'Continue', exact: true }).tap();
    if (index < schedule.length - 1) {
      await quick.waitFor();
      if (index === 0) {
        const before = await read();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await resume();
        assert.deepEqual(await read(), before);
      }
    }
  }
  const after = await read();
  assert.equal(after.week, after.calendar.length);
  assert.notEqual(after.uclKoRound, 'F');
  assert(after.pendingSummary, 'The review opens after the final remaining fixture');
  assert.deepEqual(errors, []);
  console.log('390px:', schedule.map(label => label.source).join(' -> '), '-> season complete');
} finally {
  await browser?.close();
  host.kill();
}
