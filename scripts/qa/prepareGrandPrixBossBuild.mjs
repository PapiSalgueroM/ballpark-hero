import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert(process.env.GP_BOSS_BUILD_QA, 'GP_BUILD_EXPLICIT_OUTPUT');
const OUT = path.resolve(process.env.GP_BOSS_BUILD_QA);
assert.equal(path.dirname(OUT), path.join(ROOT, 'tmp'), 'GP_BUILD_DIRECT_WORKSPACE_TMP_CHILD');
fs.mkdirSync(OUT, { recursive: true });
assert.equal(fs.readdirSync(OUT).length, 0, 'GP_BUILD_FRESH_OUTPUT');
const NEW = '/grand-prix-boss';
const FIXTURE = 'scripts/qa/source-controls/grandPrixBoss.before-route.gameRegistry.ts.txt';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const write = (name, bytes) => {
  const file = path.join(OUT, name); fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, { flag: 'wx' });
  assert.deepEqual(fs.readFileSync(file), Buffer.from(bytes), 'GP_BUILD_OUTPUT_READBACK:' + name);
};
const json = (name, value) => write(name, JSON.stringify(value, null, 2) + '\n');
const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap(entry => entry.isDirectory() ? walk(dir + '/' + entry.name) : entry.isFile() ? [dir + '/' + entry.name] : []);
const paths = [...['src', 'scripts', 'public'].flatMap(walk),
  ...fs.readdirSync(ROOT, { withFileTypes: true }).filter(entry => entry.isFile() && /\.(?:json|html|[cm]?js|ts)$/.test(entry.name)).map(entry => entry.name)].sort();
const files = paths.map(file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { path: file, bytes: bytes.length, sha256: sha(bytes) }; });
const byPath = new Map(files.map(row => [row.path, row]));
const hold = () => { for (const row of files) { const bytes = fs.readFileSync(path.join(ROOT, row.path)); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256, 'GP_BUILD_PREP_SOURCE_HELD:' + row.path); } };
json('baseline-files.json', files);
const modelPaths = ['src/data/searchKeywords.json', 'scripts/data/guideHeadingsFrozen.json', 'public/sitemap.xml', 'scripts/data/lastmod.json', 'index.html',
  ...files.filter(row => row.path.startsWith('src/data/seoMetaParts/')).map(row => row.path)];
