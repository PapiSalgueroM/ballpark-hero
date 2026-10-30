import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
const C = {"product":"f41265d50b6dc62dde65342f6da620172d47f460","tree":"136f0c52730d823c640c791773d212486a724611","files":5502,"proofFiles":5507,"branch":"codex/soccer-release-generation-20261030","adds":[".github/workflows/soccer-release-generation.yml","qa/soccer-release-generation-v1/ADMITTED-INVENTORY.json","scripts/qa/gridArchiveReadOnly.cjs","scripts/qa/prepareSoccerReleaseGeneration.mjs","scripts/qa/soccerSeoFontPreload.cjs"],"inventorySHA256":"12ceda31fabd47a6aa9f0d1154d1ae37c3be9bca1596b81a4c73ed32425484f9","inventorySource":"20817d6852cd2c07960d854ec77cca4ad69b4cb1","playwright":"1.64.0","sourcePins":[{"file":"package-lock.json","gitBlob":"97d6f12a052f25f400462938c241789a083f0bfe"},{"file":"package.json","gitBlob":"2ff64986fb76ebc51b706f2fd24765768874008a"},{"file":"scripts/genGridArchive.mjs","gitBlob":"83bc526f26553d3d172cc3a3a1aeeadf17c1ac45"},{"file":"scripts/genHiddenStubs.mjs","gitBlob":"47e8d090cfd32760c55e800273ef9312ad6e4231"},{"file":"scripts/genRetiredStubs.mjs","gitBlob":"e9874a17cb94ac7fbfe21b3bcaec4f5420a44d85"},{"file":"scripts/genSitemap.mjs","gitBlob":"08344dfc84be3ca24533c8d56e0f229b02b93c0a"},{"file":"scripts/lib/gridArchiveRules.mjs","gitBlob":"0d1f168d97ec9a705766b81cf791dcbbabaa7f7d"},{"file":"scripts/lib/offlineTransport.cjs","gitBlob":"0fda542a2649fe5da937c6976fd0f5b6073e74b6"},{"file":"scripts/prerender.mjs","gitBlob":"3d4fb1e595413c48c7bd65b927730d25cc3a2e18"},{"file":"scripts/qa/freeKickLab1070.mjs","gitBlob":"1cf030d9182fd4fd68fca39f32e757c69bf9e58a"},{"file":"scripts/runAllSims.mjs","gitBlob":"a7d56d224a472b8eacfe1c4fd2f672f962259d28"},{"file":"src/integrations/supabase/client.ts","gitBlob":"d055e064f5c1c0c90230ca562966ee04dfdcd3ce"},{"file":"src/lib/cbbGrid.ts","gitBlob":"1439348093026749dc384190a95af6c844cfee97"},{"file":"src/lib/gridEngine.ts","gitBlob":"6aacf34eda2377a79269d25a779bf376ccdb41d2"},{"file":"src/lib/hockeyGrid.ts","gitBlob":"540c59ff533730a94927c7f2859bcd065a484532"},{"file":"src/lib/mlbGrid.ts","gitBlob":"91e35ba013df8a3e65395a8bb49b2f4619a21803"},{"file":"src/lib/nbaGrid.ts","gitBlob":"e58671f544ad0543c2088aa46ae843981185fa51"},{"file":"scripts/simFootleKitNumbers.mjs","gitBlob":"8aae063c6b06d99d631f583096662c7174930749"}]};
const checkout = fs.realpathSync(process.cwd()), stage = process.argv[2], out = fs.realpathSync(process.env.GEN_OUT), root = path.join(out, 'matched-source');
const sha = b => createHash('sha256').update(b).digest('hex'), blob = b => createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const json = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const git = args => execFileSync('git', args, { cwd: checkout, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 1 << 29 });
const gt = args => git(args).toString().trim();
function inventory(dir, prefix = '', skip = []) { return fs.readdirSync(dir).sort().filter(name => prefix || !skip.includes(name)).flatMap(name => { const file = path.join(dir, name), rel = prefix + name, stat = fs.lstatSync(file); if (stat.isSymbolicLink()) return [{ file: rel, link: fs.readlinkSync(file) }]; if (stat.isDirectory()) return inventory(file, rel + '/'); const body = fs.readFileSync(file); return [{ file: rel, bytes: body.length, sha256: sha(body) }]; }); }
function tree(ref) { return gt(['ls-tree', '-r', ref]).split('\n').map(line => { const m = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(line); assert(m); return { mode: m[1], gitBlob: m[2], file: m[3] }; }); }
function state() { return { head: gt(['rev-parse', 'HEAD']), refs: gt(['for-each-ref', '--format=%(refname) %(objectname)', 'refs/heads', 'refs/remotes']), indexSHA256: sha(fs.readFileSync(gt(['rev-parse', '--git-path', 'index']))), source: inventory(checkout, '', ['.git', 'node_modules']) }; }
function run(label, command, args, env = {}, timeout = 120000, cwd = root) {
  const dir = path.join(out, label); fs.mkdirSync(dir); const tmp = path.join(dir, 'tmp'); fs.mkdirSync(tmp);
  const a = fs.openSync(path.join(dir, 'stdout.log'), 'wx'), b = fs.openSync(path.join(dir, 'stderr.log'), 'wx'), start = new Date().toISOString(), clock = process.hrtime.bigint(); let r;
  try { r = spawnSync(command, args, { cwd, env: { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp, NODE_OPTIONS: '', SIM_NETWORK: 'offline', ONLY: '', BROWSER: '', PRERENDER_ONLY: '', PRERENDER_CONTROL: '', SITEMAP_CONTROL: '', SIM_OFFLINE_RECEIPT: path.join(dir, 'transport.jsonl'), ...env }, timeout, killSignal: 'SIGKILL', stdio: ['ignore', a, b] }); } finally { fs.closeSync(a); fs.closeSync(b); }
  const record = { command, args, cwd, start, end: new Date().toISOString(), durationMs: Number(process.hrtime.bigint() - clock) / 1e6, status: r.status, signal: r.signal, error: r.error ? { name: r.error.name, code: r.error.code } : null };
  fs.writeFileSync(path.join(dir, 'process.json'), JSON.stringify(record, null, 2) + '\n');
  assert.equal(r.signal, null, label); assert.equal(r.error, undefined, label); assert.equal(r.status, 0, label);
  return dir;
}
function admitPlan(label) {
  const dir = run(label, process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), 'scripts/runAllSims.mjs', '--plan-json']);
  const expectedBody = fs.readFileSync(path.join(root, 'qa/soccer-release-generation-v1/ADMITTED-INVENTORY.json')); assert.equal(sha(expectedBody), C.inventorySHA256);
  const actual = JSON.parse(fs.readFileSync(path.join(dir, 'stdout.log'))), expected = JSON.parse(expectedBody);
  assert.deepEqual(actual, expected, 'GEN_COMPLETE_INVENTORY_GROUPS_HELD');
  assert.equal(actual.nodeGroup.length, 823); assert.equal(actual.browserGroup.length, 199); assert.equal(new Set([...actual.nodeGroup, ...actual.browserGroup]).size, 1022);
  json(label + '-admission.json', { product: C.product, source: process.env.GITHUB_SHA, priorResult: C.inventorySource, completeGroupsEqual: true, node: 823, browser: 199, total: 1022 });
}
const allowed = file => stage === 'archive' ? file === 'src/data/gridArchive.json' : file === 'src/data/gridArchive.json' || file === 'scripts/data/lastmod.json' || file.startsWith('public/') || file.startsWith('dist/');
function changes(before, after) { const a = new Map(before.map(r => [r.file, r])), b = new Map(after.map(r => [r.file, r])); return [...new Set([...a.keys(), ...b.keys()])].sort().filter(file => JSON.stringify(a.get(file)) !== JSON.stringify(b.get(file))).map(file => ({ file, before: a.get(file) ?? null, after: b.get(file) ?? null })); }
assert(['archive', 'seo'].includes(stage)); assert(process.env.CI === 'true'); assert(out !== checkout && !out.startsWith(checkout + path.sep)); assert.equal(process.env.GITHUB_REF_NAME, C.branch);
let initial, deps, source, failure, tools, toolsBefore, fonts, fontsBefore, prepared = false;
try {
  assert.equal(gt(['rev-list', '--parents', '-n1', 'HEAD']), process.env.GITHUB_SHA + ' ' + C.product); assert.equal(gt(['rev-parse', C.product + '^{tree}']), C.tree);
  const product = tree(C.product), proof = tree('HEAD'); assert.equal(product.length, C.files); assert.equal(proof.length, C.proofFiles);
  const added = proof.filter(r => !product.some(p => p.file === r.file)); assert.deepEqual(added.map(r => r.file).sort(), C.adds.slice().sort()); assert(added.every(r => r.mode === '100644')); assert.deepEqual(proof.filter(r => !added.includes(r)), product);
  json('SOURCE-TOPOLOGY.json', { stage, contract: C, proof: process.env.GITHUB_SHA, run: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, product, proofRows: proof, added });
  initial = state(); json('CHECKOUT-BEFORE.json', initial); deps = inventory(path.join(checkout, 'node_modules')); json('DEPENDENCIES-BEFORE.json', deps);
  git(['archive', '--format=tar', '--output=' + path.join(out, 'source.tar'), 'HEAD']); fs.mkdirSync(root); run('extract-source', 'tar', ['-xf', path.join(out, 'source.tar'), '-C', root], {}, 120000, checkout); fs.symlinkSync(path.join(checkout, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  source = inventory(root); json('SOURCE-BEFORE.json', source); prepared = true; for (const row of C.sourcePins) assert.equal(blob(fs.readFileSync(path.join(root, row.file))), row.gitBlob, row.file);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))); assert.equal(pkg.scripts['archive:grids'], 'node scripts/genGridArchive.mjs'); assert.equal(pkg.scripts['build:seo'], 'node scripts/genSitemap.mjs --routes-only && vite build && node scripts/prerender.mjs && node scripts/genRetiredStubs.mjs && node scripts/genHiddenStubs.mjs && node scripts/genSitemap.mjs && vite build');
  admitPlan('initial-plan');
  const offline = path.join(root, 'scripts/lib/offlineTransport.cjs'), archiveFile = path.join(root, 'src/data/gridArchive.json');
  if (stage === 'archive') {
    run('guard-copied-refusals', process.execPath, ['scripts/qa/gridArchiveReadOnly.cjs', '--self-test']);
    run('app-types', process.execPath, ['--require', offline, 'node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json'], {}, 600000);
    const wire = path.join(out, 'archive-wire'); fs.mkdirSync(wire);
    run('archive-grids', 'npm', ['run', 'archive:grids'], { NODE_OPTIONS: '--require ' + path.join(root, 'scripts/qa/gridArchiveReadOnly.cjs'), GEN_ARCHIVE_READ_ONLY: 'four-source-reads-v1', GEN_ARCHIVE_WIRE_OUT: wire }, 1800000);
    const records = fs.readFileSync(path.join(wire, 'requests.jsonl'), 'utf8').trim().split('\n').map(JSON.parse), start = records.filter(r => r.event === 'start'), done = records.filter(r => r.event === 'response');
    assert(start.length > 0); assert.equal(done.length, start.length); assert.deepEqual([...new Set(done.map(r => r.table))].sort(), ['mlb_grid_players', 'nba_player_stats', 'ncaa_player_stats', 'nhl_player_stats']);
    assert.equal(new Set(start.map(r => r.id)).size, start.length); assert.equal(new Set(done.map(r => r.id)).size, done.length);
    for (const row of done) { const first = start.find(r => r.id === row.id); assert(first); for (const key of ['method', 'host', 'path', 'query', 'table']) assert.deepEqual(row[key], first[key]); assert.equal(row.host, 'flawuiqbvjobmkfkauhw.supabase.co'); assert.equal(row.path, '/rest/v1/' + row.table); assert.equal(row.method, 'GET'); assert.equal(row.status, 200); assert.equal(sha(fs.readFileSync(path.join(wire, row.file))), row.sha256); }
    const body = fs.readFileSync(archiveFile); fs.writeFileSync(path.join(out, 'archive-generated.json'), body, { flag: 'wx' });
    json('ARCHIVE-RESULT.json', { product: C.product, proof: process.env.GITHUB_SHA, run: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, path: 'src/data/gridArchive.json', bytes: body.length, sha256: sha(body), generatedFor: JSON.parse(body).generatedFor, readOnly: true, requests: done.length, tables: [...new Set(done.map(r => r.table))].sort() });
  } else {
    const input = fs.realpathSync(process.env.GEN_ARCHIVE_INPUT); assert(input !== checkout && !input.startsWith(checkout + path.sep));
    const result = JSON.parse(fs.readFileSync(path.join(input, 'ARCHIVE-RESULT.json'))), body = fs.readFileSync(path.join(input, 'archive-generated.json'));
    assert.equal(result.product, C.product); assert.equal(result.proof, process.env.GITHUB_SHA); assert.equal(result.run, process.env.GITHUB_RUN_ID); assert.equal(result.attempt, process.env.GITHUB_RUN_ATTEMPT); assert.equal(result.path, 'src/data/gridArchive.json'); assert.equal(result.readOnly, true); assert.equal(sha(body), result.sha256); assert.equal(sha(body), process.env.GEN_ARCHIVE_SHA256);
    fs.writeFileSync(archiveFile, body); json('ADMITTED-ARCHIVE-INPUT.json', result);
    const req = createRequire(path.join(root, 'package.json')); assert.equal(req('playwright/package.json').version, C.playwright); assert.equal(req('playwright-core/package.json').version, C.playwright);
    assert.equal(req('playwright').chromium, req('playwright-core').chromium);
    fonts = fs.realpathSync(process.env.FREE_KICK_FONT_CACHE); tools = path.dirname(fs.realpathSync(process.env.PLAYWRIGHT_BROWSERS_PATH)); fontsBefore = inventory(fonts); toolsBefore = inventory(tools); json('FONTS-BEFORE.json', fontsBefore); json('BROWSER-TOOLS-BEFORE.json', toolsBefore);
    const fontBody = fs.readFileSync(path.join(fonts, 'manifest.json')), manifestSHA = sha(fontBody);
    const receipts = path.join(out, 'seo-receipts'); fs.mkdirSync(receipts);
    run('build-seo', 'npm', ['run', 'build:seo'], { NODE_OPTIONS: '--require ' + offline + ' --require ' + path.join(root, 'scripts/qa/soccerSeoFontPreload.cjs'), FONT_CACHE_MANIFEST_SHA256: manifestSHA, SWEEP_CONTEXT_RECEIPT: path.join(receipts, 'contexts.jsonl'), FONT_CACHE_USE_RECEIPT: path.join(receipts, 'fonts.jsonl'), SWEEP_FLAG_RECEIPT: path.join(receipts, 'flags.jsonl'), FREE_KICK_FONT_CACHE: fonts }, 7200000);
    const uses = fs.readFileSync(path.join(receipts, 'fonts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse); assert(uses.length > 0); assert(uses.every(r => r.manifestSha256 === manifestSHA));
    json('FONTS-USED.json', { manifestSHA256: manifestSHA, uses }); json('DIST-MEMBERSHIP.json', inventory(path.join(root, 'dist'))); json('PUBLIC-MEMBERSHIP.json', inventory(path.join(root, 'public')));
    admitPlan('final-plan');
    run('export-dist', 'tar', ['-cf', path.join(out, 'dist.tar'), '-C', path.join(root, 'dist'), '.']);
  }
} catch (error) { failure = error; json('FAILURE.json', { name: error.name, message: error.message, stack: error.stack }); }
finally {
  try {
    if (prepared) { if (toolsBefore) { assert.deepEqual(inventory(tools), toolsBefore, 'GEN_BROWSER_TOOLS_HELD'); json('BROWSER-TOOLS-AFTER.json', toolsBefore); assert.deepEqual(inventory(fonts), fontsBefore, 'GEN_FONT_BODIES_HELD'); json('FONTS-AFTER.json', fontsBefore); } const final = inventory(root), changed = changes(source, final); json('SOURCE-AFTER.json', final); json('GENERATED-PATHS.json', changed); assert(changed.every(r => allowed(r.file)), 'GEN_ONLY_DECLARED_GENERATED_PATHS'); assert(!changed.some(r => r.file === 'node_modules'), 'GEN_DEPENDENCY_LINK_HELD'); assert.deepEqual(inventory(path.join(checkout, 'node_modules')), deps, 'GEN_DEPENDENCY_WHOLE_BODIES_HELD'); json('DEPENDENCIES-AFTER.json', deps); assert.deepEqual(state(), initial, 'GEN_CHECKOUT_INDEX_REFS_SOURCE_HELD'); json('CHECKOUT-AFTER.json', initial);
      const ship = changed.filter(r => !r.file.startsWith('dist/')); json('SHIP-PATHS.json', ship);
      const files = ship.filter(r => r.after).map(r => r.file); fs.writeFileSync(path.join(out, 'ship-files.txt'), files.join('\n') + '\n');
      if (files.length) run('export-generated', 'tar', ['-cf', path.join(out, 'generated.tar'), '-C', root, '-T', path.join(out, 'ship-files.txt')], {}, 120000, checkout);
      run('archive-matched-final', 'tar', ['--exclude=./node_modules', '--exclude=./dist', '-cf', path.join(out, 'matched-final.tar'), '-C', root, '.'], {}, 120000, checkout);
    }
  } catch (error) { failure ??= error; json('HOLDS-FAILURE.json', { name: error.name, message: error.message, stack: error.stack }); }
  json('COMPLETION.json', { stage, status: failure ? 'FAILED' : 'GENERATION_ONLY_COMPLETED', product: C.product, proof: process.env.GITHUB_SHA, fullReleaseQualification: 'UNRUN' });
  const logs = inventory(out).filter(r => /\.log$/.test(r.file)); for (const row of logs) await pipeline(fs.createReadStream(path.join(out, row.file)), createGzip(), fs.createWriteStream(path.join(out, row.file + '.gz'), { flags: 'wx' }));
  json('ALL-OUTPUT-HASHES.json', inventory(out).filter(r => !r.file.startsWith('matched-source/')));
}
if (failure) { console.error(failure.stack); process.exitCode = 1; }
