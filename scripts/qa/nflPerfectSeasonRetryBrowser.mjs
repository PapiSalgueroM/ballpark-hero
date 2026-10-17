// Remote production page with labelled fictional archive responses, no live database calls.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
assert(process.env.CI, 'Remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), BASE = process.env.BASE || process.env.SWEEP_BASE;
assert(BASE && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(BASE).hostname), 'Use the supplied loopback production server');
const OUT = path.resolve(ROOT, process.env.NFL_RETRY_BROWSER_OUT || 'nfl-retry-artifacts/browser');
assert(!fs.existsSync(OUT), 'Refuse to overwrite earlier browser evidence'); fs.mkdirSync(OUT, { recursive: true });
const stdio = ['stdout', 'stderr'].map(kind => {
  const stream = process[kind], original = stream.write;
  fs.writeFileSync(path.join(OUT, `${kind}.log`), '', { flag: 'wx' });
  stream.write = function (chunk, ...args) {
    fs.appendFileSync(path.join(OUT, `${kind}.log`), chunk, typeof args[0] === 'string' ? { encoding: args[0] } : undefined);
    return original.call(this, chunk, ...args);
  };
  return { kind, stream, original };
});
const hash = body => createHash('sha256').update(body).digest('hex'), copy = value => JSON.parse(JSON.stringify(value));
const put = (name, value) => { const body = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  const target = path.join(OUT, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, body); return { path: name, bytes: body.length, sha256: hash(body) }; };
const whole = body => { const bytes = Buffer.from(body), name = `bodies/${hash(bytes)}.bin`, target = path.join(OUT, name);
  if (fs.existsSync(target)) { assert(fs.readFileSync(target).equals(bytes)); return { path: name, bytes: bytes.length, sha256: hash(bytes) }; } return put(name, bytes); };
const sources = ['src/pages/PerfectSeasonNfl.tsx', 'src/lib/perfectSeasonNfl.ts', 'src/lib/perfectSeason.ts', 'src/lib/perfectSeasonExpansion.ts',
  'src/lib/fetchAllRows.ts', 'src/data/nflCoaches.ts', 'src/components/perfect-season/SeasonVerdict.tsx',
  'scripts/qa/nbaPerfectSeasonRetryBrowser.mjs', 'scripts/qa/nflPerfectSeasonRetryBrowser.mjs'];
