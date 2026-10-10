const { decompressFromUTF16 } = require('lz-string');

// Independent representation reader. No product module or player-field projection.
function decodePackedWorldRosterRecords(ledger) {
  if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger) || !Array.isArray(ledger.records)
    || ledger.records.length || typeof ledger.packedRecords !== 'string' || !ledger.packedRecords) throw new Error('Invalid packed ledger envelope');
  const text = decompressFromUTF16(ledger.packedRecords);
  if (!text) throw new Error('Unreadable packed ledger');
  const saved = JSON.parse(text);
  let records = saved;
  if (ledger.packedFormat !== undefined) {
    if (ledger.packedFormat !== 'rows-v1' || !Array.isArray(saved) || saved.length !== 2 || !Array.isArray(saved[0])) throw new Error('Invalid packed format');
    const schemas = saved[0], seen = new Set();
    for (const keys of schemas) {
      if (!Array.isArray(keys) || keys.some(key => typeof key !== 'string') || new Set(keys).size !== keys.length
        || seen.has(JSON.stringify(keys))) throw new Error('Invalid packed schema');
      seen.add(JSON.stringify(keys));
    }
    const unpack = node => {
      if (!Array.isArray(node)) {
        if (node === null || typeof node === 'string' || typeof node === 'boolean'
          || typeof node === 'number' && Number.isFinite(node)) return node;
        throw new Error('Invalid encoded scalar');
      }
      if (node[0] === -1) return node.slice(1).map(unpack);
      const schema = node[0];
      if (!Number.isSafeInteger(schema) || schema < 0 || schema >= schemas.length
        || node.length !== schemas[schema].length + 1) throw new Error('Invalid encoded object');
      return Object.fromEntries(schemas[schema].map((key, index) => [key, unpack(node[index + 1])]));
    };
    records = unpack(saved[1]);
  }
  if (!Array.isArray(records) || !records.length) throw new Error('Invalid complete records array');
  return records;
}

function expandPackedWorldRosterState(state) {
  const full = JSON.parse(JSON.stringify(state));
  if (full.worldRoster?.packedRecords !== undefined) {
    full.worldRoster.records = decodePackedWorldRosterRecords(full.worldRoster);
    delete full.worldRoster.packedRecords;
    delete full.worldRoster.packedFormat;
  } else if (full.worldRoster?.packedFormat !== undefined) throw new Error('Format without packed data');
  return full;
}

exports.decodePackedWorldRosterRecords = decodePackedWorldRosterRecords;
exports.expandPackedWorldRosterState = expandPackedWorldRosterState;
