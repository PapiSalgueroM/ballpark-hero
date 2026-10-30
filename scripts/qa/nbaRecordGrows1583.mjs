/**
 * Round 1583 (critic-1583 item 6, BINDING; review-read-1583 minor 4): the NBA record only grows.
 *
 * Every man and every field the two NBA host files held when first committed (5620589b4, step 2 of Round 1583) is
 * still there and byte for byte the same in the working tree:
 *   scripts/data/nbaConnectionsRecord-2026-10.json      ESPN and nba.com (fetchNbaRecord.mjs add)
 *   scripts/data/nbaConnectionsSecondHost-2026-10.json  basketball-reference (verifyNbaFacts.mjs second)
 * A man may be added, and a man held may gain a field he lacked; nothing held may change or go. Both writers refuse
 * to break this at write time; this proves it after the fact, by git, with no network, so a round that adds men
 * (Round 1586 adds the table rows' men) reruns it from the branch:
 *
 *   node scripts/qa/nbaRecordGrows1583.mjs                 exit 0 when nothing held changed, else 1, naming each field
 *   NBA_RECORD_BASE=<sha> node scripts/qa/nbaRecordGrows1583.mjs   compare against a later commit instead
 *   NBA_RECORD_CONTROL=record   Tony Parker's career points in the record moved by one in memory: must be named, exit 1
 *   NBA_RECORD_CONTROL=second   Tony Parker's birthplace code on the second host changed in memory: must be named, exit 1
 *   NBA_RECORD_CONTROL=gone     Tony Parker dropped from the record in memory: every field of his must be named, exit 1
 * A control that cannot find the field it changes says ABORTED and exits 2.
 *
 * Measured 2026-10-29 on 422c2fca0 (as .tmp-fx/recordgrows.mjs, record only, runner r1583-fa): 996 fields of 83 men,
 * 0 differences; the control named "Tony Parker.career" and exited 1. Committed form, same day: 1909 fields of 166 men
 * (83 on each host), 0 changed, exit 0; record names "record: Tony Parker.career", second names "second: Tony
 * Parker.bornCode", gone names his 12 record fields, each exit 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.NBA_RECORD_BASE ?? '5620589b4';
const CONTROL = process.env.NBA_RECORD_CONTROL ?? '';
const FILES = {
  record: 'scripts/data/nbaConnectionsRecord-2026-10.json',
  second: 'scripts/data/nbaConnectionsSecondHost-2026-10.json',
};

const at = file => JSON.parse(execFileSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, maxBuffer: 1 << 27, encoding: 'utf8' })).men;
const now = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')).men;

const head = { record: now(FILES.record), second: now(FILES.second) };
const abort = why => { console.log(`NBA_RECORD_CONTROL=${CONTROL} ABORTED: ${why}`); process.exit(2); };
if (CONTROL === 'record') {
  if (typeof head.record['Tony Parker']?.career?.PTS !== 'number') abort('the record holds no career points for Tony Parker');
  head.record['Tony Parker'].career.PTS += 1;
} else if (CONTROL === 'second') {
  if (typeof head.second['Tony Parker']?.bornCode !== 'string') abort('the second host holds no birthplace code for Tony Parker');
  head.second['Tony Parker'].bornCode = 'FR';
} else if (CONTROL === 'gone') {
  if (!head.record['Tony Parker']) abort('the record holds no Tony Parker');
  delete head.record['Tony Parker'];
} else if (CONTROL) {
  console.log(`NBA_RECORD_CONTROL=${CONTROL} is not a control here`);
  process.exit(2);
}
if (CONTROL) console.log(`NBA_RECORD_CONTROL=${CONTROL}: changed in memory; it must be named below`);

let fields = 0;
let men = 0;
const diffs = [];
for (const [host, file] of Object.entries(FILES)) {
  const base = at(file);
  for (const [name, m] of Object.entries(base)) {
    men += 1;
    for (const [k, v] of Object.entries(m)) {
      fields += 1;
      if (JSON.stringify(head[host][name]?.[k]) !== JSON.stringify(v)) diffs.push(`${host}: ${name}.${k}`);
    }
  }
  const added = Object.keys(head[host]).filter(n => !(n in base)).length;
  console.log(`${host}: ${Object.keys(base).length} men held at ${BASE}, ${added} added since`);
}
for (const d of diffs) console.log('CHANGED ' + d);
console.log(`nbaRecordGrows1583: ${fields} fields of ${men} men held at ${BASE} compared, ${diffs.length} changed${diffs.length ? '' : '. The NBA record only grew.'}`);
process.exit(diffs.length ? 1 : 0);
