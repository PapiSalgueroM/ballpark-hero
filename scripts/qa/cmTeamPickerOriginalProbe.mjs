import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import pw, { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  assert(i >= 0 && args[i + 1], 'missing ' + name);
  return args[i + 1];
}
const out = path.resolve(arg('--out'));
const dist = path.resolve(arg('--dist'));
const base = arg('--base-url').replace(/\/$/, '');
assert.equal(new URL(base).hostname, '127.0.0.1', 'completed local dist only');
fs.mkdirSync(path.join(out, 'bodies'), { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const marker = /["']data-cm-board-wants["']\s*:/;
const start = performance.now();
const requests = [], responses = [], failures = [], errors = [], blocked = [], frames = [];
const pending = new Set();
let phase = 'startup';
let sequence = 0;
let report;
const json = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ ...pw.devices['iPhone 13'] });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(base).origin) {
      assert(['GET', 'HEAD'].includes(request.method()), 'CM_TEAM_PICKER_NO_WRITE');
      return route.continue();
    }
    blocked.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), phase });
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push({ kind: 'pageerror', message: String(error), phase }));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('net::ERR_BLOCKED_BY_CLIENT')) errors.push({ kind: 'console', message: message.text(), phase });
  });
  const ids = new WeakMap();
  page.on('request', request => {
    const id = ++sequence; ids.set(request, id);
    requests.push({ id, url: request.url(), method: request.method(), resourceType: request.resourceType(), phase, at: performance.now() - start });
  });
  page.on('requestfailed', request => failures.push({ id: ids.get(request), url: request.url(), method: request.method(), error: request.failure(), phase }));
  page.on('response', response => {
    const work = (async () => {
      const url = new URL(response.url());
      if (url.origin !== new URL(base).origin) return;
      const request = response.request();
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (!rel.startsWith('assets/') || !/\.(?:js|css)$/.test(rel)) return;
      const body = await response.body();
      const local = path.resolve(dist, rel);
      assert(local.startsWith(dist + path.sep), 'asset escaped dist');
      assert.equal(response.status(), 200, 'actual compiled asset status');
      const expected = fs.readFileSync(local);
      assert(body.equals(expected), 'actual served body differs from completed dist');
      const digest = sha(body), stored = 'bodies/' + digest + path.extname(rel);
      const dest = path.join(out, stored);
      if (!fs.existsSync(dest)) fs.writeFileSync(dest, body);
      responses.push({
        id: ids.get(request), url: response.url(), path: rel, status: response.status(), headers: await response.allHeaders(),
        bytes: body.length, sha256: digest, gzipBytes: gzipSync(body).length, file: stored,
        teamImplementation: path.extname(rel) === '.js' && marker.test(body.toString('utf8')),
      });
    })().catch(error => errors.push({ kind: 'body', message: String(error), phase }));
    pending.add(work); void work.finally(() => pending.delete(work));
  });
  const drain = async () => {
    for (let turn = 0; pending.size && turn < 100; turn += 1) await Promise.all([...pending]);
    assert.equal(pending.size, 0, 'actual body reads must finish');
    assert.equal(errors.length, 0, 'page/asset/console errors are setup failures');
  };
  const sample = async label => {
    const value = await page.evaluate(() => ({
      url: location.href, html: document.documentElement.outerHTML, text: document.body.innerText,
      scroll: { x: scrollX, y: scrollY },
      local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
      session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
      rows: [...document.querySelectorAll('[data-cm-board-wants]')].map(row => ({ html: row.closest('button')?.outerHTML, demand: row.textContent })),
    }));
    const row = { label, phase, at: performance.now() - start, value };
    frames.push(row); return row;
  };
  const jsSet = idsIn => [...new Map(responses.filter(row => row.path.endsWith('.js') && idsIn.has(row.id)).map(row => [row.path, row])).values()].sort((a, b) => a.path.localeCompare(b.path));
  const navigation = await page.goto(base + '/club-manager', { waitUntil: 'load', timeout: 25000 });
  assert(navigation && navigation.status() === 200, 'actual route HTML');
  const rootHtml = await navigation.body();
  fs.writeFileSync(path.join(out, 'route.html'), rootHtml);
  await page.waitForTimeout(1500);
  const initialIds = new Set(requests.filter(row => new URL(row.url).origin === new URL(base).origin && /\/assets\/[^?]+\.js$/.test(row.url)).map(row => row.id));
  await drain();
  const initial = await sample('unchanged sweep load plus1500ms boundary');
  await page.waitForFunction(() => (document.getElementById('root')?.innerText ?? '').length > 200, null, { timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await drain();
  const settledIds = new Set(requests.map(row => row.id));
  const settled = await sample('actual drawn and network-quiet initial state');
  phase = 'consent';
  const consent = await answerConsent(page);
  await sample('actual consent answer before picker actions');
  phase = 'era';
  await page.getByText('2026-27', { exact: true }).click();
  await sample('actual current era and nation options');
  phase = 'nation';
  await page.getByText('England', { exact: true }).click();
  await sample('actual English league options');
  phase = 'league';
  await page.getByText('Premier League', { exact: true }).click();
  phase = 'team';
  await page.locator('[data-cm-board-wants]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await drain();
  const team = await sample('actual Team grid after League click');
  assert(team.value.rows.length > 0, 'real Team DOM required');
  assert.equal(team.value.local['dukb-club-manager-save'], undefined, 'selection does not create a career');
  phase = 'back';
  await page.getByRole('button', { name: /Premier League/ }).first().click();
  await page.getByText('Strongest sides:', { exact: false }).first().waitFor();
  const back = await sample('actual Back to League');
  phase = 'warm-team';
  const beforeWarm = requests.length;
  await page.getByText('Premier League', { exact: true }).click();
  await page.locator('[data-cm-board-wants]').first().waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await drain();
  const warm = await sample('actual warm Team revisit');
  assert.deepEqual(warm.value.rows, team.value.rows, 'warm complete row rendering held');
  assert.deepEqual(warm.value.local, team.value.local, 'read-only picker storage held');
  assert.deepEqual(warm.value.session, team.value.session, 'read-only picker session held');
  for (const request of requests.filter(row => new URL(row.url).origin === new URL(base).origin && /\/assets\/[^?]+\.(?:js|css)$/.test(row.url))) {
    assert.equal(responses.filter(row => row.id === request.id).length, 1, 'each actual asset request has one retained body');
  }
  assert.equal(failures.filter(row => new URL(row.url).origin === new URL(base).origin).length, 0, 'no local asset/transport failures');
  const initialFiles = jsSet(initialIds), settledFiles = jsSet(settledIds);
  const allFiles = jsSet(new Set(requests.map(row => row.id)));
  const teamBodies = allFiles.filter(row => row.teamImplementation);
  const validate = value => {
    assert(value.teamRows.length > 0, 'CM_TEAM_PICKER_BODY_RECEIPT_DOM');
    assert.equal(value.teamBodies.length, 1, 'CM_TEAM_PICKER_BODY_RECEIPT_ONE_EXECUTABLE');
    for (const body of value.teamBodies) {
      const found = value.responses.filter(row => row.id === body.id && row.sha256 === body.sha256 && row.file === body.file);
      assert.equal(found.length, 1, 'CM_TEAM_PICKER_BODY_RECEIPT');
      const bytes = fs.readFileSync(path.join(out, body.file));
      assert.equal(sha(bytes), body.sha256, 'CM_TEAM_PICKER_BODY_HASH');
      assert(marker.test(bytes.toString('utf8')), 'CM_TEAM_PICKER_EXECUTABLE_SHAPE');
    }
  };
  report = {
    status: 'MEASURED_ACTUAL_UI_AND_BODIES', route: '/club-manager',
    window: { goto: 'load', afterLoadWaitMs: 1500, device: 'iPhone 13' },
    routeHtml: { file: 'route.html', bytes: rootHtml.length, sha256: sha(rootHtml) },
    requests, responses, failures, blocked, errors, frames, consent, teamRows: team.value.rows, teamBodies,
    initialFiles, settledFiles, allFiles,
    initialTeamBodies: allFiles.filter(row => row.teamImplementation && settledFiles.some(file => file.path === row.path)),
    insideWindowTeamBodies: initialFiles.filter(row => row.teamImplementation),
    initialGzipBytes: initialFiles.reduce((sum, row) => sum + row.gzipBytes, 0),
    settledGzipBytes: settledFiles.reduce((sum, row) => sum + row.gzipBytes, 0),
    allGzipBytes: allFiles.reduce((sum, row) => sum + row.gzipBytes, 0),
    lateInitial: settledFiles.filter(row => !initialFiles.some(initialRow => initialRow.path === row.path)),
    warmNewJsRequests: requests.slice(beforeWarm).filter(row => /\/assets\/[^?]+\.js$/.test(row.url)),
    scope: 'Actual original measurement only; cold assertion belongs to Vitest after full RAW. No savings threshold, data or RNG override.',
  };
  validate(report);
  const copied = structuredClone(report), whole = JSON.stringify(copied);
  const index = copied.responses.findIndex(row => row.id === copied.teamBodies[0].id && row.sha256 === copied.teamBodies[0].sha256);
  assert(index >= 0); const [removed] = copied.responses.splice(index, 1);
  assert.notEqual(JSON.stringify(copied), whole, 'copied omission changed actual receipt');
  let owned = null;
  try { validate(copied); } catch (error) {
    assert.equal(error.name, 'AssertionError'); assert(String(error.message).includes('CM_TEAM_PICKER_BODY_RECEIPT')); owned = { name: error.name, message: error.message };
  }
  assert(owned, 'copied actual omission must fail same validator');
  copied.responses.splice(index, 0, removed);
  assert.equal(JSON.stringify(copied), whole, 'copied omission inverse');
  validate(copied);
  report.bodyControl = { changed: true, owned, wholeInverse: true, actualReceiptHeld: JSON.stringify(report) === whole };
  assert.equal(report.bodyControl.actualReceiptHeld, true);
  json('report.json', report);
  json('native.json', { exit: 0, status: 'MEASURED', source: 'actual Playwright HTTP/DOM, no body mocking' });
  console.log('CM Team-picker original actual bodies measured; cold ownership awaited in Vitest.');
  await context.close();
} finally {
  if (!report?.bodyControl) json('diagnostic.json', { requests, responses, failures, blocked, errors, frames });
  await browser.close();
}
