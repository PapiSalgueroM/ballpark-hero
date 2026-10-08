// Remote component proof. No Club Manager route or save integration claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright';

assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert(process.env.E && process.env.PARENT_ROOT && process.env.CHECKED_HEAD);
const out = path.join(process.env.E, 'native');
const roots = { candidate: process.cwd(), parent: process.env.PARENT_ROOT };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};
const error = e => ({ name: e.name, message: e.message, stack: e.stack });
const component = 'src/components/club-manager/RolesScreen.tsx';
const coreSources = [component, 'src/lib/clubManager.ts', 'src/hooks/useRevealScroll.ts'];
const assets = new Map(), bundles = {}, rows = [], jobs = [], captureErrors = [];
for (const source of coreSources.slice(1)) assert.equal(sha(fs.readFileSync(path.join(roots.candidate, source))), sha(fs.readFileSync(path.join(roots.parent, source))), 'Actual helpers remain unchanged');

const html = fs.readFileSync('dist/index.html', 'utf8');
const cssPaths = [...new Set([...html.matchAll(/<link\b[^>]*href=["']([^"']+\.css)["'][^>]*>/g)].map(m => m[1]))];
assert(cssPaths.length > 0 && cssPaths.every(p => p.startsWith('/assets/')));
for (const url of cssPaths) {
  const bytes = fs.readFileSync(path.join(process.cwd(), 'dist', url.slice(1))), retained = path.join(out, 'css', path.basename(url));
  write(retained, bytes); assets.set(url, { bytes, type: 'text/css', retained });
}
// Bind the actual candidate app build as well as the served component fixture.
const viteBindings = [], viteSeen = new Set();
for (const name of fs.readdirSync('dist/assets').filter(n => n.endsWith('.js.map'))) {
  const file = path.join(process.cwd(), 'dist/assets', name), bytes = fs.readFileSync(file), map = JSON.parse(bytes), matches = [];
  for (let i = 0; i < map.sources.length; i++) for (const source of coreSources) {
    const normalized = map.sources[i].replaceAll('\\', '/');
    if (normalized !== source && !normalized.endsWith('/' + source)) continue;
    assert.equal(sha(Buffer.from(map.sourcesContent[i])), sha(fs.readFileSync(path.join(process.cwd(), source))));
    viteSeen.add(source); matches.push({ source, index: i, sha256: sha(Buffer.from(map.sourcesContent[i])) });
  }
  if (matches.length) {
    const js = file.slice(0, -4); write(path.join(out, 'vite-core', name), bytes); write(path.join(out, 'vite-core', path.basename(js)), fs.readFileSync(js));
    viteBindings.push({ map: name, sha256: sha(bytes), js: path.basename(js), jsSha256: sha(fs.readFileSync(js)), matches });
  }
}
assert.deepEqual([...viteSeen].sort(), coreSources.slice().sort());
write(path.join(out, 'vite-bindings.json'), viteBindings);

