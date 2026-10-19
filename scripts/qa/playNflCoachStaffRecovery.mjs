import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '../lib/playwrightLoader.mjs';

const base = 'http://127.0.0.1:4173';
const mode = process.argv[2], artifactRoot = process.env.NFL_COACH_OUT;
assert(['baseline', 'fixed'].includes(mode), 'Explicit source arm');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Ordinary offline transport inherited');
assert(artifactRoot && path.isAbsolute(artifactRoot), 'External evidence root');
assert(path.relative(process.cwd(), artifactRoot).split(path.sep).includes('..'), 'Evidence outside source');
const out = path.join(artifactRoot, 'browser'); assert(!fs.existsSync(out)); fs.mkdirSync(out);
const hash = body => createHash('sha256').update(body).digest('hex');
const originals = ['src/lib/usCoachCareer.ts', 'src/components/us-career/CoachCareerPanel.tsx'].map(file => ({ file, original: execFileSync('git', ['show', `775564305e9da84dab59f2b9fe246d044a3cc8e9:${file}`]), actual: fs.readFileSync(file) }));
assert.equal(originals.every(row => row.original.equals(row.actual)), mode === 'baseline', 'Built journey uses its declared source arm');
const fixtureFile = path.join(artifactRoot, 'unit/fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
assert(fixtures.fresh?.c?.retired && fixtures.fresh.coach === null && fixtures.fresh.phase === 'retired');
assert(fixtures.freshCoach?.sport === 'nfl' && fixtures.freshCoach.offers.length === 0);
assert(fixtures.stranded?.coach?.profile?.seasonsOut === 3 && fixtures.stranded.coach.offers.length === 0);
assert(fixtures.done?.coach?.done === true);
const cache = new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'))).map(row => {
  const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, row.file)); assert.equal(hash(body), row.sha256);
  return [row.url, { body, contentType: row.contentType }];
}));
const emptyImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV0sAAAAASUVORK5CYII=', 'base64');
const specs = [390, 1280].flatMap(width => ['fresh', 'stranded', 'done'].map(kind => ({ width, kind, sport: 'nfl', saved: fixtures[kind] })))
  .concat(['nba', 'mlb', 'nhl'].map(sport => ({ width: 390, kind: 'nonNfl', sport, saved: fixtures.nonNfl[sport] })));
