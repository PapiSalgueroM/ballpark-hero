/* Round 1574 probe (not committed): the lifted lib scripts/lib/connectionsMigration.mjs writes Round 1567's SQL
   byte for byte from 1567's own plan, and classifies an export exactly as 1567's payloadFrom does.
   Run from the repo root (or a worktree): node <this file> [ROOT]
   PROBE_CONTROL=flip changes one character of the lib's output in memory: the probe must then exit 1. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(process.argv[2] ?? '.');
const imp = p => import(pathToFileURL(path.join(ROOT, p)).href);
const m1567 = await imp('scripts/qa/usConnections1567Migration.mjs');
const c1567 = await imp('scripts/qa/usConnections1567Checksummed.mjs');
const lib = await imp('scripts/lib/connectionsMigration.mjs');
const FLIP = process.env.PROBE_CONTROL === 'flip';
let bad = 0;
const fail = m => { bad += 1; console.error('  FAIL: ' + m); };

const p = await m1567.plan();
const want = await m1567.migrationText();
const committed = fs.readFileSync(path.join(ROOT, m1567.MIGRATION), 'utf8').replace(/\r\n/g, '\n');
if (want !== committed) fail('1567\'s own writer does not give its committed migration (not this probe\'s business, but say it)');
const cut = want.indexOf('\n-- baseball_connections_puzzles: ');
if (cut < 0) fail('no baseball block in 1567\'s migration');
let ours = want.slice(0, cut) + Object.keys(m1567.SPORTS).map(s => lib.guardedBlockSql({ round: '1567', table: m1567.SPORTS[s][1], tmp: `r1567_${s}`, rows: p[s] })).join('');
if (FLIP) ours = ours.replace('Round 1567 nhl_connections_puzzles', 'Round 1567 nhl_connections_puzzlez');
console.log(`guarded: 1567 ${want.length} bytes, lib ${ours.length} bytes, ${ours === want ? 'IDENTICAL' : 'DIFFERENT'}`);
if (ours !== want) fail('the lib\'s guarded blocks are not 1567\'s');

/* the checksummed form over every planned row, with a hash per row (any 32 hex digits: the text is what is compared) */
const rows = Object.entries(p).flatMap(([t, rs]) => rs.map(r => ({ t, id: r.id, h: crypto.createHash('md5').update(r.id).digest('hex'), n: r.next })));
const a = c1567.checksummedSql(rows);
const b = lib.checksummedSql({ round: '1567', writer: 'scripts/qa/usConnections1567Checksummed.mjs', tables: Object.fromEntries(Object.entries(m1567.SPORTS).map(([s, [, t]]) => [s, t])), payloadRows: rows });
console.log(`checksummed: ${rows.length} rows, 1567 ${a.length} bytes, lib ${b.length} bytes, ${a === b ? 'IDENTICAL' : 'DIFFERENT'}`);
if (a !== b) fail('the lib\'s checksummed SQL is not 1567\'s');

/* classify against payloadFrom: an export of the base file boards (every row old), one row current, one drifted,
   one missing */
const base = await m1567.boardsAt(m1567.BASE);
const exports = {};
for (const [s, bs] of Object.entries(base)) exports[s] = bs.map((x, i) => ({ puzzle_id: x.id, sort_order: i + 1, groups_json: x.groups, h: crypto.createHash('md5').update(x.id).digest('hex') }));
const cur = p.nfl[0];
exports.nfl.find(r => r.puzzle_id === cur.id).groups_json = cur.next;
exports.nhl.find(r => r.puzzle_id === p.nhl[0].id).groups_json = [{ theme: 'drift', players: ['A', 'B', 'C', 'D', 'E'], difficulty: 'yellow' }];
exports.baseball = exports.baseball.filter(r => r.puzzle_id !== p.baseball[0].id);
const x = await c1567.payloadFrom(exports);
const y = lib.classify({ plan: p, exports });
for (const k of ['rows', 'already', 'drifted', 'missing']) {
  const same = JSON.stringify(x[k]) === JSON.stringify(y[k]);
  console.log(`classify ${k}: 1567 ${x[k].length}, lib ${y[k].length}, ${same ? 'IDENTICAL' : 'DIFFERENT'}`);
  if (!same) fail(`classify ${k} differs`);
}
if (bad) { console.error(`probe-lift: ${bad} failure(s)`); process.exit(1); }
console.log('probe-lift: green. The lifted lib writes 1567\'s guarded and checksummed SQL byte for byte and classifies as 1567 does.');
