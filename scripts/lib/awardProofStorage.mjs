import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

export const AWARD_PROOF_CODEC = Object.freeze({ version: 1, min: 512, target: 2048, max: 8192, mask: 2047, gearSeed: 0x9e3779b9, gzipLevel: 9 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const integer = value => Number.isSafeInteger(value) && value >= 0;
const hex = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const errorOf = error => ({ name: error.name, message: error.message, stack: error.stack });
function keys(value, expected) { assert.ok(value && typeof value === 'object' && !Array.isArray(value)); assert.deepEqual(Object.keys(value).sort(), [...expected].sort()); }
function originalShape(row) {
  keys(row, ['hash', 'kind', 'path', 'rawBytes', 'rawSha256', 'packedBytes', 'packedSha256']);
  assert.ok(hex(row.hash) && row.hash === row.rawSha256 && hex(row.packedSha256));
  assert.ok(typeof row.kind === 'string' && row.kind.length > 0);
  assert.equal(row.path, `objects/${row.hash}.gz`);
  assert.ok(integer(row.rawBytes) && integer(row.packedBytes));
}
function readWhole(fd, length, offset) {
  const bytes = Buffer.alloc(length); let done = 0;
  while (done < length) { const count = fs.readSync(fd, bytes, done, length - done, offset + done); assert.ok(count > 0, 'complete pack read'); done += count; }
  return bytes;
}
function chunkBody(chunk, packed, rawChunks = null) {
  assert.equal(packed.length, chunk.packedBytes, 'complete chunk packed length');
  assert.equal(sha(packed), chunk.packedSha256, 'complete chunk packed SHA');
  const raw = rawChunks?.get(chunk.id) ?? gunzipSync(packed);
  assert.equal(raw.length, chunk.rawBytes, 'complete chunk raw length');
  assert.equal(sha(raw), chunk.rawSha256, 'complete chunk raw SHA'); if (rawChunks) rawChunks.set(chunk.id, raw); return raw;
}
function decoder(chunks, readChunk) {
  const rawChunks = new Map();
  return (row, overrides = new Map(), verifyWhole = true) => {
    keys(row, ['index', 'original', 'status', 'chunkRefs', 'error']); originalShape(row.original);
    assert.ok(integer(row.index)); assert.equal(row.status, 'packed'); assert.equal(row.error, null); assert.ok(Array.isArray(row.chunkRefs));
    const parts = row.chunkRefs.map(id => { assert.ok(integer(id) && id < chunks.length, 'declared chunk ID'); assert.equal(chunks[id].id, id); return chunkBody(chunks[id], overrides.get(id) ?? readChunk(chunks[id]), rawChunks); });
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    assert.equal(length, row.original.rawBytes, 'complete reconstructed raw length');
    const raw = Buffer.concat(parts, length);
    if (verifyWhole) assert.equal(sha(raw), row.original.rawSha256, 'complete reconstructed object SHA'); return raw;
  };
}
function gearTable() {
  let seed = AWARD_PROOF_CODEC.gearSeed;
  return Array.from({ length: 256 }, () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; });
}
const GEAR = gearTable();
function spans(raw, consume) {
  let start = 0, rolling = 0;
  for (let at = 0; at < raw.length; at++) {
    rolling = ((rolling << 1) + GEAR[raw[at]]) >>> 0;
    const length = at + 1 - start;
    if (length >= AWARD_PROOF_CODEC.max || (length >= AWARD_PROOF_CODEC.min && (rolling & AWARD_PROOF_CODEC.mask) === 0)) { consume(raw.subarray(start, at + 1)); start = at + 1; rolling = 0; }
  }
  if (start < raw.length) consume(raw.subarray(start));
}
async function fileHash(file) { const digest = createHash('sha256'); for await (const bytes of fs.createReadStream(file)) digest.update(bytes); return digest.digest('hex'); }

export function createAwardProofStorage(root) {
  const folder = path.join(root, 'storage'), packFile = path.join(folder, 'chunks.pack'); fs.mkdirSync(folder, { recursive: true });
  const chunks = [], rows = [], rawInventory = [], audits = [], controls = [], errors = [], orphanRanges = [];
  const chunkIds = new Map(), objectRows = new Map(), firstByLength = new Map();
  let bytesWritten = 0, writeFd = null, readFd = null, poisoned = false, finished = false, witness = null;
  const save = (name, bytes) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); return { path: name, bytes: bytes.length, sha256: sha(bytes) }; };
  const saveJson = (name, value) => save(name, Buffer.from(JSON.stringify(value)));
  const savePacked = (name, value) => { const raw = Buffer.from(JSON.stringify(value)); return { ...save(name, gzipSync(raw, { level: AWARD_PROOF_CODEC.gzipLevel })), rawBytes: raw.length, rawSha256: sha(raw), codec: 'gzip' }; };
  const source = save('storage/codec-source.mjs', fs.readFileSync(fileURLToPath(import.meta.url))), gear = saveJson('storage/gear-table.json', GEAR);
  writeFd = fs.openSync(packFile, 'wx+');
  const readCurrent = chunk => readWhole(readFd ?? writeFd, chunk.packedBytes, chunk.offset);
  const decodeCurrent = decoder(chunks, readCurrent);
  function getBytes(hash, overrides = new Map(), selectedRow = objectRows.get(hash)) { assert.ok(selectedRow, 'existing complete raw object'); assert.equal(selectedRow.original.hash, hash); return decodeCurrent(selectedRow, overrides); }
  function add(raw, original) {
    assert.ok(Buffer.isBuffer(raw)); originalShape(original); assert.equal(raw.length, original.rawBytes); assert.equal(sha(raw), original.rawSha256);
    assert.ok(!finished && !poisoned && writeFd !== null, 'live complete byte writer'); assert.ok(!objectRows.has(original.hash), 'unique first raw object');
    const row = { index: rows.length, original: { ...original }, status: 'packing', chunkRefs: [], error: null }; rows.push(row);
    rawInventory.push({ index: row.index, hash: original.hash, kind: original.kind, rawBytes: raw.length, rawSha256: sha(raw) });
    try {
      spans(raw, part => {
        const digest = sha(part); let id = chunkIds.get(digest);
        if (id === undefined) {
          id = chunks.length; const packed = gzipSync(part, { level: AWARD_PROOF_CODEC.gzipLevel });
          const chunk = { id, offset: bytesWritten, rawBytes: part.length, rawSha256: digest, packedBytes: packed.length, packedSha256: sha(packed) }; let done = 0;
          try { while (done < packed.length) { const count = fs.writeSync(writeFd, packed, done, packed.length - done, bytesWritten + done); assert.ok(count > 0, 'complete pack write'); done += count; } }
          catch (error) { poisoned = true; orphanRanges.push({ chunk, bytesWritten: done, actualPhysicalBytes: Math.max(0, fs.fstatSync(writeFd).size - bytesWritten), error: errorOf(error) }); throw error; }
          chunks.push(chunk); chunkIds.set(digest, id); bytesWritten += packed.length;
          const replacement = firstByLength.get(part.length);
          if (replacement !== undefined && witness === null) witness = { objectIndex: row.index, ordinal: row.chunkRefs.length, originalChunkId: id, replacementChunkId: replacement };
          if (replacement === undefined) firstByLength.set(part.length, id);
        } else { assert.equal(chunks[id].rawBytes, part.length, 'dedup raw length'); assert.ok(chunkBody(chunks[id], readCurrent(chunks[id])).equals(part), 'complete dedup raw bytes'); }
        row.chunkRefs.push(id);
      });
      row.status = 'packed'; objectRows.set(original.hash, row);
    } catch (error) { row.status = 'failed'; row.error = errorOf(error); errors.push({ stage: 'insertion', index: row.index, original: row.original, error: row.error }); throw error; }
  }
  function declaredBytes(record) {
    assert.ok(record && typeof record.path === 'string'); const relative = path.relative(root, path.resolve(root, record.path));
    assert.ok(relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
    const file = path.join(root, record.path); assert.ok(fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink());
    const bytes = fs.readFileSync(file); assert.equal(bytes.length, record.bytes); assert.equal(sha(bytes), record.sha256); return bytes;
  }
  function packedValue(record) { assert.equal(record.codec, 'gzip'); const raw = gunzipSync(declaredBytes(record)); assert.equal(raw.length, record.rawBytes); assert.equal(sha(raw), record.rawSha256); return JSON.parse(raw); }
  async function reopened(receipt) {
    assert.equal(receipt.representation, 'cdc-byte-pack-v1'); assert.deepEqual(receipt.codec, AWARD_PROOF_CODEC);
    assert.deepEqual(JSON.parse(declaredBytes(receipt.gear)), GEAR);
    const storedChunks = packedValue(receipt.chunkLedger), storedRows = packedValue(receipt.objectReferences), storedRaw = packedValue(receipt.rawInsertionInventory);
    assert.ok(Array.isArray(storedChunks) && Array.isArray(storedRows) && Array.isArray(storedRaw));
    assert.deepEqual(storedChunks, chunks); assert.deepEqual(storedRows, rows); assert.deepEqual(storedRaw, rawInventory);
    assert.equal(fs.statSync(packFile).size, receipt.pack.bytes); assert.equal(await fileHash(packFile), receipt.pack.sha256);
    let offset = 0; const ids = new Set();
    for (const chunk of storedChunks) {
      keys(chunk, ['id', 'offset', 'rawBytes', 'rawSha256', 'packedBytes', 'packedSha256']); assert.equal(chunk.id, ids.size); assert.equal(chunk.offset, offset);
      assert.ok(integer(chunk.rawBytes) && chunk.rawBytes > 0 && chunk.rawBytes <= AWARD_PROOF_CODEC.max && integer(chunk.packedBytes) && chunk.packedBytes > 0 && hex(chunk.rawSha256) && hex(chunk.packedSha256));
      assert.ok(!ids.has(chunk.rawSha256)); ids.add(chunk.rawSha256); offset += chunk.packedBytes;
    }
    assert.ok(offset <= receipt.pack.bytes); assert.equal(offset, bytesWritten); if (orphanRanges.length === 0) assert.equal(offset, receipt.pack.bytes, 'no orphan physical pack range');
    const fd = fs.openSync(packFile, 'r'), decode = decoder(storedChunks, chunk => readWhole(fd, chunk.packedBytes, chunk.offset));
    const byHash = new Map();
    try {
      for (let index = 0; index < storedRows.length; index++) {
        const row = storedRows[index]; keys(row, ['index', 'original', 'status', 'chunkRefs', 'error']); originalShape(row.original); assert.equal(row.index, index);
        assert.deepEqual(storedRaw[index], { index, hash: row.original.hash, kind: row.original.kind, rawBytes: row.original.rawBytes, rawSha256: row.original.rawSha256 });
        assert.ok(!byHash.has(row.original.hash)); byHash.set(row.original.hash, row); assert.ok(Array.isArray(row.chunkRefs));
        for (const id of row.chunkRefs) assert.ok(integer(id) && id < storedChunks.length);
      }
      assert.equal(storedRaw.length, storedRows.length);
      return { getBytes: (hash, overrides = new Map(), row = byHash.get(hash)) => { assert.ok(row); assert.equal(row.original.hash, hash); return decode(row, overrides); }, decode, close: () => fs.closeSync(fd) };
    } catch (error) { fs.closeSync(fd); throw error; }
  }
  function expectedFailure(read, row, overrides, label) {
    let actual = null; try { read(row.original.hash, overrides, row); } catch (error) { actual = errorOf(error); }
    assert.ok(actual && actual.name === 'AssertionError' && actual.message.includes(label), `precise ${label} guard required`); return actual;
  }
  function copiedControls(persisted) {
    assert.ok(witness, 'actual distinct same-length chunk witness required'); const row = rows[witness.objectIndex], chunk = chunks[witness.originalChunkId];
    const raw = getBytes(row.original.hash), packed = readCurrent(chunk); assert.deepEqual(persisted.getBytes(row.original.hash), raw);
    assert.ok(packed.length >= 18 && packed[0] === 31 && packed[1] === 139 && packed[2] === 8 && packed[3] === 0);
    const fault = Buffer.from(packed); fault[4] ^= 1; assert.ok(!fault.equals(packed)); assert.ok(gunzipSync(fault).equals(chunkBody(chunk, packed)));
    const first = { id: 'copied-packed-chunk-byte', witness, originalChunk: chunk, byteOffset: 4, oldByte: packed[4], changedByte: fault[4],
      original: save('storage/controls/packed/original.gz', packed), fault: save('storage/controls/packed/fault.gz', fault), undo: null,
      completeObjectRow: savePacked('storage/controls/packed/object-row.json.gz', row), decodedRawBytes: chunk.rawBytes, decodedRawSha256: chunk.rawSha256, wholeDecodedChunkEqual: true, paths: {}, fullUndo: false };
    controls.push(first);
    for (const [name, read] of [['integrated', getBytes], ['persisted', persisted.getBytes]]) first.paths[name] = { actualError: expectedFailure(read, row, new Map([[chunk.id, fault]]), 'complete chunk packed SHA'), wholeUndo: false };
    const undo = Buffer.from(fault); undo[4] = packed[4]; assert.ok(undo.equals(packed)); first.undo = save('storage/controls/packed/undo.gz', undo);
    for (const [name, read] of [['integrated', getBytes], ['persisted', persisted.getBytes]]) { assert.ok(read(row.original.hash, new Map([[chunk.id, undo]]), row).equals(raw)); first.paths[name].wholeUndo = true; } first.fullUndo = true;
    const faultRow = structuredClone(row); faultRow.chunkRefs[witness.ordinal] = witness.replacementChunkId;
    assert.equal(chunks[witness.originalChunkId].rawBytes, chunks[witness.replacementChunkId].rawBytes); assert.notEqual(chunks[witness.originalChunkId].rawSha256, chunks[witness.replacementChunkId].rawSha256);
    const changedRaw = decodeCurrent(faultRow, new Map(), false); assert.equal(changedRaw.length, raw.length); assert.ok(!changedRaw.equals(raw));
    const second = { id: 'copied-valid-same-length-reference', witness,
      original: savePacked('storage/controls/reference/original-row.json.gz', row), fault: savePacked('storage/controls/reference/fault-row.json.gz', faultRow), undo: null,
      changedRaw: { ...save('storage/controls/reference/fault-raw.gz', gzipSync(changedRaw, { level: AWARD_PROOF_CODEC.gzipLevel })), rawBytes: changedRaw.length, rawSha256: sha(changedRaw), codec: 'gzip' }, everyChunkIntegrityHeld: true, paths: {}, fullUndo: false };
    controls.push(second);
    for (const [name, read] of [['integrated', getBytes], ['persisted', persisted.getBytes]]) second.paths[name] = { actualError: expectedFailure(read, faultRow, new Map(), 'complete reconstructed object SHA'), wholeUndo: false };
    const restoredRow = structuredClone(faultRow); restoredRow.chunkRefs[witness.ordinal] = witness.originalChunkId; assert.deepEqual(restoredRow, row); second.undo = savePacked('storage/controls/reference/undo-row.json.gz', restoredRow);
    assert.ok(declaredBytes(second.undo).equals(declaredBytes(second.original)));
    for (const [name, read] of [['integrated', getBytes], ['persisted', persisted.getBytes]]) { assert.ok(read(row.original.hash, new Map(), restoredRow).equals(raw)); second.paths[name].wholeUndo = true; } second.fullUndo = true;
  }
  async function finish() {
    assert.ok(!finished, 'single storage finalization'); finished = true; let persisted = null;
    const receipt = { representation: 'cdc-byte-pack-v1', originalRepresentation: 'objects.json is former whole-gzip reference metadata only, those individual gzip bodies are not physically retained', status: 'fail', complete: false, codec: AWARD_PROOF_CODEC, source, gear, pack: null,
      chunkLedger: null, objectReferences: null, rawInsertionInventory: null, reconstruction: null, controls: null, errors: null, attemptedObjects: rows.length, completedObjects: rows.filter(row => row.status === 'packed').length, decodedObjects: 0, unreferencedChunks: [], orphanRanges };
    try {
      try { fs.fsyncSync(writeFd); } finally { fs.closeSync(writeFd); writeFd = null; }
      receipt.pack = { path: 'storage/chunks.pack', bytes: fs.statSync(packFile).size, sha256: await fileHash(packFile) };
      receipt.chunkLedger = savePacked('storage/chunk-ledger.json.gz', chunks); receipt.objectReferences = savePacked('storage/object-refs.json.gz', rows); receipt.rawInsertionInventory = savePacked('storage/raw-insertion-inventory.json.gz', rawInventory);
      readFd = fs.openSync(packFile, 'r'); persisted = await reopened(receipt);
      const referenced = new Set(); for (const row of rows) for (const id of row.chunkRefs) referenced.add(id); receipt.unreferencedChunks = chunks.filter(chunk => !referenced.has(chunk.id)).map(chunk => chunk.id);
      for (const row of rows) {
        const audit = { index: row.index, hash: row.original.hash, verified: false, decodedBytes: null, decodedSha256: null, error: null }; audits.push(audit);
        try { const decoded = persisted.getBytes(row.original.hash), integrated = getBytes(row.original.hash); assert.ok(decoded.equals(integrated), 'every integrated and reopened raw byte'); assert.equal(decoded.length, rawInventory[row.index].rawBytes); assert.equal(sha(decoded), rawInventory[row.index].rawSha256); audit.verified = true; audit.decodedBytes = decoded.length; audit.decodedSha256 = sha(decoded); }
        catch (error) { audit.error = errorOf(error); errors.push({ stage: 'reconstruction', index: row.index, error: audit.error }); }
      }
      try { copiedControls(persisted); } catch (error) { errors.push({ stage: 'storage-controls', error: errorOf(error) }); }
      receipt.decodedObjects = audits.filter(row => row.verified).length;
      receipt.complete = errors.length === 0 && receipt.completedObjects === rows.length && receipt.decodedObjects === rows.length && controls.length === 2 && controls.every(control => control.fullUndo && control.paths.integrated.wholeUndo && control.paths.persisted.wholeUndo) && receipt.unreferencedChunks.length === 0 && orphanRanges.length === 0;
      receipt.status = receipt.complete ? 'pass' : 'fail';
    } catch (error) { errors.push({ stage: 'finalization', error: errorOf(error) }); }
    finally {
      for (const [name, fd] of [['writer', writeFd], ['integrated-reader', readFd]]) if (fd !== null) { try { fs.closeSync(fd); } catch (error) { errors.push({ stage: `close-${name}`, error: errorOf(error) }); } }
      writeFd = null; readFd = null; if (persisted) { try { persisted.close(); } catch (error) { errors.push({ stage: 'close-persisted-reader', error: errorOf(error) }); } }
      if (errors.length) { receipt.status = 'fail'; receipt.complete = false; }
      receipt.chunkLedger = savePacked('storage/chunk-ledger.json.gz', chunks); receipt.objectReferences = savePacked('storage/object-refs.json.gz', rows); receipt.rawInsertionInventory = savePacked('storage/raw-insertion-inventory.json.gz', rawInventory);
      receipt.reconstruction = savePacked('storage/whole-reconstruction.json.gz', audits); receipt.controls = saveJson('storage/controls.json', controls); receipt.errors = saveJson('storage/errors.json', errors);
      if (receipt.pack === null && fs.existsSync(packFile)) receipt.pack = { path: 'storage/chunks.pack', bytes: fs.statSync(packFile).size, sha256: await fileHash(packFile) };
      saveJson('storage/receipt.json', receipt);
    }
    return receipt;
  }
  return { add, getBytes, finish };
}