async function bundle(arm, root, sourceFile) {
  const dir = path.join(out, 'fixtures', arm), entry = path.join(dir, 'entry.tsx');
  const code = `import { createRoot } from 'react-dom/client';
import { RolesScreen } from ${JSON.stringify(sourceFile)};
import { startCareer, brokenPromises, promiseGap, squadByRole, ROLE_INFO } from ${JSON.stringify(path.join(root, 'src/lib/clubManager.ts'))};
window.mountRoles1152 = total => {
  const base = startCareer('Brentford');
  if (base.squad.length < total + 3) throw new Error('Actual career has too few fixture players');
  const ids = base.squad.slice(0, total).map(p => p.id);
  const loanId = base.squad[total].id, shortId = base.squad[total + 1].id, satisfiedId = base.squad[total + 2].id;
  const career = { ...base, squad: base.squad.map(p => {
    const index = ids.indexOf(p.id), q = { ...p, role: 'backup', lastTen: Array(10).fill(1), onLoan: false, wantsOut: false };
    if (index >= 0) { q.role = 'star'; q.lastTen = [...Array(index).fill(1), ...Array(10 - index).fill(0)]; }
    if (p.id === loanId) { q.role = 'star'; q.lastTen = Array(10).fill(0); q.onLoan = true; q.wantsOut = total > 0; }
    if (p.id === shortId) { q.role = 'star'; q.lastTen = [0, 0, 0]; }
    if (p.id === satisfiedId) { q.role = 'star'; q.wantsOut = total >= 5; }
    return q;
  }) };
  const broken = brokenPromises(career);
  window.roles1152 = { career, initial: JSON.stringify(career), total, callbacks: [], expected: {
    ids, broken: broken.map(p => ({ id: p.id, name: p.name, gap: promiseGap(p) })),
    sentinels: { loanId, shortId, satisfiedId }, wantsOut: career.squad.filter(p => p.wantsOut).length,
    groups: squadByRole(career).map(g => ({ role: g.role, label: ROLE_INFO[g.role].label, ids: g.players.map(p => p.id), names: g.players.map(p => p.name) }))
  } };
  createRoot(document.getElementById('root')).render(<main id="roles-fixture" className="mx-auto max-w-xl p-4"><RolesScreen career={career} onSetRole={(id, role) => window.roles1152.callbacks.push({ id, role })} /></main>);
};
window.rolesBundleReady = true;
`;
  write(entry, code);
  const result = await build({ entryPoints: [entry], absWorkingDir: root, outfile: path.join(dir, 'roles.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', sourcemap: 'external', sourcesContent: true, metafile: true, write: false, nodePaths: [path.join(root, 'node_modules')], alias: { '@': path.join(root, 'src') }, define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production","BASE_URL":"/"}' }, logLevel: 'error' });
  for (const file of result.outputFiles) write(file.path, Buffer.from(file.contents));
  write(path.join(dir, 'metafile.json'), result.metafile);
  const inputs = Object.keys(result.metafile.inputs).map(input => {
    const file = path.resolve(root, input), bytes = fs.readFileSync(file);
    return { file, bytes: bytes.length, sha256: sha(bytes) };
  });
  write(path.join(dir, 'inputs.json'), inputs);
  const mapFile = path.join(dir, 'roles.js.map'), map = JSON.parse(fs.readFileSync(mapFile)), matches = [];
  for (let i = 0; i < map.sources.length; i++) {
    const file = path.resolve(dir, map.sources[i]), actual = fs.readFileSync(file);
    assert.equal(sha(Buffer.from(map.sourcesContent[i])), sha(actual), 'Every fixture sourcesContent is the actual input');
    if ([sourceFile, path.join(root, coreSources[1]), path.join(root, coreSources[2])].includes(file)) matches.push({ file, index: i, sha256: sha(actual) });
  }
  assert.equal(matches.length, 3);
  const page = `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${cssPaths.map(p => `<link rel="stylesheet" href="${p}">`).join('')}</head><body><div id="root"></div><script src="/fixture/${arm}/roles.js"></script></body></html>`;
  write(path.join(dir, 'index.html'), page);
  for (const [name, type] of [['index.html', 'text/html'], ['roles.js', 'application/javascript'], ['roles.js.map', 'application/json']]) {
    const file = path.join(dir, name); assets.set('/fixture/' + arm + '/' + name, { bytes: fs.readFileSync(file), type, retained: file });
  }
  bundles[arm] = { root, component: sourceFile, componentSha256: sha(fs.readFileSync(sourceFile)), inputs, matches, jsSha256: sha(fs.readFileSync(path.join(dir, 'roles.js'))), mapSha256: sha(fs.readFileSync(mapFile)) };
}
await bundle('candidate', roots.candidate, path.join(roots.candidate, component));
await bundle('parent', roots.parent, path.join(roots.parent, component));
const original = fs.readFileSync(component, 'utf8'), anchor = 'broken.slice(0, 5).map(p => <PlayerRow';
assert.equal(original.split(anchor).length, 2, 'Preview control changes one real executable anchor');
const changed = original.replace(anchor, 'broken.map(p => <PlayerRow'), controlFile = path.join(out, 'preview-control-source', 'RolesScreen.tsx');
assert.notEqual(changed, original); write(controlFile, changed);
write(path.join(out, 'preview-control-source', 'change.json'), { anchor, originalSha256: sha(Buffer.from(original)), changedSha256: sha(Buffer.from(changed)), replacement: 'broken.map(p => <PlayerRow' });
await bundle('preview-control', roots.candidate, controlFile);
write(path.join(out, 'bundle-bindings.json'), bundles);

const server = http.createServer((req, res) => {
  const asset = assets.get(new URL(req.url, 'http://localhost').pathname);
  if (!asset) { res.writeHead(404); res.end('Missing fixture asset'); return; }
  res.writeHead(200, { 'content-type': asset.type, 'cache-control': 'no-store' }); res.end(asset.bytes);
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
const headline = (n, outCount) => (n === 0 ? 'Everybody is getting roughly the football he was promised. Keep it that way.' : `${n} player${n === 1 ? ' is' : 's are'} not getting what you told ${n === 1 ? 'him' : 'them'} they would.`) + (outCount ? ` ${outCount} ${outCount === 1 ? 'has' : 'have'} asked to leave.` : '');
async function runCase(arm, total, width) {
  const id = `${arm}-${width}-${total}`, dir = path.join(out, 'cases', id), row = { id, arm, total, width, status: 'running', captures: [], responses: [], external: [], console: [], pageErrors: [] };
  rows.push(row);
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' }), page = await context.newPage();
  page.setDefaultTimeout(10000);
  await context.addInitScript(() => {
    let seed = 1152; Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
    const NativeDate = Date, fixed = Date.parse('2026-10-08T16:00:00Z');
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    window.roleActivations = [];
    for (const type of ['keydown', 'click']) document.addEventListener(type, event => { if (event.target?.closest?.('button')) window.roleActivations.push({ type, key: event.key, trusted: event.isTrusted, text: event.target.closest('button').innerText }); }, true);
  });
  await context.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === origin) return route.continue();
    row.external.push({ origin: url.origin, path: url.pathname, method: req.method(), disposition: 'locally fulfilled, never forwarded' });
    return route.fulfill({ contentType: req.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: req.resourceType() === 'stylesheet' ? '' : '[]' });
  });
  await context.routeWebSocket('**/*', socket => { row.external.push({ url: socket.url(), disposition: 'WebSocket closed locally' }); socket.close(); });
  page.on('console', msg => row.console.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', e => row.pageErrors.push(error(e)));
  page.on('response', response => {
    if (new URL(response.url()).origin !== origin) return;
    const job = (async () => { const url = new URL(response.url()), asset = assets.get(url.pathname), bytes = await response.body(); assert(asset); assert.equal(response.status(), 200); assert.equal(sha(bytes), sha(asset.bytes)); row.responses.push({ url: response.url(), file: path.relative(out, asset.retained), bytes: bytes.length, sha256: sha(bytes) }); })().catch(e => captureErrors.push({ case: id, ...error(e) })); jobs.push(job);
  });
  const root = page.locator('#roles-fixture');
  const capture = async stage => {
    const state = await page.evaluate(() => ({ html: document.documentElement.outerHTML, bodyText: document.body.innerText, scrollY, width: innerWidth, documentWidth: document.documentElement.scrollWidth, active: { tag: document.activeElement?.tagName, text: document.activeElement?.textContent }, activations: window.roleActivations, callbacks: window.roles1152.callbacks, careerUnchanged: JSON.stringify(window.roles1152.career) === window.roles1152.initial, local: { ...localStorage } }));
    write(path.join(dir, stage + '.json'), state); await page.screenshot({ path: path.join(dir, stage + '.png') }); row.captures.push(stage); return state;
  };
  try {
    await page.goto(origin + '/fixture/' + arm + '/index.html', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => window.rolesBundleReady);
    await page.evaluate(n => window.mountRoles1152(n), total); await root.getByText('The dressing room', { exact: true }).waitFor();
    row.fixture = await page.evaluate(() => window.roles1152); write(path.join(dir, 'fixture.json'), row.fixture);
    assert.equal(row.fixture.expected.broken.length, total); assert.deepEqual(row.fixture.expected.broken.map(p => p.id), row.fixture.expected.ids);
    assert.equal(new Set(row.fixture.expected.broken.map(p => p.name)).size, total);
    for (const id of Object.values(row.fixture.expected.sentinels)) assert(!row.fixture.expected.broken.some(p => p.id === id));
    for (let i = 1; i < total; i++) assert(row.fixture.expected.broken[i].gap > row.fixture.expected.broken[i - 1].gap);
    row.actualHeadline = await root.locator('p').first().innerText();
    const preview = root.getByText('Needs a word', { exact: true }).locator('..');
    row.previewNames = total ? await preview.getByRole('button').locator('span.text-foreground.truncate').allTextContents() : [];
    row.groups = [];
    for (const group of row.fixture.expected.groups) { const button = root.getByRole('button', { name: new RegExp(group.label) }); assert.equal(await button.count(), 1); const text = await button.innerText(); assert(text.includes(`${group.ids.length} ${group.ids.length === 1 ? 'player' : 'players'}`)); row.groups.push({ ...group, text }); }
    await capture('00-front'); row.stage = 'headline';
    assert.equal(row.actualHeadline, headline(arm === 'parent' ? Math.min(total, 5) : total, row.fixture.expected.wantsOut));
    if (arm === 'parent' && total > 5) {
      let caught; try { assert.equal(row.actualHeadline, headline(total, row.fixture.expected.wantsOut)); } catch (e) { caught = error(e); }
      assert(caught && caught.name === 'AssertionError'); row.parentCountDefect = { expected: headline(total, row.fixture.expected.wantsOut), actual: row.actualHeadline, error: caught };
    }
    row.stage = 'preview-count'; assert.equal(row.previewNames.length, Math.min(total, 5), 'Preview remains capped at five');
    assert.deepEqual(row.previewNames, row.fixture.expected.broken.slice(0, 5).map(p => p.name));
    if (!total) {
      assert.equal(await root.getByText('Needs a word', { exact: true }).count(), 0);
      await root.getByRole('button', { name: /One for the future/ }).click(); await root.getByText('Nobody is on this rung right now.', { exact: true }).waitFor(); await capture('01-empty-rung');
      await root.getByRole('button', { name: 'The dressing room', exact: true }).click();
    } else {
      await preview.getByRole('button').first().focus(); await preview.getByRole('button').first().press('Enter');
      await root.getByText('Tell him what he is', { exact: true }).waitFor(); await root.getByText(row.fixture.expected.broken[0].name, { exact: true }).waitFor(); await capture('01-preview-detail');
      await root.getByRole('button', { name: 'The dressing room', exact: true }).click();
      await root.getByText(row.actualHeadline, { exact: true }).waitFor();
      if (total > 5) {
        await root.getByRole('button', { name: /Star man/ }).click(); const sixth = row.fixture.expected.broken[5];
        await root.getByText(sixth.name, { exact: true }).waitFor();
        row.rungNames = await root.getByRole('button').locator('span.text-foreground.truncate').allTextContents();
        assert.deepEqual(row.rungNames, row.fixture.expected.groups.find(g => g.role === 'star').names); await capture('02-full-rung');
        const player = root.getByRole('button').filter({ has: page.getByText(sixth.name, { exact: true }) }); await player.focus(); await player.press('Enter');
        await root.getByText('Tell him what he is', { exact: true }).waitFor(); await root.getByText(sixth.name, { exact: true }).waitFor(); await capture('03-sixth-detail');
        await root.getByRole('button', { name: 'Star man', exact: true }).click(); await root.getByRole('button', { name: 'The dressing room', exact: true }).click();
      }
    }
    await root.getByText(row.actualHeadline, { exact: true }).waitFor(); const restored = await capture('04-returned');
    assert.deepEqual(restored.callbacks, []); assert(restored.careerUnchanged); assert.equal(await root.locator('p').first().innerText(), row.actualHeadline);
    if (total) assert(restored.activations.some(a => a.type === 'keydown' && a.key === 'Enter' && a.trusted));
    row.status = 'completed';
  } catch (e) { row.status = 'failed'; row.error = error(e); try { await capture('failure'); } catch (caught) { captureErrors.push({ case: id, ...error(caught) }); } }
  finally { try { await context.close(); } catch (e) { row.status = 'failed'; row.finalizationError = error(e); } write(path.join(dir, 'case.json'), row); }
}
try {
  browser = await chromium.launch({ headless: true });
  const cases = [];
  for (const arm of ['candidate', 'parent']) for (const total of [0, 1, 5, 6, 8]) cases.push([arm, total, 390]);
  for (const arm of ['candidate', 'parent']) cases.push([arm, 6, 1280]);
  cases.push(['preview-control', 6, 390]);
  for (const args of cases) try { await runCase(...args); } catch (e) { const row = rows.at(-1); row.status = 'failed'; row.infrastructureError = error(e); }
} catch (e) { captureErrors.push({ phase: 'browser', ...error(e) }); }
finally {
  try { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); } catch (e) { captureErrors.push({ phase: 'finalization', ...error(e) }); }
  await Promise.all(jobs);
}
for (const row of rows) {
  row.unexpectedConsole = row.console.filter(m => m.type === 'error');
  row.accepted = row.status === 'completed' && row.arm !== 'preview-control';
  if (row.arm === 'preview-control') row.accepted = row.status === 'failed' && row.stage === 'preview-count' && row.error?.name === 'AssertionError' && row.error.message.includes('Preview remains capped at five') && row.previewNames.length === 6 && row.actualHeadline === headline(6, 2);
  if (row.pageErrors.length || row.unexpectedConsole.length || row.finalizationError || row.infrastructureError || captureErrors.some(e => e.case === row.id)) row.accepted = false;
  write(path.join(out, 'cases', row.id, 'case.json'), row);
}
const fixturePairs = rows.filter(r => r.arm === 'candidate').map(r => {
  const parent = rows.find(p => p.arm === 'parent' && p.total === r.total && p.width === r.width);
  return { total: r.total, width: r.width, candidate: r.fixture?.initial && sha(Buffer.from(r.fixture.initial)), parent: parent?.fixture?.initial && sha(Buffer.from(parent.fixture.initial)), same: Boolean(r.fixture && parent?.fixture && r.fixture.initial === parent.fixture.initial) };
});
const report = { checked: process.env.CHECKED_HEAD, parent: process.env.BASE_HEAD, componentOnly: true, expectedRows: 13, rows, fixturePairs, captureErrors, bundles, viteBindings, css: cssPaths, limits: 'Synthetic playing-history/role fixture on actual held career/players/helpers/component. No whole route, saved career, production, external-font or whole-site gameplay acceptance.' };
write(path.join(out, 'report.json'), report);
assert.equal(rows.length, 13); assert.equal(captureErrors.length, 0); assert(rows.every(r => r.accepted)); assert.equal(fixturePairs.length, 6); assert(fixturePairs.every(p => p.same));
console.log('PASS:12 actual component cases, three observed parent count defects, one effective copied preview-cap control; all navigation callbacks remain empty.');
