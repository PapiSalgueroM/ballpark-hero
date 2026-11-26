import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.BASE || 'http://127.0.0.1:4173');
assert.ok(base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
const key = 'dukb-club-manager-save';
const width = Number(process.env.WIDTH || 390);
const rotate = process.env.U21_TEST_ROTATION === '1';
const file = 'club-manager-u21' + (rotate ? '-rotation' : '') + (width === 390 ? '' : '-' + width);
try {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === base.origin && route.request().method() === 'GET' ? route.continue() : route.abort());
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const button = name => page.getByRole('button', { name }).first();
  const click = async name => button(name).click({ timeout: 15000 });
  const save = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  const openAcademy = async () => {
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await click(/academy/i);
  };
  await page.goto(base.origin + '/club-manager');
  await button(/2026-27/i).waitFor();
  for (const opt of [/Let.s Play|Start managing|Got it/i, /Reject all|Essential only/i]) if (await button(opt).isVisible()) await click(opt);
  for (const pick of [/2026-27/i, /^England/i, /Premier League/i, /Manchester City/i, /Take the job/i, /Skip: just manage/i]) await click(pick);
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k))?.clubName === 'Manchester City', key);
  const fresh = await save();
  assert.equal(fresh.academy?.youthTeam, undefined);
  // Set the late-game prerequisites only. Every payment, fixture and rating change goes through the game.
  await page.addInitScript(({ key, rotate }) => {
    if (sessionStorage.getItem('u21-fixture-loaded')) return;
    const c = JSON.parse(localStorage.getItem(key));
    c.budget = 100;
    c.academy.facilities = 16;
    c.academy.prospects.push({ id: 'u21-proof', name: 'Test Academy Prospect', position: 'CM', age: 17, rating: 62,
      potential: 64, lowGuess: 62, highGuess: 70, source: 'Academy', flag: '', fee: 0, season: c.season });
    if (rotate) c.academy.prospects.push({ ...c.academy.prospects.at(-1), id: 'u21-second',
      name: 'Second Academy Prospect', position: 'RB', rating: 58, potential: 60 });
    localStorage.setItem(key, JSON.stringify(c));
    sessionStorage.setItem('u21-fixture-loaded', '1');
  }, { key, rotate });
  await page.reload();
  await click(/^Resume Career$/i);
  await openAcademy();
  await page.getByText('Found a youth team', { exact: true }).click();
  await click(/Found U21 side/);
  await page.getByLabel('Featured prospect').selectOption('u21-proof');
  await click(/Enter first campaign/);
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k))?.academy?.youthTeam?.campaign?.prospectId === 'u21-proof', key);
  assert.equal((await save()).budget, 55);
  await click(/^Club home$/i);
  let seniorFixtures = 0, midweekDates = 0;
  const rotations = new Set();
  const heading = page.getByText('Manchester City U21', { exact: true });
  for (; seniorFixtures < 22; seniorFixtures++) {
    const before = await save();
    const count = before.academy.youthTeam.campaign.fixtures.length;
    if (count === 6) break;
    if (rotate && (count === 2 || count === 4) && !rotations.has(count)) {
      await openAcademy(); await heading.click();
      await page.getByText('Rotate your prospect', { exact: true }).click();
      const id = count === 2 ? 'u21-second' : 'u21-proof';
      await page.getByLabel('Next two matches').selectOption(id);
      await click(/^Confirm rotation$/i);
      await page.waitForFunction(([k, id]) => JSON.parse(localStorage.getItem(k))?.academy.youthTeam.campaign.rotations?.at(-1)?.prospectId === id, [key, id]);
      const changed = await save();
      assert.equal(changed.budget, before.budget);
      assert.deepEqual(changed.academy.youthTeam.campaign.fixtures, before.academy.youthTeam.campaign.fixtures);
      await page.reload(); await click(/^Resume Career$/i); await openAcademy(); await heading.click();
      assert.equal(await page.getByText('Rotate your prospect', { exact: true }).count(), 0);
      assert.deepEqual((await save()).academy.youthTeam.campaign, changed.academy.youthTeam.campaign);
      if (process.env.OUTPUT && count === 2) {
        await mkdir(process.env.OUTPUT, { recursive: true });
        await heading.locator('..').screenshot({ path: path.join(process.env.OUTPUT, file + '-midseason.png') });
      }
      await click(/^Club home$/i);
      rotations.add(count);
    }
    await page.locator('[data-cm-way="quick"]').first().click();
    await page.getByText(/^Full time$/i).first().waitFor();
    await click(/^Continue$/i);
    await page.waitForFunction(([k, w]) => JSON.parse(localStorage.getItem(k)).week > w, [key, before.week]);
    const next = await save();
    if (before.calendar[before.week].type !== 'league') {
      midweekDates++;
      assert.equal(next.academy.youthTeam.campaign.fixtures.length, count);
    }
  }
  const played = await save();
  const campaign = played.academy.youthTeam.campaign;
  assert.equal(campaign.fixtures.length, 6);
  assert.deepEqual(campaign.fixtures.map(m => m.gain), [0, 1, 0, 1, 0, rotate ? 1 : 0]);
  if (rotate) {
    assert.deepEqual([...rotations], [2, 4]);
    assert.equal(played.academy.prospects.find(p => p.id === 'u21-second').rating, 59);
    assert.ok(midweekDates > 0);
  }
  assert.equal(played.academy.prospects.find(p => p.id === 'u21-proof').rating, 64);
  await page.reload(); await click(/^Resume Career$/i); await openAcademy();
  await heading.click();
  const panel = heading.locator('..');
  assert.match(await panel.innerText(), /Campaign complete/);
  assert.equal(await panel.locator('li').count(), 6);
  assert.deepEqual((await save()).academy.youthTeam.campaign, campaign);
  assert.deepEqual(errors, []);
  if (process.env.OUTPUT) {
    await mkdir(process.env.OUTPUT, { recursive: true });
    await panel.screenshot({ path: path.join(process.env.OUTPUT, file + '.png') });
    await writeFile(path.join(process.env.OUTPUT, file + '.json'), JSON.stringify({ width, seniorFixtures, startingBudget: 100, afterFounding: 55, campaign, midweekDates,
      development: played.academy.prospects.filter(p => p.id === 'u21-proof' || p.id === 'u21-second').map(p => ({ name: p.name, rating: p.rating })), errors }, null, 2));
  }
  console.log('Six U21 fixtures retained after reload, featured prospect grew from 62 to 64, one founding charge, senior fixtures:', seniorFixtures);
  // The six archived fixtures are the ones just played. Move the registration
  // clock to next season so the manager can enter again on the same save.
  if (process.env.U21_TEST_REENTRY === '1') {
    await page.addInitScript(key => {
      if (sessionStorage.getItem('u21-registration-opened')) return;
      sessionStorage.setItem('u21-registration-opened', '1');
      const next = JSON.parse(localStorage.getItem(key));
      next.season++;
      next.budget = 30;
      localStorage.setItem(key, JSON.stringify(next));
    }, key);
    await page.reload(); await click(/^Resume Career$/i); await openAcademy(); await heading.click();
    await click(/Enter next campaign/);
    await page.getByText('Past U21 campaigns (1)', { exact: true }).click();
    await page.getByText('Development: +' + (rotate ? 3 : 2) + ' rating', { exact: true }).waitFor();
    if (rotate) await page.getByText('Test Academy Prospect +2 · Second Academy Prospect +1', { exact: true }).waitFor();
    const next = await save();
    assert.equal(next.budget, 18);
    assert.deepEqual(next.academy.youthTeam.history, [campaign]);
    assert.equal(next.academy.youthTeam.campaign.fixtures.length, 0);
    await page.reload(); await click(/^Resume Career$/i); await openAcademy(); await heading.click();
    await page.getByText('Past U21 campaigns (1)', { exact: true }).click();
    await page.getByText('Development: +' + (rotate ? 3 : 2) + ' rating', { exact: true }).waitFor();
    assert.deepEqual((await save()).academy.youthTeam, next.academy.youthTeam);
    assert.equal((await save()).budget, 18);
    if (process.env.OUTPUT) await panel.screenshot({ path: path.join(process.env.OUTPUT, file + '-archive.png') });
    assert.deepEqual(errors, []);
    console.log('Second registration cost 12 million. All six prior results and the named development record survived another reload.');
  }
} finally {
  await browser.close();
}
