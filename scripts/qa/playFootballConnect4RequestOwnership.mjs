import a from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';
import { sha, inventory, loadFonts, checkFonts, shellFixture } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.C4_OWNERSHIP_OUT;
a(OUT && path.isAbsolute(OUT) && !path.resolve(OUT).startsWith(ROOT + path.sep) && path.resolve(OUT) !== ROOT, 'C4_METHOD_OUTPUT_OUTSIDE_SOURCE');
fs.mkdirSync(OUT, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(OUT, 'collector.started'), 'Football Connect 4 native QA only\n', { flag: 'wx' });
const DIST = path.resolve(process.env.C4_OWNERSHIP_DIST || path.join(ROOT, 'dist'));
const files = new Map(inventory(DIST).map(row => ['/' + row.file, row]));
const index = fs.readFileSync(path.join(DIST, 'index.html'));
a.equal(sha(index), files.get('/index.html')?.sha256, 'C4_METHOD_COMPLETED_INDEX');
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const client = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const BACKEND = new URL(client.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/)[1]).origin;
const PRIOR = 'QA Prior Player', LATE = 'QA Pending Player', CURRENT = 'QA Current Player', NEWER = 'QA Newer Player';
const PLAYERS = [PRIOR, LATE, CURRENT, NEWER].map(name => ({ player_name: name, name_folded: name.toLowerCase(),
  market_value_usd: 1, year: 2026, club: 'QA Fixture Club', nationality: '', position: 'Midfielder', age: 25 }));
const PROFILES = [{ id: 'phone390', width: 390, height: 844 }, { id: 'tablet768', width: 768, height: 1024 }, { id: 'desktop1440', width: 1440, height: 1000 }];
const mime = file => ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' }[path.extname(file)] || 'application/octet-stream');
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
async function bounded(promise, label) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, no) => { timer = setTimeout(() => no(new Error('C4_METHOD_TIMEOUT_' + label)), 15000); })]); }
  finally { clearTimeout(timer); }
}
let server, browser, base = process.env.BASE, stopping = false;
const report = { scope: 'SYNTHETIC_NATIVE_CLIENT_REQUEST_OWNERSHIP_ONLY', source: process.env.GITHUB_SHA || null,
  realBackendWrites: false, realDataValidation: false, sourceShellSHA256: sha(index), profiles: [], controls: [], failures: [] };
const sourcePaths = ['src/pages/FootballConnect4.tsx', 'src/hooks/useFootballConnect4.ts', 'src/components/football-connect4/FootballConnect4Board.tsx',
  'src/lib/playerSearch.ts', 'scripts/qa/siteMenuNavigationSupport.mjs', 'scripts/lib/playwrightLoader.mjs'];
write('source-inputs.json', sourcePaths.map(file => { const body = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: body.length, sha256: sha(body) }; }));

