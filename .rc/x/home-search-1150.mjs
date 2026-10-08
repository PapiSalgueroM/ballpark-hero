// Finite real-page search recovery proof. Runs only in the remote checker.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote runtime only');
const out = path.join(process.env.E, 'native');
const roots = { candidate: process.cwd(), parent: process.env.PARENT_ROOT };
assert(roots.parent && process.env.CHECKED_HEAD && process.env.BASE_HEAD);
fs.mkdirSync(out, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};
const sources = ['src/pages/Index.tsx', 'src/pages/Search.tsx', 'src/lib/siteSearch.ts', 'src/lib/freshBuild.ts', 'src/main.tsx'];
const builds = {};
for (const [name, root] of Object.entries(roots)) {
  const bindings = [], seen = new Set(), engineFiles = [];
  for (const mapName of fs.readdirSync(path.join(root, 'dist/assets')).filter(n => n.endsWith('.js.map'))) {
    const mapFile = path.join(root, 'dist/assets', mapName), mapBytes = fs.readFileSync(mapFile), map = JSON.parse(mapBytes);
    assert.equal(map.sources.length, map.sourcesContent.length);
    const matches = [];
    for (let i = 0; i < map.sources.length; i++) for (const source of sources) {
      const normalized = map.sources[i].replaceAll('\\', '/');
      if (normalized !== source && !normalized.endsWith('/' + source)) continue;
      const bytes = fs.readFileSync(path.join(root, source));
      assert.equal(sha(Buffer.from(map.sourcesContent[i])), sha(bytes), name + ':' + source);
      seen.add(source); matches.push({ source, sha256: sha(bytes), mapIndex: i });
      if (source === 'src/lib/siteSearch.ts') engineFiles.push('/assets/' + mapName.slice(0, -4));
    }
    if (!matches.length) continue;
    const jsFile = mapFile.slice(0, -4), jsBytes = fs.readFileSync(jsFile);
    assert(jsBytes.toString().includes('//# sourceMappingURL=' + mapName));
    for (const file of [mapFile, jsFile]) write(path.join(out, name, 'core', 'assets', path.basename(file)), fs.readFileSync(file));
    bindings.push({ map: '/assets/' + mapName, mapSha256: sha(mapBytes), js: '/assets/' + path.basename(jsFile), jsSha256: sha(jsBytes), matches });
  }
  assert.deepEqual([...seen].sort(), sources.slice().sort());
  assert.equal(engineFiles.length, 1, 'Exactly one emitted chunk contains the actual search engine');
  for (const file of ['index.html', 'search/index.html']) write(path.join(out, name, 'core', file), fs.readFileSync(path.join(root, 'dist', file)));
  builds[name] = { root, engine: engineFiles[0], bindings };
}
write(path.join(out, 'build-bindings.json'), builds);

