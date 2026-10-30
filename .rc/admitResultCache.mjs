import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const out = process.argv[2];
const read = file => new Map(fs.readFileSync(path.join(out, file), 'utf8').trim().split('\n').filter(Boolean).map(line => { const m = /^([a-f0-9]{64})  (.+)$/.exec(line); assert(m, 'RELEASE_DEPENDENCY_MAP_LINE'); return [m[2], m[1]]; }));
const before = read('dependencies.before'), after = read('dependencies.after'), added = [...after.keys()].filter(file => !before.has(file));
for (const [file, hash] of before) assert.equal(after.get(file), hash, 'RELEASE_ORIGINAL_DEPENDENCY_BODY_HELD:' + file);
assert.equal([...before.keys()].filter(file => file.startsWith('node_modules/.vite/vitest/')).length, 0);
assert(added.length <= 1, 'RELEASE_ONE_DEFAULT_RESULTS_CACHE_ONLY');
const entries = [];
for (const file of added) {
 const projectId = createHash('sha1').update('').digest('hex');
 assert.equal(file, 'node_modules/.vite/vitest/' + projectId + '/results.json');
 const body = fs.readFileSync(file), data = JSON.parse(body);
 assert.deepEqual(Object.keys(data).sort(), ['results', 'version']); assert.equal(data.version, '3.2.7'); assert(Array.isArray(data.results));
 for (const row of data.results) {
  assert(Array.isArray(row) && row.length === 2); assert.match(row[0], /^:src\/.+\.(test|spec)\.(ts|tsx)$/);
  const relative = row[0].slice(1); assert(!relative.split('/').includes('..')); assert(fs.existsSync(relative), 'RELEASE_CACHE_IDENTITY_ACTUAL_SOURCE');
  assert.deepEqual(Object.keys(row[1]).sort(), ['duration', 'failed']); assert.equal(typeof row[1].failed, 'boolean'); assert(Number.isFinite(row[1].duration) && row[1].duration >= 0);
 }
 fs.writeFileSync(path.join(out, 'default-results-cache.json'), body, { flag: 'wx' });
 entries.push({ file, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex'), tests: data.results.map(row => row[0]), kind: 'NEW_GENERATED_RESULTS_CACHE_ONLY_NO_TEST_CREDIT' });
}
fs.writeFileSync(path.join(out, 'DEPENDENCY-CACHE-ADMISSION.json'), JSON.stringify({ originalFilesAndBodiesHeld: true, entries }, null, 2) + '\n', { flag: 'wx' });
