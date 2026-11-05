import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { build } from 'esbuild';

const arg = name => { const i = process.argv.indexOf(name); assert(i >= 0 && process.argv[i + 1], name); return process.argv[i + 1]; };
assert(process.env.CI, 'Remote CI preparation only');
const root = process.cwd(), out = path.resolve(arg('--out')), dist = path.resolve(arg('--dist'));
const outcomes = path.resolve(arg('--outcomes')), buildRef = path.resolve(arg('--build')), spec = JSON.parse(await fs.readFile(arg('--spec')));
assert.match(spec.artifacts.outcomes.independentAdmissionSHA256, /^[a-f0-9]{64}$/, 'Actual seven-arm independent admission must be bound');
assert.match(spec.artifacts.build.independentAdmissionSHA256, /^[a-f0-9]{64}$/, 'Actual fresh-build independent admission must be bound');
assert(out !== root && !out.startsWith(root + path.sep), 'Fixture output outside App source');
await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0, 'Prepare immutable fixtures once');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blob = bytes => crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const write = (name, value) => fs.writeFile(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const receipt = process.env.SIM_OFFLINE_RECEIPT;
const silent = async () => { assert(receipt); assert.equal((await fs.readFile(receipt)).length, 0, 'Preparation transport empty'); };
await silent();
assert.equal(sha(await fs.readFile(path.join(outcomes, 'original-input-authority.json'))), spec.originalAuthoritySHA256, 'Authentic old-input authority');
for (const [file, wanted] of Object.entries(spec.sourcePins)) {
  assert(/^[a-f0-9]{40}$/.test(wanted), 'All source pins must be bound');
  assert.equal(blob(await fs.readFile(file)), wanted, file);
}
const tracked = execFileSync('git', ['ls-files', '-z']).toString().split('\0').filter(Boolean);
const snapshot = async () => Object.fromEntries(await Promise.all(tracked.map(async p => [p, sha(await fs.readFile(p))])));
const sourceBefore = await snapshot();
const ledger = bytes => Object.fromEntries(bytes.toString().trim().split('\n').filter(Boolean).map(line => {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line); assert(match, 'Actual SHA256 ledger row'); return [match[2], match[1]];
}));
const buildBefore = await fs.readFile(path.join(buildRef, 'source-before.sha256'));
const buildAfter = await fs.readFile(path.join(buildRef, 'source-after.sha256'));
assert(buildBefore.equals(buildAfter), 'Completed build full source held');
const built = ledger(buildBefore);
const allowed = new Set([...spec.qaPaths, spec.artifacts.build.workflowPath]);
assert.equal(allowed.size, spec.qaPaths.length + 1, 'Exact native six paths and separate build workflow');
const protectedUnion = [...new Set([...Object.keys(built), ...Object.keys(sourceBefore)])].filter(file => !allowed.has(file)).sort();
const bridge = spec.buildHarnessBridge;
assert.equal(bridge.path, 'scripts/simNbaHistoricalDraft.mjs');
const beforeHarness = await fs.readFile(bridge.path), beforeText = beforeHarness.toString();
assert.equal(blob(beforeHarness), bridge.checkoutBlob);
assert.equal(beforeText.split(bridge.before).length - 1, 1, 'One real build-only harness source span');
const afterText = beforeText.replace(bridge.before, bridge.after), afterHarness = Buffer.from(afterText);
assert.notEqual(afterText, beforeText); assert.equal(afterText.replace(bridge.after, bridge.before), beforeText, 'Whole build-only harness inverse');
assert.equal(blob(afterHarness), bridge.buildBlob); assert.equal(sha(afterHarness), built[bridge.path], 'Actual completed-build harness body');
for (const file of protectedUnion)
  assert.equal(file === bridge.path ? sha(afterHarness) : sourceBefore[file], built[file], 'Complete protected build/current source union ' + file);
for (const file of spec.qaPaths) { assert(sourceBefore[file], file); assert.equal(built[file], undefined, 'Only declared native QA additions'); }
assert(built[spec.artifacts.build.workflowPath]); assert.equal(sourceBefore[spec.artifacts.build.workflowPath], undefined, 'Exact build workflow source role');
const distLedgerBytes = await fs.readFile(path.join(buildRef, 'dist-before.sha256'));
assert.equal(sha(distLedgerBytes), spec.artifacts.build.distInventorySHA256);
assert(distLedgerBytes.equals(await fs.readFile(path.join(buildRef, 'dist-after.sha256'))), 'Completed dist before/after ledger');
const expectedDist = Object.fromEntries(Object.entries(ledger(distLedgerBytes)).map(([file, digest]) => {
  assert(file.startsWith('dist/')); return [file.slice(5), digest];
}));

