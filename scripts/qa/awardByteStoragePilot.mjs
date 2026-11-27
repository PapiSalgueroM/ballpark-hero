// Remote data-only pilot. Never imports or evaluates application or evidence payloads.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, realpathSync, statSync, writeFileSync, writeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

const PIN = Object.freeze({
  artifactId: 11712069077, runId: 38163973428,
  head: '39fdafd54e64792b78af21896ccb035500bf32cb',
  name: 'career-award-generations-early-38163973428-1',
  zipBytes: 1030234072, zipSha256: '4d4211fdf787a0d91a6d04a4809ca18d6be4abf0ce3e9a4825ce213a51976290',
  manifestBytes: 24079500, manifestSha256: 'a0d02d7b8e4c4cac24f5950e6619a3a3a6bb297a72954d4737d460ab927e6fd1',
  membersSha256: 'e4a245b84e2f49faf220a3d62a1731ff3e2d2ba6d4f674a891f75d3e793f455e',
  metadataSha256: '3549053d70af46bcf2c607ab6aab724ba291e5fca5bd46650fff49868dc84f51',
  objectCount: 64676,
});
const CODEC = Object.freeze({ version: 1, min: 512, target: 2048, max: 8192, mask: 2047, gearSeed: 0x9e3779b9, gzipLevel: 9 });
const requiredPath = key => { assert.ok(process.env[key], 'required input ' + key); return path.resolve(process.env[key]); };
const PROOF = requiredPath('AWARD_BYTE_PILOT_PROOF');
const ZIP = requiredPath('AWARD_BYTE_PILOT_ZIP');
const MEMBERS = requiredPath('AWARD_BYTE_PILOT_MEMBERS');
const METADATA = requiredPath('AWARD_BYTE_PILOT_METADATA');
const OUT = requiredPath('AWARD_BYTE_PILOT_OUT');
const SOURCE = fileURLToPath(import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const integer = n => Number.isSafeInteger(n) && n >= 0;
const hex = s => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
const errorOf = error => ({ name: error?.name ?? 'Error', message: String(error?.message ?? error), stack: String(error?.stack ?? '') });
const failures = [], audits = [], controls = [], kinds = new Map();
let chunks = [], objects = [], objectManifest = [], packBytes = 0, packWrite = null, packRead = null, swapWitness = null, ownsOutput = false;
const report = {
  status: 'running', purpose: 'lossless raw-byte storage measurement only', original: PIN, codec: CODEC,
  qualification: 'Original 430000000 proof and 500000000 complete-artifact gates failed and remain failed. This pilot grants no application, semantic or cap acceptance.',
  runtime: { node: process.version, platform: process.platform, arch: process.arch, versions: process.versions },
  inputScope: 'every complete original proof/objects gzip body and manifest, fixed original ZIP and full member vector',
  payloadPolicy: 'Original decoded byte bodies are never parsed, reserialized, normalized or regenerated.',
  semanticAllocation: 'Manifest kind totals only; semantic role assignments require the separate original allocation audit.',
};

async function hashFile(file) {
  const digest = createHash('sha256');
  for await (const data of createReadStream(file)) digest.update(data);
  return digest.digest('hex');
}
function inside(root, file) { const relative = path.relative(root, file); return relative !== '' && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative); }
function plainFile(file) { const info = lstatSync(file); assert.ok(info.isFile() && !info.isSymbolicLink(), 'regular file ' + file); return info; }
function save(file, bytes) { const target = path.join(OUT, file); assert.ok(inside(OUT, target)); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, bytes); return { path: file, bytes: bytes.length, sha256: sha(bytes) }; }
function json(file, value) { return save(file, Buffer.from(JSON.stringify(value))); }
function packedJson(file, value) {
  const raw = Buffer.from(JSON.stringify(value)), packed = gzipSync(raw, { level: CODEC.gzipLevel });
  return { ...save(file, packed), rawBytes: raw.length, rawSha256: sha(raw), codec: 'gzip' };
}
function readPackedJson(record) {
  const packed = readFileSync(path.join(OUT, record.path));
  assert.equal(packed.length, record.bytes); assert.equal(sha(packed), record.sha256);
  const raw = gunzipSync(packed);
  assert.equal(raw.length, record.rawBytes); assert.equal(sha(raw), record.rawSha256);
  return JSON.parse(raw);
}
function writeWhole(fd, bytes, offset) { let done = 0; while (done < bytes.length) { const n = writeSync(fd, bytes, done, bytes.length - done, offset + done); assert.ok(n > 0); done += n; } }
function readWhole(fd, bytes, offset) { const result = Buffer.alloc(bytes); let done = 0; while (done < bytes) { const n = readSync(fd, result, done, bytes - done, offset + done); assert.ok(n > 0, 'complete pack read'); done += n; } return result; }
function originalBody(original) {
  const file = path.join(PROOF, original.path);
  assert.ok(inside(PROOF, file) && inside(realpathSync(PROOF), realpathSync(file)), 'original path containment');
  assert.equal(plainFile(file).size, original.packedBytes, 'complete original packed length');
  const packed = readFileSync(file);
  assert.equal(sha(packed), original.packedSha256, 'complete original packed SHA');
  const raw = gunzipSync(packed);
  assert.equal(raw.length, original.rawBytes, 'complete original raw length');
  assert.equal(sha(raw), original.rawSha256, 'complete original raw SHA');
  return raw;
}
function chunkBody(record, replacement) {
  const packed = replacement ?? readWhole(packRead, record.packedBytes, record.offset);
  assert.equal(packed.length, record.packedBytes, 'complete chunk packed length');
  assert.equal(sha(packed), record.packedSha256, 'complete chunk packed SHA');
  const raw = gunzipSync(packed);
  assert.equal(raw.length, record.rawBytes, 'complete chunk raw length');
  assert.equal(sha(raw), record.rawSha256, 'complete chunk raw SHA');
  return raw;
}
function decodeObject(row, overrides = new Map(), verifyWhole = true) {
  assert.equal(row.status, 'packed');
  const parts = row.chunkRefs.map(id => {
    assert.ok(integer(id) && id < chunks.length, 'declared chunk ID');
    assert.equal(chunks[id].id, id);
    return chunkBody(chunks[id], overrides.get(id));
  });
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  assert.equal(total, row.original.rawBytes, 'complete reconstructed raw length');
  const raw = Buffer.concat(parts, total);
  if (verifyWhole) assert.equal(sha(raw), row.original.rawSha256, 'complete reconstructed object SHA');
  return raw;
}
function gearTable() {
  let seed = CODEC.gearSeed;
  return Array.from({ length: 256 }, () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; });
}
const GEAR = gearTable();
function spans(raw, consume) {
  let start = 0, rolling = 0;
  for (let at = 0; at < raw.length; at++) {
    rolling = ((rolling << 1) + GEAR[raw[at]]) >>> 0;
    const length = at + 1 - start;
    if (length >= CODEC.max || (length >= CODEC.min && (rolling & CODEC.mask) === 0)) {
      consume(raw.subarray(start, at + 1)); start = at + 1; rolling = 0;
    }
  }
  if (start < raw.length) consume(raw.subarray(start));
}

