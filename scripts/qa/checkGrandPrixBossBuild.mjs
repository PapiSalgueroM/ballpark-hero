import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert(process.env.GP_BOSS_BUILD_QA, 'GP_BUILD_EXPLICIT_OUTPUT');
const OUT = path.resolve(process.env.GP_BOSS_BUILD_QA);
assert.equal(path.dirname(OUT), path.join(ROOT, 'tmp'), 'GP_BUILD_DIRECT_WORKSPACE_TMP_CHILD');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const put = (file, bytes) => { const absolute = path.join(OUT, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, bytes, { flag: 'wx' }); assert.deepEqual(fs.readFileSync(absolute), Buffer.from(bytes)); };
const json = (file, value) => put(file, JSON.stringify(value, null, 2) + '\n');
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json')));
assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.status, 'prepared');
assert.equal(manifest.newRoute, '/grand-prix-boss');
const NEW = manifest.newRoute;
const baselineBytes = fs.readFileSync(path.join(OUT, manifest.baselineFiles));
assert.equal(sha(baselineBytes), manifest.baselineManifestSha256, 'GP_BUILD_BEFORE_MANIFEST_PIN');
const baseline = JSON.parse(baselineBytes), oldFiles = Object.fromEntries(baseline.map(row => [row.path, row]));
const graphBytes = fs.readFileSync(path.join(OUT, manifest.graphFile));
assert.equal(sha(graphBytes), manifest.graphSha256, 'GP_BUILD_GRAPH_PIN');
const graph = JSON.parse(graphBytes);
assert.deepEqual(graph.snapshotRoutes, manifest.snapshotRoutes);
assert.deepEqual(fs.readFileSync(path.join(OUT, 'prerender-only.txt'), 'utf8'), graph.snapshotRoutes.join(',') + '\n');
assert.equal(sha(fs.readFileSync(path.join(OUT, manifest.graphModule.file))), manifest.graphModule.sha256, 'GP_BUILD_GRAPH_MODULE_HELD');
for (const input of manifest.graphInputs) assert.equal(sha(fs.readFileSync(path.join(ROOT, input.path))), input.sha256, 'GP_BUILD_GRAPH_SOURCE_HELD:' + input.path);
const before = file => {
  const bytes = fs.readFileSync(path.join(OUT, 'before', file));
  assert.equal(sha(bytes), oldFiles[file].sha256, 'GP_BUILD_CAPTURED_BEFORE_PIN:' + file); return bytes.toString('utf8');
};
const oldSearch = JSON.parse(before('src/data/searchKeywords.json'));
const oldFrozen = JSON.parse(before('scripts/data/guideHeadingsFrozen.json'));
const oldLedger = JSON.parse(before('scripts/data/lastmod.json'));
const oldSitemap = before('public/sitemap.xml');
const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap(entry => entry.isDirectory() ? walk(dir + '/' + entry.name) : entry.isFile() ? [dir + '/' + entry.name] : []);
const scan = () => [...['src', 'scripts', 'public'].flatMap(walk),
  ...fs.readdirSync(ROOT, { withFileTypes: true }).filter(entry => entry.isFile() && /\.(?:json|html|[cm]?js|ts)$/.test(entry.name)).map(entry => entry.name)].sort()
  .map(file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { path: file, bytes: bytes.length, sha256: sha(bytes) }; });
const text = file => fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : null;
const currentFiles = scan();
const initialFiles = clone(currentFiles);
const snapshotPath = route => 'public/' + route.slice(1) + '/index.html';
const mutable = new Set(['src/data/searchKeywords.json', 'scripts/data/guideHeadingsFrozen.json', 'src/data/seoMetaParts/seoMetaPart14.ts',
  'public/sitemap.xml', 'scripts/data/lastmod.json', ...graph.snapshotRoutes.map(snapshotPath)]);
