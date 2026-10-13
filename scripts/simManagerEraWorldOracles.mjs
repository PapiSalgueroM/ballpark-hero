// Copied observation controls for the real-source checks in simEras.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { eraWorldOracleFailures, realRosterNames } from './qa/managerEraWorldOracles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.MANAGER_ERA_WORLD_ARTIFACTS || '.tmp-fx/manager-era-world-oracles');
const CONTROL = process.env.MANAGER_ERA_WORLD_CONTROL || 'all';
const EXPECTED = {
  'row-fields': ['year0-identity'],
  'row-count': ['year0-identity', 'year0-player-count'],
  'real-name-set': ['real-name-membership'],
  'baked-metadata': ['baked-player-count'],
};
assert(CONTROL === 'all' || Object.hasOwn(EXPECTED, CONTROL), 'Known copied observation control');
const sha = value => createHash('sha256').update(value).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
const sourceHashes = files => [...new Set(files)].sort().map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
function retain(name, value) {
  const bytes = gzipSync(JSON.stringify(value));
  const file = name + '.json.gz';
  fs.writeFileSync(path.join(OUT, file), bytes);
  return { file, bytes: bytes.length, sha256: sha(bytes) };
}

fs.mkdirSync(OUT, { recursive: true });
const loaded = [], temp = fs.mkdtempSync(path.join(os.tmpdir(), 'manager-era-oracles-'));
const bundle = path.join(temp, 'bundle.cjs');
let heldFiles = [];
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  scope: 'Copied observations from unchanged actual source. No served product source is mutated.',
  loaded, controls: [], ok: false };
