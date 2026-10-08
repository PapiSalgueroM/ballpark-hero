/* Round 1096: finite diagnosis, never a claim that a reported crash is fixed.
   Runs only in GitHub Actions. Locale is tested separately from synthetic
   replacement of text nodes. That replacement is not browser translation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Runtime is remote only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'soccer-create-crash-artifacts');
const PUBLIC = 'https://douknowball.com';
const EXPECTED_ENTRY = 'index-VAwtKqwh.js';
const EXPECTED_DEPLOYMENT = 'ac2187ef-3490-410e-b900-bc4b0484f1a6';
const EXPECTED_CAREER = 'SoccerCareer-CKD9vQWc.js';
const SAVE = 'soccerCareerSave';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (name, value) => {
  fs.mkdirSync(path.dirname(path.join(OUT, name)), { recursive: true });
  fs.writeFileSync(path.join(OUT, name), Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};
const manifest = directory => {
  const rows = [];
  const visit = relative => {
    for (const item of fs.readdirSync(path.join(ROOT, directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const next = path.join(relative, item.name);
      if (item.isDirectory()) visit(next);
      else if (item.isFile()) {
        const bytes = fs.readFileSync(path.join(ROOT, directory, next));
        rows.push({ path: `${directory}/${next.split(path.sep).join('/')}`, bytes: bytes.length, sha256: sha(bytes) });
      }
    }
  };
  visit(''); return rows;
};
const report = {
  started: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  expectedPublishedAK: { entry: EXPECTED_ENTRY, career: EXPECTED_CAREER, deployment: EXPECTED_DEPLOYMENT }, cases: [],
  limits: ['Fresh guest only, no user save is read.', 'All backend and report requests are fulfilled locally.',
    'pt-BR locale does not activate translation.', 'Synthetic detached text replacement preserves labels and is not an actual translator.',
    'This diagnostic does not establish a product fix, complete browser compatibility or the reporting visitor\'s exact cause.'],
};
write('report.json', report);
write('source-manifest.json', ['src', 'scripts', '.github'].flatMap(manifest));
const built = process.env.CREATE_CRASH_BUILT_READY === 'true' && fs.existsSync(path.join(ROOT, 'dist/index.html'));
if (built) write('dist-manifest.json', manifest('dist'));
else report.builtTarget = { status: 'skipped', reason: 'No completed dist build was available' };

let server, browser, serverLog = '';
const pending = new Set();
const remember = promise => {
  pending.add(promise); promise.finally(() => pending.delete(promise)); return promise;
};
const terminalError = error => ({ name: error.name, message: error.message, stack: error.stack });

async function capture(page, row, stage) {
  const state = await page.evaluate(() => {
    const dump = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => storage.key(i)).sort().map(key => [key, storage.getItem(key)]));
    return { url: location.href, localStorage: dump(localStorage), sessionStorage: dump(sessionStorage),
      bodyText: document.body.innerText, documentHTML: document.documentElement.outerHTML,
      language: navigator.language, htmlLanguage: document.documentElement.lang,
      scroll: { x: scrollX, y: scrollY }, viewport: { width: innerWidth, height: innerHeight },
      fonts: [...document.fonts].map(font => ({ family: font.family, weight: font.weight, style: font.style, status: font.status })),
      entry: document.querySelector('script[type="module"][src]')?.getAttribute('src') ?? null };
  });
  const filename = `${row.id}/${String(row.steps.length).padStart(2, '0')}-${stage}`;
  write(`${filename}.json`, state);
  await page.screenshot({ path: path.join(OUT, `${filename}.png`), fullPage: stage === 'failed' });
  row.steps.push({ stage, state: `${filename}.json`, screenshot: `${filename}.png`,
    savePresent: Object.hasOwn(state.localStorage, SAVE),
    boundary: state.bodyText.includes('This page broke') });
  write('report.json', report);
  return state;
}

async function mutateText(page, row, stage) {
  const mutation = await page.evaluate(() => {
    const root = document.getElementById('dukb-main');
    if (!root) return { count: 0, reason: 'No live game main' };
    const before = root.textContent;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode() && nodes.length < 200) {
      const node = walker.currentNode;
      if (/\p{L}/u.test(node.textContent ?? '') && !node.parentElement?.closest('script,style,svg,font,input,textarea,option')) nodes.push(node);
    }
    const changed = nodes.map(node => {
      const parent = node.parentElement;
      const original = node.textContent;
      const outer = document.createElement('font'), inner = document.createElement('font');
      outer.setAttribute('data-synthetic-text-replacement', '1096');
      inner.textContent = original; outer.appendChild(inner); parent.replaceChild(outer, node);
      return { parent: parent.tagName, original, detached: !node.isConnected, replacementConnected: outer.isConnected };
    });
    return { count: changed.length, visibleTextHeld: root.textContent === before, changed };
  });
  row.mutations.push({ stage, ...mutation }); write('report.json', report);
  assert(mutation.count > 0, `${stage}: replacement must change actual text nodes`);
  assert(mutation.visibleTextHeld && mutation.changed.every(item => item.detached && item.replacementConnected), `${stage}: effective detached-node replacement, labels held`);
}

async function choose(page, index, label) {
  await page.locator('#dukb-main [role="combobox"]').nth(index).tap();
  // The flag repeats the accessible name and its hidden fallback adds raw text.
  const exact = page.getByRole('option', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`) });
  await exact.waitFor({ state: 'visible' });
  assert.equal(await exact.count(), 1, `One option matches ${label}`);
  await exact.tap();
  await page.getByRole('listbox').waitFor({ state: 'hidden' });
}

async function runCase(target, spec, mode) {
  const row = { id: `${target.id}-${spec.id}-${mode.id}`, target: target.id, base: target.base, spec, mode,
    status: 'running', stage: 'open', steps: [], mutations: [], console: [], pageErrors: [], blockedRequests: [],
    requestFailures: [], responses: [], assets: [], navigation: [] };
  report.cases.push(row); write('report.json', report);
  const context = await browser.newContext({ locale: mode.locale, viewport: { width: 390, height: 844 },
    hasTouch: true, isMobile: true, deviceScaleFactor: 1, serviceWorkers: 'block', storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const jobs = [];
  page.on('console', message => jobs.push(remember((async () => {
    const args = await Promise.all(message.args().map(async handle => {
      try { return await handle.evaluate(value => value instanceof Error || value instanceof DOMException
        ? { name: value.name, message: value.message, stack: value.stack }
        : typeof value === 'object' && value !== null ? JSON.parse(JSON.stringify(value)) : String(value)); }
      catch (error) { return { unavailable: String(error) }; }
    }));
    row.console.push({ type: message.type(), text: message.text(), location: message.location(), args });
  })().catch(error => { row.console.push({ captureError: String(error) }); }))));
  page.on('pageerror', error => row.pageErrors.push(terminalError(error)));
  page.on('requestfailed', request => row.requestFailures.push({ url: request.url(), method: request.method(), error: request.failure() }));
  page.on('response', response => jobs.push(remember((async () => {
    const request = response.request(), url = new URL(response.url());
    const headers = await response.allHeaders();
    const entry = { url: response.url(), status: response.status(), resource: request.resourceType(),
      headers: Object.fromEntries(['x-deployment-id', 'date', 'etag', 'last-modified', 'cache-control', 'content-type', 'cf-cache-status']
        .filter(name => headers[name] !== undefined).map(name => [name, headers[name]])) };
    row.responses.push(entry);
    if (url.origin === target.base && ['document', 'script', 'stylesheet'].includes(request.resourceType())) {
      const bytes = await response.body(), hash = sha(bytes);
      const extension = request.resourceType() === 'document' ? 'html' : request.resourceType() === 'script' ? 'js' : 'css';
      const filename = `delivered/${hash}.${extension}`;
      if (!fs.existsSync(path.join(OUT, filename))) write(filename, bytes);
      row.assets.push({ ...entry, bytes: bytes.length, sha256: hash, file: filename });
    }
  })().catch(error => row.responses.push({ captureError: String(error), url: response.url() })))));
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    const backend = url.hostname.endsWith('.supabase.co') || /\/(auth\/v1|rest\/v1|functions\/v1)(\/|$)/.test(url.pathname);
    const reportHost = /(^|\.)formsubmit\.co$/.test(url.hostname);
    const writeRequest = !['GET', 'HEAD', 'OPTIONS'].includes(request.method());
    const allowedAsset = ['fonts.googleapis.com', 'fonts.gstatic.com', 'flagcdn.com'].includes(url.hostname);
    if (backend || reportHost || writeRequest || (url.origin !== target.base && !allowedAsset)) {
      row.blockedRequests.push({ method: request.method(), origin: url.origin, path: url.pathname, resource: request.resourceType(), backend, reportHost, writeRequest });
      return route.fulfill({ status: 200, contentType: request.resourceType() === 'script' ? 'application/javascript' : 'application/json', body: request.resourceType() === 'script' ? '' : '[]' });
    }
    return route.continue();
  });
  // Only a consent preference is seeded. Career storage begins empty and survives reload.
  await page.addInitScript(() => {
    if (!localStorage.getItem('cookie-consent')) localStorage.setItem('cookie-consent', 'essential');
  });
  const step = async (name, action) => { row.stage = name; await action(); return capture(page, row, name); };
  const replace = async stage => { if (mode.synthetic) await mutateText(page, row, stage); };
  try {
    const response = await page.goto(`${target.base}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    row.navigation.push({ url: response.url(), status: response.status(), deployment: await response.headerValue('x-deployment-id') });
    await page.locator('#pname').waitFor({ state: 'visible' });
    const fresh = await capture(page, row, 'fresh');
    assert(!Object.hasOwn(fresh.localStorage, SAVE), 'Fresh guest has no career save');
    if (target.id === 'published') row.publishedIdentity = { entry: fresh.entry,
      matchesKnownAKEntry: path.posix.basename(fresh.entry ?? '') === EXPECTED_ENTRY,
      matchesKnownAKDeployment: (row.navigation[0].deployment ?? '').split('.').includes(EXPECTED_DEPLOYMENT) };
    await replace('before-selects');
    await step('selects', async () => {
      await page.locator('#pname').fill('Create Diagnosis');
      await choose(page, 0, 'Brazil'); await choose(page, 1, spec.positionLabel); await choose(page, 2, spec.eraLabel);
    });
    await step('appearance', async () => {
      await page.getByRole('button', { name: /Hair$/ }).tap();
      await page.getByRole('button', { name: 'Buzz Cut', exact: true }).tap();
      await page.getByRole('button', { name: /Skin$/ }).tap();
      await page.getByRole('button', { name: 'Olive', exact: true }).tap();
    });
    await replace('before-generate');
    await step('generate', async () => {
      await page.getByRole('button', { name: /Generate Starting Potential/ }).tap();
      await page.getByRole('button', { name: /Roll again/ }).waitFor({ state: 'visible' });
    });
    await replace('before-reroll');
    await step('reroll', async () => {
      await page.getByRole('button', { name: /Roll again/ }).tap();
      await page.getByRole('button', { name: /Rolling/ }).waitFor({ state: 'visible' });
      await page.getByRole('button', { name: /Roll again/ }).waitFor({ state: 'visible' });
    });
    await replace('before-begin');
    const created = await step('begin', async () => {
      await page.getByRole('button', { name: /Begin Career/ }).tap();
      await page.waitForFunction(key => !!localStorage.getItem(key), SAVE);
    });
    const career = JSON.parse(created.localStorage[SAVE]);
    assert.equal(career.nationality, 'Brazil'); assert.equal(career.position, spec.position);
    assert.equal(career.era, spec.era); assert.equal(career.age, 16); assert.equal(career.phase, 'youth');
    assert.equal(career.appearance.hairstyle, 'buzz'); assert.equal(career.appearance.skinTone, 'olive');
    assert.equal(career.seasons.length, 1); assert.equal(career.seasons[0].year, spec.year);
    await replace('before-advance');
    const advanced = await step('advance', async () => {
      await page.locator('[data-career-action-bar]').getByRole('button', { name: 'Next Year', exact: true }).tap();
      await page.waitForFunction(key => { const raw = localStorage.getItem(key); return raw && JSON.parse(raw).age === 17; }, SAVE);
    });
    const next = JSON.parse(advanced.localStorage[SAVE]);
    assert.equal(next.seasons.length, 2); assert.equal(next.seasons[1].year, spec.year + 1);
    await step('reload', async () => {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForFunction(() => !!document.querySelector('#dukb-main h1')?.textContent?.includes('Create Diagnosis'));
    });
    const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE);
    assert.equal(restored.age, 17); assert.equal(restored.seasons.length, 2);
    assert.deepEqual(restored.seasons, next.seasons, 'Reload retains played season records');
    assert(!row.steps.some(item => item.boundary), 'Route boundary never appeared');
    assert.equal(row.pageErrors.length, 0, 'No uncaught page error');
    row.status = 'completed';
  } catch (error) {
    row.status = 'failed'; row.error = terminalError(error);
    try { await capture(page, row, 'failed'); } catch (failure) { row.captureError = terminalError(failure); }
  } finally {
    await Promise.allSettled(jobs);
    if (target.id === 'published' && row.publishedIdentity) row.publishedIdentity.matchesKnownAKCareer = row.assets.some(asset => path.posix.basename(new URL(asset.url).pathname) === EXPECTED_CAREER);
    row.boundaryErrors = row.console.filter(item => item.text?.includes('A page failed to render:'));
    if ((row.boundaryErrors.length || row.pageErrors.length) && row.status === 'completed') row.status = 'failed';
    row.outcome = row.boundaryErrors.length ? 'observed-route-error' : row.pageErrors.length ? 'observed-page-error'
      : row.status === 'completed' ? 'completed-ui-path' : 'incomplete-ui-path';
    row.finished = new Date().toISOString(); write(`${row.id}/result.json`, row); write('report.json', report);
    await context.close();
    console.log(JSON.stringify({ id: row.id, status: row.status, lastStage: row.stage, steps: row.steps.length,
      mutations: row.mutations.reduce((sum, item) => sum + item.count, 0), boundaryErrors: row.boundaryErrors.length, pageErrors: row.pageErrors.length }));
  }
}

try {
  const targets = [{ id: 'published', base: PUBLIC }];
  if (built) {
    server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4186'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', bytes => { serverLog += bytes; }); server.stderr.on('data', bytes => { serverLog += bytes; });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Owned server failed to become ready')), 15000);
      server.once('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}`)); });
      server.stdout.on('data', bytes => { if (String(bytes).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
    });
    targets.push({ id: 'built', base: 'http://127.0.0.1:4186' });
  }
  browser = await chromium.launch({ headless: true });
  report.browserVersion = browser.version();
  const specs = [
    { id: 'brazil-st-current', position: 'ST', positionLabel: 'Striker (ST)', era: '2025', eraLabel: 'Current era (2025 start)', year: 2025 },
    { id: 'brazil-gk-1990', position: 'GK', positionLabel: 'Goalkeeper (GK)', era: '1990-94', eraLabel: 'Early 90s (1990 start)', year: 1990 },
  ];
  const modes = [{ id: 'english', locale: 'en-US', synthetic: false }, { id: 'portuguese-locale', locale: 'pt-BR', synthetic: false },
    { id: 'synthetic-text-replacement', locale: 'pt-BR', synthetic: true }];
  report.plannedCases = targets.length * specs.length * modes.length;
  for (const target of targets) for (const spec of specs) for (const mode of modes) {
    try { await runCase(target, spec, mode); }
    catch (error) {
      const id = `${target.id}-${spec.id}-${mode.id}`;
      const row = report.cases.find(item => item.id === id) ?? { id, target: target.id, spec, mode };
      if (!report.cases.includes(row)) report.cases.push(row);
      row.status = 'failed'; row.infrastructureError = terminalError(error); write('report.json', report);
    }
  }
  assert.equal(report.cases.length, report.plannedCases, 'All finite scenarios ran');
} catch (error) {
  report.infrastructureError = terminalError(error);
} finally {
  await Promise.allSettled([...pending]);
  if (browser) await browser.close(); if (server) server.kill();
  report.finished = new Date().toISOString();
  report.completed = report.cases.filter(item => item.status === 'completed').length;
  report.failed = report.cases.filter(item => item.status !== 'completed').length;
  write('server.log', serverLog); write('report.json', report);
  console.log(`Soccer create diagnosis: ${report.completed}/${report.plannedCases ?? 0} complete; ${report.failed} failed. No product fix claimed.`);
  if (report.infrastructureError || report.failed || !report.plannedCases || report.cases.length !== report.plannedCases) process.exitCode = 1;
}
