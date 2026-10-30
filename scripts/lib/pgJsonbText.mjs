/**
 * Round 1565: the text Postgres prints for a jsonb value, so a board in the
 * shipped file and a row of a table can be compared by one md5 without
 * reading the table's boards: md5(groups_json::text) in SQL equals
 * boardMd5(groups) here.
 *
 * jsonb keeps one copy of each key and orders an object's keys by length,
 * then byte by byte; it prints ", " between items and ": " after a key, and
 * escapes a string the way JSON does (quote, backslash and control
 * characters only; other characters go out as they are).
 * scripts/qa/rehearseConnections1565.mjs proves the two agree on every row of
 * the live export in PGlite.
 *
 * Nothing here reads a file, the network or the clock.
 */
import crypto from 'node:crypto';

const ESC = { '"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t' };
const str = s => '"' + String(s).replace(/["\\\u0000-\u001f]/g, c => ESC[c] ?? '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '"';
const byteCmp = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

export function pgJsonbText(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return '[' + v.map(pgJsonbText).join(', ') + ']';
  if (typeof v === 'object') {
    const keys = Object.keys(v).filter(k => v[k] !== undefined).sort((a, b) => {
      const la = Buffer.byteLength(a, 'utf8'), lb = Buffer.byteLength(b, 'utf8');
      return la !== lb ? la - lb : byteCmp(a, b);
    });
    return '{' + keys.map(k => str(k) + ': ' + pgJsonbText(v[k])).join(', ') + '}';
  }
  if (typeof v === 'string') return str(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  throw new Error('pgJsonbText: cannot print ' + typeof v);
}

/** md5 of a board as Postgres would print it: the same value as md5(groups_json::text). */
export const boardMd5 = groups => crypto.createHash('md5').update(pgJsonbText(groups), 'utf8').digest('hex');