const bundle = 'reference.mjs', entry = 'reference-entry.mjs';
const exports = { engine: 'src/lib/soccerCareerEngine.ts', codec: 'src/lib/soccerCareerSave.ts',
  moments: 'src/components/soccer-career/careerMoments.ts', wheel: 'src/lib/careerChanceWheel.ts' };
await fs.writeFile(path.join(out, entry), Object.entries(exports).map(([name, file]) =>
  'export * as ' + name + ' from ' + JSON.stringify(path.join(root, file)) + ';').join('\n') + '\n', { flag: 'wx' });
await build({ entryPoints: [path.join(out, entry)], outfile: path.join(out, bundle), bundle: true, format: 'esm',
  platform: 'node', alias: { '@': path.join(root, 'src') }, logLevel: 'error' });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)),
  removeItem: k => memory.delete(k), clear: () => memory.clear() };
const importDraws = [], originalRandom = Math.random; let seed = 7301, api;
try {
  Math.random = () => { seed = seed * 16807 % 2147483647; const value = (seed - 1) / 2147483646; importDraws.push(value); return value; };
  api = await import(pathToFileURL(path.join(out, bundle)).href);
} finally { Math.random = originalRandom; }
const { engine, codec, moments } = api;
const preparation = { scope: 'Copy authentic restored2019 newspaper saves, then actual Page parse/repair/settle normalization only. Browser uses the existing phase-independent utility Phone after real saved-wheel acknowledgment. No constructor, phase continuation, annual action, player insertion or model outcome generation.', importSeed: 7301, importDraws, loads: [] };
function load(raw, label) {
  const random = Math.random, now = Date.now; let draws = 0, clocks = 0;
  try {
    Math.random = () => { draws++; throw Error(label + ' unexpectedly drew Node RNG'); };
    Date.now = () => { clocks++; throw Error(label + ' unexpectedly read Node clock'); };
    const before = codec.parseSoccerCareerSave(raw); assert(codec.isSoccerCareerSave(before));
    const state = engine.repairCareer(plain(before));
    moments.settleLoadedMoments(state);
    const saved = codec.serializeSoccerCareerSave(state);
    assert.deepEqual(codec.parseSoccerCareerSave(saved), state, 'Full actual codec');
    preparation.loads.push({ label, beforeRaw: raw, before: plain(before), after: plain(state), afterRaw: saved,
      beforeSHA256: sha(raw), afterSHA256: sha(saved), draws, clocks, exactByteIdempotent: saved === raw });
    return { state, raw: saved };
  } finally { Math.random = random; Date.now = now; }
}
const expectedPlayers = [
  { id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos' },
  { id: 'soccer:mbappe', entryYear: 2015, entryClub: 'Monaco' },
  { id: 'soccer:haaland', entryYear: 2016, entryClub: 'Bryne' },
  { id: 'soccer:bellingham', entryYear: 2019, entryClub: 'Birmingham City' },
];
const fixtures = {};
assert.deepEqual(spec.fixtures.map(row => row.name).sort(), ['four2019', 'originalV1_2019']);
for (const row of spec.fixtures) {
  const zipped = await fs.readFile(path.join(outcomes, row.sourceStoredFile));
  assert.equal(zipped.length, row.sourceStoredBytes); assert.equal(sha(zipped), row.sourceStoredSHA256);
  const bytes = gunzipSync(zipped); assert.equal(bytes.length, row.sourceBytes); assert.equal(sha(bytes), row.sourceSHA256);
  const source = JSON.parse(bytes);
  const selected = row.name === 'four2019' ? source.frames.at(-1) : source.v1One.frames.at(-1);
  assert.equal(selected.year, 2019); assert.equal(selected.phase, 'newspaper');
  assert.equal(selected.mainRngState, row.mainRngState); assert.equal(selected.drawsThrough, row.drawsThrough);
  assert.equal(sha(selected.saved), row.sourceSaveSHA256); assert.equal(Buffer.byteLength(selected.saved), row.sourceSaveBytes);
  assert.deepEqual(codec.parseSoccerCareerSave(selected.saved), selected.state, 'Complete actual source codec, not a reconstructed fixture');
  const originalFile = row.name + '-original.json', file = row.name + '.json';
  await fs.writeFile(path.join(out, originalFile), selected.saved, { flag: 'wx' });
  const first = load(selected.saved, row.name + ' first actual Page load');
  const second = load(first.raw, row.name + ' second actual Page load');
  assert.equal(second.raw, first.raw, 'Prepared second Page load must be byte-idempotent');
  assert.equal(first.state.phase, 'newspaper'); assert.equal(first.state.seasons.at(-1).year, 2019);
  assert.deepEqual(first.state.historicalArrivals, { version: row.name === 'four2019' ? 2 : 1,
    players: row.name === 'four2019' ? expectedPlayers : expectedPlayers.slice(0, 1) });
  for (const entry of first.state.historicalArrivals.players) {
    const player = spec.players.find(player => player.id === entry.id); assert(player);
    assert.equal(first.state.phone.clubs[player.name], entry.entryClub, 'Authoritative saved current club');
  }
  assert(Object.keys(first.state.phone.clubs).length <= 28);
  assert.deepEqual(first.state.chanceWheel, selected.state.chanceWheel, 'Original already-rolled Contract Standoff receipt held');
  assert.equal(first.state.chanceWheel.title, 'Contract Standoff'); assert.equal(first.state.chanceWheel.seen, false);
  assert.equal(first.state.pendingNews.length, 2); assert(first.state.pendingSummary);
  await fs.writeFile(path.join(out, file), first.raw, { flag: 'wx' });
  fixtures[row.name] = { file, sha256: sha(first.raw), bytes: Buffer.byteLength(first.raw), originalFile, originalSHA256: sha(selected.saved),
    origin: 'Actual restored seven-arm RAW', sourceRaw: row.sourceStoredFile, sourceRawSHA256: row.sourceStoredSHA256,
    sourceDecodedSHA256: row.sourceSHA256, sourceFrame: { action: selected.action, year: selected.year, phase: selected.phase,
      drawsThrough: selected.drawsThrough, mainRngState: selected.mainRngState },
    expected: { raw: first.raw, state: plain(first.state) },
    scope: 'Authentic complete2019 newspaper frontier. Only actual Page load normalization, every delta retained. Real browser Show result/Continue then the existing utility Phone. No phase edit or continuation.' };
}
const distBefore = [];
async function walk(rel = '') { for (const e of await fs.readdir(path.join(dist, rel), { withFileTypes: true })) {
  const file = path.posix.join(rel, e.name);
  if (e.isDirectory()) await walk(file); else { assert(e.isFile()); const b = await fs.readFile(path.join(dist, file)); distBefore.push({ file, bytes: b.length, sha256: sha(b) }); }
} }
await walk(); distBefore.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0); assert.equal(distBefore.length, spec.artifacts.build.distBodies);
assert.deepEqual(Object.fromEntries(distBefore.map(row => [row.file, row.sha256])), expectedDist, 'All actual completed dist bodies');
await write('source-build-bridge.json', { buildSourceLedgerSHA256: sha(buildBefore), currentSource: sourceBefore, protectedUnion,
  exactAllowedQaPaths: [...allowed], buildOnlyHarnessBridge: { ...bridge, checkoutBody: beforeText, buildBody: afterText, wholeInverseExact: true },
  allProtectedBytesExact: true, actualDistLedgerSHA256: sha(distLedgerBytes) });
await write('preparation.json', preparation);
const sourceAfter = await snapshot(); assert.deepEqual(sourceAfter, sourceBefore); await silent();
await write('manifest.json', { schema: 1, product: spec.product, productTree: spec.productTree,
  sourceBefore, sourceAfter, pins: spec.sourcePins, players: spec.players, bundle, bundleSHA: sha(await fs.readFile(path.join(out, bundle))),
  entry, entrySHA: sha(await fs.readFile(path.join(out, entry))), preparation: { file: 'preparation.json', sha256: sha(await fs.readFile(path.join(out, 'preparation.json'))) },
  importDraws, fixtures, distBefore, distDigest: sha(JSON.stringify(distBefore)), sources: spec.artifacts,
  scope: 'Actual2005 UI creation uses natural browser RNG/clock. Two authentic restored2019 newspaper saves preserve originals and exact Page load deltas. Existing phase-independent utility Phone is used after actual saved-wheel acknowledgment. No model continuation, annual progression, fabricated old input or App rebuild.' });
console.log('SC4_NATIVE_FIXTURES_ADMITTED two authentic2019 newspaper boundaries, actual Page loader only, second-load exact, original receipts/source/transport held');
