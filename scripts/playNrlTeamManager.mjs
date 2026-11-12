import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import pw from './lib/playwrightLoader.mjs';

const PORT = Number(process.env.PORT ?? 4573);
const BASE = process.env.BASE ?? `http://127.0.0.1:${PORT}`;
const SOURCE = new URL(BASE).origin;
const SAVE_KEY = 'nrl-manager-save-v1';
const shots = process.env.NRL_SHOTS;
if (shots) fs.mkdirSync(shots, { recursive: true });
const host = process.env.BASE ? null : spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(PORT)], {
  stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true,
});
let browser;

const save = page => page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
const career = async page => JSON.parse(await save(page));
const advance = page => page.locator('[data-nrl-advance]');
const screenshot = (page, name) => shots && page.screenshot({ path: path.join(shots, name), fullPage: false });

async function context(width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 960 }, reducedMotion: 'reduce' });
  await ctx.route(url => url.origin !== SOURCE, route => route.abort());
  await ctx.addInitScript(() => { localStorage.setItem('cookie-consent', 'essential'); });
  return ctx;
}

async function open(ctx) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${BASE}/nrl-team-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('h1').filter({ hasText: 'NRL Team Manager' }).waitFor();
  const help = page.getByRole('button', { name: "Let's Play!" });
  if (await help.waitFor({ timeout: 1000 }).then(() => true, () => false)) await help.click();
  return { page, errors };
}

async function fit(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
}

async function play(page, count) {
  for (let action = 0; action < count; action++) await advance(page).click();
  return (await career(page)).season;
}