const source = () => sources.map(file => ({ file, ...whole(fs.readFileSync(path.join(ROOT, file))) }));
const positions = ['QB', 'RB', 'WR', 'WR', 'TE', 'RB'];
const names = ['Retry Browser QB', 'Retry Browser RB', 'Retry Browser WR', 'Retry Browser WR Reserve', 'Retry Browser TE', 'Retry Browser Flex Reserve'];
const weeklySelect = 'player_id,player_display_name,player_name,position_group,week,attempts,passing_yards,passing_tds,interceptions,carries,rushing_yards,rushing_tds,receptions,receiving_yards,receiving_tds';
const fixture = {
  index: Array.from({ length: 420 }, (_, team) => ({ team_name: `NFL Retry Fixture Club ${team}`, abbr: `FXR${team}`, year: 2020 })),
  weekly: positions.flatMap((group, i) => Array.from({ length: 17 }, (_, week) => ({
    player_id: `FXP${i}`, player_display_name: names[i], player_name: names[i], position_group: group, week: week + 1,
    attempts: group === 'QB' ? 30 : 0, passing_yards: group === 'QB' ? 260 : 0, passing_tds: group === 'QB' ? 2 : 0, interceptions: group === 'QB' ? 1 : 0,
    carries: group === 'RB' ? 14 : 0, rushing_yards: group === 'RB' ? 70 : 0, rushing_tds: group === 'RB' ? 1 : 0,
    receptions: group === 'RB' ? 3 : group === 'WR' ? 5 : group === 'TE' ? 4 : 0,
    receiving_yards: group === 'RB' ? 20 : group === 'WR' ? 70 : group === 'TE' ? 50 : 0, receiving_tds: group === 'WR' || group === 'TE' ? 1 : 0,
  }))),
  defense: { ypg: 310, tdpg: 2, ints: 15, sacks: 40, def_rank: 16, rating: 75 },
};
const slotKeys = ['QB', 'RB', 'WR', 'WR2', 'TE', 'FLEX', 'DEF', 'HC'];
assert.equal(fixture.index.length, 420); assert.equal(fixture.weekly.length, 102);
assert.deepEqual([...new Set(fixture.weekly.map(row => row.position_group))], ['QB', 'RB', 'WR', 'TE']);
const report = { status: 'running', declarations: { widths: [390, 1280], cases: 2, captures: ['draft', 'failed-fetch', 'recovered-draft'], controls: ['no-reload-picks', 'layout'] },
  scope: 'Actual built NFL page draft/failure/retry only, eight slots and a 17-game season. Labelled fictional index, weekly offense and defense rows exercise the existing archive adapter. No real sports data or archive authority.',
  qualifications: ['External requests are fulfilled or aborted locally and retained. No production database or external font call is forwarded.',
    'Fonts are actual local/fallback fonts after document.fonts.ready, not downloaded web-font proof.',
    'The error screen hides the lineup. Pick preservation is measured after real Retry, with the original document nonce and complete before/after roster DOM.',
    'No game-state access through React internals and no page reload, route replacement or retry loop in the driver. One real Try again per journey.',
    'The real NFL adapter groups 102 weekly rows into six offense choices, adds its defense response and uses the existing generic coach fallback for synthetic team abbreviations.',
    'The component proof separately covers the complete eight-slot/17-game result and reroll boundaries. Browser journeys stop after two real picks.'],
  sourceBefore: [], fixture: put('fictional-archive.json', fixture), cases: [], controls: [], errors: [] };
const oneDocument = (documents, url) => documents.length === 1 && documents[0].index === 0
  && documents[0].request.url === url && documents[0].request.method === 'GET' && documents[0].request.resourceType === 'document'
  && documents[0].request.navigationRequest === true && documents[0].request.mainFrame === true && documents[0].request.owned === true
  && documents[0].response?.url === url && documents[0].response.status === 200 && documents[0].response.body && documents[0].response.built;
const recoveryFindings = value => [(value.beforeNonce !== value.afterNonce || value.beforeTimeOrigin !== value.afterTimeOrigin
  || !oneDocument(value.afterDocuments, value.documentUrl) || value.afterPerformance.length !== 1
  || value.afterPerformance[0].type !== 'navigate' || value.afterPerformance[0].name !== value.documentUrl) && 'no-reload',
  !value.afterRoster.includes(value.beforePick) && 'picks-held'].filter(Boolean);
const layoutFindings = value => [value.overflow && 'overflow', (!value.painted || value.ancestors.some(ancestor => ancestor.visibility !== 'visible' || ancestor.display === 'none')) && 'paint', Number(value.effectiveOpacity) !== 1 && 'opacity', !value.fonts.ready && 'fonts',
  value.rect.x < 0 || value.rect.right > value.viewport.width + 1 || value.rect.y < 0 || value.rect.bottom > value.viewport.height + 1 ? 'viewport' : false,
  value.stable < 4 && 'stable', value.finite !== 0 && 'animations', value.control && (value.rect.width < 44 || value.rect.height < 44) && 'target'].filter(Boolean);
