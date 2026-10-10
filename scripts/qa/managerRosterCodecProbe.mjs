import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import LZString from 'lz-string';

const { compressToUTF16, decompressFromUTF16 } = LZString;
const directory = process.argv[2];
const sha = value => createHash('sha256').update(value).digest('hex');
const variants = {
  keys(records) {
    const keys = [], index = new Map();
    const encode = value => {
      if (Array.isArray(value)) return [1, value.map(encode)];
      if (value === null || typeof value !== 'object') return value;
      return [0, Object.entries(value).flatMap(([key, child]) => {
        if (!index.has(key)) { index.set(key, keys.length); keys.push(key); }
        return [index.get(key), encode(child)];
      })];
    };
    const root = encode(records);
    const decode = value => {
      if (!Array.isArray(value)) return value;
      if (value[0] === 1) return value[1].map(decode);
      const entries = [];
      for (let i = 0; i < value[1].length; i += 2) entries.push([keys[value[1][i]], decode(value[1][i + 1])]);
      return Object.fromEntries(entries);
    };
    return { text: JSON.stringify([keys, root]), decode: text => {
      const [savedKeys, savedRoot] = JSON.parse(text); assert.deepEqual(savedKeys, keys);
      return decode(savedRoot);
    }, dictionaries: keys.length };
  },
  rows(records) {
    const schemas = [], index = new Map();
    const encode = value => {
      if (Array.isArray(value)) return [-1, ...value.map(encode)];
      if (value === null || typeof value !== 'object') return value;
      const keys = Object.keys(value), signature = JSON.stringify(keys);
      if (!index.has(signature)) { index.set(signature, schemas.length); schemas.push(keys); }
      return [index.get(signature), ...keys.map(key => encode(value[key]))];
    };
    const root = encode(records);
    const decode = value => {
      if (!Array.isArray(value)) return value;
      if (value[0] === -1) return value.slice(1).map(decode);
      return Object.fromEntries(schemas[value[0]].map((key, i) => [key, decode(value[i + 1])]));
    };
    return { text: JSON.stringify([schemas, root]), decode: text => {
      const [savedSchemas, savedRoot] = JSON.parse(text); assert.deepEqual(savedSchemas, schemas);
      return decode(savedRoot);
    }, dictionaries: schemas.length };
  },
};
const report = { scope: 'Read-only compression estimate from full retained remote observations. No app runtime or acceptance.', sourceArtifact: 11680328655,
  sourceHead: '49364f92e13f1394874ce75db49bd6bf5b10d80b', rows: [], totals: {} };
for (const harness of ['simClubManagerSaveSize.mjs', 'simClubManagerSlots.mjs']) {
  const base = path.join(directory, 'current', harness);
  const manifestBytes = fs.readFileSync(path.join(base, 'observer.json'));
  const manifest = JSON.parse(manifestBytes);
  for (const row of manifest.rows) {
    const archive = fs.readFileSync(path.join(base, row.file)); assert.equal(sha(archive), row.archiveSha256);
    const bytes = gunzipSync(archive); assert.equal(sha(bytes), row.sha256);
    const observation = JSON.parse(bytes);
    const states = observation.value?.state ? [observation.value.state] : observation.value?.fin
      ? [observation.value.input, observation.value.fin, observation.value.next] : [];
    if (row.kind === 'whole-storage') {
      report.originalStorageTotal = observation.value.entries.reduce((total, [key, text]) => total + key.length + text.length, 0);
      assert.equal(report.originalStorageTotal, 502507, 'All four actual stored keys are counted');
      report.totals[harness] = Object.fromEntries(['keys', 'rows'].map(name => [name, observation.value.entries.reduce((total, [key, text]) => {
        let state; try { state = JSON.parse(text); } catch { return total + key.length + text.length; }
        if (!state?.worldRoster?.packedRecords) return total + key.length + text.length;
        const records = JSON.parse(decompressFromUTF16(state.worldRoster.packedRecords));
        const encoding = variants[name](records);
        const next = { ...state, worldRoster: { ...state.worldRoster, packedRecords: compressToUTF16(encoding.text), packedFormat: 'rows-v1' } };
        return total + key.length + JSON.stringify(next).length;
      }, 0)]));
    }
    states.forEach((state, stateIndex) => {
      if (!state?.worldRoster?.packedRecords) return;
      const text = decompressFromUTF16(state.worldRoster.packedRecords), records = JSON.parse(text);
      assert.equal(JSON.stringify(records), text, 'Original complete field order is retained');
      const measurements = {};
      for (const [name, codec] of Object.entries(variants)) {
        const encoding = codec(records), packedRecords = compressToUTF16(encoding.text);
        const decodedText = decompressFromUTF16(packedRecords); assert.equal(decodedText, encoding.text);
        assert.equal(JSON.stringify(encoding.decode(decodedText)), text, 'Every field, value, key and array order round-trips exactly');
        const broken = encoding.decode(decodedText);
        assert(Object.hasOwn(broken[0].player, 'id'), 'One actual full player field exists before the omission control');
        delete broken[0].player.id;
        assert.notEqual(JSON.stringify(broken), text, 'The full JSON equality rejects an effective missing player field');
        const next = { ...state, worldRoster: { ...state.worldRoster, packedRecords, packedFormat: 'rows-v1' } };
        measurements[name] = { dictionaries: encoding.dictionaries, stateChars: JSON.stringify(next).length,
          ledgerChars: JSON.stringify(next.worldRoster).length, savings: JSON.stringify(state).length - JSON.stringify(next).length,
          fullDecodedSha256: sha(text) };
      }
      report.rows.push({ harness, file: row.file, kind: row.kind, phase: row.phase, stateIndex, club: state.clubName, season: state.season,
        originalChars: JSON.stringify(state).length, records: records.length, measurements });
    });
  }
}
assert(report.rows.length > 150);
const finalSaves = report.rows.filter(row => row.harness === 'simClubManagerSaveSize.mjs' && row.kind === 'finished' && row.season === 15);
assert.equal(finalSaves.length, 3);
report.finalSaves = finalSaves;
report.exactRoundTrips = report.rows.length * Object.keys(variants).length;
report.effectiveOmissionControls = report.exactRoundTrips;
fs.writeFileSync('probe-results.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ exactRoundTrips: report.exactRoundTrips, finalSaves, totals: report.totals }, null, 2));
