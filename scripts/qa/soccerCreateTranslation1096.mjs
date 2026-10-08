/* Round 1096: bounded creator and actual TextWithFlags regression.
   Remote only. Uses the unchanged Round 1140 translator, never public traffic. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Runtime is remote only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PARENT = process.env.QA_PARENT_ROOT;
assert(PARENT && path.isAbsolute(PARENT) && fs.existsSync(path.join(PARENT, 'dist/index.html')), 'Actual built guard-only parent required');
const OUT = path.join(ROOT, 'soccer-create-translation-artifacts');
const SAVE = 'soccerCareerSave';
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (name, value) => {
  fs.mkdirSync(path.dirname(path.join(OUT, name)), { recursive: true });
  fs.writeFileSync(path.join(OUT, name), Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};
const source = fs.readFileSync(path.join(ROOT, 'scripts/playTranslatedPage.mjs'));
assert(source.equals(fs.readFileSync(path.join(PARENT, 'scripts/playTranslatedPage.mjs'))), 'F harness unchanged between sources');
assert(fs.readFileSync(path.join(ROOT, 'src/lib/translateGuard.ts')).equals(fs.readFileSync(path.join(PARENT, 'src/lib/translateGuard.ts'))), 'Actual guard unchanged between sources');
const fText = source.toString('utf8');
const start = 'function pageInit(cfg) {';
const end = '\n/* ------------------------------------------------------------------ *\n * Node side:';
assert.equal(fText.split(start).length, 2, 'Unique F pageInit start');
assert.equal(fText.split(end).length, 2, 'Unique F pageInit end');
const from = fText.indexOf(start), to = fText.indexOf(end, from);
assert(to > from && fText.slice(from, to).trimEnd().endsWith('}'), 'Complete F initializer extracted');
const initBytes = source.subarray(Buffer.byteLength(fText.slice(0, from)), Buffer.byteLength(fText.slice(0, to)));
assert.equal(initBytes.toString('utf8'), fText.slice(from, to), 'Exact initializer bytes retained and injected');
write('f-pageInit.js', initBytes);
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  parent: fs.readFileSync(path.join(OUT, 'parent-head.txt'), 'utf8').trim(),
  fHarnessSha256: sha(source), fPageInitSha256: sha(initBytes), cases: [],
  limits: ['Synthetic F translator, not an actual translation service.', 'Guard-off creator scope stops at Begin.',
    'Changing creator copy outside the three select fields is recorded, not claimed repaired.',
    'TextWithFlags fixture imports the actual component and guard from each held source.', 'All backend, report and external requests are fulfilled locally.'] };
write('report.json', report);
function manifest(root, directory) {
  const rows = [];
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(root, directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const next = path.join(relative, entry.name);
      if (entry.isDirectory()) visit(next);
      else if (entry.isFile()) { const bytes = fs.readFileSync(path.join(root, directory, next)); rows.push({ path: `${directory}/${next.split(path.sep).join('/')}`, bytes: bytes.length, sha256: sha(bytes) }); }
    }
  }
  visit(''); return rows;
}
const targets = [{ id: 'parent', root: PARENT, base: 'http://127.0.0.1:4186' }, { id: 'candidate', root: ROOT, base: 'http://127.0.0.1:4187' }];
for (const target of targets) {
  write(`${target.id}-source-manifest.json`, ['src', 'scripts', '.github'].flatMap(dir => manifest(target.root, dir)));
  write(`${target.id}-dist-manifest.json`, manifest(target.root, 'dist'));
}
const servers = [], captureJobs = [];
let browser;
const err = error => ({ name: error.name, message: error.message, stack: error.stack });
const plain = text => text.replace(/[«»]/g, '').replace(/\s+/g, ' ').trim();

async function capture(page, row, stage) {
  const state = await page.evaluate(() => {
    const w = window.__walk;
    const dump = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => storage.key(i)).sort().map(key => [key, storage.getItem(key)]));
    const scope = document.getElementById('dukb-main') || document.getElementById('fixture-output');
    return { url: location.href, localStorage: dump(localStorage), sessionStorage: dump(sessionStorage),
      bodyText: document.body.innerText, documentHTML: document.documentElement.outerHTML,
      entry: document.querySelector('script[type="module"][src]')?.getAttribute('src'), guardOn: Node.prototype.__dukbTranslateGuard === true,
      translation: { started: w?.simStarted, count: w?.simCount, moved: w?.moved ?? [],
        detached: [...document.querySelectorAll('font')].filter(f => f.__simNode && !f.__simNode.isConnected && f.isConnected).length,
        stale: [...(scope?.querySelectorAll('font') ?? [])].filter(f => f.__simNode && f.__simNode.nodeValue !== f.__simOrig).map(f => ({ shown: f.__simOrig, current: f.__simNode.nodeValue })) },
      choices: [...document.querySelectorAll('#dukb-main [role="combobox"]')].map(el => ({ visible: el.innerText, original: w?.origText(el), html: el.outerHTML })),
      rollControls: [...document.querySelectorAll('#dukb-main button')].filter(el => /Generate Starting Potential|Roll again|Rolling/.test(w?.origText(el) || el.innerText)).map(el => ({ visible: el.innerText, original: w?.origText(el), disabled: el.disabled })),
      fixture: document.getElementById('fixture-output') ? { visible: document.getElementById('fixture-output').innerText,
        renderedValue: window.__fixtureValue,
        images: [...document.querySelectorAll('#fixture-output img')].map(el => ({ alt: el.alt, src: el.src })) } : null,
      fonts: [...document.fonts].map(font => ({ family: font.family, weight: font.weight, status: font.status })) };
  });
  const stem = `${row.id}/${String(row.steps.length).padStart(2, '0')}-${stage}`;
  write(`${stem}.json`, state); await page.screenshot({ path: path.join(OUT, `${stem}.png`) });
  row.steps.push({ stage, state: `${stem}.json`, screenshot: `${stem}.png`, savePresent: Object.hasOwn(state.localStorage, SAVE) });
  write('report.json', report); return state;
}

async function open(target, row, mode, noguard, fixture) {
  const context = await browser.newContext({ viewport: { width: row.width, height: row.width === 390 ? 844 : 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block', storageState: { cookies: [], origins: [] } });
  const cfg = { seed: 20261008, translate: mode === 'alter', text: mode, simDelay: 20, simStart: 0, noguard };
  await context.addInitScript({ content: `(${initBytes.toString('utf8')})(${JSON.stringify(cfg)});` });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  const jobs = [];
  page.on('console', message => {
    const stage = row.stage;
    const job = (async () => {
      const args = await Promise.all(message.args().map(async handle => {
        try { return await handle.evaluate(value => value instanceof Error || value instanceof DOMException
          ? { name: value.name, message: value.message, stack: value.stack }
          : value !== null && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : String(value)); }
        catch (error) { return { unavailable: String(error) }; }
      }));
      row.console.push({ stage, type: message.type(), text: message.text(), args, location: message.location() });
    })().catch(error => row.console.push({ stage, captureError: String(error) }));
    jobs.push(job); captureJobs.push(job);
  });
  page.on('pageerror', error => row.pageErrors.push({ stage: row.stage, ...err(error) }));
  page.on('response', response => {
    const job = (async () => {
      const request = response.request(), url = new URL(response.url());
      if (url.origin !== target.base || !['document', 'script', 'stylesheet'].includes(request.resourceType())) return;
      const bytes = await response.body(), hash = sha(bytes), headers = await response.allHeaders();
      const file = `delivered/${hash}.${request.resourceType() === 'document' ? 'html' : request.resourceType() === 'script' ? 'js' : 'css'}`;
      if (!fs.existsSync(path.join(OUT, file))) write(file, bytes);
      row.assets.push({ url: response.url(), resource: request.resourceType(), status: response.status(), bytes: bytes.length, sha256: hash, file,
        headers: Object.fromEntries(['content-type', 'etag', 'last-modified', 'cache-control'].filter(key => headers[key]).map(key => [key, headers[key]])) });
    })().catch(error => row.assetErrors.push(String(error)));
    jobs.push(job); captureJobs.push(job);
  });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (fixture && url.origin === target.base && url.pathname === '/__1096-fixture') return route.fulfill({ contentType: 'text/html', body: fixture.html });
    if (fixture && url.origin === target.base && url.pathname === '/__1096-fixture.js') return route.fulfill({ contentType: 'application/javascript', body: fixture.js });
    if (url.hostname === 'flagcdn.com' && request.resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    if (url.origin !== target.base || !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) || /\/(auth\/v1|rest\/v1|functions\/v1)(\/|$)/.test(url.pathname)) {
      row.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname });
      return route.fulfill({ status: 200, contentType: request.resourceType() === 'script' ? 'application/javascript' : 'application/json', body: request.resourceType() === 'script' ? '' : '[]' });
    }
    return route.continue();
  });
  return { context, page, jobs };
}

async function press(page, row, selector, wanted, index = null) {
  const pick = await page.evaluate(({ selector, wanted, index }) => {
    const all = [...document.querySelectorAll(selector)];
    const hits = all.map((el, i) => ({ el, i })).filter(({ el }) => {
      const box = el.getBoundingClientRect();
      return box.width > 2 && box.height > 2 && (wanted === null || window.__walk.origText(el).replace(/\s+/g, ' ').trim().startsWith(wanted));
    });
    if (index !== null) return hits[index]?.i ?? -1;
    return hits.length === 1 ? hits[0].i : -1;
  }, { selector, wanted, index });
  assert(pick >= 0, `Unique real control: ${selector} ${wanted ?? index}`);
  if (row.mode === 'alter') await page.waitForFunction(({ selector, pick }) => [...document.querySelectorAll(selector)[pick].querySelectorAll('font')].some(f => f.__simNode && !f.__simNode.isConnected && f.isConnected), { selector, pick });
  await page.locator(selector).nth(pick).click();
}
async function select(page, row, index, label, value) {
  await press(page, row, '#dukb-main [role="combobox"]', null, index);
  await page.getByRole('listbox').waitFor({ state: 'visible' });
  await press(page, row, '[role="option"]', label);
  await page.getByRole('listbox').waitFor({ state: 'hidden' });
  await press(page, row, '#dukb-main [role="combobox"]', null, index);
  await page.getByRole('listbox').waitFor({ state: 'visible' });
  await page.waitForFunction(({ label, alter }) => {
    const options = [...document.querySelectorAll('[role="option"]')].filter(el => window.__walk.origText(el).replace(/\s+/g, ' ').trim().startsWith(label));
    return options.length === 1 && options[0].getAttribute('data-state') === 'checked'
      && (!alter || [...options[0].querySelectorAll('font')].some(f => f.__simNode && !f.__simNode.isConnected && f.isConnected));
  }, { label, alter: row.mode === 'alter' });
  row.selectionChecks.push(await page.evaluate(({ stage, index, label, value }) => {
    const options = [...document.querySelectorAll('[role="option"]')].filter(el => window.__walk.origText(el).replace(/\s+/g, ' ').trim().startsWith(label));
    return { stage, field: index, expectedLabel: label, expectedStoredValue: value, matches: options.length,
      visible: options[0].innerText, original: window.__walk.origText(options[0]), state: options[0].getAttribute('data-state'), html: options[0].outerHTML };
  }, { stage: row.stage, index, label, value }));
  await page.keyboard.press('Escape');
  await page.getByRole('listbox').waitFor({ state: 'hidden' });
}
const buttons = '#dukb-main button';
const expectedLabels = ['Brazil', 'Goalkeeper (GK)', 'Early 90s (1990 start)'];
function checkLabels(row, state, expected) {
  const actual = state.choices.map(item => plain(item.visible));
  const current = actual.length === 3 && actual.every((text, index) => text === expected[index]);
  row.labels.push({ stage: row.stage, actual, expected, current });
  if (row.target === 'candidate' || row.mode === 'off') assert(current, 'Visible chosen labels are current, without stale placeholder or previous value');
}
function newRow(id, target, width, mode, noguard = false) {
  const row = { id, target: target.id, width, mode, noguard, status: 'running', stage: 'open', steps: [], labels: [], selectionChecks: [], console: [], pageErrors: [], blocked: [], assets: [], assetErrors: [] };
  report.cases.push(row); write('report.json', report); return row;
}

async function creator(target, width, mode, noguard = false) {
  const row = newRow(`${target.id}-${width}-${mode}${noguard ? '-noguard' : ''}`, target, width, mode, noguard);
  let W, last;
  try {
    W = await open(target, row, mode, noguard);
    const { page } = W;
    const step = async (stage, action) => { row.stage = stage; await action(); last = await capture(page, row, stage); return last; };
    await page.goto(`${target.base}/soccer-career`, { waitUntil: 'load', timeout: 45000 });
    await page.locator('#pname').waitFor({ state: 'visible' });
    await page.waitForFunction(() => window.__walk?.simStarted && window.__walk.counting);
    if (mode === 'alter') await page.waitForFunction(() => [...document.querySelectorAll('#dukb-main font')].some(f => f.__simOrig === 'Choose nationality' && !f.__simNode.isConnected && f.isConnected));
    const fresh = await capture(page, row, 'fresh');
    assert(!Object.hasOwn(fresh.localStorage, SAVE)); assert.equal(fresh.guardOn, !noguard);
    if (mode === 'off') { assert.equal(fresh.translation.count, 0); assert.equal(fresh.translation.detached, 0); }
    await page.locator('#pname').fill('Translation Proof');
    const first = await step('initial-choices', async () => {
      await select(page, row, 0, 'Portugal', 'Portugal'); await select(page, row, 1, 'Striker (ST)', 'ST'); await select(page, row, 2, 'Current era (2025 start)', '2025');
    });
    checkLabels(row, first, ['Portugal', 'Striker (ST)', 'Current era (2025 start)']);
    const reselected = await step('rechoices', async () => {
      await select(page, row, 0, 'Brazil', 'Brazil'); await select(page, row, 1, 'Goalkeeper (GK)', 'GK'); await select(page, row, 2, 'Early 90s (1990 start)', '1990-94');
    });
    checkLabels(row, reselected, expectedLabels);
    const rollButton = page.getByRole('button', { name: /Generate Starting Potential|Roll again/ });
    await step('generate', async () => { await press(page, row, buttons, '🎲 Generate Starting Potential'); await page.getByRole('button', { name: /Customize your build/ }).waitFor({ state: 'visible' }); });
    await step('reroll', async () => {
      row.rerollControlShown = await rollButton.innerText(); await rollButton.click();
      await page.waitForFunction(() => [...document.querySelectorAll('#dukb-main button')].some(el => /Generate Starting Potential|Roll again|Rolling/.test(window.__walk.origText(el)) && el.disabled));
      await page.waitForFunction(() => [...document.querySelectorAll('#dukb-main button')].some(el => /Generate Starting Potential|Roll again|Rolling/.test(window.__walk.origText(el)) && !el.disabled));
    });
    await step('customize-back', async () => { await press(page, row, buttons, '🎮 Customize your build'); await page.getByRole('heading', { name: /Build/ }).first().waitFor({ state: 'visible' }); });
    const back = await step('back', async () => { await press(page, row, buttons, '← Back'); await page.locator('#pname').waitFor({ state: 'visible' }); });
    checkLabels(row, back, expectedLabels);
    await step('customize-lock', async () => { await press(page, row, buttons, '🎮 Customize your build'); });
    const locked = await step('lock', async () => { await press(page, row, buttons, '✅ Lock in build'); await page.locator('#pname').waitFor({ state: 'visible' }); });
    checkLabels(row, locked, expectedLabels);
    const begun = await step('begin', async () => { await press(page, row, buttons, '⚽ Begin Career'); await page.waitForFunction(key => !!localStorage.getItem(key), SAVE); });
    const saved = JSON.parse(begun.localStorage[SAVE]);
    assert.equal(saved.playerName, 'Translation Proof'); assert.equal(saved.nationality, 'Brazil'); assert.equal(saved.position, 'GK'); assert.equal(saved.era, '1990-94'); assert.equal(saved.age, 16); assert.equal(saved.seasons.length, 1);
    assert(!begun.documentHTML.includes('id="pname"')); row.creatorMoved = begun.translation.moved;
    assert.equal(begun.guardOn, !noguard);
    if (target.id === 'candidate' || mode === 'off') assert.equal(row.creatorMoved.length, 0, 'Creator needs no moved-node guard recovery');
    if (target.id === 'parent' && mode === 'alter') {
      const initial = row.labels[0];
      assert(['nationality', 'position', 'era'].every((field, index) => initial.actual[index].includes(`Choose ${field}`)
        && initial.actual[index].includes(initial.expected[index]) && row.creatorMoved.some(item => item.byTranslator && item.node === `Choose ${field}`)),
      'Actual parent retains each stale placeholder beside its selected label and records the matching translated moved-node call');
    }
    if (!noguard) {
      const advanced = await step('advance', async () => { await press(page, row, '[data-career-action-bar] button', 'Next Year'); await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).age === 17, SAVE); });
      const next = JSON.parse(advanced.localStorage[SAVE]); assert.equal(next.seasons.length, 2); assert.equal(next.seasons[1].year, 1991);
      const restored = await step('reload', async () => { await page.reload({ waitUntil: 'load', timeout: 45000 }); await page.waitForFunction(() => window.__walk?.simStarted && [...document.querySelectorAll('#dukb-main h1')].some(el => window.__walk.origText(el).includes('Translation Proof'))); });
      const loaded = JSON.parse(restored.localStorage[SAVE]); assert.equal(loaded.age, 17); assert.deepEqual(loaded.seasons, next.seasons); assert.equal(loaded.nationality, 'Brazil'); assert.equal(loaded.position, 'GK'); assert.equal(loaded.era, '1990-94');
    }
    row.status = 'completed';
  } catch (error) { row.status = 'failed'; row.error = err(error); if (W) try { last = await capture(W.page, row, 'failed'); } catch (error) { row.captureError = err(error); } }
  finally { await finish(W, row, last); }
}

async function finish(W, row, last) {
  if (W) {
    await Promise.allSettled(W.jobs);
    try { await W.context.close(); } catch (error) { row.status = 'failed'; row.finalizationError = err(error); }
    await Promise.allSettled(W.jobs);
  }
  row.boundaryErrors = row.console.filter(item => item.text?.includes('A page failed to render:'));
  row.guardLines = row.console.filter(item => item.text?.includes('a node this page no longer owns')).length;
  if (row.boundaryErrors.length || row.pageErrors.length || row.assetErrors.length || row.captureError || row.console.some(item => item.captureError)) row.status = 'failed';
  row.verification = { passed: row.status === 'completed', expected: row.target === 'parent' && row.mode === 'alter' ? 'Actual guard-only parent exposes the precise stale/moved defect' : 'Current visible values and successful native flow' };
  if (row.mode === 'alter' && !(last?.translation.count > 0 && last.translation.detached > 0)) { row.status = 'failed'; row.verification.passed = false; row.verification.error = 'Translator did not effectively detach real nodes'; }
  write(`${row.id}/result.json`, row); write('report.json', report);
  console.log(JSON.stringify({ id: row.id, status: row.status, stage: row.stage, verification: row.verification, guardLines: row.guardLines, creatorMoved: row.creatorMoved?.length, error: row.error }));
}

async function flags(target) {
  const row = newRow(`${target.id}-text-with-flags`, target, 1280, 'alter', target.id === 'candidate');
  let W, last;
  try {
    const fixtureSource = `import React from 'react'; import {createRoot} from 'react-dom/client';
import {TextWithFlags} from ${JSON.stringify(path.join(target.root, 'src/components/FlagImg.tsx'))};
import {installTranslateGuard} from ${JSON.stringify(path.join(target.root, 'src/lib/translateGuard.ts'))}; installTranslateGuard();
function Fixture(){const[text,setText]=React.useState('First original line');React.useLayoutEffect(()=>{window.__fixtureValue=text},[text]);return <><nav translate="no"><button onClick={()=>setText('Second updated line')}>Plain update</button><button onClick={()=>setText('🇧🇷 Flagged update')}>Flagged update</button><button onClick={()=>setText('Final plain line')}>Plain final</button></nav><div id="fixture-output"><TextWithFlags text={text}/></div></>};createRoot(document.getElementById('root')).render(<Fixture/>);`;
    write(`${target.id}-fixture/source.tsx`, fixtureSource);
    const result = await build({ stdin: { contents: fixtureSource, resolveDir: target.root, sourcefile: '1096-fixture.tsx', loader: 'tsx' }, absWorkingDir: target.root, bundle: true, format: 'esm', platform: 'browser', jsx: 'automatic', alias: { '@': path.join(target.root, 'src') }, write: false });
    const fixture = { js: Buffer.from(result.outputFiles[0].contents), html: '<!doctype html><html><body><div id="root"></div><script type="module" src="/__1096-fixture.js"></script></body></html>' };
    write(`${target.id}-fixture/bundle.js`, fixture.js); write(`${target.id}-fixture/index.html`, fixture.html);
    W = await open(target, row, 'alter', row.noguard, fixture);
    await W.page.goto(`${target.base}/__1096-fixture`, { waitUntil: 'load' });
    await W.page.waitForFunction(() => window.__walk?.simStarted && [...document.querySelectorAll('#fixture-output font')].some(f => f.__simOrig === 'First original line' && !f.__simNode.isConnected));
    last = await capture(W.page, row, 'fresh'); assert.equal(last.guardOn, !row.noguard);
    row.transitions = [];
    for (const transition of [{ button: 'Plain update', value: 'Second updated line', expected: 'Second updated line', flag: false }, { button: 'Flagged update', value: '🇧🇷 Flagged update', expected: 'Flagged update', flag: true }, { button: 'Plain final', value: 'Final plain line', expected: 'Final plain line', flag: false }]) {
      row.stage = transition.button;
      const movedBefore = last.translation.moved.length;
      await W.page.getByRole('button', { name: transition.button, exact: true }).click();
      await W.page.waitForFunction(value => window.__fixtureValue === value, transition.value);
      if (target.id === 'candidate') await W.page.waitForFunction(expected => [...document.querySelectorAll('#fixture-output font')].some(f => f.__simOrig?.trim() === expected && !f.__simNode.isConnected && f.isConnected), transition.expected);
      last = await capture(W.page, row, transition.button.replaceAll(' ', '-'));
      assert.equal(last.fixture.renderedValue, transition.value);
      const current = plain(last.fixture.visible) === transition.expected && (!!last.fixture.images.length === transition.flag);
      const evidence = { ...transition, visible: last.fixture.visible, current, stale: last.translation.stale, moved: last.translation.moved.slice(movedBefore) };
      row.transitions.push(evidence);
      if (target.id === 'candidate') { assert(current, 'Actual TextWithFlags displays only the new text and intended flag'); assert.equal(last.translation.moved.length, 0); }
      else assert(!current && plain(last.fixture.visible).includes('First original line') && (evidence.stale.length > 0 || evidence.moved.some(item => item.byTranslator)), 'Each actual parent transition retains its stale original text after the matching render or translated moved-node call');
    }
    row.status = 'completed';
  } catch (error) { row.status = 'failed'; row.error = err(error); if (W) try { last = await capture(W.page, row, 'failed'); } catch (error) { row.captureError = err(error); } }
  finally { await finish(W, row, last); }
}

async function bounded(run) {
  const before = report.cases.length;
  try { await run(); }
  catch (error) {
    const row = report.cases[before];
    if (!row) throw error;
    row.status = 'failed'; row.finalizationError = err(error); row.verification = { passed: false, expected: 'Complete scenario capture and finalization' };
    write(`${row.id}/result.json`, row); write('report.json', report);
  }
}

try {
  for (const target of targets) {
    const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', path.join(target.root, 'dist'), new URL(target.base).port], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }); servers.push(server);
    let log = ''; server.stdout.on('data', bytes => { log += bytes; write(`${target.id}-server.log`, log); }); server.stderr.on('data', bytes => { log += bytes; write(`${target.id}-server.log`, log); });
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Owned server not ready')), 15000); server.once('error', error => { clearTimeout(timer); reject(error); }); server.stdout.on('data', bytes => { if (String(bytes).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); });
  }
  browser = await chromium.launch({ headless: true }); report.browserVersion = browser.version(); report.plannedCases = 12;
  for (const target of targets) for (const width of [390, 1280]) for (const mode of ['off', 'alter']) await bounded(() => creator(target, width, mode));
  for (const width of [390, 1280]) await bounded(() => creator(targets[1], width, 'alter', true));
  for (const target of targets) await bounded(() => flags(target));
} catch (error) { report.infrastructureError = err(error); }
finally {
  await Promise.allSettled(captureJobs);
  if (browser) try { await browser.close(); } catch (error) { report.infrastructureError = err(error); }
  for (const server of servers) server.kill();
  report.passed = report.cases.filter(row => row.verification?.passed).length; report.failed = report.cases.filter(row => !row.verification?.passed).length;
  write('report.json', report); console.log(`1096 creator translation: ${report.passed}/12 exact contracts passed, ${report.failed} failed.`);
  if (report.infrastructureError || report.failed || report.cases.length !== 12) process.exitCode = 1;
}