async function main() {
  assert.ok(OUT !== PROOF && !inside(PROOF, OUT) && !inside(OUT, PROOF), 'separate immutable input and output');
  if (existsSync(OUT)) { assert.ok(lstatSync(OUT).isDirectory() && !lstatSync(OUT).isSymbolicLink()); assert.equal(readdirSync(OUT).length, 0, 'new empty output directory'); }
  mkdirSync(OUT, { recursive: true });
  assert.ok(lstatSync(PROOF).isDirectory() && !lstatSync(PROOF).isSymbolicLink());
  const realOutput = realpathSync(OUT), realProof = realpathSync(PROOF);
  assert.ok(realOutput !== realProof && !inside(realProof, realOutput) && !inside(realOutput, realProof), 'actual input/output directory separation');
  assert.ok([ZIP, MEMBERS, METADATA, SOURCE].every(file => !inside(realOutput, realpathSync(file))), 'output cannot contain original inputs or source');
  ownsOutput = true;
  report.source = save('pilot-source.mjs', readFileSync(SOURCE));
  const zipInfo = plainFile(ZIP);
  assert.equal(zipInfo.size, PIN.zipBytes);
  assert.equal(await hashFile(ZIP), PIN.zipSha256);
  const metadataBytes = readFileSync(METADATA), membersBytes = readFileSync(MEMBERS), manifestBytes = readFileSync(path.join(PROOF, 'objects.json'));
  assert.equal(sha(metadataBytes), PIN.metadataSha256);
  assert.equal(sha(membersBytes), PIN.membersSha256);
  assert.equal(manifestBytes.length, PIN.manifestBytes);
  assert.equal(sha(manifestBytes), PIN.manifestSha256);
  report.originalBodies = {
    metadata: save('input/original-artifact-metadata.json', metadataBytes), members: save('input/original-whole-member-inventory.json', membersBytes),
    objects: save('input/original-objects.json', manifestBytes),
    zip: { sourcePath: ZIP, bytes: zipInfo.size, sha256: PIN.zipSha256, retainedOriginal: true, duplicatedIntoPilot: false },
  };
  const metadata = JSON.parse(metadataBytes), members = JSON.parse(membersBytes);
  assert.equal(metadata.id, PIN.artifactId); assert.equal(metadata.name, PIN.name); assert.equal(metadata.size_in_bytes, PIN.zipBytes);
  assert.equal(metadata.digest, 'sha256:' + PIN.zipSha256); assert.equal(metadata.expired, false);
  assert.equal(metadata.workflow_run.id, PIN.runId); assert.equal(metadata.workflow_run.head_sha, PIN.head);
  assert.ok(Array.isArray(members));
  objectManifest = JSON.parse(manifestBytes);
  assert.ok(Array.isArray(objectManifest)); assert.equal(objectManifest.length, PIN.objectCount);
  const declaredPaths = new Map(), memberPaths = new Map();
  for (const member of members) {
    assert.equal(typeof member.path, 'string'); assert.ok(!memberPaths.has(member.path), 'unique whole ZIP member path'); memberPaths.set(member.path, member);
  }
  const manifestMember = memberPaths.get('proof/objects.json');
  assert.equal(manifestMember?.kind, 'file'); assert.equal(manifestMember.bytes, PIN.manifestBytes); assert.equal(manifestMember.sha256, PIN.manifestSha256);
  for (const original of objectManifest) {
    assert.deepEqual(Object.keys(original).sort(), ['hash', 'kind', 'packedBytes', 'packedSha256', 'path', 'rawBytes', 'rawSha256'].sort());
    assert.ok(hex(original.hash) && original.hash === original.rawSha256 && hex(original.packedSha256));
    assert.equal(original.path, 'objects/' + original.hash + '.gz'); assert.ok(typeof original.kind === 'string' && original.kind.length > 0);
    assert.ok(integer(original.rawBytes) && integer(original.packedBytes)); assert.ok(!declaredPaths.has(original.path)); declaredPaths.set(original.path, original);
    const member = memberPaths.get('proof/' + original.path);
    assert.equal(member?.kind, 'file'); assert.equal(member.bytes, original.packedBytes); assert.equal(member.sha256, original.packedSha256);
  }
  const objectMembers = members.filter(member => member.kind === 'file' && member.path.startsWith('proof/objects/'));
  assert.equal(objectMembers.length, PIN.objectCount);
  assert.ok(objectMembers.every(member => declaredPaths.has(member.path.slice('proof/'.length))), 'full original object member bijection');
  const actualNames = readdirSync(path.join(PROOF, 'objects')).sort();
  assert.deepEqual(actualNames, objectManifest.map(original => original.path.slice('objects/'.length)).sort(), 'full extracted object file bijection');
  report.gear = json('gear-table.json', GEAR);
  const ids = new Map(), firstByLength = new Map();
  packWrite = openSync(path.join(OUT, 'chunks.pack'), 'wx');
  try {
    for (let index = 0; index < objectManifest.length; index++) {
      const original = objectManifest[index], row = { index, original, status: 'packing', chunkRefs: [], error: null };
      objects.push(row);
      try {
        const raw = originalBody(original);
        spans(raw, bytes => {
          const digest = sha(bytes); let id = ids.get(digest);
          if (id === undefined) {
            id = chunks.length;
            const packed = gzipSync(bytes, { level: CODEC.gzipLevel });
            const record = { id, offset: packBytes, rawBytes: bytes.length, rawSha256: digest, packedBytes: packed.length, packedSha256: sha(packed) };
            writeWhole(packWrite, packed, packBytes); chunks.push(record); ids.set(digest, id); packBytes += packed.length;
            const sameLengthId = firstByLength.get(bytes.length);
            if (sameLengthId !== undefined && swapWitness === null) swapWitness = { objectIndex: index, ordinal: row.chunkRefs.length, originalChunkId: id, replacementChunkId: sameLengthId };
            if (sameLengthId === undefined) firstByLength.set(bytes.length, id);
          } else assert.equal(chunks[id].rawBytes, bytes.length, 'dedup hash length');
          row.chunkRefs.push(id);
        });
        row.status = 'packed';
        const totals = kinds.get(original.kind) ?? { kind: original.kind, objects: 0, rawBytes: 0, originalPackedBytes: 0, chunkReferences: 0 };
        totals.objects++; totals.rawBytes += original.rawBytes; totals.originalPackedBytes += original.packedBytes; totals.chunkReferences += row.chunkRefs.length; kinds.set(original.kind, totals);
      } catch (error) { row.status = 'failed'; row.error = errorOf(error); failures.push({ stage: 'original-pack', index, original, error: row.error }); }
      if ((index + 1) % 4096 === 0) console.log('PACK measured objects ' + (index + 1) + '/' + PIN.objectCount);
    }
  } finally { closeSync(packWrite); packWrite = null; }
  assert.equal(statSync(path.join(OUT, 'chunks.pack')).size, packBytes, 'whole physical pack length');
  report.encodedMetadata = { chunkLedger: packedJson('chunk-ledger.json.gz', chunks), objectReferences: packedJson('object-refs.json.gz', objects) };
  chunks = readPackedJson(report.encodedMetadata.chunkLedger);
  objects = readPackedJson(report.encodedMetadata.objectReferences);
  assert.ok(Array.isArray(chunks) && Array.isArray(objects)); assert.equal(objects.length, PIN.objectCount);
  let loadedPackBytes = 0;
  for (let id = 0; id < chunks.length; id++) {
    const record = chunks[id];
    assert.deepEqual(Object.keys(record).sort(), ['id', 'offset', 'packedBytes', 'packedSha256', 'rawBytes', 'rawSha256'].sort());
    assert.equal(record.id, id); assert.equal(record.offset, loadedPackBytes);
    assert.ok(integer(record.rawBytes) && record.rawBytes > 0 && record.rawBytes <= CODEC.max && integer(record.packedBytes) && record.packedBytes > 0 && hex(record.rawSha256) && hex(record.packedSha256));
    loadedPackBytes += record.packedBytes;
  }
  assert.equal(loadedPackBytes, packBytes);
  for (let index = 0; index < objects.length; index++) { assert.equal(objects[index].index, index); assert.deepEqual(objects[index].original, objectManifest[index]); assert.ok(Array.isArray(objects[index].chunkRefs)); }
  packRead = openSync(path.join(OUT, 'chunks.pack'), 'r');
  for (let index = 0; index < objectManifest.length; index++) {
    const original = objectManifest[index], audit = { index, hash: original.hash, verified: false, decodedBytes: null, decodedSha256: null, error: null };
    audits.push(audit);
    try {
      const originalRaw = originalBody(original), decoded = decodeObject(objects[index]);
      assert.ok(decoded.equals(originalRaw), 'whole original byte equality');
      audit.verified = true; audit.decodedBytes = decoded.length; audit.decodedSha256 = sha(decoded);
    } catch (error) { audit.error = errorOf(error); failures.push({ stage: 'independent-whole-decode', index, original, error: audit.error }); }
    if ((index + 1) % 4096 === 0) console.log('DECODE measured objects ' + (index + 1) + '/' + PIN.objectCount);
  }
  assert.equal(objects.length, PIN.objectCount); assert.equal(audits.length, PIN.objectCount);
  assert.equal(failures.length, 0, 'all original objects and complete decodes must pass');
  assert.ok(swapWitness, 'actual distinct same-length chunk pair required');
  const witnessRow = objects[swapWitness.objectIndex], originalRaw = originalBody(witnessRow.original);
  const chunk = chunks[swapWitness.originalChunkId], originalPacked = readWhole(packRead, chunk.packedBytes, chunk.offset);
  assert.ok(originalPacked.length >= 18 && originalPacked[0] === 0x1f && originalPacked[1] === 0x8b && originalPacked[2] === 8 && originalPacked[3] === 0, 'actual fixed gzip header shape');
  const originalChunkRaw = chunkBody(chunk), changedPacked = Buffer.from(originalPacked), byteOffset = 4, oldByte = changedPacked[byteOffset];
  changedPacked[byteOffset] ^= 1;
  assert.ok(!changedPacked.equals(originalPacked));
  const changedChunkRaw = gunzipSync(changedPacked);
  assert.ok(changedChunkRaw.equals(originalChunkRaw), 'actual copied MTIME change keeps every decoded chunk byte');
  let packedError = null;
  try { decodeObject(witnessRow, new Map([[chunk.id, changedPacked]])); } catch (error) { packedError = errorOf(error); }
  assert.ok(packedError, 'actual copied packed-header change must be rejected by decoder integrity');
  const restoredPacked = Buffer.from(changedPacked); restoredPacked[byteOffset] = oldByte;
  assert.ok(restoredPacked.equals(originalPacked)); assert.ok(gunzipSync(restoredPacked).equals(originalChunkRaw)); assert.ok(decodeObject(witnessRow, new Map([[chunk.id, restoredPacked]])).equals(originalRaw));
  controls.push({ id: 'copied-packed-chunk-byte', label: 'copied data only, not an application fault', witness: swapWitness, originalChunk: chunk, byteOffset, oldByte, changedByte: changedPacked[byteOffset],
    header: { magic: [originalPacked[0], originalPacked[1]], compressionMethod: originalPacked[2], flags: originalPacked[3], field: 'MTIME', decodedBytes: changedChunkRaw.length, decodedSha256: sha(changedChunkRaw), wholeDecodedChunkEqual: true },
    original: save('controls/packed/original.gz', originalPacked), fault: save('controls/packed/fault.gz', changedPacked), undo: save('controls/packed/undo.gz', restoredPacked),
    completeObjectRow: packedJson('controls/packed/object-row.json.gz', witnessRow), actualError: packedError, fullUndo: true });
  const faultRow = structuredClone(witnessRow);
  faultRow.chunkRefs[swapWitness.ordinal] = swapWitness.replacementChunkId;
  assert.equal(chunks[swapWitness.originalChunkId].rawBytes, chunks[swapWitness.replacementChunkId].rawBytes);
  assert.notEqual(chunks[swapWitness.originalChunkId].rawSha256, chunks[swapWitness.replacementChunkId].rawSha256);
  const changedRaw = decodeObject(faultRow, new Map(), false);
  assert.equal(changedRaw.length, originalRaw.length); assert.ok(!changedRaw.equals(originalRaw)); assert.notEqual(sha(changedRaw), witnessRow.original.rawSha256);
  let swappedError = null;
  try { decodeObject(faultRow); } catch (error) { swappedError = errorOf(error); }
  assert.ok(swappedError, 'valid same-length reference swap must be rejected by whole-object SHA');
  const undoRow = structuredClone(faultRow); undoRow.chunkRefs[swapWitness.ordinal] = swapWitness.originalChunkId;
  assert.deepEqual(undoRow, witnessRow); assert.ok(decodeObject(undoRow).equals(originalRaw));
  controls.push({ id: 'copied-valid-same-length-reference', label: 'copied metadata only, not an application fault', witness: swapWitness,
    original: packedJson('controls/reference/original-row.json.gz', witnessRow), fault: packedJson('controls/reference/fault-row.json.gz', faultRow), undo: packedJson('controls/reference/undo-row.json.gz', undoRow),
    changedRaw: { ...save('controls/reference/fault-raw.gz', gzipSync(changedRaw, { level: CODEC.gzipLevel })), rawBytes: changedRaw.length, rawSha256: sha(changedRaw), codec: 'gzip' },
    everyChunkIntegrityHeld: true, actualError: swappedError, fullUndo: true });
  assert.equal(plainFile(ZIP).size, PIN.zipBytes); assert.equal(await hashFile(ZIP), PIN.zipSha256, 'complete original ZIP held after pilot');
  assert.ok(readFileSync(MEMBERS).equals(membersBytes) && readFileSync(METADATA).equals(metadataBytes) && readFileSync(path.join(PROOF, 'objects.json')).equals(manifestBytes), 'whole original manifests held');
  report.measurement = { attemptedObjects: objects.length, fullyDecodedObjects: audits.filter(row => row.verified).length, originalRawBytes: objectManifest.reduce((sum, row) => sum + row.rawBytes, 0),
    originalPackedBytes: objectManifest.reduce((sum, row) => sum + row.packedBytes, 0), references: objects.reduce((sum, row) => sum + row.chunkRefs.length, 0),
    uniqueChunks: chunks.length, uniqueChunkRawBytes: chunks.reduce((sum, row) => sum + row.rawBytes, 0), chunkPackBytes: packBytes, chunkPackSha256: await hashFile(path.join(OUT, 'chunks.pack')),
    kinds: [...kinds.values()].sort((a, b) => a.kind.localeCompare(b.kind)), effectiveControls: controls.map(row => row.id),
    meaning: 'Measured whole data only; no accepted application codec or accepted cap result.' };
  report.status = 'pass';
}