function control(id, actual, mutate, reverse, detector, expected) {
  const row = { id, status: 'running', before: put(`controls/${id}-before.json`, actual) }; report.controls.push(row);
  assert.deepEqual(detector(actual), []); const fault = copy(actual); mutate(fault);
  row.fault = put(`controls/${id}-fault.json`, fault); assert.notDeepEqual(fault, actual); row.changed = true;
  row.findings = detector(fault); assert.deepEqual(row.findings, expected);
  reverse(fault, actual); row.undo = put(`controls/${id}-undo.json`, fault); assert.deepEqual(fault, actual);
  assert.equal(row.undo.sha256, row.before.sha256); assert.deepEqual(detector(fault), []); row.wholeUndo = true; row.status = 'pass';
}
let browser;
try {
  report.sourceBefore = source(); put('report.json', report);
  browser = await pw.chromium.launch({ headless: true });
  for (const width of report.declarations.widths) {
    const row = { width, status: 'running', requests: [], assets: [], scopes: [], navigations: [], documents: [], errors: [], console: [], captures: [], observations: [] }; report.cases.push(row); put('report.json', report);
    let failSquads = false, squadFailures = 0; const pending = new Set();
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 900 : 1000 }, reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: 'cookie-consent', value: 'essential' },
        { name: 'dukb-guest-handle', value: 'RetryFixture-18' }, { name: 'rules-gate-seen:/perfect-season-nfl', value: '1' }] }] } });
    await context.exposeBinding('__recordRetryScope', ({ frame }, value) => row.scopes.push({ ...value, frameUrl: frame.url() }));
    await context.addInitScript(origin => {
      const scope = { href: location.href, origin: location.origin, top: window === window.top, included: window === window.top && location.origin === origin };
      window.__retryScopeReady = window.__recordRetryScope(scope); if (!scope.included) return;
      window.__retryDocument = { nonce: crypto.randomUUID(), timeOrigin: performance.timeOrigin, draws: [] };
      const random = Math.random; Math.random = () => { const value = random(); window.__retryDocument.draws.push({ value, caller: new Error().stack }); return value; };
    }, new URL(BASE).origin);
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()); if (url.origin === new URL(BASE).origin) { await route.continue(); return; }
      const record = { url: url.href, method: request.method(), body: request.postData(), headers: await request.allHeaders(), stage: failSquads ? 'failed-squad' : 'healthy' }; row.requests.push(record);
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': record.headers['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
      try {
      if (url.hostname.endsWith('.supabase.co')) {
        assert.equal(url.hostname, 'flawuiqbvjobmkfkauhw.supabase.co', 'Fixture keeps the existing archive provider');
        if (request.method() === 'OPTIONS') { record.fixture = 'preflight'; await route.fulfill({ status: 204, headers: cors, body: '' }); return; }
        if (url.pathname === '/rest/v1/nfl_team_seasons') {
          assert.equal(request.method(), 'GET'); const query = url.searchParams;
          assert.equal(query.get('select'), 'team_name,abbr,year'); assert.deepEqual(query.getAll('year'), ['gte.1999', 'lte.2024']);
          assert.equal(query.get('order'), 'id.asc');
          const range = record.headers.range?.split('-').map(Number), from = range ? range[0] : Number(query.get('offset') || 0), limit = range ? range[1] - from + 1 : Number(query.get('limit'));
          assert.equal(from, 0); assert.equal(limit, 1000);
          const rows = fixture.index.slice(from, from + limit); record.fixture = 'fictional-index'; record.from = from;
          record.response = put(`${width}-request-${row.requests.length}.json`, rows);
          await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: fs.readFileSync(path.join(OUT, record.response.path)) }); return;
        }
        if (url.pathname === '/rest/v1/nflfastr_player_stats') {
          assert.equal(request.method(), 'GET'); const query = url.searchParams;
          assert.equal(query.get('select'), weeklySelect); assert.equal(query.get('season'), 'eq.2020');
          assert(/^eq\.FXR\d+$/.test(query.get('recent_team') || '')); assert.equal(query.get('season_type'), 'eq.REG'); assert.equal(query.get('limit'), '400');
          if (failSquads) {
            squadFailures++; record.fixture = 'labelled-fetch-failure';
            record.response = put(`${width}-request-${row.requests.length}-failure.json`, { code: 'FIXTURE_FETCH_FAILURE', message: 'Fictional test transport failure' });
            await route.fulfill({ status: 503, headers: cors, contentType: 'application/json', body: fs.readFileSync(path.join(OUT, record.response.path)) }); return;
          }
          const rows = fixture.weekly; assert.equal(rows.length, 102); record.fixture = 'fictional-squad';
          record.response = put(`${width}-request-${row.requests.length}.json`, rows);
          await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: fs.readFileSync(path.join(OUT, record.response.path)) }); return;
        }
        if (url.pathname === '/rest/v1/nfl_team_defense') {
          assert.equal(request.method(), 'GET'); const query = url.searchParams;
          assert.equal(query.get('select'), 'ypg,tdpg,ints,sacks,def_rank,rating');
          assert(/^eq\.FXR\d+$/.test(query.get('abbr') || '')); assert.equal(query.get('year'), 'eq.2020');
          assert.equal(record.headers.accept, 'application/json', 'Existing GET maybeSingle consumes a zero-or-one row array');
          assert.equal(failSquads, false, 'A failed weekly squad does not proceed to its defense query');
          record.fixture = 'fictional-defense'; record.response = put(`${width}-request-${row.requests.length}.json`, [fixture.defense]);
          await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: fs.readFileSync(path.join(OUT, record.response.path)) }); return;
        }
        record.fixture = 'empty read or recorded acknowledgement'; await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: request.method() === 'GET' ? '[]' : '{}' }); return;
      }
      record.fixture = 'aborted external, qualified fallback'; await route.abort();
      } catch (error) {
        record.fixture = 'fixture-contract-failure'; record.error = String(error.stack || error); row.errors.push(record.error);
        try { await route.abort('failed'); } catch (abortError) { record.abortError = String(abortError.stack || abortError); }
      }
    });
    const page = await context.newPage(); page.on('pageerror', error => row.errors.push(String(error.stack || error)));
    page.on('console', value => row.console.push({ type: value.type(), text: value.text() }));
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) row.navigations.push({ url: frame.url(), observedAt: Date.now() }); });
    // Raw frame events include same-document changes and remain complete diagnostics.
    const documentRequests = new Map(), requestMeta = request => ({ url: request.url(), method: request.method(), resourceType: request.resourceType(),
      navigationRequest: request.isNavigationRequest(), mainFrame: request.frame() === page.mainFrame(), owned: new URL(request.url()).origin === new URL(BASE).origin });
    page.on('request', request => {
      if (!request.isNavigationRequest() || request.resourceType() !== 'document' || request.frame() !== page.mainFrame()) return;
      const document = { index: row.documents.length, request: requestMeta(request), observedAt: Date.now(), response: null };
      row.documents.push(document); documentRequests.set(request, document);
    });
    page.on('response', response => { const request = response.request(), document = documentRequests.get(request);
      if (document) document.response = { url: response.url(), status: response.status(), observedAt: Date.now(), assetIndex: null, body: null, built: null };
      if (new URL(response.url()).origin !== new URL(BASE).origin) return;
      const asset = { url: response.url(), status: response.status(), request: requestMeta(request), documentIndex: document?.index ?? null }; row.assets.push(asset);
      if (document) document.response.assetIndex = row.assets.length - 1;
      const promise = (async () => { try {
        const body = await response.body(); asset.body = whole(body); assert.equal(response.status(), 200);
        const relative = decodeURIComponent(new URL(response.url()).pathname).replace(/^\/+/, ''), root = path.resolve(ROOT, 'dist'), file = path.resolve(root, relative || 'index.html');
        assert(file.startsWith(`${root}${path.sep}`)); const disk = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
        const built = fs.readFileSync(disk); assert(built.equals(body), 'Whole served response equals its actual production build body'); asset.built = { file: path.relative(ROOT, disk), ...whole(built) };
        if (document) { document.response.body = asset.body; document.response.built = asset.built; }
      } catch (error) { asset.error = String(error.stack || error); if (document) document.response.error = asset.error; } })();
      pending.add(promise); promise.finally(() => pending.delete(promise));
    });
    const state = async label => { while (pending.size) await Promise.all([...pending]); const value = await page.evaluate(async () => { await window.__retryScopeReady; return {
      document: window.__retryDocument, roster: document.querySelector('aside')?.outerHTML ?? null, publicMain: document.querySelector('main')?.outerHTML ?? null,
      rosterSlots: Array.from(document.querySelectorAll('aside > .space-y-1 > div'), cell => ({ slot: cell.firstElementChild?.textContent, text: cell.textContent })),
      href: location.href, scrollY, navigationEntries: performance.getEntriesByType('navigation').map(entry => ({ type: entry.type, name: entry.name })) };
    }); while (pending.size) await Promise.all([...pending]); value.documents = copy(row.documents); value.frameEvents = copy(row.navigations);
      row.observations.push({ label, record: put(`${width}-${label}.json`, value) }); return value; };
    const capture = async (target, name, isControl = false, screenshot = true) => {
      await target.waitFor({ state: 'visible' }); await target.scrollIntoViewIfNeeded(); await page.evaluate(() => document.fonts.ready);
      const geometry = await target.evaluate(async (element, isControl) => { let last, prior, stable = 0;
        for (let i = 0; i < 240; i++) { await new Promise(resolve => requestAnimationFrame(resolve)); const rect = element.getBoundingClientRect(), style = getComputedStyle(element), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          const ancestors = []; for (let node = element; node; node = node.parentElement) { const computed = getComputedStyle(node); ancestors.push({ tag: node.tagName, className: node.className, opacity: computed.opacity, visibility: computed.visibility, display: computed.display }); }
          last = { rect: rect.toJSON(), viewport: { width: innerWidth, height: innerHeight }, scrollY, painted: !!hit && element.contains(hit), opacity: style.opacity,
            ancestors, effectiveOpacity: ancestors.reduce((value, ancestor) => value * Number(ancestor.opacity), 1), control: isControl,
            overflow: document.documentElement.scrollWidth > innerWidth + 1, fonts: { ready: document.fonts.status === 'loaded', family: style.fontFamily, faces: Array.from(document.fonts, font => ({ family: font.family, status: font.status })) },
            finite: document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime)).length, html: element.outerHTML, text: element.innerText };
          const signature = JSON.stringify(last); stable = signature === prior ? stable + 1 : 1; prior = signature; if (stable >= 4 && last.finite === 0) break;
        } return { ...last, stable }; }, isControl);
      const captured = { name, geometry: put(`${width}-${name}-geometry.json`, geometry) }; row.captures.push(captured); assert.deepEqual(layoutFindings(geometry), []);
      if (screenshot) { const file = path.join(OUT, `${width}-${name}.png`); await page.screenshot({ path: file }); captured.png = { path: path.basename(file), bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)) }; } return geometry;
    };
    try {
      await page.goto(`${BASE}/perfect-season-nfl`, { waitUntil: 'domcontentloaded' });
      const classic = page.getByRole('button').filter({ has: page.getByText('Classic', { exact: true }) }); await classic.waitFor({ timeout: 45000 }); await classic.click();
      await page.getByRole('button', { name: 'Spin the wheel', exact: true }).click();
      const qb = page.getByRole('button', { name: /Retry Browser QB(?:\s|$)/ }); await qb.waitFor(); await qb.click();
      const before = await state('earlier-pick'); assert(before.roster.includes('Retry Browser QB') && before.roster.includes('7 slots to fill'));
      assert.deepEqual(before.rosterSlots.map(cell => cell.slot), slotKeys);
      assert(oneDocument(before.documents, before.href)); assert.deepEqual(before.navigationEntries, [{ type: 'navigate', name: before.href }]);
      await capture(page.locator('aside'), 'draft'); failSquads = true;
      await page.getByRole('button', { name: 'Next spin', exact: true }).click();
      const error = page.getByText("Couldn't reach the football archives.", { exact: true }); await error.waitFor();
      assert.equal(squadFailures, 6);
      const failedRequests = row.requests.filter(request => request.fixture === 'labelled-fetch-failure');
      assert.equal(failedRequests.length, 6); assert(failedRequests.every(request => request.method === 'GET' && new URL(request.url).pathname === '/rest/v1/nflfastr_player_stats'));
      assert.equal(row.requests.filter(request => request.stage === 'failed-squad' && request.fixture === 'fictional-defense').length, 0);
      row.failedFetchProof = put(`${width}-six-failed-squad-requests.json`, failedRequests);
      const failed = await state('failed-fetch'); assert.equal(failed.document.nonce, before.document.nonce);
      assert.equal(failed.document.timeOrigin, before.document.timeOrigin); assert(oneDocument(failed.documents, before.href)); assert.deepEqual(failed.navigationEntries, before.navigationEntries);
      await capture(error.locator('..'), 'failed-fetch'); const retryTarget = await capture(page.getByRole('button', { name: 'Try again', exact: true }), 'retry-target', true, false);
      const indexRequests = row.requests.filter(request => request.fixture === 'fictional-index').length;
      failSquads = false; await page.getByRole('button', { name: 'Try again', exact: true }).click();
      const rb = page.getByRole('button', { name: /Retry Browser RB(?:\s|$)/ }); await rb.waitFor(); assert(await rb.isEnabled());
      assert(await page.getByRole('button', { name: /Retry Browser QB(?:\s|$)/ }).isDisabled(), 'Earlier name stays used on the recovered squad');
      assert(await page.getByRole('button', { name: /NFL Retry Fixture Club \d+ Defense/ }).isEnabled());
      assert(await page.getByRole('button', { name: /The Coordinator Committee/ }).isEnabled(), 'Synthetic team uses the actual generic coach fallback');
      const recovered = await state('recovered-draft');
      const witness = { beforeNonce: before.document.nonce, afterNonce: recovered.document.nonce, beforeTimeOrigin: before.document.timeOrigin, afterTimeOrigin: recovered.document.timeOrigin,
        documentUrl: before.href, afterDocuments: copy(recovered.documents), afterPerformance: copy(recovered.navigationEntries), afterNavigations: copy(recovered.frameEvents), beforePick: 'Retry Browser QB', afterRoster: recovered.roster };
      row.recovery = put(`${width}-recovery-witness.json`, witness); assert.deepEqual(recoveryFindings(witness), []);
      assert.equal(row.requests.filter(request => request.fixture === 'fictional-index').length, indexRequests, 'Retry uses the held wheel, not a new boot');
      assert.deepEqual(recovered.rosterSlots.map(cell => cell.slot), slotKeys);
      assert.equal(row.requests.filter(request => request.fixture === 'fictional-squad').length, 2);
      assert.equal(row.requests.filter(request => request.fixture === 'fictional-defense').length, 2);
      await rb.click(); await page.getByRole('button', { name: 'RB', exact: true }).click();
      const picked = await state('recovered-second-pick'); assert(picked.roster.includes('Retry Browser QB') && picked.roster.includes('Retry Browser RB') && picked.roster.includes('6 slots to fill'));
      assert.deepEqual(picked.rosterSlots.map(cell => cell.slot), slotKeys);
      assert.equal(picked.document.nonce, before.document.nonce); assert.equal(picked.document.timeOrigin, before.document.timeOrigin);
      assert(oneDocument(picked.documents, before.href)); assert.deepEqual(picked.navigationEntries, before.navigationEntries); await capture(page.locator('aside'), 'recovered-draft');
      if (width === 390) {
        control('no-reload-picks', witness, value => { value.afterNonce += '-copied-fault'; value.afterDocuments.push({ ...copy(value.afterDocuments[0]), index: value.afterDocuments.length, copiedFault: true });
          value.afterNavigations.push({ url: 'labelled copied navigation only' }); value.afterRoster = ''; }, (value, original) => {
          assert.equal(value.afterNonce, `${original.afterNonce}-copied-fault`); assert.equal(value.afterRoster, '');
          assert.deepEqual(value.afterDocuments.at(-1), { ...copy(original.afterDocuments[0]), index: original.afterDocuments.length, copiedFault: true }); assert.equal(value.afterDocuments.length, original.afterDocuments.length + 1);
          assert.deepEqual(value.afterNavigations.at(-1), { url: 'labelled copied navigation only' }); assert.equal(value.afterNavigations.length, original.afterNavigations.length + 1);
          value.afterNonce = value.afterNonce.slice(0, -'-copied-fault'.length); value.afterDocuments.pop(); value.afterNavigations.pop(); value.afterRoster = original.afterRoster;
        }, recoveryFindings, ['no-reload', 'picks-held']);
        control('layout', retryTarget, value => { value.overflow = true; value.painted = false; value.ancestors[0].opacity = '0'; value.effectiveOpacity = 0;
          value.fonts.ready = false; value.rect.x = -1; value.stable = 3; value.finite = 1; value.rect.height = 43; }, (value, original) => {
          assert.equal(value.overflow, true); assert.equal(value.painted, false); assert.equal(value.ancestors[0].opacity, '0'); assert.equal(value.effectiveOpacity, 0);
          assert.equal(value.fonts.ready, false); assert.equal(value.rect.x, -1); assert.equal(value.stable, 3); assert.equal(value.finite, 1); assert.equal(value.rect.height, 43);
          value.overflow = original.overflow; value.painted = original.painted; value.ancestors[0].opacity = original.ancestors[0].opacity; value.effectiveOpacity = original.effectiveOpacity;
          value.fonts.ready = original.fonts.ready; value.rect.x = original.rect.x; value.stable = original.stable; value.finite = original.finite; value.rect.height = original.rect.height;
        }, layoutFindings, ['overflow', 'paint', 'opacity', 'fonts', 'viewport', 'stable', 'animations', 'target']);
      }
      row.status = 'pass'; console.log(`PASS NFL retry ${width}: one real Retry, original document and both actual drafted picks held`);
    } catch (error) { row.status = 'fail'; row.error = String(error.stack || error); report.errors.push({ width, error: row.error });
      try { row.failureState = put(`${width}-failure-state.json`, await state('failure')); const file = path.join(OUT, `${width}-failure.png`); await page.screenshot({ path: file }); row.failurePng = whole(fs.readFileSync(file)); }
      catch (error) { row.failureCaptureError = String(error.stack || error); }
    } finally {
      while (pending.size) await Promise.all([...pending]); await context.close(); while (pending.size) await Promise.all([...pending]);
      if (row.errors.length || row.assets.some(asset => asset.error)) { row.status = 'fail'; report.errors.push({ width, pageErrors: copy(row.errors), assetErrors: row.assets.filter(asset => asset.error) }); }
      if (!oneDocument(row.documents, `${BASE}/perfect-season-nfl`)) { row.status = 'fail'; report.errors.push({ width, documentRequests: copy(row.documents) }); }
      put('report.json', report);
    }
  }
  assert.equal(report.cases.length, 2); assert(report.cases.every(row => row.status === 'pass'));
  assert.deepEqual(report.controls.map(row => row.id), ['no-reload-picks', 'layout']); assert(report.controls.every(row => row.status === 'pass'));
  assert.equal(report.errors.length, 0); report.status = 'pass';
} catch (error) { report.status = 'fail'; report.errors.push({ fatal: String(error.stack || error) }); }
finally {
  if (browser) try { await browser.close(); } catch (error) { report.status = 'fail'; report.errors.push({ browserClose: String(error.stack || error) }); }
  try { report.sourceAfter = source(); assert.deepEqual(report.sourceAfter, report.sourceBefore); }
  catch (error) { report.status = 'fail'; report.errors.push({ sourceHold: String(error.stack || error) }); }
  put('report.json', report);
}
console.log(`NFL retry browser: ${report.cases.filter(row => row.status === 'pass').length}/2 actual production journeys.`);
console.log(`NFL retry browser controls: ${report.controls.filter(row => row.status === 'pass').length}/2 effective copied controls.`);
console.log(`NFL retry originals, public state, requests and full draw callers: ${OUT}`);
console.log(`${report.status === 'pass' ? 'PASS' : 'FAIL'} NFL Perfect Season retry browser`);
if (report.status !== 'pass') console.error(JSON.stringify(report.errors, null, 2));
report.stdio = Object.fromEntries(stdio.map(({ kind }) => { const body = fs.readFileSync(path.join(OUT, `${kind}.log`)); return [kind, { path: `${kind}.log`, bytes: body.length, sha256: hash(body) }]; }));
put('report.json', report);
for (const { stream, original } of stdio) stream.write = original;
if (report.status !== 'pass') process.exitCode = 1;
