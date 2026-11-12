import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { build } from 'esbuild';
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
const finishLive = page => page.getByRole('button', { name: 'Play second half' });
const reloadMoved = page => Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.getByRole('button', { name: 'Reload your season' }).click()]);
const development = page => page.getByLabel('Development focus');
const screenshot = (page, name) => shots && page.screenshot({ path: path.join(shots, name), fullPage: false });

async function context(width) {
  const mobile = width < 600;
  const ctx = await browser.newContext({ viewport: { width, height: mobile ? 844 : 960 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
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

async function setDevelopment(page, focus) {
  assert.equal(await development(page).inputValue(), 'balanced');
  await development(page).selectOption(focus);
  const text = await page.locator('[data-nrl-development-preview]').innerText();
  assert.match(text, /^(?:\d+ players? will |No returning players)/);
  const affected = Number(text.match(/^\d+/)?.[0] ?? 0);
  assert.equal((await career(page)).developmentFocus, focus);
  return { affected, focus, text };
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
  assert.equal(new Set(started.bench).size, 6);
  await past.getByRole('button', { name: 'Squad', exact: true }).click();
  assert.equal(await past.locator('select[id^=nrl-starter-]').count(), 13);
  assert.equal(await past.locator('select[id^=nrl-reserve-]').count(), 6);
  await past.getByLabel('Fullback', { exact: true }).selectOption({ index: 1 });
  const lineup = (await career(past)).season.lineup;
  assert.notEqual(lineup.Fullback, started.lineup.Fullback);
  const kicker = past.getByLabel('Goal kicker', { exact: true });
  const kickerOptions = await kicker.locator('option').evaluateAll(options => options.map(option => option.value));
  assert.deepEqual(kickerOptions.sort(), Object.values(lineup).sort());
  await kicker.selectOption(lineup.Fullback);
  assert.equal((await career(past)).season.kickerId, lineup.Fullback);
  const beforeBench = (await career(past)).season.bench;
  await past.getByLabel('Reserve 14', { exact: true }).selectOption(beforeBench[1]);
  const afterBench = (await career(past)).season.bench;
  assert.equal(afterBench[0], beforeBench[1]);
  assert.equal(afterBench[1], beforeBench[0]);
  assert.equal(new Set(afterBench).size, 6);
  await past.getByRole('button', { name: 'Match centre' }).click();
  await past.getByRole('button', { name: 'Attack', exact: true }).click();
  await past.getByRole('button', { name: 'Train', exact: true }).click();
  assert.equal((await career(past)).season.preparation, 'train');
  const firstRound = await play(past, 1);
  const played = firstRound.results.find(result => result.benchUsed);
  const used = played?.benchUsed;
  assert(used?.length > 0 && used.length <= 4 && used.every(id => afterBench.includes(id)));
  assert.equal(played.playerScoring.kickerId, lineup.Fullback);
  await past.getByRole('heading', { name: 'Interchange used' }).waitFor();
  const beforeReload = await save(past);
  await past.reload({ waitUntil: 'domcontentloaded' });
  await advance(past).waitFor();
  assert.equal(await save(past), beforeReload);
  await past.getByRole('button', { name: 'Ladder', exact: true }).click();
  assert.equal(await past.locator('[data-nrl-ladder]').count(), 17);
  await fit(past);
  await past.getByRole('button', { name: 'Match centre' }).click();
  const beforeLive = await career(past);
  const sameSave = await open(phone);
  await sameSave.page.getByRole('button', { name: 'Play Live', exact: true }).tap();
  await past.getByRole('button', { name: 'Reload your season' }).waitFor();
  assert.equal(await advance(past).isEnabled(), false);
  const pendingBytes = await save(sameSave.page);
  const pending = await career(sameSave.page);
  assert.equal(pending.season.round, beforeLive.season.round);
  assert.deepEqual(pending.season.results, beforeLive.season.results);
  assert.deepEqual(pending.finance, beforeLive.finance);
  assert.equal(pending.season.live.fixture.round, beforeLive.season.round);
  const halfScore = sameSave.page.locator('[data-nrl-halftime]');
  const halfText = await halfScore.innerText();
  assert.match(halfText, /tr(?:y|ies)/);
  assert.equal(await advance(sameSave.page).count(), 0);
  await fit(sameSave.page);
  await screenshot(sameSave.page, 'nrl-halftime-320.png');
  await sameSave.page.reload({ waitUntil: 'domcontentloaded' });
  await finishLive(sameSave.page).waitFor();
  assert.equal(await halfScore.innerText(), halfText);
  assert.equal(await save(sameSave.page), pendingBytes);
  await reloadMoved(past);
  await finishLive(past).waitFor();
  await past.getByRole('button', { name: 'Squad', exact: true }).click();
  assert.equal(await past.getByLabel('Goal kicker').isEnabled(), false);
  await past.getByRole('button', { name: 'Match centre', exact: true }).click();
  await finishLive(sameSave.page).tap();
  await sameSave.page.getByRole('heading', { name: 'Full time', exact: true }).waitFor();
  await past.getByRole('button', { name: 'Reload your season' }).waitFor();
  assert.equal(await finishLive(past).isEnabled(), false);
  const settledBytes = await save(sameSave.page);
  const settled = await career(sameSave.page);
  assert.equal(settled.season.live, undefined);
  assert.equal(settled.season.round, beforeLive.season.round + 1);
  assert.equal(settled.season.results.filter(result => result.round === beforeLive.season.round
    && (result.homeId === settled.season.clubId || result.awayId === settled.season.clubId)).length, 1);
  await reloadMoved(past);
  await past.getByRole('heading', { level: 1, name: 'NRL Team Manager' }).waitFor();
  await advance(past).waitFor();
  assert.equal(await save(past), settledBytes);
  const complete2026 = await play(past, 29);
  assert.equal(complete2026.phase, 'complete');
  assert.equal(complete2026.results.filter(result => !result.finalsRound).length, 204);
  assert.equal(complete2026.results.filter(result => result.finalsRound).length, 9);
  assert(complete2026.championId);
  assert.equal((await career(past)).history.length, 1);
  await past.getByRole('button', { name: 'Review this season' }).click();
  const youth = await setDevelopment(past, 'youth');
  const focusBytes = await save(past);
  await fit(past);
  await screenshot(past, 'nrl-development-320.png');
  await past.reload({ waitUntil: 'domcontentloaded' });
  await past.getByRole('button', { name: 'Review this season' }).click();
  assert.equal(await save(past), focusBytes);
  assert.equal(await development(past).inputValue(), 'youth');
  assert.equal(await past.locator('[data-nrl-development-preview]').innerText(), youth.text);
  await past.getByRole('button', { name: 'Start 2027' }).click();
  const next2027 = await career(past);
  assert.equal(next2027.season.year, 2027);
  assert.equal(next2027.season.clubId, 'storm');
  assert.equal(next2027.history[0].year, 2026);
  assert.deepEqual(next2027.history[0].development, { focus: youth.focus, affected: youth.affected });
  await past.getByRole('button', { name: 'Club office', exact: true }).click();
  await past.getByRole('button', { name: 'Season review', exact: true }).click();
  assert.equal(await development(past).inputValue(), 'balanced');
  assert.match(await past.locator('[data-nrl-development-receipt]').innerText(), /^Youth development/);
  await past.getByRole('button', { name: 'Ladder', exact: true }).click();
  assert.equal(await past.locator('[data-nrl-ladder]').count(), 18);
  assert.deepEqual([...pastErrors, ...sameSave.errors], []);
  await phone.close();
  console.log('2026 at 320px: live halftime reload, one settlement across two tabs, 204 matches, nine finals and youth development saved, applied and reviewed.');

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
  await future.getByRole('button', { name: 'Play Live', exact: true }).tap();
  const attack = future.getByRole('button', { name: 'Attack', exact: true });
  await attack.tap();
  assert.equal(await attack.getAttribute('aria-pressed'), 'true');
  await fit(future);
  await screenshot(future, 'nrl-halftime-390.png');
  await finishLive(future).tap();
  await future.getByRole('heading', { name: 'Full time', exact: true }).waitFor();
  await screenshot(future, 'nrl-full-time-390.png');
  assert.equal((await career(future)).season.tactic, 'balanced');
  const middle = await play(future, 13);
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
  const veterans = await setDevelopment(future, 'veterans');
  await fit(future);
  await future.getByRole('button', { name: 'Start 2028' }).click();
  const next2028 = await career(future);
  assert.equal(next2028.season.year, 2028);
  assert.equal(next2028.season.clubId, 'bears');
  assert.equal(next2028.season.squad.length, 30);
  assert(next2028.season.squad.some(player => player.id === recruitId));
  assert.deepEqual(next2028.history[0].development, { focus: veterans.focus, affected: veterans.affected });
  await future.getByRole('button', { name: 'Ladder', exact: true }).click();
  assert.equal(await future.locator('[data-nrl-ladder=chiefs]').count(), 1);
  await fit(future);
  assert.deepEqual(futureErrors, []);
  await largerPhone.close();
  console.log('2027 at 390px: Perth signing, halftime tactic change, 216 matches, nine finals, finance reconciliation and veteran development on rollover.');

  const fixture = await build({
    stdin: { contents: "export { createNrlSeason, reduceNrlSeason } from './src/lib/nrlManager';", resolveDir: process.cwd() },
    alias: { '@': path.resolve('src') }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error',
  });
  const { createNrlSeason, reduceNrlSeason } = await import('data:text/javascript;base64,' + Buffer.from(fixture.outputFiles[0].contents).toString('base64'));
  let old = createNrlSeason('bears', 717, 2027);
  for (let action = 0; action < 31; action++) old = reduceNrlSeason(old, { type: 'advance' });
  const oldContext = await context(390);
  await oldContext.addInitScript(({ key, raw }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, raw); }, { key: SAVE_KEY, raw: JSON.stringify(old) });
  const { page: restored, errors: restoredErrors } = await open(oldContext);
  await restored.getByRole('button', { name: 'Review this season' }).click();
  await restored.getByRole('button', { name: 'Finances', exact: true }).click();
  await restored.getByText('This completed save predates club accounts. Tracking starts next season.').waitFor();
  assert.equal(await save(restored), JSON.stringify(old));
  await restored.getByRole('button', { name: 'Season review', exact: true }).click();
  assert.equal(await development(restored).count(), 0);
  await restored.getByRole('button', { name: 'Start 2028' }).click();
  assert.equal((await career(restored)).season.year, 2028);
  assert.equal((await career(restored)).history[0].finance, null);
  assert.deepEqual(restoredErrors, []);
  await oldContext.close();
  console.log('A completed v1 save reopened without invented accounts and advanced to 2028.');

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
