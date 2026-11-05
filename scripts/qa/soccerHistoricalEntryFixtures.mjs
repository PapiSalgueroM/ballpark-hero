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
const outcomes = path.resolve(arg('--outcomes')), tail = path.resolve(arg('--tail')), buildRef = path.resolve(arg('--build')), spec = JSON.parse(await fs.readFile(arg('--spec')));
assert(out !== root && !out.startsWith(root + path.sep), 'Fixture output outside App source');
await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0, 'Prepare immutable fixtures once');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blob = bytes => crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const write = (name, value) => fs.writeFile(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const receipt = process.env.SIM_OFFLINE_RECEIPT;
const silent = async () => { assert(receipt); assert.equal((await fs.readFile(receipt)).length, 0, 'Preparation transport empty'); };
await silent();
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
const protectedPath = file => !file.startsWith('.github/') && !file.startsWith('docs/') && !file.startsWith('scripts/qa/') && !/^[^/]+\.md$/i.test(file);
const protectedUnion = [...new Set([...Object.keys(built), ...Object.keys(sourceBefore)])].filter(protectedPath).sort();
for (const file of protectedUnion) assert.equal(sourceBefore[file], built[file], 'Complete protected build/current source union ' + file);
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
const preparation = { scope: 'Copy actual admitted saved states, then actual Page parse/repair/settle normalization only. No constructor, annual action, new player row or model outcome is generated.', importSeed: 7301, importDraws, loads: [] };
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
const selected = [];
for (const row of spec.fixtures.filter(f => f.origin === 'outcomes')) {
  const bytes = await fs.readFile(path.join(outcomes, row.sourceRaw));
  assert.equal(sha(bytes), row.sourceRawSHA256, row.sourceRaw);
  const value = JSON.parse(bytes).value;
  const raw = row.name === 'entry2009' ? value.frames.at(-1).saved : value.load2015.loadedBytes;
  assert.equal(sha(raw), row.sourceSaveSHA256, row.name + ' actual codec input');
  selected.push({ ...row, raw });
}
const tailBytes = await fs.readFile(path.join(tail, spec.tail.gzip));
assert.equal(sha(tailBytes), spec.tail.gzipSHA256);
const tailRaw = JSON.parse(gunzipSync(tailBytes));
const rows = tailRaw.rows.filter(r => r.name === 'manager-employed' && r.mode === 'supported');
assert.equal(rows.length, 1, 'Unique actual manager tail boundary');
const actualTail = rows[0].candidate;
assert.equal(sha(actualTail.saved), actualTail.sha256);
assert.deepEqual(codec.parseSoccerCareerSave(actualTail.saved), actualTail.state, 'Actual complete tail saved frame');
selected.push({ ...spec.fixtures.find(f => f.name === 'retiredTail'), raw: actualTail.saved, actualCandidateSHA256: actualTail.sha256,
  selection: { name: rows[0].name, mode: rows[0].mode } });
const fixtures = {};
for (const row of selected) {
  const originalFile = row.name + '-original.json', file = row.name + '.json';
  await fs.writeFile(path.join(out, originalFile), row.raw, { flag: 'wx' });
  const first = load(row.raw, row.name + ' first actual Page load'), second = load(first.raw, row.name + ' second actual Page load');
  assert.equal(second.raw, first.raw, 'Prepared second load must be byte-idempotent');
  assert.deepEqual(first.state.historicalArrivals, { version: 1, players: [{ id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos' }] });
  assert.equal(first.state.phone.clubs.Neymar, 'Santos');
  if (row.name === 'retiredTail') {
    assert.equal(first.state.retired, true);
    assert.equal(first.state.seasons.at(-1).year, 2008);
    assert.equal(first.state.phase, 'manager_season');
  } else assert.equal(first.state.seasons.at(-1).year, row.name === 'entry2009' ? 2009 : 2015);
  await fs.writeFile(path.join(out, file), first.raw, { flag: 'wx' });
  fixtures[row.name] = { file, sha256: sha(first.raw), bytes: Buffer.byteLength(first.raw), originalFile, originalSHA256: sha(row.raw),
    origin: row.origin, sourceRaw: row.sourceRaw ?? spec.tail.gzip, sourceRawSHA256: row.sourceRawSHA256 ?? spec.tail.gzipSHA256,
    selection: row.selection ?? null, expected: { raw: first.raw, state: plain(first.state) },
    scope: 'Declared complete admitted state boundary. Source and every load delta retained. No natural browser season progression credit.' };
}
const distBefore = [];
async function walk(rel = '') { for (const e of await fs.readdir(path.join(dist, rel), { withFileTypes: true })) {
  const file = path.posix.join(rel, e.name);
  if (e.isDirectory()) await walk(file); else { assert(e.isFile()); const b = await fs.readFile(path.join(dist, file)); distBefore.push({ file, bytes: b.length, sha256: sha(b) }); }
} }
await walk(); distBefore.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0); assert.equal(distBefore.length, 848);
assert.deepEqual(Object.fromEntries(distBefore.map(row => [row.file, row.sha256])), expectedDist, 'All848 actual completed dist bodies');
await write('source-build-bridge.json', { buildSourceLedgerSHA256: sha(buildBefore), currentSource: sourceBefore, protectedUnion, allProtectedBytesExact: true, actualDistLedgerSHA256: sha(distLedgerBytes) });
await write('preparation.json', preparation);
const sourceAfter = await snapshot(); assert.deepEqual(sourceAfter, sourceBefore); await silent();
await write('manifest.json', { schema: 1, product: spec.product, productTree: spec.productTree,
  sourceBefore, sourceAfter, pins: spec.sourcePins, bundle, bundleSHA: sha(await fs.readFile(path.join(out, bundle))),
  entry, entrySHA: sha(await fs.readFile(path.join(out, entry))), preparation: { file: 'preparation.json', sha256: sha(await fs.readFile(path.join(out, 'preparation.json'))) },
  importDraws, fixtures, distBefore, distDigest: sha(JSON.stringify(distBefore)), sources: spec.artifacts,
  scope: 'Actual2005 UI creation remains a separate native journey with natural browser RNG/clock. Three declared states copied from admitted RAW with actual source-only load normalization. No model timeline generation or App rebuild.' });
console.log('SC_REAL_ENTRY_FIXTURES_ADMITTED three authentic full saved boundaries, actual Page loader, second-load exact, source and transport held');