assert.deepEqual([...mutable].sort(), manifest.allowedMutablePaths, 'GP_BUILD_EXACT_APPROVED_MUTABLE_PATHS');
assert.equal(manifest.immutableIndexHtml, true);
const newSnapshot = snapshotPath(NEW);
const evidence = { files: Object.fromEntries(currentFiles.map(row => [row.path, row])),
  searchText: text('src/data/searchKeywords.json'), frozenText: text('scripts/data/guideHeadingsFrozen.json'),
  ledgerText: text('scripts/data/lastmod.json'), sitemapText: text('public/sitemap.xml'), indexText: text('index.html'),
  snapshots: Object.fromEntries(graph.snapshotRoutes.map(route => [route, text(snapshotPath(route))])),
  seoParts: Object.fromEntries(baseline.filter(row => row.path.startsWith('src/data/seoMetaParts/')).map(row => [row.path, text(row.path)])) };
json('actual-generated-evidence.json', evidence);
const copyRoot = path.join(OUT, 'writer-source-copy');
fs.mkdirSync(copyRoot, { recursive: false });
fs.cpSync(path.join(ROOT, 'src'), path.join(copyRoot, 'src'), { recursive: true, errorOnExist: true });
for (const file of ['scripts/genSearchKeywords.mjs', 'scripts/genHomeCopy.mjs', 'scripts/lib/atomicWrite.mjs', 'scripts/lib/homeCopyHtml.mjs']) {
  assert.equal(sha(fs.readFileSync(path.join(ROOT, file))), oldFiles[file].sha256, 'GP_BUILD_UNCHANGED_WRITER:' + file);
  const destination = path.join(copyRoot, file); fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(ROOT, file), destination, fs.constants.COPYFILE_EXCL);
}
fs.writeFileSync(path.join(copyRoot, 'index.html'), before('index.html'), { flag: 'wx' });
const writerRuns = [];
function writer(file, id) {
  const result = spawnSync(process.execPath, [path.join(copyRoot, file)], { cwd: copyRoot, env: { ...process.env }, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  put(id + '.stdout.txt', result.stdout || ''); put(id + '.stderr.txt', result.stderr || '');
  const receipt = { id, file, status: result.status, signal: result.signal, error: result.error ? String(result.error) : null, sourceSha256: oldFiles[file].sha256 };
  json(id + '.receipt.json', receipt); writerRuns.push(receipt);
  assert.equal(result.error, undefined, 'GP_BUILD_WRITER_SPAWN:' + id);
  assert.equal(result.signal, null, 'GP_BUILD_WRITER_SIGNAL:' + id);
  assert.equal(result.status, 0, 'GP_BUILD_WRITER_SUCCESS:' + id);
}
let primary = null;
try {
  assert.equal(sha(fs.readFileSync(path.join(copyRoot, 'scripts/genSearchKeywords.mjs'))), 'f76ff265e08218b2a80589710b434e382c7c63e45abcf3d94087e5c3fd04091c', 'GP_BUILD_EXACT_SEARCH_WRITER');
  writer('scripts/genSearchKeywords.mjs', 'search-replay');
  const expectedSearch = fs.readFileSync(path.join(copyRoot, 'src/data/searchKeywords.json'), 'utf8');
  put('search-replay.expected.json', expectedSearch);
  writer('scripts/genHomeCopy.mjs', 'home-replay');
  const expectedHome = fs.readFileSync(path.join(copyRoot, 'index.html'), 'utf8');
  put('home-replay.expected.html', expectedHome);
  assert.equal(expectedHome, before('index.html'), 'GP_BUILD_HOME_EXPECTED_NOOP');
  const { seoMetaPartFiles, partOf, readSource } = await import(pathToFileURL(path.join(ROOT, 'scripts/genSeoMetaParts.mjs')).href);
  assert.equal(partOf(NEW), 14, 'GP_BUILD_ACTUAL_PART_FUNCTION');
  const expectedParts = Object.fromEntries([...await seoMetaPartFiles(ROOT)].map(([name, body]) => ['src/data/seoMetaParts/' + name, body]));
  json('expected-seo-parts.json', expectedParts);
  const seo = await readSource(ROOT);
  assert.deepEqual(seo[NEW], {
    title: 'Grand Prix Boss: Free F1 Team Manager',
    description: 'Run a fictional F1 racing team for free. Sign drivers, choose training, upgrade your car and make tyre and pit calls across seasons. Plays signed out.',
  }, 'GP_BUILD_CANONICAL_NEW_SEO_SOURCE');
  const expectedFrozen = clone(oldFrozen);
  assert(!Object.hasOwn(expectedFrozen.routes, NEW));
  expectedFrozen.routes[NEW] = manifest.expectedFrozenRow;
  expectedFrozen.routes = Object.fromEntries(Object.keys(expectedFrozen.routes).sort().map(route => [route, expectedFrozen.routes[route]]));
  const expectedFrozenText = JSON.stringify(expectedFrozen, null, 2) + '\n';
  put('expected-guide-frozen.json', expectedFrozenText);
  const urls = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => {
    const url = new URL(match[1]); assert.equal(url.origin, 'https://douknowball.com', 'GP_BUILD_SITEMAP_ORIGIN'); return url.pathname;
  });
  const expectedUrls = [...urls(oldSitemap), NEW].sort();
  assert.equal(expectedUrls.length, 173, 'GP_BUILD_ACTUAL_EXPECTED_CARDINALITY');
  assert.equal(new Set(expectedUrls).size, 173, 'GP_BUILD_BASE_SITEMAP_UNIQUE');
  const changedFiles = Object.keys(evidence.files).filter(file => !oldFiles[file] || evidence.files[file].sha256 !== oldFiles[file].sha256);
  const search = JSON.parse(evidence.searchText), searchChanges = [...new Set([...Object.keys(oldSearch.k), ...Object.keys(search.k)])].sort()
    .filter(route => oldSearch.k[route] !== search.k[route]).map(route => ({ route, before: oldSearch.k[route] ?? null, after: search.k[route] ?? null,
      removed: (oldSearch.k[route] || '').split(' ').filter(token => token && !(search.k[route] || '').split(' ').includes(token)),
      added: (search.k[route] || '').split(' ').filter(token => token && !(oldSearch.k[route] || '').split(' ').includes(token)) }));
  const afterBodies = [];
  for (const file of changedFiles.filter(file => mutable.has(file))) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    assert.equal(sha(bytes), evidence.files[file].sha256, 'GP_BUILD_AFTER_CUSTODY:' + file);
    put('after/' + file, bytes); afterBodies.push({ path: file, bytes: bytes.length, sha256: sha(bytes) });
  }
  json('after-manifest.json', afterBodies);
  json('actual-generated-changes.json', { changedFiles, snapshotRoutes: graph.snapshotRoutes, searchChanges,
    searchSourceBefore: oldSearch.source, searchSourceAfter: search.source, expectedSearchSha256: sha(expectedSearch), expectedHomeSha256: sha(expectedHome) });

  function validate(value) {
    assert.deepEqual(Object.keys(value.files).sort(), [...Object.keys(oldFiles), newSnapshot].sort(), 'GP_BUILD_SOURCE_MEMBERSHIP');
    for (const [file, held] of Object.entries(oldFiles)) if (!mutable.has(file)) {
      assert.deepEqual(value.files[file], held, 'GP_BUILD_SOURCE_HOLDS:' + file);
    }
    assert.equal(value.searchText, expectedSearch, 'GP_BUILD_SEARCH_DERIVATION');
    const actualSearch = JSON.parse(value.searchText);
    assert.equal(typeof actualSearch.k[NEW], 'string', 'GP_BUILD_NEW_SEARCH_ROUTE');
    assert(actualSearch.k[NEW].length > 0, 'GP_BUILD_NEW_SEARCH_NONEMPTY');
    assert.equal(value.frozenText, expectedFrozenText, 'GP_BUILD_GUIDE_OLD_ROWS');
    assert.deepEqual(Object.keys(value.seoParts).sort(), Object.keys(expectedParts).sort(), 'GP_BUILD_SEO_PART_MEMBERSHIP');
    for (const [file, expected] of Object.entries(expectedParts)) assert.equal(value.seoParts[file], expected, 'GP_BUILD_SEO_PART_DERIVATION:' + file);
    assert.equal(value.indexText, expectedHome, 'GP_BUILD_HOME_DERIVATION');
    assert.deepEqual(urls(value.sitemapText).sort(), expectedUrls, 'GP_BUILD_SITEMAP_MEMBERSHIP');
    const ledger = JSON.parse(value.ledgerText), allowedRows = new Set(graph.snapshotRoutes);
    assert.equal(ledger.__version, oldLedger.__version, 'GP_BUILD_LEDGER_VERSION');
    assert.deepEqual(Object.keys(ledger).sort(), [...Object.keys(oldLedger), NEW].sort(), 'GP_BUILD_LEDGER_MEMBERSHIP');
    for (const [route, previous] of Object.entries(oldLedger)) if (!allowedRows.has(route)) {
      assert.deepEqual(ledger[route], previous, 'GP_BUILD_LEDGER_OUTSIDE:' + route);
    }
    for (const route of graph.snapshotRoutes) {
      const file = snapshotPath(route), body = value.snapshots[route];
      assert.equal(typeof body, 'string', 'GP_BUILD_SNAPSHOT_REQUIRED:' + route);
      assert(body.includes('id="dukb-snapshot"'), 'GP_BUILD_ACTUAL_SNAPSHOT_BLOCK:' + route);
      assert.equal(sha(body), value.files[file]?.sha256, 'GP_BUILD_SNAPSHOT_BODY_BINDING:' + route);
      assert.notEqual(value.files[file]?.sha256, oldFiles[file]?.sha256, 'GP_BUILD_SNAPSHOT_ACTUALLY_REFRESHED:' + route);
      for (const pick of graph.current[route]) assert(body.includes('href="' + pick.path + '"'), 'GP_BUILD_CURRENT_GRAPH_LINK:' + route + ':' + pick.path);
      assert(ledger[route] && /^[a-f0-9]{16}$/.test(ledger[route].hash) && /^\d{4}-\d{2}-\d{2}$/.test(ledger[route].date), 'GP_BUILD_MEASURED_LEDGER_ROW:' + route);
    }
    assert.deepEqual(Object.keys(value.snapshots).sort(), graph.snapshotRoutes, 'GP_BUILD_EXACT_SNAPSHOT_CLOSURE');
  }
  validate(evidence);
  const existingSearch = Object.keys(search.k).find(route => route !== NEW);
  const oldGuideRoute = Object.keys(oldFrozen.routes)[0];
  const outsideLedgerRoute = Object.keys(oldLedger).find(route => route !== '__version' && !graph.snapshotRoutes.includes(route));
  assert(existingSearch && oldGuideRoute && outsideLedgerRoute, 'GP_BUILD_CONTROL_FOUNDATIONS');
  const controls = [
    { name: 'graph-snapshot-omission', marker: 'GP_BUILD_SNAPSHOT_REQUIRED', mutate: value => { delete value.snapshots[graph.changed[0]]; } },
    { name: 'wrong-seo-part', marker: 'GP_BUILD_SEO_PART_DERIVATION', mutate: value => { const file = 'src/data/seoMetaParts/seoMetaPart14.ts', key = JSON.stringify(NEW); assert.equal(value.seoParts[file].split(key).length, 2, 'GP_BUILD_CONTROL_SEO_ROUTE_FOUND'); value.seoParts[file] = value.seoParts[file].replace(key, JSON.stringify('/copied-wrong-route')); } },
    { name: 'unrelated-search-row', marker: 'GP_BUILD_SEARCH_DERIVATION', mutate: value => { const data = JSON.parse(value.searchText); data.k[existingSearch] += ' copied'; value.searchText = JSON.stringify(data) + '\n'; } },
    { name: 'old-guide-row', marker: 'GP_BUILD_GUIDE_OLD_ROWS', mutate: value => { const data = JSON.parse(value.frozenText); data.routes[oldGuideRoute].howToPlay[0] += ' copied'; value.frozenText = JSON.stringify(data, null, 2) + '\n'; } },
    { name: 'outside-ledger-row', marker: 'GP_BUILD_LEDGER_OUTSIDE', mutate: value => { const data = JSON.parse(value.ledgerText); data[outsideLedgerRoute].hash = '0000000000000000'; value.ledgerText = JSON.stringify(data, null, 2) + '\n'; } },
    { name: 'source-mutation', marker: 'GP_BUILD_SOURCE_HOLDS', mutate: value => { value.files['src/lib/grandPrixBoss.ts'].sha256 = '0'.repeat(64); } },
    { name: 'wrong-sitemap-route', marker: 'GP_BUILD_SITEMAP_MEMBERSHIP', mutate: value => { value.sitemapText = value.sitemapText.replace('</urlset>', '<url><loc>https://douknowball.com/copied-unregistered-route</loc></url></urlset>'); } },
    { name: 'home-template-drift', marker: 'GP_BUILD_HOME_DERIVATION', mutate: value => { assert(value.indexText.includes('130+'), 'GP_BUILD_CONTROL_HOME_COUNT_FOUND'); value.indexText = value.indexText.replace('130+', '0+'); } },
  ];
  const receipts = [];
  for (const control of controls) {
    const copied = clone(evidence), beforeSha256 = sha(JSON.stringify(copied));
    control.mutate(copied);
    const afterSha256 = sha(JSON.stringify(copied));
    assert.notEqual(afterSha256, beforeSha256, 'GP_BUILD_EFFECTIVE_CONTROL:' + control.name);
    json('controls/' + control.name + '.changed.json', copied);
    let caught = null;
    try { validate(copied); } catch (error) { caught = error; }
    assert(caught instanceof assert.AssertionError && caught.message.includes(control.marker), 'GP_BUILD_OWNED_CONTROL:' + control.name + ':' + String(caught));
    validate(evidence);
    const receipt = { name: control.name, marker: control.marker, changed: true, beforeSha256, afterSha256, ownedAssertion: true, restoredHealthy: true,
      error: { name: caught.name, message: caught.message, actual: caught.actual, expected: caught.expected, stack: caught.stack } };
    json('controls/' + control.name + '.receipt.json', receipt); receipts.push(receipt);
  }
  assert.deepEqual(scan(), initialFiles, 'GP_BUILD_ALL_REAL_BYTES_HELD_AFTER_CONTROLS');
  const summary = { schemaVersion: 1, status: 'passed', changedFiles, snapshotRoutes: graph.snapshotRoutes, searchChanges,
    controls: receipts, healthyPasses: 1, ownedControls: 8, restoredPasses: 8, sourceOutsideFenceHeld: true,
    actualWriterRuns: writerRuns, afterBodies, allowedMutablePaths: [...mutable].sort(), beforeFileCount: baseline.length, afterFileCount: currentFiles.length,
    evidenceSha256: sha(JSON.stringify(evidence)), sourceClosure: 'Only normal generated outputs within the measured graph fence. No cap, provider, package or source mutation.',
    scope: 'Generated-output and source boundary only. App/build/readers/unit/browser outcomes remain separately qualified.' };
  json('summary.json', summary); process.stdout.write(JSON.stringify(summary) + '\n');
} catch (error) {
  primary = error; json('guard-failure.json', { name: error.name, message: error.message, actual: error.actual, expected: error.expected, stack: error.stack }); throw error;
} finally {
  try { assert.deepEqual(scan(), initialFiles, 'GP_BUILD_REAL_SOURCE_AND_GENERATED_BYTES_HELD'); }
  catch (error) { json('guard-hold-failure.json', { name: error.name, message: error.message, stack: error.stack }); if (!primary) throw error; }
}