for (const file of modelPaths) write('before/' + file, fs.readFileSync(path.join(ROOT, file)));
const oldBytes = fs.readFileSync(path.join(ROOT, FIXTURE));
assert.equal(blob(oldBytes), 'f560b40a74d1468ac72dfde4ee6fec6635a9a255', 'GP_BUILD_EXACT_PRE_ROUTE_REGISTRY');
const registry = fs.readFileSync(path.join(ROOT, 'src/data/gameRegistry.ts'), 'utf8');
const insertion = "      { path: '/grand-prix-boss', label: 'Grand Prix Boss', emoji: '🏎️', description: 'Run a fictional racing team, manage two drivers and build your car across seasons', daily: false, addedOn: '2026-11-02' },\n";
assert.equal(registry.split(insertion).length, 2, 'GP_BUILD_UNIQUE_NEW_REGISTRY_ROW');
assert.equal(registry.replace(insertion, ''), oldBytes.toString('utf8'), 'GP_BUILD_ONE_REGISTRY_INSERT_WHOLE_INVERSE');
const seo = fs.readFileSync(path.join(ROOT, 'src/data/seoMeta.ts'), 'utf8');
const seoInsertion = "  '/grand-prix-boss': {\n    title: 'Grand Prix Boss: Free F1 Team Manager',\n    description: 'Run a fictional F1 racing team for free. Sign drivers, choose training, upgrade your car and make tyre and pit calls across seasons. Plays signed out.',\n  },\n";
assert.equal(seo.split(seoInsertion).length, 2, 'GP_BUILD_UNIQUE_NEW_SEO_ROW');
const oldSeo = seo.replace(seoInsertion, '');
assert.equal(sha(oldSeo), '68dce6a01d84d871b2135fbc58ff2759e62272a160b0c60327550680abd3ab78', 'GP_BUILD_ONE_SEO_INSERT_WHOLE_INVERSE');
write('before-seoMeta.ts.txt', oldSeo);
assert(!fs.existsSync(path.join(ROOT, 'public/grand-prix-boss/index.html')), 'GP_BUILD_NEW_SNAPSHOT_ABSENT_BEFORE');
assert(!Object.hasOwn(JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/guideHeadingsFrozen.json'))).routes, NEW), 'GP_BUILD_NEW_GUIDE_ROW_ABSENT_BEFORE');
const abs = file => JSON.stringify(path.join(ROOT, file).split(path.sep).join('/'));
const entry = [
  'export { relatedGamesFor, COMPANIONS } from ' + abs('src/lib/relatedGames.ts') + ';',
  'export { CATEGORIES as beforeCategories } from ' + abs(FIXTURE) + ';',
  'export { CATEGORIES as currentCategories } from ' + abs('src/data/gameRegistry.ts') + ';',
  'export { GRAND_PRIX_BOSS_CONTENT } from ' + abs('src/data/gameContent/grandPrixBoss.ts') + ';',
  'export { flatGuide } from ' + abs('src/data/gameContent/guideShape.ts') + ';',
].join('\n');
write('graph-entry.mjs', entry);
const moduleFile = path.join(OUT, 'actual-graph.mjs');
const built = await build({ absWorkingDir: ROOT, stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'gp-build-graph-entry.mjs' },
  outfile: moduleFile, bundle: true, format: 'esm', platform: 'node', loader: { '.txt': 'ts' },
  alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'silent' });
const inputs = Object.entries(built.metafile.inputs).filter(([file]) => file !== 'gp-build-graph-entry.mjs').map(([file, item]) => {
  const relative = path.relative(ROOT, path.resolve(ROOT, file)).split(path.sep).join('/');
  const held = byPath.get(relative); assert(held, 'GP_BUILD_GRAPH_INPUT_INSIDE_HELD_SOURCE:' + relative);
  assert.equal(held.bytes, item.bytes); return held;
}).sort((a, b) => a.path.localeCompare(b.path));
assert.deepEqual(inputs.map(row => row.path), [FIXTURE, 'src/data/gameContent/grandPrixBoss.ts', 'src/data/gameContent/guideShape.ts', 'src/data/gameRegistry.ts', 'src/lib/relatedGames.ts'].sort(), 'GP_BUILD_EXACT_REAL_GRAPH_INPUTS');
json('graph-metafile.json', built.metafile); json('graph-inputs.json', inputs);
const graphBytes = fs.readFileSync(moduleFile), actual = await import(pathToFileURL(moduleFile).href);
const beforeGames = actual.beforeCategories.flatMap(category => category.games), currentGames = actual.currentCategories.flatMap(category => category.games);
assert.equal(beforeGames.length, 133); assert.equal(currentGames.length, 134);
assert.deepEqual(actual.currentCategories.map(category => ({ ...category, games: category.games.filter(game => game.path !== NEW) })), actual.beforeCategories, 'GP_BUILD_ONE_ACTUAL_GAME_ADDED');
assert.equal(currentGames.filter(game => game.path === NEW).length, 1);
const before = Object.fromEntries(beforeGames.map(game => [game.path, actual.relatedGamesFor(game.path, actual.beforeCategories, actual.COMPANIONS)]));
const current = Object.fromEntries(currentGames.map(game => [game.path, actual.relatedGamesFor(game.path, actual.currentCategories, actual.COMPANIONS)]));
const changed = beforeGames.filter(game => JSON.stringify(before[game.path]) !== JSON.stringify(current[game.path])).map(game => game.path).sort();
assert(changed.length > 0, 'GP_BUILD_ACTUAL_CHANGED_GRAPH_NONEMPTY');
const inbound = Object.entries(current).filter(([, picks]) => picks.some(pick => pick.path === NEW)).map(([route]) => route).sort();
assert(inbound.length > 0, 'GP_BUILD_NEW_CRAWLABLE_INBOUND');
const snapshotRoutes = [NEW, ...changed].sort();
const row = actual.GRAND_PRIX_BOSS_CONTENT[NEW], flat = actual.flatGuide(row);
const expectedFrozenRow = Object.fromEntries(['howToPlay', 'rules', 'example', 'tips'].map(key => [key, flat[key]]));
assert(Object.values(expectedFrozenRow).every(lines => Array.isArray(lines) && lines.length > 0), 'GP_BUILD_ACTUAL_FLAT_GUIDE');
const graph = { schemaVersion: 1, before, current, changed, inbound, snapshotRoutes,
  pairing: 'Actual unchanged relatedGamesFor with explicit old/current categories and identical COMPANIONS; ordered complete pick records.' };
json('graph.json', graph); write('prerender-only.txt', snapshotRoutes.join(',') + '\n');
const snapshots = files.filter(file => /^public\/.+\/index\.html$/.test(file.path));
json('before-snapshot-hashes.json', snapshots);
hold(); assert.deepEqual(fs.readFileSync(moduleFile), graphBytes);
const manifest = { schemaVersion: 1, status: 'prepared', newRoute: NEW, output: OUT, baselineFiles: 'baseline-files.json',
  models: modelPaths, baselineFileCount: files.length, snapshots: snapshots.length, graphFile: 'graph.json', graphSha256: sha(JSON.stringify(graph, null, 2) + '\n'),
  snapshotRoutes, changedRoutes: changed, registryFixture: { path: FIXTURE, bytes: oldBytes.length, sha256: sha(oldBytes), gitBlob: blob(oldBytes) },
  newRegistrySourceSha256: sha(registry), seoSourceSha256: sha(seo), oldSeoSha256: sha(oldSeo), expectedFrozenRow,
  graphModule: { file: 'actual-graph.mjs', bytes: graphBytes.length, sha256: sha(graphBytes) }, graphInputs: inputs,
  baselineManifestSha256: sha(JSON.stringify(files, null, 2) + '\n'), sourceBytesHeld: true,
  scope: 'Pre-generator observation only. No product, generated keywords, snapshot or graph source is rewritten.' };
manifest.allowedMutablePaths = ['src/data/searchKeywords.json', 'scripts/data/guideHeadingsFrozen.json', 'src/data/seoMetaParts/seoMetaPart14.ts', 'public/sitemap.xml', 'scripts/data/lastmod.json', ...snapshotRoutes.map(route => 'public/' + route.slice(1) + '/index.html')].sort();
manifest.immutableIndexHtml = true;
manifest.onlyNewSourcePath = 'public/grand-prix-boss/index.html';
json('manifest.json', manifest);
process.stdout.write(JSON.stringify({ status: 'prepared', snapshotRoutes, changedRoutes: changed, newInbound: inbound, baselineFileCount: files.length }) + '\n');