function outputFiles(directory = OUT) {
  const result = [];
  for (const name of readdirSync(directory).sort()) {
    const file = path.join(directory, name), info = lstatSync(file);
    assert.ok(!info.isSymbolicLink(), 'output contains no symlink');
    if (info.isDirectory()) result.push(...outputFiles(file)); else { assert.ok(info.isFile()); result.push(file); }
  }
  return result;
}
async function finalize() {
  report.retained = {
    chunkLedger: packedJson('chunk-ledger.json.gz', chunks), objectReferences: packedJson('object-refs.json.gz', objects), wholeObjectAudit: packedJson('whole-object-audit.json.gz', audits),
    controls: json('controls.json', controls), failures: json('failures.json', failures),
  };
  json('report.json', report);
  const ledger = [];
  for (const file of outputFiles().filter(file => !['output-inventory.json', 'physical-size.json'].includes(path.relative(OUT, file)))) ledger.push({ path: path.relative(OUT, file).split(path.sep).join('/'), bytes: statSync(file).size, sha256: await hashFile(file) });
  json('output-inventory.json', { scope: 'all complete output files except this inventory and physical-size.json; workflow must hash those two whole files independently', files: ledger });
  const receipt = { scope: 'every physical pilot output including this receipt and output-inventory.json', files: 0, bytes: 0, oldCapsRemainFailed: true, noCapAcceptance: true };
  for (let attempt = 0; attempt < 12; attempt++) {
    json('physical-size.json', receipt);
    const files = outputFiles(), bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
    if (receipt.files === files.length && receipt.bytes === bytes) {
      assert.equal(statSync(path.join(OUT, 'physical-size.json')).size + outputFiles().filter(file => file !== path.join(OUT, 'physical-size.json')).reduce((sum, file) => sum + statSync(file).size, 0), bytes);
      return;
    }
    receipt.files = files.length; receipt.bytes = bytes;
  }
  throw new Error('physical output receipt did not converge');
}

try { await main(); } catch (error) { report.status = 'fail'; report.finalError = errorOf(error); failures.push({ stage: 'terminal', error: report.finalError }); }
finally {
  if (packWrite !== null) closeSync(packWrite);
  if (packRead !== null) closeSync(packRead);
  if (ownsOutput) {
    try { await finalize(); } catch (error) {
      report.status = 'fail'; report.footerError = errorOf(error); failures.push({ stage: 'footer', error: report.footerError });
      try { await finalize(); } catch (lastError) {
        report.finalInventoryComplete = false; report.lastFooterError = errorOf(lastError); failures.push({ stage: 'footer-retry', error: report.lastFooterError });
        json('failures.json', failures); json('report.json', report);
        console.error('Incomplete failed footer retained: ' + JSON.stringify(report.lastFooterError));
      }
    }
  }
}
console.log('Pilot declared original objects: ' + PIN.objectCount);
console.log('Pilot fully decoded objects: ' + audits.filter(row => row.verified).length);
console.log('Pilot effective copied-data controls: ' + controls.length);
console.log('Pilot status: ' + report.status + '; original failed caps remain failed');
if (report.status !== 'pass') process.exitCode = 1;
