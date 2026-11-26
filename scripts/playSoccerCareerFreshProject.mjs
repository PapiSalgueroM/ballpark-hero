/* Run after npm run build. This creates two real browser careers from empty
 * storage. An optional PROJECT_PROOF_DIR receives the final phone screenshot
 * and a JSON comparison. All non-loopback requests are blocked. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import lzString from 'lz-string';
import { chromium } from './lib/playwrightLoader.mjs';

const worktree = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactDir = process.env.PROJECT_PROOF_DIR;
const { decompressFromUTF16 } = lzString;
const startingSeed = Number(process.argv[2] ?? '20260914');
const port = process.env.PROJECT_PORT ?? '44991';
const base = `http://127.0.0.1:${port}`;
const saveKey = 'soccerCareerSave';

function decode(raw) {
  let parsed = JSON.parse(raw || 'null');
  if (!parsed) return null;
  if (parsed.seasons?.format === 'lz-string-utf16-career') parsed = JSON.parse(decompressFromUTF16(parsed.seasons.data));
  for (const key of ['seasons', 'story']) {
    if (parsed[key]?.format === 'lz-string-utf16') parsed[key] = JSON.parse(decompressFromUTF16(parsed[key].data));
  }
  return parsed;
}

function pickState(save) {
  return {
    playerName: save.playerName, phase: save.phase, age: save.age, club: save.currentClub, morale: save.morale,
    popularity: save.popularity, overall: save.overall, academyFocus: save.academyFocus,
    seasons: save.seasons.map(({ year, type, apps, goals, assists, yellowCards, redCards, rating }) => ({
      year, type, apps, goals, assists, yellowCards, redCards, rating,
    })),
    careerProjects: save.careerProjects,
  };
}

async function playFreshCareer(browser, commitToProject) {
  const actions = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const blocked = new Set();
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    blocked.add(url.hostname);
    return route.abort();
  });
  await context.addInitScript(seed => {
    let state = seed >>> 0;
    Math.random = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let bits = Math.imul(state ^ (state >>> 15), 1 | state);
      bits = (bits + Math.imul(bits ^ (bits >>> 7), 61 | bits)) ^ bits;
      return ((bits ^ (bits >>> 14)) >>> 0) / 4294967296;
    };
  }, startingSeed);
  const page = await context.newPage();
  const faults = [];
  page.on('pageerror', error => faults.push(String(error)));
  const rawSave = () => page.evaluate(key => localStorage.getItem(key), saveKey);
  const readSave = async () => decode(await rawSave());
  const button = (name, root = page) => root.getByRole('button', { name }).filter({ visible: true });
  async function verifiedClick(locator, label) {
    const target = locator.first();
    await target.waitFor({ state: 'visible', timeout: 9000 });
    actions.push({ action: label, text: (await target.innerText()).trim().replace(/\s+/g, ' ').slice(0, 120) });
    await target.click({ timeout: 9000 });
  }
  async function waitForSave(predicate, label, limit = 7500) {
    const expires = Date.now() + limit;
    let state;
    do {
      state = await readSave();
      if (state && predicate(state)) return state;
      await page.waitForTimeout(80);
    } while (Date.now() < expires);
    throw new Error(`Save did not reach ${label}. Last state ${JSON.stringify(state && pickState(state))}`);
  }
  async function chooseOption(placeholder, choice) {
    const select = page.getByRole('combobox').filter({ hasText: placeholder }).first();
    await verifiedClick(select, `Open ${placeholder}`);
    const wanted = page.getByRole('option').filter({ hasText: choice }).first();
    await verifiedClick(wanted, `Choose ${choice}`);
  }
  async function openProjects() {
    await verifiedClick(button('Open your phone'), 'Open your phone');
    await verifiedClick(page.locator('[data-phone-app="projects"]'), 'Open Projects');
  }
  async function closePhone() {
    await verifiedClick(button('Put phone away'), 'Put phone away');
  }

  try {
    assert.equal((await context.storageState()).origins.length, 0, 'Fresh browser context must have no stored origins');
    await page.goto(base + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const name = page.getByPlaceholder(/player name/i).first();
    await name.waitFor({ timeout: 30000 });
    assert.equal(await rawSave(), null, 'No soccer save exists before using the interface');
    const consent = button(/Reject all|Essential only/i);
    if (await consent.count()) await verifiedClick(consent, 'Decline optional cookies');
    await name.fill('Project Journey');
    await chooseOption('Choose nationality', 'England');
    await chooseOption('Choose position', 'Striker');
    await chooseOption('Choose era', /2020|Modern/i);
    await verifiedClick(button(/Generate Starting Potential/), 'Generate Starting Potential');
    await verifiedClick(button(/Begin Career/), 'Begin Career');
    const academy = await waitForSave(s => s.phase === 'youth', 'new academy save');
    assert.equal(academy.seasons.length, 1);
    assert.equal(academy.careerProjects, undefined);

    const focus = page.locator('[data-academy-focus] button').filter({ visible: true });
    if (await focus.count()) await verifiedClick(focus, 'Choose an academy training focus');
    await verifiedClick(button(/^Next Year/), 'Play the academy year');
    const academySettled = await waitForSave(s => s.phase === 'contract_offer' || s.phase === 'playing', 'academy settled');
    assert.equal(academySettled.seasons.filter(row => row.type === 'playing').length, 0);
    if (academySettled.phase === 'contract_offer') {
      const review = button(/Review contract/i);
      await verifiedClick(review, 'Review first senior contract');
      await verifiedClick(button(/^Sign contract$/i, page.locator('[data-soccer-offer-review]')), 'Sign first senior contract');
    }
    const pro = await waitForSave(s => s.phase === 'playing', 'first senior club');
    assert.equal(pro.seasons.filter(row => row.type === 'playing').length, 0);

    await openProjects();
    await verifiedClick(page.locator('[data-career-project="street-league"]'), 'Open Street League');
    let pending;
    if (commitToProject) {
      await verifiedClick(page.locator('[data-career-project-choice="open-signups"]'), 'Commit to Open signups');
      await page.locator('[data-project-pending]').waitFor();
      pending = await waitForSave(s => s.careerProjects?.pending?.choiceId === 'open-signups', 'Street League commitment');
      assert.equal(pending.careerProjects.pending.fromYear, pending.seasons.at(-1).year + 1);
      assert.equal(pending.morale, pro.morale, 'Choosing the project must not grant its reward');
      assert.equal(pending.careerProjects.receipts, undefined);
    }
    await closePhone();

    await verifiedClick(button(/^Next Season/), 'Play the first senior season');
    const end = await waitForSave(s => s.seasons.some(row => row.type === 'playing'), 'first senior season settled', 20000);
    if (!commitToProject) {
      assert.equal(end.careerProjects, undefined, 'Opening a project without committing must leave it unset');
      assert.deepEqual(faults, []);
      return { pro: pickState(pro), end: pickState(end), actions };
    }
    assert.equal(end.careerProjects.receipts.length, 1, 'One played season settles one receipt');
    const [receipt] = end.careerProjects.receipts;
    const senior = end.seasons.filter(row => row.type === 'playing');
    assert.equal(senior.length, 1);
    const [season] = senior;
    assert.equal(season.year, receipt.year);
    assert.equal(season.apps, receipt.evidence.apps);
    assert.ok(season.apps >= 8, `Senior season produced only ${season.apps} appearances`);
    assert.deepEqual(receipt.effects, { morale: 2 });
    assert.equal(end.careerProjects.progress['street-league'], 1);
    assert.equal(end.careerProjects.pending, undefined);

    await openProjects();
    await verifiedClick(page.locator('[data-project-history-open]'), 'Open Project history');
    const history = page.locator('[data-career-projects-screen="history"]');
    await history.waitFor();
    const historyText = await history.innerText();
    assert.match(historyText, /^Met$/m);
    assert.match(historyText, new RegExp(`${season.apps} appearances`));
    assert.match(historyText, /Morale \+2/);
    const beforeReload = await readSave();
    const bytesBefore = await rawSave();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await button('Open your phone').first().waitFor({ timeout: 15000 });
    await openProjects();
    await verifiedClick(page.locator('[data-project-history-open]'), 'Reopen Project history after reload');
    await history.waitFor({ timeout: 10000 });
    assert.equal(await history.innerText(), historyText);
    const afterReload = await readSave();
    assert.deepEqual(pickState(afterReload), pickState(beforeReload));
    assert.equal(await rawSave(), bytesBefore, 'Reopening the receipt must leave the committed save bytes intact');
    assert.deepEqual(faults, []);
    if (artifactDir) await page.screenshot({ path: resolve(artifactDir, 'soccer-career-project-reward-phone.png') });
    return {
      width: 390, height: 844, startingSeed, actions, blocked: [...blocked],
      academy: pickState(academy), academySettled: pickState(academySettled), pro: pickState(pro), pending: pickState(pending),
      beforeReload: pickState(beforeReload), afterReload: pickState(afterReload), saveBytesIdentical: true,
      receiptOnScreen: historyText, pageErrors: faults,
    };
  } catch (error) {
    console.error(JSON.stringify({ commitToProject, actions }));
    throw error;
  } finally {
    await context.close();
  }
}

const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', port], { cwd: worktree, windowsHide: true });
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Loopback server exited ${code}`)));
    if (server.stdout.readableLength) resolve();
  });
  browser = await chromium.launch({ headless: true });
  const project = await playFreshCareer(browser, true);
  const control = await playFreshCareer(browser, false);
  assert.deepEqual(project.pro, control.pro, 'The two browser careers enter their first senior season in identical state');
  assert.deepEqual(project.beforeReload.seasons, control.end.seasons, 'The first senior season evidence must match the no-project run');
  assert.equal(project.beforeReload.popularity, control.end.popularity, 'This Street League choice grants morale only');
  const moraleEffect = project.beforeReload.morale - control.end.morale;
  assert.equal(moraleEffect, 2, 'The project must add its reward to actual career morale');
  if (artifactDir) {
    await writeFile(resolve(artifactDir, 'soccer-career-project-browser-proof.json'), JSON.stringify({ ...project, control, moraleEffect }, null, 2) + '\n');
  }
  const season = project.beforeReload.seasons.at(-1);
  console.log(JSON.stringify({ seed: startingSeed, academy: project.academy.club, club: project.pro.club, age: project.beforeReload.age,
    season: season.year, appearances: season.apps, goals: season.goals, assists: season.assists, rating: season.rating,
    receiptOnScreen: project.receiptOnScreen.replace(/\n+/g, ' | '), controlMorale: control.end.morale, projectMorale: project.beforeReload.morale,
    afterReloadMorale: project.afterReload.morale, saveBytesIdentical: true, actions: project.actions.length }));
} finally {
  await browser?.close();
  server.kill();
}
