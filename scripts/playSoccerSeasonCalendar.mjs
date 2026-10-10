// Actual built-route cup calendar proof. Fixtures are retained real engine outputs.
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import pw from './lib/playwrightLoader.mjs';
assert(process.env.CI, 'Calendar browser proof runs remotely');
const out = path.resolve('career-programme-artifacts/calendar-native');
fs.mkdirSync(out, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtures = JSON.parse(fs.readFileSync('career-programme-artifacts/calendar-fixtures.json', 'utf8'));
assert.equal(fixtures.length, 2, 'Actual advancing and eliminated cup saves are required');
const manifest = JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'), 'utf8'));
const fonts = new Map(manifest.map(item => { const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, item.file)); assert.equal(sha(body), item.sha256); return [item.url, { body, contentType: item.contentType }]; }));
const held = [];
for (const file of ['src/lib/soccerCareerCup.ts', 'src/lib/soccerSeasonCalendar.ts', 'src/lib/soccerSeasonCompetitions.ts', 'src/components/season-centre/SeasonCentre.tsx', 'src/components/soccer-career/SoccerSeasonCentre.tsx', 'src/components/soccer-career/SeasonCompetitionPanel.tsx']) {
  const bytes = fs.readFileSync(file); held.push({ file, bytes, sha256: sha(bytes) });
}
const port = await new Promise((resolve, reject) => { const server = createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(() => resolve(value)); }); });
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Calendar host start timeout')), 15000); server.stdout.on('data', value => { if (String(value).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); server.once('error', reject); server.once('exit', code => reject(Error('Calendar host exited ' + code))); });
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(), cases: [], checks: 0, sourceBefore: held.map(({ file, sha256 }) => ({ file, sha256 })), controls: [], scope: 'Production league-to-cup route against independently read raw saved ties. Geometry controls copy actual observations; they are not served product mutations.' };
const browser = await pw.chromium.launch({ headless: true });
function layoutFailures(value) { return [...(value.overflow ? ['overflow'] : []), ...(!value.inside || !value.painted ? ['dialog'] : []), ...(value.stable < 4 || value.finite || value.fonts !== 'loaded' ? ['capture-ready'] : []), ...(value.buttons.some(button => !button.clipped && (!button.painted || button.width < 43.5 || button.height < 43.5)) ? ['controls'] : [])]; }
try {
  for (const width of [320, 390, 1280]) for (const fixture of fixtures) {
    const id = width + '-' + fixture.id, row = { id, shots: [], layouts: [], reads: [], reloads: [], errors: [], assets: [], blocked: [], checks: 0 };
    report.cases.push(row);
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : width === 390 ? 844 : 900 }, isMobile: width < 1000, hasTouch: width < 1000 }), page = await context.newPage();
    const check = (value, label) => { assert(value, id + ': ' + label); row.checks++; report.checks++; };
    const key = 'soccerCareerSave', state = fixture.value, season = state.pendingSummary;
    check(season && season.type === 'playing' && season.apps > 0, 'Fixture carries the actual played row');
    const run = season.cupRun, early = run?.stages[0], next = run?.stages[1];
    check(early?.stage === 'early', 'Actual saved domestic opening stage exists');
    check(fixture.id === 'advance' ? early.won === true && typeof next?.opp === 'string' : early.won === false && run.stages.length === 1, 'Actual saved cup outcome determines progression');
    check(run.opening && typeof run.opening.opp === 'string' && run.opening.won === early.won, 'New modern engine fixture holds a named opening match');
    const initialStats = JSON.stringify([season.apps, season.leagueApps, season.goals, season.assists, season.cleanSheets, season.rating]);
    try {
      await context.route('**/*', async route => { const request = route.request(), url = request.url(); if (url.startsWith(base + '/')) return route.continue(); if (fonts.has(url)) return route.fulfill(fonts.get(url)); if (url.startsWith('data:')) return route.continue(); row.blocked.push({ url, method: request.method(), forwarded: false }); if (request.method() !== 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); if (url.includes('/rest/v1/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); return route.abort(); });
      await context.addInitScript(({ key, state }) => { if (!sessionStorage.getItem('calendar-seeded')) { localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem('calendar-seeded', '1'); } localStorage.setItem('dukb-guest-handle', 'CalendarVisitor'); }, { key, state });
      page.on('pageerror', error => row.errors.push(String(error)));
      page.on('requestfailed', request => { if (request.url().startsWith(base + '/assets/')) row.assets.push({ url: request.url(), error: request.failure()?.errorText }); });
      page.on('response', response => { if (response.url().startsWith(base + '/assets/') && response.status() >= 400) row.assets.push({ url: response.url(), status: response.status() }); });
      await page.goto(base + '/soccer-career', { waitUntil: 'networkidle' });
      await page.locator('[data-watch-week-by-week]').waitFor();
      const bytes = () => page.evaluate(key => localStorage.getItem(key), key), before = await bytes();
      check(JSON.stringify(JSON.parse(before).pendingSummary) === JSON.stringify(season), 'Loaded actual summary holds every saved row field');
      const consent = page.getByRole('region', { name: 'Cookie choices', exact: true });
      await consent.waitFor();
      row.consent = { text: await consent.textContent(), beforeSha256: sha(before) };
      await consent.getByRole('button', { name: 'Essential only', exact: true }).click();
      await consent.waitFor({ state: 'hidden' });
      check(await page.evaluate(() => localStorage.getItem('cookie-consent')) === 'essential', 'Actual Essential only action records the consent choice');
      const afterConsent = await bytes(); row.consent.afterSha256 = sha(afterConsent);
      check(afterConsent === before, 'Actual consent choice preserves complete raw career bytes');
      const active = () => page.locator('[data-season-centre]:not([aria-hidden="true"])').first();
      async function heldRead(name) { const actual = await bytes(); row.reads.push({ name, sha256: sha(actual) }); check(actual === before, name + ': complete raw career bytes stay held'); const saved = JSON.parse(actual).pendingSummary; check(JSON.stringify([saved.apps, saved.leagueApps, saved.goals, saved.assists, saved.cleanSheets, saved.rating]) === initialStats, name + ': no cup stat double counting'); }
      async function capture(name) {
        await page.evaluate(async () => { await document.fonts.ready; });
        const value = await active().evaluate(async element => {
          const sample = () => {
            const rect = element.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2), style = getComputedStyle(element);
            const buttons = [...element.querySelectorAll('button')].flatMap(button => { const r = button.getBoundingClientRect(), bs = getComputedStyle(button); if (!r.width || !r.height || bs.visibility === 'hidden' || bs.display === 'none') return []; let left = 0, right = innerWidth, top = 0, bottom = innerHeight; for (let parent = button.parentElement; parent; parent = parent.parentElement) { const pr = parent.getBoundingClientRect(), ps = getComputedStyle(parent); if (/auto|scroll|hidden|clip/.test(ps.overflowX)) { left = Math.max(left, pr.left); right = Math.min(right, pr.right); } if (/auto|scroll|hidden|clip/.test(ps.overflowY)) { top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom); } } const clipped = r.left < left - 0.5 || r.right > right + 0.5 || r.top < top - 0.5 || r.bottom > bottom + 0.5; const ix = Math.min(8, r.width / 4), iy = Math.min(8, r.height / 4); const points = [[r.x + r.width / 2, r.y + r.height / 2], [r.left + ix, r.top + iy], [r.right - ix, r.top + iy], [r.left + ix, r.bottom - iy], [r.right - ix, r.bottom - iy]].map(([x, y]) => { const found = document.elementFromPoint(x, y); return !!found && (found === button || button.contains(found)); }); return [{ label: button.getAttribute('aria-label') || button.textContent, width: r.width, height: r.height, clipped, painted: Number(bs.opacity) > 0 && points.every(Boolean), points }]; });
            return { overflow: document.documentElement.scrollWidth > innerWidth + 1, inside: rect.left >= -0.5 && rect.top >= -0.5 && rect.right <= innerWidth + 0.5 && rect.bottom <= innerHeight + 0.5, painted: Number(style.opacity) === 1 && !!hit && (element === hit || element.contains(hit)), buttons, finite: document.getAnimations().filter(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime)).length, fonts: document.fonts.status };
          };
          let last = '', stable = 0, value; const start = performance.now(); do { await new Promise(requestAnimationFrame); value = sample(); const signature = JSON.stringify(value); stable = signature === last ? stable + 1 : 1; last = signature; if (stable >= 4 && !value.finite && value.fonts === 'loaded') break; } while (performance.now() - start < 2500); return { ...value, stable };
        });
        row.layouts.push({ name, ...value }); check(layoutFailures(value).length === 0, name + ': painted steady layout with usable visible controls');
        const file = id + '-' + name + '.png'; await active().screenshot({ path: path.join(out, file) }); row.shots.push({ file, sha256: sha(fs.readFileSync(path.join(out, file))) });
        if (!report.controls.length) { const faulty = structuredClone(value); faulty.overflow = true; faulty.buttons.find(button => !button.clipped).height = 43; check(JSON.stringify(faulty) !== JSON.stringify(value), 'Copied geometry fault is effective'); assert.deepEqual(layoutFailures(faulty), ['overflow', 'controls']); assert.deepEqual(layoutFailures(value), []); report.controls.push({ id: 'geometry', failures: ['overflow', 'controls'], effective: true, baseline: value, faulty }); }
      }
      await page.locator('[data-watch-week-by-week]').click(); await active().waitFor();
      const gotIt = page.getByRole('button', { name: 'Got it', exact: true });
      await gotIt.waitFor({ timeout: 4000 });
      check((await active().textContent()).includes('A cup night'), 'Actual help includes a saved cup worked example before play');
      await gotIt.click();
      await active().getByRole('button', { name: /Kick off/ }).click();
      const clock = page.locator('[data-match-clock]');
      let leagueFiveScore = null, leagueFiveTable = null;
      for (let md = 1; md <= 5; md++) {
        const poster = active().getByRole('button', { name: new RegExp('^▶ (?:Matchday|League game) ' + md + '$') });
        if (await poster.count()) await poster.click();
        const results = active().getByRole('button', { name: 'Results', exact: true }); if (await results.getAttribute('aria-pressed') !== 'true') await results.click();
        const pass = active().getByRole('button', { name: /Let it play/ }); if (await pass.count()) await pass.click();
          await page.waitForFunction(md => document.querySelector('[data-matchday="' + md + '"] [data-match-clock]')?.getAttribute('data-minute') === '90', md, { timeout: 4000 }).catch(async error => {
          const passNow = active().getByRole('button', { name: /Let it play/ }); if (!await passNow.count()) throw error; await passNow.click(); await page.waitForFunction(() => document.querySelector('[data-match-clock]')?.getAttribute('data-minute') === '90', undefined, { timeout: 4000 });
        });
        check(await clock.getAttribute('data-score') !== null, 'League game ' + md + ' has an actual settled score');
        await heldRead('league-' + md);
        if (md === 5) { leagueFiveScore = await clock.getAttribute('data-score'); leagueFiveTable = await active().locator('[data-centre-table]').textContent(); check(await active().locator('[data-centre-next-cup]').getAttribute('data-centre-next-cup') === 'domestic:0', 'Next after actual fifth league game is domestic cup'); await capture('league-five'); await active().locator('[data-centre-next-cup]').click(); }
        else await active().getByRole('button', { name: new RegExp('^▶ (?:Matchday|League game) ' + (md + 1) + '$') }).click();
      }
      await active().locator('[data-centre-calendar-cup="domestic:0"]').waitFor();
      check(await active().locator('[data-calendar-cup-score]').count() === 0, 'Cup score waits for reveal');
      check(await page.locator('[data-fixture-cup="domestic:1"]').count() === 0, 'Next saved round is absent before result');
      await capture('cup-before'); await active().locator('[data-calendar-cup-reveal]').click();
      check(await active().locator('[data-calendar-cup-verdict]').textContent() === (early.won ? 'Through' : 'Out'), 'Cup result matches actual recorded outcome');
      const opening = run.opening;
      if (opening) { check((await active().locator('[data-calendar-cup-opponent]').textContent()).includes(opening.opp), 'Opening opponent is exactly saved'); check(await active().locator('[data-calendar-cup-score]').textContent() === opening.for + '-' + opening.against, 'Opening score is exactly saved'); check(await active().getByText(opening.home ? 'Home' : 'Away', { exact: true }).isVisible(), 'Opening venue is exactly saved'); }
      else check(await active().locator('[data-calendar-cup-score]').textContent() === 'Score not recorded', 'Old early-round bundle remains honestly missing');
      await heldRead('cup-revealed'); await capture('cup-result');
      check(await active().locator('[data-centre-table]').textContent() === leagueFiveTable, 'Cup result leaves the complete fifth-game league table held');
      if (width < 1000) await active().locator('[data-centre-fixtures]').click();
      const scoreParts = leagueFiveScore.split('-');
      check((await active().locator('[data-fixture-row="5"]:visible').textContent()).includes(scoreParts[0] + '-' + scoreParts[1]), 'Actual league-five fixture score stays held through cup reveal');
      if (fixture.id === 'advance') { check((await active().locator('[data-fixture-cup="domestic:1"]:visible [data-fixture-cup-opponent]').textContent()) === next.opp, 'Saved win adds exact next named opponent'); }
      else if (!early.won) check(await active().locator('[data-fixture-cup="domestic:1"]').count() === 0, 'Saved opening loss adds no later cup game');
      if (width < 1000) await active().getByRole('button', { name: '← Back', exact: true }).click();
      await active().locator('[data-calendar-cup-competition]').click();
      await page.locator('[data-centre-cup-bracket]').waitFor();
      check(await page.locator('[data-centre-cup-open]').count() === run.stages.length, 'Bracket contains exactly the actual saved route');
      await capture('bracket'); await heldRead('bracket');
      await active().locator('[data-centre-competition="league"]').click();
      await active().locator('[data-calendar-cup-continue]').click();
      const gameSix = active().getByRole('button', { name: /^▶ (?:Matchday|League game) 6$/ }); if (await gameSix.count()) await gameSix.click();
      await page.locator('[data-matchday="6"]').waitFor(); check(await active().locator('[data-centre-table]').count() > 0 || await active().getByText('Table', { exact: true }).count() > 0, 'League competition returns to its own table');
      await heldRead('league-six');
      await active().locator('[data-centre-exit]').click(); await page.locator('[data-watch-week-by-week]').waitFor();
      await heldRead('closed'); await page.reload({ waitUntil: 'networkidle' });
      const after = await bytes(), file = id + '-save-hold.json'; fs.writeFileSync(path.join(out, file), JSON.stringify({ before, after, originalFixture: fixture, beforeSha256: sha(before), afterSha256: sha(after) }, null, 2)); row.reloads.push({ file, beforeSha256: sha(before), afterSha256: sha(after) });
      check(after === before, 'Reload preserves whole raw career without replaying the season');
      check(row.errors.length === 0 && row.assets.length === 0, 'No application or local asset errors'); row.ok = true;
    } catch (error) { row.error = String(error); row.ok = false; } finally { await context.close(); }
  }
} finally { await browser.close(); server.kill(); report.sourceAfter = held.map(({ file }) => ({ file, sha256: sha(fs.readFileSync(file)) })); report.sourceHeld = held.every(({ file, bytes }) => fs.readFileSync(file).equals(bytes)); fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2)); }
console.log('Calendar native: ' + report.cases.length + ' cases, ' + report.checks + ' checks, ' + report.controls.length + ' effective copied observation control');
assert.equal(report.cases.length, 6); assert.equal(report.controls.length, 1); assert(report.cases.every(row => row.ok), JSON.stringify(report.cases.filter(row => !row.ok).map(row => ({ id: row.id, error: row.error })))); assert(report.sourceHeld);