async function sample(page) {
  return page.evaluate(() => {
    const cells = [...document.querySelectorAll('button[aria-label]')].filter(node => /^(Empty square,|QA )/.test(node.getAttribute('aria-label')))
      .map(node => ({ label: node.getAttribute('aria-label'), text: node.textContent.trim(), disabled: node.disabled,
        team: node.classList.contains('bg-blue-500/90') ? 'blue' : node.classList.contains('bg-red-500/90') ? 'red' : null }));
    const input = document.querySelector('input[aria-label="Enter soccer player name..."]');
    const turn = name => [...document.querySelectorAll('div')].filter(node => node.textContent.trim() === name).length;
    return { cells, input: input ? { value: input.value, disabled: input.disabled } : null,
      clue: input?.closest('.space-y-3')?.querySelector('p')?.textContent.trim().replace(/\s+/g, ' ') || null,
      errors: [...document.querySelectorAll('div.text-destructive span')].map(node => node.textContent.trim()),
      blueTurn: turn("Blue's Turn"), redTurn: turn("Red's Turn") };
  });
}
async function frames(page) { return bounded(page.evaluate(() => new Promise(resolve => requestAnimationFrame(first => requestAnimationFrame(second => resolve([first, second]))))), 'ACTUAL_FRAMES'); }
function oneBlue(value, name) {
  a(value.cells.length === 42 && value.cells.filter(cell => cell.team).length === 1 && value.cells.some(cell => cell.team === 'blue' && cell.label.startsWith(name + ','))
    && value.cells.filter(cell => cell.label.startsWith('Empty square,')).length === 41 && value.blueTurn === 0 && value.redTurn === 1 && value.input === null, 'C4_NATIVE_FRESH_PIECE');
}
function judge(value) {
  a.deepEqual(value.profiles.map(row => row.id), PROFILES.map(row => row.id), 'C4_METHOD_PROFILE_SET');
  for (const row of value.profiles) {
    a.equal(row.pageErrors.length, 0, 'C4_METHOD_PAGE_ERRORS');
    a(row.io.every(item => item.kind !== 'unknown-refused'), 'C4_METHOD_KNOWN_IO_ONLY');
    a.deepEqual(row.validators.map(item => item.purpose), ['prior', 'stale', 'fresh', 'old-refusal', 'newer'], 'C4_METHOD_VALIDATOR_SEQUENCE');
    a(row.validators.every(item => item.callbacks === 1 && item.fulfillments === 1), 'C4_METHOD_CALLBACK_ONCE');
    a.deepEqual(row.scenario1.afterOld.cells, row.scenario1.beforeOld.cells, 'C4_NATIVE_FRESH_BOARD');
    a(row.scenario1.afterOld.blueTurn === 1 && row.scenario1.afterOld.redTurn === 0 && row.scenario1.afterOld.errors.length === 0, 'C4_NATIVE_FRESH_BOARD');
    a.deepEqual(row.scenario1.afterOld.input, row.scenario1.beforeOld.input, 'C4_NATIVE_NEW_DRAFT');
    a.equal(row.scenario1.afterOld.input?.value, 'QA New Draft', 'C4_NATIVE_NEW_DRAFT');
    a.equal(row.scenario1.afterOld.clue, row.scenario1.beforeOld.clue, 'C4_NATIVE_CLUE');
    a.deepEqual(row.scenario2.afterOld, row.scenario2.beforeOld, 'C4_NATIVE_NEW_REQUEST_LOCK');
    a.equal(row.scenario2.afterOld.input?.disabled, true, 'C4_NATIVE_NEW_REQUEST_LOCK');
    oneBlue(row.scenario1.afterCurrent, CURRENT); oneBlue(row.scenario2.afterCurrent, NEWER);
    a.equal(row.images.length, 3, 'C4_METHOD_IMAGE_COUNT');
    for (const image of row.images) { const bytes = fs.readFileSync(path.join(OUT, image.file)); a.equal(sha(bytes), image.sha256, 'C4_METHOD_IMAGE_HASH'); }
  }
}
async function picture(page, row, tag) {
  const file = row.id + '-' + tag + '.png'; a(!fs.existsSync(path.join(OUT, file)), 'C4_METHOD_NEW_ORIGINAL_IMAGE');
  const body = await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
  row.images.push({ file, bytes: body.length, sha256: sha(body), width: body.readUInt32BE(16), height: body.readUInt32BE(20), scope: 'NORMAL_NATIVE_VIEWPORT_ORIGINAL' });
}
async function journey(context, row) {
  const page = await context.newPage(), queue = [], jobs = [], requestJobs = new Map();
  page.setDefaultTimeout(15000); page.on('pageerror', error => row.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
  page.on('response', response => { const job = requestJobs.get(response.request()); if (job) job.response.resolve(response); });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), item = { url: url.href, method: request.method(), type: request.resourceType() };
    try {
      a(!url.username && !url.password && !url.hash, 'C4_METHOD_REQUEST_AUTHORITY');
      if (url.origin === new URL(base).origin) {
        const fresh = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh'));
        a(['GET', 'HEAD'].includes(request.method()) && (!url.search || fresh), 'C4_METHOD_STATIC_REQUEST');
        const shell = url.pathname === '/football-connect-4' && request.resourceType() === 'document';
        const file = shell || url.pathname === '/' ? '/index.html' : url.pathname, pin = files.get(file);
        a(pin, 'C4_METHOD_COMPLETED_DIST_FILE'); const body = shell || file === '/index.html' ? index : fs.readFileSync(path.join(DIST, pin.file));
        a.equal(sha(body), pin.sha256, 'C4_METHOD_ASSET_HELD'); row.io.push({ ...item, kind: shell ? 'actual-built-source-shell' : 'completed-dist', file: pin.file, bytes: body.length, sha256: sha(body) });
        return await route.fulfill({ status: 200, contentType: mime(pin.file), body: request.method() === 'HEAD' ? Buffer.alloc(0) : body });
      }
      if (request.method() === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(request.resourceType())) {
        const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', bytes: font.body.length, sha256: font.sha256 });
        return await route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
      }
      if (url.origin === BACKEND && url.pathname === '/rest/v1/player_market_values' && request.method() === 'GET' && request.postData() === null) {
        row.io.push({ ...item, kind: 'synthetic-QA-player-search' });
        return await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PLAYERS), headers: { 'content-range': '0-3/4' } });
      }
      if (url.origin === BACKEND && url.pathname === '/functions/v1/football-connect4-validate') {
        a(request.method() === 'POST' && !url.search && request.resourceType() === 'fetch', 'C4_METHOD_VALIDATOR_SHAPE');
        const job = queue.shift(), body = request.postDataJSON(); a(job, 'C4_METHOD_UNEXPECTED_VALIDATOR');
        a.deepEqual(Object.keys(body).sort(), ['columnAttribute', 'playerName', 'rowAttribute']);
        a.deepEqual(body, { playerName: job.name, columnAttribute: job.column, rowAttribute: job.row }, 'C4_METHOD_ACTUAL_CLUE_REQUEST');
        const record = { ...item, purpose: job.purpose, body, bodySHA256: sha(request.postData()), callbacks: 1, fulfillments: 0 };
        row.validators.push(record); job.record = record; row.io.push({ ...item, kind: 'synthetic-QA-validator', purpose: job.purpose }); requestJobs.set(request, job); job.seen.resolve();
        await job.release.promise; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(job.reply) }); record.fulfillments += 1; return;
      }
      const shell = shellFixture(request, url);
      if (shell) { row.io.push({ ...item, kind: shell.id }); return await route.fulfill({ status: 200, contentType: 'application/json', body: shell.body, headers: shell.date ? { date: shell.date } : {} }); }
      throw new Error('C4_METHOD_UNEXPECTED_REQUEST');
    } catch (error) { row.io.push({ ...item, kind: 'unknown-refused', error: error.message }); await route.abort('blockedbyclient').catch(() => {}); }
  });
  async function open(first) {
    await page.goto(base + '/football-connect-4', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1, name: 'SOCCER CONNECT 4', exact: true }).waitFor();
    if (first) { const reject = page.getByRole('button', { name: 'Reject all', exact: true }); await reject.click(); await reject.waitFor({ state: 'hidden' }); }
    await page.waitForFunction(() => document.fonts.status === 'loaded' && ['Inter', 'Space Grotesk'].every(name => [...document.fonts].some(face => face.family.replace(/['"]/g, '') === name && face.status === 'loaded')));
    const actualFonts = await page.evaluate(() => ({ status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) }));
    checkFonts(actualFonts); row.fonts.push(actualFonts); await page.getByRole('button', { name: '∞ Unlimited', exact: true }).click();
  }
  async function select() { await page.getByRole('button', { name: /^Empty square,/ }).first().click(); }
  async function send(name, purpose, held = false, valid = true) {
    const value = await sample(page), match = value.clue?.match(/"(.+)" and "(.+)"/); a(match, 'C4_METHOD_ACTUAL_SELECTED_CLUE');
    const job = { name, purpose, column: match[1], row: match[2], seen: deferred(), response: deferred(), release: deferred(),
      reply: valid ? { valid: true, fullName: name } : { valid: false, reason: 'QA old-game refusal' } };
    jobs.push(job); queue.push(job); if (!held) job.release.resolve();
    await page.getByRole('combobox', { name: 'Enter soccer player name...' }).fill(name);
    await page.getByRole('option', { name: new RegExp(name, 'i') }).click(); await bounded(job.seen.promise, purpose + '_REQUEST'); return job;
  }
  async function finish(job) {
    job.release.resolve(); const response = await bounded(job.response.promise, job.purpose + '_RESPONSE');
    const body = await response.body(); a.equal(response.status(), 200); a.deepEqual(JSON.parse(body.toString('utf8')), job.reply); a.equal(await response.finished(), null);
    const file = row.id + '-' + job.purpose + '-response.json'; fs.writeFileSync(path.join(OUT, file), body, { flag: 'wx' });
    job.record.response = { status: response.status(), file, bytes: body.length, sha256: sha(body), actualFrameTimes: await frames(page) }; return sample(page);
  }
  try {
    await open(true); await select(); const prior = await send(PRIOR, 'prior'); const before = await finish(prior); oneBlue(before, PRIOR);
    await select(); const old = await send(LATE, 'stale', true); a.equal((await sample(page)).input?.disabled, true, 'C4_METHOD_OLD_REQUEST_PENDING');
    await page.getByRole('button', { name: '∞ Unlimited', exact: true }).click();
    const fresh = await sample(page); a(fresh.cells.length === 42 && fresh.cells.every(cell => cell.label.startsWith('Empty square,')) && fresh.blueTurn === 1 && fresh.redTurn === 0, 'C4_NATIVE_RESTART_FOUNDATION');
    await select(); await page.getByRole('combobox', { name: 'Enter soccer player name...' }).fill('QA New Draft');
    row.scenario1 = { prior: before, fresh, beforeOld: await sample(page), afterOld: await finish(old) };
    await picture(page, row, 'old-reply-draft'); const current = await send(CURRENT, 'fresh'); row.scenario1.afterCurrent = await finish(current); await picture(page, row, 'fresh-valid');
    await open(false); await select(); const refusal = await send(LATE, 'old-refusal', true, false);
    await page.getByRole('button', { name: '∞ Unlimited', exact: true }).click(); await select(); const newer = await send(NEWER, 'newer', true);
    row.scenario2 = { beforeOld: await sample(page), afterOld: await finish(refusal) }; await picture(page, row, 'new-request-still-pending');
    row.scenario2.afterCurrent = await finish(newer); a.equal(queue.length, 0, 'C4_METHOD_NO_UNUSED_REPLY_PLAN');
  } finally { for (const job of jobs) job.release.resolve(); await page.close(); }
}

try {
  if (!base) {
    const listener = net.createServer(); await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve)); const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve)); base = 'http://127.0.0.1:' + port;
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(port)], { stdio: ['ignore', fs.openSync(path.join(OUT, 'server.stdout'), 'wx'), fs.openSync(path.join(OUT, 'server.stderr'), 'wx')] });
    server.on('error', error => { if (!stopping) report.failures.push({ method: 'server', message: error.message }); });
    let ready = false; for (let attempt = 0; attempt < 40 && !ready; attempt += 1) { ready = await fetch(base).then(response => response.ok).catch(() => false); if (!ready) await new Promise(resolve => setTimeout(resolve, 100)); } a(ready, 'C4_METHOD_SERVER_READY');
  }
  const origin = new URL(base); a(origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) && !origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === '/', 'C4_METHOD_LOOPBACK_BASE'); base = origin.origin;
  browser = await chromium.launch();
  for (const profile of PROFILES) {
    const row = { ...profile, io: [], validators: [], pageErrors: [], consoleErrors: [], fonts: [], images: [] }; report.profiles.push(row);
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, colorScheme: 'light', reducedMotion: 'reduce' });
    try { await journey(context, row); } catch (error) { report.failures.push({ profile: row.id, name: error.name, message: error.message, stack: error.stack }); }
    finally { await context.close(); write(row.id + '-observations.json', row); }
  }
  a.equal(report.failures.length, 0, 'C4_METHOD_COMPLETE_JOURNEYS'); judge(report);
  const foundation = Buffer.from(JSON.stringify(report, null, 2) + '\n'), working = path.join(OUT, 'observation-working.json'); fs.writeFileSync(path.join(OUT, 'observation-foundation.json'), foundation, { flag: 'wx' }); fs.writeFileSync(working, foundation, { flag: 'wx' });
  const mutations = [
    ['fresh-board', value => { value.profiles[0].scenario1.afterOld.cells[0].label = 'QA Copied Disc'; }, 'C4_NATIVE_FRESH_BOARD'],
    ['fresh-draft', value => { value.profiles[0].scenario1.afterOld.input.value = 'QA Copied Draft'; }, 'C4_NATIVE_NEW_DRAFT'],
    ['fresh-clue', value => { value.profiles[0].scenario1.afterOld.clue = 'QA Copied Clue'; }, 'C4_NATIVE_CLUE'],
    ['new-request-lock', value => { value.profiles[0].scenario2.afterOld.input.disabled = false; }, 'C4_NATIVE_NEW_REQUEST_LOCK'],
    ['fresh-piece', value => { value.profiles[0].scenario1.afterCurrent.cells.find(cell => cell.team).team = 'red'; }, 'C4_NATIVE_FRESH_PIECE'],
    ['callback-once', value => { value.profiles[0].validators[0].fulfillments = 2; }, 'C4_METHOD_CALLBACK_ONCE'],
    ['validator-sequence', value => { value.profiles[0].validators.pop(); }, 'C4_METHOD_VALIDATOR_SEQUENCE'],
    ['unknown-request', value => { value.profiles[0].io[0].kind = 'unknown-refused'; }, 'C4_METHOD_KNOWN_IO_ONLY'],
    ['page-error', value => { value.profiles[0].pageErrors.push('QA copied error'); }, 'C4_METHOD_PAGE_ERRORS'],
    ['image-hash', value => { value.profiles[0].images[0].sha256 = '0'.repeat(64); }, 'C4_METHOD_IMAGE_HASH'],
  ];
  for (const [id, mutate, marker] of mutations) {
    const copy = JSON.parse(fs.readFileSync(working, 'utf8')); mutate(copy); const changed = Buffer.from(JSON.stringify(copy, null, 2) + '\n'); a.notEqual(sha(changed), sha(foundation)); fs.writeFileSync(working, changed); fs.writeFileSync(path.join(OUT, id + '.changed.json'), changed, { flag: 'wx' });
    let error; try { judge(JSON.parse(fs.readFileSync(working, 'utf8'))); } catch (caught) { error = caught; }
    finally { fs.writeFileSync(working, foundation); a.deepEqual(fs.readFileSync(working), foundation); judge(JSON.parse(fs.readFileSync(working, 'utf8'))); fs.writeFileSync(path.join(OUT, id + '.restored.json'), fs.readFileSync(working), { flag: 'wx' }); }
    a(error instanceof a.AssertionError && error.message.includes(marker), 'C4_METHOD_OWNED_COPIED_REFUSAL'); report.controls.push({ id, marker, beforeSHA256: sha(foundation), changedSHA256: sha(changed), restoredSHA256: sha(foundation), workingFile: 'observation-working.json', sameCopyRestored: true, scope: 'COPIED_OBSERVATION_ONLY', featurePassCredit: false });
  }
  report.status = 'C4_NATIVE_REQUEST_OWNERSHIP_PASSED';
} catch (error) { report.status = 'C4_NATIVE_REQUEST_OWNERSHIP_FAILED'; report.failures.push({ name: error.name, message: error.message, stack: error.stack }); process.exitCode = 1; }
finally {
  try { if (browser) await browser.close(); } catch (error) { report.status = 'C4_NATIVE_REQUEST_OWNERSHIP_FAILED'; report.failures.push({ method: 'browser-close', message: error.message }); process.exitCode = 1; }
  stopping = true; if (server) server.kill(); write('REQUEST-OWNERSHIP-REPORT.json', report);
}
console.log(report.status + ': ' + report.profiles.length + ' profiles, ' + report.controls.length + ' copied controls; no live backend or publication claim.');
