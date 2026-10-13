/* Remote-only proof of the creator's real build-editor loading and callbacks.
 * Fresh signed-out contexts use the app's directly bundled club roster.
 * No career is begun, no saved fixture is inserted and no backend is credited.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI, 'Run this proof on a remote CI runner only.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASE = process.env.SOCCER_BUILD_PHASE;
assert(['baseline', 'fixed'].includes(PHASE), 'SOCCER_BUILD_PHASE must be baseline or fixed.');
const ARTIFACTS = process.env.SOCCER_ROUTINE_OUT;
assert(ARTIFACTS && path.isAbsolute(ARTIFACTS), 'SOCCER_ROUTINE_OUT must be an absolute artifact root.');
const OUT = path.join(ARTIFACTS, 'build-lazy', PHASE);
const REPORT = path.join(OUT, 'report.json');
fs.mkdirSync(OUT, { recursive: true });
assert(!fs.existsSync(REPORT), 'Refuse to overwrite an earlier proof report.');
const MARKER = 'Points to spend';
const KEY = 'soccerCareerSave';
const PROFILES = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sha = filename => hash(fs.readFileSync(filename));
const require = createRequire(import.meta.url);
const report = { phase: PHASE, status: 'running', sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  checks: 0, failures: 0, setupFailures: 0, eagerBuildFetches: 0, healthyFlows: 0, cases: [], recoveries: [], controls: [], inventory: [], issues: [],
  limits: ['Fresh signed-out creator only; no Begin Career action or saved fixture.', 'The creator loads bundled clubs directly; no database fallback is credited.',
    'A failed import first exercises the existing automatic reload, then its boundary and user-requested Retry.',
    'Creator drafts are not claimed saved across a full reload.', 'Original captures cover these selected creator states, not blanket visual acceptance.'] };
const check = (condition, message, row) => { report.checks++; if (!condition) { report.failures++; report.issues.push(message); row?.issues.push(message); } return !!condition; };
const setup = (condition, message) => { report.checks++; if (!condition) { report.setupFailures++; throw new Error(message); } };
const write = () => fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]).sort();
}
const receipt = filename => ({ file: path.relative(ROOT, filename).replaceAll('\\', '/'), bytes: fs.statSync(filename).size, sha256: sha(filename) });
let sourceBefore = [], distBefore = [], installedBefore = [], toolsBefore = [], fonts = new Map(), cache, fontHash, markerAsset, browser, server;
async function serve() {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port)); });
  });
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let log = '';
    const timeout = setTimeout(() => reject(new Error(`Host startup failed: ${log}`)), 15000);
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Host exited ${code}: ${log}`)); });
    server.stdout.on('data', data => { log += data; if (String(data).includes('host-like server:')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', data => { log += data; });
  });
  return `http://127.0.0.1:${port}`;
}
async function open(base, profile, row, failBuild = false) {
  const context = await browser.newContext({ viewport: profile, isMobile: profile.width < 1000, hasTouch: profile.width < 1000,
    reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: [
      { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }] }] } });
  const page = await context.newPage(); page.setDefaultTimeout(25000);
  const aborted = new Set(), fault = { enabled: failBuild }, pending = [];
  const ownedChunkError = text => row.transport.some(request => request.action === 'build-fault' && text.includes(request.url))
    && /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(text);
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base) {
      if (fault.enabled && url.pathname === markerAsset) {
        aborted.add(request.url()); row.transport.push({ stage: row.stage, method: request.method(), url: request.url(), action: 'build-fault' });
        return route.abort('blockedbyclient');
      }
      return route.continue();
    }
    if (request.method() === 'GET' && fonts.has(url.href)) { row.transport.push({ method: request.method(), url: request.url(), action: 'retained-font' }); return route.fulfill({ status: 200, ...fonts.get(url.href) }); }
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) row.errors.push(`Uncached declared font: ${request.url()}`);
    aborted.add(request.url()); row.transport.push({ method: request.method(), url: request.url(), action: 'abort' });
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => { row.transport.push({ url: socket.url(), action: 'websocket-close' }); socket.close(); });
  page.on('pageerror', error => { const text = String(error); if (ownedChunkError(text)) row.diagnostics.push({ action: 'owned-build-fault', text }); else row.errors.push(text); });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url, text = message.text();
    if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(text) && aborted.has(url)) row.diagnostics.push({ url, text, action: 'owned-abort' });
    else if (ownedChunkError(text)) row.diagnostics.push({ text, action: 'owned-build-fault' });
    else row.errors.push(`${url}: ${text}`);
  });
  page.on('requestfailed', request => { if (new URL(request.url()).origin === base && !row.transport.some(item => item.action === 'build-fault' && item.url === request.url())) row.errors.push(`Owned request failed: ${request.url()}`); });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== base) return;
    if (response.status() >= 400) { row.errors.push(`Owned asset ${response.status()}: ${response.url()}`); return; }
    if (!url.pathname.endsWith('.js')) return;
    const stage = row.stage;
    pending.push(response.body().then(body => {
      const load = { stage, url: response.url(), bytes: body.length, sha256: hash(body), marker: body.toString('utf8').includes(MARKER) };
      const original = distBefore.find(file => `/${file.file.slice('dist/'.length)}` === url.pathname);
      check(original?.sha256 === load.sha256 && original.bytes === load.bytes, `${row.id}: served JS differs from the held distribution asset.`, row);
      row.jsLoads.push(load);
    }).catch(error => row.errors.push(`Owned JS body unreadable: ${response.url()}: ${error}`)));
  });
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) row.documents.push({ stage: row.stage, url: frame.url() }); });
  await page.addInitScript(() => {
    document.addEventListener('click', event => {
      const label = event.target.closest?.('button')?.innerText ?? '';
      if (!/Generate Starting Potential|Roll again/.test(label)) return;
      let number = 531;
      Math.random = () => { number = (number + 0x6d2b79f5) | 0; let value = Math.imul(number ^ (number >>> 15), 1 | number); value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value; return ((value ^ (value >>> 14)) >>> 0) / 4294967296; };
    }, true);
  });
  const flush = async () => { while (pending.length) await Promise.all(pending.splice(0)); };
  const activate = async button => { await button.scrollIntoViewIfNeeded(); if (profile.width < 1000) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  const raw = () => page.evaluate(key => localStorage.getItem(key), KEY);
  const creator = () => page.getByRole('heading', { name: 'Create Your Player', exact: true }).locator('..');
  const preview = () => page.getByRole('heading', { name: 'Starting Stats', exact: true }).locator('..').locator('..');
  const ready = async () => { await creator().waitFor({ timeout: 45000 }); await page.evaluate(() => document.fonts.ready); await flush(); };
  await page.goto(`${base}/soccer-career`, { waitUntil: 'domcontentloaded' }); await ready();
  return { context, page, fault, activate, raw, creator, preview, ready, flush };
}
const rowFor = (id, width) => ({ id, width, stage: 'cold', issues: [], errors: [], diagnostics: [], transport: [], jsLoads: [], documents: [], stages: [], shots: [], roster: [] });
const buildLoads = row => row.jsLoads.filter(load => load.marker);
const editor = page => page.getByRole('heading', { name: /Build Your Player$/ }).locator('..').locator('..');
const customize = page => page.getByRole('button', { name: /Customize your build$/ });
async function generate(walk, row) {
  row.stage = 'generate';
  await walk.page.getByLabel('Player Name', { exact: true }).fill('Build Proof');
  for (const [placeholder, name] of [['Choose nationality', /^England(?:\s|$)/], ['Choose position', 'Striker (ST)'], ['Choose era', 'Current era (2025 start)']]) {
    await walk.activate(walk.page.getByRole('combobox').filter({ hasText: placeholder }));
    const option = walk.page.getByRole('option', { name, exact: typeof name === 'string' });
    setup(await option.count() === 1, `${row.id}: actual creator option is not unique: ${placeholder}`);
    await walk.activate(option);
  }
  const roll = walk.page.getByRole('button', { name: /Generate Starting Potential$/ });
  await roll.waitFor(); await walk.activate(roll); await customize(walk.page).waitFor(); await walk.flush();
  check(await walk.page.getByText('Rolling...', { exact: true }).count() === 0, `${row.id}: actual generation did not finish.`, row);
  const academy = walk.page.getByText('Academy Placement', { exact: true }).locator('..').locator('div.font-bold.text-sm');
  await academy.waitFor();
  const academyText = (await academy.innerText()).trim();
  const errorNoticeCount = await walk.page.getByText('Couldn\'t reach the live club database, so we loaded a backup roster. Everything still works.', { exact: true }).count();
  check(academyText.endsWith(' Youth') && academyText.length > ' Youth'.length, `${row.id}: actual bundled-roster generation has no academy preview.`, row);
  check(errorNoticeCount === 0, `${row.id}: direct bundled-roster loading incorrectly shows a live-club failure warning.`, row);
  row.roster.push({ provider: 'direct-bundled-FALLBACK_CLUBS', academyText, errorNoticeCount });
  check(await walk.raw() === null, `${row.id}: generating a creator began or saved a career.`, row);
  return walk.preview().locator('span.w-6.text-right').allTextContents();
}
async function allocation(page) {
  const inputs = editor(page).locator('input[aria-label]');
  const values = await inputs.evaluateAll(nodes => nodes.map(node => ({ label: node.getAttribute('aria-label'), value: Number(node.value) })));
  return values.filter(item => item.label !== 'Starting overall');
}
async function transferPoint(walk, row) {
  const before = await allocation(walk.page);
  setup(before.length === 6 && before.every(item => Number.isInteger(item.value)), `${row.id}: actual striker allocation is not six finite rows.`);
  const donor = before.find(item => item.value > 25);
  setup(!!donor, `${row.id}: no actual allocation can release a point.`);
  await walk.activate(walk.page.getByRole('button', { name: `${donor.label} down 1`, exact: true }));
  let receiver;
  for (const item of before) if (item.label !== donor.label && await walk.page.getByRole('button', { name: `${item.label} up 1`, exact: true }).isEnabled()) { receiver = item; break; }
  setup(!!receiver, `${row.id}: no other actual allocation can take the released point.`);
  await walk.activate(walk.page.getByRole('button', { name: `${receiver.label} up 1`, exact: true }));
  const after = await allocation(walk.page);
  check(after.every((item, index) => item.label === before[index].label && item.value === before[index].value + (item.label === donor.label ? -1 : item.label === receiver.label ? 1 : 0)), `${row.id}: real steppers did not move exactly one point.`, row);
  check(await walk.page.getByRole('button', { name: /Lock in build$/ }).isEnabled(), `${row.id}: a balanced allocation did not enable Lock.`, row);
  return { before, after, donor: donor.label, receiver: receiver.label };
}
async function frame(walk, row, change) {
  await walk.activate(walk.page.getByRole('button', { name: /^Height and weight/i }));
  const height = walk.page.getByLabel('Height in centimetres', { exact: true }), weight = walk.page.getByLabel('Weight in kilograms', { exact: true });
  await height.waitFor(); const before = { height: Number(await height.inputValue()), weight: Number(await weight.inputValue()) };
  if (change) { await walk.activate(walk.page.getByRole('button', { name: 'Height in centimetres up 1', exact: true })); }
  const after = { height: Number(await height.inputValue()), weight: Number(await weight.inputValue()) };
  check(after.height === before.height + (change ? 1 : 0) && after.weight === before.weight, `${row.id}: actual frame action moved the wrong values.`, row);
  await walk.activate(walk.page.getByRole('button', { name: 'Done', exact: true }));
  return { before, after };
}
async function capture(walk, row, name, target) {
  await target.scrollIntoViewIfNeeded();
  const geometry = await target.evaluate(async element => {
    let previous = '', stable = 0, observation;
    for (let count = 0; count < 120; count++) {
      await new Promise(resolve => requestAnimationFrame(resolve)); const rect = element.getBoundingClientRect();
      observation = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, opacity: Number(getComputedStyle(element).opacity),
        finite: element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity).length,
        visible: rect.width > 0 && rect.bottom > 0 && rect.y < innerHeight, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      const signature = JSON.stringify(observation); stable = signature === previous ? stable + 1 : 1; previous = signature;
      if (stable >= 4 && observation.opacity >= .99 && observation.finite === 0 && observation.visible && !observation.overflow) return { ...observation, stable };
    }
    return { ...observation, stable };
  });
  check(geometry.stable >= 4 && geometry.opacity >= .99 && geometry.finite === 0 && geometry.visible && !geometry.overflow, `${row.id}: ${name} did not settle visibly without overflow.`, row);
  const filename = `${row.id}-${name}.png`, pathname = path.join(OUT, filename);
  assert(!fs.existsSync(pathname), `Refuse to overwrite original ${filename}.`);
  await walk.page.screenshot({ path: pathname }); report.inventory.push({ file: filename, bytes: fs.statSync(pathname).size, sha256: sha(pathname), original: true }); row.shots.push({ file: filename, geometry });
}
async function finish(walk, row) {
  if (walk) { await walk.flush(); check(await walk.raw() === null, `${row.id}: creator flow wrote a career save.`, row); await walk.context.close(); }
  check(row.errors.length === 0, `${row.id}: unrelated app/asset errors: ${row.errors.join(' | ')}`, row);
  check(row.diagnostics.every(item => item.action === 'owned-abort' ? row.transport.some(request => ['abort', 'build-fault'].includes(request.action) && request.url === item.url) : row.transport.some(request => request.action === 'build-fault' && item.text.includes(request.url))), `${row.id}: a diagnostic lacks its exact blocked request.`, row);
  check(row.transport.filter(request => request.method === 'POST').length === 0, `${row.id}: creator flow attempted an external write.`, row); write();
}
async function natural(base, profile) {
  const row = rowFor(`${profile.width}-natural`, profile.width); report.cases.push(row); let walk;
  try {
    walk = await open(base, profile, row); setup(await walk.raw() === null, `${row.id}: fresh creator has a saved fixture.`);
    const cold = buildLoads(row); row.coldBuildLoads = cold;
    check(cold.length === (PHASE === 'baseline' ? 1 : 0), `${row.id}: cold marker fetch does not match this phase's causal loading contract.`, row);
    if (cold.length === 1 && PHASE === 'baseline') report.eagerBuildFetches++;
    await capture(walk, row, 'cold-creator', walk.creator());
    const generated = await generate(walk, row); setup(generated.length === 6, `${row.id}: generated preview does not show six real stats.`);
    check(buildLoads(row).length === cold.length, `${row.id}: Generate unexpectedly fetched build code.`, row);
    row.stage = 'customize'; await walk.activate(customize(walk.page)); await editor(walk.page).waitFor(); await walk.flush();
    check(buildLoads(row).length === 1 && await walk.page.getByText(MARKER, { exact: true }).count() === 1, `${row.id}: actual Customize did not load and open the unique build editor.`, row);
    const first = await transferPoint(walk, row), physique = await frame(walk, row, true);
    await walk.activate(walk.page.getByRole('button', { name: '← Back', exact: true })); await walk.creator().waitFor();
    check(JSON.stringify(await walk.preview().locator('span.w-6.text-right').allTextContents()) === JSON.stringify(generated), `${row.id}: Cancel committed an unconfirmed allocation.`, row);
    row.stage = 'customize-again'; await walk.activate(customize(walk.page)); await editor(walk.page).waitFor();
    check(JSON.stringify(await allocation(walk.page)) === JSON.stringify(first.before), `${row.id}: reopening after Cancel lost the original allocation.`, row);
    const carriedFrame = await frame(walk, row, false);
    check(JSON.stringify(carriedFrame.before) === JSON.stringify(physique.after), `${row.id}: parent frame callback did not survive Cancel/reopen.`, row);
    const second = await transferPoint(walk, row);
    const liveOvr = Number(await walk.page.getByText('Starting overall', { exact: true }).locator('..').locator('div.text-3xl').innerText());
    await capture(walk, row, 'edited-build', editor(walk.page));
    await walk.activate(walk.page.getByRole('button', { name: /Lock in build$/ })); await walk.creator().waitFor();
    const locked = (await walk.preview().locator('span.w-6.text-right').allTextContents()).map(Number);
    check(JSON.stringify(locked) === JSON.stringify(second.after.map(item => item.value)), `${row.id}: Lock did not carry the exact allocation into the real preview.`, row);
    check(Number(await walk.preview().locator('span.text-2xl').innerText()) === liveOvr, `${row.id}: Lock did not carry the actual overall callback.`, row);
    await walk.activate(customize(walk.page)); await editor(walk.page).waitFor();
    check(JSON.stringify(await allocation(walk.page)) === JSON.stringify(second.after), `${row.id}: reopening after Lock lost committed allocation.`, row);
    check(JSON.stringify((await frame(walk, row, false)).before) === JSON.stringify(physique.after), `${row.id}: Lock/reopen lost the actual frame.`, row);
    await walk.activate(walk.page.getByRole('button', { name: '← Back', exact: true })); await walk.creator().waitFor(); await walk.flush();
    check(buildLoads(row).length === 1, `${row.id}: reopening refetched the already loaded build asset.`, row);
    row.stages.push({ generated, first, physique, carriedFrame, second, liveOvr, locked, buildLoads: buildLoads(row) });
    await capture(walk, row, 'locked-creator', walk.preview());
    if (row.issues.length === 0) report.healthyFlows++;
  } catch (error) { report.failures++; row.issues.push(String(error)); report.issues.push(`${row.id}: ${String(error?.stack ?? error)}`); }
  finally { await finish(walk, row); }
}
async function omission(base) {
  const row = rowFor('390-omit-customize', 390); report.controls.push(row); let walk;
  try {
    walk = await open(base, PROFILES[1], row); await generate(walk, row);
    row.detected = [];
    if (await editor(walk.page).count() === 0) row.detected.push('build-not-open');
    if (buildLoads(row).length === 0) row.detected.push('build-code-not-fetched');
    check(JSON.stringify(row.detected) === JSON.stringify(['build-not-open', 'build-code-not-fetched']), `${row.id}: actual omitted action did not fail both loading/opening detectors.`, row);
    check(await customize(walk.page).isEnabled(), `${row.id}: omitted action is no longer available.`, row);
    await capture(walk, row, 'detected-omission', walk.preview());
  } catch (error) { report.failures++; row.issues.push(String(error)); report.issues.push(`${row.id}: ${String(error)}`); }
  finally { await finish(walk, row); }
}
async function recovery(base) {
  const row = rowFor('390-failed-chunk', 390); report.recoveries.push(row); let walk;
  try {
    walk = await open(base, PROFILES[1], row, true); await generate(walk, row); check(buildLoads(row).length === 0, `${row.id}: failed chunk case fetched build code cold.`, row);
    row.stage = 'first-fault'; const automatic = walk.page.waitForEvent('domcontentloaded'); await walk.activate(customize(walk.page)); await automatic; await walk.ready();
    const firstFaults = row.transport.filter(request => request.action === 'build-fault').length;
    check(firstFaults > 0 && await walk.page.evaluate(() => sessionStorage.getItem('dukb-reloaded-stale-chunk')) === '1', `${row.id}: actual first import failure did not exercise the existing automatic reload.`, row);
    check(await walk.page.getByLabel('Player Name', { exact: true }).inputValue() === '', `${row.id}: actual reload did not return to its fresh creator.`, row);
    const regenerated = await generate(walk, row); row.stage = 'second-fault'; await walk.activate(customize(walk.page));
    const dialog = walk.page.getByRole('dialog').filter({ hasText: /Couldn't load the .*build/i }); await dialog.waitFor();
    const secondFaults = row.transport.filter(request => request.action === 'build-fault').length;
    check(secondFaults > firstFaults && buildLoads(row).length === 0, `${row.id}: boundary was not caused by a real second failed build import.`, row);
    await capture(walk, row, 'failed-build-boundary', dialog);
    await walk.activate(dialog.getByRole('button', { name: /Close it$/ })); await walk.creator().waitFor();
    check(JSON.stringify(await walk.preview().locator('span.w-6.text-right').allTextContents()) === JSON.stringify(regenerated), `${row.id}: boundary Close lost the current unbegun roll.`, row);
    await walk.activate(customize(walk.page)); await dialog.waitFor();
    check(row.transport.filter(request => request.action === 'build-fault').length === secondFaults, `${row.id}: cached failed import unexpectedly made another request.`, row);
    walk.fault.enabled = false; row.stage = 'retry'; const retried = walk.page.waitForEvent('domcontentloaded'); await walk.activate(dialog.getByRole('button', { name: /Retry$/ })); await retried; await walk.ready();
    check(await walk.page.getByLabel('Player Name', { exact: true }).inputValue() === '', `${row.id}: actual Retry did not reload the fresh creator.`, row);
    await generate(walk, row); row.stage = 'retry-customize'; await walk.activate(customize(walk.page)); await editor(walk.page).waitFor(); await walk.flush();
    check(buildLoads(row).length === 1 && await walk.page.getByRole('button', { name: /Lock in build$/ }).isEnabled(), `${row.id}: actual Retry did not fetch a healthy usable editor.`, row);
    check(row.documents.length === 3, `${row.id}: failure recovery navigated beyond initial load, one automatic reload and one requested Retry.`, row);
    const recovered = await allocation(walk.page);
    await capture(walk, row, 'retry-build-restored', editor(walk.page));
    await walk.activate(walk.page.getByRole('button', { name: /Lock in build$/ })); await walk.creator().waitFor();
    const locked = (await walk.preview().locator('span.w-6.text-right').allTextContents()).map(Number);
    check(JSON.stringify(locked) === JSON.stringify(recovered.map(item => item.value)), `${row.id}: recovered editor Lock lost its actual allocation callback.`, row);
    row.stages.push({ firstFaults, secondFaults, regenerated, recovered, locked, buildLoads: buildLoads(row) });
  } catch (error) { report.failures++; row.issues.push(String(error)); report.issues.push(`${row.id}: ${String(error?.stack ?? error)}`); }
  finally { await finish(walk, row); }
}
try {
  const markerSources = [...files(path.join(ROOT, 'src/pages')), ...files(path.join(ROOT, 'src/components'))].filter(file => /\.tsx?$/.test(file) && fs.readFileSync(file, 'utf8').includes(MARKER));
  setup(markerSources.length === 1, 'The real build-editor UI marker must have exactly one source owner.');
  const sourceFiles = ['src/pages/SoccerCareer.tsx', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerAttributes.ts', 'src/lib/careerEras.ts',
    'src/lib/soccerCareerLife.ts', 'src/lib/soccerCareerRoutineEvents.ts', 'src/lib/soccerCareerSave.ts', 'src/lib/freshBuild.ts', 'src/integrations/supabase/client.ts',
    'src/hooks/useRevealScroll.ts', 'src/components/RouteErrorBoundary.tsx', 'scripts/playSoccerCareerBuildLazy.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs',
    'scripts/lib/offlineTransport.cjs', 'package.json', 'package-lock.json'];
  sourceBefore = [...new Set([...sourceFiles.map(file => path.join(ROOT, file)), ...markerSources])].sort().map(receipt); report.sourceHashes = sourceBefore;
  const pageCode = fs.readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[\t ]*\/\/.*$/gm, '');
  const loader = /^[\t ]*useEffect\(\(\) => \{\s*setClubs\(FALLBACK_CLUBS\);\s*setClubsError\(false\);\s*setClubsLoading\(false\);\s*\}, \[\]\);/gm;
  const loaderMatches = [...pageCode.matchAll(loader)].length;
  setup(loaderMatches === 1, 'Exactly one actual direct bundled-roster loader must be held; comments do not establish its behavior.');
  report.rosterProvenance = { provider: 'FALLBACK_CLUBS', loaderMatches, source: 'src/pages/SoccerCareer.tsx', sourceSha256: sha(path.join(ROOT, 'src/pages/SoccerCareer.tsx')), warningExpected: false };
  distBefore = files(path.join(ROOT, 'dist')).map(receipt); report.dist = distBefore;
  const markers = files(path.join(ROOT, 'dist/assets')).filter(file => file.endsWith('.js') && fs.readFileSync(file, 'utf8').includes(MARKER));
  setup(markers.length === 1, 'Exactly one actual compiled JS asset must own the editor marker.');
  markerAsset = `/${path.relative(path.join(ROOT, 'dist'), markers[0]).replaceAll('\\', '/')}`; report.markerAsset = receipt(markers[0]);
  const installed = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, 'installed.json'), 'utf8'));
  setup(installed.length === 521, 'Require all 521 already bound installed versions.');
  installedBefore = installed.map(row => { setup(row.path.startsWith('node_modules/') && !row.path.split('/').includes('..'), 'Installed dependency path escapes checkout.'); const filename = path.join(ROOT, row.path, 'package.json'); setup(JSON.parse(fs.readFileSync(filename, 'utf8')).version === row.version, `${row.path}: installed version changed.`); return { ...row, sha256: sha(filename) }; }); report.installed = installedBefore;
  toolsBefore = ['esbuild', 'playwright', 'playwright-core'].map(name => { const file = require.resolve(`${name}/package.json`); return { name, file, version: JSON.parse(fs.readFileSync(file, 'utf8')).version, sha256: sha(file) }; }); report.tools = toolsBefore;
  cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'free-kick-lab-artifacts/font-cache')); fontHash = sha(path.join(cache, 'manifest.json'));
  report.fonts = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8'));
  fonts = new Map(report.fonts.map(entry => { setup(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin) && /^[a-f0-9]{64}$/.test(entry.file), 'Font manifest is not the retained declared dependency.'); const filename = path.join(cache, entry.file); setup(sha(filename) === entry.sha256, `Retained font bytes differ: ${entry.url}`); return [entry.url, { body: fs.readFileSync(filename), contentType: entry.contentType }]; }));
  const base = await serve(); browser = await pw.chromium.launch({ headless: true });
  for (const profile of PROFILES) await natural(base, profile);
  if (PHASE === 'fixed') { await recovery(base); await omission(base); }
  const originals = PHASE === 'baseline' ? 9 : 12;
  check(report.cases.length === 3 && report.healthyFlows === 3 && report.inventory.length === originals && report.controls.length === (PHASE === 'baseline' ? 0 : 1) && report.recoveries.length === (PHASE === 'baseline' ? 0 : 1), 'Final healthy-flow, control, recovery or original counts differ.');
  check(report.eagerBuildFetches === (PHASE === 'baseline' ? 3 : 0), 'Causal eager-marker finding count differs.');
  check(new Set(report.inventory.map(image => image.file)).size === originals, 'Original captures need distinct filenames.');
  for (const image of report.inventory) check(sha(path.join(OUT, image.file)) === image.sha256 && fs.statSync(path.join(OUT, image.file)).size === image.bytes, `Original capture changed: ${image.file}`);
} catch (error) { report.issues.push(String(error?.stack ?? error)); if (!report.setupFailures) report.failures++; }
finally {
  if (browser) await browser.close(); if (server) server.kill();
  report.sourceHeld = sourceBefore.length > 0 && sourceBefore.every(source => sha(path.join(ROOT, source.file)) === source.sha256);
  report.distHeld = distBefore.length > 0 && JSON.stringify(files(path.join(ROOT, 'dist')).map(receipt)) === JSON.stringify(distBefore);
  report.toolsHeld = toolsBefore.length === 3 && toolsBefore.every(tool => sha(tool.file) === tool.sha256);
  report.installedHeld = installedBefore.length === 521 && installedBefore.every(row => sha(path.join(ROOT, row.path, 'package.json')) === row.sha256);
  report.fontsHeld = !!fontHash && sha(path.join(cache, 'manifest.json')) === fontHash && report.fonts.every(entry => sha(path.join(cache, entry.file)) === entry.sha256);
  for (const name of ['sourceHeld', 'distHeld', 'toolsHeld', 'installedHeld', 'fontsHeld']) check(report[name], `${name}: inputs changed or were never qualified.`);
  const rows = [...report.cases, ...report.recoveries, ...report.controls];
  report.summary = { healthyFlows: report.healthyFlows, eagerBuildFetches: report.eagerBuildFetches, recoveries: report.recoveries.length, controls: report.controls.length, originals: report.inventory.length, checks: report.checks,
    externalAborts: rows.reduce((sum, row) => sum + row.transport.filter(request => request.action === 'abort').length, 0), buildFaultRequests: rows.reduce((sum, row) => sum + row.transport.filter(request => request.action === 'build-fault').length, 0), expectedDiagnostics: rows.reduce((sum, row) => sum + row.diagnostics.length, 0), failures: report.failures, setupFailures: report.setupFailures };
  report.status = report.failures || report.setupFailures ? 'failed' : PHASE === 'baseline' ? 'baseline-reproduced' : 'passed'; write();
  console.log(`Soccer Career build ${PHASE}: ${report.status}; ${report.healthyFlows} healthy flows, ${report.eagerBuildFetches} eager fetches, ${report.inventory.length} originals, ${report.failures} failures, ${report.setupFailures} setup failures.`);
  process.exitCode = report.status === 'passed' ? 0 : 1;
}
