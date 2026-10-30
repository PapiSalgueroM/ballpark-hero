// The soccer-career-daily-life workflow's "Bind source and locked tools" installed.json step, as a file.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const lock = JSON.parse(fs.readFileSync('package-lock.json'));
const installed = Object.entries(lock.packages).filter(([p]) => p.startsWith('node_modules/') && fs.existsSync(p + '/package.json')).map(([p, entry]) => {
  const version = JSON.parse(fs.readFileSync(p + '/package.json')).version;
  assert.equal(version, entry.version, p);
  return { path: p, version };
});
assert(installed.length > 0);
fs.writeFileSync(out + '/installed.json', JSON.stringify(installed, null, 2));
console.log(`Bound ${installed.length} installed locked versions.`);