const report = { version: 1, mode, fixtureSha256: hash(fs.readFileSync(fixtureFile)), source: originals.map(row => ({ file: row.file, original: hash(row.original), actual: hash(row.actual) })), scope: 'Actual built routes, generated fictional saved careers, Chromium mouse and keyboard. No live service data.', productQualified: false, cases: [], status: 'failed' };
const browser = await chromium.launch({ headless: true });
try {
  for (const spec of specs) {
    const routePath = `/${spec.sport}-my-career`, saveKey = `${spec.sport}-my-career-save-v1`, raw = JSON.stringify(spec.saved);
    const row = { width: spec.width, kind: spec.kind, sport: spec.sport, requests: [], externalFulfilled: [], writes: [], errors: [], assets: [], screenshots: [], status: 'failed' }; report.cases.push(row);
    const context = await browser.newContext({ viewport: { width: spec.width, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: [
      { name: 'cookie-consent', value: 'essential' }, { name: `rules-gate-seen:${routePath}`, value: '1' }, { name: saveKey, value: raw },
    ] }] } });
    const pending = [];
    let page;
    try {
      await context.addInitScript(() => { Math.random = () => 0.5; });
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()); row.requests.push({ url: url.href, method: request.method() });
        try {
          if (url.origin === base) { assert.equal(request.method(), 'GET', 'No same-origin write'); return await route.continue(); }
          row.externalFulfilled.push(url.href);
          if (cache.has(url.href)) return await route.fulfill({ status: 200, ...cache.get(url.href) });
          assert.notEqual(request.resourceType(), 'font', 'Every requested font has its verified cache body');
          if (request.method() !== 'GET') row.writes.push({ url: url.href, method: request.method(), body: request.postData() });
          if (request.resourceType() === 'image') return await route.fulfill({ status: 200, contentType: 'image/png', body: emptyImage });
          if (request.resourceType() === 'script') return await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
          if (request.resourceType() === 'stylesheet') return await route.fulfill({ status: 200, contentType: 'text/css', body: '' });
          return await route.fulfill({ status: 200, contentType: 'application/json', body: url.pathname.startsWith('/auth/') ? '{}' : '[]' });
        } catch (error) { row.errors.push(`Route: ${String(error?.stack ?? error)}`); try { await route.abort('failed'); } catch {} }
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => row.errors.push(`Page: ${error.message}`));
      page.on('console', message => { if (message.type() === 'error') row.errors.push(`Console: ${message.text()}`); });
      page.on('response', response => {
        if (new URL(response.url()).origin !== base) return;
        pending.push((async () => {
          assert.equal(response.status(), 200, response.url());
          const body = await response.body(), pathname = new URL(response.url()).pathname;
          const relative = pathname.endsWith('/') ? pathname + 'index.html' : path.extname(pathname) ? pathname : pathname + '/index.html';
          const physical = path.join(process.cwd(), 'dist', decodeURIComponent(relative));
          assert.equal(hash(body), hash(fs.readFileSync(physical)), 'Every actual local response matches completed physical dist');
          row.assets.push({ path: pathname, bytes: body.length, sha256: hash(body) });
        })().catch(error => { row.errors.push(`Response: ${String(error?.stack ?? error)}`); }));
      });
      const button = name => page.getByRole('button', { name, exact: typeof name === 'string' });
      const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
      const waitCoach = expected => page.waitForFunction(({ key, expected }) => { const value = JSON.parse(localStorage.getItem(key)); return value?.coach?.year === expected.year && value.coach.results.length === expected.results; }, { key: saveKey, expected });
      const shot = async name => {
        const file = `${spec.sport}-${spec.kind}-${spec.width}-${name}.png`;
        await page.screenshot({ path: path.join(out, file), fullPage: true }); row.screenshots.push(file);
        if (['empty-hub', 'staff-job', 'staff-season'].includes(name)) {
          const viewportFile = `${spec.sport}-${spec.kind}-${spec.width}-${name}-viewport.png`;
          await page.screenshot({ path: path.join(out, viewportFile), fullPage: false }); row.screenshots.push(viewportFile);
        }
      };
      await page.goto(base + routePath);
      if (spec.kind === 'fresh') {
        await button('Go after a coaching job').waitFor(); await shot('retired'); await button('Go after a coaching job').click();
        await button(`Sit out the ${fixtures.freshCoach.year} season`).waitFor();
        assert.deepEqual((await read()).coach, fixtures.freshCoach, 'Retirement reaches the real no-offer engine state');
      } else if (spec.kind === 'done') await page.getByRole('heading', { name: 'Coaching career complete', exact: true }).waitFor();
      else await button(`Sit out the ${spec.saved.coach.year} season`).waitFor();
      const before = await read(); row.before = before;
      assert(before.c.retired && before.c.name === spec.saved.c.name, 'Actual retired fictional playing career loaded');
      if (spec.kind !== 'fresh') assert.deepEqual(before.coach, spec.saved.coach, 'JSON-restored coaching state is held before action');
      assert.deepEqual(row.writes, [], 'Restoring and entering coaching does not record a fresh playing finish');
      if (spec.kind === 'done') {
        assert.equal(await button('Take a staff role').count(), 0); assert.equal(await button(/^Sit out the /).count(), 0); assert.equal(await button(/^Coach the /).count(), 0);
        await button(/The Market/).click(); assert.equal(await button('Take a staff role').count(), 0);
        assert(await page.getByText('You retired from coaching, so nobody is calling now.', { exact: true }).isVisible());
        assert.deepEqual(await read(), before, 'Reviewing a completed coaching career changes no saved field'); await shot('closed-market');
      } else if (spec.kind === 'nonNfl') {
        assert.equal(await button('Take a staff role').count(), 0, 'Other sports gain no NFL action');
        await button(/The Market/).click(); assert.equal(await button('Take a staff role').count(), 0);
        assert.deepEqual(await read(), before, 'Other-sport market review leaves its exact envelope held'); await shot('unchanged-market');
      } else {
        assert.equal(before.coach.unemployed, true); assert.equal(before.coach.job, null); assert.deepEqual(before.coach.offers, []);
        assert.equal(await button(/^Coach the /).count(), 0);
        row.missingRecovery = await button('Take a staff role').count() === 0;
        assert.equal(row.missingRecovery, mode === 'baseline', 'Declared source arm has the observed missing or present recovery action');
        const emptyCopy = mode === 'fixed' ? 'No automatic offers right now. You can take a staff role or wait for another opening.' : before.coach.offerNote || 'Nothing on the table right now.';
        if (mode === 'fixed') assert(await page.getByText(emptyCopy, { exact: true }).isVisible(), 'The hub explains both available choices');
        await shot('empty-hub'); await button(/The Market/).click();
        assert(await page.getByText(emptyCopy, { exact: true }).isVisible(), 'The actual market confirms the empty offer feed');
        assert.deepEqual(await read(), before, 'Opening the market does not repair or advance the saved state'); await shot('empty-market');
        await button('‹ Back').click(); await button(`Sit out the ${before.coach.year} season`).waitFor();
        if (mode === 'baseline') {
          await button(`Sit out the ${before.coach.year} season`).click(); await waitCoach({ year: before.coach.year + 1, results: before.coach.results.length + 1 });
          const after = await read(); row.after = after;
          assert.equal(after.coach.unemployed, true); assert.equal(after.coach.job, null); assert.deepEqual(after.coach.offers, []);
          assert.equal(after.coach.profile.seasonsOut, before.coach.profile.seasonsOut + 1);
          assert.equal(after.coach.profile.seasonsCoached, before.coach.profile.seasonsCoached); assert.equal(after.coach.results.at(-1).role, 'No job');
          assert.deepEqual(after.c, before.c, 'Sitting out keeps the retired playing career');
          assert.equal(await button('Take a staff role').count(), 0); await shot('still-no-path');
        } else {
          const take = button('Take a staff role'); await take.waitFor(); await take.click();
          await button(`Coach the ${before.coach.year} season`).waitFor();
          const employed = await read(); row.employed = employed;
          assert.equal(employed.coach.unemployed, false); assert.equal(employed.coach.job.tier, 4); assert.equal(employed.coach.job.seasonsHere, 0);
          assert.equal(employed.coach.year, before.coach.year); assert.deepEqual(employed.coach.results, before.coach.results); assert.deepEqual(employed.coach.offers, []);
          assert.deepEqual(employed.coach.profile, { ...before.coach.profile, seasonsOut: 0 }); assert.deepEqual(employed.c, before.c);
          assert.equal(await button('Take a staff role').count(), 0); await shot('staff-job');
          await page.reload(); await button(`Coach the ${before.coach.year} season`).waitFor(); assert.deepEqual(await read(), employed, 'Staff acceptance survives the real route reload');
          await button(`Coach the ${before.coach.year} season`).click(); await waitCoach({ year: employed.coach.year + 1, results: employed.coach.results.length + 1 });
          const played = await read(); row.after = played;
          assert.equal(played.coach.profile.seasonsCoached, employed.coach.profile.seasonsCoached + 1);
          const last = played.coach.results.at(-1); assert.equal(last.year, employed.coach.year); assert.equal(last.tier, 4); assert.equal(last.team, employed.coach.job.team); assert.equal(last.role, employed.coach.job.role); assert.equal(last.wins + last.losses + last.otl, 17);
          assert.deepEqual(played.c, before.c, 'An actual staff season leaves the playing record held'); await shot('staff-season');
          await page.reload(); await page.getByText(`Coach ${played.c.name}`, { exact: false }).waitFor(); assert.deepEqual(await read(), played, 'Played staff season persists without a duplicate season');
        }
      }
      await Promise.all(pending); assert(row.assets.length > 5, 'Actual application and lazy assets loaded');
      assert.deepEqual(row.errors, []); assert.deepEqual(row.writes, [], 'Every journey stays free of external application writes');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Route fits the declared viewport');
      row.status = 'passed';
    } catch (error) { row.failure = String(error?.stack ?? error); throw error; }
    finally { await context.close(); }
  }
  report.observedDeadEnds = report.cases.filter(row => row.missingRecovery).length;
  assert.equal(report.cases.length, 9); assert.equal(report.observedDeadEnds, mode === 'baseline' ? 4 : 0);
  report.status = 'passed';
  console.log(`NFL staff recovery browser: ${mode}, nine actual-route journeys, ${report.observedDeadEnds} observed missing recovery actions.`);
  console.log('NFL staff recovery browser: phone and desktop, restored idle coach, closed retirement and three unchanged other-sport markets.');
} finally {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
