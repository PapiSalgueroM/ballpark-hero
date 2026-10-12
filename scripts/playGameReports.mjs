import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173';
const OUT = path.resolve(process.env.REPORT_EVIDENCE ?? 'game-report-artifacts/browser');
const CONTROL = process.env.GAME_REPORT_CONTROL ?? '';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
assert(['', 'below-guide'].includes(CONTROL), 'Known report placement control');
fs.mkdirSync(OUT, { recursive: true });
const browser = await pw.chromium.launch();
const rows = [];
try {
  for (const width of [320, 390, 1280, 1440]) {
    for (const game of ['perfect-season-nba', 'player-bingo']) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const reports = [];
      const external = [];
      const errors = [];
      const row = { game, width, reports, externalFulfilledOrAborted: external, errors, completed: false };
      rows.push(row);
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === new URL(BASE).origin) return route.fallback();
        external.push({ origin: url.origin, type: request.resourceType() });
        if (url.hostname.endsWith('.supabase.co') && request.method() === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: cors, body: '' });
        }
        if (url.pathname.endsWith('/functions/v1/report-relay')) {
          assert.equal(request.method(), 'POST', 'Only relay submissions are recorded');
          reports.push(request.postDataJSON());
          return route.fulfill({ status: 200, headers: cors, body: '{"ok":true}' });
        }
        if (url.hostname.endsWith('.supabase.co')) {
          return route.fulfill({ status: 200, headers: cors, body: '[]' });
        }
        return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${BASE}/${game}`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-seo-content="ready"]').waitFor({ timeout: 30000 });
      if (game === 'player-bingo') {
        await page.getByRole('button', { name: "Let's Play!", exact: true }).click();
      }
      const report = page.locator('[data-seo-content] > [data-no-prerender]').getByRole('button', { name: 'Report a problem', exact: true });
      await report.waitFor();
      const order = async () => report.evaluate(button => {
        const group = button.parentElement;
        const guide = group.closest('[data-seo-content]');
        const heading = guide.querySelector('h1, h2');
        return Boolean(button.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      assert(await order(), `${game}/${width}: report precedes the guide`);
      if (CONTROL === 'below-guide') {
        await report.evaluate(button => button.closest('[data-seo-content]').append(button.parentElement));
        assert.equal(await order(), false, 'Moving the actual control changed the measured order');
        Object.assign(row, { control: CONTROL, fired: true, completed: true });
        await context.close();
        continue;
      }
      await report.click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Bug', exact: true }).click();
      const send = dialog.getByRole('button', { name: 'Submit Report', exact: true });
      assert(await send.isDisabled(), 'A category alone cannot send a report');
      await dialog.getByRole('textbox', { name: 'Describe the problem' }).fill('Fixture report: I picked a player and expected the draft to continue.');
      assert(await send.isEnabled(), 'A description enables reporting');
      await send.click();
      await dialog.getByText('Thanks for reporting!', { exact: true }).waitFor();
      assert.equal(reports.length, 1, 'Exactly one relay submission');
      const payload = reports[0];
      assert.equal(payload.game_type, game);
      assert.equal(payload.game_context.path, `/${game}`);
      assert.match(payload.game_context.submittedAt, /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(payload.game_context.source, 'game-report-button');
      assert.equal(payload.game_context.diagnostics.viewport.width, width);
      assert.match(payload.game_context.diagnostics.build, /^index-[\w-]+\.js$/);
      assert(JSON.stringify(payload.game_context).length < 1500, 'Complete context fits the email budget');
      if (game === 'perfect-season-nba') {
        assert.equal(payload.game_context.phase, 'mode-select');
        assert.equal(payload.game_context.picks.length, 6);
      }
      assert.deepEqual(errors, [], 'No browser page errors');
      Object.assign(row, { payload, completed: true });
      console.log(`PASS ${game}/${width}: report above guide, description required, state/time/build delivered`);
      await context.close();
    }
  }
} finally {
  fs.writeFileSync(path.join(OUT, CONTROL ? 'control.json' : 'outcomes.json'), JSON.stringify({ control: CONTROL, rows }, null, 2));
  await browser.close();
}
assert.equal(rows.length, 8, 'All route and viewport outcomes were recorded');
console.log(CONTROL ? 'PASS below-guide control fired on all eight actual pages' : 'PASS all eight game report journeys');