try {
  if (host) await Promise.race([once(host.stdout, 'data'), once(host, 'exit').then(([code]) => { throw new Error(`Host exited ${code}`); })]);
  browser = await pw.chromium.launch();
  const phone = await context(320);
  const { page: past, errors: pastErrors } = await open(phone);
  assert.equal(await past.locator('[data-nrl-club]').count(), 17);
  assert.equal(await past.getByRole('button', { name: 'Manage Perth Bears' }).count(), 0);
  await fit(past);
  await past.getByRole('button', { name: 'Manage Melbourne Storm' }).click();
  const initialCareer = await career(past);
  assert.equal(initialCareer.version, 2);
  const started = initialCareer.season;
  assert.equal(started.year, 2026);
  await past.getByRole('button', { name: 'Squad', exact: true }).click();
  assert.equal(await past.getByRole('combobox').count(), 13);
  await past.getByLabel('Fullback', { exact: true }).selectOption({ index: 1 });
  assert.notEqual((await career(past)).season.lineup.Fullback, started.lineup.Fullback);
  await past.getByRole('button', { name: 'Match centre' }).click();
  await past.getByRole('button', { name: 'Attack', exact: true }).click();
  await past.getByRole('button', { name: 'Train', exact: true }).click();
  assert.equal((await career(past)).season.preparation, 'train');
  await play(past, 1);
  const beforeReload = await save(past);
  await past.reload({ waitUntil: 'domcontentloaded' });
  await advance(past).waitFor();
  assert.equal(await save(past), beforeReload);
  await past.getByRole('button', { name: 'Ladder', exact: true }).click();
  assert.equal(await past.locator('[data-nrl-ladder]').count(), 17);
  await fit(past);
  await past.getByRole('button', { name: 'Match centre' }).click();
  const sameSave = await open(phone);
  await play(sameSave.page, 1);
  await past.getByRole('button', { name: 'Reload your season' }).waitFor();
  assert.equal(await advance(past).isEnabled(), false);
  await Promise.all([past.waitForNavigation({ waitUntil: 'domcontentloaded' }), past.getByRole('button', { name: 'Reload your season' }).click()]);
  await past.getByRole('heading', { level: 1, name: 'NRL Team Manager' }).waitFor();
  const complete2026 = await play(past, 29);
  assert.equal(complete2026.phase, 'complete');
  assert.equal(complete2026.results.filter(result => !result.finalsRound).length, 204);
  assert.equal(complete2026.results.filter(result => result.finalsRound).length, 9);
  assert(complete2026.championId);
  assert.equal((await career(past)).history.length, 1);
  await past.getByRole('button', { name: 'Review this season' }).click();
  await past.getByRole('button', { name: 'Start 2027' }).click();
  const next2027 = await career(past);
  assert.equal(next2027.season.year, 2027);
  assert.equal(next2027.season.clubId, 'storm');
  assert.equal(next2027.history[0].year, 2026);
  await past.getByRole('button', { name: 'Ladder', exact: true }).click();
  assert.equal(await past.locator('[data-nrl-ladder]').count(), 18);
  assert.deepEqual([...pastErrors, ...sameSave.errors], []);
  await phone.close();
  console.log('2026 at 320px: 17 clubs, lineup and training, save reload, stale tab guard, 204 matches, nine finals and 2027 rollover.');

  const largerPhone = await context(390);
  const { page: future, errors: futureErrors } = await open(largerPhone);
  await future.getByRole('button', { name: /2027 Perth Bears debut/ }).click();
  assert.equal(await future.locator('[data-nrl-club]').count(), 18);
  await fit(future);
  await screenshot(future, 'nrl-2027-choose-390.png');
  await future.getByRole('button', { name: 'Manage Perth Bears' }).click();
  const matchup = future.getByRole('heading', { level: 2, name: /Bears/ });
  await matchup.waitFor();
  const matchupTop = await matchup.evaluate(heading => heading.getBoundingClientRect().top);
  assert(matchupTop >= 0 && matchupTop < 500, 'The first matchup is in view after choosing a club low in the list');
  await screenshot(future, 'nrl-2027-perth-390.png');
  await future.getByRole('button', { name: 'Club office', exact: true }).click();
  await future.getByRole('heading', { name: 'Squad contracts' }).waitFor();
  await future.getByRole('button', { name: 'Recruitment', exact: true }).click();
  const beforeRecruitment = await career(future);
  const offers = future.getByRole('button', { name: /^Make offer for / });
  assert(await offers.count() > 0);
  let recruitId = null;
  for (let index = 0, count = await offers.count(); index < count; index++) {
    await offers.nth(index).click();
    await future.getByLabel('Term').selectOption('1');
    const sign = future.getByRole('button', { name: 'Agree contract' });
    if (await sign.isEnabled()) {
      await sign.click();
      const signed = (await career(future)).players.find(player => player.futureContract?.clubId === 'bears');
      assert(signed && signed.futureContract.startYear === 2028);
      assert.equal(signed.contract?.clubId, beforeRecruitment.players.find(player => player.id === signed.id)?.contract?.clubId);
      recruitId = signed.id;
      await future.getByRole('heading', { name: 'Agreed arrivals' }).waitFor();
      break;
    }
    await future.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  assert(recruitId, 'A legal Perth signing was available');
  await fit(future);
  await future.getByRole('button', { name: 'Match centre', exact: true }).click();
  const middle = await play(future, 14);
  assert.equal(middle.year, 2027);
  assert.equal(middle.clubId, 'bears');
  const middleBytes = await save(future);
  await future.reload({ waitUntil: 'domcontentloaded' });
  await advance(future).waitFor();
  assert.equal(await save(future), middleBytes);
  const complete2027 = await play(future, 17);
  assert.equal(complete2027.phase, 'complete');
  assert.equal(complete2027.results.filter(result => !result.finalsRound).length, 216);
  assert.equal(complete2027.results.filter(result => result.finalsRound).length, 9);
  await future.getByText('Finals bracket', { exact: true }).click();
  await future.getByText('Grand Final', { exact: true }).waitFor();
  await fit(future);
  const completeBytes = await save(future);
  await future.reload({ waitUntil: 'domcontentloaded' });
  await future.getByText('Season complete', { exact: true }).waitFor();
  assert.equal(await save(future), completeBytes);
  await future.getByRole('button', { name: 'Start over' }).click();
  await future.getByRole('button', { name: 'Choose a new career' }).click();
  await future.getByRole('button', { name: /Back to Bears 2027/ }).click();
  assert.equal(await save(future), completeBytes);
  await future.getByRole('button', { name: 'Review this season' }).click();
  await future.getByRole('button', { name: 'Finances', exact: true }).click();
  await future.getByRole('heading', { name: 'Club finances' }).waitFor();
  const closed = (await career(future)).history[0];
  assert.equal(closed.finance.cash, closed.finance.openingCash + closed.finance.profit);
  await future.getByRole('button', { name: 'Season review', exact: true }).click();
  await future.getByRole('button', { name: 'Start 2028' }).click();
  const next2028 = await career(future);
  assert.equal(next2028.season.year, 2028);
  assert.equal(next2028.season.clubId, 'bears');
  assert.equal(next2028.season.squad.length, 30);
  assert(next2028.season.squad.some(player => player.id === recruitId));
  await future.getByRole('button', { name: 'Ladder', exact: true }).click();
  assert.equal(await future.locator('[data-nrl-ladder=chiefs]').count(), 1);
  await fit(future);
  assert.deepEqual(futureErrors, []);
  await largerPhone.close();
  console.log('2027 at 390px: 18 clubs, Perth selection, midseason and final reloads, 216 matches, nine finals, restart cancellation, finance reconciliation and Chiefs rollover.');

  const desktop = await context(1440);
  const { page, errors } = await open(desktop);
  await fit(page);
  await screenshot(page, 'nrl-2026-choose-1440.png');
  assert.deepEqual(errors, []);
  await desktop.close();
  console.log('Desktop at 1440px: club and season controls fit.');
} finally {
  await browser?.close();
  host?.kill();
}