const rows = [], servers = [], payloads = new Map();
let browser;
async function startServer(root, port) {
  const child = spawn(process.execPath, [path.join(root, 'scripts/lib/hostLikeServer.mjs'), path.join(root, 'dist'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  servers.push(child);
  let log = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Host-like server did not become ready')), 10000);
    const data = bytes => { log += bytes; if (log.includes('host-like server:')) { clearTimeout(timer); resolve(); } };
    child.stdout.on('data', data); child.stderr.on('data', data);
    child.once('error', e => { clearTimeout(timer); reject(e); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('Server exited ' + code)); });
  });
  return { base: 'http://127.0.0.1:' + port, child, log: () => log };
}
async function runCase(target, width, kind, query) {
  const id = `${target}-${width}-${kind}`, row = { id, target, width, kind, query, status: 'running', stages: [], requests: [], responses: [], console: [], pageErrors: [], captures: [] };
  rows.push(row);
  const dir = path.join(out, 'cases', id), build = builds[target], server = build.server;
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const jobs = [], captureErrors = [];
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await context.addInitScript(() => {
    window.__searchProof = { documentId: crypto.randomUUID(), preloadErrors: [], activations: [], startingLatch: sessionStorage.getItem('dukb-reloaded-stale-chunk') };
    sessionStorage.setItem('dukb-reloaded-stale-chunk', '1');
    window.addEventListener('vite:preloadError', e => window.__searchProof.preloadErrors.push(String(e.payload?.message ?? e.payload)));
    for (const type of ['keydown', 'click']) document.addEventListener(type, event => {
      if (event.target?.closest?.('button[aria-label="Clear search"]')) window.__searchProof.activations.push({ type, key: event.key, trusted: event.isTrusted, label: event.target.closest('button').getAttribute('aria-label') });
    }, true);
  });
  page.on('console', msg => row.console.push({ type: msg.type(), text: msg.text(), location: msg.location() }));
  page.on('pageerror', e => row.pageErrors.push({ name: e.name, message: e.message, stack: e.stack }));
  page.on('request', r => row.requests.push({ url: r.url(), method: r.method(), type: r.resourceType(), navigation: r.isNavigationRequest() }));
  page.on('response', response => {
    if (new URL(response.url()).origin !== server.base) return;
    const job = (async () => {
      const bytes = await response.body(), url = new URL(response.url()), relative = url.pathname === '/' ? '/index.html' : url.pathname === '/search' ? '/search/index.html' : url.pathname;
      const actual = path.join(build.root, 'dist', relative.slice(1));
      assert(fs.existsSync(actual), 'Actual served path exists in held dist: ' + relative);
      assert.equal(sha(bytes), sha(fs.readFileSync(actual)), 'Served payload equals actual dist: ' + relative);
      const digest = sha(bytes), key = digest + '-' + path.basename(actual);
      if (!payloads.has(key)) { write(path.join(out, 'served', key), bytes); payloads.set(key, { sha256: digest, size: bytes.length }); }
      row.responses.push({ url: response.url(), status: response.status(), path: relative, sha256: digest, size: bytes.length, file: 'served/' + key });
    })().catch(e => captureErrors.push({ message: e.message, stack: e.stack }));
    jobs.push(job);
  });
  let fault = kind === 'pending' ? 'pause' : kind.startsWith('failure') ? 'abort' : 'none';
  let intercepted = 0, release, paused;
  const pausedRequest = new Promise(resolve => { paused = resolve; });
  const releaseRequest = new Promise(resolve => { release = resolve; });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== server.base) {
      row.external ??= []; row.external.push({ origin: url.origin, path: url.pathname, method: request.method(), type: request.resourceType(), disposition: 'locally fulfilled, never forwarded' });
      if (url.hostname === 'flagcdn.com') return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5sAAAAASUVORK5CYII=', 'base64') });
      return route.fulfill({ contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
    }
    if (url.pathname === build.engine && fault !== 'none') {
      intercepted++; row.faults ??= []; row.faults.push({ url: request.url(), method: request.method(), type: request.resourceType(), fault });
      if (fault === 'pause') { paused(); await releaseRequest; }
      else return route.abort('failed');
    }
    return route.continue();
  });
  await context.routeWebSocket('**/*', socket => { row.external ??= []; row.external.push({ url: socket.url(), type: 'websocket', disposition: 'closed locally, never forwarded' }); socket.close(); });
  const box = () => page.getByRole('textbox', { name: 'Search games', exact: true });
  const homeResults = () => page.locator('#dukb-main a.home-tile');
  const snapshot = async stage => {
    const state = await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="Search games"]'), rect = input?.getBoundingClientRect();
      return { url: location.href, proof: window.__searchProof, scrollY, input: input?.value, active: { tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') }, inputTop: rect?.top, width: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyText: document.body.innerText, html: document.documentElement.outerHTML, local: { ...localStorage }, session: { ...sessionStorage } };
    });
    write(path.join(dir, stage + '.json'), state); await page.screenshot({ path: path.join(dir, stage + '.png'), fullPage: false }); row.captures.push(stage); return state;
  };
  const absentEmpty = async () => assert.equal(await page.getByText(/^No games found for/).count(), 0, 'Pending/error never claims genuine empty results');
  const fold = () => page.evaluate(() => {
    const tiles = [...document.querySelectorAll('#dukb-main a[data-stage-card], #dukb-main a.home-tile')].map(el => {
      const box = el.getBoundingClientRect(); return { path: el.getAttribute('href'), top: box.top + scrollY, width: box.width, height: box.height };
    }).filter(r => r.path?.startsWith('/') && r.width > 0 && r.height > 0).sort((a, b) => a.top - b.top);
    const first = tiles[0], asks = [];
    for (const el of document.querySelectorAll('a, button, span, p')) {
      if (el.querySelector('a, button, span, p')) continue;
      const text = (el.innerText || el.textContent || '').trim(), box = el.getBoundingClientRect(), y = box.top + scrollY;
      if (box.width > 0 && box.height > 0 && y >= 0 && y < first?.top && /sign ?up|create a free account|make a free (account|one)|log ?in/i.test(text)) asks.push({ y, text });
    }
    return { first, asks, accountRows: [...new Set(asks.map(a => Math.round(a.y / 24)))], tileCount: tiles.length };
  });
  try {
    await page.goto(server.base, { waitUntil: 'domcontentloaded' }); await box().waitFor(); await page.locator('#dukb-main a[data-stage-card]').first().waitFor();
    row.fold = await fold(); assert(row.fold.first && row.fold.tileCount > 0); assert(row.fold.first.top <= 430, 'First actual playable tile remains within 430 pixels'); assert(row.fold.accountRows.length <= 2, 'At most two account asks above the first tile');
    if (target === 'candidate' && kind === 'healthy') {
      const stage = page.locator('[data-home-stage]'), original = await stage.getAttribute('style');
      row.foldStageBefore = await stage.evaluate(el => ({ style: el.getAttribute('style'), marginTop: getComputedStyle(el).marginTop, top: el.getBoundingClientRect().top + scrollY }));
      await stage.evaluate(el => { const block = document.createElement('div'); block.setAttribute('data-search-proof-push', ''); block.style.cssText = 'height:500px;min-height:500px;max-height:500px;flex-shrink:0'; el.before(block); });
      const block = page.locator('[data-search-proof-push]'); assert.equal(await block.count(), 1);
      row.foldPushBlock = await block.evaluate(el => ({ height: el.getBoundingClientRect().height, top: el.getBoundingClientRect().top + scrollY, computedHeight: getComputedStyle(el).height }));
      row.foldPushControl = await fold(); await snapshot('00-fold-push-control');
      assert.equal(row.foldPushBlock.height, 500); assert.equal(await stage.getAttribute('style'), original);
      assert(row.foldPushControl.first.top - row.fold.first.top >= 499); assert(row.foldPushControl.first.top > 430);
      await block.evaluate(el => el.remove());
      row.foldPushRestored = await fold(); await snapshot('00-fold-push-restored');
      assert.equal(await page.locator('[data-search-proof-push]').count(), 0); assert.equal(await stage.getAttribute('style'), original);
      assert(Math.abs(row.foldPushRestored.first.top - row.fold.first.top) <= 1); assert.deepEqual({ ...row.foldPushRestored, first: { ...row.foldPushRestored.first, top: row.fold.first.top } }, row.fold);
      await stage.evaluate(el => { const box = document.createElement('div'); box.setAttribute('data-search-proof-asks', ''); for (let i = 0; i < 3; i++) { const p = document.createElement('p'); p.textContent = 'Create a free account.'; p.style.cssText = 'height:24px;margin:0'; box.append(p); } el.before(box); });
      row.accountAskControl = await fold(); await snapshot('00-account-rows-control');
      assert(row.accountAskControl.accountRows.length >= row.fold.accountRows.length + 3); assert(row.accountAskControl.accountRows.length > 2);
      await page.locator('[data-search-proof-asks]').evaluate(el => el.remove());
      row.foldRestored = await fold(); await snapshot('00-fold-restored');
      assert.equal(await page.locator('[data-search-proof-asks]').count(), 0); assert.equal(await stage.getAttribute('style'), original);
      assert(Math.abs(row.foldRestored.first.top - row.fold.first.top) <= 1); assert.deepEqual({ ...row.foldRestored, first: { ...row.foldRestored.first, top: row.fold.first.top } }, row.fold);
    }
    const before = await snapshot('00-home'); assert.equal(before.session['dukb-reloaded-stale-chunk'], '1');
    await box().fill(query);
    if (kind === 'pending') {
      await Promise.race([pausedRequest, new Promise((_, reject) => setTimeout(() => reject(new Error('No actual engine chunk request was paused')), 10000))]);
      assert.equal(intercepted, 1); await page.locator('#dukb-main [aria-busy="true"]').waitFor(); await absentEmpty();
      const pending = await snapshot('01-actual-pending');
      if (target === 'candidate') assert.equal(await page.getByRole('status').filter({ hasText: 'Loading games...' }).innerText(), 'Loading games...');
      else { assert.equal(await page.getByText('Loading games...', { exact: true }).count(), 0); assert.equal(await page.locator('#dukb-main [aria-busy="true"]').innerText(), ''); row.observedDefect = 'Actual delayed engine leaves an empty busy region.'; }
      assert.equal(pending.proof.documentId, before.proof.documentId);
      fault = 'none'; release(); await homeResults().first().waitFor();
      assert.equal(await homeResults().first().getAttribute('href'), '/soccer-career', 'Exact game label ranks first');
      assert.equal(await page.locator('#dukb-main [aria-busy="true"]').count(), 0);
      await snapshot('02-pending-released'); row.stages.push('Actual chunk paused, honest pending measured, release produces exact-name first result');
    } else if (kind.startsWith('failure')) {
      await page.waitForFunction(() => window.__searchProof.preloadErrors.length > 0);
      assert.equal(intercepted, 1, 'One actual emitted engine request was aborted'); await absentEmpty();
      if (target === 'parent') {
        await page.locator('#dukb-main [aria-busy="true"]').waitFor();
        assert.equal(await page.getByRole('link', { name: 'Open full search', exact: true }).count(), 0);
        assert.equal(await page.locator('#dukb-main [aria-busy="true"]').innerText(), '');
        const failed = await snapshot('01-actual-failed-parent'); assert.equal(failed.proof.documentId, before.proof.documentId);
        row.observedDefect = 'Actual failed import remains an empty busy region without recovery.';
      } else {
        const alert = page.getByRole('alert').filter({ hasText: "Search couldn't load." }); await alert.waitFor();
        assert.equal(await page.locator('#dukb-main [aria-busy="true"]').count(), 0);
        const link = alert.getByRole('link', { name: 'Open full search', exact: true });
        assert.equal(await link.evaluate(node => node.tagName), 'A');
        assert.equal(await link.getAttribute('href'), '/search?q=' + encodeURIComponent(query));
        const failed = await snapshot('01-actual-failed-candidate'); assert.equal(failed.proof.documentId, before.proof.documentId);
        fault = 'none';
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), link.click()]);
        await box().waitFor(); assert.equal(new URL(page.url()).pathname, '/search'); assert.equal(new URL(page.url()).searchParams.get('q'), query); assert.equal(await box().inputValue(), query);
        if (kind === 'failure-encoded') await page.getByText(`Nothing matches "${query.trim()}".`, { exact: true }).waitFor();
        else { await page.locator('#dukb-main a[data-result]').first().waitFor(); assert.equal(await page.locator('#dukb-main a[data-result]').first().getAttribute('href'), '/soccer-career'); }
        const recovered = await snapshot('02-fresh-document-recovery'); assert.notEqual(recovered.proof.documentId, before.proof.documentId, 'Recovery actually replaced the document');
        assert.equal(recovered.proof.preloadErrors.length, 0); assert.equal(recovered.session['dukb-reloaded-stale-chunk'], '1');
        assert(row.requests.some(r => r.navigation && new URL(r.url).pathname === '/search'), 'Actual fresh search document was requested');
        row.stages.push('Actual import failure has explicit recovery; encoded query reaches a new document and real search engine output');
      }
    } else {
      await homeResults().first().waitFor(); assert.equal(await homeResults().first().getAttribute('href'), '/soccer-career'); await snapshot('01-healthy-ranked');
      await box().fill('zzqxv999999unfindable'); await page.getByText('No games found for "zzqxv999999unfindable"', { exact: true }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'Open full search', exact: true }).count(), 0);
      assert.equal(await page.getByText('Loading games...', { exact: true }).count(), 0);
      await page.evaluate(() => scrollTo(0, Math.min(80, document.documentElement.scrollHeight - innerHeight)));
      const empty = await snapshot('02-genuine-empty'), clear = page.getByRole('button', { name: 'Clear search', exact: true }); await clear.focus();
      assert(await clear.evaluate(el => document.activeElement === el), 'Actual Clear button has keyboard focus'); await clear.press('Enter');
      await page.waitForFunction(() => document.querySelector('input[aria-label="Search games"]')?.value === '');
      const cleared = await snapshot('03-cleared');
      assert(cleared.proof.activations.some(a => a.type === 'keydown' && a.key === 'Enter' && a.trusted)); assert(cleared.proof.activations.some(a => a.type === 'click' && a.trusted), 'Trusted keyboard activation fires the actual Clear button');
      if (target === 'candidate') assert.equal(cleared.active.label, 'Search games', 'Clear restores actual input focus');
      else { assert.equal(cleared.active.tag, 'BODY', 'Untouched parent loses focus when Clear unmounts'); row.observedDefect = 'Clearing removes the focused button and leaves focus on the body.'; }
      assert(Math.abs(cleared.scrollY - empty.scrollY) <= 1, 'Clear does not jump'); assert(Math.abs(cleared.inputTop - empty.inputTop) <= 1, 'Search box stays in place');
      await box().fill('Soccer Career'); await homeResults().first().waitFor(); const href = await homeResults().first().getAttribute('href');
      await homeResults().first().click(); await page.waitForURL(url => url.pathname === href); assert.equal(href, '/soccer-career'); await page.waitForFunction(() => document.title.includes('Soccer Career')); await page.getByRole('heading', { level: 1 }).filter({ hasText: 'Soccer Career' }).waitFor(); await snapshot('04-result-navigation');
      row.stages.push('Healthy first ranking, genuine miss, clear focus without jump, real result navigation');
    }
    await Promise.all(jobs);
    if (kind === 'failure' && target === 'parent') assert(!row.responses.some(r => r.path === build.engine), 'Parent failed import never received successful engine bytes');
    else assert(row.responses.some(r => r.path === build.engine), 'Actual engine bytes are delivered');
    row.status = 'completed';
  } catch (e) {
    row.status = 'failed'; row.error = { name: e.name, message: e.message, stack: e.stack };
    try { await snapshot('failure'); } catch (capture) { captureErrors.push({ message: capture.message, stack: capture.stack }); }
  } finally {
    release();
    try { await page.close(); await Promise.all(jobs); await context.close(); } catch (e) { captureErrors.push({ message: e.message, stack: e.stack }); }
    row.captureErrors = captureErrors;
    const unexpectedConsole = row.console.filter(c => c.type === 'error' && !(kind.startsWith('failure') && c.location.url?.endsWith(build.engine) && /Failed to load resource/.test(c.text)));
    row.unexpectedConsole = unexpectedConsole;
    if (captureErrors.length || row.pageErrors.length || unexpectedConsole.length) row.status = 'failed';
    write(path.join(dir, 'case.json'), row); console.log(id + ': ' + row.status + (row.error ? ' ' + row.error.message : ''));
  }
}
try {
  for (const [name, build] of Object.entries(builds)) build.server = await startServer(build.root, name === 'candidate' ? 4190 : 4191);
  browser = await chromium.launch({ headless: true });
  for (const width of [390, 1280]) {
    for (const target of ['candidate', 'parent']) {
      await runCase(target, width, 'pending', 'Soccer Career');
      await runCase(target, width, 'failure', 'Soccer Career');
      if (target === 'candidate') await runCase(target, width, 'failure-encoded', ' Soccer Career + & São Paulo ');
      await runCase(target, width, 'healthy', 'Soccer Career');
    }
  }
} catch (e) { write(path.join(out, 'infrastructure-error.json'), { message: e.message, stack: e.stack }); process.exitCode = 1; }
finally {
  try { if (browser) await browser.close(); } catch (e) { write(path.join(out, 'finalization-error.json'), { message: e.message, stack: e.stack }); process.exitCode = 1; }
  for (const [name, build] of Object.entries(builds)) if (build.server) { write(path.join(out, name, 'server.log'), build.server.log()); build.server.child.kill('SIGTERM'); }
  write(path.join(out, 'report.json'), { checked: process.env.CHECKED_HEAD, base: process.env.BASE_HEAD, expectedCases: 14, rows, payloads: Object.fromEntries(payloads), limits: 'Local host-like candidate and exact parent builds only. Fresh guests, no backend writes forwarded. External assets are locally fulfilled; screenshots do not claim actual web-font rendering. Six parent cases retain the observed pending/failure/focus defect as explicit controls.' });
  if (rows.length !== 14 || rows.some(r => r.status !== 'completed')) process.exitCode = 1;
  console.log(`Home search1150 finite proof: ${rows.filter(r => r.status === 'completed').length}/14 completed; parent defects remain explicit controls.`);
}
