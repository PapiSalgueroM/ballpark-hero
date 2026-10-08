/* Remote-only receipt and lossless retention for the existing eight route journeys. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
assert.equal(process.env.GITHUB_ACTIONS, 'true');
const root = process.cwd(), evidence = process.env.E, out = path.join(root, 'soccer-hub-grid-artifacts');
assert(evidence && path.isAbsolute(evidence));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const save = (name, data) => { fs.mkdirSync(path.dirname(path.join(evidence, name)), { recursive: true }); fs.writeFileSync(path.join(evidence, name), JSON.stringify(data, null, 2)); };
function files(dir) {
  const held = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(held, files(file));
    else if (entry.isFile()) held[path.relative(root, file)] = hash(fs.readFileSync(file));
    else assert.fail('Build holds reject nonregular payloads');
  }
  return held;
}
function body(file) {
  assert(fs.lstatSync(file).isFile(), 'Retained body is an actual regular file');
  const bytes = fs.readFileSync(file), sha256 = hash(bytes), retained = `bodies/${sha256}`;
  fs.mkdirSync(path.join(evidence, 'bodies'), { recursive: true });
  fs.writeFileSync(path.join(evidence, retained), bytes);
  return { file: path.relative(root, file), bytes: bytes.length, sha256, retained };
}
function localFile(dir, pathname) {
  assert(!pathname.includes('\\') && !pathname.includes('\0'));
  const file = path.resolve(dir, `.${pathname}`);
  assert(file === path.resolve(dir) || file.startsWith(path.resolve(dir) + path.sep), 'Actual delivered path stays in its build');
  const regular = candidate => fs.existsSync(candidate) && fs.lstatSync(candidate).isFile();
  return [file, path.join(file, 'index.html'), path.join(dir, 'index.html')].find(regular);
}
function retain() {
  if (!fs.existsSync(out)) return;
  const proof = path.join(evidence, 'proof'); fs.mkdirSync(proof, { recursive: true });
  for (const entry of fs.readdirSync(out, { withFileTypes: true })) {
    if (entry.name === 'old-nesting-build') continue;
    assert(!entry.isSymbolicLink(), 'Proof contains no unbound link');
    fs.cpSync(path.join(out, entry.name), path.join(proof, entry.name), { recursive: true });
  }
  const reportFile = path.join(out, 'native/report.json');
  if (fs.existsSync(reportFile)) {
    const report = read(reportFile), delivered = [], maps = new Map();
    for (const row of report.cases) for (const request of row.requests) {
      if (request.cached || request.localRead || !request.status) continue;
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      const dir = row.arm === 'healthy' ? path.join(root, 'dist') : path.join(out, 'old-nesting-build');
      const held = body(localFile(dir, pathname));
      assert.equal(held.sha256, request.sha256); assert.equal(held.bytes, request.bytes);
      delivered.push({ arm: row.arm, profile: row.profile.name, scene: row.scene, url: request.url, ...held });
      if (row.arm === 'healthy' && pathname.endsWith('.js') && fs.existsSync(localFile(dir, pathname) + '.map')) {
        const file = localFile(dir, pathname) + '.map'; maps.set(file, body(file));
      }
    }
    save('served-bodies.json', delivered); save('candidate-maps.json', [...maps.values()]);
    save('payload-scope.json', { retained: 'All raw worker outputs, fonts/flags, attempted requests, states, screenshots, actual served local bodies and candidate maps. Both full build path/hash/link manifests are separately held.', omitted: 'Only redundant unserved old-nesting-build payload copies. The copied control has no sourcemaps; its compiled provenance uses the actual Vite copied-page transform and exact input hash.', delivered: delivered.length });
  }
  const metaFile = path.join(out, 'independent-engine-metafile.json');
  if (fs.existsSync(metaFile)) {
    const inputs = Object.entries(read(metaFile).inputs).map(([name, meta]) => {
      if (name === '<stdin>') return { file: name, virtual: true, metadata: meta, configured: "export { initCareer, advanceYouthYear, acceptOffer, advanceProSeason, dismissNewspaper, repairCareer, FALLBACK_CLUBS } from './src/lib/soccerCareerEngine'; export { isSoccerCareerSave } from './src/lib/soccerCareerSave'; export { FLAG_CODES } from './src/components/FlagImg'; export { flagEmojiToIso } from './src/lib/flagUtils';" };
      assert(!name.startsWith('<'), 'Unknown engine virtual input fails closed');
      return { ...body(path.resolve(root, name)), metadata: meta };
    });
    save('engine-inputs.json', inputs);
  }
}
if (process.argv[2] === 'retain') { retain(); console.log('Complete useful raw proof refreshed; unserved duplicate side-build payloads remain manifest-bound.'); }
else {
  retain();
  const report = read(path.join(out, 'native/report.json')), prep = read(path.join(out, 'preparation.json')), fixtures = read(path.join(out, 'fixtures.json'));
  assert.equal(report.sourceHead, process.env.REQUEST_HEAD); assert.equal(report.complete, true); assert(!report.error && !report.cleanupError && !report.holdError);
  assert.equal(report.sourceTree, fs.readFileSync(path.join(evidence, 'identity.txt'), 'utf8').trim().split('\n')[2]);
  const current = fs.readFileSync('src/pages/SoccerCareer.tsx', 'utf8').replace(/\r\n/g, '\n');
  const control = report.control;
  assert.equal(control.originalSha256, hash(fs.readFileSync('src/pages/SoccerCareer.tsx')));
  assert.equal(control.roundTripExact, true); assert.equal(control.historicalBaseProvenanceOnly, true); assert.equal(control.normalizedRoundTripSha256, hash(current));
  assert.equal(control.normalizedOriginalSha256, hash(current)); assert.equal(control.forwardChanges, 2); assert.equal(control.pinnedBase, '6f57ce7818f152b4efdc75027d267c49927a2d8b');
  assert.equal(control.transforms.length, 1); assert.equal(control.transforms[0].copied, true); assert.equal(control.transforms[0].sha256, control.copySha256); assert.notEqual(control.copySha256, control.normalizedOriginalSha256);
  assert.equal(hash(fs.readFileSync(path.join(out, 'native/SoccerCareer.old.tsx'))), control.copySha256);
  assert.equal(hash(fs.readFileSync(path.join(evidence, 'historical-SoccerCareer.tsx'))), control.normalizedPinnedOldSha256);
  assert.deepEqual(files(path.join(out, 'old-nesting-build')), control.buildHashes, 'Complete copied build holds across native journeys');
  assert.deepEqual(report.sourceAfter, report.sourceBefore); assert.deepEqual(report.buildAfter, report.buildBefore); assert.deepEqual(report.cacheAfter, report.cacheBefore); assert.deepEqual(prep.sourceAfter, prep.sourceBefore); assert.deepEqual(prep.sourceAfter, report.sourceBefore);
  assert.equal(hash(fs.readFileSync(path.join(out, 'independent-engine.mjs'))), fixtures.engineSha256); assert.equal(prep.engineSha256, fixtures.engineSha256); assert.deepEqual(fixtures.dismissalRngBefore, fixtures.dismissalRngAfter);
  assert.equal(report.cases.length, 8); assert.equal(report.comparisons.length, 4);
  assert.deepEqual(report.cases.map(r => `${r.arm}/${r.profile.name}/${r.scene}`), ['healthy','old-nesting'].flatMap(arm => ['390-touch','1280-keyboard'].flatMap(profile => ['playing','newspaper'].map(scene => `${arm}/${profile}/${scene}`))));
  for (const row of report.cases) {
    assert.equal(row.complete, true); assert.deepEqual(row.errors, []); assert.deepEqual(row.sockets, []);
    assert(row.requests.length > 0 && row.requests.every(r => r.method === 'GET'));
    assert.deepEqual(row.observations.map(o => o.label), row.scene === 'playing' ? ['playing'] : ['newspaper','summary']);
    const failed = row.checks.filter(c => !c.passed);
    if (row.arm === 'healthy') assert.deepEqual(failed, []);
    else { assert(failed.length > 0 && failed.every(c => c.structure && c.failure.name === 'AssertionError')); assert(failed.some(c => c.name.includes('timeline header')) && failed.some(c => c.name.includes('two intended'))); }
    for (const o of row.observations) assert(fs.existsSync(path.join(out, `native/${row.arm}-${row.profile.name}-${o.label}.png`)) && fs.existsSync(path.join(out, `native/${row.arm}-${row.profile.name}-${o.label}-viewport.png`)));
    assert.equal(row.transitions.length, row.scene === 'newspaper' ? 1 : 0);
    for (const t of row.transitions) {
      assert.deepEqual(t.expected, fixtures.summary); assert.equal(t.driverScrollAfterActivation, false); assert.equal(t.after.storage.soccerCareerSave, JSON.stringify(fixtures.summary)); assert.deepEqual(t.after.rng, t.before.rng); assert.deepEqual(t.after.session, t.before.session);
      assert.deepEqual(t.after.writes.slice(t.before.writes.length), [{ scope: 'local', method: 'setItem', args: ['soccerCareerSave', JSON.stringify(fixtures.summary)] }]); assert.equal(t.after.now - t.before.now, 256);
      const clicks = t.after.inputs.slice(t.before.inputs.length).filter(e => e.type === 'click'); assert.equal(clicks.length, 1); assert.equal(clicks[0].trusted, true);
    }
  }
  assert(report.comparisons.every(c => c.effective && c.baselineEqual && c.failures.length > 0));
  const maps = read(path.join(evidence, 'candidate-maps.json')), bindings = [];
  for (const expected of ['src/main.tsx','src/App.tsx','src/pages/SoccerCareer.tsx','src/hooks/useRevealScroll.ts','src/lib/soccerCareerEngine.ts','src/lib/soccerCareerSave.ts','src/integrations/supabase/client.ts']) {
    const actual = hash(fs.readFileSync(expected)), matches = [];
    for (const held of maps) {
      const map = read(path.join(root, held.file));
      for (let index = 0; index < map.sources.length; index++) if (path.resolve(path.dirname(path.join(root, held.file)), map.sourceRoot || '', map.sources[index]) === path.join(root, expected)) {
        assert.equal(typeof map.sourcesContent[index], 'string'); assert.equal(hash(Buffer.from(map.sourcesContent[index])), actual); matches.push({ map: held.file, mapSha256: held.sha256, retained: held.retained, index, source: map.sources[index] });
      }
    }
    assert(matches.length > 0, 'Actual served candidate maps bind ' + expected); bindings.push({ file: expected, sha256: actual, matches });
  }
  save('core-source-bindings.json', bindings);
  const delivered = read(path.join(evidence, 'served-bodies.json')); assert(delivered.some(r => r.arm === 'healthy' && r.file.endsWith('.js')) && delivered.some(r => r.arm === 'old-nesting' && r.file.endsWith('.js')));
  console.log('All eight actual journeys, four effective copied-layout comparisons and exact Continue/storage/RNG outcomes accepted. Actual candidate core maps and all delivered bodies are byte-bound.');
}