try {
  await build({ stdin: { contents: "export * as E from './src/lib/clubManagerEras';export * as DATA from './src/data/clubManagerRosters';export * as WORLD from './src/data/clubManagerWorldRosters';", resolveDir: ROOT },
    bundle: true, platform: 'node', format: 'cjs', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    plugins: [{ name: 'held-current-source', setup(builder) { builder.onLoad({ filter: /\.(tsx?|json)$/ }, args => {
      const file = path.relative(ROOT, args.path).replaceAll('\\', '/');
      if (!file.startsWith('src/')) return;
      const raw = fs.readFileSync(args.path), contents = raw.toString('utf8').replaceAll('\r\n', '\n');
      loaded.push({ file, rawSha256: sha(raw), compiledSha256: sha(contents) });
      return { contents, loader: file.endsWith('.json') ? 'json' : file.endsWith('.tsx') ? 'tsx' : 'ts' };
    }); } }] });
  const realRandom = Math.random, startupDraws = [];
  let B;
  Math.random = () => { const value = realRandom(); startupDraws.push(value); return value; };
  try { B = createRequire(path.join(ROOT, 'package.json'))(bundle); } finally { Math.random = realRandom; }
  report.startupDraws = startupDraws;
  heldFiles = ['src/lib/clubManager.ts', 'scripts/simEras.mjs', 'scripts/simClubManagerEraUcl.mjs',
    'scripts/qa/managerEraWorldOracles.mjs', 'scripts/simManagerEraWorldOracles.mjs', 'package.json', 'package-lock.json', ...loaded.map(row => row.file)];
  report.sourceBefore = sourceHashes(heldFiles);
  const readDraws = [];
  let observation;
  Math.random = () => { const value = realRandom(); readDraws.push(value); return value; };
  try {
    observation = copy({ world0: B.E.projectedWorld(0), world5: B.E.projectedWorld(5),
      joined: B.WORLD.CM_WORLD_ROSTERS, baked: B.DATA.CM_ROSTERS, bakedMetadata: B.DATA.CM_ROSTER_META,
      realNames: [...realRosterNames(B.WORLD.CM_WORLD_ROSTERS)] });
  } finally { Math.random = realRandom; }
  report.readDraws = readDraws;
  report.baseline = retain('baseline', observation);
  report.baselineFailures = eraWorldOracleFailures(observation);
  assert.deepEqual(readDraws, [], 'Actual world reads consume no global draws');
  assert.deepEqual(report.baselineFailures, [], 'Actual joined source and original baked metadata pass');
  const heldBaseline = JSON.stringify(observation);
  for (const name of CONTROL === 'all' ? Object.keys(EXPECTED) : [CONTROL]) {
    const changed = copy(observation);
    let field, before, after, undo;
    if (name === 'row-fields' || name === 'row-count') {
      const club = Object.keys(changed.world0).find(key => changed.world0[key].length > 0);
      assert(club, 'Actual starting world has a row to observe');
      if (name === 'row-fields') {
        field = ['world0', club, 0, 'a']; before = changed.world0[club][0].a;
        assert(Number.isFinite(before)); after = before + 1; changed.world0[club][0].a = after;
        undo = () => { changed.world0[club][0].a = before; };
      } else {
        field = ['world0', club, 0]; before = changed.world0[club].shift(); after = null;
        undo = () => { changed.world0[club].unshift(before); };
      }
    } else if (name === 'real-name-set') {
      const bakedNames = realRosterNames(observation.baked);
      const player = Object.values(observation.world5).flat().find(p => !p.g && !bakedNames.has(p.n) && changed.realNames.includes(p.n));
      assert(player, 'Actual joined-only real player survives to the observed fifth year');
      const index = changed.realNames.indexOf(player.n);
      field = ['realNames', index]; before = changed.realNames.splice(index, 1)[0]; after = null;
      undo = () => { changed.realNames.splice(index, 0, before); };
    } else {
      field = ['bakedMetadata', 'players']; before = changed.bakedMetadata.players;
      assert(Number.isSafeInteger(before)); after = before + 1; changed.bakedMetadata.players = after;
      undo = () => { changed.bakedMetadata.players = before; };
    }
    assert.notEqual(JSON.stringify(changed), heldBaseline, 'Copied observation changes: ' + name);
    const fault = retain(name + '-fault', changed), failures = eraWorldOracleFailures(changed);
    undo();
    const restored = retain(name + '-undo', changed), undoFailures = eraWorldOracleFailures(changed);
    const row = { name, field, before, after, changed: true, baseline: report.baseline,
      fault, restored, failures, expected: EXPECTED[name], undoFailures,
      baselineObservationSha256: sha(heldBaseline), restoredObservationSha256: sha(JSON.stringify(changed)) };
    report.controls.push(row);
    assert.deepEqual(changed, observation, 'Complete copied observation restored: ' + name);
    assert.equal(JSON.stringify(observation), heldBaseline, 'Actual baseline held: ' + name);
    assert.deepEqual(failures, EXPECTED[name], 'Exact intended oracle failures: ' + name);
    assert.deepEqual(undoFailures, [], 'Healthy oracle restored: ' + name);
    if (name === 'baked-metadata') {
      const oldClubs = changed.bakedMetadata.clubs;
      assert(Number.isSafeInteger(oldClubs));
      changed.bakedMetadata.clubs = oldClubs + 1;
      const clubFault = retain(name + '-clubs-fault', changed);
      const clubFailures = eraWorldOracleFailures(changed);
      changed.bakedMetadata.clubs = oldClubs;
      const clubUndo = retain(name + '-clubs-undo', changed);
      const clubUndoFailures = eraWorldOracleFailures(changed);
      row.additional = [{ field: ['bakedMetadata', 'clubs'], before: oldClubs, after: oldClubs + 1,
        changed: true, fault: clubFault, restored: clubUndo, failures: clubFailures,
        expected: ['baked-club-count'], undoFailures: clubUndoFailures }];
      assert.deepEqual(changed, observation, 'Complete baked club-metadata observation restored');
      assert.deepEqual(clubFailures, ['baked-club-count'], 'Exact baked club-count failure');
      assert.deepEqual(clubUndoFailures, [], 'Healthy baked club metadata restored');
    }
  }
  report.sourceAfter = sourceHashes(heldFiles);
  assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Actual app, data and harness disk bytes held');
  report.sourceHeld = true;
  report.ok = true;
  console.log(`PASS simManagerEraWorldOracles.mjs: actual joined-source baseline, ${report.controls.length} effective copied observation controls and complete undo/source holds`);
} finally {
  if (report.sourceBefore) {
    report.sourceAfter = sourceHashes(heldFiles);
    report.sourceHeld = JSON.stringify(report.sourceAfter) === JSON.stringify(report.sourceBefore);
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  fs.rmSync(temp, { recursive: true, force: true });
}
