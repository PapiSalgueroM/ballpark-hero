import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [origin, entry, mode = 'candidate'] = process.argv.slice(2);
assert.ok(origin && /^\/assets\/index-[\w-]+\.js$/.test(entry), 'Pass the site origin and exact entry asset');
assert.ok(['baseline', 'candidate'].includes(mode));
const { outputFiles } = await build({
  absWorkingDir: root, bundle: true, platform: 'node', format: 'esm', write: false,
  alias: { '@': path.join(root, 'src') }, logLevel: 'error',
  stdin: { resolveDir: root, contents: `
    export { FALLBACK_CLUBS, repairCareer } from './src/lib/soccerCareerEngine';
    export { buildSoccerSeasonCtx } from './src/lib/season/soccer';
    export { isSoccerCareerSave } from './src/lib/soccerCareerSave';
  ` },
});
const { FALLBACK_CLUBS, buildSoccerSeasonCtx, repairCareer, isSoccerCareerSave } =
  await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));
const recorded = JSON.parse(readFileSync(path.join(root, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
const captured = recorded.saves.find(save => save.id === 'her' && save.kind === 'player');
assert.ok(captured, 'The recorded Hertha Berlin save is available');
const career = repairCareer(structuredClone(captured.state));
assert.ok(isSoccerCareerSave(career));
assert.equal(career.phase, 'playing');
const latest = career.seasons.at(-1), prior = career.seasons.at(-2);
assert.ok(latest.year > prior.year && !latest.leagueTitle && !prior.leagueTitle);
// Stage an older non-title table with no held league world using a known membership.
Object.assign(prior, { club: 'Arsenal', clubCountry: 'England', leagueSize: 20 });
delete prior.derbies;
assert.equal(buildSoccerSeasonCtx(career, FALLBACK_CLUBS, prior).mode, 'table', 'Control fixture has a league table rather than a results-only archive');
const bytes = JSON.stringify(career);
const browser = await chromium.launch();
try {
  for (const [width, height] of [[320, 568], [390, 844]]) {
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: true, hasTouch: true,
      reducedMotion: 'reduce', serviceWorkers: 'block',
    });
    const errors = [];
    let writes = 0;
    try {
      await context.routeWebSocket('**/*', socket => socket.close());
      await context.route('**/*', route => {
        const request = route.request();
        return new URL(request.url()).origin === origin && ['GET', 'HEAD'].includes(request.method()) ? route.continue() : route.abort();
      });
      context.on('requestfinished', request => {
        if (!['GET', 'HEAD'].includes(request.method())) writes++;
      });
      await context.addInitScript(raw => {
        if (sessionStorage.getItem('fixture-report-seeded')) return;
        sessionStorage.setItem('fixture-report-seeded', '1');
        localStorage.setItem('soccerCareerSave', raw);
        localStorage.setItem('cookie-consent-v2', JSON.stringify({
          version: 2, advertising: false, analytics: false, updatedAt: Date.now(),
        }));
      }, bytes);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      const storage = () => page.evaluate(() => [localStorage.getItem('soccerCareerSave'), localStorage.getItem('seasonCentre:v1:soccer')]);
      const response = await page.goto(origin + '/soccer-career?fixture_report=' + Date.now(), { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      assert.equal((await response.text()).match(/<script[^>]+src=["'](\/assets\/index-[\w-]+\.js)/)?.[1], entry);
      const openReplays = () => page.locator('[data-open-season-replays]').tap();
      const replayRow = row => page.locator('[data-replay-row], [data-replay-locked]').filter({ hasText: `${row.year}/${String(row.year + 1).slice(-2)} · ${row.club}` });
      const centre = page.locator('[data-season-centre]:not([aria-hidden="true"])');
      const fixture = md => centre.locator(`[data-fixture-row="${md}"]:visible`);
      const setupReplay = async () => {
        await openReplays();
        await replayRow(latest).tap();
        await centre.locator('[data-kickoff]').waitFor();
        const help = centre.locator('[data-season-help]');
        if (await help.isVisible()) {
          if (mode === 'candidate') assert.ok((await help.innerText()).includes('open a finished fixture'));
          await help.getByRole('button', { name: 'Got it' }).tap();
        }
      };
      await setupReplay();
      await centre.getByRole('button', { name: /Kick off/ }).tap();
      const roundOne = centre.getByRole('button', { name: /^▶ (?:Matchday|League game) 1$/ });
      if (await roundOne.isVisible()) await roundOne.tap();
      const clock = centre.locator('[data-match-clock][data-minute="90"]');
      await clock.waitFor();
      const existingScore = (await clock.locator('[data-score-bug]').innerText()).trim();
      const existingEvents = await clock.locator('[data-clock-events] li').allTextContents();
      const existingLine = await centre.locator('[data-his-line]').textContent();
      const original = await storage();
      assert.equal(original[0], bytes);
      assert.equal(JSON.parse(original[1]).md, 1);
      await centre.locator('[data-centre-fixtures]').tap();
      const first = fixture(1).getByRole('button', { name: /Match report/ });
      assert.equal(await fixture(2).getByRole('button', { name: /Match report/ }).count(), 0, 'Only revealed matches can open');
      assert.equal(await first.count(), mode === 'candidate' ? 1 : 0);
      if (mode === 'candidate') {
        await first.tap();
        const report = page.getByRole('dialog', { name: 'Match report' });
        assert.equal(await report.locator('[data-fixture-report-score]').textContent(), existingScore);
        assert.equal(await report.locator('[data-his-line]').textContent(), existingLine);
        assert.deepEqual(await report.locator('[data-fixture-report-events] li').allTextContents(), existingEvents.filter(text => text !== 'Kick off.'));
        const bounds = await report.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y >= 0 && bounds.y + bounds.height <= height + 1);
        await page.keyboard.press('Escape');
        await report.waitFor({ state: 'hidden' });
        await page.waitForFunction(() => document.activeElement?.matches('[data-fixture-row="1"] button'));
      }
      assert.deepEqual(await storage(), original, 'Reading a fixture preserves save and replay cursor bytes');
      await centre.getByRole('button', { name: '← Back', exact: true }).tap();
      await clock.waitFor();
      assert.equal((await clock.locator('[data-score-bug]').innerText()).trim(), existingScore);
      await centre.locator('[data-centre-exit]').tap();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await setupReplay();
      assert.ok((await centre.locator('[data-kickoff-resumed]').innerText()).includes('1 of'));
      await centre.getByRole('button', { name: /Straight to the/ }).tap();
      await centre.locator('[data-centre-fixtures]').tap();
      assert.equal(await fixture(2).getByRole('button', { name: /Match report/ }).count(), mode === 'candidate' ? 1 : 0);
      assert.equal((await storage())[0], bytes);
      await centre.locator('[data-centre-exit]').tap();
      await openReplays();
      const old = replayRow(prior);
      if (await old.getAttribute('data-replay-locked') !== null) {
        assert.ok((await old.innerText()).includes('cannot be replayed'));
      } else {
        await old.tap();
        await centre.locator('[data-centre-league-unavailable]').waitFor();
        assert.equal(await centre.getByRole('button', { name: /^Match report/ }).count(), 0);
      }
      assert.deepEqual(errors, []);
      assert.equal(writes, 0);
      console.log(JSON.stringify({ width, entry, mode, existingScore, events: existingEvents.length, cursor: 1, unavailableOlderLeague: true, writes }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
