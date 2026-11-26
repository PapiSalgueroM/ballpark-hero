/* Run after npm run build. Start NBA and NFL rookies through the real quick
 * draft from empty storage. Measure target payouts, season stats and reload
 * with all external requests blocked. PROJECT_PROOF_DIR can store the JSON. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const worktree = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactDir = process.env.PROJECT_PROOF_DIR;
const port = process.env.PROJECT_PORT ?? '44992';
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', port], { cwd: worktree, windowsHide: true });
let browser;
const cases = [
  { sport: 'nba', position: 'C', key: 'bpg', unit: 'blocks per game', target: 1, overview: 'Blocks per game', seed: 20260914, expected: 'missed' },
  { sport: 'nfl', position: 'K', key: 'longFg', unit: 'yards on your longest field goal', target: 45, overview: 'Field goal percentage', seed: 20260914, expected: 'completed' },
  { sport: 'nba', position: 'PG', key: 'spg', unit: 'steals per game', target: 0.8, overview: 'Steals per game', seed: 1, expected: 'completed', defense: 'The Pest' },
];

async function replay(test) {
  const { sport, position, key, unit, target, overview } = test;
  const trialSeed = test.seed;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const actions = [];
  const errors = [];
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  await context.addInitScript(initial => {
    let state = initial >>> 0;
    Math.random = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let n = Math.imul(state ^ (state >>> 15), 1 | state);
      n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }, trialSeed);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  const button = (name, root = page) => root.getByRole('button', { name }).filter({ visible: true });
  const raw = () => page.evaluate(k => localStorage.getItem(k), `${sport}-my-career-save-v1`);
  const saved = async () => JSON.parse((await raw()) ?? 'null');
  async function click(locator, label) {
    const control = locator.first();
    await control.waitFor({ timeout: 10000 });
    actions.push(label + ' | ' + (await control.innerText()).trim().replace(/\s+/g, ' ').slice(0, 125));
    await control.click({ timeout: 10000 });
  }
  async function waitSave(testSave, label) {
    let last;
    for (let attempt = 0; attempt < 200; attempt++) {
      last = await saved();
      if (testSave(last)) return last;
      await page.waitForTimeout(90);
    }
    throw new Error(`${sport} did not save ${label}; phase ${last?.phase}`);
  }
  async function settlePostseason() {
    const hub = page.locator('[data-us-programme-open]').filter({ visible: true });
    const choices = [
      page.locator('[data-season-reveal]').getByRole('button', { name: /Continue/i }),
      page.locator('[data-rivalry-event]').getByRole('button', { name: /Continue/i }),
      page.locator('[data-rivalry-choice]').getByRole('button', { name: /Continue/i }),
      page.locator('[data-rivalry-option]'),
      page.locator('[data-decision-continue]'),
      page.locator('[data-career-decision-option]'),
      page.locator('[data-extension-talk]').getByRole('button', { name: /year out/i }),
      button(/One more year|Back to career|^Hub$/i),
    ];
    for (let i = 0; i < 90; i++) {
      if (await hub.isVisible() && !(await page.locator('[data-season-reveal]').isVisible())) return;
      for (const choice of choices) {
        if (!(await choice.first().isVisible()) || !(await choice.first().isEnabled())) continue;
        await click(choice, 'Resolve career card');
        break;
      }
      await page.waitForTimeout(180);
    }
    throw new Error(`No ${sport} season hub: ${(await page.locator('main').innerText()).slice(0, 220)}`);
  }
  try {
    assert.equal((await context.storageState()).origins.length, 0);
    await page.goto(`${base}/${sport}-my-career`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const name = page.getByPlaceholder(/name/i).first();
    await name.waitFor({ timeout: 30000 });
    assert.equal(await raw(), null);
    const guide = button(/Let.s Play/i);
    if (await guide.count()) await click(guide, 'Read and close first-visit rules');
    const cookies = button(/Reject all|Essential only/i);
    if (await cookies.count()) await click(cookies, 'Decline optional cookies');
    await name.fill(`${sport.toUpperCase()} Test Rookie`);
    await click(button(new RegExp(`^${position}$`)), `Select ${position}`);
    if (test.defense) await click(button(new RegExp(test.defense, 'i')), 'Choose defensive build');
    await click(button(/Enter the draft/i), 'Enter the draft');
    const drafted = await waitSave(s => s?.c?.pos === position, 'new draft');
    assert.equal(drafted.c.seasons.length, 0);
    if (!await page.locator('[data-us-programme-open]').isVisible()) {
      const intro = button(/Continue to career|View career|^Continue$/i);
      if (await intro.count()) await click(intro, 'Continue from draft');
    }
    await click(page.locator('[data-us-programme-open]'), 'Plan rookie season');
    const programmeHelp = page.locator('[data-us-programme-start]');
    if (await programmeHelp.isVisible()) await click(programmeHelp, 'Read season programme rules');
    await click(page.locator('[data-us-programme-tile="bonus"]'), 'Open Performance bonus');
    const alternate = page.locator('[data-us-programme-choice="bonus:alternate"]');
    const menuText = await alternate.innerText();
    const escapedUnit = unit.replaceAll(/[^a-z0-9 ]/gi, '\\$&');
    const shownTarget = sport === 'nba' ? target.toFixed(1).replace('.', '\\.') : String(target);
    assert.match(menuText, new RegExp(`^${shownTarget} ${escapedUnit} and \\d+ games`, 'm'));
    const minimum = Number(menuText.match(/and (\d+) games/)[1]);
    await click(alternate, 'Choose role-specific target');
    if (test.defense) {
      await click(page.locator('[data-us-programme-back]'), 'Return to programme choices');
      await click(page.locator('[data-us-programme-tile="tactics"]'), 'Open Tactical approach');
      await click(page.locator('[data-us-programme-choice="tactics:defend"]'), 'Choose defensive tactic');
    }
    await click(page.locator('[data-us-programme-close]'), 'Close season programme');
    const plan = await waitSave(s => s?.c?.programme?.bonus === 'alternate', 'alternate target');
    assert.equal(plan.c.programme.team, plan.c.team);
    assert.equal(plan.c.programme.year, plan.c.year);
    await click(button(/^Play the \d+ season$/i), 'Simulate the rookie season');
    const played = await waitSave(s => s?.c?.programmeResults?.length === 1, 'rookie programme result');
    const [line] = played.c.seasons;
    const [result] = played.c.programmeResults;
    const receipt = result.decisions.find(entry => entry.section === 'bonus');
    const met = line[key] >= target && line.games >= minimum;
    const gross = met ? Math.round(line.salary * 0.02 * 10000) / 10000 : 0;
    assert.equal(receipt.target, target);
    assert.equal(receipt.actual, line[key]);
    assert.equal(receipt.unit, unit);
    assert.equal(receipt.outcome, met ? 'completed' : 'missed');
    assert.equal(receipt.outcome, test.expected, 'Fixed witness must exercise its intended outcome');
    assert.equal(result.year, line.year);
    assert.equal(result.team, line.team);
    assert.equal(result.bonusGross, gross);
    assert.equal(result.bonusNet, Math.round(gross * 0.45 * 10) / 10);
    await settlePostseason();
    const visibleResult = page.locator('[data-us-programme-result]');
    await visibleResult.waitFor({ timeout: 10000 });
    const resultText = (await visibleResult.innerText()).trim();
    const display = value => sport === 'nba' ? value.toFixed(1) : String(value);
    assert.ok(resultText.includes(`Chase a different stat: ${receipt.outcome} (${display(line[key])}/${display(target)} ${unit})`));
    if (gross === 0) assert.equal(await page.locator('[data-us-programme-bonus]').count(), 0);
    else assert.ok(resultText.includes(`Bonus: $${Math.round(gross * 1000)}K gross`));

    const persisted = await saved();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await visibleResult.waitFor({ timeout: 12000 });
    assert.equal((await visibleResult.innerText()).trim(), resultText);
    const reloaded = await saved();
    assert.deepEqual(reloaded.c.programmeResults, persisted.c.programmeResults);
    assert.deepEqual(reloaded.c.seasons, persisted.c.seasons);
    assert.equal(reloaded.c.earnings, persisted.c.earnings);
    assert.equal(reloaded.c.netWorth, persisted.c.netWorth);
    assert.equal(reloaded.c.programmeResults.length, 1);

    await click(button(/Career Log/i), 'Open the career season log');
    const extra = page.locator('[data-season-extra-stat]');
    if (!(await extra.isVisible())) {
      await click(button(new RegExp(String(line.year))), 'Open rookie-season details');
    }
    await extra.waitFor({ timeout: 10000 });
    const overviewText = await extra.innerText();
    const formatted = sport === 'nba' ? line[key].toFixed(1) : (100 * line.fgMade / line.fgAtt).toFixed(1) + '%';
    assert.equal(overviewText.trim().replace(/\s+/g, ' '), `${overview} ${formatted}`);
    assert.deepEqual(errors, []);
    return {
      sport, position, team: line.team, draft: drafted.c.draftPick, startRole: drafted.c.role, seed: trialSeed, line,
      menuText, minimum, met, result, resultText, overviewText, beforeReload: { earnings: persisted.c.earnings, netWorth: persisted.c.netWorth },
      afterReload: { earnings: reloaded.c.earnings, netWorth: reloaded.c.netWorth }, actions, errors,
    };
  } catch (error) {
    console.error(JSON.stringify({ sport, actions, current: (await page.locator('main').innerText().catch(() => '')).slice(0, 400) }));
    throw error;
  } finally {
    await context.close();
  }
}

try {
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Loopback server exited ${code}`)));
  });
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const test of cases) {
    const proof = await replay(test);
    results.push(proof);
    console.log(JSON.stringify({ sport: proof.sport, position: proof.position, team: proof.team, draft: proof.draft, startRole: proof.startRole, games: proof.line.games, actual: proof.line[test.key], target: test.target, met: proof.met, bonus: proof.result.bonusGross, stored: proof.result.bonusNet, overview: proof.overviewText, actions: proof.actions.length }));
  }
  if (artifactDir) {
    await writeFile(resolve(artifactDir, 'nba-nfl-fresh-season-targets.json'), JSON.stringify({ results }, null, 2) + '\n');
  }
} finally {
  await browser?.close();
  server.kill();
}
